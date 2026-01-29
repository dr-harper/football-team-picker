import React from 'react';
import { motion } from 'framer-motion';
import PlayerIcon from './PlayerIcon';
import { Team, PositionedPlayer } from '../types';
import { positionsByTeamSizeAndSide } from '../constants/positionsConstants';
import { useTheme } from '../themes';

interface SelectedPlayer {
    setupIndex: number;
    teamIndex: number;
    playerIndex: number;
}

interface PitchRendererProps {
    teams: Team[];
    setupIndex: number;
    selectedPlayer: SelectedPlayer | null;
    onPlayerClick: (setupIndex: number, teamIndex: number, playerIndex: number) => void;
}

function getPositionsForTeam(team: Team, isLeftSide: boolean): PositionedPlayer[] {
    const side = isLeftSide ? 'left' : 'right';
    const positions = positionsByTeamSizeAndSide[team.players.length]?.[side] || [];
    return team.players.map((player, idx) => ({
        ...positions[idx],
        player,
        playerIndex: idx,
    }));
}

function getPlayerId(setupIndex: number, player: { name: string; shirtNumber: number | null }) {
    return `player-${setupIndex}-${player.name}-${player.shirtNumber}`;
}

function playerRingClass(
    selectedPlayer: SelectedPlayer | null,
    setupIndex: number,
    teamIndex: number,
    playerIndex: number,
): string {
    if (!selectedPlayer || selectedPlayer.setupIndex !== setupIndex) return '';
    if (selectedPlayer.teamIndex === teamIndex && selectedPlayer.playerIndex === playerIndex) {
        return 'ring-2 ring-yellow-400 rounded-full shadow-[0_0_12px_rgba(250,204,21,0.6)]';
    }
    return 'ring-2 ring-blue-400 ring-offset-2 rounded-full';
}

const PitchRenderer: React.FC<PitchRendererProps> = ({
    teams,
    setupIndex,
    selectedPlayer,
    onPlayerClick,
}) => {
    const t = useTheme();

    const renderTeamPlayers = (team: Team, teamIndex: number, isLeft: boolean) =>
        getPositionsForTeam(team, isLeft).map((position: PositionedPlayer) => (
            <div
                key={getPlayerId(setupIndex, position.player)}
                className="absolute"
                style={{ top: position.top, left: position.left, transform: 'translate(-50%, -50%)' }}
            >
                <motion.div
                    layoutId={getPlayerId(setupIndex, position.player)}
                    layout
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    onClick={() => onPlayerClick(setupIndex, teamIndex, position.playerIndex)}
                    className={`w-8 h-8 sm:w-12 sm:h-12 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform duration-150 ${playerRingClass(selectedPlayer, setupIndex, teamIndex, position.playerIndex)}`}
                >
                    <PlayerIcon
                        color={team.color}
                        number={position.player.shirtNumber}
                        name={position.player.name}
                        isGoalkeeper={position.player.isGoalkeeper}
                    />
                </motion.div>
            </div>
        ));

    return (
        <div
            className={`w-full aspect-video relative overflow-hidden sm:aspect-video sm:w-full sm:h-auto ${t.pitch.border}`}
            style={{ background: t.pitch.bg }}
        >
            {/* Football pitch lines */}
            <div className={`absolute top-0 bottom-0 left-1/2 w-0.5 ${t.pitch.lineClass}`}></div>
            <div
                className="absolute top-1/2 left-1/2 w-16 h-16 sm:w-24 sm:h-24 rounded-full border-2 transform -translate-x-1/2 -translate-y-1/2"
                style={{ borderColor: t.pitch.lineColour }}
            ></div>
            <div className={`absolute top-1/2 left-0 w-1 h-12 sm:w-2 sm:h-16 ${t.pitch.lineClass} transform -translate-y-1/2`}></div>
            <div className={`absolute top-1/2 right-0 w-1 h-12 sm:w-2 sm:h-16 ${t.pitch.lineClass} transform -translate-y-1/2`}></div>
            <div
                className="absolute top-1/2 left-0 w-8 h-24 sm:w-12 sm:h-32 border-2 border-l-0 transform -translate-y-1/2"
                style={{ borderColor: t.pitch.lineColour }}
            ></div>
            <div
                className="absolute top-1/2 right-0 w-8 h-24 sm:w-12 sm:h-32 border-2 border-r-0 transform -translate-y-1/2"
                style={{ borderColor: t.pitch.lineColour }}
            ></div>

            {/* Muddy patches — conditional */}
            {t.decorations.muddyPatches && (
                <>
                    <div className="muddy-patch" style={{ top: '45%', left: '8%', width: '64px', height: '40px' }} />
                    <div className="muddy-patch" style={{ top: '55%', left: '48%', width: '80px', height: '48px' }} />
                    <div className="muddy-patch" style={{ top: '40%', right: '8%', width: '56px', height: '40px' }} />
                </>
            )}

            {renderTeamPlayers(teams[0], 0, true)}
            {renderTeamPlayers(teams[1], 1, false)}
        </div>
    );
};

export default PitchRenderer;
