/**
 * Simple XOR-based obfuscation for the built-in Gemini API key.
 *
 * This is NOT encryption — it only prevents the key from appearing as a
 * plain-text string in the JS bundle.  For real security, use the proxy
 * (VITE_AI_PROXY_URL) so the key never reaches the client.
 */

import { hasProxyConfigured } from './geminiClient';

const SALT = 'TeamShuffleAI';

/** Decode an obfuscated key at runtime */
export function deobfuscate(encoded: string): string {
    try {
        const decoded = atob(encoded);
        return decoded
            .split('')
            .map((c, i) =>
                String.fromCharCode(
                    c.charCodeAt(0) ^ SALT.charCodeAt(i % SALT.length),
                ),
            )
            .join('');
    } catch {
        return '';
    }
}

/**
 * Returns the active Gemini API key for direct (non-proxy) calls.
 *
 * Priority:
 *   1. User-provided key (stored in localStorage)
 *   2. Built-in app key (injected at build time via VITE_GEMINI_KEY)
 *
 * When a proxy is configured this key is unused but may still be returned
 * for backwards-compat UI state.
 */
export function getActiveGeminiKey(userKey: string): string {
    if (userKey) return userKey;

    const builtIn =
        typeof __GEMINI_KEY_OBF__ !== 'undefined' ? __GEMINI_KEY_OBF__ : '';
    if (builtIn) return deobfuscate(builtIn);

    return '';
}

/** Whether AI features should be available */
export function isAIAvailable(userKey: string): boolean {
    if (hasProxyConfigured()) return true;
    return Boolean(getActiveGeminiKey(userKey));
}

/** Whether the app ships with a built-in key or proxy */
export function hasBuiltInAI(): boolean {
    if (hasProxyConfigured()) return true;
    const builtIn =
        typeof __GEMINI_KEY_OBF__ !== 'undefined' ? __GEMINI_KEY_OBF__ : '';
    return Boolean(builtIn && deobfuscate(builtIn));
}

// Global constant injected by Vite at build time
declare const __GEMINI_KEY_OBF__: string;
