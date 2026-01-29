import React, { useState } from 'react';
import { Button } from './ui/button';
import { teamPlaces } from '../constants/teamConstants';
import { Settings, Bot, Check, X, MapPin } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

const HeaderBar: React.FC = () => {
    const {
        selectedLocation,
        handleLocationChange,
        handleFindLocation,
        isLoadingLocation,
        locationPermission,
        aiModel,
        setAIModel,
        geminiKey,
        handleGeminiKeySave,
        aiInputRef,
        geminiKeyError,
        aiCustomInstructions,
        setAICustomInstructions,
        warrenMode,
        setWarrenMode,
        warrenAggression,
        setWarrenAggression,
        darkMode,
        setDarkMode,
    } = useSettings();

    const [showConfig, setShowConfig] = useState(false);

    const aiEnabled = Boolean(geminiKey);

    return (
        <header className="bg-green-900 text-white p-4 flex items-center justify-between relative z-10 dark:bg-green-950">
            <div className="flex items-center gap-2">
                <img src="/logo.png" alt="Team Shuffle Logo" className="w-8 h-8" />
                <span className="font-bold text-xl">Team Shuffle</span>
            </div>
            <div className="relative flex items-center gap-2">
                <Button
                    onClick={() => setShowConfig(true)}
                    variant="ghost"
                    size="icon"
                    className="rounded-full text-white"
                >
                    <Settings className="w-5 h-5" />
                </Button>
                <button
                    onClick={() => {
                        setShowConfig(true);
                        setTimeout(() => aiInputRef.current?.focus(), 0);
                    }}
                    className="relative text-white"
                    aria-label="AI status"
                >
                    <Bot className="w-5 h-5" />
                    {aiEnabled ? (
                        <Check className="absolute -right-1 -bottom-1 w-3 h-3 bg-green-700 text-white rounded-full" />
                    ) : (
                        <X className="absolute -right-1 -bottom-1 w-3 h-3 bg-red-700 text-white rounded-full" />
                    )}
                </button>
                <button
                    onClick={handleFindLocation}
                    className="relative text-white"
                    aria-label="Location status"
                >
                    <MapPin className="w-5 h-5" />
                    {locationPermission === 'granted' ? (
                        <Check className="absolute -right-1 -bottom-1 w-3 h-3 bg-green-700 text-white rounded-full" />
                    ) : (
                        <X className="absolute -right-1 -bottom-1 w-3 h-3 bg-red-700 text-white rounded-full" />
                    )}
                </button>
            </div>
            {showConfig && (
                <div
                    className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-30"
                    onClick={() => setShowConfig(false)}
                >
                    <div
                        className="relative w-80 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-lg p-4 text-green-900 dark:text-green-100 space-y-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setShowConfig(false)}
                            className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 dark:text-gray-300"
                        >
                            <X className="w-4 h-4" />
                        </button>
                        <div>
                            <div className="font-bold mb-1">Locale</div>
                            <p className="text-xs mb-2">Used for team name suggestions.</p>
                            <select
                                id="location-select"
                                value={selectedLocation}
                                onChange={handleLocationChange}
                                className="w-full border p-2 rounded mb-2 dark:bg-gray-700 dark:text-white"
                            >
                                {Object.entries(teamPlaces).map(([key]) => (
                                    <option key={key} value={key}>{key}</option>
                                ))}
                            </select>
                            <Button
                                onClick={handleFindLocation}
                                className="bg-green-700 dark:bg-green-600 text-white w-full"
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
                                onChange={(e) => setAIModel(e.target.value)}
                                className="w-full border p-2 rounded mb-2 dark:bg-gray-700 dark:text-white"
                            >
                                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                                <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash Lite</option>
                            </select>
                            <label className="block font-semibold mb-1">Gemini API Key</label>
                            <input
                                ref={aiInputRef}
                                type="password"
                                defaultValue={geminiKey}
                                className="w-full border p-2 rounded mb-2 dark:bg-gray-700 dark:text-white"
                                placeholder="Paste your Gemini API key here"
                            />
                            <Button
                                onClick={() => {
                                    handleGeminiKeySave();
                                    setShowConfig(false);
                                }}
                                className="bg-green-700 dark:bg-green-600 text-white w-full mb-2"
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
                            <label className="block font-semibold mb-1">Custom Instructions</label>
                            <textarea
                                value={aiCustomInstructions}
                                onChange={(e) => setAICustomInstructions(e.target.value)}
                                className="w-full h-24 border p-2 rounded mb-2 dark:bg-gray-700 dark:text-white"
                                placeholder="Any extra instructions for the AI"
                            />
                        </div>
                        <div>
                            <label className="font-bold flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={warrenMode}
                                    onChange={(e) => setWarrenMode(e.target.checked)}
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
                                        onChange={(e) => setWarrenAggression(Number(e.target.value))}
                                        className="w-full"
                                    />
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="font-bold flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={darkMode}
                                    onChange={(e) => setDarkMode(e.target.checked)}
                                />
                                Dark Mode
                            </label>
                            <p className="text-xs mt-1">Switches between light and dark themes.</p>
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
};

export default HeaderBar;
