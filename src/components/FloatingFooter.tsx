import React from 'react';
import { Button } from './ui/button';

interface FloatingFooterProps {
    visible: boolean;
    onExport: () => void;
}

const FloatingFooter: React.FC<FloatingFooterProps> = ({ visible, onExport }) => {
    if (!visible) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-green-900 text-white py-3 flex justify-center z-50 shadow-lg">
            <Button
                onClick={onExport}
                className="bg-blue-700 text-white py-2 px-6 rounded font-bold shadow-md hover:bg-blue-800 flex items-center gap-2"
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
                        d="M7.5 12l4.5 4.5m0 0l4.5-4.5m-4.5 4.5V3"
                    />
                </svg>
                Download Teams as Image
            </Button>
        </div>
    );
};

export default FloatingFooter;
