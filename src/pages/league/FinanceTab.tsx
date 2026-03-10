import React, { useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, LineChart, Line, XAxis, YAxis, ReferenceLine, Tooltip } from 'recharts';
import { Pencil } from 'lucide-react';
import { League, Game, LeagueExpense } from '../../types';
import { buildWeeklySeries, zeroOffset, negateSeries, buildFinanceLedger } from './financeUtils';

interface FinanceTabProps {
    league: League;
    leagueId: string;
    completedGames: Game[];
    myName: string;
    isAdmin: boolean;
    onRecordPayment: (playerName: string, amount: number) => Promise<void>;
    onApproveExpense: (expense: LeagueExpense) => Promise<void>;
    onRejectExpense: (expenseId: string) => Promise<void>;
    onSaveDefaultCost: (cost: number | null) => Promise<void>;
}

const FinanceTab: React.FC<FinanceTabProps> = ({
    league, leagueId, completedGames, myName, isAdmin,
    onRecordPayment, onApproveExpense, onRejectExpense, onSaveDefaultCost,
}) => {
    const [editingDefaultCost, setEditingDefaultCost] = useState(false);
    const [defaultCostInput, setDefaultCostInput] = useState('');
    const [addingPaymentFor, setAddingPaymentFor] = useState<string | null>(null);
    const [paymentInputs, setPaymentInputs] = useState<Record<string, string>>({});
    const [selectedPlayerChart, setSelectedPlayerChart] = useState<string | null>(null);

    const paymentsMap = league.payments ?? {};
    const financeLedger = buildFinanceLedger(completedGames, league);

    const totalOwed = financeLedger.reduce((s, r) => s + r.owed, 0);
    const totalPaid = financeLedger.reduce((s, r) => s + r.paid, 0);
    const totalOutstanding = financeLedger.reduce((s, r) => s + Math.max(0, r.balance), 0);

    const defaultCost = league.defaultCostPerPerson ?? 0;
    const last20Start = completedGames.length > 0
        ? completedGames[Math.min(completedGames.length - 1, 19)].date
        : undefined;
    const aggregateSeries = negateSeries(buildWeeklySeries(completedGames, paymentsMap, defaultCost, undefined, last20Start));

    const handleRecordPayment = async (playerName: string) => {
        const amount = parseFloat(paymentInputs[playerName] ?? '');
        if (isNaN(amount) || amount <= 0) return;
        await onRecordPayment(playerName, amount);
        setPaymentInputs(prev => ({ ...prev, [playerName]: '' }));
        setAddingPaymentFor(null);
    };

    const handleSaveDefaultCost = async () => {
        const cost = parseFloat(defaultCostInput);
        await onSaveDefaultCost(isNaN(cost) || defaultCostInput.trim() === '' ? null : cost);
        setEditingDefaultCost(false);
    };

    return (
        <div className="space-y-4">
            {/* Aggregate weekly balance chart */}
            {aggregateSeries.length >= 2 && (() => {
                const aggZeroPct = zeroOffset(aggregateSeries);
                const currentBalance = aggregateSeries[aggregateSeries.length - 1].balance;
                return (
                    <div className="bg-white/5 border border-white/8 rounded-2xl overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
                            <div>
                                <div className={`text-2xl font-bold tabular-nums ${totalOutstanding <= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    £{totalOutstanding.toFixed(2)}
                                </div>
                                <div className="text-[10px] text-white/40 uppercase tracking-wide mt-0.5">Outstanding</div>
                            </div>
                            <div className="text-right text-[11px] text-white/40">
                                <div>£{totalPaid.toFixed(0)} collected</div>
                                <div>£{totalOwed.toFixed(0)} owed</div>
                            </div>
                        </div>
                        <div className="px-4 pt-3 pb-1">
                            <div className="text-[9px] text-white/25 uppercase tracking-wide mb-1">Running balance — last 20 games</div>
                            <ResponsiveContainer width="100%" height={90}>
                                <AreaChart data={aggregateSeries} margin={{ top: 6, right: 6, bottom: 0, left: 6 }}>
                                    <defs>
                                        <linearGradient id="aggLineGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset={aggZeroPct} stopColor="#22c55e" />
                                            <stop offset={aggZeroPct} stopColor="#ef4444" />
                                        </linearGradient>
                                        <linearGradient id="aggAreaGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset={aggZeroPct} stopColor="#22c55e" stopOpacity={0.15} />
                                            <stop offset={aggZeroPct} stopColor="#ef4444" stopOpacity={0.15} />
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
                                                        £{Math.abs(v).toFixed(2)} {v >= 0 ? 'collected' : 'outstanding'}
                                                    </div>
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
                                        dot={{ r: 2.5, fill: 'url(#aggLineGrad)', strokeWidth: 0 }}
                                        activeDot={{ r: 4, strokeWidth: 0 }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                            <div className="flex justify-end text-[9px] text-white/30 pb-2 pr-1">
                                <span>£{Math.abs(currentBalance).toFixed(0)} {currentBalance >= 0 ? 'ahead' : 'outstanding'}</span>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Pending expenses (admin: approve / reject) */}
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
                                            onClick={() => onApproveExpense(exp)}
                                            className="flex-1 text-xs py-1.5 rounded-lg bg-green-600/25 text-green-400 hover:bg-green-600/40 transition-colors font-medium"
                                        >
                                            Approve — credits {exp.playerName.split(' ')[0]}
                                        </button>
                                        <button
                                            onClick={() => onRejectExpense(exp.id)}
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

            {/* Default cost setting (admin only) */}
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

            {/* Admin: full ledger with per-player charts */}
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
                                        const playerSeriesRaw = buildWeeklySeries(completedGames, paymentsMap, defaultCost, row.name, last20Start);
                                        const playerSeries = playerSeriesRaw.map(p => ({ ...p, balance: -p.balance }));
                                        const pZeroPct = zeroOffset(playerSeries);
                                        const gradId = `pg_${row.name.replace(/\W/g, '')}`;
                                        return (
                                            <div className="px-4 pb-4 pt-1 space-y-3 bg-black/10 border-t border-white/5">
                                                {/* Balance chart */}
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

            {/* Member: personal statement */}
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
                                    const mySeriesRaw = buildWeeklySeries(completedGames, paymentsMap, defaultCost, myName, last20Start);
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
};

export default FinanceTab;
