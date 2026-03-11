import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createThrottle } from '../../src/utils/rateLimiter';

describe('createThrottle', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('executes immediately on first call', () => {
        const fn = vi.fn().mockReturnValue('result');
        const throttled = createThrottle(fn, 1000);
        expect(throttled()).toBe('result');
        expect(fn).toHaveBeenCalledOnce();
    });

    it('returns undefined for calls within interval', () => {
        const fn = vi.fn().mockReturnValue('result');
        const throttled = createThrottle(fn, 1000);
        throttled(); // first call
        expect(throttled()).toBeUndefined();
        expect(fn).toHaveBeenCalledOnce();
    });

    it('executes again after interval has elapsed', () => {
        const fn = vi.fn().mockReturnValue('result');
        const throttled = createThrottle(fn, 1000);
        throttled(); // first call
        vi.advanceTimersByTime(1001);
        expect(throttled()).toBe('result');
        expect(fn).toHaveBeenCalledTimes(2);
    });

    it('passes arguments through', () => {
        const fn = vi.fn((...args: unknown[]) => args);
        const throttled = createThrottle(fn, 1000);
        throttled('a', 'b');
        expect(fn).toHaveBeenCalledWith('a', 'b');
    });

    it('blocks multiple rapid calls', () => {
        const fn = vi.fn();
        const throttled = createThrottle(fn, 500);
        throttled();
        throttled();
        throttled();
        throttled();
        expect(fn).toHaveBeenCalledOnce();
    });
});
