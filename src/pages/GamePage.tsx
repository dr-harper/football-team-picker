import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, HelpCircle, Shuffle, Trophy, Users } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuth } from '../contexts/AuthContext';
import {
    subscribeToGame,
    subscribeToGameAvailability,
    setAvailability,
    updateGameTeams,
    updateGameScore,
    updateGameStatus,
    getLeague,
} from '../utils/firestore';
import { Game, PlayerAvailability, AvailabilityStatus, League, Team } from '../types';
import { generateTeamsFromText } from '../utils/teamGenerator';
import { useSettings } from '../contexts/SettingsContext';
import PitchRenderer from '../components/PitchRenderer';

const GamePage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const navigate = useNavigate();
    const { places } = useSettings();
    const [game, setGame] = useState<Game | null>(null);
    const [league, setLeague] = useState<League | null>(null);
    const [availability, setAvailabilityState] = useState<PlayerAvailability[]>([]);
    const [loading, setLoading] = useState(true);
    const [playersText, setPlayersText] = useState('');
    const [generatedTeams, setGeneratedTeams] = useState<Team[] | null>(null);
    const [genError, setGenError] = useState('');
    const [score1, setScore1] = useState('');
    const [score2, setScore2] = useState('');
    const [selectedPlayer, setSelectedPlayer] = useState<{
        setupIndex: number;
        teamIndex: number;
        playerIndex: number;
    } | null>(null);
    const [playerNumbers, setPlayerNumbers] = useState<{ [playerName: string]: number }>({});

    useEffect(() => {
        if (!id) return;
        const unsubGame = subscribeToGame(id, async (g) => {
            setGame(g);
            if (g?.leagueId) {
                const l = await getLeague(g.leagueId);
                setLeague(l);
            }
            if (g?.playersText) setPlayersText(g.playersText);
            if (g?.teams) setGeneratedTeams(g.teams);
            if (g?.score) {
                setScore1(String(g.score.team1));
                setScore2(String(g.score.team2));
            }
            setLoading(false);
        });
        const unsubAvail = subscribeToGameAvailability(id, setAvailabilityState);
        return () => { unsubGame(); unsubAvail(); };
    }, [id]);

    const myAvailability = availability.find(a => a.userId === user?.uid);
    const availablePlayers = availability.filter(a => a.status === 'available');
    const maybePlayers = availability.filter(a => a.status === 'maybe');
    const unavailablePlayers = availability.filter(a => a.status === 'unavailable');

    const handleSetAvailability = async (status: AvailabilityStatus) => {
        if (!user || !id) return;
        await setAvailability(id, user.uid, user.displayName || user.email?.split('@')[0] || 'Player', status);
    };

    const generateFromAvailable = useCallback(() => {
        // Build player list from available players
        const playerList = availablePlayers.map(a => a.displayName).join('\n');
        setPlayersText(playerList);

        const result = generateTeamsFromText(playerList, places, playerNumbers);
        if (result.error) {
            setGenError(result.error);
            setGeneratedTeams(null);
            return;
        }
        setPlayerNumbers(result.playerNumbers);
        setGeneratedTeams(result.teams);
        setGenError('');

        // Save to Firestore
        if (id) {
            updateGameTeams(id, playerList, result.teams);
        }
    }, [availablePlayers, places, playerNumbers, id]);

    const handleGenerateFromText = useCallback(() => {
        const result = generateTeamsFromText(playersText, places, playerNumbers);
        if (result.error) {
            setGenError(result.error);
            setGeneratedTeams(null);
            return;
        }
        setPlayerNumbers(result.playerNumbers);
        setGeneratedTeams(result.teams);
        setGenError('');

        if (id) {
            updateGameTeams(id, playersText, result.teams);
        }
    }, [playersText, places, playerNumbers, id]);

    const handleSaveScore = async () => {
        if (!id) return;
        const s1 = parseInt(score1);
        const s2 = parseInt(score2);
        if (isNaN(s1) || isNaN(s2)) return;
        await updateGameScore(id, { team1: s1, team2: s2 });
    };

    const handleReopen = async () => {
        if (!id) return;
        await updateGameStatus(id, 'in_progress');
    };

    const handlePlayerClick = (teamIndex: number, playerIndex: number) => {
        const clicked = { setupIndex: 0, teamIndex, playerIndex };
        if (!selectedPlayer) {
            setSelectedPlayer(clicked);
            return;
        }
        if (selectedPlayer.teamIndex === teamIndex && selectedPlayer.playerIndex === playerIndex) {
            setSelectedPlayer(null);
        } else {
            // Swap players
            if (generatedTeams) {
                const newTeams = generatedTeams.map((team: Team) => ({
                    ...team,
                    players: [...team.players],
                }));
                const temp = newTeams[selectedPlayer.teamIndex].players[selectedPlayer.playerIndex];
                newTeams[selectedPlayer.teamIndex].players[selectedPlayer.playerIndex] = newTeams[teamIndex].players[playerIndex];
                newTeams[teamIndex].players[playerIndex] = temp;
                setGeneratedTeams(newTeams);
                if (id) {
                    updateGameTeams(id, playersText, newTeams);
                }
            }
            setSelectedPlayer(null);
        }
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

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-700 dark:from-green-950 dark:via-green-900 dark:to-green-800">
            <header className="bg-green-900 dark:bg-green-950 text-white p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button
                        onClick={() => league ? navigate(`/league/${league.id}`) : navigate('/dashboard')}
                        variant="ghost"
                        size="icon"
                        className="text-white"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <span className="font-bold text-xl">{game.title}</span>
                        {league && (
                            <div className="text-green-300 text-xs">{league.name}</div>
                        )}
                    </div>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full ${
                    game.status === 'scheduled' ? 'bg-blue-500/20 text-blue-300' :
                    game.status === 'in_progress' ? 'bg-yellow-500/20 text-yellow-300' :
                    'bg-green-500/20 text-green-300'
                }`}>
                    {game.status === 'in_progress' ? 'In Progress' : game.status.charAt(0).toUpperCase() + game.status.slice(1)}
                </span>
            </header>

            <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-4">
                {/* Date info */}
                <div className="text-center text-green-300 text-sm">
                    {new Date(game.date).toLocaleDateString('en-GB', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                    })}
                </div>

                {/* Availability Section */}
                {!isCompleted && (
                    <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-5">
                        <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                            <Users className="w-5 h-5" /> Availability
                        </h2>

                        {/* My availability buttons */}
                        {user && (
                            <div className="flex gap-2 mb-4">
                                <Button
                                    onClick={() => handleSetAvailability('available')}
                                    className={`flex-1 rounded-lg flex items-center justify-center gap-2 py-3 ${
                                        myAvailability?.status === 'available'
                                            ? 'bg-green-600 text-white'
                                            : 'bg-white/5 text-white/60 hover:bg-white/10'
                                    }`}
                                >
                                    <CheckCircle className="w-4 h-4" /> I'm in
                                </Button>
                                <Button
                                    onClick={() => handleSetAvailability('maybe')}
                                    className={`flex-1 rounded-lg flex items-center justify-center gap-2 py-3 ${
                                        myAvailability?.status === 'maybe'
                                            ? 'bg-yellow-600 text-white'
                                            : 'bg-white/5 text-white/60 hover:bg-white/10'
                                    }`}
                                >
                                    <HelpCircle className="w-4 h-4" /> Maybe
                                </Button>
                                <Button
                                    onClick={() => handleSetAvailability('unavailable')}
                                    className={`flex-1 rounded-lg flex items-center justify-center gap-2 py-3 ${
                                        myAvailability?.status === 'unavailable'
                                            ? 'bg-red-600 text-white'
                                            : 'bg-white/5 text-white/60 hover:bg-white/10'
                                    }`}
                                >
                                    <XCircle className="w-4 h-4" /> Can't make it
                                </Button>
                            </div>
                        )}

                        {/* Player lists */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                                <div className="text-green-400 text-sm font-medium mb-1">
                                    Available ({availablePlayers.length})
                                </div>
                                <div className="space-y-1">
                                    {availablePlayers.map(a => (
                                        <div key={a.id} className="text-white text-sm bg-green-500/10 rounded px-2 py-1">
                                            {a.displayName}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <div className="text-yellow-400 text-sm font-medium mb-1">
                                    Maybe ({maybePlayers.length})
                                </div>
                                <div className="space-y-1">
                                    {maybePlayers.map(a => (
                                        <div key={a.id} className="text-white text-sm bg-yellow-500/10 rounded px-2 py-1">
                                            {a.displayName}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <div className="text-red-400 text-sm font-medium mb-1">
                                    Can't make it ({unavailablePlayers.length})
                                </div>
                                <div className="space-y-1">
                                    {unavailablePlayers.map(a => (
                                        <div key={a.id} className="text-white text-sm bg-red-500/10 rounded px-2 py-1">
                                            {a.displayName}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Team Generation Section */}
                {!isCompleted && (
                    <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-5">
                        <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                            <Shuffle className="w-5 h-5" /> Teams
                        </h2>

                        {availablePlayers.length >= 10 && (
                            <Button
                                onClick={generateFromAvailable}
                                className="w-full bg-green-600 hover:bg-green-500 text-white rounded-lg flex items-center justify-center gap-2 py-3 mb-3"
                            >
                                <Shuffle className="w-4 h-4" /> Generate from Available Players ({availablePlayers.length})
                            </Button>
                        )}

                        <div className="mb-3">
                            <label className="block text-sm text-green-300 mb-1">
                                Or enter players manually (one per line):
                            </label>
                            <textarea
                                value={playersText}
                                onChange={e => setPlayersText(e.target.value)}
                                className="w-full h-32 border border-white/10 rounded-lg p-3 bg-white/5 text-white placeholder-white/30 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                placeholder={"Player 1\nPlayer 2 #g\nPlayer 3 #d\n..."}
                            />
                            <Button
                                onClick={handleGenerateFromText}
                                className="mt-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg flex items-center justify-center gap-2 w-full"
                            >
                                <Shuffle className="w-4 h-4" /> Generate Teams
                            </Button>
                        </div>

                        {genError && (
                            <div className="text-red-400 text-sm bg-red-500/10 p-3 rounded-lg mb-3">
                                {genError}
                            </div>
                        )}
                    </div>
                )}

                {/* Display Generated Teams */}
                {generatedTeams && generatedTeams.length === 2 && (
                    <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-5">
                        <div className="flex justify-around mb-2">
                            <h3 className="font-bold text-lg" style={{ color: generatedTeams[0].color }}>
                                {generatedTeams[0].name}
                            </h3>
                            <h3 className="font-bold text-lg" style={{ color: generatedTeams[1].color }}>
                                {generatedTeams[1].name}
                            </h3>
                        </div>

                        <PitchRenderer
                            teams={generatedTeams}
                            setupIndex={0}
                            selectedPlayer={selectedPlayer}
                            onPlayerClick={(_, tIdx, pIdx) => handlePlayerClick(tIdx, pIdx)}
                        />

                        <p className="text-center text-green-300 text-xs mt-3 mb-4">
                            Click any two players to swap their positions
                        </p>

                        {/* Score Recording */}
                        {(isPast || game.status === 'in_progress') && !isCompleted && (
                            <div className="border-t border-white/10 pt-4">
                                <h3 className="text-white font-bold text-center mb-3 flex items-center justify-center gap-2">
                                    <Trophy className="w-4 h-4" /> Record Score
                                </h3>
                                <div className="flex items-center justify-center gap-3">
                                    <div className="text-center">
                                        <div className="text-sm text-green-300 mb-1">{generatedTeams[0]?.name}</div>
                                        <input
                                            type="number"
                                            value={score1}
                                            onChange={e => setScore1(e.target.value)}
                                            className="w-16 text-center text-2xl font-bold border border-white/10 rounded-lg p-2 bg-white/5 text-white"
                                            min="0"
                                        />
                                    </div>
                                    <span className="text-white text-2xl font-bold">-</span>
                                    <div className="text-center">
                                        <div className="text-sm text-green-300 mb-1">{generatedTeams[1]?.name}</div>
                                        <input
                                            type="number"
                                            value={score2}
                                            onChange={e => setScore2(e.target.value)}
                                            className="w-16 text-center text-2xl font-bold border border-white/10 rounded-lg p-2 bg-white/5 text-white"
                                            min="0"
                                        />
                                    </div>
                                </div>
                                <Button
                                    onClick={handleSaveScore}
                                    disabled={score1 === '' || score2 === ''}
                                    className="mt-3 w-full bg-green-600 hover:bg-green-500 text-white rounded-lg"
                                >
                                    Save Final Score
                                </Button>
                            </div>
                        )}

                        {/* Completed game score display */}
                        {isCompleted && game.score && (
                            <div className="border-t border-white/10 pt-4">
                                <h3 className="text-white font-bold text-center mb-2">Final Score</h3>
                                <div className="flex items-center justify-center gap-4 text-white">
                                    <div className="text-center">
                                        <div className="text-sm text-green-300">{generatedTeams[0]?.name}</div>
                                        <div className="text-4xl font-bold">{game.score.team1}</div>
                                    </div>
                                    <span className="text-2xl">-</span>
                                    <div className="text-center">
                                        <div className="text-sm text-green-300">{generatedTeams[1]?.name}</div>
                                        <div className="text-4xl font-bold">{game.score.team2}</div>
                                    </div>
                                </div>
                                {user && game.createdBy === user.uid && (
                                    <Button
                                        onClick={handleReopen}
                                        className="mt-3 w-full bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg text-sm"
                                    >
                                        Edit Score
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default GamePage;
