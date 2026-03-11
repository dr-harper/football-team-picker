/**
 * One-off migration: convert displayName-keyed data to userId-keyed data.
 *
 * This script migrates existing Firestore data so that:
 *   - league.payments keys use userId instead of displayName
 *   - game.attendees[] stores userIds (and guest:<name> for guests)
 *   - game.goalScorers[].name → .playerId (userId or guest:<name>)
 *   - game.assisters[].name → .playerId (same)
 *   - game.manOfTheMatch stores userId or guest:<name>
 *   - game.playerPositions keys use userId or guest:<name>
 *   - team player objects get playerId stamped
 *
 * Prerequisites:
 *   1. Place your Firebase service account key at scripts/serviceAccountKey.json
 *   2. Run:  npx tsx scripts/migrateToPlayerIds.ts
 *   3. Add --dry-run to preview changes without writing (default behaviour)
 *   4. Add --commit to actually write changes to Firestore
 *
 * The script is safe to run multiple times — it skips records that already
 * appear to use userIds (i.e. fields that already contain 'demo-' prefixed
 * values or Firebase Auth UIDs).
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KEY_PATH = path.join(__dirname, 'serviceAccountKey.json');
const PROJECT_ID = 'football-team-picker-mh';

const DRY_RUN = !process.argv.includes('--commit');

if (!existsSync(KEY_PATH)) {
    console.error('Service account key not found at scripts/serviceAccountKey.json');
    process.exit(1);
}

initializeApp({
    credential: cert(KEY_PATH),
    projectId: PROJECT_ID,
});

const db = getFirestore();

const GUEST_PREFIX = 'guest:';

function makeGuestId(name: string): string {
    return `${GUEST_PREFIX}${name}`;
}

/** Looks like a Firebase Auth UID (28-char alphanumeric) or a demo ID */
function looksLikeUserId(value: string): boolean {
    if (value.startsWith('demo-')) return true;
    if (value.startsWith(GUEST_PREFIX)) return true;
    // Firebase Auth UIDs are typically 28 chars, alphanumeric
    return /^[a-zA-Z0-9]{20,}$/.test(value);
}

interface MigrationStats {
    leaguesProcessed: number;
    leaguePaymentsMigrated: number;
    gamesProcessed: number;
    gamesUpdated: number;
    skipped: number;
}

async function buildNameToUserIdMap(memberIds: string[]): Promise<Record<string, string>> {
    const map: Record<string, string> = {};
    for (const uid of memberIds) {
        const userDoc = await db.collection('users').doc(uid).get();
        if (userDoc.exists) {
            const displayName = userDoc.data()?.displayName;
            if (displayName) {
                map[displayName] = uid;
            }
        }
    }
    return map;
}

function resolveId(name: string, nameMap: Record<string, string>, guestNames: string[]): string {
    // Already a userId or guest ID
    if (looksLikeUserId(name)) return name;
    // Known league member
    if (nameMap[name]) return nameMap[name];
    // Known guest player for this game
    if (guestNames.includes(name)) return makeGuestId(name);
    // Unknown — treat as guest
    return makeGuestId(name);
}

async function migrate() {
    const stats: MigrationStats = {
        leaguesProcessed: 0,
        leaguePaymentsMigrated: 0,
        gamesProcessed: 0,
        gamesUpdated: 0,
        skipped: 0,
    };

    console.log(DRY_RUN ? '\n=== DRY RUN (use --commit to write) ===\n' : '\n=== COMMITTING CHANGES ===\n');

    // Process all leagues
    const leaguesSnap = await db.collection('leagues').get();
    console.log(`Found ${leaguesSnap.size} league(s)\n`);

    for (const leagueDoc of leaguesSnap.docs) {
        const league = leagueDoc.data();
        stats.leaguesProcessed++;
        console.log(`--- League: ${league.name} (${leagueDoc.id}) ---`);

        const memberIds: string[] = league.memberIds || [];
        const nameMap = await buildNameToUserIdMap(memberIds);
        console.log(`  Members: ${Object.entries(nameMap).map(([n, id]) => `${n} → ${id}`).join(', ')}`);

        // Migrate league.payments keys
        const payments: Record<string, unknown[]> = league.payments || {};
        const paymentKeys = Object.keys(payments);
        const needsPaymentMigration = paymentKeys.some(k => !looksLikeUserId(k));

        if (needsPaymentMigration) {
            const newPayments: Record<string, unknown[]> = {};
            for (const [key, value] of Object.entries(payments)) {
                if (looksLikeUserId(key)) {
                    newPayments[key] = value;
                } else {
                    const newKey = nameMap[key] || key;
                    if (newKey !== key) {
                        console.log(`  Payment key: "${key}" → "${newKey}"`);
                        // If target key already exists, merge payment arrays
                        newPayments[newKey] = [...(newPayments[newKey] || []), ...value];
                    } else {
                        console.log(`  Payment key: "${key}" — no matching userId found, keeping as-is`);
                        newPayments[key] = value;
                    }
                }
            }

            if (!DRY_RUN) {
                await leagueDoc.ref.update({ payments: newPayments });
            }
            stats.leaguePaymentsMigrated++;
        }

        // Migrate league.expenses[].playerName → .playerId
        const expenses: Array<Record<string, unknown>> = league.expenses || [];
        const needsExpenseMigration = expenses.some(e => e.playerName && !e.playerId);
        if (needsExpenseMigration) {
            const newExpenses = expenses.map(e => {
                if (e.playerId) return e; // Already migrated
                const playerName = e.playerName as string;
                const playerId = nameMap[playerName] || playerName;
                console.log(`  Expense: "${playerName}" → playerId "${playerId}"`);
                return { ...e, playerId, playerName }; // Keep playerName for backward compat
            });
            if (!DRY_RUN) {
                await leagueDoc.ref.update({ expenses: newExpenses });
            }
        }

        // Process all games in this league
        const gamesSnap = await db.collection('games')
            .where('leagueId', '==', leagueDoc.id)
            .get();

        console.log(`  Games: ${gamesSnap.size}`);

        for (const gameDoc of gamesSnap.docs) {
            const game = gameDoc.data();
            stats.gamesProcessed++;
            const updates: Record<string, unknown> = {};
            const guestNames: string[] = game.guestPlayers || [];

            // Migrate attendees
            if (game.attendees && game.attendees.length > 0) {
                const needsMigration = game.attendees.some((a: string) => !looksLikeUserId(a));
                if (needsMigration) {
                    updates.attendees = game.attendees.map((a: string) =>
                        resolveId(a, nameMap, guestNames)
                    );
                }
            }

            // Migrate goalScorers (.name → .playerId)
            if (game.goalScorers && game.goalScorers.length > 0) {
                const hasOldFormat = game.goalScorers.some((gs: Record<string, unknown>) => gs.name && !gs.playerId);
                if (hasOldFormat) {
                    updates.goalScorers = game.goalScorers.map((gs: Record<string, unknown>) => {
                        if (gs.playerId) return gs; // Already migrated
                        const name = gs.name as string;
                        return { playerId: resolveId(name, nameMap, guestNames), goals: gs.goals };
                    });
                }
            }

            // Migrate assisters (.name → .playerId)
            if (game.assisters && game.assisters.length > 0) {
                const hasOldFormat = game.assisters.some((a: Record<string, unknown>) => a.name && !a.playerId);
                if (hasOldFormat) {
                    updates.assisters = game.assisters.map((a: Record<string, unknown>) => {
                        if (a.playerId) return a;
                        const name = a.name as string;
                        return { playerId: resolveId(name, nameMap, guestNames), goals: a.goals };
                    });
                }
            }

            // Migrate manOfTheMatch
            if (game.manOfTheMatch && !looksLikeUserId(game.manOfTheMatch)) {
                updates.manOfTheMatch = resolveId(game.manOfTheMatch, nameMap, guestNames);
            }

            // Migrate playerPositions keys
            if (game.playerPositions) {
                const posKeys = Object.keys(game.playerPositions);
                const needsMigration = posKeys.some(k => !looksLikeUserId(k));
                if (needsMigration) {
                    const newPositions: Record<string, string> = {};
                    for (const [key, value] of Object.entries(game.playerPositions)) {
                        const newKey = resolveId(key, nameMap, guestNames);
                        newPositions[newKey] = value as string;
                    }
                    updates.playerPositions = newPositions;
                }
            }

            // Stamp playerId on team players
            if (game.teams && game.teams.length > 0) {
                const needsStamp = game.teams.some((t: Record<string, unknown>) =>
                    (t.players as Array<Record<string, unknown>>)?.some(p => !p.playerId)
                );
                if (needsStamp) {
                    updates.teams = game.teams.map((t: Record<string, unknown>) => ({
                        ...t,
                        players: (t.players as Array<Record<string, unknown>>).map(p => {
                            if (p.playerId) return p;
                            const name = p.name as string;
                            return { ...p, playerId: resolveId(name, nameMap, guestNames) };
                        }),
                    }));
                }
            }

            if (Object.keys(updates).length > 0) {
                const changedFields = Object.keys(updates).join(', ');
                console.log(`    Game "${game.title}" (${gameDoc.id}): updating ${changedFields}`);
                if (!DRY_RUN) {
                    await gameDoc.ref.update(updates);
                }
                stats.gamesUpdated++;
            } else {
                stats.skipped++;
            }
        }

        console.log('');
    }

    console.log('=== Migration Summary ===');
    console.log(`  Leagues processed: ${stats.leaguesProcessed}`);
    console.log(`  League payments migrated: ${stats.leaguePaymentsMigrated}`);
    console.log(`  Games processed: ${stats.gamesProcessed}`);
    console.log(`  Games updated: ${stats.gamesUpdated}`);
    console.log(`  Games skipped (already migrated): ${stats.skipped}`);
    if (DRY_RUN) {
        console.log('\n  This was a DRY RUN. Run with --commit to apply changes.');
    } else {
        console.log('\n  Changes committed to Firestore.');
    }
}

migrate().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
