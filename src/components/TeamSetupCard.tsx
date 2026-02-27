import React from 'react';
import { motion } from 'framer-motion';
import { Trash2, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import PitchRenderer from './PitchRenderer';
import ReactMarkdown from 'react-markdown';
import { Team, Player, TeamSetup } from '../types';

interface SelectedPlayer {
    setupIndex: number;
    teamIndex: number;
    playerIndex: number;
}

interface TeamSetupCardProps {
    setup: TeamSetup;
    setupIndex: number;
    totalSetups: number;
    selectedPlayer: SelectedPlayer | null;
    onPlayerClick: (setupIndex: number, teamIndex: number, playerIndex: number) => void;
    onDelete: () => void;
    onColorChange: (setupIndex: number, teamIndex: number, color: string) => void;
    aiEnabled: boolean;
    aiSummary?: string;
    onGenerateSummary: () => void;
}

function getPlayerId(setupIndex: number, player: { name: string; shirtNumber: number | null }) {
    return `player-${setupIndex}-${player.name}-${player.shirtNumber}`;
}

const TeamSetupCard: React.FC<TeamSetupCardProps> = React.memo(({
    setup,
    setupIndex,
    totalSetups,
    selectedPlayer,
    onPlayerClick,
    onDelete,
    onColorChange,
    aiEnabled,
    aiSummary,
    onGenerateSummary,
}) => {
    return (
        <motion.div
            key={setupIndex}
            id={`team-setup-${setupIndex}`}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            className="bg-green-800/80 dark:bg-green-900/80 border border-green-600/40 p-5 shadow-xl text-white rounded-2xl"
        >
            <div className="flex justify-between items-center mb-3">
                {totalSetups > 1 ? (
                    <div className="flex items-center gap-2">
                        <span className="bg-white/15 text-white text-xs font-bold px-2.5 py-1 rounded-full tracking-wide uppercase">
                            Option {setupIndex + 1}
                        </span>
                    </div>
                ) : (
                    <div />
                )}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onDelete}
                    aria-label={`Delete team option ${setupIndex + 1}`}
                    className="text-white/50 hover:text-red-400 hover:bg-red-400/10 rounded-xl delete-button transition-colors"
                >
                    <Trash2 className="w-4 h-4" />
                </Button>
            </div>

            {setup.teams.length > 0 && setup.teams.length <= 2 && (
                <>
                    <div className="flex justify-center mb-3 gap-3">
                        {setup.teams.map((team: Team, teamIndex: number) => (
                            <div
                                key={`team-name-${teamIndex}`}
                                className="relative flex items-center justify-center gap-2 text-white px-4 py-1.5 rounded-full font-bold flex-1 text-center text-sm border border-white/10"
                                style={{ backgroundColor: 'rgba(0,0,0,0.25)' }}
                            >
                                <div
                                    className="w-3 h-3 rounded-full border border-white/30 shrink-0 color-circle"
                                    style={{ backgroundColor: team.color }}
                                />
                                <span className="truncate">{team.name}</span>
                                <label
                                    htmlFor={`color-picker-${setupIndex}-${teamIndex}`}
                                    className="absolute inset-0 cursor-pointer rounded-full"
                                    aria-label={`Change colour for ${team.name}`}
                                >
                                    <input
                                        id={`color-picker-${setupIndex}-${teamIndex}`}
                                        type="color"
                                        value={team.color}
                                        onChange={(e) => onColorChange(setupIndex, teamIndex, e.target.value)}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer color-picker"
                                    />
                                </label>
                            </div>
                        ))}
                    </div>
                    <PitchRenderer
                        teams={setup.teams}
                        setupIndex={setupIndex}
                        selectedPlayer={selectedPlayer}
                        onPlayerClick={onPlayerClick}
                    />
                </>
            )}

            {setup.teams.length > 2 && (
                <div className="mt-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {setup.teams.map((team: Team, teamIndex: number) => (
                            <div key={teamIndex} className="bg-black/20 border border-white/10 rounded-xl overflow-hidden">
                                <div
                                    className="px-3 py-2 text-center font-bold text-sm border-b border-white/10 flex items-center justify-center gap-2"
                                    style={{ backgroundColor: `${team.color}33` }}
                                >
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: team.color }} />
                                    {team.name}
                                </div>
                                <ul className="p-2 space-y-1">
                                    {team.players.map((player: Player, playerIndex: number) => (
                                        <li
                                            key={getPlayerId(setupIndex, player)}
                                            onClick={() => onPlayerClick(setupIndex, teamIndex, playerIndex)}
                                            className={`py-1.5 px-2.5 rounded-lg text-sm cursor-pointer transition-all ${
                                                selectedPlayer &&
                                                selectedPlayer.setupIndex === setupIndex &&
                                                selectedPlayer.teamIndex === teamIndex &&
                                                selectedPlayer.playerIndex === playerIndex
                                                    ? 'bg-yellow-400/20 ring-1 ring-yellow-400'
                                                    : selectedPlayer && selectedPlayer.setupIndex === setupIndex
                                                        ? 'bg-blue-400/10 ring-1 ring-blue-400'
                                                        : 'bg-white/5 hover:bg-white/10'
                                            }`}
                                        >
                                            <span className="text-white/50 text-xs mr-1.5">{player.shirtNumber}.</span>
                                            {player.name}
                                            {player.isGoalkeeper && (
                                                <span className="bg-yellow-400 text-green-900 text-xs px-1.5 py-0.5 rounded-md ml-2 font-bold">
                                                    GK
                                                </span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {aiEnabled && (
                <div className="flex justify-end mt-3">
                    {!aiSummary && (
                        <Button
                            onClick={onGenerateSummary}
                            className="bg-amber-500/15 border border-amber-400/40 text-amber-300 hover:bg-amber-500/25 font-semibold px-3 py-1.5 rounded-xl text-sm flex items-center gap-2 generate-ai-summary transition-colors"
                            disabled={aiSummary === 'Loading...'}
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            {aiSummary === 'Loading...' ? 'Generating...' : 'AI Match Summary'}
                        </Button>
                    )}
                </div>
            )}

            {aiSummary && (
                <div className="bg-black/20 border border-white/10 rounded-xl p-4 mt-3 text-white prose prose-sm max-w-none prose-invert">
                    <ReactMarkdown>{aiSummary}</ReactMarkdown>
                </div>
            )}
        </motion.div>
    );
});

TeamSetupCard.displayName = 'TeamSetupCard';

export default TeamSetupCard;
