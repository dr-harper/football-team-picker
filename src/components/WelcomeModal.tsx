import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../themes';

const STORAGE_KEY = 'hasSeenWelcome';

const WelcomeModal: React.FC = () => {
    const t = useTheme();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (!localStorage.getItem(STORAGE_KEY)) {
            setVisible(true);
        }
    }, []);

    const dismiss = () => {
        setVisible(false);
        localStorage.setItem(STORAGE_KEY, 'true');
    };

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="fixed inset-0 z-50 flex items-center justify-center"
                    style={{ backgroundColor: t.welcomeModal.overlayBg }}
                    onClick={dismiss}
                >
                    {/* Cork board — conditional */}
                    <div
                        className="relative p-6 rounded-xl"
                        style={t.welcomeModal.showCork ? {
                            backgroundColor: t.welcomeModal.corkBg,
                            backgroundImage:
                                'radial-gradient(circle, rgba(0,0,0,0.05) 1px, transparent 1px)',
                            backgroundSize: '8px 8px',
                        } : {}}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Drawing pin — conditional */}
                        {t.welcomeModal.showPin && (
                            <motion.div
                                initial={{ y: -50, scale: 0 }}
                                animate={{ y: 0, scale: 1 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.3 }}
                                className="absolute -top-3 left-1/2 -translate-x-1/2 z-10"
                            >
                                <div className="relative w-6 h-6 bg-red-500 rounded-full shadow-md">
                                    <div className="absolute top-1 left-1.5 w-2 h-2 bg-white/40 rounded-full" />
                                </div>
                            </motion.div>
                        )}

                        {/* Flyer card */}
                        <motion.div
                            initial={{ y: -30, rotate: -8, opacity: 0 }}
                            animate={{ y: 0, rotate: -2, opacity: 1 }}
                            exit={{ y: 30, opacity: 0, rotate: 3 }}
                            transition={{ type: 'spring', stiffness: 150, damping: 15 }}
                            className={t.welcomeModal.card}
                        >
                            {/* Folded corner — conditional */}
                            {t.welcomeModal.showCorner && (
                                <div
                                    className="absolute top-0 right-0 w-0 h-0"
                                    style={{
                                        borderLeft: '20px solid transparent',
                                        borderTop: `20px solid ${t.welcomeModal.corkBg || '#C9956B'}`,
                                    }}
                                />
                            )}

                            <h1 className={t.welcomeModal.title}>
                                TEAM SHUFFLE
                            </h1>

                            {/* Wavy divider */}
                            <svg viewBox="0 0 200 10" className="w-full h-3 mb-4">
                                <path
                                    d="M0 5 Q25 0, 50 5 Q75 10, 100 5 Q125 0, 150 5 Q175 10, 200 5"
                                    fill="none"
                                    stroke={t.welcomeModal.divider}
                                    strokeWidth="1.5"
                                />
                            </svg>

                            <motion.div
                                initial="hidden"
                                animate="visible"
                                variants={{
                                    visible: { transition: { staggerChildren: 0.2, delayChildren: 0.4 } },
                                }}
                                className="space-y-4"
                            >
                                {[
                                    {
                                        icon: (
                                            <svg viewBox="0 0 24 24" fill="none" stroke={t.welcomeModal.stepIcon} strokeWidth="2" className="w-6 h-6">
                                                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                            </svg>
                                        ),
                                        text: 'Write your squad',
                                    },
                                    {
                                        icon: (
                                            <svg viewBox="0 0 24 24" fill="none" stroke={t.welcomeModal.stepIcon} strokeWidth="2" className="w-6 h-6">
                                                <circle cx="12" cy="12" r="3" />
                                                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                                            </svg>
                                        ),
                                        text: 'Hit shuffle',
                                    },
                                    {
                                        icon: (
                                            <svg viewBox="0 0 24 24" fill="none" stroke={t.welcomeModal.stepIcon} strokeWidth="2" className="w-6 h-6">
                                                <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                                                <path d="M12 18h.01" />
                                            </svg>
                                        ),
                                        text: 'Share with the lads',
                                    },
                                ].map((step, i) => (
                                    <motion.div
                                        key={i}
                                        variants={{
                                            hidden: { opacity: 0, x: -20 },
                                            visible: { opacity: 1, x: 0 },
                                        }}
                                        className="flex items-center gap-3"
                                    >
                                        <span className={t.welcomeModal.stepNum}>{i + 1}.</span>
                                        {step.icon}
                                        <span className={t.welcomeModal.stepText}>{step.text}</span>
                                    </motion.div>
                                ))}
                            </motion.div>

                            <div className="text-center mt-6">
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={dismiss}
                                    className={t.welcomeModal.cta}
                                >
                                    Let&apos;s Go!
                                </motion.button>
                            </div>
                        </motion.div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default WelcomeModal;
