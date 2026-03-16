/** Health Connect permission strings used by the capacitor-health plugin */
export const HEALTH_PERMS = [
    'READ_STEPS',
    'READ_ACTIVE_CALORIES',
    'READ_DISTANCE',
    'READ_HEART_RATE',
    'READ_WORKOUTS',
] as const;

export type HealthPerm = (typeof HEALTH_PERMS)[number];

export function areAllPermissionsGranted(perms: unknown): boolean {
    if (perms && typeof perms === 'object' && !Array.isArray(perms)) {
        return Object.values(perms).every(v => v === true);
    }
    return false;
}
