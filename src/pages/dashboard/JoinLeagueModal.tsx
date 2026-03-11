import React, { useState } from 'react';
import { Button } from '../../components/ui/button';

interface JoinLeagueModalProps {
    error: string;
    onClose: () => void;
    onJoin: (code: string) => Promise<void>;
}

const JoinLeagueModal: React.FC<JoinLeagueModalProps> = ({ error, onClose, onJoin }) => {
    const [code, setCode] = useState('');

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50 p-4" onClick={onClose}>
            <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold text-green-900 dark:text-white mb-4">Join a League</h3>
                <input
                    type="text"
                    value={code}
                    onChange={e => setCode(e.target.value.toUpperCase())}
                    placeholder="Enter 6-character join code"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 dark:bg-gray-700 dark:text-white mb-3 uppercase tracking-widest text-center text-lg font-mono focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    maxLength={6}
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && onJoin(code.trim())}
                />
                {error && <div className="text-red-600 text-sm mb-3">{error}</div>}
                <div className="flex gap-2 justify-end">
                    <Button onClick={onClose} variant="ghost" className="text-gray-600 dark:text-gray-300">
                        Cancel
                    </Button>
                    <Button onClick={() => onJoin(code.trim())} className="bg-green-700 hover:bg-green-600 text-white">
                        Join
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default JoinLeagueModal;
