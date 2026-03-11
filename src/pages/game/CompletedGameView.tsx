import React from 'react';
import { Goal, Award, Share2, Download } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Game, Team, GoalScorer } from '../../types';
import PitchRenderer from '../../components/PitchRenderer';
import PlayerName from '../../components/PlayerName';

interface CompletedGameViewProps {
    game: Game;
    generatedTeams: Team[];
    isAdmin: boolean;
    goalScorers: GoalScorer[];
    assisters: GoalScorer[];
    motm: string;
    lookup: Record<string, string>;
    allPlayerIds: string[];
    selectedPlayer: { setupIndex: number; teamIndex: number; playerIndex: number } | null;
    scoringControlsElement: React.ReactNode;
    attendanceSectionElement: React.ReactNode;
    isExporting: boolean;
    leagueName?: string;
    onPlayerClick: (setupIndex: number, teamIndex: number, playerIndex: number) => void;
    onReopen: () => void;
    onShareResults: () => void;
    onExportResults: () => void;
}

const CompletedGameView: React.FC<CompletedGameViewProps> = ({
    game, generatedTeams, isAdmin, goalScorers, assisters, motm,
    lookup, allPlayerIds, selectedPlayer,
    scoringControlsElement, attendanceSectionElement,
    isExporting, leagueName,
    onPlayerClick, onReopen, onShareResults, onExportResults,
}) => (
    <div className="max-w-4xl mx-auto">
        <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-3 sm:p-5">
            {/* Score first on mobile — most important info */}
            {game.score && (
                <div className="pb-3 mb-3 border-b border-white/10">
                    <div className="flex items-center justify-center gap-3 sm:gap-6 text-white">
                        <div className="text-center flex-1">
                            <div className="text-xs sm:text-sm text-green-300 truncate">{generatedTeams[0]?.name}</div>
                            <div className="text-3xl sm:text-4xl font-bold">{game.score.team1}</div>
                        </div>
                        <span className="text-xl sm:text-2xl text-white/40">-</span>
                        <div className="text-center flex-1">
                            <div className="text-xs sm:text-sm text-green-300 truncate">{generatedTeams[1]?.name}</div>
                            <div className="text-3xl sm:text-4xl font-bold">{game.score.team2}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Pitch */}
            <PitchRenderer
                teams={generatedTeams}
                setupIndex={0}
                selectedPlayer={selectedPlayer}
                onPlayerClick={(_, tIdx, pIdx) => onPlayerClick(0, tIdx, pIdx)}
                lookup={lookup}
            />

            {/* Goal scorers & assists — always visible, split by team */}
            {(goalScorers.length > 0 || assisters.length > 0 || motm) && (
                <div className="border-t border-white/10 pt-3 mt-3 space-y-3">
                    {goalScorers.length > 0 && (
                        <div>
                            <h4 className="text-white font-semibold mb-2 flex items-center gap-2 text-xs sm:text-sm">
                                <Goal className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-400" /> Goal Scorers
                            </h4>
                            <div className="flex flex-wrap gap-1.5 sm:gap-2">
                                {[...goalScorers].sort((a, b) => b.goals - a.goals).map(gs => (
                                    <span key={gs.playerId} className="bg-white/10 text-white text-xs sm:text-sm px-2 sm:px-3 py-1 rounded-full">
                                        <PlayerName id={gs.playerId} lookup={lookup} /> &times; {gs.goals}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                    {assisters.length > 0 && (
                        <div>
                            <h4 className="text-white font-semibold mb-2 flex items-center gap-2 text-xs sm:text-sm">
                                <span className="text-blue-400 font-bold text-[10px] sm:text-xs bg-blue-400/20 px-1.5 py-0.5 rounded">A</span> Assists
                            </h4>
                            <div className="flex flex-wrap gap-1.5 sm:gap-2">
                                {[...assisters].sort((a, b) => b.goals - a.goals).map(a => (
                                    <span key={a.playerId} className="bg-white/10 text-white text-xs sm:text-sm px-2 sm:px-3 py-1 rounded-full">
                                        <PlayerName id={a.playerId} lookup={lookup} /> &times; {a.goals}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                    {motm && (
                        <div className="flex items-center gap-2">
                            <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-400" />
                            <span className="text-white text-xs sm:text-sm">MoTM: <strong><PlayerName id={motm} lookup={lookup} /></strong></span>
                        </div>
                    )}
                </div>
            )}

            {/* Share/Save actions */}
            <div className="flex gap-2 mt-4 pt-3 border-t border-white/10">
                <Button onClick={onShareResults} disabled={isExporting} className="flex-1 bg-green-600/80 hover:bg-green-600 text-white border border-green-500/30 rounded-lg px-2 py-2 text-xs sm:text-sm flex items-center justify-center gap-1.5">
                    <Share2 className="w-3.5 h-3.5" /> Share
                </Button>
                <Button onClick={onExportResults} disabled={isExporting} className="flex-1 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg px-2 py-2 text-xs sm:text-sm flex items-center justify-center gap-1.5">
                    <Download className="w-3.5 h-3.5" /> Save Image
                </Button>
            </div>

            {/* Admin controls */}
            {isAdmin && game.score && (
                <Button
                    onClick={onReopen}
                    className="mt-2 w-full bg-white/5 hover:bg-white/10 text-white/60 border border-white/10 rounded-lg text-xs"
                >
                    Edit Score
                </Button>
            )}
            {isAdmin && allPlayerIds.length > 0 && scoringControlsElement}
            {isAdmin && attendanceSectionElement}
        </div>
    </div>
);

export default CompletedGameView;
