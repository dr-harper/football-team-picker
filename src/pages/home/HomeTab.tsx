import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Trophy, ArrowRight, Plus, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../../components/ui/button';
import { useAuth } from '../../contexts/AuthContext';
import { getLeagueGames } from '../../utils/firestore';
import { League } from '../../types';
import { logger } from '../../utils/logger';

interface UpcomingGame {
    id: string;
    title: string;
    leagueName: string;
    leagueCode: string;
    date: number;
    status: string;
}

const formatGameDate = (timestamp: number): string => {
    const d = new Date(timestamp);
    const day = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
    const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    return `${day}, ${time}`;
};

const formatDay = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString('en-GB', { day: 'numeric' });
};

const formatMonth = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString('en-GB', { month: 'short' }).toUpperCase();
};

interface HomeTabProps {
    leagues: League[];
    loading: boolean;
}

const HomeTab: React.FC<HomeTabProps> = ({ leagues, loading }) => {
    const { user } = useAuth();
    const [upcomingGames, setUpcomingGames] = useState<UpcomingGame[]>([]);
    const [gamesLoading, setGamesLoading] = useState(true);

    useEffect(() => {
        if (!user || leagues.length === 0) {
            setGamesLoading(false);
            return;
        }

        let cancelled = false;

        const fetchGames = async () => {
            const now = Date.now();
            const games: UpcomingGame[] = [];

            await Promise.all(
                leagues.map(async (league) => {
                    const leagueGames = await getLeagueGames(league.id);
                    for (const game of leagueGames) {
                        if (game.status !== 'completed' && game.date > now) {
                            games.push({
                                id: game.id,
                                title: game.title,
                                leagueName: league.name,
                                leagueCode: league.joinCode,
                                date: game.date,
                                status: game.status,
                            });
                        }
                    }
                })
            );

            if (!cancelled) {
                games.sort((a, b) => a.date - b.date);
                setUpcomingGames(games.slice(0, 5));
                setGamesLoading(false);
            }
        };

        fetchGames().catch((err) => {
            logger.error('[HomeTab] Failed to fetch games', err);
            if (!cancelled) setGamesLoading(false);
        });

        return () => { cancelled = true; };
    }, [user, leagues]);

    if (loading || gamesLoading) {
        return (
            <div className="space-y-4">
                <div className="h-24 bg-white/10 rounded-xl animate-pulse" />
                <div className="h-20 bg-white/10 rounded-xl animate-pulse" />
                <div className="h-20 bg-white/10 rounded-xl animate-pulse" />
            </div>
        );
    }

    // No leagues — onboarding
    if (leagues.length === 0) {
        return (
            <div className="text-center py-8">
                <h2 className="text-xl font-bold text-white mb-2">
                    Welcome to Team Shuffle
                </h2>
                <p className="text-green-200/70 mb-6">
                    Create a league to start organising games with your mates, or join an existing one.
                </p>
                <div className="flex justify-center gap-3">
                    <Link to="/dashboard?action=create">
                        <Button className="bg-green-600 hover:bg-green-500 text-white rounded-lg flex items-center gap-2">
                            <Plus className="w-4 h-4" /> Create a League
                        </Button>
                    </Link>
                    <Link to="/dashboard?action=join">
                        <Button className="bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg flex items-center gap-2">
                            <Users className="w-4 h-4" /> Join a League
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* Next game — hero card */}
            {upcomingGames.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <Link
                        to={`/league/${upcomingGames[0].leagueCode}/game/${upcomingGames[0].id}`}
                        className="block rounded-xl overflow-hidden border border-white/15 hover:border-white/25 transition-all group"
                    >
                        <div className="bg-gradient-to-r from-green-600/30 to-emerald-600/20 px-5 py-2">
                            <div className="flex items-center gap-2 text-green-300 text-xs font-semibold tracking-wider uppercase">
                                <Calendar className="w-3.5 h-3.5" />
                                Next Game
                            </div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm px-5 py-4">
                            <div className="flex items-center justify-between">
                                <div className="min-w-0 flex-1">
                                    <div className="text-white font-bold text-lg">{upcomingGames[0].title}</div>
                                    <div className="text-green-200/70 text-sm mt-1">
                                        {upcomingGames[0].leagueName}
                                    </div>
                                    <div className="text-white/90 text-sm font-medium mt-1.5">
                                        {formatGameDate(upcomingGames[0].date)}
                                    </div>
                                    {upcomingGames[0].status === 'in_progress' && (
                                        <span className="inline-block mt-2 text-xs px-2.5 py-1 rounded-full bg-yellow-500/20 text-yellow-300 font-medium">
                                            In Progress
                                        </span>
                                    )}
                                </div>
                                <div className="shrink-0 ml-3">
                                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-white/10 text-white group-hover:bg-white/20 transition-colors">
                                        View <ArrowRight className="w-3 h-3" />
                                    </span>
                                </div>
                            </div>
                        </div>
                    </Link>
                </motion.div>
            )}

            {/* More upcoming games */}
            {upcomingGames.length > 1 && (
                <div className="space-y-2">
                    <h2 className="text-sm font-medium text-green-300/70 px-1">Coming up</h2>
                    <div className="space-y-2">
                        {upcomingGames.slice(1).map((game, i) => (
                            <motion.div
                                key={game.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.25, delay: 0.1 + i * 0.05 }}
                            >
                                <Link
                                    to={`/league/${game.leagueCode}/game/${game.id}`}
                                    className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 hover:border-white/10 transition-all"
                                >
                                    <div className="w-12 h-12 rounded-lg bg-white/5 flex flex-col items-center justify-center shrink-0">
                                        <span className="text-white font-bold text-lg leading-none">{formatDay(game.date)}</span>
                                        <span className="text-green-300/60 text-[10px] font-medium tracking-wider">{formatMonth(game.date)}</span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="text-white text-sm font-medium">{game.title}</div>
                                        <div className="text-green-300/70 text-xs">
                                            {game.leagueName} &middot; {new Date(game.date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-white/30 shrink-0" />
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {upcomingGames.length === 0 && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center">
                    <Calendar className="w-8 h-8 text-green-300/40 mx-auto mb-2" />
                    <p className="text-green-200/70 text-sm">No games on the horizon yet</p>
                </div>
            )}

            {/* Leagues — horizontal scroll on mobile */}
            <div>
                <h2 className="text-sm font-medium text-green-300/70 px-1 mb-2 flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5" /> My Leagues
                </h2>
                <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-none sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0">
                    {leagues.map((league, i) => (
                        <motion.div
                            key={league.id}
                            className="snap-start shrink-0 w-[70%] sm:w-auto"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.25, delay: i * 0.05 }}
                        >
                            <Link
                                to={`/league/${league.joinCode}`}
                                className="block bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/15 rounded-xl p-4 transition-all h-full"
                            >
                                <div className="text-white font-semibold">{league.name}</div>
                                <div className="text-green-300/70 text-xs mt-1">
                                    {league.memberIds.length} member{league.memberIds.length !== 1 ? 's' : ''}
                                </div>
                            </Link>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default HomeTab;
