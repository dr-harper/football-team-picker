import { describe, it, expect, beforeEach } from 'vitest';
import { buildFinanceLedger, zeroOffset, negateSeries, buildWeeklySeries } from '../../../src/pages/league/financeUtils';
import { makeCompletedGame, makeLeague, makePaymentRecord, resetCounter } from '../../helpers/gameFactory';

beforeEach(() => resetCounter());

describe('buildFinanceLedger', () => {
    it('returns empty array for no games', () => {
        const league = makeLeague();
        expect(buildFinanceLedger([], league)).toEqual([]);
    });

    it('falls back to team players when attendees not set', () => {
        const game = makeCompletedGame({
            team1Players: [{ playerId: 'p1', name: 'Alice' }],
            team2Players: [{ playerId: 'p2', name: 'Bob' }],
            score: { team1: 1, team2: 0 },
        });
        const league = makeLeague({ defaultCostPerPerson: 10 });
        const ledger = buildFinanceLedger([game], league);
        expect(ledger).toHaveLength(2);
        expect(ledger[0].owed).toBe(10);
    });

    it('computes owed from attended games', () => {
        const game = makeCompletedGame({
            team1Players: [{ playerId: 'p1', name: 'Alice' }],
            team2Players: [{ playerId: 'p2', name: 'Bob' }],
            score: { team1: 1, team2: 0 },
            attendees: ['p1', 'p2'],
            costPerPerson: 10,
        });
        const league = makeLeague();
        const ledger = buildFinanceLedger([game], league);
        expect(ledger).toHaveLength(2);
        expect(ledger[0].owed).toBe(10);
    });

    it('uses league default cost when game has no override', () => {
        const game = makeCompletedGame({
            team1Players: [{ playerId: 'p1', name: 'Alice' }],
            team2Players: [{ playerId: 'p2', name: 'Bob' }],
            score: { team1: 1, team2: 0 },
            attendees: ['p1'],
        });
        const league = makeLeague({ defaultCostPerPerson: 7 });
        const ledger = buildFinanceLedger([game], league);
        expect(ledger[0].owed).toBe(7);
    });

    it('computes balance as owed - paid', () => {
        const game = makeCompletedGame({
            team1Players: [{ playerId: 'p1', name: 'Alice' }],
            team2Players: [{ playerId: 'p2', name: 'Bob' }],
            score: { team1: 1, team2: 0 },
            attendees: ['p1'],
            costPerPerson: 20,
        });
        const league = makeLeague({
            payments: { p1: [makePaymentRecord({ amount: 15 })] },
        });
        const ledger = buildFinanceLedger([game], league);
        expect(ledger[0].balance).toBe(5); // 20 - 15
    });

    it('sorts by balance descending (biggest debtors first)', () => {
        const game = makeCompletedGame({
            team1Players: [{ playerId: 'p1', name: 'Alice' }],
            team2Players: [{ playerId: 'p2', name: 'Bob' }],
            score: { team1: 1, team2: 0 },
            attendees: ['p1', 'p2'],
            costPerPerson: 10,
        });
        const league = makeLeague({
            payments: {
                p1: [makePaymentRecord({ amount: 8 })],
                p2: [makePaymentRecord({ amount: 2 })],
            },
        });
        const ledger = buildFinanceLedger([game], league);
        expect(ledger[0].playerId).toBe('p2'); // 10-2=8
        expect(ledger[1].playerId).toBe('p1'); // 10-8=2
    });

    it('accumulates across multiple games', () => {
        const game1 = makeCompletedGame({
            team1Players: [{ playerId: 'p1', name: 'Alice' }],
            team2Players: [{ playerId: 'p2', name: 'Bob' }],
            score: { team1: 1, team2: 0 },
            attendees: ['p1'],
            costPerPerson: 10,
        });
        const game2 = makeCompletedGame({
            team1Players: [{ playerId: 'p1', name: 'Alice' }],
            team2Players: [{ playerId: 'p2', name: 'Bob' }],
            score: { team1: 0, team2: 1 },
            attendees: ['p1'],
            costPerPerson: 10,
        });
        const league = makeLeague();
        const ledger = buildFinanceLedger([game1, game2], league);
        expect(ledger[0].owed).toBe(20);
        expect(ledger[0].games).toBe(2);
    });

    it('handles zero cost', () => {
        const game = makeCompletedGame({
            team1Players: [{ playerId: 'p1', name: 'Alice' }],
            team2Players: [{ playerId: 'p2', name: 'Bob' }],
            score: { team1: 1, team2: 0 },
            attendees: ['p1'],
            costPerPerson: 0,
        });
        const league = makeLeague();
        const ledger = buildFinanceLedger([game], league);
        expect(ledger[0].balance).toBe(0);
    });
});

describe('zeroOffset', () => {
    it('returns correct percentage for all positive values', () => {
        const series = [{ balance: 10 }, { balance: 20 }];
        // hi=20, lo=0, range=20, offset = (20/20)*100 = 100%
        expect(zeroOffset(series)).toBe('100.0%');
    });

    it('returns correct percentage for all negative values', () => {
        const series = [{ balance: -10 }, { balance: -20 }];
        // hi=0, lo=-20, range=20, offset = (0/20)*100 = 0%
        expect(zeroOffset(series)).toBe('0.0%');
    });

    it('returns correct percentage for mixed values', () => {
        const series = [{ balance: 10 }, { balance: -10 }];
        // hi=10, lo=-10, range=20, offset = (10/20)*100 = 50%
        expect(zeroOffset(series)).toBe('50.0%');
    });

    it('handles zero-only series', () => {
        const series = [{ balance: 0 }];
        // hi=0, lo=0, range=1, offset = (0/1)*100 = 0%
        expect(zeroOffset(series)).toBe('0.0%');
    });
});

describe('negateSeries', () => {
    it('negates all balances', () => {
        const series = [
            { date: 1, balance: 10 },
            { date: 2, balance: -5 },
        ];
        const result = negateSeries(series);
        expect(result[0].balance).toBe(-10);
        expect(result[1].balance).toBe(5);
    });

    it('returns a new array (does not mutate original)', () => {
        const series = [{ date: 1, balance: 10 }];
        const result = negateSeries(series);
        expect(result).not.toBe(series);
        expect(series[0].balance).toBe(10); // unchanged
    });

    it('preserves dates', () => {
        const series = [{ date: 12345, balance: 10 }];
        const result = negateSeries(series);
        expect(result[0].date).toBe(12345);
    });

    it('handles empty series', () => {
        expect(negateSeries([])).toEqual([]);
    });
});

describe('buildWeeklySeries', () => {
    it('returns empty for no games with attendees', () => {
        expect(buildWeeklySeries([], {}, 10)).toEqual([]);
    });

    it('falls back to team players when attendees not set', () => {
        const game = makeCompletedGame({
            team1Players: [{ playerId: 'p1', name: 'Alice' }],
            team2Players: [{ playerId: 'p2', name: 'Bob' }],
            score: { team1: 1, team2: 0 },
            date: Date.now() - 14 * 86400000,
        });
        const series = buildWeeklySeries([game], {}, 10);
        expect(series.length).toBeGreaterThan(0);
        const lastPoint = series[series.length - 1];
        expect(lastPoint.balance).toBe(20); // both team players owe 10 each
    });

    it('returns weekly data points with correct balance', () => {
        const twoWeeksAgo = Date.now() - 14 * 86400000;
        const game = makeCompletedGame({
            team1Players: [{ playerId: 'p1', name: 'Alice' }],
            team2Players: [{ playerId: 'p2', name: 'Bob' }],
            score: { team1: 1, team2: 0 },
            attendees: ['p1'],
            date: twoWeeksAgo,
        });

        const series = buildWeeklySeries([game], {}, 10);
        expect(series.length).toBeGreaterThan(0);
        // The last data point should show balance = 10 (owed) - 0 (paid) = 10
        const lastPoint = series[series.length - 1];
        expect(lastPoint.balance).toBe(10);
    });

    it('filters by playerId when provided', () => {
        const twoWeeksAgo = Date.now() - 14 * 86400000;
        const game = makeCompletedGame({
            team1Players: [{ playerId: 'p1', name: 'Alice' }],
            team2Players: [{ playerId: 'p2', name: 'Bob' }],
            score: { team1: 1, team2: 0 },
            attendees: ['p1', 'p2'],
            costPerPerson: 10,
            date: twoWeeksAgo,
        });

        const seriesP1 = buildWeeklySeries([game], {}, 10, 'p1');
        const seriesAll = buildWeeklySeries([game], {}, 10);
        // Filtered series should show only p1's debt (10), not combined (20)
        const lastP1 = seriesP1[seriesP1.length - 1];
        const lastAll = seriesAll[seriesAll.length - 1];
        expect(lastP1.balance).toBe(10);
        expect(lastAll.balance).toBe(20);
    });
});
