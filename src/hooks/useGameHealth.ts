import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { deriveAllMetrics, type DerivedMetrics, type HeartRateSample, type SpeedSample, type ActivePeriod, type HrZone } from '../utils/healthMetrics';

export interface GameHealthData {
    steps?: number;
    calories?: number;
    distance?: number; // metres
    heartRateAvg?: number;
    heartRateMax?: number;
    heartRateSamples?: HeartRateSample[];
    duration?: number; // seconds
    workoutType?: string;
    // Derived metrics
    avgSpeedKmh?: number;
    topSpeedKmh?: number;
    paceMinPerKm?: number;
    speedSamples: SpeedSample[];
    heartRateZones: HrZone[];
    intensityScore: number;
    activePeriods: ActivePeriod[];
    activeMinutes: number;
    sprintCount: number;
}

interface UseGameHealthResult {
    data: GameHealthData | null;
    loading: boolean;
    error: string | null;
    isNative: boolean;
    available: boolean;
    permissionGranted: boolean;
    requestPermission: () => Promise<void>;
    openPlayStore: () => Promise<void>;
}

const HEALTH_PERMS = ['READ_STEPS', 'READ_ACTIVE_CALORIES', 'READ_DISTANCE', 'READ_HEART_RATE'] as const;

// Plugin returns permissions as an object {READ_STEPS: true, ...} not an array
function areAllPermissionsGranted(perms: unknown): boolean {
    if (perms && typeof perms === 'object' && !Array.isArray(perms)) {
        return Object.values(perms).every(v => v === true);
    }
    return false;
}

export function useGameHealth(gameDate: number | undefined, gameStatus: string | undefined, matchDurationMinutes = 60): UseGameHealthResult {
    const [data, setData] = useState<GameHealthData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [available, setAvailable] = useState(false);
    const [permissionGranted, setPermissionGranted] = useState(false);

    const isNative = Capacitor.isNativePlatform();
    const isCompletedOrInProgress = gameStatus === 'completed' || gameStatus === 'in_progress';

    // Check availability on mount
    useEffect(() => {
        if (!isNative) return;

        (async () => {
            try {
                const { Health } = await import('capacitor-health');
                const { available: isAvailable } = await Health.isHealthAvailable();
                setAvailable(isAvailable);

                if (isAvailable) {
                    try {
                        const result = await Health.checkHealthPermissions({
                            permissions: [...HEALTH_PERMS],
                        });
                        setPermissionGranted(areAllPermissionsGranted(result.permissions));
                    } catch {
                        setPermissionGranted(false);
                    }
                }
            } catch {
                setAvailable(false);
            }
        })();
    }, [isNative]);

    const recheckPermissions = useCallback(async () => {
        try {
            const { Health } = await import('capacitor-health');
            const result = await Health.checkHealthPermissions({
                permissions: [...HEALTH_PERMS],
            });
            setPermissionGranted(areAllPermissionsGranted(result.permissions));
        } catch {
            // ignore
        }
    }, []);

    // Re-check permissions when app resumes (e.g. after returning from permissions dialog)
    useEffect(() => {
        if (!isNative || !available) return;

        let cleanup: (() => void) | undefined;
        (async () => {
            const { App } = await import('@capacitor/app');
            const listener = await App.addListener('appStateChange', ({ isActive }) => {
                if (isActive) recheckPermissions();
            });
            cleanup = () => listener.remove();
        })();

        return () => { cleanup?.(); };
    }, [isNative, available, recheckPermissions]);

    const requestPermission = useCallback(async () => {
        if (!isNative) return;
        try {
            const { Health } = await import('capacitor-health');
            Health.requestHealthPermissions({
                permissions: [...HEALTH_PERMS],
            }).then(result => {
                setPermissionGranted(areAllPermissionsGranted(result.permissions));
            }).catch(() => {
                // Permissions will be re-checked on app resume via appStateChange listener
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to request permissions');
        }
    }, [isNative]);

    const openPlayStore = useCallback(async () => {
        if (!isNative) return;
        try {
            const { Health } = await import('capacitor-health');
            await Health.showHealthConnectInPlayStore();
        } catch {
            window.open('https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata', '_system');
        }
    }, [isNative]);

    // Fetch health data when permissions are granted and game is completed/in_progress
    useEffect(() => {
        if (!isNative || !available || !permissionGranted || !gameDate || !isCompletedOrInProgress) return;

        const fetchData = async () => {
            setLoading(true);
            setError(null);

            try {
                const { Health } = await import('capacitor-health');

                const matchDurationMs = matchDurationMinutes * 60 * 1000;
                const startDate = new Date(gameDate).toISOString();
                const endDate = new Date(gameDate + matchDurationMs).toISOString();

                // Try workouts first — gives the richest data
                const workoutResult = await Health.queryWorkouts({
                    startDate,
                    endDate,
                    includeHeartRate: true,
                    includeRoute: true,
                    includeSteps: true,
                });

                if (workoutResult.workouts.length > 0) {
                    const workout = workoutResult.workouts.reduce((best, w) =>
                        w.duration > best.duration ? w : best
                    );

                    const hrSamples: HeartRateSample[] = workout.heartRate ?? [];
                    const avgHr = hrSamples.length > 0
                        ? Math.round(hrSamples.reduce((sum, s) => sum + s.bpm, 0) / hrSamples.length)
                        : undefined;
                    const maxHr = hrSamples.length > 0
                        ? Math.max(...hrSamples.map(s => s.bpm))
                        : undefined;

                    const route = workout.route ?? [];
                    const distMetres = workout.distance ? Math.round(workout.distance) : 0;
                    const durSecs = Math.round(workout.duration);

                    // Derive advanced metrics
                    const derived: DerivedMetrics = deriveAllMetrics({
                        heartRateSamples: hrSamples,
                        route,
                        distanceMetres: distMetres,
                        durationSeconds: durSecs,
                        gameStartMs: gameDate,
                        gameDurationMin: matchDurationMinutes,
                        maxHr: maxHr ? Math.max(maxHr, 180) : 190,
                    });

                    setData({
                        steps: workout.steps,
                        calories: Math.round(workout.calories),
                        distance: distMetres || undefined,
                        heartRateAvg: avgHr,
                        heartRateMax: maxHr,
                        heartRateSamples: hrSamples,
                        duration: durSecs,
                        workoutType: workout.workoutType,
                        ...derived,
                    });
                } else {
                    // Fallback: query aggregated steps and calories
                    const [stepsResult, caloriesResult] = await Promise.all([
                        Health.queryAggregated({ startDate, endDate, dataType: 'steps', bucket: 'hour' }),
                        Health.queryAggregated({ startDate, endDate, dataType: 'active-calories', bucket: 'hour' }),
                    ]);

                    const totalSteps = stepsResult.aggregatedData.reduce((sum, d) => sum + d.value, 0);
                    const totalCalories = caloriesResult.aggregatedData.reduce((sum, d) => sum + d.value, 0);

                    if (totalSteps > 0 || totalCalories > 0) {
                        setData({
                            steps: totalSteps > 0 ? Math.round(totalSteps) : undefined,
                            calories: totalCalories > 0 ? Math.round(totalCalories) : undefined,
                            speedSamples: [],
                            heartRateZones: [],
                            intensityScore: 0,
                            activePeriods: [],
                            activeMinutes: 0,
                            sprintCount: 0,
                        });
                    } else {
                        setData(null);
                    }
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load health data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [isNative, available, permissionGranted, gameDate, isCompletedOrInProgress, matchDurationMinutes]);

    return { data, loading, error, isNative, available, permissionGranted, requestPermission, openPlayStore };
}
