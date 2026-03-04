import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { teamPlaces } from '../constants/teamConstants';
import { getPlacesBasedOnLocation } from '../utils/locationUtils';
import { GEOLOCATION_THROTTLE_MS, GEMINI_VALIDATION_THROTTLE_MS } from '../constants/gameConstants';
import { getActiveGeminiKey, isAIAvailable, hasBuiltInAI } from '../utils/apiKey';
import { callGemini } from '../utils/geminiClient';

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
    activeGeminiKey: string;
    aiEnabled: boolean;
    aiOn: boolean;
    setAiOn: (on: boolean) => void;
    hasBuiltInKey: boolean;
    aiModel: string;
    setAIModel: (model: string) => void;
    aiCustomInstructions: string;
    setAICustomInstructions: (instructions: string) => void;
    geminiKeyError: string | null;
    aiInputRef: React.RefObject<HTMLInputElement | null>;
    handleGeminiKeySave: () => Promise<void>;

    // Theme
    theme: string;
    setTheme: (theme: string) => void;

    // Notifications
    notifications: { id: number; message: string }[];
    removeNotification: (id: number) => void;
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
}> = ({ children }) => {
    // Notifications
    const [notifications, setNotifications] = useState<{ id: number; message: string }[]>([]);
    // Location state
    const [selectedLocation, setSelectedLocation] = useState(() =>
        localStorage.getItem('selectedLocation') || 'Generic'
    );
    const [places, setPlaces] = useState<string[]>(teamPlaces.Generic.places);
    const [isLoadingLocation, setIsLoadingLocation] = useState(false);
    const [locationPermission, setLocationPermission] = useState<PermissionState>('prompt');

    // AI state
    const [geminiKey, setGeminiKey] = useState(() => localStorage.getItem('geminiKey') || '');
    const [aiModel, setAIModelState] = useState(() => {
        const stored = localStorage.getItem('aiModel');
        // Migrate deprecated model names
        if (!stored || stored === 'gemini-2.0-flash' || stored === 'gemini-pro') {
            return 'gemini-2.5-flash-lite';
        }
        return stored;
    });
    const [aiCustomInstructions, setAICustomInstructionsState] = useState(() =>
        localStorage.getItem('aiCustomInstructions') || ''
    );
    const [geminiKeyError, setGeminiKeyError] = useState<string | null>(null);
    const aiInputRef = useRef<HTMLInputElement>(null);

    // AI on/off toggle
    const [aiOn, setAiOnState] = useState(() => localStorage.getItem('aiOn') !== 'false');

    // Theme
    const [theme, setThemeState] = useState(() => {
        const stored = localStorage.getItem('theme');
        return (!stored || stored === 'default') ? 'dark' : stored;
    });

    // --- localStorage persistence ---
    useEffect(() => { localStorage.setItem('selectedLocation', selectedLocation); }, [selectedLocation]);
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        document.documentElement.classList.toggle('dark', theme === 'dark');
        localStorage.setItem('theme', theme);
    }, [theme]);
    useEffect(() => { localStorage.setItem('aiCustomInstructions', aiCustomInstructions); }, [aiCustomInstructions]);
    useEffect(() => { localStorage.setItem('aiOn', String(aiOn)); }, [aiOn]);

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

    const removeNotification = useCallback((id: number) => {
        setNotifications(n => n.filter(note => note.id !== id));
    }, []);

    const addNotification = useCallback((msg: string) => {
        const id = Date.now() + Math.random();
        setNotifications(n => [...n, { id, message: msg }]);
    }, []);

    // --- Setters with persistence ---
    const setAIModel = (model: string) => {
        setAIModelState(model);
        localStorage.setItem('aiModel', model);
    };

    const setAICustomInstructions = (instructions: string) => {
        setAICustomInstructionsState(instructions);
    };

    const setTheme = (t: string) => setThemeState(t);

    // --- Throttle guards ---
    const locationThrottleRef = useRef(0);
    const geminiThrottleRef = useRef(0);

    // --- Handlers ---
    const handleLocationChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedLocation(event.target.value);
    };

    const handleFindLocation = useCallback(async () => {
        const now = Date.now();
        if (now - locationThrottleRef.current < GEOLOCATION_THROTTLE_MS) return;
        locationThrottleRef.current = now;

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
            addNotification("Sorry, we don't have any regional data for your location. Defaulting to Generic");
        } else {
            addNotification(`Location found: ${location}`);
        }
    }, [addNotification]);

    const handleGeminiKeySave = useCallback(async () => {
        const now = Date.now();
        if (now - geminiThrottleRef.current < GEMINI_VALIDATION_THROTTLE_MS) return;
        geminiThrottleRef.current = now;
        if (aiInputRef.current) {
            const key = aiInputRef.current.value;
            setGeminiKeyError(null);
            try {
                const data = await callGemini(
                    aiModel,
                    [{ role: 'user', parts: [{ text: 'Reply with OK' }] }],
                    key,
                );
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
    }, [aiModel]);

    const activeKey = getActiveGeminiKey(geminiKey);
    const aiAvailable = isAIAvailable(geminiKey);
    const aiEnabled = aiAvailable && aiOn;

    const value: SettingsContextValue = {
        selectedLocation,
        setSelectedLocation,
        places,
        isLoadingLocation,
        locationPermission,
        handleLocationChange,
        handleFindLocation,
        geminiKey,
        activeGeminiKey: activeKey,
        aiEnabled,
        aiOn,
        setAiOn: (on: boolean) => setAiOnState(on),
        hasBuiltInKey: hasBuiltInAI(),
        aiModel,
        setAIModel,
        aiCustomInstructions,
        setAICustomInstructions,
        geminiKeyError,
        aiInputRef,
        handleGeminiKeySave,
        theme,
        setTheme,
        notifications,
        removeNotification,
        addNotification,
    };

    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    );
};
