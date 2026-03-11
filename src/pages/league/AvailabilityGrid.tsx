import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, HelpCircle, XCircle } from 'lucide-react';
import { Game, PlayerAvailability, AvailabilityStatus } from '../../types';
import { setAvailability, updateGuestAvailability } from '../../utils/firestore';

interface Member {
    id: string;
    displayName: string;
    email: string;
}

interface AvailabilityGridProps {
    upcomingGames: Game[];
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
}: {
    status?: AvailabilityStatus;
    onSet: (s: AvailabilityStatus) => void;
}) {
    return (
        <div className="flex items-center justify-center gap-0.5">
            {(['available', 'maybe', 'unavailable'] as AvailabilityStatus[]).map(s => (
                <button
                    key={s}
                    onClick={() => onSet(s)}
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

function getGuestStatus(game: Game, guestName: string): AvailabilityStatus | undefined {
    if (!game.guestPlayers?.includes(guestName)) return undefined;
    return (game.guestAvailability?.[guestName] as AvailabilityStatus) ?? 'available';
}

const AvailabilityGrid: React.FC<AvailabilityGridProps> = ({
    upcomingGames, members, scheduleAvailability, currentUserId, code,
}) => {
    // Collect all unique guests across upcoming games
    const allGuests = useMemo(() => {
        const guestSet = new Set<string>();
        for (const game of upcomingGames) {
            for (const name of game.guestPlayers ?? []) {
                guestSet.add(name);
            }
        }
        return [...guestSet].sort((a, b) => a.localeCompare(b));
    }, [upcomingGames]);

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

    const handleSetGuestStatus = async (game: Game, guestName: string, status: AvailabilityStatus) => {
        const current = game.guestAvailability ?? {};
        await updateGuestAvailability(game.id, { ...current, [guestName]: status });
    };

    return (
        <div className="bg-white/5 border border-white/8 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full border-collapse" style={{ minWidth: `${140 + gameCount * 90}px` }}>
                    <thead>
                        {/* Date headers */}
                        <tr className="border-b border-white/8">
                            <th className="sticky left-0 z-10 bg-green-900/90 backdrop-blur-sm p-0 w-[140px] min-w-[140px]" />
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
                            <th className="sticky left-0 z-10 bg-green-900/90 backdrop-blur-sm p-0 w-[140px] min-w-[140px]" />
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
                                        <td className={`sticky left-0 z-10 backdrop-blur-sm px-3 py-2 w-[140px] min-w-[140px] ${row.isMe ? 'bg-green-900/95' : 'bg-green-900/90'}`}>
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
                                                if (!inThisGame) {
                                                    return <td key={game.id} className="p-1 text-center"><span className="text-white/10">—</span></td>;
                                                }
                                                const status = getGuestStatus(game, guestName);
                                                return (
                                                    <td key={game.id} className="p-1 text-center">
                                                        <ThreeButtonCell
                                                            status={status}
                                                            onSet={s => handleSetGuestStatus(game, guestName, s)}
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
                                                    />
                                                </td>
                                            );
                                        })}
                                    </tr>
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AvailabilityGrid;
