import { callGemini, GeminiContent } from './geminiClient';
import { VOICE_EVENT_PROMPT } from '../constants/aiPrompts';
import { MatchEvent } from '../types';

interface RawParsedEvent {
    type: 'goal' | 'own-goal' | 'assist' | 'penalty-scored' | 'penalty-missed' | 'penalty-conceded' | 'save' | 'tackle' | 'card' | 'swap' | 'highlight' | 'note';
    playerName: string | null;
    assisterName: string | null;
    cardColour?: 'yellow' | 'red' | null;
    description: string;
}

export interface VoiceParseResult {
    events: MatchEvent[];
    rawTranscript: string;
}

/** Fuzzy name match: lowercase substring or common nickname patterns */
function resolvePlayer(
    name: string | null,
    roster: { playerId: string; displayName: string }[],
): string | undefined {
    if (!name) return undefined;
    const lower = name.toLowerCase().trim();
    // Exact match first
    const exact = roster.find(p => p.displayName.toLowerCase() === lower);
    if (exact) return exact.playerId;
    // Substring match (e.g. "Waz" in "Warren")
    const partial = roster.find(p => p.displayName.toLowerCase().includes(lower));
    if (partial) return partial.playerId;
    // Reverse substring (e.g. "Warren" contains "war")
    const reverse = roster.find(p => lower.includes(p.displayName.toLowerCase()));
    if (reverse) return reverse.playerId;
    return undefined;
}

/**
 * Parse a voice transcript into structured match events using Gemini.
 */
export async function parseVoiceTranscript(
    transcript: string,
    playerRoster: { playerId: string; displayName: string }[],
    elapsedSec?: number,
    apiKey?: string,
): Promise<VoiceParseResult> {
    const rosterJson = JSON.stringify(playerRoster.map(p => p.displayName));
    const prompt = VOICE_EVENT_PROMPT + rosterJson;

    const contents: GeminiContent[] = [
        { role: 'user', parts: [{ text: prompt + '\n\nTranscript: "' + transcript + '"' }] },
    ];

    try {
        const response = await callGemini('gemini-2.5-flash-lite', contents, apiKey);
        const text = response.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]';

        // Strip markdown fences if present
        const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
        const parsed: RawParsedEvent[] = JSON.parse(cleaned);

        if (!Array.isArray(parsed)) {
            return fallbackNote(transcript, elapsedSec);
        }

        const events: MatchEvent[] = parsed.map(raw => ({
            id: crypto.randomUUID(),
            type: raw.type === 'assist' ? 'goal' : raw.type,
            playerId: raw.type === 'assist' ? undefined : resolvePlayer(raw.playerName, playerRoster),
            assisterId: (raw.type === 'goal' || raw.type === 'assist') ? resolvePlayer(raw.type === 'assist' ? raw.playerName : raw.assisterName, playerRoster) : undefined,
            swappedWithId: raw.type === 'swap' ? resolvePlayer(raw.assisterName, playerRoster) : undefined,
            cardColour: raw.type === 'card' && raw.cardColour ? raw.cardColour : undefined,
            elapsedSec,
            transcript,
            description: raw.description,
            source: 'voice' as const,
            createdAt: Date.now(),
        }));

        return { events, rawTranscript: transcript };
    } catch {
        return fallbackNote(transcript, elapsedSec);
    }
}

/** If AI parsing fails, store as a plain note so the transcript isn't lost */
function fallbackNote(transcript: string, elapsedSec?: number): VoiceParseResult {
    return {
        events: [{
            id: crypto.randomUUID(),
            type: 'note',
            transcript,
            elapsedSec,
            source: 'voice',
            createdAt: Date.now(),
        }],
        rawTranscript: transcript,
    };
}
