import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, Users, Calendar, Trophy, ArrowRight, Copy, Check, Goal, Star } from 'lucide-react';
import AppHeader from '../components/AppHeader';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Button } from '../components/ui/button';
import { useAuth } from '../contexts/AuthContext';
import { createLeague, joinLeagueByCode, getLeagueMembers, subscribeToUserLeagues, getLeagueGames } from '../utils/firestore';
import { League, Game } from '../types';
import NotificationSettings from '../components/NotificationSettings';
import { buildLookup, resolvePlayerName } from '../utils/playerLookup';
import { logger } from '../utils/logger';
import { computeBadges, computePersonalStats, Badge } from '../utils/badgeUtils';
import PlayerProfileCard from './dashboard/PlayerProfileCard';
import CreateLeagueModal from './dashboard/CreateLeagueModal';
import JoinLeagueModal from './dashboard/JoinLeagueModal';

interface LeagueStats {
    topScorer: { name: string; goals: number } | null;
    motmLeader: { name: string; count: number } | null;
    gamesPlayed: number;
}

const DashboardPage: React.FC = () => {
    const { user, updatePlayerTags, updateBio } = useAuth();
    const navigate = useNavigate();
    const [leagues, setLeagues] = useState<League[]>([]);
    const [upcomingGames, setUpcomingGames] = useState<Game[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [playerProfile, setPlayerProfile] = useState<{ tags: string[]; positions: string[]; hasSetTags: boolean; bio: string } | null>(null);
    const [savingProfile, setSavingProfile] = useState(false);
    const [playerStats, setPlayerStats] = useState<{ goals: number; assists: number; motm: number; games: number } | null>(null);
    const [playerBadges, setPlayerBadges] = useState<Badge[]>([]);
    const [error, setError] = useState('');
    const [copiedCode, setCopiedCode] = useState<string | null>(null);
    const [leagueStats, setLeagueStats] = useState<Map<string, LeagueStats>>(new Map());

    // Real-time subscription to user's leagues
    useEffect(() => {
        if (!user) return;
        const unsubscribe = subscribeToUserLeagues(user.uid, (updatedLeagues) => {
            setLeagues(updatedLeagues);
        });
        return unsubscribe;
    }, [user]);

    // Load games and stats whenever leagues change
    const loadGamesAndStats = useCallback(async () => {
        if (!user || leagues.length === 0) {
            setLoading(false);
            setUpcomingGames([]);
            setLeagueStats(new Map());
            setPlayerStats(null);
            setPlayerBadges([]);
            return;
        }

        try {
            const upcomingList: Game[] = [];
            const allCompleted: Game[] = [];
            const statsMap = new Map<string, LeagueStats>();

            for (const league of leagues) {
                const [games, members] = await Promise.all([
                    getLeagueGames(league.id),
                    getLeagueMembers(league.memberIds),
                ]);
                const leagueLookup = buildLookup(members);

                upcomingList.push(...games.filter(g => g.status !== 'completed'));

                const completed = games.filter(g => g.status === 'completed');
                allCompleted.push(...completed);

                const goalTotals = new Map<string, number>();
                const motmTotals = new Map<string, number>();
                for (const g of completed) {
                    for (const scorer of g.goalScorers ?? []) {
                        goalTotals.set(scorer.playerId, (goalTotals.get(scorer.playerId) ?? 0) + scorer.goals);
                    }
                    if (g.manOfTheMatch) {
                        motmTotals.set(g.manOfTheMatch, (motmTotals.get(g.manOfTheMatch) ?? 0) + 1);
                    }
                }
                const topScorerEntry = [...goalTotals.entries()].sort((a, b) => b[1] - a[1])[0];
                const motmEntry = [...motmTotals.entries()].sort((a, b) => b[1] - a[1])[0];
                statsMap.set(league.id, {
                    topScorer: topScorerEntry ? { name: resolvePlayerName(topScorerEntry[0], leagueLookup), goals: topScorerEntry[1] } : null,
                    motmLeader: motmEntry ? { name: resolvePlayerName(motmEntry[0], leagueLookup), count: motmEntry[1] } : null,
                    gamesPlayed: completed.length,
                });
            }

            upcomingList.sort((a, b) => a.date - b.date);
            setUpcomingGames(upcomingList.slice(0, 5));
            setLeagueStats(statsMap);

            setPlayerStats(computePersonalStats(allCompleted, user.uid));
            setPlayerBadges(computeBadges(allCompleted, user.uid));
        } catch (err) {
            logger.error('[loadGamesAndStats]', err);
        }
        setLoading(false);
    }, [user, leagues]);

    useEffect(() => {
        if (user) loadGamesAndStats();
    }, [loadGamesAndStats]);

    // One-shot player profile load
    useEffect(() => {
        if (!user) return;
        const loadPlayerProfile = async () => {
            try {
                const snap = await getDoc(doc(db, 'users', user.uid));
                if (snap.exists()) {
                    const data = snap.data();
                    setPlayerProfile({
                        tags: data.playerTags ?? [],
                        positions: data.preferredPositions ?? [],
                        hasSetTags: data.hasSetTags === true,
                        bio: data.bio ?? '',
                    });
                }
            } catch (err) {
                logger.error('[loadPlayerProfile]', err);
            }
        };
        loadPlayerProfile();
    }, [user]);

    const handleSaveProfile = async (tags: string[], positions: string[], bio: string) => {
        setSavingProfile(true);
        try {
            await updatePlayerTags(tags, positions);
            await updateBio(bio);
            setPlayerProfile(prev => prev ? { ...prev, tags, positions, bio, hasSetTags: true } : prev);
        } catch (err) {
            logger.error('[saveProfile]', err);
        }
        setSavingProfile(false);
    };

    const handleCreateLeague = async (name: string, venue?: string, coords?: { lat: number; lon: number; displayName: string }) => {
        if (!user) return;
        setError('');
        try {
            await createLeague(name, user.uid, venue, coords?.lat, coords?.lon);
            setShowCreateModal(false);
        } catch (err) {
            logger.error('[createLeague]', err);
            setError('Failed to create league');
        }
    };

    const handleJoinLeague = async (code: string) => {
        if (!user || !code) return;
        setError('');
        try {
            const league = await joinLeagueByCode(code, user.uid);
            if (!league) {
                setError('No league found with that code');
                return;
            }
            setShowJoinModal(false);
            navigate(`/league/${league.joinCode}`);
        } catch {
            setError('Failed to join league');
        }
    };

    const copyCode = (code: string) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
    };

    const getLeagueName = (leagueId: string) => leagues.find(l => l.id === leagueId)?.name || 'Unknown League';
    const getLeagueCode = (leagueId: string) => leagues.find(l => l.id === leagueId)?.joinCode;

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-900 via-green-800 to-green-700 dark:from-green-950 dark:via-green-900 dark:to-green-800">
                <div className="text-white text-lg">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-700 dark:from-green-950 dark:via-green-900 dark:to-green-800">
            <AppHeader />

            <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
                {/* Welcome + Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <h1 className="text-2xl font-bold text-white">
                        Hey, {user?.displayName || 'Player'}!
                    </h1>
                    <div className="flex gap-2">
                        <Button
                            onClick={() => setShowCreateModal(true)}
                            className="bg-green-600 hover:bg-green-500 text-white rounded-lg flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" /> New League
                        </Button>
                        <Button
                            onClick={() => setShowJoinModal(true)}
                            className="bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg flex items-center gap-2"
                        >
                            <Users className="w-4 h-4" /> Join League
                        </Button>
                    </div>
                </div>

                {/* Player Profile Card */}
                {playerProfile && (
                    <PlayerProfileCard
                        profile={playerProfile}
                        stats={playerStats}
                        badges={playerBadges}
                        saving={savingProfile}
                        onSave={handleSaveProfile}
                    />
                )}

                {/* Notification Settings */}
                <NotificationSettings />

                {/* Upcoming Games */}
                {upcomingGames.length > 0 && (
                    <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-5">
                        <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                            <Calendar className="w-5 h-5" /> Upcoming Games
                        </h2>
                        <div className="space-y-2">
                            {upcomingGames.map(game => (
                                <Link
                                    key={game.id}
                                    to={getLeagueCode(game.leagueId) ? `/league/${getLeagueCode(game.leagueId)}/game/${game.id}` : `/game/${game.id}`}
                                    className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <div>
                                        <div className="text-white font-medium">{game.title}</div>
                                        <div className="text-green-300 text-sm">
                                            {getLeagueName(game.leagueId)} &middot; {new Date(game.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs px-2 py-1 rounded-full ${
                                            game.status === 'scheduled' ? 'bg-blue-500/20 text-blue-300' :
                                            game.status === 'in_progress' ? 'bg-yellow-500/20 text-yellow-300' :
                                            'bg-green-500/20 text-green-300'
                                        }`}>
                                            {game.status === 'in_progress' ? 'In Progress' : game.status.charAt(0).toUpperCase() + game.status.slice(1)}
                                        </span>
                                        <ArrowRight className="w-4 h-4 text-white/40" />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* Leagues */}
                <div>
                    <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                        <Trophy className="w-5 h-5" /> My Leagues
                    </h2>
                    {leagues.length === 0 ? (
                        <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-8 text-center">
                            <p className="text-green-300 mb-4">You haven't joined any leagues yet.</p>
                            <div className="flex justify-center gap-2">
                                <Button onClick={() => setShowCreateModal(true)} className="bg-green-600 hover:bg-green-500 text-white rounded-lg">
                                    Create a League
                                </Button>
                                <Button onClick={() => setShowJoinModal(true)} className="bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg">
                                    Join with Code
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {leagues.map(league => (
                                <Link
                                    key={league.id}
                                    to={`/league/${league.joinCode}`}
                                    className="bg-white/10 backdrop-blur-sm border border-white/10 hover:bg-white/15 rounded-xl p-4 flex items-center justify-between transition-colors"
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="text-white font-bold text-lg">{league.name}</div>
                                        <div className="text-green-300 text-sm flex items-center gap-3">
                                            <span>{league.memberIds.length} member{league.memberIds.length !== 1 ? 's' : ''}</span>
                                            <button
                                                onClick={(e) => { e.preventDefault(); copyCode(league.joinCode); }}
                                                className="flex items-center gap-1 hover:text-white transition-colors"
                                            >
                                                Code: {league.joinCode}
                                                {copiedCode === league.joinCode ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                            </button>
                                        </div>
                                        {(() => {
                                            const stats = leagueStats.get(league.id);
                                            if (!stats || stats.gamesPlayed === 0) return null;
                                            return (
                                                <div className="flex flex-wrap gap-3 mt-1.5">
                                                    {stats.topScorer && (
                                                        <span className="text-xs text-white/60 flex items-center gap-1">
                                                            <Goal className="w-3 h-3 text-green-400" />
                                                            {stats.topScorer.name} ({stats.topScorer.goals})
                                                        </span>
                                                    )}
                                                    {stats.motmLeader && (
                                                        <span className="text-xs text-white/60 flex items-center gap-1">
                                                            <Star className="w-3 h-3 text-yellow-400" />
                                                            {stats.motmLeader.name} ×{stats.motmLeader.count}
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                    <ArrowRight className="w-5 h-5 text-white/40" />
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {showCreateModal && (
                <CreateLeagueModal
                    error={error}
                    onClose={() => { setShowCreateModal(false); setError(''); }}
                    onCreate={handleCreateLeague}
                />
            )}

            {showJoinModal && (
                <JoinLeagueModal
                    error={error}
                    onClose={() => setShowJoinModal(false)}
                    onJoin={handleJoinLeague}
                />
            )}
        </div>
    );
};

export default DashboardPage;
