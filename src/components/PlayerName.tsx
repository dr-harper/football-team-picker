import React from 'react';
import { UserRoundPlus } from 'lucide-react';
import { isGuest, resolvePlayerName, type PlayerId } from '../utils/playerLookup';

interface PlayerNameProps {
    id: PlayerId;
    lookup: Record<string, string>;
    className?: string;
}

/** Renders a player name with a guest icon for ringers */
const PlayerName: React.FC<PlayerNameProps> = ({ id, lookup, className }) => {
    const name = resolvePlayerName(id, lookup);
    const guest = isGuest(id);

    return (
        <span className={className}>
            {name}
            {guest && (
                <UserRoundPlus className="w-3 h-3 inline ml-1 opacity-50" aria-label="Guest player" />
            )}
        </span>
    );
};

export default PlayerName;
