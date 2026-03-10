import React from 'react';
import { CheckCircle, XCircle, HelpCircle } from 'lucide-react';
import { PlayerAvailability, AvailabilityStatus } from '../../types';

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
    onSetAvailability: (status: AvailabilityStatus) => void;
    onAdminSetAvailability: (player: PlayerAvailability, status: AvailabilityStatus) => void;
    onGuestStatusChange: (name: string, status: AvailabilityStatus) => void;
    onPositionToggle: (playerName: string, pos: 'g' | 'd' | 's') => void;
    onSetMemberAvailability: (gameDocId: string, userId: string, displayName: string, status: AvailabilityStatus) => void;
}

const AvailabilityList: React.FC<AvailabilityListProps> = ({
    availablePlayers, maybePlayers, unavailablePlayers,
    guestPlayers, guestStatusMap, positionMap,
    leagueMembers, availability, isAdmin, currentUserId, gameDocId,
    onSetAvailability, onAdminSetAvailability, onGuestStatusChange,
    onPositionToggle, onSetMemberAvailability,
}) => (
    <div className="space-y-1">
        {[...availablePlayers, ...maybePlayers, ...unavailablePlayers].map(a => {
            const isMe = a.userId === currentUserId;
            const s = a.status;
            const pos = positionMap[a.displayName];
            return (
                <div key={a.id} className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-1.5">
                    <span className="text-white text-sm truncate flex-1">{a.displayName}</span>
                    {isAdmin && (
                        <div className="flex gap-0.5 shrink-0">
                            {(['g', 'd', 's'] as const).map(p => (
                                <button key={p} onClick={() => onPositionToggle(a.displayName, p)}
                                    className={`text-xs px-1.5 py-0.5 rounded font-mono transition-colors ${pos === p ? 'bg-white/25 text-white' : 'text-white/25 hover:text-white/60'}`}
                                    title={p === 'g' ? 'Goalkeeper' : p === 'd' ? 'Defender' : 'Forward'}
                                >{p === 'g' ? 'GK' : p === 'd' ? 'DEF' : 'FWD'}</button>
                            ))}
                        </div>
                    )}
                    <div className="flex gap-1 shrink-0">
                        <button onClick={() => isMe ? onSetAvailability('available') : isAdmin ? onAdminSetAvailability(a, 'available') : undefined}
                            className={`p-0.5 transition-colors ${s === 'available' ? 'text-green-400' : (isMe || isAdmin) ? 'text-white/20 hover:text-green-400' : 'text-white/20 cursor-default'}`}
                            title="Available"><CheckCircle className="w-4 h-4" /></button>
                        <button onClick={() => isMe ? onSetAvailability('maybe') : isAdmin ? onAdminSetAvailability(a, 'maybe') : undefined}
                            className={`p-0.5 transition-colors ${s === 'maybe' ? 'text-yellow-400' : (isMe || isAdmin) ? 'text-white/20 hover:text-yellow-400' : 'text-white/20 cursor-default'}`}
                            title="Maybe"><HelpCircle className="w-4 h-4" /></button>
                        <button onClick={() => isMe ? onSetAvailability('unavailable') : isAdmin ? onAdminSetAvailability(a, 'unavailable') : undefined}
                            className={`p-0.5 transition-colors ${s === 'unavailable' ? 'text-red-400' : (isMe || isAdmin) ? 'text-white/20 hover:text-red-400' : 'text-white/20 cursor-default'}`}
                            title="Can't make it"><XCircle className="w-4 h-4" /></button>
                    </div>
                </div>
            );
        })}
        {guestPlayers.map(name => {
            const s = guestStatusMap[name] ?? 'available';
            const pos = positionMap[name];
            return (
                <div key={name} className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-1.5">
                    <span className="text-white text-sm truncate flex-1">{name} <span className="text-white/40 text-xs">guest</span></span>
                    {isAdmin ? (
                        <>
                            <div className="flex gap-0.5 shrink-0">
                                {(['g', 'd', 's'] as const).map(p => (
                                    <button key={p} onClick={() => onPositionToggle(name, p)}
                                        className={`text-xs px-1.5 py-0.5 rounded font-mono transition-colors ${pos === p ? 'bg-white/25 text-white' : 'text-white/25 hover:text-white/60'}`}
                                        title={p === 'g' ? 'Goalkeeper' : p === 'd' ? 'Defender' : 'Forward'}
                                    >{p === 'g' ? 'GK' : p === 'd' ? 'DEF' : 'FWD'}</button>
                                ))}
                            </div>
                            <div className="flex gap-1 shrink-0">
                                <button onClick={() => onGuestStatusChange(name, 'available')} className={`p-0.5 transition-colors ${s === 'available' ? 'text-green-400' : 'text-white/20 hover:text-green-400'}`} title="Available"><CheckCircle className="w-4 h-4" /></button>
                                <button onClick={() => onGuestStatusChange(name, 'maybe')} className={`p-0.5 transition-colors ${s === 'maybe' ? 'text-yellow-400' : 'text-white/20 hover:text-yellow-400'}`} title="Maybe"><HelpCircle className="w-4 h-4" /></button>
                                <button onClick={() => onGuestStatusChange(name, 'unavailable')} className={`p-0.5 transition-colors ${s === 'unavailable' ? 'text-red-400' : 'text-white/20 hover:text-red-400'}`} title="Can't make it"><XCircle className="w-4 h-4" /></button>
                            </div>
                        </>
                    ) : (
                        <span className={`text-xs ${s === 'available' ? 'text-green-400' : s === 'maybe' ? 'text-yellow-400' : 'text-red-400'}`}>
                            {s === 'available' ? 'in' : s === 'maybe' ? 'maybe' : 'out'}
                        </span>
                    )}
                </div>
            );
        })}
        {leagueMembers
            .filter(m => !availability.find(a => a.userId === m.id))
            .map(member => (
                <div key={member.id} className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-1.5 opacity-50">
                    <span className="text-white/60 text-sm truncate flex-1">{member.displayName}</span>
                    <span className="text-white/30 text-xs mr-1">no response</span>
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
            ))
        }
    </div>
);

export default AvailabilityList;
