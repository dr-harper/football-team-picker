import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Users, Copy, Check, Calendar, CalendarCheck, Trophy, Trash2, ArrowRight, LogOut, CheckCircle, HelpCircle, XCircle, BarChart2, Pencil, X } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuth } from '../contexts/AuthContext';
import {
    subscribeToLeague,
    subscribeToLeagueGames,
    subscribeToGameAvailability,
    createGame,
    deleteGame,
    setAvailability,
    getLeagueMembers,
    leaveLeague,
    deleteLeague,
    updateUserDisplayName,
    getLeagueByCode,
} from '../utils/firestore';
import { League, Game, PlayerAvailability, AvailabilityStatus } from '../types';
import CalendarPicker from '../components/CalendarPicker';
import { geocodeLocation, GeoResult } from '../utils/weather';

const LeaguePage: React.FC = () => {
    const { code } = useParams<{ code: string }>();
    const [leagueId, setLeagueId] = useState<string | null>(null);
    const id = leagueId; // alias used throughout
    const { user } = useAuth();
    const navigate = useNavigate();
    const [league, setLeague] = useState<League | null>(null);
    const [games, setGames] = useState<Game[]>([]);
    const [members, setMembers] = useState<{ id: string; displayName: string; email: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [showNewGame, setShowNewGame] = useState(false);
    const [newGameTitle, setNewGameTitle] = useState('');
    const today = new Date().toISOString().split('T')[0];
    const [newGameDate, setNewGameDate] = useState(today);
    const [newGameTime, setNewGameTime] = useState('19:00');
    const [newGameLocation, setNewGameLocation] = useState('');
    const [verifiedLocation, setVerifiedLocation] = useState<GeoResult | null>(null);
    const [verifyingLocation, setVerifyingLocation] = useState(false);
    const [repeatWeeks, setRepeatWeeks] = useState(1);
    const [copiedCode, setCopiedCode] = useState(false);
    const [tab, setTab] = useState<'upcoming' | 'schedule' | 'completed' | 'stats' | 'members'>('upcoming');
    const [statsFilter, setStatsFilter] = useState<'all' | 'month' | 'year'>('all');
    const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
    const [editingMemberName, setEditingMemberName] = useState('');
    const [scheduleAvailability, setScheduleAvailability] = useState<Map<string, PlayerAvailability[]>>(new Map());

    // Resolve join code → Firestore document ID (wait for auth to be ready)
    useEffect(() => {
        if (!code || !user) return;
        getLeagueByCode(code).then(l => {
            if (l) setLeagueId(l.id);
            else setLoading(false);
        });
    }, [code, user]);

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

    const handleSetAvailability = useCallback(async (gameId: string, status: AvailabilityStatus) => {
        if (!user) return;
        await setAvailability(gameId, user.uid, user.displayName || user.email?.split('@')[0] || 'Player', status);
    }, [user]);

    const handleCreateGame = async () => {
        if (!user || !id || !newGameTitle.trim() || !newGameDate) return;
        const base = new Date(`${newGameDate}T${newGameTime}`);
        const locationName = verifiedLocation?.displayName || newGameLocation.trim() || undefined;
        await Promise.all(
            Array.from({ length: repeatWeeks }, (_, i) => {
                const date = new Date(base.getTime() + i * 7 * 24 * 60 * 60 * 1000);
                return createGame(
                    id,
                    newGameTitle.trim(),
                    date.getTime(),
                    user.uid,
                    locationName,
                    verifiedLocation?.lat,
                    verifiedLocation?.lon,
                );
            })
        );
        setNewGameTitle('');
        setNewGameDate(today);
        setNewGameLocation('');
        setVerifiedLocation(null);
        setRepeatWeeks(1);
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

    const handleDeleteLeague = async () => {
        if (!user || !id || !league) return;
        if (confirm(`Delete "${league.name}"? This will permanently remove all games and cannot be undone.`)) {
            navigate('/dashboard');
            deleteLeague(id);
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

    // Per-player aggregates for completed games
    const scorerTotals = new Map<string, number>();
    completedGames.forEach(g => {
        g.goalScorers?.forEach(gs => scorerTotals.set(gs.name, (scorerTotals.get(gs.name) ?? 0) + gs.goals));
    });
    const assistTotals = new Map<string, number>();
    completedGames.forEach(g => {
        g.assisters?.forEach(a => assistTotals.set(a.name, (assistTotals.get(a.name) ?? 0) + a.goals));
    });
    const motmTotals = new Map<string, number>();
    completedGames.forEach(g => {
        if (g.manOfTheMatch) motmTotals.set(g.manOfTheMatch, (motmTotals.get(g.manOfTheMatch) ?? 0) + 1);
    });

    // Win counts per player across completed games
    const winCounts = new Map<string, number>();
    const gamesPlayedCounts = new Map<string, number>();
    completedGames.forEach(g => {
        if (!g.teams || !g.score) return;
        g.teams.forEach((team, idx) => {
            const won = idx === 0 ? g.score!.team1 > g.score!.team2 : g.score!.team2 > g.score!.team1;
            team.players.forEach(p => {
                gamesPlayedCounts.set(p.name, (gamesPlayedCounts.get(p.name) ?? 0) + 1);
                if (won) winCounts.set(p.name, (winCounts.get(p.name) ?? 0) + 1);
            });
        });
    });

    // Personal stats for the logged-in user
    const myName = user?.displayName || user?.email?.split('@')[0] || '';
    const myGoals = scorerTotals.get(myName) ?? 0;
    const myAssists = assistTotals.get(myName) ?? 0;
    const myMotm = motmTotals.get(myName) ?? 0;
    const myGamesPlayed = gamesPlayedCounts.get(myName) ?? 0;
    const myWins = winCounts.get(myName) ?? 0;

    // Subscribe to availability for all upcoming games when on Upcoming or Schedule tab
    useEffect(() => {
        if (!user || (tab !== 'upcoming' && tab !== 'schedule') || upcomingGames.length === 0) return;
        const unsubs = upcomingGames.map(game =>
            subscribeToGameAvailability(game.id, (avail) => {
                setScheduleAvailability(prev => {
                    const next = new Map(prev);
                    next.set(game.id, avail);
                    return next;
                });
            })
        );
        return () => unsubs.forEach(u => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab, upcomingGames.map(g => g.id).join(',')]);

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
                <div className="grid grid-cols-5 gap-1 bg-white/5 rounded-lg p-1">
                    <button
                        onClick={() => setTab('upcoming')}
                        className={`py-2 px-2 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                            tab === 'upcoming' ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white'
                        }`}
                    >
                        <Calendar className="w-3.5 h-3.5 shrink-0" /> <span className="hidden sm:inline">Games</span><span className="sm:hidden">({upcomingGames.length})</span><span className="hidden sm:inline"> ({upcomingGames.length})</span>
                    </button>
                    <button
                        onClick={() => setTab('schedule')}
                        className={`py-2 px-2 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                            tab === 'schedule' ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white'
                        }`}
                    >
                        <CalendarCheck className="w-3.5 h-3.5 shrink-0" /> <span>Schedule</span>
                    </button>
                    <button
                        onClick={() => setTab('completed')}
                        className={`py-2 px-2 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                            tab === 'completed' ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white'
                        }`}
                    >
                        <Trophy className="w-3.5 h-3.5 shrink-0" /> <span className="hidden sm:inline">Results</span><span className="sm:hidden">({completedGames.length})</span><span className="hidden sm:inline"> ({completedGames.length})</span>
                    </button>
                    <button
                        onClick={() => setTab('stats')}
                        className={`py-2 px-2 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                            tab === 'stats' ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white'
                        }`}
                    >
                        <BarChart2 className="w-3.5 h-3.5 shrink-0" /> <span>Stats</span>
                    </button>
                    <button
                        onClick={() => setTab('members')}
                        className={`py-2 px-2 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                            tab === 'members' ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white'
                        }`}
                    >
                        <Users className="w-3.5 h-3.5 shrink-0" /> <span className="hidden sm:inline">Members</span><span className="sm:hidden">({members.length})</span><span className="hidden sm:inline"> ({members.length})</span>
                    </button>
                </div>

                {/* Upcoming Games Tab */}
                {tab === 'upcoming' && (
                    <div className="flex gap-4 items-start">
                        {/* Main game list */}
                        <div className="flex-1 min-w-0 space-y-3">

                        {!showNewGame ? (
                            <Button
                                onClick={() => {
                                    setShowNewGame(true);
                                    if (league?.defaultVenue && !newGameLocation) {
                                        setNewGameLocation(league.defaultVenue);
                                        if (league.defaultVenueLat !== undefined && league.defaultVenueLon !== undefined) {
                                            setVerifiedLocation({ displayName: league.defaultVenue, lat: league.defaultVenueLat, lon: league.defaultVenueLon });
                                        }
                                    }
                                }}
                                className="w-full bg-green-600 hover:bg-green-500 text-white rounded-lg flex items-center justify-center gap-2 py-3"
                            >
                                <Plus className="w-4 h-4" /> Schedule a Game
                            </Button>
                        ) : (
                            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 space-y-3">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-white font-semibold">Schedule a Game</span>
                                    <button onClick={() => setShowNewGame(false)} className="text-white/40 hover:text-white transition-colors text-xl leading-none">&times;</button>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-green-300 mb-1">Title</label>
                                    <input
                                        type="text"
                                        value={newGameTitle}
                                        onChange={e => setNewGameTitle(e.target.value)}
                                        placeholder="e.g. Weekly kickabout"
                                        className="w-full bg-white/10 border border-white/20 rounded-lg p-2.5 text-white placeholder-white/40 focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-green-300 mb-1">Location <span className="text-white/30 font-normal">(optional)</span></label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={newGameLocation}
                                            onChange={e => { setNewGameLocation(e.target.value); setVerifiedLocation(null); }}
                                            onKeyDown={async e => {
                                                if (e.key === 'Enter' && newGameLocation.trim()) {
                                                    e.preventDefault();
                                                    setVerifyingLocation(true);
                                                    const result = await geocodeLocation(newGameLocation.trim());
                                                    setVerifiedLocation(result);
                                                    setVerifyingLocation(false);
                                                }
                                            }}
                                            placeholder="e.g. Hackney Marshes, London"
                                            className="flex-1 bg-white/10 border border-white/20 rounded-lg p-2.5 text-white placeholder-white/40 focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                                        />
                                        <button
                                            type="button"
                                            disabled={!newGameLocation.trim() || verifyingLocation}
                                            onClick={async () => {
                                                setVerifyingLocation(true);
                                                const result = await geocodeLocation(newGameLocation.trim());
                                                setVerifiedLocation(result);
                                                setVerifyingLocation(false);
                                            }}
                                            className="px-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white text-xs transition-colors disabled:opacity-40"
                                        >
                                            {verifyingLocation ? '…' : 'Verify'}
                                        </button>
                                    </div>
                                    {verifiedLocation && (
                                        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-green-300">
                                            <span>📍</span>
                                            <span>{verifiedLocation.displayName}</span>
                                            <span className="text-green-400">✓</span>
                                        </div>
                                    )}
                                    {verifiedLocation === null && newGameLocation.trim() && !verifyingLocation && (
                                        <div className="mt-1 text-xs text-white/30">Press Verify or Enter to confirm location</div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-green-300 mb-1">Date</label>
                                    <CalendarPicker
                                        value={newGameDate}
                                        min={today}
                                        onChange={setNewGameDate}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-green-300 mb-1">Time</label>
                                    <input
                                        type="time"
                                        value={newGameTime}
                                        onChange={e => setNewGameTime(e.target.value)}
                                        className="w-full bg-white/10 border border-white/20 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-green-300 mb-1">Repeat weekly</label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="range"
                                            min={1}
                                            max={20}
                                            value={repeatWeeks}
                                            onChange={e => setRepeatWeeks(Number(e.target.value))}
                                            className="flex-1 accent-green-500"
                                        />
                                        <span className="w-20 text-xs text-center font-medium text-white bg-white/10 rounded-lg px-2 py-1.5">
                                            {repeatWeeks === 1 ? 'Once' : `${repeatWeeks} weeks`}
                                        </span>
                                    </div>
                                    {repeatWeeks > 1 && newGameDate && (
                                        <p className="text-xs text-green-300/70 mt-1">
                                            Creates {repeatWeeks} games from {new Date(`${newGameDate}T${newGameTime}`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} to {new Date(new Date(`${newGameDate}T${newGameTime}`).getTime() + (repeatWeeks - 1) * 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                        </p>
                                    )}
                                </div>
                                <Button
                                    onClick={handleCreateGame}
                                    disabled={!newGameTitle.trim() || !newGameDate}
                                    className="w-full bg-green-600 hover:bg-green-500 text-white rounded-lg"
                                >
                                    {repeatWeeks === 1 ? 'Schedule' : `Schedule ${repeatWeeks} games`}
                                </Button>
                            </div>
                        )}

                        {upcomingGames.length === 0 ? (
                            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-8 text-center">
                                <p className="text-green-300">No upcoming games. Schedule one!</p>
                            </div>
                        ) : (
                            upcomingGames.map(game => {
                                const avail = scheduleAvailability.get(game.id) ?? [];
                                const myStatus = avail.find(a => a.userId === user?.uid)?.status;
                                const guestStatusMap = game.guestAvailability ?? {};
                                const inCount = avail.filter(a => a.status === 'available').length
                                    + (game.guestPlayers ?? []).filter(n => (guestStatusMap[n] ?? 'available') === 'available').length;
                                const maybeCount = avail.filter(a => a.status === 'maybe').length;
                                return (
                                    <div key={game.id} className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-4 flex items-center gap-3">
                                        <Link to={`/league/${code}/game/${game.gameCode || game.id}`} className="flex-1 min-w-0 hover:text-green-300 transition-colors">
                                            <div className="text-white font-bold">{game.title}</div>
                                            <div className="text-green-300 text-sm mt-0.5">
                                                {new Date(game.date).toLocaleDateString('en-GB', {
                                                    weekday: 'long',
                                                    day: 'numeric',
                                                    month: 'long',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </div>
                                            <div className="flex items-center gap-3 mt-1 text-xs">
                                                <span className="text-green-400">{inCount} in</span>
                                                {maybeCount > 0 && <span className="text-yellow-400">{maybeCount} maybe</span>}
                                            </div>
                                        </Link>
                                        <div className="flex items-center gap-2 shrink-0">
                                            {user && (
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={() => handleSetAvailability(game.id, 'available')}
                                                        title="I'm in"
                                                        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                                                            myStatus === 'available'
                                                                ? 'bg-green-600 text-white'
                                                                : 'bg-white/10 text-white/50 hover:bg-white/20'
                                                        }`}
                                                    >
                                                        <CheckCircle className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleSetAvailability(game.id, 'maybe')}
                                                        title="Maybe"
                                                        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                                                            myStatus === 'maybe'
                                                                ? 'bg-yellow-600 text-white'
                                                                : 'bg-white/10 text-white/50 hover:bg-white/20'
                                                        }`}
                                                    >
                                                        <HelpCircle className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleSetAvailability(game.id, 'unavailable')}
                                                        title="Can't make it"
                                                        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                                                            myStatus === 'unavailable'
                                                                ? 'bg-red-600 text-white'
                                                                : 'bg-white/10 text-white/50 hover:bg-white/20'
                                                        }`}
                                                    >
                                                        <XCircle className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}
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
                                );
                            })
                        )}
                        </div>{/* end main game list */}

                        {/* My Stats sidebar */}
                        {user && completedGames.length > 0 && (
                            <div className="w-36 shrink-0 bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-4 space-y-4">
                                <div className="text-xs font-semibold text-green-300 uppercase tracking-wide">My Stats</div>
                                <div className="space-y-3">
                                    <div>
                                        <div className="text-2xl font-bold text-white">{myGamesPlayed}</div>
                                        <div className="text-xs text-white/50 mt-0.5">Games</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-white">{myWins}</div>
                                        <div className="text-xs text-white/50 mt-0.5">Wins</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-white">{myGoals}</div>
                                        <div className="text-xs text-white/50 mt-0.5">Goals</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-white">{myAssists}</div>
                                        <div className="text-xs text-white/50 mt-0.5">Assists</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-white">{myMotm}</div>
                                        <div className="text-xs text-white/50 mt-0.5">MOTM</div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setTab('stats')}
                                    className="text-xs text-green-300 hover:text-white transition-colors flex items-center gap-1"
                                >
                                    View more <ArrowRight className="w-3 h-3" />
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Schedule Tab — all upcoming games with inline availability toggles */}
                {tab === 'schedule' && (
                    <div className="space-y-3">
                        {upcomingGames.length === 0 ? (
                            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-8 text-center">
                                <p className="text-green-300">No upcoming games scheduled.</p>
                            </div>
                        ) : (
                            upcomingGames.map(game => {
                                const avail = scheduleAvailability.get(game.id) ?? [];
                                const myStatus = avail.find(a => a.userId === user?.uid)?.status;
                                const guestStatusMap = game.guestAvailability ?? {};
                                const inCount = avail.filter(a => a.status === 'available').length
                                    + (game.guestPlayers ?? []).filter(n => (guestStatusMap[n] ?? 'available') === 'available').length;
                                const maybeCount = avail.filter(a => a.status === 'maybe').length;
                                return (
                                    <div key={game.id} className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <Link to={`/league/${code}/game/${game.gameCode || game.id}`} className="flex-1 min-w-0">
                                                <div className="text-white font-bold hover:text-green-300 transition-colors">
                                                    {game.title}
                                                </div>
                                                <div className="text-green-300 text-sm mt-0.5">
                                                    {new Date(game.date).toLocaleDateString('en-GB', {
                                                        weekday: 'short',
                                                        day: 'numeric',
                                                        month: 'short',
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                    {game.location && (
                                                        <span className="text-white/40 ml-2">· {game.location}</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 mt-1.5 text-xs">
                                                    <span className="text-green-400">{inCount} in</span>
                                                    {maybeCount > 0 && <span className="text-yellow-400">{maybeCount} maybe</span>}
                                                </div>
                                            </Link>
                                            {user && (
                                                <div className="flex gap-1.5 shrink-0">
                                                    <button
                                                        onClick={() => handleSetAvailability(game.id, 'available')}
                                                        title="I'm in"
                                                        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                                                            myStatus === 'available'
                                                                ? 'bg-green-600 text-white'
                                                                : 'bg-white/10 text-white/50 hover:bg-white/20'
                                                        }`}
                                                    >
                                                        <CheckCircle className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleSetAvailability(game.id, 'maybe')}
                                                        title="Maybe"
                                                        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                                                            myStatus === 'maybe'
                                                                ? 'bg-yellow-600 text-white'
                                                                : 'bg-white/10 text-white/50 hover:bg-white/20'
                                                        }`}
                                                    >
                                                        <HelpCircle className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleSetAvailability(game.id, 'unavailable')}
                                                        title="Can't make it"
                                                        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                                                            myStatus === 'unavailable'
                                                                ? 'bg-red-600 text-white'
                                                                : 'bg-white/10 text-white/50 hover:bg-white/20'
                                                        }`}
                                                    >
                                                        <XCircle className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {/* Completed Games Tab */}
                {tab === 'completed' && (
                    <div className="space-y-3">
                        {/* Aggregate stats */}
                        {completedGames.length > 0 && (
                            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-4 grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-xs text-green-300 mb-2 font-medium uppercase tracking-wide">Top scorer</div>
                                    {scorerTotals.size > 0 ? (
                                        <div className="space-y-1">
                                            {[...scorerTotals.entries()]
                                                .sort((a, b) => b[1] - a[1])
                                                .slice(0, 3)
                                                .map(([name, goals]) => (
                                                    <div key={name} className="flex items-center justify-between text-sm">
                                                        <span className="text-white truncate">{name}</span>
                                                        <span className="text-green-300 ml-2 shrink-0">{goals} ⚽</span>
                                                    </div>
                                                ))}
                                        </div>
                                    ) : (
                                        <div className="text-white/40 text-sm">No goals recorded</div>
                                    )}
                                </div>
                                <div>
                                    <div className="text-xs text-green-300 mb-2 font-medium uppercase tracking-wide">Player of the match</div>
                                    {motmTotals.size > 0 ? (
                                        <div className="space-y-1">
                                            {[...motmTotals.entries()]
                                                .sort((a, b) => b[1] - a[1])
                                                .slice(0, 3)
                                                .map(([name, count]) => (
                                                    <div key={name} className="flex items-center justify-between text-sm">
                                                        <span className="text-white truncate">{name}</span>
                                                        <span className="text-yellow-300 ml-2 shrink-0">{count} ⭐</span>
                                                    </div>
                                                ))}
                                        </div>
                                    ) : (
                                        <div className="text-white/40 text-sm">No awards yet</div>
                                    )}
                                </div>
                            </div>
                        )}

                        {completedGames.length === 0 ? (
                            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-8 text-center">
                                <p className="text-green-300">No completed games yet.</p>
                            </div>
                        ) : (
                            completedGames.map(game => (
                                <Link
                                    key={game.id}
                                    to={`/league/${code}/game/${game.gameCode || game.id}`}
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

                {/* Stats Tab */}
                {tab === 'stats' && (
                    <div className="space-y-4">
                        {/* Date filter pills */}
                        <div className="flex gap-1.5 bg-white/5 p-1 rounded-xl">
                            {(['all', 'year', 'month'] as const).map(f => {
                                const label = f === 'all' ? 'All Time' : f === 'year' ? 'This Year' : 'Last Month';
                                return (
                                    <button
                                        key={f}
                                        onClick={() => setStatsFilter(f)}
                                        className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                            statsFilter === f
                                                ? 'bg-white/15 text-white shadow-sm'
                                                : 'text-white/40 hover:text-white/70'
                                        }`}
                                    >
                                        {label}
                                    </button>
                                );
                            })}
                        </div>

                        {completedGames.length === 0 ? (
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-10 text-center">
                                <div className="text-4xl mb-3">📊</div>
                                <p className="text-white/50 text-sm">No completed games yet — check back after your first match!</p>
                            </div>
                        ) : (() => {
                            // Filter games by selected period
                            const now = new Date();
                            const filteredGames = completedGames.filter(g => {
                                if (statsFilter === 'all') return true;
                                const d = new Date(g.date);
                                if (statsFilter === 'year') return d.getFullYear() === now.getFullYear();
                                // last month: same month/year as one calendar month ago
                                const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                                return d.getFullYear() === lm.getFullYear() && d.getMonth() === lm.getMonth();
                            });

                            // Re-derive all aggregates from filtered games
                            const fScorerTotals = new Map<string, number>();
                            filteredGames.forEach(g => g.goalScorers?.forEach(gs =>
                                fScorerTotals.set(gs.name, (fScorerTotals.get(gs.name) ?? 0) + gs.goals)));
                            const fAssistTotals = new Map<string, number>();
                            filteredGames.forEach(g => g.assisters?.forEach(a =>
                                fAssistTotals.set(a.name, (fAssistTotals.get(a.name) ?? 0) + a.goals)));
                            const fMotmTotals = new Map<string, number>();
                            filteredGames.forEach(g => {
                                if (g.manOfTheMatch) fMotmTotals.set(g.manOfTheMatch, (fMotmTotals.get(g.manOfTheMatch) ?? 0) + 1);
                            });
                            const fWinCounts = new Map<string, number>();
                            const fPlayedCounts = new Map<string, number>();
                            filteredGames.forEach(g => {
                                if (!g.teams || !g.score) return;
                                g.teams.forEach((team, idx) => {
                                    const won = idx === 0 ? g.score!.team1 > g.score!.team2 : g.score!.team2 > g.score!.team1;
                                    team.players.forEach(p => {
                                        fPlayedCounts.set(p.name, (fPlayedCounts.get(p.name) ?? 0) + 1);
                                        if (won) fWinCounts.set(p.name, (fWinCounts.get(p.name) ?? 0) + 1);
                                    });
                                });
                            });
                            const fCleanSheets = new Map<string, number>();
                            filteredGames.forEach(g => {
                                if (!g.teams || !g.score) return;
                                g.teams.forEach((team, idx) => {
                                    const conceded = idx === 0 ? g.score!.team2 : g.score!.team1;
                                    if (conceded === 0) {
                                        team.players.forEach(p =>
                                            fCleanSheets.set(p.name, (fCleanSheets.get(p.name) ?? 0) + 1));
                                    }
                                });
                            });
                            const fHatTricks = new Map<string, number>();
                            filteredGames.forEach(g => {
                                g.goalScorers?.forEach(gs => {
                                    if (gs.goals >= 3) fHatTricks.set(gs.name, (fHatTricks.get(gs.name) ?? 0) + 1);
                                });
                            });
                            // Form: last 5 results per player (oldest→newest)
                            const fForm = new Map<string, ('W' | 'D' | 'L')[]>();
                            [...filteredGames].reverse().forEach(g => {
                                if (!g.teams || !g.score) return;
                                g.teams.forEach((team, idx) => {
                                    const scored = idx === 0 ? g.score!.team1 : g.score!.team2;
                                    const conceded = idx === 0 ? g.score!.team2 : g.score!.team1;
                                    const result: 'W' | 'D' | 'L' = scored > conceded ? 'W' : scored < conceded ? 'L' : 'D';
                                    team.players.forEach(p => {
                                        const prev = fForm.get(p.name) ?? [];
                                        fForm.set(p.name, [...prev, result].slice(-5));
                                    });
                                });
                            });

                            if (filteredGames.length === 0) return (
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-10 text-center">
                                    <div className="text-4xl mb-3">📭</div>
                                    <p className="text-white/50 text-sm">No games in this period.</p>
                                </div>
                            );

                            const totalGoals = [...fScorerTotals.values()].reduce((a, b) => a + b, 0);
                            const totalAssists = [...fAssistTotals.values()].reduce((a, b) => a + b, 0);

                            // Contributions (goals + assists combined)
                            const contributorNames = new Set([...fScorerTotals.keys(), ...fAssistTotals.keys()]);
                            const sortedContributors = [...contributorNames]
                                .map(name => ({
                                    name,
                                    goals: fScorerTotals.get(name) ?? 0,
                                    assists: fAssistTotals.get(name) ?? 0,
                                    total: (fScorerTotals.get(name) ?? 0) + (fAssistTotals.get(name) ?? 0),
                                }))
                                .sort((a, b) => b.total - a.total || b.goals - a.goals);
                            const maxContrib = Math.max(...sortedContributors.map(c => c.total), 1);

                            // Wins sorted by win rate desc
                            const sortedWins = [...fPlayedCounts.entries()]
                                .sort((a, b) => {
                                    const rateA = (fWinCounts.get(a[0]) ?? 0) / a[1];
                                    const rateB = (fWinCounts.get(b[0]) ?? 0) / b[1];
                                    return rateB - rateA || b[1] - a[1];
                                });
                            const maxWins = Math.max(...[...fPlayedCounts.keys()].map(n => fWinCounts.get(n) ?? 0), 1);

                            const sortedCleanSheets = [...fCleanSheets.entries()].sort((a, b) => b[1] - a[1]);
                            const maxCS = Math.max(...fCleanSheets.values(), 1);
                            const sortedMotm = [...fMotmTotals.entries()].sort((a, b) => b[1] - a[1]);

                            // Attendance = games played in period / total filtered games
                            const sortedAttendance = [...fPlayedCounts.entries()]
                                .map(([name, played]) => ({ name, played, rate: Math.round((played / filteredGames.length) * 100) }))
                                .sort((a, b) => b.rate - a.rate || b.played - a.played);

                            const formDot = (r: 'W' | 'D' | 'L' | null) => (
                                <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold ${
                                    r === 'W' ? 'bg-green-500/25 text-green-400' :
                                    r === 'D' ? 'bg-yellow-500/25 text-yellow-400' :
                                    r === 'L' ? 'bg-red-500/25 text-red-400' :
                                    'bg-white/5 text-white/15'
                                }`}>{r ?? '·'}</span>
                            );

                            const statBar = (pct: number, colorClass: string) => (
                                <div className="h-1 bg-white/8 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full transition-all ${colorClass}`} style={{ width: `${pct}%` }} />
                                </div>
                            );

                            // Personal highlights for signed-in user
                            const myGoalsF = fScorerTotals.get(myName) ?? 0;
                            const myAssistsF = fAssistTotals.get(myName) ?? 0;
                            const myWinsF = fWinCounts.get(myName) ?? 0;
                            const myPlayedF = fPlayedCounts.get(myName) ?? 0;
                            const myWinPctF = myPlayedF > 0 ? Math.round((myWinsF / myPlayedF) * 100) : 0;
                            const myMotmF = fMotmTotals.get(myName) ?? 0;
                            const hasPersonalData = myPlayedF > 0;

                            return (
                                <>
                                    {/* Personal highlight card */}
                                    {user && hasPersonalData && (
                                        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-600/30 via-green-700/20 to-transparent border border-green-500/20 p-5">
                                            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-green-400/10 via-transparent to-transparent pointer-events-none" />
                                            <div className="relative">
                                                <div className="flex items-center gap-2 mb-4">
                                                    <div className="w-8 h-8 rounded-full bg-green-500/20 border border-green-400/30 flex items-center justify-center text-sm font-bold text-green-300">
                                                        {(myName[0] ?? '?').toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-semibold text-white leading-tight">{myName}</div>
                                                        <div className="text-xs text-green-400/70">Your stats</div>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-4 gap-3">
                                                    {[
                                                        { value: myPlayedF, label: 'Games' },
                                                        { value: myGoalsF, label: 'Goals' },
                                                        { value: myAssistsF, label: 'Assists' },
                                                        { value: `${myWinPctF}%`, label: 'Win rate' },
                                                    ].map(({ value, label }) => (
                                                        <div key={label} className="text-center">
                                                            <div className="text-xl font-bold text-white tabular-nums">{value}</div>
                                                            <div className="text-[10px] text-white/40 mt-0.5 uppercase tracking-wide">{label}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                                {myMotmF > 0 && (
                                                    <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-1.5">
                                                        <span className="text-sm">⭐</span>
                                                        <span className="text-xs text-white/60">Player of the Match <span className="text-yellow-300 font-semibold">{myMotmF}×</span></span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* League summary */}
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { emoji: '🎮', label: 'Games', value: filteredGames.length },
                                            { emoji: '⚽', label: 'Goals', value: totalGoals },
                                            { emoji: '🅰️', label: 'Assists', value: totalAssists },
                                        ].map(({ emoji, label, value }) => (
                                            <div key={label} className="bg-white/5 border border-white/8 rounded-xl p-3 text-center">
                                                <div className="text-lg mb-1">{emoji}</div>
                                                <div className="text-xl font-bold text-white tabular-nums">{value}</div>
                                                <div className="text-[10px] text-white/40 uppercase tracking-wide mt-0.5">{label}</div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Goal contributions */}
                                    <div className="bg-white/5 border border-white/8 rounded-2xl overflow-hidden">
                                        <div className="flex items-center gap-2 px-4 pt-4 pb-3">
                                            <span className="text-base">⚽</span>
                                            <span className="font-semibold text-white text-sm">Goal Contributions</span>
                                            <span className="text-white/25 text-[10px] ml-auto uppercase tracking-wide">G · A</span>
                                        </div>
                                        {sortedContributors.length === 0 ? (
                                            <p className="px-4 pb-4 text-white/30 text-sm">No goals or assists yet</p>
                                        ) : (
                                            <div className="divide-y divide-white/5">
                                                {sortedContributors.map(({ name, goals, assists, total }, i) => (
                                                    <div key={name} className={`px-4 py-2.5 ${name === myName ? 'bg-green-500/8' : ''}`}>
                                                        <div className="flex items-center gap-2 mb-1.5">
                                                            <span className="w-5 text-center text-sm shrink-0 leading-none">
                                                                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : <span className="text-white/25 text-xs">{i + 1}</span>}
                                                            </span>
                                                            <span className={`flex-1 text-sm truncate ${name === myName ? 'text-green-300 font-semibold' : 'text-white/90'}`}>
                                                                {name}
                                                                {(fHatTricks.get(name) ?? 0) > 0 && (
                                                                    <span className="ml-1.5 text-[10px] bg-amber-500/15 text-amber-300 px-1 py-0.5 rounded font-medium">
                                                                        🎩{fHatTricks.get(name)! > 1 ? ` ×${fHatTricks.get(name)}` : ''}
                                                                    </span>
                                                                )}
                                                            </span>
                                                            <span className="text-xs shrink-0 tabular-nums text-white/70">
                                                                <span className="text-white font-semibold">{goals}</span>
                                                                <span className="text-white/25 mx-0.5">·</span>
                                                                <span className="text-blue-300">{assists}</span>
                                                            </span>
                                                        </div>
                                                        <div className="ml-7 h-1 bg-white/8 rounded-full overflow-hidden flex gap-px">
                                                            <div
                                                                className={`h-full ${i === 0 ? 'bg-yellow-400' : i === 1 ? 'bg-slate-300' : i === 2 ? 'bg-amber-600' : 'bg-green-500/70'}`}
                                                                style={{ width: `${(goals / maxContrib) * 100}%` }}
                                                            />
                                                            <div className="h-full bg-blue-400/40" style={{ width: `${(assists / maxContrib) * 100}%` }} />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Win rate + form */}
                                    <div className="bg-white/5 border border-white/8 rounded-2xl overflow-hidden">
                                        <div className="flex items-center gap-2 px-4 pt-4 pb-3">
                                            <span className="text-base">🏆</span>
                                            <span className="font-semibold text-white text-sm">Win Rate</span>
                                            <span className="text-white/25 text-[10px] ml-auto uppercase tracking-wide">Form · W · %</span>
                                        </div>
                                        {sortedWins.length === 0 ? (
                                            <p className="px-4 pb-4 text-white/30 text-sm">No results yet</p>
                                        ) : (
                                            <div className="divide-y divide-white/5">
                                                {sortedWins.map(([name, played], i) => {
                                                    const wins = fWinCounts.get(name) ?? 0;
                                                    const pct = Math.round((wins / played) * 100);
                                                    const form = fForm.get(name) ?? [];
                                                    const paddedForm: ('W' | 'D' | 'L' | null)[] = [...Array(Math.max(0, 5 - form.length)).fill(null), ...form];
                                                    return (
                                                        <div key={name} className={`px-4 py-2.5 ${name === myName ? 'bg-green-500/8' : ''}`}>
                                                            <div className="flex items-center gap-2 mb-1.5">
                                                                <span className="w-5 text-center text-sm shrink-0 leading-none">
                                                                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : <span className="text-white/25 text-xs">{i + 1}</span>}
                                                                </span>
                                                                <span className={`flex-1 text-sm truncate ${name === myName ? 'text-green-300 font-semibold' : 'text-white/90'}`}>{name}</span>
                                                                <span className="flex gap-0.5 shrink-0 mr-2">{paddedForm.map((r, j) => <React.Fragment key={j}>{formDot(r)}</React.Fragment>)}</span>
                                                                <span className="text-xs shrink-0 tabular-nums text-white/50 w-14 text-right">{wins}W · {pct}%</span>
                                                            </div>
                                                            {statBar((wins / maxWins) * 100, i === 0 ? 'bg-yellow-400' : i === 1 ? 'bg-slate-300' : i === 2 ? 'bg-amber-600' : 'bg-blue-500/60')}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {/* Clean sheets */}
                                    {sortedCleanSheets.length > 0 && (
                                        <div className="bg-white/5 border border-white/8 rounded-2xl overflow-hidden">
                                            <div className="flex items-center gap-2 px-4 pt-4 pb-3">
                                                <span className="text-base">🧤</span>
                                                <span className="font-semibold text-white text-sm">Clean Sheets</span>
                                            </div>
                                            <div className="divide-y divide-white/5">
                                                {sortedCleanSheets.map(([name, count], i) => (
                                                    <div key={name} className={`px-4 py-2.5 ${name === myName ? 'bg-green-500/8' : ''}`}>
                                                        <div className="flex items-center gap-2 mb-1.5">
                                                            <span className="w-5 text-center text-sm shrink-0 leading-none">
                                                                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : <span className="text-white/25 text-xs">{i + 1}</span>}
                                                            </span>
                                                            <span className={`flex-1 text-sm truncate ${name === myName ? 'text-green-300 font-semibold' : 'text-white/90'}`}>{name}</span>
                                                            <span className="text-white/50 text-xs shrink-0 tabular-nums">{count}</span>
                                                        </div>
                                                        {statBar((count / maxCS) * 100, i === 0 ? 'bg-yellow-400' : i === 1 ? 'bg-slate-300' : i === 2 ? 'bg-amber-600' : 'bg-cyan-500/60')}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Attendance */}
                                    {sortedAttendance.length > 0 && (
                                        <div className="bg-white/5 border border-white/8 rounded-2xl overflow-hidden">
                                            <div className="flex items-center gap-2 px-4 pt-4 pb-3">
                                                <span className="text-base">📅</span>
                                                <span className="font-semibold text-white text-sm">Attendance</span>
                                                <span className="text-white/25 text-[10px] ml-auto uppercase tracking-wide">of {filteredGames.length} games</span>
                                            </div>
                                            <div className="divide-y divide-white/5">
                                                {sortedAttendance.map(({ name, played, rate }) => (
                                                    <div key={name} className={`px-4 py-2.5 flex items-center gap-3 ${name === myName ? 'bg-green-500/8' : ''}`}>
                                                        <span className={`flex-1 text-sm truncate ${name === myName ? 'text-green-300 font-semibold' : 'text-white/80'}`}>{name}</span>
                                                        <span className="text-white/30 text-xs tabular-nums shrink-0">{played}/{filteredGames.length}</span>
                                                        <span className={`text-xs font-semibold shrink-0 w-9 text-right tabular-nums ${rate >= 80 ? 'text-green-400' : rate >= 50 ? 'text-white/70' : 'text-white/30'}`}>{rate}%</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Player of the Match */}
                                    {sortedMotm.length > 0 && (
                                        <div className="bg-white/5 border border-white/8 rounded-2xl overflow-hidden">
                                            <div className="flex items-center gap-2 px-4 pt-4 pb-3">
                                                <span className="text-base">⭐</span>
                                                <span className="font-semibold text-white text-sm">Player of the Match</span>
                                            </div>
                                            {sortedMotm.length >= 2 && (
                                                <div className="flex items-end justify-center gap-2 px-4 pb-4">
                                                    {/* 2nd place */}
                                                    {sortedMotm[1] && (
                                                        <div className="flex-1 text-center">
                                                            <div className="text-xl mb-1.5">🥈</div>
                                                            <div className={`text-xs truncate mb-2 ${sortedMotm[1][0] === myName ? 'text-green-300 font-semibold' : 'text-white/70'}`}>{sortedMotm[1][0]}</div>
                                                            <div className="bg-white/10 rounded-t-xl pt-5 pb-3">
                                                                <span className="text-white font-bold tabular-nums">{sortedMotm[1][1]}×</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {/* 1st place */}
                                                    <div className="flex-1 text-center">
                                                        <div className="text-2xl mb-1.5">🥇</div>
                                                        <div className={`text-xs font-semibold truncate mb-2 ${sortedMotm[0][0] === myName ? 'text-green-300' : 'text-white'}`}>{sortedMotm[0][0]}</div>
                                                        <div className="bg-gradient-to-b from-yellow-500/30 to-yellow-600/10 border border-yellow-500/20 rounded-t-xl pt-7 pb-3">
                                                            <span className="text-yellow-300 font-bold text-lg tabular-nums">{sortedMotm[0][1]}×</span>
                                                        </div>
                                                    </div>
                                                    {/* 3rd place */}
                                                    {sortedMotm[2] && (
                                                        <div className="flex-1 text-center">
                                                            <div className="text-xl mb-1.5">🥉</div>
                                                            <div className={`text-xs truncate mb-2 ${sortedMotm[2][0] === myName ? 'text-green-300 font-semibold' : 'text-white/50'}`}>{sortedMotm[2][0]}</div>
                                                            <div className="bg-white/5 rounded-t-xl pt-3 pb-3">
                                                                <span className="text-white/50 font-bold tabular-nums">{sortedMotm[2][1]}×</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            {sortedMotm.slice(sortedMotm.length >= 2 ? 3 : 0).map(([name, count]) => (
                                                <div key={name} className={`flex items-center justify-between px-4 py-2.5 border-t border-white/5 ${name === myName ? 'bg-green-500/8' : ''}`}>
                                                    <span className={`text-sm ${name === myName ? 'text-green-300 font-semibold' : 'text-white/60'}`}>{name}</span>
                                                    <span className="text-white/40 text-xs tabular-nums">{count}×</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            );
                        })()}
                    </div>
                )}

                {/* Members Tab */}
                {tab === 'members' && (
                    <div className="space-y-3">
                        <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
                            {members.map((member, i) => {
                                const isAdmin = user?.uid === league.createdBy;
                                const isEditing = editingMemberId === member.id;
                                return (
                                    <div
                                        key={member.id}
                                        className={`flex items-center justify-between p-4 gap-3 ${
                                            i !== members.length - 1 ? 'border-b border-white/10' : ''
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <div className="w-8 h-8 shrink-0 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-sm">
                                                {member.displayName.charAt(0).toUpperCase()}
                                            </div>
                                            {isEditing ? (
                                                <form
                                                    className="flex items-center gap-2 flex-1"
                                                    onSubmit={async e => {
                                                        e.preventDefault();
                                                        const trimmed = editingMemberName.trim();
                                                        if (!trimmed) return;
                                                        await updateUserDisplayName(member.id, trimmed);
                                                        setMembers(prev => prev.map(m => m.id === member.id ? { ...m, displayName: trimmed } : m));
                                                        setEditingMemberId(null);
                                                    }}
                                                >
                                                    <input
                                                        autoFocus
                                                        value={editingMemberName}
                                                        onChange={e => setEditingMemberName(e.target.value)}
                                                        maxLength={30}
                                                        className="flex-1 bg-white/10 border border-white/30 rounded-lg px-2 py-1 text-white text-sm focus:ring-2 focus:ring-green-400 outline-none"
                                                    />
                                                    <button type="submit" className="text-green-400 hover:text-green-300 shrink-0">
                                                        <Check className="w-4 h-4" />
                                                    </button>
                                                    <button type="button" onClick={() => setEditingMemberId(null)} className="text-white/40 hover:text-white shrink-0">
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </form>
                                            ) : (
                                                <div className="min-w-0">
                                                    <div className="text-white font-medium truncate">{member.displayName}</div>
                                                    <div className="text-green-300 text-xs truncate">{member.email}</div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            {member.id === league.createdBy && (
                                                <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-full">
                                                    Owner
                                                </span>
                                            )}
                                            {isAdmin && !isEditing && (
                                                <button
                                                    onClick={() => { setEditingMemberId(member.id); setEditingMemberName(member.displayName); }}
                                                    className="text-white/30 hover:text-white/70 transition-colors"
                                                    title="Edit name"
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
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
                        {user && league.createdBy === user.uid && (
                            <Button
                                onClick={handleDeleteLeague}
                                className="w-full bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/20 rounded-lg flex items-center justify-center gap-2"
                            >
                                <Trash2 className="w-4 h-4" /> Delete League
                            </Button>
                        )}
                    </div>
                )}
            </div>

        </div>
    );
};

export default LeaguePage;
