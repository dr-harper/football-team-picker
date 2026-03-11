import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
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
import { fetchWeather } from '../utils/weather';
import { exportImage, shareImage, ImageHeader } from '../utils/imageExport';
import { describeWeatherCode } from '../utils/weather';
import ScoringControls from './game/ScoringControls';
import AttendanceSection from './game/AttendanceSection';
import GameHeader from './game/GameHeader';
import WizardProgressBar from './game/WizardProgressBar';
import AvailabilityStep from './game/AvailabilityStep';
import TeamsStep from './game/TeamsStep';
import MatchStep from './game/MatchStep';
import CompletedGameView from './game/CompletedGameView';
import { buildLookup, makeGuestId } from '../utils/playerLookup';

const WIZARD_STEPS = [
    { num: 1 as const, label: 'Availability' },
    { num: 2 as const, label: 'Teams' },
    { num: 3 as const, label: 'Match' },
];

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

    const lookup = buildLookup(leagueMembers);
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
        const nameToId: Record<string, string> = {};
        for (const a of availability) {
            nameToId[a.displayName] = a.userId;
        }
        for (const gn of game?.guestPlayers ?? []) {
            nameToId[gn] = makeGuestId(gn);
        }

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
        const updated = [...current, name];
        setNewGuestName('');
        await updateGameGuests(gameDocId, updated);
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

    const handleGuestStatusChange = async (name: string, status: AvailabilityStatus) => {
        if (!gameDocId || !game) return;
        const updated = { ...(game.guestAvailability ?? {}), [name]: status };
        await updateGuestAvailability(gameDocId, updated);
    };

    const handlePositionToggle = async (playerId: string, pos: 'g' | 'd' | 's') => {
        if (!gameDocId) return;
        const positionMap = game?.playerPositions ?? {};
        const current = positionMap[playerId];
        const updated = current === pos
            ? Object.fromEntries(Object.entries(positionMap).filter(([k]) => k !== playerId))
            : { ...positionMap, [playerId]: pos };
        await updatePlayerPositions(gameDocId, updated);
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
    const positionMap = game.playerPositions ?? {};
    const totalAvailable = availablePlayers.length + guestsAvailable.length;

    const allPlayerIds = [
        ...availablePlayers.map(a => a.userId),
        ...guestsAvailable.map(makeGuestId),
        ...guestsMaybe.map(makeGuestId),
    ];

    const scoringControlsElement = (
        <ScoringControls
            allPlayerIds={allPlayerIds}
            lookup={lookup}
            goalScorers={goalScorers}
            assisters={assisters}
            motm={motm}
            onGoalChange={handleGoalChange}
            onAssistChange={handleAssistChange}
            onSetMotm={handleSetMotm}
        />
    );

    const attendanceSectionElement = (
        <AttendanceSection
            game={game}
            league={league}
            availability={availability}
            attendees={attendees}
            editingCost={editingCost}
            costInput={costInput}
            lookup={lookup}
            onCostInputChange={setCostInput}
            onEditCost={() => { setCostInput(String(game.costPerPerson ?? league?.defaultCostPerPerson ?? '')); setEditingCost(true); }}
            onSaveCost={handleSaveGameCost}
            onCancelCost={() => setEditingCost(false)}
            onToggleAttendee={handleToggleAttendee}
        />
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
                <GameHeader
                    game={game}
                    weather={weather}
                    weatherLoading={weatherLoading}
                    isCompleted={isCompleted}
                />

                {!isCompleted && (
                    <WizardProgressBar
                        steps={WIZARD_STEPS}
                        currentStep={wizardStep}
                        onStepClick={setWizardStep}
                    />
                )}

                {!isCompleted && wizardStep === 1 && (
                    <AvailabilityStep
                        game={game}
                        gameDocId={gameDocId}
                        user={user}
                        availability={availability}
                        myAvailability={myAvailability}
                        availablePlayers={availablePlayers}
                        maybePlayers={maybePlayers}
                        unavailablePlayers={unavailablePlayers}
                        guestsAvailable={guestsAvailable}
                        guestsMaybe={guestsMaybe}
                        guestsUnavailable={guestsUnavailable}
                        guestStatusMap={guestStatusMap}
                        positionMap={positionMap}
                        leagueMembers={leagueMembers}
                        isAdmin={isAdmin}
                        totalAvailable={totalAvailable}
                        newGuestName={newGuestName}
                        onNewGuestNameChange={setNewGuestName}
                        onAddGuest={handleAddGuest}
                        onSetAvailability={handleSetAvailability}
                        onAdminSetAvailability={handleAdminSetAvailability}
                        onGuestStatusChange={handleGuestStatusChange}
                        onPositionToggle={handlePositionToggle}
                        onNextStep={() => setWizardStep(2)}
                    />
                )}

                {!isCompleted && wizardStep === 2 && (
                    <TeamsStep
                        totalAvailable={totalAvailable}
                        playersText={playersText}
                        showTextarea={showTextarea}
                        genError={genError}
                        pendingSetups={pendingSetups}
                        isExporting={isExporting}
                        isAdmin={isAdmin}
                        selectedPlayer={selectedPlayer}
                        onPlayersTextChange={setPlayersText}
                        onToggleTextarea={() => setShowTextarea(t => !t)}
                        onGenerateFromAvailable={generateFromAvailable}
                        onGenerateFromText={handleGenerateFromText}
                        onPickSetup={handlePickSetup}
                        onDeleteSetup={handleDeleteSetup}
                        onColorChange={handleColorChange}
                        onPlayerClick={handlePlayerClick}
                        onShare={handleShare}
                        onExport={handleExport}
                        onBack={() => setWizardStep(1)}
                    />
                )}

                {!isCompleted && wizardStep === 3 && (
                    <MatchStep
                        game={game}
                        generatedTeams={generatedTeams}
                        isAdmin={isAdmin}
                        isPast={isPast}
                        score1={score1}
                        score2={score2}
                        isExporting={isExporting}
                        selectedPlayer={selectedPlayer}
                        allPlayerIds={allPlayerIds}
                        scoringControlsElement={scoringControlsElement}
                        attendanceSectionElement={attendanceSectionElement}
                        onScore1Change={setScore1}
                        onScore2Change={setScore2}
                        onSaveScore={handleSaveScore}
                        onPlayerClick={handlePlayerClick}
                        onShare={handleShare}
                        onExport={handleExport}
                        onBack={() => setWizardStep(2)}
                        onGoToTeams={() => setWizardStep(2)}
                    />
                )}

                {isCompleted && generatedTeams && generatedTeams.length === 2 && (
                    <CompletedGameView
                        game={game}
                        generatedTeams={generatedTeams}
                        isAdmin={isAdmin}
                        goalScorers={goalScorers}
                        assisters={assisters}
                        motm={motm}
                        lookup={lookup}
                        allPlayerIds={allPlayerIds}
                        selectedPlayer={selectedPlayer}
                        scoringControlsElement={scoringControlsElement}
                        attendanceSectionElement={attendanceSectionElement}
                        onPlayerClick={handlePlayerClick}
                        onReopen={handleReopen}
                    />
                )}
            </div>
        </div>
    );
};

export default GamePage;
