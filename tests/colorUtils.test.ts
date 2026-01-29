import { describe, it, expect } from 'vitest';
import { areColorsTooSimilar, pickSecondColor } from '../src/utils/colorUtils';

function withMockedRandom(value: number, fn: () => void) {
    const original = Math.random;
    Math.random = () => value;
    try { fn(); } finally { Math.random = original; }
}

describe('areColorsTooSimilar', () => {
    it('detects similar colours', () => {
        expect(areColorsTooSimilar('#ff0000', '#ff0001')).toBe(true);
    });

    it('detects distinct colours', () => {
        expect(areColorsTooSimilar('#ff0000', '#0000ff')).toBe(false);
    });
});

describe('pickSecondColor', () => {
    it('avoids similar colour when possible', () => {
        withMockedRandom(0, () => {
            const palette = ['#ff0000', '#ff0101', '#0000ff'];
            const result = pickSecondColor('#ff0000', palette);
            expect(result).toBe('#0000ff');
        });
    });

    it('falls back when all colours similar', () => {
        withMockedRandom(0, () => {
            const palette = ['#ff0000', '#ff0001', '#ff0002'];
            const result = pickSecondColor('#ff0000', palette);
            expect(result).toBe('#ff0001');
        });
    });
});
