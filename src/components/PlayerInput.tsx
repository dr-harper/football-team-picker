import React, { useMemo } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { MIN_PLAYERS, MAX_PLAYERS, NUM_TEAMS } from '../constants/gameConstants';
import { validatePlayerInput } from '../utils/validation';
import { useTheme } from '../themes';
import { cn } from '../lib/utils';

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
    const t = useTheme();
    const playerCount = playersText.split('\n').filter(line => line.trim()).length;
    const goalkeeperCount = playersText.split('\n').filter(line => line.includes('#g')).length;
    const validationErrors = useMemo(() => validatePlayerInput(playersText), [playersText]);
    const hasValidationErrors = validationErrors.length > 0;

    return (
        <div className={cn(
            t.card.base,
            t.card.rotate,
            t.decorations.ruledPaper && 'ruled-paper',
            t.decorations.marginLine && 'margin-line',
            'relative'
        )}>
            <div className="mb-4">
                <h2 className={cn(t.text.heading, 'mb-2')}>Enter Players</h2>
                <p className={cn(t.text.muted, 'mt-1')}>
                    Format: One player per line. Use tags to assign roles and ensure equal distribution.<br />
                    <span className="font-bold">#g</span> = Goalkeeper, <span className="font-bold">#s</span> = Striker, <span className="font-bold">#d</span> = Defender, <span className="font-bold">#1</span> = Team 1, <span className="font-bold">#2</span> = Team 2.<br />
                </p>

                <div className="relative">
                    <Textarea
                        value={playersText}
                        onChange={(e) => onPlayersTextChange(e.target.value)}
                        placeholder={`Enter one player per line. Add optional tags:\nJohn  #g\nHenry\nDavid #s\nMark #d\nTom\nBilly #g`}
                        className={t.inputs.textarea}
                    />
                    {playersText && (
                        <Button
                            onClick={() => onPlayersTextChange('')}
                            variant="secondary"
                            size="sm"
                            className={cn('absolute top-2 right-2', t.buttons.clear)}
                        >
                            Clear
                        </Button>
                    )}
                </div>

                {hasValidationErrors && (
                    <div className="mt-2 space-y-1">
                        {validationErrors.map((err, i) => (
                            <p key={i} className={t.banners.validation}>
                                Line {err.line}: {err.message}
                            </p>
                        ))}
                    </div>
                )}

                <div className="flex justify-between items-center mb-2">
                    <p className={cn('text-sm font-bold', playerCount < MIN_PLAYERS ? t.counters.invalid : t.counters.valid)}>
                        Players: {playerCount} / {MAX_PLAYERS}
                    </p>
                    <p className={cn('text-sm font-bold', goalkeeperCount < NUM_TEAMS ? t.counters.gkWarn : t.counters.valid)}>
                        Goalkeepers: {goalkeeperCount}/{NUM_TEAMS}
                    </p>
                </div>

                <div className="flex gap-4 mt-4">
                    <Button
                        onClick={onGenerate}
                        disabled={hasValidationErrors}
                        className={t.buttons.primary}
                    >
                        Create Team
                    </Button>
                    <Button
                        onClick={onGenerateMultiple}
                        disabled={hasValidationErrors}
                        className={t.buttons.secondary}
                    >
                        Create x3 Teams
                    </Button>
                    <Button
                        onClick={onReset}
                        className={t.buttons.ghost}
                    >
                        Reset
                    </Button>
                </div>
                {errorMessage && (
                    <div className={t.banners.error}>
                        {errorMessage}
                    </div>
                )}

                {hasTeams && showNoGoalkeeperInfo && (
                    <div className={t.banners.warning}>
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
