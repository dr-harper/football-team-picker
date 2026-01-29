import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/button';
import { teamPlaces } from '../constants/teamConstants';
import { Settings, Bot, Check, X, MapPin } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { useTheme, themes } from '../themes';
import type { ThemeName } from '../themes';

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
        themeName,
        setThemeName,
    } = useSettings();

    const t = useTheme();
    const [showConfig, setShowConfig] = useState(false);

    const aiEnabled = Boolean(geminiKey);

    return (
        <>
            <header className={t.header.containerClass}>
                <div className="flex items-center gap-2">
                    <img src="/logo.png" alt="Team Shuffle Logo" className="w-8 h-8" />
                    <span className={t.header.titleClass}>Team Shuffle</span>
                </div>
                <div className="relative flex items-center gap-2">
                    <Button
                        onClick={() => setShowConfig(true)}
                        variant="ghost"
                        size="icon"
                        className={`rounded-full ${t.header.iconClass} hover:bg-white/10`}
                    >
                        <Settings className="w-5 h-5" />
                    </Button>
                    <button
                        onClick={() => {
                            setShowConfig(true);
                            setTimeout(() => aiInputRef.current?.focus(), 0);
                        }}
                        className={`relative ${t.header.iconClass}`}
                        aria-label="AI status"
                    >
                        <Bot className="w-5 h-5" />
                        {aiEnabled ? (
                            <Check className={`absolute -right-1 -bottom-1 w-3 h-3 ${t.header.statusOk} rounded-full`} />
                        ) : (
                            <X className={`absolute -right-1 -bottom-1 w-3 h-3 ${t.header.statusErr} rounded-full`} />
                        )}
                    </button>
                    <button
                        onClick={handleFindLocation}
                        className={`relative ${t.header.iconClass}`}
                        aria-label="Location status"
                    >
                        <MapPin className="w-5 h-5" />
                        {locationPermission === 'granted' ? (
                            <Check className={`absolute -right-1 -bottom-1 w-3 h-3 ${t.header.statusOk} rounded-full`} />
                        ) : (
                            <X className={`absolute -right-1 -bottom-1 w-3 h-3 ${t.header.statusErr} rounded-full`} />
                        )}
                    </button>
                </div>
            </header>

            {/* Portal the modal to document.body so it escapes the header's stacking context */}
            {createPortal(
                <AnimatePresence>
                    {showConfig && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className={t.modal.overlayClass}
                            onClick={() => setShowConfig(false)}
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.2 }}
                                className={t.modal.panelClass}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <button
                                    onClick={() => setShowConfig(false)}
                                    className={t.modal.closeBtn}
                                >
                                    <X className="w-4 h-4" />
                                </button>

                                {/* Theme selector */}
                                <div>
                                    <div className={t.modal.sectionTitle}>Theme</div>
                                    <p className={t.modal.desc}>Choose the visual style of the app.</p>
                                    <select
                                        value={themeName}
                                        onChange={(e) => setThemeName(e.target.value as ThemeName)}
                                        className={t.modal.input}
                                    >
                                        {Object.values(themes).map((theme) => (
                                            <option key={theme.name} value={theme.name}>{theme.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <div className={t.modal.sectionTitle}>Locale</div>
                                    <p className={t.modal.desc}>Used for team name suggestions.</p>
                                    <select
                                        id="location-select"
                                        value={selectedLocation}
                                        onChange={handleLocationChange}
                                        className={t.modal.input}
                                    >
                                        {Object.entries(teamPlaces).map(([key]) => (
                                            <option key={key} value={key}>{key}</option>
                                        ))}
                                    </select>
                                    <Button
                                        onClick={handleFindLocation}
                                        className={t.modal.secondaryBtn}
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
                                    <div className={t.modal.sectionTitle}>AI Settings</div>
                                    <p className={t.modal.desc}>Choose model for generating match summaries.</p>
                                    <label htmlFor="model-select" className={t.modal.label}>Model</label>
                                    <select
                                        id="model-select"
                                        value={aiModel}
                                        onChange={(e) => setAIModel(e.target.value)}
                                        className={t.modal.input}
                                    >
                                        <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                                        <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash Lite</option>
                                    </select>
                                    <label className={t.modal.label}>Gemini API Key</label>
                                    <input
                                        ref={aiInputRef}
                                        type="password"
                                        defaultValue={geminiKey}
                                        className={t.modal.input}
                                        placeholder="Paste your Gemini API key here"
                                    />
                                    <Button
                                        onClick={() => {
                                            handleGeminiKeySave();
                                            setShowConfig(false);
                                        }}
                                        className={t.modal.primaryBtn}
                                    >
                                        Save Key
                                    </Button>
                                    <a
                                        href="https://aistudio.google.com/app/apikey"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={t.modal.link}
                                    >
                                        Get your Gemini API key from Google AI Studio
                                    </a>
                                    {geminiKeyError && (
                                        <div className="text-red-500 text-sm mt-2">{geminiKeyError}</div>
                                    )}
                                    <label className={t.modal.label}>Custom Instructions</label>
                                    <textarea
                                        value={aiCustomInstructions}
                                        onChange={(e) => setAICustomInstructions(e.target.value)}
                                        className={`${t.modal.input} h-24`}
                                        placeholder="Any extra instructions for the AI"
                                    />
                                </div>
                                <div>
                                    <label className={t.modal.checkboxLabel}>
                                        <input
                                            type="checkbox"
                                            checked={warrenMode}
                                            onChange={(e) => setWarrenMode(e.target.checked)}
                                        />
                                        Warren Mode
                                    </label>
                                    <p className={t.modal.desc + ' mt-1'}>Adds spicy or lovely tone to messages.</p>
                                    {warrenMode && (
                                        <div className="mt-2">
                                            <label className={t.modal.label + ' text-sm'}>
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
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body,
            )}
        </>
    );
};

export default HeaderBar;
