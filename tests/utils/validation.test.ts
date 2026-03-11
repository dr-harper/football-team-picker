import { describe, it, expect } from 'vitest';
import { sanitisePlayerName, validatePlayerInput, MAX_NAME_LENGTH } from '../../src/utils/validation';

describe('sanitisePlayerName', () => {
    it('trims leading and trailing whitespace', () => {
        expect(sanitisePlayerName('  Alice  ')).toBe('Alice');
    });

    it('collapses multiple internal spaces', () => {
        expect(sanitisePlayerName('John   Smith')).toBe('John Smith');
    });

    it('handles already clean names', () => {
        expect(sanitisePlayerName('Bob')).toBe('Bob');
    });

    it('returns empty string for whitespace-only input', () => {
        expect(sanitisePlayerName('   ')).toBe('');
    });
});

describe('validatePlayerInput', () => {
    it('returns no errors for valid input', () => {
        const input = 'Alice\nBob\nCharlie';
        expect(validatePlayerInput(input)).toEqual([]);
    });

    it('skips blank lines without errors', () => {
        const input = 'Alice\n\nBob\n\n';
        expect(validatePlayerInput(input)).toEqual([]);
    });

    it('detects empty names (line with only tags)', () => {
        const input = '#g';
        const errors = validatePlayerInput(input);
        expect(errors).toHaveLength(1);
        expect(errors[0]).toEqual({ line: 1, message: 'Player name is empty' });
    });

    it('detects names exceeding max length', () => {
        const longName = 'A'.repeat(MAX_NAME_LENGTH + 1);
        const errors = validatePlayerInput(longName);
        expect(errors).toHaveLength(1);
        expect(errors[0].message).toContain(`${MAX_NAME_LENGTH} characters`);
    });

    it('detects invalid characters (numbers)', () => {
        const errors = validatePlayerInput('Player123');
        expect(errors).toHaveLength(1);
        expect(errors[0].message).toBe('Name contains invalid characters');
    });

    it('allows accented characters', () => {
        expect(validatePlayerInput('José')).toEqual([]);
    });

    it('allows hyphens and apostrophes', () => {
        expect(validatePlayerInput("O'Brien\nSmith-Jones")).toEqual([]);
    });

    it('detects duplicate names (case-insensitive)', () => {
        const input = 'Alice\nalice';
        const errors = validatePlayerInput(input);
        expect(errors).toHaveLength(1);
        expect(errors[0].line).toBe(2);
        expect(errors[0].message).toContain('Duplicate name');
        expect(errors[0].message).toContain('line 1');
    });

    it('detects unknown tags', () => {
        const input = 'Alice #x';
        const errors = validatePlayerInput(input);
        expect(errors).toHaveLength(1);
        expect(errors[0].message).toContain('Unknown tag');
    });

    it('accepts valid tags', () => {
        const input = 'Alice #g\nBob #s\nCharlie #d\nDave #t1\nEve #t2\nFrank #1\nGrace #2\nHenry #team1\nIvy #team2';
        expect(validatePlayerInput(input)).toEqual([]);
    });

    it('reports correct line numbers', () => {
        const input = 'Alice\n\nBob\n123invalid';
        const errors = validatePlayerInput(input);
        expect(errors[0].line).toBe(4);
    });

    it('reports multiple errors from different lines', () => {
        const input = '#g\nAlice\n123\nAlice';
        const errors = validatePlayerInput(input);
        expect(errors.length).toBeGreaterThanOrEqual(3); // empty name, invalid chars, duplicate
    });
});
