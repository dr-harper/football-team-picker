import React from 'react';
import { Heart, Flame, Footprints, MapPin, Activity, Timer, Zap, TrendingUp, Share2, ShieldCheck } from 'lucide-react';
import {
    ResponsiveContainer, AreaChart, Area, BarChart, Bar,
    XAxis, YAxis, Tooltip, type TooltipProps,
} from 'recharts';
import { useGameHealth, type GameHealthData } from '../hooks/useGameHealth';
import { intensityLabel, hrZoneColour, type ActivePeriod, type HrZone } from '../utils/healthMetrics';

interface GameHealthCardProps {
    gameDate: number;
    gameStatus: string;
    matchDurationMinutes?: number;
    gameId?: string;
    userId?: string;
    leagueId?: string;
}

const GameHealthCard: React.FC<GameHealthCardProps> = ({
    gameDate, gameStatus, matchDurationMinutes = 60,
    gameId, userId, leagueId,
}) => {
    const {
        data, loading, error, isNative, available, permissionGranted,
        requestPermission, openPlayStore, shared, sharingLoading, toggleSharing, fromStore,
    } = useGameHealth(gameDate, gameStatus, matchDurationMinutes, gameId, userId, leagueId);

    // On web with no stored data, show nothing (no install prompts)
    if (!isNative && !fromStore && !data) return null;

    // Native: show install/permission prompts
    if (isNative) {
        if (!available) {
            return (
                <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Activity className="w-5 h-5 text-red-400" />
                        <h3 className="text-white font-semibold text-sm">Your Match Health</h3>
                    </div>
                    <p className="text-white/60 text-sm mb-3">
                        Install Health Connect to see your heart rate, calories and distance from this match.
                    </p>
                    <button
                        onClick={openPlayStore}
                        className="bg-red-500/20 hover:bg-red-500/30 text-red-300 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                    >
                        Install Health Connect
                    </button>
                </div>
            );
        }

        if (!permissionGranted) {
            return (
                <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Activity className="w-5 h-5 text-red-400" />
                        <h3 className="text-white font-semibold text-sm">Your Match Health</h3>
                    </div>
                    <p className="text-white/60 text-sm mb-3">
                        Connect Health Connect to see your stats from this match — heart rate, calories, distance and more.
                    </p>
                    <button
                        onClick={requestPermission}
                        className="bg-red-500/20 hover:bg-red-500/30 text-red-300 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                    >
                        Connect Health Data
                    </button>
                </div>
            );
        }
    }

    if (loading) {
        return (
            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-red-400 animate-pulse" />
                    <span className="text-white/60 text-sm">Loading health data...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-red-400" />
                    <span className="text-red-300 text-sm">{error}</span>
                </div>
            </div>
        );
    }

    if (!data) return null;

    return (
        <HealthDataCard
            data={data}
            gameDate={gameDate}
            matchDurationMinutes={matchDurationMinutes}
            shared={shared}
            sharingLoading={sharingLoading}
            onToggleSharing={gameId && userId ? toggleSharing : undefined}
            fromStore={fromStore}
        />
    );
};

// ─── Main data display ───────────────────────────────────────────────

function HealthDataCard({
    data, gameDate, matchDurationMinutes, shared, sharingLoading, onToggleSharing, fromStore,
}: {
    data: GameHealthData;
    gameDate: number;
    matchDurationMinutes: number;
    shared: boolean;
    sharingLoading: boolean;
    onToggleSharing?: () => Promise<void>;
    fromStore: boolean;
}) {
    const intensity = data.intensityScore > 0 ? intensityLabel(data.intensityScore) : null;

    const heroStats = [
        data.distance && {
            icon: <MapPin className="w-4 h-4 text-blue-400" />,
            value: data.distance >= 1000 ? (data.distance / 1000).toFixed(1) : `${data.distance}`,
            unit: data.distance >= 1000 ? 'km' : 'm',
            label: 'Distance',
        },
        data.activeMinutes > 0 && {
            icon: <Timer className="w-4 h-4 text-purple-400" />,
            value: `${data.activeMinutes}`,
            unit: data.duration ? `/${Math.round(data.duration / 60)}` : 'min',
            label: 'Active',
        },
        data.heartRateAvg && {
            icon: <Heart className="w-4 h-4 text-red-400" />,
            value: `${data.heartRateAvg}`,
            unit: 'bpm',
            label: 'Avg HR',
        },
        data.calories && {
            icon: <Flame className="w-4 h-4 text-orange-400" />,
            value: `${data.calories}`,
            unit: 'kcal',
            label: 'Calories',
        },
    ].filter(Boolean) as { icon: React.ReactNode; value: string; unit: string; label: string }[];

    const secondaryStats = [
        data.heartRateMax && {
            icon: <Heart className="w-3.5 h-3.5 text-red-500" />,
            label: 'Max HR',
            value: `${data.heartRateMax}`,
            unit: 'bpm',
        },
        data.avgSpeedKmh && {
            icon: <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />,
            label: 'Avg Speed',
            value: `${data.avgSpeedKmh}`,
            unit: 'km/h',
        },
        data.topSpeedKmh && data.topSpeedKmh > 0 && {
            icon: <Zap className="w-3.5 h-3.5 text-yellow-400" />,
            label: 'Top Speed',
            value: `${data.topSpeedKmh}`,
            unit: 'km/h',
        },
        data.steps && {
            icon: <Footprints className="w-3.5 h-3.5 text-green-400" />,
            label: 'Steps',
            value: data.steps.toLocaleString(),
            unit: '',
        },
        data.sprintCount > 0 && {
            icon: <Zap className="w-3.5 h-3.5 text-amber-400" />,
            label: 'Sprints',
            value: `${data.sprintCount}`,
            unit: '',
        },
        data.paceMinPerKm && {
            icon: <Timer className="w-3.5 h-3.5 text-teal-400" />,
            label: 'Pace',
            value: `${data.paceMinPerKm}`,
            unit: 'min/km',
        },
    ].filter(Boolean) as { icon: React.ReactNode; label: string; value: string; unit: string }[];

    const hasHeroStats = heroStats.length > 0;
    const hasTimeline = data.activePeriods.length > 0;
    const hasZones = data.heartRateZones.length > 0;
    const hasHrChart = data.heartRateSamples && data.heartRateSamples.length > 1;

    if (!hasHeroStats && secondaryStats.length === 0) return null;

    return (
        <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-4 space-y-3 overflow-hidden max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-red-400" />
                <h3 className="text-white font-semibold text-sm">Your Match Health</h3>
                {intensity && (
                    <span
                        className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: intensity.colour + '25', color: intensity.colour }}
                    >
                        {data.intensityScore} · {intensity.label}
                    </span>
                )}
                {!intensity && data.workoutType && (
                    <span className="text-white/40 text-xs ml-auto">{data.workoutType}</span>
                )}
            </div>

            {/* Hero stats */}
            {hasHeroStats && (
                <div className="grid grid-cols-4 gap-2">
                    {heroStats.map(({ icon, value, unit, label }) => (
                        <div key={label} className="text-center">
                            <div className="flex items-center justify-center gap-1 mb-0.5">
                                {icon}
                            </div>
                            <div className="text-white font-bold text-lg leading-tight">
                                {value}
                                <span className="text-white/40 text-[10px] font-normal ml-0.5">{unit}</span>
                            </div>
                            <div className="text-white/40 text-[10px]">{label}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Game timeline */}
            {hasTimeline && (
                <GameTimeline
                    activePeriods={data.activePeriods}
                    totalMinutes={data.duration ? Math.max(Math.round(data.duration / 60), matchDurationMinutes) : matchDurationMinutes}
                />
            )}

            {/* HR Zones */}
            {hasZones && <HeartRateZonesBar zones={data.heartRateZones} />}

            {/* HR chart */}
            {hasHrChart && (
                <HeartRateChart
                    samples={data.heartRateSamples!}
                    gameDate={gameDate}
                    matchDurationMinutes={matchDurationMinutes}
                    activePeriods={data.activePeriods}
                />
            )}

            {/* Distance chart */}
            {data.distanceBuckets && data.distanceBuckets.length > 0 && (
                <DistanceChart
                    buckets={data.distanceBuckets}
                    totalDistance={data.distance ?? 0}
                />
            )}

            {/* Secondary stats */}
            {secondaryStats.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                    {secondaryStats.map(({ icon, label, value, unit }) => (
                        <div key={label} className="bg-white/5 rounded-lg p-2 flex items-center gap-2">
                            {icon}
                            <div>
                                <div className="text-white font-semibold text-sm leading-tight">
                                    {value}
                                    {unit && <span className="text-white/40 text-[10px] font-normal ml-0.5">{unit}</span>}
                                </div>
                                <div className="text-white/40 text-[10px]">{label}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Sharing toggle */}
            {onToggleSharing && (
                <div className="flex items-center justify-between pt-1 border-t border-white/5">
                    <div className="flex items-center gap-2">
                        {shared ? (
                            <Share2 className="w-3.5 h-3.5 text-green-400" />
                        ) : (
                            <ShieldCheck className="w-3.5 h-3.5 text-white/30" />
                        )}
                        <span className="text-white/50 text-xs">
                            {shared ? 'Shared with league' : 'Private — only you can see this'}
                        </span>
                    </div>
                    <button
                        onClick={onToggleSharing}
                        disabled={sharingLoading}
                        className={`text-xs px-2 py-1 rounded transition-colors disabled:opacity-50 ${
                            shared
                                ? 'text-white/40 hover:text-red-400'
                                : 'text-green-400 hover:text-green-300'
                        }`}
                    >
                        {sharingLoading ? 'Saving...' : shared ? 'Make Private' : 'Share'}
                    </button>
                </div>
            )}

            {/* From store indicator */}
            {fromStore && (
                <div className="text-white/20 text-[10px] text-center">
                    Synced from your device
                </div>
            )}
        </div>
    );
}

// ─── Game Timeline ───────────────────────────────────────────────────

function GameTimeline({ activePeriods, totalMinutes }: { activePeriods: ActivePeriod[]; totalMinutes: number }) {
    const displayMin = Math.max(totalMinutes, 30);
    const interval = displayMin <= 30 ? 10 : 15;
    const markers: number[] = [];
    for (let m = 0; m <= displayMin; m += interval) markers.push(m);

    return (
        <div className="pt-1">
            <div className="flex items-center justify-between mb-1">
                <span className="text-white/40 text-[10px] uppercase tracking-wider">Match Timeline</span>
            </div>
            {/* Bar */}
            <div className="relative w-full h-4 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                {activePeriods.map((p, i) => {
                    if (!p.active) return null;
                    const left = (p.startMin / displayMin) * 100;
                    const width = Math.max(((p.endMin - p.startMin) / displayMin) * 100, 0.5);
                    const colour = p.avgHr ? hrZoneColour(p.avgHr) : '#22C55E';
                    return (
                        <div
                            key={i}
                            className="absolute top-0 h-full"
                            style={{ left: `${left}%`, width: `${width}%`, backgroundColor: colour, opacity: 0.6 }}
                        />
                    );
                })}
            </div>
            {/* Time labels */}
            <div className="relative w-full h-4 mt-0.5">
                {markers.map((m, i) => (
                    <span
                        key={m}
                        className="absolute text-white/30 text-[10px]"
                        style={{
                            left: `${(m / displayMin) * 100}%`,
                            transform: i === 0 ? 'none' : i === markers.length - 1 ? 'translateX(-100%)' : 'translateX(-50%)',
                        }}
                    >
                        {m}&prime;
                    </span>
                ))}
            </div>
        </div>
    );
}

// ─── HR Zones Bar ────────────────────────────────────────────────────

function HeartRateZonesBar({ zones }: { zones: HrZone[] }) {
    const activeZones = zones.filter(z => z.percentage > 0);
    if (activeZones.length === 0) return null;

    return (
        <div>
            <div className="flex items-center justify-between mb-1">
                <span className="text-white/40 text-[10px] uppercase tracking-wider">Heart Rate Zones</span>
            </div>
            {/* Stacked bar */}
            <div className="flex h-4 rounded-full overflow-hidden">
                {activeZones.map(z => (
                    <div
                        key={z.zone}
                        style={{ width: `${z.percentage}%`, backgroundColor: z.colour }}
                        className="relative group"
                    />
                ))}
            </div>
            {/* Zone labels */}
            <div className="flex gap-3 mt-1.5 flex-wrap">
                {activeZones.map(z => (
                    <div key={z.zone} className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: z.colour }} />
                        <span className="text-white/50 text-[10px]">
                            {z.label} <span className="text-white/30">{z.minutes}m</span>
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Shared chart helpers ────────────────────────────────────────────

function ChartTooltipContent({ active, payload, labelFormatter }: TooltipProps<number, string> & { labelFormatter?: (v: number) => string }) {
    if (!active || !payload?.length) return null;
    const label = labelFormatter ? labelFormatter(payload[0].payload.min as number) : '';
    return (
        <div className="bg-green-950/95 border border-white/20 rounded-lg px-2.5 py-1.5 text-xs shadow-lg">
            <div className="text-white/50 mb-0.5">{label}</div>
            {payload.map((p, i) => (
                <div key={i} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                    <span className="text-white font-medium">{p.value}{p.unit ?? ''}</span>
                    <span className="text-white/40">{p.name}</span>
                </div>
            ))}
        </div>
    );
}

// ─── Heart Rate Chart (Recharts) ─────────────────────────────────────

function HeartRateChart({
    samples,
    gameDate,
    matchDurationMinutes,
    activePeriods,
}: {
    samples: { timestamp: string; bpm: number }[];
    gameDate: number;
    matchDurationMinutes: number;
    activePeriods: ActivePeriod[];
}) {
    void activePeriods; // reserved for future inactive-band overlay

    const data = samples.map(s => ({
        min: (new Date(s.timestamp).getTime() - gameDate) / 60000,
        bpm: s.bpm,
    }));

    const bpms = samples.map(s => s.bpm);
    const minBpm = Math.min(...bpms);
    const maxBpm = Math.max(...bpms);

    // X-axis spans from kickoff (0) to at least match duration or last sample
    const lastMin = data[data.length - 1].min;
    const xMax = Math.max(matchDurationMinutes, Math.ceil(lastMin));

    return (
        <div className="pt-1" style={{ WebkitTapHighlightColor: 'transparent' }}>
            <div className="flex items-center justify-between mb-1">
                <span className="text-white/40 text-[10px] uppercase tracking-wider">Heart Rate</span>
                <span className="text-white/30 text-[10px]">{minBpm}–{maxBpm} bpm</span>
            </div>
            <ResponsiveContainer width="100%" height={100}>
                <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                    <defs>
                        <linearGradient id="hrFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#EF4444" stopOpacity={0.35} />
                            <stop offset="40%" stopColor="#F97316" stopOpacity={0.2} />
                            <stop offset="70%" stopColor="#22C55E" stopOpacity={0.1} />
                            <stop offset="100%" stopColor="#94A3B8" stopOpacity={0.05} />
                        </linearGradient>
                        <linearGradient id="hrStroke" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#EF4444" />
                            <stop offset="40%" stopColor="#F97316" />
                            <stop offset="70%" stopColor="#22C55E" />
                            <stop offset="100%" stopColor="#94A3B8" />
                        </linearGradient>
                    </defs>
                    <XAxis
                        dataKey="min"
                        type="number"
                        domain={[0, xMax]}
                        tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10 }}
                        tickFormatter={v => `${Math.round(v)}'`}
                        axisLine={false}
                        tickLine={false}
                        tickCount={5}
                    />
                    <YAxis hide domain={[minBpm - 5, maxBpm + 5]} />
                    <Tooltip
                        content={<ChartTooltipContent labelFormatter={v => `${Math.round(v)}'`} />}
                        cursor={{ stroke: 'rgba(255,255,255,0.15)' }}
                    />
                    <Area
                        type="monotone"
                        dataKey="bpm"
                        name="bpm"
                        stroke="url(#hrStroke)"
                        fill="url(#hrFill)"
                        strokeWidth={1.5}
                        dot={false}
                        activeDot={{ r: 3, fill: '#EF4444', stroke: '#fff', strokeWidth: 1 }}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}

// ─── Distance Per 5 Min Bar Chart (Recharts) ─────────────────────────

function DistanceChart({
    buckets,
    totalDistance,
}: {
    buckets: { startMin: number; endMin: number; distanceM: number }[];
    totalDistance: number; // metres
}) {
    const data = buckets.map(b => ({
        label: `${b.startMin}'–${b.endMin}'`,
        distM: b.distanceM,
    }));

    const totalKm = totalDistance / 1000;
    const maxDist = Math.max(...buckets.map(b => b.distanceM), 1);

    return (
        <div className="pt-1" style={{ WebkitTapHighlightColor: 'transparent' }}>
            <div className="flex items-center justify-between mb-1">
                <span className="text-cyan-400/50 text-[10px] uppercase tracking-wider">Distance Per 5 Min</span>
                <span className="text-cyan-400/30 text-[10px]">{totalKm.toFixed(1)} km total</span>
            </div>
            <ResponsiveContainer width="100%" height={92}>
                <BarChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                    <XAxis
                        dataKey="label"
                        tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 9 }}
                        axisLine={false}
                        tickLine={false}
                        interval={1}
                    />
                    <YAxis hide domain={[0, maxDist * 1.1]} />
                    <Tooltip
                        content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0].payload;
                            return (
                                <div className="bg-green-950/95 border border-white/20 rounded-lg px-2.5 py-1.5 text-xs shadow-lg">
                                    <div className="text-white/50 mb-0.5">{d.label}</div>
                                    <div className="text-cyan-400 font-medium">{d.distM}m</div>
                                </div>
                            );
                        }}
                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    />
                    <Bar
                        dataKey="distM"
                        fill="#22D3EE"
                        fillOpacity={0.6}
                        radius={[3, 3, 0, 0]}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

export default GameHealthCard;
