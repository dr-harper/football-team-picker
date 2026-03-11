import React from 'react';
import { Users, Pencil } from 'lucide-react';
import { Game, League, PlayerAvailability } from '../../types';
import { resolvePlayerName, makeGuestId } from '../../utils/playerLookup';

interface AttendanceSectionProps {
    game: Game;
    league: League | null;
    availability: PlayerAvailability[];
    attendees: string[] | null;
    editingCost: boolean;
    costInput: string;
    lookup: Record<string, string>;
    onCostInputChange: (value: string) => void;
    onEditCost: () => void;
    onSaveCost: () => void;
    onCancelCost: () => void;
    onToggleAttendee: (playerId: string) => void;
}

const AttendanceSection: React.FC<AttendanceSectionProps> = ({
    game, league, availability, attendees, lookup,
    editingCost, costInput, onCostInputChange,
    onEditCost, onSaveCost, onCancelCost, onToggleAttendee,
}) => {
    const effectiveCost = game.costPerPerson ?? league?.defaultCostPerPerson ?? 0;
    const defaultList = [
        ...availability.filter(a => a.status === 'available').map(a => a.userId),
        ...(game.guestPlayers ?? [])
            .filter(n => (game.guestAvailability ?? {})[n] === 'available' || !(game.guestAvailability ?? {})[n])
            .map(makeGuestId),
    ];
    const effectiveAttendees = attendees ?? defaultList;
    const allPossible = [
        ...availability.map(a => a.userId),
        ...(game.guestPlayers ?? []).map(makeGuestId),
    ];
    const pot = effectiveAttendees.length * effectiveCost;

    return (
        <div className="border-t border-white/10 pt-4 mt-4">
            <h4 className="text-white font-semibold mb-3 flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-green-400" /> Attendance
            </h4>
            {/* Cost per person */}
            <div className="flex items-center gap-2 mb-3">
                <span className="text-white/60 text-sm">Cost per person:</span>
                {editingCost ? (
                    <div className="flex items-center gap-2">
                        <span className="text-white/60 text-sm">&pound;</span>
                        <input
                            type="number"
                            value={costInput}
                            onChange={e => onCostInputChange(e.target.value)}
                            placeholder="0.00"
                            min="0"
                            step="0.5"
                            autoFocus
                            className="w-20 bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-white text-sm"
                        />
                        <button onClick={onSaveCost} className="text-green-400 hover:text-green-300 text-xs px-2 py-1 bg-green-600/20 rounded">Save</button>
                        <button onClick={onCancelCost} className="text-white/40 hover:text-white text-xs">Cancel</button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <span className="text-white font-semibold text-sm">
                            {effectiveCost > 0 ? `£${effectiveCost.toFixed(2)}` : 'Free'}
                        </span>
                        {league?.defaultCostPerPerson !== undefined && game.costPerPerson === undefined && (
                            <span className="text-white/30 text-xs">(league default)</span>
                        )}
                        <button
                            onClick={onEditCost}
                            className="text-white/40 hover:text-white/70 transition-colors"
                        >
                            <Pencil className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}
            </div>
            {/* Attendee checkboxes */}
            <div className="space-y-1.5 mb-3">
                {allPossible.map(pid => (
                    <label key={pid} className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-1.5 cursor-pointer hover:bg-white/8 transition-colors">
                        <input
                            type="checkbox"
                            checked={effectiveAttendees.includes(pid)}
                            onChange={() => onToggleAttendee(pid)}
                            className="w-4 h-4 accent-green-500 shrink-0"
                        />
                        <span className="text-white text-sm flex-1">{resolvePlayerName(pid, lookup)}</span>
                        {pid.startsWith('guest:') && (
                            <span className="text-white/40 text-xs">guest</span>
                        )}
                    </label>
                ))}
            </div>
            {/* Summary */}
            <div className="text-xs text-white/50">
                {effectiveAttendees.length} attended &middot; Total pot: &pound;{pot.toFixed(2)}
            </div>
        </div>
    );
};

export default AttendanceSection;
