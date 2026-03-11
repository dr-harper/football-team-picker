import React from 'react';
import { CheckCircle, XCircle, HelpCircle, Users, UserPlus, Plus, ChevronRight } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Game, PlayerAvailability, AvailabilityStatus } from '../../types';
import { setAvailability as setAvailabilityFirestore } from '../../utils/firestore';
import AvailabilityList from './AvailabilityList';

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
    guestsAvailable, guestsMaybe, guestsUnavailable,
    guestStatusMap, positionMap, leagueMembers, isAdmin,
    totalAvailable, newGuestName, onNewGuestNameChange,
    onAddGuest, onSetAvailability, onAdminSetAvailability,
    onGuestStatusChange, onPositionToggle, onNextStep,
}) => (
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
            <div className="flex gap-4 text-xs mb-2">
                <span className="text-green-400">{availablePlayers.length + guestsAvailable.length} in</span>
                <span className="text-yellow-400">{maybePlayers.length + guestsMaybe.length} maybe</span>
                <span className="text-red-400">{unavailablePlayers.length + guestsUnavailable.length} out</span>
            </div>
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

export default AvailabilityStep;
