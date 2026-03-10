import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Calendar, Trophy, PlusCircle, Users, BarChart3, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getUserLeagues, getLeagueGames } from '../utils/firestore';

interface NextGame {
    title: string;
    leagueName: string;
    date: number;
}

const formatGameDate = (timestamp: number): string => {
    const d = new Date(timestamp);
    const day = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
    const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    return `${day}, ${time}`;
};

const HomeBanner: React.FC = () => {
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    const [nextGame, setNextGame] = useState<NextGame | null | undefined>(undefined);
    const [leagueCount, setLeagueCount] = useState(0);

    useEffect(() => {
        if (!user) return;

        let cancelled = false;

        const fetch = async () => {
            const leagues = await getUserLeagues(user.uid);
            if (cancelled) return;

            setLeagueCount(leagues.length);

            if (leagues.length === 0) {
                setNextGame(null);
                return;
            }

            const now = Date.now();
            let earliest: NextGame | null = null;

            await Promise.all(
                leagues.map(async (league) => {
                    const games = await getLeagueGames(league.id);
                    for (const game of games) {
                        if (game.status !== 'completed' && game.date > now) {
                            if (!earliest || game.date < earliest.date) {
                                earliest = { title: game.title, leagueName: league.name, date: game.date };
                            }
                        }
                    }
                })
            );

            if (!cancelled) setNextGame(earliest);
        };

        fetch().catch(() => {});
        return () => { cancelled = true; };
    }, [user]);

    if (loading) return null;
    if (user && nextGame === undefined) return null;

    // Unauthenticated: prominent hero
    if (!user) {
        return (
            <div className="rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 backdrop-blur-sm overflow-hidden">
                <div className="px-6 py-8 sm:py-10 text-center">
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-3">
                        Split your squad in seconds
                    </h1>
                    <p className="text-green-200/80 text-sm sm:text-base max-w-md mx-auto mb-6">
                        Paste your player list below to pick fair teams instantly — no account needed.
                    </p>

                    <div className="flex items-center justify-center gap-6 text-xs text-green-300/70 mb-6">
                        <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> Instant teams</span>
                        <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Fair splits</span>
                        <span className="flex items-center gap-1.5"><BarChart3 className="w-3.5 h-3.5" /> Export &amp; share</span>
                    </div>

                    <div className="flex items-center justify-center gap-8 text-xs text-white/40 mb-4">
                        <div className="h-px flex-1 max-w-[80px] bg-white/10" />
                        <span>or manage your league</span>
                        <div className="h-px flex-1 max-w-[80px] bg-white/10" />
                    </div>

                    <div className="flex items-center justify-center gap-3">
                        <button
                            onClick={() => navigate('/auth?mode=signin')}
                            className="px-4 py-2 rounded-lg text-sm font-medium bg-white/10 hover:bg-white/20 text-white transition-colors"
                        >
                            Sign in
                        </button>
                        <button
                            onClick={() => navigate('/auth?mode=signup')}
                            className="px-4 py-2 rounded-lg text-sm font-medium bg-white text-green-900 hover:bg-green-50 transition-colors"
                        >
                            Create account
                        </button>
                    </div>

                    <p className="text-white/30 text-xs mt-4">
                        Leagues let you schedule games, track attendance, record stats, and manage finances.
                    </p>
                </div>

                <button
                    onClick={() => {
                        const input = document.querySelector('textarea');
                        input?.focus();
                    }}
                    className="w-full py-2.5 bg-white/5 border-t border-white/10 text-green-300/70 text-xs font-medium hover:bg-white/10 transition-colors flex items-center justify-center gap-1.5"
                >
                    <ChevronDown className="w-3.5 h-3.5" /> Jump to team picker
                </button>
            </div>
        );
    }

    // Logged in states
    const dashboardLink = (
        <button
            onClick={() => navigate('/dashboard')}
            className="px-3 py-1.5 rounded-md text-xs font-medium bg-white/10 hover:bg-white/20 transition-colors shrink-0"
        >
            &rarr; Dashboard
        </button>
    );

    if (leagueCount === 0) {
        return (
            <div className="rounded-xl px-5 py-4 flex items-center gap-4 bg-white/10 border border-white/15 backdrop-blur-sm text-white">
                <div className="w-9 h-9 shrink-0 flex items-center justify-center">
                    <PlusCircle className="w-6 h-6 text-green-300" />
                </div>
                <p className="flex-1 text-sm text-green-100/90">Ready to organise your first league?</p>
                {dashboardLink}
            </div>
        );
    }

    if (!nextGame) {
        return (
            <div className="rounded-xl px-5 py-4 flex items-center gap-4 bg-white/10 border border-white/15 backdrop-blur-sm text-white">
                <div className="w-9 h-9 shrink-0 flex items-center justify-center">
                    <Trophy className="w-6 h-6 text-yellow-400" />
                </div>
                <p className="flex-1 text-sm text-green-100/90">
                    {leagueCount} league{leagueCount !== 1 ? 's' : ''} &middot; No games scheduled
                </p>
                {dashboardLink}
            </div>
        );
    }

    return (
        <div className="rounded-xl px-5 py-4 flex items-center gap-4 bg-white/10 border border-white/15 backdrop-blur-sm text-white">
            <div className="w-9 h-9 shrink-0 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-green-300" />
            </div>
            <p className="flex-1 text-sm text-green-100/90">
                Next up: <strong className="text-white">{nextGame.leagueName}</strong> &middot; {nextGame.title} &middot; {formatGameDate(nextGame.date)}
            </p>
            {dashboardLink}
        </div>
    );
};

export default HomeBanner;
