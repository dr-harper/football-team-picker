import React from 'react';
import { Heart, Flame, Footprints, MapPin, Activity, Timer, Zap, TrendingUp, Share2, ShieldCheck } from 'lucide-react';
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
    data, matchDurationMinutes, shared, sharingLoading, onToggleSharing, fromStore,
}: {
    data: GameHealthData;
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
        <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-4 space-y-3">
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

            {/* Enhanced HR chart */}
            {hasHrChart && (
                <EnhancedHeartRateChart
                    samples={data.heartRateSamples!}
                    speedSamples={data.speedSamples}
                    activePeriods={data.activePeriods}
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
    // Generate time markers at sensible intervals
    const interval = displayMin <= 30 ? 10 : 15;
    const markers: number[] = [];
    for (let m = 0; m <= displayMin; m += interval) markers.push(m);

    return (
        <div className="pt-1">
            <div className="flex items-center justify-between mb-1">
                <span className="text-white/40 text-[10px] uppercase tracking-wider">Match Timeline</span>
            </div>
            <svg viewBox={`0 0 320 28`} className="w-full h-7">
                {/* Background bar — inset to leave room for edge labels */}
                <rect x="10" y="2" width="300" height="16" rx="4" fill="rgba(255,255,255,0.05)" />

                {/* Active period segments */}
                {activePeriods.map((p, i) => {
                    const x = 10 + (p.startMin / displayMin) * 300;
                    const w = Math.max(((p.endMin - p.startMin) / displayMin) * 300, 1);
                    if (!p.active) return null;

                    const colour = p.avgHr ? hrZoneColour(p.avgHr) : '#22C55E';
                    return (
                        <rect
                            key={i}
                            x={x}
                            y="2"
                            width={w}
                            height="16"
                            rx={i === 0 ? 4 : 0}
                            fill={colour}
                            fillOpacity="0.6"
                        />
                    );
                })}

                {/* Time labels */}
                {markers.map((m, i) => (
                    <text
                        key={m}
                        x={10 + (m / displayMin) * 300}
                        y="27"
                        textAnchor={i === 0 ? 'start' : i === markers.length - 1 ? 'end' : 'middle'}
                        fill="rgba(255,255,255,0.3)"
                        fontSize="7"
                        fontFamily="system-ui"
                    >
                        {m}&apos;
                    </text>
                ))}
            </svg>
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

// ─── Enhanced HR Chart ───────────────────────────────────────────────

function EnhancedHeartRateChart({
    samples,
    speedSamples,
    activePeriods,
}: {
    samples: { timestamp: string; bpm: number }[];
    speedSamples: { timestamp: string; speedKmh: number }[];
    activePeriods: ActivePeriod[];
}) {
    const width = 300;
    const height = 80;
    const padding = 4;
    const chartH = height - 16; // leave room for labels

    const bpms = samples.map(s => s.bpm);
    const minBpm = Math.min(...bpms);
    const maxBpm = Math.max(...bpms);
    const range = maxBpm - minBpm || 1;

    const startMs = new Date(samples[0].timestamp).getTime();
    const endMs = new Date(samples[samples.length - 1].timestamp).getTime();
    const totalMs = endMs - startMs || 1;

    const toX = (ts: string) => padding + ((new Date(ts).getTime() - startMs) / totalMs) * (width - 2 * padding);
    const toY = (bpm: number) => padding + chartH - ((bpm - minBpm) / range) * (chartH - 2 * padding);

    // Build HR polyline points
    const points = samples.map(s => `${toX(s.timestamp)},${toY(s.bpm)}`).join(' ');

    // Build speed polyline (if GPS data available)
    const hasSpeed = speedSamples.length > 1;
    let speedPoints = '';
    let maxSpeed = 0;
    if (hasSpeed) {
        maxSpeed = Math.max(...speedSamples.map(s => s.speedKmh));
        const speedRange = maxSpeed || 1;
        speedPoints = speedSamples.map(s => {
            const x = toX(s.timestamp);
            const y = padding + chartH - (s.speedKmh / speedRange) * (chartH - 2 * padding);
            return `${x},${y}`;
        }).join(' ');
    }

    // Build zone-coloured gradient stops
    const zoneStops = [
        { offset: '0%', colour: '#EF4444' },   // top = max zone (red)
        { offset: '30%', colour: '#F97316' },   // hard (orange)
        { offset: '50%', colour: '#EAB308' },   // cardio (yellow)
        { offset: '75%', colour: '#22C55E' },   // easy (green)
        { offset: '100%', colour: '#94A3B8' },  // recovery (grey)
    ];

    // Inactive period grey bands
    const inactiveBands = activePeriods.filter(p => !p.active).map(p => {
        const pStartMs = startMs + (p.startMin * 60 * 1000);
        const pEndMs = startMs + (p.endMin * 60 * 1000);
        const x1 = padding + ((pStartMs - startMs) / totalMs) * (width - 2 * padding);
        const x2 = padding + ((pEndMs - startMs) / totalMs) * (width - 2 * padding);
        return { x: x1, w: Math.max(x2 - x1, 1) };
    });

    return (
        <div className="pt-1">
            <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-3">
                    <span className="text-white/40 text-[10px] uppercase tracking-wider">Heart Rate</span>
                    {hasSpeed && (
                        <span className="text-cyan-400/40 text-[10px] uppercase tracking-wider">+ Movement</span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-white/30 text-[10px]">{minBpm}–{maxBpm} bpm</span>
                    {hasSpeed && (
                        <span className="text-cyan-400/30 text-[10px]">{Math.round(maxSpeed)} km/h</span>
                    )}
                </div>
            </div>
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height: '5rem' }} preserveAspectRatio="none">
                <defs>
                    <linearGradient id="hrZoneGradient" x1="0" y1="0" x2="0" y2="1">
                        {zoneStops.map(s => (
                            <stop key={s.offset} offset={s.offset} stopColor={s.colour} stopOpacity="0.25" />
                        ))}
                    </linearGradient>
                    <linearGradient id="hrLineGradient" x1="0" y1="0" x2="0" y2="1">
                        {zoneStops.map(s => (
                            <stop key={s.offset} offset={s.offset} stopColor={s.colour} stopOpacity="1" />
                        ))}
                    </linearGradient>
                    <clipPath id="hrClip">
                        <polygon points={`${padding},${chartH} ${points} ${width - padding},${chartH}`} />
                    </clipPath>
                </defs>

                {/* Inactive period bands */}
                {inactiveBands.map((band, i) => (
                    <rect
                        key={i}
                        x={band.x}
                        y={0}
                        width={band.w}
                        height={chartH}
                        fill="rgba(255,255,255,0.05)"
                    />
                ))}

                {/* Zone-coloured fill under the curve */}
                <rect
                    x={padding}
                    y={padding}
                    width={width - 2 * padding}
                    height={chartH - padding}
                    fill="url(#hrZoneGradient)"
                    clipPath="url(#hrClip)"
                />

                {/* Speed/movement line (behind HR line) */}
                {hasSpeed && (
                    <>
                        <polyline
                            points={speedPoints}
                            fill="none"
                            stroke="rgba(34,211,238,0.2)"
                            strokeWidth="3"
                            strokeLinejoin="round"
                        />
                        <polyline
                            points={speedPoints}
                            fill="none"
                            stroke="rgba(34,211,238,0.5)"
                            strokeWidth="1"
                            strokeLinejoin="round"
                        />
                    </>
                )}

                {/* HR line */}
                <polyline
                    points={points}
                    fill="none"
                    stroke="url(#hrLineGradient)"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                />

                {/* Time labels */}
                <text x={padding} y={height - 2} fill="rgba(255,255,255,0.25)" fontSize="7" fontFamily="system-ui">
                    0&apos;
                </text>
                <text x={width - padding} y={height - 2} fill="rgba(255,255,255,0.25)" fontSize="7" fontFamily="system-ui" textAnchor="end">
                    {Math.round(totalMs / 60000)}&apos;
                </text>
            </svg>
        </div>
    );
}

export default GameHealthCard;
