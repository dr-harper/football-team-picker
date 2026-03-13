import {
    collection,
    doc,
    addDoc,
    setDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    deleteField,
    Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase';
import { League, Game, Season, PlayerAvailability, GameStatus, GameScore, Team, GoalScorer, PaymentRecord, LeagueExpense, StoredGameHealth } from '../types';

// ---- Leagues ----

function generateJoinCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes = crypto.getRandomValues(new Uint8Array(6));
    return Array.from(bytes, b => chars[b % chars.length]).join('');
}

export async function createLeague(
    name: string,
    userId: string,
    defaultVenue?: string,
    defaultVenueLat?: number,
    defaultVenueLon?: number,
): Promise<League> {
    const joinCode = generateJoinCode();
    const data: Omit<League, 'id'> = {
        name,
        joinCode,
        createdBy: userId,
        memberIds: [userId],
        createdAt: Date.now(),
        ...(defaultVenue ? { defaultVenue } : {}),
        ...(defaultVenueLat !== undefined ? { defaultVenueLat } : {}),
        ...(defaultVenueLon !== undefined ? { defaultVenueLon } : {}),
    };
    const ref = await addDoc(collection(db, 'leagues'), data);
    return { id: ref.id, ...data };
}

export async function getLeagueByCode(joinCode: string): Promise<League | null> {
    const q = query(collection(db, 'leagues'), where('joinCode', '==', joinCode.toUpperCase()));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...d.data() } as League;
}

export async function getLeague(leagueId: string): Promise<League | null> {
    const snap = await getDoc(doc(db, 'leagues', leagueId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as League;
}

export async function joinLeagueByCode(joinCode: string, userId: string): Promise<League | null> {
    const q = query(collection(db, 'leagues'), where('joinCode', '==', joinCode.toUpperCase()));
    const snap = await getDocs(q);
    if (snap.empty) return null;

    const leagueDoc = snap.docs[0];
    const league = { id: leagueDoc.id, ...leagueDoc.data() } as League;

    if (!league.memberIds.includes(userId)) {
        await updateDoc(doc(db, 'leagues', league.id), {
            memberIds: [...league.memberIds, userId],
        });
        league.memberIds.push(userId);
    }

    return league;
}

export async function getUserLeagues(userId: string): Promise<League[]> {
    const q = query(
        collection(db, 'leagues'),
        where('memberIds', 'array-contains', userId),
        orderBy('createdAt', 'desc'),
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as League));
}

export function subscribeToUserLeagues(userId: string, cb: (leagues: League[]) => void): Unsubscribe {
    const q = query(
        collection(db, 'leagues'),
        where('memberIds', 'array-contains', userId),
        orderBy('createdAt', 'desc'),
    );
    return onSnapshot(q, (snap) => {
        cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as League)));
    });
}

export function subscribeToLeague(leagueId: string, cb: (league: League | null) => void): Unsubscribe {
    return onSnapshot(doc(db, 'leagues', leagueId), (snap) => {
        if (!snap.exists()) { cb(null); return; }
        cb({ id: snap.id, ...snap.data() } as League);
    });
}

export async function leaveLeague(leagueId: string, userId: string): Promise<void> {
    const league = await getLeague(leagueId);
    if (!league) return;
    await updateDoc(doc(db, 'leagues', leagueId), {
        memberIds: league.memberIds.filter(id => id !== userId),
    });
}

export async function removeMember(leagueId: string, memberUserId: string): Promise<void> {
    const league = await getLeague(leagueId);
    if (!league) return;
    await updateDoc(doc(db, 'leagues', leagueId), {
        memberIds: league.memberIds.filter(id => id !== memberUserId),
    });
}

export async function deleteLeague(leagueId: string): Promise<void> {
    // Delete all games and their availability records for this league
    const gamesSnap = await getDocs(query(collection(db, 'games'), where('leagueId', '==', leagueId)));
    for (const gameDoc of gamesSnap.docs) {
        const availSnap = await getDocs(query(collection(db, 'availability'), where('gameId', '==', gameDoc.id)));
        await Promise.all(availSnap.docs.map(d => deleteDoc(d.ref)));
        await deleteDoc(gameDoc.ref);
    }
    await deleteDoc(doc(db, 'leagues', leagueId));
}

// ---- Games ----

export async function createGame(
    leagueId: string,
    title: string,
    date: number,
    userId: string,
    location?: string,
    locationLat?: number,
    locationLon?: number,
    costPerPerson?: number,
    seasonId?: string,
): Promise<Game> {
    const gameCode = generateJoinCode();
    const data: Omit<Game, 'id'> = {
        leagueId,
        title,
        date,
        status: 'scheduled' as GameStatus,
        gameCode,
        createdBy: userId,
        createdAt: Date.now(),
        ...(location ? { location } : {}),
        ...(locationLat !== undefined ? { locationLat } : {}),
        ...(locationLon !== undefined ? { locationLon } : {}),
        ...(costPerPerson !== undefined ? { costPerPerson } : {}),
        ...(seasonId ? { seasonId } : {}),
    };
    const ref = await addDoc(collection(db, 'games'), data);
    return { id: ref.id, ...data };
}

export async function getGameByCode(gameCode: string): Promise<Game | null> {
    const q = query(collection(db, 'games'), where('gameCode', '==', gameCode.toUpperCase()));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...d.data() } as Game;
}

export async function getGame(gameId: string): Promise<Game | null> {
    const snap = await getDoc(doc(db, 'games', gameId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Game;
}

export async function getLeagueGames(leagueId: string): Promise<Game[]> {
    const q = query(
        collection(db, 'games'),
        where('leagueId', '==', leagueId),
        orderBy('date', 'desc'),
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Game));
}

export function subscribeToLeagueGames(leagueId: string, cb: (games: Game[]) => void): Unsubscribe {
    const q = query(
        collection(db, 'games'),
        where('leagueId', '==', leagueId),
        orderBy('date', 'desc'),
    );
    return onSnapshot(q, (snap) => {
        cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as Game)));
    });
}

export function subscribeToGame(gameId: string, cb: (game: Game | null) => void): Unsubscribe {
    return onSnapshot(doc(db, 'games', gameId), (snap) => {
        if (!snap.exists()) { cb(null); return; }
        cb({ id: snap.id, ...snap.data() } as Game);
    });
}

export async function updateGameStatus(gameId: string, status: GameStatus): Promise<void> {
    await updateDoc(doc(db, 'games', gameId), { status });
}

export async function updateGameTeams(gameId: string, playersText: string, teams: Team[]): Promise<void> {
    await updateDoc(doc(db, 'games', gameId), { playersText, teams, status: 'in_progress' });
}

export async function updateGameScore(gameId: string, score: GameScore): Promise<void> {
    await updateDoc(doc(db, 'games', gameId), { score, status: 'completed' });
}

export async function updateGameDrafts(gameId: string, draftSetups: import('../types').TeamSetup[]): Promise<void> {
    await updateDoc(doc(db, 'games', gameId), { draftSetups });
}

export async function deleteGame(gameId: string): Promise<void> {
    await deleteDoc(doc(db, 'games', gameId));
}

export async function updateGameGuests(gameId: string, guestPlayers: string[]): Promise<void> {
    await updateDoc(doc(db, 'games', gameId), { guestPlayers });
}

export async function updateGuestAvailability(gameId: string, guestAvailability: Record<string, string>): Promise<void> {
    await updateDoc(doc(db, 'games', gameId), { guestAvailability });
}

export async function updatePlayerPositions(gameId: string, playerPositions: Record<string, string>): Promise<void> {
    await updateDoc(doc(db, 'games', gameId), { playerPositions });
}

export async function updateGameGoalScorers(gameId: string, goalScorers: GoalScorer[]): Promise<void> {
    await updateDoc(doc(db, 'games', gameId), { goalScorers });
}

export async function updateGameAssisters(gameId: string, assisters: GoalScorer[]): Promise<void> {
    await updateDoc(doc(db, 'games', gameId), { assisters });
}

export async function updateGameMotm(gameId: string, manOfTheMatch: string | null): Promise<void> {
    await updateDoc(doc(db, 'games', gameId), { manOfTheMatch: manOfTheMatch ?? '' });
}

export async function updateLeagueAdmins(leagueId: string, adminIds: string[]): Promise<void> {
    await updateDoc(doc(db, 'leagues', leagueId), { adminIds });
}

export async function updateLeagueEnableAssists(leagueId: string, enabled: boolean): Promise<void> {
    await updateDoc(doc(db, 'leagues', leagueId), { enableAssists: enabled });
}

export async function updateLeagueDefaultCost(leagueId: string, cost: number | null): Promise<void> {
    await updateDoc(doc(db, 'leagues', leagueId), { defaultCostPerPerson: cost ?? null });
}

export async function updateLeagueMatchDuration(leagueId: string, minutes: number): Promise<void> {
    await updateDoc(doc(db, 'leagues', leagueId), { matchDurationMinutes: minutes });
}

export async function updateLeaguePayments(leagueId: string, payments: Record<string, PaymentRecord[]>): Promise<void> {
    await updateDoc(doc(db, 'leagues', leagueId), { payments });
}

export async function updateLeagueExpenses(leagueId: string, expenses: LeagueExpense[]): Promise<void> {
    await updateDoc(doc(db, 'leagues', leagueId), { expenses });
}

export async function updateGameCost(gameId: string, cost: number | null): Promise<void> {
    await updateDoc(doc(db, 'games', gameId), { costPerPerson: cost ?? null });
}

export async function updateGameAttendees(gameId: string, attendees: string[]): Promise<void> {
    await updateDoc(doc(db, 'games', gameId), { attendees });
}

export async function updateGameDetails(
    gameId: string,
    details: { title?: string; date?: number; location?: string; locationLat?: number; locationLon?: number },
): Promise<void> {
    const updates: Record<string, unknown> = {};
    if (details.title !== undefined) updates.title = details.title;
    if (details.date !== undefined) updates.date = details.date;
    if (details.location !== undefined) updates.location = details.location;
    if (details.locationLat !== undefined) updates.locationLat = details.locationLat;
    if (details.locationLon !== undefined) updates.locationLon = details.locationLon;
    await updateDoc(doc(db, 'games', gameId), updates);
}

export async function updateLeagueDefaultVenue(
    leagueId: string,
    venue: string,
    lat?: number,
    lon?: number,
): Promise<void> {
    await updateDoc(doc(db, 'leagues', leagueId), {
        defaultVenue: venue,
        ...(lat !== undefined ? { defaultVenueLat: lat } : {}),
        ...(lon !== undefined ? { defaultVenueLon: lon } : {}),
    });
}

// ---- Availability ----

export async function setAvailability(
    gameId: string,
    userId: string,
    displayName: string,
    status: PlayerAvailability['status'],
): Promise<void> {
    const id = `${gameId}_${userId}`;
    await setDoc(doc(db, 'availability', id), {
        gameId,
        userId,
        displayName,
        status,
        updatedAt: Date.now(),
    });
}

export async function clearAvailability(gameId: string, userId: string): Promise<void> {
    const id = `${gameId}_${userId}`;
    await deleteDoc(doc(db, 'availability', id));
}

export async function getGameAvailability(gameId: string): Promise<PlayerAvailability[]> {
    const q = query(collection(db, 'availability'), where('gameId', '==', gameId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as PlayerAvailability));
}

export function subscribeToGameAvailability(gameId: string, cb: (avail: PlayerAvailability[]) => void): Unsubscribe {
    const q = query(collection(db, 'availability'), where('gameId', '==', gameId));
    return onSnapshot(q, (snap) => {
        cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as PlayerAvailability)));
    });
}

// ---- Members ----

export async function updateUserDisplayName(userId: string, displayName: string): Promise<void> {
    await setDoc(doc(db, 'users', userId), { displayName, hasSetName: true }, { merge: true });
}

export async function getLeagueMembers(memberIds: string[]): Promise<{ id: string; displayName: string; email: string }[]> {
    if (memberIds.length === 0) return [];
    const members: { id: string; displayName: string; email: string }[] = [];
    // Firestore 'in' queries support max 30 items
    const chunks = [];
    for (let i = 0; i < memberIds.length; i += 30) {
        chunks.push(memberIds.slice(i, i + 30));
    }
    for (const chunk of chunks) {
        const q = query(collection(db, 'users'), where('__name__', 'in', chunk));
        const snap = await getDocs(q);
        snap.docs.forEach(d => {
            const data = d.data();
            members.push({ id: d.id, displayName: data.displayName, email: data.email });
        });
    }
    return members;
}

// ---- Seasons ----

export async function createSeason(leagueId: string, name: string, startDate?: number, endDate?: number): Promise<Season> {
    const id = crypto.randomUUID().slice(0, 8);
    const season: Season = {
        id,
        name,
        startDate: startDate ?? Date.now(),
        endDate,
        status: 'active',
        createdAt: Date.now(),
    };
    await updateDoc(doc(db, 'leagues', leagueId), {
        [`seasons.${id}`]: season,
        activeSeasonId: id,
    });
    return season;
}

export async function archiveSeason(leagueId: string, seasonId: string): Promise<void> {
    await updateDoc(doc(db, 'leagues', leagueId), {
        [`seasons.${seasonId}.status`]: 'archived',
        [`seasons.${seasonId}.endDate`]: Date.now(),
        activeSeasonId: deleteField(),
    });
}

export async function updateSeason(leagueId: string, seasonId: string, updates: Partial<Season>): Promise<void> {
    const fields: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
        fields[`seasons.${seasonId}.${key}`] = value;
    }
    await updateDoc(doc(db, 'leagues', leagueId), fields);
}

export async function deleteSeason(leagueId: string, seasonId: string): Promise<void> {
    const league = await getLeague(leagueId);
    if (!league) return;
    const { [seasonId]: _removed, ...remaining } = league.seasons ?? {};
    void _removed;
    const update: Record<string, unknown> = { seasons: remaining };
    if (league.activeSeasonId === seasonId) {
        update.activeSeasonId = deleteField();
    }
    await updateDoc(doc(db, 'leagues', leagueId), update);
}

// ---- Guest Linking ----

/** Extract all unique guest IDs from league games */
export function extractGuestsFromGames(games: Game[]): { guestId: string; guestName: string; gameCount: number }[] {
    const counts = new Map<string, number>();
    for (const game of games) {
        const guestIds = new Set<string>();

        // From guestPlayers array
        for (const name of game.guestPlayers ?? []) {
            guestIds.add(`guest:${name}`);
        }

        // From teams
        for (const team of game.teams ?? []) {
            for (const player of team.players) {
                const pid = player.playerId ?? player.name;
                if (pid.startsWith('guest:')) guestIds.add(pid);
            }
        }

        // From goalScorers
        for (const gs of game.goalScorers ?? []) {
            if (gs.playerId.startsWith('guest:')) guestIds.add(gs.playerId);
        }

        // From assisters
        for (const a of game.assisters ?? []) {
            if (a.playerId.startsWith('guest:')) guestIds.add(a.playerId);
        }

        // From manOfTheMatch
        if (game.manOfTheMatch?.startsWith('guest:')) guestIds.add(game.manOfTheMatch);

        // From attendees
        for (const a of game.attendees ?? []) {
            if (a.startsWith('guest:')) guestIds.add(a);
        }

        // From playerPositions keys
        for (const key of Object.keys(game.playerPositions ?? {})) {
            if (key.startsWith('guest:')) guestIds.add(key);
        }

        for (const gid of guestIds) {
            counts.set(gid, (counts.get(gid) ?? 0) + 1);
        }
    }

    return Array.from(counts.entries())
        .map(([guestId, gameCount]) => ({
            guestId,
            guestName: guestId.slice('guest:'.length),
            gameCount,
        }))
        .sort((a, b) => b.gameCount - a.gameCount);
}

/** Replace all occurrences of a guest ID with a member's userId across all league games */
export async function linkGuestToMember(
    leagueId: string,
    guestId: string,
    memberId: string,
): Promise<number> {
    const games = await getLeagueGames(leagueId);
    let updatedCount = 0;

    for (const game of games) {
        const updates: Record<string, unknown> = {};
        let changed = false;

        // Replace in teams
        if (game.teams) {
            const newTeams = game.teams.map(team => ({
                ...team,
                players: team.players.map(p => {
                    const pid = p.playerId ?? p.name;
                    if (pid === guestId) {
                        return { ...p, playerId: memberId };
                    }
                    return p;
                }),
            }));
            if (JSON.stringify(newTeams) !== JSON.stringify(game.teams)) {
                updates.teams = newTeams;
                changed = true;
            }
        }

        // Replace in goalScorers
        if (game.goalScorers) {
            const newGs = game.goalScorers.map(gs =>
                gs.playerId === guestId ? { ...gs, playerId: memberId } : gs,
            );
            if (JSON.stringify(newGs) !== JSON.stringify(game.goalScorers)) {
                updates.goalScorers = newGs;
                changed = true;
            }
        }

        // Replace in assisters
        if (game.assisters) {
            const newA = game.assisters.map(a =>
                a.playerId === guestId ? { ...a, playerId: memberId } : a,
            );
            if (JSON.stringify(newA) !== JSON.stringify(game.assisters)) {
                updates.assisters = newA;
                changed = true;
            }
        }

        // Replace manOfTheMatch
        if (game.manOfTheMatch === guestId) {
            updates.manOfTheMatch = memberId;
            changed = true;
        }

        // Replace in attendees
        if (game.attendees) {
            const newAtt = game.attendees.map(a => a === guestId ? memberId : a);
            if (JSON.stringify(newAtt) !== JSON.stringify(game.attendees)) {
                updates.attendees = newAtt;
                changed = true;
            }
        }

        // Replace in playerPositions
        if (game.playerPositions && guestId in game.playerPositions) {
            const { [guestId]: posVal, ...rest } = game.playerPositions;
            updates.playerPositions = { ...rest, [memberId]: posVal };
            changed = true;
        }

        // Replace in guestPlayers (remove the guest name)
        const guestName = guestId.slice('guest:'.length);
        if (game.guestPlayers?.includes(guestName)) {
            updates.guestPlayers = game.guestPlayers.filter(n => n !== guestName);
            changed = true;
        }

        // Replace in guestAvailability
        if (game.guestAvailability && guestName in game.guestAvailability) {
            const { [guestName]: _removedAvail, ...restAvail } = game.guestAvailability;
            void _removedAvail;
            updates.guestAvailability = restAvail;
            changed = true;
        }

        if (changed) {
            await updateDoc(doc(db, 'games', game.id), updates);
            updatedCount++;
        }
    }

    return updatedCount;
}

// ---- Game Health Data ----

/** Save health data for a game (doc ID = gameId_userId) */
export async function saveGameHealth(data: StoredGameHealth): Promise<void> {
    const id = `${data.gameId}_${data.userId}`;
    await setDoc(doc(db, 'gameHealth', id), data);
}

/** Get my health data for a game */
export async function getMyGameHealth(gameId: string, userId: string): Promise<StoredGameHealth | null> {
    const id = `${gameId}_${userId}`;
    const snap = await getDoc(doc(db, 'gameHealth', id));
    if (!snap.exists()) return null;
    return snap.data() as StoredGameHealth;
}

/** Get all shared health data for a game (for league members to see) */
export async function getSharedGameHealth(gameId: string): Promise<StoredGameHealth[]> {
    const q = query(
        collection(db, 'gameHealth'),
        where('gameId', '==', gameId),
        where('shared', '==', true),
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as StoredGameHealth);
}

/** Toggle health sharing for a specific game */
export async function updateGameHealthSharing(gameId: string, userId: string, shared: boolean): Promise<void> {
    const id = `${gameId}_${userId}`;
    await updateDoc(doc(db, 'gameHealth', id), { shared });
}

/** Update health sharing preference on user profile (default for future games) */
export async function updateHealthSharingDefault(userId: string, shareHealthByDefault: boolean): Promise<void> {
    await setDoc(doc(db, 'users', userId), { shareHealthByDefault }, { merge: true });
}

/** Get user's health sharing preference */
export async function getHealthSharingDefault(userId: string): Promise<boolean> {
    const snap = await getDoc(doc(db, 'users', userId));
    if (!snap.exists()) return false;
    return snap.data().shareHealthByDefault ?? false;
}
