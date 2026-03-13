import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Calendar, Trophy, BarChart2, Users, User, Wallet, Copy, Check, TableProperties } from 'lucide-react';
import AppHeader from '../components/AppHeader';
import { useAuth } from '../contexts/AuthContext';
import {
    subscribeToLeague,
    subscribeToLeagueGames,
    getLeagueMembers,
    leaveLeague,
    deleteLeague,
    getLeagueByCode,
    updateLeagueDefaultCost,
    updateLeaguePayments,
    updateLeagueExpenses,
} from '../utils/firestore';
import { League, Game, LeagueExpense } from '../types';
import { computeGameStats, getPersonalStats } from './league/statsUtils';
import { buildLookup } from '../utils/playerLookup';
import UpcomingTab from './league/UpcomingTab';
import MobileBottomNav, { type TabKey } from '../components/MobileBottomNav';
import CompletedTab from './league/CompletedTab';
import StatsTab from './league/StatsTab';
import ProfileTab from './league/ProfileTab';
import FinanceTab from './league/FinanceTab';
import MembersTab from './league/MembersTab';
import LeagueTableTab from './league/LeagueTableTab';

const LeaguePage: React.FC = () => {
    const { code } = useParams<{ code: string }>();
    const [leagueId, setLeagueId] = useState<string | null>(null);
    const id = leagueId;
    const { user, updatePlayerTags, updateBio } = useAuth();
    const navigate = useNavigate();
    const [league, setLeague] = useState<League | null>(null);
    const [games, setGames] = useState<Game[]>([]);
    const [members, setMembers] = useState<{ id: string; displayName: string; email: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [copiedCode, setCopiedCode] = useState(false);
    const [tab, setTab] = useState<TabKey>('upcoming');

    // Expense modal state (rendered at root level, triggered from ProfileTab)
    const [showMyExpenseForm, setShowMyExpenseForm] = useState(false);
    const [myExpenseAmount, setMyExpenseAmount] = useState('');
    const [myExpenseDesc, setMyExpenseDesc] = useState('');

    // Resolve join code → Firestore document ID
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

    const copyCode = () => {
        if (!league) return;
        const url = `${window.location.origin}/join/${league.joinCode}`;
        navigator.clipboard.writeText(url);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
    };

    // Role helpers
    const isOwner = user?.uid === league?.createdBy;
    const isAdmin = isOwner || (league?.adminIds ?? []).includes(user?.uid ?? '');

    const upcomingGames = games.filter(g => g.status !== 'completed').sort((a, b) => a.date - b.date);
    const completedGames = games.filter(g => g.status === 'completed');

    // Player identity
    const myId = user?.uid ?? '';
    const myName = user?.displayName || user?.email?.split('@')[0] || '';
    const lookup = buildLookup(members);

    // Stats aggregation (keyed by playerId)
    const stats = computeGameStats(completedGames);
    const myStats = getPersonalStats(stats, myId);

    // Finance handlers (shared between ProfileTab and FinanceTab)
    const handleSubmitMyPayment = async (amount: number) => {
        if (!id || !league) return;
        const currentHistory = (league.payments ?? {})[myId] ?? [];
        await updateLeaguePayments(id, {
            ...(league.payments ?? {}),
            [myId]: [...currentHistory, { amount, date: Date.now() }],
        });
    };

    const handleRecordPayment = async (playerId: string, amount: number) => {
        if (!id || !league) return;
        const currentHistory = (league.payments ?? {})[playerId] ?? [];
        await updateLeaguePayments(id, {
            ...(league.payments ?? {}),
            [playerId]: [...currentHistory, { amount, date: Date.now() }],
        });
    };

    const handleSubmitExpense = async () => {
        const amount = parseFloat(myExpenseAmount);
        if (!amount || amount <= 0 || !myExpenseDesc.trim() || !id || !league) return;
        const newExpense: LeagueExpense = {
            id: crypto.randomUUID(),
            playerId: myId,
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
        const pid = expense.playerId;
        const currentHistory = (league.payments ?? {})[pid] ?? [];
        await updateLeaguePayments(id, {
            ...(league.payments ?? {}),
            [pid]: [...currentHistory, { amount: expense.amount, date: expense.date }],
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

    const handleSaveDefaultCost = async (cost: number | null) => {
        if (!id) return;
        await updateLeagueDefaultCost(id, cost);
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

            {/* Register Expense Modal */}
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

            <div className="max-w-4xl mx-auto p-4 sm:p-6 pb-24 sm:pb-6 space-y-4">
                {/* Desktop top tabs — hidden on mobile */}
                <div className="hidden sm:grid foldable-open:grid grid-cols-7 gap-1 bg-white/5 rounded-lg p-1">
                    {([
                        { key: 'upcoming', icon: Calendar, label: `Games (${upcomingGames.length})` },
                        { key: 'completed', icon: Trophy, label: `Results (${completedGames.length})` },
                        { key: 'table', icon: TableProperties, label: 'Table' },
                        { key: 'stats', icon: BarChart2, label: 'Stats' },
                        { key: 'finance', icon: Wallet, label: 'Finance' },
                        { key: 'members', icon: Users, label: 'Settings' },
                        { key: 'profile', icon: User, label: 'Me' },
                    ] as const).map(({ key, icon: Icon, label }) => (
                        <button
                            key={key}
                            onClick={() => setTab(key)}
                            className={`py-2 px-1 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                                tab === key ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white'
                            }`}
                        >
                            <Icon className="w-3.5 h-3.5 shrink-0" /> {label}
                        </button>
                    ))}
                </div>

                {tab === 'upcoming' && user && (
                    <UpcomingTab
                        leagueId={id!}
                        league={league}
                        code={code!}
                        user={user}
                        members={members}
                        upcomingGames={upcomingGames}
                        allGames={games}
                        isAdmin={isAdmin}
                        myStats={myStats}
                        hasCompletedGames={completedGames.length > 0}
                        enableAssists={league.enableAssists}
                        onNavigateToStats={() => setTab('stats')}
                    />
                )}

                {tab === 'completed' && (
                    <CompletedTab
                        code={code!}
                        league={league}
                        completedGames={completedGames}
                        scorerTotals={stats.scorerTotals}
                        motmTotals={stats.motmTotals}
                        lookup={lookup}
                    />
                )}

                {tab === 'table' && (
                    <LeagueTableTab
                        completedGames={completedGames}
                        seasons={league.seasons ?? {}}
                        activeSeasonId={league.activeSeasonId}
                        myId={myId}
                        lookup={lookup}
                    />
                )}

                {tab === 'stats' && (
                    <StatsTab
                        completedGames={completedGames}
                        myId={myId}
                        myName={myName}
                        user={user}
                        lookup={lookup}
                        enableAssists={league.enableAssists}
                    />
                )}

                {tab === 'finance' && (
                    <FinanceTab
                        league={league}
                        leagueId={id!}
                        completedGames={completedGames}
                        myId={myId}
                        isAdmin={isAdmin}
                        lookup={lookup}
                        onRecordPayment={handleRecordPayment}
                        onApproveExpense={handleApproveExpense}
                        onRejectExpense={handleRejectExpense}
                        onSaveDefaultCost={handleSaveDefaultCost}
                    />
                )}

                {tab === 'members' && user && (
                    <MembersTab
                        league={league}
                        leagueId={id!}
                        user={user}
                        members={members}
                        games={games}
                        isOwner={isOwner}
                        isAdmin={isAdmin}
                        code={code!}
                        copiedCode={copiedCode}
                        onCopyCode={copyCode}
                        onLeaveLeague={handleLeaveLeague}
                        onDeleteLeague={handleDeleteLeague}
                        onMembersChanged={setMembers}
                    />
                )}

                {tab === 'profile' && user && (
                    <ProfileTab
                        user={user}
                        league={league}
                        leagueId={id!}
                        completedGames={completedGames}
                        myId={myId}
                        myStats={myStats}
                        enableAssists={league.enableAssists}
                        updatePlayerTags={updatePlayerTags}
                        updateBio={updateBio}
                        onSubmitPayment={handleSubmitMyPayment}
                        onOpenExpenseForm={() => setShowMyExpenseForm(true)}
                    />
                )}
            </div>

            {/* Mobile bottom nav — hidden on desktop */}
            <MobileBottomNav tab={tab} setTab={setTab} upcomingCount={upcomingGames.length} />

        </div>
    );
};

export default LeaguePage;
