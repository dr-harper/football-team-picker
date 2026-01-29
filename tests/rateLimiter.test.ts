import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createThrottle } from '../src/utils/rateLimiter';

describe('createThrottle', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('executes immediately on first call', () => {
        const fn = vi.fn(() => 'result');
        const throttled = createThrottle(fn, 1000);
        const result = throttled();
        expect(fn).toHaveBeenCalledTimes(1);
        expect(result).toBe('result');
    });

    it('ignores calls within the throttle interval', () => {
        const fn = vi.fn();
        const throttled = createThrottle(fn, 1000);
        throttled();
        throttled();
        throttled();
        expect(fn).toHaveBeenCalledTimes(1);
    });

    it('allows calls after the interval has elapsed', () => {
        const fn = vi.fn();
        const throttled = createThrottle(fn, 1000);
        throttled();
        expect(fn).toHaveBeenCalledTimes(1);

        vi.advanceTimersByTime(1001);
        throttled();
        expect(fn).toHaveBeenCalledTimes(2);
    });

    it('returns undefined for throttled calls', () => {
        const fn = vi.fn(() => 42);
        const throttled = createThrottle(fn, 1000);
        throttled();
        const result = throttled();
        expect(result).toBeUndefined();
    });

    it('passes arguments through to the wrapped function', () => {
        const fn = vi.fn((a: unknown, b: unknown) => `${a}-${b}`);
        const throttled = createThrottle(fn, 1000);
        const result = throttled('hello', 'world');
        expect(fn).toHaveBeenCalledWith('hello', 'world');
        expect(result).toBe('hello-world');
    });

    it('respects different throttle intervals', () => {
        const fn = vi.fn();
        const throttled = createThrottle(fn, 500);
        throttled();
        expect(fn).toHaveBeenCalledTimes(1);

        vi.advanceTimersByTime(400);
        throttled();
        expect(fn).toHaveBeenCalledTimes(1);

        vi.advanceTimersByTime(101);
        throttled();
        expect(fn).toHaveBeenCalledTimes(2);
    });
});
