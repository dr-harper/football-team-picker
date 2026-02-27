const functions = require("@google-cloud/functions-framework");

const GEMINI_API_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";

/**
 * Allowed origins for CORS.  Set the ALLOWED_ORIGIN env var to your
 * production domain (e.g. "https://teamshuffle.app").  During local
 * development you can set it to "*" or "http://localhost:5173".
 */
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";

/** Send CORS headers on every response */
function setCors(res) {
  res.set("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  res.set("Access-Control-Max-Age", "3600");
}

functions.http("geminiProxy", async (req, res) => {
  setCors(res);

  // Handle preflight
  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Server misconfigured: no API key" });
  }

  const { model, contents } = req.body || {};

  if (!model || !contents) {
    return res
      .status(400)
      .json({ error: 'Missing required fields: "model" and "contents"' });
  }

  const url = `${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`;

  try {
    const geminiRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents }),
    });

    const data = await geminiRes.json();

    if (!geminiRes.ok) {
      return res.status(geminiRes.status).json(data);
    }

    return res.status(200).json(data);
  } catch (err) {
    return res
      .status(502)
      .json({ error: "Failed to reach Gemini API", detail: err.message });
  }
});
