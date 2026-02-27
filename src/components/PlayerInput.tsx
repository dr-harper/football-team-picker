import React, { useMemo } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Sparkles, MapPin, Users, Shield } from 'lucide-react';
import { MIN_PLAYERS, MAX_PLAYERS, NUM_TEAMS } from '../constants/gameConstants';
import { validatePlayerInput } from '../utils/validation';
import { teamPlaces } from '../constants/teamConstants';

interface PlayerInputProps {
    playersText: string;
    onPlayersTextChange: (text: string) => void;
    onGenerate: () => void;
    onGenerateMultiple: () => void;
    onReset: () => void;
    onFixWithAI: () => void;
    isFixingWithAI: boolean;
    aiEnabled: boolean;
    errorMessage: string;
    showNoGoalkeeperInfo: boolean;
    hasTeams: boolean;
    selectedLocation: string;
    onLocationChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    onFindLocation: () => void;
    isLoadingLocation: boolean;
}

const PlayerInput: React.FC<PlayerInputProps> = ({
    playersText,
    onPlayersTextChange,
    onGenerate,
    onGenerateMultiple,
    onReset,
    onFixWithAI,
    isFixingWithAI,
    aiEnabled,
    errorMessage,
    showNoGoalkeeperInfo,
    hasTeams,
    selectedLocation,
    onLocationChange,
    onFindLocation,
    isLoadingLocation,
}) => {
    const playerCount = playersText.split('\n').filter(line => line.trim()).length;
    const goalkeeperCount = playersText.split('\n').filter(line => line.includes('#g')).length;
    const validationErrors = useMemo(() => validatePlayerInput(playersText), [playersText]);
    const hasValidationErrors = validationErrors.length > 0;

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !hasValidationErrors) {
            e.preventDefault();
            onGenerate();
        }
    };

    return (
        <div className="bg-green-800/80 dark:bg-green-900/80 border border-green-600/40 p-5 shadow-xl text-white rounded-2xl">
            <div className="mb-4">
                <h2 className="text-2xl font-extrabold mb-1 text-white tracking-tight">Enter Players</h2>
                <p className="text-xs text-green-300 leading-relaxed">
                    One player per line.{' '}
                    <span className="font-semibold text-green-200">#g</span> goalkeeper &middot;{' '}
                    <span className="font-semibold text-green-200">#s</span> striker &middot;{' '}
                    <span className="font-semibold text-green-200">#d</span> defender &middot;{' '}
                    <span className="font-semibold text-green-200">#1 / #2</span> lock to team.{' '}
                    <span className="text-green-400">Ctrl+Enter</span> to generate.
                </p>

                <div className="relative mt-3">
                    <Textarea
                        value={playersText}
                        onChange={(e) => onPlayersTextChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={`Enter one player per line. Add optional tags:\nJohn  #g\nHenry\nDavid #s\nMark #d\nTom\nBilly #g`}
                        className="p-3 border border-green-500/50 rounded-xl w-full h-40 font-mono bg-green-900/60 dark:bg-green-950/60 text-white placeholder-green-500 focus:border-green-400 focus:ring-1 focus:ring-green-400 transition-colors"
                    />
                    {playersText && (
                        <div className="absolute top-2 right-2 flex gap-1">
                            {aiEnabled && (
                                <Button
                                    onClick={onFixWithAI}
                                    variant="secondary"
                                    size="sm"
                                    className="text-xs px-2 py-1 flex items-center gap-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/40 rounded-lg transition-colors"
                                    disabled={isFixingWithAI}
                                    title="Fix formatting with AI"
                                >
                                    <Sparkles className="w-3 h-3" />
                                    {isFixingWithAI ? 'Fixing...' : 'Fix with AI'}
                                </Button>
                            )}
                            <Button
                                onClick={() => onPlayersTextChange('')}
                                variant="secondary"
                                size="sm"
                                className="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 text-white/70 border border-white/20 rounded-lg transition-colors"
                            >
                                Clear
                            </Button>
                        </div>
                    )}
                </div>

                {hasValidationErrors && (
                    <div role="alert" className="mt-2 space-y-1">
                        {validationErrors.map((err, i) => (
                            <p key={i} className="text-sm text-orange-300">
                                Line {err.line}: {err.message}
                            </p>
                        ))}
                    </div>
                )}

                <div className="flex gap-2 mt-3">
                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${playerCount < MIN_PLAYERS ? 'bg-red-500/25 text-red-300' : 'bg-black/20 text-green-200'}`}>
                        <Users className="w-3 h-3" />
                        {playerCount} / {MAX_PLAYERS} players
                    </div>
                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${goalkeeperCount < NUM_TEAMS ? 'bg-orange-500/25 text-orange-300' : 'bg-black/20 text-green-200'}`}>
                        <Shield className="w-3 h-3" />
                        {goalkeeperCount}/{NUM_TEAMS} keepers
                    </div>
                </div>

                <div className="flex items-center gap-2 mt-3">
                    <MapPin className="w-4 h-4 text-green-400 shrink-0" />
                    <select
                        value={selectedLocation}
                        onChange={onLocationChange}
                        className="flex-1 border border-green-500/50 rounded-xl px-3 py-1.5 text-sm bg-green-900/60 dark:bg-green-950/60 text-white focus:border-green-400 focus:ring-1 focus:ring-green-400 transition-colors"
                        aria-label="Team name locale"
                    >
                        {Object.keys(teamPlaces).map(key => (
                            <option key={key} value={key}>{key}</option>
                        ))}
                    </select>
                    <Button
                        onClick={onFindLocation}
                        disabled={isLoadingLocation}
                        size="sm"
                        className="text-xs px-3 py-1.5 shrink-0 bg-white/10 hover:bg-white/20 text-white/70 border border-white/20 rounded-xl font-semibold transition-colors"
                        title="Auto-detect location"
                    >
                        {isLoadingLocation ? (
                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                            </svg>
                        ) : 'Detect'}
                    </Button>
                </div>

                <div className="flex gap-3 mt-4">
                    <Button
                        onClick={onGenerate}
                        disabled={hasValidationErrors}
                        className="flex-1 bg-gradient-to-r from-emerald-400 to-green-600 hover:from-emerald-300 hover:to-green-500 text-white py-2.5 rounded-xl font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Create Teams
                    </Button>
                    <Button
                        onClick={onGenerateMultiple}
                        disabled={hasValidationErrors}
                        className="flex-1 bg-gradient-to-r from-blue-500 to-blue-700 text-white py-2.5 rounded-xl font-bold shadow-md hover:shadow-lg hover:from-blue-400 hover:to-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Create ×3
                    </Button>
                    <Button
                        onClick={onReset}
                        className="px-4 py-2.5 rounded-xl font-bold bg-transparent border border-white/20 text-white/60 hover:text-red-400 hover:border-red-400/40 hover:bg-red-400/10 transition-all"
                    >
                        Reset
                    </Button>
                </div>

                {errorMessage && (
                    <div role="alert" className="mt-3 bg-red-500/20 border border-red-400/50 text-red-200 px-4 py-2 rounded-xl text-sm">
                        {errorMessage}
                    </div>
                )}

                {hasTeams && showNoGoalkeeperInfo && (
                    <div className="bg-yellow-500/20 border border-yellow-400/40 text-yellow-200 p-3 rounded-xl text-sm mt-4">
                        Teams were created without goalkeepers. Add <span className="font-bold">#g</span> after a player's name to lock in a keeper.
                    </div>
                )}
            </div>
        </div>
    );
};

export default PlayerInput;
