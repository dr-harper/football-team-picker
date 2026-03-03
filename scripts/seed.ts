/**
 * Seed script — creates a test league with upcoming games and fake players
 *
 * Prerequisites:
 *   1. Generate a Firebase service account key:
 *      Firebase Console → Project Settings → Service Accounts → Generate new private key
 *   2. Save the downloaded JSON as:  scripts/serviceAccountKey.json
 *   3. Run:  npx tsx scripts/seed.ts
 *
 * The script is idempotent-ish: it checks for an existing "Dev League" before creating one.
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KEY_PATH = path.join(__dirname, 'serviceAccountKey.json');
const PROJECT_ID = 'football-team-picker-mh';

if (!existsSync(KEY_PATH)) {
    console.error('❌  Service account key not found at scripts/serviceAccountKey.json');
    console.error('   Download it from: Firebase Console → Project Settings → Service Accounts');
    process.exit(1);
}

initializeApp({
    credential: cert(KEY_PATH),
    projectId: PROJECT_ID,
});

const db = getFirestore();
const auth = getAuth();

// ─── Config ───────────────────────────────────────────────────────────────────

const ADMIN_EMAIL = 'test@teamshuffle.app';
const LEAGUE_NAME = '⚽ Dev League';

const FAKE_PLAYERS = [
    'Jamie Vardy', 'Marcus Rashford', 'Harry Kane', 'Bukayo Saka',
    'Trent Alexander-Arnold', 'Virgil van Dijk', 'Declan Rice', 'Phil Foden',
    'Jordan Pickford', 'Raheem Sterling', 'Jack Grealish', 'Jude Bellingham',
    'Mason Mount', 'Luke Shaw',
];

// Generate a random 6-char join code
function joinCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// Three upcoming Sundays
function upcomingSundays(count: number): number[] {
    const sundays: number[] = [];
    const d = new Date();
    d.setHours(14, 0, 0, 0);
    // Advance to next Sunday
    d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7));
    for (let i = 0; i < count; i++) {
        sundays.push(new Date(d).getTime());
        d.setDate(d.getDate() + 7);
    }
    return sundays;
}

// Past Sundays going back n weeks
function pastSundays(count: number): number[] {
    const sundays: number[] = [];
    const d = new Date();
    d.setHours(14, 0, 0, 0);
    // Back to last Sunday
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7 + 1));
    for (let i = 0; i < count; i++) {
        sundays.unshift(new Date(d).getTime());
        d.setDate(d.getDate() - 7);
    }
    return sundays;
}

function pick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, n);
}

const TEAM_NAMES = [
    ['Reds', 'Blues'], ['Yellows', 'Greens'], ['Stripes', 'Spots'],
    ['Lions', 'Tigers'], ['Eagles', 'Hawks'], ['Fire', 'Ice'],
    ['North', 'South'], ['East', 'West'], ['City', 'Town'], ['United', 'Athletic'],
];

const TEAM_COLORS = ['#ef4444', '#3b82f6', '#eab308', '#22c55e', '#f97316', '#8b5cf6', '#ec4899', '#14b8a6'];

const GAME_TITLES = [
    'Sunday Kickabout', 'Mid-week Session', 'Big Match', 'Five-a-side Friday',
    'Tuesday Training', 'Saturday Special', 'Evening Kick-around', 'Cup Night',
    'Pre-season Friendly', 'End of Season Derby',
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    console.log('🌱  Seeding test data into project:', PROJECT_ID);

    // Get admin user UID
    let adminUser: Awaited<ReturnType<typeof auth.getUserByEmail>>;
    try {
        adminUser = await auth.getUserByEmail(ADMIN_EMAIL);
        console.log(`✅  Found admin user: ${adminUser.uid}`);
    } catch {
        console.error(`❌  Admin user not found: ${ADMIN_EMAIL}`);
        console.error('   Create the account first via the app UI.');
        process.exit(1);
    }

    // Check if Dev League already exists
    const existingLeagues = await db.collection('leagues')
        .where('name', '==', LEAGUE_NAME)
        .where('createdBy', '==', adminUser.uid)
        .get();

    if (!existingLeagues.empty) {
        for (const leagueDoc of existingLeagues.docs) {
            console.log(`🗑️   Removing existing Dev League (${leagueDoc.id}) …`);
            const oldGames = await db.collection('games').where('leagueId', '==', leagueDoc.id).get();
            for (const g of oldGames.docs) await g.ref.delete();
            await leagueDoc.ref.delete();
        }
        console.log('   Cleaned up. Re-creating …');
    }

    // Create league
    const leagueRef = await db.collection('leagues').add({
        name: LEAGUE_NAME,
        joinCode: joinCode(),
        createdBy: adminUser.uid,
        memberIds: [adminUser.uid],
        createdAt: Date.now(),
    });
    console.log(`✅  Created league: ${leagueRef.id}`);

    // ── 10 completed historical games ──────────────────────────────────────────
    const historyDates = pastSundays(10);
    const adminName = adminUser.displayName || ADMIN_EMAIL.split('@')[0];

    for (let i = 0; i < 10; i++) {
        const [team1Name, team2Name] = TEAM_NAMES[i];
        const players = pickN(FAKE_PLAYERS, 12);
        const team1Players = players.slice(0, 6).map(name => ({
            name, isGoalkeeper: false, isStriker: false, isDefender: false,
            isteam1: true, isteam2: false, role: 'outfield', shirtNumber: null,
        }));
        const team2Players = players.slice(6).map(name => ({
            name, isGoalkeeper: false, isStriker: false, isDefender: false,
            isteam1: false, isteam2: true, role: 'outfield', shirtNumber: null,
        }));

        // Include admin in team 1 for half the games so personal stats show something
        if (i % 2 === 0) {
            team1Players[0] = {
                name: adminName, isGoalkeeper: false, isStriker: false, isDefender: false,
                isteam1: true, isteam2: false, role: 'outfield', shirtNumber: null,
            };
        }

        const score1 = Math.floor(Math.random() * 6);
        const score2 = Math.floor(Math.random() * 6);

        // Distribute goals among players in each team
        const goalScorers: { name: string; goals: number }[] = [];
        let remaining1 = score1;
        while (remaining1 > 0) {
            const scorer = pick(team1Players).name;
            const goals = Math.min(remaining1, Math.ceil(Math.random() * 2));
            const existing = goalScorers.find(g => g.name === scorer);
            if (existing) existing.goals += goals;
            else goalScorers.push({ name: scorer, goals });
            remaining1 -= goals;
        }
        let remaining2 = score2;
        while (remaining2 > 0) {
            const scorer = pick(team2Players).name;
            const goals = Math.min(remaining2, Math.ceil(Math.random() * 2));
            const existing = goalScorers.find(g => g.name === scorer);
            if (existing) existing.goals += goals;
            else goalScorers.push({ name: scorer, goals });
            remaining2 -= goals;
        }

        // Distribute assists — each goal has a ~70% chance of having an assister (different player)
        const assisters: { name: string; goals: number }[] = [];
        const allTeamPlayers = [...team1Players, ...team2Players];
        for (const gs of goalScorers) {
            const numAssists = gs.goals;
            for (let a = 0; a < numAssists; a++) {
                if (Math.random() < 0.7) {
                    const candidates = allTeamPlayers.map(p => p.name).filter(n => n !== gs.name);
                    const assister = pick(candidates);
                    const existing = assisters.find(x => x.name === assister);
                    if (existing) existing.goals += 1;
                    else assisters.push({ name: assister, goals: 1 });
                }
            }
        }

        // Bias MOTM towards admin occasionally
        const allPlayers = [...team1Players, ...team2Players];
        const motmPool = i % 3 === 0 ? [adminName] : allPlayers.map(p => p.name);
        const manOfTheMatch = pick(motmPool);

        const color1 = TEAM_COLORS[i % TEAM_COLORS.length];
        const color2 = TEAM_COLORS[(i + 3) % TEAM_COLORS.length];

        await db.collection('games').add({
            leagueId: leagueRef.id,
            title: GAME_TITLES[i],
            date: historyDates[i],
            status: 'completed',
            gameCode: joinCode(),
            createdBy: adminUser.uid,
            createdAt: historyDates[i] - 7 * 24 * 60 * 60 * 1000,
            teams: [
                { name: team1Name, color: color1, players: team1Players },
                { name: team2Name, color: color2, players: team2Players },
            ],
            score: { team1: score1, team2: score2 },
            goalScorers,
            assisters,
            manOfTheMatch,
        });
        console.log(`✅  Created completed game: "${GAME_TITLES[i]}" — ${team1Name} ${score1}–${score2} ${team2Name} (MOTM: ${manOfTheMatch})`);
    }

    // ── 3 upcoming games ────────────────────────────────────────────────────────
    const gameNames = ['Sunday Kickabout', 'Mid-week Session', 'Big Match'];
    const gameDates = upcomingSundays(3);

    for (let i = 0; i < 3; i++) {
        const gameData: Record<string, unknown> = {
            leagueId: leagueRef.id,
            title: gameNames[i],
            date: gameDates[i],
            status: 'scheduled',
            gameCode: joinCode(),
            guestPlayers: i === 0 ? FAKE_PLAYERS : [],
            createdBy: adminUser.uid,
            createdAt: Date.now(),
        };
        if (i === 0) {
            gameData.location = 'Hackney Marshes, London';
            gameData.locationLat = 51.5491;
            gameData.locationLon = -0.0197;
        }
        const gameRef = await db.collection('games').add(gameData);
        console.log(`✅  Created upcoming game: "${gameNames[i]}" (${gameRef.id}) on ${new Date(gameDates[i]).toDateString()}`);
    }

    console.log('\n🎉  Seed complete!');
    console.log(`   Open the app, log in as ${ADMIN_EMAIL}, and look for "${LEAGUE_NAME}"`);
    process.exit(0);
}

main().catch(err => {
    console.error('❌  Seed failed:', err);
    process.exit(1);
});
