import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { joinLeagueByCode } from '../utils/firestore';

const JoinPage: React.FC = () => {
    const { code } = useParams<{ code: string }>();
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [error, setError] = useState('');

    useEffect(() => {
        if (authLoading) return;

        if (!user) {
            // Store the join code and redirect to auth
            sessionStorage.setItem('pendingJoinCode', code || '');
            navigate('/auth');
            return;
        }

        if (!code) {
            navigate('/dashboard');
            return;
        }

        joinLeagueByCode(code, user.uid)
            .then(league => {
                if (league) {
                    navigate(`/league/${league.id}`);
                } else {
                    setError('No league found with that code');
                }
            })
            .catch(() => setError('Failed to join league'));
    }, [code, user, authLoading, navigate]);

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-900 via-green-800 to-green-700 dark:from-green-950 dark:via-green-900 dark:to-green-800">
                <div className="text-white text-lg">Loading...</div>
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

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-900 via-green-800 to-green-700 dark:from-green-950 dark:via-green-900 dark:to-green-800">
            <div className="text-white text-lg">Joining league...</div>
        </div>
    );
};

export default JoinPage;
