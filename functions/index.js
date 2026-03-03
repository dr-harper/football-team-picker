const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');

const geminiKey = defineSecret('GEMINI_KEY');

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

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

        const apiKey = geminiKey.value();
        if (!apiKey) {
            return res.status(500).json({ error: 'Server misconfigured: no API key' });
        }

        const { model, contents } = req.body || {};

        if (!model || !contents) {
            return res.status(400).json({ error: 'Missing required fields: "model" and "contents"' });
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
