import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, HelpCircle, XCircle, UserPlus } from 'lucide-react';
import { Game, PlayerAvailability, AvailabilityStatus } from '../../types';
import { setAvailability, clearAvailability, updateGuestAvailability, updateGameGuests } from '../../utils/firestore';

interface Member {
    id: string;
    displayName: string;
    email: string;
}

interface AvailabilityGridProps {
    upcomingGames: Game[];
    allGames: Game[];
    members: Member[];
    scheduleAvailability: Map<string, PlayerAvailability[]>;
    currentUserId: string;
    code: string;
}

interface GridRow {
    id: string;
    displayName: string;
    isGuest: boolean;
    isMe: boolean;
}

function ThreeButtonCell({
    status,
    onSet,
    onClear,
}: {
    status?: AvailabilityStatus;
    onSet: (s: AvailabilityStatus) => void;
    onClear?: () => void;
}) {
    return (
        <div className="flex items-center justify-center gap-0.5">
            {(['available', 'maybe', 'unavailable'] as AvailabilityStatus[]).map(s => (
                <button
                    key={s}
                    onClick={() => status === s && onClear ? onClear() : onSet(s)}
                    className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${
                        status === s
                            ? s === 'available' ? 'bg-green-600 text-white'
                            : s === 'maybe' ? 'bg-yellow-600 text-white'
                            : 'bg-red-600 text-white'
                            : 'bg-white/8 text-white/30 hover:bg-white/15'
                    }`}
                >
                    {s === 'available' ? <CheckCircle className="w-3.5 h-3.5" /> :
                     s === 'maybe' ? <HelpCircle className="w-3.5 h-3.5" /> :
                     <XCircle className="w-3.5 h-3.5" />}
                </button>
            ))}
        </div>
    );
}

const AvailabilityGrid: React.FC<AvailabilityGridProps> = ({
    upcomingGames, allGames, members, scheduleAvailability, currentUserId, code,
}) => {
    const [newGuestName, setNewGuestName] = useState('');

    // Collect all unique guests across ALL games (completed + upcoming)
    const allGuests = useMemo(() => {
        const guestSet = new Set<string>();
        for (const game of allGames) {
            for (const name of game.guestPlayers ?? []) {
                guestSet.add(name);
            }
        }
        return [...guestSet].sort((a, b) => a.localeCompare(b));
    }, [allGames]);

    // Build row list: current user first, then members sorted, then guests
    const rows: GridRow[] = useMemo(() => {
        const sorted = [...members].sort((a, b) => {
            if (a.id === currentUserId) return -1;
            if (b.id === currentUserId) return 1;
            return a.displayName.localeCompare(b.displayName);
        });
        const memberRows: GridRow[] = sorted.map(m => ({
            id: m.id,
            displayName: m.displayName,
            isGuest: false,
            isMe: m.id === currentUserId,
        }));
        const guestRows: GridRow[] = allGuests.map(name => ({
            id: `guest:${name}`,
            displayName: name,
            isGuest: true,
            isMe: false,
        }));
        return [...memberRows, ...guestRows];
    }, [members, allGuests, currentUserId]);

    const gameCount = upcomingGames.length;

    /** Set guest status, auto-adding them to the game's guestPlayers if not already there */
    const handleSetGuestStatus = async (game: Game, guestName: string, status: AvailabilityStatus) => {
        const currentGuests = game.guestPlayers ?? [];
        if (!currentGuests.includes(guestName)) {
            await updateGameGuests(game.id, [...currentGuests, guestName]);
        }
        const currentAvail = game.guestAvailability ?? {};
        await updateGuestAvailability(game.id, { ...currentAvail, [guestName]: status });
    };

    /** Clear guest status — remove from guestAvailability and guestPlayers */
    const handleClearGuestStatus = async (game: Game, guestName: string) => {
        const currentGuests = game.guestPlayers ?? [];
        if (currentGuests.includes(guestName)) {
            await updateGameGuests(game.id, currentGuests.filter(n => n !== guestName));
        }
        const { [guestName]: _removed, ...rest } = game.guestAvailability ?? {};
        void _removed;
        await updateGuestAvailability(game.id, rest);
    };

    const handleAddGuest = async () => {
        const name = newGuestName.trim();
        if (!name) return;
        // Case-insensitive duplicate check
        if (allGuests.some(g => g.toLowerCase() === name.toLowerCase())) return;
        // Just register the name — don't auto-add to all games
        // Admin can set per-game availability from the grid
        if (upcomingGames.length > 0) {
            const game = upcomingGames[0];
            const currentGuests = game.guestPlayers ?? [];
            if (!currentGuests.includes(name)) {
                await updateGameGuests(game.id, [...currentGuests, name]);
            }
        }
        setNewGuestName('');
    };

    return (
        <div className="bg-white/5 border border-white/8 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full border-collapse" style={{ minWidth: `${160 + gameCount * 100}px` }}>
                    <thead>
                        {/* Date headers */}
                        <tr className="border-b border-white/8">
                            <th className="sticky left-0 z-10 bg-green-900/90 backdrop-blur-sm p-0 w-[140px] min-w-[140px] md:w-[200px] md:min-w-[200px]" />
                            {upcomingGames.map(game => {
                                const d = new Date(game.date);
                                return (
                                    <th key={game.id} className="p-2 text-center min-w-[90px]">
                                        <Link
                                            to={`/league/${code}/game/${game.gameCode || game.id}`}
                                            className="block hover:opacity-80 transition-opacity"
                                        >
                                            <div className="text-[10px] font-bold text-green-300 uppercase tracking-wider">
                                                {d.toLocaleDateString('en-GB', { weekday: 'short' })}
                                            </div>
                                            <div className="text-[10px] text-white/40">
                                                {d.toLocaleDateString('en-GB', { month: 'short' })}
                                            </div>
                                            <div className="text-xl font-bold text-white leading-tight">
                                                {d.getDate()}
                                            </div>
                                        </Link>
                                    </th>
                                );
                            })}
                        </tr>
                        {/* Availability counts */}
                        <tr className="border-b border-white/8">
                            <th className="sticky left-0 z-10 bg-green-900/90 backdrop-blur-sm p-0 w-[140px] min-w-[140px] md:w-[200px] md:min-w-[200px]" />
                            {upcomingGames.map(game => {
                                const avail = scheduleAvailability.get(game.id) ?? [];
                                const guestStatusMap = game.guestAvailability ?? {};
                                const inCount = avail.filter(a => a.status === 'available').length
                                    + (game.guestPlayers ?? []).filter(n => (guestStatusMap[n] ?? 'available') === 'available').length;
                                return (
                                    <th key={game.id} className="py-1.5 text-center">
                                        <span className="text-xs text-green-400 tabular-nums">{inCount}</span>
                                        <CheckCircle className="w-3 h-3 text-green-400 inline ml-0.5 -mt-0.5" />
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, ri) => {
                            const showGuestDivider = row.isGuest && ri > 0 && !rows[ri - 1].isGuest;
                            return (
                                <React.Fragment key={row.id}>
                                    {showGuestDivider && (
                                        <tr>
                                            <td
                                                colSpan={gameCount + 1}
                                                className="px-3 py-1.5 text-[10px] text-orange-300/60 uppercase tracking-wider font-semibold border-t border-orange-500/15 bg-orange-500/5"
                                            >
                                                Guests
                                            </td>
                                        </tr>
                                    )}
                                    <tr className={`border-b border-white/5 ${row.isMe ? 'bg-green-500/8' : ''}`}>
                                        <td className={`sticky left-0 z-10 backdrop-blur-sm px-3 py-2 w-[140px] min-w-[140px] md:w-[200px] md:min-w-[200px] ${row.isMe ? 'bg-green-900/95' : 'bg-green-900/90'}`}>
                                            <div className={`text-sm font-medium truncate ${
                                                row.isMe ? 'text-green-300' :
                                                row.isGuest ? 'text-orange-300' :
                                                'text-white/90'
                                            }`}>
                                                {row.displayName}
                                            </div>
                                        </td>
                                        {upcomingGames.map(game => {
                                            if (row.isGuest) {
                                                const guestName = row.displayName;
                                                const inThisGame = game.guestPlayers?.includes(guestName);
                                                const status = inThisGame
                                                    ? (game.guestAvailability?.[guestName] as AvailabilityStatus) ?? 'available'
                                                    : undefined;
                                                return (
                                                    <td key={game.id} className="p-1 text-center">
                                                        <ThreeButtonCell
                                                            status={status}
                                                            onSet={s => handleSetGuestStatus(game, guestName, s)}
                                                            onClear={() => handleClearGuestStatus(game, guestName)}
                                                        />
                                                    </td>
                                                );
                                            }

                                            const avail = scheduleAvailability.get(game.id) ?? [];
                                            const status = avail.find(a => a.userId === row.id)?.status;
                                            const member = members.find(m => m.id === row.id);
                                            return (
                                                <td key={game.id} className="p-1 text-center">
                                                    <ThreeButtonCell
                                                        status={status}
                                                        onSet={s => setAvailability(game.id, row.id, member?.displayName ?? row.displayName, s)}
                                                        onClear={() => clearAvailability(game.id, row.id)}
                                                    />
                                                </td>
                                            );
                                        })}
                                    </tr>
                                </React.Fragment>
                            );
                        })}
                        {/* Add guest row */}
                        <tr className="border-t border-white/8">
                            <td colSpan={gameCount + 1} className="px-3 py-2">
                                <form
                                    onSubmit={e => { e.preventDefault(); handleAddGuest(); }}
                                    className="flex items-center gap-2"
                                >
                                    <UserPlus className="w-4 h-4 text-orange-400 shrink-0" />
                                    <input
                                        type="text"
                                        value={newGuestName}
                                        onChange={e => setNewGuestName(e.target.value)}
                                        placeholder="Add guest..."
                                        maxLength={30}
                                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-sm placeholder-white/25 focus:outline-none focus:ring-1 focus:ring-green-400 max-w-[200px]"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!newGuestName.trim()}
                                        className="text-xs text-green-400 hover:text-green-300 disabled:opacity-30 transition-colors px-2 py-1"
                                    >
                                        Add
                                    </button>
                                </form>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AvailabilityGrid;
