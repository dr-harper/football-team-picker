# Smartwatch Voice Notes + AI Processing — Implementation Plan

## Overview

Add the ability to speak match events into the WearOS smartwatch (e.g. *"Warren scored a great goal, low cross from James"*) and have Gemini AI parse these into structured goal/assist/event data that feeds directly into the existing live match tracking system.

---

## Architecture

```
[Watch Mic] → Android SpeechRecognizer (on-device STT)
     ↓
  raw transcript string
     ↓
[Watch] sends via existing Wear message channel: /game/voice  "gameId|transcript"
     ↓
[Phone App] receives in handleWatchMessage()
     ↓
[Gemini AI] parses transcript → structured JSON event(s)
     ↓
[Phone App] shows confirmation toast → writes to Firestore via existing handlers
```

The key insight: **the watch only needs to do speech-to-text and send the string**. All AI processing happens phone-side (or cloud-side via the existing Gemini proxy), keeping the watch app lightweight.

---

## Phase 1: Watch-Side Voice Input

### 1a. Add voice input to the WearOS app

**File:** `android/wear/src/main/java/.../wear/` (new `VoiceInputActivity.kt` or inline in existing tile/activity)

- Add a **mic button** to the watch match UI (alongside existing score buttons)
- On tap, launch Android's `SpeechRecognizer` intent:
  ```kotlin
  val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
      putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
      putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
      putExtra(RecognizerIntent.EXTRA_PROMPT, "What happened?")
  }
  startActivityForResult(intent, VOICE_REQUEST_CODE)
  ```
- On result, send transcript to phone via existing `MessageClient`:
  ```kotlin
  // Path: /game/voice
  // Data: "gameId|transcriptText|elapsedSeconds"
  messageClient.sendMessage(nodeId, "/game/voice", payload)
  ```

**Why `SpeechRecognizer` over continuous listening:**
- Works offline for short phrases (no network needed)
- Built into every WearOS device
- Battery-friendly (only active when triggered)
- No microphone permission headaches beyond initial grant

### 1b. Update the Capacitor Wear plugin interface

**File:** `android/app/src/main/java/.../WearPlugin.java`

No changes needed — the watch sends messages and the existing `watchMessage` listener already forwards arbitrary `{path, data}` pairs to JS. The new `/game/voice` path is handled entirely in the phone-side JS.

---

## Phase 2: AI Event Parsing (Phone Side)

### 2a. New Gemini prompt for voice event parsing

**File:** `src/constants/aiPrompts.ts` (add new constant)

```typescript
export const VOICE_EVENT_PROMPT =
    'You are a football match event parser. Given a spoken commentary snippet and a list of players, ' +
    'extract structured match events.\n\n' +
    'Player list (with teams):\n{PLAYERS}\n\n' +
    'Rules:\n' +
    '- Match player names fuzzily (nicknames, shortened names, phonetic matches)\n' +
    '- Each event has: type (goal | assist | save | card | sub | note), playerId, description\n' +
    '- If someone "scored", that is a goal event\n' +
    '- If someone provided the pass/cross/through-ball, that is an assist event\n' +
    '- If you cannot confidently match a name, set playerId to null and keep the raw name in "rawName"\n' +
    '- Return ONLY valid JSON array, no markdown fences, no explanation\n\n' +
    'Example input: "Warren scored a great goal, low cross from James"\n' +
    'Example output: [{"type":"goal","playerId":"user123","rawName":"Warren","description":"great goal"},{"type":"assist","playerId":"user456","rawName":"James","description":"low cross"}]\n\n' +
    'Transcript: "{TRANSCRIPT}"';
```

### 2b. Voice event parsing utility

**File:** `src/utils/voiceEventParser.ts` (new file)

```typescript
interface VoiceEvent {
    type: 'goal' | 'assist' | 'save' | 'card' | 'sub' | 'note';
    playerId: string | null;  // matched player ID or null
    rawName: string;           // name as spoken
    description: string;       // contextual detail
    confidence: 'high' | 'low'; // was the name match confident?
}

export async function parseVoiceTranscript(
    transcript: string,
    players: { playerId: string; name: string; teamIndex: number }[],
    elapsedSec?: number,
): Promise<VoiceEvent[]> {
    // 1. Build player list string for prompt
    // 2. Call callGemini() with VOICE_EVENT_PROMPT (substituting players + transcript)
    // 3. Parse JSON response
    // 4. Post-process: fuzzy match any null playerIds against player list
    //    using Levenshtein distance or simple normalization (lowercase, strip spaces)
    // 5. Tag confidence level
    // 6. Return structured events
}
```

**Fuzzy name matching strategy:**
- Normalize: lowercase, trim, remove common suffixes ("y", "ie", "o")
- Check if spoken name is a substring of any player name (or vice versa)
- Levenshtein distance ≤ 2 for short names
- If multiple matches, mark as low confidence (needs confirmation)
- If zero matches, keep rawName and let user pick from roster

### 2c. Wire into handleWatchMessage

**File:** `src/pages/GamePage.tsx`

Add a new case in the `handleWatchMessage` switch:

```typescript
case '/game/voice': {
    // data: "gameId|transcript|elapsedSec"
    if (parts.length >= 2) {
        const transcript = parts[1];
        const elapsedSec = parts.length >= 3 ? parseInt(parts[2]) : undefined;
        const allPlayers = generatedTeams.flatMap((t, i) =>
            t.players.map(p => ({ playerId: p.playerId ?? `guest:${p.name}`, name: p.name, teamIndex: i }))
        );
        const events = await parseVoiceTranscript(transcript, allPlayers, elapsedSec);
        // Show confirmation UI or auto-apply high-confidence events
        handleVoiceEvents(events, elapsedSec);
    }
    break;
}
```

---

## Phase 3: Confirmation UX

### 3a. Voice event confirmation component

**File:** `src/components/VoiceEventConfirmation.tsx` (new file)

A slide-up toast/bottom sheet that shows parsed events for quick confirm/edit/dismiss:

```
┌─────────────────────────────────────┐
│  🎙️ Voice Note                    ✕ │
│                                     │
│  ⚽ Goal — Warren         ✓  ✏️  ✕  │
│  🅰️ Assist — James        ✓  ✏️  ✕  │
│                                     │
│  [ Confirm All ]    [ Dismiss ]     │
└─────────────────────────────────────┘
```

- **High confidence** events: pre-checked, one tap to confirm all
- **Low confidence** events: highlighted in amber, edit button opens player picker
- **Unmatched names**: shown with "?" icon, must pick from roster to confirm
- Auto-dismiss after 10 seconds if no interaction (events are discarded)

### 3b. Apply confirmed events

When confirmed, call existing handlers:
- `goal` → `handleGoalChange(playerId, 1, goalTimeSec)`
- `assist` → `handleAssistChange(playerId, 1)` (if `enableAssists`)
- `note` → Could store as match commentary (future: `matchNotes[]` field on Game)

---

## Phase 4: Optional Enhancements (Future)

### 4a. Phone-side voice input (no watch needed)
- Add a mic button to the `MatchStep` UI on the phone too
- Same flow: Web Speech API (`webkitSpeechRecognition`) or Capacitor speech plugin
- Useful for people without a smartwatch

### 4b. Rich match commentary
- Add a `matchEvents: MatchEvent[]` field to the Game document:
  ```typescript
  interface MatchEvent {
      type: 'goal' | 'assist' | 'save' | 'card' | 'sub' | 'note';
      playerId?: string;
      description: string;
      elapsedSec: number;
      source: 'voice' | 'manual' | 'watch';
      rawTranscript?: string;
  }
  ```
- Feed this into the existing AI match summary for richer post-game write-ups
- "Warren opened the scoring with a tap-in from James's low cross on 12 minutes"

### 4c. Batch voice notes
- Allow longer voice notes covering multiple events:
  *"First half was tight, Warren scored from a James cross around 15 minutes, then Dave equalized just before half time with a screamer from outside the box"*
- Gemini handles this naturally — the prompt already supports multiple events per transcript

### 4d. Watch-side confirmation
- For quick events, show a brief confirmation on the watch face itself:
  `"⚽ Warren (assist: James) — OK?"` with ✓/✕ buttons
- Only send to phone after watch-side confirm
- Reduces phone interaction during the match

---

## Implementation Order (Recommended)

| Step | What | Effort | Depends On |
|------|------|--------|------------|
| 1 | Gemini prompt + `voiceEventParser.ts` | 2-3 hrs | Nothing — can test with hardcoded strings |
| 2 | `VoiceEventConfirmation.tsx` component | 2-3 hrs | Step 1 |
| 3 | Wire into `GamePage.tsx` handleWatchMessage | 1 hr | Steps 1 & 2 |
| 4 | WearOS mic button + SpeechRecognizer | 3-4 hrs | Kotlin/WearOS work |
| 5 | Phone-side mic button (Web Speech API) | 1-2 hrs | Steps 1 & 2 (no watch needed) |
| 6 | Match events data model expansion | 2-3 hrs | Optional, for richer summaries |

**Total estimated effort: ~10-15 hours of focused work**

Steps 1-3 can be built and tested entirely without touching the watch app (using simulated messages). Step 5 gives the feature to all users, not just watch owners.

---

## Key Decisions to Make

1. **Confirmation on watch vs phone?** — Recommend phone initially (simpler, more screen space for player picker on ambiguous names). Watch-side confirm is a nice Phase 4 add.

2. **Event types beyond goals/assists?** — Start with just goals + assists (the data model already supports these). Cards, subs, and commentary notes can come later with the `matchEvents[]` field.

3. **Offline handling?** — Speech recognition works offline on WearOS. If the phone has no network for Gemini, queue the transcript and process when back online (or fall back to simple regex matching for obvious patterns like "X scored").

4. **Rate limiting?** — One Gemini call per voice note is lightweight. The existing proxy auth + rate limiter should be sufficient. Could add a cooldown (e.g. max 1 voice note per 10 seconds) to prevent accidental spam.
