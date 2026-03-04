const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp();

// ── OpenGraph for /join/:code links ─────────────────────────────────────────

const SITE_URL = 'https://teamshuffle.app';
const OG_IMAGE = `${SITE_URL}/teamshuffle-preview.jpg`;

let indexHtmlCache = null;
let cacheTime = 0;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function escapeAttr(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

async function getIndexHtml() {
    if (indexHtmlCache && Date.now() - cacheTime < CACHE_TTL_MS) {
        return indexHtmlCache;
    }
    try {
        const res = await fetch(`${SITE_URL}/index.html`);
        if (!res.ok) return null;
        indexHtmlCache = await res.text();
        cacheTime = Date.now();
        return indexHtmlCache;
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
        let html = await getIndexHtml();

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
