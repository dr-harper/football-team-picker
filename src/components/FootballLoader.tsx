import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const MESSAGES = [
    'Warming up...',
    'Checking the pitch...',
    'Lacing up boots...',
    'Calling the squad...',
    'Waiting for VAR...',
    'Stretching the hamstrings...',
];

const FootballLoader: React.FC = () => {
    const [messageIndex, setMessageIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setMessageIndex(prev => (prev + 1) % MESSAGES.length);
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex flex-col items-center justify-center gap-3 py-8">
            <motion.div
                className="w-8 h-8 rounded-full bg-white shadow-lg"
                animate={{ y: [0, -20, 0] }}
                transition={{ duration: 0.6, repeat: Infinity, ease: 'easeInOut' }}
            >
                <div className="w-full h-full rounded-full border-2 border-white/60 bg-gradient-to-br from-white to-gray-200 flex items-center justify-center text-sm">
                    ⚽
                </div>
            </motion.div>
            <p className="text-green-300/70 text-sm font-medium" aria-live="polite">
                {MESSAGES[messageIndex]}
            </p>
        </div>
    );
};

export default FootballLoader;
