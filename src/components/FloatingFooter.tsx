import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/button';
import { Share2 } from 'lucide-react';
import { useTheme } from '../themes';

interface FloatingFooterProps {
    visible: boolean;
    onExport: () => void;
    onShare: () => void;
    teamCount: number;
    isExporting?: boolean;
}

const Spinner: React.FC = () => (
    <svg
        className="animate-spin h-5 w-5"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
    >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
);

const FloatingFooter: React.FC<FloatingFooterProps> = ({ visible, onExport, onShare, teamCount, isExporting = false }) => {
    const t = useTheme();

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    className={t.floatingFooter.container}
                >
                    <div className={t.floatingFooter.label}>Teams Generated: {teamCount}</div>
                    <Button
                        onClick={onExport}
                        disabled={isExporting}
                        className={t.floatingFooter.exportBtn}
                    >
                        {isExporting ? (
                            <Spinner />
                        ) : (
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.5}
                                stroke="currentColor"
                                className="w-5 h-5"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M12 7.5l4.5 4.5m0 0l-4.5 4.5m4.5-4.5H3"
                                />
                            </svg>
                        )}
                        {isExporting ? 'Exporting...' : 'Export Image'}
                    </Button>
                    <Button
                        onClick={onShare}
                        disabled={isExporting}
                        className={t.floatingFooter.shareBtn}
                    >
                        <Share2 className="w-5 h-5" />
                        Share
                    </Button>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default FloatingFooter;
