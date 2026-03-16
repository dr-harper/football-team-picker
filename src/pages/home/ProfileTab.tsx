import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { getLeagueGames } from '../../utils/firestore';
import { computeBadges, computePersonalStats, Badge } from '../../utils/badgeUtils';
import PlayerProfileCard from '../dashboard/PlayerProfileCard';
import NotificationSettings from '../../components/NotificationSettings';
import { League } from '../../types';
import { logger } from '../../utils/logger';

interface PlayerProfile {
    tags: string[];
    positions: string[];
    hasSetTags: boolean;
    bio: string;
}

interface PlayerStats {
    goals: number;
    assists: number;
    motm: number;
    games: number;
}

interface ProfileTabProps {
    leagues: League[];
}

const ProfileTab: React.FC<ProfileTabProps> = ({ leagues }) => {
    const { user, updatePlayerTags, updateBio } = useAuth();
    const [profile, setProfile] = useState<PlayerProfile | null>(null);
    const [stats, setStats] = useState<PlayerStats | null>(null);
    const [badges, setBadges] = useState<Badge[]>([]);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        let cancelled = false;

        const load = async () => {
            // Load profile
            const snap = await getDoc(doc(db, 'users', user.uid));
            if (cancelled) return;

            if (snap.exists()) {
                const data = snap.data();
                setProfile({
                    tags: data.playerTags ?? [],
                    positions: data.preferredPositions ?? [],
                    hasSetTags: data.hasSetTags === true,
                    bio: data.bio ?? '',
                });
            }

            // Load stats from all leagues
            if (leagues.length > 0) {
                const allCompleted = (
                    await Promise.all(
                        leagues.map(async (league) => {
                            const games = await getLeagueGames(league.id);
                            return games.filter(g => g.status === 'completed');
                        })
                    )
                ).flat();

                if (!cancelled) {
                    setStats(computePersonalStats(allCompleted, user.uid));
                    setBadges(computeBadges(allCompleted, user.uid));
                }
            }

            if (!cancelled) setLoading(false);
        };

        load().catch((err) => {
            logger.error('[ProfileTab] load failed', err);
            if (!cancelled) setLoading(false);
        });

        return () => { cancelled = true; };
    }, [user, leagues]);

    const handleSave = async (tags: string[], positions: string[], bio: string) => {
        setSaving(true);
        try {
            await updatePlayerTags(tags, positions);
            await updateBio(bio);
            setProfile(prev => prev ? { ...prev, tags, positions, bio, hasSetTags: true } : prev);
        } catch (err) {
            logger.error('[ProfileTab] save failed', err);
        }
        setSaving(false);
    };

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="h-48 bg-white/10 rounded-xl animate-pulse" />
                <div className="h-32 bg-white/10 rounded-xl animate-pulse" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {profile && (
                <PlayerProfileCard
                    profile={profile}
                    stats={stats}
                    badges={badges}
                    saving={saving}
                    onSave={handleSave}
                />
            )}
            <NotificationSettings />
        </div>
    );
};

export default ProfileTab;
