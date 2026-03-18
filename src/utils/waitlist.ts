import type { PlayerAvailability, GameFormatConfig, Game, League } from '../types';
import { DEFAULT_FORMAT } from '../constants/gameConstants';

export interface WaitlistPlayer {
    id: string;         // userId or 'guest:<name>'
    displayName: string;
    status: 'available' | 'maybe';
    updatedAt: number;
    isGuest: boolean;
}

export interface WaitlistResult {
    inPlayers: WaitlistPlayer[];
    waitlistedAvailable: WaitlistPlayer[];
    waitlistedMaybe: WaitlistPlayer[];
    spotsRemaining: number;
    isFull: boolean;
    maxPlayers: number;
    minPlayers: number;
}

/**
 * Resolve the effective format for a game by checking:
 * 1. game.formatOverride (per-game)
 * 2. league.defaultFormat (league default)
 * 3. DEFAULT_FORMAT (global fallback)
 */
export function resolveGameFormat(game: Game | null, league: League | null): GameFormatConfig {
    return game?.formatOverride ?? league?.defaultFormat ?? DEFAULT_FORMAT;
}

/**
 * Compute waitlist from availability data.
 *
 * Available players are sorted by updatedAt (first come, first served)
 * and placed into "in" slots up to maxPlayers. Overflow available players
 * go to waitlistedAvailable. Maybe players always rank below available
 * overflow and go to waitlistedMaybe.
 *
 * Guest players (no account) always sort last within their priority tier
 * since they have no timestamp — uses MAX_SAFE_INTEGER as updatedAt.
 */
export function computeWaitlist(
    available: PlayerAvailability[],
    maybe: PlayerAvailability[],
    guestsAvailable: string[],
    guestsMaybe: string[],
    format: GameFormatConfig,
): WaitlistResult {
    const { minPlayers, maxPlayers } = format;

    // Build unified player lists with timestamps
    const availablePlayers: WaitlistPlayer[] = [
        ...available.map(a => ({
            id: a.userId,
            displayName: a.displayName,
            status: 'available' as const,
            updatedAt: a.updatedAt,
            isGuest: false,
        })),
        ...guestsAvailable.map(name => ({
            id: `guest:${name}`,
            displayName: name,
            status: 'available' as const,
            updatedAt: Number.MAX_SAFE_INTEGER, // guests have no timestamp — always last among available
            isGuest: true,
        })),
    ].sort((a, b) => a.updatedAt - b.updatedAt);

    const maybePlayers: WaitlistPlayer[] = [
        ...maybe.map(a => ({
            id: a.userId,
            displayName: a.displayName,
            status: 'maybe' as const,
            updatedAt: a.updatedAt,
            isGuest: false,
        })),
        ...guestsMaybe.map(name => ({
            id: `guest:${name}`,
            displayName: name,
            status: 'maybe' as const,
            updatedAt: Number.MAX_SAFE_INTEGER,
            isGuest: true,
        })),
    ].sort((a, b) => a.updatedAt - b.updatedAt);

    // Fill "in" slots: available first, then maybe
    const inPlayers: WaitlistPlayer[] = [];
    const waitlistedAvailable: WaitlistPlayer[] = [];
    const waitlistedMaybe: WaitlistPlayer[] = [];

    for (const player of availablePlayers) {
        if (inPlayers.length < maxPlayers) {
            inPlayers.push(player);
        } else {
            waitlistedAvailable.push(player);
        }
    }

    for (const player of maybePlayers) {
        if (inPlayers.length < maxPlayers) {
            inPlayers.push(player);
        } else {
            waitlistedMaybe.push(player);
        }
    }

    const spotsRemaining = Math.max(0, maxPlayers - inPlayers.length);
    const isFull = inPlayers.length >= maxPlayers;

    return {
        inPlayers,
        waitlistedAvailable,
        waitlistedMaybe,
        spotsRemaining,
        isFull,
        maxPlayers,
        minPlayers,
    };
}
