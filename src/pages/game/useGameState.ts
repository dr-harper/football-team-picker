import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
    updateMotmNotes,
    updateGameCost,
    updateGameAttendees,
    updateMatchStartedAt,
    updateMatchPaused,
    updateMatchResumed,
    updateMatchEnded,
    clearMatchEnded,
    updateGameMatchEvents,
    getLeague,
    getLeagueMembers,
    getGameByCode,
} from '../../utils/firestore';
import { Game, PlayerAvailability, AvailabilityStatus, League, Team, TeamSetup, WeatherForecast, GoalScorer, MatchEvent } from '../../types';
import { generateTeamsFromText } from '../../utils/teamGenerator';
import { fetchWeather } from '../../utils/weather';
import { buildLookup, makeGuestId } from '../../utils/playerLookup';
import { computeWaitlist, resolveGameFormat, WaitlistResult } from '../../utils/waitlist';

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
    const [motmNotes, setMotmNotes] = useState('');
    const [matchEvents, setMatchEvents] = useState<MatchEvent[]>([]);
    const [isExporting, setIsExporting] = useState(false);
    const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);
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
            if (g?.motmNotes !== undefined) setMotmNotes(g.motmNotes);
            if (g?.attendees !== undefined) setAttendees(g.attendees);
            if (g?.matchEvents && g.matchEvents.length > 0) {
                // Merge with local state: prefer local 'applied'/'parsed' over Firestore 'processing'
                setMatchEvents(prev => {
                    const localById = new Map(prev.map(e => [e.id, e]));
                    const merged = g.matchEvents!.map(remote => {
                        const local = localById.get(remote.id);
                        // Keep local version if it has progressed further than remote
                        if (local && remote.status === 'processing' && local.status !== 'processing') return local;
                        return remote;
                    });
                    // Also include any local events not yet in Firestore (just added)
                    for (const local of prev) {
                        if (!merged.some(e => e.id === local.id)) merged.push(local);
                    }
                    return merged;
                });
            }
            setLoading(false);
        });
        const unsubAvail = subscribeToGameAvailability(gameDocId, setAvailabilityState);
        return () => { unsubGame(); unsubAvail(); };
    }, [gameDocId]);

    // Initial wizard step
    useEffect(() => {
        if (!game || didSetInitialStep.current) return;
        didSetInitialStep.current = true;
        if (game.status === 'completed') setWizardStep(4);
        else if (game.matchEndedAt) setWizardStep(4);
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

    // Waitlist computation
    const effectiveFormat = resolveGameFormat(game, league);
    const waitlist = useMemo<WaitlistResult>(
        () => computeWaitlist(availablePlayers, maybePlayers, guestsAvailable, guestsMaybe, effectiveFormat),
        [availablePlayers, maybePlayers, guestsAvailable, guestsMaybe, effectiveFormat],
    );
    const availabilityPlayerIds = [
        ...availablePlayers.map(a => a.userId),
        ...guestsAvailable.map(makeGuestId),
        ...guestsMaybe.map(makeGuestId),
    ];
    // For completed/in-progress games, include attendees so historical scoring isn't lost
    const allPlayerIds = (game?.status === 'completed' || game?.status === 'in_progress') && game?.attendees?.length
        ? [...new Set([...availabilityPlayerIds, ...game.attendees])]
        : availabilityPlayerIds;

    // Auto-calculate score from goal tallies (handles og: prefix for own goals)
    const computedScores = useMemo(() => {
        if (!generatedTeams || generatedTeams.length < 2 || goalScorers.length === 0) return null;
        const team0Ids = new Set(generatedTeams[0].players.map(p => p.playerId ?? p.name));
        let s1 = 0;
        let s2 = 0;
        for (const g of goalScorers) {
            if (g.playerId.startsWith('og:')) {
                // Own goal: the real scorer's team CONCEDES, so the other team gets the goal
                const realId = g.playerId.slice(3);
                if (team0Ids.has(realId)) {
                    s2 += g.goals; // team 0 player scored OG → team 1 gets the goal
                } else {
                    s1 += g.goals; // team 1 player scored OG → team 0 gets the goal
                }
            } else if (team0Ids.has(g.playerId)) {
                s1 += g.goals;
            } else {
                s2 += g.goals;
            }
        }
        return { team1: s1, team2: s2 };
    }, [goalScorers, generatedTeams]);

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
            const result = generateTeamsFromText(text, places, lastNumbers, effectiveFormat.minPlayers, effectiveFormat.maxPlayers);
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
    }, [places, playerNumbers, availability, game?.guestPlayers, effectiveFormat.minPlayers, effectiveFormat.maxPlayers]);

    const generateFromAvailable = useCallback((count = 3) => {
        const positions = game?.playerPositions ?? {};
        const withTag = (displayName: string, playerId: string) => {
            const tag = positions[playerId];
            return tag ? `${displayName} #${tag}` : displayName;
        };
        // Only include players who are "in" (not waitlisted)
        const names = waitlist.inPlayers.map(p => withTag(p.displayName, p.id));
        const playerList = names.join('\n');
        setPlayersText(playerList);
        addSetup(playerList, count);
    }, [waitlist.inPlayers, game?.playerPositions, addSetup]);

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

    const handleGoalChange = async (playerId: string, delta: number, goalTimeSec?: number) => {
        if (!gameDocId) return;
        // Auto-calculate goal time if match has started and no explicit time given
        const effectiveTimeSec = goalTimeSec ?? (
            game?.matchStartedAt && delta > 0
                ? Math.floor((Date.now() - game.matchStartedAt - (game.totalPausedMs ?? 0)) / 1000)
                : undefined
        );
        const existing = goalScorers.find(g => g.playerId === playerId);
        let updated: GoalScorer[];
        if (existing) {
            const newGoals = Math.max(0, existing.goals + delta);
            if (newGoals === 0) {
                updated = goalScorers.filter(g => g.playerId !== playerId);
            } else {
                updated = goalScorers.map(g => {
                    if (g.playerId !== playerId) return g;
                    const times = [...(g.goalTimes ?? [])];
                    if (delta > 0 && effectiveTimeSec !== undefined) {
                        times.push(effectiveTimeSec);
                    } else if (delta < 0 && times.length > 0) {
                        times.pop();
                    }
                    return { ...g, goals: newGoals, goalTimes: times.length > 0 ? times : undefined };
                });
            }
        } else {
            if (delta <= 0) return;
            const goalTimes = effectiveTimeSec !== undefined ? [effectiveTimeSec] : undefined;
            updated = [...goalScorers, { playerId, goals: delta, goalTimes }];
        }
        setGoalScorers(updated);
        await updateGameGoalScorers(gameDocId, updated);
    };

    const handleStartMatch = async () => {
        if (!gameDocId) return;
        const now = Date.now();
        await updateMatchStartedAt(gameDocId, now);
    };

    const handlePauseMatch = async () => {
        if (!gameDocId || !game?.matchStartedAt) return;
        const now = Date.now();
        await updateMatchPaused(gameDocId, now, game.totalPausedMs ?? 0);
    };

    const handleResumeMatch = async () => {
        if (!gameDocId || !game?.matchPausedAt) return;
        const additionalPaused = Date.now() - game.matchPausedAt;
        const newTotalPaused = (game.totalPausedMs ?? 0) + additionalPaused;
        await updateMatchResumed(gameDocId, newTotalPaused);
    };

    const handleEndMatch = async () => {
        if (!gameDocId) return;
        const now = Date.now();
        // Single atomic write: finalise paused time + set ended timestamp
        const finalPausedMs = game?.matchPausedAt
            ? (game.totalPausedMs ?? 0) + (now - game.matchPausedAt)
            : undefined;
        await updateMatchEnded(gameDocId, now, finalPausedMs);
        // Auto-fill scores from goal tallies if not manually set
        if (computedScores && score1 === '' && score2 === '') {
            setScore1(String(computedScores.team1));
            setScore2(String(computedScores.team2));
        }
        setWizardStep(4);
    };

    const handleRestartTimer = async () => {
        if (!gameDocId) return;
        const now = Date.now();
        await updateMatchStartedAt(gameDocId, now);
        // Reset paused time
        await updateMatchResumed(gameDocId, 0);
    };

    const handleUndoEnd = async () => {
        if (!gameDocId) return;
        await clearMatchEnded(gameDocId);
        setWizardStep(3);
    };

    const handleAddMatchEvents = async (newEvents: MatchEvent[]) => {
        if (!gameDocId) return;
        let updated: MatchEvent[] = [];
        setMatchEvents(prev => { updated = [...prev, ...newEvents]; return updated; });
        await updateGameMatchEvents(gameDocId, updated);
    };

    const handleReplaceMatchEvent = async (oldId: string, newEvents: MatchEvent[]) => {
        if (!gameDocId) return;
        let updated: MatchEvent[] = [];
        setMatchEvents(prev => { updated = [...prev.filter(e => e.id !== oldId), ...newEvents]; return updated; });
        await updateGameMatchEvents(gameDocId, updated);
    };

    const handleUpdateMatchEvent = async (eventId: string, updates: Partial<MatchEvent>) => {
        if (!gameDocId) return;
        let updated: MatchEvent[] = [];
        setMatchEvents(prev => {
            // Don't update if the event doesn't exist locally (prevents writing empty array)
            if (!prev.some(e => e.id === eventId)) return prev;
            updated = prev.map(e => e.id === eventId ? { ...e, ...updates } : e);
            return updated;
        });
        if (updated.length > 0) await updateGameMatchEvents(gameDocId, updated);
    };

    const handleDeleteMatchEvent = async (eventId: string) => {
        if (!gameDocId) return;
        let updated: MatchEvent[] = [];
        setMatchEvents(prev => {
            updated = prev.filter(e => e.id !== eventId);
            return updated;
        });
        await updateGameMatchEvents(gameDocId, updated);
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
        if (!newMotm) setMotmNotes('');
        await updateGameMotm(gameDocId, newMotm || null);
        if (!newMotm) await updateMotmNotes(gameDocId, '');
    };

    const handleMotmNotesChange = async (notes: string) => {
        if (!gameDocId) return;
        setMotmNotes(notes);
        await updateMotmNotes(gameDocId, notes);
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
        effectiveFormat, waitlist,
        playersText, generatedTeams, pendingSetups, genError,
        score1, score2, selectedPlayer,
        weather, weatherLoading,
        leagueMembers, lookup,
        newGuestName, goalScorers, assisters, motm, motmNotes, computedScores, matchEvents,
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
        handleAddGuest, handleGoalChange, handleAssistChange, handleAddMatchEvents, handleReplaceMatchEvent, handleUpdateMatchEvent, handleDeleteMatchEvent, handleStartMatch, handlePauseMatch, handleResumeMatch, handleRestartTimer, handleEndMatch, handleUndoEnd,
        handleSetMotm, handleMotmNotesChange, handleSaveScore, handleReopen,
        handleToggleAttendee, handleSaveGameCost,
        handleGuestStatusChange, handlePositionToggle,
        handlePlayerClick,
    };
}
