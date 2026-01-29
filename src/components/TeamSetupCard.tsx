import React from 'react';
import { motion } from 'framer-motion';
import { Trash2 } from 'lucide-react';
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
    onDelete: (index: number) => void;
    onColorChange: (setupIndex: number, teamIndex: number, color: string) => void;
    geminiKey: string;
    aiSummary?: string;
    onGenerateSummary: (setupIndex: number) => void;
}

function getPlayerId(setupIndex: number, player: { name: string; shirtNumber: number | null }) {
    return `player-${setupIndex}-${player.name}-${player.shirtNumber}`;
}

const TeamSetupCard: React.FC<TeamSetupCardProps> = ({
    setup,
    setupIndex,
    totalSetups,
    selectedPlayer,
    onPlayerClick,
    onDelete,
    onColorChange,
    geminiKey,
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
            className="bg-green-700 dark:bg-green-800 p-4 shadow-lg text-white rounded-lg"
        >
            <div className="flex justify-between items-start mb-2">
                {totalSetups > 1 ? (
                    <h2 className="text-xl font-bold text-white">Option {setupIndex + 1}</h2>
                ) : (
                    <h2 className="text-xl font-bold text-white"></h2>
                )}
                <div className="flex gap-2">
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => onDelete(setupIndex)}
                        className="bg-red-700 hover:bg-red-800 text-white delete-button"
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {setup.teams.length > 0 && setup.teams.length <= 2 && (
                <>
                    <div className="flex justify-center mb-2 gap-8">
                        {setup.teams.map((team: Team, teamIndex: number) => (
                            <div
                                key={`team-name-${teamIndex}`}
                                className="relative text-white px-4 py-1 rounded shadow-md font-bold flex-grow text-center"
                                style={{ width: '50%', backgroundColor: '#2f4f2f' }}
                            >
                                {team.name}
                                <div className="absolute top-1/2 right-2 transform -translate-y-1/2 flex items-center gap-2">
                                    <label htmlFor={`color-picker-${setupIndex}-${teamIndex}`} className="cursor-pointer">
                                        <div
                                            className="w-5 h-5 rounded-full border border-white color-circle"
                                            style={{ backgroundColor: team.color }}
                                        ></div>
                                    </label>
                                    <input
                                        id={`color-picker-${setupIndex}-${teamIndex}`}
                                        type="color"
                                        value={team.color}
                                        onChange={(e) => onColorChange(setupIndex, teamIndex, e.target.value)}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer color-picker"
                                    />
                                </div>
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
                <div className="mt-4">
                    <div className="flex justify-center mb-2 gap-8">
                        {setup.teams.map((team: Team, index: number) => (
                            <div
                                key={`team-name-${index}`}
                                className="text-white px-4 py-1 rounded shadow-md font-bold flex-grow text-center"
                                style={{ width: '50%' }}
                            >
                                {team.name}
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {setup.teams.map((team: Team, teamIndex: number) => (
                            <div key={teamIndex} className="bg-green-700 border border-white rounded-lg overflow-hidden shadow-lg">
                                <div className={`bg-${teamIndex % 2 === 0 ? 'blue-600' : 'red-600'} p-2 text-center text-white border-b border-white`}>
                                    <h3 className="text-lg font-bold">{team.name}</h3>
                                </div>
                                <div className="p-2">
                                    <ul className="space-y-1">
                                        {team.players.map((player: Player, playerIndex: number) => (
                                            <li
                                                key={getPlayerId(setupIndex, player)}
                                                onClick={() => onPlayerClick(setupIndex, teamIndex, playerIndex)}
                                                className={`py-1 px-2 rounded-lg bg-green-600 text-white border border-green-500 cursor-pointer ${
                                                    selectedPlayer &&
                                                    selectedPlayer.setupIndex === setupIndex &&
                                                    selectedPlayer.teamIndex === teamIndex &&
                                                    selectedPlayer.playerIndex === playerIndex
                                                        ? 'ring-2 ring-yellow-400'
                                                        : selectedPlayer && selectedPlayer.setupIndex === setupIndex
                                                            ? 'ring-2 ring-blue-400'
                                                            : ''
                                                }`}
                                            >
                                                {player.shirtNumber}. {player.name}{' '}
                                                {player.isGoalkeeper && (
                                                    <span className="bg-yellow-400 text-green-900 text-xs px-2 py-1 rounded ml-2 font-bold">
                                                        GK
                                                    </span>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {geminiKey && (
                <div className="flex justify-end mt-2">
                    {!aiSummary && (
                        <Button
                            onClick={() => onGenerateSummary(setupIndex)}
                            className="bg-yellow-400 text-green-900 font-bold px-3 py-1 rounded shadow flex items-center gap-2 generate-ai-summary"
                            disabled={aiSummary === 'Loading...'}
                        >
                            {aiSummary === 'Loading...' ? 'Generating...' : 'Generate AI Match Summary'}
                        </Button>
                    )}
                </div>
            )}
            {aiSummary && (
                <div className="backdrop-blur bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/30 rounded p-4 mt-2 text-white prose prose-sm max-w-none">
                    <ReactMarkdown>{aiSummary}</ReactMarkdown>
                </div>
            )}
        </motion.div>
    );
};

export default TeamSetupCard;
