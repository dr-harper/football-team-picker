import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, Users, Calendar, Trophy, ArrowRight, Copy, Check, Trash2, Goal, Star, Pencil } from 'lucide-react';
import AppHeader from '../components/AppHeader';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Button } from '../components/ui/button';
import { useAuth } from '../contexts/AuthContext';
import { getUserLeagues, createLeague, joinLeagueByCode, deleteLeague } from '../utils/firestore';
import { League, Game } from '../types';
import { getLeagueGames } from '../utils/firestore';
import { geocodeLocation, GeoResult } from '../utils/weather';
import { PLAYER_POSITIONS } from '../constants/playerPositions';
import { PLAYER_TAGS } from '../constants/playerTags';

const MAX_TAGS = 3;

interface LeagueStats {
    topScorer: { name: string; goals: number } | null;
    motmLeader: { name: string; count: number } | null;
    gamesPlayed: number;
}

const DashboardPage: React.FC = () => {
    const { user, needsPlayerTags, updatePlayerTags, updateBio } = useAuth();
    const navigate = useNavigate();
    const [leagues, setLeagues] = useState<League[]>([]);
    const [upcomingGames, setUpcomingGames] = useState<Game[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [playerProfile, setPlayerProfile] = useState<{ tags: string[]; positions: string[]; hasSetTags: boolean; bio: string } | null>(null);
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [editPositions, setEditPositions] = useState<string[]>([]);
    const [editTags, setEditTags] = useState<string[]>([]);
    const [editBio, setEditBio] = useState('');
    const [savingProfile, setSavingProfile] = useState(false);
    const [playerStats, setPlayerStats] = useState<{ goals: number; assists: number; motm: number; games: number } | null>(null);
    const [playerBadges, setPlayerBadges] = useState<{ emoji: string; label: string }[]>([]);
    const [newLeagueName, setNewLeagueName] = useState('');
    const [newLeagueVenue, setNewLeagueVenue] = useState('');
    const [verifiedVenue, setVerifiedVenue] = useState<GeoResult | null>(null);
    const [verifyingVenue, setVerifyingVenue] = useState(false);
    const [joinCode, setJoinCode] = useState('');
    const [error, setError] = useState('');
    const [copiedCode, setCopiedCode] = useState<string | null>(null);
    const [deletingLeagueId, setDeletingLeagueId] = useState<string | null>(null);
    const [leagueStats, setLeagueStats] = useState<Map<string, LeagueStats>>(new Map());

    useEffect(() => {
        if (!user) return;
        loadData();
        loadPlayerProfile();
    }, [user]);

    useEffect(() => {
        if (needsPlayerTags) setIsEditingProfile(true);
    }, [needsPlayerTags]);

    const openEditProfile = (profile: { tags: string[]; positions: string[]; bio: string }) => {
        setEditPositions(profile.positions);
        setEditTags(profile.tags);
        setEditBio(profile.bio);
        setIsEditingProfile(true);
    };

    const handleSaveProfile = async () => {
        if (editTags.length !== MAX_TAGS || editPositions.length === 0) return;
        setSavingProfile(true);
        try {
            await updatePlayerTags(editTags, editPositions);
            await updateBio(editBio.trim());
            setPlayerProfile(prev => prev ? { ...prev, tags: editTags, positions: editPositions, bio: editBio.trim(), hasSetTags: true } : prev);
            setIsEditingProfile(false);
        } catch (err) {
            console.error('[saveProfile]', err);
        }
        setSavingProfile(false);
    };

    const loadPlayerProfile = async () => {
        if (!user) return;
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
            console.error('[loadPlayerProfile]', err);
        }
    };

    const loadData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const userLeagues = await getUserLeagues(user.uid);
            setLeagues(userLeagues);

            const upcomingList: Game[] = [];
            const allCompleted: Game[] = [];
            const statsMap = new Map<string, LeagueStats>();

            for (const league of userLeagues) {
                const games = await getLeagueGames(league.id);
                upcomingList.push(...games.filter(g => g.status !== 'completed'));

                // Aggregate stats from completed games
                const completed = games.filter(g => g.status === 'completed');
                allCompleted.push(...completed);

                const goalTotals = new Map<string, number>();
                const motmTotals = new Map<string, number>();
                for (const g of completed) {
                    for (const scorer of g.goalScorers ?? []) {
                        goalTotals.set(scorer.name, (goalTotals.get(scorer.name) ?? 0) + scorer.goals);
                    }
                    if (g.manOfTheMatch) {
                        motmTotals.set(g.manOfTheMatch, (motmTotals.get(g.manOfTheMatch) ?? 0) + 1);
                    }
                }
                const topScorerEntry = [...goalTotals.entries()].sort((a, b) => b[1] - a[1])[0];
                const motmEntry = [...motmTotals.entries()].sort((a, b) => b[1] - a[1])[0];
                statsMap.set(league.id, {
                    topScorer: topScorerEntry ? { name: topScorerEntry[0], goals: topScorerEntry[1] } : null,
                    motmLeader: motmEntry ? { name: motmEntry[0], count: motmEntry[1] } : null,
                    gamesPlayed: completed.length,
                });
            }

            upcomingList.sort((a, b) => a.date - b.date);
            setUpcomingGames(upcomingList.slice(0, 5));
            setLeagueStats(statsMap);

            // Compute personal stats from all completed games
            const displayName = user.displayName ?? '';
            let goals = 0, assists = 0, motm = 0, gamesPlayed = 0;
            for (const g of allCompleted) {
                const inGame = g.teams?.some(t => t.players.some(p => p.name === displayName));
                if (inGame) gamesPlayed++;
                const scorerEntry = g.goalScorers?.find(s => s.name === displayName);
                if (scorerEntry) goals += scorerEntry.goals;
                const assisterEntry = g.assisters?.find(a => a.name === displayName);
                if (assisterEntry) assists += assisterEntry.goals;
                if (g.manOfTheMatch === displayName) motm++;
            }
            const stats = { goals, assists, motm, games: gamesPlayed };
            setPlayerStats(stats);

            // Compute badges
            const badges: { emoji: string; label: string }[] = [];

            const hasHatTrick = allCompleted.some(g =>
                (g.goalScorers?.find(s => s.name === displayName)?.goals ?? 0) >= 3
            );
            if (hasHatTrick) badges.push({ emoji: '🎯', label: 'Hat-trick Hero' });
            if (motm >= 5) badges.push({ emoji: '⭐', label: 'MOTM Machine' });
            if (allCompleted.length > 0 && gamesPlayed / allCompleted.length >= 0.8) {
                badges.push({ emoji: '📅', label: 'Ever Present' });
            }
            if (goals >= 10) badges.push({ emoji: '⚽', label: '10 Club' });

            let wins = 0;
            for (const g of allCompleted) {
                if (!g.score || !g.teams) continue;
                const inTeam1 = g.teams[0]?.players.some(p => p.name === displayName);
                const inTeam2 = g.teams[1]?.players.some(p => p.name === displayName);
                if (inTeam1 && g.score.team1 > g.score.team2) wins++;
                else if (inTeam2 && g.score.team2 > g.score.team1) wins++;
            }
            if (wins >= 10) badges.push({ emoji: '🏆', label: 'Winner' });

            const recentGamesPlayed = allCompleted
                .filter(g => g.teams?.some(t => t.players.some(p => p.name === displayName)))
                .sort((a, b) => b.date - a.date)
                .slice(0, 3);
            if (recentGamesPlayed.length === 3 && recentGamesPlayed.every(g =>
                (g.goalScorers?.find(s => s.name === displayName)?.goals ?? 0) > 0
            )) {
                badges.push({ emoji: '🔥', label: 'On Fire' });
            }

            setPlayerBadges(badges);
        } catch (err) {
            console.error('[loadData]', err);
        }
        setLoading(false);
    };

    const handleVerifyVenue = async () => {
        if (!newLeagueVenue.trim()) return;
        setVerifyingVenue(true);
        const result = await geocodeLocation(newLeagueVenue.trim());
        setVerifyingVenue(false);
        if (result) {
            setVerifiedVenue(result);
            setNewLeagueVenue(result.displayName);
        } else {
            setError('Location not found — try a more specific address');
        }
    };

    const handleCreateLeague = async () => {
        if (!user || !newLeagueName.trim()) return;
        setError('');
        try {
            const venueName = verifiedVenue?.displayName || (newLeagueVenue.trim() || undefined);
            await createLeague(
                newLeagueName.trim(),
                user.uid,
                venueName,
                verifiedVenue?.lat,
                verifiedVenue?.lon,
            );
            setNewLeagueName('');
            setNewLeagueVenue('');
            setVerifiedVenue(null);
            setShowCreateModal(false);
            await loadData();
        } catch (err) {
            console.error('[createLeague]', err);
            setError('Failed to create league');
        }
    };

    const handleJoinLeague = async () => {
        if (!user || !joinCode.trim()) return;
        setError('');
        try {
            const league = await joinLeagueByCode(joinCode.trim(), user.uid);
            if (!league) {
                setError('No league found with that code');
                return;
            }
            setJoinCode('');
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

    const handleDeleteLeague = async (league: League, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (confirm(`Delete "${league.name}"? This will permanently remove all games and cannot be undone.`)) {
            setDeletingLeagueId(league.id);
            await deleteLeague(league.id);
            await loadData();
            setDeletingLeagueId(null);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-900 via-green-800 to-green-700 dark:from-green-950 dark:via-green-900 dark:to-green-800">
                <div className="text-white text-lg">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-700 dark:from-green-950 dark:via-green-900 dark:to-green-800">
            {/* Header */}
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
                    <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">My Profile</span>
                            {!isEditingProfile && playerProfile.hasSetTags && (
                                <button
                                    onClick={() => openEditProfile(playerProfile)}
                                    className="text-white/40 hover:text-white/70 transition-colors"
                                    title="Edit player profile"
                                >
                                    <Pencil className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        {isEditingProfile ? (
                            <div className="space-y-4">
                                {/* Bio */}
                                <div>
                                    <p className="text-xs text-white/50 mb-2">Bio <span className="text-white/30">(optional, max 50 chars)</span></p>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={editBio}
                                            onChange={e => setEditBio(e.target.value.slice(0, 50))}
                                            placeholder='e.g. "Sunday league since 2015"'
                                            className="w-full bg-white/10 border border-white/20 text-white placeholder-white/30 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-green-400 pr-12"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/30">{editBio.length}/50</span>
                                    </div>
                                </div>

                                {/* Positions */}
                                <div>
                                    <p className="text-xs text-white/50 mb-2">Where do you prefer to play?</p>
                                    <div className="flex flex-wrap gap-2">
                                        {PLAYER_POSITIONS.map(({ emoji, label }) => {
                                            const selected = editPositions.includes(label);
                                            return (
                                                <button
                                                    key={label}
                                                    onClick={() => setEditPositions(prev => selected ? prev.filter(p => p !== label) : [...prev, label])}
                                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                                                        selected
                                                            ? 'bg-green-500 border-green-400 text-white ring-2 ring-green-400'
                                                            : 'bg-white/10 border-white/20 text-white/70 hover:bg-white/15'
                                                    }`}
                                                >
                                                    <span>{emoji}</span><span>{label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Tags */}
                                <div>
                                    <p className="text-xs text-white/50 mb-2">Pick {MAX_TAGS} tags that describe you <span className="text-green-400">({editTags.length}/{MAX_TAGS})</span></p>
                                    <div className="flex flex-wrap gap-2">
                                        {PLAYER_TAGS.map(({ emoji, label }) => {
                                            const selected = editTags.includes(label);
                                            const atMax = editTags.length >= MAX_TAGS && !selected;
                                            return (
                                                <button
                                                    key={label}
                                                    onClick={() => {
                                                        if (selected) setEditTags(prev => prev.filter(t => t !== label));
                                                        else if (!atMax) setEditTags(prev => [...prev, label]);
                                                    }}
                                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                                                        selected
                                                            ? 'bg-green-500 border-green-400 text-white ring-2 ring-green-400'
                                                            : atMax
                                                            ? 'bg-white/5 border-white/10 text-white/25'
                                                            : 'bg-white/10 border-white/20 text-white/70 hover:bg-white/15'
                                                    }`}
                                                >
                                                    <span>{emoji}</span><span>{label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-3 pt-1">
                                    <button
                                        onClick={handleSaveProfile}
                                        disabled={savingProfile || editTags.length !== MAX_TAGS || editPositions.length === 0}
                                        className="bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                                    >
                                        {savingProfile ? 'Saving…' : 'Save'}
                                    </button>
                                    {playerProfile.hasSetTags && (
                                        <button
                                            onClick={() => setIsEditingProfile(false)}
                                            className="text-white/40 hover:text-white/60 text-sm transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : playerProfile.hasSetTags && playerProfile.tags.length > 0 ? (
                            <div className="space-y-2.5">
                                {playerProfile.positions.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                        {playerProfile.positions.map(pos => {
                                            const posData = PLAYER_POSITIONS.find(p => p.label === pos);
                                            return (
                                                <span key={pos} className="inline-flex items-center gap-1 text-xs bg-green-600/40 border border-green-500/40 text-green-200 px-2.5 py-1 rounded-full">
                                                    {posData?.emoji} {pos}
                                                </span>
                                            );
                                        })}
                                    </div>
                                )}
                                <div className="flex flex-wrap gap-1.5">
                                    {playerProfile.tags.map(tag => {
                                        const tagData = PLAYER_TAGS.find(t => t.label === tag);
                                        return (
                                            <span key={tag} className="inline-flex items-center gap-1 text-xs bg-white/10 border border-white/15 text-white/80 px-2.5 py-1 rounded-full">
                                                {tagData?.emoji} {tag}
                                            </span>
                                        );
                                    })}
                                </div>
                                {playerProfile.bio && (
                                    <p className="text-sm italic text-white/60">"{playerProfile.bio}"</p>
                                )}
                                {playerStats && playerStats.games > 0 ? (
                                    <div className="flex flex-wrap gap-3 pt-0.5">
                                        <span className="text-sm text-white/70">⚽ {playerStats.goals}</span>
                                        <span className="text-sm text-white/70">🅰️ {playerStats.assists}</span>
                                        <span className="text-sm text-white/70">⭐ {playerStats.motm}</span>
                                        <span className="text-sm text-white/70">🎮 {playerStats.games}</span>
                                    </div>
                                ) : playerStats !== null ? (
                                    <p className="text-xs text-white/35 italic">Play some games to earn stats</p>
                                ) : null}
                                {playerBadges.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                                        {playerBadges.map(badge => (
                                            <span key={badge.label} className="inline-flex items-center gap-1 text-xs bg-yellow-500/15 border border-yellow-500/25 text-yellow-300 px-2.5 py-1 rounded-full">
                                                {badge.emoji} {badge.label}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <button
                                onClick={() => openEditProfile({ tags: [], positions: [], bio: '' })}
                                className="text-sm text-green-400 hover:text-green-300 transition-colors"
                            >
                                Set up your player profile →
                            </button>
                        )}
                    </div>
                )}

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
                                <Button
                                    onClick={() => setShowCreateModal(true)}
                                    className="bg-green-600 hover:bg-green-500 text-white rounded-lg"
                                >
                                    Create a League
                                </Button>
                                <Button
                                    onClick={() => setShowJoinModal(true)}
                                    className="bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg"
                                >
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
                                                {copiedCode === league.joinCode ? (
                                                    <Check className="w-3 h-3" />
                                                ) : (
                                                    <Copy className="w-3 h-3" />
                                                )}
                                            </button>
                                        </div>
                                        {/* Per-league stats */}
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
                                    <div className="flex items-center gap-2">
                                        {user && league.createdBy === user.uid && (
                                            <button
                                                onClick={(e) => handleDeleteLeague(league, e)}
                                                disabled={deletingLeagueId === league.id}
                                                className="text-red-400/50 hover:text-red-400 transition-colors p-1 disabled:opacity-50"
                                            >
                                                {deletingLeagueId === league.id ? (
                                                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                                    </svg>
                                                ) : (
                                                    <Trash2 className="w-4 h-4" />
                                                )}
                                            </button>
                                        )}
                                        <ArrowRight className="w-5 h-5 text-white/40" />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Create League Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50 p-4" onClick={() => { setShowCreateModal(false); setError(''); }}>
                    <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold text-green-900 dark:text-white mb-4">Create a League</h3>
                        <input
                            type="text"
                            value={newLeagueName}
                            onChange={e => setNewLeagueName(e.target.value)}
                            placeholder="League name (e.g. Wednesday 5-a-side)"
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 dark:bg-gray-700 dark:text-white mb-3 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            autoFocus
                            onKeyDown={e => e.key === 'Enter' && handleCreateLeague()}
                        />
                        <div className="mb-3">
                            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Default venue (optional)</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newLeagueVenue}
                                    onChange={e => { setNewLeagueVenue(e.target.value); setVerifiedVenue(null); setError(''); }}
                                    placeholder="e.g. Hackney Marshes, London"
                                    className={`flex-1 border rounded-lg p-3 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent ${verifiedVenue ? 'border-green-500 dark:border-green-500' : 'border-gray-300 dark:border-gray-600'}`}
                                    onKeyDown={e => e.key === 'Enter' && handleVerifyVenue()}
                                />
                                <Button
                                    onClick={handleVerifyVenue}
                                    disabled={!newLeagueVenue.trim() || verifyingVenue}
                                    className="bg-green-100 hover:bg-green-200 text-green-800 dark:bg-green-900 dark:hover:bg-green-800 dark:text-green-200 px-3 shrink-0"
                                >
                                    {verifyingVenue ? '…' : verifiedVenue ? '✓' : 'Verify'}
                                </Button>
                            </div>
                            {verifiedVenue && (
                                <p className="text-xs text-green-600 dark:text-green-400 mt-1">📍 {verifiedVenue.displayName}</p>
                            )}
                        </div>
                        {error && <div className="text-red-600 text-sm mb-3">{error}</div>}
                        <div className="flex gap-2 justify-end">
                            <Button onClick={() => { setShowCreateModal(false); setError(''); }} variant="ghost" className="text-gray-600 dark:text-gray-300">
                                Cancel
                            </Button>
                            <Button onClick={handleCreateLeague} className="bg-green-700 hover:bg-green-600 text-white">
                                Create
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Join League Modal */}
            {showJoinModal && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50 p-4" onClick={() => setShowJoinModal(false)}>
                    <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold text-green-900 dark:text-white mb-4">Join a League</h3>
                        <input
                            type="text"
                            value={joinCode}
                            onChange={e => setJoinCode(e.target.value.toUpperCase())}
                            placeholder="Enter 6-character join code"
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 dark:bg-gray-700 dark:text-white mb-3 uppercase tracking-widest text-center text-lg font-mono focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            maxLength={6}
                            autoFocus
                            onKeyDown={e => e.key === 'Enter' && handleJoinLeague()}
                        />
                        {error && <div className="text-red-600 text-sm mb-3">{error}</div>}
                        <div className="flex gap-2 justify-end">
                            <Button onClick={() => setShowJoinModal(false)} variant="ghost" className="text-gray-600 dark:text-gray-300">
                                Cancel
                            </Button>
                            <Button onClick={handleJoinLeague} className="bg-green-700 hover:bg-green-600 text-white">
                                Join
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardPage;
