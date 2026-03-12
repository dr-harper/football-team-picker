import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, CheckCircle, HelpCircle, XCircle } from 'lucide-react';
import { Game, PlayerAvailability, AvailabilityStatus } from '../../types';

interface GameCalendarProps {
    games: Game[];
    scheduleAvailability: Map<string, PlayerAvailability[]>;
    currentUserId: string;
    code: string;
    onSetAvailability: (gameId: string, status: AvailabilityStatus, currentStatus?: AvailabilityStatus) => void;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

function toKey(d: Date): string {
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function MyStatusDot({ status }: { status?: AvailabilityStatus }) {
    if (status === 'available') return <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />;
    if (status === 'maybe') return <span className="w-2 h-2 rounded-full bg-yellow-400 shrink-0" />;
    if (status === 'unavailable') return <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />;
    return <span className="w-2 h-2 rounded-full border border-white/20 shrink-0" />;
}

const GameCalendar: React.FC<GameCalendarProps> = ({
    games, scheduleAvailability, currentUserId, code, onSetAvailability,
}) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Start on the month of the earliest game, or current month
    const [cursor, setCursor] = useState<Date>(() => {
        if (games.length > 0) {
            const earliest = new Date(Math.min(...games.map(g => g.date)));
            return new Date(earliest.getFullYear(), earliest.getMonth(), 1);
        }
        return new Date(today.getFullYear(), today.getMonth(), 1);
    });

    const year = cursor.getFullYear();
    const month = cursor.getMonth();

    const gamesByDate = useMemo(() => {
        const map = new Map<string, Game[]>();
        for (const game of games) {
            const d = new Date(game.date);
            const key = toKey(d);
            const existing = map.get(key) ?? [];
            map.set(key, [...existing, game]);
        }
        return map;
    }, [games]);

    const firstDow = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: (number | null)[] = [
        ...Array(firstDow).fill(null),
        ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];
    while (cells.length % 7 !== 0) cells.push(null);

    const weeks: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
        weeks.push(cells.slice(i, i + 7));
    }

    // Expanded game for availability buttons
    const [expandedGameId, setExpandedGameId] = useState<string | null>(null);

    return (
        <div className="bg-white/5 border border-white/8 rounded-2xl overflow-hidden">
            {/* Month navigation */}
            <div className="flex items-center justify-between px-4 py-3">
                <button
                    onClick={() => setCursor(new Date(year, month - 1, 1))}
                    className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-white font-semibold text-sm">
                    {MONTHS[month]} {year}
                </span>
                <button
                    onClick={() => setCursor(new Date(year, month + 1, 1))}
                    className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 border-t border-white/8">
                {DAYS.map(d => (
                    <div key={d} className="text-center text-[10px] font-semibold text-white/30 uppercase tracking-wider py-2 border-b border-white/5">
                        {d}
                    </div>
                ))}
            </div>

            {/* Calendar body */}
            {weeks.map((week, wi) => (
                <div key={wi} className="grid grid-cols-7 border-b border-white/5 last:border-b-0">
                    {week.map((day, di) => {
                        if (!day) return <div key={`empty-${wi}-${di}`} className="min-h-[72px] sm:min-h-[88px] border-r border-white/5 last:border-r-0" />;

                        const date = new Date(year, month, day);
                        const key = toKey(date);
                        const dayGames = gamesByDate.get(key) ?? [];
                        const isToday = toKey(today) === key;
                        const isPast = date < today;

                        return (
                            <div
                                key={day}
                                className={`min-h-[72px] sm:min-h-[88px] border-r border-white/5 last:border-r-0 p-1 ${
                                    isPast && dayGames.length === 0 ? 'opacity-40' : ''
                                }`}
                            >
                                {/* Day number */}
                                <div className={`text-[11px] leading-none mb-1 px-0.5 ${
                                    isToday
                                        ? 'inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-500 text-white font-bold'
                                        : dayGames.length > 0
                                        ? 'text-white font-semibold'
                                        : 'text-white/20'
                                }`}>
                                    {day}
                                </div>

                                {/* Game chips */}
                                {dayGames.map(game => {
                                    const isCompleted = game.status === 'completed';
                                    const avail = scheduleAvailability.get(game.id) ?? [];
                                    const myStatus = avail.find(a => a.userId === currentUserId)?.status;
                                    const guestStatusMap = game.guestAvailability ?? {};
                                    const inCount = avail.filter(a => a.status === 'available').length
                                        + (game.guestPlayers ?? []).filter(n => (guestStatusMap[n] ?? 'available') === 'available').length;
                                    const isExpanded = expandedGameId === game.id;
                                    const time = new Date(game.date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

                                    return (
                                        <div key={game.id} className="mb-0.5">
                                            <button
                                                onClick={() => setExpandedGameId(isExpanded ? null : game.id)}
                                                className={`w-full text-left rounded-md px-1.5 py-1 transition-colors ${
                                                    isCompleted
                                                        ? 'bg-white/5 opacity-60'
                                                        : isExpanded
                                                        ? 'bg-green-500/25 ring-1 ring-green-400/30'
                                                        : 'bg-white/8 hover:bg-white/15'
                                                }`}
                                            >
                                                <div className="flex items-center gap-1">
                                                    {!isCompleted && <MyStatusDot status={myStatus} />}
                                                    <span className="text-[10px] text-white/80 font-medium truncate">{time}</span>
                                                </div>
                                                {isCompleted && game.score ? (
                                                    <div className="text-[9px] text-white/50 mt-0.5 tabular-nums">
                                                        {game.score.team1}–{game.score.team2}
                                                    </div>
                                                ) : (
                                                    <div className="text-[9px] text-green-400 mt-0.5 tabular-nums">{inCount} in</div>
                                                )}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            ))}

            {/* Expanded game detail panel */}
            {expandedGameId && (() => {
                const game = games.find(g => g.id === expandedGameId);
                if (!game) return null;
                const isCompleted = game.status === 'completed';
                const avail = scheduleAvailability.get(game.id) ?? [];
                const myStatus = avail.find(a => a.userId === currentUserId)?.status;
                const guestStatusMap = game.guestAvailability ?? {};
                const inCount = avail.filter(a => a.status === 'available').length
                    + (game.guestPlayers ?? []).filter(n => (guestStatusMap[n] ?? 'available') === 'available').length;
                const maybeCount = avail.filter(a => a.status === 'maybe').length;

                return (
                    <div className="border-t border-white/10 bg-white/5 px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                            <Link
                                to={`/league/${code}/game/${game.gameCode || game.id}`}
                                className="flex-1 min-w-0 hover:text-green-300 transition-colors"
                            >
                                <div className="text-white font-semibold text-sm">{game.title}</div>
                                <div className="text-green-300/70 text-xs mt-0.5">
                                    {new Date(game.date).toLocaleDateString('en-GB', {
                                        weekday: 'long', day: 'numeric', month: 'long',
                                        hour: '2-digit', minute: '2-digit',
                                    })}
                                    {game.location && <span className="text-white/30 ml-1.5">· {game.location}</span>}
                                </div>
                                {isCompleted && game.score ? (
                                    <div className="flex items-center gap-2 mt-1.5 text-xs">
                                        <span className="text-white/60">
                                            {game.teams?.[0]?.name ?? 'Team 1'} {game.score.team1} – {game.score.team2} {game.teams?.[1]?.name ?? 'Team 2'}
                                        </span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 mt-1.5 text-xs">
                                        <span className="text-green-400">{inCount} in</span>
                                        {maybeCount > 0 && <span className="text-yellow-400">{maybeCount} maybe</span>}
                                    </div>
                                )}
                            </Link>
                            {!isCompleted && (
                                <div className="flex gap-1 shrink-0">
                                    {(['available', 'maybe', 'unavailable'] as AvailabilityStatus[]).map(s => (
                                        <button
                                            key={s}
                                            onClick={() => onSetAvailability(game.id, s, myStatus)}
                                            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                                                myStatus === s
                                                    ? s === 'available' ? 'bg-green-600 text-white'
                                                    : s === 'maybe' ? 'bg-yellow-600 text-white'
                                                    : 'bg-red-600 text-white'
                                                    : 'bg-white/10 text-white/40 hover:bg-white/20'
                                            }`}
                                        >
                                            {s === 'available' ? <CheckCircle className="w-4 h-4" /> :
                                             s === 'maybe' ? <HelpCircle className="w-4 h-4" /> :
                                             <XCircle className="w-4 h-4" />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

export default GameCalendar;
