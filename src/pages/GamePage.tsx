import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ArrowLeftRight, CheckCircle, XCircle, HelpCircle, Shuffle, Trophy, Users, Check, UserPlus, Star, Goal, Plus, Minus, Award, Download, Share2, ChevronRight, ChevronLeft, Pencil } from 'lucide-react';
import AppHeader from '../components/AppHeader';
import { Button } from '../components/ui/button';
import { useAuth } from '../contexts/AuthContext';
import {
    subscribeToGame,
    subscribeToGameAvailability,
    setAvailability,
    updateGameTeams,
    updateGameScore,
    updateGameStatus,
    updateGameDrafts,
    updateGameGuests,
    updateGuestAvailability,
    updatePlayerPositions,
    updateGameGoalScorers,
    updateGameAssisters,
    updateGameMotm,
    updateGameCost,
    updateGameAttendees,
    getLeague,
    getLeagueMembers,
    getGameByCode,
} from '../utils/firestore';
import { Game, PlayerAvailability, AvailabilityStatus, League, Team, TeamSetup, WeatherForecast, GoalScorer } from '../types';
import { generateTeamsFromText } from '../utils/teamGenerator';
import { useSettings } from '../contexts/SettingsContext';
import PitchRenderer from '../components/PitchRenderer';
import TeamSetupCard from '../components/TeamSetupCard';
import PlaceholderPitch from '../components/PlaceholderPitch';
import { fetchWeather, describeWeatherCode } from '../utils/weather';
import { exportImage, shareImage, ImageHeader } from '../utils/imageExport';
import LocationMap from '../components/LocationMap';

const GamePage: React.FC = () => {
    const { id: rawId } = useParams<{ id: string }>();
    const { user } = useAuth();
    const navigate = useNavigate();
    const { places } = useSettings();
    const [gameDocId, setGameDocId] = useState<string | null>(null);
    const [game, setGame] = useState<Game | null>(null);
    const [league, setLeague] = useState<League | null>(null);
    const [availability, setAvailabilityState] = useState<PlayerAvailability[]>([]);
    const [loading, setLoading] = useState(true);
    const [playersText, setPlayersText] = useState('');
    const [generatedTeams, setGeneratedTeams] = useState<Team[] | null>(null);
    const [pendingSetups, setPendingSetups] = useState<TeamSetup[]>([]);
    const [genError, setGenError] = useState('');
    const [score1, setScore1] = useState('');
    const [score2, setScore2] = useState('');
    const [selectedPlayer, setSelectedPlayer] = useState<{
        setupIndex: number;
        teamIndex: number;
        playerIndex: number;
    } | null>(null);
    const [playerNumbers, setPlayerNumbers] = useState<{ [playerName: string]: number }>({});
    const nextSetupIdRef = useRef(0);
    const [weather, setWeather] = useState<WeatherForecast | null>(null);
    const [weatherLoading, setWeatherLoading] = useState(false);
    const [leagueMembers, setLeagueMembers] = useState<{ id: string; displayName: string; email: string }[]>([]);
    const [newGuestName, setNewGuestName] = useState('');
    const [goalScorers, setGoalScorers] = useState<GoalScorer[]>([]);
    const [assisters, setAssisters] = useState<GoalScorer[]>([]);
    const [motm, setMotm] = useState('');
    const [isExporting, setIsExporting] = useState(false);
    const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
    const [attendees, setAttendees] = useState<string[] | null>(null);
    const [editingCost, setEditingCost] = useState(false);
    const [costInput, setCostInput] = useState('');
    const [showTextarea, setShowTextarea] = useState(false);
    const didSetInitialStep = useRef(false);

    // Resolve rawId: try as game code first, fall back to direct Firestore doc ID
    useEffect(() => {
        if (!rawId) return;
        getGameByCode(rawId).then(g => {
            setGameDocId(g ? g.id : rawId);
        });
    }, [rawId]);

    useEffect(() => {
        if (!gameDocId) return;
        const unsubGame = subscribeToGame(gameDocId, async (g) => {
            setGame(g);
            if (g?.leagueId) {
                const l = await getLeague(g.leagueId);
                setLeague(l);
                if (l) {
                    getLeagueMembers(l.memberIds).then(setLeagueMembers);
                }
            }
            if (g?.playersText) setPlayersText(g.playersText);
            if (g?.teams) setGeneratedTeams(g.teams);
            if (g?.draftSetups?.length) setPendingSetups(g.draftSetups);
            if (g?.score) {
                setScore1(String(g.score.team1));
                setScore2(String(g.score.team2));
            }
            if (g?.goalScorers) setGoalScorers(g.goalScorers);
            if (g?.assisters) setAssisters(g.assisters);
            if (g?.manOfTheMatch) setMotm(g.manOfTheMatch);
            if (g?.attendees !== undefined) setAttendees(g.attendees);
            setLoading(false);
        });
        const unsubAvail = subscribeToGameAvailability(gameDocId, setAvailabilityState);
        return () => { unsubGame(); unsubAvail(); };
    }, [gameDocId]);

    // Set initial wizard step once game data first arrives
    useEffect(() => {
        if (!game || didSetInitialStep.current) return;
        didSetInitialStep.current = true;
        if (game.status === 'completed') {
            setWizardStep(3);
        } else if (game.status === 'in_progress') {
            setWizardStep(game.teams?.length ? 3 : 2);
        }
        // 'scheduled' stays at step 1
    }, [game]);

    useEffect(() => {
        if (!gameDocId || loading) return;
        const t = setTimeout(() => updateGameDrafts(gameDocId, pendingSetups), 800);
        return () => clearTimeout(t);
    }, [pendingSetups, gameDocId, loading]);

    useEffect(() => {
        if (!game?.location || game.date < Date.now() - 7 * 24 * 60 * 60 * 1000) return;
        setWeatherLoading(true);
        const coords = game.locationLat !== undefined && game.locationLon !== undefined
            ? { lat: game.locationLat, lon: game.locationLon }
            : undefined;
        fetchWeather(game.location, game.date, coords)
            .then(setWeather)
            .catch(() => setWeather(null))
            .finally(() => setWeatherLoading(false));
    }, [game?.location, game?.date, game?.locationLat, game?.locationLon]);

    const myAvailability = availability.find(a => a.userId === user?.uid);
    const availablePlayers = availability.filter(a => a.status === 'available');
    const maybePlayers = availability.filter(a => a.status === 'maybe');
    const unavailablePlayers = availability.filter(a => a.status === 'unavailable');

    const handleSetAvailability = async (status: AvailabilityStatus) => {
        if (!user || !gameDocId) return;
        await setAvailability(gameDocId, user.uid, user.displayName || user.email?.split('@')[0] || 'Player', status);
    };

    const handleAdminSetAvailability = async (player: PlayerAvailability, status: AvailabilityStatus) => {
        if (!gameDocId) return;
        await setAvailability(gameDocId, player.userId, player.displayName, status);
    };

    const buildImageHeader = (): ImageHeader => {
        const { emoji } = weather ? describeWeatherCode(weather.weatherCode) : { emoji: undefined };
        return {
            leagueName: league?.name,
            gameTitle: game?.title,
            gameDate: game?.date,
            weatherEmoji: emoji,
            temperature: weather?.temperature,
            rainProbability: weather?.rainProbability,
        };
    };

    const handleShare = async (setupCount: number) => {
        setIsExporting(true);
        await shareImage(setupCount, undefined, buildImageHeader());
        setIsExporting(false);
    };

    const handleExport = async (setupCount: number) => {
        setIsExporting(true);
        await exportImage(setupCount, undefined, buildImageHeader());
        setIsExporting(false);
    };

    const addSetup = useCallback((text: string, count = 1) => {
        const newSetups: TeamSetup[] = [];
        let lastNumbers = playerNumbers;
        let hasError = false;
        for (let i = 0; i < count; i++) {
            const result = generateTeamsFromText(text, places, lastNumbers);
            if (result.error) { setGenError(result.error); hasError = true; break; }
            lastNumbers = result.playerNumbers;
            newSetups.push({ id: String(nextSetupIdRef.current++), teams: result.teams, playersInput: text });
        }
        if (!hasError) {
            setPlayerNumbers(lastNumbers);
            setPendingSetups(prev => [...prev, ...newSetups]);
            setGenError('');
        }
    }, [places, playerNumbers]);

    const generateFromAvailable = useCallback((count = 3) => {
        const statusMap = game?.guestAvailability ?? {};
        const positions = game?.playerPositions ?? {};
        const availableGuests = (game?.guestPlayers ?? []).filter(n => (statusMap[n] ?? 'available') === 'available');
        const withTag = (name: string) => {
            const tag = positions[name];
            return tag ? `${name} #${tag}` : name;
        };
        const names = [
            ...availablePlayers.map(a => withTag(a.displayName)),
            ...availableGuests.map(withTag),
        ];
        const playerList = names.join('\n');
        setPlayersText(playerList);
        addSetup(playerList, count);
    }, [availablePlayers, game?.guestPlayers, game?.guestAvailability, game?.playerPositions, addSetup]);

    const handleGenerateFromText = useCallback((count = 1) => {
        addSetup(playersText, count);
    }, [playersText, addSetup]);

    const handlePickSetup = useCallback((setup: TeamSetup) => {
        setGeneratedTeams(setup.teams);
        setPendingSetups([]);
        setWizardStep(3);
        if (gameDocId) {
            updateGameTeams(gameDocId, setup.playersInput, setup.teams);
            updateGameDrafts(gameDocId, []);
        }
    }, [gameDocId]);

    const handleDeleteSetup = useCallback((setupId: string) => {
        setPendingSetups(prev => prev.filter(s => s.id !== setupId));
    }, []);

    const handleColorChange = useCallback((setupIndex: number, teamIndex: number, color: string) => {
        setPendingSetups(prev => prev.map((s, i) => i !== setupIndex ? s : {
            ...s,
            teams: s.teams.map((t, j) => j !== teamIndex ? t : { ...t, color }),
        }));
    }, []);

    const handleAddGuest = async () => {
        const name = newGuestName.trim();
        if (!name || !gameDocId || !game) return;
        const current = game.guestPlayers ?? [];
        if (current.includes(name)) return;
        const updated = [...current, name];
        setNewGuestName('');
        await updateGameGuests(gameDocId, updated);
    };

    const handleGoalChange = async (playerName: string, delta: number) => {
        if (!gameDocId) return;
        const existing = goalScorers.find(g => g.name === playerName);
        let updated: GoalScorer[];
        if (existing) {
            const newGoals = Math.max(0, existing.goals + delta);
            updated = newGoals === 0
                ? goalScorers.filter(g => g.name !== playerName)
                : goalScorers.map(g => g.name === playerName ? { ...g, goals: newGoals } : g);
        } else {
            if (delta <= 0) return;
            updated = [...goalScorers, { name: playerName, goals: delta }];
        }
        setGoalScorers(updated);
        await updateGameGoalScorers(gameDocId, updated);
    };

    const handleAssistChange = async (playerName: string, delta: number) => {
        if (!gameDocId) return;
        const existing = assisters.find(a => a.name === playerName);
        let updated: GoalScorer[];
        if (existing) {
            const newCount = Math.max(0, existing.goals + delta);
            updated = newCount === 0
                ? assisters.filter(a => a.name !== playerName)
                : assisters.map(a => a.name === playerName ? { ...a, goals: newCount } : a);
        } else {
            if (delta <= 0) return;
            updated = [...assisters, { name: playerName, goals: delta }];
        }
        setAssisters(updated);
        await updateGameAssisters(gameDocId, updated);
    };

    const handleSetMotm = async (name: string) => {
        if (!gameDocId) return;
        const newMotm = motm === name ? '' : name;
        setMotm(newMotm);
        await updateGameMotm(gameDocId, newMotm || null);
    };

    const handleSaveScore = async () => {
        if (!gameDocId) return;
        const s1 = parseInt(score1);
        const s2 = parseInt(score2);
        if (isNaN(s1) || isNaN(s2)) return;
        await updateGameScore(gameDocId, { team1: s1, team2: s2 });
    };

    const handleReopen = async () => {
        if (!gameDocId) return;
        await updateGameStatus(gameDocId, 'in_progress');
    };

    const handleToggleAttendee = async (name: string) => {
        if (!gameDocId || !game) return;
        const defaultList = [
            ...availability.filter(a => a.status === 'available').map(a => a.displayName),
            ...(game.guestPlayers ?? []).filter(n => (game.guestAvailability ?? {})[n] === 'available' || !(game.guestAvailability ?? {})[n]),
        ];
        const current = new Set(attendees ?? defaultList);
        if (current.has(name)) current.delete(name);
        else current.add(name);
        const updated = [...current];
        setAttendees(updated);
        await updateGameAttendees(gameDocId, updated);
    };

    const handleSaveGameCost = async () => {
        if (!gameDocId) return;
        const cost = parseFloat(costInput);
        await updateGameCost(gameDocId, isNaN(cost) || costInput.trim() === '' ? null : cost);
        setEditingCost(false);
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
            if (pendingSetups.length > 0) {
                setPendingSetups(prev => prev.map((s, i) => {
                    if (i !== setupIndex) return s;
                    const newTeams = s.teams.map(t => ({ ...t, players: [...t.players] }));
                    const temp = newTeams[selectedPlayer.teamIndex].players[selectedPlayer.playerIndex];
                    newTeams[selectedPlayer.teamIndex].players[selectedPlayer.playerIndex] = newTeams[teamIndex].players[playerIndex];
                    newTeams[teamIndex].players[playerIndex] = temp;
                    return { ...s, teams: newTeams };
                }));
            } else if (generatedTeams) {
                const newTeams = generatedTeams.map((team: Team) => ({
                    ...team,
                    players: [...team.players],
                }));
                const temp = newTeams[selectedPlayer.teamIndex].players[selectedPlayer.playerIndex];
                newTeams[selectedPlayer.teamIndex].players[selectedPlayer.playerIndex] = newTeams[teamIndex].players[playerIndex];
                newTeams[teamIndex].players[playerIndex] = temp;
                setGeneratedTeams(newTeams);
                if (gameDocId) {
                    updateGameTeams(gameDocId, playersText, newTeams);
                }
            }
            setSelectedPlayer(null);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-900 via-green-800 to-green-700 dark:from-green-950 dark:via-green-900 dark:to-green-800">
                <div className="text-white text-lg">Loading...</div>
            </div>
        );
    }

    if (!game) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-900 via-green-800 to-green-700 dark:from-green-950 dark:via-green-900 dark:to-green-800">
                <div className="text-center">
                    <div className="text-white text-lg mb-4">Game not found</div>
                    <Link to="/dashboard" className="text-green-300 hover:underline">Back to Dashboard</Link>
                </div>
            </div>
        );
    }

    const isCompleted = game.status === 'completed';
    const isPast = game.date < Date.now();
    const isAdmin = user?.uid === game.createdBy;

    const guestStatusMap = game.guestAvailability ?? {};
    const guestsAvailable = (game.guestPlayers ?? []).filter(n => (guestStatusMap[n] ?? 'available') === 'available');
    const guestsMaybe = (game.guestPlayers ?? []).filter(n => guestStatusMap[n] === 'maybe');
    const guestsUnavailable = (game.guestPlayers ?? []).filter(n => guestStatusMap[n] === 'unavailable');

    const handleGuestStatusChange = async (name: string, status: AvailabilityStatus) => {
        if (!gameDocId || !game) return;
        const updated = { ...guestStatusMap, [name]: status };
        await updateGuestAvailability(gameDocId, updated);
    };

    const positionMap = game.playerPositions ?? {};

    const handlePositionToggle = async (playerName: string, pos: 'g' | 'd' | 's') => {
        if (!gameDocId) return;
        const current = positionMap[playerName];
        const updated = current === pos
            ? Object.fromEntries(Object.entries(positionMap).filter(([k]) => k !== playerName))
            : { ...positionMap, [playerName]: pos };
        await updatePlayerPositions(gameDocId, updated);
    };

    const allPlayerNames = [
        ...availablePlayers.map(a => a.displayName),
        ...guestsAvailable,
        ...guestsMaybe,
    ];

    const totalAvailable = availablePlayers.length + guestsAvailable.length;

    const wizardSteps = [
        { num: 1 as const, label: 'Availability' },
        { num: 2 as const, label: 'Teams' },
        { num: 3 as const, label: 'Match' },
    ];

    // Reusable tally row used for both goals and assists
    const renderTallyRows = (
        tally: GoalScorer[],
        onChange: (name: string, delta: number) => void,
        accentClass: string,
    ) => (
        <div className="space-y-1.5">
            {allPlayerNames.map(name => {
                const count = tally.find(t => t.name === name)?.goals ?? 0;
                return (
                    <div key={name} className="flex items-center justify-between gap-2 bg-white/5 rounded-lg px-3 py-1.5">
                        <span className="text-white text-sm truncate">{name}</span>
                        <div className="flex items-center gap-2 shrink-0">
                            <button onClick={() => onChange(name, -1)} disabled={count === 0} className="text-white/40 hover:text-white disabled:opacity-20 p-0.5">
                                <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-white font-bold text-sm w-4 text-center">{count}</span>
                            <button onClick={() => onChange(name, 1)} className={`${accentClass} p-0.5`}>
                                <Plus className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );

    // Reusable goal scorers + assists + MoTM editor (used in both step 3 and completed view)
    const renderScoringControls = () => (
        <div className="border-t border-white/10 pt-4 mt-4 space-y-4">
            <div>
                <h4 className="text-white font-semibold mb-2 flex items-center gap-2 text-sm">
                    <Goal className="w-4 h-4 text-green-400" /> Goal Scorers
                </h4>
                {renderTallyRows(goalScorers, handleGoalChange, 'text-green-400 hover:text-green-300')}
            </div>
            <div>
                <h4 className="text-white font-semibold mb-2 flex items-center gap-2 text-sm">
                    <span className="text-blue-400 font-bold text-xs bg-blue-400/20 px-1.5 py-0.5 rounded">A</span> Assists
                </h4>
                {renderTallyRows(assisters, handleAssistChange, 'text-blue-400 hover:text-blue-300')}
            </div>
            <div>
                <h4 className="text-white font-semibold mb-2 flex items-center gap-2 text-sm">
                    <Award className="w-4 h-4 text-yellow-400" /> Man of the Match
                </h4>
                <div className="flex flex-wrap gap-2">
                    {allPlayerNames.map(name => (
                        <button
                            key={name}
                            onClick={() => handleSetMotm(name)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                                motm === name
                                    ? 'bg-yellow-500 text-green-900'
                                    : 'bg-white/10 text-white hover:bg-white/20'
                            }`}
                        >
                            {motm === name && <Star className="w-3 h-3 inline mr-1" />}{name}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );

    // Admin attendance + cost section (shown for in_progress and completed games)
    const renderAttendanceSection = () => {
        const effectiveCost = game!.costPerPerson ?? league?.defaultCostPerPerson ?? 0;
        const defaultList = [
            ...availability.filter(a => a.status === 'available').map(a => a.displayName),
            ...(game!.guestPlayers ?? []).filter(n => (game!.guestAvailability ?? {})[n] === 'available' || !(game!.guestAvailability ?? {})[n]),
        ];
        const effectiveAttendees = attendees ?? defaultList;
        const allPossible = [
            ...availability.map(a => a.displayName),
            ...(game!.guestPlayers ?? []),
        ];
        const pot = effectiveAttendees.length * effectiveCost;
        return (
            <div className="border-t border-white/10 pt-4 mt-4">
                <h4 className="text-white font-semibold mb-3 flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-green-400" /> Attendance
                </h4>
                {/* Cost per person */}
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-white/60 text-sm">Cost per person:</span>
                    {editingCost ? (
                        <div className="flex items-center gap-2">
                            <span className="text-white/60 text-sm">£</span>
                            <input
                                type="number"
                                value={costInput}
                                onChange={e => setCostInput(e.target.value)}
                                placeholder="0.00"
                                min="0"
                                step="0.5"
                                autoFocus
                                className="w-20 bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-white text-sm"
                            />
                            <button onClick={handleSaveGameCost} className="text-green-400 hover:text-green-300 text-xs px-2 py-1 bg-green-600/20 rounded">Save</button>
                            <button onClick={() => setEditingCost(false)} className="text-white/40 hover:text-white text-xs">Cancel</button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <span className="text-white font-semibold text-sm">
                                {effectiveCost > 0 ? `£${effectiveCost.toFixed(2)}` : 'Free'}
                            </span>
                            {league?.defaultCostPerPerson !== undefined && game!.costPerPerson === undefined && (
                                <span className="text-white/30 text-xs">(league default)</span>
                            )}
                            <button
                                onClick={() => { setCostInput(String(game!.costPerPerson ?? league?.defaultCostPerPerson ?? '')); setEditingCost(true); }}
                                className="text-white/40 hover:text-white/70 transition-colors"
                            >
                                <Pencil className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}
                </div>
                {/* Attendee checkboxes */}
                <div className="space-y-1.5 mb-3">
                    {allPossible.map(name => (
                        <label key={name} className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-1.5 cursor-pointer hover:bg-white/8 transition-colors">
                            <input
                                type="checkbox"
                                checked={effectiveAttendees.includes(name)}
                                onChange={() => handleToggleAttendee(name)}
                                className="w-4 h-4 accent-green-500 shrink-0"
                            />
                            <span className="text-white text-sm flex-1">{name}</span>
                            {(game!.guestPlayers ?? []).includes(name) && (
                                <span className="text-white/40 text-xs">guest</span>
                            )}
                        </label>
                    ))}
                </div>
                {/* Summary */}
                <div className="text-xs text-white/50">
                    {effectiveAttendees.length} attended · Total pot: £{pot.toFixed(2)}
                </div>
            </div>
        );
    };

    // Reusable availability list (step 1 + completed view player lookup)
    const renderAvailabilityList = () => (
        <div className="space-y-1">
            {[...availablePlayers, ...maybePlayers, ...unavailablePlayers].map(a => {
                const isMe = a.userId === user?.uid;
                const s = a.status;
                const pos = positionMap[a.displayName];
                return (
                    <div key={a.id} className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-1.5">
                        <span className="text-white text-sm truncate flex-1">{a.displayName}</span>
                        {isAdmin && (
                            <div className="flex gap-0.5 shrink-0">
                                {(['g', 'd', 's'] as const).map(p => (
                                    <button key={p} onClick={() => handlePositionToggle(a.displayName, p)}
                                        className={`text-xs px-1.5 py-0.5 rounded font-mono transition-colors ${pos === p ? 'bg-white/25 text-white' : 'text-white/25 hover:text-white/60'}`}
                                        title={p === 'g' ? 'Goalkeeper' : p === 'd' ? 'Defender' : 'Forward'}
                                    >{p === 'g' ? 'GK' : p === 'd' ? 'DEF' : 'FWD'}</button>
                                ))}
                            </div>
                        )}
                        <div className="flex gap-1 shrink-0">
                            <button onClick={() => isMe ? handleSetAvailability('available') : isAdmin ? handleAdminSetAvailability(a, 'available') : undefined}
                                className={`p-0.5 transition-colors ${s === 'available' ? 'text-green-400' : (isMe || isAdmin) ? 'text-white/20 hover:text-green-400' : 'text-white/20 cursor-default'}`}
                                title="Available"><CheckCircle className="w-4 h-4" /></button>
                            <button onClick={() => isMe ? handleSetAvailability('maybe') : isAdmin ? handleAdminSetAvailability(a, 'maybe') : undefined}
                                className={`p-0.5 transition-colors ${s === 'maybe' ? 'text-yellow-400' : (isMe || isAdmin) ? 'text-white/20 hover:text-yellow-400' : 'text-white/20 cursor-default'}`}
                                title="Maybe"><HelpCircle className="w-4 h-4" /></button>
                            <button onClick={() => isMe ? handleSetAvailability('unavailable') : isAdmin ? handleAdminSetAvailability(a, 'unavailable') : undefined}
                                className={`p-0.5 transition-colors ${s === 'unavailable' ? 'text-red-400' : (isMe || isAdmin) ? 'text-white/20 hover:text-red-400' : 'text-white/20 cursor-default'}`}
                                title="Can't make it"><XCircle className="w-4 h-4" /></button>
                        </div>
                    </div>
                );
            })}
            {(game.guestPlayers ?? []).map(name => {
                const s = guestStatusMap[name] ?? 'available';
                const pos = positionMap[name];
                return (
                    <div key={name} className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-1.5">
                        <span className="text-white text-sm truncate flex-1">{name} <span className="text-white/40 text-xs">guest</span></span>
                        {isAdmin ? (
                            <>
                                <div className="flex gap-0.5 shrink-0">
                                    {(['g', 'd', 's'] as const).map(p => (
                                        <button key={p} onClick={() => handlePositionToggle(name, p)}
                                            className={`text-xs px-1.5 py-0.5 rounded font-mono transition-colors ${pos === p ? 'bg-white/25 text-white' : 'text-white/25 hover:text-white/60'}`}
                                            title={p === 'g' ? 'Goalkeeper' : p === 'd' ? 'Defender' : 'Forward'}
                                        >{p === 'g' ? 'GK' : p === 'd' ? 'DEF' : 'FWD'}</button>
                                    ))}
                                </div>
                                <div className="flex gap-1 shrink-0">
                                    <button onClick={() => handleGuestStatusChange(name, 'available')} className={`p-0.5 transition-colors ${s === 'available' ? 'text-green-400' : 'text-white/20 hover:text-green-400'}`} title="Available"><CheckCircle className="w-4 h-4" /></button>
                                    <button onClick={() => handleGuestStatusChange(name, 'maybe')} className={`p-0.5 transition-colors ${s === 'maybe' ? 'text-yellow-400' : 'text-white/20 hover:text-yellow-400'}`} title="Maybe"><HelpCircle className="w-4 h-4" /></button>
                                    <button onClick={() => handleGuestStatusChange(name, 'unavailable')} className={`p-0.5 transition-colors ${s === 'unavailable' ? 'text-red-400' : 'text-white/20 hover:text-red-400'}`} title="Can't make it"><XCircle className="w-4 h-4" /></button>
                                </div>
                            </>
                        ) : (
                            <span className={`text-xs ${s === 'available' ? 'text-green-400' : s === 'maybe' ? 'text-yellow-400' : 'text-red-400'}`}>
                                {s === 'available' ? 'in' : s === 'maybe' ? 'maybe' : 'out'}
                            </span>
                        )}
                    </div>
                );
            })}
            {leagueMembers
                .filter(m => !availability.find(a => a.userId === m.id))
                .map(member => (
                    <div key={member.id} className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-1.5 opacity-50">
                        <span className="text-white/60 text-sm truncate flex-1">{member.displayName}</span>
                        <span className="text-white/30 text-xs mr-1">no response</span>
                        {isAdmin && (
                            <div className="flex gap-1 shrink-0">
                                <button
                                    onClick={() => gameDocId && setAvailability(gameDocId, member.id, member.displayName, 'available')}
                                    className="p-0.5 transition-colors text-white/20 hover:text-green-400"
                                    title="Mark available"
                                ><CheckCircle className="w-4 h-4" /></button>
                                <button
                                    onClick={() => gameDocId && setAvailability(gameDocId, member.id, member.displayName, 'maybe')}
                                    className="p-0.5 transition-colors text-white/20 hover:text-yellow-400"
                                    title="Mark maybe"
                                ><HelpCircle className="w-4 h-4" /></button>
                                <button
                                    onClick={() => gameDocId && setAvailability(gameDocId, member.id, member.displayName, 'unavailable')}
                                    className="p-0.5 transition-colors text-white/20 hover:text-red-400"
                                    title="Mark unavailable"
                                ><XCircle className="w-4 h-4" /></button>
                            </div>
                        )}
                    </div>
                ))
            }
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-700 dark:from-green-950 dark:via-green-900 dark:to-green-800">
            <AppHeader
                title={game.title}
                subtitle={league?.name}
                onBack={() => league ? navigate(`/league/${league.joinCode}`) : navigate('/dashboard')}
                showDashboardLink
                titleExtra={
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                        game.status === 'scheduled' ? 'bg-blue-500/20 text-blue-300' :
                        game.status === 'in_progress' ? 'bg-yellow-500/20 text-yellow-300' :
                        'bg-green-500/20 text-green-300'
                    }`}>
                        {game.status === 'in_progress' ? 'In Progress' : game.status.charAt(0).toUpperCase() + game.status.slice(1)}
                    </span>
                }
            />

            <div className="p-4 sm:p-6 space-y-4">
                {/* Date + location + weather */}
                <div className="max-w-4xl mx-auto bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                    <div className="text-center text-white font-medium">
                        {new Date(game.date).toLocaleDateString('en-GB', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                        })}
                    </div>
                    {game.location && (
                        <div className="text-center text-green-300 text-sm mt-1">
                            📍 {game.location}
                        </div>
                    )}
                    {game.locationLat !== undefined && game.locationLon !== undefined && (
                        <div className="mt-3 rounded-lg overflow-hidden border border-white/10" style={{ height: 140 }}>
                            <LocationMap lat={game.locationLat} lon={game.locationLon} height={140} />
                        </div>
                    )}
                    {game.location && !isCompleted && (
                        <div className="mt-3 pt-3 border-t border-white/10">
                            {weatherLoading && (
                                <div className="text-center text-green-300/60 text-xs">Fetching forecast…</div>
                            )}
                            {!weatherLoading && weather && (() => {
                                const { emoji, label } = describeWeatherCode(weather.weatherCode);
                                return (
                                    <div className="flex items-center justify-center gap-6 text-sm">
                                        <span className="text-2xl">{emoji}</span>
                                        <div className="text-center">
                                            <div className="text-white font-semibold">{weather.temperature}°C</div>
                                            <div className="text-green-300 text-xs">{label}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-white font-semibold">{weather.rainProbability}%</div>
                                            <div className="text-green-300 text-xs">rain chance</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-white font-semibold">{weather.windSpeed} mph</div>
                                            <div className="text-green-300 text-xs">wind</div>
                                        </div>
                                    </div>
                                );
                            })()}
                            {!weatherLoading && !weather && (
                                <div className="text-center text-green-300/60 text-xs">No forecast available</div>
                            )}
                        </div>
                    )}
                </div>

                {/* Wizard progress bar */}
                {!isCompleted && (
                    <div className="max-w-2xl mx-auto">
                        <div className="flex items-center w-full">
                            {wizardSteps.map((step, idx) => (
                                <React.Fragment key={step.num}>
                                    <button
                                        onClick={() => { if (wizardStep > step.num) setWizardStep(step.num); }}
                                        className={`flex flex-col items-center gap-1 shrink-0 ${wizardStep > step.num ? 'cursor-pointer' : 'cursor-default'}`}
                                    >
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                                            wizardStep > step.num ? 'bg-green-500 text-white' :
                                            wizardStep === step.num ? 'bg-white text-green-900' :
                                            'bg-white/20 text-white/40'
                                        }`}>
                                            {wizardStep > step.num ? <Check className="w-4 h-4" /> : step.num}
                                        </div>
                                        <span className={`text-xs whitespace-nowrap ${
                                            wizardStep === step.num ? 'text-white font-semibold' :
                                            wizardStep > step.num ? 'text-green-400' :
                                            'text-white/40'
                                        }`}>{step.label}</span>
                                    </button>
                                    {idx < wizardSteps.length - 1 && (
                                        <div className={`flex-1 h-0.5 mx-3 mb-4 transition-colors ${wizardStep > step.num ? 'bg-green-500' : 'bg-white/20'}`} />
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Step 1: Availability & Positions ── */}
                {!isCompleted && wizardStep === 1 && (
                    <div className="max-w-2xl mx-auto space-y-4">
                        <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-5">
                            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                                <Users className="w-5 h-5" /> Availability
                            </h2>
                            {user && (
                                <div className="flex gap-2 mb-4">
                                    <Button
                                        onClick={() => handleSetAvailability('available')}
                                        className={`flex-1 rounded-lg flex items-center justify-center gap-2 py-3 ${
                                            myAvailability?.status === 'available'
                                                ? 'bg-green-600 text-white'
                                                : 'bg-white/5 text-white/60 hover:bg-white/10'
                                        }`}
                                    >
                                        <CheckCircle className="w-4 h-4" /> I'm in
                                    </Button>
                                    <Button
                                        onClick={() => handleSetAvailability('maybe')}
                                        className={`flex-1 rounded-lg flex items-center justify-center gap-2 py-3 ${
                                            myAvailability?.status === 'maybe'
                                                ? 'bg-yellow-600 text-white'
                                                : 'bg-white/5 text-white/60 hover:bg-white/10'
                                        }`}
                                    >
                                        <HelpCircle className="w-4 h-4" /> Maybe
                                    </Button>
                                    <Button
                                        onClick={() => handleSetAvailability('unavailable')}
                                        className={`flex-1 rounded-lg flex items-center justify-center gap-2 py-3 ${
                                            myAvailability?.status === 'unavailable'
                                                ? 'bg-red-600 text-white'
                                                : 'bg-white/5 text-white/60 hover:bg-white/10'
                                        }`}
                                    >
                                        <XCircle className="w-4 h-4" /> Can't make it
                                    </Button>
                                </div>
                            )}
                            <div className="flex gap-4 text-xs mb-2">
                                <span className="text-green-400">{availablePlayers.length + guestsAvailable.length} in</span>
                                <span className="text-yellow-400">{maybePlayers.length + guestsMaybe.length} maybe</span>
                                <span className="text-red-400">{unavailablePlayers.length + guestsUnavailable.length} out</span>
                            </div>
                            {renderAvailabilityList()}
                            {isAdmin && (
                                <div className="mt-3 pt-3 border-t border-white/10">
                                    <div className="text-xs text-green-300/70 mb-2 flex items-center gap-1">
                                        <UserPlus className="w-3.5 h-3.5" /> Add ringer (no account needed)
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={newGuestName}
                                            onChange={e => setNewGuestName(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleAddGuest()}
                                            placeholder="Player name"
                                            className="flex-1 border border-white/10 rounded-lg px-3 py-1.5 bg-white/5 text-white placeholder-white/30 text-sm focus:ring-1 focus:ring-green-500 focus:outline-none"
                                        />
                                        <Button
                                            onClick={handleAddGuest}
                                            disabled={!newGuestName.trim()}
                                            className="bg-green-600 hover:bg-green-500 text-white rounded-lg px-3"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <Button
                            onClick={() => setWizardStep(2)}
                            disabled={totalAvailable === 0}
                            className="w-full bg-green-600 hover:bg-green-500 text-white rounded-lg flex items-center justify-center gap-2 py-3 disabled:opacity-40"
                        >
                            Next: Generate Teams <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                )}

                {/* ── Step 2: Generate Teams ── */}
                {!isCompleted && wizardStep === 2 && (
                    <div className="max-w-4xl mx-auto space-y-4">
                        <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-5">
                            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                                <Shuffle className="w-5 h-5" /> Generate Teams
                            </h2>
                            {totalAvailable >= 4 && (
                                <Button
                                    onClick={() => generateFromAvailable(3)}
                                    className="w-full bg-green-600 hover:bg-green-500 text-white rounded-lg flex items-center justify-center gap-2 py-3 mb-3"
                                >
                                    <Shuffle className="w-4 h-4" /> Generate 3 options from available ({totalAvailable})
                                </Button>
                            )}
                            <button
                                onClick={() => setShowTextarea(t => !t)}
                                className="text-xs text-green-300/70 hover:text-green-300 transition-colors flex items-center gap-1 mb-2"
                            >
                                {showTextarea ? '▲' : '▼'} Enter players manually
                            </button>
                            {showTextarea && (
                                <div>
                                    <textarea
                                        value={playersText}
                                        onChange={e => setPlayersText(e.target.value)}
                                        className="w-full h-32 border border-white/10 rounded-lg p-3 bg-white/5 text-white placeholder-white/30 focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                                        placeholder={"Player 1\nPlayer 2 #g\nPlayer 3 #d\n..."}
                                    />
                                    <div className="flex gap-2 mt-2">
                                        <Button
                                            onClick={() => handleGenerateFromText(1)}
                                            className="flex-1 bg-green-600 hover:bg-green-500 text-white rounded-lg flex items-center justify-center gap-2"
                                        >
                                            <Shuffle className="w-4 h-4" /> Create Teams
                                        </Button>
                                        <Button
                                            onClick={() => handleGenerateFromText(3)}
                                            className="bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg px-4"
                                        >
                                            ×3
                                        </Button>
                                    </div>
                                </div>
                            )}
                            {genError && (
                                <div className="text-red-400 text-sm bg-red-500/10 p-3 rounded-lg mt-3">
                                    {genError}
                                </div>
                            )}
                        </div>

                        {pendingSetups.length === 0 && <PlaceholderPitch />}

                        {pendingSetups.length > 0 && (
                            <>
                                <div className="flex items-center justify-between">
                                    <p className="text-green-300 text-sm">
                                        {pendingSetups.length} draft{pendingSetups.length !== 1 ? 's' : ''} — pick the setup you want
                                    </p>
                                    {isAdmin && (
                                        <div className="flex gap-2">
                                            <Button onClick={() => handleShare(pendingSetups.length)} disabled={isExporting} className="bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg px-3 py-1.5 text-xs flex items-center gap-1.5">
                                                <Share2 className="w-3.5 h-3.5" /> Share
                                            </Button>
                                            <Button onClick={() => handleExport(pendingSetups.length)} disabled={isExporting} className="bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg px-3 py-1.5 text-xs flex items-center gap-1.5">
                                                <Download className="w-3.5 h-3.5" /> Save
                                            </Button>
                                        </div>
                                    )}
                                </div>
                                {pendingSetups.map((setup, idx) => (
                                    <div key={setup.id} className="flex flex-col">
                                        <TeamSetupCard
                                            setup={setup}
                                            setupIndex={idx}
                                            totalSetups={pendingSetups.length}
                                            selectedPlayer={selectedPlayer}
                                            onPlayerClick={handlePlayerClick}
                                            onDelete={() => handleDeleteSetup(setup.id)}
                                            onColorChange={handleColorChange}
                                            aiEnabled={false}
                                            onGenerateSummary={() => {}}
                                        />
                                        <Button
                                            onClick={() => handlePickSetup(setup)}
                                            className="mt-2 bg-green-600 hover:bg-green-500 text-white rounded-lg flex items-center justify-center gap-2"
                                        >
                                            <Check className="w-4 h-4" /> Use these teams
                                        </Button>
                                    </div>
                                ))}
                            </>
                        )}

                        <Button
                            onClick={() => setWizardStep(1)}
                            variant="ghost"
                            className="text-white/60 hover:text-white flex items-center gap-1 text-sm"
                        >
                            <ChevronLeft className="w-4 h-4" /> Back to Availability
                        </Button>
                    </div>
                )}

                {/* ── Step 3: Match (active game with committed teams) ── */}
                {!isCompleted && wizardStep === 3 && (
                    <div className="max-w-4xl mx-auto space-y-4">
                        {generatedTeams && generatedTeams.length === 2 ? (
                            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-5">
                                {isAdmin && (
                                    <div className="flex justify-end gap-2 mb-3">
                                        <Button onClick={() => handleShare(1)} disabled={isExporting} className="bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg px-3 py-1.5 text-xs flex items-center gap-1.5">
                                            <Share2 className="w-3.5 h-3.5" /> Share
                                        </Button>
                                        <Button onClick={() => handleExport(1)} disabled={isExporting} className="bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg px-3 py-1.5 text-xs flex items-center gap-1.5">
                                            <Download className="w-3.5 h-3.5" /> Save
                                        </Button>
                                    </div>
                                )}
                                <div id="team-setup-0">
                                    <div className="flex justify-around mb-2">
                                        <h3 className="font-bold text-lg" style={{ color: generatedTeams[0].color }}>
                                            {generatedTeams[0].name}
                                        </h3>
                                        <h3 className="font-bold text-lg" style={{ color: generatedTeams[1].color }}>
                                            {generatedTeams[1].name}
                                        </h3>
                                    </div>
                                    {!isCompleted && (
                                        <p className="text-center text-green-300/70 text-xs mb-3 flex items-center justify-center gap-1.5">
                                            <ArrowLeftRight className="w-3 h-3" />
                                            Click any two players to swap their positions
                                        </p>
                                    )}
                                    <PitchRenderer
                                        teams={generatedTeams}
                                        setupIndex={0}
                                        selectedPlayer={selectedPlayer}
                                        onPlayerClick={(_, tIdx, pIdx) => handlePlayerClick(0, tIdx, pIdx)}
                                    />
                                </div>{/* end team-setup-0 */}
                                {(isPast || game.status === 'in_progress') && isAdmin && (
                                    <div className="border-t border-white/10 pt-4">
                                        <h3 className="text-white font-bold text-center mb-3 flex items-center justify-center gap-2">
                                            <Trophy className="w-4 h-4" /> Record Score
                                        </h3>
                                        <div className="flex items-center justify-center gap-3">
                                            <div className="text-center">
                                                <div className="text-sm text-green-300 mb-1">{generatedTeams[0]?.name}</div>
                                                <input
                                                    type="number"
                                                    value={score1}
                                                    onChange={e => setScore1(e.target.value)}
                                                    className="w-16 text-center text-2xl font-bold border border-white/10 rounded-lg p-2 bg-white/5 text-white"
                                                    min="0"
                                                />
                                            </div>
                                            <span className="text-white text-2xl font-bold">-</span>
                                            <div className="text-center">
                                                <div className="text-sm text-green-300 mb-1">{generatedTeams[1]?.name}</div>
                                                <input
                                                    type="number"
                                                    value={score2}
                                                    onChange={e => setScore2(e.target.value)}
                                                    className="w-16 text-center text-2xl font-bold border border-white/10 rounded-lg p-2 bg-white/5 text-white"
                                                    min="0"
                                                />
                                            </div>
                                        </div>
                                        <Button
                                            onClick={handleSaveScore}
                                            disabled={score1 === '' || score2 === ''}
                                            className="mt-3 w-full bg-green-600 hover:bg-green-500 text-white rounded-lg"
                                        >
                                            Save Final Score
                                        </Button>
                                    </div>
                                )}
                                {(isPast || game.status === 'in_progress') && isAdmin && allPlayerNames.length > 0 && renderScoringControls()}
                                {(isPast || game.status === 'in_progress') && isAdmin && renderAttendanceSection()}
                            </div>
                        ) : (
                            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-8 text-center">
                                <p className="text-green-300 mb-3">No teams committed yet.</p>
                                <Button
                                    onClick={() => setWizardStep(2)}
                                    className="bg-green-600 hover:bg-green-500 text-white rounded-lg"
                                >
                                    Go to Generate Teams
                                </Button>
                            </div>
                        )}

                        <Button
                            onClick={() => setWizardStep(2)}
                            variant="ghost"
                            className="text-white/60 hover:text-white flex items-center gap-1 text-sm"
                        >
                            <ChevronLeft className="w-4 h-4" /> Back to Teams
                        </Button>
                    </div>
                )}

                {/* ── Completed game — results view (no wizard) ── */}
                {isCompleted && generatedTeams && generatedTeams.length === 2 && (
                    <div className="max-w-4xl mx-auto">
                        <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-5">
                            <div className="flex justify-around mb-2">
                                <h3 className="font-bold text-lg" style={{ color: generatedTeams[0].color }}>
                                    {generatedTeams[0].name}
                                </h3>
                                <h3 className="font-bold text-lg" style={{ color: generatedTeams[1].color }}>
                                    {generatedTeams[1].name}
                                </h3>
                            </div>
                            <PitchRenderer
                                teams={generatedTeams}
                                setupIndex={0}
                                selectedPlayer={selectedPlayer}
                                onPlayerClick={(_, tIdx, pIdx) => handlePlayerClick(0, tIdx, pIdx)}
                            />
                            {game.score && (
                                <div className="border-t border-white/10 pt-4 mt-4">
                                    <h3 className="text-white font-bold text-center mb-2">Final Score</h3>
                                    <div className="flex items-center justify-center gap-4 text-white">
                                        <div className="text-center">
                                            <div className="text-sm text-green-300">{generatedTeams[0]?.name}</div>
                                            <div className="text-4xl font-bold">{game.score.team1}</div>
                                        </div>
                                        <span className="text-2xl">-</span>
                                        <div className="text-center">
                                            <div className="text-sm text-green-300">{generatedTeams[1]?.name}</div>
                                            <div className="text-4xl font-bold">{game.score.team2}</div>
                                        </div>
                                    </div>
                                    {isAdmin && (
                                        <Button
                                            onClick={handleReopen}
                                            className="mt-3 w-full bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg text-sm"
                                        >
                                            Edit Score
                                        </Button>
                                    )}
                                </div>
                            )}
                            {isAdmin && allPlayerNames.length > 0 && renderScoringControls()}
                            {isAdmin && renderAttendanceSection()}
                            {!isAdmin && (goalScorers.length > 0 || assisters.length > 0 || motm) && (
                                <div className="border-t border-white/10 pt-4 mt-4 space-y-3">
                                    {goalScorers.length > 0 && (
                                        <div>
                                            <h4 className="text-white font-semibold mb-2 flex items-center gap-2 text-sm">
                                                <Goal className="w-4 h-4 text-green-400" /> Goal Scorers
                                            </h4>
                                            <div className="flex flex-wrap gap-2">
                                                {[...goalScorers].sort((a, b) => b.goals - a.goals).map(gs => (
                                                    <span key={gs.name} className="bg-white/10 text-white text-sm px-3 py-1 rounded-full">
                                                        {gs.name} &times; {gs.goals}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {assisters.length > 0 && (
                                        <div>
                                            <h4 className="text-white font-semibold mb-2 flex items-center gap-2 text-sm">
                                                <span className="text-blue-400 font-bold text-xs bg-blue-400/20 px-1.5 py-0.5 rounded">A</span> Assists
                                            </h4>
                                            <div className="flex flex-wrap gap-2">
                                                {[...assisters].sort((a, b) => b.goals - a.goals).map(a => (
                                                    <span key={a.name} className="bg-white/10 text-white text-sm px-3 py-1 rounded-full">
                                                        {a.name} &times; {a.goals}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {motm && (
                                        <div className="flex items-center gap-2">
                                            <Award className="w-4 h-4 text-yellow-400" />
                                            <span className="text-white text-sm">MoTM: <strong>{motm}</strong></span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GamePage;
