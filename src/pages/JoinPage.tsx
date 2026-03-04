import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { joinLeagueByCode, getLeagueByCode } from '../utils/firestore';
import { League } from '../types';
import { Users, Trophy, Calendar, ArrowRight, CheckCircle, Shuffle } from 'lucide-react';
import { Button } from '../components/ui/button';

const JoinPage: React.FC = () => {
    const { code } = useParams<{ code: string }>();
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [league, setLeague] = useState<League | null>(null);
    const [fetchingLeague, setFetchingLeague] = useState(true);
    const [joining, setJoining] = useState(false);
    const [error, setError] = useState('');

    // Fetch league info regardless of auth state (for landing page)
    useEffect(() => {
        if (!code) {
            navigate('/dashboard');
            return;
        }
        getLeagueByCode(code)
            .then(l => { setLeague(l); setFetchingLeague(false); })
            .catch(() => setFetchingLeague(false));
    }, [code, navigate]);

    // Auto-join once we have both auth + league
    useEffect(() => {
        if (authLoading || fetchingLeague || !user || !league || !code) return;

        // Already a member — just redirect
        if (league.memberIds.includes(user.uid)) {
            navigate(`/league/${league.joinCode}`);
            return;
        }

        setJoining(true);
        joinLeagueByCode(code, user.uid)
            .then(joined => {
                if (joined) navigate(`/league/${joined.joinCode}`);
                else setError('Failed to join league');
            })
            .catch(() => setError('Failed to join league'))
            .finally(() => setJoining(false));
    }, [authLoading, fetchingLeague, user, league, code, navigate]);

    const handleAuth = (mode: 'signup' | 'signin') => {
        sessionStorage.setItem('pendingJoinCode', code || '');
        if (league) sessionStorage.setItem('pendingJoinLeagueName', league.name);
        navigate('/auth', { state: { mode } });
    };

    if (fetchingLeague || authLoading || joining) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-900 via-green-800 to-green-700 dark:from-green-950 dark:via-green-900 dark:to-green-800">
                <div className="text-white text-lg">{joining ? 'Joining league...' : 'Loading...'}</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-900 via-green-800 to-green-700 dark:from-green-950 dark:via-green-900 dark:to-green-800">
                <div className="text-center">
                    <div className="text-red-400 text-lg mb-4">{error}</div>
                    <button onClick={() => navigate('/dashboard')} className="text-green-300 hover:underline">
                        Go to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    if (!league) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-900 via-green-800 to-green-700 dark:from-green-950 dark:via-green-900 dark:to-green-800">
                <div className="text-center">
                    <div className="text-white text-lg mb-2">League not found</div>
                    <div className="text-green-300 text-sm mb-4">
                        No league found with code <span className="font-mono font-bold">{code}</span>
                    </div>
                    <button onClick={() => navigate('/')} className="text-green-300 hover:underline">
                        Go home
                    </button>
                </div>
            </div>
        );
    }

    // Unauthenticated landing page
    return (
        <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-700 dark:from-green-950 dark:via-green-900 dark:to-green-800 flex items-center justify-center p-4">
            <div className="w-full max-w-4xl flex flex-col lg:flex-row gap-6 lg:gap-0 items-center lg:items-stretch">

                {/* Left: league invite context */}
                <div className="w-full lg:w-1/2 flex flex-col justify-center lg:pr-10 text-white">
                    <div className="flex items-center gap-2 mb-4">
                        <img src="/logo.png" alt="Team Shuffle" className="w-9 h-9" />
                        <span className="font-bold text-2xl">Team Shuffle</span>
                    </div>
                    <p className="text-green-300 text-sm font-semibold uppercase tracking-wider mb-3">
                        You've been invited to join
                    </p>
                    <h1 className="text-4xl lg:text-5xl font-extrabold mb-4 leading-tight">
                        {league.name}
                    </h1>
                    <div className="flex items-center gap-2 text-white/60 text-sm mb-6">
                        <Users className="w-4 h-4" />
                        <span>{league.memberIds.length} member{league.memberIds.length !== 1 ? 's' : ''} already playing</span>
                    </div>
                    <div className="space-y-3">
                        {[
                            { icon: <Calendar className="w-4 h-4 text-green-400" />, text: "Track who's available each week" },
                            { icon: <Shuffle className="w-4 h-4 text-blue-400" />, text: 'Generate balanced teams instantly' },
                            { icon: <Trophy className="w-4 h-4 text-yellow-400" />, text: 'Record scores and celebrate winners' },
                            { icon: <CheckCircle className="w-4 h-4 text-emerald-400" />, text: 'Free to use, no ads' },
                        ].map(({ icon, text }) => (
                            <div key={text} className="flex items-center gap-3 text-sm text-white/80">
                                <div className="flex-shrink-0 rounded-lg bg-white/10 p-2">{icon}</div>
                                <span>{text}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: CTA card */}
                <div className="w-full lg:w-1/2 max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-6 justify-center lg:hidden">
                        <img src="/logo.png" alt="Team Shuffle" className="w-8 h-8" />
                        <span className="font-bold text-xl text-green-900 dark:text-white">Team Shuffle</span>
                    </div>

                    <div className="text-center mb-6">
                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">You've been invited to</p>
                        <p className="text-green-900 dark:text-white font-extrabold text-2xl">{league.name}</p>
                    </div>

                    <div className="space-y-3">
                        <Button
                            onClick={() => handleAuth('signup')}
                            className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white py-3 rounded-xl font-bold text-base shadow-lg flex items-center justify-center gap-2"
                        >
                            Create account and join <ArrowRight className="w-4 h-4" />
                        </Button>
                        <Button
                            onClick={() => handleAuth('signin')}
                            className="w-full bg-white dark:bg-gray-700 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-700 hover:bg-green-50 dark:hover:bg-gray-600 py-3 rounded-xl font-semibold text-base"
                        >
                            Sign in to existing account
                        </Button>
                    </div>

                    <p className="text-center mt-6 text-xs text-gray-400 dark:text-gray-500">
                        Free to join · No payment required
                    </p>
                </div>

            </div>
        </div>
    );
};

export default JoinPage;
