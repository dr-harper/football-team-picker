import { describe, it, expect } from 'vitest';
import { parsePlayers, generateTeamsFromText, assignShirtNumbers } from '../src/utils/teamGenerator';

const PLACES = ['Testville', 'Mockton', 'Stubford'];

function makeTenPlayers(): string {
    return [
        'Alice #g',
        'Bob #g',
        'Carol #d',
        'Dave #d',
        'Eve #s',
        'Frank #s',
        'Grace',
        'Heidi',
        'Ivan',
        'Judy',
    ].join('\n');
}

describe('parsePlayers', () => {
    it('parses player names and tags correctly', () => {
        const players = parsePlayers(['Alice #g', 'Bob #s', 'Carol #d', 'Dave', 'Eve #1', 'Frank #2']);
        expect(players[0].name).toBe('Alice');
        expect(players[0].isGoalkeeper).toBe(true);
        expect(players[0].role).toBe('goalkeeper');

        expect(players[1].isStriker).toBe(true);
        expect(players[1].role).toBe('striker');

        expect(players[2].isDefender).toBe(true);
        expect(players[2].role).toBe('defender');

        expect(players[3].role).toBe('outfield');

        expect(players[4].isteam1).toBe(true);
        expect(players[4].isteam2).toBe(false);

        expect(players[5].isteam2).toBe(true);
        expect(players[5].isteam1).toBe(false);
    });

    it('handles multiple tags on one player', () => {
        const players = parsePlayers(['Alice #g #1']);
        expect(players[0].isGoalkeeper).toBe(true);
        expect(players[0].isteam1).toBe(true);
    });

    it('normalises tag casing and whitespace', () => {
        const players = parsePlayers(['Alice # G', 'Bob # Team1']);
        expect(players[0].isGoalkeeper).toBe(true);
        expect(players[1].isteam1).toBe(true);
    });
});

describe('generateTeamsFromText', () => {
    it('returns error when text is empty', () => {
        const result = generateTeamsFromText('', PLACES, {});
        expect(result.error).toBeDefined();
        expect(result.teams).toHaveLength(0);
    });

    it('returns error when fewer than 10 players', () => {
        const result = generateTeamsFromText('Alice\nBob\nCarol', PLACES, {});
        expect(result.error).toContain('10');
    });

    it('returns error when more than 16 players', () => {
        const lines = Array.from({ length: 17 }, (_, i) => `Player${i} #g`).join('\n');
        const result = generateTeamsFromText(lines, PLACES, {});
        expect(result.error).toContain('16');
    });

    it('generates two balanced teams with 10 players', () => {
        const result = generateTeamsFromText(makeTenPlayers(), PLACES, {});
        expect(result.error).toBeUndefined();
        expect(result.teams).toHaveLength(2);
        expect(result.teams[0].players.length).toBe(result.teams[1].players.length);
    });

    it('distributes goalkeepers across teams', () => {
        const result = generateTeamsFromText(makeTenPlayers(), PLACES, {});
        const gk0 = result.teams[0].players.filter(p => p.isGoalkeeper);
        const gk1 = result.teams[1].players.filter(p => p.isGoalkeeper);
        expect(gk0.length).toBeGreaterThanOrEqual(1);
        expect(gk1.length).toBeGreaterThanOrEqual(1);
    });

    it('assigns unique team names', () => {
        const result = generateTeamsFromText(makeTenPlayers(), PLACES, {});
        expect(result.teams[0].name).not.toBe(result.teams[1].name);
    });

    it('assigns different colours to each team', () => {
        const result = generateTeamsFromText(makeTenPlayers(), PLACES, {});
        expect(result.teams[0].color).not.toBe(result.teams[1].color);
    });

    it('detects no goalkeepers when none tagged', () => {
        const lines = Array.from({ length: 10 }, (_, i) => `Player${i}`).join('\n');
        const result = generateTeamsFromText(lines, PLACES, {});
        expect(result.noGoalkeepers).toBe(true);
    });

    it('respects team assignment tags', () => {
        const text = [
            'Alice #g',
            'Bob #g',
            'Carol #1',
            'Dave #2',
            'Eve',
            'Frank',
            'Grace',
            'Heidi',
            'Ivan',
            'Judy',
        ].join('\n');
        const result = generateTeamsFromText(text, PLACES, {});
        const team1Names = result.teams[0].players.map(p => p.name);
        const team2Names = result.teams[1].players.map(p => p.name);
        expect(team1Names).toContain('Carol');
        expect(team2Names).toContain('Dave');
    });
});

describe('assignShirtNumbers', () => {
    it('assigns 1 to goalkeepers', () => {
        const teams = [
            { name: 'A', players: [{ name: 'GK', isGoalkeeper: true, isStriker: false, isDefender: false, isteam1: false, isteam2: false, role: 'goalkeeper', shirtNumber: null }], color: '#fff' },
        ];
        const numbers = assignShirtNumbers(teams, {});
        expect(teams[0].players[0].shirtNumber).toBe(1);
        expect(numbers['GK']).toBe(1);
    });

    it('preserves existing shirt numbers', () => {
        const teams = [
            { name: 'A', players: [{ name: 'Bob', isGoalkeeper: false, isStriker: false, isDefender: false, isteam1: false, isteam2: false, role: 'outfield', shirtNumber: null }], color: '#fff' },
        ];
        const numbers = assignShirtNumbers(teams, { Bob: 7 });
        expect(teams[0].players[0].shirtNumber).toBe(7);
        expect(numbers['Bob']).toBe(7);
    });

    it('assigns unique numbers to outfield players', () => {
        const players = Array.from({ length: 10 }, (_, i) => ({
            name: `P${i}`,
            isGoalkeeper: false,
            isStriker: false,
            isDefender: false,
            isteam1: false,
            isteam2: false,
            role: 'outfield',
            shirtNumber: null as number | null,
        }));
        const teams = [{ name: 'A', players, color: '#fff' }];
        const numbers = assignShirtNumbers(teams, {});
        const assigned = Object.values(numbers);
        expect(new Set(assigned).size).toBe(assigned.length);
    });
});
