/** Minimum number of players required (two 5-a-side teams) */
export const MIN_PLAYERS = 10;

/** Maximum number of players allowed */
export const MAX_PLAYERS = 16;

/** Number of teams generated per setup */
export const NUM_TEAMS = 2;

/** Range for outfield shirt numbers (goalkeeper always gets 1) */
export const SHIRT_NUMBER_MIN = 2;
export const SHIRT_NUMBER_MAX = 21;

/** Bold colours available for team shirts */
export const BOLD_COLOURS: string[] = [
    '#ff0000', '#0000ff', '#00ff00', '#ff00ff',
    '#00ffff', '#ff4500', '#8a2be2', '#ff1493', '#1e90ff',
];

/** How long toast notifications remain visible (ms) */
export const NOTIFICATION_TIMEOUT_MS = 5000;

/** Maximum name uniqueness attempts before fallback */
export const TEAM_NAME_MAX_ATTEMPTS = 20;

/** Rate limit intervals (ms) */
export const GEOLOCATION_THROTTLE_MS = 10_000;
export const GEMINI_VALIDATION_THROTTLE_MS = 5_000;
export const AI_SUMMARY_THROTTLE_MS = 10_000;
export const AI_FIX_INPUT_THROTTLE_MS = 5_000;
