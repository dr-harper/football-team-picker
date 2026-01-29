import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import Notification from './components/Notification';
import Footer from './components/Footer';
import FloatingFooter from './components/FloatingFooter';
import HeaderBar from './components/HeaderBar';
import PlayerInput from './components/PlayerInput';
import PlaceholderPitch from './components/PlaceholderPitch';
import TeamSetupCard from './components/TeamSetupCard';
import { teamPlaces } from './constants/teamConstants';
import { getPlacesBasedOnLocation } from './utils/locationUtils';
import { generateTeamsFromText } from './utils/teamGenerator';
import { exportImage, shareImage } from './utils/imageExport';
import { Team, TeamSetup } from './types';
import { WARREN_NASTY_PHRASES, WARREN_LOVELY_PHRASES, geminiEndpoint, MATCH_SUMMARY_PROMPT } from './constants/aiPrompts';

const FootballTeamPicker = () => {
    const [playersText, setPlayersText] = useState(() => {
        return localStorage.getItem('playersText') || '';
    });
    const [teamSetups, setTeamSetups] = useState<TeamSetup[]>([]);
    const [errorMessage, setErrorMessage] = useState('');
    const [playerNumbers, setPlayerNumbers] = useState<{ [playerName: string]: number }>({});
    const [selectedLocation, setSelectedLocation] = useState(() => {
        return localStorage.getItem('selectedLocation') || 'Generic';
    });
    const [places, setPlaces] = useState<string[]>(teamPlaces.Generic.places);
    const [notifications, setNotifications] = useState<{ id: number; message: string }[]>([]);
    const [showNoGoalkeeperInfo, setShowNoGoalkeeperInfo] = useState(false);
    const [isLoadingLocation, setIsLoadingLocation] = useState(false);
    const [selectedPlayer, setSelectedPlayer] = useState<{
        setupIndex: number;
        teamIndex: number;
        playerIndex: number;
    } | null>(null);
    const [geminiKey, setGeminiKey] = useState(() => localStorage.getItem('geminiKey') || '');
    const [aiModel, setAIModel] = useState(() => localStorage.getItem('aiModel') || 'gemini-2.0-flash');
    const [aiCustomInstructions, setAICustomInstructions] = useState(() =>
        localStorage.getItem('aiCustomInstructions') || ''
    );
    const [aiSummaries, setAISummaries] = useState<{ [setupIndex: number]: string }>({});
    const [geminiKeyError, setGeminiKeyError] = useState<string | null>(null);
    const [warrenMode, setWarrenMode] = useState(() => localStorage.getItem('warrenMode') === 'true');
    const [warrenAggression, setWarrenAggression] = useState(() => {
        const stored = localStorage.getItem('warrenAggression');
        return stored ? Number(stored) : 20;
    });
    const [darkMode, setDarkMode] = useState(() => {
        const stored = localStorage.getItem('darkMode');
        return stored ? stored === 'true' : true;
    });
    const [locationPermission, setLocationPermission] = useState<PermissionState>('prompt');
    const aiInputRef = useRef<HTMLInputElement>(null);

    // --- localStorage persistence effects ---
    useEffect(() => { localStorage.setItem('playersText', playersText); }, [playersText]);
    useEffect(() => { localStorage.setItem('selectedLocation', selectedLocation); }, [selectedLocation]);
    useEffect(() => { localStorage.setItem('warrenMode', String(warrenMode)); }, [warrenMode]);
    useEffect(() => { localStorage.setItem('warrenAggression', String(warrenAggression)); }, [warrenAggression]);
    useEffect(() => {
        document.documentElement.classList.toggle('dark', darkMode);
        localStorage.setItem('darkMode', String(darkMode));
    }, [darkMode]);
    useEffect(() => { localStorage.setItem('aiCustomInstructions', aiCustomInstructions); }, [aiCustomInstructions]);

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

    useEffect(() => {
        setPlaces((teamPlaces as Record<string, { places: string[] }>)[selectedLocation]?.places || teamPlaces.Generic.places);
    }, [selectedLocation]);

    useEffect(() => { setAISummaries({}); }, [teamSetups]);

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

    const removeNotification = (id: number) => {
        setNotifications(n => n.filter(note => note.id !== id));
    };

    // --- Event handlers ---
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

    const generateTeams = () => {
        const result = generateTeamsFromText(playersText, places, playerNumbers);
        if (result.error) {
            setErrorMessage(applyWarrenTone(result.error));
            return;
        }
        setPlayerNumbers(result.playerNumbers);
        setTeamSetups(prev => [...prev, { teams: result.teams, playersInput: playersText }]);
        setErrorMessage('');
        setShowNoGoalkeeperInfo(result.noGoalkeepers);
    };

    const deleteTeamSetup = (indexToDelete: number) => {
        setTeamSetups(prev => prev.filter((_, index) => index !== indexToDelete));
    };

    const handleColorChange = (setupIndex: number, teamIndex: number, color: string) => {
        setTeamSetups(prev =>
            prev.map((setup: TeamSetup, i: number) => {
                if (i !== setupIndex) return setup;
                return {
                    ...setup,
                    teams: setup.teams.map((team: Team, j: number) => ({
                        ...team,
                        color: j === teamIndex ? color : team.color,
                    })),
                };
            })
        );
    };

    const swapPlayers = (
        first: { setupIndex: number; teamIndex: number; playerIndex: number },
        second: { setupIndex: number; teamIndex: number; playerIndex: number }
    ) => {
        if (first.setupIndex !== second.setupIndex) return;
        setTeamSetups(prev => {
            return prev.map((setup, sIdx) => {
                if (sIdx !== first.setupIndex) return setup;
                const newTeams = setup.teams.map((team: Team) => ({
                    ...team,
                    players: [...team.players],
                }));
                const temp = newTeams[first.teamIndex].players[first.playerIndex];
                newTeams[first.teamIndex].players[first.playerIndex] = newTeams[second.teamIndex].players[second.playerIndex];
                newTeams[second.teamIndex].players[second.playerIndex] = temp;
                return { ...setup, teams: newTeams };
            });
        });
    };

    const handlePlayerClick = (setupIndex: number, teamIndex: number, playerIndex: number) => {
        const clicked = { setupIndex, teamIndex, playerIndex };
        if (!selectedPlayer || selectedPlayer.setupIndex !== setupIndex) {
            setSelectedPlayer(clicked);
            return;
        }
        if (selectedPlayer.teamIndex === teamIndex && selectedPlayer.playerIndex === playerIndex) {
            setSelectedPlayer(null);
        } else {
            swapPlayers(selectedPlayer, clicked);
            setSelectedPlayer(null);
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

    const handleGenerateSummary = async (setupIndex: number) => {
        if (!geminiKey) return;
        const setup = teamSetups[setupIndex];
        const toneInstruction = warrenMode
            ? ` Use a ${Math.random() < warrenAggression / 100 ? 'grumpy and angry' : 'cheerful and encouraging'} tone.`
            : '';
        const customInstruction = aiCustomInstructions ? ` ${aiCustomInstructions}` : '';
        const prompt =
            MATCH_SUMMARY_PROMPT +
            toneInstruction +
            customInstruction +
            `\n\n${setup.teams
                .map(
                    (team: Team, idx: number) =>
                        `Team ${idx + 1} (${team.name}):\n` +
                        team.players.map(p => `- ${p.name} (${p.role})`).join('\n')
                )
                .join('\n\n')}`;
        setAISummaries(prev => ({ ...prev, [setupIndex]: 'Loading...' }));
        try {
            const res = await fetch(geminiEndpoint(aiModel, geminiKey), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }] })
            });
            const data = await res.json();
            const summary = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No summary generated.';
            setAISummaries(prev => ({ ...prev, [setupIndex]: summary }));
        } catch {
            setAISummaries(prev => ({
                ...prev,
                [setupIndex]: applyWarrenTone('Error generating summary.'),
            }));
        }
    };

    const handleReset = () => {
        setTeamSetups([]);
        setErrorMessage('');
        setPlayerNumbers({});
        addNotification(applyWarrenTone('All teams cleared'));
    };

    // --- Render ---
    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-green-900 via-green-800 to-green-700 dark:from-green-950 dark:via-green-900 dark:to-green-800">
            <HeaderBar
                selectedLocation={selectedLocation}
                onLocationChange={handleLocationChange}
                onFindLocation={handleFindLocation}
                isLoadingLocation={isLoadingLocation}
                locationPermission={locationPermission}
                onLocationIconClick={handleFindLocation}
                aiModel={aiModel}
                onAIModelChange={(e) => {
                    setAIModel(e.target.value);
                    localStorage.setItem('aiModel', e.target.value);
                }}
                geminiKey={geminiKey}
                onGeminiKeySave={handleGeminiKeySave}
                aiInputRef={aiInputRef}
                geminiKeyError={geminiKeyError}
                aiCustomInstructions={aiCustomInstructions}
                onCustomInstructionsChange={setAICustomInstructions}
                warrenMode={warrenMode}
                onWarrenModeChange={setWarrenMode}
                warrenAggression={warrenAggression}
                onWarrenAggressionChange={setWarrenAggression}
                darkMode={darkMode}
                onDarkModeChange={setDarkMode}
            />
            <div className="flex-grow p-4 sm:p-6">
                {notifications.length > 0 && (
                    <div className="fixed bottom-24 right-4 flex flex-col items-end space-y-2 z-50">
                        {notifications.map(n => (
                            <Notification key={n.id} message={n.message} onClose={() => removeNotification(n.id)} />
                        ))}
                    </div>
                )}

                <div className="text-center space-y-3 mb-6 mt-4">
                    <p className="text-gray-200 text-lg sm:text-xl">
                        Pick your 5-a-side football teams<br />
                        <span className="text-yellow-300 text-base sm:text-lg font-semibold block mt-2">
                            Tip: Click one player, then another to swap their positions on the pitch!
                        </span>
                    </p>
                </div>

                <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-6">
                        <PlayerInput
                            playersText={playersText}
                            onPlayersTextChange={setPlayersText}
                            onGenerate={generateTeams}
                            onGenerateMultiple={() => { for (let i = 0; i < 3; i++) generateTeams(); }}
                            onReset={handleReset}
                            errorMessage={errorMessage}
                            showNoGoalkeeperInfo={showNoGoalkeeperInfo}
                            hasTeams={teamSetups.length > 0}
                        />
                    </div>

                    <div className="space-y-6">
                        {teamSetups.length === 0 ? (
                            <PlaceholderPitch />
                        ) : (
                            <AnimatePresence>
                                {teamSetups.map((setup, setupIndex) => (
                                    <TeamSetupCard
                                        key={setupIndex}
                                        setup={setup}
                                        setupIndex={setupIndex}
                                        totalSetups={teamSetups.length}
                                        selectedPlayer={selectedPlayer}
                                        onPlayerClick={handlePlayerClick}
                                        onDelete={deleteTeamSetup}
                                        onColorChange={handleColorChange}
                                        geminiKey={geminiKey}
                                        aiSummary={aiSummaries[setupIndex]}
                                        onGenerateSummary={handleGenerateSummary}
                                    />
                                ))}
                            </AnimatePresence>
                        )}
                    </div>
                </div>
            </div>

            <Footer />
            <FloatingFooter
                visible={teamSetups.length > 0}
                onExport={() => exportImage(teamSetups.length)}
                onShare={() => shareImage(teamSetups.length)}
                teamCount={teamSetups.length}
            />
        </div>
    );
};

export default FootballTeamPicker;
