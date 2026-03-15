import React, { useState } from 'react';
import { MatchEventType, MatchEvent } from '../../types';
import { resolvePlayerName } from '../../utils/playerLookup';

const EVENT_CONFIG: Record<MatchEventType, {
    emoji: string;
    label: string;
    playerLabel: string;
    secondaryLabel?: string;
    secondaryField?: 'assisterId' | 'swappedWithId';
    showCardColour?: boolean;
}> = {
    goal: { emoji: '⚽', label: 'Goal', playerLabel: 'Who scored?', secondaryLabel: 'Assisted by?', secondaryField: 'assisterId' },
    'own-goal': { emoji: '🙈', label: 'Own Goal', playerLabel: 'Who scored the own goal?' },
    'penalty-scored': { emoji: '🎯', label: 'Pen Scored', playerLabel: 'Who scored?' },
    'penalty-missed': { emoji: '❌', label: 'Pen Missed', playerLabel: 'Who missed?' },
    'penalty-conceded': { emoji: '🫣', label: 'Pen Conceded', playerLabel: 'Who conceded?' },
    save: { emoji: '🧤', label: 'Save', playerLabel: 'Who saved?' },
    tackle: { emoji: '🛡️', label: 'Tackle', playerLabel: 'Who tackled?' },
    card: { emoji: '🟨', label: 'Card', playerLabel: 'Who got carded?', showCardColour: true },
    swap: { emoji: '🔄', label: 'Swap', playerLabel: 'Who is swapping?', secondaryLabel: 'Swapped with?', secondaryField: 'swappedWithId' },
    highlight: { emoji: '✨', label: 'Highlight', playerLabel: 'Who?' },
    note: { emoji: '💬', label: 'Note', playerLabel: 'About who? (optional)' },
};

interface InlineEventFormProps {
    eventType: MatchEventType;
    players: { id: string; name: string; teamColour: string }[];
    lookup: Record<string, string>;
    elapsedSec?: number;
    onAdd: (event: MatchEvent) => void;
    onCancel: () => void;
}

const InlineEventForm: React.FC<InlineEventFormProps> = ({
    eventType, players, lookup, elapsedSec, onAdd, onCancel,
}) => {
    const config = EVENT_CONFIG[eventType];
    const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
    const [secondaryPlayer, setSecondaryPlayer] = useState<string | null>(null);
    const [cardColour, setCardColour] = useState<'yellow' | 'red'>('yellow');
    const [note, setNote] = useState('');

    const canSubmit = eventType === 'note' ? note.trim().length > 0 : !!selectedPlayer;

    const handleSubmit = () => {
        if (!canSubmit) return;
        const playerName = selectedPlayer ? resolvePlayerName(selectedPlayer, lookup) : '';
        const secondaryName = secondaryPlayer ? resolvePlayerName(secondaryPlayer, lookup) : '';

        let transcript: string;
        switch (eventType) {
            case 'goal': transcript = secondaryName ? `Goal by ${playerName}, assist by ${secondaryName}` : `Goal by ${playerName}`; break;
            case 'own-goal': transcript = `Own goal by ${playerName}`; break;
            case 'penalty-scored': transcript = `Penalty scored by ${playerName}`; break;
            case 'penalty-missed': transcript = `Penalty missed by ${playerName}`; break;
            case 'penalty-conceded': transcript = `Penalty conceded by ${playerName}`; break;
            case 'save': transcript = `Save by ${playerName}`; break;
            case 'tackle': transcript = `Tackle by ${playerName}`; break;
            case 'card': transcript = `${cardColour} card for ${playerName}`; break;
            case 'swap': transcript = secondaryName ? `${playerName} swapped with ${secondaryName}` : `${playerName} switched teams`; break;
            case 'highlight': transcript = note ? `${playerName}: ${note}` : `Highlight: ${playerName}`; break;
            default: transcript = note;
        }

        onAdd({
            id: crypto.randomUUID(),
            type: eventType,
            playerId: selectedPlayer ?? undefined,
            assisterId: config.secondaryField === 'assisterId' ? secondaryPlayer ?? undefined : undefined,
            swappedWithId: config.secondaryField === 'swappedWithId' ? secondaryPlayer ?? undefined : undefined,
            cardColour: config.showCardColour ? cardColour : undefined,
            elapsedSec,
            transcript,
            description: note.trim() || undefined,
            source: 'voice',
            status: 'applied',
            createdAt: Date.now(),
        });
    };

    return (
        <div className="bg-white/5 rounded-xl p-3 space-y-3 border border-white/10">
            {/* Player selection */}
            {eventType !== 'note' && (
                <div>
                    <p className="text-white/50 text-[10px] uppercase tracking-wider mb-1.5">{config.playerLabel}</p>
                    <div className="flex flex-wrap gap-1.5">
                        {players.map(p => (
                            <button
                                key={p.id}
                                onClick={() => setSelectedPlayer(selectedPlayer === p.id ? null : p.id)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                                    selectedPlayer === p.id
                                        ? 'ring-2 ring-green-400 bg-green-500/20 text-white'
                                        : 'bg-white/5 text-white/70 hover:bg-white/10'
                                }`}
                                style={selectedPlayer !== p.id ? { borderLeft: `3px solid ${p.teamColour}` } : undefined}
                            >
                                {p.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Secondary player (assist / swap partner) */}
            {config.secondaryField && selectedPlayer && (
                <div>
                    <p className="text-white/50 text-[10px] uppercase tracking-wider mb-1.5">{config.secondaryLabel}</p>
                    <div className="flex flex-wrap gap-1.5">
                        {players
                            .filter(p => p.id !== selectedPlayer)
                            .map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => setSecondaryPlayer(secondaryPlayer === p.id ? null : p.id)}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                                        secondaryPlayer === p.id
                                            ? 'ring-2 ring-blue-400 bg-blue-500/20 text-white'
                                            : 'bg-white/5 text-white/70 hover:bg-white/10'
                                    }`}
                                    style={secondaryPlayer !== p.id ? { borderLeft: `3px solid ${p.teamColour}` } : undefined}
                                >
                                    {p.name}
                                </button>
                            ))}
                        <button
                            onClick={() => setSecondaryPlayer(null)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                                !secondaryPlayer ? 'bg-white/10 text-white/40' : 'bg-white/5 text-white/30 hover:bg-white/10'
                            }`}
                        >
                            None
                        </button>
                    </div>
                </div>
            )}

            {/* Card colour */}
            {config.showCardColour && (
                <div className="flex gap-2">
                    <button
                        onClick={() => setCardColour('yellow')}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            cardColour === 'yellow' ? 'bg-yellow-500/30 text-yellow-300 ring-1 ring-yellow-400' : 'bg-white/5 text-white/40'
                        }`}
                    >
                        🟨 Yellow
                    </button>
                    <button
                        onClick={() => setCardColour('red')}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            cardColour === 'red' ? 'bg-red-500/30 text-red-300 ring-1 ring-red-400' : 'bg-white/5 text-white/40'
                        }`}
                    >
                        🟥 Red
                    </button>
                </div>
            )}

            {/* Note */}
            <input
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && canSubmit) handleSubmit(); }}
                placeholder={eventType === 'note' ? 'What happened?' : 'Add detail (optional)'}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs placeholder:text-white/20 focus:outline-none focus:border-green-500/40"
                autoFocus={eventType === 'note'}
            />

            {/* Actions */}
            <div className="flex gap-2">
                <button
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                        canSubmit
                            ? 'bg-green-600 hover:bg-green-500 text-white'
                            : 'bg-white/5 text-white/20 cursor-not-allowed'
                    }`}
                >
                    {config.emoji} Add {config.label}
                </button>
                <button
                    onClick={onCancel}
                    className="px-4 py-2 rounded-lg text-xs bg-white/5 text-white/40 hover:bg-white/10 transition-colors"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
};

export default InlineEventForm;
