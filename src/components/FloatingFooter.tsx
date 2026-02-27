import React from 'react';
import { Button } from './ui/button';
import { Share2, Download } from 'lucide-react';

interface FloatingFooterProps {
    visible: boolean;
    onExport: () => void;
    onShare: () => void;
    teamCount: number;
    isExporting?: boolean;
}

const Spinner: React.FC = () => (
    <svg
        className="animate-spin h-4 w-4"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
    >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
);

const FloatingFooter: React.FC<FloatingFooterProps> = ({ visible, onExport, onShare, teamCount, isExporting = false }) => {
    if (!visible) return null;

    return (
        <div
            role="toolbar"
            aria-label="Team export actions"
            className="fixed bottom-0 left-0 right-0 bg-green-950/95 dark:bg-black/80 border-t border-white/10 text-white py-3 px-4 flex items-center justify-between z-50 backdrop-blur-sm"
        >
            <div className="flex items-center gap-2">
                <span className="bg-white/10 text-white text-xs font-bold px-3 py-1 rounded-full">
                    {teamCount} {teamCount === 1 ? 'option' : 'options'} generated
                </span>
            </div>
            <div className="flex items-center gap-2">
                <Button
                    onClick={onExport}
                    disabled={isExporting}
                    className="bg-white/10 hover:bg-white/20 border border-white/20 text-white py-2 px-4 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isExporting ? <Spinner /> : <Download className="w-4 h-4" />}
                    {isExporting ? 'Exporting...' : 'Export'}
                </Button>
                <Button
                    onClick={onShare}
                    disabled={isExporting}
                    className="bg-gradient-to-r from-emerald-400 to-green-600 hover:from-emerald-300 hover:to-green-500 text-white py-2 px-4 rounded-xl font-semibold text-sm flex items-center gap-2 shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Share2 className="w-4 h-4" />
                    Share
                </Button>
            </div>
        </div>
    );
};

export default FloatingFooter;
