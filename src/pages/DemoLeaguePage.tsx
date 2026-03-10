import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, BarChart3, PoundSterling, Zap, Shuffle } from 'lucide-react';
import { demoLeague, demoCompletedGames, demoUpcomingGames, demoAvailability, demoGeneratedTeams } from '../data/demoData';
import { computeGameStats } from './league/statsUtils';
import CompletedTab from './league/CompletedTab';
import StatsTab from './league/StatsTab';
import FinanceTab from './league/FinanceTab';
import AvailabilityList from './game/AvailabilityList';
import TeamSetupCard from '../components/TeamSetupCard';
import DemoTour, { TourStep } from '../components/DemoTour';

type DemoTab = 'gameday' | 'completed' | 'stats' | 'finance';

const tourSteps: TourStep[] = [
    {
        title: 'Welcome to Thursday Night FC',
        description: '16 mates, every Thursday, 7-a-side. This is what your league looks like after a few weeks of games. Let\'s walk through it.',
        tab: 'gameday',
    },
    {
        title: 'Players respond with availability',
        description: '12 players are in, 2 are maybe, 2 can\'t make it. A guest ringer has been added. Positions are tagged so the algorithm knows who plays where.',
        tab: 'gameday',
    },
    {
        title: 'Generate balanced teams',
        description: 'One tap splits the available players into fair teams, respecting positions. Each team gets a goalkeeper, defenders, and forwards. You can swap players or regenerate.',
        tab: 'gameday',
    },
    {
        title: 'Record results after the game',
        description: 'Log the final score, who scored, assists, and pick a Man of the Match. Everything feeds into the season stats automatically.',
        tab: 'completed',
    },
    {
        title: 'Track stats across the season',
        description: 'Full leaderboards for goals, assists, win rate, clean sheets, and MOTM awards. See who\'s on form and who needs to step up.',
        tab: 'stats',
    },
    {
        title: 'Keep track of who owes what',
        description: 'Set a cost per game, record payments, and see running balances. No more chasing people on WhatsApp for pitch money.',
        tab: 'finance',
    },
    {
        title: 'Ready to get started?',
        description: 'Create your own league in seconds. Add your mates with a join code and start organising games the easy way.',
        tab: 'finance',
    },
];

const DemoLeaguePage: React.FC = () => {
    const navigate = useNavigate();
    const [tab, setTab] = useState<DemoTab>('gameday');
    const [tourStep, setTourStep] = useState(0);
    const [showTour, setShowTour] = useState(true);
    const [showTeams, setShowTeams] = useState(false);
    const stats = computeGameStats(demoCompletedGames);

    const upcomingGame = demoUpcomingGames[0];
    const available = demoAvailability.filter(a => a.status === 'available');
    const maybe = demoAvailability.filter(a => a.status === 'maybe');
    const unavailable = demoAvailability.filter(a => a.status === 'unavailable');
    const guestNames = upcomingGame.guestPlayers ?? [];
    const guestStatusMap = upcomingGame.guestAvailability ?? {};
    const positionMap: Record<string, string> = upcomingGame.playerPositions ?? {};

    // Fake league members for the "no response" rows
    const demoLeagueMembers = demoAvailability.map(a => ({
        id: a.userId,
        displayName: a.displayName,
        email: '',
    }));
    const guestsAvailable = guestNames.filter(n => (guestStatusMap[n] ?? 'available') === 'available');
    const totalAvailable = available.length + guestsAvailable.length;

    // When tour step changes, switch to the right tab
    useEffect(() => {
        if (!showTour) return;
        const step = tourSteps[tourStep];
        if (step.tab) setTab(step.tab as DemoTab);
        // Show teams on step 2 (generate teams step)
        setShowTeams(tourStep >= 2);
    }, [tourStep, showTour]);

    const handleStepChange = (step: number) => {
        if (step >= 0 && step < tourSteps.length) {
            setTourStep(step);
        }
    };

    const tabs: { id: DemoTab; label: string; icon: React.ReactNode }[] = [
        { id: 'gameday', label: 'Game Day', icon: <Zap className="w-4 h-4" /> },
        { id: 'completed', label: 'Results', icon: <Trophy className="w-4 h-4" /> },
        { id: 'stats', label: 'Stats', icon: <BarChart3 className="w-4 h-4" /> },
        { id: 'finance', label: 'Finance', icon: <PoundSterling className="w-4 h-4" /> },
    ];

    return (
        <div className={`min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-700 dark:from-green-950 dark:via-green-900 dark:to-green-800 ${showTour ? 'pb-40' : ''}`}>
            {/* Header */}
            <header className="bg-green-900 dark:bg-green-950 text-white p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <button onClick={() => navigate('/')} className="text-white shrink-0 p-1 hover:bg-white/10 rounded-lg transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-xl">{demoLeague.name}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">Demo</span>
                        </div>
                        <div className="text-green-300 text-xs">{demoLeague.defaultVenue}</div>
                    </div>
                </div>
                <button
                    onClick={() => navigate('/auth?mode=signup')}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-white text-green-900 hover:bg-green-50 transition-colors"
                >
                    Create your own
                </button>
            </header>

            <div className="p-4 sm:p-6">
                {/* Tabs */}
                <div className="max-w-4xl mx-auto mb-4">
                    <div className="flex gap-1 bg-white/5 rounded-xl p-1">
                        {tabs.map(t => (
                            <button
                                key={t.id}
                                onClick={() => {
                                    setTab(t.id);
                                    if (showTour) setShowTour(false);
                                }}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    tab === t.id
                                        ? 'bg-white/15 text-white'
                                        : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                                }`}
                            >
                                {t.icon}
                                <span className="hidden sm:inline">{t.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tab content */}
                <div className="max-w-4xl mx-auto">
                    {tab === 'gameday' && (
                        <div className="space-y-4">
                            {/* Game header */}
                            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                                <div className="flex items-center justify-between mb-1">
                                    <div className="text-white font-bold text-lg">{upcomingGame.title}</div>
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">
                                        Thursday
                                    </span>
                                </div>
                                <div className="text-green-300 text-sm">
                                    {new Date(upcomingGame.date).toLocaleDateString('en-GB', {
                                        weekday: 'long', day: 'numeric', month: 'long',
                                        hour: '2-digit', minute: '2-digit',
                                    })}
                                </div>
                                <div className="text-white/40 text-xs mt-0.5">{upcomingGame.location}</div>
                            </div>

                            {/* Availability */}
                            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-5">
                                <div className="flex gap-4 text-xs mb-2">
                                    <span className="text-green-400">{totalAvailable} in</span>
                                    <span className="text-yellow-400">{maybe.length} maybe</span>
                                    <span className="text-red-400">{unavailable.length} out</span>
                                </div>
                                <AvailabilityList
                                    availablePlayers={available}
                                    maybePlayers={maybe}
                                    unavailablePlayers={unavailable}
                                    guestPlayers={guestNames}
                                    guestStatusMap={guestStatusMap}
                                    positionMap={positionMap}
                                    leagueMembers={demoLeagueMembers}
                                    availability={demoAvailability}
                                    isAdmin={false}
                                    currentUserId=""
                                    gameDocId={null}
                                    onSetAvailability={() => {}}
                                    onAdminSetAvailability={() => {}}
                                    onGuestStatusChange={() => {}}
                                    onPositionToggle={() => {}}
                                    onSetMemberAvailability={() => {}}
                                />
                            </div>

                            {/* Generate teams */}
                            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-5">
                                <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                                    <Shuffle className="w-5 h-5" /> Generate Teams
                                </h2>
                                {!showTeams ? (
                                    <button
                                        onClick={() => setShowTeams(true)}
                                        className="w-full bg-green-600 hover:bg-green-500 text-white rounded-lg flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors"
                                    >
                                        <Shuffle className="w-4 h-4" /> Generate from available ({totalAvailable})
                                    </button>
                                ) : (
                                    <TeamSetupCard
                                        setup={demoGeneratedTeams}
                                        setupIndex={0}
                                        totalSetups={1}
                                        selectedPlayer={null}
                                        onPlayerClick={() => {}}
                                        onDelete={() => {}}
                                        onColorChange={() => {}}
                                    />
                                )}
                            </div>
                        </div>
                    )}

                    {tab === 'completed' && (
                        <CompletedTab
                            code="DEMO01"
                            league={demoLeague}
                            completedGames={demoCompletedGames}
                            scorerTotals={stats.scorerTotals}
                            motmTotals={stats.motmTotals}
                        />
                    )}

                    {tab === 'stats' && (
                        <StatsTab
                            completedGames={demoCompletedGames}
                            myName=""
                            user={null}
                        />
                    )}

                    {tab === 'finance' && (
                        <FinanceTab
                            league={demoLeague}
                            leagueId="demo-league"
                            completedGames={demoCompletedGames}
                            myName=""
                            isAdmin={true}
                            onRecordPayment={async () => {}}
                            onApproveExpense={async () => {}}
                            onRejectExpense={async () => {}}
                            onSaveDefaultCost={async () => {}}
                        />
                    )}
                </div>
            </div>

            {/* Tour overlay */}
            {showTour && (
                <DemoTour
                    steps={tourSteps}
                    currentStep={tourStep}
                    onStepChange={handleStepChange}
                    onDismiss={() => setShowTour(false)}
                />
            )}
        </div>
    );
};

export default DemoLeaguePage;
