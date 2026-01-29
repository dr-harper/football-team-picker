/**
 * Creates a throttle function that limits how frequently a function can be called.
 * The first call executes immediately; subsequent calls within the interval are ignored.
 */
export function createThrottle<T extends (...args: unknown[]) => unknown>(
    fn: T,
    intervalMs: number,
): (...args: Parameters<T>) => ReturnType<T> | undefined {
    let lastCallTime = 0;

    return (...args: Parameters<T>): ReturnType<T> | undefined => {
        const now = Date.now();
        if (now - lastCallTime >= intervalMs) {
            lastCallTime = now;
            return fn(...args) as ReturnType<T>;
        }
        return undefined;
    };
}
