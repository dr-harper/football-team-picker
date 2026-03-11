import React, { useState } from 'react';
import { Game, Season } from '../../types';
import { computeLeagueTable } from './leagueTableUtils';
import PlayerName from '../../components/PlayerName';

interface LeagueTableTabProps {
    completedGames: Game[];
    seasons: Record<string, Season>;
    activeSeasonId?: string;
    myId: string;
    lookup: Record<string, string>;
}

const LeagueTableTab: React.FC<LeagueTableTabProps> = ({
    completedGames, seasons, activeSeasonId, myId, lookup,
}) => {
    const seasonList = Object.values(seasons).sort((a, b) => b.createdAt - a.createdAt);
    const defaultFilter = activeSeasonId || 'all';
    const [selectedSeason, setSelectedSeason] = useState<string>(defaultFilter);

    const filteredGames = selectedSeason === 'all'
        ? completedGames
        : completedGames.filter(g => g.seasonId === selectedSeason);

    const table = computeLeagueTable(filteredGames);

    const seasonName = (id: string) => {
        if (id === 'all') return 'All Time';
        return seasons[id]?.name ?? id;
    };

    return (
        <div className="space-y-3">
            {/* Season filter */}
            {seasonList.length > 0 && (
                <div className="flex gap-1.5 bg-white/5 p-1 rounded-xl overflow-x-auto">
                    {activeSeasonId && (
                        <button
                            onClick={() => setSelectedSeason(activeSeasonId)}
                            className={`shrink-0 py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${
                                selectedSeason === activeSeasonId
                                    ? 'bg-white/15 text-white shadow-sm'
                                    : 'text-white/40 hover:text-white/70'
                            }`}
                        >
                            {seasonName(activeSeasonId)}
                        </button>
                    )}
                    <button
                        onClick={() => setSelectedSeason('all')}
                        className={`shrink-0 py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${
                            selectedSeason === 'all'
                                ? 'bg-white/15 text-white shadow-sm'
                                : 'text-white/40 hover:text-white/70'
                        }`}
                    >
                        All Time
                    </button>
                    {seasonList.filter(s => s.id !== activeSeasonId).map(s => (
                        <button
                            key={s.id}
                            onClick={() => setSelectedSeason(s.id)}
                            className={`shrink-0 py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${
                                selectedSeason === s.id
                                    ? 'bg-white/15 text-white shadow-sm'
                                    : 'text-white/40 hover:text-white/70'
                            }`}
                        >
                            {s.name}
                        </button>
                    ))}
                </div>
            )}

            {table.length === 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-10 text-center">
                    <div className="text-4xl mb-3">🏆</div>
                    <p className="text-white/50 text-sm">
                        {selectedSeason !== 'all' ? 'No completed games in this season yet.' : 'No completed games yet — check back after your first match!'}
                    </p>
                </div>
            ) : (
                <div className="bg-white/5 border border-white/8 rounded-2xl overflow-hidden">
                    <div className="px-4 pt-4 pb-2 flex items-center gap-2">
                        <span className="text-base">🏆</span>
                        <span className="font-semibold text-white text-sm">League Table</span>
                        <span className="text-white/30 text-xs ml-auto">{filteredGames.length} games</span>
                    </div>

                    {/* Table header */}
                    <div className="grid grid-cols-[2rem_1fr_repeat(4,2rem)_2.5rem_2.5rem] gap-0 px-4 py-2 text-[10px] text-white/40 uppercase tracking-wide border-b border-white/5">
                        <span className="text-center">#</span>
                        <span>Player</span>
                        <span className="text-center">P</span>
                        <span className="text-center">W</span>
                        <span className="text-center">D</span>
                        <span className="text-center">L</span>
                        <span className="text-center">GD</span>
                        <span className="text-center font-bold">Pts</span>
                    </div>

                    {/* Table rows */}
                    <div className="divide-y divide-white/5">
                        {table.map((row, i) => (
                            <div
                                key={row.playerId}
                                className={`grid grid-cols-[2rem_1fr_repeat(4,2rem)_2.5rem_2.5rem] gap-0 px-4 py-2.5 items-center ${
                                    row.playerId === myId ? 'bg-green-500/8' : ''
                                }`}
                            >
                                <span className="text-center text-sm">
                                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : <span className="text-white/25 text-xs">{i + 1}</span>}
                                </span>
                                <PlayerName
                                    id={row.playerId}
                                    lookup={lookup}
                                    className={`text-sm truncate ${row.playerId === myId ? 'text-green-300 font-semibold' : 'text-white/90'}`}
                                />
                                <span className="text-center text-xs text-white/50 tabular-nums">{row.played}</span>
                                <span className="text-center text-xs text-green-400 tabular-nums">{row.won}</span>
                                <span className="text-center text-xs text-yellow-400/70 tabular-nums">{row.drawn}</span>
                                <span className="text-center text-xs text-red-400/70 tabular-nums">{row.lost}</span>
                                <span className={`text-center text-xs tabular-nums ${row.goalDifference > 0 ? 'text-green-400' : row.goalDifference < 0 ? 'text-red-400/70' : 'text-white/40'}`}>
                                    {row.goalDifference > 0 ? '+' : ''}{row.goalDifference}
                                </span>
                                <span className="text-center text-sm font-bold text-white tabular-nums">{row.points}</span>
                            </div>
                        ))}
                    </div>

                    {/* Subtitle */}
                    <div className="px-4 py-2.5 border-t border-white/5">
                        <p className="text-[10px] text-white/25">Individual standings based on your team's result each game</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LeagueTableTab;
