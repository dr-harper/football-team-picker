import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import Notification from './components/Notification';
import Footer from './components/Footer';
import FloatingFooter from './components/FloatingFooter';
import HeaderBar from './components/HeaderBar';
import PlayerInput from './components/PlayerInput';
import PlaceholderPitch from './components/PlaceholderPitch';
import TeamSetupCard from './components/TeamSetupCard';
import { generateTeamsFromText } from './utils/teamGenerator';
import { exportImage, shareImage } from './utils/imageExport';
import { Team, TeamSetup } from './types';
import { MATCH_SUMMARY_PROMPT, FIX_INPUT_PROMPT, SETUP_TAGLINE_PROMPT } from './constants/aiPrompts';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { AI_SUMMARY_THROTTLE_MS, AI_FIX_INPUT_THROTTLE_MS } from './constants/gameConstants';
import { callGemini } from './utils/geminiClient';

const FootballTeamPickerInner = () => {
    const {
        places,
        activeGeminiKey,
        aiEnabled,
        aiModel,
        aiCustomInstructions,
        warrenMode,
        warrenAggression,
        notifications,
        removeNotification,
        applyWarrenTone,
        addNotification,
    } = useSettings();

    const [playersText, setPlayersText] = useState(() => {
        return localStorage.getItem('playersText') || '';
    });
    const [teamSetups, setTeamSetups] = useState<TeamSetup[]>([]);
    const [errorMessage, setErrorMessage] = useState('');
    const [playerNumbers, setPlayerNumbers] = useState<{ [playerName: string]: number }>({});
    const [showNoGoalkeeperInfo, setShowNoGoalkeeperInfo] = useState(false);
    const [selectedPlayer, setSelectedPlayer] = useState<{
        setupIndex: number;
        teamIndex: number;
        playerIndex: number;
    } | null>(null);
    const [aiSummaries, setAISummaries] = useState<{ [setupId: string]: string }>({});
    const [setupTaglines, setSetupTaglines] = useState<{ [setupId: string]: string }>({});
    const [isExporting, setIsExporting] = useState(false);
    const [isFixingWithAI, setIsFixingWithAI] = useState(false);
    const aiSummaryThrottleRef = useRef(0);
    const aiFixInputThrottleRef = useRef(0);
    const nextSetupIdRef = useRef(0);
    const taglinesGeneratingRef = useRef<Set<string>>(new Set());

    useEffect(() => { localStorage.setItem('playersText', playersText); }, [playersText]);
    useEffect(() => { setAISummaries({}); }, [teamSetups]);

    // Generate taglines in the background whenever a new setup appears
    useEffect(() => {
        if (!aiEnabled) return;
        const existingIds = new Set(teamSetups.map(s => s.id));

        // Clean up taglines for deleted setups
        setSetupTaglines(prev => Object.fromEntries(Object.entries(prev).filter(([id]) => existingIds.has(id))));

        teamSetups.forEach(setup => {
            if (taglinesGeneratingRef.current.has(setup.id)) return;
            taglinesGeneratingRef.current.add(setup.id);
            const matchup = setup.teams
                .map((t: Team) => `${t.name}: ${t.players.map((p: { name: string }) => p.name).join(', ')}`)
                .join(' vs ');
            callGemini(
                aiModel,
                [{ role: 'user', parts: [{ text: `${SETUP_TAGLINE_PROMPT}\n\nMatchup: ${matchup}` }] }],
                activeGeminiKey || undefined,
            )
                .then(data => {
                    const tagline = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
                    if (tagline) setSetupTaglines(prev => ({ ...prev, [setup.id]: tagline }));
                })
                .catch(() => {})
                .finally(() => taglinesGeneratingRef.current.delete(setup.id));
        });
    }, [teamSetups, aiEnabled, aiModel, activeGeminiKey]);

    const generateTeams = useCallback(() => {
        const result = generateTeamsFromText(playersText, places, playerNumbers);
        if (result.error) {
            setErrorMessage(applyWarrenTone(result.error));
            return;
        }
        setPlayerNumbers(result.playerNumbers);
        const id = String(nextSetupIdRef.current++);
        setTeamSetups(prev => [...prev, { id, teams: result.teams, playersInput: playersText }]);
        setErrorMessage('');
        setShowNoGoalkeeperInfo(result.noGoalkeepers);
    }, [playersText, places, playerNumbers, applyWarrenTone]);

    const deleteTeamSetup = (setupId: string) => {
        setTeamSetups(prev => prev.filter(setup => setup.id !== setupId));
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

    const handleFixWithAI = async () => {
        if (!aiEnabled || !playersText.trim()) return;
        const now = Date.now();
        if (now - aiFixInputThrottleRef.current < AI_FIX_INPUT_THROTTLE_MS) return;
        aiFixInputThrottleRef.current = now;
        setIsFixingWithAI(true);
        try {
            const data = await callGemini(
                aiModel,
                [{ role: 'user', parts: [{ text: FIX_INPUT_PROMPT + '\n\n' + playersText }] }],
                activeGeminiKey || undefined,
            );
            const fixed = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
            if (fixed) {
                setPlayersText(fixed);
                addNotification(applyWarrenTone('Player list tidied up by AI'));
            } else {
                addNotification(applyWarrenTone('AI could not fix the input'));
            }
        } catch {
            addNotification(applyWarrenTone('Error fixing input with AI'));
        }
        setIsFixingWithAI(false);
    };

    const handleGenerateSummary = async (setupId: string) => {
        if (!aiEnabled) return;
        const now = Date.now();
        if (now - aiSummaryThrottleRef.current < AI_SUMMARY_THROTTLE_MS) return;
        aiSummaryThrottleRef.current = now;
        const setup = teamSetups.find(s => s.id === setupId);
        if (!setup) return;
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
        setAISummaries(prev => ({ ...prev, [setupId]: 'Loading...' }));
        try {
            const data = await callGemini(
                aiModel,
                [{ role: 'user', parts: [{ text: prompt }] }],
                activeGeminiKey || undefined,
            );
            const summary = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No summary generated.';
            setAISummaries(prev => ({ ...prev, [setupId]: summary }));
        } catch {
            setAISummaries(prev => ({
                ...prev,
                [setupId]: applyWarrenTone('Error generating summary.'),
            }));
        }
    };

    const handleReset = () => {
        setTeamSetups([]);
        setErrorMessage('');
        setPlayerNumbers({});
        addNotification(applyWarrenTone('All teams cleared'));
    };

    return (
        <>
            <HeaderBar />
            <div className="flex-grow p-4 sm:p-6">
                {notifications.length > 0 && (
                    <div aria-live="polite" className="fixed bottom-24 right-4 flex flex-col items-end space-y-2 z-50">
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

                <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 foldable-grid">
                    <div className="space-y-6">
                        <PlayerInput
                            playersText={playersText}
                            onPlayersTextChange={setPlayersText}
                            onGenerate={generateTeams}
                            onGenerateMultiple={() => { for (let i = 0; i < 3; i++) generateTeams(); }}
                            onReset={handleReset}
                            onFixWithAI={handleFixWithAI}
                            isFixingWithAI={isFixingWithAI}
                            aiEnabled={aiEnabled}
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
                                        key={setup.id}
                                        setup={setup}
                                        setupIndex={setupIndex}
                                        totalSetups={teamSetups.length}
                                        selectedPlayer={selectedPlayer}
                                        onPlayerClick={handlePlayerClick}
                                        onDelete={() => deleteTeamSetup(setup.id)}
                                        onColorChange={handleColorChange}
                                        aiEnabled={aiEnabled}
                                        aiSummary={aiSummaries[setup.id]}
                                        onGenerateSummary={() => handleGenerateSummary(setup.id)}
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
                isExporting={isExporting}
                onExport={async () => {
                    setIsExporting(true);
                    const taglines = teamSetups.map(s => setupTaglines[s.id] || '');
                    const result = await exportImage(teamSetups.length, taglines);
                    setIsExporting(false);
                    if (!result.success) {
                        addNotification(applyWarrenTone(result.error || 'Export failed'));
                    }
                }}
                onShare={async () => {
                    setIsExporting(true);
                    const taglines = teamSetups.map(s => setupTaglines[s.id] || '');
                    const result = await shareImage(teamSetups.length, taglines);
                    setIsExporting(false);
                    if (!result.success) {
                        addNotification(applyWarrenTone(result.error || 'Sharing failed'));
                    }
                }}
                teamCount={teamSetups.length}
            />
        </>
    );
};

const FootballTeamPicker = () => {
    return (
        <SettingsProvider>
            <div className="min-h-screen flex flex-col bg-gradient-to-br from-green-900 via-green-800 to-green-700 dark:from-green-950 dark:via-green-900 dark:to-green-800">
                <FootballTeamPickerInner />
            </div>
        </SettingsProvider>
    );
};

export default FootballTeamPicker;
