import React, { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import {
    ResponsiveContainer, AreaChart, Area, BarChart, Bar,
    XAxis, YAxis, Tooltip,
} from 'recharts';
import { Activity, CheckCircle, XCircle, Footprints, Flame, MapPin, Heart, Dumbbell, ExternalLink, X, Cloud, Users } from 'lucide-react';
import { logger } from '../utils/logger';
import { HEALTH_PERMS } from '../utils/healthPerms';
import { useAuth } from '../contexts/AuthContext';
import {
    getHealthSyncEnabled, updateHealthSyncEnabled,
    getHealthSharingByLeague, updateLeagueHealthSharing,
    updateAllLeagueHealthSharing, getUserLeagues,
} from '../utils/firestore';
import type { League } from '../types';

const PERM_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
    READ_STEPS: { label: 'Steps', icon: <Footprints className="w-3.5 h-3.5" /> },
    READ_ACTIVE_CALORIES: { label: 'Calories', icon: <Flame className="w-3.5 h-3.5" /> },
    READ_DISTANCE: { label: 'Distance', icon: <MapPin className="w-3.5 h-3.5" /> },
    READ_HEART_RATE: { label: 'Heart Rate', icon: <Heart className="w-3.5 h-3.5" /> },
    READ_WORKOUTS: { label: 'Workouts', icon: <Dumbbell className="w-3.5 h-3.5" /> },
};

interface HrPoint { min: number; bpm: number }
interface StepBucket { hour: string; steps: number }

interface SampleData {
    steps?: number;
    calories?: number;
    workoutCount?: number;
    hrSamples: HrPoint[];
    hrAvg?: number;
    hrMax?: number;
    stepBuckets: StepBucket[];
}

interface HealthStatusModalProps {
    onClose: () => void;
}

const HealthStatusModal: React.FC<HealthStatusModalProps> = ({ onClose }) => {
    const { user } = useAuth();
    const [available, setAvailable] = useState<boolean | null>(null);
    const [permStatus, setPermStatus] = useState<Record<string, boolean>>({});
    const [sampleData, setSampleData] = useState<SampleData | null>(null);
    const [sampleLoading, setSampleLoading] = useState(false);
    const [requesting, setRequesting] = useState(false);
    const [syncToAccount, setSyncToAccount] = useState(false); // fail closed for privacy
    const [leagues, setLeagues] = useState<League[]>([]);
    const [leagueSharing, setLeagueSharing] = useState<Record<string, boolean>>({});
    const [prefsLoaded, setPrefsLoaded] = useState(false);
    const [prefsError, setPrefsError] = useState(false);

    const allGranted = HEALTH_PERMS.every(p => permStatus[p] === true);
    const allLeaguesShared = leagues.length > 0 && leagues.every(l => leagueSharing[l.id] === true);
    const anyLeagueShared = leagues.some(l => leagueSharing[l.id] === true);

    // Load user preferences and leagues
    useEffect(() => {
        if (!user?.uid) return;
        Promise.all([
            getHealthSyncEnabled(user.uid),
            getHealthSharingByLeague(user.uid),
            getUserLeagues(user.uid),
        ]).then(([sync, sharing, userLeagues]) => {
            setSyncToAccount(sync);
            setLeagueSharing(sharing);
            setLeagues(userLeagues);
            setPrefsLoaded(true);
        }).catch(() => {
            setPrefsError(true);
            setPrefsLoaded(true);
        });
    }, [user?.uid]);

    const handleToggleSync = async () => {
        if (!user?.uid) return;
        const newVal = !syncToAccount;
        setSyncToAccount(newVal);
        try {
            await updateHealthSyncEnabled(user.uid, newVal);
        } catch {
            setSyncToAccount(!newVal);
            return;
        }
        // If disabling sync, also disable all league sharing
        if (!newVal && anyLeagueShared) {
            const previousSharing = { ...leagueSharing };
            const cleared = Object.fromEntries(leagues.map(l => [l.id, false]));
            setLeagueSharing(cleared);
            await updateAllLeagueHealthSharing(user.uid, leagues.map(l => l.id), false)
                .catch(() => setLeagueSharing(previousSharing));
        }
    };

    const handleToggleLeague = async (leagueId: string) => {
        if (!user?.uid) return;
        const newVal = !leagueSharing[leagueId];
        setLeagueSharing(prev => ({ ...prev, [leagueId]: newVal }));
        await updateLeagueHealthSharing(user.uid, leagueId, newVal).catch(() =>
            setLeagueSharing(prev => ({ ...prev, [leagueId]: !newVal }))
        );
    };

    const handleToggleAll = async () => {
        if (!user?.uid || leagues.length === 0) return;
        const newVal = !allLeaguesShared;
        const previousSharing = { ...leagueSharing };
        const updated = Object.fromEntries(leagues.map(l => [l.id, newVal]));
        setLeagueSharing(updated);
        await updateAllLeagueHealthSharing(user.uid, leagues.map(l => l.id), newVal, true)
            .catch(() => setLeagueSharing(previousSharing));
    };

    const checkPermissions = useCallback(async () => {
        try {
            const { Health } = await import('capacitor-health');
            const { available: isAvail } = await Health.isHealthAvailable();
            setAvailable(isAvail);

            if (isAvail) {
                const result = await Health.checkHealthPermissions({
                    permissions: [...HEALTH_PERMS],
                });
                const perms = result.permissions as Record<string, boolean> | undefined;
                if (perms && typeof perms === 'object') {
                    setPermStatus({ ...perms });
                }
            }
        } catch {
            setAvailable(false);
        }
    }, []);

    const requestPermissions = useCallback(async () => {
        setRequesting(true);
        try {
            const { Health } = await import('capacitor-health');
            const result = await Health.requestHealthPermissions({
                permissions: [...HEALTH_PERMS],
            });
            const perms = result.permissions as Record<string, boolean> | undefined;
            if (perms && typeof perms === 'object') {
                setPermStatus({ ...perms });
            }
        } catch {
            // Will be rechecked on app resume
        } finally {
            setRequesting(false);
        }
    }, []);

    const fetchSampleData = useCallback(async () => {
        setSampleLoading(true);
        try {
            const { Health } = await import('capacitor-health');
            const now = new Date();
            const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
            const yesterdayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            const startDate = yesterdayStart.toISOString();
            const endDate = yesterdayEnd.toISOString();

            const sample: SampleData = { hrSamples: [], stepBuckets: [] };

            // Steps (total)
            try {
                const result = await Health.queryAggregated({ startDate, endDate, dataType: 'steps', bucket: 'day' });
                const total = result.aggregatedData.reduce((sum, d) => sum + d.value, 0);
                if (total > 0) sample.steps = Math.round(total);
            } catch (err) {
                logger.error('Sample steps query failed:', err);
            }

            // Steps per 4-hour bucket (for bar chart)
            try {
                const BUCKET_HOURS = 4;
                const bucketCount = 24 / BUCKET_HOURS;
                const bucketPromises = Array.from({ length: bucketCount }, (_, i) => {
                    const bStart = new Date(yesterdayStart.getTime() + i * BUCKET_HOURS * 3600_000);
                    const bEnd = new Date(yesterdayStart.getTime() + (i + 1) * BUCKET_HOURS * 3600_000);
                    const hourLabel = `${String(bStart.getHours()).padStart(2, '0')}:00`;
                    return Health.queryAggregated({
                        startDate: bStart.toISOString(),
                        endDate: bEnd.toISOString(),
                        dataType: 'steps',
                        bucket: 'day',
                    }).then(r => ({
                        hour: hourLabel,
                        steps: Math.round(r.aggregatedData.reduce((sum, d) => sum + d.value, 0)),
                    })).catch(() => ({ hour: hourLabel, steps: 0 }));
                });
                sample.stepBuckets = await Promise.all(bucketPromises);
            } catch (err) {
                logger.error('Step buckets query failed:', err);
            }

            // Calories
            try {
                const result = await Health.queryAggregated({ startDate, endDate, dataType: 'active-calories', bucket: 'day' });
                const total = result.aggregatedData.reduce((sum, d) => sum + d.value, 0);
                if (total > 0) sample.calories = Math.round(total);
            } catch (err) {
                logger.error('Sample calories query failed:', err);
            }

            // Workouts + HR from longest workout
            try {
                const result = await Health.queryWorkouts({
                    startDate, endDate,
                    includeHeartRate: true,
                    includeRoute: false,
                    includeSteps: false,
                });
                sample.workoutCount = result.workouts.length;

                if (result.workouts.length > 0) {
                    const longest = result.workouts.reduce((best, w) =>
                        w.duration > best.duration ? w : best
                    );
                    const hrRaw = (longest.heartRate ?? []) as { timestamp: string; bpm: number }[];
                    if (hrRaw.length > 0) {
                        const workoutStartMs = new Date(longest.startDate).getTime();
                        sample.hrSamples = hrRaw.map(s => ({
                            min: Math.round((new Date(s.timestamp).getTime() - workoutStartMs) / 60_000),
                            bpm: s.bpm,
                        }));
                        const bpms = hrRaw.map(s => s.bpm);
                        sample.hrAvg = Math.round(bpms.reduce((a, b) => a + b, 0) / bpms.length);
                        sample.hrMax = Math.max(...bpms);
                    }
                }
            } catch (err) {
                logger.error('Sample workouts query failed:', err);
            }

            setSampleData(sample);
        } catch (err) {
            logger.error('Failed to fetch sample health data:', err);
        } finally {
            setSampleLoading(false);
        }
    }, []);

    useEffect(() => { checkPermissions(); }, [checkPermissions]);

    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;
        let cleanup: (() => void) | undefined;
        (async () => {
            const { App } = await import('@capacitor/app');
            const listener = await App.addListener('appStateChange', ({ isActive }) => {
                if (isActive) checkPermissions();
            });
            cleanup = () => listener.remove();
        })();
        return () => { cleanup?.(); };
    }, [checkPermissions]);

    useEffect(() => {
        if (allGranted && !sampleData && !sampleLoading) {
            fetchSampleData();
        }
    }, [allGranted, sampleData, sampleLoading, fetchSampleData]);

    // Close on Escape key
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    const openHealthConnect = async () => {
        try {
            const { Health } = await import('capacitor-health');
            await Health.openHealthConnectSettings();
        } catch {
            // Not all plugin versions support this
        }
    };

    if (!Capacitor.isNativePlatform()) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div
                className="relative w-full sm:max-w-sm bg-green-950 border border-white/10 rounded-t-2xl sm:rounded-2xl p-5 space-y-4 max-h-[85vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Activity className="w-5 h-5 text-red-400" />
                        <h2 className="text-white font-semibold">My Health Data</h2>
                    </div>
                    <button onClick={onClose} className="text-white/40 hover:text-white p-1">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {available === null && (
                    <div className="flex items-center gap-2 py-4 justify-center">
                        <Activity className="w-4 h-4 text-red-400 animate-pulse" />
                        <span className="text-white/50 text-sm">Checking Health Connect...</span>
                    </div>
                )}

                {available === false && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                        <p className="text-red-300 text-sm">Health Connect is not available on this device.</p>
                    </div>
                )}

                {available === true && (
                    <>
                        {/* Permissions */}
                        <div className="space-y-2">
                            <h3 className="text-white/50 text-xs uppercase tracking-wider">Permissions</h3>
                            <div className="grid grid-cols-1 gap-1.5">
                                {HEALTH_PERMS.map(perm => {
                                    const granted = permStatus[perm] === true;
                                    const info = PERM_LABELS[perm];
                                    return (
                                        <div key={perm} className="flex items-center gap-2.5 bg-white/5 rounded-lg px-3 py-2">
                                            <span className={granted ? 'text-green-400' : 'text-white/20'}>{info.icon}</span>
                                            <span className="text-white/80 text-sm flex-1">{info.label}</span>
                                            {granted ? (
                                                <CheckCircle className="w-4 h-4 text-green-400" />
                                            ) : (
                                                <XCircle className="w-4 h-4 text-red-400/60" />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {!allGranted && (
                                <button
                                    onClick={requestPermissions}
                                    disabled={requesting}
                                    className="w-full mt-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-sm font-medium px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    {requesting ? 'Requesting...' : 'Grant Access'}
                                </button>
                            )}
                        </div>

                        {/* Sample data */}
                        {allGranted && (
                            <div className="space-y-3">
                                <h3 className="text-white/50 text-xs uppercase tracking-wider">Yesterday&apos;s Snapshot</h3>
                                {sampleLoading && (
                                    <div className="flex items-center gap-2 py-3">
                                        <Activity className="w-4 h-4 text-red-400 animate-pulse" />
                                        <span className="text-white/50 text-sm">Loading sample data...</span>
                                    </div>
                                )}
                                {sampleData && !sampleLoading && (
                                    <>
                                        {/* Hero stats */}
                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="bg-white/5 rounded-lg p-2.5 text-center">
                                                <Footprints className="w-4 h-4 text-green-400 mx-auto mb-0.5" />
                                                <div className="text-white font-bold text-base leading-tight">
                                                    {sampleData.steps?.toLocaleString() ?? '—'}
                                                </div>
                                                <div className="text-white/40 text-[10px]">Steps</div>
                                            </div>
                                            <div className="bg-white/5 rounded-lg p-2.5 text-center">
                                                <Flame className="w-4 h-4 text-orange-400 mx-auto mb-0.5" />
                                                <div className="text-white font-bold text-base leading-tight">
                                                    {sampleData.calories?.toLocaleString() ?? '—'}
                                                </div>
                                                <div className="text-white/40 text-[10px]">Calories</div>
                                            </div>
                                            <div className="bg-white/5 rounded-lg p-2.5 text-center">
                                                <Dumbbell className="w-4 h-4 text-blue-400 mx-auto mb-0.5" />
                                                <div className="text-white font-bold text-base leading-tight">
                                                    {sampleData.workoutCount ?? '—'}
                                                </div>
                                                <div className="text-white/40 text-[10px]">Workouts</div>
                                            </div>
                                        </div>

                                        {/* Steps bar chart */}
                                        {sampleData.stepBuckets.some(b => b.steps > 0) && (
                                            <div>
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-white/40 text-[10px] uppercase tracking-wider">Steps Throughout Day</span>
                                                </div>
                                                <ResponsiveContainer width="100%" height={72}>
                                                    <BarChart data={sampleData.stepBuckets} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                                                        <XAxis
                                                            dataKey="hour"
                                                            tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 9 }}
                                                            axisLine={false}
                                                            tickLine={false}
                                                        />
                                                        <YAxis hide />
                                                        <Tooltip
                                                            content={({ active, payload }) => {
                                                                if (!active || !payload?.length) return null;
                                                                const d = payload[0].payload as StepBucket;
                                                                return (
                                                                    <div className="bg-green-950/95 border border-white/20 rounded-lg px-2.5 py-1.5 text-xs shadow-lg">
                                                                        <div className="text-white/50 mb-0.5">{d.hour}</div>
                                                                        <div className="text-green-400 font-medium">{d.steps.toLocaleString()} steps</div>
                                                                    </div>
                                                                );
                                                            }}
                                                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                                        />
                                                        <Bar dataKey="steps" fill="#22C55E" fillOpacity={0.6} radius={[3, 3, 0, 0]} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        )}

                                        {/* Heart rate chart */}
                                        {sampleData.hrSamples.length > 1 && (
                                            <div>
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-white/40 text-[10px] uppercase tracking-wider">Workout Heart Rate</span>
                                                    <span className="text-white/30 text-[10px]">
                                                        avg {sampleData.hrAvg} · max {sampleData.hrMax} bpm
                                                    </span>
                                                </div>
                                                <ResponsiveContainer width="100%" height={80}>
                                                    <AreaChart data={sampleData.hrSamples} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                                                        <defs>
                                                            <linearGradient id="hrFillSample" x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="0%" stopColor="#EF4444" stopOpacity={0.35} />
                                                                <stop offset="100%" stopColor="#22C55E" stopOpacity={0.05} />
                                                            </linearGradient>
                                                        </defs>
                                                        <XAxis
                                                            dataKey="min"
                                                            type="number"
                                                            tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 9 }}
                                                            tickFormatter={v => `${Math.round(v)}'`}
                                                            axisLine={false}
                                                            tickLine={false}
                                                            tickCount={4}
                                                        />
                                                        <YAxis hide domain={['dataMin - 5', 'dataMax + 5']} />
                                                        <Tooltip
                                                            content={({ active, payload }) => {
                                                                if (!active || !payload?.length) return null;
                                                                const d = payload[0].payload as HrPoint;
                                                                return (
                                                                    <div className="bg-green-950/95 border border-white/20 rounded-lg px-2.5 py-1.5 text-xs shadow-lg">
                                                                        <div className="text-white/50 mb-0.5">{d.min}&prime;</div>
                                                                        <div className="text-red-400 font-medium">{d.bpm} bpm</div>
                                                                    </div>
                                                                );
                                                            }}
                                                            cursor={{ stroke: 'rgba(255,255,255,0.15)' }}
                                                        />
                                                        <Area
                                                            type="monotone"
                                                            dataKey="bpm"
                                                            stroke="#EF4444"
                                                            fill="url(#hrFillSample)"
                                                            strokeWidth={1.5}
                                                            dot={false}
                                                            activeDot={{ r: 3, fill: '#EF4444', stroke: '#fff', strokeWidth: 1 }}
                                                        />
                                                    </AreaChart>
                                                </ResponsiveContainer>
                                            </div>
                                        )}

                                        {!sampleData.steps && !sampleData.calories && !sampleData.workoutCount && (
                                            <p className="text-white/40 text-sm">No data recorded yesterday.</p>
                                        )}
                                    </>
                                )}
                            </div>
                        )}

                        {/* Data preferences */}
                        {!prefsLoaded && (
                            <div className="space-y-2">
                                <h3 className="text-white/50 text-xs uppercase tracking-wider">Your Data</h3>
                                <div className="bg-white/5 rounded-lg p-3 h-16 animate-pulse" />
                                <div className="bg-white/5 rounded-lg p-3 h-16 animate-pulse" />
                            </div>
                        )}
                        {prefsLoaded && prefsError && (
                            <div className="space-y-2">
                                <h3 className="text-white/50 text-xs uppercase tracking-wider">Your Data</h3>
                                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                                    <p className="text-red-300 text-sm">Could not load your preferences. Data sharing is disabled until preferences load successfully.</p>
                                </div>
                            </div>
                        )}
                        {prefsLoaded && !prefsError && (
                            <div className="space-y-2">
                                <h3 className="text-white/50 text-xs uppercase tracking-wider">Your Data</h3>

                                {/* Save to account toggle */}
                                <div className="bg-white/5 rounded-lg p-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                            <Cloud className={`w-4 h-4 shrink-0 ${syncToAccount ? 'text-blue-400' : 'text-white/20'}`} />
                                            <span className="text-white/80 text-sm">Save to account</span>
                                        </div>
                                        <button
                                            onClick={handleToggleSync}
                                            role="switch"
                                            aria-checked={syncToAccount}
                                            aria-label="Save health data to account"
                                            className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${syncToAccount ? 'bg-blue-500' : 'bg-white/15'}`}
                                        >
                                            <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${syncToAccount ? 'translate-x-4' : ''}`} />
                                        </button>
                                    </div>
                                    <p className="text-white/40 text-[11px] mt-1.5 leading-relaxed pl-[30px]">
                                        Track your performance across games, view stats on the web, and build your fitness profile over time.
                                    </p>
                                </div>

                                {/* Share in leagues */}
                                <div className={`bg-white/5 rounded-lg p-3 space-y-2.5 ${!syncToAccount ? 'opacity-40 pointer-events-none' : ''}`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                            <Users className={`w-4 h-4 shrink-0 ${anyLeagueShared ? 'text-green-400' : 'text-white/20'}`} />
                                            <span className="text-white/80 text-sm">Share in leagues</span>
                                        </div>
                                        {leagues.length > 1 && (
                                            <button
                                                onClick={handleToggleAll}
                                                role="switch"
                                                aria-checked={allLeaguesShared}
                                                aria-label="Share health data in all leagues"
                                                className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${allLeaguesShared ? 'bg-green-500' : 'bg-white/15'}`}
                                            >
                                                <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${allLeaguesShared ? 'translate-x-4' : ''}`} />
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-white/40 text-[11px] leading-relaxed pl-[30px]">
                                        Let league members see your match health stats. You can also change this per game.
                                    </p>

                                    {/* Per-league toggles */}
                                    {leagues.length > 0 && (
                                        <div className="space-y-1 pl-[30px]">
                                            {leagues.map(league => {
                                                const shared = leagueSharing[league.id] === true;
                                                return (
                                                    <div key={league.id} className="flex items-center justify-between py-1.5">
                                                        <span className="text-white/60 text-xs truncate flex-1 mr-2">{league.name}</span>
                                                        <button
                                                            onClick={() => handleToggleLeague(league.id)}
                                                            role="switch"
                                                            aria-checked={shared}
                                                            aria-label={`Share health data in ${league.name}`}
                                                            className={`relative w-8 h-[18px] rounded-full transition-colors shrink-0 ${shared ? 'bg-green-500' : 'bg-white/15'}`}
                                                        >
                                                            <div className={`absolute top-[2px] left-[2px] w-[14px] h-[14px] bg-white rounded-full transition-transform ${shared ? 'translate-x-[14px]' : ''}`} />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                    {leagues.length === 0 && (
                                        <p className="text-white/30 text-[11px] pl-[30px]">No leagues joined yet.</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Health Connect settings link */}
                        <div className="pt-1">
                            <p className="text-white/30 text-[11px] text-center leading-relaxed mb-2">
                                You can update or remove health permissions at any time in your phone&apos;s settings.
                            </p>
                            <button
                                onClick={openHealthConnect}
                                className="w-full flex items-center justify-center gap-2 text-white/40 hover:text-white/60 text-xs py-1.5 transition-colors"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                                Manage in Health Connect
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

/** Menu item that opens the health status modal */
export const HealthMenuItem: React.FC = () => {
    const [showModal, setShowModal] = useState(false);

    if (!Capacitor.isNativePlatform()) return null;

    return (
        <>
            <button
                onClick={() => setShowModal(true)}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors"
            >
                <Activity className="w-4 h-4 text-red-400" />
                My Health Data
            </button>
            {showModal && <HealthStatusModal onClose={() => setShowModal(false)} />}
        </>
    );
};

export default HealthStatusModal;
