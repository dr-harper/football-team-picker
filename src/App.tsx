import React, { useState, useEffect, useRef } from 'react';
import { Button } from './components/ui/button';
import { Textarea } from './components/ui/textarea';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { toPng } from 'html-to-image'; // Import the library
import PlayerIcon from './components/PlayerIcon'; // Import PlayerIcon from the new file
import { generateTeamName } from './utils/teamNameGenerator'; // Import the utility function
import { getPlacesBasedOnLocation } from './utils/locationUtils'; // Import location utility
import Notification from './components/Notification'; // Import Notification component
import Footer from './components/Footer'; // Import Footer component
import FloatingFooter from './components/FloatingFooter';
import HeaderBar from './components/HeaderBar';
import { teamPlaces } from './constants/teamConstants';
import { positionsByTeamSizeAndSide, placeholderPositions } from './constants/positionsConstants';
import ReactMarkdown from 'react-markdown';
import { pickSecondColor } from './utils/colorUtils';
import { Player, Team, TeamSetup, PositionedPlayer } from './types';
import { MIN_PLAYERS, MAX_PLAYERS, NUM_TEAMS, SHIRT_NUMBER_MIN, SHIRT_NUMBER_MAX, BOLD_COLOURS, NOTIFICATION_TIMEOUT_MS } from './constants/gameConstants';
import { geminiEndpoint, MATCH_SUMMARY_PROMPT, WARREN_NASTY_PHRASES, WARREN_LOVELY_PHRASES } from './constants/aiPrompts';

const FootballTeamPicker = () => {
    const [playersText, setPlayersText] = useState(() => {
        return localStorage.getItem('playersText') || '';
    });
    const [teamSetups, setTeamSetups] = useState<TeamSetup[]>([]);
    const [errorMessage, setErrorMessage] = useState('');
    const [playerNumbers, setPlayerNumbers] = useState<{ [playerName: string]: number }>({});
    const [selectedLocation, setSelectedLocation] = useState(() => {
        return localStorage.getItem('selectedLocation') || 'Generic'; // Load from localStorage or default to Hampshire
    });
    const [places, setPlaces] = useState<string[]>(teamPlaces.Generic.places); // Default to Hampshire places
    const [notifications, setNotifications] = useState<{ id: number; message: string }[]>([]);
    const [showNoGoalkeeperInfo, setShowNoGoalkeeperInfo] = useState(false); // State to track if the info box should be shown
    const [isLoadingLocation, setIsLoadingLocation] = useState(false); // New state for loading animation
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

    useEffect(() => {
        localStorage.setItem('playersText', playersText);
    }, [playersText]);

    useEffect(() => {
        localStorage.setItem('selectedLocation', selectedLocation); // Save selected location to localStorage
    }, [selectedLocation]);

    useEffect(() => {
        localStorage.setItem('warrenMode', String(warrenMode));
    }, [warrenMode]);

    useEffect(() => {
        localStorage.setItem('warrenAggression', String(warrenAggression));
    }, [warrenAggression]);

    useEffect(() => {
        document.documentElement.classList.toggle('dark', darkMode);
        localStorage.setItem('darkMode', String(darkMode));
    }, [darkMode]);

    useEffect(() => {
        localStorage.setItem('aiCustomInstructions', aiCustomInstructions);
    }, [aiCustomInstructions]);

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
        // Update places based on selected location
        setPlaces((teamPlaces as Record<string, { places: string[] }>)[selectedLocation]?.places || teamPlaces.Generic.places);
    }, [selectedLocation]);

    // Clear AI summary if a team setup changes
    useEffect(() => {
        setAISummaries({});
    }, [teamSetups]);

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

    const handleLocationChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedLocation(event.target.value);
    };
    const handleFindLocation = async () => {
        setIsLoadingLocation(true); // Start loading animation
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
        setIsLoadingLocation(false); // Stop loading animation
        if (location === 'Generic') {
            addNotification(applyWarrenTone("Sorry, we don't have any regional data for your location. Defaulting to Generic"));
        } else {
            addNotification(applyWarrenTone(`Location found: ${location}`)); // Show notification
        }
    };

    const generateTeams = () => {
        if (!playersText.trim()) {
            setErrorMessage(applyWarrenTone('Please enter player names'));
            return;
        }

        const playerLines = playersText.split('\n').filter(line => line.trim().length > 0);

        if (playerLines.length < MIN_PLAYERS) {
            setErrorMessage(applyWarrenTone(`You need at least ${MIN_PLAYERS} players for two 5-a-side teams`));
            return;
        }

        const players = playerLines.map(line => {
            const [name, ...rawTags] = line.split('#').map(item => item.trim());
            const normalizedTags = rawTags
                .filter(Boolean)
                .map(tag => tag.toLowerCase().replace(/\s+/g, ''));
            const isGoalkeeper = normalizedTags.includes('g');
            const isStriker = normalizedTags.includes('s');
            const isDefender = normalizedTags.includes('d');
            const isteam1 = normalizedTags.some(tag => ['t1', 'team1', '1'].includes(tag));
            const isteam2 = !isteam1 && normalizedTags.some(tag => ['t2', 'team2', '2'].includes(tag));

            return {
                name,
                isGoalkeeper,
                isStriker,
                isDefender,
                isteam1,
                isteam2,
                role: isGoalkeeper ? 'goalkeeper' : (isStriker ? 'striker' : (isDefender ? 'defender' : 'outfield')),
                shirtNumber: null,
            };
        });

        const goalkeepers = players.filter(player => player.isGoalkeeper);
        const strikers = players.filter(player => player.isStriker);
        const defenders = players.filter(player => player.isDefender);
        const outfieldPlayers = players.filter(player => !player.isGoalkeeper && !player.isStriker && !player.isDefender && !player.isteam1 && !player.isteam2);

        if (goalkeepers.length < NUM_TEAMS) {
            setErrorMessage(applyWarrenTone(`You need at least ${NUM_TEAMS} goalkeepers`));
        }

        if (players.length > MAX_PLAYERS) {
            setErrorMessage(applyWarrenTone(`You can only have a maximum of ${MAX_PLAYERS} players`));
            return;
        }

        const shuffledGoalkeepers = [...goalkeepers].sort(() => Math.random() - 0.5);
        const shuffledStrikers = [...strikers].sort(() => Math.random() - 0.5);
        const shuffledDefenders = [...defenders].sort(() => Math.random() - 0.5);
        const shuffledOutfield = [...outfieldPlayers].sort(() => Math.random() - 0.5);


        const selectedTeam1 = players.filter(player => player.isteam1);
        const selectedTeam2 = players.filter(player => player.isteam2);

        const generatedTeams: Team[] = [];
        const existingNames = new Set<string>();

        const primaryColor = BOLD_COLOURS[Math.floor(Math.random() * BOLD_COLOURS.length)];
        const secondaryColor = NUM_TEAMS > 1 ? pickSecondColor(primaryColor, BOLD_COLOURS) : primaryColor;

        for (let i = 0; i < NUM_TEAMS; i++) {
            const teamName = generateTeamName(existingNames, places) as string; // Use selected location's places
            existingNames.add(teamName);

            const team = {
                name: teamName,
                players: [shuffledGoalkeepers[i]],
                color: i === 0 ? primaryColor : secondaryColor,
            };
            generatedTeams.push(team);
        }

        let teamIndex = 0;

        selectedTeam1.forEach(player => {
            generatedTeams[0].players.push(player);
        });

        selectedTeam2.forEach(player => {
            generatedTeams[1].players.push(player);
        });

        shuffledDefenders.forEach(player => {
            generatedTeams[teamIndex].players.push(player);
            teamIndex = (teamIndex + 1) % NUM_TEAMS;
        });

        shuffledOutfield.forEach(player => {
            generatedTeams[teamIndex].players.push(player);
            teamIndex = (teamIndex + 1) % NUM_TEAMS;
        });

        shuffledStrikers.forEach(player => {
            generatedTeams[teamIndex].players.push(player);
            teamIndex = (teamIndex + 1) % NUM_TEAMS;
        });

        // for generated team, check if player index 0 is empty, if so reindex the players
        generatedTeams.forEach(team => {
            if (!team.players[0]) {
                team.players = team.players.filter((player): player is Player => Boolean(player));
            }
        });

        const availableNumbers = Array.from({ length: SHIRT_NUMBER_MAX - SHIRT_NUMBER_MIN }, (_, i) => i + SHIRT_NUMBER_MIN);
        const newPlayerNumbers: { [playerName: string]: number } = { ...playerNumbers };

        generatedTeams.forEach(team => {
            team.players.forEach((player: Player) => {
                if (player.isGoalkeeper) {
                    player.shirtNumber = 1;
                    newPlayerNumbers[player.name] = 1;
                }
                else if (newPlayerNumbers[player.name]) {
                    player.shirtNumber = newPlayerNumbers[player.name];
                }
                else {
                    if (availableNumbers.length > 0) {
                        const randomIndex = Math.floor(Math.random() * availableNumbers.length);
                        const number = availableNumbers.splice(randomIndex, 1)[0];
                        player.shirtNumber = number;
                        newPlayerNumbers[player.name] = number;
                    }
                    else {
                        player.shirtNumber = null;
                    }
                }
            });
        });

        setPlayerNumbers(newPlayerNumbers);
        setTeamSetups(prevSetups => [...prevSetups, { teams: generatedTeams, playersInput: playersText }]);
        setErrorMessage('');

        // Show the info box if no goalkeepers are selected
        setShowNoGoalkeeperInfo(goalkeepers.length === 0);

        // Hack Move one player if player numbers don't match
        if (generatedTeams[0].players.length !== generatedTeams[1].players.length) {
            const largerTeamIndex = generatedTeams[0].players.length > generatedTeams[1].players.length ? 0 : 1;
            const smallerTeamIndex = largerTeamIndex === 0 ? 1 : 0;

            // Move the last player from the larger team to the smaller team
            const playerToMove = generatedTeams[largerTeamIndex].players.pop();
            if (playerToMove) {
                generatedTeams[smallerTeamIndex].players.push(playerToMove);
            }
        }

    };

    const getPositionsForTeam = (
        team: Team,
        isLeftSide: boolean,
        totalPlayers: number,
    ): PositionedPlayer[] => {
        const side = isLeftSide ? 'left' : 'right';
        const positions = positionsByTeamSizeAndSide[totalPlayers]?.[side] || [];
        // Map each player in order to a position slot
        return team.players.map((player: Player, idx: number) => ({
            ...positions[idx],
            player,
            playerIndex: idx,
        }));
    };

    const deleteTeamSetup = (indexToDelete: number) => {
        setTeamSetups(prevSetups => prevSetups.filter((_, index) => index !== indexToDelete));
    };

    const handleColorChange = (setupIndex: number, teamIndex: number, color: string) => {
        setTeamSetups(prevSetups =>
            prevSetups.map((setup: TeamSetup, currentSetupIndex: number) => {
                if (currentSetupIndex === setupIndex) {
                    return {
                        ...setup,
                        teams: setup.teams.map((team: Team, currentTeamIndex: number) => ({
                            ...team,
                            color: currentTeamIndex === teamIndex ? color : team.color,
                        })),
                    };
                }
                return setup;
            })
        );
    };

    const swapPlayers = (
        first: { setupIndex: number; teamIndex: number; playerIndex: number },
        second: { setupIndex: number; teamIndex: number; playerIndex: number }
    ) => {
        if (first.setupIndex !== second.setupIndex) return; // Guard against cross setup swaps

        setTeamSetups(prevSetups => {
            const newSetups = prevSetups.map((setup, sIdx) => {
                if (sIdx !== first.setupIndex) return setup;
                // Deep copy teams and players arrays for the affected setup
                const newTeams = setup.teams.map((team: Team) => ({
                    ...team,
                    players: [...team.players],
                }));
                // Swap players
                const temp = newTeams[first.teamIndex].players[first.playerIndex];
                newTeams[first.teamIndex].players[first.playerIndex] = newTeams[second.teamIndex].players[second.playerIndex];
                newTeams[second.teamIndex].players[second.playerIndex] = temp;
                return { ...setup, teams: newTeams };
            });
            return newSetups;
        });
    };

    const handlePlayerClick = (
        setupIndex: number,
        teamIndex: number,
        playerIndex: number
    ) => {
        const clicked = { setupIndex, teamIndex, playerIndex };

        // Start a new selection if none selected or switching setups
        if (!selectedPlayer || selectedPlayer.setupIndex !== setupIndex) {
            setSelectedPlayer(clicked);
            return;
        }

        if (
            selectedPlayer.teamIndex === teamIndex &&
            selectedPlayer.playerIndex === playerIndex
        ) {
            setSelectedPlayer(null);
        } else {
            swapPlayers(selectedPlayer, clicked);
            setSelectedPlayer(null);
        }
    };

    // Unique identifier for a player within a setup used for motion layoutId and React keys

    const getPlayerId = (setupIndex: number, player: { name: string; shirtNumber: number | null }) =>
        `player-${setupIndex}-${player.name}-${player.shirtNumber}`;

    const generateTeamsImage = async (): Promise<string | null> => {
        const elements = teamSetups.map((_, index) => document.getElementById(`team-setup-${index}`));
        if (elements.some(element => !element)) return null;

        // Temporarily hide interactive elements
        elements.forEach(element => {
            const deleteButtons = element?.querySelectorAll('.delete-button');
            const colorPickers = element?.querySelectorAll('.color-picker');
            const colorCircles = element?.querySelectorAll('.color-circle');
            const aiSummaryButtons = element?.querySelectorAll('.generate-ai-summary');
            deleteButtons?.forEach(button => ((button as HTMLElement).style.display = 'none'));
            colorPickers?.forEach(picker => ((picker as HTMLElement).style.display = 'none'));
            colorCircles?.forEach(circle => ((circle as HTMLElement).style.display = 'none'));
            aiSummaryButtons?.forEach(button => ((button as HTMLElement).style.display = 'none'));
        });

        try {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            if (!context) return null;

            const images = await Promise.all(
                elements.map(async (element) => {
                    if (!element) return null;
                    const dataUrl = await toPng(element, {
                        backgroundColor: '#146434',
                    });
                    const img = new Image();
                    img.src = dataUrl;
                    await new Promise(resolve => (img.onload = resolve));
                    return img;
                })
            );

            const totalHeight = images.reduce((sum, img) => sum + (img?.height || 0), 0);
            const maxWidth = Math.max(...images.map(img => img?.width || 0));

            canvas.width = maxWidth;
            canvas.height = totalHeight + 40;

            let yOffset = 0;
            images.forEach(img => {
                if (img) {
                    context.drawImage(img, 0, yOffset, img.width, img.height);
                    yOffset += img.height;
                }
            });

            context.fillStyle = '#0A2507';
            context.fillRect(0, totalHeight, canvas.width, 40);

            context.fillStyle = 'white';
            context.font = 'bold 20px Arial';
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillText('Made with teamshuffle.app', canvas.width / 2, totalHeight + 20);

            return canvas.toDataURL('image/png');
        } catch (error) {
            console.error('Failed to generate image:', error);
            return null;
        } finally {
            elements.forEach(element => {
                const deleteButtons = element?.querySelectorAll('.delete-button');
                const colorPickers = element?.querySelectorAll('.color-picker');
                const colorCircles = element?.querySelectorAll('.color-circle');
                const aiSummaryButtons = element?.querySelectorAll('.generate-ai-summary');
                deleteButtons?.forEach(button => ((button as HTMLElement).style.display = ''));
                colorPickers?.forEach(picker => ((picker as HTMLElement).style.display = ''));
                colorCircles?.forEach(circle => ((circle as HTMLElement).style.display = ''));
                aiSummaryButtons?.forEach(button => ((button as HTMLElement).style.display = ''));
            });
        }
    };

    const exportAllImages = async () => {
        const dataUrl = await generateTeamsImage();
        if (!dataUrl) return;
        const link = document.createElement('a');
        link.href = dataUrl;
        const currentDate = new Date().toISOString().split('T')[0].replace(/-/g, '_');
        link.download = `Football_teams_${currentDate}.png`;
        link.click();
    };

    const shareAllImages = async () => {
        const dataUrl = await generateTeamsImage();
        if (!dataUrl) return;
        const currentDate = new Date().toISOString().split('T')[0].replace(/-/g, '_');
        try {
            const response = await fetch(dataUrl);
            const blob = await response.blob();
            const file = new File([blob], `Football_teams_${currentDate}.png`, { type: 'image/png' });
            const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean; share?: (data: ShareData) => Promise<void>; };
            if (nav.canShare && nav.canShare({ files: [file] })) {
                await nav.share({
                    files: [file],
                    title: 'TeamShuffle Teams',
                    text: 'Made with teamshuffle.app',
                });
            } else {
                const shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent('Check out the teams I made on teamshuffle.app')}`;
                window.open(shareUrl, '_blank');
            }
        } catch (err) {
            console.error('Sharing failed:', err);
        }
    };

    const renderPlaceholderPlayers = () => {
        return (
            <>
                {placeholderPositions.left.map((position, index) => (
                    <div
                        key={`left-${index}`}
                        className="absolute w-8 h-8 sm:w-12 sm:h-12 transform -translate-x-1/2 -translate-y-1/2"
                        style={{
                            top: position.top,
                            left: position.left,
                        }}
                    >
                        <PlayerIcon isPlaceholder />
                    </div>
                ))}
                {placeholderPositions.right.map((position, index) => (
                    <div
                        key={`right-${index}`}
                        className="absolute w-8 h-8 sm:w-12 sm:h-12 transform -translate-x-1/2 -translate-y-1/2"
                        style={{
                            top: position.top,
                            left: position.left,
                        }}
                    >
                        <PlayerIcon isPlaceholder />
                    </div>
                ))}
            </>
        );
    };


    const handleGeminiKeySave = async () => {
        if (aiInputRef.current) {
            const key = aiInputRef.current.value;
            setGeminiKeyError(null);
            // Validate Gemini key with a test request
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
                        team.players.map((p: Player) => `- ${p.name} (${p.role})`).join('\n')
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
            const summary = data.candidates?.[0]?.content?.parts?.[0]?.text ||
                'No summary generated.';
            setAISummaries(prev => ({ ...prev, [setupIndex]: summary }));
        } catch {
            setAISummaries(prev => ({
                ...prev,
                [setupIndex]: applyWarrenTone('Error generating summary.'),
            }));
        }
    };

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
                {/* Notifications */}
                {notifications.length > 0 && (
                    <div className="fixed bottom-24 right-4 flex flex-col items-end space-y-2 z-50">
                        {notifications.map(n => (
                            <Notification key={n.id} message={n.message} onClose={() => removeNotification(n.id)} />
                        ))}
                    </div>
                )}

                {/* Title Section */}
                <div className="text-center space-y-3 mb-6 mt-4">
                    <p className="text-gray-200 text-lg sm:text-xl">
                        Pick your 5-a-side football teams<br />
                        <span className="text-yellow-300 text-base sm:text-lg font-semibold block mt-2">
                            Tip: Click one player, then another to swap their positions on the pitch!
                        </span>
                    </p>

                </div>

                <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Inputs Section */}
                    <div className="space-y-6">
                        <div className="bg-green-700 dark:bg-green-800 p-4 shadow-lg text-white rounded-lg">
                            <div className="mb-4">
                                <h2 className="text-xl font-semibold mb-2 text-white">Enter Players</h2>
                                <p className="text-sm text-green-100 mt-1">
                                    Format: One player per line. Use tags to assign roles and ensure equal distribution.<br />
                                    <span className="font-bold">#g</span> = Goalkeeper, <span className="font-bold">#s</span> = Striker, <span className="font-bold">#d</span> = Defender, <span className="font-bold">#1</span> = Team 1, <span className="font-bold">#2</span> = Team 2.<br />


                                </p>

                                <div className="relative">
                                    <Textarea
                                        value={playersText}
                                        onChange={(e) => setPlayersText(e.target.value)}
                                        placeholder="Enter one player per line. Add optional tags:
John  #g
Henry
David #s
Mark #d
Tom
Billy #g"
                                        className="p-3 border border-green-300 rounded w-full h-40 font-mono bg-green-600 dark:bg-green-700 text-white placeholder-green-200"
                                    />
                                    {playersText && (
                                        <Button
                                            onClick={() => setPlayersText('')}
                                            variant="secondary"
                                            size="sm"
                                            className="absolute top-2 right-2 text-xs px-2 py-1"
                                        >
                                            Clear
                                        </Button>
                                    )}
                                </div>
                                <div className="flex justify-between items-center mb-2">
                                    <p className={`text-sm font-bold ${playersText.split('\n').filter(line => line.trim()).length < MIN_PLAYERS ? 'text-red-500' : 'text-green-200'}`}>
                                        Players: {playersText.split('\n').filter(line => line.trim()).length} / {MAX_PLAYERS}
                                    </p>

                                    <p className={`text-sm font-bold ${playersText.split('\n').filter(line => line.includes('#g')).length < 2 ? 'text-orange-500' : 'text-green-200'}`}>
                                        Goalkeepers: {playersText.split('\n').filter(line => line.includes('#g')).length}/2
                                    </p>
                                </div>

                                <div className="flex gap-4 mt-4">
                                    <Button
                                        onClick={generateTeams}
                                        className="bg-white dark:bg-gray-700 dark:text-green-100 text-green-800 py-2 px-6 rounded font-bold shadow-md transition flex-grow hover:bg-green-100 dark:hover:bg-gray-600"
                                    >
                                        Create Team
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            for (let i = 0; i < 3; i++) {
                                                generateTeams();
                                            }
                                        }}
                                        className="bg-blue-700 dark:bg-blue-600 text-white py-2 px-6 rounded font-bold shadow-md transition flex-grow hover:bg-blue-800 dark:hover:bg-blue-700"
                                    >
                                        Create x3 Teams
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            setTeamSetups([]);
                                            setErrorMessage('');
                                            setPlayerNumbers({});
                                            addNotification(applyWarrenTone(`All teams cleared`));
                                        }}
                                        className="bg-green-900 dark:bg-green-950 text-white py-2 px-4 rounded font-bold shadow-md transition border border-white hover:bg-green-800 dark:hover:bg-green-900"
                                    >
                                        Reset
                                    </Button>
                                </div>
                                {errorMessage && (
                                    <div className="mt-3 bg-red-700 border border-red-500 text-white px-4 py-2 rounded">
                                        {errorMessage}
                                    </div>
                                )}

                                {/* Conditional Info Box */}
                                {teamSetups.length > 0 && showNoGoalkeeperInfo && (
                                    <div className="bg-yellow-600 text-white p-4 rounded-lg shadow-md mb-4 mt-4">
                                        <p>
                                            Teams were created without goalkeepers. To lock goalkeepers, add <span className="font-bold">#g</span> after their name in the player list.
                                        </p>
                                    </div>
                                )}

                            </div>
                        </div>
                    </div>









                    {/* Results Section */}
                    <div className="space-y-6">
                        {teamSetups.length === 0 ? (
                            <div className="bg-green-700 dark:bg-green-800 p-4 shadow-lg text-white rounded-lg">
                                <div className="text-center mt-4">
                                    <p className="text-white-400 text-sm sm:text-base font-bold">
                                        No teams generated yet. Enter players and click "Generate Teams" to get started!
                                    </p>
                                </div>
                                <div className="relative w-full aspect-video bg-green-600 border-2 border-white rounded-lg shadow-lg overflow-hidden">
                                    <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white"></div>
                                    <div className="absolute top-1/2 left-1/2 w-16 h-16 sm:w-24 sm:h-24 rounded-full border-2 border-white transform -translate-x-1/2 -translate-y-1/2"></div>
                                    <div className="absolute top-1/2 left-0 w-1 h-12 sm:w-2 sm:h-16 bg-white transform -translate-y-1/2"></div>
                                    <div className="absolute top-1/2 right-0 w-1 h-12 sm:w-2 sm:h-16 bg-white transform -translate-y-1/2"></div>
                                    <div className="absolute top-1/2 left-0 w-8 h-24 sm:w-12 sm:h-32 border-2 border-white border-l-0 transform -translate-y-1/2"></div>
                                    <div className="absolute top-1/2 right-0 w-8 h-24 sm:w-12 sm:h-32 border-2 border-white border-r-0 transform -translate-y-1/2"></div>
                                    {renderPlaceholderPlayers()}
                                </div>

                            </div>
                        ) : (
                            <AnimatePresence>
                                {teamSetups.map((setup, setupIndex) => (
                                    <motion.div
                                        key={setupIndex}
                                        id={`team-setup-${setupIndex}`} // Add ID for export
                                        initial={{ opacity: 0, y: -20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 20 }}
                                        transition={{ duration: 0.3 }}
                                        className="bg-green-700 dark:bg-green-800 p-4 shadow-lg text-white rounded-lg"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            {teamSetups.length > 1 && (
                                                <h2 className="text-xl font-bold text-white">
                                                    Option {setupIndex + 1}
                                                </h2>
                                            )}
                                            {teamSetups.length <= 1 && (
                                                <h2 className="text-xl font-bold text-white">
                                                </h2>
                                            )}
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => deleteTeamSetup(setupIndex)}
                                                    className="bg-red-700 hover:bg-red-800 text-white delete-button" // Add class for hiding
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>

                                        {setup.teams.length > 0 && setup.teams.length <= 2 && (
                                            <>
                                                <div className="flex justify-center mb-2 gap-8">
                                                    {setup.teams.map((team: Team, teamIndex: number) => (
                                                        <div
                                                            key={`team-name-${teamIndex}`}
                                                            className="relative text-white px-4 py-1 rounded shadow-md font-bold flex-grow text-center"
                                                            style={{
                                                                width: '50%',
                                                                backgroundColor: '#2f4f2f',
                                                            }}
                                                        >
                                                            {team.name}
                                                            <div className="absolute top-1/2 right-2 transform -translate-y-1/2 flex items-center gap-2">
                                                                <label
                                                                    htmlFor={`color-picker-${setupIndex}-${teamIndex}`}
                                                                    className="cursor-pointer"
                                                                >
                                                                    <div
                                                                        className="w-5 h-5 rounded-full border border-white color-circle"
                                                                        style={{ backgroundColor: team.color }}
                                                                    ></div>
                                                                </label>
                                                                <input
                                                                    id={`color-picker-${setupIndex}-${teamIndex}`}
                                                                    type="color"
                                                                    value={team.color}
                                                                    onChange={(e) =>
                                                                        handleColorChange(setupIndex, teamIndex, e.target.value)
                                                                    }
                                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer color-picker"
                                                                />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="w-full aspect-video relative bg-green-600 border-2 border-white rounded-lg shadow-lg overflow-hidden sm:aspect-video sm:w-full sm:h-auto">
                                                    {/* Football pitch lines */}
                                                    <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white"></div>
                                                    <div className="absolute top-1/2 left-1/2 w-16 h-16 sm:w-24 sm:h-24 rounded-full border-2 border-white transform -translate-x-1/2 -translate-y-1/2"></div>
                                                    <div className="absolute top-1/2 left-0 w-1 h-12 sm:w-2 sm:h-16 bg-white transform -translate-y-1/2"></div>
                                                    <div className="absolute top-1/2 right-0 w-1 h-12 sm:w-2 sm:h-16 bg-white transform -translate-y-1/2"></div>
                                                    <div className="absolute top-1/2 left-0 w-8 h-24 sm:w-12 sm:h-32 border-2 border-white border-l-0 transform -translate-y-1/2"></div>
                                                    <div className="absolute top-1/2 right-0 w-8 h-24 sm:w-12 sm:h-32 border-2 border-white border-r-0 transform -translate-y-1/2"></div>

                                                    {/* Team 1 players */}
                                                      {getPositionsForTeam(setup.teams[0], true, setup.teams[0].players.length).map((position: PositionedPlayer) => (
                                                        <div
                                                            key={getPlayerId(setupIndex, position.player)}
                                                            className="absolute"
                                                            style={{ top: position.top, left: position.left, transform: 'translate(-50%, -50%)' }}
                                                        >
                                                            <motion.div
                                                                layoutId={getPlayerId(setupIndex, position.player)}
                                                                layout
                                                                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                                                onClick={() => handlePlayerClick(setupIndex, 0, position.playerIndex)}
                                                                className={`w-8 h-8 sm:w-12 sm:h-12 flex items-center justify-center
                                                                    ${selectedPlayer &&
                                                                        selectedPlayer.setupIndex === setupIndex &&
                                                                        selectedPlayer.teamIndex === 0 &&
                                                                        selectedPlayer.playerIndex === position.playerIndex
                                                                        ? 'ring-2 ring-yellow-400 rounded-full'
                                                                        : selectedPlayer && selectedPlayer.setupIndex === setupIndex
                                                                            ? 'ring-2 ring-blue-400 ring-offset-2 rounded-full cursor-pointer'
                                                                            : ''
                                                                    }`}
                                                            >
                                                                <PlayerIcon
                                                                    color={setup.teams[0].color}
                                                                    number={position.player.shirtNumber}
                                                                    name={position.player.name}
                                                                    isGoalkeeper={position.player.isGoalkeeper}
                                                                />
                                                            </motion.div>
                                                        </div>
                                                    ))}

                                                    {/* Team 2 players */}
                                                      {getPositionsForTeam(setup.teams[1], false, setup.teams[1].players.length).map((position: PositionedPlayer) => (
                                                        <div
                                                            key={getPlayerId(setupIndex, position.player)}
                                                            className="absolute"
                                                            style={{ top: position.top, left: position.left, transform: 'translate(-50%, -50%)' }}
                                                        >
                                                            <motion.div
                                                                layoutId={getPlayerId(setupIndex, position.player)}
                                                                layout
                                                                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                                                onClick={() => handlePlayerClick(setupIndex, 1, position.playerIndex)}
                                                                className={`w-8 h-8 sm:w-12 sm:h-12 flex items-center justify-center
                                                                    ${selectedPlayer &&
                                                                        selectedPlayer.setupIndex === setupIndex &&
                                                                        selectedPlayer.teamIndex === 1 &&
                                                                        selectedPlayer.playerIndex === position.playerIndex
                                                                        ? 'ring-2 ring-yellow-400 rounded-full'
                                                                        : selectedPlayer && selectedPlayer.setupIndex === setupIndex
                                                                            ? 'ring-2 ring-blue-400 ring-offset-2 rounded-full cursor-pointer'
                                                                            : ''
                                                                    }`}
                                                            >
                                                                <PlayerIcon
                                                                    color={setup.teams[1].color}
                                                                    number={position.player.shirtNumber}
                                                                    name={position.player.name}
                                                                    isGoalkeeper={position.player.isGoalkeeper}
                                                                />
                                                            </motion.div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </>
                                        )}

                                        {setup.teams.length > 2 && (
                                            <div className="mt-4">
                                                <div className="flex justify-center mb-2 gap-8">
                                                    {setup.teams.map((team: Team, index: number) => (
                                                        <div
                                                            key={`team-name-${index}`}
                                                            className={`text-white px-4 py-1 rounded shadow-md font-bold flex-grow text-center`}
                                                            style={{ width: '50%' }}
                                                        >
                                                            {team.name}
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    {setup.teams.map((team: Team, teamIndex: number) => (
                                                        <div key={teamIndex} className="bg-green-700 border border-white rounded-lg overflow-hidden shadow-lg">
                                                            <div className={`bg-${teamIndex % 2 === 0 ? 'blue-600' : 'red-600'} p-2 text-center text-white border-b border-white`}>
                                                                <h3 className="text-lg font-bold">{team.name}</h3>
                                                            </div>
                                                            <div className="p-2">
                                                                <ul className="space-y-1">
                                                                    {team.players.map((player: Player, playerIndex: number) => (
                                                                        <li
                                                                            key={getPlayerId(setupIndex, player)}
                                                                            onClick={() => handlePlayerClick(setupIndex, teamIndex, playerIndex)}
                                                                            className={`py-1 px-2 rounded-lg bg-green-600 text-white border border-green-500 cursor-pointer ${selectedPlayer &&
                                                                                selectedPlayer.setupIndex === setupIndex &&
                                                                                selectedPlayer.teamIndex === teamIndex &&
                                                                                selectedPlayer.playerIndex === playerIndex
                                                                                    ? 'ring-2 ring-yellow-400'
                                                                                    : selectedPlayer && selectedPlayer.setupIndex === setupIndex
                                                                                        ? 'ring-2 ring-blue-400'
                                                                                        : ''
                                                                            }`}
                                                                        >
                                                                            {player.shirtNumber}. {player.name}{' '}
                                                                            {player.isGoalkeeper && (
                                                                                <span className="bg-yellow-400 text-green-900 text-xs px-2 py-1 rounded ml-2 font-bold">
                                                                                    GK
                                                                                </span>
                                                                            )}
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {geminiKey && (
                                            <div className="flex justify-end mt-2">
                                                {!aiSummaries[setupIndex] && (
                                                    <Button
                                                        onClick={() => handleGenerateSummary(setupIndex)}
                                                        className="bg-yellow-400 text-green-900 font-bold px-3 py-1 rounded shadow flex items-center gap-2 generate-ai-summary"
                                                        disabled={aiSummaries[setupIndex] === 'Loading...'}
                                                    >
                                                        {aiSummaries[setupIndex] === 'Loading...' ? 'Generating...' : 'Generate AI Match Summary'}
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                        {aiSummaries[setupIndex] && (
                                            <div className="backdrop-blur bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/30 rounded p-4 mt-2 text-white prose prose-sm max-w-none">
                                                <ReactMarkdown>{aiSummaries[setupIndex]}</ReactMarkdown>
                                            </div>
                                        )}
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        )}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <Footer />
            <FloatingFooter
                visible={teamSetups.length > 0}
                onExport={exportAllImages}
                onShare={shareAllImages}
                teamCount={teamSetups.length}
            />
        </div>
    );
};

export default FootballTeamPicker;
