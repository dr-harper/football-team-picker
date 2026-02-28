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
import { League, Game, PlayerAvailability, GameStatus, GameScore, Team } from '../types';

// ---- Leagues ----

function generateJoinCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

export async function createLeague(name: string, userId: string): Promise<League> {
    const joinCode = generateJoinCode();
    const data = {
        name,
        joinCode,
        createdBy: userId,
        memberIds: [userId],
        createdAt: Date.now(),
    };
    const ref = await addDoc(collection(db, 'leagues'), data);
    return { id: ref.id, ...data };
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

// ---- Games ----

export async function createGame(
    leagueId: string,
    title: string,
    date: number,
    userId: string,
): Promise<Game> {
    const data = {
        leagueId,
        title,
        date,
        status: 'scheduled' as GameStatus,
        createdBy: userId,
        createdAt: Date.now(),
    };
    const ref = await addDoc(collection(db, 'games'), data);
    return { id: ref.id, ...data };
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

export async function deleteGame(gameId: string): Promise<void> {
    await deleteDoc(doc(db, 'games', gameId));
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
