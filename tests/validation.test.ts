import { describe, it, expect } from 'vitest';
import { sanitisePlayerName, validatePlayerInput, MAX_NAME_LENGTH } from '../src/utils/validation';

describe('sanitisePlayerName', () => {
    it('trims leading and trailing whitespace', () => {
        expect(sanitisePlayerName('  Alice  ')).toBe('Alice');
    });

    it('collapses internal whitespace', () => {
        expect(sanitisePlayerName('John   Smith')).toBe('John Smith');
    });

    it('returns empty string for whitespace-only input', () => {
        expect(sanitisePlayerName('   ')).toBe('');
    });
});

describe('validatePlayerInput', () => {
    it('returns no errors for valid input', () => {
        const errors = validatePlayerInput('Alice #g\nBob #s\nCarol');
        expect(errors).toHaveLength(0);
    });

    it('skips blank lines', () => {
        const errors = validatePlayerInput('Alice\n\nBob');
        expect(errors).toHaveLength(0);
    });

    it('detects empty player names', () => {
        const errors = validatePlayerInput('#g');
        expect(errors).toHaveLength(1);
        expect(errors[0].message).toContain('empty');
    });

    it('detects names exceeding max length', () => {
        const longName = 'A'.repeat(MAX_NAME_LENGTH + 1);
        const errors = validatePlayerInput(longName);
        expect(errors).toHaveLength(1);
        expect(errors[0].message).toContain('characters');
    });

    it('detects invalid characters in names', () => {
        const errors = validatePlayerInput('Player<script>');
        expect(errors).toHaveLength(1);
        expect(errors[0].message).toContain('invalid characters');
    });

    it('allows names with apostrophes and hyphens', () => {
        const errors = validatePlayerInput("O'Brien\nJean-Pierre");
        expect(errors).toHaveLength(0);
    });

    it('allows names with accented characters', () => {
        const errors = validatePlayerInput('José\nFrançois\nÜber');
        expect(errors).toHaveLength(0);
    });

    it('detects unknown tags', () => {
        const errors = validatePlayerInput('Alice #x');
        expect(errors).toHaveLength(1);
        expect(errors[0].message).toContain('Unknown tag');
    });

    it('accepts all valid tags', () => {
        const errors = validatePlayerInput('Alice #g #s #d #1 #2 #t1 #t2 #team1 #team2');
        expect(errors).toHaveLength(0);
    });

    it('reports correct line numbers', () => {
        const errors = validatePlayerInput('Alice\n\n#g');
        expect(errors[0].line).toBe(3);
    });

    it('detects duplicate player names (case-insensitive)', () => {
        const errors = validatePlayerInput('Alice #g\nBob\nalice #s');
        expect(errors).toHaveLength(1);
        expect(errors[0].line).toBe(3);
        expect(errors[0].message).toContain('Duplicate');
        expect(errors[0].message).toContain('line 1');
    });

    it('does not flag different names as duplicates', () => {
        const errors = validatePlayerInput('Alice\nBob\nCarol');
        expect(errors).toHaveLength(0);
    });
});
