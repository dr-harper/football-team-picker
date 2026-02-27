import React from 'react';
import { cn } from '../lib/utils';

interface PlayerIconProps {
    color?: string;
    number?: number | null;
    name?: string;
    isGoalkeeper?: boolean;
    isPlaceholder?: boolean; // New prop to indicate placeholder mode
}

const PlayerIcon: React.FC<PlayerIconProps> = React.memo(({ color, number, name, isGoalkeeper, isPlaceholder }) => {
    const fillColor = isPlaceholder ? '#6b7280' : isGoalkeeper ? '#facc15' : color || '#ffffff'; // Grey for placeholders
    const displayNumber = isPlaceholder ? '?' : number !== null ? number : '-';
    const displayName = isPlaceholder ? '' : name;

    return (
        <div className={cn(
            "w-full h-full flex items-center justify-center relative",
            "text-white font-bold text-sm",
            "transition-all duration-300",
        )} style={{ width: '100%', height: '100%' }}>
            <svg
                fill={fillColor}
                stroke="#000000"
                strokeWidth="5"
                width="100%"
                height="100%"
                viewBox="0 0 295.526 295.526"
                style={{ display: 'block' }}
                xmlns="http://www.w3.org/2000/svg"
                xmlnsXlink="http://www.w3.org/1999/xlink"
                version="1.1"
                xmlSpace="preserve"
                role="img"
                aria-label={isPlaceholder ? 'Empty player slot' : `${name}${isGoalkeeper ? ', Goalkeeper' : ''}, shirt number ${number}`}
            >
                <g>
                    <path d="M147.763,44.074c12.801,0,23.858-8.162,27.83-20.169c-7.578,2.086-17.237,3.345-27.83,3.345
                        c-10.592,0-20.251-1.259-27.828-3.345C123.905,35.911,134.961,44.074,147.763,44.074z"/>
                    <path d="M295.158,58.839c-0.608-1.706-1.873-3.109-3.521-3.873l-56.343-26.01c-11.985-4.06-24.195-7.267-36.524-9.611
                        c-0.434-0.085-0.866-0.126-1.292-0.126c-3.052,0-5.785,2.107-6.465,5.197c-4.502,19.82-22.047,34.659-43.251,34.659
                        c-21.203,0-38.749-14.838-43.25-34.659c-0.688-3.09-3.416-5.197-6.466-5.197c-0.426,0-0.858,0.041-1.292,0.126
                        c-12.328,2.344-24.538,5.551-36.542,9.611L3.889,54.965c-1.658,0.764-2.932,2.167-3.511,3.873
                        c-0.599,1.726-0.491,3.589,0.353,5.217l24.46,48.272c1.145,2.291,3.474,3.666,5.938,3.666c0.636,0,1.281-0.092,1.917-0.283
                        l27.167-8.052v161.97c0,3.678,3.001,6.678,6.689,6.678h161.723c3.678,0,6.67-3.001,6.67-6.678V107.66l27.186,8.052
                        c0.636,0.191,1.28,0.283,1.915,0.283c2.459,0,4.779-1.375,5.94-3.666l24.469-48.272C295.629,62.428,295.747,60.565,295.158,58.839z
                        "/>
                </g>
            </svg>
            <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-sm font-bold text-white pointer-events-none" style={{ textShadow: '0px 0px 1px black, 0px 0px 3px black' }}>
                {displayNumber}
            </div>
            <div className="absolute top-3/4 left-1/2 transform -translate-x-1/2 text-lg text-center bg-black bg-opacity-60 px-1 py-0.5 rounded pointer-events-none">
                {displayName}
            </div>
        </div>
    );
});

PlayerIcon.displayName = 'PlayerIcon';

export default PlayerIcon;
