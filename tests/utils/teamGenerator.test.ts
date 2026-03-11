import { describe, it, expect, vi, afterEach } from 'vitest';
import { parsePlayers, generateTeamsFromText, assignShirtNumbers } from '../../src/utils/teamGenerator';
import { MIN_PLAYERS, MAX_PLAYERS } from '../../src/constants/gameConstants';

afterEach(() => {
    vi.restoreAllMocks();
});

describe('parsePlayers', () => {
    it('parses a plain name', () => {
        const players = parsePlayers(['Alice']);
        expect(players).toHaveLength(1);
        expect(players[0].name).toBe('Alice');
        expect(players[0].role).toBe('outfield');
    });

    it('parses #g as goalkeeper', () => {
        const players = parsePlayers(['Alice #g']);
        expect(players[0].isGoalkeeper).toBe(true);
        expect(players[0].role).toBe('goalkeeper');
    });

    it('parses #s as striker', () => {
        const players = parsePlayers(['Alice #s']);
        expect(players[0].isStriker).toBe(true);
        expect(players[0].role).toBe('striker');
    });

    it('parses #d as defender', () => {
        const players = parsePlayers(['Alice #d']);
        expect(players[0].isDefender).toBe(true);
        expect(players[0].role).toBe('defender');
    });

    it('parses #t1, #team1, #1 as team1', () => {
        for (const tag of ['#t1', '#team1', '#1']) {
            const players = parsePlayers([`Alice ${tag}`]);
            expect(players[0].isteam1).toBe(true);
            expect(players[0].isteam2).toBe(false);
        }
    });

    it('parses #t2, #team2, #2 as team2', () => {
        for (const tag of ['#t2', '#team2', '#2']) {
            const players = parsePlayers([`Alice ${tag}`]);
            expect(players[0].isteam2).toBe(true);
            expect(players[0].isteam1).toBe(false);
        }
    });

    it('handles multiple tags on one player', () => {
        const players = parsePlayers(['Alice #g #t1']);
        expect(players[0].isGoalkeeper).toBe(true);
        expect(players[0].isteam1).toBe(true);
    });

    it('sanitises names (trims whitespace)', () => {
        const players = parsePlayers(['  Alice  ']);
        expect(players[0].name).toBe('Alice');
    });

    it('team1 takes priority over team2 when both are specified', () => {
        const players = parsePlayers(['Alice #t1 #t2']);
        expect(players[0].isteam1).toBe(true);
        expect(players[0].isteam2).toBe(false);
    });
});

describe('generateTeamsFromText', () => {
    function makeNPlayers(n: number): string {
        return Array.from({ length: n }, (_, i) => `Player${i + 1}`).join('\n');
    }

    it('returns error for empty text', () => {
        const result = generateTeamsFromText('', [], {});
        expect(result.error).toBeTruthy();
    });

    it('returns error for fewer than MIN_PLAYERS', () => {
        const text = makeNPlayers(MIN_PLAYERS - 1);
        const result = generateTeamsFromText(text, [], {});
        expect(result.error).toContain(`${MIN_PLAYERS}`);
    });

    it('returns error for more than MAX_PLAYERS', () => {
        const text = makeNPlayers(MAX_PLAYERS + 1);
        const result = generateTeamsFromText(text, [], {});
        expect(result.error).toContain(`${MAX_PLAYERS}`);
    });

    it('generates exactly 2 teams', () => {
        const text = makeNPlayers(10);
        const result = generateTeamsFromText(text, [], {});
        expect(result.teams).toHaveLength(2);
    });

    it('distributes all players across teams', () => {
        const text = makeNPlayers(12);
        const result = generateTeamsFromText(text, [], {});
        const totalPlayers = result.teams.reduce((sum, t) => sum + t.players.length, 0);
        expect(totalPlayers).toBe(12);
    });

    it('teams are balanced (equal size or differ by 1)', () => {
        for (let n = MIN_PLAYERS; n <= MAX_PLAYERS; n++) {
            const text = makeNPlayers(n);
            const result = generateTeamsFromText(text, [], {});
            const diff = Math.abs(result.teams[0].players.length - result.teams[1].players.length);
            expect(diff).toBeLessThanOrEqual(1);
        }
    });

    it('returns noGoalkeepers: true when no GKs tagged', () => {
        const text = makeNPlayers(10);
        const result = generateTeamsFromText(text, [], {});
        expect(result.noGoalkeepers).toBe(true);
    });

    it('returns noGoalkeepers: false when GKs are tagged', () => {
        const lines = Array.from({ length: 10 }, (_, i) => i < 2 ? `Player${i + 1} #g` : `Player${i + 1}`);
        const result = generateTeamsFromText(lines.join('\n'), [], {});
        expect(result.noGoalkeepers).toBe(false);
    });

    it('team-locked players go to correct teams', () => {
        const lines = [
            'GK1 #g', 'GK2 #g',
            'Locked1 #t1', 'Locked2 #t2',
            ...Array.from({ length: 8 }, (_, i) => `Player${i + 3}`),
        ];
        const result = generateTeamsFromText(lines.join('\n'), [], {});
        const team1Names = result.teams[0].players.map(p => p.name);
        const team2Names = result.teams[1].players.map(p => p.name);
        expect(team1Names).toContain('Locked1');
        expect(team2Names).toContain('Locked2');
    });

    it('assigns distinct colours to each team', () => {
        const text = makeNPlayers(10);
        const result = generateTeamsFromText(text, [], {});
        expect(result.teams[0].color).not.toBe(result.teams[1].color);
    });
});

describe('assignShirtNumbers', () => {
    it('assigns goalkeepers number 1', () => {
        const teams = [{
            name: 'Team A',
            color: '#ff0000',
            players: [
                { name: 'GK', isGoalkeeper: true, isStriker: false, isDefender: false, isteam1: false, isteam2: false, role: 'goalkeeper', shirtNumber: null },
            ],
        }];
        const result = assignShirtNumbers(teams, {});
        expect(result['GK']).toBe(1);
    });

    it('preserves existing numbers', () => {
        const teams = [{
            name: 'Team A',
            color: '#ff0000',
            players: [
                { name: 'Bob', isGoalkeeper: false, isStriker: false, isDefender: false, isteam1: false, isteam2: false, role: 'outfield', shirtNumber: null },
            ],
        }];
        const result = assignShirtNumbers(teams, { Bob: 7 });
        expect(result['Bob']).toBe(7);
    });

    it('all players get unique numbers', () => {
        const players = Array.from({ length: 10 }, (_, i) => ({
            name: `Player${i}`,
            isGoalkeeper: false,
            isStriker: false,
            isDefender: false,
            isteam1: false,
            isteam2: false,
            role: 'outfield' as const,
            shirtNumber: null,
        }));
        const teams = [{ name: 'Team A', color: '#ff0000', players }];
        const result = assignShirtNumbers(teams, {});
        const numbers = Object.values(result);
        expect(new Set(numbers).size).toBe(numbers.length);
    });
});
