import React from 'react';
import { Goal, Award } from 'lucide-react';
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
    lookup: Map<string, string>;
    allPlayerIds: string[];
    selectedPlayer: { setupIndex: number; teamIndex: number; playerIndex: number } | null;
    scoringControlsElement: React.ReactNode;
    attendanceSectionElement: React.ReactNode;
    onPlayerClick: (setupIndex: number, teamIndex: number, playerIndex: number) => void;
    onReopen: () => void;
}

const CompletedGameView: React.FC<CompletedGameViewProps> = ({
    game, generatedTeams, isAdmin, goalScorers, assisters, motm,
    lookup, allPlayerIds, selectedPlayer,
    scoringControlsElement, attendanceSectionElement,
    onPlayerClick, onReopen,
}) => (
    <div className="max-w-4xl mx-auto">
        <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-5">
            <div className="flex justify-around mb-2">
                <h3 className="font-bold text-lg" style={{ color: generatedTeams[0].color }}>
                    {generatedTeams[0].name}
                </h3>
                <h3 className="font-bold text-lg" style={{ color: generatedTeams[1].color }}>
                    {generatedTeams[1].name}
                </h3>
            </div>
            <PitchRenderer
                teams={generatedTeams}
                setupIndex={0}
                selectedPlayer={selectedPlayer}
                onPlayerClick={(_, tIdx, pIdx) => onPlayerClick(0, tIdx, pIdx)}
            />
            {game.score && (
                <div className="border-t border-white/10 pt-4 mt-4">
                    <h3 className="text-white font-bold text-center mb-2">Final Score</h3>
                    <div className="flex items-center justify-center gap-4 text-white">
                        <div className="text-center">
                            <div className="text-sm text-green-300">{generatedTeams[0]?.name}</div>
                            <div className="text-4xl font-bold">{game.score.team1}</div>
                        </div>
                        <span className="text-2xl">-</span>
                        <div className="text-center">
                            <div className="text-sm text-green-300">{generatedTeams[1]?.name}</div>
                            <div className="text-4xl font-bold">{game.score.team2}</div>
                        </div>
                    </div>
                    {isAdmin && (
                        <Button
                            onClick={onReopen}
                            className="mt-3 w-full bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg text-sm"
                        >
                            Edit Score
                        </Button>
                    )}
                </div>
            )}
            {isAdmin && allPlayerIds.length > 0 && scoringControlsElement}
            {isAdmin && attendanceSectionElement}
            {!isAdmin && (goalScorers.length > 0 || assisters.length > 0 || motm) && (
                <div className="border-t border-white/10 pt-4 mt-4 space-y-3">
                    {goalScorers.length > 0 && (
                        <div>
                            <h4 className="text-white font-semibold mb-2 flex items-center gap-2 text-sm">
                                <Goal className="w-4 h-4 text-green-400" /> Goal Scorers
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {[...goalScorers].sort((a, b) => b.goals - a.goals).map(gs => (
                                    <span key={gs.playerId} className="bg-white/10 text-white text-sm px-3 py-1 rounded-full">
                                        <PlayerName id={gs.playerId} lookup={lookup} /> &times; {gs.goals}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                    {assisters.length > 0 && (
                        <div>
                            <h4 className="text-white font-semibold mb-2 flex items-center gap-2 text-sm">
                                <span className="text-blue-400 font-bold text-xs bg-blue-400/20 px-1.5 py-0.5 rounded">A</span> Assists
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {[...assisters].sort((a, b) => b.goals - a.goals).map(a => (
                                    <span key={a.playerId} className="bg-white/10 text-white text-sm px-3 py-1 rounded-full">
                                        <PlayerName id={a.playerId} lookup={lookup} /> &times; {a.goals}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                    {motm && (
                        <div className="flex items-center gap-2">
                            <Award className="w-4 h-4 text-yellow-400" />
                            <span className="text-white text-sm">MoTM: <strong><PlayerName id={motm} lookup={lookup} /></strong></span>
                        </div>
                    )}
                </div>
            )}
        </div>
    </div>
);

export default CompletedGameView;
