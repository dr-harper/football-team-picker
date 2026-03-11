import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { logger } from '../utils/logger';

interface UseRealtimeDocResult<T> {
    data: T | null;
    loading: boolean;
    error: Error | null;
}

export function useRealtimeDoc<T>(
    collectionName: string,
    docId: string | null | undefined,
    transform?: (id: string, data: Record<string, unknown>) => T,
): UseRealtimeDocResult<T> {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!docId) {
            setData(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        const ref = doc(db, collectionName, docId);
        const unsubscribe = onSnapshot(
            ref,
            (snap) => {
                if (!snap.exists()) {
                    setData(null);
                } else {
                    const result = transform
                        ? transform(snap.id, snap.data() as Record<string, unknown>)
                        : ({ id: snap.id, ...snap.data() } as T);
                    setData(result);
                }
                setLoading(false);
            },
            (err) => {
                logger.error(`[useRealtimeDoc] ${collectionName}/${docId}:`, err);
                setError(err);
                setLoading(false);
            },
        );

        return unsubscribe;
    }, [collectionName, docId]);

    return { data, loading, error };
}
