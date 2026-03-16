import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Trophy, PlusCircle, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getUserLeagues, getLeagueGames } from '../utils/firestore';

interface NextGame {
    title: string;
    leagueName: string;
    leagueCode: string;
    gameId: string;
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
    const [singleLeagueCode, setSingleLeagueCode] = useState<string | null>(null);

    useEffect(() => {
        if (!user) return;

        let cancelled = false;

        const fetch = async () => {
            const leagues = await getUserLeagues(user.uid);
            if (cancelled) return;

            setLeagueCount(leagues.length);
            if (leagues.length === 1) setSingleLeagueCode(leagues[0].joinCode);

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
                                earliest = {
                                    title: game.title,
                                    leagueName: league.name,
                                    leagueCode: league.joinCode,
                                    gameId: game.id,
                                    date: game.date,
                                };
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

    // Unauthenticated: compact hero
    if (!user) {
        return (
            <div className="rounded-xl px-5 py-4 bg-white/10 border border-white/10 backdrop-blur-sm text-white">
                <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                        <h1 className="text-lg sm:text-xl font-extrabold tracking-tight">
                            Split your squad in seconds
                        </h1>
                        <p className="text-green-200/70 text-sm mt-0.5">
                            Enter players below to pick fair teams — no account needed.
                        </p>
                    </div>
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
                <div className="flex items-center gap-3 mt-2 text-xs">
                    <button onClick={() => navigate('/demo')} className="text-green-300/70 hover:text-green-300 transition-colors">
                        🏟️ Try demo league
                    </button>
                    <span className="text-white/15">&middot;</span>
                    <button onClick={() => navigate('/features')} className="text-green-300/70 hover:text-green-300 transition-colors">
                        ✨ See all features
                    </button>
                </div>
            </div>
        );
    }

    // New user: 0 leagues — onboarding CTAs
    if (leagueCount === 0) {
        return (
            <div className="rounded-xl px-5 py-4 flex items-center gap-4 bg-white/10 border border-white/15 backdrop-blur-sm text-white">
                <div className="w-9 h-9 shrink-0 flex items-center justify-center">
                    <PlusCircle className="w-6 h-6 text-green-300" />
                </div>
                <p className="flex-1 text-sm text-green-100/90">Ready to organise your first league?</p>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={() => navigate('/dashboard?action=create')}
                        className="px-3 py-1.5 rounded-md text-xs font-medium bg-green-600 hover:bg-green-500 text-white transition-colors"
                    >
                        Create a League
                    </button>
                    <button
                        onClick={() => navigate('/dashboard?action=join')}
                        className="px-3 py-1.5 rounded-md text-xs font-medium bg-white/10 hover:bg-white/20 transition-colors flex items-center gap-1"
                    >
                        <Users className="w-3 h-3" /> Join a League
                    </button>
                </div>
            </div>
        );
    }

    // Has leagues, has next game — direct link to game
    if (nextGame) {
        return (
            <div className="rounded-xl px-5 py-4 flex items-center gap-4 bg-white/10 border border-white/15 backdrop-blur-sm text-white">
                <div className="w-9 h-9 shrink-0 flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-green-300" />
                </div>
                <p className="flex-1 text-sm text-green-100/90">
                    Next up: <strong className="text-white">{nextGame.leagueName}</strong> &middot; {nextGame.title} &middot; {formatGameDate(nextGame.date)}
                </p>
                <button
                    onClick={() => navigate(`/league/${nextGame.leagueCode}/game/${nextGame.gameId}`)}
                    className="px-3 py-1.5 rounded-md text-xs font-medium bg-white/10 hover:bg-white/20 transition-colors shrink-0"
                >
                    Go to game &rarr;
                </button>
            </div>
        );
    }

    // Has leagues, no upcoming games
    return (
        <div className="rounded-xl px-5 py-4 flex items-center gap-4 bg-white/10 border border-white/15 backdrop-blur-sm text-white">
            <div className="w-9 h-9 shrink-0 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-yellow-400" />
            </div>
            <p className="flex-1 text-sm text-green-100/90">
                {leagueCount} league{leagueCount !== 1 ? 's' : ''} &middot; No games scheduled
            </p>
            <button
                onClick={() => navigate(singleLeagueCode ? `/league/${singleLeagueCode}` : '/dashboard')}
                className="px-3 py-1.5 rounded-md text-xs font-medium bg-white/10 hover:bg-white/20 transition-colors shrink-0"
            >
                {singleLeagueCode ? 'Go to league' : 'Dashboard'} &rarr;
            </button>
        </div>
    );
};

export default HomeBanner;
