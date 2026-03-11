import React from 'react';

interface PaymentInputProps {
    playerId: string;
    isOpen: boolean;
    value: string;
    onChange: (playerId: string, value: string) => void;
    onSubmit: (playerId: string) => void;
    onOpen: (playerId: string) => void;
    onClose: () => void;
    stopPropagation?: boolean;
}

const PaymentInput: React.FC<PaymentInputProps> = ({
    playerId, isOpen, value, onChange, onSubmit, onOpen, onClose, stopPropagation,
}) => {
    if (isOpen) {
        return (
            <div className="flex items-center gap-2">
                <span className="text-white/60 text-sm">£</span>
                <input
                    type="number"
                    value={value}
                    onChange={e => onChange(playerId, e.target.value)}
                    placeholder="Amount"
                    min="0"
                    step="0.5"
                    autoFocus
                    className="w-24 bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-white text-sm"
                />
                <button onClick={() => onSubmit(playerId)} className="text-green-400 hover:text-green-300 text-xs px-2 py-1 bg-green-600/20 rounded">Add</button>
                <button onClick={onClose} className="text-white/40 hover:text-white text-xs">Cancel</button>
            </div>
        );
    }

    return (
        <button
            onClick={e => { if (stopPropagation) e.stopPropagation(); onOpen(playerId); }}
            className="text-xs text-green-400/60 hover:text-green-400 transition-colors"
        >+ Record payment</button>
    );
};

export default PaymentInput;
