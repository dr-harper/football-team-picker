import React, { useState } from 'react';
import { Button } from '../../components/ui/button';
import { geocodeLocation, GeoResult } from '../../utils/weather';

interface CreateLeagueModalProps {
    error: string;
    onClose: () => void;
    onCreate: (name: string, venue?: string, coords?: { lat: number; lon: number; displayName: string }) => Promise<void>;
}

const CreateLeagueModal: React.FC<CreateLeagueModalProps> = ({ error, onClose, onCreate }) => {
    const [name, setName] = useState('');
    const [venue, setVenue] = useState('');
    const [verifiedVenue, setVerifiedVenue] = useState<GeoResult | null>(null);
    const [verifying, setVerifying] = useState(false);
    const [localError, setLocalError] = useState('');

    const handleVerify = async () => {
        if (!venue.trim()) return;
        setVerifying(true);
        const result = await geocodeLocation(venue.trim());
        setVerifying(false);
        if (result) {
            setVerifiedVenue(result);
            setVenue(result.displayName);
        } else {
            setLocalError('Location not found — try a more specific address');
        }
    };

    const handleCreate = async () => {
        if (!name.trim()) return;
        await onCreate(
            name.trim(),
            verifiedVenue?.displayName || (venue.trim() || undefined),
            verifiedVenue ?? undefined,
        );
    };

    const displayError = error || localError;

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50 p-4" onClick={onClose}>
            <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold text-green-900 dark:text-white mb-4">Create a League</h3>
                <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="League name (e.g. Wednesday 5-a-side)"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 dark:bg-gray-700 dark:text-white mb-3 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && handleCreate()}
                />
                <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Default venue (optional)</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={venue}
                            onChange={e => { setVenue(e.target.value); setVerifiedVenue(null); setLocalError(''); }}
                            placeholder="e.g. Hackney Marshes, London"
                            className={`flex-1 border rounded-lg p-3 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent ${verifiedVenue ? 'border-green-500 dark:border-green-500' : 'border-gray-300 dark:border-gray-600'}`}
                            onKeyDown={e => e.key === 'Enter' && handleVerify()}
                        />
                        <Button
                            onClick={handleVerify}
                            disabled={!venue.trim() || verifying}
                            className="bg-green-100 hover:bg-green-200 text-green-800 dark:bg-green-900 dark:hover:bg-green-800 dark:text-green-200 px-3 shrink-0"
                        >
                            {verifying ? '…' : verifiedVenue ? '✓' : 'Verify'}
                        </Button>
                    </div>
                    {verifiedVenue && (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">📍 {verifiedVenue.displayName}</p>
                    )}
                </div>
                {displayError && <div className="text-red-600 text-sm mb-3">{displayError}</div>}
                <div className="flex gap-2 justify-end">
                    <Button onClick={onClose} variant="ghost" className="text-gray-600 dark:text-gray-300">
                        Cancel
                    </Button>
                    <Button onClick={handleCreate} className="bg-green-700 hover:bg-green-600 text-white">
                        Create
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default CreateLeagueModal;
