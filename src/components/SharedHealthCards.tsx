import React from 'react';
import { Heart, Flame, MapPin, Timer, Users } from 'lucide-react';
import { useSharedGameHealth } from '../hooks/useSharedGameHealth';
import { intensityLabel } from '../utils/healthMetrics';
import type { StoredGameHealth } from '../types';

interface SharedHealthCardsProps {
    gameId?: string;
    userId?: string;
    lookup: Record<string, string>; // userId → displayName
}

const SharedHealthCards: React.FC<SharedHealthCardsProps> = ({ gameId, userId, lookup }) => {
    const { entries, loading } = useSharedGameHealth(gameId, userId);

    if (loading) return null;
    if (entries.length === 0) return null;

    return (
        <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                <h3 className="text-white font-semibold text-sm">Team Health</h3>
                <span className="text-white/30 text-xs ml-auto">{entries.length} player{entries.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="space-y-2">
                {entries.map(entry => (
                    <SharedPlayerRow key={entry.userId} entry={entry} name={lookup[entry.userId] ?? 'Player'} />
                ))}
            </div>
        </div>
    );
};

function SharedPlayerRow({ entry, name }: { entry: StoredGameHealth; name: string }) {
    const intensity = entry.intensityScore > 0 ? intensityLabel(entry.intensityScore) : null;

    return (
        <div className="bg-white/5 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
                <span className="text-white text-sm font-medium">{name}</span>
                {intensity && (
                    <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ backgroundColor: intensity.colour + '25', color: intensity.colour }}
                    >
                        {entry.intensityScore}
                    </span>
                )}
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
                {entry.distance && (
                    <MiniStat
                        icon={<MapPin className="w-3 h-3 text-blue-400" />}
                        value={entry.distance >= 1000 ? `${(entry.distance / 1000).toFixed(1)}` : `${entry.distance}`}
                        unit={entry.distance >= 1000 ? 'km' : 'm'}
                    />
                )}
                {entry.activeMinutes > 0 && (
                    <MiniStat
                        icon={<Timer className="w-3 h-3 text-purple-400" />}
                        value={`${entry.activeMinutes}`}
                        unit="min"
                    />
                )}
                {entry.heartRateAvg && (
                    <MiniStat
                        icon={<Heart className="w-3 h-3 text-red-400" />}
                        value={`${entry.heartRateAvg}`}
                        unit="bpm"
                    />
                )}
                {entry.calories && (
                    <MiniStat
                        icon={<Flame className="w-3 h-3 text-orange-400" />}
                        value={`${entry.calories}`}
                        unit="kcal"
                    />
                )}
            </div>
            {/* Mini HR zones bar */}
            {entry.heartRateZones.length > 0 && (
                <div className="flex h-1.5 rounded-full overflow-hidden mt-2">
                    {entry.heartRateZones.filter(z => z.percentage > 0).map(z => (
                        <div
                            key={z.zone}
                            style={{ width: `${z.percentage}%`, backgroundColor: z.colour }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function MiniStat({ icon, value, unit }: { icon: React.ReactNode; value: string; unit: string }) {
    return (
        <div className="flex items-center gap-1 justify-center">
            {icon}
            <span className="text-white text-xs font-semibold">{value}</span>
            <span className="text-white/30 text-[9px]">{unit}</span>
        </div>
    );
}

export default SharedHealthCards;
