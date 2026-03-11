import { Game, League, PaymentRecord } from '../../types';

/** Get the list of player IDs who attended a game, falling back to team players if attendees not set */
function getGameAttendees(g: Game): string[] {
    if (g.attendees && g.attendees.length > 0) return g.attendees;
    if (g.teams) return g.teams.flatMap(t => t.players.map(p => p.playerId ?? p.name));
    return [];
}

export interface BalancePoint {
    date: number;
    balance: number;
}

/**
 * Build weekly balance series from first game to now.
 * Returns {date, balance} for each Monday.
 * balance = owed - paid (positive = debt, negative = credit).
 */
export function buildWeeklySeries(
    completedGames: Game[],
    paymentsMap: Record<string, PaymentRecord[]>,
    defaultCost: number,
    playerId?: string,
    fromDate?: number,
): BalancePoint[] {
    const relevantGames = completedGames.filter(g => getGameAttendees(g).length > 0);
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

    return weeks.map(weekStart => {
        let owed = 0;
        relevantGames.forEach(g => {
            if (g.date >= weekStart) return;
            const cost = g.costPerPerson ?? defaultCost;
            const att = getGameAttendees(g);
            const filtered = playerId ? att.filter(id => id === playerId) : att;
            owed += filtered.length * cost;
        });
        let paid = 0;
        Object.entries(paymentsMap).forEach(([id, recs]) => {
            if (playerId && id !== playerId) return;
            recs.forEach(p => { if (p.date < weekStart) paid += p.amount; });
        });
        return { date: weekStart, balance: owed - paid };
    });
}

/**
 * Returns the % offset from top where value=0 sits in a chart.
 * Used for two-tone gradients (green above zero, red below).
 */
export function zeroOffset(series: { balance: number }[]): string {
    const vals = series.map(p => p.balance);
    const lo = Math.min(0, ...vals);
    const hi = Math.max(0, ...vals);
    const range = hi - lo || 1;
    return `${((hi / range) * 100).toFixed(1)}%`;
}

/**
 * Negate balance series so that up = collected/credit, down = outstanding/debt.
 */
export function negateSeries(series: BalancePoint[]): BalancePoint[] {
    return series.map(p => ({ ...p, balance: -p.balance }));
}

export interface FinanceLedgerRow {
    playerId: string;
    games: number;
    owed: number;
    paid: number;
    history: PaymentRecord[];
    balance: number;
}

export function buildFinanceLedger(
    completedGames: Game[],
    league: League,
): FinanceLedgerRow[] {
    const paymentsMap: Record<string, PaymentRecord[]> = league.payments ?? {};
    const playerData = new Map<string, { games: number; owed: number }>();

    completedGames.forEach(g => {
        const att = getGameAttendees(g);
        if (att.length === 0) return;
        const cost = g.costPerPerson ?? league.defaultCostPerPerson ?? 0;
        att.forEach(pid => {
            const ex = playerData.get(pid) ?? { games: 0, owed: 0 };
            playerData.set(pid, { games: ex.games + 1, owed: ex.owed + cost });
        });
    });

    return [...playerData.entries()]
        .map(([playerId, data]) => {
            const history = paymentsMap[playerId] ?? [];
            const paid = history.reduce((s, p) => s + p.amount, 0);
            return { playerId, games: data.games, owed: data.owed, paid, history, balance: data.owed - paid };
        })
        .sort((a, b) => b.balance - a.balance);
}
