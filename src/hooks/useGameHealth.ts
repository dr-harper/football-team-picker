import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { deriveAllMetrics, downsampleTimeSeries, type DerivedMetrics, type HeartRateSample, type SpeedSample, type ActivePeriod, type HrZone } from '../utils/healthMetrics';
import { saveGameHealth, getMyGameHealth, getHealthSharingByLeague, getHealthSharingDefault, getHealthSyncEnabled } from '../utils/firestore';
import { logger } from '../utils/logger';
import { HEALTH_PERMS, areBasePermissionsGranted, isWorkoutsPermissionGranted } from '../utils/healthPerms';
import type { StoredGameHealth } from '../types';

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
    distanceBuckets?: { startMin: number; endMin: number; distanceM: number }[];
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
    /** Whether the stored data is shared with league members */
    shared: boolean;
    /** Whether a sharing toggle is in progress */
    sharingLoading: boolean;
    /** Toggle sharing for this game's health data */
    toggleSharing: () => Promise<void>;
    /** Whether data was loaded from Firestore (not live from device) */
    fromStore: boolean;
}

const MAX_HR_SAMPLES = 100;
const MAX_SPEED_SAMPLES = 80;

export function useGameHealth(
    gameDate: number | undefined,
    gameStatus: string | undefined,
    matchDurationMinutes = 60,
    gameId?: string,
    userId?: string,
    leagueId?: string,
): UseGameHealthResult {
    const [data, setData] = useState<GameHealthData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [available, setAvailable] = useState(false);
    const [permissionGranted, setPermissionGranted] = useState(false);
    const [shared, setShared] = useState(false);
    const [sharingLoading, setSharingLoading] = useState(false);
    const [fromStore, setFromStore] = useState(false);

    const isNative = Capacitor.isNativePlatform();
    const isCompletedOrInProgress = gameStatus === 'completed' || gameStatus === 'in_progress';

    // Check availability on mount (native only)
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
                        setPermissionGranted(areBasePermissionsGranted(result.permissions));
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
            setPermissionGranted(areBasePermissionsGranted(result.permissions));
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
                setPermissionGranted(areBasePermissionsGranted(result.permissions));
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

    // Toggle sharing for this game's health data
    const toggleSharing = useCallback(async () => {
        if (!gameId || !userId || sharingLoading) return;
        setSharingLoading(true);
        try {
            const { updateGameHealthSharing } = await import('../utils/firestore');
            const newShared = !shared;
            await updateGameHealthSharing(gameId, userId, newShared);
            setShared(newShared);
        } catch (err) {
            logger.error('Failed to toggle health sharing:', err);
        } finally {
            setSharingLoading(false);
        }
    }, [gameId, userId, shared, sharingLoading]);

    // On web (or native with no Health Connect): try loading from Firestore
    useEffect(() => {
        if (isNative && (available || !gameId)) return; // native with HC available — will fetch live
        if (!gameId || !userId || !isCompletedOrInProgress) return;

        const loadFromStore = async () => {
            setLoading(true);
            try {
                const stored = await getMyGameHealth(gameId, userId);
                if (stored) {
                    setData({
                        steps: stored.steps,
                        calories: stored.calories,
                        distance: stored.distance,
                        heartRateAvg: stored.heartRateAvg,
                        heartRateMax: stored.heartRateMax,
                        heartRateSamples: stored.heartRateSamples,
                        duration: stored.duration,
                        workoutType: stored.workoutType,
                        avgSpeedKmh: stored.avgSpeedKmh,
                        topSpeedKmh: stored.topSpeedKmh,
                        paceMinPerKm: stored.paceMinPerKm,
                        speedSamples: stored.speedSamples ?? [],
                        heartRateZones: stored.heartRateZones,
                        intensityScore: stored.intensityScore,
                        activePeriods: stored.activePeriods,
                        activeMinutes: stored.activeMinutes,
                        sprintCount: stored.sprintCount,
                        distanceBuckets: stored.distanceBuckets,
                    });
                    setShared(stored.shared);
                    setFromStore(true);
                }
            } catch (err) {
                logger.error('Failed to load stored health data:', err);
            } finally {
                setLoading(false);
            }
        };

        loadFromStore();
    }, [isNative, available, gameId, userId, isCompletedOrInProgress]);

    // Fetch health data from device when permissions are granted and game is completed/in_progress
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

                // Check workout permission at runtime
                const permResult = await Health.checkHealthPermissions({
                    permissions: [...HEALTH_PERMS],
                });
                const hasWorkouts = isWorkoutsPermissionGranted(permResult.permissions);

                // Try workouts first — gives the richest data
                let workouts: { duration: number; startDate: string; calories: number; steps?: number; distance?: number; workoutType?: string; heartRate?: HeartRateSample[]; route?: { lat: number; lng: number; timestamp: string }[] }[] = [];
                if (hasWorkouts) {
                    try {
                        const workoutResult = await Health.queryWorkouts({
                            startDate,
                            endDate,
                            includeHeartRate: true,
                            includeRoute: true,
                            includeSteps: true,
                        });
                        workouts = workoutResult.workouts;
                    } catch (err) {
                        logger.error('queryWorkouts failed:', err);
                    }
                }

                if (workouts.length > 0) {
                    const workout = workouts.reduce((best, w) =>
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

                    // Query distance in 5-min buckets from Health Connect
                    const BUCKET_MIN = 5;
                    const bucketCount = Math.ceil(matchDurationMinutes / BUCKET_MIN);
                    const distanceBuckets: { startMin: number; endMin: number; distanceM: number }[] = [];

                    try {
                        const bucketPromises = Array.from({ length: bucketCount }, (_, i) => {
                            const bucketStartMs = gameDate + i * BUCKET_MIN * 60_000;
                            const bucketEndMs = gameDate + (i + 1) * BUCKET_MIN * 60_000;
                            return Health.queryAggregated({
                                startDate: new Date(bucketStartMs).toISOString(),
                                endDate: new Date(bucketEndMs).toISOString(),
                                dataType: 'distance' as 'steps', // Android supports 'distance' despite TS types
                                bucket: 'day',
                            }).then(result => ({
                                startMin: i * BUCKET_MIN,
                                endMin: (i + 1) * BUCKET_MIN,
                                distanceM: Math.round(
                                    result.aggregatedData.reduce((sum, d) => sum + d.value, 0)
                                ),
                            }));
                        });
                        const buckets = await Promise.all(bucketPromises);
                        distanceBuckets.push(...buckets);
                    } catch (err) {
                        logger.error('Failed to query distance buckets:', err);
                    }

                    const healthData: GameHealthData = {
                        steps: workout.steps,
                        calories: Math.round(workout.calories),
                        distance: distMetres || undefined,
                        heartRateAvg: avgHr,
                        heartRateMax: maxHr,
                        heartRateSamples: hrSamples,
                        duration: durSecs,
                        workoutType: workout.workoutType,
                        ...derived,
                        distanceBuckets: distanceBuckets.length > 0 ? distanceBuckets : undefined,
                    };

                    setData(healthData);

                    // Save to Firestore if user has sync enabled (fail closed for privacy)
                    const syncEnabled = userId ? await getHealthSyncEnabled(userId).catch(() => false) : false;
                    if (gameId && userId && leagueId && syncEnabled) {
                        const sharingByLeague = await getHealthSharingByLeague(userId).catch(() => ({}));
                        const shareDefault = sharingByLeague[leagueId] ??
                            await getHealthSharingDefault(userId).catch(() => false);
                        const stored: StoredGameHealth = {
                            gameId,
                            leagueId,
                            userId,
                            savedAt: Date.now(),
                            steps: healthData.steps,
                            calories: healthData.calories,
                            distance: healthData.distance,
                            heartRateAvg: healthData.heartRateAvg,
                            heartRateMax: healthData.heartRateMax,
                            duration: healthData.duration,
                            workoutType: healthData.workoutType,
                            avgSpeedKmh: healthData.avgSpeedKmh,
                            topSpeedKmh: healthData.topSpeedKmh,
                            paceMinPerKm: healthData.paceMinPerKm,
                            intensityScore: healthData.intensityScore,
                            activeMinutes: healthData.activeMinutes,
                            sprintCount: healthData.sprintCount,
                            // Downsample time-series to keep Firestore doc small
                            heartRateSamples: downsampleTimeSeries(hrSamples, MAX_HR_SAMPLES),
                            speedSamples: downsampleTimeSeries(derived.speedSamples, MAX_SPEED_SAMPLES),
                            heartRateZones: derived.heartRateZones,
                            activePeriods: derived.activePeriods,
                            distanceBuckets: healthData.distanceBuckets,
                            shared: shareDefault,
                        };
                        setShared(shareDefault);
                        saveGameHealth(stored).catch(err =>
                            logger.error('Failed to save health data to Firestore:', err)
                        );
                    }
                } else {
                    // Fallback: query aggregated steps and calories
                    const [stepsResult, caloriesResult] = await Promise.all([
                        Health.queryAggregated({ startDate, endDate, dataType: 'steps', bucket: 'day' }),
                        Health.queryAggregated({ startDate, endDate, dataType: 'active-calories', bucket: 'day' }),
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
    }, [isNative, available, permissionGranted, gameDate, isCompletedOrInProgress, matchDurationMinutes, gameId, userId, leagueId]);

    return { data, loading, error, isNative, available, permissionGranted, requestPermission, openPlayStore, shared, sharingLoading, toggleSharing, fromStore };
}
