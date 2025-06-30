import React, { useState, useEffect } from 'react';
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
import { teamPlaces } from './constants/teamConstants';
import { positionsByTeamSizeAndSide, placeholderPositions } from './constants/positionsConstants';

const FootballTeamPicker = () => {
    const [playersText, setPlayersText] = useState(() => {
        return localStorage.getItem('playersText') || '';
    });
    const [teamSetups, setTeamSetups] = useState<any[]>([]);
    const [errorMessage, setErrorMessage] = useState('');
    const [playerNumbers, setPlayerNumbers] = useState<{ [playerName: string]: number }>({});
    const [selectedLocation, setSelectedLocation] = useState(() => {
        return localStorage.getItem('selectedLocation') || 'Generic'; // Load from localStorage or default to Hampshire
    });
    const [places, setPlaces] = useState<string[]>(teamPlaces.Generic); // Default to Hampshire places
    const [notification, setNotification] = useState<string | null>(null); // State for notification message
    const [showNoGoalkeeperInfo, setShowNoGoalkeeperInfo] = useState(false); // State to track if the info box should be shown
    const [isLoadingLocation, setIsLoadingLocation] = useState(false); // New state for loading animation
    const [selectedPlayer, setSelectedPlayer] = useState<{
        setupIndex: number;
        teamIndex: number;
        playerIndex: number;
    } | null>(null);

    useEffect(() => {
        localStorage.setItem('playersText', playersText);
    }, [playersText]);

    useEffect(() => {
        localStorage.setItem('selectedLocation', selectedLocation); // Save selected location to localStorage
    }, [selectedLocation]);

    useEffect(() => {
        // Update places based on selected location
        setPlaces(teamPlaces[selectedLocation]?.places || teamPlaces.Generic.places);
    }, [selectedLocation]);

    const handleLocationChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedLocation(event.target.value);
    };
    const handleFindLocation = async () => {
        setIsLoadingLocation(true); // Start loading animation
        const { location, places } = await getPlacesBasedOnLocation();
        setSelectedLocation(location);
        setPlaces(places);
        setIsLoadingLocation(false); // Stop loading animation
        if (location === 'Generic') {
            setNotification("Sorry, we don't have any regional data for your location.Defaulting to Generic");
        } else {
            setNotification(`Location found: ${location}`); // Show notification
        }
    };

    const generateTeams = () => {
        if (!playersText.trim()) {
            setErrorMessage('Please enter player names');
            return;
        }

        const playerLines = playersText.split('\n').filter(line => line.trim().length > 0);

        if (playerLines.length < 10) {
            setErrorMessage('You need at least 10 players for two 5-a-side teams');
            return;
        }

        const players = playerLines.map(line => {
            const [name, ...tags] = line.split('#').map(item => item.trim());
            const isGoalkeeper = tags.some(tag => tag.toLowerCase() === 'g');
            const isStriker = tags.some(tag => tag.toLowerCase() === 's');
            const isDefender = tags.some(tag => tag.toLowerCase() === 'd');
            const isteam1 = tags.some(tag => tag.toLowerCase() === 't1');
            const isteam2 = tags.some(tag => tag.toLowerCase() === 't2');

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

        const numTeams = Math.floor(players.length / 5);
        if (goalkeepers.length < numTeams) {
            setErrorMessage(`You need at least ${numTeams} goalkeepers`);
        }

        if (players.length > 14) {
            setErrorMessage('You can only have a maximum of 16 players');
            return;
        }

        const shuffledGoalkeepers = [...goalkeepers].sort(() => Math.random() - 0.5);
        const shuffledStrikers = [...strikers].sort(() => Math.random() - 0.5);
        const shuffledDefenders = [...defenders].sort(() => Math.random() - 0.5);
        const shuffledOutfield = [...outfieldPlayers].sort(() => Math.random() - 0.5);


        const selectedTeam1 = players.filter(player => player.isteam1);
        const selectedTeam2 = players.filter(player => player.isteam2);

        const generatedTeams: any[] = [];
        const existingNames = new Set<string>();
        const usedColors = new Set();

        const isSimilarColor = (color1: string, color2: string) => {
            const hexToRgb = (hex: string) => {
                const bigint = parseInt(hex.slice(1), 16);
                return {
                    r: (bigint >> 16) & 255,
                    g: (bigint >> 8) & 255,
                    b: bigint & 255,
                };
            };

            const rgbToHsl = ({ r, g, b }: { r: number; g: number; b: number }) => {
                r /= 255;
                g /= 255;
                b /= 255;
                const max = Math.max(r, g, b);
                const min = Math.min(r, g, b);
                let h = 0,
                    s = 0,
                    l = (max + min) / 2;

                if (max !== min) {
                    const d = max - min;
                    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                    switch (max) {
                        case r:
                            h = (g - b) / d + (g < b ? 6 : 0);
                            break;
                        case g:
                            h = (b - r) / d + 2;
                            break;
                        case b:
                            h = (r - g) / d + 4;
                            break;
                    }
                    h /= 6;
                }

                return { h: h * 360, s, l };
            };

            const color1Hsl = rgbToHsl(hexToRgb(color1));
            const color2Hsl = rgbToHsl(hexToRgb(color2));

            return Math.abs(color1Hsl.h - color2Hsl.h) < 60; // Consider colors similar if their hue difference is less than 30
        };

        for (let i = 0; i < numTeams; i++) {
            const teamName = generateTeamName(existingNames, places); // Use selected location's places
            existingNames.add(teamName);

            const boldColors = ['#ff0000', '#0000ff', '#00ff00', '#ff00ff', '#00ffff', '#ff4500', '#8a2be2', '#ff1493', '#1e90ff'];
            let color1;
            do {
                color1 = boldColors[Math.floor(Math.random() * boldColors.length)];
            } while ([...usedColors].some((usedColor) => isSimilarColor(usedColor, color1)));
            usedColors.add(color1);

            let color2;
            do {
                color2 = boldColors[Math.floor(Math.random() * boldColors.length)];
            } while (
                color1 === color2 ||
                [...usedColors].some((usedColor) => isSimilarColor(usedColor, color2)) ||
                isSimilarColor(color1, color2)
            );
            usedColors.add(color2);

            const team = {
                name: teamName,
                players: [shuffledGoalkeepers[i]],
                color: i % 2 === 0 ? color1 : color2,
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
            teamIndex = (teamIndex + 1) % numTeams;
        });

        shuffledOutfield.forEach(player => {
            generatedTeams[teamIndex].players.push(player);
            teamIndex = (teamIndex + 1) % numTeams;
        });

        shuffledStrikers.forEach(player => {
            generatedTeams[teamIndex].players.push(player);
            teamIndex = (teamIndex + 1) % numTeams;
        });

        // for generated team, check if player index 0 is empty, if so reindex the players
        generatedTeams.forEach(team => {
            if (!team.players[0]) {
                team.players = team.players.filter(player => player);
            }
        });

        const availableNumbers = Array.from({ length: 20 }, (_, i) => i + 2);
        const newPlayerNumbers: { [playerName: string]: number } = { ...playerNumbers };

        generatedTeams.forEach(team => {
            team.players.forEach(player => {
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

    const getPositionsForTeam = (team: any, isLeftSide: boolean, totalPlayers: number) => {
        const side = isLeftSide ? 'left' : 'right';
        const positions = positionsByTeamSizeAndSide[totalPlayers]?.[side] || [];

        const goalkeeper = team.players.find((p: any) => p.isGoalkeeper);

        // Determine the index offset based on whether there is a goalkeeper
        const index_offset = goalkeeper ? 1 : 0;

        const result: any = [];

        if (goalkeeper) {
            result.push({
                ...positions[0],
                player: goalkeeper,
                playerIndex: team.players.findIndex((p: any) => p === goalkeeper),
            });
        }

        const outfieldPlayers = team.players.filter((p: any) => !p.isGoalkeeper);
        outfieldPlayers.forEach((player, index) => {
            if (index < positions.length - index_offset) {
                result.push({
                    ...positions[index + index_offset],
                    player,
                    playerIndex: team.players.findIndex((p: any) => p === player),
                });
            }
        });
        return result;
    };

    const deleteTeamSetup = (indexToDelete: number) => {
        setTeamSetups(prevSetups => prevSetups.filter((_, index) => index !== indexToDelete));
    };

    const handleColorChange = (setupIndex: number, teamIndex: number, color: string) => {
        setTeamSetups(prevSetups =>
            prevSetups.map((setup, currentSetupIndex) => {
                if (currentSetupIndex === setupIndex) {
                    return {
                        ...setup,
                        teams: setup.teams.map((team, currentTeamIndex) => ({
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
        setTeamSetups(prevSetups => {
            const newSetups = [...prevSetups];
            const playerA =
                newSetups[first.setupIndex].teams[first.teamIndex].players[first.playerIndex];
            const playerB =
                newSetups[second.setupIndex].teams[second.teamIndex].players[second.playerIndex];
            newSetups[first.setupIndex].teams[first.teamIndex].players[first.playerIndex] =
                playerB;
            newSetups[second.setupIndex].teams[second.teamIndex].players[second.playerIndex] =
                playerA;
            return newSetups;
        });
    };

    const handlePlayerClick = (
        setupIndex: number,
        teamIndex: number,
        playerIndex: number
    ) => {
        const clicked = { setupIndex, teamIndex, playerIndex };
        if (!selectedPlayer) {
            setSelectedPlayer(clicked);
        } else {
            if (
                selectedPlayer.setupIndex === setupIndex &&
                selectedPlayer.teamIndex === teamIndex &&
                selectedPlayer.playerIndex === playerIndex
            ) {
                setSelectedPlayer(null);
            } else {
                swapPlayers(selectedPlayer, clicked);
                setSelectedPlayer(null);
            }
        }
    };

    const exportAllImages = async () => {
        const elements = teamSetups.map((_, index) => document.getElementById(`team-setup-${index}`));
        if (elements.some(element => !element)) return;

        // Temporarily hide delete buttons, color pickers, and color circles
        elements.forEach(element => {
            const deleteButtons = element?.querySelectorAll('.delete-button');
            const colorPickers = element?.querySelectorAll('.color-picker');
            const colorCircles = element?.querySelectorAll('.color-circle');
            deleteButtons?.forEach(button => (button.style.display = 'none'));
            colorPickers?.forEach(picker => (picker.style.display = 'none'));
            colorCircles?.forEach(circle => (circle.style.display = 'none'));
        });

        try {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            if (!context) return;

            const scale = 2; // Increase the scale for higher resolution
            const images = await Promise.all(
                elements.map(async (element) => {
                    if (!element) return null;
                    const dataUrl = await toPng(element, {
                        backgroundColor: '#146434', // Set background color to match the app's background
                        width: element.offsetWidth * scale, // Scale the width
                        height: element.offsetHeight * scale, // Scale the height
                        style: {
                            transform: `scale(${scale})`,
                            transformOrigin: 'top left',
                        },
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
            canvas.height = totalHeight + 100; // Add space for the text overlay

            // Draw the text overlay
            context.fillStyle = 'white';
            context.font = 'bold 48px Arial';
            context.textAlign = 'center';
            context.fillText('Made with teamshuffle.app', canvas.width / 2, canvas.height - 30);

            let yOffset = 0; // Start drawing images below the text overlay
            images.forEach(img => {
                if (img) {
                    context.drawImage(img, 0, yOffset, img.width, img.height);
                    yOffset += img.height;
                }
            });

            const finalDataUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = finalDataUrl;
            const currentDate = new Date().toISOString().split('T')[0].replace(/-/g, '_');

            link.download = `Football_teams_${currentDate}.png`;
            link.click();
        } catch (error) {
            console.error('Failed to export images:', error);
        } finally {
            // Restore delete buttons, color pickers, and color circles
            elements.forEach(element => {
                const deleteButtons = element?.querySelectorAll('.delete-button');
                const colorPickers = element?.querySelectorAll('.color-picker');
                const colorCircles = element?.querySelectorAll('.color-circle');
                deleteButtons?.forEach(button => (button.style.display = ''));
                colorPickers?.forEach(picker => (picker.style.display = ''));
                colorCircles?.forEach(circle => (circle.style.display = ''));
            });
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


    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-green-900 via-green-800 to-green-700">
            <div className="flex-grow p-4 sm:p-6">
                {/* Notification */}
                {notification && (
                    <Notification message={notification} onClose={() => setNotification(null)} />
                )}

                {/* Title Section */}
                <div className="text-center space-y-3 mb-6">
                    <div className="flex justify-center items-center gap-3">
                        <img
                            src="/logo.png" // Path to the logo in the public folder
                            alt="Team Shuffle Logo"
                            className="w-12 h-12 sm:w-16 sm:h-16"
                        />
                        <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight drop-shadow-lg">
                            Team Shuffle
                        </h1>
                    </div>
                    <p className="text-gray-200 text-lg sm:text-xl">
                        Pick your 5-a-side football teams
                    </p>
                    <div className="mt-4 flex justify-center items-center gap-4">
                        <div>
                            <label htmlFor="location-select" className="text-white font-semibold mr-2">
                                Locale:
                            </label>
                            <select
                                id="location-select"
                                value={selectedLocation}
                                onChange={handleLocationChange}
                                className="p-2 rounded bg-green-700 text-white border border-green-500"
                            >
                                {Object.entries(teamPlaces).map(([key, value]) => (
                                    <option key={key} value={key}>
                                        {key}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <Button
                            onClick={handleFindLocation}
                            className="bg-blue-700 text-white py-2 px-4 rounded font-bold shadow-md hover:bg-blue-800 flex items-center gap-2"
                            disabled={isLoadingLocation} // Disable button while loading
                        >
                            {isLoadingLocation ? (
                                <svg
                                    className="animate-spin h-5 w-5 text-white"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                    ></circle>
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                                    ></path>
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
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M12 2c3.866 0 7 3.134 7 7 0 5.25-7 13-7 13s-7-7.75-7-13c0-3.866 3.134-7 7-7z"
                                        />
                                        <circle cx="12" cy="9" r="2.25" />
                                    </svg>
                                    Find Location
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Inputs Section */}
                    <div className="space-y-6">
                        <div className="bg-green-700 p-4 shadow-lg text-white rounded-lg">
                            <div className="mb-4">
                                <h2 className="text-xl font-semibold mb-2 text-white">Enter Players</h2>
                                <p className="text-sm text-green-100 mt-1">
                                    Format: One player per line. Use tags to assign roles and ensure equal distribution.<br />
                                    <span className="font-bold">#g</span> = Goalkeeper, <span className="font-bold">#s</span> = Striker, <span className="font-bold">#d</span> = Defender, <span className="font-bold">#1</span> = Team 1, <span className="font-bold">#2</span> = Team 2.<br />


                                </p>

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
                                    className="p-3 border border-green-300 rounded w-full h-40 font-mono bg-green-600 text-white placeholder-green-200"
                                />
                                <div className="flex justify-between items-center mb-2">
                                    <p className={`text-sm font-bold ${playersText.split('\n').filter(line => line.trim()).length < 10 ? 'text-red-500' : 'text-green-200'}`}>
                                        Players: {playersText.split('\n').filter(line => line.trim()).length} / 16
                                    </p>

                                    <p className={`text-sm font-bold ${playersText.split('\n').filter(line => line.includes('#g')).length < 2 ? 'text-orange-500' : 'text-green-200'}`}>
                                        Goalkeepers: {playersText.split('\n').filter(line => line.includes('#g')).length}/2
                                    </p>
                                </div>

                                <div className="flex gap-4 mt-4">
                                    <Button
                                        onClick={generateTeams}
                                        className="bg-white text-green-800 py-2 px-6 rounded font-bold shadow-md transition flex-grow hover:bg-green-100"
                                    >
                                        Create Team
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            for (let i = 0; i < 3; i++) {
                                                generateTeams();
                                            }
                                        }}
                                        className="bg-blue-700 text-white py-2 px-6 rounded font-bold shadow-md transition flex-grow hover:bg-blue-800"
                                    >
                                        Create x3 Teams
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            setTeamSetups([]);
                                            setErrorMessage('');
                                            setPlayerNumbers({});
                                            setNotification(`All teams cleared`);
                                        }}
                                        className="bg-green-900 text-white py-2 px-4 rounded font-bold shadow-md transition border border-white hover:bg-green-800"
                                    >
                                        Reset
                                    </Button>
                                </div>
                                <div className="text-sm font-bold text-green-200">
                                    Teams Generated: {teamSetups.length}
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
                                            Teams were created without goalkeepers. To lock goalkeepers, add <span className="font-bold">#gk</span> after their name in the player list.
                                        </p>
                                    </div>
                                )}

                                {/* Export Button */}
                                {teamSetups.length > 0 && (
                                    <div className="text-center my-4 w-full">
                                        <Button
                                            onClick={exportAllImages}
                                            className="bg-blue-700 text-white py-2 px-6 rounded font-bold shadow-md hover:bg-blue-800 flex items-center gap-2 w-full"
                                        >
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                strokeWidth={1.5}
                                                stroke="currentColor"
                                                className="w-5 h-5"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    d="M7.5 12l4.5 4.5m0 0l4.5-4.5m-4.5 4.5V3"
                                                />
                                            </svg>
                                            Download Teams as Image
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>









                    {/* Results Section */}
                    <div className="space-y-6">
                        {teamSetups.length === 0 ? (
                            <div className="bg-green-700 p-4 shadow-lg text-white rounded-lg">
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
                                        className="bg-green-700 p-4 shadow-lg text-white rounded-lg"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            {teamSetups.length > 1 && (
                                                <h2 className="text-xl font-bold text-white">
                                                    Option {setupIndex + 1}
                                                </h2>
                                            )}
                                            {teamSetups.length <= 1 && (
                                                <h2 className="text-xl font-bold text-white">
                                                    Selected Option
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
                                                    {setup.teams.map((team: any, teamIndex: number) => (
                                                        <div
                                                            key={`team-name-${teamIndex}`}
                                                            className="relative text-white px-4 py-1 rounded shadow-md font-bold flex-grow text-center"
                                                            style={{
                                                                width: '50%',
                                                                backgroundColor: '#2f4f2f',
                                                            }}
                                                        >
                                                            {team.name}
                                                            <div className="absolute top-1/2 right-2 transform -translate-y-1/2">
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
                                                    {getPositionsForTeam(setup.teams[0], true, setup.teams[0].players.length).map((position: any, index: number) => (
                                                        <div
                                                            key={`team1-${index}`}
                                                            onClick={() => handlePlayerClick(setupIndex, 0, position.playerIndex)}
                                                            className={`absolute w-8 h-8 sm:w-12 sm:h-12 transform -translate-x-1/2 -translate-y-1/2 ${
                                                                selectedPlayer &&
                                                                selectedPlayer.setupIndex === setupIndex &&
                                                                selectedPlayer.teamIndex === 0 &&
                                                                selectedPlayer.playerIndex === position.playerIndex
                                                                    ? 'ring-2 ring-yellow-400 rounded-full'
                                                                    : ''
                                                            }`}
                                                            style={{
                                                                top: position.top,
                                                                left: position.left,
                                                            }}
                                                        >
                                                            <PlayerIcon
                                                                color={setup.teams[0].color}
                                                                number={position.player.shirtNumber}
                                                                name={position.player.name}
                                                                isGoalkeeper={position.player.isGoalkeeper}
                                                            />
                                                        </div>
                                                    ))}

                                                    {/* Team 2 players */}
                                                    {getPositionsForTeam(setup.teams[1], false, setup.teams[1].players.length).map((position: any, index: number) => (
                                                        <div
                                                            key={`team2-${index}`}
                                                            onClick={() => handlePlayerClick(setupIndex, 1, position.playerIndex)}
                                                            className={`absolute w-8 h-8 sm:w-12 sm:h-12 transform -translate-x-1/2 -translate-y-1/2 ${
                                                                selectedPlayer &&
                                                                selectedPlayer.setupIndex === setupIndex &&
                                                                selectedPlayer.teamIndex === 1 &&
                                                                selectedPlayer.playerIndex === position.playerIndex
                                                                    ? 'ring-2 ring-yellow-400 rounded-full'
                                                                    : ''
                                                            }`}
                                                            style={{
                                                                top: position.top,
                                                                left: position.left,
                                                            }}
                                                        >
                                                            <PlayerIcon
                                                                color={setup.teams[1].color}
                                                                number={position.player.shirtNumber}
                                                                name={position.player.name}
                                                                isGoalkeeper={position.player.isGoalkeeper}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </>
                                        )}

                                        {setup.teams.length > 2 && (
                                            <div className="mt-4">
                                                <div className="flex justify-center mb-2 gap-8">
                                                    {setup.teams.map((team: any, index: number) => (
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
                                                    {setup.teams.map((team: any, teamIndex: number) => (
                                                        <div key={teamIndex} className="bg-green-700 border border-white rounded-lg overflow-hidden shadow-lg">
                                                            <div className={`bg-${teamIndex % 2 === 0 ? 'blue-600' : 'red-600'} p-2 text-center text-white border-b border-white`}>
                                                                <h3 className="text-lg font-bold">{team.name}</h3>
                                                            </div>
                                                            <div className="p-2">
                                                                <ul className="space-y-1">
                                                                    {team.players.map((player: any, playerIndex: number) => (
                                                                        <li
                                                                            key={playerIndex}
                                                                            onClick={() => handlePlayerClick(setupIndex, teamIndex, playerIndex)}
                                                                            className={`py-1 px-2 rounded-lg bg-green-600 text-white border border-green-500 cursor-pointer ${
                                                                                selectedPlayer &&
                                                                                selectedPlayer.setupIndex === setupIndex &&
                                                                                selectedPlayer.teamIndex === teamIndex &&
                                                                                selectedPlayer.playerIndex === playerIndex
                                                                                    ? 'ring-2 ring-yellow-400'
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
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        )}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <Footer />
        </div>
    );
};

export default FootballTeamPicker;