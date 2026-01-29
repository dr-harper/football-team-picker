import React from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { MIN_PLAYERS, MAX_PLAYERS, NUM_TEAMS } from '../constants/gameConstants';

interface PlayerInputProps {
    playersText: string;
    onPlayersTextChange: (text: string) => void;
    onGenerate: () => void;
    onGenerateMultiple: () => void;
    onReset: () => void;
    errorMessage: string;
    showNoGoalkeeperInfo: boolean;
    hasTeams: boolean;
}

const PlayerInput: React.FC<PlayerInputProps> = ({
    playersText,
    onPlayersTextChange,
    onGenerate,
    onGenerateMultiple,
    onReset,
    errorMessage,
    showNoGoalkeeperInfo,
    hasTeams,
}) => {
    const playerCount = playersText.split('\n').filter(line => line.trim()).length;
    const goalkeeperCount = playersText.split('\n').filter(line => line.includes('#g')).length;

    return (
        <div className="bg-green-700 dark:bg-green-800 p-4 shadow-lg text-white rounded-lg">
            <div className="mb-4">
                <h2 className="text-xl font-semibold mb-2 text-white">Enter Players</h2>
                <p className="text-sm text-green-100 mt-1">
                    Format: One player per line. Use tags to assign roles and ensure equal distribution.<br />
                    <span className="font-bold">#g</span> = Goalkeeper, <span className="font-bold">#s</span> = Striker, <span className="font-bold">#d</span> = Defender, <span className="font-bold">#1</span> = Team 1, <span className="font-bold">#2</span> = Team 2.<br />
                </p>

                <div className="relative">
                    <Textarea
                        value={playersText}
                        onChange={(e) => onPlayersTextChange(e.target.value)}
                        placeholder={`Enter one player per line. Add optional tags:\nJohn  #g\nHenry\nDavid #s\nMark #d\nTom\nBilly #g`}
                        className="p-3 border border-green-300 rounded w-full h-40 font-mono bg-green-600 dark:bg-green-700 text-white placeholder-green-200"
                    />
                    {playersText && (
                        <Button
                            onClick={() => onPlayersTextChange('')}
                            variant="secondary"
                            size="sm"
                            className="absolute top-2 right-2 text-xs px-2 py-1"
                        >
                            Clear
                        </Button>
                    )}
                </div>
                <div className="flex justify-between items-center mb-2">
                    <p className={`text-sm font-bold ${playerCount < MIN_PLAYERS ? 'text-red-500' : 'text-green-200'}`}>
                        Players: {playerCount} / {MAX_PLAYERS}
                    </p>
                    <p className={`text-sm font-bold ${goalkeeperCount < NUM_TEAMS ? 'text-orange-500' : 'text-green-200'}`}>
                        Goalkeepers: {goalkeeperCount}/{NUM_TEAMS}
                    </p>
                </div>

                <div className="flex gap-4 mt-4">
                    <Button
                        onClick={onGenerate}
                        className="bg-white dark:bg-gray-700 dark:text-green-100 text-green-800 py-2 px-6 rounded font-bold shadow-md transition flex-grow hover:bg-green-100 dark:hover:bg-gray-600"
                    >
                        Create Team
                    </Button>
                    <Button
                        onClick={onGenerateMultiple}
                        className="bg-blue-700 dark:bg-blue-600 text-white py-2 px-6 rounded font-bold shadow-md transition flex-grow hover:bg-blue-800 dark:hover:bg-blue-700"
                    >
                        Create x3 Teams
                    </Button>
                    <Button
                        onClick={onReset}
                        className="bg-green-900 dark:bg-green-950 text-white py-2 px-4 rounded font-bold shadow-md transition border border-white hover:bg-green-800 dark:hover:bg-green-900"
                    >
                        Reset
                    </Button>
                </div>
                {errorMessage && (
                    <div className="mt-3 bg-red-700 border border-red-500 text-white px-4 py-2 rounded">
                        {errorMessage}
                    </div>
                )}

                {hasTeams && showNoGoalkeeperInfo && (
                    <div className="bg-yellow-600 text-white p-4 rounded-lg shadow-md mb-4 mt-4">
                        <p>
                            Teams were created without goalkeepers. To lock goalkeepers, add <span className="font-bold">#g</span> after their name in the player list.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PlayerInput;
