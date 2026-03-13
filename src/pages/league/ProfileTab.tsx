import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, ReferenceLine, Tooltip } from 'recharts';
import { Pencil, Check, X, Share2, ShieldCheck } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { logger } from '../../utils/logger';
import { getHealthSharingDefault, updateHealthSharingDefault } from '../../utils/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { League, Game, PaymentRecord } from '../../types';
import { PLAYER_POSITIONS } from '../../constants/playerPositions';
import { PLAYER_TAGS } from '../../constants/playerTags';
import { buildWeeklySeries, zeroOffset } from './financeUtils';
import type { PersonalStats } from './statsUtils';
import type { User } from 'firebase/auth';

const MAX_TAGS = 3;

interface ProfileTabProps {
    user: User;
    league: League;
    leagueId: string;
    completedGames: Game[];
    myId: string;
    myStats: PersonalStats;
    enableAssists?: boolean;
    updatePlayerTags: (tags: string[], positions: string[]) => Promise<void>;
    updateBio: (bio: string) => Promise<void>;
    onSubmitPayment: (amount: number) => Promise<void>;
    onOpenExpenseForm: () => void;
}

const ProfileTab: React.FC<ProfileTabProps> = ({
    user, league, completedGames, myId, myStats, enableAssists,
    updatePlayerTags, updateBio, onSubmitPayment, onOpenExpenseForm,
}) => {
    const [leagueProfile, setLeagueProfile] = useState<{ tags: string[]; positions: string[]; bio: string; hasSetTags: boolean } | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editPositions, setEditPositions] = useState<string[]>([]);
    const [editTags, setEditTags] = useState<string[]>([]);
    const [editBio, setEditBio] = useState('');
    const [saving, setSaving] = useState(false);
    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [editingName, setEditingName] = useState(false);
    const [nameInput, setNameInput] = useState('');
    const [nameSaving, setNameSaving] = useState(false);
    const [nameError, setNameError] = useState('');
    const [shareHealth, setShareHealth] = useState(false);
    const { updateDisplayName } = useAuth();

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
        getHealthSharingDefault(user.uid).then(setShareHealth).catch(() => {});
    }, [user]);

    const handleSave = async () => {
        if (editTags.length !== MAX_TAGS || editPositions.length === 0) return;
        setSaving(true);
        try {
            await updatePlayerTags(editTags, editPositions);
            await updateBio(editBio.trim());
            setLeagueProfile(prev => prev ? { ...prev, tags: editTags, positions: editPositions, bio: editBio.trim(), hasSetTags: true } : prev);
            setIsEditing(false);
        } catch (err) {
            logger.error('[saveLeagueProfile]', err);
        }
        setSaving(false);
    };

    const handleSubmitPayment = async () => {
        const amount = parseFloat(paymentAmount);
        if (!amount || amount <= 0) return;
        await onSubmitPayment(amount);
        setPaymentAmount('');
        setShowPaymentForm(false);
    };

    return (
        <div className="space-y-4">
            {/* Profile card */}
            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">My Profile</span>
                    {!isEditing && leagueProfile?.hasSetTags && (
                        <button
                            onClick={() => {
                                setEditPositions(leagueProfile.positions);
                                setEditTags(leagueProfile.tags);
                                setEditBio(leagueProfile.bio);
                                setIsEditing(true);
                            }}
                            className="text-white/40 hover:text-white/70 transition-colors"
                            title="Edit profile"
                        >
                            <Pencil className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Display name */}
                <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/10">
                    {editingName ? (
                        <form
                            className="flex items-center gap-2 flex-1"
                            onSubmit={async e => {
                                e.preventDefault();
                                const trimmed = nameInput.trim();
                                if (!trimmed) { setNameError('Please enter a name'); return; }
                                if (trimmed.length > 30) { setNameError('Name must be 30 characters or less'); return; }
                                setNameSaving(true);
                                try {
                                    await updateDisplayName(trimmed);
                                    setEditingName(false);
                                } catch {
                                    setNameError('Something went wrong');
                                }
                                setNameSaving(false);
                            }}
                        >
                            <input
                                autoFocus
                                value={nameInput}
                                onChange={e => { setNameInput(e.target.value); setNameError(''); }}
                                maxLength={30}
                                placeholder="Your display name"
                                className="flex-1 bg-white/10 border border-white/30 rounded-lg px-3 py-1.5 text-white text-sm focus:ring-2 focus:ring-green-400 outline-none"
                            />
                            <button type="submit" disabled={nameSaving} className="text-green-400 hover:text-green-300 shrink-0">
                                <Check className="w-4 h-4" />
                            </button>
                            <button type="button" onClick={() => setEditingName(false)} className="text-white/40 hover:text-white shrink-0">
                                <X className="w-4 h-4" />
                            </button>
                        </form>
                    ) : (
                        <>
                            <span className="text-white font-semibold text-sm flex-1">{user.displayName || user.email}</span>
                            <button
                                onClick={() => { setNameInput(user.displayName || ''); setNameError(''); setEditingName(true); }}
                                className="text-white/30 hover:text-white/60 transition-colors"
                                title="Edit display name"
                            >
                                <Pencil className="w-3.5 h-3.5" />
                            </button>
                        </>
                    )}
                    {nameError && <span className="text-red-400 text-xs">{nameError}</span>}
                </div>

                {isEditing ? (
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
                                onClick={handleSave}
                                disabled={saving || editTags.length !== MAX_TAGS || editPositions.length === 0}
                                className="bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                            >
                                {saving ? 'Saving…' : 'Save'}
                            </button>
                            <button
                                onClick={() => setIsEditing(false)}
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
                            setEditPositions([]);
                            setEditTags([]);
                            setEditBio('');
                            setIsEditing(true);
                        }}
                        className="text-sm text-green-400 hover:text-green-300 transition-colors"
                    >
                        Set up your player profile →
                    </button>
                )}
            </div>

            {/* Health data sharing toggle */}
            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                <label
                    className="flex items-start gap-3 cursor-pointer"
                    onClick={async () => {
                        const newVal = !shareHealth;
                        setShareHealth(newVal);
                        try {
                            await updateHealthSharingDefault(user.uid, newVal);
                        } catch (err) {
                            logger.error('Failed to update health sharing:', err);
                            setShareHealth(!newVal); // revert
                        }
                    }}
                >
                    <div className="pt-0.5 shrink-0">
                        <div className={`w-9 h-5 rounded-full transition-colors relative ${shareHealth ? 'bg-green-500' : 'bg-white/15'}`}>
                            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${shareHealth ? 'translate-x-4' : 'translate-x-0.5'}`} />
                        </div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                            {shareHealth ? (
                                <Share2 className="w-3.5 h-3.5 text-green-400" />
                            ) : (
                                <ShieldCheck className="w-3.5 h-3.5 text-white/40" />
                            )}
                            <span className="text-white text-sm">Share match health data</span>
                        </div>
                        <div className="text-white/40 text-xs mt-0.5">
                            {shareHealth
                                ? 'League members can see your health stats for future games'
                                : 'Your health data is private — only you can see it'}
                        </div>
                    </div>
                </label>
            </div>

            {/* Per-league stats */}
            {completedGames.length > 0 && (
                <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                    <div className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">My Stats in {league.name}</div>
                    <div className={`grid ${enableAssists ? 'grid-cols-5' : 'grid-cols-4'} gap-3 text-center`}>
                        {[
                            { value: myStats.gamesPlayed, label: 'Games' },
                            { value: myStats.wins, label: 'Wins' },
                            { value: myStats.goals, label: 'Goals' },
                            ...(enableAssists ? [{ value: myStats.assists, label: 'Assists' }] : []),
                            { value: myStats.motm, label: 'MOTM' },
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
                        const hasHatTrick = completedGames.some(g =>
                            (g.goalScorers?.find(s => s.playerId === myId)?.goals ?? 0) >= 3
                        );
                        if (hasHatTrick) badges.push({ emoji: '🎯', label: 'Hat-trick Hero' });
                        if (myStats.motm >= 5) badges.push({ emoji: '⭐', label: 'MOTM Machine' });
                        if (myStats.gamesPlayed / completedGames.length >= 0.8) badges.push({ emoji: '📅', label: 'Ever Present' });
                        if (myStats.goals >= 10) badges.push({ emoji: '⚽', label: '10 Club' });
                        if (myStats.wins >= 10) badges.push({ emoji: '🏆', label: 'Winner' });
                        const recentPlayed = completedGames
                            .filter(g => g.teams?.some(t => t.players.some(p => (p.playerId ?? p.name) === myId)))
                            .sort((a, b) => b.date - a.date)
                            .slice(0, 3);
                        if (recentPlayed.length === 3 && recentPlayed.every(g =>
                            (g.goalScorers?.find(s => s.playerId === myId)?.goals ?? 0) > 0
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
                const myHistory = paymentsMap[myId] ?? [];
                const myPaid = myHistory.reduce((s, p) => s + p.amount, 0);
                let myOwed = 0;
                completedGames.forEach(g => {
                    const att = g.attendees && g.attendees.length > 0
                        ? g.attendees
                        : g.teams?.flatMap(t => t.players.map(p => p.playerId ?? p.name)) ?? [];
                    if (!att.includes(myId)) return;
                    myOwed += g.costPerPerson ?? league.defaultCostPerPerson ?? 0;
                });
                const myBalance = myOwed - myPaid;
                if (myOwed === 0 && myPaid === 0) return null;

                const relevantGames = completedGames.filter(g => g.attendees && g.attendees.length > 0);
                const last20Start = relevantGames.length > 0
                    ? relevantGames[Math.min(relevantGames.length - 1, 19)].date
                    : undefined;

                const mySeriesRaw = buildWeeklySeries(
                    completedGames, paymentsMap, league.defaultCostPerPerson ?? 0, myId, last20Start,
                );
                const mySeries = mySeriesRaw.map(p => ({ ...p, balance: -p.balance }));
                const myZeroPct = zeroOffset(mySeries);

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
                            {showPaymentForm ? (
                                <div className="flex items-center gap-2">
                                    <span className="text-white/60 text-sm shrink-0">£</span>
                                    <input
                                        type="number"
                                        value={paymentAmount}
                                        onChange={e => setPaymentAmount(e.target.value)}
                                        placeholder="Amount"
                                        min="0"
                                        step="0.5"
                                        autoFocus
                                        onKeyDown={e => { if (e.key === 'Enter') handleSubmitPayment(); if (e.key === 'Escape') setShowPaymentForm(false); }}
                                        className="flex-1 bg-white/10 border border-white/20 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-green-400"
                                    />
                                    <button onClick={handleSubmitPayment} className="text-green-400 hover:text-green-300 text-xs px-3 py-1.5 bg-green-600/20 rounded-lg whitespace-nowrap">Record</button>
                                    <button onClick={() => setShowPaymentForm(false)} className="text-white/40 hover:text-white text-xs">✕</button>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowPaymentForm(true)}
                                        className="flex-1 text-xs text-center py-2 rounded-lg bg-green-600/20 text-green-400 hover:bg-green-600/30 transition-colors font-medium border border-green-500/20"
                                    >
                                        Add Payment
                                    </button>
                                    <button
                                        onClick={onOpenExpenseForm}
                                        className="flex-1 text-xs text-center py-2 rounded-lg bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 transition-colors font-medium border border-amber-500/25"
                                    >
                                        Register Expense
                                    </button>
                                </div>
                            )}
                            {/* Pending/resolved expenses for this player */}
                            {(league.expenses ?? []).filter(e => e.playerId === myId).length > 0 && (
                                <div className="pt-1 space-y-1.5">
                                    {[...(league.expenses ?? [])].filter(e => e.playerId === myId).sort((a, b) => b.date - a.date).map(exp => (
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
    );
};

export default ProfileTab;
