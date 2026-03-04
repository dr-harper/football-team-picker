import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
    const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true });
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
            <div className="bg-green-800 dark:bg-green-950 text-white px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm border-t border-green-700/50">
                <span className="text-green-100/90 text-center sm:text-left">
                    Organise your kickabout — create leagues, track results, invite friends.
                </span>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={() => navigate('/auth?mode=signin')}
                        className="px-3 py-1 rounded-md text-xs font-medium bg-white/10 hover:bg-white/20 transition-colors"
                    >
                        Sign in
                    </button>
                    <button
                        onClick={() => navigate('/auth?mode=signup')}
                        className="px-3 py-1 rounded-md text-xs font-medium bg-white text-green-900 hover:bg-green-50 transition-colors"
                    >
                        Create account
                    </button>
                </div>
            </div>
        );
    }

    // Logged in
    const handleDashboard = () => navigate('/dashboard');

    const dashboardLink = (
        <button
            onClick={handleDashboard}
            className="px-3 py-1 rounded-md text-xs font-medium bg-white/10 hover:bg-white/20 transition-colors shrink-0"
        >
            → Dashboard
        </button>
    );

    let content: React.ReactNode;

    if (leagueCount === 0) {
        content = (
            <span className="text-green-100/90">Ready to organise your first league?</span>
        );
    } else if (!nextGame) {
        content = (
            <span className="text-green-100/90">
                🏆 {leagueCount} league{leagueCount !== 1 ? 's' : ''} · No games scheduled
            </span>
        );
    } else {
        content = (
            <span className="text-green-100/90">
                ⚽ Next up: <strong className="text-white">{nextGame.leagueName}</strong> · {nextGame.title} · {formatGameDate(nextGame.date)}
            </span>
        );
    }

    return (
        <div className="bg-green-800 dark:bg-green-950 text-white px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm border-t border-green-700/50">
            <div className="text-center sm:text-left">{content}</div>
            {dashboardLink}
        </div>
    );
};

export default HomeBanner;
