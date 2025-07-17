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
}) => {
    const [showAIDropdown, setShowAIDropdown] = useState(false);

    return (
        <header className="bg-green-900 text-white p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2">
                <label htmlFor="location-select" className="font-semibold mr-2">Locale:</label>
                <select
                    id="location-select"
                    value={selectedLocation}
                    onChange={onLocationChange}
                    className="p-2 rounded bg-green-700 text-white border border-green-500"
                >
                    {Object.entries(teamPlaces).map(([key]) => (
                        <option key={key} value={key}>{key}</option>
                    ))}
                </select>
                <Button
                    onClick={onFindLocation}
                    className="bg-blue-700 text-white py-2 px-4 rounded font-bold shadow-md hover:bg-blue-800 flex items-center gap-2"
                    disabled={isLoadingLocation}
                >
                    {isLoadingLocation ? (
                        <svg
                            className="animate-spin h-5 w-5 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                        >
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                        </svg>
                    ) : (
                        <>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.5}
                                stroke="currentColor"
                                className="w-5 h-5"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 2c3.866 0 7 3.134 7 7 0 5.25-7 13-7 13s-7-7.75-7-13c0-3.866 3.134-7 7-7z" />
                                <circle cx="12" cy="9" r="2.25" />
                            </svg>
                            Find Location
                        </>
                    )}
                </Button>
            </div>
            <div className="relative">
                <Button onClick={() => setShowAIDropdown(v => !v)} className="bg-yellow-400 text-green-900 font-bold px-3 py-1 rounded shadow flex items-center gap-2">
                    AI Settings {geminiKey ? <span title="Gemini key set" className="text-green-700">✔️</span> : <span title="No Gemini key" className="text-red-700">❌</span>}
                </Button>
                {showAIDropdown && (
                    <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-300 rounded shadow-lg p-4 z-30 text-green-900">
                        <div className="mb-2">
                            <label htmlFor="model-select" className="block font-bold mb-1">Model</label>
                            <select id="model-select" value={aiModel} onChange={onAIModelChange} className="w-full border p-2 rounded mb-2">
                                <option value="gemini-2.0-flash">Gemini Flash</option>
                                <option value="gemini-pro">Gemini Pro</option>
                            </select>
                        </div>
                        <div className="mb-2 font-bold">Gemini API Key</div>
                        <input ref={aiInputRef} type="password" defaultValue={geminiKey} className="w-full border p-2 rounded mb-2" placeholder="Paste your Gemini API key here" />
                        <Button onClick={() => { onGeminiKeySave(); setShowAIDropdown(false); }} className="bg-green-700 text-white w-full mb-2">Save Key</Button>
                        <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-700 underline text-sm">Get your Gemini API key from Google AI Studio</a>
                        {geminiKeyError && <div className="text-red-600 text-sm mt-2">{geminiKeyError}</div>}
                    </div>
                )}
            </div>
        </header>
    );
};

export default HeaderBar;
