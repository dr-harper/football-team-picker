import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { describeWeatherCode } from '../utils/weather';
import { exportImage, shareImage, ImageHeader } from '../utils/imageExport';
import { shareResultsImage, exportResultsImage, ResultsImageData } from '../utils/resultsImage';
import ScoringControls from './game/ScoringControls';
import AttendanceSection from './game/AttendanceSection';
import GameHeader from './game/GameHeader';
import WizardProgressBar from './game/WizardProgressBar';
import AvailabilityStep from './game/AvailabilityStep';
import TeamsStep from './game/TeamsStep';
import MatchStep from './game/MatchStep';
import CompletedGameView from './game/CompletedGameView';
import GameHealthCard from '../components/GameHealthCard';
import { useGameState } from './game/useGameState';

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
        playersText, generatedTeams, pendingSetups, genError,
        score1, score2, selectedPlayer,
        weather, weatherLoading,
        leagueMembers, lookup,
        newGuestName, goalScorers, assisters, motm,
        isExporting, setIsExporting,
        wizardStep, setWizardStep,
        attendees, editingCost, costInput, showTextarea,
        setPlayersText, setScore1, setScore2,
        setNewGuestName, setCostInput, setEditingCost,
        setShowTextarea,
        handleSetAvailability, handleAdminSetAvailability,
        generateFromAvailable, handleGenerateFromText,
        handlePickSetup, handleDeleteSetup, handleColorChange,
        handleAddGuest, handleGoalChange, handleAssistChange,
        handleSetMotm, handleSaveScore, handleReopen,
        handleToggleAttendee, handleSaveGameCost,
        handleGuestStatusChange, handlePositionToggle,
        handlePlayerClick,
    } = state;

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
            lookup,
            enableAssists,
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

    const scoringControlsElement = (
        <ScoringControls
            allPlayerIds={allPlayerIds}
            lookup={lookup}
            goalScorers={goalScorers}
            assisters={assisters}
            motm={motm}
            enableAssists={enableAssists}
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
                        onPlayersTextChange={setPlayersText} onToggleTextarea={() => setShowTextarea(t => !t)}
                        onGenerateFromAvailable={generateFromAvailable} onGenerateFromText={handleGenerateFromText}
                        onPickSetup={handlePickSetup} onDeleteSetup={handleDeleteSetup}
                        onColorChange={handleColorChange} onPlayerClick={handlePlayerClick}
                        onShare={handleShare} onExport={handleExport}
                        onBack={() => setWizardStep(1)}
                    />
                )}

                {!isCompleted && wizardStep === 3 && (
                    <MatchStep
                        game={game} generatedTeams={generatedTeams} isAdmin={isAdmin} isPast={isPast}
                        score1={score1} score2={score2} isExporting={isExporting}
                        selectedPlayer={selectedPlayer} allPlayerIds={allPlayerIds}
                        scoringControlsElement={scoringControlsElement}
                        attendanceSectionElement={attendanceSectionElement}
                        onScore1Change={setScore1} onScore2Change={setScore2}
                        onSaveScore={handleSaveScore} onPlayerClick={handlePlayerClick}
                        onShare={handleShare} onExport={handleExport}
                        onBack={() => setWizardStep(2)} onGoToTeams={() => setWizardStep(2)}
                        lookup={lookup}
                    />
                )}

                <GameHealthCard gameDate={game.date} gameStatus={game.status} matchDurationMinutes={league?.matchDurationMinutes ?? 60} />

                {isCompleted && generatedTeams && generatedTeams.length === 2 && (
                    <CompletedGameView
                        game={game} generatedTeams={generatedTeams} isAdmin={isAdmin}
                        goalScorers={goalScorers} assisters={assisters} motm={motm}
                        lookup={lookup} allPlayerIds={allPlayerIds} selectedPlayer={selectedPlayer}
                        scoringControlsElement={scoringControlsElement}
                        attendanceSectionElement={attendanceSectionElement}
                        isExporting={isExporting} enableAssists={enableAssists} leagueName={league?.name}
                        onPlayerClick={handlePlayerClick} onReopen={handleReopen}
                        onShareResults={handleShareResults} onExportResults={handleExportResults}
                    />
                )}
            </div>
        </div>
    );
};

export default GamePage;
