import React, { useEffect, useCallback, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { describeWeatherCode } from '../utils/weather';
import { exportImage, shareImage, ImageHeader } from '../utils/imageExport';
import { shareResultsImage, exportResultsImage, ResultsImageData } from '../utils/resultsImage';
import ScoringControls from './game/ScoringControls';
import AttendanceSection from './game/AttendanceSection';
import ScoringTable from './game/ScoringTable';
import GameHeader from './game/GameHeader';
import WizardProgressBar from './game/WizardProgressBar';
import AvailabilityStep from './game/AvailabilityStep';
import TeamsStep from './game/TeamsStep';
import MatchStep from './game/MatchStep';
import ResultsStep from './game/ResultsStep';
import CompletedGameView from './game/CompletedGameView';
import GameHealthCard from '../components/GameHealthCard';
import SharedHealthCards from '../components/SharedHealthCards';
import { useGameState } from './game/useGameState';
import { makeGuestId } from '../utils/playerLookup';
import { sendGameToWatch, addWatchMessageListener, sendMatchStateToWatch } from '../utils/wear';
import { updateMatchStartedAt, updateMatchPaused, updateMatchResumed, updateMatchEnded } from '../utils/firestore';
import { parseVoiceTranscript } from '../utils/voiceEventParser';
import { generateMatchSummary } from '../utils/matchSummary';
import { updateGameMatchSummary } from '../utils/firestore';
import { MatchEvent } from '../types';

const WIZARD_STEPS = [
    { num: 1 as const, label: 'Availability' },
    { num: 2 as const, label: 'Teams' },
    { num: 3 as const, label: 'Live' },
    { num: 4 as const, label: 'Results' },
];

const GamePage: React.FC = () => {
    const { id: rawId } = useParams<{ id: string }>();
    const { user } = useAuth();
    const navigate = useNavigate();
    const { places, activeGeminiKey } = useSettings();

    const state = useGameState({
        rawId,
        userId: user?.uid,
        userDisplayName: user?.displayName,
        userEmail: user?.email,
        places,
    });

    const {
        game, league, loading,
        gameDocId, availability, myAvailability,
        availablePlayers, maybePlayers, unavailablePlayers,
        guestsAvailable, guestsMaybe, guestsUnavailable,
        guestStatusMap, positionMap, totalAvailable, allPlayerIds,
        waitlist,
        playersText, generatedTeams, pendingSetups, genError,
        score1, score2, selectedPlayer,
        weather, weatherLoading,
        leagueMembers, lookup,
        newGuestName, goalScorers, assisters, motm, motmNotes, computedScores, matchEvents,
        isExporting, setIsExporting,
        wizardStep, setWizardStep,
        attendees, editingCost, costInput, showTextarea,
        setPlayersText, setScore1, setScore2,
        setNewGuestName, setCostInput, setEditingCost,
        setShowTextarea,
        handleSetAvailability, handleAdminSetAvailability,
        generateFromAvailable, handleGenerateFromText,
        handlePickSetup, handleDeleteSetup, handleColorChange,
        handleAddGuest, handleGoalChange, handleAssistChange, handleAddMatchEvents, handleUpdateMatchEvent, handleDeleteMatchEvent, handleStartMatch, handlePauseMatch, handleResumeMatch, handleRestartTimer, handleEndMatch, handleUndoEnd,
        handleSetMotm, handleMotmNotesChange, handleSaveScore, handleReopen, handleCompleteWithoutScore,
        handleToggleAttendee, handleSaveGameCost,
        handleGuestStatusChange, handlePositionToggle,
        handlePlayerClick,
    } = state;

    const sendGameDataToWatch = useCallback(async (matchStarted = false) => {
        if (!game || !generatedTeams || generatedTeams.length < 2) return;
        const team1 = generatedTeams[0];
        const team2 = generatedTeams[1];
        await sendGameToWatch({
            gameId: game.id,
            title: game.title || '',
            team1Name: team1.name || 'Team 1',
            team2Name: team2.name || 'Team 2',
            team1Colour: team1.color || '#22C55E',
            team2Colour: team2.color || '#3B82F6',
            team1Players: team1.players.map(p => p.name),
            team2Players: team2.players.map(p => p.name),
            score1: score1 !== '' ? Number(score1) : (computedScores?.team1 ?? 0),
            score2: score2 !== '' ? Number(score2) : (computedScores?.team2 ?? 0),
            startedAt: game.matchStartedAt ?? 0,
            matchStarted,
            totalPausedMs: game.totalPausedMs ?? 0,
            pausedAt: game.matchPausedAt ?? 0,
            matchEnded: !!game.matchEndedAt,
        });
    }, [game, generatedTeams, score1, score2, computedScores]);

    const handleSendToWatch = async () => {
        await sendGameDataToWatch(!!game?.matchStartedAt);
    };

    // Track watch-originated scores to avoid echoing them back
    const watchScoreRef = useRef<{ s1: number; s2: number } | null>(null);
    // Defer /game/score processing so /game/goal can cancel it (avoids double-counting)
    const pendingScoreRef = useRef<{ s1: number; s2: number; timer: ReturnType<typeof setTimeout> } | null>(null);
    // Track last scores sent to watch to avoid redundant sends
    const lastSentScoreRef = useRef<string>('');

    // Sync scores phone→watch whenever they change during an active match
    useEffect(() => {
        if (!game?.matchStartedAt || !game?.id) return;
        const s1 = score1 !== '' ? Number(score1) : (computedScores?.team1 ?? 0);
        const s2 = score2 !== '' ? Number(score2) : (computedScores?.team2 ?? 0);
        const key = `${s1}:${s2}`;
        // Don't echo back if this score came from the watch
        if (watchScoreRef.current && watchScoreRef.current.s1 === s1 && watchScoreRef.current.s2 === s2) {
            watchScoreRef.current = null;
            lastSentScoreRef.current = key;
            return;
        }
        // Don't re-send if already sent
        if (lastSentScoreRef.current === key) return;
        lastSentScoreRef.current = key;
        sendMatchStateToWatch({ gameId: game.id, state: 'scoreUpdate', score1: s1, score2: s2 });
    }, [score1, score2, computedScores, game?.matchStartedAt, game?.id]);

    // Listen for watch messages (score updates, goals, end game)
    const handleWatchMessage = useCallback(async (path: string, data: string) => {
        if (!game || !gameDocId) return;

        // Only handle messages for this game
        const parts = data.split('|');
        const messageGameId = (path === '/game/end') ? data.trim() : parts[0];
        if (messageGameId !== game.id) return;

        // Voice notes don't require teams
        if (path === '/game/voice') {
            const pipeIdx = data.indexOf('|');
            if (pipeIdx > 0) {
                const transcript = data.substring(pipeIdx + 1);
                const totalPaused = game.totalPausedMs ?? 0;
                const elapsedSec = game.matchStartedAt
                    ? Math.floor((Date.now() - game.matchStartedAt - totalPaused) / 1000)
                    : undefined;

                // Save immediately as a processing note so it appears in the UI
                const placeholderId = crypto.randomUUID();
                const placeholder: MatchEvent = {
                    id: placeholderId,
                    type: 'note',
                    transcript,
                    elapsedSec,
                    source: 'voice',
                    status: 'processing',
                    createdAt: Date.now(),
                };
                handleAddMatchEvents([placeholder]);

                // Parse in background if teams exist, otherwise keep as note
                if (generatedTeams && generatedTeams.length >= 2) {
                    const roster = generatedTeams.flatMap(t =>
                        t.players.map(p => ({ playerId: p.playerId ?? p.name, displayName: p.name }))
                    );
                    parseVoiceTranscript(transcript, roster, elapsedSec, activeGeminiKey || undefined).then(result => {
                        // Merge parsed events into one card
                        // Goal+assist merge into a single event; other types use the primary event
                        const primary = result.events[0];
                        if (!primary) return;

                        let mergedType = primary.type;
                        let mergedPlayerId = primary.playerId;
                        let mergedAssisterId = primary.assisterId;
                        const mergedSwappedWithId = primary.swappedWithId;
                        const mergedCardColour = primary.cardColour;
                        let mergedDescription = primary.description;

                        // If multiple events, merge assist into goal
                        for (let i = 1; i < result.events.length; i++) {
                            const evt = result.events[i];
                            if (evt.type === 'goal' && mergedType !== 'goal') {
                                mergedType = 'goal';
                                mergedPlayerId = evt.playerId ?? mergedPlayerId;
                                mergedAssisterId = evt.assisterId ?? mergedAssisterId;
                                mergedDescription = evt.description ?? mergedDescription;
                            }
                        }

                        handleUpdateMatchEvent(placeholderId, {
                            type: mergedType,
                            playerId: mergedPlayerId,
                            assisterId: mergedAssisterId,
                            swappedWithId: mergedSwappedWithId,
                            cardColour: mergedCardColour,
                            description: mergedDescription,
                            status: 'applied',
                        });

                        // Apply goal and assist to the scoreboard
                        if (mergedType === 'goal' && mergedPlayerId) {
                            handleGoalChange(mergedPlayerId, 1, elapsedSec);
                        }
                        if (mergedAssisterId) {
                            handleAssistChange(mergedAssisterId, 1);
                        }
                    }).catch(() => {
                        handleUpdateMatchEvent(placeholderId, { status: 'parsed' });
                    });
                } else {
                    // No teams — just mark as parsed note
                    handleUpdateMatchEvent(placeholderId, { status: 'parsed' });
                }
            }
            return;
        }

        // All other messages require teams
        if (!generatedTeams || generatedTeams.length < 2) return;

        switch (path) {
            case '/game/start': {
                // data: "gameId|startedAtMs"
                if (parts.length >= 2) {
                    const startedAt = parseInt(parts[1]);
                    if (!isNaN(startedAt)) {
                        await updateMatchStartedAt(gameDocId, startedAt);
                        // Echo back authoritative timestamp so watch uses identical value
                        sendGameDataToWatch(true);
                    }
                }
                break;
            }
            case '/game/score': {
                // The watch sends /game/score (absolute) for ALL goals, then /game/goal
                // (with scorer name) for named goals. To avoid double-counting:
                // - Named goals: /game/goal fires handleGoalChange → computedScores updates
                // - Unknown scorer goals: only /game/score arrives, so we apply it here
                // We defer processing briefly: if a /game/goal arrives within 200ms, skip this.
                if (parts.length === 3) {
                    const s1 = parseInt(parts[1]) || 0;
                    const s2 = parseInt(parts[2]) || 0;
                    watchScoreRef.current = { s1, s2 };
                    pendingScoreRef.current = { s1, s2, timer: setTimeout(() => {
                        // Only apply if no /game/goal arrived to handle it
                        if (pendingScoreRef.current) {
                            setScore1(String(pendingScoreRef.current.s1));
                            setScore2(String(pendingScoreRef.current.s2));
                            pendingScoreRef.current = null;
                        }
                    }, 200) };
                }
                break;
            }
            case '/game/goal': {
                // Named goal — handleGoalChange updates goalScorers → computedScores.
                // Cancel any pending /game/score since this handles the scoring.
                if (pendingScoreRef.current) {
                    clearTimeout(pendingScoreRef.current.timer);
                    pendingScoreRef.current = null;
                }
                if (parts.length >= 3) {
                    const scorerName = parts[2];
                    const allPlayers = generatedTeams.flatMap(t => t.players);
                    const player = allPlayers.find(p => p.name === scorerName);
                    const playerId = player?.playerId ?? `guest:${scorerName}`;
                    const elapsedSec = parts.length >= 4 ? parseInt(parts[3]) : undefined;
                    const goalTimeSec = elapsedSec !== undefined && !isNaN(elapsedSec) ? elapsedSec : undefined;
                    handleGoalChange(playerId, 1, goalTimeSec);
                }
                break;
            }
            case '/game/pause': {
                // data: "gameId|pausedAtMs"
                if (parts.length >= 2) {
                    const pausedAt = parseInt(parts[1]);
                    if (!isNaN(pausedAt)) {
                        updateMatchPaused(gameDocId, pausedAt, game.totalPausedMs ?? 0);
                    }
                }
                break;
            }
            case '/game/resume': {
                // data: "gameId|totalPausedMs"
                if (parts.length >= 2) {
                    const totalPaused = parseInt(parts[1]);
                    if (!isNaN(totalPaused)) {
                        updateMatchResumed(gameDocId, totalPaused);
                    }
                }
                break;
            }
            case '/game/undo-goal': {
                // data: "gameId|team|newScore1|newScore2"
                if (parts.length >= 4) {
                    const team = parseInt(parts[1]);
                    const s1 = parseInt(parts[2]);
                    const s2 = parseInt(parts[3]);
                    watchScoreRef.current = { s1, s2 };
                    // Remove the last goal from the specified team
                    if (!isNaN(team)) {
                        const teamIndex = team - 1;
                        // Find the last scorer on this team and decrement
                        const teamPlayers = generatedTeams[teamIndex]?.players ?? [];
                        const teamPlayerIds = teamPlayers.map(p => p.playerId ?? p.name);
                        // Find last goal scorer on this team (by most recent goal time)
                        const teamScorers = goalScorers
                            .filter(gs => teamPlayerIds.includes(gs.playerId) && gs.goals > 0)
                            .sort((a, b) => {
                                const aMax = Math.max(...(a.goalTimes ?? [0]));
                                const bMax = Math.max(...(b.goalTimes ?? [0]));
                                return bMax - aMax;
                            });
                        if (teamScorers.length > 0) {
                            handleGoalChange(teamScorers[0].playerId, -1);
                        } else {
                            // Fallback: set scores directly
                            if (!isNaN(s1)) setScore1(String(s1));
                            if (!isNaN(s2)) setScore2(String(s2));
                        }
                    }
                }
                break;
            }
            case '/game/end': {
                // data: "gameId|endedAtMs" or just "gameId"
                const endedAt = parts.length >= 2 ? parseInt(parts[1]) : Date.now();
                updateMatchEnded(gameDocId, isNaN(endedAt) ? Date.now() : endedAt);
                handleSaveScore();
                setWizardStep(4);
                break;
            }
        }
    }, [game, gameDocId, generatedTeams, goalScorers, handleGoalChange, handleAssistChange, handleSaveScore, setScore1, setScore2, setWizardStep, sendGameDataToWatch, handleAddMatchEvents, activeGeminiKey, handleUpdateMatchEvent]);

    // Use a ref so the listener doesn't get torn down/recreated on every render
    const watchMessageRef = useRef(handleWatchMessage);
    watchMessageRef.current = handleWatchMessage;

    useEffect(() => {
        let cleanup: (() => void) | null = null;
        addWatchMessageListener((path, data) => watchMessageRef.current(path, data))
            .then(fn => { cleanup = fn; });
        return () => { cleanup?.(); };
    }, []);

    // Auto-send game data to watch when entering Live step with an active match
    useEffect(() => {
        if (wizardStep === 3 && game?.matchStartedAt && generatedTeams && generatedTeams.length >= 2) {
            sendGameDataToWatch(true);
        }
    }, [wizardStep]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleAddStructuredEvent = useCallback((event: MatchEvent) => {
        // Save the event
        handleAddMatchEvents([event]);
        // Apply scoring side effects
        if ((event.type === 'goal' || event.type === 'penalty-scored') && event.playerId) {
            handleGoalChange(event.playerId, 1, event.elapsedSec);
        }
        if (event.type === 'own-goal' && event.playerId && generatedTeams && generatedTeams.length >= 2) {
            // Own goal: use og: prefix so the goal counts for the other team in computedScores
            // Pick a player from the opposing team as proxy — the matchEvent has the real OG scorer
            const ogProxyId = `og:${event.playerId}`;
            handleGoalChange(ogProxyId, 1, event.elapsedSec);
        }
        if (event.assisterId) {
            handleAssistChange(event.assisterId, 1);
        }
    }, [handleAddMatchEvents, handleGoalChange, handleAssistChange, generatedTeams]);

    const handleApplyVoiceEvent = useCallback((event: MatchEvent) => {
        if (event.type === 'goal' && event.playerId) {
            handleGoalChange(event.playerId, 1, event.elapsedSec);
        }
        if (event.type === 'assist' && event.playerId) {
            handleAssistChange(event.playerId, 1);
        }
        handleUpdateMatchEvent(event.id, { status: 'applied' });
    }, [handleGoalChange, handleAssistChange, handleUpdateMatchEvent]);

    const [summaryLoading, setSummaryLoading] = useState(false);

    const handleGenerateSummary = useCallback(async () => {
        if (!game || !gameDocId || !generatedTeams || generatedTeams.length < 2) return;
        setSummaryLoading(true);
        try {
            const summary = await generateMatchSummary(
                game, generatedTeams, goalScorers, matchEvents, lookup, activeGeminiKey || undefined,
            );
            await updateGameMatchSummary(gameDocId, summary);
        } catch (err) {
            console.error('Failed to generate match summary:', err);
        } finally {
            setSummaryLoading(false);
        }
    }, [game, gameDocId, generatedTeams, goalScorers, matchEvents, lookup, activeGeminiKey]);

    // Auto-generate summary when viewing completed game without one
    useEffect(() => {
        if (game?.status === 'completed' && !game.matchSummary && generatedTeams?.length === 2 && gameDocId && !summaryLoading) {
            handleGenerateSummary();
        }
    }, [game?.status, game?.matchSummary, generatedTeams?.length, gameDocId]); // eslint-disable-line react-hooks/exhaustive-deps

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

    const buildResultsData = (): ResultsImageData | null => {
        if (!game || !generatedTeams || generatedTeams.length < 2 || !game.score) return null;
        const { emoji } = weather ? describeWeatherCode(weather.weatherCode) : { emoji: undefined };
        return {
            leagueName: league?.name,
            gameTitle: game.title,
            gameDate: game.date,
            teams: generatedTeams,
            score: game.score,
            goalScorers,
            assisters,
            motm,
            motmNotes,
            lookup,
            enableAssists,
            matchSummary: game.matchSummary,
            weatherEmoji: emoji,
            temperature: weather?.temperature,
            rainProbability: weather?.rainProbability,
        };
    };

    const handleShareResults = async () => {
        const data = buildResultsData();
        if (!data) return;
        setIsExporting(true);
        await shareResultsImage(data);
        setIsExporting(false);
    };

    const handleExportResults = async () => {
        const data = buildResultsData();
        if (!data) return;
        setIsExporting(true);
        await exportResultsImage(data);
        setIsExporting(false);
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

    const enableAssists = league?.enableAssists === true;

    const scoringDisabled = !!game.matchPausedAt && !game.matchEndedAt;

    const scoringControlsElement = (
        <ScoringControls
            allPlayerIds={allPlayerIds}
            lookup={lookup}
            goalScorers={goalScorers}
            assisters={assisters}
            motm={motm}
            motmNotes={motmNotes}
            enableAssists={enableAssists}
            teams={generatedTeams ?? undefined}
            disabled={scoringDisabled}
            onGoalChange={handleGoalChange}
            onAssistChange={handleAssistChange}
            onSetMotm={handleSetMotm}
            onMotmNotesChange={handleMotmNotesChange}
        />
    );

    const liveScoringControlsElement = (
        <ScoringControls
            allPlayerIds={allPlayerIds}
            lookup={lookup}
            goalScorers={goalScorers}
            assisters={assisters}
            motm={motm}
            motmNotes={motmNotes}
            enableAssists={enableAssists}
            teams={generatedTeams ?? undefined}
            disabled={scoringDisabled}
            hideMotm
            hideHeadings
            onGoalChange={handleGoalChange}
            onAssistChange={handleAssistChange}
            onSetMotm={handleSetMotm}
            onMotmNotesChange={handleMotmNotesChange}
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

    // Effective attendees for the unified scoring table
    const defaultAttendeeList = [
        ...availability.filter(a => a.status === 'available').map(a => a.userId),
        ...(game.guestPlayers ?? [])
            .filter(n => (game.guestAvailability ?? {})[n] === 'available' || !(game.guestAvailability ?? {})[n])
            .map(makeGuestId),
    ];
    const effectiveAttendees = attendees ?? defaultAttendeeList;
    const effectiveCost = game.costPerPerson ?? league?.defaultCostPerPerson ?? 0;

    const scoringTableElement = generatedTeams && generatedTeams.length === 2 ? (
        <ScoringTable
            teams={generatedTeams}
            allPlayerIds={allPlayerIds}
            goalScorers={goalScorers}
            assisters={assisters}
            motm={motm}
            motmNotes={motmNotes}
            lookup={lookup}
            enableAssists={enableAssists}
            attendees={effectiveAttendees}
            effectiveCost={effectiveCost}
            editingCost={editingCost}
            costInput={costInput}
            isLeagueDefault={league?.defaultCostPerPerson !== undefined && game.costPerPerson === undefined}
            onGoalChange={handleGoalChange}
            onAssistChange={handleAssistChange}
            onSetMotm={handleSetMotm}
            onMotmNotesChange={handleMotmNotesChange}
            onToggleAttendee={handleToggleAttendee}
            onCostInputChange={setCostInput}
            onEditCost={() => { setCostInput(String(game.costPerPerson ?? league?.defaultCostPerPerson ?? '')); setEditingCost(true); }}
            onSaveCost={handleSaveGameCost}
            onCancelCost={() => setEditingCost(false)}
        />
    ) : null;

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

            <div className="p-4 sm:p-6 space-y-4 pb-20 sm:pb-6">
                <GameHeader game={game} weather={weather} weatherLoading={weatherLoading} isCompleted={isCompleted} />

                {!isCompleted && (
                    <WizardProgressBar steps={WIZARD_STEPS} currentStep={wizardStep} onStepClick={setWizardStep} />
                )}

                {!isCompleted && wizardStep === 1 && (
                    <AvailabilityStep
                        game={game} gameDocId={gameDocId} user={user}
                        availability={availability} myAvailability={myAvailability}
                        availablePlayers={availablePlayers} maybePlayers={maybePlayers} unavailablePlayers={unavailablePlayers}
                        guestsAvailable={guestsAvailable} guestsMaybe={guestsMaybe} guestsUnavailable={guestsUnavailable}
                        guestStatusMap={guestStatusMap} positionMap={positionMap}
                        leagueMembers={leagueMembers} isAdmin={isAdmin}
                        totalAvailable={totalAvailable} newGuestName={newGuestName}
                        waitlist={waitlist}
                        onNewGuestNameChange={setNewGuestName} onAddGuest={handleAddGuest}
                        onSetAvailability={handleSetAvailability} onAdminSetAvailability={handleAdminSetAvailability}
                        onGuestStatusChange={handleGuestStatusChange} onPositionToggle={handlePositionToggle}
                        onNextStep={() => setWizardStep(2)}
                    />
                )}

                {!isCompleted && wizardStep === 2 && (
                    <TeamsStep
                        totalAvailable={totalAvailable} playersText={playersText}
                        showTextarea={showTextarea} genError={genError}
                        pendingSetups={pendingSetups} isExporting={isExporting} isAdmin={isAdmin}
                        selectedPlayer={selectedPlayer}
                        availablePlayers={[
                            ...availablePlayers.map(a => ({ playerId: a.userId, name: a.displayName })),
                            ...(game?.guestPlayers ?? [])
                                .filter(n => (game?.guestAvailability ?? {})[n] !== 'unavailable' && (game?.guestAvailability ?? {})[n] !== 'maybe')
                                .map(n => ({ playerId: `guest:${n}`, name: n })),
                        ]}
                        lookup={lookup}
                        onPlayersTextChange={setPlayersText} onToggleTextarea={() => setShowTextarea(t => !t)}
                        onGenerateFromAvailable={generateFromAvailable} onGenerateFromText={handleGenerateFromText}
                        onPickSetup={handlePickSetup} onDeleteSetup={handleDeleteSetup}
                        onColorChange={handleColorChange} onPlayerClick={handlePlayerClick}
                        onShare={handleShare} onExport={handleExport}
                        onBack={() => setWizardStep(1)}
                        onCompleteWithoutScore={handleCompleteWithoutScore}
                    />
                )}

                {!isCompleted && wizardStep === 3 && (
                    <MatchStep
                        game={game} generatedTeams={generatedTeams} isAdmin={isAdmin}
                        selectedPlayer={selectedPlayer}
                        goalScorers={goalScorers}
                        matchEvents={matchEvents}
                        computedScores={computedScores}
                        scoringControlsElement={liveScoringControlsElement}
                        onPlayerClick={handlePlayerClick}
                        onBack={() => setWizardStep(2)} onNext={() => setWizardStep(4)}
                        onGoToTeams={() => setWizardStep(2)}
                        onSendToWatch={handleSendToWatch}
                        onStartMatch={async () => {
                            await handleStartMatch();
                            await sendGameDataToWatch(true);
                        }}
                        onPauseMatch={async () => {
                            await handlePauseMatch();
                            if (game) sendMatchStateToWatch({ gameId: game.id, state: 'paused', pausedAt: Date.now(), totalPausedMs: game.totalPausedMs ?? 0 });
                        }}
                        onResumeMatch={async () => {
                            const prevPausedAt = game?.matchPausedAt ?? Date.now();
                            const newTotal = (game?.totalPausedMs ?? 0) + (Date.now() - prevPausedAt);
                            await handleResumeMatch();
                            if (game) sendMatchStateToWatch({ gameId: game.id, state: 'resumed', totalPausedMs: newTotal });
                        }}
                        onEndMatch={async () => {
                            await handleEndMatch();
                            if (game) sendMatchStateToWatch({ gameId: game.id, state: 'ended', endedAt: Date.now() });
                        }}
                        onUndoEnd={async () => {
                            await handleUndoEnd();
                            if (game) sendMatchStateToWatch({ gameId: game.id, state: 'resumed', totalPausedMs: game.totalPausedMs ?? 0 });
                        }}
                        onRestartTimer={async () => {
                            await handleRestartTimer();
                            await sendGameDataToWatch(true);
                        }}
                        onOpenOnWatch={() => sendGameDataToWatch(!!game.matchStartedAt)}
                        onGoalChange={handleGoalChange}
                        onApplyVoiceEvent={handleApplyVoiceEvent}
                        onUpdateMatchEvent={handleUpdateMatchEvent}
                        onDeleteMatchEvent={handleDeleteMatchEvent}
                        onAddMatchEvent={handleAddStructuredEvent}
                        lookup={lookup}
                    />
                )}

                {!isCompleted && wizardStep === 4 && (
                    <ResultsStep
                        game={game} generatedTeams={generatedTeams} isAdmin={isAdmin} isPast={isPast}
                        score1={score1} score2={score2} isExporting={isExporting}
                        allPlayerIds={allPlayerIds}
                        scoringControlsElement={scoringControlsElement}
                        attendanceSectionElement={attendanceSectionElement}
                        onScore1Change={setScore1} onScore2Change={setScore2}
                        onSaveScore={handleSaveScore}
                        onShare={handleShare} onExport={handleExport}
                        onBack={() => setWizardStep(3)} onGoToTeams={() => setWizardStep(2)}
                        onCompleteWithoutScore={handleCompleteWithoutScore}
                        onGenerateSummary={handleGenerateSummary} summaryLoading={summaryLoading}
                    />
                )}

                {(isCompleted || wizardStep === 4) && (
                    <>
                        <GameHealthCard
                            gameDate={game.date}
                            gameStatus={game.status}
                            matchDurationMinutes={league?.matchDurationMinutes ?? 60}
                            gameId={game.id}
                            userId={user?.uid}
                            leagueId={game.leagueId}
                        />
                        <SharedHealthCards gameId={game.id} userId={user?.uid} lookup={lookup} />
                    </>
                )}

                {isCompleted && generatedTeams && generatedTeams.length === 2 && (
                    <CompletedGameView
                        game={game} generatedTeams={generatedTeams} isAdmin={isAdmin}
                        goalScorers={goalScorers} assisters={assisters} motm={motm} motmNotes={motmNotes}
                        matchEvents={matchEvents}
                        lookup={lookup} allPlayerIds={allPlayerIds} selectedPlayer={selectedPlayer}
                        scoringTableElement={scoringTableElement}
                        isExporting={isExporting} enableAssists={enableAssists} leagueName={league?.name}
                        onPlayerClick={handlePlayerClick} onReopen={handleReopen}
                        onShareResults={handleShareResults} onExportResults={handleExportResults}
                        onGenerateSummary={handleGenerateSummary} summaryLoading={summaryLoading}
                    />
                )}

            </div>
        </div>
    );
};

export default GamePage;
