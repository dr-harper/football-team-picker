import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeftRight, Plus, Minus } from 'lucide-react';
import PlayerIcon from './PlayerIcon';
import { Team, PositionedPlayer, GoalScorer } from '../types';
import { positionsByTeamSizeAndSide } from '../constants/positionsConstants';
import { resolvePlayerName } from '../utils/playerLookup';

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
    lookup?: Record<string, string>;
    /** When provided, show +/- goal buttons on each player */
    goalScorers?: GoalScorer[];
    onGoalChange?: (playerId: string, delta: number) => void;
    scoringDisabled?: boolean;
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
        return 'ring-2 ring-yellow-400 rounded-full';
    }
    return 'ring-2 ring-blue-400 ring-offset-2 rounded-full cursor-pointer';
}

const PitchRenderer: React.FC<PitchRendererProps> = React.memo(({
    teams,
    setupIndex,
    selectedPlayer,
    onPlayerClick,
    lookup,
    goalScorers,
    onGoalChange,
    scoringDisabled,
}) => {
    const renderTeamPlayers = (team: Team, teamIndex: number, isLeft: boolean) =>
        getPositionsForTeam(team, isLeft).map((position: PositionedPlayer) => {
            const playerId = position.player.playerId ?? position.player.name;
            const goalCount = goalScorers?.find(g => g.playerId === playerId)?.goals ?? 0;
            const showScoring = onGoalChange && !scoringDisabled;

            return (
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
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPlayerClick(setupIndex, teamIndex, position.playerIndex); } }}
                        tabIndex={0}
                        role="button"
                        aria-label={`${position.player.name}${position.player.isGoalkeeper ? ', Goalkeeper' : ''}. Click to select for swap`}
                        className={`w-8 h-8 sm:w-12 sm:h-12 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform ${playerRingClass(selectedPlayer, setupIndex, teamIndex, position.playerIndex)}`}
                    >
                        <PlayerIcon
                            color={team.color}
                            number={position.player.shirtNumber}
                            name={lookup && position.player.playerId ? resolvePlayerName(position.player.playerId, lookup) : position.player.name}
                            isGoalkeeper={position.player.isGoalkeeper}
                        />
                    </motion.div>
                    {/* Goal count badge + scoring buttons — below name label */}
                    {showScoring && (
                        <div className="flex items-center gap-0.5 justify-center mt-5 sm:mt-7 relative z-10">
                            <button
                                onClick={e => { e.stopPropagation(); onGoalChange(playerId, -1); }}
                                disabled={goalCount === 0}
                                className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-black/50 text-white/60 hover:bg-red-500/50 hover:text-white disabled:opacity-20 flex items-center justify-center text-[8px] sm:text-[10px]"
                            >
                                <Minus className="w-2.5 h-2.5" />
                            </button>
                            <span className={`text-[9px] sm:text-[11px] font-bold min-w-[14px] text-center ${goalCount > 0 ? 'text-white' : 'text-white/30'}`}>
                                {goalCount}
                            </span>
                            <button
                                onClick={e => { e.stopPropagation(); onGoalChange(playerId, 1); }}
                                className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-black/50 text-green-400 hover:bg-green-500/50 hover:text-white flex items-center justify-center text-[8px] sm:text-[10px]"
                            >
                                <Plus className="w-2.5 h-2.5" />
                            </button>
                        </div>
                    )}
                </div>
            );
        });

    return (
        <div role="group" aria-label="Football pitch with team players" className="w-full aspect-video relative bg-green-600 border-2 border-white rounded-lg shadow-lg overflow-hidden sm:aspect-video sm:w-full sm:h-auto">
            {/* Football pitch lines */}
            <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white"></div>
            <div className="absolute top-1/2 left-1/2 w-16 h-16 sm:w-24 sm:h-24 rounded-full border-2 border-white transform -translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute top-1/2 left-0 w-1 h-12 sm:w-2 sm:h-16 bg-white transform -translate-y-1/2"></div>
            <div className="absolute top-1/2 right-0 w-1 h-12 sm:w-2 sm:h-16 bg-white transform -translate-y-1/2"></div>
            <div className="absolute top-1/2 left-0 w-8 h-24 sm:w-12 sm:h-32 border-2 border-white border-l-0 transform -translate-y-1/2"></div>
            <div className="absolute top-1/2 right-0 w-8 h-24 sm:w-12 sm:h-32 border-2 border-white border-r-0 transform -translate-y-1/2"></div>

            {/* Swap hint icon */}
            <div className="swap-hint absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                <ArrowLeftRight className="w-4 h-4 sm:w-5 sm:h-5 text-white/30" />
            </div>

            {renderTeamPlayers(teams[0], 0, true)}
            {renderTeamPlayers(teams[1], 1, false)}
        </div>
    );
});

PitchRenderer.displayName = 'PitchRenderer';

export default PitchRenderer;
