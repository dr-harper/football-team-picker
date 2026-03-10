import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const SetNameModal: React.FC = () => {
    const { user, needsDisplayName, updateDisplayName } = useAuth();
    const [name, setName] = useState(user?.displayName || '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    if (!needsDisplayName) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = name.trim();
        if (!trimmed) { setError('Please enter a name'); return; }
        if (trimmed.length > 30) { setError('Name must be 30 characters or less'); return; }
        setSaving(true);
        try {
            await updateDisplayName(trimmed);
        } catch {
            setError('Something went wrong — please try again');
        }
        setSaving(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm bg-green-900 border border-white/10 rounded-2xl p-6 shadow-2xl">
                <div className="text-3xl text-center mb-3">👋</div>
                <h2 className="text-xl font-bold text-white text-center mb-1">What should we call you?</h2>
                <p className="text-green-300 text-sm text-center mb-6">
                    This is the name your teammates will see on the pitch and in the stats.
                </p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        type="text"
                        value={name}
                        onChange={e => { setName(e.target.value); setError(''); }}
                        placeholder="e.g. Jamie or Vardy"
                        maxLength={30}
                        autoFocus
                        className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 text-center text-lg font-medium focus:ring-2 focus:ring-green-400 focus:border-transparent outline-none"
                    />
                    {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
                    >
                        {saving ? 'Saving…' : "Let's go"}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default SetNameModal;
