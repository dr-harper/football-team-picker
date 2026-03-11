import React, { useState } from 'react';
import { Pencil } from 'lucide-react';
import { PLAYER_POSITIONS } from '../../constants/playerPositions';
import { PLAYER_TAGS } from '../../constants/playerTags';
import { Badge } from '../../utils/badgeUtils';

const MAX_TAGS = 3;

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

interface PlayerProfileCardProps {
    profile: PlayerProfile;
    stats: PlayerStats | null;
    badges: Badge[];
    saving: boolean;
    onSave: (tags: string[], positions: string[], bio: string) => Promise<void>;
}

const PlayerProfileCard: React.FC<PlayerProfileCardProps> = ({
    profile, stats, badges, saving, onSave,
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editPositions, setEditPositions] = useState<string[]>([]);
    const [editTags, setEditTags] = useState<string[]>([]);
    const [editBio, setEditBio] = useState('');

    const openEdit = (p: { tags: string[]; positions: string[]; bio: string }) => {
        setEditPositions(p.positions);
        setEditTags(p.tags);
        setEditBio(p.bio);
        setIsEditing(true);
    };

    const handleSave = async () => {
        if (editTags.length !== MAX_TAGS || editPositions.length === 0) return;
        await onSave(editTags, editPositions, editBio.trim());
        setIsEditing(false);
    };

    return (
        <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">My Profile</span>
                {!isEditing && profile.hasSetTags && (
                    <button
                        onClick={() => openEdit(profile)}
                        className="text-white/40 hover:text-white/70 transition-colors"
                        title="Edit player profile"
                    >
                        <Pencil className="w-4 h-4" />
                    </button>
                )}
            </div>

            {isEditing ? (
                <div className="space-y-4">
                    {/* Bio */}
                    <div>
                        <p className="text-xs text-white/50 mb-2">Bio <span className="text-white/30">(optional, max 50 chars)</span></p>
                        <div className="relative">
                            <input
                                type="text"
                                value={editBio}
                                onChange={e => setEditBio(e.target.value.slice(0, 50))}
                                placeholder='e.g. "Sunday league since 2015"'
                                className="w-full bg-white/10 border border-white/20 text-white placeholder-white/30 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-green-400 pr-12"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/30">{editBio.length}/50</span>
                        </div>
                    </div>

                    {/* Positions */}
                    <div>
                        <p className="text-xs text-white/50 mb-2">Where do you prefer to play?</p>
                        <div className="flex flex-wrap gap-2">
                            {PLAYER_POSITIONS.map(({ emoji, label }) => {
                                const selected = editPositions.includes(label);
                                return (
                                    <button
                                        key={label}
                                        onClick={() => setEditPositions(prev => selected ? prev.filter(p => p !== label) : [...prev, label])}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                                            selected
                                                ? 'bg-green-500 border-green-400 text-white ring-2 ring-green-400'
                                                : 'bg-white/10 border-white/20 text-white/70 hover:bg-white/15'
                                        }`}
                                    >
                                        <span>{emoji}</span><span>{label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Tags */}
                    <div>
                        <p className="text-xs text-white/50 mb-2">Pick {MAX_TAGS} tags that describe you <span className="text-green-400">({editTags.length}/{MAX_TAGS})</span></p>
                        <div className="flex flex-wrap gap-2">
                            {PLAYER_TAGS.map(({ emoji, label }) => {
                                const selected = editTags.includes(label);
                                const atMax = editTags.length >= MAX_TAGS && !selected;
                                return (
                                    <button
                                        key={label}
                                        onClick={() => {
                                            if (selected) setEditTags(prev => prev.filter(t => t !== label));
                                            else if (!atMax) setEditTags(prev => [...prev, label]);
                                        }}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                                            selected
                                                ? 'bg-green-500 border-green-400 text-white ring-2 ring-green-400'
                                                : atMax
                                                ? 'bg-white/5 border-white/10 text-white/25'
                                                : 'bg-white/10 border-white/20 text-white/70 hover:bg-white/15'
                                        }`}
                                    >
                                        <span>{emoji}</span><span>{label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 pt-1">
                        <button
                            onClick={handleSave}
                            disabled={saving || editTags.length !== MAX_TAGS || editPositions.length === 0}
                            className="bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                        >
                            {saving ? 'Saving…' : 'Save'}
                        </button>
                        {profile.hasSetTags && (
                            <button
                                onClick={() => setIsEditing(false)}
                                className="text-white/40 hover:text-white/60 text-sm transition-colors"
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                </div>
            ) : profile.hasSetTags && profile.tags.length > 0 ? (
                <div className="space-y-2.5">
                    {profile.positions.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {profile.positions.map(pos => {
                                const posData = PLAYER_POSITIONS.find(p => p.label === pos);
                                return (
                                    <span key={pos} className="inline-flex items-center gap-1 text-xs bg-green-600/40 border border-green-500/40 text-green-200 px-2.5 py-1 rounded-full">
                                        {posData?.emoji} {pos}
                                    </span>
                                );
                            })}
                        </div>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                        {profile.tags.map(tag => {
                            const tagData = PLAYER_TAGS.find(t => t.label === tag);
                            return (
                                <span key={tag} className="inline-flex items-center gap-1 text-xs bg-white/10 border border-white/15 text-white/80 px-2.5 py-1 rounded-full">
                                    {tagData?.emoji} {tag}
                                </span>
                            );
                        })}
                    </div>
                    {profile.bio && (
                        <p className="text-sm italic text-white/60">"{profile.bio}"</p>
                    )}
                    {stats && stats.games > 0 ? (
                        <div className="flex flex-wrap gap-3 pt-0.5">
                            <span className="text-sm text-white/70">⚽ {stats.goals}</span>
                            <span className="text-sm text-white/70">🅰️ {stats.assists}</span>
                            <span className="text-sm text-white/70">⭐ {stats.motm}</span>
                            <span className="text-sm text-white/70">🎮 {stats.games}</span>
                        </div>
                    ) : stats !== null ? (
                        <p className="text-xs text-white/35 italic">Play some games to earn stats</p>
                    ) : null}
                    {badges.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                            {badges.map(badge => (
                                <span key={badge.label} className="inline-flex items-center gap-1 text-xs bg-yellow-500/15 border border-yellow-500/25 text-yellow-300 px-2.5 py-1 rounded-full">
                                    {badge.emoji} {badge.label}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <button
                    onClick={() => openEdit({ tags: [], positions: [], bio: '' })}
                    className="text-sm text-green-400 hover:text-green-300 transition-colors"
                >
                    Set up your player profile →
                </button>
            )}
        </div>
    );
};

export default PlayerProfileCard;
