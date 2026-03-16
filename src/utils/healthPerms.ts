/** Health Connect permission strings used by the capacitor-health plugin */
export const HEALTH_PERMS = [
    'READ_STEPS',
    'READ_ACTIVE_CALORIES',
    'READ_DISTANCE',
    'READ_HEART_RATE',
    'READ_WORKOUTS',
] as const;

/** Base permissions that enable aggregated health data (steps, calories, distance, HR) */
export const BASE_HEALTH_PERMS = [
    'READ_STEPS',
    'READ_ACTIVE_CALORIES',
    'READ_DISTANCE',
    'READ_HEART_RATE',
] as const;

export type HealthPerm = (typeof HEALTH_PERMS)[number];

export function areAllPermissionsGranted(perms: unknown): boolean {
    if (perms && typeof perms === 'object' && !Array.isArray(perms)) {
        return Object.values(perms).every(v => v === true);
    }
    return false;
}

/** Check if at least the base permissions (excluding workouts) are granted */
export function areBasePermissionsGranted(perms: unknown): boolean {
    if (perms && typeof perms === 'object' && !Array.isArray(perms)) {
        const granted = perms as Record<string, boolean>;
        return BASE_HEALTH_PERMS.every(p => granted[p] === true);
    }
    return false;
}

/** Check if the workouts permission is granted */
export function isWorkoutsPermissionGranted(perms: unknown): boolean {
    if (perms && typeof perms === 'object' && !Array.isArray(perms)) {
        return (perms as Record<string, boolean>).READ_WORKOUTS === true;
    }
    return false;
}
