import { describe, it, expect, beforeEach } from 'vitest';
import { computeGameStats, computeExtendedStats, getPersonalStats } from '../../../src/pages/league/statsUtils';
import { makeCompletedGame, makeGame, resetCounter } from '../../helpers/gameFactory';

beforeEach(() => resetCounter());

describe('computeGameStats', () => {
    it('returns empty Maps for no games', () => {
        const stats = computeGameStats([]);
        expect(stats.scorerTotals.size).toBe(0);
        expect(stats.assistTotals.size).toBe(0);
        expect(stats.motmTotals.size).toBe(0);
        expect(stats.winCounts.size).toBe(0);
        expect(stats.gamesPlayedCounts.size).toBe(0);
    });

    it('tallies goal scorers across games', () => {
        const game1 = makeCompletedGame({
            team1Players: [{ playerId: 'p1', name: 'Alice' }],
            team2Players: [{ playerId: 'p2', name: 'Bob' }],
            score: { team1: 2, team2: 1 },
            goalScorers: [
                { playerId: 'p1', goals: 2 },
                { playerId: 'p2', goals: 1 },
            ],
        });
        const game2 = makeCompletedGame({
            team1Players: [{ playerId: 'p1', name: 'Alice' }],
            team2Players: [{ playerId: 'p2', name: 'Bob' }],
            score: { team1: 1, team2: 0 },
            goalScorers: [{ playerId: 'p1', goals: 1 }],
        });

        const stats = computeGameStats([game1, game2]);
        expect(stats.scorerTotals.get('p1')).toBe(3);
        expect(stats.scorerTotals.get('p2')).toBe(1);
    });

    it('tallies assists', () => {
        const game = makeCompletedGame({
            team1Players: [{ playerId: 'p1', name: 'Alice' }],
            team2Players: [{ playerId: 'p2', name: 'Bob' }],
            score: { team1: 1, team2: 0 },
            assisters: [{ playerId: 'p1', goals: 1 }],
        });

        const stats = computeGameStats([game]);
        expect(stats.assistTotals.get('p1')).toBe(1);
    });

    it('tallies MOTM awards', () => {
        const game1 = makeCompletedGame({
            team1Players: [{ playerId: 'p1', name: 'Alice' }],
            team2Players: [{ playerId: 'p2', name: 'Bob' }],
            score: { team1: 1, team2: 0 },
            manOfTheMatch: 'p1',
        });
        const game2 = makeCompletedGame({
            team1Players: [{ playerId: 'p1', name: 'Alice' }],
            team2Players: [{ playerId: 'p2', name: 'Bob' }],
            score: { team1: 2, team2: 1 },
            manOfTheMatch: 'p1',
        });

        const stats = computeGameStats([game1, game2]);
        expect(stats.motmTotals.get('p1')).toBe(2);
        expect(stats.motmTotals.get('p2')).toBeUndefined();
    });

    it('counts wins per player', () => {
        const game = makeCompletedGame({
            team1Players: [{ playerId: 'p1', name: 'Alice' }],
            team2Players: [{ playerId: 'p2', name: 'Bob' }],
            score: { team1: 2, team2: 1 },
        });

        const stats = computeGameStats([game]);
        expect(stats.winCounts.get('p1')).toBe(1);
        expect(stats.winCounts.get('p2')).toBeUndefined();
    });

    it('counts games played for all players on both teams', () => {
        const game = makeCompletedGame({
            team1Players: [{ playerId: 'p1', name: 'Alice' }, { playerId: 'p2', name: 'Bob' }],
            team2Players: [{ playerId: 'p3', name: 'Charlie' }],
            score: { team1: 1, team2: 0 },
        });

        const stats = computeGameStats([game]);
        expect(stats.gamesPlayedCounts.get('p1')).toBe(1);
        expect(stats.gamesPlayedCounts.get('p2')).toBe(1);
        expect(stats.gamesPlayedCounts.get('p3')).toBe(1);
    });

    it('handles games without teams or scores', () => {
        const game = makeGame({ status: 'completed', teams: undefined, score: undefined });
        const stats = computeGameStats([game]);
        expect(stats.gamesPlayedCounts.size).toBe(0);
    });

    it('handles games without goalScorers', () => {
        const game = makeCompletedGame({
            team1Players: [{ playerId: 'p1', name: 'Alice' }],
            team2Players: [{ playerId: 'p2', name: 'Bob' }],
            score: { team1: 0, team2: 0 },
        });

        const stats = computeGameStats([game]);
        expect(stats.scorerTotals.size).toBe(0);
    });
});

describe('computeExtendedStats', () => {
    it('computes clean sheets when team concedes 0', () => {
        const game = makeCompletedGame({
            team1Players: [{ playerId: 'p1', name: 'Alice' }],
            team2Players: [{ playerId: 'p2', name: 'Bob' }],
            score: { team1: 1, team2: 0 },
        });

        const stats = computeExtendedStats([game]);
        expect(stats.cleanSheets.get('p1')).toBe(1);
        expect(stats.cleanSheets.get('p2')).toBeUndefined();
    });

    it('awards clean sheets to all players on the team', () => {
        const game = makeCompletedGame({
            team1Players: [
                { playerId: 'p1', name: 'Alice' },
                { playerId: 'p2', name: 'Bob' },
            ],
            team2Players: [{ playerId: 'p3', name: 'Charlie' }],
            score: { team1: 1, team2: 0 },
        });

        const stats = computeExtendedStats([game]);
        expect(stats.cleanSheets.get('p1')).toBe(1);
        expect(stats.cleanSheets.get('p2')).toBe(1);
    });

    it('both teams get clean sheets in 0-0 draw', () => {
        const game = makeCompletedGame({
            team1Players: [{ playerId: 'p1', name: 'Alice' }],
            team2Players: [{ playerId: 'p2', name: 'Bob' }],
            score: { team1: 0, team2: 0 },
        });

        const stats = computeExtendedStats([game]);
        expect(stats.cleanSheets.get('p1')).toBe(1);
        expect(stats.cleanSheets.get('p2')).toBe(1);
    });

    it('detects hat tricks (3+ goals in a single game)', () => {
        const game = makeCompletedGame({
            team1Players: [{ playerId: 'p1', name: 'Alice' }],
            team2Players: [{ playerId: 'p2', name: 'Bob' }],
            score: { team1: 3, team2: 0 },
            goalScorers: [{ playerId: 'p1', goals: 3 }],
        });

        const stats = computeExtendedStats([game]);
        expect(stats.hatTricks.get('p1')).toBe(1);
    });

    it('does not count 2 goals as a hat trick', () => {
        const game = makeCompletedGame({
            team1Players: [{ playerId: 'p1', name: 'Alice' }],
            team2Players: [{ playerId: 'p2', name: 'Bob' }],
            score: { team1: 2, team2: 0 },
            goalScorers: [{ playerId: 'p1', goals: 2 }],
        });

        const stats = computeExtendedStats([game]);
        expect(stats.hatTricks.get('p1')).toBeUndefined();
    });

    it('computes form as last 5 results', () => {
        const games = [];
        for (let i = 0; i < 7; i++) {
            games.push(makeCompletedGame({
                team1Players: [{ playerId: 'p1', name: 'Alice' }],
                team2Players: [{ playerId: 'p2', name: 'Bob' }],
                score: { team1: i < 5 ? 1 : 0, team2: i < 5 ? 0 : 1 },
                date: i * 86400000,
            }));
        }

        const stats = computeExtendedStats(games);
        const p1Form = stats.form.get('p1')!;
        expect(p1Form).toHaveLength(5);
    });

    it('includes base stats (scorerTotals, etc.)', () => {
        const game = makeCompletedGame({
            team1Players: [{ playerId: 'p1', name: 'Alice' }],
            team2Players: [{ playerId: 'p2', name: 'Bob' }],
            score: { team1: 1, team2: 0 },
            goalScorers: [{ playerId: 'p1', goals: 1 }],
        });

        const stats = computeExtendedStats([game]);
        expect(stats.scorerTotals.get('p1')).toBe(1);
    });
});

describe('getPersonalStats', () => {
    it('returns correct totals for a known player', () => {
        const game = makeCompletedGame({
            team1Players: [{ playerId: 'p1', name: 'Alice' }],
            team2Players: [{ playerId: 'p2', name: 'Bob' }],
            score: { team1: 2, team2: 0 },
            goalScorers: [{ playerId: 'p1', goals: 2 }],
            assisters: [{ playerId: 'p1', goals: 1 }],
            manOfTheMatch: 'p1',
        });

        const stats = computeGameStats([game]);
        const personal = getPersonalStats(stats, 'p1');
        expect(personal.goals).toBe(2);
        expect(personal.assists).toBe(1);
        expect(personal.motm).toBe(1);
        expect(personal.gamesPlayed).toBe(1);
        expect(personal.wins).toBe(1);
    });

    it('returns zeros for unknown player', () => {
        const stats = computeGameStats([]);
        const personal = getPersonalStats(stats, 'unknown');
        expect(personal).toEqual({ goals: 0, assists: 0, motm: 0, gamesPlayed: 0, wins: 0 });
    });
});
