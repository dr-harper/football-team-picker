import React from 'react';
import { motion } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import PitchRenderer from './PitchRenderer';
import ReactMarkdown from 'react-markdown';
import { Team, Player, TeamSetup } from '../types';
import { useTheme } from '../themes';
import { cn } from '../lib/utils';

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
    const t = useTheme();
    const rotation = setupIndex % 2 === 0 ? 0.3 : -0.3;

    return (
        <motion.div
            key={setupIndex}
            id={`team-setup-${setupIndex}`}
            initial={{ opacity: 0, y: -30, rotate: -3 }}
            animate={{ opacity: 1, y: 0, rotate: rotation }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 150, damping: 15 }}
            className={cn(t.card.base, t.fonts.body)}
        >
            <div className="flex justify-between items-start mb-2">
                {totalSetups > 1 ? (
                    <h2 className={t.text.heading}>Option {setupIndex + 1}</h2>
                ) : (
                    <h2 className={t.text.heading}></h2>
                )}
                <div className="flex gap-2">
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => onDelete(setupIndex)}
                        className={t.buttons.destructive}
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
                                className={cn(t.teamName.bar, 'relative flex-grow text-center')}
                                style={{ width: '50%' }}
                            >
                                {team.name}
                                <div className="absolute top-1/2 right-2 transform -translate-y-1/2 flex items-center gap-2">
                                    <label htmlFor={`color-picker-${setupIndex}-${teamIndex}`} className="cursor-pointer">
                                        <div
                                            className={cn('w-5 h-5 rounded-full color-circle', t.teamName.colourBorder)}
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
                                className={cn(t.teamName.bar, 'flex-grow text-center')}
                                style={{ width: '50%' }}
                            >
                                {team.name}
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {setup.teams.map((team: Team, teamIndex: number) => (
                            <div key={teamIndex} className={t.playerList.card}>
                                <div className={t.playerList.header}>
                                    <h3 className={cn('text-lg', t.fonts.heading)}>{team.name}</h3>
                                </div>
                                <div className="p-2">
                                    <ul className="space-y-1">
                                        {team.players.map((player: Player, playerIndex: number) => (
                                            <li
                                                key={getPlayerId(setupIndex, player)}
                                                onClick={() => onPlayerClick(setupIndex, teamIndex, playerIndex)}
                                                className={cn(
                                                    t.playerList.item,
                                                    selectedPlayer &&
                                                    selectedPlayer.setupIndex === setupIndex &&
                                                    selectedPlayer.teamIndex === teamIndex &&
                                                    selectedPlayer.playerIndex === playerIndex
                                                        ? 'ring-2 ring-yellow-400'
                                                        : selectedPlayer && selectedPlayer.setupIndex === setupIndex
                                                            ? 'ring-2 ring-blue-400'
                                                            : ''
                                                )}
                                            >
                                                {player.shirtNumber}. {player.name}{' '}
                                                {player.isGoalkeeper && (
                                                    <span className={t.playerList.gkBadge}>
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
                            className={t.aiSummary.button}
                            disabled={aiSummary === 'Loading...'}
                        >
                            {aiSummary === 'Loading...' ? 'Generating...' : 'Generate AI Match Summary'}
                        </Button>
                    )}
                </div>
            )}
            {aiSummary && (
                <div className={t.aiSummary.container}>
                    <ReactMarkdown>{aiSummary}</ReactMarkdown>
                </div>
            )}
        </motion.div>
    );
};

export default TeamSetupCard;
