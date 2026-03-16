import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getGame, getLeague } from '../utils/firestore';
import { logger } from '../utils/logger';

const GameRedirect: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [error, setError] = useState('');

    useEffect(() => {
        if (!id) return;

        let cancelled = false;

        const resolve = async () => {
            const game = await getGame(id);
            if (cancelled) return;

            if (!game) {
                setError('Game not found');
                return;
            }

            const league = await getLeague(game.leagueId);
            if (cancelled) return;

            if (!league) {
                setError('League not found');
                return;
            }

            navigate(`/league/${league.joinCode}/game/${id}`, { replace: true });
        };

        resolve().catch((err) => {
            logger.error('[GameRedirect] Failed to resolve game redirect', err);
            if (!cancelled) setError('Failed to load game');
        });

        return () => { cancelled = true; };
    }, [id, navigate]);

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-900 via-green-800 to-green-700 dark:from-green-950 dark:via-green-900 dark:to-green-800">
                <div className="text-center">
                    <p className="text-white text-lg mb-4">{error}</p>
                    <button
                        onClick={() => navigate('/', { replace: true })}
                        className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm transition-colors"
                    >
                        Go home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-900 via-green-800 to-green-700 dark:from-green-950 dark:via-green-900 dark:to-green-800">
            <div className="text-white text-lg">Loading...</div>
        </div>
    );
};

export default GameRedirect;
