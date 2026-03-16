import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { deriveAllMetrics, downsampleTimeSeries, type HeartRateSample } from '../utils/healthMetrics';
import { getLeagueGames, saveGameHealth, getMyGameHealth, getHealthSharingByLeague, getHealthSharingDefault, getHealthSyncEnabled } from '../utils/firestore';
import { logger } from '../utils/logger';
import { HEALTH_PERMS, areBasePermissionsGranted, isWorkoutsPermissionGranted } from '../utils/healthPerms';
import type { League, Game, StoredGameHealth } from '../types';

const MAX_HR_SAMPLES = 100;
const MAX_SPEED_SAMPLES = 80;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export interface HealthSyncResult {
    syncing: boolean;
    syncedCount: number;
    /** Brief message shown after sync completes, auto-clears */
    message: string | null;
}

/**
 * Auto-syncs health data for recent games on native platforms.
 * Runs once when leagues are loaded — queries Health Connect for
 * completed/in-progress games from the last 7 days that don't
 * already have stored health data.
 */
export function useAutoHealthSync(
    userId: string | undefined,
    leagues: League[],
): HealthSyncResult {
    const [syncing, setSyncing] = useState(false);
    const [syncedCount, setSyncedCount] = useState(0);
    const [message, setMessage] = useState<string | null>(null);

    useEffect(() => {
        if (!userId || leagues.length === 0) return;
        if (!Capacitor.isNativePlatform()) return;

        let cancelled = false;

        const sync = async () => {
            try {
                // Check Health Connect availability + permissions
                const { Health } = await import('capacitor-health');
                const { available } = await Health.isHealthAvailable();
                if (!available) return;

                const result = await Health.checkHealthPermissions({
                    permissions: [...HEALTH_PERMS],
                });
                // Require base permissions (steps/calories/distance/HR); workouts are optional
                if (!areBasePermissionsGranted(result.permissions)) return;
                const hasWorkoutsPermission = isWorkoutsPermissionGranted(result.permissions);

                // Check if user has sync to account enabled (fail closed for privacy)
                const syncEnabled = await getHealthSyncEnabled(userId).catch(() => false);
                if (!syncEnabled) return;

                // Gather recent games across all leagues
                const now = Date.now();
                const cutoff = now - SEVEN_DAYS_MS;
                const recentGames: { game: Game; league: League }[] = [];

                for (const league of leagues) {
                    const games = await getLeagueGames(league.id);
                    for (const game of games) {
                        if (
                            (game.status === 'completed' || game.status === 'in_progress') &&
                            game.date >= cutoff &&
                            game.date <= now
                        ) {
                            recentGames.push({ game, league });
                        }
                    }
                }

                if (recentGames.length === 0 || cancelled) return;

                // Filter to games without stored health data
                const needsSync: { game: Game; league: League }[] = [];
                for (const entry of recentGames) {
                    const existing = await getMyGameHealth(entry.game.id, userId);
                    if (!existing) {
                        needsSync.push(entry);
                    }
                }

                if (needsSync.length === 0 || cancelled) return;

                setSyncing(true);
                let synced = 0;

                for (const { game, league } of needsSync) {
                    if (cancelled) break;

                    try {
                        const matchDurationMinutes = league.matchDurationMinutes ?? 60;
                        const matchDurationMs = matchDurationMinutes * 60 * 1000;
                        const startDate = new Date(game.date).toISOString();
                        const endDate = new Date(game.date + matchDurationMs).toISOString();

                        // Only query workouts if permission is granted; skip game otherwise
                        if (!hasWorkoutsPermission) continue;

                        const workoutResult = await Health.queryWorkouts({
                            startDate,
                            endDate,
                            includeHeartRate: true,
                            includeRoute: true,
                            includeSteps: true,
                        });

                        if (workoutResult.workouts.length === 0) continue;

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

                        const derived = deriveAllMetrics({
                            heartRateSamples: hrSamples,
                            route,
                            distanceMetres: distMetres,
                            durationSeconds: durSecs,
                            gameStartMs: game.date,
                            gameDurationMin: matchDurationMinutes,
                            maxHr: maxHr ? Math.max(maxHr, 180) : 190,
                        });

                        // Query distance in 5-min buckets
                        const BUCKET_MIN = 5;
                        const bucketCount = Math.ceil(matchDurationMinutes / BUCKET_MIN);
                        let distanceBuckets: { startMin: number; endMin: number; distanceM: number }[] | undefined;

                        try {
                            const bucketPromises = Array.from({ length: bucketCount }, (_, i) => {
                                const bStart = game.date + i * BUCKET_MIN * 60_000;
                                const bEnd = game.date + (i + 1) * BUCKET_MIN * 60_000;
                                return Health.queryAggregated({
                                    startDate: new Date(bStart).toISOString(),
                                    endDate: new Date(bEnd).toISOString(),
                                    dataType: 'distance' as 'steps',
                                    bucket: 'day',
                                }).then(r => ({
                                    startMin: i * BUCKET_MIN,
                                    endMin: (i + 1) * BUCKET_MIN,
                                    distanceM: Math.round(r.aggregatedData.reduce((sum, d) => sum + d.value, 0)),
                                }));
                            });
                            const buckets = await Promise.all(bucketPromises);
                            if (buckets.some(b => b.distanceM > 0)) {
                                distanceBuckets = buckets;
                            }
                        } catch (err) {
                            logger.error('Failed to query distance buckets during auto-sync:', err);
                        }

                        const sharingByLeague = await getHealthSharingByLeague(userId).catch(() => ({}));
                        const shareDefault = sharingByLeague[league.id] ??
                            await getHealthSharingDefault(userId).catch(() => false);

                        const stored: StoredGameHealth = {
                            gameId: game.id,
                            leagueId: league.id,
                            userId,
                            savedAt: Date.now(),
                            steps: workout.steps,
                            calories: Math.round(workout.calories),
                            distance: distMetres || undefined,
                            heartRateAvg: avgHr,
                            heartRateMax: maxHr,
                            duration: durSecs,
                            workoutType: workout.workoutType,
                            avgSpeedKmh: derived.avgSpeedKmh,
                            topSpeedKmh: derived.topSpeedKmh,
                            paceMinPerKm: derived.paceMinPerKm,
                            intensityScore: derived.intensityScore,
                            activeMinutes: derived.activeMinutes,
                            sprintCount: derived.sprintCount,
                            heartRateSamples: downsampleTimeSeries(hrSamples, MAX_HR_SAMPLES),
                            speedSamples: downsampleTimeSeries(derived.speedSamples, MAX_SPEED_SAMPLES),
                            heartRateZones: derived.heartRateZones,
                            activePeriods: derived.activePeriods,
                            distanceBuckets,
                            shared: shareDefault,
                        };

                        await saveGameHealth(stored);
                        synced++;
                        setSyncedCount(synced);
                    } catch (err) {
                        logger.error(`Auto-sync failed for game ${game.id}:`, err);
                    }
                }

                if (synced > 0 && !cancelled) {
                    const msg = synced === 1
                        ? 'Synced health data for 1 game'
                        : `Synced health data for ${synced} games`;
                    setMessage(msg);
                    // Auto-clear after 4 seconds
                    setTimeout(() => setMessage(null), 4000);
                }
            } catch (err) {
                logger.error('Auto health sync failed:', err);
            } finally {
                if (!cancelled) setSyncing(false);
            }
        };

        sync();

        return () => { cancelled = true; };
    }, [userId, leagues]);

    return { syncing, syncedCount, message };
}
