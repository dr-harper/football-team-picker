/**
 * Simple XOR-based obfuscation for the built-in Gemini API key.
 *
 * This is NOT encryption — it only prevents the key from appearing as a
 * plain-text string in the JS bundle.  The real protection comes from
 * restricting the key to your app's domain in Google AI Studio.
 */

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
 * Returns the active Gemini API key.
 *
 * Priority:
 *   1. User-provided key (stored in localStorage)
 *   2. Built-in app key (injected at build time via VITE_GEMINI_KEY)
 */
export function getActiveGeminiKey(userKey: string): string {
    if (userKey) return userKey;

    // __GEMINI_KEY_OBF__ is replaced at build time by Vite's `define` config
    const builtIn =
        typeof __GEMINI_KEY_OBF__ !== 'undefined' ? __GEMINI_KEY_OBF__ : '';
    if (builtIn) return deobfuscate(builtIn);

    return '';
}

/** Whether the app ships with a built-in key */
export function hasBuiltInKey(): boolean {
    const builtIn =
        typeof __GEMINI_KEY_OBF__ !== 'undefined' ? __GEMINI_KEY_OBF__ : '';
    return Boolean(builtIn && deobfuscate(builtIn));
}

// Global constant injected by Vite at build time
declare const __GEMINI_KEY_OBF__: string;
