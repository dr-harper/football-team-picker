import React, { useState } from 'react';
import { Button } from './ui/button';
import { teamPlaces } from '../constants/teamConstants';

interface HeaderBarProps {
    selectedLocation: string;
    onLocationChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    onFindLocation: () => void;
    isLoadingLocation: boolean;
    aiModel: string;
    onAIModelChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    geminiKey: string;
    onGeminiKeySave: () => void;
    aiInputRef: React.RefObject<HTMLInputElement>;
    geminiKeyError: string | null;
    warrenMode: boolean;
    onWarrenModeChange: (value: boolean) => void;
    warrenAggression: number;
    onWarrenAggressionChange: (value: number) => void;
}

const HeaderBar: React.FC<HeaderBarProps> = ({
    selectedLocation,
    onLocationChange,
    onFindLocation,
    isLoadingLocation,
    aiModel,
    onAIModelChange,
    geminiKey,
    onGeminiKeySave,
    aiInputRef,
    geminiKeyError,
    warrenMode,
    onWarrenModeChange,
    warrenAggression,
    onWarrenAggressionChange,
}) => {
    const [showConfig, setShowConfig] = useState(false);

    return (
        <header className="bg-green-900 text-white p-4 flex justify-between items-center relative z-10">
            <img src="/logo.png" alt="Team Shuffle Logo" className="w-8 h-8" />
            <div className="relative">
                <Button
                    onClick={() => setShowConfig(v => !v)}
                    className="bg-blue-700 text-white font-bold px-3 py-1 rounded shadow"
                >
                    Configuration
                </Button>
                {showConfig && (
                    <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-300 rounded shadow-lg p-4 z-30 text-green-900 space-y-4">
                        <div>
                            <div className="font-bold mb-1">Locale</div>
                            <p className="text-xs mb-2">Used for team name suggestions.</p>
                            <select
                                id="location-select"
                                value={selectedLocation}
                                onChange={onLocationChange}
                                className="w-full border p-2 rounded mb-2"
                            >
                                {Object.entries(teamPlaces).map(([key]) => (
                                    <option key={key} value={key}>{key}</option>
                                ))}
                            </select>
                            <Button
                                onClick={onFindLocation}
                                className="bg-green-700 text-white w-full"
                                disabled={isLoadingLocation}
                            >
                                {isLoadingLocation ? (
                                    <svg
                                        className="animate-spin h-5 w-5 mx-auto"
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                    >
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                                    </svg>
                                ) : (
                                    'Find Location'
                                )}
                            </Button>
                        </div>
                        <div>
                            <div className="font-bold mb-1">AI Settings</div>
                            <p className="text-xs mb-2">Choose model for generating match summaries.</p>
                            <label htmlFor="model-select" className="block font-semibold mb-1">Model</label>
                            <select
                                id="model-select"
                                value={aiModel}
                                onChange={onAIModelChange}
                                className="w-full border p-2 rounded mb-2"
                            >
                                <option value="gemini-2.0-flash">Gemini Flash</option>
                                <option value="gemini-pro">Gemini Pro</option>
                            </select>
                            <label className="block font-semibold mb-1">Gemini API Key</label>
                            <input
                                ref={aiInputRef}
                                type="password"
                                defaultValue={geminiKey}
                                className="w-full border p-2 rounded mb-2"
                                placeholder="Paste your Gemini API key here"
                            />
                            <Button
                                onClick={() => {
                                    onGeminiKeySave();
                                    setShowConfig(false);
                                }}
                                className="bg-green-700 text-white w-full mb-2"
                            >
                                Save Key
                            </Button>
                            <a
                                href="https://aistudio.google.com/app/apikey"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-700 underline text-sm"
                            >
                                Get your Gemini API key from Google AI Studio
                            </a>
                            {geminiKeyError && (
                                <div className="text-red-600 text-sm mt-2">{geminiKeyError}</div>
                            )}
                        </div>
                        <div>
                            <label className="font-bold flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={warrenMode}
                                    onChange={(e) => onWarrenModeChange(e.target.checked)}
                                />
                                Warren Mode
                            </label>
                            <p className="text-xs mt-1">Adds spicy or lovely tone to messages.</p>
                            {warrenMode && (
                                <div className="mt-2">
                                    <label className="block text-sm font-semibold mb-1">
                                        Aggression: {warrenAggression}%
                                    </label>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={warrenAggression}
                                        onChange={(e) => onWarrenAggressionChange(Number(e.target.value))}
                                        className="w-full"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
};

export default HeaderBar;
