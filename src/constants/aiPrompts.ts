/** Base URL for the Google Gemini generative language API */
export const GEMINI_API_BASE_URL =
    'https://generativelanguage.googleapis.com/v1beta/models';

/** Build the full Gemini endpoint for a given model */
export const geminiEndpoint = (model: string, key: string): string =>
    `${GEMINI_API_BASE_URL}/${model}:generateContent?key=${key}`;

/**
 * Prompt for a short one-line description of a specific team matchup.
 * The caller appends the matchup names.
 */
export const SETUP_TAGLINE_PROMPT =
    'Write a single short, funny line (no markdown, no quotes, max 14 words) for a 5-a-side football team vote. ' +
    'Call out one or two specific player names in a cheeky way — put them on the spot or big them up. ' +
    'You can also riff on the team names. Add one emoji at the end. Return only the line, nothing else. ' +
    'Important: only mention clean sheets if the player being called out is a goalkeeper (role: #g).';

/** System prompt sent when generating a pre-match hype summary */
export const MATCH_SUMMARY_PROMPT =
    'Write a colourful, fun, and slightly cheeky pre-match hype summary for this football game ' +
    '(the match has not been played yet). Mention the teams, their names, and comment on the players ' +
    'and their roles. Be creative and playful, add some relevant emojis, and keep it under 100 words. ' +
    'Format your response in markdown.';

/** System prompt for the AI "Fix Input" feature that cleans up player lists */
export const FIX_INPUT_PROMPT =
    'You are a helper for a 5-a-side football team picker app. ' +
    'The user has entered a messy player list. Clean it up so every player is on their own line. ' +
    'Valid tags (appended after the name with a space): #g = goalkeeper, #s = striker, #d = defender, #1 or #t1 = lock to team 1, #2 or #t2 = lock to team 2. ' +
    'Rules:\n' +
    '- One player per line\n' +
    '- Trim extra whitespace\n' +
    '- Fix obvious misspellings of tags (e.g. "#goalie" → "#g", "#gk" → "#g", "#striker" → "#s", "#def" → "#d")\n' +
    '- Preserve the original player names as-is (do NOT rename players)\n' +
    '- Remove numbering, bullets, or other formatting\n' +
    '- If names are comma-separated or semicolon-separated, split them onto separate lines\n' +
    '- Return ONLY the cleaned player list, nothing else — no explanation, no markdown fences';

/**
 * Prompt for parsing voice transcripts into structured match events.
 * The caller appends the player roster as a JSON array.
 */
export const VOICE_EVENT_PROMPT =
    'You are a football match voice note parser. Given a voice transcript and a player roster, ' +
    'extract structured events. Return a JSON array (no markdown fences, just raw JSON).\n\n' +
    'Each event object has:\n' +
    '- "type": "goal" | "own-goal" | "assist" | "penalty-scored" | "penalty-missed" | "penalty-conceded" | "save" | "tackle" | "card" | "swap" | "highlight" | "note"\n' +
    '- "playerName": string (the player\'s name from the roster, or null for pure notes)\n' +
    '- "assisterName": string | null (if type=goal and someone set it up)\n' +
    '- "cardColour": "yellow" | "red" | null (only if type=card)\n' +
    '- "description": string (short 3-6 word label, e.g. "tap-in from close range")\n\n' +
    'Event types:\n' +
    '- "goal": a goal was scored\n' +
    '- "own-goal": a player accidentally scored against their own team\n' +
    '- "penalty-scored": a penalty kick was scored\n' +
    '- "penalty-missed": a penalty was taken but missed or saved\n' +
    '- "penalty-conceded": a player gave away a penalty\n' +
    '- "save": a notable save by a goalkeeper\n' +
    '- "tackle": outstanding defending — a block, clearance, or tackle that stops a goal\n' +
    '- "card": a yellow or red card / foul (even informal)\n' +
    '- "swap": a player switching teams to balance the match\n' +
    '- "highlight": a notable moment worth remembering (great skill, near miss, funny moment)\n' +
    '- "note": general commentary that doesn\'t fit other categories\n\n' +
    'Rules:\n' +
    '- Match player names fuzzily — "Waz" could be "Warren", "Jim" could be "James"\n' +
    '- If a goal AND assist are mentioned, return TWO events: one goal + one assist\n' +
    '- If no player can be matched, set playerName to null\n' +
    '- Always preserve the original meaning — don\'t invent events not in the transcript\n' +
    '- Return [] if the transcript is empty or unintelligible\n\n' +
    'Examples:\n' +
    '- "Warren scores, great cross from James" → [{"type":"goal","playerName":"Warren","assisterName":"James","cardColour":null,"description":"goal from cross"},{"type":"assist","playerName":"James","assisterName":null,"cardColour":null,"description":"cross to Warren"}]\n' +
    '- "Great save by Colin" → [{"type":"save","playerName":"Colin","assisterName":null,"cardColour":null,"description":"great save"}]\n' +
    '- "Amazing block by Pete, stopped a certain goal" → [{"type":"tackle","playerName":"Pete","assisterName":null,"cardColour":null,"description":"goal-line block"}]\n' +
    '- "Warren swap to the other team" → [{"type":"swap","playerName":"Warren","assisterName":null,"cardColour":null,"description":"switched teams"}]\n' +
    '- "Warren for Ben" or "swap Warren and Ben" → [{"type":"swap","playerName":"Warren","assisterName":"Ben","cardColour":null,"description":"swapped with Ben"}]\n' +
    '- "Yellow card for Ben, bad tackle" → [{"type":"card","playerName":"Ben","assisterName":null,"cardColour":"yellow","description":"bad tackle"}]\n' +
    '- "Incredible skill by James, nutmegged two players" → [{"type":"highlight","playerName":"James","assisterName":null,"cardColour":null,"description":"nutmegged two players"}]\n\n' +
    'Player roster:\n';

/**
 * Prompt for generating a post-match summary from structured match data.
 * The caller appends the match context as structured text.
 */
export const MATCH_SUMMARY_FROM_EVENTS_PROMPT =
    'You are a football match reporter. Write a punchy match report (40-80 words) based on the data below. ' +
    'Style: fun, cheeky, like 5-a-side banter — not formal commentary. ' +
    'Rules:\n' +
    '- Mention the final score and team names\n' +
    '- Team names are NOT locations — don\'t say "at [team name]"\n' +
    '- Look at the goal timeline for the NARRATIVE: comebacks, dominant spells, late drama. This is the most important part\n' +
    '- Call out standout players — hat-tricks, key goals, great saves\n' +
    '- Reference specific moments from match notes if interesting (great skill, funny incidents)\n' +
    '- Use British English spelling\n' +
    '- Add 1-2 relevant emojis\n' +
    '- ONLY mention Man of the Match if one is explicitly listed in the data. Don\'t invent one\n' +
    '- Don\'t list every goal — tell the story of how the match unfolded\n' +
    '- Return only the report text, no markdown fences or headings\n\n' +
    'Match data:\n';

/** Phrases appended in Warren Mode when aggression threshold is met */
export const WARREN_NASTY_PHRASES: string[] = [
    ' Sort it out, pal!',
    " Honestly, that's pathetic.",
    'Use your eyes, mate!',
    "That's a fucking disgrace!",
];

/** Phrases appended in Warren Mode when aggression threshold is not met */
export const WARREN_LOVELY_PHRASES: string[] = [
    " You're doing great!",
    ' Lovely stuff!',
    ' Keep it up, legend!',
    ' Fucking great work, mate!',
];
