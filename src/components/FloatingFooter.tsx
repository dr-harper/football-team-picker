import React from 'react';
import { Button } from './ui/button';
import { Share2 } from 'lucide-react';

interface FloatingFooterProps {
    visible: boolean;
    onExport: () => void;
    onShare: () => void;
    teamCount: number;
}

const FloatingFooter: React.FC<FloatingFooterProps> = ({ visible, onExport, onShare, teamCount }) => {
    if (!visible) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-green-900 dark:bg-green-950 text-white py-3 flex items-center justify-end pr-4 z-50 shadow-lg">
            <div className="flex-grow pl-4 font-bold">Teams Generated: {teamCount}</div>
            <Button
                onClick={onExport}
                className="bg-blue-700 dark:bg-blue-600 text-white py-2 px-6 rounded font-bold shadow-md hover:bg-blue-800 dark:hover:bg-blue-700 flex items-center gap-2 mr-2"
            >
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
                Export Image
            </Button>
            <Button
                onClick={onShare}
                className="bg-green-700 dark:bg-green-600 text-white py-2 px-6 rounded font-bold shadow-md hover:bg-green-800 dark:hover:bg-green-700 flex items-center gap-2"
            >
                <Share2 className="w-5 h-5" />
                Share
            </Button>
        </div>
    );
};

export default FloatingFooter;
