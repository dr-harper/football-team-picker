/** Maximum length for a player name */
export const MAX_NAME_LENGTH = 30;

/** Pattern for valid characters in a player name (letters, spaces, hyphens, apostrophes) */
const VALID_NAME_PATTERN = /^[a-zA-ZÀ-ÿ\s'\-]+$/;

/** Recognised player tags (case-insensitive, without the # prefix) */
const VALID_TAGS = new Set(['g', 's', 'd', '1', '2', 't1', 't2', 'team1', 'team2']);

export interface ValidationError {
    line: number;
    message: string;
}

/** Sanitise a single player name: trim whitespace, collapse internal spaces */
export function sanitisePlayerName(name: string): string {
    return name.trim().replace(/\s+/g, ' ');
}

/** Validate the full player input text and return any errors */
export function validatePlayerInput(text: string): ValidationError[] {
    const errors: ValidationError[] = [];
    const lines = text.split('\n');

    lines.forEach((rawLine, index) => {
        const line = rawLine.trim();
        if (!line) return; // skip blank lines

        const [nameRaw, ...rawTags] = line.split('#');
        const name = sanitisePlayerName(nameRaw);

        if (!name) {
            errors.push({ line: index + 1, message: 'Player name is empty' });
            return;
        }

        if (name.length > MAX_NAME_LENGTH) {
            errors.push({ line: index + 1, message: `Name exceeds ${MAX_NAME_LENGTH} characters` });
        }

        if (!VALID_NAME_PATTERN.test(name)) {
            errors.push({ line: index + 1, message: 'Name contains invalid characters' });
        }

        rawTags.forEach(rawTag => {
            const tag = rawTag.trim().toLowerCase().replace(/\s+/g, '');
            if (tag && !VALID_TAGS.has(tag)) {
                errors.push({ line: index + 1, message: `Unknown tag: #${rawTag.trim()}` });
            }
        });
    });

    return errors;
}
