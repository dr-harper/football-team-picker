import { describe, it, expect, beforeEach } from 'vitest';
import { computeBadges, computePersonalStats } from '../../src/utils/badgeUtils';
import { makeCompletedGame, resetCounter } from '../helpers/gameFactory';

beforeEach(() => resetCounter());

describe('computePersonalStats', () => {
    it('returns zeros for no games', () => {
        expect(computePersonalStats([], 'p1')).toEqual({ goals: 0, assists: 0, motm: 0, games: 0 });
    });

    it('counts goals, assists, motm, and games', () => {
        const game = makeCompletedGame({
            team1Players: [{ playerId: 'p1', name: 'Alice' }],
            team2Players: [{ playerId: 'p2', name: 'Bob' }],
            score: { team1: 2, team2: 0 },
            goalScorers: [{ playerId: 'p1', goals: 2 }],
            assisters: [{ playerId: 'p1', goals: 1 }],
            manOfTheMatch: 'p1',
        });
        const stats = computePersonalStats([game], 'p1');
        expect(stats.goals).toBe(2);
        expect(stats.assists).toBe(1);
        expect(stats.motm).toBe(1);
        expect(stats.games).toBe(1);
    });

    it('ignores other players stats', () => {
        const game = makeCompletedGame({
            team1Players: [{ playerId: 'p1', name: 'Alice' }],
            team2Players: [{ playerId: 'p2', name: 'Bob' }],
            score: { team1: 3, team2: 0 },
            goalScorers: [{ playerId: 'p1', goals: 3 }],
            manOfTheMatch: 'p1',
        });
        const stats = computePersonalStats([game], 'p2');
        expect(stats.goals).toBe(0);
        expect(stats.motm).toBe(0);
        expect(stats.games).toBe(1); // p2 was in the game
    });
});

describe('computeBadges', () => {
    it('returns empty array for no games', () => {
        expect(computeBadges([], 'p1')).toEqual([]);
    });

    it('awards Hat-trick Hero for 3+ goals in a single game', () => {
        const game = makeCompletedGame({
            team1Players: [{ playerId: 'p1', name: 'Alice' }],
            team2Players: [{ playerId: 'p2', name: 'Bob' }],
            score: { team1: 3, team2: 0 },
            goalScorers: [{ playerId: 'p1', goals: 3 }],
        });
        const badges = computeBadges([game], 'p1');
        expect(badges.some(b => b.label === 'Hat-trick Hero')).toBe(true);
    });

    it('does not award Hat-trick Hero for 2 goals', () => {
        const game = makeCompletedGame({
            team1Players: [{ playerId: 'p1', name: 'Alice' }],
            team2Players: [{ playerId: 'p2', name: 'Bob' }],
            score: { team1: 2, team2: 0 },
            goalScorers: [{ playerId: 'p1', goals: 2 }],
        });
        const badges = computeBadges([game], 'p1');
        expect(badges.some(b => b.label === 'Hat-trick Hero')).toBe(false);
    });

    it('awards MOTM Machine for 5+ MOTM awards', () => {
        const games = Array.from({ length: 5 }, () =>
            makeCompletedGame({
                team1Players: [{ playerId: 'p1', name: 'Alice' }],
                team2Players: [{ playerId: 'p2', name: 'Bob' }],
                score: { team1: 1, team2: 0 },
                manOfTheMatch: 'p1',
            })
        );
        const badges = computeBadges(games, 'p1');
        expect(badges.some(b => b.label === 'MOTM Machine')).toBe(true);
    });

    it('awards Ever Present for 80%+ attendance', () => {
        const games = Array.from({ length: 5 }, () =>
            makeCompletedGame({
                team1Players: [{ playerId: 'p1', name: 'Alice' }],
                team2Players: [{ playerId: 'p2', name: 'Bob' }],
                score: { team1: 1, team2: 0 },
            })
        );
        const badges = computeBadges(games, 'p1');
        expect(badges.some(b => b.label === 'Ever Present')).toBe(true);
    });

    it('awards 10 Club for 10+ goals', () => {
        const games = Array.from({ length: 5 }, () =>
            makeCompletedGame({
                team1Players: [{ playerId: 'p1', name: 'Alice' }],
                team2Players: [{ playerId: 'p2', name: 'Bob' }],
                score: { team1: 2, team2: 0 },
                goalScorers: [{ playerId: 'p1', goals: 2 }],
            })
        );
        const badges = computeBadges(games, 'p1');
        expect(badges.some(b => b.label === '10 Club')).toBe(true);
    });

    it('awards Winner for 10+ wins', () => {
        const games = Array.from({ length: 10 }, () =>
            makeCompletedGame({
                team1Players: [{ playerId: 'p1', name: 'Alice' }],
                team2Players: [{ playerId: 'p2', name: 'Bob' }],
                score: { team1: 1, team2: 0 },
            })
        );
        const badges = computeBadges(games, 'p1');
        expect(badges.some(b => b.label === 'Winner')).toBe(true);
    });

    it('awards On Fire for scoring in last 3 games', () => {
        const games = Array.from({ length: 3 }, (_, i) =>
            makeCompletedGame({
                team1Players: [{ playerId: 'p1', name: 'Alice' }],
                team2Players: [{ playerId: 'p2', name: 'Bob' }],
                score: { team1: 1, team2: 0 },
                goalScorers: [{ playerId: 'p1', goals: 1 }],
                date: Date.now() - i * 86400000,
            })
        );
        const badges = computeBadges(games, 'p1');
        expect(badges.some(b => b.label === 'On Fire')).toBe(true);
    });
});
