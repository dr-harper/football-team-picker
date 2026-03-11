import { describe, it, expect, vi } from 'vitest';
import { hexToRgb, colorDistance, areColorsTooSimilar, pickSecondColor } from '../../src/utils/colorUtils';

describe('hexToRgb', () => {
    it('parses 6-digit hex correctly', () => {
        expect(hexToRgb('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('parses without hash prefix', () => {
        expect(hexToRgb('00ff00')).toEqual({ r: 0, g: 255, b: 0 });
    });

    it('expands 3-digit hex shorthand', () => {
        expect(hexToRgb('#f00')).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('parses white correctly', () => {
        expect(hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
    });

    it('parses black correctly', () => {
        expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
    });

    it('returns null for invalid input', () => {
        expect(hexToRgb('invalid')).toBeNull();
    });

    it('returns null for wrong length', () => {
        expect(hexToRgb('#12345')).toBeNull();
    });
});

describe('colorDistance', () => {
    it('returns 0 for identical colours', () => {
        expect(colorDistance('#ff0000', '#ff0000')).toBe(0);
    });

    it('returns correct Euclidean distance', () => {
        // black to white: sqrt(255^2 + 255^2 + 255^2) ≈ 441.67
        const dist = colorDistance('#000000', '#ffffff');
        expect(dist).toBeCloseTo(441.67, 1);
    });

    it('returns Infinity when either colour is invalid', () => {
        expect(colorDistance('#ff0000', 'invalid')).toBe(Infinity);
    });
});

describe('areColorsTooSimilar', () => {
    it('returns true for identical colours', () => {
        expect(areColorsTooSimilar('#ff0000', '#ff0000')).toBe(true);
    });

    it('returns true for very similar colours below threshold', () => {
        // #ff0000 and #ff0a00 — small difference
        expect(areColorsTooSimilar('#ff0000', '#ff0a00')).toBe(true);
    });

    it('returns false for very different colours', () => {
        expect(areColorsTooSimilar('#ff0000', '#0000ff')).toBe(false);
    });

    it('accepts custom threshold', () => {
        // Distance between #ff0000 and #ff0a00 is 10
        expect(areColorsTooSimilar('#ff0000', '#ff0a00', 5)).toBe(false);  // 10 > 5, not too similar
        expect(areColorsTooSimilar('#ff0000', '#ff0a00', 500)).toBe(true); // 10 < 500, too similar
    });
});

describe('pickSecondColor', () => {
    it('never returns the primary colour', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0);
        const palette = ['#ff0000', '#0000ff', '#00ff00'];
        const result = pickSecondColor('#ff0000', palette);
        expect(result).not.toBe('#ff0000');
        vi.restoreAllMocks();
    });

    it('avoids similar colours when possible', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0);
        const palette = ['#ff0000', '#ff0100', '#0000ff'];
        const result = pickSecondColor('#ff0000', palette);
        // Should pick #0000ff as it's the only dissimilar option
        expect(result).toBe('#0000ff');
        vi.restoreAllMocks();
    });

    it('falls back to any non-primary colour when all are similar', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0);
        const palette = ['#ff0000', '#ff0100', '#ff0200'];
        const result = pickSecondColor('#ff0000', palette);
        expect(result).not.toBe('#ff0000');
        vi.restoreAllMocks();
    });
});
