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
            <div className="w-full max-w-sm space-y-5">

                {/* Logo */}
                <div className="flex items-center justify-center gap-2">
                    <img src="/logo.png" alt="Team Shuffle" className="w-9 h-9" />
                    <span className="font-bold text-xl text-white">Team Shuffle</span>
                </div>

                {/* Invite card */}
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 text-center">
                    <p className="text-green-300 text-xs font-semibold uppercase tracking-wider mb-2">
                        You've been invited to join
                    </p>
                    <h1 className="text-white text-3xl font-extrabold mb-1">{league.name}</h1>
                    <p className="text-white/40 text-xs font-mono mb-3">{league.joinCode}</p>
                    <div className="flex items-center justify-center gap-2 text-green-300 text-sm">
                        <Users className="w-4 h-4" />
                        <span>
                            {league.memberIds.length} member{league.memberIds.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                </div>

                {/* Feature pitch */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                    <p className="text-white/50 text-xs text-center">Team Shuffle helps you</p>
                    {[
                        { icon: <Calendar className="w-4 h-4 text-green-400" />, text: "Track who's available each week" },
                        { icon: <Shuffle className="w-4 h-4 text-blue-400" />, text: 'Generate balanced teams instantly' },
                        { icon: <Trophy className="w-4 h-4 text-yellow-400" />, text: 'Record scores and celebrate winners' },
                        { icon: <CheckCircle className="w-4 h-4 text-emerald-400" />, text: 'Free to use, no ads' },
                    ].map(({ icon, text }) => (
                        <div key={text} className="flex items-center gap-3 text-sm text-white/80">
                            {icon}
                            <span>{text}</span>
                        </div>
                    ))}
                </div>

                {/* CTAs */}
                <div className="space-y-3">
                    <Button
                        onClick={() => handleAuth('signup')}
                        className="w-full bg-gradient-to-r from-emerald-400 to-green-600 hover:from-emerald-300 hover:to-green-500 text-white py-3 rounded-xl font-bold text-base shadow-lg flex items-center justify-center gap-2"
                    >
                        Create account and join <ArrowRight className="w-4 h-4" />
                    </Button>
                    <button
                        onClick={() => handleAuth('signin')}
                        className="w-full text-center text-green-300 hover:text-white text-sm transition-colors py-1"
                    >
                        Already have an account? Sign in →
                    </button>
                </div>

            </div>
        </div>
    );
};

export default JoinPage;
