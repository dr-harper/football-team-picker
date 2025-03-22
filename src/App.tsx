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
    const [places, setPlaces] = useState<string[]>(teamPlaces.Hampshire); // Default to Hampshire places
    const [notification, setNotification] = useState<string | null>(null); // State for notification message
    const [showNoGoalkeeperInfo, setShowNoGoalkeeperInfo] = useState(false); // State to track if the info box should be shown
    const [isLoadingLocation, setIsLoadingLocation] = useState(false); // New state for loading animation

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
            const isGoalkeeper = tags.some(tag => tag.toLowerCase() === 'gk');
            const isStriker = tags.some(tag => tag.toLowerCase() === 'striker');
            const isDefender = tags.some(tag => tag.toLowerCase() === 'defender');

            return {
                name,
                isGoalkeeper,
                isStriker,
                isDefender,
                role: isGoalkeeper ? 'goalkeeper' : (isStriker ? 'striker' : (isDefender ? 'defender' : 'outfield')),
                shirtNumber: null,
            };
        });

        const goalkeepers = players.filter(player => player.isGoalkeeper);
        const strikers = players.filter(player => player.isStriker);
        const defenders = players.filter(player => player.isDefender);
        const outfieldPlayers = players.filter(player => !player.isGoalkeeper && !player.isStriker && !player.isDefender);

        const numTeams = Math.floor(players.length / 5);
        if (goalkeepers.length < numTeams) {
            setErrorMessage(`You need at least ${numTeams} goalkeepers`);
        }

        if (players.length > 14) {
            setErrorMessage('You can only have a maximum of 14 players');
            return;
        }

        const shuffledGoalkeepers = [...goalkeepers].sort(() => Math.random() - 0.5);
        const shuffledStrikers = [...strikers].sort(() => Math.random() - 0.5);
        const shuffledDefenders = [...defenders].sort(() => Math.random() - 0.5);
        const shuffledOutfield = [...outfieldPlayers].sort(() => Math.random() - 0.5);

        const generatedTeams = [];
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
        shuffledStrikers.forEach(player => {
            generatedTeams[teamIndex].players.push(player);
            teamIndex = (teamIndex + 1) % numTeams;
        });

        shuffledDefenders.forEach(player => {
            generatedTeams[teamIndex].players.push(player);
            teamIndex = (teamIndex + 1) % numTeams;
        });

        shuffledOutfield.forEach(player => {
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

    const resetAll = () => {
        setPlayersText('');
        setTeamSetups([]);
        setErrorMessage('');
        setPlayerNumbers({});
    };

    const getPositionsForTeam = (team: any, isLeftSide: boolean, totalPlayers: number) => {
        let positions: { top: string; left: string }[] = [];

        if (totalPlayers === 5) {
            positions = [
                { top: '50%', left: isLeftSide ? '10%' : '90%' }, // Goalkeeper
                { top: '30%', left: isLeftSide ? '25%' : '75%' }, // Defender 1
                { top: '70%', left: isLeftSide ? '25%' : '75%' }, // Defender 2
                { top: '30%', left: isLeftSide ? '40%' : '60%' }, // Midfielder
                { top: '70%', left: isLeftSide ? '40%' : '60%' }, // Striker
            ];
        } else if (totalPlayers === 6) {
            positions = [
                { top: '50%', left: isLeftSide ? '10%' : '90%' }, // Goalkeeper
                { top: '30%', left: isLeftSide ? '25%' : '75%' }, // Defender 1
                { top: '70%', left: isLeftSide ? '25%' : '75%' }, // Defender 2
                { top: '20%', left: isLeftSide ? '40%' : '60%' }, // Midfielder 1
                { top: '80%', left: isLeftSide ? '40%' : '60%' }, // Midfielder 2
                { top: '50%', left: isLeftSide ? '40%' : '60%' }, // Striker
            ];
        } else if (totalPlayers === 7) {
            positions = [
                { top: '50%', left: isLeftSide ? '10%' : '90%' }, // Goalkeeper
                { top: '20%', left: isLeftSide ? '25%' : '75%' }, // Defender 1
                { top: '50%', left: isLeftSide ? '25%' : '75%' }, // Defender 2
                { top: '80%', left: isLeftSide ? '25%' : '75%' }, // Defender 3
                { top: '20%', left: isLeftSide ? '42%' : '57%' }, // Striker 1
                { top: '50%', left: isLeftSide ? '42%' : '57%' }, // Striker 2
                { top: '80%', left: isLeftSide ? '42%' : '57%' }, // Striker 3
            ];
        } else if (totalPlayers === 8) {
            positions = [
                { top: '50%', left: isLeftSide ? '10%' : '90%' }, // Goalkeeper
                { top: '25%', left: isLeftSide ? '20%' : '80%' }, // Defender 1
                { top: '75%', left: isLeftSide ? '20%' : '80%' }, // Defender 2
                { top: '40%', left: isLeftSide ? '30%' : '70%' }, // Midfielder 1
                { top: '60%', left: isLeftSide ? '30%' : '70%' }, // Midfielder 2
                { top: '20%', left: isLeftSide ? '45%' : '55%' }, // Midfielder 3
                { top: '80%', left: isLeftSide ? '45%' : '55%' }, // Midfielder 4
                { top: '50%', left: isLeftSide ? '50%' : '50%' }, // Striker
            ];
        }

        const goalkeeper = team.players.find((p: any) => p.isGoalkeeper);

        // Determine the index offset based on whether there is a goalkeeper
        const index_offset = goalkeeper ? 1 : 0;

        const result: any = [];

        if (goalkeeper) {
            result.push({
                ...positions[0],
                player: goalkeeper,
            });
        }

        const outfieldPlayers = team.players.filter((p: any) => !p.isGoalkeeper);
        outfieldPlayers.forEach((player, index) => {
            if (index < positions.length - index_offset) {
                result.push({
                    ...positions[index + index_offset],
                    player,
                });
            }
        });
        return result;
    };

    const deleteTeamSetup = (indexToDelete: number) => {
        setTeamSetups(prevSetups => prevSetups.filter((_, index) => index !== indexToDelete));
    };

    const exportAllImages = async () => {
        const elements = teamSetups.map((_, index) => document.getElementById(`team-setup-${index}`));
        if (elements.some(element => !element)) return;

        // Temporarily hide delete buttons
        elements.forEach(element => {
            const deleteButtons = element?.querySelectorAll('.delete-button');
            deleteButtons?.forEach(button => (button.style.display = 'none'));
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
            canvas.height = totalHeight;

            let yOffset = 0;
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
            // Restore delete buttons
            elements.forEach(element => {
                const deleteButtons = element?.querySelectorAll('.delete-button');
                deleteButtons?.forEach(button => (button.style.display = ''));
            });
        }
    };

    const renderPlaceholderPlayers = () => {
        const placeholderPositionsLeft = [
            { top: '53%', left: '10%' }, // Goalkeeper
            { top: '30%', left: '25%' }, // Defender 1
            { top: '78%', left: '25%' }, // Defender 2
            { top: '40%', left: '40%' }, // Midfielder
            { top: '70%', left: '40%' }, // Striker
        ];

        const placeholderPositionsRight = [
            { top: '53%', left: '90%' }, // Goalkeeper
            { top: '30%', left: '75%' }, // Defender 1
            { top: '78%', left: '75%' }, // Defender 2
            { top: '40%', left: '60%' }, // Midfielder
            { top: '70%', left: '60%' }, // Striker
        ];

        return (
            <>
                {placeholderPositionsLeft.map((position, index) => (
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
                {placeholderPositionsRight.map((position, index) => (
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
                    <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight drop-shadow-lg">
                        Team Shuffle
                    </h1>
                    <p className="text-gray-200 text-lg sm:text-xl">
                        Pick your 5-a-side football teams
                    </p>
                    <div className="mt-4 flex justify-center items-center gap-4">
                        <div>
                            <label htmlFor="location-select" className="text-white font-semibold mr-2">
                                Team Names:
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
                                    Format: One player per line. Tags: #gk, #striker, #defender can be used to assign roles and ensure equal distribution.
                                </p>

                                <Textarea
                                    value={playersText}
                                    onChange={(e) => setPlayersText(e.target.value)}
                                    placeholder="Enter one player per line. Add tags: #gk, #striker, #defender, e.g.:
John Smith #gk
David Jones #striker
Mark Wilson #defender"
                                    className="p-3 border border-green-300 rounded w-full h-40 font-mono bg-green-600 text-white placeholder-green-200"
                                />
                                <div className="flex justify-between items-center mb-2">
                                    <p className={`text-sm font-bold ${playersText.split('\n').filter(line => line.trim()).length < 10 ? 'text-red-500' : 'text-green-200'}`}>
                                        Players: {playersText.split('\n').filter(line => line.trim()).length} / 16
                                    </p>

                                    <p className={`text-sm font-bold ${playersText.split('\n').filter(line => line.includes('#gk')).length < 2 ? 'text-orange-500' : 'text-green-200'}`}>
                                        Goalkeepers: {playersText.split('\n').filter(line => line.includes('#gk')).length}/2
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
                                            <h2 className="text-xl font-bold text-white">Option {setupIndex + 1}</h2>
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
                                                    {setup.teams.map((team: any, index: number) => (
                                                        <div
                                                            key={`team-name-${index}`}
                                                            className={`text-white px-4 py-1 rounded shadow-md font-bold flex-grow text-center`}
                                                            style={{ width: '50%', backgroundColor: '#2f4f2f' }}
                                                        >
                                                            {team.name}
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="w-full aspect-video relative bg-green-600 border-2 border-white rounded-lg shadow-lg overflow-hidden sm:aspect-video sm:w-full sm:h-auto">
                                                    <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white"></div>
                                                    <div className="absolute top-1/2 left-1/2 w-16 h-16 sm:w-24 sm:h-24 rounded-full border-2 border-white transform -translate-x-1/2 -translate-y-1/2"></div>
                                                    <div className="absolute top-1/2 left-0 w-1 h-12 sm:w-2 sm:h-16 bg-white transform -translate-y-1/2"></div>
                                                    <div className="absolute top-1/2 right-0 w-1 h-12 sm:w-2 sm:h-16 bg-white transform -translate-y-1/2"></div>
                                                    <div className="absolute top-1/2 left-0 w-8 h-24 sm:w-12 sm:h-32 border-2 border-white border-l-0 transform -translate-y-1/2"></div>
                                                    <div className="absolute top-1/2 right-0 w-8 h-24 sm:w-12 sm:h-32 border-2 border-white border-r-0 transform -translate-y-1/2"></div>

                                                    {getPositionsForTeam(setup.teams[0], true, setup.teams[0].players.length).map((position: any, index: number) => (
                                                        <div
                                                            key={`team1-${index}`}
                                                            className="absolute w-8 h-8 sm:w-12 sm:h-12 transform -translate-x-1/2 -translate-y-1/2"
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

                                                    {getPositionsForTeam(setup.teams[1], false, setup.teams[1].players.length).map((position: any, index: number) => (
                                                        <div
                                                            key={`team2-${index}`}
                                                            className="absolute w-8 h-8 sm:w-12 sm:h-12 transform -translate-x-1/2 -translate-y-1/2"
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
                                                                        <li key={playerIndex} className="py-1 px-2 rounded-lg bg-green-600 text-white border border-green-500">
                                                                            {player.shirtNumber}. {player.name} {player.isGoalkeeper && <span className="bg-yellow-400 text-green-900 text-xs px-2 py-1 rounded ml-2 font-bold">GK</span>}
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