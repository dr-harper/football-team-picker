// Pure functions for deriving football match health metrics from Health Connect data

export interface RouteSample {
    timestamp: string;
    lat: number;
    lng: number;
    alt?: number;
}

export interface HeartRateSample {
    timestamp: string;
    bpm: number;
}

export interface SpeedSample {
    timestamp: string;
    speedKmh: number;
}

export interface ActivePeriod {
    startMin: number; // minutes from game start
    endMin: number;
    active: boolean;
    avgHr?: number;
}

export interface HrZone {
    zone: number;
    label: string;
    colour: string;
    minutes: number;
    percentage: number;
}

export interface DerivedMetrics {
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

const DEG_TO_RAD = Math.PI / 180;
const EARTH_RADIUS_M = 6_371_000;

/** Haversine distance between two GPS coordinates in metres */
export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const dLat = (lat2 - lat1) * DEG_TO_RAD;
    const dLng = (lng2 - lng1) * DEG_TO_RAD;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * DEG_TO_RAD) * Math.cos(lat2 * DEG_TO_RAD) * Math.sin(dLng / 2) ** 2;
    return 2 * EARTH_RADIUS_M * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Calculate speed samples from GPS route data */
export function calculateSpeedFromRoute(route: RouteSample[]): {
    avgSpeedKmh: number;
    topSpeedKmh: number;
    speedSamples: SpeedSample[];
} {
    if (route.length < 2) {
        return { avgSpeedKmh: 0, topSpeedKmh: 0, speedSamples: [] };
    }

    const speedSamples: SpeedSample[] = [];
    let totalDistance = 0;
    let topSpeed = 0;

    for (let i = 1; i < route.length; i++) {
        const prev = route[i - 1];
        const curr = route[i];
        const dist = haversineDistance(prev.lat, prev.lng, curr.lat, curr.lng);
        const dt = (new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime()) / 1000;

        if (dt <= 0) continue;

        totalDistance += dist;
        const speedKmh = (dist / dt) * 3.6;

        // Filter out GPS glitches (> 45 km/h is unrealistic for football)
        const clampedSpeed = Math.min(speedKmh, 45);
        speedSamples.push({ timestamp: curr.timestamp, speedKmh: clampedSpeed });
        topSpeed = Math.max(topSpeed, clampedSpeed);
    }

    const totalTime = (new Date(route[route.length - 1].timestamp).getTime() -
        new Date(route[0].timestamp).getTime()) / 1000;
    const avgSpeedKmh = totalTime > 0 ? (totalDistance / totalTime) * 3.6 : 0;

    return {
        avgSpeedKmh: Math.round(avgSpeedKmh * 10) / 10,
        topSpeedKmh: Math.round(topSpeed * 10) / 10,
        speedSamples,
    };
}

/** Fallback speed from total distance and duration */
export function calculateSpeedFromTotals(distanceMetres: number, durationSeconds: number): number {
    if (durationSeconds <= 0) return 0;
    return Math.round(((distanceMetres / durationSeconds) * 3.6) * 10) / 10;
}

/** Calculate pace in min/km */
export function calculatePace(distanceMetres: number, durationSeconds: number): number | undefined {
    if (distanceMetres < 500) return undefined; // too short for meaningful pace
    const kmPerSec = distanceMetres / 1000 / durationSeconds;
    if (kmPerSec <= 0) return undefined;
    return Math.round((1 / kmPerSec) / 60 * 10) / 10; // min per km
}

const HR_ZONES: { zone: number; label: string; colour: string; minPct: number; maxPct: number }[] = [
    { zone: 1, label: 'Recovery', colour: '#94A3B8', minPct: 0, maxPct: 0.6 },
    { zone: 2, label: 'Easy', colour: '#22C55E', minPct: 0.6, maxPct: 0.7 },
    { zone: 3, label: 'Cardio', colour: '#EAB308', minPct: 0.7, maxPct: 0.8 },
    { zone: 4, label: 'Hard', colour: '#F97316', minPct: 0.8, maxPct: 0.9 },
    { zone: 5, label: 'Max', colour: '#EF4444', minPct: 0.9, maxPct: 1.1 },
];

/** Classify heart rate samples into 5 zones */
export function classifyHeartRateZones(samples: HeartRateSample[], maxHr = 190): HrZone[] {
    if (samples.length < 2) return [];

    const zoneTimes = [0, 0, 0, 0, 0]; // seconds per zone

    for (let i = 1; i < samples.length; i++) {
        const dt = (new Date(samples[i].timestamp).getTime() -
            new Date(samples[i - 1].timestamp).getTime()) / 1000;
        if (dt <= 0 || dt > 300) continue; // skip gaps > 5 min

        const pct = samples[i].bpm / maxHr;
        const zoneIdx = HR_ZONES.findIndex(z => pct < z.maxPct);
        zoneTimes[zoneIdx >= 0 ? zoneIdx : 4] += dt;
    }

    const totalSec = zoneTimes.reduce((s, t) => s + t, 0);
    if (totalSec === 0) return [];

    return HR_ZONES.map((z, i) => ({
        zone: z.zone,
        label: z.label,
        colour: z.colour,
        minutes: Math.round(zoneTimes[i] / 60),
        percentage: Math.round((zoneTimes[i] / totalSec) * 100),
    }));
}

/** TRIMP-style intensity score (0-100+) */
export function calculateIntensityScore(samples: HeartRateSample[], maxHr = 190): number {
    if (samples.length < 2) return 0;

    const zoneWeights = [1, 1.5, 2.5, 3.5, 5];
    let score = 0;

    for (let i = 1; i < samples.length; i++) {
        const dt = (new Date(samples[i].timestamp).getTime() -
            new Date(samples[i - 1].timestamp).getTime()) / 1000;
        if (dt <= 0 || dt > 300) continue;

        const pct = samples[i].bpm / maxHr;
        const zoneIdx = HR_ZONES.findIndex(z => pct < z.maxPct);
        const weight = zoneWeights[zoneIdx >= 0 ? zoneIdx : 4];
        score += (dt / 60) * weight;
    }

    // Normalise: a full 90-min game at zone 3 (moderate football) ≈ score of 75
    return Math.round(score / 2.25);
}

/** Detect active vs inactive periods relative to game start.
 *  "Inactive" = no HR data for 5+ minutes (player off the pitch / tracker not worn).
 *  We don't use HR threshold — during casual football you regularly dip below 100 bpm. */
export function detectActivePeriods(
    hrSamples: HeartRateSample[],
    gameStartMs: number,
    gameDurationMin: number,
): ActivePeriod[] {
    if (hrSamples.length < 2) return [];

    const DATA_GAP_MS = 5 * 60 * 1000; // 5 minutes without data = inactive
    const gameEndMs = gameStartMs + gameDurationMin * 60 * 1000;

    // Filter samples to game window (with 2-min buffer either side)
    const relevant = hrSamples.filter(s => {
        const t = new Date(s.timestamp).getTime();
        return t >= gameStartMs - 2 * 60 * 1000 && t <= gameEndMs + 2 * 60 * 1000;
    });

    if (relevant.length < 2) return [];

    const periods: ActivePeriod[] = [];
    const firstSampleMin = Math.max(0, (new Date(relevant[0].timestamp).getTime() - gameStartMs) / 60000);

    // If data starts well after game start, mark the gap as inactive
    if (firstSampleMin > 3) {
        periods.push({ startMin: 0, endMin: Math.round(firstSampleMin), active: false });
    }

    let periodStart = firstSampleMin;
    let hrSum = relevant[0].bpm;
    let hrCount = 1;

    for (let i = 1; i < relevant.length; i++) {
        const t = new Date(relevant[i].timestamp).getTime();
        const prevT = new Date(relevant[i - 1].timestamp).getTime();
        const minFromStart = (t - gameStartMs) / 60000;
        const gap = t - prevT;

        if (gap > DATA_GAP_MS) {
            // Close the active period before the gap
            const gapStartMin = (prevT - gameStartMs) / 60000;
            periods.push({
                startMin: Math.max(0, Math.round(periodStart)),
                endMin: Math.min(gameDurationMin, Math.round(gapStartMin)),
                active: true,
                avgHr: Math.round(hrSum / hrCount),
            });

            // Insert inactive period for the gap
            periods.push({
                startMin: Math.round(gapStartMin),
                endMin: Math.min(gameDurationMin, Math.round(minFromStart)),
                active: false,
            });

            periodStart = minFromStart;
            hrSum = 0;
            hrCount = 0;
        }

        hrSum += relevant[i].bpm;
        hrCount++;
    }

    // Close final active period
    const lastMin = (new Date(relevant[relevant.length - 1].timestamp).getTime() - gameStartMs) / 60000;
    periods.push({
        startMin: Math.max(0, Math.round(periodStart)),
        endMin: Math.min(gameDurationMin, Math.round(lastMin)),
        active: true,
        avgHr: hrCount > 0 ? Math.round(hrSum / hrCount) : undefined,
    });

    // If data ends before game end, mark trailing gap as inactive
    if (lastMin < gameDurationMin - 3) {
        periods.push({
            startMin: Math.round(lastMin),
            endMin: gameDurationMin,
            active: false,
        });
    }

    return periods;
}

/** Count sprints (speed bursts above threshold) */
export function detectSprints(speedSamples: SpeedSample[], thresholdKmh = 20): number {
    if (speedSamples.length === 0) return 0;

    let sprints = 0;
    let inSprint = false;

    for (const s of speedSamples) {
        if (s.speedKmh >= thresholdKmh && !inSprint) {
            sprints++;
            inSprint = true;
        } else if (s.speedKmh < thresholdKmh * 0.7) {
            // Must drop below 70% of threshold to end the sprint
            inSprint = false;
        }
    }

    return sprints;
}

/** Get intensity label and colour for a score */
export function intensityLabel(score: number): { label: string; colour: string } {
    if (score < 30) return { label: 'Light', colour: '#94A3B8' };
    if (score < 50) return { label: 'Moderate', colour: '#22C55E' };
    if (score < 70) return { label: 'Hard', colour: '#F97316' };
    return { label: 'Intense', colour: '#EF4444' };
}

/** Get colour for a HR value based on zone */
export function hrZoneColour(bpm: number, maxHr = 190): string {
    const pct = bpm / maxHr;
    const zone = HR_ZONES.find(z => pct < z.maxPct);
    return zone?.colour ?? '#EF4444';
}

/** Derive all metrics from raw workout data */
export function deriveAllMetrics(opts: {
    heartRateSamples?: HeartRateSample[];
    route?: RouteSample[];
    distanceMetres?: number;
    durationSeconds?: number;
    gameStartMs: number;
    gameDurationMin?: number;
    maxHr?: number;
}): DerivedMetrics {
    const {
        heartRateSamples = [],
        route = [],
        distanceMetres = 0,
        durationSeconds = 0,
        gameStartMs,
        gameDurationMin = 90,
        maxHr = 190,
    } = opts;

    // Speed
    let avgSpeedKmh: number | undefined;
    let topSpeedKmh: number | undefined;
    let speedSamples: SpeedSample[] = [];

    if (route.length >= 2) {
        const routeSpeed = calculateSpeedFromRoute(route);
        avgSpeedKmh = routeSpeed.avgSpeedKmh;
        topSpeedKmh = routeSpeed.topSpeedKmh;
        speedSamples = routeSpeed.speedSamples;
    } else if (distanceMetres > 0 && durationSeconds > 0) {
        avgSpeedKmh = calculateSpeedFromTotals(distanceMetres, durationSeconds);
    }

    const paceMinPerKm = distanceMetres > 0 && durationSeconds > 0
        ? calculatePace(distanceMetres, durationSeconds)
        : undefined;

    // Heart rate zones
    const heartRateZones = classifyHeartRateZones(heartRateSamples, maxHr);
    const intensityScore = calculateIntensityScore(heartRateSamples, maxHr);

    // Active periods
    const activePeriods = detectActivePeriods(heartRateSamples, gameStartMs, gameDurationMin);
    const activeMinutes = activePeriods
        .filter(p => p.active)
        .reduce((sum, p) => sum + (p.endMin - p.startMin), 0);

    // Sprints
    const sprintCount = detectSprints(speedSamples);

    return {
        avgSpeedKmh,
        topSpeedKmh,
        paceMinPerKm,
        speedSamples,
        heartRateZones,
        intensityScore,
        activePeriods,
        activeMinutes,
        sprintCount,
    };
}
