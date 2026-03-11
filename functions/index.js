const { onRequest } = require('firebase-functions/v2/https');
const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret } = require('firebase-functions/params');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const webpush = require('web-push');

initializeApp();

// ── OpenGraph for /join/:code links ─────────────────────────────────────────

const SITE_URL = 'https://teamshuffle.app';
const OG_IMAGE = `${SITE_URL}/teamshuffle-preview.jpg`;

const indexHtmlCache = new Map(); // host → { html, time }
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function escapeAttr(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

async function getIndexHtml(host) {
    const cached = indexHtmlCache.get(host);
    if (cached && Date.now() - cached.time < CACHE_TTL_MS) {
        return cached.html;
    }
    try {
        const res = await fetch(`https://${host}/index.html`);
        if (!res.ok) return null;
        const html = await res.text();
        indexHtmlCache.set(host, { html, time: Date.now() });
        return html;
    } catch {
        return null;
    }
}

exports.joinOg = onRequest(
    { region: 'europe-west2' },
    async (req, res) => {
        const match = req.path.match(/^\/join\/([A-Za-z0-9]{1,10})$/);
        if (!match) {
            res.redirect(302, SITE_URL);
            return;
        }

        const code = match[1].toUpperCase();

        // Default OG values (used when league not found or Firestore unavailable)
        let ogTitle = 'Join a League on Team Shuffle';
        let ogDescription =
            "You've been invited to join a league! Shuffle balanced teams, track availability, and record results.";
        const ogUrl = `${SITE_URL}/join/${code}`;

        // Fetch league info from Firestore
        try {
            const db = getFirestore();
            const snap = await db
                .collection('leagues')
                .where('joinCode', '==', code)
                .limit(1)
                .get();

            if (!snap.empty) {
                const league = snap.docs[0].data();
                const name = league.name || 'a league';
                const memberCount = (league.memberIds || []).length;
                ogTitle = `Join ${name} on Team Shuffle`;
                ogDescription = `You've been invited to join ${name}! ${memberCount} member${memberCount !== 1 ? 's' : ''} already playing. Create balanced teams, track availability, and more.`;
            }
        } catch {
            // Firestore unavailable — fall through with defaults
        }

        const safeTitle = escapeAttr(ogTitle);
        const safeDesc = escapeAttr(ogDescription);

        // Try to fetch the SPA's index.html so the page also works for real users
        // Use the request's own host so preview channels serve their own assets
        const host = req.headers.host || new URL(SITE_URL).host;
        let html = await getIndexHtml(host);

        if (html) {
            // Replace static OG tags with dynamic ones
            html = html
                .replace(/<title>[^<]*<\/title>/, `<title>${safeTitle}</title>`)
                .replace(
                    /<meta property="og:title" content="[^"]*" \/>/,
                    `<meta property="og:title" content="${safeTitle}" />`,
                )
                .replace(
                    /<meta property="og:description" content="[^"]*" \/>/,
                    `<meta property="og:description" content="${safeDesc}" />`,
                )
                .replace(
                    /<meta property="og:url" content="[^"]*" \/>/,
                    `<meta property="og:url" content="${ogUrl}" />`,
                )
                .replace(
                    /<meta property="og:image" content="[^"]*" \/>/,
                    `<meta property="og:image" content="${OG_IMAGE}" />`,
                );

            // Replace Twitter card tags with dynamic values
            html = html
                .replace(
                    /<meta name="twitter:title" content="[^"]*" \/>/,
                    `<meta name="twitter:title" content="${safeTitle}" />`,
                )
                .replace(
                    /<meta name="twitter:description" content="[^"]*" \/>/,
                    `<meta name="twitter:description" content="${safeDesc}" />`,
                );
        } else {
            // Fallback: minimal HTML with OG tags and a link to the site
            html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle}</title>
  <meta property="og:title" content="${safeTitle}" />
  <meta property="og:description" content="${safeDesc}" />
  <meta property="og:image" content="${OG_IMAGE}" />
  <meta property="og:url" content="${ogUrl}" />
  <meta property="og:type" content="website" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${safeTitle}" />
  <meta name="twitter:description" content="${safeDesc}" />
  <meta name="twitter:image" content="${OG_IMAGE}" />
  <meta http-equiv="refresh" content="0;url=${SITE_URL}" />
</head>
<body>
  <p>Redirecting to <a href="${SITE_URL}">Team Shuffle</a>…</p>
</body>
</html>`;
        }

        res.set('Cache-Control', 'public, max-age=300, s-maxage=600');
        return res.status(200).send(html);
    },
);

// ── Push Notification Helpers ────────────────────────────────────────────────

const vapidPrivateKey = defineSecret('VAPID_PRIVATE_KEY');
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BIkWh3RNU2iU_rqIaEwwsKvynL_3dK4H3Db0gdvakUsLjukL5zC_FNOHxB0z-DuuOJ-Y9UQTitKELKNQS5oIuKs';
const VAPID_EMAIL = 'mailto:teamshuffle@mlharper.co.uk';

const DEFAULT_PREFS = {
    gameScheduled: true,
    availabilityReminder: true,
    teamsGenerated: true,
    resultRecorded: false,
    paymentReminder: false,
};

function initVapid() {
    webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, vapidPrivateKey.value());
}

async function sendPushToUser(db, userId, payload) {
    const subsSnap = await db.collection('users').doc(userId).collection('pushSubscriptions').get();
    if (subsSnap.empty) return;

    const stale = [];
    await Promise.all(subsSnap.docs.map(async (subDoc) => {
        const sub = subDoc.data();
        try {
            await webpush.sendNotification(
                { endpoint: sub.endpoint, keys: sub.keys },
                JSON.stringify(payload),
            );
        } catch (err) {
            if (err.statusCode === 404 || err.statusCode === 410) {
                stale.push(subDoc.ref);
            } else {
                console.error(`Failed to send push to user ${userId}:`, err);
            }
        }
    }));

    // Clean up stale subscriptions
    await Promise.all(stale.map(ref => ref.delete()));
}

async function getUserPref(db, userId, prefKey) {
    const userDoc = await db.collection('users').doc(userId).get();
    const prefs = userDoc.data()?.notificationPreferences || {};
    return prefs[prefKey] ?? DEFAULT_PREFS[prefKey] ?? false;
}

async function getLeagueJoinCode(db, leagueId) {
    const leagueDoc = await db.collection('leagues').doc(leagueId).get();
    return leagueDoc.data()?.joinCode || '';
}

async function notifyLeagueMembers(db, leagueId, prefKey, payload, excludeUserId) {
    const leagueDoc = await db.collection('leagues').doc(leagueId).get();
    if (!leagueDoc.exists) return;
    const memberIds = leagueDoc.data().memberIds || [];

    await Promise.all(memberIds.map(async (uid) => {
        if (uid === excludeUserId) return;
        const wantsPush = await getUserPref(db, uid, prefKey);
        if (!wantsPush) return;
        await sendPushToUser(db, uid, payload);
    }));
}

// ── Game Scheduled notification ─────────────────────────────────────────────

exports.onGameCreated = onDocumentCreated(
    { document: 'games/{gameId}', region: 'europe-west2', secrets: [vapidPrivateKey] },
    async (event) => {
        initVapid();
        const db = getFirestore();
        const game = event.data.data();
        const code = await getLeagueJoinCode(db, game.leagueId);
        const dateStr = new Date(game.date).toLocaleDateString('en-GB', {
            weekday: 'short', day: 'numeric', month: 'short',
            hour: '2-digit', minute: '2-digit',
        });

        await notifyLeagueMembers(db, game.leagueId, 'gameScheduled', {
            title: 'New Game Scheduled',
            body: `${game.title} — ${dateStr}`,
            url: `/league/${code}/game/${event.params.gameId}`,
            icon: '/logo.png',
        }, game.createdBy);
    },
);

// ── Teams Generated + Result Recorded notifications ─────────────────────────

exports.onGameUpdated = onDocumentUpdated(
    { document: 'games/{gameId}', region: 'europe-west2', secrets: [vapidPrivateKey] },
    async (event) => {
        initVapid();
        const db = getFirestore();
        const before = event.data.before.data();
        const after = event.data.after.data();
        const code = await getLeagueJoinCode(db, after.leagueId);
        const gameUrl = `/league/${code}/game/${event.params.gameId}`;

        // Teams generated: teams went from empty to populated
        const hadTeams = before.teams && before.teams.length > 0;
        const hasTeams = after.teams && after.teams.length > 0;
        if (!hadTeams && hasTeams) {
            await notifyLeagueMembers(db, after.leagueId, 'teamsGenerated', {
                title: 'Teams Are Out!',
                body: `${after.title} — check your team`,
                url: gameUrl,
                icon: '/logo.png',
            }, after.createdBy);
        }

        // Result recorded: status changed to completed
        if (before.status !== 'completed' && after.status === 'completed') {
            const score = after.score || {};
            const teams = after.teams || [];
            const t1 = teams[0]?.name || 'Team 1';
            const t2 = teams[1]?.name || 'Team 2';

            await notifyLeagueMembers(db, after.leagueId, 'resultRecorded', {
                title: 'Result Recorded',
                body: `${t1} ${score.team1 ?? '?'} - ${score.team2 ?? '?'} ${t2}`,
                url: gameUrl,
                icon: '/logo.png',
            }, after.createdBy);
        }
    },
);

// ── Availability Reminder (daily at 18:00 UK time) ──────────────────────────

exports.availabilityReminder = onSchedule(
    { schedule: 'every day 18:00', timeZone: 'Europe/London', region: 'europe-west2', secrets: [vapidPrivateKey] },
    async () => {
        initVapid();
        const db = getFirestore();
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        const dayAfter = new Date(tomorrow);
        dayAfter.setDate(dayAfter.getDate() + 1);

        // Find games happening tomorrow
        const gamesSnap = await db.collection('games')
            .where('date', '>=', tomorrow.getTime())
            .where('date', '<', dayAfter.getTime())
            .where('status', '==', 'scheduled')
            .get();

        for (const gameDoc of gamesSnap.docs) {
            const game = gameDoc.data();
            const code = await getLeagueJoinCode(db, game.leagueId);
            const leagueDoc = await db.collection('leagues').doc(game.leagueId).get();
            if (!leagueDoc.exists) continue;
            const memberIds = leagueDoc.data().memberIds || [];

            // Find who has already responded
            const availSnap = await db.collection('availability')
                .where('gameId', '==', gameDoc.id)
                .get();
            const respondedUserIds = new Set(availSnap.docs.map(d => d.data().userId));

            // Notify members who haven't responded
            await Promise.all(memberIds.map(async (uid) => {
                if (respondedUserIds.has(uid)) return;
                const wantsPush = await getUserPref(db, uid, 'availabilityReminder');
                if (!wantsPush) return;
                await sendPushToUser(db, uid, {
                    title: 'Are You Playing Tomorrow?',
                    body: `${game.title} — tap to respond`,
                    url: `/league/${code}/game/${gameDoc.id}`,
                    icon: '/logo.png',
                });
            }));
        }
    },
);

// ── Payment Reminder (weekly on Monday at 09:00 UK time) ────────────────────

exports.paymentReminder = onSchedule(
    { schedule: 'every monday 09:00', timeZone: 'Europe/London', region: 'europe-west2', secrets: [vapidPrivateKey] },
    async () => {
        initVapid();
        const db = getFirestore();
        const leaguesSnap = await db.collection('leagues').get();

        for (const leagueDoc of leaguesSnap.docs) {
            const league = leagueDoc.data();
            const payments = league.payments || {};
            const costPerPerson = league.defaultCostPerPerson || 0;
            if (costPerPerson === 0) continue;

            // Get completed games to calculate what each player owes
            const gamesSnap = await db.collection('games')
                .where('leagueId', '==', leagueDoc.id)
                .where('status', '==', 'completed')
                .get();

            // Calculate per-player attendance costs (attendees now store playerIds)
            const attendanceCosts = {};
            for (const gameDoc of gamesSnap.docs) {
                const game = gameDoc.data();
                const gameCost = game.costPerPerson ?? costPerPerson;
                for (const pid of (game.attendees || [])) {
                    attendanceCosts[pid] = (attendanceCosts[pid] || 0) + gameCost;
                }
            }

            // Notify members with outstanding debt (payments keyed by userId)
            const memberIds = league.memberIds || [];
            await Promise.all(memberIds.map(async (uid) => {
                const owed = attendanceCosts[uid] || 0;
                const paid = (payments[uid] || []).reduce((sum, p) => sum + (p.amount || 0), 0);
                const balance = paid - owed;

                if (balance >= 0) return; // No debt

                const wantsPush = await getUserPref(db, uid, 'paymentReminder');
                if (!wantsPush) return;

                await sendPushToUser(db, uid, {
                    title: 'Payment Due',
                    body: `You owe £${Math.abs(balance).toFixed(2)} in ${league.name}`,
                    url: `/league/${league.joinCode}`,
                    icon: '/logo.png',
                });
            }));
        }
    },
);

// ── Display Name Cascade (cosmetic only) ─────────────────────────────────────
// Since all data keys now use userId, the only cascade needed is updating the
// displayName field on availability records (used for UI display only).

exports.onUserUpdated = onDocumentUpdated(
    { document: 'users/{userId}', region: 'europe-west2' },
    async (event) => {
        const before = event.data.before.data();
        const after = event.data.after.data();

        const oldName = before.displayName;
        const newName = after.displayName;
        if (!oldName || !newName || oldName === newName) return;

        const db = getFirestore();
        const userId = event.params.userId;

        // Update availability records sequentially to avoid Firestore rate limits
        const availSnap = await db.collection('availability')
            .where('userId', '==', userId)
            .get();

        for (const availDoc of availSnap.docs) {
            if (availDoc.data().displayName === oldName) {
                await availDoc.ref.update({ displayName: newName });
            }
        }

        console.log(`Updated displayName on availability docs: "${oldName}" → "${newName}" for user ${userId}`);
    },
);

const geminiKey = defineSecret('GEMINI_KEY');

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

const ALLOWED_MODELS = new Set([
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
]);

exports.geminiProxy = onRequest(
    {
        cors: ['https://teamshuffle.app', 'http://localhost:5173', 'http://localhost:4173'],
        secrets: [geminiKey],
        region: 'europe-west2',
    },
    async (req, res) => {
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method not allowed' });
        }

        // Verify Firebase Auth token if present (authenticated users get verified;
        // unauthenticated users are still allowed through — CORS + model allowlist
        // prevent abuse from outside the app)
        const authHeader = req.headers.authorization ?? '';
        const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
        if (idToken) {
            try {
                await getAuth().verifyIdToken(idToken);
            } catch {
                return res.status(403).json({ error: 'Invalid or expired token' });
            }
        }

        const apiKey = geminiKey.value();
        if (!apiKey) {
            return res.status(500).json({ error: 'Server misconfigured: no API key' });
        }

        const { model, contents } = req.body || {};

        if (!model || !contents) {
            return res.status(400).json({ error: 'Missing required fields: "model" and "contents"' });
        }

        if (!ALLOWED_MODELS.has(model)) {
            return res.status(400).json({ error: `Model "${model}" is not permitted` });
        }

        const url = `${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`;

        try {
            const geminiRes = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents }),
            });

            const data = await geminiRes.json();

            if (!geminiRes.ok) {
                return res.status(geminiRes.status).json(data);
            }

            return res.status(200).json(data);
        } catch (err) {
            return res.status(502).json({ error: 'Failed to reach Gemini API', detail: err.message });
        }
    },
);
