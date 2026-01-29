import React from 'react';
import { motion } from 'framer-motion';
import PlayerIcon from './PlayerIcon';
import { placeholderPositions } from '../constants/positionsConstants';
import { useTheme } from '../themes';
import { cn } from '../lib/utils';

const PlaceholderPitch: React.FC = () => {
    const t = useTheme();

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className={t.card.base}
        >
            <div className="text-center mt-4">
                <p className={cn(t.text.muted, 'font-bold sm:text-base')}>
                    No teams generated yet. Enter players and click &quot;Generate Teams&quot; to get started!
                </p>
            </div>
            <div
                className={cn('relative w-full aspect-video overflow-hidden', t.pitch.border)}
                style={{ background: t.pitch.bg }}
            >
                <div className={`absolute top-0 bottom-0 left-1/2 w-0.5 ${t.pitch.lineClass}`}></div>
                <div
                    className="absolute top-1/2 left-1/2 w-16 h-16 sm:w-24 sm:h-24 rounded-full border-2 transform -translate-x-1/2 -translate-y-1/2"
                    style={{ borderColor: t.pitch.lineColour }}
                ></div>
                <div className={`absolute top-1/2 left-0 w-1 h-12 sm:w-2 sm:h-16 ${t.pitch.lineClass} transform -translate-y-1/2`}></div>
                <div className={`absolute top-1/2 right-0 w-1 h-12 sm:w-2 sm:h-16 ${t.pitch.lineClass} transform -translate-y-1/2`}></div>
                <div
                    className="absolute top-1/2 left-0 w-8 h-24 sm:w-12 sm:h-32 border-2 border-l-0 transform -translate-y-1/2"
                    style={{ borderColor: t.pitch.lineColour }}
                ></div>
                <div
                    className="absolute top-1/2 right-0 w-8 h-24 sm:w-12 sm:h-32 border-2 border-r-0 transform -translate-y-1/2"
                    style={{ borderColor: t.pitch.lineColour }}
                ></div>

                {/* Muddy patches — conditional */}
                {t.decorations.muddyPatches && (
                    <>
                        <div className="muddy-patch" style={{ top: '45%', left: '8%', width: '64px', height: '40px' }} />
                        <div className="muddy-patch" style={{ top: '55%', left: '48%', width: '80px', height: '48px' }} />
                        <div className="muddy-patch" style={{ top: '40%', right: '8%', width: '56px', height: '40px' }} />
                    </>
                )}

                {placeholderPositions.left.map((position, index) => (
                    <motion.div
                        key={`left-${index}`}
                        animate={{ opacity: [0.4, 0.7, 0.4] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: index * 0.3 }}
                        className="absolute w-8 h-8 sm:w-12 sm:h-12 transform -translate-x-1/2 -translate-y-1/2"
                        style={{ top: position.top, left: position.left }}
                    >
                        <PlayerIcon isPlaceholder />
                    </motion.div>
                ))}
                {placeholderPositions.right.map((position, index) => (
                    <motion.div
                        key={`right-${index}`}
                        animate={{ opacity: [0.4, 0.7, 0.4] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: (index + 5) * 0.3 }}
                        className="absolute w-8 h-8 sm:w-12 sm:h-12 transform -translate-x-1/2 -translate-y-1/2"
                        style={{ top: position.top, left: position.left }}
                    >
                        <PlayerIcon isPlaceholder />
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
};

export default PlaceholderPitch;
