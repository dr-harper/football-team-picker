import React from 'react';
import { Goal, Award, Share2, Download, Clock, Mic, Sparkles, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../../components/ui/button';
import { Game, Team, GoalScorer, MatchEvent } from '../../types';
import PitchRenderer from '../../components/PitchRenderer';
import PlayerName from '../../components/PlayerName';

/** Find which team a player belongs to (0 or 1), returns -1 if not found */
function findPlayerTeam(playerId: string, teams: Team[]): number {
    for (let t = 0; t < teams.length; t++) {
        if (teams[t].players.some(p => (p.playerId ?? p.name) === playerId)) return t;
    }
    return -1;
}

function formatGoalTime(seconds: number): string {
    return `${Math.floor(seconds / 60)}'`;
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

    const renderScorer = (gs: GoalScorer) => {
        const hasTimes = gs.goalTimes && gs.goalTimes.length > 0;
        return (
            <div key={gs.playerId} className="bg-white/5 rounded px-2 py-1">
                <div className="flex items-center justify-between">
                    <span className="text-white text-xs truncate"><PlayerName id={gs.playerId} lookup={lookup} /></span>
                    <span className={`${accentClass} text-xs font-bold ml-1 shrink-0`}>&times;{gs.goals}</span>
                </div>
                {hasTimes && (
                    <div className="text-white/40 text-[10px] mt-0.5">
                        {gs.goalTimes!.map((t, i) => (
                            <span key={i}>{i > 0 ? ', ' : ''}{formatGoalTime(t)}</span>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 sm:p-4">
            <h4 className="text-white font-semibold mb-2 flex items-center gap-2 text-xs sm:text-sm">
                {icon} {label}
            </h4>
            <div className="grid grid-cols-2 gap-2">
                {/* Team 1 column */}
                <div className="space-y-1">
                    <div className="text-[10px] text-green-300/60 uppercase tracking-wider mb-1 truncate">{teams[0]?.name}</div>
                    {team1Items.length > 0 ? team1Items.map(renderScorer) : (
                        <div className="text-white/20 text-xs px-2">—</div>
                    )}
                </div>
                {/* Team 2 column */}
                <div className="space-y-1">
                    <div className="text-[10px] text-green-300/60 uppercase tracking-wider mb-1 truncate">{teams[1]?.name}</div>
                    {team2Items.length > 0 ? team2Items.map(renderScorer) : (
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
    matchEvents?: MatchEvent[];
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
    onGenerateSummary?: () => Promise<void>;
    summaryLoading?: boolean;
}

const CompletedGameView: React.FC<CompletedGameViewProps> = ({
    game, generatedTeams, isAdmin, goalScorers, assisters, motm, motmNotes, matchEvents,
    lookup, allPlayerIds, selectedPlayer,
    scoringTableElement,
    isExporting, enableAssists,
    onPlayerClick, onReopen, onShareResults, onExportResults, onGenerateSummary, summaryLoading,
}) => {
    // Split scorers/assisters by team
    const team1Goals = goalScorers.filter(g => findPlayerTeam(g.playerId, generatedTeams) === 0).sort((a, b) => b.goals - a.goals);
    const team2Goals = goalScorers.filter(g => findPlayerTeam(g.playerId, generatedTeams) === 1).sort((a, b) => b.goals - a.goals);
    const team1Assists = enableAssists ? assisters.filter(a => findPlayerTeam(a.playerId, generatedTeams) === 0).sort((a, b) => b.goals - a.goals) : [];
    const team2Assists = enableAssists ? assisters.filter(a => findPlayerTeam(a.playerId, generatedTeams) === 1).sort((a, b) => b.goals - a.goals) : [];

    const hasGoals = goalScorers.length > 0;
    const hasAssists = enableAssists && assisters.length > 0;
    const hasMotm = !!motm;

    // Build chronological timeline of all goals
    const timelineEvents = goalScorers.flatMap(gs =>
        (gs.goalTimes ?? []).map(timeSec => ({
            playerId: gs.playerId,
            timeSec,
            teamIndex: findPlayerTeam(gs.playerId, generatedTeams),
        }))
    ).sort((a, b) => a.timeSec - b.timeSec);

    return (
        <div className="max-w-4xl md:max-w-none mx-auto space-y-3">
            {/* Score hero card */}
            {game.score && (
                <div className="bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-sm border border-white/10 rounded-xl py-6 sm:py-8 px-4">
                    <div className="flex items-center justify-center gap-4 sm:gap-8 text-white foldable-grid fold:grid fold:grid-cols-2">
                        <div className="text-center flex-1">
                            <div className="text-xs sm:text-sm text-green-300 truncate mb-1">{generatedTeams[0]?.name}</div>
                            <motion.div
                                className="text-4xl sm:text-5xl font-bold"
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                            >
                                {game.score.team1}
                            </motion.div>
                        </div>
                        <motion.span
                            className="text-xl sm:text-2xl text-white/30"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.15 }}
                        >
                            -
                        </motion.span>
                        <div className="text-center flex-1">
                            <div className="text-xs sm:text-sm text-green-300 truncate mb-1">{generatedTeams[1]?.name}</div>
                            <motion.div
                                className="text-4xl sm:text-5xl font-bold"
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: 'spring', stiffness: 200, delay: 0.3 }}
                            >
                                {game.score.team2}
                            </motion.div>
                        </div>
                    </div>
                </div>
            )}

            {/* AI Match Summary */}
            {game.matchSummary ? (
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <div className="flex items-start gap-2">
                        <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <p className="text-white/80 text-sm leading-relaxed">{game.matchSummary}</p>
                    </div>
                    {isAdmin && onGenerateSummary && (
                        <button
                            onClick={onGenerateSummary}
                            disabled={summaryLoading}
                            className="mt-2 flex items-center gap-1 text-white/20 hover:text-white/40 text-[10px] transition-colors"
                        >
                            <RefreshCw className={`w-3 h-3 ${summaryLoading ? 'animate-spin' : ''}`} /> Regenerate
                        </button>
                    )}
                </div>
            ) : isAdmin && onGenerateSummary ? (
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex justify-center">
                    <button
                        onClick={onGenerateSummary}
                        disabled={summaryLoading}
                        className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 rounded-lg px-4 py-2 text-sm text-amber-300 font-medium transition-all disabled:opacity-50"
                    >
                        <Sparkles className={`w-4 h-4 ${summaryLoading ? 'animate-pulse' : ''}`} />
                        {summaryLoading ? 'Generating...' : 'Generate Match Report'}
                    </button>
                </div>
            ) : null}

            {/* Pitch */}
            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-3 sm:p-5">
                <PitchRenderer
                    teams={generatedTeams}
                    setupIndex={0}
                    selectedPlayer={selectedPlayer}
                    onPlayerClick={(_, tIdx, pIdx) => onPlayerClick(0, tIdx, pIdx)}
                    lookup={lookup}
                />
            </div>

            {/* Chronological goal timeline */}
            {hasGoals && timelineEvents.length > 0 && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-3 sm:p-4">
                    <h4 className="text-white font-semibold mb-3 flex items-center gap-2 text-xs sm:text-sm">
                        <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/40" /> Match Timeline
                    </h4>
                    <div className="relative">
                        {/* Centre line */}
                        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/10" />
                        <div className="space-y-1.5">
                            {timelineEvents.map((evt, i) => {
                                const isTeam1 = evt.teamIndex === 0;
                                return (
                                    <motion.div
                                        key={i}
                                        className={`flex items-center gap-1.5 ${isTeam1 ? 'flex-row' : 'flex-row-reverse'}`}
                                        initial={{ opacity: 0, x: isTeam1 ? -15 : 15 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.25, delay: i * 0.08 }}
                                    >
                                        <div className={`flex-1 flex items-center gap-1.5 ${isTeam1 ? 'justify-end' : 'justify-end flex-row-reverse'}`}>
                                            <PlayerName id={evt.playerId} lookup={lookup} className="text-white text-xs truncate" />
                                            <span className="text-white/30 text-xs shrink-0">&#9917;</span>
                                        </div>
                                        <div className="w-10 text-center shrink-0 relative z-10">
                                            <span className="text-white/50 font-mono text-[10px] bg-white/5 rounded px-1.5 py-0.5">
                                                {formatGoalTime(evt.timeSec)}
                                            </span>
                                        </div>
                                        <div className="flex-1" />
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Goal scorers & assists — as distinct cards */}
            {hasGoals && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.3 }}
                >
                    <TeamScorers
                        label="Goal Scorers"
                        icon={<Goal className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-400" />}
                        team1Items={team1Goals}
                        team2Items={team2Goals}
                        teams={generatedTeams}
                        lookup={lookup}
                        accentClass="text-green-300"
                    />
                </motion.div>
            )}

            {hasAssists && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.4 }}
                >
                    <TeamScorers
                        label="Assists"
                        icon={<span className="text-blue-400 font-bold text-[10px] sm:text-xs bg-blue-400/20 px-1.5 py-0.5 rounded">A</span>}
                        team1Items={team1Assists}
                        team2Items={team2Assists}
                        teams={generatedTeams}
                        lookup={lookup}
                        accentClass="text-blue-300"
                    />
                </motion.div>
            )}

            {/* MOTM highlight card */}
            {hasMotm && (
                <motion.div
                    className="bg-yellow-500/10 border border-yellow-500/25 rounded-xl p-4"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.5 }}
                >
                    <div className="flex items-center gap-2">
                        <motion.div
                            animate={{ rotate: [0, -8, 8, -8, 0] }}
                            transition={{ delay: 0.8, duration: 0.5 }}
                        >
                            <Award className="w-5 h-5 text-yellow-400" />
                        </motion.div>
                        <span className="text-white text-sm sm:text-base font-medium">
                            Man of the Match: <strong><PlayerName id={motm} lookup={lookup} /></strong>
                        </span>
                    </div>
                    {motmNotes && (
                        <p className="text-white/60 text-xs sm:text-sm mt-2 ml-7 italic">
                            &ldquo;{motmNotes}&rdquo;
                        </p>
                    )}
                </motion.div>
            )}

            {/* Game notes audit trail */}
            {matchEvents && matchEvents.length > 0 && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-3 sm:p-4">
                    <h4 className="text-white font-semibold mb-2 flex items-center gap-2 text-xs sm:text-sm">
                        <Mic className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-400" /> Match Commentary
                    </h4>
                    <div className="space-y-1.5">
                        {matchEvents
                            .filter(e => e.elapsedSec !== undefined)
                            .sort((a, b) => (a.elapsedSec ?? 0) - (b.elapsedSec ?? 0))
                            .map((evt, i) => (
                                <motion.div
                                    key={evt.id}
                                    className="flex items-start gap-2 text-sm"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.2, delay: i * 0.05 }}
                                >
                                    <span className="text-white/40 font-mono text-xs w-8 text-right shrink-0 pt-0.5">
                                        {formatGoalTime(evt.elapsedSec!)}
                                    </span>
                                    {evt.type === 'goal' ? (
                                        <span className="text-white/30 text-xs pt-0.5">&#9917;</span>
                                    ) : evt.type === 'assist' ? (
                                        <span className="text-blue-400 font-bold text-[10px] bg-blue-400/20 px-1 py-0.5 rounded shrink-0">A</span>
                                    ) : (
                                        <Mic className="w-3 h-3 text-red-400/60 shrink-0 mt-0.5" />
                                    )}
                                    <div className="min-w-0">
                                        {evt.playerId && (
                                            <PlayerName id={evt.playerId} lookup={lookup} className="text-white text-xs" />
                                        )}
                                        <p className="text-white/40 text-xs italic truncate">&ldquo;{evt.transcript}&rdquo;</p>
                                    </div>
                                </motion.div>
                            ))}
                    </div>
                </div>
            )}

            {/* Share/Save actions */}
            <div className="flex gap-2">
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
                    className="w-full bg-white/5 hover:bg-white/10 text-white/60 border border-white/10 rounded-lg text-xs"
                >
                    Edit Score
                </Button>
            )}
            {isAdmin && allPlayerIds.length > 0 && (
                <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-3 sm:p-5">
                    {scoringTableElement}
                </div>
            )}
        </div>
    );
};

export default CompletedGameView;
