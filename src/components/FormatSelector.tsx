import React from 'react';
import type { GameFormat, GameFormatConfig } from '../types';
import { FORMAT_PRESETS } from '../constants/gameConstants';

interface FormatSelectorProps {
    value: GameFormatConfig;
    onChange: (config: GameFormatConfig) => void;
    compact?: boolean;
}

const FORMATS: { key: GameFormat; label: string }[] = [
    { key: '5v5', label: '5v5' },
    { key: '6v6', label: '6v6' },
    { key: '7v7', label: '7v7' },
    { key: 'custom', label: 'Custom' },
];

const FormatSelector: React.FC<FormatSelectorProps> = ({ value, onChange, compact }) => {
    const isCustom = value.format === 'custom';

    const handleFormatClick = (format: GameFormat) => {
        if (format === 'custom') {
            onChange({ format: 'custom', minPlayers: value.minPlayers, maxPlayers: value.maxPlayers });
        } else {
            onChange(FORMAT_PRESETS[format]);
        }
    };

    return (
        <div className={compact ? 'space-y-2' : 'space-y-3'}>
            {/* Segmented control */}
            <div className="flex bg-white/5 rounded-lg p-0.5">
                {FORMATS.map(({ key, label }) => (
                    <button
                        key={key}
                        type="button"
                        onClick={() => handleFormatClick(key)}
                        className={`flex-1 text-center py-1.5 rounded-md text-xs font-medium transition-colors ${
                            value.format === key
                                ? 'bg-green-600 text-white'
                                : 'text-white/40 hover:text-white/70'
                        }`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* Custom min/max inputs */}
            {isCustom && (
                <div className="flex gap-3">
                    <div className="flex-1">
                        <label className="block text-xs text-white/40 mb-1">Min players</label>
                        <input
                            type="number"
                            min={2}
                            max={value.maxPlayers}
                            value={value.minPlayers}
                            onChange={e => onChange({ ...value, minPlayers: Math.max(2, parseInt(e.target.value) || 2) })}
                            className="w-full bg-white/10 border border-white/20 rounded-lg px-2.5 py-1.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-green-400"
                        />
                    </div>
                    <div className="flex-1">
                        <label className="block text-xs text-white/40 mb-1">Max players</label>
                        <input
                            type="number"
                            min={value.minPlayers}
                            max={50}
                            value={value.maxPlayers}
                            onChange={e => onChange({ ...value, maxPlayers: Math.max(value.minPlayers, parseInt(e.target.value) || value.minPlayers) })}
                            className="w-full bg-white/10 border border-white/20 rounded-lg px-2.5 py-1.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-green-400"
                        />
                    </div>
                </div>
            )}

            {/* Summary */}
            <div className="text-xs text-white/40">
                {value.minPlayers}–{value.maxPlayers} players
            </div>
        </div>
    );
};

export default FormatSelector;
