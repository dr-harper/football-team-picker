import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Calendar, Trophy, PlusCircle } from 'lucide-react';
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

        fetch().catch(console.error);
        return () => { cancelled = true; };
    }, [user]);

    // Don't render during auth load or while fetching for logged-in users
    if (loading) return null;
    if (user && nextGame === undefined) return null;

    if (!user) {
        return (
            <div className="rounded-xl px-5 py-4 flex items-center gap-4 bg-white/10 border border-white/15 backdrop-blur-sm text-white">
                <div className="w-9 h-9 shrink-0 flex items-center justify-center">
                    <Zap className="w-6 h-6 text-amber-400" />
                </div>
                <p className="flex-1 text-sm text-green-100/90">
                    Organise your kickabout — create leagues, track results, invite friends.
                </p>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={() => navigate('/auth?mode=signin')}
                        className="px-3 py-1.5 rounded-md text-xs font-medium bg-white/10 hover:bg-white/20 transition-colors"
                    >
                        Sign in
                    </button>
                    <button
                        onClick={() => navigate('/auth?mode=signup')}
                        className="px-3 py-1.5 rounded-md text-xs font-medium bg-white text-green-900 hover:bg-green-50 transition-colors"
                    >
                        Create account
                    </button>
                </div>
            </div>
        );
    }

    // Logged in
    const dashboardLink = (
        <button
            onClick={() => navigate('/dashboard')}
            className="px-3 py-1.5 rounded-md text-xs font-medium bg-white/10 hover:bg-white/20 transition-colors shrink-0"
        >
            → Dashboard
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
                    {leagueCount} league{leagueCount !== 1 ? 's' : ''} · No games scheduled
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
                Next up: <strong className="text-white">{nextGame.leagueName}</strong> · {nextGame.title} · {formatGameDate(nextGame.date)}
            </p>
            {dashboardLink}
        </div>
    );
};

export default HomeBanner;
