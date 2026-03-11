import React, { useState } from 'react';
import { Game } from '../../types';
import { computeExtendedStats } from './statsUtils';
import PlayerName from '../../components/PlayerName';
import type { User } from 'firebase/auth';

interface StatsTabProps {
    completedGames: Game[];
    myId: string;
    myName: string;
    user: User | null;
    lookup: Record<string, string>;
    enableAssists?: boolean;
}

const StatsTab: React.FC<StatsTabProps> = ({ completedGames, myId, myName, user, lookup, enableAssists }) => {
    const [statsFilter, setStatsFilter] = useState<'all' | 'month' | 'year'>('all');

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

    return (
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
                    const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                    return d.getFullYear() === lm.getFullYear() && d.getMonth() === lm.getMonth();
                });

                if (filteredGames.length === 0) return (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-10 text-center">
                        <div className="text-4xl mb-3">📭</div>
                        <p className="text-white/50 text-sm">No games in this period.</p>
                    </div>
                );

                const stats = computeExtendedStats(filteredGames);
                const { scorerTotals: fScorerTotals, assistTotals: fAssistTotals, motmTotals: fMotmTotals, winCounts: fWinCounts, gamesPlayedCounts: fPlayedCounts, cleanSheets: fCleanSheets, hatTricks: fHatTricks, form: fForm } = stats;

                const totalGoals = [...fScorerTotals.values()].reduce((a, b) => a + b, 0);
                const totalAssists = enableAssists ? [...fAssistTotals.values()].reduce((a, b) => a + b, 0) : 0;

                // Contributions (goals + assists combined)
                const contributorNames = new Set([...fScorerTotals.keys(), ...(enableAssists ? fAssistTotals.keys() : [])]);
                const sortedContributors = [...contributorNames]
                    .map(name => ({
                        name,
                        goals: fScorerTotals.get(name) ?? 0,
                        assists: enableAssists ? (fAssistTotals.get(name) ?? 0) : 0,
                        total: (fScorerTotals.get(name) ?? 0) + (enableAssists ? (fAssistTotals.get(name) ?? 0) : 0),
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

                // Personal highlights for signed-in user
                const myGoalsF = fScorerTotals.get(myId) ?? 0;
                const myAssistsF = enableAssists ? (fAssistTotals.get(myId) ?? 0) : 0;
                const myWinsF = fWinCounts.get(myId) ?? 0;
                const myPlayedF = fPlayedCounts.get(myId) ?? 0;
                const myWinPctF = myPlayedF > 0 ? Math.round((myWinsF / myPlayedF) * 100) : 0;
                const myMotmF = fMotmTotals.get(myId) ?? 0;
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
                                    <div className={`grid gap-3 ${enableAssists ? 'grid-cols-4' : 'grid-cols-3'}`}>
                                        {[
                                            { value: myPlayedF, label: 'Games' },
                                            { value: myGoalsF, label: 'Goals' },
                                            ...(enableAssists ? [{ value: myAssistsF, label: 'Assists' }] : []),
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
                        <div className={`grid gap-2 ${enableAssists ? 'grid-cols-3' : 'grid-cols-2'}`}>
                            {[
                                { emoji: '🎮', label: 'Games', value: filteredGames.length },
                                { emoji: '⚽', label: 'Goals', value: totalGoals },
                                ...(enableAssists ? [{ emoji: '🅰️', label: 'Assists', value: totalAssists }] : []),
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
                                <span className="font-semibold text-white text-sm">{enableAssists ? 'Goal Contributions' : 'Goal Scorers'}</span>
                                {enableAssists && <span className="text-white/25 text-[10px] ml-auto uppercase tracking-wide">G · A</span>}
                            </div>
                            {sortedContributors.length === 0 ? (
                                <p className="px-4 pb-4 text-white/30 text-sm">No goals or assists yet</p>
                            ) : (
                                <div className="divide-y divide-white/5">
                                    {sortedContributors.map(({ name, goals, assists }, i) => (
                                        <div key={name} className={`px-4 py-2.5 ${name === myId ? 'bg-green-500/8' : ''}`}>
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <span className="w-5 text-center text-sm shrink-0 leading-none">
                                                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : <span className="text-white/25 text-xs">{i + 1}</span>}
                                                </span>
                                                <span className={`flex-1 text-sm truncate ${name === myId ? 'text-green-300 font-semibold' : 'text-white/90'}`}>
                                                    <PlayerName id={name} lookup={lookup} />
                                                    {(fHatTricks.get(name) ?? 0) > 0 && (
                                                        <span className="ml-1.5 text-[10px] bg-amber-500/15 text-amber-300 px-1 py-0.5 rounded font-medium">
                                                            🎩{fHatTricks.get(name)! > 1 ? ` ×${fHatTricks.get(name)}` : ''}
                                                        </span>
                                                    )}
                                                </span>
                                                <span className="text-xs shrink-0 tabular-nums text-white/70">
                                                    <span className="text-white font-semibold">{goals}</span>
                                                    {enableAssists && <>
                                                        <span className="text-white/25 mx-0.5">·</span>
                                                        <span className="text-blue-300">{assists}</span>
                                                    </>}
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
                                            <div key={name} className={`px-4 py-2.5 ${name === myId ? 'bg-green-500/8' : ''}`}>
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <span className="w-5 text-center text-sm shrink-0 leading-none">
                                                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : <span className="text-white/25 text-xs">{i + 1}</span>}
                                                    </span>
                                                    <PlayerName id={name} lookup={lookup} className={`flex-1 text-sm truncate ${name === myId ? 'text-green-300 font-semibold' : 'text-white/90'}`} />
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
                                        <div key={name} className={`px-4 py-2.5 ${name === myId ? 'bg-green-500/8' : ''}`}>
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <span className="w-5 text-center text-sm shrink-0 leading-none">
                                                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : <span className="text-white/25 text-xs">{i + 1}</span>}
                                                </span>
                                                <PlayerName id={name} lookup={lookup} className={`flex-1 text-sm truncate ${name === myId ? 'text-green-300 font-semibold' : 'text-white/90'}`} />
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
                                        <div key={name} className={`px-4 py-2.5 flex items-center gap-3 ${name === myId ? 'bg-green-500/8' : ''}`}>
                                            <PlayerName id={name} lookup={lookup} className={`flex-1 text-sm truncate ${name === myId ? 'text-green-300 font-semibold' : 'text-white/80'}`} />
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
                                                <PlayerName id={sortedMotm[1][0]} lookup={lookup} className={`text-xs truncate mb-2 block ${sortedMotm[1][0] === myId ? 'text-green-300 font-semibold' : 'text-white/70'}`} />
                                                <div className="bg-white/10 rounded-t-xl pt-5 pb-3">
                                                    <span className="text-white font-bold tabular-nums">{sortedMotm[1][1]}×</span>
                                                </div>
                                            </div>
                                        )}
                                        {/* 1st place */}
                                        <div className="flex-1 text-center">
                                            <div className="text-2xl mb-1.5">🥇</div>
                                            <PlayerName id={sortedMotm[0][0]} lookup={lookup} className={`text-xs font-semibold truncate mb-2 block ${sortedMotm[0][0] === myId ? 'text-green-300' : 'text-white'}`} />
                                            <div className="bg-gradient-to-b from-yellow-500/30 to-yellow-600/10 border border-yellow-500/20 rounded-t-xl pt-7 pb-3">
                                                <span className="text-yellow-300 font-bold text-lg tabular-nums">{sortedMotm[0][1]}×</span>
                                            </div>
                                        </div>
                                        {/* 3rd place */}
                                        {sortedMotm[2] && (
                                            <div className="flex-1 text-center">
                                                <div className="text-xl mb-1.5">🥉</div>
                                                <PlayerName id={sortedMotm[2][0]} lookup={lookup} className={`text-xs truncate mb-2 block ${sortedMotm[2][0] === myId ? 'text-green-300 font-semibold' : 'text-white/50'}`} />
                                                <div className="bg-white/5 rounded-t-xl pt-3 pb-3">
                                                    <span className="text-white/50 font-bold tabular-nums">{sortedMotm[2][1]}×</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {sortedMotm.slice(sortedMotm.length >= 2 ? 3 : 0).map(([name, count]) => (
                                    <div key={name} className={`flex items-center justify-between px-4 py-2.5 border-t border-white/5 ${name === myId ? 'bg-green-500/8' : ''}`}>
                                        <PlayerName id={name} lookup={lookup} className={`text-sm ${name === myId ? 'text-green-300 font-semibold' : 'text-white/60'}`} />
                                        <span className="text-white/40 text-xs tabular-nums">{count}×</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                );
            })()}
        </div>
    );
};

export default StatsTab;
