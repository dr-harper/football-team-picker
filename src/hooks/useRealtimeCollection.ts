import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, QueryConstraint } from 'firebase/firestore';
import { db } from '../firebase';

interface UseRealtimeCollectionResult<T> {
    data: T[];
    loading: boolean;
    error: Error | null;
}

/**
 * Subscribe to a Firestore collection query in real-time.
 * IMPORTANT: callers must memoise the `constraints` array to avoid infinite re-subscribes.
 */
export function useRealtimeCollection<T>(
    collectionName: string,
    constraints: QueryConstraint[],
    enabled: boolean = true,
): UseRealtimeCollectionResult<T> {
    const [data, setData] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!enabled) {
            setData([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        const q = query(collection(db, collectionName), ...constraints);
        const unsubscribe = onSnapshot(
            q,
            (snap) => {
                setData(snap.docs.map(d => ({ id: d.id, ...d.data() } as T)));
                setLoading(false);
            },
            (err) => {
                console.error(`[useRealtimeCollection] ${collectionName}:`, err);
                setError(err);
                setLoading(false);
            },
        );

        return unsubscribe;
    }, [collectionName, enabled, ...constraints]);

    return { data, loading, error };
}
