import { describe, it, expect } from 'vitest';
import { describeWeatherCode } from '../../src/utils/weather';

describe('describeWeatherCode', () => {
    it('returns clear sky for code 0', () => {
        expect(describeWeatherCode(0)).toEqual({ emoji: '☀️', label: 'Clear sky' });
    });

    it('returns partly cloudy for codes 1-2', () => {
        expect(describeWeatherCode(1).label).toBe('Partly cloudy');
        expect(describeWeatherCode(2).label).toBe('Partly cloudy');
    });

    it('returns overcast for code 3', () => {
        expect(describeWeatherCode(3).label).toBe('Overcast');
    });

    it('returns foggy for codes 4-49', () => {
        expect(describeWeatherCode(45).label).toBe('Foggy');
        expect(describeWeatherCode(48).label).toBe('Foggy');
    });

    it('returns drizzle for codes 50-57', () => {
        expect(describeWeatherCode(51).label).toBe('Drizzle');
        expect(describeWeatherCode(57).label).toBe('Drizzle');
    });

    it('returns rain for codes 58-67', () => {
        expect(describeWeatherCode(61).label).toBe('Rain');
        expect(describeWeatherCode(67).label).toBe('Rain');
    });

    it('returns snow for codes 68-77', () => {
        expect(describeWeatherCode(71).label).toBe('Snow');
        expect(describeWeatherCode(77).label).toBe('Snow');
    });

    it('returns rain showers for codes 78-82', () => {
        expect(describeWeatherCode(80).label).toBe('Rain showers');
        expect(describeWeatherCode(82).label).toBe('Rain showers');
    });

    it('returns snow showers for codes 83-86', () => {
        expect(describeWeatherCode(85).label).toBe('Snow showers');
        expect(describeWeatherCode(86).label).toBe('Snow showers');
    });

    it('returns thunderstorm for codes 87-99', () => {
        expect(describeWeatherCode(95).label).toBe('Thunderstorm');
        expect(describeWeatherCode(99).label).toBe('Thunderstorm');
    });

    it('returns unknown for codes >= 100', () => {
        expect(describeWeatherCode(100).label).toBe('Unknown');
        expect(describeWeatherCode(999).label).toBe('Unknown');
    });

    it('always includes an emoji', () => {
        for (const code of [0, 1, 3, 45, 51, 61, 71, 80, 85, 95, 100]) {
            expect(describeWeatherCode(code).emoji).toBeTruthy();
        }
    });
});
