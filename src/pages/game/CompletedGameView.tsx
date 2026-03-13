import React from 'react';
import { Goal, Award, Share2, Download } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Game, Team, GoalScorer } from '../../types';
import PitchRenderer from '../../components/PitchRenderer';
import PlayerName from '../../components/PlayerName';

/** Find which team a player belongs to (0 or 1), returns -1 if not found */
function findPlayerTeam(playerId: string, teams: Team[]): number {
    for (let t = 0; t < teams.length; t++) {
        if (teams[t].players.some(p => (p.playerId ?? p.name) === playerId)) return t;
    }
    return -1;
}

function TeamScorers({
    label,
    icon,
    team1Items,
    team2Items,
    teams,
    lookup,
    accentClass,
}: {
    label: string;
    icon: React.ReactNode;
    team1Items: GoalScorer[];
    team2Items: GoalScorer[];
    teams: Team[];
    lookup: Record<string, string>;
    accentClass: string;
}) {
    if (team1Items.length === 0 && team2Items.length === 0) return null;

    return (
        <div>
            <h4 className="text-white font-semibold mb-2 flex items-center gap-2 text-xs sm:text-sm">
                {icon} {label}
            </h4>
            <div className="grid grid-cols-2 gap-2">
                {/* Team 1 column */}
                <div className="space-y-1">
                    <div className="text-[10px] text-green-300/60 uppercase tracking-wider mb-1 truncate">{teams[0]?.name}</div>
                    {team1Items.length > 0 ? (
                        team1Items.map(gs => (
                            <div key={gs.playerId} className="bg-white/5 rounded px-2 py-1 flex items-center justify-between">
                                <span className="text-white text-xs truncate"><PlayerName id={gs.playerId} lookup={lookup} /></span>
                                <span className={`${accentClass} text-xs font-bold ml-1 shrink-0`}>&times;{gs.goals}</span>
                            </div>
                        ))
                    ) : (
                        <div className="text-white/20 text-xs px-2">—</div>
                    )}
                </div>
                {/* Team 2 column */}
                <div className="space-y-1">
                    <div className="text-[10px] text-green-300/60 uppercase tracking-wider mb-1 truncate">{teams[1]?.name}</div>
                    {team2Items.length > 0 ? (
                        team2Items.map(gs => (
                            <div key={gs.playerId} className="bg-white/5 rounded px-2 py-1 flex items-center justify-between">
                                <span className="text-white text-xs truncate"><PlayerName id={gs.playerId} lookup={lookup} /></span>
                                <span className={`${accentClass} text-xs font-bold ml-1 shrink-0`}>&times;{gs.goals}</span>
                            </div>
                        ))
                    ) : (
                        <div className="text-white/20 text-xs px-2">—</div>
                    )}
                </div>
            </div>
        </div>
    );
}

interface CompletedGameViewProps {
    game: Game;
    generatedTeams: Team[];
    isAdmin: boolean;
    goalScorers: GoalScorer[];
    assisters: GoalScorer[];
    motm: string;
    motmNotes: string;
    lookup: Record<string, string>;
    allPlayerIds: string[];
    selectedPlayer: { setupIndex: number; teamIndex: number; playerIndex: number } | null;
    scoringTableElement: React.ReactNode;
    isExporting: boolean;
    enableAssists?: boolean;
    leagueName?: string;
    onPlayerClick: (setupIndex: number, teamIndex: number, playerIndex: number) => void;
    onReopen: () => void;
    onShareResults: () => void;
    onExportResults: () => void;
}

const CompletedGameView: React.FC<CompletedGameViewProps> = ({
    game, generatedTeams, isAdmin, goalScorers, assisters, motm, motmNotes,
    lookup, allPlayerIds, selectedPlayer,
    scoringTableElement,
    isExporting, enableAssists,
    onPlayerClick, onReopen, onShareResults, onExportResults,
}) => {
    // Split scorers/assisters by team
    const team1Goals = goalScorers.filter(g => findPlayerTeam(g.playerId, generatedTeams) === 0).sort((a, b) => b.goals - a.goals);
    const team2Goals = goalScorers.filter(g => findPlayerTeam(g.playerId, generatedTeams) === 1).sort((a, b) => b.goals - a.goals);
    const team1Assists = enableAssists ? assisters.filter(a => findPlayerTeam(a.playerId, generatedTeams) === 0).sort((a, b) => b.goals - a.goals) : [];
    const team2Assists = enableAssists ? assisters.filter(a => findPlayerTeam(a.playerId, generatedTeams) === 1).sort((a, b) => b.goals - a.goals) : [];

    const hasGoals = goalScorers.length > 0;
    const hasAssists = enableAssists && assisters.length > 0;
    const hasMotm = !!motm;

    return (
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

                {/* Goal scorers & assists — split by team */}
                {(hasGoals || hasAssists || hasMotm) && (
                    <div className="border-t border-white/10 pt-3 mt-3 space-y-3">
                        <TeamScorers
                            label="Goal Scorers"
                            icon={<Goal className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-400" />}
                            team1Items={team1Goals}
                            team2Items={team2Goals}
                            teams={generatedTeams}
                            lookup={lookup}
                            accentClass="text-green-300"
                        />
                        {hasAssists && (
                            <TeamScorers
                                label="Assists"
                                icon={<span className="text-blue-400 font-bold text-[10px] sm:text-xs bg-blue-400/20 px-1.5 py-0.5 rounded">A</span>}
                                team1Items={team1Assists}
                                team2Items={team2Assists}
                                teams={generatedTeams}
                                lookup={lookup}
                                accentClass="text-blue-300"
                            />
                        )}
                        {hasMotm && (
                            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                                <div className="flex items-center gap-2">
                                    <Award className="w-4 h-4 text-yellow-400" />
                                    <span className="text-white text-xs sm:text-sm">
                                        Man of the Match: <strong><PlayerName id={motm} lookup={lookup} /></strong>
                                    </span>
                                </div>
                                {motmNotes && (
                                    <p className="text-white/60 text-xs sm:text-sm mt-1.5 ml-6 italic">
                                        &ldquo;{motmNotes}&rdquo;
                                    </p>
                                )}
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
                {isAdmin && allPlayerIds.length > 0 && scoringTableElement}
            </div>
        </div>
    );
};

export default CompletedGameView;
