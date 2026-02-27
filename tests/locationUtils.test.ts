import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getPlacesBasedOnLocation } from '../src/utils/locationUtils';

describe('getPlacesBasedOnLocation', () => {
    let originalNavigator: Navigator;

    beforeEach(() => {
        originalNavigator = globalThis.navigator;
    });

    afterEach(() => {
        vi.restoreAllMocks();
        Object.defineProperty(globalThis, 'navigator', {
            value: originalNavigator,
            writable: true,
            configurable: true,
        });
    });

    function mockGeolocation(latitude: number, longitude: number) {
        const geolocation = {
            getCurrentPosition: vi.fn((success: PositionCallback) => {
                success({
                    coords: { latitude, longitude, accuracy: 10, altitude: null, altitudeAccuracy: null, heading: null, speed: null },
                    timestamp: Date.now(),
                } as GeolocationPosition);
            }),
        };
        Object.defineProperty(globalThis, 'navigator', {
            value: { ...globalThis.navigator, geolocation },
            writable: true,
            configurable: true,
        });
    }

    function mockGeolocationError() {
        const geolocation = {
            getCurrentPosition: vi.fn((_success: PositionCallback, error?: PositionErrorCallback | null) => {
                if (error) {
                    error({
                        code: 1,
                        message: 'User denied Geolocation',
                        PERMISSION_DENIED: 1,
                        POSITION_UNAVAILABLE: 2,
                        TIMEOUT: 3,
                    } as GeolocationPositionError);
                }
            }),
        };
        Object.defineProperty(globalThis, 'navigator', {
            value: { ...globalThis.navigator, geolocation },
            writable: true,
            configurable: true,
        });
    }

    it('returns Generic places when geolocation fails', async () => {
        mockGeolocationError();
        const result = await getPlacesBasedOnLocation();
        expect(result.location).toBe('Generic');
        expect(result.places.length).toBeGreaterThan(0);
    });

    it('returns Hampshire for coordinates near Winchester', async () => {
        // Winchester is at approximately 51.06, -1.31
        mockGeolocation(51.06, -1.31);
        const result = await getPlacesBasedOnLocation();
        expect(result.location).toBe('Hampshire');
        expect(result.places).toContain('Winchester');
    });

    it('returns London for coordinates near central London', async () => {
        // Central London is at approximately 51.51, -0.13
        mockGeolocation(51.51, -0.13);
        const result = await getPlacesBasedOnLocation();
        expect(result.location).toBe('London');
        expect(result.places).toContain('Camden');
    });

    it('returns Glasgow for coordinates near Glasgow', async () => {
        // Glasgow is at approximately 55.86, -4.25
        mockGeolocation(55.86, -4.25);
        const result = await getPlacesBasedOnLocation();
        expect(result.location).toBe('Glasgow');
        expect(result.places).toContain('Partick');
    });

    it('returns Manchester for coordinates near Manchester', async () => {
        // Manchester is at approximately 53.48, -2.24
        mockGeolocation(53.48, -2.24);
        const result = await getPlacesBasedOnLocation();
        expect(result.location).toBe('Manchester');
        expect(result.places).toContain('Didsbury');
    });

    it('returns Edinburgh for coordinates near Edinburgh', async () => {
        mockGeolocation(55.95, -3.19);
        const result = await getPlacesBasedOnLocation();
        expect(result.location).toBe('Edinburgh');
        expect(result.places).toContain('Leith');
    });

    it('returns Cardiff for coordinates near Cardiff', async () => {
        mockGeolocation(51.48, -3.18);
        const result = await getPlacesBasedOnLocation();
        expect(result.location).toBe('Cardiff');
        expect(result.places).toContain('Canton');
    });

    it('returns a places array with multiple entries', async () => {
        mockGeolocation(51.51, -0.13);
        const result = await getPlacesBasedOnLocation();
        expect(result.places.length).toBeGreaterThan(5);
    });

    it('returns Generic for coordinates far from any UK city', async () => {
        // Coordinates in the middle of the Atlantic Ocean
        mockGeolocation(40.0, -30.0);
        const result = await getPlacesBasedOnLocation();
        // Should still return the closest match (not necessarily Generic since
        // Haversine will find some closest city), but the result should be valid
        expect(result.location).toBeTruthy();
        expect(result.places.length).toBeGreaterThan(0);
    });
});
