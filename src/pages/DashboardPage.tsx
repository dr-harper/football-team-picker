import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, Users, Calendar, LogOut, Trophy, ArrowRight, Copy, Check, Trash2, Goal, Star } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuth } from '../contexts/AuthContext';
import { getUserLeagues, createLeague, joinLeagueByCode, deleteLeague } from '../utils/firestore';
import { League, Game } from '../types';
import { getLeagueGames } from '../utils/firestore';
import { geocodeLocation, GeoResult } from '../utils/weather';

interface LeagueStats {
    topScorer: { name: string; goals: number } | null;
    motmLeader: { name: string; count: number } | null;
    gamesPlayed: number;
}

const DashboardPage: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [leagues, setLeagues] = useState<League[]>([]);
    const [upcomingGames, setUpcomingGames] = useState<Game[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showJoinModal, setShowJoinModal] = useState(false);
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
    }, [user]);

    const loadData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const userLeagues = await getUserLeagues(user.uid);
            setLeagues(userLeagues);

            const allGames: Game[] = [];
            const statsMap = new Map<string, LeagueStats>();

            for (const league of userLeagues) {
                const games = await getLeagueGames(league.id);
                allGames.push(...games.filter(g => g.status !== 'completed'));

                // Aggregate stats from completed games
                const completed = games.filter(g => g.status === 'completed');
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

            allGames.sort((a, b) => a.date - b.date);
            setUpcomingGames(allGames.slice(0, 5));
            setLeagueStats(statsMap);
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

    const handleLogout = async () => {
        await logout();
        navigate('/');
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
            <header className="bg-green-900 dark:bg-green-950 text-white p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Link to="/" className="flex items-center gap-2">
                        <img src="/logo.png" alt="Team Shuffle Logo" className="w-8 h-8" />
                        <span className="font-bold text-xl">Team Shuffle</span>
                    </Link>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-sm text-green-300 hidden sm:inline">
                        {user?.displayName || user?.email}
                    </span>
                    <Link to="/">
                        <Button variant="ghost" size="sm" className="text-white text-xs">
                            Quick Play
                        </Button>
                    </Link>
                    <Button onClick={handleLogout} variant="ghost" size="icon" className="text-white">
                        <LogOut className="w-5 h-5" />
                    </Button>
                </div>
            </header>

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
