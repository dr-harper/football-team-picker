import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { PLAYER_TAGS } from '../constants/playerTags';
import { PLAYER_POSITIONS } from '../constants/playerPositions';
import { logger } from '../utils/logger';

const MAX_TAGS = 3;

const PlayerProfilePage: React.FC = () => {
    const { user, updatePlayerTags } = useAuth();
    const navigate = useNavigate();

    const [step, setStep] = useState<'positions' | 'tags'>('positions');
    const [selectedPositions, setSelectedPositions] = useState<string[]>([]);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [hasExistingProfile, setHasExistingProfile] = useState(false);
    const [saving, setSaving] = useState(false);
    const [loadingProfile, setLoadingProfile] = useState(true);

    useEffect(() => {
        if (!user) return;
        const load = async () => {
            try {
                const snap = await getDoc(doc(db, 'users', user.uid));
                if (snap.exists()) {
                    const data = snap.data();
                    if (data.hasSetTags) {
                        setHasExistingProfile(true);
                        setSelectedPositions(data.preferredPositions ?? []);
                        setSelectedTags(data.playerTags ?? []);
                    }
                }
            } catch (err) {
                logger.error('[PlayerProfilePage load]', err);
            }
            setLoadingProfile(false);
        };
        load();
    }, [user]);

    const togglePosition = (label: string) => {
        setSelectedPositions(prev =>
            prev.includes(label) ? prev.filter(p => p !== label) : [...prev, label]
        );
    };

    const toggleTag = (label: string) => {
        if (selectedTags.includes(label)) {
            setSelectedTags(prev => prev.filter(t => t !== label));
        } else if (selectedTags.length < MAX_TAGS) {
            setSelectedTags(prev => [...prev, label]);
        }
    };

    const handleSave = async () => {
        if (selectedTags.length !== MAX_TAGS || selectedPositions.length === 0) return;
        setSaving(true);
        try {
            await updatePlayerTags(selectedTags, selectedPositions);
            navigate('/dashboard');
        } catch (err) {
            logger.error('[updatePlayerTags]', err);
            setSaving(false);
        }
    };

    if (loadingProfile) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-900 via-green-800 to-green-700">
                <div className="text-white text-lg">Loading…</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-700 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-6 pb-2 max-w-lg mx-auto w-full">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="text-white/50 hover:text-white/80 text-sm transition-colors"
                >
                    ← Back
                </button>
                <div className="flex gap-2">
                    <div className={`h-1.5 w-8 rounded-full transition-colors ${step === 'positions' ? 'bg-green-400' : 'bg-white/20'}`} />
                    <div className={`h-1.5 w-8 rounded-full transition-colors ${step === 'tags' ? 'bg-green-400' : 'bg-white/20'}`} />
                </div>
                {hasExistingProfile ? (
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="text-white/40 hover:text-white/60 text-sm transition-colors"
                    >
                        Cancel
                    </button>
                ) : (
                    <div className="w-12" />
                )}
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
                <div className="w-full max-w-lg">
                    {step === 'positions' ? (
                        <div>
                            <div className="text-5xl text-center mb-4">⚙️</div>
                            <h1 className="text-2xl font-bold text-white text-center mb-2">
                                Where do you prefer to play?
                            </h1>
                            <p className="text-green-300 text-center mb-8">
                                Pick all that apply
                            </p>

                            <div className="flex flex-wrap justify-center gap-3 mb-10">
                                {PLAYER_POSITIONS.map(({ emoji, label }) => {
                                    const selected = selectedPositions.includes(label);
                                    return (
                                        <button
                                            key={label}
                                            onClick={() => togglePosition(label)}
                                            className={`flex items-center gap-2 px-5 py-3 rounded-full border text-sm font-medium transition-all ${
                                                selected
                                                    ? 'bg-green-500 border-green-400 text-white ring-2 ring-green-400 ring-offset-2 ring-offset-transparent'
                                                    : 'bg-white/10 border-white/20 text-white/80 hover:bg-white/15'
                                            }`}
                                        >
                                            <span className="text-base">{emoji}</span>
                                            <span>{label}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            <button
                                onClick={() => setStep('tags')}
                                disabled={selectedPositions.length === 0}
                                className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-colors text-base"
                            >
                                Next →
                            </button>
                        </div>
                    ) : (
                        <div>
                            <div className="text-5xl text-center mb-4">🏷️</div>
                            <h1 className="text-2xl font-bold text-white text-center mb-2">
                                Pick your player style
                            </h1>
                            <p className="text-green-300 text-center mb-8">
                                Choose {MAX_TAGS} tags that describe you
                            </p>

                            <div className="flex flex-wrap justify-center gap-2 mb-6">
                                {PLAYER_TAGS.map(({ emoji, label }) => {
                                    const selected = selectedTags.includes(label);
                                    const atMax = selectedTags.length >= MAX_TAGS && !selected;
                                    return (
                                        <button
                                            key={label}
                                            onClick={() => toggleTag(label)}
                                            className={`flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                                                selected
                                                    ? 'bg-green-500 border-green-400 text-white ring-2 ring-green-400'
                                                    : atMax
                                                    ? 'bg-white/5 border-white/10 text-white/25'
                                                    : 'bg-white/10 border-white/20 text-white/80 hover:bg-white/15'
                                            }`}
                                        >
                                            <span>{emoji}</span>
                                            <span>{label}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            <p className="text-center text-green-300 text-sm mb-6">
                                {selectedTags.length} / {MAX_TAGS} selected
                            </p>

                            <button
                                onClick={handleSave}
                                disabled={saving || selectedTags.length !== MAX_TAGS || selectedPositions.length === 0}
                                className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-colors text-base mb-3"
                            >
                                {saving ? 'Saving…' : 'Save my profile →'}
                            </button>

                            <button
                                onClick={() => setStep('positions')}
                                className="w-full text-center text-green-400 text-sm hover:text-green-300 transition-colors py-2"
                            >
                                ← Back
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PlayerProfilePage;
