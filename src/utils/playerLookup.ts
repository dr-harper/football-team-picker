/** Player identifier: either a Firebase userId or 'guest:<name>' for ringers */
export type PlayerId = string;

export const GUEST_PREFIX = 'guest:';

export function isGuest(id: PlayerId): boolean {
    return id.startsWith(GUEST_PREFIX);
}

export function makeGuestId(name: string): PlayerId {
    return `${GUEST_PREFIX}${name}`;
}

export function getGuestName(id: PlayerId): string {
    return id.slice(GUEST_PREFIX.length);
}

/** Build a userId → displayName lookup from league members */
export function buildLookup(members: { id: string; displayName: string }[]): Record<string, string> {
    const map: Record<string, string> = {};
    for (const m of members) {
        map[m.id] = m.displayName;
    }
    return map;
}

export const OG_PREFIX = 'og:';

export function isOwnGoal(id: PlayerId): boolean {
    return id.startsWith(OG_PREFIX);
}

/** Resolve a playerId to a display name */
export function resolvePlayerName(id: PlayerId, lookup: Record<string, string>): string {
    if (isOwnGoal(id)) {
        const realId = id.slice(OG_PREFIX.length);
        const name = isGuest(realId) ? getGuestName(realId) : (lookup[realId] ?? realId);
        return `${name} (OG)`;
    }
    if (isGuest(id)) return getGuestName(id);
    return lookup[id] ?? id;
}
