/** Base URL for the Google Gemini generative language API */
export const GEMINI_API_BASE_URL =
    'https://generativelanguage.googleapis.com/v1beta/models';

/** Build the full Gemini endpoint for a given model */
export const geminiEndpoint = (model: string, key: string): string =>
    `${GEMINI_API_BASE_URL}/${model}:generateContent?key=${key}`;

/**
 * Prompt for generating a punchy one-liner intro to sit above the exported team image.
 * The caller appends the number of options and team names.
 */
export const VOTE_INTRO_PROMPT =
    'Write a single punchy line (no markdown, no quotes, max 15 words) to go above a football team vote image. ' +
    'Mention the team names provided and hype up the vote — which team will it be tonight? ' +
    'Add one relevant emoji at the start. Keep it fun and casual.';

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
