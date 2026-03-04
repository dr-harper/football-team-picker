import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { joinLeagueByCode, getLeagueByCode } from '../utils/firestore';
import { League } from '../types';

const JoinPage: React.FC = () => {
    const { code } = useParams<{ code: string }>();
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [league, setLeague] = useState<League | null>(null);
    const [fetchingLeague, setFetchingLeague] = useState(true);
    const [joining, setJoining] = useState(false);
    const [error, setError] = useState('');

    // Fetch league info, then redirect to auth if not signed in
    useEffect(() => {
        if (!code) {
            navigate('/dashboard');
            return;
        }
        getLeagueByCode(code)
            .then(l => { setLeague(l); setFetchingLeague(false); })
            .catch(() => setFetchingLeague(false));
    }, [code, navigate]);

    // Once we have league + auth state resolved, decide what to do
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

    // Show a loading state while we fetch league / auth / join
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-900 via-green-800 to-green-700 dark:from-green-950 dark:via-green-900 dark:to-green-800">
            <div className="text-white text-lg">{joining ? 'Joining league...' : 'Loading...'}</div>
        </div>
    );
};

export default JoinPage;
