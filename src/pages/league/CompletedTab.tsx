import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MapPin, Flame, Footprints } from 'lucide-react';
import { Game, League, StoredGameHealth } from '../../types';
import { getMyHealthForGames } from '../../utils/firestore';
import PlayerName from '../../components/PlayerName';

const PAGE_SIZE = 10;

interface CompletedTabProps {
    code: string;
    league: League;
    completedGames: Game[];
    scorerTotals: Map<string, number>;
    motmTotals: Map<string, number>;
    lookup: Record<string, string>;
    userId?: string;
}

function HealthBadge({ health }: { health: StoredGameHealth }) {
    const stats: { icon: React.ReactNode; value: string }[] = [];

    if (health.heartRateAvg) {
        stats.push({
            icon: <Heart className="w-3 h-3 text-red-400" />,
            value: `${health.heartRateAvg}`,
        });
    }
    if (health.distance) {
        const distStr = health.distance >= 1000
            ? `${(health.distance / 1000).toFixed(1)}km`
            : `${health.distance}m`;
        stats.push({
            icon: <MapPin className="w-3 h-3 text-blue-400" />,
            value: distStr,
        });
    }
    if (health.calories) {
        stats.push({
            icon: <Flame className="w-3 h-3 text-orange-400" />,
            value: `${health.calories}`,
        });
    }
    if (health.steps) {
        stats.push({
            icon: <Footprints className="w-3 h-3 text-green-400" />,
            value: health.steps.toLocaleString(),
        });
    }

    if (stats.length === 0) return null;

    return (
        <div className="flex items-center gap-2 mt-1.5">
            {stats.map(({ icon, value }, i) => (
                <span key={i} className="flex items-center gap-0.5 text-white/50 text-[11px]">
                    {icon}
                    <span>{value}</span>
                </span>
            ))}
        </div>
    );
}

const CompletedTab: React.FC<CompletedTabProps> = ({
    code, league, completedGames, scorerTotals, motmTotals, lookup, userId,
}) => {
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
    const [healthMap, setHealthMap] = useState<Map<string, StoredGameHealth>>(new Map());
    const visibleGames = completedGames.slice(0, visibleCount);
    const hasMore = visibleCount < completedGames.length;

    // Fetch health data for visible games
    useEffect(() => {
        if (!userId || visibleGames.length === 0) return;
        const gameIds = visibleGames.map(g => g.id);
        getMyHealthForGames(gameIds, userId).then(setHealthMap).catch(() => {});
    }, [userId, visibleCount, completedGames]);

    return (
        <div className="space-y-3">
            {/* Aggregate stats */}
            {completedGames.length > 0 && (
                <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-4 grid grid-cols-2 gap-4">
                    <div>
                        <div className="text-xs text-green-300 mb-2 font-medium uppercase tracking-wide">Top scorer</div>
                        {scorerTotals.size > 0 ? (
                            <div className="space-y-1">
                                {[...scorerTotals.entries()]
                                    .sort((a, b) => b[1] - a[1])
                                    .slice(0, 3)
                                    .map(([pid, goals]) => (
                                        <div key={pid} className="flex items-center justify-between text-sm">
                                            <PlayerName id={pid} lookup={lookup} className="text-white truncate" />
                                            <span className="text-green-300 ml-2 shrink-0">{goals} ⚽</span>
                                        </div>
                                    ))}
                            </div>
                        ) : (
                            <div className="text-white/40 text-sm">No goals recorded</div>
                        )}
                    </div>
                    <div>
                        <div className="text-xs text-green-300 mb-2 font-medium uppercase tracking-wide">Player of the match</div>
                        {motmTotals.size > 0 ? (
                            <div className="space-y-1">
                                {[...motmTotals.entries()]
                                    .sort((a, b) => b[1] - a[1])
                                    .slice(0, 3)
                                    .map(([pid, count]) => (
                                        <div key={pid} className="flex items-center justify-between text-sm">
                                            <PlayerName id={pid} lookup={lookup} className="text-white truncate" />
                                            <span className="text-yellow-300 ml-2 shrink-0">{count} ⭐</span>
                                        </div>
                                    ))}
                            </div>
                        ) : (
                            <div className="text-white/40 text-sm">No awards yet</div>
                        )}
                    </div>
                </div>
            )}

            {completedGames.length === 0 ? (
                <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-8 text-center">
                    <p className="text-green-300">No completed games yet.</p>
                </div>
            ) : (
                visibleGames.map(game => {
                    const gameCost = game.costPerPerson ?? league.defaultCostPerPerson;
                    const attendeeCount = game.attendees?.length;
                    const health = healthMap.get(game.id);
                    return (
                        <Link
                            key={game.id}
                            to={`/league/${code}/game/${game.gameCode || game.id}`}
                            className="block bg-white/10 backdrop-blur-sm border border-white/10 hover:bg-white/15 rounded-xl p-4 transition-colors"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-white font-bold">{game.title}</div>
                                    <div className="text-green-300 text-sm">
                                        {new Date(game.date).toLocaleDateString('en-GB', {
                                            weekday: 'short',
                                            day: 'numeric',
                                            month: 'short',
                                        })}
                                    </div>
                                    {(gameCost !== undefined || attendeeCount !== undefined) && (
                                        <div className="text-white/40 text-xs mt-0.5">
                                            {gameCost !== undefined && `£${gameCost.toFixed(2)}/person`}
                                            {gameCost !== undefined && attendeeCount !== undefined && ' · '}
                                            {attendeeCount !== undefined && `${attendeeCount} attended`}
                                        </div>
                                    )}
                                    {health && <HealthBadge health={health} />}
                                </div>
                                {game.score && game.teams && (
                                    <div className="text-white font-bold text-lg">
                                        <span className="text-sm text-green-300">{game.teams[0]?.name}</span>{' '}
                                        {game.score.team1} - {game.score.team2}{' '}
                                        <span className="text-sm text-green-300">{game.teams[1]?.name}</span>
                                    </div>
                                )}
                            </div>
                        </Link>
                    );
                })
            )}
            {hasMore && (
                <button
                    onClick={() => setVisibleCount(prev => prev + PAGE_SIZE)}
                    className="w-full py-3 text-sm text-green-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors font-medium"
                >
                    Show more ({completedGames.length - visibleCount} remaining)
                </button>
            )}
        </div>
    );
};

export default CompletedTab;
