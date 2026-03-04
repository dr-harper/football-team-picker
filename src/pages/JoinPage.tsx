import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { joinLeagueByCode, getLeagueByCode } from '../utils/firestore';
import { League } from '../types';
import { Users } from 'lucide-react';
import { Button } from '../components/ui/button';

const JoinPage: React.FC = () => {
    const { code } = useParams<{ code: string }>();
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [league, setLeague] = useState<League | null>(null);
    const [fetchingLeague, setFetchingLeague] = useState(true);
    const [joining, setJoining] = useState(false);
    const [error, setError] = useState('');

    // Fetch league info
    useEffect(() => {
        if (!code) {
            navigate('/dashboard');
            return;
        }
        getLeagueByCode(code)
            .then(l => { setLeague(l); setFetchingLeague(false); })
            .catch(() => setFetchingLeague(false));
    }, [code, navigate]);

    // Once auth + league are resolved, handle unauthenticated and already-member cases
    useEffect(() => {
        if (authLoading || fetchingLeague || !code) return;

        if (!user) {
            // Not signed in — store the code and send to auth page
            sessionStorage.setItem('pendingJoinCode', code);
            if (league) sessionStorage.setItem('pendingJoinLeagueName', league.name);
            navigate('/auth', { state: { mode: 'signup' } });
            return;
        }

        if (!league) {
            setError('League not found — check the invite link and try again.');
            return;
        }

        // Already a member — redirect straight to league
        const memberIds = league.memberIds ?? [];
        if (memberIds.includes(user.uid)) {
            navigate(`/league/${league.joinCode ?? league.id}`);
        }
    }, [authLoading, fetchingLeague, user, league, code, navigate]);

    const handleJoin = () => {
        if (!code || !league) return;
        setJoining(true);
        setError('');
        joinLeagueByCode(code, user!.uid)
            .then(joined => {
                if (joined) navigate(`/league/${joined.joinCode}`);
                else setError('Failed to join league — please try again.');
            })
            .catch(() => setError('Failed to join league — please try again.'))
            .finally(() => setJoining(false));
    };

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

    // Confirmation card — shown when logged in and not yet a member
    const memberIds = league?.memberIds ?? [];
    const awaitingConfirm = !authLoading && !fetchingLeague && !!user && !!league && !memberIds.includes(user.uid) && !joining;

    if (awaitingConfirm) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-900 via-green-800 to-green-700 dark:from-green-950 dark:via-green-900 dark:to-green-800 p-4">
                <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 text-center">
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">You've been invited to</p>
                    <h1 className="text-2xl font-extrabold text-green-900 dark:text-white mb-2">{league.name}</h1>
                    <div className="flex items-center justify-center gap-1.5 text-gray-400 dark:text-gray-500 text-sm mb-8">
                        <Users className="w-4 h-4" />
                        <span>{league.memberIds.length} member{league.memberIds.length !== 1 ? 's' : ''} already playing</span>
                    </div>
                    <Button
                        onClick={handleJoin}
                        className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white py-3 rounded-xl font-bold text-base shadow-lg mb-3"
                    >
                        Join League
                    </Button>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="text-sm text-gray-400 dark:text-gray-500 hover:underline"
                    >
                        Not now →
                    </button>
                </div>
            </div>
        );
    }

    // Loading / joining spinner
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-900 via-green-800 to-green-700 dark:from-green-950 dark:via-green-900 dark:to-green-800">
            <div className="text-white text-lg">{joining ? 'Joining league...' : 'Loading...'}</div>
        </div>
    );
};

export default JoinPage;
