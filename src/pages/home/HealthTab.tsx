import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Heart, Footprints, Flame, Clock, Zap, ArrowRight, Settings, Download, Smartphone } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '../../contexts/AuthContext';
import { getLeagueGames, getMyGameHealth } from '../../utils/firestore';
import { League, Game, StoredGameHealth } from '../../types';
import { HEALTH_PERMS, areBasePermissionsGranted } from '../../utils/healthPerms';
import { logger } from '../../utils/logger';
import HealthStatusModal from '../../components/HealthStatus';

interface GameWithHealth {
    game: Game;
    leagueName: string;
    leagueCode: string;
    health: StoredGameHealth;
}

const formatDate = (timestamp: number): string => {
    const d = new Date(timestamp);
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
};

const formatDistance = (metres?: number): string => {
    if (metres == null) return '—';
    return metres >= 1000 ? `${(metres / 1000).toFixed(1)} km` : `${Math.round(metres)} m`;
};

const formatDuration = (seconds?: number): string => {
    if (seconds == null) return '—';
    const mins = Math.round(seconds / 60);
    return `${mins} min`;
};

interface HealthTabProps {
    leagues: League[];
}

interface AggregateStats {
    totalGames: number;
    totalDistance: number;
    avgHeartRate: number;
    totalCalories: number;
    totalActiveMinutes: number;
    avgIntensity: number;
}

const computeAggregates = (entries: GameWithHealth[]): AggregateStats => {
    const total = entries.length;
    if (total === 0) {
        return { totalGames: 0, totalDistance: 0, avgHeartRate: 0, totalCalories: 0, totalActiveMinutes: 0, avgIntensity: 0 };
    }

    let distanceSum = 0;
    let hrSum = 0;
    let hrCount = 0;
    let calSum = 0;
    let activeSum = 0;
    let intensitySum = 0;

    for (const { health } of entries) {
        distanceSum += health.distance ?? 0;
        if (health.heartRateAvg) { hrSum += health.heartRateAvg; hrCount++; }
        calSum += health.calories ?? 0;
        activeSum += health.activeMinutes ?? 0;
        intensitySum += health.intensityScore ?? 0;
    }

    return {
        totalGames: total,
        totalDistance: distanceSum,
        avgHeartRate: hrCount > 0 ? Math.round(hrSum / hrCount) : 0,
        totalCalories: Math.round(calSum),
        totalActiveMinutes: Math.round(activeSum),
        avgIntensity: Math.round(intensitySum / total),
    };
};

const isNative = Capacitor.isNativePlatform();

interface HealthSettingsCardProps {
    hasPermissions: boolean;
    requesting: boolean;
    onRequestPermissions: () => void;
    onManageSettings: () => void;
}

const HealthSettingsCard: React.FC<HealthSettingsCardProps> = ({ hasPermissions, requesting, onRequestPermissions, onManageSettings }) => {
    if (!isNative) {
        return (
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-start gap-3">
                <Smartphone className="w-5 h-5 text-green-300 shrink-0 mt-0.5" />
                <div className="flex-1">
                    <div className="text-white text-sm font-medium mb-1">Track your match fitness</div>
                    <p className="text-green-200/60 text-xs mb-3">
                        Install Team Shuffle on your Android device with Health Connect to automatically track distance, heart rate, and more during games.
                    </p>
                    <div className="flex items-center gap-2 text-xs">
                        <Download className="w-3 h-3 text-green-300" />
                        <span className="text-green-300">Available on Android with Health Connect</span>
                    </div>
                </div>
            </div>
        );
    }

    if (!hasPermissions) {
        return (
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-start gap-3">
                <Activity className="w-5 h-5 text-green-300 shrink-0 mt-0.5" />
                <div className="flex-1">
                    <div className="text-white text-sm font-medium mb-1">Enable Health Connect</div>
                    <p className="text-green-200/60 text-xs mb-3">
                        Grant health permissions to automatically track your match fitness — distance, heart rate, calories, and more.
                    </p>
                    <button
                        onClick={onRequestPermissions}
                        disabled={requesting}
                        className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-medium transition-colors disabled:opacity-50"
                    >
                        {requesting ? 'Requesting...' : 'Enable Health Tracking'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <button
            onClick={onManageSettings}
            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 flex items-center gap-3 hover:bg-white/10 transition-colors"
        >
            <Settings className="w-4 h-4 text-green-300 shrink-0" />
            <span className="text-green-200/70 text-sm flex-1 text-left">Manage Health Connect settings</span>
            <ArrowRight className="w-4 h-4 text-white/20" />
        </button>
    );
};

const HealthTab: React.FC<HealthTabProps> = ({ leagues }) => {
    const { user } = useAuth();
    const [entries, setEntries] = useState<GameWithHealth[]>([]);
    const [loading, setLoading] = useState(true);
    const [hasPermissions, setHasPermissions] = useState(false);
    const [requesting, setRequesting] = useState(false);
    const [showHealthModal, setShowHealthModal] = useState(false);

    const checkPermissions = useCallback(async () => {
        if (!isNative) return;
        try {
            const { Health } = await import('capacitor-health');
            const result = await Health.checkHealthPermissions({ permissions: [...HEALTH_PERMS] });
            const perms = result.permissions as Record<string, boolean> | undefined;
            setHasPermissions(areBasePermissionsGranted(perms));
        } catch {
            setHasPermissions(false);
        }
    }, []);

    const requestPermissions = useCallback(async () => {
        if (!isNative) return;
        setRequesting(true);
        try {
            const { Health } = await import('capacitor-health');
            const result = await Health.requestHealthPermissions({ permissions: [...HEALTH_PERMS] });
            const perms = result.permissions as Record<string, boolean> | undefined;
            setHasPermissions(areBasePermissionsGranted(perms));
        } catch (err) {
            logger.error('[HealthTab] requestPermissions failed', err);
        } finally {
            setRequesting(false);
        }
    }, []);

    useEffect(() => { checkPermissions(); }, [checkPermissions]);

    useEffect(() => {
        if (!user) return;
        if (leagues.length === 0) return;

        let cancelled = false;
        setLoading(true);

        const fetchHealth = async () => {
            // Fetch all games across leagues
            const gamesByLeague = await Promise.all(
                leagues.map(async (league) => {
                    const games = await getLeagueGames(league.id);
                    return games.map(game => ({ game, leagueName: league.name, leagueCode: league.joinCode }));
                })
            );
            const allGames = gamesByLeague.flat();

            if (cancelled) return;

            if (allGames.length === 0) {
                setLoading(false);
                return;
            }

            // Fetch health data per game (individually to handle permission errors)
            const results = await Promise.all(
                allGames.map(async ({ game, leagueName, leagueCode }) => {
                    try {
                        const health = await getMyGameHealth(game.id, user.uid);
                        return health ? { game, leagueName, leagueCode, health } : null;
                    } catch (err) {
                        logger.error(`[HealthTab] Failed to get health for game ${game.id}`, err);
                        return null;
                    }
                })
            );
            const withHealth = results.filter((r): r is GameWithHealth => r !== null);

            if (cancelled) return;

            withHealth.sort((a, b) => b.game.date - a.game.date);
            setEntries(withHealth);
            setLoading(false);
        };

        fetchHealth().catch((err) => {
            logger.error('[HealthTab] fetch failed', err);
            if (!cancelled) setLoading(false);
        });

        return () => { cancelled = true; };
    }, [user, leagues]);

    const effectiveHasPermissions = hasPermissions || entries.length > 0;

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-20 bg-white/10 rounded-xl animate-pulse" />
                    ))}
                </div>
                <div className="h-24 bg-white/10 rounded-xl animate-pulse" />
            </div>
        );
    }

    if (entries.length === 0) {
        return (
            <div className="space-y-5">
                <HealthSettingsCard hasPermissions={effectiveHasPermissions} requesting={requesting} onRequestPermissions={requestPermissions} onManageSettings={() => setShowHealthModal(true)} />
                <div className="text-center py-8">
                    <Activity className="w-10 h-10 text-green-300/40 mx-auto mb-3" />
                    <h2 className="text-white font-bold mb-1">No health data yet</h2>
                    <p className="text-green-200/60 text-sm max-w-xs mx-auto">
                        Health data will appear here after you play games with Health Connect enabled on your device.
                    </p>
                </div>
                {showHealthModal && <HealthStatusModal onClose={() => setShowHealthModal(false)} />}
            </div>
        );
    }

    const agg = computeAggregates(entries);

    return (
        <div className="space-y-5">
            <HealthSettingsCard hasPermissions={effectiveHasPermissions} requesting={requesting} onRequestPermissions={requestPermissions} onManageSettings={() => setShowHealthModal(true)} />

            {/* Aggregate stats */}
            <div className="grid grid-cols-3 gap-2">
                <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                    <Footprints className="w-4 h-4 text-green-300 mx-auto mb-1" />
                    <div className="text-white font-bold text-sm">{formatDistance(agg.totalDistance)}</div>
                    <div className="text-green-300/50 text-[10px]">Total Distance</div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                    <Heart className="w-4 h-4 text-red-400 mx-auto mb-1" />
                    <div className="text-white font-bold text-sm">{agg.avgHeartRate || '—'} bpm</div>
                    <div className="text-green-300/50 text-[10px]">Avg Heart Rate</div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                    <Flame className="w-4 h-4 text-orange-400 mx-auto mb-1" />
                    <div className="text-white font-bold text-sm">{agg.totalCalories || '—'}</div>
                    <div className="text-green-300/50 text-[10px]">Total Calories</div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                    <Clock className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                    <div className="text-white font-bold text-sm">{agg.totalActiveMinutes} min</div>
                    <div className="text-green-300/50 text-[10px]">Active Time</div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                    <Zap className="w-4 h-4 text-yellow-400 mx-auto mb-1" />
                    <div className="text-white font-bold text-sm">{agg.avgIntensity}</div>
                    <div className="text-green-300/50 text-[10px]">Avg Intensity</div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                    <Activity className="w-4 h-4 text-green-400 mx-auto mb-1" />
                    <div className="text-white font-bold text-sm">{agg.totalGames}</div>
                    <div className="text-green-300/50 text-[10px]">Games Tracked</div>
                </div>
            </div>

            {/* Game-by-game timeline */}
            <div>
                <h2 className="text-sm font-medium text-green-300/70 px-1 mb-2">Game History</h2>
                <div className="space-y-2">
                    {entries.map(({ game, leagueName, leagueCode, health }) => (
                        <Link
                            key={game.id}
                            to={`/league/${leagueCode}/game/${game.id}`}
                            className="block bg-white/5 hover:bg-white/10 rounded-xl p-4 transition-colors"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div>
                                    <div className="text-white text-sm font-medium">{game.title}</div>
                                    <div className="text-green-300/60 text-xs">
                                        {leagueName} &middot; {formatDate(game.date)}
                                    </div>
                                </div>
                                <ArrowRight className="w-4 h-4 text-white/20 shrink-0" />
                            </div>
                            <div className="flex gap-4 text-xs">
                                {health.distance != null && health.distance > 0 && (
                                    <span className="text-green-200/70 flex items-center gap-1">
                                        <Footprints className="w-3 h-3" />
                                        {formatDistance(health.distance)}
                                    </span>
                                )}
                                {health.heartRateAvg != null && health.heartRateAvg > 0 && (
                                    <span className="text-green-200/70 flex items-center gap-1">
                                        <Heart className="w-3 h-3" />
                                        {health.heartRateAvg} bpm
                                    </span>
                                )}
                                {health.activeMinutes != null && health.activeMinutes > 0 && (
                                    <span className="text-green-200/70 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {formatDuration(health.activeMinutes * 60)}
                                    </span>
                                )}
                                {health.calories != null && health.calories > 0 && (
                                    <span className="text-green-200/70 flex items-center gap-1">
                                        <Flame className="w-3 h-3" />
                                        {Math.round(health.calories)} cal
                                    </span>
                                )}
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
            {showHealthModal && <HealthStatusModal onClose={() => setShowHealthModal(false)} />}
        </div>
    );
};

export default HealthTab;
