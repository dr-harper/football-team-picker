import { describe, it, expect, beforeEach } from 'vitest';
import { computeLeagueTable } from '../../../src/pages/league/leagueTableUtils';
import { makeCompletedGame, makeGame, resetCounter } from '../../helpers/gameFactory';

beforeEach(() => resetCounter());

describe('computeLeagueTable', () => {
    it('returns empty array for no games', () => {
        expect(computeLeagueTable([])).toEqual([]);
    });

    it('skips non-completed games', () => {
        const game = makeGame({ status: 'scheduled' });
        expect(computeLeagueTable([game])).toEqual([]);
    });

    it('skips completed games without scores', () => {
        const game = makeGame({ status: 'completed', teams: [], score: undefined });
        expect(computeLeagueTable([game])).toEqual([]);
    });

    it('skips completed games without teams', () => {
        const game = makeGame({ status: 'completed', score: { team1: 1, team2: 0 }, teams: undefined });
        expect(computeLeagueTable([game])).toEqual([]);
    });

    it('skips games with fewer than 2 teams', () => {
        const game = makeCompletedGame({
            team1Players: [{ playerId: 'p1', name: 'Alice' }],
            team2Players: [],
            score: { team1: 1, team2: 0 },
        });
        game.teams = [game.teams![0]]; // only 1 team
        expect(computeLeagueTable([game])).toEqual([]);
    });

    it('awards 3 points for a win, 0 for a loss', () => {
        const game = makeCompletedGame({
            team1Players: [{ playerId: 'p1', name: 'Alice' }],
            team2Players: [{ playerId: 'p2', name: 'Bob' }],
            score: { team1: 2, team2: 0 },
        });

        const table = computeLeagueTable([game]);
        const alice = table.find(r => r.playerId === 'p1')!;
        const bob = table.find(r => r.playerId === 'p2')!;

        expect(alice.points).toBe(3);
        expect(alice.won).toBe(1);
        expect(alice.lost).toBe(0);

        expect(bob.points).toBe(0);
        expect(bob.won).toBe(0);
        expect(bob.lost).toBe(1);
    });

    it('awards 1 point each for a draw', () => {
        const game = makeCompletedGame({
            team1Players: [{ playerId: 'p1', name: 'Alice' }],
            team2Players: [{ playerId: 'p2', name: 'Bob' }],
            score: { team1: 1, team2: 1 },
        });

        const table = computeLeagueTable([game]);
        expect(table[0].points).toBe(1);
        expect(table[0].drawn).toBe(1);
        expect(table[1].points).toBe(1);
        expect(table[1].drawn).toBe(1);
    });

    it('tracks goals for and against correctly', () => {
        const game = makeCompletedGame({
            team1Players: [{ playerId: 'p1', name: 'Alice' }],
            team2Players: [{ playerId: 'p2', name: 'Bob' }],
            score: { team1: 3, team2: 1 },
        });

        const table = computeLeagueTable([game]);
        const alice = table.find(r => r.playerId === 'p1')!;
        const bob = table.find(r => r.playerId === 'p2')!;

        expect(alice.goalsFor).toBe(3);
        expect(alice.goalsAgainst).toBe(1);
        expect(alice.goalDifference).toBe(2);

        expect(bob.goalsFor).toBe(1);
        expect(bob.goalsAgainst).toBe(3);
        expect(bob.goalDifference).toBe(-2);
    });

    it('accumulates stats across multiple games', () => {
        const game1 = makeCompletedGame({
            team1Players: [{ playerId: 'p1', name: 'Alice' }],
            team2Players: [{ playerId: 'p2', name: 'Bob' }],
            score: { team1: 2, team2: 0 },
        });
        const game2 = makeCompletedGame({
            team1Players: [{ playerId: 'p1', name: 'Alice' }],
            team2Players: [{ playerId: 'p2', name: 'Bob' }],
            score: { team1: 1, team2: 1 },
        });

        const table = computeLeagueTable([game1, game2]);
        const alice = table.find(r => r.playerId === 'p1')!;

        expect(alice.played).toBe(2);
        expect(alice.won).toBe(1);
        expect(alice.drawn).toBe(1);
        expect(alice.points).toBe(4); // 3 + 1
        expect(alice.goalsFor).toBe(3); // 2 + 1
        expect(alice.goalsAgainst).toBe(1); // 0 + 1
    });

    it('sorts by points desc, then GD desc, then GF desc', () => {
        // p1: 3pts, GD +2, GF 3
        const game1 = makeCompletedGame({
            team1Players: [{ playerId: 'p1', name: 'Alice' }],
            team2Players: [{ playerId: 'p2', name: 'Bob' }],
            score: { team1: 3, team2: 1 },
        });
        // p3: 3pts, GD +2, GF 2
        const game2 = makeCompletedGame({
            team1Players: [{ playerId: 'p3', name: 'Charlie' }],
            team2Players: [{ playerId: 'p4', name: 'Dave' }],
            score: { team1: 2, team2: 0 },
        });

        const table = computeLeagueTable([game1, game2]);
        // p1 and p3 both have 3pts, +2 GD, but p1 has GF=3 vs p3 GF=2
        expect(table[0].playerId).toBe('p1');
        expect(table[1].playerId).toBe('p3');
    });

    it('uses playerId when available, falls back to name', () => {
        const game = makeCompletedGame({
            team1Players: [{ name: 'Alice' }], // no playerId
            team2Players: [{ playerId: 'p2', name: 'Bob' }],
            score: { team1: 1, team2: 0 },
        });

        const table = computeLeagueTable([game]);
        const ids = table.map(r => r.playerId);
        expect(ids).toContain('Alice'); // fell back to name
        expect(ids).toContain('p2');    // used playerId
    });

    it('handles multiple players per team', () => {
        const game = makeCompletedGame({
            team1Players: [
                { playerId: 'p1', name: 'Alice' },
                { playerId: 'p2', name: 'Bob' },
            ],
            team2Players: [
                { playerId: 'p3', name: 'Charlie' },
                { playerId: 'p4', name: 'Dave' },
            ],
            score: { team1: 2, team2: 1 },
        });

        const table = computeLeagueTable([game]);
        expect(table).toHaveLength(4);

        // Both team 1 players should have won
        const p1 = table.find(r => r.playerId === 'p1')!;
        const p2 = table.find(r => r.playerId === 'p2')!;
        expect(p1.won).toBe(1);
        expect(p2.won).toBe(1);
    });

    describe('form tracking', () => {
        it('records W/L/D results in the form array', () => {
            const game = makeCompletedGame({
                team1Players: [{ playerId: 'p1', name: 'Alice' }],
                team2Players: [{ playerId: 'p2', name: 'Bob' }],
                score: { team1: 2, team2: 0 },
            });
            const table = computeLeagueTable([game]);
            expect(table.find(r => r.playerId === 'p1')!.form).toEqual(['W']);
            expect(table.find(r => r.playerId === 'p2')!.form).toEqual(['L']);
        });

        it('records draws in form', () => {
            const game = makeCompletedGame({
                team1Players: [{ playerId: 'p1', name: 'Alice' }],
                team2Players: [{ playerId: 'p2', name: 'Bob' }],
                score: { team1: 1, team2: 1 },
            });
            const table = computeLeagueTable([game]);
            expect(table.find(r => r.playerId === 'p1')!.form).toEqual(['D']);
            expect(table.find(r => r.playerId === 'p2')!.form).toEqual(['D']);
        });

        it('preserves chronological order in form', () => {
            const game1 = makeCompletedGame({
                team1Players: [{ playerId: 'p1', name: 'Alice' }],
                team2Players: [{ playerId: 'p2', name: 'Bob' }],
                score: { team1: 2, team2: 0 },
                date: 1000,
            });
            const game2 = makeCompletedGame({
                team1Players: [{ playerId: 'p1', name: 'Alice' }],
                team2Players: [{ playerId: 'p2', name: 'Bob' }],
                score: { team1: 0, team2: 1 },
                date: 2000,
            });
            const game3 = makeCompletedGame({
                team1Players: [{ playerId: 'p1', name: 'Alice' }],
                team2Players: [{ playerId: 'p2', name: 'Bob' }],
                score: { team1: 1, team2: 1 },
                date: 3000,
            });
            // Pass in reverse order to verify sorting
            const table = computeLeagueTable([game3, game1, game2]);
            expect(table.find(r => r.playerId === 'p1')!.form).toEqual(['W', 'L', 'D']);
            expect(table.find(r => r.playerId === 'p2')!.form).toEqual(['L', 'W', 'D']);
        });

        it('trims form to last 5 results', () => {
            const games = Array.from({ length: 7 }, (_, i) =>
                makeCompletedGame({
                    team1Players: [{ playerId: 'p1', name: 'Alice' }],
                    team2Players: [{ playerId: 'p2', name: 'Bob' }],
                    score: { team1: i % 2 === 0 ? 1 : 0, team2: i % 2 === 0 ? 0 : 1 },
                    date: (i + 1) * 1000,
                }),
            );
            const table = computeLeagueTable(games);
            const p1Form = table.find(r => r.playerId === 'p1')!.form;
            expect(p1Form).toHaveLength(5);
            // Games: W L W L W L W → last 5: W L W L W
            expect(p1Form).toEqual(['W', 'L', 'W', 'L', 'W']);
        });

        it('tracks form correctly when player switches teams', () => {
            const game1 = makeCompletedGame({
                team1Players: [{ playerId: 'p1', name: 'Alice' }],
                team2Players: [{ playerId: 'p2', name: 'Bob' }],
                score: { team1: 2, team2: 0 },
                date: 1000,
            });
            const game2 = makeCompletedGame({
                team1Players: [{ playerId: 'p2', name: 'Bob' }],
                team2Players: [{ playerId: 'p1', name: 'Alice' }],
                score: { team1: 3, team2: 1 },
                date: 2000,
            });
            const table = computeLeagueTable([game1, game2]);
            // p1: W on team1, then L on team2
            expect(table.find(r => r.playerId === 'p1')!.form).toEqual(['W', 'L']);
            // p2: L on team2, then W on team1
            expect(table.find(r => r.playerId === 'p2')!.form).toEqual(['L', 'W']);
        });
    });

    it('handles 0-0 draw correctly', () => {
        const game = makeCompletedGame({
            team1Players: [{ playerId: 'p1', name: 'Alice' }],
            team2Players: [{ playerId: 'p2', name: 'Bob' }],
            score: { team1: 0, team2: 0 },
        });

        const table = computeLeagueTable([game]);
        for (const row of table) {
            expect(row.drawn).toBe(1);
            expect(row.points).toBe(1);
            expect(row.goalsFor).toBe(0);
            expect(row.goalsAgainst).toBe(0);
            expect(row.goalDifference).toBe(0);
        }
    });
});
