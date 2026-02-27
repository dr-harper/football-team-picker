/**
 * Centralised Gemini API client.
 *
 * Routing priority:
 *   1. Proxy URL (set via VITE_AI_PROXY_URL at build time) — key stays server-side
 *   2. Direct API call with a client-side key (user-provided or built-in obfuscated)
 */

import { GEMINI_API_BASE_URL } from '../constants/aiPrompts';

declare const __AI_PROXY_URL__: string;

const PROXY_URL =
    typeof __AI_PROXY_URL__ !== 'undefined' ? __AI_PROXY_URL__ : '';

export interface GeminiContent {
    role: string;
    parts: { text: string }[];
}

export interface GeminiResponse {
    candidates?: {
        content?: {
            parts?: { text?: string }[];
        };
    }[];
    error?: { message?: string };
}

/**
 * Call the Gemini API — via proxy if available, otherwise directly.
 *
 * @param model     Gemini model id (e.g. "gemini-2.5-flash-lite")
 * @param contents  The conversation contents array
 * @param directKey Optional client-side API key (ignored when proxy is configured)
 */
export async function callGemini(
    model: string,
    contents: GeminiContent[],
    directKey?: string,
): Promise<GeminiResponse> {
    if (PROXY_URL) {
        const res = await fetch(PROXY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model, contents }),
        });
        return res.json();
    }

    if (!directKey) {
        throw new Error('No AI proxy configured and no API key available');
    }

    const url = `${GEMINI_API_BASE_URL}/${model}:generateContent?key=${directKey}`;
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents }),
    });
    return res.json();
}

/** Whether a server-side proxy is configured */
export function hasProxyConfigured(): boolean {
    return Boolean(PROXY_URL);
}
