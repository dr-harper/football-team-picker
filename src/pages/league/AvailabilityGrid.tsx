import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, HelpCircle, XCircle } from 'lucide-react';
import { Game, PlayerAvailability, AvailabilityStatus } from '../../types';
import { setAvailability } from '../../utils/firestore';

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

function StatusIcon({ status }: { status?: AvailabilityStatus }) {
    if (status === 'available') return <CheckCircle className="w-4 h-4 text-green-400" />;
    if (status === 'maybe') return <HelpCircle className="w-4 h-4 text-yellow-400" />;
    if (status === 'unavailable') return <XCircle className="w-4 h-4 text-red-400" />;
    return <span className="w-4 h-4 block rounded-full border border-white/15" />;
}

function CycleButton({
    gameId, memberId, memberName, current,
}: {
    gameId: string;
    memberId: string;
    memberName: string;
    current?: AvailabilityStatus;
}) {
    const cycle: AvailabilityStatus[] = ['available', 'maybe', 'unavailable'];

    const handleClick = async () => {
        const idx = current ? cycle.indexOf(current) : -1;
        const next = cycle[(idx + 1) % cycle.length];
        await setAvailability(gameId, memberId, memberName, next);
    };

    return (
        <button
            onClick={handleClick}
            className="w-full h-full flex items-center justify-center hover:bg-white/10 rounded transition-colors"
            title={current ?? 'No response'}
        >
            <StatusIcon status={current} />
        </button>
    );
}

const AvailabilityGrid: React.FC<AvailabilityGridProps> = ({
    upcomingGames, members, scheduleAvailability, currentUserId, code,
}) => {
    const sortedMembers = [...members].sort((a, b) => {
        if (a.id === currentUserId) return -1;
        if (b.id === currentUserId) return 1;
        return a.displayName.localeCompare(b.displayName);
    });

    const gameCount = upcomingGames.length;

    return (
        <div className="bg-white/5 border border-white/8 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full border-collapse" style={{ minWidth: `${140 + gameCount * 80}px` }}>
                    <thead>
                        {/* Date headers */}
                        <tr className="border-b border-white/8">
                            <th className="sticky left-0 z-10 bg-green-900/90 backdrop-blur-sm p-0 w-[140px] min-w-[140px]" />
                            {upcomingGames.map(game => {
                                const d = new Date(game.date);
                                return (
                                    <th key={game.id} className="p-2 text-center min-w-[80px]">
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
                        {sortedMembers.map(member => {
                            const isMe = member.id === currentUserId;
                            return (
                                <tr
                                    key={member.id}
                                    className={`border-b border-white/5 ${isMe ? 'bg-green-500/8' : ''}`}
                                >
                                    <td className={`sticky left-0 z-10 backdrop-blur-sm px-3 py-2 w-[140px] min-w-[140px] ${isMe ? 'bg-green-900/95' : 'bg-green-900/90'}`}>
                                        <div className={`text-sm font-medium truncate ${isMe ? 'text-green-300' : 'text-white/90'}`}>
                                            {member.displayName}
                                        </div>
                                    </td>
                                    {upcomingGames.map(game => {
                                        const avail = scheduleAvailability.get(game.id) ?? [];
                                        const status = avail.find(a => a.userId === member.id)?.status;
                                        return (
                                            <td key={game.id} className="p-1 text-center">
                                                {isMe ? (
                                                    <div className="flex items-center justify-center gap-0.5">
                                                        {(['available', 'maybe', 'unavailable'] as AvailabilityStatus[]).map(s => (
                                                            <button
                                                                key={s}
                                                                onClick={() => setAvailability(game.id, member.id, member.displayName, s)}
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
                                                ) : (
                                                    <CycleButton
                                                        gameId={game.id}
                                                        memberId={member.id}
                                                        memberName={member.displayName}
                                                        current={status}
                                                    />
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AvailabilityGrid;
