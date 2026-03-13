import { useState, useEffect } from 'react';
import { getSharedGameHealth } from '../utils/firestore';
import { logger } from '../utils/logger';
import type { StoredGameHealth } from '../types';

interface UseSharedGameHealthResult {
    entries: StoredGameHealth[];
    loading: boolean;
}

export function useSharedGameHealth(gameId: string | undefined, userId: string | undefined): UseSharedGameHealthResult {
    const [entries, setEntries] = useState<StoredGameHealth[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!gameId || !userId) return;

        setLoading(true);
        getSharedGameHealth(gameId)
            .then(results => {
                // Exclude my own data (I see it in the main card)
                setEntries(results.filter(r => r.userId !== userId));
            })
            .catch(err => logger.error('Failed to load shared health data:', err))
            .finally(() => setLoading(false));
    }, [gameId, userId]);

    return { entries, loading };
}
