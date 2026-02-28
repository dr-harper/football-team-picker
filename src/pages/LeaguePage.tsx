import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Users, Copy, Check, Calendar, Trophy, Trash2, ArrowRight, LogOut } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuth } from '../contexts/AuthContext';
import {
    subscribeToLeague,
    subscribeToLeagueGames,
    createGame,
    deleteGame,
    getLeagueMembers,
    leaveLeague,
} from '../utils/firestore';
import { League, Game } from '../types';

const LeaguePage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [league, setLeague] = useState<League | null>(null);
    const [games, setGames] = useState<Game[]>([]);
    const [members, setMembers] = useState<{ id: string; displayName: string; email: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [showNewGame, setShowNewGame] = useState(false);
    const [newGameTitle, setNewGameTitle] = useState('');
    const [newGameDate, setNewGameDate] = useState('');
    const [newGameTime, setNewGameTime] = useState('19:00');
    const [copiedCode, setCopiedCode] = useState(false);
    const [tab, setTab] = useState<'upcoming' | 'completed' | 'members'>('upcoming');

    useEffect(() => {
        if (!id) return;
        const unsubLeague = subscribeToLeague(id, async (l) => {
            setLeague(l);
            if (l) {
                const m = await getLeagueMembers(l.memberIds);
                setMembers(m);
            }
            setLoading(false);
        });
        const unsubGames = subscribeToLeagueGames(id, setGames);
        return () => { unsubLeague(); unsubGames(); };
    }, [id]);

    const handleCreateGame = async () => {
        if (!user || !id || !newGameTitle.trim() || !newGameDate) return;
        const dateTime = new Date(`${newGameDate}T${newGameTime}`).getTime();
        await createGame(id, newGameTitle.trim(), dateTime, user.uid);
        setNewGameTitle('');
        setNewGameDate('');
        setShowNewGame(false);
    };

    const handleDeleteGame = async (gameId: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this game?')) {
            await deleteGame(gameId);
        }
    };

    const handleLeaveLeague = async () => {
        if (!user || !id) return;
        if (confirm('Are you sure you want to leave this league?')) {
            await leaveLeague(id, user.uid);
            navigate('/dashboard');
        }
    };

    const copyCode = () => {
        if (!league) return;
        navigator.clipboard.writeText(league.joinCode);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
    };

    const upcomingGames = games.filter(g => g.status !== 'completed');
    const completedGames = games.filter(g => g.status === 'completed');

    // Standings: count wins from completed games
    const standings = new Map<string, { name: string; played: number; wins: number; draws: number; losses: number; gf: number; ga: number }>();
    members.forEach(m => standings.set(m.id, { name: m.displayName, played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0 }));

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-900 via-green-800 to-green-700 dark:from-green-950 dark:via-green-900 dark:to-green-800">
                <div className="text-white text-lg">Loading...</div>
            </div>
        );
    }

    if (!league) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-900 via-green-800 to-green-700 dark:from-green-950 dark:via-green-900 dark:to-green-800">
                <div className="text-center">
                    <div className="text-white text-lg mb-4">League not found</div>
                    <Link to="/dashboard" className="text-green-300 hover:underline">Back to Dashboard</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-700 dark:from-green-950 dark:via-green-900 dark:to-green-800">
            <header className="bg-green-900 dark:bg-green-950 text-white p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button onClick={() => navigate('/dashboard')} variant="ghost" size="icon" className="text-white">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <span className="font-bold text-xl">{league.name}</span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={copyCode}
                        className="flex items-center gap-1 text-green-300 hover:text-white text-sm transition-colors bg-white/10 px-3 py-1.5 rounded-lg"
                    >
                        {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {league.joinCode}
                    </button>
                </div>
            </header>

            <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-4">
                {/* Tabs */}
                <div className="flex gap-1 bg-white/5 rounded-lg p-1">
                    <button
                        onClick={() => setTab('upcoming')}
                        className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-1 ${
                            tab === 'upcoming' ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white'
                        }`}
                    >
                        <Calendar className="w-4 h-4" /> Games ({upcomingGames.length})
                    </button>
                    <button
                        onClick={() => setTab('completed')}
                        className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-1 ${
                            tab === 'completed' ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white'
                        }`}
                    >
                        <Trophy className="w-4 h-4" /> Results ({completedGames.length})
                    </button>
                    <button
                        onClick={() => setTab('members')}
                        className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-1 ${
                            tab === 'members' ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white'
                        }`}
                    >
                        <Users className="w-4 h-4" /> Members ({members.length})
                    </button>
                </div>

                {/* Upcoming Games Tab */}
                {tab === 'upcoming' && (
                    <div className="space-y-3">
                        <Button
                            onClick={() => setShowNewGame(true)}
                            className="w-full bg-green-600 hover:bg-green-500 text-white rounded-lg flex items-center justify-center gap-2 py-3"
                        >
                            <Plus className="w-4 h-4" /> Schedule a Game
                        </Button>

                        {upcomingGames.length === 0 ? (
                            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-8 text-center">
                                <p className="text-green-300">No upcoming games. Schedule one!</p>
                            </div>
                        ) : (
                            upcomingGames.map(game => (
                                <Link
                                    key={game.id}
                                    to={`/game/${game.id}`}
                                    className="block bg-white/10 backdrop-blur-sm border border-white/10 hover:bg-white/15 rounded-xl p-4 transition-colors"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-white font-bold">{game.title}</div>
                                            <div className="text-green-300 text-sm">
                                                {new Date(game.date).toLocaleDateString('en-GB', {
                                                    weekday: 'long',
                                                    day: 'numeric',
                                                    month: 'long',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs px-2 py-1 rounded-full ${
                                                game.status === 'scheduled' ? 'bg-blue-500/20 text-blue-300' :
                                                'bg-yellow-500/20 text-yellow-300'
                                            }`}>
                                                {game.status === 'in_progress' ? 'In Progress' : 'Scheduled'}
                                            </span>
                                            {user && game.createdBy === user.uid && (
                                                <button
                                                    onClick={(e) => handleDeleteGame(game.id, e)}
                                                    className="text-red-400/50 hover:text-red-400 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                            <ArrowRight className="w-4 h-4 text-white/40" />
                                        </div>
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                )}

                {/* Completed Games Tab */}
                {tab === 'completed' && (
                    <div className="space-y-3">
                        {completedGames.length === 0 ? (
                            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-8 text-center">
                                <p className="text-green-300">No completed games yet.</p>
                            </div>
                        ) : (
                            completedGames.map(game => (
                                <Link
                                    key={game.id}
                                    to={`/game/${game.id}`}
                                    className="block bg-white/10 backdrop-blur-sm border border-white/10 hover:bg-white/15 rounded-xl p-4 transition-colors"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-white font-bold">{game.title}</div>
                                            <div className="text-green-300 text-sm">
                                                {new Date(game.date).toLocaleDateString('en-GB', {
                                                    weekday: 'short',
                                                    day: 'numeric',
                                                    month: 'short',
                                                })}
                                            </div>
                                        </div>
                                        {game.score && game.teams && (
                                            <div className="text-white font-bold text-lg">
                                                <span className="text-sm text-green-300">{game.teams[0]?.name}</span>{' '}
                                                {game.score.team1} - {game.score.team2}{' '}
                                                <span className="text-sm text-green-300">{game.teams[1]?.name}</span>
                                            </div>
                                        )}
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                )}

                {/* Members Tab */}
                {tab === 'members' && (
                    <div className="space-y-3">
                        <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
                            {members.map((member, i) => (
                                <div
                                    key={member.id}
                                    className={`flex items-center justify-between p-4 ${
                                        i !== members.length - 1 ? 'border-b border-white/10' : ''
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-sm">
                                            {member.displayName.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="text-white font-medium">{member.displayName}</div>
                                            <div className="text-green-300 text-xs">{member.email}</div>
                                        </div>
                                    </div>
                                    {member.id === league.createdBy && (
                                        <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-full">
                                            Owner
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Share section */}
                        <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                            <div className="text-white font-medium mb-2">Invite others</div>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 bg-white/5 border border-white/10 rounded-lg p-3 font-mono text-lg text-center tracking-widest text-white">
                                    {league.joinCode}
                                </div>
                                <Button
                                    onClick={copyCode}
                                    className="bg-green-600 hover:bg-green-500 text-white px-4"
                                >
                                    {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                </Button>
                            </div>
                            <p className="text-green-300/70 text-xs mt-2">Share this code with others so they can join your league.</p>
                        </div>

                        {user && league.createdBy !== user.uid && (
                            <Button
                                onClick={handleLeaveLeague}
                                className="w-full bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/20 rounded-lg flex items-center justify-center gap-2"
                            >
                                <LogOut className="w-4 h-4" /> Leave League
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {/* New Game Modal */}
            {showNewGame && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50 p-4" onClick={() => setShowNewGame(false)}>
                    <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold text-green-900 dark:text-white mb-4">Schedule a Game</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                                <input
                                    type="text"
                                    value={newGameTitle}
                                    onChange={e => setNewGameTitle(e.target.value)}
                                    placeholder="e.g. Weekly kickabout"
                                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
                                <input
                                    type="date"
                                    value={newGameDate}
                                    onChange={e => setNewGameDate(e.target.value)}
                                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Time</label>
                                <input
                                    type="time"
                                    value={newGameTime}
                                    onChange={e => setNewGameTime(e.target.value)}
                                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2 justify-end mt-4">
                            <Button onClick={() => setShowNewGame(false)} variant="ghost" className="text-gray-600 dark:text-gray-300">
                                Cancel
                            </Button>
                            <Button
                                onClick={handleCreateGame}
                                disabled={!newGameTitle.trim() || !newGameDate}
                                className="bg-green-700 hover:bg-green-600 text-white"
                            >
                                Schedule
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LeaguePage;
