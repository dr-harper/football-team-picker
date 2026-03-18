import React from 'react';
import { CheckCircle, XCircle, HelpCircle } from 'lucide-react';
import { PlayerAvailability, AvailabilityStatus } from '../../types';
import { makeGuestId } from '../../utils/playerLookup';
import type { WaitlistResult } from '../../utils/waitlist';

interface AvailabilityListProps {
    availablePlayers: PlayerAvailability[];
    maybePlayers: PlayerAvailability[];
    unavailablePlayers: PlayerAvailability[];
    guestPlayers: string[];
    guestStatusMap: Record<string, AvailabilityStatus>;
    positionMap: Record<string, string>;
    leagueMembers: { id: string; displayName: string; email: string }[];
    availability: PlayerAvailability[];
    isAdmin: boolean;
    currentUserId?: string;
    gameDocId: string | null;
    waitlist: WaitlistResult;
    onSetAvailability: (status: AvailabilityStatus) => void;
    onAdminSetAvailability: (player: PlayerAvailability, status: AvailabilityStatus) => void;
    onGuestStatusChange: (name: string, status: AvailabilityStatus) => void;
    onPositionToggle: (playerId: string, pos: 'g' | 'd' | 's') => void;
    onSetMemberAvailability: (gameDocId: string, userId: string, displayName: string, status: AvailabilityStatus) => void;
}

/** Render a single player row with position tags and availability controls */
const PlayerRow: React.FC<{
    playerId: string;
    displayName: string;
    status: AvailabilityStatus;
    isMe: boolean;
    isGuest: boolean;
    isAdmin: boolean;
    positionMap: Record<string, string>;
    waitlistPosition?: number;
    onToggleAvailability: (status: AvailabilityStatus) => void;
    onPositionToggle: (playerId: string, pos: 'g' | 'd' | 's') => void;
}> = ({ playerId, displayName, status, isMe, isGuest, isAdmin, positionMap, waitlistPosition, onToggleAvailability, onPositionToggle }) => {
    const pos = positionMap[playerId];
    return (
        <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-1.5">
            <span className="text-white text-sm truncate flex-1">
                {displayName}
                {isGuest && <span className="text-white/40 text-xs ml-1">guest</span>}
                {waitlistPosition !== undefined && (
                    <span className="text-amber-400/60 text-xs ml-1">#{waitlistPosition}</span>
                )}
            </span>
            {isAdmin && (
                <div className="flex gap-0.5 shrink-0">
                    {(['g', 'd', 's'] as const).map(p => (
                        <button key={p} onClick={() => onPositionToggle(playerId, p)}
                            className={`text-xs px-1.5 py-0.5 rounded font-mono transition-colors ${pos === p ? 'bg-white/25 text-white' : 'text-white/25 hover:text-white/60'}`}
                            title={p === 'g' ? 'Goalkeeper' : p === 'd' ? 'Defender' : 'Forward'}
                        >{p === 'g' ? 'GK' : p === 'd' ? 'DEF' : 'FWD'}</button>
                    ))}
                </div>
            )}
            <div className="flex gap-1 shrink-0">
                <button onClick={(isMe || isAdmin) ? () => onToggleAvailability('available') : undefined}
                    className={`p-0.5 transition-colors ${status === 'available' ? 'text-green-400' : (isMe || isAdmin) ? 'text-white/20 hover:text-green-400' : 'text-white/20 cursor-default'}`}
                    title="Available"><CheckCircle className="w-4 h-4" /></button>
                <button onClick={(isMe || isAdmin) ? () => onToggleAvailability('maybe') : undefined}
                    className={`p-0.5 transition-colors ${status === 'maybe' ? 'text-yellow-400' : (isMe || isAdmin) ? 'text-white/20 hover:text-yellow-400' : 'text-white/20 cursor-default'}`}
                    title="Maybe"><HelpCircle className="w-4 h-4" /></button>
                <button onClick={(isMe || isAdmin) ? () => onToggleAvailability('unavailable') : undefined}
                    className={`p-0.5 transition-colors ${status === 'unavailable' ? 'text-red-400' : (isMe || isAdmin) ? 'text-white/20 hover:text-red-400' : 'text-white/20 cursor-default'}`}
                    title="Can't make it"><XCircle className="w-4 h-4" /></button>
            </div>
        </div>
    );
};

const AvailabilityList: React.FC<AvailabilityListProps> = ({
    availablePlayers, maybePlayers, unavailablePlayers,
    guestPlayers, guestStatusMap, positionMap,
    leagueMembers, availability, isAdmin, currentUserId, gameDocId,
    waitlist,
    onSetAvailability, onAdminSetAvailability, onGuestStatusChange,
    onPositionToggle, onSetMemberAvailability,
}) => {
    const allWaitlisted = [...waitlist.waitlistedAvailable, ...waitlist.waitlistedMaybe];

    // Helpers to find availability record / guest status
    const findAvail = (id: string) => [...availablePlayers, ...maybePlayers, ...unavailablePlayers].find(a => a.userId === id);
    const getGuestName = (id: string) => id.startsWith('guest:') ? id.slice(6) : undefined;

    const handleToggle = (playerId: string, displayName: string, isGuest: boolean) => (status: AvailabilityStatus) => {
        if (isGuest) {
            const name = getGuestName(playerId);
            if (name) onGuestStatusChange(name, status);
        } else {
            const isMe = playerId === currentUserId;
            const record = findAvail(playerId);
            if (isMe) onSetAvailability(status);
            else if (isAdmin && record) onAdminSetAvailability(record, status);
        }
    };

    const getStatus = (playerId: string, isGuest: boolean): AvailabilityStatus => {
        if (isGuest) {
            const name = getGuestName(playerId);
            return name ? (guestStatusMap[name] ?? 'available') : 'available';
        }
        return findAvail(playerId)?.status ?? 'available';
    };

    const noResponseMembers = leagueMembers.filter(m => !availability.find(a => a.userId === m.id));

    return (
        <div className="space-y-1">
            {/* In players (green section) */}
            {waitlist.inPlayers.length > 0 && (
                <>
                    <div className="text-xs text-green-400/70 font-medium px-1 pt-1">In ({waitlist.inPlayers.length})</div>
                    {waitlist.inPlayers.map(p => (
                        <PlayerRow
                            key={p.id}
                            playerId={p.id}
                            displayName={p.displayName}
                            status={getStatus(p.id, p.isGuest)}
                            isMe={p.id === currentUserId}
                            isGuest={p.isGuest}
                            isAdmin={isAdmin}
                            positionMap={positionMap}
                            onToggleAvailability={handleToggle(p.id, p.displayName, p.isGuest)}
                            onPositionToggle={onPositionToggle}
                        />
                    ))}
                </>
            )}

            {/* Waitlisted players (amber section) */}
            {allWaitlisted.length > 0 && (
                <>
                    <div className="text-xs text-amber-400/70 font-medium px-1 pt-2">Waitlist ({allWaitlisted.length})</div>
                    {allWaitlisted.map((p, i) => (
                        <PlayerRow
                            key={p.id}
                            playerId={p.id}
                            displayName={p.displayName}
                            status={getStatus(p.id, p.isGuest)}
                            isMe={p.id === currentUserId}
                            isGuest={p.isGuest}
                            isAdmin={isAdmin}
                            positionMap={positionMap}
                            waitlistPosition={i + 1}
                            onToggleAvailability={handleToggle(p.id, p.displayName, p.isGuest)}
                            onPositionToggle={onPositionToggle}
                        />
                    ))}
                </>
            )}

            {/* Unavailable players (red section) */}
            {unavailablePlayers.length > 0 && (
                <>
                    <div className="text-xs text-red-400/70 font-medium px-1 pt-2">Unavailable ({unavailablePlayers.length + (guestPlayers.filter(n => guestStatusMap[n] === 'unavailable')).length})</div>
                    {unavailablePlayers.map(a => (
                        <PlayerRow
                            key={a.id}
                            playerId={a.userId}
                            displayName={a.displayName}
                            status="unavailable"
                            isMe={a.userId === currentUserId}
                            isGuest={false}
                            isAdmin={isAdmin}
                            positionMap={positionMap}
                            onToggleAvailability={handleToggle(a.userId, a.displayName, false)}
                            onPositionToggle={onPositionToggle}
                        />
                    ))}
                    {guestPlayers.filter(n => guestStatusMap[n] === 'unavailable').map(name => (
                        <PlayerRow
                            key={`guest:${name}`}
                            playerId={makeGuestId(name)}
                            displayName={name}
                            status="unavailable"
                            isMe={false}
                            isGuest={true}
                            isAdmin={isAdmin}
                            positionMap={positionMap}
                            onToggleAvailability={handleToggle(makeGuestId(name), name, true)}
                            onPositionToggle={onPositionToggle}
                        />
                    ))}
                </>
            )}

            {/* No response (grey section) */}
            {noResponseMembers.length > 0 && (
                <>
                    <div className="text-xs text-white/30 font-medium px-1 pt-2">No response ({noResponseMembers.length})</div>
                    {noResponseMembers.map(member => (
                        <div key={member.id} className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-1.5 opacity-50">
                            <span className="text-white/60 text-sm truncate flex-1">{member.displayName}</span>
                            {isAdmin && (
                                <div className="flex gap-1 shrink-0">
                                    <button
                                        onClick={() => gameDocId && onSetMemberAvailability(gameDocId, member.id, member.displayName, 'available')}
                                        className="p-0.5 transition-colors text-white/20 hover:text-green-400"
                                        title="Mark available"
                                    ><CheckCircle className="w-4 h-4" /></button>
                                    <button
                                        onClick={() => gameDocId && onSetMemberAvailability(gameDocId, member.id, member.displayName, 'maybe')}
                                        className="p-0.5 transition-colors text-white/20 hover:text-yellow-400"
                                        title="Mark maybe"
                                    ><HelpCircle className="w-4 h-4" /></button>
                                    <button
                                        onClick={() => gameDocId && onSetMemberAvailability(gameDocId, member.id, member.displayName, 'unavailable')}
                                        className="p-0.5 transition-colors text-white/20 hover:text-red-400"
                                        title="Mark unavailable"
                                    ><XCircle className="w-4 h-4" /></button>
                                </div>
                            )}
                        </div>
                    ))}
                </>
            )}
        </div>
    );
};

export default AvailabilityList;
