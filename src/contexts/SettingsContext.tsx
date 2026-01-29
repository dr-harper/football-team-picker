import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { teamPlaces } from '../constants/teamConstants';
import { getPlacesBasedOnLocation } from '../utils/locationUtils';
import { geminiEndpoint } from '../constants/aiPrompts';
import { WARREN_NASTY_PHRASES, WARREN_LOVELY_PHRASES } from '../constants/aiPrompts';

interface SettingsContextValue {
    // Location
    selectedLocation: string;
    setSelectedLocation: (location: string) => void;
    places: string[];
    isLoadingLocation: boolean;
    locationPermission: PermissionState;
    handleLocationChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    handleFindLocation: () => Promise<void>;

    // AI
    geminiKey: string;
    aiModel: string;
    setAIModel: (model: string) => void;
    aiCustomInstructions: string;
    setAICustomInstructions: (instructions: string) => void;
    geminiKeyError: string | null;
    aiInputRef: React.RefObject<HTMLInputElement | null>;
    handleGeminiKeySave: () => Promise<void>;

    // Warren Mode
    warrenMode: boolean;
    setWarrenMode: (mode: boolean) => void;
    warrenAggression: number;
    setWarrenAggression: (aggression: number) => void;

    // Dark Mode
    darkMode: boolean;
    setDarkMode: (mode: boolean) => void;

    // Helpers
    applyWarrenTone: (msg: string) => string;
    addNotification: (msg: string) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export const useSettings = (): SettingsContextValue => {
    const ctx = useContext(SettingsContext);
    if (!ctx) throw new Error('useSettings must be used within a SettingsProvider');
    return ctx;
};

export const SettingsProvider: React.FC<{
    children: React.ReactNode;
    notifications: { id: number; message: string }[];
    setNotifications: React.Dispatch<React.SetStateAction<{ id: number; message: string }[]>>;
}> = ({ children, notifications: _notifications, setNotifications }) => {
    // Location state
    const [selectedLocation, setSelectedLocation] = useState(() =>
        localStorage.getItem('selectedLocation') || 'Generic'
    );
    const [places, setPlaces] = useState<string[]>(teamPlaces.Generic.places);
    const [isLoadingLocation, setIsLoadingLocation] = useState(false);
    const [locationPermission, setLocationPermission] = useState<PermissionState>('prompt');

    // AI state
    const [geminiKey, setGeminiKey] = useState(() => localStorage.getItem('geminiKey') || '');
    const [aiModel, setAIModelState] = useState(() => localStorage.getItem('aiModel') || 'gemini-2.0-flash');
    const [aiCustomInstructions, setAICustomInstructionsState] = useState(() =>
        localStorage.getItem('aiCustomInstructions') || ''
    );
    const [geminiKeyError, setGeminiKeyError] = useState<string | null>(null);
    const aiInputRef = useRef<HTMLInputElement>(null);

    // Warren Mode
    const [warrenMode, setWarrenModeState] = useState(() => localStorage.getItem('warrenMode') === 'true');
    const [warrenAggression, setWarrenAggressionState] = useState(() => {
        const stored = localStorage.getItem('warrenAggression');
        return stored ? Number(stored) : 20;
    });

    // Dark Mode
    const [darkMode, setDarkModeState] = useState(() => {
        const stored = localStorage.getItem('darkMode');
        return stored ? stored === 'true' : true;
    });

    // --- localStorage persistence ---
    useEffect(() => { localStorage.setItem('selectedLocation', selectedLocation); }, [selectedLocation]);
    useEffect(() => { localStorage.setItem('warrenMode', String(warrenMode)); }, [warrenMode]);
    useEffect(() => { localStorage.setItem('warrenAggression', String(warrenAggression)); }, [warrenAggression]);
    useEffect(() => {
        document.documentElement.classList.toggle('dark', darkMode);
        localStorage.setItem('darkMode', String(darkMode));
    }, [darkMode]);
    useEffect(() => { localStorage.setItem('aiCustomInstructions', aiCustomInstructions); }, [aiCustomInstructions]);

    useEffect(() => {
        setPlaces(
            (teamPlaces as Record<string, { places: string[] }>)[selectedLocation]?.places || teamPlaces.Generic.places
        );
    }, [selectedLocation]);

    useEffect(() => {
        if (navigator.permissions?.query) {
            navigator.permissions
                .query({ name: 'geolocation' })
                .then(result => {
                    setLocationPermission(result.state);
                    result.onchange = () => setLocationPermission(result.state);
                })
                .catch(() => {});
        }
    }, []);

    // --- Helpers ---
    const applyWarrenTone = (msg: string) => {
        if (!warrenMode) return msg;
        if (Math.random() < warrenAggression / 100) {
            return msg + ' ' + WARREN_NASTY_PHRASES[Math.floor(Math.random() * WARREN_NASTY_PHRASES.length)];
        }
        return msg + ' ' + WARREN_LOVELY_PHRASES[Math.floor(Math.random() * WARREN_LOVELY_PHRASES.length)];
    };

    const addNotification = (msg: string) => {
        const id = Date.now() + Math.random();
        setNotifications(n => [...n, { id, message: msg }]);
    };

    // --- Setters with persistence ---
    const setAIModel = (model: string) => {
        setAIModelState(model);
        localStorage.setItem('aiModel', model);
    };

    const setAICustomInstructions = (instructions: string) => {
        setAICustomInstructionsState(instructions);
    };

    const setWarrenMode = (mode: boolean) => setWarrenModeState(mode);
    const setWarrenAggression = (aggression: number) => setWarrenAggressionState(aggression);
    const setDarkMode = (mode: boolean) => setDarkModeState(mode);

    // --- Handlers ---
    const handleLocationChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedLocation(event.target.value);
    };

    const handleFindLocation = async () => {
        setIsLoadingLocation(true);
        const { location, places } = await getPlacesBasedOnLocation();
        setSelectedLocation(location);
        setPlaces(places);
        if (navigator.permissions?.query) {
            try {
                const result = await navigator.permissions.query({ name: 'geolocation' });
                setLocationPermission(result.state);
            } catch {
                // ignore
            }
        }
        setIsLoadingLocation(false);
        if (location === 'Generic') {
            addNotification(applyWarrenTone("Sorry, we don't have any regional data for your location. Defaulting to Generic"));
        } else {
            addNotification(applyWarrenTone(`Location found: ${location}`));
        }
    };

    const handleGeminiKeySave = async () => {
        if (aiInputRef.current) {
            const key = aiInputRef.current.value;
            setGeminiKeyError(null);
            try {
                const res = await fetch(geminiEndpoint(aiModel, key), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Reply with OK' }] }] })
                });
                const data = await res.json();
                const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
                if (reply === 'OK') {
                    setGeminiKey(key);
                    localStorage.setItem('geminiKey', key);
                } else {
                    setGeminiKeyError('Invalid Gemini API key or unexpected response.');
                }
            } catch {
                setGeminiKeyError('Error validating Gemini API key.');
            }
        }
    };

    const value: SettingsContextValue = {
        selectedLocation,
        setSelectedLocation,
        places,
        isLoadingLocation,
        locationPermission,
        handleLocationChange,
        handleFindLocation,
        geminiKey,
        aiModel,
        setAIModel,
        aiCustomInstructions,
        setAICustomInstructions,
        geminiKeyError,
        aiInputRef,
        handleGeminiKeySave,
        warrenMode,
        setWarrenMode,
        warrenAggression,
        setWarrenAggression,
        darkMode,
        setDarkMode,
        applyWarrenTone,
        addNotification,
    };

    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    );
};
