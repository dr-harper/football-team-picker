import { useState, useEffect, useCallback, useRef } from 'react';
import { hapticLight, hapticSuccess } from '../../utils/haptics';
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
} from '../../utils/firestore';
import { Game, PlayerAvailability, AvailabilityStatus, League, Team, TeamSetup, WeatherForecast, GoalScorer } from '../../types';
import { generateTeamsFromText } from '../../utils/teamGenerator';
import { fetchWeather } from '../../utils/weather';
import { buildLookup, makeGuestId } from '../../utils/playerLookup';

interface UseGameStateArgs {
    rawId: string | undefined;
    userId: string | undefined;
    userDisplayName: string | null | undefined;
    userEmail: string | null | undefined;
    places: string[];
}

export function useGameState({ rawId, userId, userDisplayName, userEmail, places }: UseGameStateArgs) {
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

    // Resolve rawId
    useEffect(() => {
        if (!rawId) return;
        getGameByCode(rawId).then(g => {
            setGameDocId(g ? g.id : rawId);
        });
    }, [rawId]);

    // Subscribe to game + availability
    useEffect(() => {
        if (!gameDocId) return;
        const unsubGame = subscribeToGame(gameDocId, async (g) => {
            setGame(g);
            if (g?.leagueId) {
                const l = await getLeague(g.leagueId);
                setLeague(l);
                if (l) getLeagueMembers(l.memberIds).then(setLeagueMembers);
            }
            if (g?.playersText) setPlayersText(g.playersText);
            if (g?.teams) setGeneratedTeams(g.teams);
            if (g?.draftSetups?.length) setPendingSetups(g.draftSetups);
            if (g?.score) { setScore1(String(g.score.team1)); setScore2(String(g.score.team2)); }
            if (g?.goalScorers) setGoalScorers(g.goalScorers);
            if (g?.assisters) setAssisters(g.assisters);
            if (g?.manOfTheMatch) setMotm(g.manOfTheMatch);
            if (g?.attendees !== undefined) setAttendees(g.attendees);
            setLoading(false);
        });
        const unsubAvail = subscribeToGameAvailability(gameDocId, setAvailabilityState);
        return () => { unsubGame(); unsubAvail(); };
    }, [gameDocId]);

    // Initial wizard step
    useEffect(() => {
        if (!game || didSetInitialStep.current) return;
        didSetInitialStep.current = true;
        if (game.status === 'completed') setWizardStep(3);
        else if (game.status === 'in_progress') setWizardStep(game.teams?.length ? 3 : 2);
    }, [game]);

    // Debounced draft save
    useEffect(() => {
        if (!gameDocId || loading) return;
        const t = setTimeout(() => updateGameDrafts(gameDocId, pendingSetups), 800);
        return () => clearTimeout(t);
    }, [pendingSetups, gameDocId, loading]);

    // Weather
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

    // Derived values
    const lookup = buildLookup(leagueMembers);
    const myAvailability = availability.find(a => a.userId === userId);
    const availablePlayers = availability.filter(a => a.status === 'available');
    const maybePlayers = availability.filter(a => a.status === 'maybe');
    const unavailablePlayers = availability.filter(a => a.status === 'unavailable');

    const guestStatusMap = game?.guestAvailability ?? {};
    const guestsAvailable = (game?.guestPlayers ?? []).filter(n => (guestStatusMap[n] ?? 'available') === 'available');
    const guestsMaybe = (game?.guestPlayers ?? []).filter(n => guestStatusMap[n] === 'maybe');
    const guestsUnavailable = (game?.guestPlayers ?? []).filter(n => guestStatusMap[n] === 'unavailable');
    const positionMap = game?.playerPositions ?? {};
    const totalAvailable = availablePlayers.length + guestsAvailable.length;
    const allPlayerIds = [
        ...availablePlayers.map(a => a.userId),
        ...guestsAvailable.map(makeGuestId),
        ...guestsMaybe.map(makeGuestId),
    ];

    // Handlers
    const handleSetAvailability = async (status: AvailabilityStatus) => {
        if (!userId || !gameDocId) return;
        hapticLight();
        await setAvailability(gameDocId, userId, userDisplayName || userEmail?.split('@')[0] || 'Player', status);
    };

    const handleAdminSetAvailability = async (player: PlayerAvailability, status: AvailabilityStatus) => {
        if (!gameDocId) return;
        await setAvailability(gameDocId, player.userId, player.displayName, status);
    };

    const addSetup = useCallback((text: string, count = 1) => {
        const nameToId: Record<string, string> = {};
        for (const a of availability) nameToId[a.displayName] = a.userId;
        for (const gn of game?.guestPlayers ?? []) nameToId[gn] = makeGuestId(gn);

        const newSetups: TeamSetup[] = [];
        let lastNumbers = playerNumbers;
        let hasError = false;
        for (let i = 0; i < count; i++) {
            const result = generateTeamsFromText(text, places, lastNumbers);
            if (result.error) { setGenError(result.error); hasError = true; break; }
            lastNumbers = result.playerNumbers;
            const teams = result.teams.map(t => ({
                ...t,
                players: t.players.map(p => ({ ...p, playerId: nameToId[p.name] ?? p.name })),
            }));
            newSetups.push({ id: String(nextSetupIdRef.current++), teams, playersInput: text });
        }
        if (!hasError) {
            hapticSuccess();
            setPlayerNumbers(lastNumbers);
            setPendingSetups(prev => [...prev, ...newSetups]);
            setGenError('');
        }
    }, [places, playerNumbers, availability, game?.guestPlayers]);

    const generateFromAvailable = useCallback((count = 3) => {
        const statusMap = game?.guestAvailability ?? {};
        const positions = game?.playerPositions ?? {};
        const availableGuests = (game?.guestPlayers ?? []).filter(n => (statusMap[n] ?? 'available') === 'available');
        const withTag = (displayName: string, playerId: string) => {
            const tag = positions[playerId];
            return tag ? `${displayName} #${tag}` : displayName;
        };
        const names = [
            ...availablePlayers.map(a => withTag(a.displayName, a.userId)),
            ...availableGuests.map(n => withTag(n, makeGuestId(n))),
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
        setNewGuestName('');
        await updateGameGuests(gameDocId, [...current, name]);
    };

    const handleGoalChange = async (playerId: string, delta: number) => {
        if (!gameDocId) return;
        const existing = goalScorers.find(g => g.playerId === playerId);
        let updated: GoalScorer[];
        if (existing) {
            const newGoals = Math.max(0, existing.goals + delta);
            updated = newGoals === 0
                ? goalScorers.filter(g => g.playerId !== playerId)
                : goalScorers.map(g => g.playerId === playerId ? { ...g, goals: newGoals } : g);
        } else {
            if (delta <= 0) return;
            updated = [...goalScorers, { playerId, goals: delta }];
        }
        setGoalScorers(updated);
        await updateGameGoalScorers(gameDocId, updated);
    };

    const handleAssistChange = async (playerId: string, delta: number) => {
        if (!gameDocId) return;
        const existing = assisters.find(a => a.playerId === playerId);
        let updated: GoalScorer[];
        if (existing) {
            const newCount = Math.max(0, existing.goals + delta);
            updated = newCount === 0
                ? assisters.filter(a => a.playerId !== playerId)
                : assisters.map(a => a.playerId === playerId ? { ...a, goals: newCount } : a);
        } else {
            if (delta <= 0) return;
            updated = [...assisters, { playerId, goals: delta }];
        }
        setAssisters(updated);
        await updateGameAssisters(gameDocId, updated);
    };

    const handleSetMotm = async (playerId: string) => {
        if (!gameDocId) return;
        const newMotm = motm === playerId ? '' : playerId;
        setMotm(newMotm);
        await updateGameMotm(gameDocId, newMotm || null);
    };

    const handleSaveScore = async () => {
        if (!gameDocId) return;
        const s1 = parseInt(score1);
        const s2 = parseInt(score2);
        if (isNaN(s1) || isNaN(s2)) return;
        await updateGameScore(gameDocId, { team1: s1, team2: s2 });

        // Auto-populate attendees from team players if not already set
        if (generatedTeams && (!game?.attendees || game.attendees.length === 0)) {
            const playerIds = generatedTeams.flatMap(t =>
                t.players.map(p => p.playerId ?? p.name)
            );
            await updateGameAttendees(gameDocId, playerIds);
        }
    };

    const handleReopen = async () => {
        if (!gameDocId) return;
        await updateGameStatus(gameDocId, 'in_progress');
    };

    const handleToggleAttendee = async (playerId: string) => {
        if (!gameDocId || !game) return;
        const defaultList = [
            ...availability.filter(a => a.status === 'available').map(a => a.userId),
            ...(game.guestPlayers ?? []).filter(n => (game.guestAvailability ?? {})[n] === 'available' || !(game.guestAvailability ?? {})[n]).map(makeGuestId),
        ];
        const current = new Set(attendees ?? defaultList);
        if (current.has(playerId)) current.delete(playerId);
        else current.add(playerId);
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

    const handleGuestStatusChange = async (name: string, status: AvailabilityStatus) => {
        if (!gameDocId || !game) return;
        await updateGuestAvailability(gameDocId, { ...(game.guestAvailability ?? {}), [name]: status });
    };

    const handlePositionToggle = async (playerId: string, pos: 'g' | 'd' | 's') => {
        if (!gameDocId) return;
        const current = positionMap[playerId];
        const updated = current === pos
            ? Object.fromEntries(Object.entries(positionMap).filter(([k]) => k !== playerId))
            : { ...positionMap, [playerId]: pos };
        await updatePlayerPositions(gameDocId, updated);
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
                if (gameDocId) updateGameTeams(gameDocId, playersText, newTeams);
            }
            setSelectedPlayer(null);
        }
    };

    return {
        // State
        game, league, loading, gameDocId,
        availability, myAvailability,
        availablePlayers, maybePlayers, unavailablePlayers,
        guestsAvailable, guestsMaybe, guestsUnavailable,
        guestStatusMap, positionMap,
        totalAvailable, allPlayerIds,
        playersText, generatedTeams, pendingSetups, genError,
        score1, score2, selectedPlayer,
        weather, weatherLoading,
        leagueMembers, lookup,
        newGuestName, goalScorers, assisters, motm,
        isExporting, setIsExporting,
        wizardStep, setWizardStep,
        attendees, editingCost, costInput, showTextarea,

        // Setters
        setPlayersText, setScore1, setScore2,
        setNewGuestName, setCostInput, setEditingCost,
        setShowTextarea,

        // Handlers
        handleSetAvailability, handleAdminSetAvailability,
        generateFromAvailable, handleGenerateFromText,
        handlePickSetup, handleDeleteSetup, handleColorChange,
        handleAddGuest, handleGoalChange, handleAssistChange,
        handleSetMotm, handleSaveScore, handleReopen,
        handleToggleAttendee, handleSaveGameCost,
        handleGuestStatusChange, handlePositionToggle,
        handlePlayerClick,
    };
}
