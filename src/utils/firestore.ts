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
    Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase';
import { League, Game, PlayerAvailability, GameStatus, GameScore, Team, GoalScorer, PaymentRecord, LeagueExpense } from '../types';

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

export async function updateLeagueDefaultCost(leagueId: string, cost: number | null): Promise<void> {
    await updateDoc(doc(db, 'leagues', leagueId), { defaultCostPerPerson: cost ?? null });
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
