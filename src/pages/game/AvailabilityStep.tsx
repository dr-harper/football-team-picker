import React from 'react';
import { CheckCircle, XCircle, HelpCircle, Users, UserPlus, Plus, ChevronRight } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Game, PlayerAvailability, AvailabilityStatus } from '../../types';
import { setAvailability as setAvailabilityFirestore } from '../../utils/firestore';
import AvailabilityList from './AvailabilityList';
import type { WaitlistResult } from '../../utils/waitlist';

interface AvailabilityStepProps {
    game: Game;
    gameDocId: string | null;
    user: { uid: string; displayName: string | null; email: string | null } | null;
    availability: PlayerAvailability[];
    myAvailability: PlayerAvailability | undefined;
    availablePlayers: PlayerAvailability[];
    maybePlayers: PlayerAvailability[];
    unavailablePlayers: PlayerAvailability[];
    guestsAvailable: string[];
    guestsMaybe: string[];
    guestsUnavailable: string[];
    guestStatusMap: Record<string, AvailabilityStatus>;
    positionMap: Record<string, string>;
    leagueMembers: { id: string; displayName: string; email: string }[];
    isAdmin: boolean;
    totalAvailable: number;
    newGuestName: string;
    waitlist: WaitlistResult;
    onNewGuestNameChange: (name: string) => void;
    onAddGuest: () => void;
    onSetAvailability: (status: AvailabilityStatus) => Promise<void>;
    onAdminSetAvailability: (player: PlayerAvailability, status: AvailabilityStatus) => Promise<void>;
    onGuestStatusChange: (name: string, status: AvailabilityStatus) => Promise<void>;
    onPositionToggle: (playerId: string, pos: 'g' | 'd' | 's') => Promise<void>;
    onNextStep: () => void;
}

const AvailabilityStep: React.FC<AvailabilityStepProps> = ({
    game, gameDocId, user, availability, myAvailability,
    availablePlayers, maybePlayers, unavailablePlayers,
    guestsMaybe, guestsUnavailable,
    guestStatusMap, positionMap, leagueMembers, isAdmin,
    totalAvailable, newGuestName, waitlist, onNewGuestNameChange,
    onAddGuest, onSetAvailability, onAdminSetAvailability,
    onGuestStatusChange, onPositionToggle, onNextStep,
}) => {
    const waitlistedTotal = waitlist.waitlistedAvailable.length + waitlist.waitlistedMaybe.length;
    const capacityPct = waitlist.maxPlayers > 0
        ? Math.min(100, (waitlist.inPlayers.length / waitlist.maxPlayers) * 100)
        : 0;
    // Maybe players already promoted to "in" shouldn't be double-counted
    const inPlayerIds = new Set(waitlist.inPlayers.map(p => p.id));
    const maybeNotIn = maybePlayers.filter(m => !inPlayerIds.has(m.userId)).length
        + guestsMaybe.filter(n => !inPlayerIds.has(`guest:${n}`)).length;
    const isUserWaitlisted = user && waitlist.isFull && (
        waitlist.waitlistedAvailable.some(p => p.id === user.uid) ||
        waitlist.waitlistedMaybe.some(p => p.id === user.uid)
    );

    return (
    <div className="max-w-2xl mx-auto space-y-4">
        <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-5">
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <Users className="w-5 h-5" /> Availability
            </h2>
            {user && (
                <div className="flex gap-2 mb-4">
                    <Button
                        onClick={() => onSetAvailability('available')}
                        className={`flex-1 rounded-lg flex items-center justify-center gap-2 py-3 ${
                            myAvailability?.status === 'available'
                                ? 'bg-green-600 text-white'
                                : 'bg-white/5 text-white/60 hover:bg-white/10'
                        }`}
                    >
                        <CheckCircle className="w-4 h-4" /> I'm in
                    </Button>
                    <Button
                        onClick={() => onSetAvailability('maybe')}
                        className={`flex-1 rounded-lg flex items-center justify-center gap-2 py-3 ${
                            myAvailability?.status === 'maybe'
                                ? 'bg-yellow-600 text-white'
                                : 'bg-white/5 text-white/60 hover:bg-white/10'
                        }`}
                    >
                        <HelpCircle className="w-4 h-4" /> Maybe
                    </Button>
                    <Button
                        onClick={() => onSetAvailability('unavailable')}
                        className={`flex-1 rounded-lg flex items-center justify-center gap-2 py-3 ${
                            myAvailability?.status === 'unavailable'
                                ? 'bg-red-600 text-white'
                                : 'bg-white/5 text-white/60 hover:bg-white/10'
                        }`}
                    >
                        <XCircle className="w-4 h-4" /> Can't make it
                    </Button>
                </div>
            )}
            {/* Capacity progress bar */}
            <div className="mb-3">
                <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-white/60">{waitlist.inPlayers.length}/{waitlist.maxPlayers} spots</span>
                    {waitlist.isFull && <span className="text-amber-400 font-medium">Full</span>}
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all ${
                            waitlist.isFull ? 'bg-amber-500' : waitlist.inPlayers.length >= waitlist.minPlayers ? 'bg-green-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${capacityPct}%` }}
                    />
                </div>
            </div>

            {/* Summary stats */}
            <div className="flex gap-4 text-xs mb-2">
                <span className="text-green-400">{waitlist.inPlayers.length} in</span>
                {waitlistedTotal > 0 && <span className="text-amber-400">{waitlistedTotal} waitlisted</span>}
                {maybeNotIn > 0 && <span className="text-yellow-400">{maybeNotIn} maybe</span>}
                <span className="text-red-400">{unavailablePlayers.length + guestsUnavailable.length} out</span>
            </div>

            {/* Waitlist feedback for current user */}
            {isUserWaitlisted && (
                <div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 mb-2">
                    You&apos;re on the waitlist. You&apos;ll move up if someone drops out.
                </div>
            )}
            <AvailabilityList
                availablePlayers={availablePlayers}
                maybePlayers={maybePlayers}
                unavailablePlayers={unavailablePlayers}
                guestPlayers={game.guestPlayers ?? []}
                guestStatusMap={guestStatusMap}
                positionMap={positionMap}
                leagueMembers={leagueMembers}
                availability={availability}
                isAdmin={isAdmin}
                currentUserId={user?.uid}
                gameDocId={gameDocId}
                onSetAvailability={onSetAvailability}
                onAdminSetAvailability={onAdminSetAvailability}
                onGuestStatusChange={onGuestStatusChange}
                onPositionToggle={onPositionToggle}
                onSetMemberAvailability={setAvailabilityFirestore}
            />
            {isAdmin && (
                <div className="mt-3 pt-3 border-t border-white/10">
                    <div className="text-xs text-green-300/70 mb-2 flex items-center gap-1">
                        <UserPlus className="w-3.5 h-3.5" /> Add ringer (no account needed)
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newGuestName}
                            onChange={e => onNewGuestNameChange(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && onAddGuest()}
                            placeholder="Player name"
                            className="flex-1 border border-white/10 rounded-lg px-3 py-1.5 bg-white/5 text-white placeholder-white/30 text-sm focus:ring-1 focus:ring-green-500 focus:outline-none"
                        />
                        <Button
                            onClick={onAddGuest}
                            disabled={!newGuestName.trim()}
                            className="bg-green-600 hover:bg-green-500 text-white rounded-lg px-3"
                        >
                            <Plus className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>

        <Button
            onClick={onNextStep}
            disabled={totalAvailable === 0}
            className="w-full bg-green-600 hover:bg-green-500 text-white rounded-lg flex items-center justify-center gap-2 py-3 disabled:opacity-40"
        >
            Next: Generate Teams <ChevronRight className="w-4 h-4" />
        </Button>
    </div>
    );
};

export default AvailabilityStep;
