import React from 'react';
import PlayerIcon from './PlayerIcon';
import { placeholderPositions } from '../constants/positionsConstants';

const PlaceholderPitch: React.FC = () => {
    return (
        <div className="bg-green-700 dark:bg-green-800 p-4 shadow-lg text-white rounded-lg">
            <div className="text-center mt-4">
                <p className="text-white-400 text-sm sm:text-base font-bold">
                    No teams generated yet. Enter players and click &quot;Generate Teams&quot; to get started!
                </p>
            </div>
            <div className="relative w-full aspect-video bg-green-600 border-2 border-white rounded-lg shadow-lg overflow-hidden">
                <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white"></div>
                <div className="absolute top-1/2 left-1/2 w-16 h-16 sm:w-24 sm:h-24 rounded-full border-2 border-white transform -translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute top-1/2 left-0 w-1 h-12 sm:w-2 sm:h-16 bg-white transform -translate-y-1/2"></div>
                <div className="absolute top-1/2 right-0 w-1 h-12 sm:w-2 sm:h-16 bg-white transform -translate-y-1/2"></div>
                <div className="absolute top-1/2 left-0 w-8 h-24 sm:w-12 sm:h-32 border-2 border-white border-l-0 transform -translate-y-1/2"></div>
                <div className="absolute top-1/2 right-0 w-8 h-24 sm:w-12 sm:h-32 border-2 border-white border-r-0 transform -translate-y-1/2"></div>
                {placeholderPositions.left.map((position, index) => (
                    <div
                        key={`left-${index}`}
                        className="absolute w-8 h-8 sm:w-12 sm:h-12 transform -translate-x-1/2 -translate-y-1/2"
                        style={{ top: position.top, left: position.left }}
                    >
                        <PlayerIcon isPlaceholder />
                    </div>
                ))}
                {placeholderPositions.right.map((position, index) => (
                    <div
                        key={`right-${index}`}
                        className="absolute w-8 h-8 sm:w-12 sm:h-12 transform -translate-x-1/2 -translate-y-1/2"
                        style={{ top: position.top, left: position.left }}
                    >
                        <PlayerIcon isPlaceholder />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PlaceholderPitch;
