import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Trophy, ArrowRight, Plus, Users } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useAuth } from '../../contexts/AuthContext';
import { getLeagueGames } from '../../utils/firestore';
import { League } from '../../types';

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

        fetchGames().catch(() => {
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
                    Welcome to Team Shuffle!
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
                <Link
                    to={`/league/${upcomingGames[0].leagueCode}/game/${upcomingGames[0].id}`}
                    className="block bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl p-5 hover:bg-white/15 transition-colors"
                >
                    <div className="flex items-center gap-2 text-green-300 text-xs font-medium mb-2">
                        <Calendar className="w-4 h-4" />
                        NEXT GAME
                    </div>
                    <div className="text-white font-bold text-lg">{upcomingGames[0].title}</div>
                    <div className="text-green-200/70 text-sm mt-1">
                        {upcomingGames[0].leagueName} &middot; {formatGameDate(upcomingGames[0].date)}
                    </div>
                    {upcomingGames[0].status === 'in_progress' && (
                        <span className="inline-block mt-2 text-xs px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-300">
                            In Progress
                        </span>
                    )}
                </Link>
            )}

            {/* More upcoming games */}
            {upcomingGames.length > 1 && (
                <div className="space-y-2">
                    <h2 className="text-sm font-medium text-green-300/70 px-1">Coming up</h2>
                    {upcomingGames.slice(1).map(game => (
                        <Link
                            key={game.id}
                            to={`/league/${game.leagueCode}/game/${game.id}`}
                            className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <div>
                                <div className="text-white text-sm font-medium">{game.title}</div>
                                <div className="text-green-300/70 text-xs">
                                    {game.leagueName} &middot; {formatGameDate(game.date)}
                                </div>
                            </div>
                            <ArrowRight className="w-4 h-4 text-white/30" />
                        </Link>
                    ))}
                </div>
            )}

            {upcomingGames.length === 0 && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-5 text-center">
                    <p className="text-green-200/70 text-sm">No upcoming games scheduled</p>
                </div>
            )}

            {/* Leagues */}
            <div>
                <h2 className="text-sm font-medium text-green-300/70 px-1 mb-2 flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5" /> My Leagues
                </h2>
                <div className="grid gap-2">
                    {leagues.map(league => (
                        <Link
                            key={league.id}
                            to={`/league/${league.joinCode}`}
                            className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <div>
                                <div className="text-white font-medium">{league.name}</div>
                                <div className="text-green-300/70 text-xs">
                                    {league.memberIds.length} member{league.memberIds.length !== 1 ? 's' : ''}
                                </div>
                            </div>
                            <ArrowRight className="w-4 h-4 text-white/30" />
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default HomeTab;
