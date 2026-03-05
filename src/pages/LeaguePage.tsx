import React, { useState, useEffect, useCallback } from 'react';
import { ResponsiveContainer, AreaChart, Area, LineChart, Line, XAxis, YAxis, ReferenceLine, Tooltip } from 'recharts';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Plus, Users, Copy, Check, Calendar, Trophy, Trash2, ArrowRight, CheckCircle, HelpCircle, XCircle, BarChart2, Pencil, X, User, LogOut, Wallet } from 'lucide-react';
import AppHeader from '../components/AppHeader';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Button } from '../components/ui/button';
import { useAuth } from '../contexts/AuthContext';
import { PLAYER_POSITIONS } from '../constants/playerPositions';
import { PLAYER_TAGS } from '../constants/playerTags';
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
    removeMember,
    updateUserDisplayName,
    getLeagueByCode,
    updateLeagueDefaultCost,
    updateLeaguePayments,
    updateLeagueExpenses,
    updateLeagueAdmins,
} from '../utils/firestore';
import { League, Game, PlayerAvailability, AvailabilityStatus, PaymentRecord, LeagueExpense } from '../types';
import CalendarPicker from '../components/CalendarPicker';
import { geocodeLocation, GeoResult } from '../utils/weather';

const LeaguePage: React.FC = () => {
    const { code } = useParams<{ code: string }>();
    const [leagueId, setLeagueId] = useState<string | null>(null);
    const id = leagueId; // alias used throughout
    const { user, updatePlayerTags, updateBio } = useAuth();
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
    const [tab, setTab] = useState<'upcoming' | 'completed' | 'stats' | 'members' | 'profile' | 'finance'>('upcoming');
    const [statsFilter, setStatsFilter] = useState<'all' | 'month' | 'year'>('all');
    const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
    const [editingMemberName, setEditingMemberName] = useState('');
    const [scheduleAvailability, setScheduleAvailability] = useState<Map<string, PlayerAvailability[]>>(new Map());
    const [expandedAvailGame, setExpandedAvailGame] = useState<string | null>(null);
    const [leagueProfile, setLeagueProfile] = useState<{ tags: string[]; positions: string[]; bio: string; hasSetTags: boolean } | null>(null);
    const [isEditingLeagueProfile, setIsEditingLeagueProfile] = useState(false);
    const [leagueEditPositions, setLeagueEditPositions] = useState<string[]>([]);
    const [leagueEditTags, setLeagueEditTags] = useState<string[]>([]);
    const [leagueEditBio, setLeagueEditBio] = useState('');
    const [savingLeagueProfile, setSavingLeagueProfile] = useState(false);
    const MAX_TAGS = 3;
    const [newGameCost, setNewGameCost] = useState('');
    const [editingDefaultCost, setEditingDefaultCost] = useState(false);
    const [defaultCostInput, setDefaultCostInput] = useState('');
    const [addingPaymentFor, setAddingPaymentFor] = useState<string | null>(null);
    const [paymentInputs, setPaymentInputs] = useState<Record<string, string>>({});
    const [selectedPlayerChart, setSelectedPlayerChart] = useState<string | null>(null);
    const [showMyPaymentForm, setShowMyPaymentForm] = useState(false);
    const [myPaymentAmount, setMyPaymentAmount] = useState('');
    const [showMyExpenseForm, setShowMyExpenseForm] = useState(false);
    const [myExpenseAmount, setMyExpenseAmount] = useState('');
    const [myExpenseDesc, setMyExpenseDesc] = useState('');

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

    useEffect(() => {
        if (!user) return;
        getDoc(doc(db, 'users', user.uid)).then(snap => {
            if (snap.exists()) {
                const data = snap.data();
                setLeagueProfile({
                    tags: data.playerTags ?? [],
                    positions: data.preferredPositions ?? [],
                    bio: data.bio ?? '',
                    hasSetTags: data.hasSetTags === true,
                });
            }
        });
    }, [user]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleSaveLeagueProfile = async () => {
        if (leagueEditTags.length !== MAX_TAGS || leagueEditPositions.length === 0) return;
        setSavingLeagueProfile(true);
        try {
            await updatePlayerTags(leagueEditTags, leagueEditPositions);
            await updateBio(leagueEditBio.trim());
            setLeagueProfile(prev => prev ? { ...prev, tags: leagueEditTags, positions: leagueEditPositions, bio: leagueEditBio.trim(), hasSetTags: true } : prev);
            setIsEditingLeagueProfile(false);
        } catch (err) {
            console.error('[saveLeagueProfile]', err);
        }
        setSavingLeagueProfile(false);
    };

    const handleCreateGame = async () => {
        if (!user || !id || !newGameTitle.trim() || !newGameDate) return;
        const base = new Date(`${newGameDate}T${newGameTime}`);
        const locationName = verifiedLocation?.displayName || newGameLocation.trim() || undefined;
        const parsedCost = parseFloat(newGameCost);
        const costPerPerson = !isNaN(parsedCost) && newGameCost.trim() !== '' ? parsedCost : undefined;
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
                    costPerPerson,
                );
            })
        );
        setNewGameTitle('');
        setNewGameDate(today);
        setNewGameLocation('');
        setVerifiedLocation(null);
        setRepeatWeeks(1);
        setNewGameCost('');
        setShowNewGame(false);
    };

    const handleSaveDefaultCost = async () => {
        if (!id) return;
        const cost = parseFloat(defaultCostInput);
        await updateLeagueDefaultCost(id, isNaN(cost) || defaultCostInput.trim() === '' ? null : cost);
        setEditingDefaultCost(false);
    };

    const handleRecordPayment = async (playerName: string) => {
        if (!id || !league) return;
        const amount = parseFloat(paymentInputs[playerName] ?? '');
        if (isNaN(amount) || amount <= 0) return;
        const currentHistory = (league.payments ?? {})[playerName] ?? [];
        const updatedPayments = {
            ...(league.payments ?? {}),
            [playerName]: [...currentHistory, { amount, date: Date.now() }],
        };
        await updateLeaguePayments(id, updatedPayments);
        setPaymentInputs(prev => ({ ...prev, [playerName]: '' }));
        setAddingPaymentFor(null);
    };

    const handleSubmitMyPayment = async () => {
        const amount = parseFloat(myPaymentAmount);
        if (!amount || amount <= 0 || !id || !league) return;
        const currentHistory = (league.payments ?? {})[myName] ?? [];
        await updateLeaguePayments(id, {
            ...(league.payments ?? {}),
            [myName]: [...currentHistory, { amount, date: Date.now() }],
        });
        setMyPaymentAmount('');
        setShowMyPaymentForm(false);
    };

    const handleSubmitExpense = async () => {
        const amount = parseFloat(myExpenseAmount);
        if (!amount || amount <= 0 || !myExpenseDesc.trim() || !id || !league) return;
        const newExpense: LeagueExpense = {
            id: crypto.randomUUID(),
            playerName: myName,
            amount,
            description: myExpenseDesc.trim(),
            date: Date.now(),
            status: 'pending',
        };
        await updateLeagueExpenses(id, [...(league.expenses ?? []), newExpense]);
        setMyExpenseAmount('');
        setMyExpenseDesc('');
        setShowMyExpenseForm(false);
    };

    const handleApproveExpense = async (expense: LeagueExpense) => {
        if (!id || !league) return;
        const currentHistory = (league.payments ?? {})[expense.playerName] ?? [];
        await updateLeaguePayments(id, {
            ...(league.payments ?? {}),
            [expense.playerName]: [...currentHistory, { amount: expense.amount, date: expense.date }],
        });
        await updateLeagueExpenses(id, (league.expenses ?? []).map(e =>
            e.id === expense.id ? { ...e, status: 'approved' as const } : e
        ));
    };

    const handleRejectExpense = async (expenseId: string) => {
        if (!id || !league) return;
        await updateLeagueExpenses(id, (league.expenses ?? []).map(e =>
            e.id === expenseId ? { ...e, status: 'rejected' as const } : e
        ));
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
        const url = `${window.location.origin}/join/${league.joinCode}`;
        navigator.clipboard.writeText(url);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
    };

    // Role helpers — available everywhere in the render
    const isOwner = user?.uid === league?.createdBy;
    const isAdmin = isOwner || (league?.adminIds ?? []).includes(user?.uid ?? '');

    const upcomingGames = games.filter(g => g.status !== 'completed').sort((a, b) => a.date - b.date);
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

            {/* ── Register Expense Modal ─────────────────────────────────────── */}
            {showMyExpenseForm && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-sm bg-green-900 border border-white/10 rounded-2xl p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-lg font-bold text-white">Register an Expense</h2>
                                <p className="text-green-300/70 text-xs mt-0.5">Admin will approve before it counts towards your balance</p>
                            </div>
                            <button onClick={() => { setShowMyExpenseForm(false); setMyExpenseAmount(''); setMyExpenseDesc(''); }} className="text-white/40 hover:text-white transition-colors text-xl leading-none">&times;</button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-green-300 mb-1">What did you buy?</label>
                                <input
                                    type="text"
                                    value={myExpenseDesc}
                                    onChange={e => setMyExpenseDesc(e.target.value)}
                                    placeholder="e.g. Match balls, Bibs, First aid kit"
                                    autoFocus
                                    maxLength={80}
                                    className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-green-300 mb-1">Amount</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 text-sm">£</span>
                                    <input
                                        type="number"
                                        value={myExpenseAmount}
                                        onChange={e => setMyExpenseAmount(e.target.value)}
                                        placeholder="0.00"
                                        min="0"
                                        step="0.01"
                                        onKeyDown={e => { if (e.key === 'Enter') handleSubmitExpense(); }}
                                        className="w-full bg-white/10 border border-white/20 rounded-xl pl-7 pr-3 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                                    />
                                </div>
                            </div>
                            <button
                                onClick={handleSubmitExpense}
                                disabled={!myExpenseDesc.trim() || !myExpenseAmount || parseFloat(myExpenseAmount) <= 0}
                                className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl transition-colors text-sm mt-1"
                            >
                                Submit for approval
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <AppHeader
                title={league.name}
                onBack={() => navigate('/dashboard')}
                showDashboardLink
                menuExtras={
                    <button
                        onClick={() => { copyCode(); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors"
                    >
                        {copiedCode ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                        {copiedCode ? 'Link copied!' : 'Copy invite link'}
                    </button>
                }
            />

            <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-4">
                {/* Tabs */}
                <div className="grid grid-cols-6 gap-1 bg-white/5 rounded-lg p-1">
                    <button
                        onClick={() => setTab('upcoming')}
                        className={`py-2 px-1 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                            tab === 'upcoming' ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white'
                        }`}
                    >
                        <Calendar className="w-3.5 h-3.5 shrink-0" /> <span className="hidden sm:inline">Games</span><span className="sm:hidden">({upcomingGames.length})</span><span className="hidden sm:inline"> ({upcomingGames.length})</span>
                    </button>
                    <button
                        onClick={() => setTab('completed')}
                        className={`py-2 px-1 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                            tab === 'completed' ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white'
                        }`}
                    >
                        <Trophy className="w-3.5 h-3.5 shrink-0" /> <span className="hidden sm:inline">Results</span><span className="sm:hidden">({completedGames.length})</span><span className="hidden sm:inline"> ({completedGames.length})</span>
                    </button>
                    <button
                        onClick={() => setTab('stats')}
                        className={`py-2 px-1 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                            tab === 'stats' ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white'
                        }`}
                    >
                        <BarChart2 className="w-3.5 h-3.5 shrink-0" /> <span className="hidden sm:inline">Stats</span>
                    </button>
                    <button
                        onClick={() => setTab('finance')}
                        className={`py-2 px-1 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                            tab === 'finance' ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white'
                        }`}
                    >
                        <Wallet className="w-3.5 h-3.5 shrink-0" /> <span className="hidden sm:inline">Finance</span>
                    </button>
                    <button
                        onClick={() => setTab('members')}
                        className={`py-2 px-1 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                            tab === 'members' ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white'
                        }`}
                    >
                        <Users className="w-3.5 h-3.5 shrink-0" /> <span className="hidden sm:inline">Members</span><span className="sm:hidden">({members.length})</span><span className="hidden sm:inline"> ({members.length})</span>
                    </button>
                    <button
                        onClick={() => setTab('profile')}
                        className={`py-2 px-1 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                            tab === 'profile' ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white'
                        }`}
                    >
                        <User className="w-3.5 h-3.5 shrink-0" /> <span className="hidden sm:inline">Me</span>
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
                                    <label className="block text-xs font-medium text-green-300 mb-1">
                                        Cost per person <span className="text-white/30 font-normal">(leave blank for league default{league.defaultCostPerPerson !== undefined ? ` · £${league.defaultCostPerPerson.toFixed(2)}` : ''})</span>
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 text-sm">£</span>
                                        <input
                                            type="number"
                                            value={newGameCost}
                                            onChange={e => setNewGameCost(e.target.value)}
                                            placeholder="e.g. 5"
                                            min="0"
                                            step="0.5"
                                            className="w-full bg-white/10 border border-white/20 rounded-lg p-2.5 pl-7 text-white placeholder-white/40 focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                                        />
                                    </div>
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
                                const noResponseCount = members.filter(m => !avail.find(a => a.userId === m.id)).length;
                                const isExpanded = expandedAvailGame === game.id;
                                return (
                                    <div key={game.id} className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                                        <div className="flex items-center gap-3">
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
                                                    {game.location && <span className="text-white/40 ml-2">· {game.location}</span>}
                                                </div>
                                                <div className="flex items-center gap-3 mt-1 text-xs">
                                                    <span className="text-green-400">{inCount} in</span>
                                                    {maybeCount > 0 && <span className="text-yellow-400">{maybeCount} maybe</span>}
                                                    {noResponseCount > 0 && (
                                                        <button
                                                            onClick={e => { e.preventDefault(); if (isAdmin) setExpandedAvailGame(isExpanded ? null : game.id); }}
                                                            className={`text-white/35 ${isAdmin ? 'hover:text-white/60 cursor-pointer' : ''}`}
                                                        >
                                                            {noResponseCount} no response
                                                        </button>
                                                    )}
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
                                        {/* Admin member availability panel */}
                                        {isAdmin && isExpanded && (
                                            <div className="mt-3 pt-3 border-t border-white/10 space-y-1.5">
                                                {members.map(member => {
                                                    const memberStatus = avail.find(a => a.userId === member.id)?.status;
                                                    return (
                                                        <div key={member.id} className="flex items-center justify-between gap-2">
                                                            <span className={`text-sm truncate ${member.id === user?.uid ? 'text-green-300' : 'text-white/70'}`}>
                                                                {member.displayName}
                                                            </span>
                                                            <div className="flex gap-1 shrink-0">
                                                                <button
                                                                    onClick={() => setAvailability(game.id, member.id, member.displayName, 'available')}
                                                                    title="Mark in"
                                                                    className={`w-7 h-7 rounded flex items-center justify-center transition-colors text-xs ${memberStatus === 'available' ? 'bg-green-600 text-white' : 'bg-white/8 text-white/30 hover:bg-white/15 hover:text-white/60'}`}
                                                                >
                                                                    <CheckCircle className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button
                                                                    onClick={() => setAvailability(game.id, member.id, member.displayName, 'maybe')}
                                                                    title="Mark maybe"
                                                                    className={`w-7 h-7 rounded flex items-center justify-center transition-colors text-xs ${memberStatus === 'maybe' ? 'bg-yellow-600 text-white' : 'bg-white/8 text-white/30 hover:bg-white/15 hover:text-white/60'}`}
                                                                >
                                                                    <HelpCircle className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button
                                                                    onClick={() => setAvailability(game.id, member.id, member.displayName, 'unavailable')}
                                                                    title="Mark out"
                                                                    className={`w-7 h-7 rounded flex items-center justify-center transition-colors text-xs ${memberStatus === 'unavailable' ? 'bg-red-600 text-white' : 'bg-white/8 text-white/30 hover:bg-white/15 hover:text-white/60'}`}
                                                                >
                                                                    <XCircle className="w-3.5 h-3.5" />
                                                                </button>
                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
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
                            completedGames.map(game => {
                                const gameCost = game.costPerPerson ?? league.defaultCostPerPerson;
                                const attendeeCount = game.attendees?.length;
                                return (
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
                                            {(gameCost !== undefined || attendeeCount !== undefined) && (
                                                <div className="text-white/40 text-xs mt-0.5">
                                                    {gameCost !== undefined && `£${gameCost.toFixed(2)}/person`}
                                                    {gameCost !== undefined && attendeeCount !== undefined && ' · '}
                                                    {attendeeCount !== undefined && `${attendeeCount} attended`}
                                                </div>
                                            )}
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
                                );
                            })
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
                                                {sortedContributors.map(({ name, goals, assists }, i) => (
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

                {/* My Profile Tab */}
                {tab === 'profile' && user && (
                    <div className="space-y-4">
                        {/* Profile card */}
                        <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">My Profile</span>
                                {!isEditingLeagueProfile && leagueProfile?.hasSetTags && (
                                    <button
                                        onClick={() => {
                                            setLeagueEditPositions(leagueProfile.positions);
                                            setLeagueEditTags(leagueProfile.tags);
                                            setLeagueEditBio(leagueProfile.bio);
                                            setIsEditingLeagueProfile(true);
                                        }}
                                        className="text-white/40 hover:text-white/70 transition-colors"
                                        title="Edit profile"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            {isEditingLeagueProfile ? (
                                <div className="space-y-4">
                                    {/* Bio */}
                                    <div>
                                        <p className="text-xs text-white/50 mb-2">Bio <span className="text-white/30">(optional, max 50 chars)</span></p>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={leagueEditBio}
                                                onChange={e => setLeagueEditBio(e.target.value.slice(0, 50))}
                                                placeholder='e.g. "Sunday league since 2015"'
                                                className="w-full bg-white/10 border border-white/20 text-white placeholder-white/30 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-green-400 pr-12"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/30">{leagueEditBio.length}/50</span>
                                        </div>
                                    </div>
                                    {/* Positions */}
                                    <div>
                                        <p className="text-xs text-white/50 mb-2">Where do you prefer to play?</p>
                                        <div className="flex flex-wrap gap-2">
                                            {PLAYER_POSITIONS.map(({ emoji, label }) => {
                                                const selected = leagueEditPositions.includes(label);
                                                return (
                                                    <button
                                                        key={label}
                                                        onClick={() => setLeagueEditPositions(prev => selected ? prev.filter(p => p !== label) : [...prev, label])}
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
                                        <p className="text-xs text-white/50 mb-2">Pick {MAX_TAGS} tags that describe you <span className="text-green-400">({leagueEditTags.length}/{MAX_TAGS})</span></p>
                                        <div className="flex flex-wrap gap-2">
                                            {PLAYER_TAGS.map(({ emoji, label }) => {
                                                const selected = leagueEditTags.includes(label);
                                                const atMax = leagueEditTags.length >= MAX_TAGS && !selected;
                                                return (
                                                    <button
                                                        key={label}
                                                        onClick={() => {
                                                            if (selected) setLeagueEditTags(prev => prev.filter(t => t !== label));
                                                            else if (!atMax) setLeagueEditTags(prev => [...prev, label]);
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
                                            onClick={handleSaveLeagueProfile}
                                            disabled={savingLeagueProfile || leagueEditTags.length !== MAX_TAGS || leagueEditPositions.length === 0}
                                            className="bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                                        >
                                            {savingLeagueProfile ? 'Saving…' : 'Save'}
                                        </button>
                                        <button
                                            onClick={() => setIsEditingLeagueProfile(false)}
                                            className="text-white/40 hover:text-white/60 text-sm transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : leagueProfile?.hasSetTags && leagueProfile.tags.length > 0 ? (
                                <div className="space-y-2.5">
                                    {leagueProfile.positions.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5">
                                            {leagueProfile.positions.map(pos => {
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
                                        {leagueProfile.tags.map(tag => {
                                            const tagData = PLAYER_TAGS.find(t => t.label === tag);
                                            return (
                                                <span key={tag} className="inline-flex items-center gap-1 text-xs bg-white/10 border border-white/15 text-white/80 px-2.5 py-1 rounded-full">
                                                    {tagData?.emoji} {tag}
                                                </span>
                                            );
                                        })}
                                    </div>
                                    {leagueProfile.bio && (
                                        <p className="text-sm italic text-white/60">"{leagueProfile.bio}"</p>
                                    )}
                                </div>
                            ) : (
                                <button
                                    onClick={() => {
                                        setLeagueEditPositions([]);
                                        setLeagueEditTags([]);
                                        setLeagueEditBio('');
                                        setIsEditingLeagueProfile(true);
                                    }}
                                    className="text-sm text-green-400 hover:text-green-300 transition-colors"
                                >
                                    Set up your player profile →
                                </button>
                            )}
                        </div>

                        {/* Per-league stats */}
                        {completedGames.length > 0 && (
                            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                                <div className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">My Stats in {league.name}</div>
                                <div className="grid grid-cols-5 gap-3 text-center">
                                    {[
                                        { value: myGamesPlayed, label: 'Games' },
                                        { value: myWins, label: 'Wins' },
                                        { value: myGoals, label: 'Goals' },
                                        { value: myAssists, label: 'Assists' },
                                        { value: myMotm, label: 'MOTM' },
                                    ].map(({ value, label }) => (
                                        <div key={label}>
                                            <div className="text-2xl font-bold text-white tabular-nums">{value}</div>
                                            <div className="text-[10px] text-white/40 uppercase tracking-wide mt-0.5">{label}</div>
                                        </div>
                                    ))}
                                </div>

                                {/* Per-league badges */}
                                {(() => {
                                    const badges: { emoji: string; label: string }[] = [];
                                    const myName = user.displayName || user.email?.split('@')[0] || '';
                                    const hasHatTrick = completedGames.some(g =>
                                        (g.goalScorers?.find(s => s.name === myName)?.goals ?? 0) >= 3
                                    );
                                    if (hasHatTrick) badges.push({ emoji: '🎯', label: 'Hat-trick Hero' });
                                    if (myMotm >= 5) badges.push({ emoji: '⭐', label: 'MOTM Machine' });
                                    if (myGamesPlayed / completedGames.length >= 0.8) badges.push({ emoji: '📅', label: 'Ever Present' });
                                    if (myGoals >= 10) badges.push({ emoji: '⚽', label: '10 Club' });
                                    if (myWins >= 10) badges.push({ emoji: '🏆', label: 'Winner' });
                                    const recentPlayed = completedGames
                                        .filter(g => g.teams?.some(t => t.players.some(p => p.name === myName)))
                                        .sort((a, b) => b.date - a.date)
                                        .slice(0, 3);
                                    if (recentPlayed.length === 3 && recentPlayed.every(g =>
                                        (g.goalScorers?.find(s => s.name === myName)?.goals ?? 0) > 0
                                    )) badges.push({ emoji: '🔥', label: 'On Fire' });

                                    return badges.length > 0 ? (
                                        <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-white/10">
                                            {badges.map(b => (
                                                <span key={b.label} className="inline-flex items-center gap-1 text-xs bg-yellow-500/15 border border-yellow-500/25 text-yellow-300 px-2.5 py-1 rounded-full">
                                                    {b.emoji} {b.label}
                                                </span>
                                            ))}
                                        </div>
                                    ) : null;
                                })()}
                            </div>
                        )}
                        {completedGames.length === 0 && (
                            <p className="text-xs text-white/35 italic text-center py-4">Play some games to earn stats in this league</p>
                        )}

                        {/* My balance & chart */}
                        {(() => {
                            const paymentsMap: Record<string, PaymentRecord[]> = league.payments ?? {};
                            const myHistory = paymentsMap[myName] ?? [];
                            const myPaid = myHistory.reduce((s, p) => s + p.amount, 0);
                            let myOwed = 0;
                            completedGames.forEach(g => {
                                if (!(g.attendees ?? []).includes(myName)) return;
                                myOwed += g.costPerPerson ?? league.defaultCostPerPerson ?? 0;
                            });
                            const myBalance = myOwed - myPaid;
                            if (myOwed === 0 && myPaid === 0) return null;

                            // Build weekly series for personal chart
                            const relevantGames = completedGames.filter(g => g.attendees && g.attendees.length > 0);
                            const last20Start = relevantGames.length > 0
                                ? relevantGames[Math.min(relevantGames.length - 1, 19)].date
                                : undefined;

                            const buildMySeries = (): { date: number; balance: number }[] => {
                                if (relevantGames.length === 0) return [];
                                const firstTs = last20Start ?? Math.min(...relevantGames.map(g => g.date));
                                const weeks: number[] = [];
                                const cur = new Date(firstTs);
                                cur.setHours(0, 0, 0, 0);
                                cur.setDate(cur.getDate() - ((cur.getDay() + 6) % 7));
                                while (cur.getTime() <= Date.now() + 7 * 86400000) {
                                    weeks.push(cur.getTime());
                                    cur.setDate(cur.getDate() + 7);
                                }
                                if (weeks.length < 2) return [];
                                const defaultCost = league.defaultCostPerPerson ?? 0;
                                return weeks.map(weekStart => {
                                    let owed = 0;
                                    relevantGames.forEach(g => {
                                        if (g.date >= weekStart) return;
                                        if (!(g.attendees ?? []).includes(myName)) return;
                                        owed += g.costPerPerson ?? defaultCost;
                                    });
                                    const paid = myHistory.reduce((s, p) => p.date < weekStart ? s + p.amount : s, 0);
                                    return { date: weekStart, balance: -(owed - paid) }; // negated: credit = up
                                });
                            };

                            const mySeries = buildMySeries();
                            const myZeroOffset = (() => {
                                if (mySeries.length === 0) return '50%';
                                const vals = mySeries.map(p => p.balance);
                                const hi = Math.max(0, ...vals);
                                const lo = Math.min(0, ...vals);
                                const range = hi - lo || 1;
                                return `${((hi / range) * 100).toFixed(1)}%`;
                            })();

                            const lastPayment = myHistory.length > 0
                                ? [...myHistory].sort((a, b) => b.date - a.date)[0]
                                : null;
                            return (
                                <div className="bg-white/5 border border-white/8 rounded-2xl overflow-hidden">
                                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
                                        <div>
                                            <div className={`text-2xl font-bold tabular-nums ${myBalance <= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                {myBalance > 0 ? `-£${myBalance.toFixed(2)}` : myBalance < 0 ? `+£${Math.abs(myBalance).toFixed(2)}` : '✓ Settled'}
                                            </div>
                                            <div className="text-[10px] text-white/40 uppercase tracking-wide mt-0.5">
                                                {myBalance > 0 ? 'You owe' : myBalance < 0 ? 'Credit' : 'All square'}
                                            </div>
                                        </div>
                                        {lastPayment && (
                                            <div className="text-right">
                                                <div className="text-sm font-semibold text-green-400 tabular-nums">+£{lastPayment.amount.toFixed(2)}</div>
                                                <div className="text-[10px] text-white/40 mt-0.5">
                                                    Last paid {new Date(lastPayment.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    {mySeries.length >= 2 && (
                                        <div className="px-4 pt-3 pb-1">
                                            <div className="text-[9px] text-white/25 uppercase tracking-wide mb-1">My balance — last 20 games</div>
                                            <ResponsiveContainer width="100%" height={80}>
                                                <LineChart data={mySeries} margin={{ top: 6, right: 6, bottom: 0, left: 6 }}>
                                                    <defs>
                                                        <linearGradient id="myProfileLineGrad" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset={myZeroOffset} stopColor="#22c55e" />
                                                            <stop offset={myZeroOffset} stopColor="#ef4444" />
                                                        </linearGradient>
                                                    </defs>
                                                    <XAxis dataKey="date" hide />
                                                    <YAxis hide domain={['auto', 'auto']} />
                                                    <Tooltip
                                                        content={({ active, payload }) => {
                                                            if (!active || !payload?.length) return null;
                                                            const v = payload[0].value as number;
                                                            const d = payload[0].payload.date as number;
                                                            return (
                                                                <div className="bg-black/80 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs">
                                                                    <div className="text-white/40 mb-0.5">{new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
                                                                    <div className={v >= 0 ? 'text-green-400' : 'text-red-400'}>
                                                                        {v >= 0 ? `£${v.toFixed(2)} credit` : `£${Math.abs(v).toFixed(2)} owed`}
                                                                    </div>
                                                                </div>
                                                            );
                                                        }}
                                                    />
                                                    <ReferenceLine y={0} stroke="white" strokeOpacity={0.12} strokeDasharray="3 2" />
                                                    <Line
                                                        type="monotone"
                                                        dataKey="balance"
                                                        stroke="url(#myProfileLineGrad)"
                                                        strokeWidth={1.6}
                                                        dot={{ r: 2.5, strokeWidth: 0, fill: 'url(#myProfileLineGrad)' }}
                                                        activeDot={{ r: 4, strokeWidth: 0 }}
                                                    />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    )}
                                    {/* Action buttons / inline forms */}
                                    <div className="px-4 pb-4 pt-3 space-y-2">
                                        {showMyPaymentForm ? (
                                            <div className="flex items-center gap-2">
                                                <span className="text-white/60 text-sm shrink-0">£</span>
                                                <input
                                                    type="number"
                                                    value={myPaymentAmount}
                                                    onChange={e => setMyPaymentAmount(e.target.value)}
                                                    placeholder="Amount"
                                                    min="0"
                                                    step="0.5"
                                                    autoFocus
                                                    onKeyDown={e => { if (e.key === 'Enter') handleSubmitMyPayment(); if (e.key === 'Escape') setShowMyPaymentForm(false); }}
                                                    className="flex-1 bg-white/10 border border-white/20 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-green-400"
                                                />
                                                <button onClick={handleSubmitMyPayment} className="text-green-400 hover:text-green-300 text-xs px-3 py-1.5 bg-green-600/20 rounded-lg whitespace-nowrap">Record</button>
                                                <button onClick={() => setShowMyPaymentForm(false)} className="text-white/40 hover:text-white text-xs">✕</button>
                                            </div>
                                        ) : (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setShowMyPaymentForm(true)}
                                                    className="flex-1 text-xs text-center py-2 rounded-lg bg-green-600/20 text-green-400 hover:bg-green-600/30 transition-colors font-medium border border-green-500/20"
                                                >
                                                    Add Payment
                                                </button>
                                                <button
                                                    onClick={() => setShowMyExpenseForm(true)}
                                                    className="flex-1 text-xs text-center py-2 rounded-lg bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 transition-colors font-medium border border-amber-500/25"
                                                >
                                                    Register Expense
                                                </button>
                                            </div>
                                        )}
                                        {/* Pending/resolved expenses for this player */}
                                        {(league.expenses ?? []).filter(e => e.playerName === myName).length > 0 && (
                                            <div className="pt-1 space-y-1.5">
                                                {[...(league.expenses ?? [])].filter(e => e.playerName === myName).sort((a, b) => b.date - a.date).map(exp => (
                                                    <div key={exp.id} className="flex items-center gap-2 text-xs">
                                                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${exp.status === 'approved' ? 'bg-green-400' : exp.status === 'rejected' ? 'bg-red-400' : 'bg-yellow-400'}`} />
                                                        <span className="flex-1 text-white/60 truncate">{exp.description}</span>
                                                        <span className="text-white/50 tabular-nums">£{exp.amount.toFixed(2)}</span>
                                                        <span className={`text-[10px] ${exp.status === 'approved' ? 'text-green-400' : exp.status === 'rejected' ? 'text-red-400/70' : 'text-yellow-400'}`}>
                                                            {exp.status === 'approved' ? 'approved' : exp.status === 'rejected' ? 'rejected' : 'pending'}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                )}

                {/* Finance Tab */}
                {tab === 'finance' && (() => {
                    // ── Data computation ─────────────────────────────────────────────────
                    const paymentsMap: Record<string, PaymentRecord[]> = league.payments ?? {};

                    const playerData = new Map<string, { games: number; owed: number }>();
                    completedGames.forEach(g => {
                        if (!g.attendees) return;
                        const cost = g.costPerPerson ?? league.defaultCostPerPerson ?? 0;
                        g.attendees.forEach(name => {
                            const ex = playerData.get(name) ?? { games: 0, owed: 0 };
                            playerData.set(name, { games: ex.games + 1, owed: ex.owed + cost });
                        });
                    });

                    const financeLedger = [...playerData.entries()].map(([name, data]) => {
                        const history = paymentsMap[name] ?? [];
                        const paid = history.reduce((s, p) => s + p.amount, 0);
                        return {
                            name,
                            games: data.games,
                            owed: data.owed,
                            paid,
                            history,
                            balance: data.owed - paid,
                        };
                    }).sort((a, b) => b.balance - a.balance);

                    const totalOwed = financeLedger.reduce((s, r) => s + r.owed, 0);
                    const totalPaid = financeLedger.reduce((s, r) => s + r.paid, 0);
                    const totalOutstanding = financeLedger.reduce((s, r) => s + Math.max(0, r.balance), 0);

                    // ── Weekly series builder ─────────────────────────────────────────────
                    // Returns {date, balance} for each Monday from first game to now
                    // fromDate limits the start of the series (for "last N games" window)
                    const buildWeeklySeries = (playerName?: string, fromDate?: number): { date: number; balance: number }[] => {
                        const relevantGames = completedGames.filter(g => g.attendees && g.attendees.length > 0);
                        if (relevantGames.length === 0) return [];
                        const windowGames = fromDate ? relevantGames.filter(g => g.date >= fromDate) : relevantGames;
                        if (windowGames.length === 0) return [];
                        const firstTs = fromDate ?? Math.min(...relevantGames.map(g => g.date));
                        const weeks: number[] = [];
                        const cur = new Date(firstTs);
                        cur.setHours(0, 0, 0, 0);
                        cur.setDate(cur.getDate() - ((cur.getDay() + 6) % 7)); // back to Monday
                        while (cur.getTime() <= Date.now() + 7 * 86400000) {
                            weeks.push(cur.getTime());
                            cur.setDate(cur.getDate() + 7);
                        }
                        if (weeks.length < 2) return [];
                        const defaultCost = league.defaultCostPerPerson ?? 0;
                        return weeks.map(weekStart => {
                            let owed = 0;
                            relevantGames.forEach(g => {
                                if (g.date >= weekStart) return;
                                const cost = g.costPerPerson ?? defaultCost;
                                const att = playerName
                                    ? (g.attendees ?? []).filter(n => n === playerName)
                                    : (g.attendees ?? []);
                                owed += att.length * cost;
                            });
                            let paid = 0;
                            Object.entries(paymentsMap).forEach(([name, recs]) => {
                                if (playerName && name !== playerName) return;
                                recs.forEach(p => { if (p.date < weekStart) paid += p.amount; });
                            });
                            return { date: weekStart, balance: owed - paid };
                        });
                    };

                    // ── Zero-offset helper for Recharts gradients ─────────────────────────
                    // Returns % from top of chart where value=0 sits, given the data's y range.
                    // Recharts gradient: 0% = top (maxVal), 100% = bottom (minVal).
                    const zeroOffset = (series: { balance: number }[]) => {
                        const vals = series.map(p => p.balance);
                        const lo = Math.min(0, ...vals);
                        const hi = Math.max(0, ...vals);
                        const range = hi - lo || 1;
                        return `${((hi / range) * 100).toFixed(1)}%`;
                    };

                    // Last 20 completed games window
                    const last20Start = completedGames.length > 0
                        ? completedGames[Math.min(completedGames.length - 1, 19)].date
                        : undefined;
                    const aggregateSeries = buildWeeklySeries(undefined, last20Start);

                    return (
                        <div className="space-y-4">
                            {/* ── Aggregate weekly balance chart ───────────────────────────── */}
                            {aggregateSeries.length >= 2 && (() => {
                                const aggZeroPct = zeroOffset(aggregateSeries);
                                const currentBalance = aggregateSeries[aggregateSeries.length - 1].balance;
                                return (
                                    <div className="bg-white/5 border border-white/8 rounded-2xl overflow-hidden">
                                        <div className="grid grid-cols-3 divide-x divide-white/10 border-b border-white/8">
                                            <div className="px-4 py-3 text-center">
                                                <div className="text-lg font-bold text-white tabular-nums">£{totalOwed.toFixed(2)}</div>
                                                <div className="text-[10px] text-white/40 uppercase tracking-wide mt-0.5">Total owed</div>
                                            </div>
                                            <div className="px-4 py-3 text-center">
                                                <div className="text-lg font-bold text-green-400 tabular-nums">£{totalPaid.toFixed(2)}</div>
                                                <div className="text-[10px] text-white/40 uppercase tracking-wide mt-0.5">Collected</div>
                                            </div>
                                            <div className="px-4 py-3 text-center">
                                                <div className="text-lg font-bold text-red-400 tabular-nums">£{totalOutstanding.toFixed(2)}</div>
                                                <div className="text-[10px] text-white/40 uppercase tracking-wide mt-0.5">Outstanding</div>
                                            </div>
                                        </div>
                                        <div className="px-4 pt-3 pb-1">
                                            <div className="text-[9px] text-white/25 uppercase tracking-wide mb-1">Outstanding balance — last 20 games</div>
                                            <ResponsiveContainer width="100%" height={90}>
                                                <AreaChart data={aggregateSeries} margin={{ top: 6, right: 6, bottom: 0, left: 6 }}>
                                                    <defs>
                                                        <linearGradient id="aggLineGrad" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset={aggZeroPct} stopColor="#ef4444" />
                                                            <stop offset={aggZeroPct} stopColor="#22c55e" />
                                                        </linearGradient>
                                                        <linearGradient id="aggAreaGrad" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset={aggZeroPct} stopColor="#ef4444" stopOpacity={0.2} />
                                                            <stop offset={aggZeroPct} stopColor="#22c55e" stopOpacity={0.08} />
                                                        </linearGradient>
                                                    </defs>
                                                    <XAxis dataKey="date" hide />
                                                    <YAxis hide domain={['auto', 'auto']} />
                                                    <Tooltip
                                                        content={({ active, payload }) => {
                                                            if (!active || !payload?.length) return null;
                                                            const v = payload[0].value as number;
                                                            const d = payload[0].payload.date as number;
                                                            return (
                                                                <div className="bg-black/80 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs">
                                                                    <div className="text-white/40 mb-0.5">{new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
                                                                    <div className={v <= 0 ? 'text-green-400' : 'text-red-400'}>£{Math.abs(v).toFixed(2)} outstanding</div>
                                                                </div>
                                                            );
                                                        }}
                                                    />
                                                    <ReferenceLine y={0} stroke="white" strokeOpacity={0.1} strokeDasharray="3 2" />
                                                    <Area
                                                        type="monotone"
                                                        dataKey="balance"
                                                        stroke="url(#aggLineGrad)"
                                                        strokeWidth={1.8}
                                                        fill="url(#aggAreaGrad)"
                                                        dot={{ r: 2.5, fill: '#ef4444', strokeWidth: 0 }}
                                                        activeDot={{ r: 4, strokeWidth: 0 }}
                                                    />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                            <div className="flex justify-end text-[9px] text-white/30 pb-2 pr-1">
                                                <span>£{currentBalance.toFixed(0)} outstanding now</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* ── Pending expenses (admin: approve / reject) ───────────────── */}
                            {isAdmin && (() => {
                                const pending = (league.expenses ?? []).filter(e => e.status === 'pending');
                                if (pending.length === 0) return null;
                                return (
                                    <div className="bg-yellow-500/8 border border-yellow-500/20 rounded-2xl overflow-hidden">
                                        <div className="flex items-center gap-2 px-4 pt-4 pb-3">
                                            <span className="text-base">🧾</span>
                                            <span className="font-semibold text-white text-sm">Expense Requests</span>
                                            <span className="ml-auto text-[10px] text-yellow-400 bg-yellow-500/15 rounded-full px-2 py-0.5">{pending.length} pending</span>
                                        </div>
                                        <div className="divide-y divide-white/5">
                                            {pending.map(exp => (
                                                <div key={exp.id} className="px-4 py-3">
                                                    <div className="flex items-start justify-between gap-3 mb-2">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-sm text-white font-medium truncate">{exp.description}</div>
                                                            <div className="text-[11px] text-white/40 mt-0.5">
                                                                {exp.playerName} · {new Date(exp.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                                            </div>
                                                        </div>
                                                        <span className="text-sm font-bold text-white tabular-nums shrink-0">£{exp.amount.toFixed(2)}</span>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleApproveExpense(exp)}
                                                            className="flex-1 text-xs py-1.5 rounded-lg bg-green-600/25 text-green-400 hover:bg-green-600/40 transition-colors font-medium"
                                                        >
                                                            Approve — credits {exp.playerName.split(' ')[0]}
                                                        </button>
                                                        <button
                                                            onClick={() => handleRejectExpense(exp.id)}
                                                            className="text-xs px-3 py-1.5 rounded-lg bg-white/5 text-white/40 hover:bg-white/10 transition-colors"
                                                        >
                                                            Reject
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* ── Default cost setting (admin only) ───────────────────────── */}
                            {isAdmin && (
                                <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-white/70">Default cost per game</span>
                                        {editingDefaultCost ? (
                                            <div className="flex items-center gap-2">
                                                <span className="text-white/60 text-sm">£</span>
                                                <input
                                                    type="number"
                                                    value={defaultCostInput}
                                                    onChange={e => setDefaultCostInput(e.target.value)}
                                                    placeholder="e.g. 5"
                                                    min="0"
                                                    step="0.5"
                                                    autoFocus
                                                    className="w-20 bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-white text-sm"
                                                />
                                                <button onClick={handleSaveDefaultCost} className="text-green-400 hover:text-green-300 text-xs px-2 py-1 bg-green-600/20 rounded">Save</button>
                                                <button onClick={() => setEditingDefaultCost(false)} className="text-white/40 hover:text-white text-xs">Cancel</button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <span className="text-white font-semibold">
                                                    {league.defaultCostPerPerson !== undefined ? `£${league.defaultCostPerPerson.toFixed(2)}` : 'Not set'}
                                                </span>
                                                <button
                                                    onClick={() => { setDefaultCostInput(String(league.defaultCostPerPerson ?? '')); setEditingDefaultCost(true); }}
                                                    className="text-white/40 hover:text-white/70 transition-colors"
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ── Admin: full ledger with per-player charts ─────────────────── */}
                            {isAdmin && (
                                financeLedger.length === 0 ? (
                                    <div className="bg-white/5 border border-white/10 rounded-2xl p-10 text-center">
                                        <div className="text-4xl mb-3">💰</div>
                                        <p className="text-white/50 text-sm">No attendance recorded yet.</p>
                                    </div>
                                ) : (
                                    <div className="bg-white/5 border border-white/8 rounded-2xl overflow-hidden">
                                        <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-3 px-4 py-2.5 text-[10px] text-white/30 uppercase tracking-wider border-b border-white/5">
                                            <span>Player</span>
                                            <span className="text-right">Games</span>
                                            <span className="text-right">Owed</span>
                                            <span className="text-right">Paid</span>
                                            <span className="text-right">Balance</span>
                                        </div>
                                        {financeLedger.map(row => {
                                            const isExpanded = selectedPlayerChart === row.name;
                                            const isSettled = row.balance <= 0;
                                            const paidPct = row.owed > 0 ? Math.min(row.paid / row.owed * 100, 100) : 100;
                                            return (
                                                <div key={row.name} className="border-t border-white/5">
                                                    {/* Clickable main row */}
                                                    <button
                                                        className="w-full text-left grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-3 px-4 py-3 items-center hover:bg-white/3 transition-colors"
                                                        onClick={() => setSelectedPlayerChart(isExpanded ? null : row.name)}
                                                    >
                                                        <span className="text-sm text-white truncate">{row.name}</span>
                                                        <span className="text-xs text-right text-white/50 tabular-nums">{row.games}</span>
                                                        <span className="text-xs text-right text-white/70 tabular-nums">£{row.owed.toFixed(2)}</span>
                                                        <span className="text-xs text-right text-white/70 tabular-nums">£{row.paid.toFixed(2)}</span>
                                                        {/* Small inline balance bar + amount */}
                                                        <div className="flex items-center gap-1.5 justify-end">
                                                            <div className="w-8 h-1.5 rounded-full bg-white/10 overflow-hidden">
                                                                <div
                                                                    className={`h-full rounded-full transition-all ${isSettled ? 'bg-green-500' : 'bg-red-500/80'}`}
                                                                    style={{ width: isSettled ? '100%' : `${paidPct}%` }}
                                                                />
                                                            </div>
                                                            <span className={`text-[11px] font-semibold tabular-nums ${isSettled ? 'text-green-400' : 'text-red-400'}`}>
                                                                {row.balance === 0 ? '✓' : row.balance > 0 ? `-£${row.balance.toFixed(0)}` : `+£${(-row.balance).toFixed(0)}`}
                                                            </span>
                                                        </div>
                                                    </button>

                                                    {/* Expanded: weekly chart + payment history + record payment */}
                                                    {isExpanded && (() => {
                                                        // Negate: credit = positive = line up, debt = negative = line down
                                                        const playerSeriesRaw = buildWeeklySeries(row.name, last20Start);
                                                        const playerSeries = playerSeriesRaw.map(p => ({ ...p, balance: -p.balance }));
                                                        const pZeroPct = zeroOffset(playerSeries);
                                                        const gradId = `pg_${row.name.replace(/\W/g, '')}`;
                                                        return (
                                                            <div className="px-4 pb-4 pt-1 space-y-3 bg-black/10 border-t border-white/5">
                                                                {/* Balance chart — up = credit (green), down = debt (red) */}
                                                                {playerSeries.length >= 2 && (
                                                                    <div>
                                                                        <div className="text-[9px] text-white/25 uppercase tracking-wide mb-1">Balance · up = credit · down = debt</div>
                                                                        <ResponsiveContainer width="100%" height={72}>
                                                                            <LineChart data={playerSeries} margin={{ top: 6, right: 6, bottom: 0, left: 6 }}>
                                                                                <defs>
                                                                                    <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                                                                                        <stop offset={pZeroPct} stopColor="#22c55e" />
                                                                                        <stop offset={pZeroPct} stopColor="#ef4444" />
                                                                                    </linearGradient>
                                                                                </defs>
                                                                                <XAxis dataKey="date" hide />
                                                                                <YAxis hide domain={['auto', 'auto']} />
                                                                                <Tooltip
                                                                                    content={({ active, payload }) => {
                                                                                        if (!active || !payload?.length) return null;
                                                                                        const v = payload[0].value as number;
                                                                                        const d = payload[0].payload.date as number;
                                                                                        return (
                                                                                            <div className="bg-black/80 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs">
                                                                                                <div className="text-white/40 mb-0.5">{new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
                                                                                                <div className={v >= 0 ? 'text-green-400' : 'text-red-400'}>{v >= 0 ? `+£${v.toFixed(2)} credit` : `-£${Math.abs(v).toFixed(2)} owed`}</div>
                                                                                            </div>
                                                                                        );
                                                                                    }}
                                                                                />
                                                                                <ReferenceLine y={0} stroke="white" strokeOpacity={0.12} strokeDasharray="3 2" />
                                                                                <Line
                                                                                    type="monotone"
                                                                                    dataKey="balance"
                                                                                    stroke={`url(#${gradId})`}
                                                                                    strokeWidth={1.6}
                                                                                    dot={{ r: 2.5, strokeWidth: 0, fill: `url(#${gradId})` }}
                                                                                    activeDot={{ r: 4, strokeWidth: 0 }}
                                                                                />
                                                                            </LineChart>
                                                                        </ResponsiveContainer>
                                                                    </div>
                                                                )}

                                                                {/* Payment history */}
                                                                <div>
                                                                    <div className="text-[9px] text-white/25 uppercase tracking-wide mb-1.5">Payment history</div>
                                                                    {row.history.length === 0 ? (
                                                                        <p className="text-xs text-white/30 italic">No payments recorded</p>
                                                                    ) : (
                                                                        <div className="space-y-1">
                                                                            {[...row.history].sort((a, b) => b.date - a.date).map((p, pi) => (
                                                                                <div key={pi} className="flex items-center justify-between text-xs">
                                                                                    <span className="text-white/40">
                                                                                        {new Date(p.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                                                    </span>
                                                                                    <span className="text-green-400 tabular-nums">+£{p.amount.toFixed(2)}</span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Record payment */}
                                                                <div className="pt-1 border-t border-white/8">
                                                                    {addingPaymentFor === row.name ? (
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-white/60 text-sm">£</span>
                                                                            <input
                                                                                type="number"
                                                                                value={paymentInputs[row.name] ?? ''}
                                                                                onChange={e => setPaymentInputs(prev => ({ ...prev, [row.name]: e.target.value }))}
                                                                                placeholder="Amount"
                                                                                min="0"
                                                                                step="0.5"
                                                                                autoFocus
                                                                                className="w-24 bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-white text-sm"
                                                                            />
                                                                            <button onClick={() => handleRecordPayment(row.name)} className="text-green-400 hover:text-green-300 text-xs px-2 py-1 bg-green-600/20 rounded">Add</button>
                                                                            <button onClick={() => setAddingPaymentFor(null)} className="text-white/40 hover:text-white text-xs">Cancel</button>
                                                                        </div>
                                                                    ) : (
                                                                        <button
                                                                            onClick={() => { setAddingPaymentFor(row.name); setPaymentInputs(prev => ({ ...prev, [row.name]: '' })); }}
                                                                            className="text-xs text-green-400/60 hover:text-green-400 transition-colors"
                                                                        >+ Record payment</button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}

                                                    {/* Collapsed quick-pay for debtors */}
                                                    {!isExpanded && !isSettled && (
                                                        <div className="px-4 pb-2.5">
                                                            {addingPaymentFor === row.name ? (
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-white/60 text-sm">£</span>
                                                                    <input
                                                                        type="number"
                                                                        value={paymentInputs[row.name] ?? ''}
                                                                        onChange={e => setPaymentInputs(prev => ({ ...prev, [row.name]: e.target.value }))}
                                                                        placeholder="Amount"
                                                                        min="0"
                                                                        step="0.5"
                                                                        autoFocus
                                                                        className="w-24 bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-white text-sm"
                                                                    />
                                                                    <button onClick={() => handleRecordPayment(row.name)} className="text-green-400 hover:text-green-300 text-xs px-2 py-1 bg-green-600/20 rounded">Add</button>
                                                                    <button onClick={() => setAddingPaymentFor(null)} className="text-white/40 hover:text-white text-xs">Cancel</button>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    onClick={e => { e.stopPropagation(); setAddingPaymentFor(row.name); setPaymentInputs(prev => ({ ...prev, [row.name]: '' })); }}
                                                                    className="text-xs text-green-400/60 hover:text-green-400 transition-colors"
                                                                >+ Record payment</button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )
                            )}

                            {/* ── Member: personal statement ───────────────────────────────── */}
                            {!isAdmin && (() => {
                                const myRow = financeLedger.find(r => r.name === myName);
                                return (
                                    <div className="space-y-3">
                                        {myRow ? (
                                            <>
                                                <div className={`rounded-2xl p-5 border ${
                                                    myRow.balance === 0
                                                        ? 'bg-green-600/15 border-green-500/20'
                                                        : myRow.balance > 0
                                                        ? 'bg-red-600/10 border-red-500/20'
                                                        : 'bg-green-600/10 border-green-500/20'
                                                }`}>
                                                    <div className="text-center mb-4">
                                                        <div className={`text-3xl font-bold tabular-nums ${
                                                            myRow.balance === 0 ? 'text-green-400' :
                                                            myRow.balance > 0 ? 'text-red-400' : 'text-green-400'
                                                        }`}>
                                                            {myRow.balance === 0
                                                                ? '✓ Settled'
                                                                : myRow.balance > 0
                                                                ? `-£${myRow.balance.toFixed(2)}`
                                                                : `+£${(-myRow.balance).toFixed(2)}`}
                                                        </div>
                                                        <div className="text-white/50 text-xs mt-1">
                                                            {myRow.balance === 0 ? 'You\'re all square' :
                                                             myRow.balance > 0 ? 'You owe' : 'Credit'}
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-3 text-center border-t border-white/10 pt-4">
                                                        <div>
                                                            <div className="text-lg font-bold text-white tabular-nums">{myRow.games}</div>
                                                            <div className="text-[10px] text-white/40 uppercase tracking-wide mt-0.5">Games</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-lg font-bold text-white tabular-nums">£{myRow.owed.toFixed(2)}</div>
                                                            <div className="text-[10px] text-white/40 uppercase tracking-wide mt-0.5">Owed</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-lg font-bold text-white tabular-nums">£{myRow.paid.toFixed(2)}</div>
                                                            <div className="text-[10px] text-white/40 uppercase tracking-wide mt-0.5">Paid</div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Personal balance chart */}
                                                {(() => {
                                                    const mySeriesRaw = buildWeeklySeries(myName, last20Start);
                                                    const mySeries = mySeriesRaw.map(p => ({ ...p, balance: -p.balance }));
                                                    if (mySeries.length < 2) return null;
                                                    const myZeroPct = zeroOffset(mySeries);
                                                    return (
                                                        <div className="bg-white/5 border border-white/8 rounded-2xl p-4">
                                                            <div className="text-[9px] text-white/25 uppercase tracking-wide mb-1">Your balance · up = credit · down = debt</div>
                                                            <ResponsiveContainer width="100%" height={72}>
                                                                <LineChart data={mySeries} margin={{ top: 6, right: 6, bottom: 0, left: 6 }}>
                                                                    <defs>
                                                                        <linearGradient id="myLineGrad" x1="0" y1="0" x2="0" y2="1">
                                                                            <stop offset={myZeroPct} stopColor="#22c55e" />
                                                                            <stop offset={myZeroPct} stopColor="#ef4444" />
                                                                        </linearGradient>
                                                                    </defs>
                                                                    <XAxis dataKey="date" hide />
                                                                    <YAxis hide domain={['auto', 'auto']} />
                                                                    <Tooltip
                                                                        content={({ active, payload }) => {
                                                                            if (!active || !payload?.length) return null;
                                                                            const v = payload[0].value as number;
                                                                            const d = payload[0].payload.date as number;
                                                                            return (
                                                                                <div className="bg-black/80 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs">
                                                                                    <div className="text-white/40 mb-0.5">{new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
                                                                                    <div className={v >= 0 ? 'text-green-400' : 'text-red-400'}>{v >= 0 ? `+£${v.toFixed(2)} credit` : `-£${Math.abs(v).toFixed(2)} owed`}</div>
                                                                                </div>
                                                                            );
                                                                        }}
                                                                    />
                                                                    <ReferenceLine y={0} stroke="white" strokeOpacity={0.12} strokeDasharray="3 2" />
                                                                    <Line
                                                                        type="monotone"
                                                                        dataKey="balance"
                                                                        stroke="url(#myLineGrad)"
                                                                        strokeWidth={1.6}
                                                                        dot={{ r: 2.5, strokeWidth: 0, fill: 'url(#myLineGrad)' }}
                                                                        activeDot={{ r: 4, strokeWidth: 0 }}
                                                                    />
                                                                </LineChart>
                                                            </ResponsiveContainer>
                                                        </div>
                                                    );
                                                })()}

                                                {/* Games attended */}
                                                <div className="bg-white/5 border border-white/8 rounded-2xl overflow-hidden">
                                                    <div className="px-4 pt-4 pb-3 text-xs font-semibold text-white/50 uppercase tracking-wider">Games attended</div>
                                                    {completedGames.filter(g => g.attendees?.includes(myName)).map(g => {
                                                        const cost = g.costPerPerson ?? league.defaultCostPerPerson ?? 0;
                                                        return (
                                                            <div key={g.id} className="flex items-center justify-between px-4 py-2.5 border-t border-white/5">
                                                                <div>
                                                                    <div className="text-sm text-white">{g.title}</div>
                                                                    <div className="text-xs text-white/40">
                                                                        {new Date(g.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                                    </div>
                                                                </div>
                                                                <span className="text-sm text-white/70 tabular-nums shrink-0">£{cost.toFixed(2)}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                {/* Payment history with dates */}
                                                {myRow.history.length > 0 && (
                                                    <div className="bg-white/5 border border-white/8 rounded-2xl overflow-hidden">
                                                        <div className="px-4 pt-4 pb-3 text-xs font-semibold text-white/50 uppercase tracking-wider">Payments made</div>
                                                        {[...myRow.history].sort((a, b) => b.date - a.date).map((p, pi) => (
                                                            <div key={pi} className="flex items-center justify-between px-4 py-2.5 border-t border-white/5">
                                                                <span className="text-sm text-white/60">
                                                                    {new Date(p.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                                </span>
                                                                <span className="text-sm text-green-400 tabular-nums">+£{p.amount.toFixed(2)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="bg-white/5 border border-white/10 rounded-2xl p-10 text-center">
                                                <div className="text-4xl mb-3">💰</div>
                                                <p className="text-white/50 text-sm">No payments recorded for you yet.</p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    );
                })()}

                {/* Members Tab */}
                {tab === 'members' && (
                    <div className="space-y-3">
                        <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
                            {members.map((member, i) => {
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
                                            {/* Role badge */}
                                            {member.id === league.createdBy ? (
                                                <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-full">Owner</span>
                                            ) : (league.adminIds ?? []).includes(member.id) ? (
                                                <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">Admin</span>
                                            ) : null}
                                            {/* Owner can promote/demote non-owner members */}
                                            {isOwner && member.id !== league.createdBy && !isEditing && (
                                                <button
                                                    onClick={async () => {
                                                        if (!id || !league) return;
                                                        const currentAdmins = league.adminIds ?? [];
                                                        const isMemberAdmin = currentAdmins.includes(member.id);
                                                        const updated = isMemberAdmin
                                                            ? currentAdmins.filter(a => a !== member.id)
                                                            : [...currentAdmins, member.id];
                                                        await updateLeagueAdmins(id, updated);
                                                    }}
                                                    className="text-white/30 hover:text-blue-400 transition-colors"
                                                    title={(league.adminIds ?? []).includes(member.id) ? 'Remove admin' : 'Make admin'}
                                                >
                                                    <Users className="w-3.5 h-3.5" />
                                                </button>
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
                                            {isAdmin && member.id !== league.createdBy && !isEditing && (
                                                <button
                                                    onClick={async () => {
                                                        if (!id) return;
                                                        if (confirm(`Remove ${member.displayName} from the league?`)) {
                                                            await removeMember(id, member.id);
                                                            setMembers(prev => prev.filter(m => m.id !== member.id));
                                                        }
                                                    }}
                                                    className="text-white/30 hover:text-red-400 transition-colors"
                                                    title="Remove member"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
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
                                <div className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white/70 truncate">
                                    {window.location.origin}/join/{league.joinCode}
                                </div>
                                <Button
                                    onClick={copyCode}
                                    className="bg-green-600 hover:bg-green-500 text-white px-4 shrink-0"
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
