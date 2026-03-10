import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, BarChart3, PoundSterling, Calendar, Lock } from 'lucide-react';
import { demoLeague, demoCompletedGames, demoUpcomingGames } from '../data/demoData';
import { computeGameStats } from './league/statsUtils';
import CompletedTab from './league/CompletedTab';
import StatsTab from './league/StatsTab';
import FinanceTab from './league/FinanceTab';

type DemoTab = 'upcoming' | 'completed' | 'stats' | 'finance';

const DemoLeaguePage: React.FC = () => {
    const navigate = useNavigate();
    const [tab, setTab] = useState<DemoTab>('completed');
    const stats = computeGameStats(demoCompletedGames);

    const tabs: { id: DemoTab; label: string; icon: React.ReactNode }[] = [
        { id: 'upcoming', label: 'Upcoming', icon: <Calendar className="w-4 h-4" /> },
        { id: 'completed', label: 'Results', icon: <Trophy className="w-4 h-4" /> },
        { id: 'stats', label: 'Stats', icon: <BarChart3 className="w-4 h-4" /> },
        { id: 'finance', label: 'Finance', icon: <PoundSterling className="w-4 h-4" /> },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-700 dark:from-green-950 dark:via-green-900 dark:to-green-800">
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
                {/* Demo banner */}
                <div className="max-w-4xl mx-auto mb-4">
                    <div className="rounded-xl px-4 py-3 bg-amber-500/10 border border-amber-500/20 text-amber-200 text-sm flex items-center gap-3">
                        <Lock className="w-4 h-4 shrink-0" />
                        <span>
                            This is a demo league with sample data.{' '}
                            <button onClick={() => navigate('/auth?mode=signup')} className="underline hover:text-white transition-colors">
                                Sign up
                            </button>{' '}
                            to create your own and invite your mates.
                        </span>
                    </div>
                </div>

                {/* Tabs */}
                <div className="max-w-4xl mx-auto mb-4">
                    <div className="flex gap-1 bg-white/5 rounded-xl p-1">
                        {tabs.map(t => (
                            <button
                                key={t.id}
                                onClick={() => setTab(t.id)}
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
                    {tab === 'upcoming' && (
                        <div className="space-y-3">
                            {demoUpcomingGames.map(game => (
                                <div
                                    key={game.id}
                                    className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-4"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-white font-bold">{game.title}</div>
                                            <div className="text-green-300 text-sm">
                                                {new Date(game.date).toLocaleDateString('en-GB', {
                                                    weekday: 'short', day: 'numeric', month: 'short',
                                                    hour: '2-digit', minute: '2-digit',
                                                })}
                                            </div>
                                            {game.location && (
                                                <div className="text-white/40 text-xs mt-0.5">{game.location}</div>
                                            )}
                                        </div>
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">
                                            Scheduled
                                        </span>
                                    </div>
                                </div>
                            ))}
                            <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center">
                                <p className="text-white/50 text-sm">
                                    In a real league, players mark availability and admins generate balanced teams.
                                </p>
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
        </div>
    );
};

export default DemoLeaguePage;
