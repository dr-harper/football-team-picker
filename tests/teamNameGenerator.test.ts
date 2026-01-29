import { describe, it, expect } from 'vitest';
import { generateTeamName } from '../src/utils/teamNameGenerator';

const PLACES = ['Alpha', 'Beta', 'Gamma'];

describe('generateTeamName', () => {
    it('returns a string with place and suffix', () => {
        const name = generateTeamName(new Set(), PLACES);
        expect(name).toBeDefined();
        expect(typeof name).toBe('string');
        // Should contain at least one of the places
        const containsPlace = PLACES.some(p => (name as string).startsWith(p));
        expect(containsPlace).toBe(true);
    });

    it('avoids duplicating existing names', () => {
        const existing = new Set<string>();
        const names: string[] = [];
        for (let i = 0; i < 5; i++) {
            const name = generateTeamName(existing, PLACES) as string;
            existing.add(name);
            names.push(name);
        }
        expect(new Set(names).size).toBe(names.length);
    });

    it('generates names even with limited places', () => {
        const name = generateTeamName(new Set(), ['OnlyPlace']);
        expect(name).toBeDefined();
        expect((name as string).startsWith('OnlyPlace')).toBe(true);
    });
});
