import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { teamPlaces } from '../constants/teamConstants';

interface AppCustomizationProps {
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

const AppCustomization: React.FC<AppCustomizationProps> = ({
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
    const [open, setOpen] = useState(false);
    const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');

    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('darkMode', darkMode.toString());
    }, [darkMode]);

    return (
        <div className="relative">
            <Button onClick={() => setOpen(v => !v)} className="bg-yellow-400 text-green-900 font-bold px-3 py-1 rounded shadow flex items-center gap-2">
                App Customisation
            </Button>
            {open && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-300 rounded shadow-lg p-4 z-30 text-green-900 space-y-4">
                        <div>
                            <label htmlFor="location-select" className="block font-bold mb-1">Locale</label>
                            <p className="text-xs text-gray-600 mb-1">Choose your region to tailor team names.</p>
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
                                className="bg-blue-700 text-white py-2 px-4 rounded font-bold shadow-md hover:bg-blue-800 flex items-center gap-2 w-full"
                                disabled={isLoadingLocation}
                            >
                                {isLoadingLocation ? (
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                                    </svg>
                                ) : (
                                    <>Find Location</>
                                )}
                            </Button>
                        </div>
                        <div>
                            <label htmlFor="model-select" className="block font-bold mb-1">AI Model</label>
                            <p className="text-xs text-gray-600 mb-1">Select the Gemini model for AI summaries.</p>
                            <select id="model-select" value={aiModel} onChange={onAIModelChange} className="w-full border p-2 rounded mb-2">
                                <option value="gemini-2.0-flash">Gemini Flash</option>
                                <option value="gemini-pro">Gemini Pro</option>
                            </select>
                            <div className="mb-2 font-bold">Gemini API Key</div>
                            <input ref={aiInputRef} type="password" defaultValue={geminiKey} className="w-full border p-2 rounded mb-2" placeholder="Paste your Gemini API key here" />
                            <Button onClick={() => { onGeminiKeySave(); setOpen(false); }} className="bg-green-700 text-white w-full mb-2">Save Key</Button>
                            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-700 underline text-sm">Get your Gemini API key from Google AI Studio</a>
                            {geminiKeyError && <div className="text-red-600 text-sm mt-2">{geminiKeyError}</div>}
                        </div>
                        <div className="flex items-center">
                            <input type="checkbox" id="dark-mode-toggle" checked={darkMode} onChange={e => setDarkMode(e.target.checked)} className="mr-2" />
                            <label htmlFor="dark-mode-toggle" className="text-sm font-bold">Dark Mode</label>
                        </div>
                    </div>
                )}
            </div>
    );
};

export default AppCustomization;
