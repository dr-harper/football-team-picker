import { describe, it, expect } from 'vitest';
import { computeWaitlist, resolveGameFormat } from '../../src/utils/waitlist';
import type { PlayerAvailability, GameFormatConfig, Game, League } from '../../src/types';
import { DEFAULT_FORMAT } from '../../src/constants/gameConstants';

function makeAvail(userId: string, status: 'available' | 'maybe' | 'unavailable', updatedAt: number): PlayerAvailability {
    return { id: `game1_${userId}`, gameId: 'game1', userId, displayName: userId, status, updatedAt };
}

describe('computeWaitlist', () => {
    const format5v5: GameFormatConfig = { format: '5v5', minPlayers: 10, maxPlayers: 12 };

    it('places all available players in when under capacity', () => {
        const available = Array.from({ length: 8 }, (_, i) => makeAvail(`p${i}`, 'available', 1000 + i));
        const result = computeWaitlist(available, [], [], [], format5v5);
        expect(result.inPlayers).toHaveLength(8);
        expect(result.waitlistedAvailable).toHaveLength(0);
        expect(result.isFull).toBe(false);
        expect(result.spotsRemaining).toBe(4);
    });

    it('fills exactly to maxPlayers then waitlists overflow', () => {
        const available = Array.from({ length: 15 }, (_, i) => makeAvail(`p${i}`, 'available', 1000 + i));
        const result = computeWaitlist(available, [], [], [], format5v5);
        expect(result.inPlayers).toHaveLength(12);
        expect(result.waitlistedAvailable).toHaveLength(3);
        expect(result.isFull).toBe(true);
        expect(result.spotsRemaining).toBe(0);
    });

    it('orders in-players by updatedAt (first come first served)', () => {
        const available = [
            makeAvail('late', 'available', 3000),
            makeAvail('early', 'available', 1000),
            makeAvail('mid', 'available', 2000),
        ];
        const result = computeWaitlist(available, [], [], [], format5v5);
        expect(result.inPlayers.map(p => p.id)).toEqual(['early', 'mid', 'late']);
    });

    it('ranks maybe players below available overflow', () => {
        const available = Array.from({ length: 12 }, (_, i) => makeAvail(`a${i}`, 'available', 1000 + i));
        const maybe = [makeAvail('m1', 'maybe', 500)]; // earlier timestamp but maybe
        const result = computeWaitlist(available, maybe, [], [], format5v5);
        expect(result.inPlayers).toHaveLength(12);
        expect(result.inPlayers.every(p => p.status === 'available')).toBe(true);
        expect(result.waitlistedMaybe).toHaveLength(1);
        expect(result.waitlistedMaybe[0].id).toBe('m1');
    });

    it('fills remaining spots with maybe when available < maxPlayers', () => {
        const available = Array.from({ length: 10 }, (_, i) => makeAvail(`a${i}`, 'available', 1000 + i));
        const maybe = [makeAvail('m1', 'maybe', 2000), makeAvail('m2', 'maybe', 2001)];
        const result = computeWaitlist(available, maybe, [], [], format5v5);
        expect(result.inPlayers).toHaveLength(12);
        expect(result.inPlayers.filter(p => p.status === 'maybe')).toHaveLength(2);
        expect(result.isFull).toBe(true);
    });

    it('handles empty inputs gracefully', () => {
        const result = computeWaitlist([], [], [], [], format5v5);
        expect(result.inPlayers).toHaveLength(0);
        expect(result.spotsRemaining).toBe(12);
        expect(result.isFull).toBe(false);
    });

    it('includes guest players in the waitlist', () => {
        const available = Array.from({ length: 12 }, (_, i) => makeAvail(`a${i}`, 'available', 1000 + i));
        const result = computeWaitlist(available, [], ['GuestA', 'GuestB'], [], format5v5);
        expect(result.inPlayers).toHaveLength(12);
        expect(result.waitlistedAvailable).toHaveLength(2);
        expect(result.waitlistedAvailable[0].id).toBe('guest:GuestA');
        expect(result.waitlistedAvailable[0].isGuest).toBe(true);
    });

    it('guests fill remaining spots when under capacity', () => {
        const available = Array.from({ length: 10 }, (_, i) => makeAvail(`a${i}`, 'available', 1000 + i));
        const result = computeWaitlist(available, [], ['GuestA'], [], format5v5);
        expect(result.inPlayers).toHaveLength(11);
        expect(result.inPlayers[10].id).toBe('guest:GuestA');
        expect(result.spotsRemaining).toBe(1);
    });

    it('guest maybe players rank below available overflow', () => {
        const available = Array.from({ length: 12 }, (_, i) => makeAvail(`a${i}`, 'available', 1000 + i));
        const result = computeWaitlist(available, [], [], ['MaybeGuest'], format5v5);
        expect(result.waitlistedMaybe).toHaveLength(1);
        expect(result.waitlistedMaybe[0].id).toBe('guest:MaybeGuest');
    });

    it('boundary: exactly maxPlayers available means full, no waitlist', () => {
        const available = Array.from({ length: 12 }, (_, i) => makeAvail(`a${i}`, 'available', 1000 + i));
        const result = computeWaitlist(available, [], [], [], format5v5);
        expect(result.inPlayers).toHaveLength(12);
        expect(result.waitlistedAvailable).toHaveLength(0);
        expect(result.isFull).toBe(true);
        expect(result.spotsRemaining).toBe(0);
    });

    it('reports correct min/max from format config', () => {
        const format7v7: GameFormatConfig = { format: '7v7', minPlayers: 14, maxPlayers: 16 };
        const result = computeWaitlist([], [], [], [], format7v7);
        expect(result.minPlayers).toBe(14);
        expect(result.maxPlayers).toBe(16);
    });

    it('works with custom format with non-standard min/max', () => {
        const customFormat: GameFormatConfig = { format: 'custom', minPlayers: 4, maxPlayers: 6 };
        const available = Array.from({ length: 8 }, (_, i) => makeAvail(`p${i}`, 'available', 1000 + i));
        const result = computeWaitlist(available, [], [], [], customFormat);
        expect(result.inPlayers).toHaveLength(6);
        expect(result.waitlistedAvailable).toHaveLength(2);
        expect(result.isFull).toBe(true);
        expect(result.minPlayers).toBe(4);
        expect(result.maxPlayers).toBe(6);
    });
});

describe('resolveGameFormat', () => {
    const leagueFormat: GameFormatConfig = { format: '6v6', minPlayers: 12, maxPlayers: 14 };
    const gameFormat: GameFormatConfig = { format: '7v7', minPlayers: 14, maxPlayers: 16 };

    it('returns game formatOverride when present', () => {
        const game = { formatOverride: gameFormat } as Game;
        const league = { defaultFormat: leagueFormat } as League;
        expect(resolveGameFormat(game, league)).toEqual(gameFormat);
    });

    it('falls back to league defaultFormat when game has no override', () => {
        const game = {} as Game;
        const league = { defaultFormat: leagueFormat } as League;
        expect(resolveGameFormat(game, league)).toEqual(leagueFormat);
    });

    it('falls back to DEFAULT_FORMAT when neither game nor league has config', () => {
        expect(resolveGameFormat({} as Game, {} as League)).toEqual(DEFAULT_FORMAT);
    });

    it('handles null game and league', () => {
        expect(resolveGameFormat(null, null)).toEqual(DEFAULT_FORMAT);
    });
});
