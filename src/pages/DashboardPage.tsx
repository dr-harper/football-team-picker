import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, Users, Calendar, LogOut, Trophy, ArrowRight, Copy, Check } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuth } from '../contexts/AuthContext';
import { getUserLeagues, createLeague, joinLeagueByCode } from '../utils/firestore';
import { League, Game } from '../types';
import { getLeagueGames } from '../utils/firestore';

const DashboardPage: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [leagues, setLeagues] = useState<League[]>([]);
    const [upcomingGames, setUpcomingGames] = useState<Game[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [newLeagueName, setNewLeagueName] = useState('');
    const [joinCode, setJoinCode] = useState('');
    const [error, setError] = useState('');
    const [copiedCode, setCopiedCode] = useState<string | null>(null);

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

            // Load upcoming games from all leagues
            const allGames: Game[] = [];
            for (const league of userLeagues) {
                const games = await getLeagueGames(league.id);
                allGames.push(...games.filter(g => g.status !== 'completed'));
            }
            allGames.sort((a, b) => a.date - b.date);
            setUpcomingGames(allGames.slice(0, 5));
        } catch {
            // handle silently
        }
        setLoading(false);
    };

    const handleCreateLeague = async () => {
        if (!user || !newLeagueName.trim()) return;
        setError('');
        try {
            await createLeague(newLeagueName.trim(), user.uid);
            setNewLeagueName('');
            setShowCreateModal(false);
            await loadData();
        } catch {
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
            navigate(`/league/${league.id}`);
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
                                    to={`/game/${game.id}`}
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
                                    to={`/league/${league.id}`}
                                    className="bg-white/10 backdrop-blur-sm border border-white/10 hover:bg-white/15 rounded-xl p-4 flex items-center justify-between transition-colors"
                                >
                                    <div>
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
                                    </div>
                                    <ArrowRight className="w-5 h-5 text-white/40" />
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Create League Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50 p-4" onClick={() => setShowCreateModal(false)}>
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
                        {error && <div className="text-red-600 text-sm mb-3">{error}</div>}
                        <div className="flex gap-2 justify-end">
                            <Button onClick={() => setShowCreateModal(false)} variant="ghost" className="text-gray-600 dark:text-gray-300">
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
