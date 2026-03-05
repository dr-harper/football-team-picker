import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { PLAYER_TAGS } from '../constants/playerTags';
import { PLAYER_POSITIONS } from '../constants/playerPositions';

const MAX_TAGS = 3;

interface Props {
    /** When true, modal is shown regardless of needsPlayerTags (edit mode from dashboard) */
    editMode?: boolean;
    /** Positions already selected (edit mode) */
    initialPositions?: string[];
    /** Tags already selected (edit mode) */
    initialTags?: string[];
    onClose?: () => void;
}

const SetPlayerTagsModal: React.FC<Props> = ({ editMode = false, initialPositions = [], initialTags = [], onClose }) => {
    const { needsPlayerTags, updatePlayerTags } = useAuth();

    const [step, setStep] = useState<'positions' | 'tags'>('positions');
    const [selectedPositions, setSelectedPositions] = useState<string[]>(initialPositions);
    const [selectedTags, setSelectedTags] = useState<string[]>(initialTags);
    const [saving, setSaving] = useState(false);

    const visible = editMode || needsPlayerTags;
    if (!visible) return null;

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
            onClose?.();
        } catch (err) {
            console.error('[updatePlayerTags]', err);
        }
        setSaving(false);
    };

    const handleSkip = () => {
        onClose?.();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm bg-green-900 border border-white/10 rounded-2xl p-6 shadow-2xl">

                {step === 'positions' ? (
                    <>
                        <div className="text-3xl text-center mb-3">⚙️</div>
                        <h2 className="text-xl font-bold text-white text-center mb-1">
                            Where do you prefer to play?
                        </h2>
                        <p className="text-green-300 text-sm text-center mb-6">
                            Pick all that apply
                        </p>

                        <div className="flex flex-wrap justify-center gap-2 mb-8">
                            {PLAYER_POSITIONS.map(({ emoji, label }) => {
                                const selected = selectedPositions.includes(label);
                                return (
                                    <button
                                        key={label}
                                        onClick={() => togglePosition(label)}
                                        className={`flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                                            selected
                                                ? 'bg-green-500 border-green-400 text-white ring-2 ring-green-400'
                                                : 'bg-white/10 border-white/20 text-white/80 hover:bg-white/15'
                                        }`}
                                    >
                                        <span>{emoji}</span>
                                        <span>{label}</span>
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            onClick={() => setStep('tags')}
                            disabled={selectedPositions.length === 0}
                            className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
                        >
                            Next →
                        </button>
                    </>
                ) : (
                    <>
                        <div className="text-3xl text-center mb-3">🏷️</div>
                        <h2 className="text-xl font-bold text-white text-center mb-1">
                            Pick your player style
                        </h2>
                        <p className="text-green-300 text-sm text-center mb-4">
                            Choose {MAX_TAGS} tags that describe you
                        </p>

                        <div className="flex flex-wrap justify-center gap-2 mb-4 max-h-64 overflow-y-auto">
                            {PLAYER_TAGS.map(({ emoji, label }) => {
                                const selected = selectedTags.includes(label);
                                const atMax = selectedTags.length >= MAX_TAGS && !selected;
                                return (
                                    <button
                                        key={label}
                                        onClick={() => toggleTag(label)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${
                                            selected
                                                ? 'bg-green-500 border-green-400 text-white ring-2 ring-green-400'
                                                : atMax
                                                ? 'bg-white/5 border-white/10 text-white/30 cursor-pointer'
                                                : 'bg-white/10 border-white/20 text-white/80 hover:bg-white/15'
                                        }`}
                                    >
                                        <span>{emoji}</span>
                                        <span>{label}</span>
                                    </button>
                                );
                            })}
                        </div>

                        <p className="text-center text-green-300 text-sm mb-4">
                            {selectedTags.length} / {MAX_TAGS} selected
                        </p>

                        <button
                            onClick={handleSave}
                            disabled={saving || selectedTags.length !== MAX_TAGS || selectedPositions.length === 0}
                            className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
                        >
                            {saving ? 'Saving…' : 'Save my profile →'}
                        </button>

                        <div className="flex items-center justify-between mt-3">
                            <button
                                onClick={() => setStep('positions')}
                                className="text-green-400 text-sm hover:text-green-300 transition-colors"
                            >
                                ← Back
                            </button>
                            {editMode && (
                                <button
                                    onClick={handleSkip}
                                    className="text-white/40 text-sm hover:text-white/60 transition-colors"
                                >
                                    skip for now
                                </button>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default SetPlayerTagsModal;
