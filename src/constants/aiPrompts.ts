/** Base URL for the Google Gemini generative language API */
export const GEMINI_API_BASE_URL =
    'https://generativelanguage.googleapis.com/v1beta/models';

/** Build the full Gemini endpoint for a given model */
export const geminiEndpoint = (model: string, key: string): string =>
    `${GEMINI_API_BASE_URL}/${model}:generateContent?key=${key}`;

/** System prompt sent when generating a pre-match hype summary */
export const MATCH_SUMMARY_PROMPT =
    'Write a colourful, fun, and slightly cheeky pre-match hype summary for this football game ' +
    '(the match has not been played yet). Mention the teams, their names, and comment on the players ' +
    'and their roles. Be creative and playful, add some relevant emojis, and keep it under 100 words. ' +
    'Format your response in markdown.';

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
