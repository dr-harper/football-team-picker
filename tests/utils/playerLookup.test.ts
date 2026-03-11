import { describe, it, expect } from 'vitest';
import {
    isGuest,
    makeGuestId,
    getGuestName,
    buildLookup,
    resolvePlayerName,
    GUEST_PREFIX,
} from '../../src/utils/playerLookup';

describe('playerLookup', () => {
    describe('isGuest', () => {
        it('returns true for guest IDs', () => {
            expect(isGuest('guest:Dave')).toBe(true);
        });

        it('returns false for regular user IDs', () => {
            expect(isGuest('abc123')).toBe(false);
        });

        it('returns false for empty string', () => {
            expect(isGuest('')).toBe(false);
        });

        it('returns true for guest with empty name', () => {
            expect(isGuest('guest:')).toBe(true);
        });
    });

    describe('makeGuestId', () => {
        it('creates a guest ID with the prefix', () => {
            expect(makeGuestId('Dave')).toBe('guest:Dave');
        });

        it('handles empty name', () => {
            expect(makeGuestId('')).toBe('guest:');
        });

        it('preserves spaces and special characters', () => {
            expect(makeGuestId("Dave O'Brien")).toBe("guest:Dave O'Brien");
        });
    });

    describe('getGuestName', () => {
        it('extracts name from guest ID', () => {
            expect(getGuestName('guest:Dave')).toBe('Dave');
        });

        it('returns empty string for guest with no name', () => {
            expect(getGuestName('guest:')).toBe('');
        });

        it('preserves colons in the name portion', () => {
            expect(getGuestName('guest:Dave:Jr')).toBe('Dave:Jr');
        });
    });

    describe('buildLookup', () => {
        it('creates a lookup map from members', () => {
            const members = [
                { id: 'u1', displayName: 'Alice' },
                { id: 'u2', displayName: 'Bob' },
            ];
            expect(buildLookup(members)).toEqual({ u1: 'Alice', u2: 'Bob' });
        });

        it('returns empty object for empty array', () => {
            expect(buildLookup([])).toEqual({});
        });

        it('last entry wins for duplicate IDs', () => {
            const members = [
                { id: 'u1', displayName: 'Alice' },
                { id: 'u1', displayName: 'Alice Updated' },
            ];
            expect(buildLookup(members)).toEqual({ u1: 'Alice Updated' });
        });
    });

    describe('resolvePlayerName', () => {
        const lookup = { u1: 'Alice', u2: 'Bob' };

        it('resolves known user ID to display name', () => {
            expect(resolvePlayerName('u1', lookup)).toBe('Alice');
        });

        it('falls back to raw ID for unknown user', () => {
            expect(resolvePlayerName('u99', lookup)).toBe('u99');
        });

        it('returns guest name for guest IDs', () => {
            expect(resolvePlayerName('guest:Dave', lookup)).toBe('Dave');
        });

        it('guest resolution ignores lookup map', () => {
            const lookupWithGuest = { ...lookup, 'guest:Dave': 'Should Not Use' };
            expect(resolvePlayerName('guest:Dave', lookupWithGuest)).toBe('Dave');
        });
    });

    describe('GUEST_PREFIX', () => {
        it('equals "guest:"', () => {
            expect(GUEST_PREFIX).toBe('guest:');
        });
    });
});
