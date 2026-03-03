const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

initializeApp();

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
        cors: ['https://teamshuffle.app', 'http://localhost:5173'],
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
