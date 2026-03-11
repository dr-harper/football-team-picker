import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, CheckCircle, HelpCircle, XCircle } from 'lucide-react';
import { Game, PlayerAvailability, AvailabilityStatus } from '../../types';

interface GameCalendarProps {
    games: Game[];
    scheduleAvailability: Map<string, PlayerAvailability[]>;
    currentUserId: string;
    code: string;
    onSetAvailability: (gameId: string, status: AvailabilityStatus) => void;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

function toKey(d: Date): string {
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

const GameCalendar: React.FC<GameCalendarProps> = ({
    games, scheduleAvailability, currentUserId, code, onSetAvailability,
}) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [cursor, setCursor] = useState<Date>(() => new Date(today.getFullYear(), today.getMonth(), 1));

    const year = cursor.getFullYear();
    const month = cursor.getMonth();

    // Map date keys to games
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

    const [selectedDay, setSelectedDay] = useState<number | null>(null);
    const selectedGames = selectedDay
        ? gamesByDate.get(toKey(new Date(year, month, selectedDay))) ?? []
        : [];

    return (
        <div className="bg-white/5 border border-white/8 rounded-2xl overflow-hidden">
            {/* Month navigation */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
                <button
                    onClick={() => { setCursor(new Date(year, month - 1, 1)); setSelectedDay(null); }}
                    className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-white font-semibold text-sm">
                    {MONTHS[month]} {year}
                </span>
                <button
                    onClick={() => { setCursor(new Date(year, month + 1, 1)); setSelectedDay(null); }}
                    className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 px-2 pt-2">
                {DAYS.map(d => (
                    <div key={d} className="text-center text-[10px] font-medium text-white/30 uppercase tracking-wider py-1">
                        {d}
                    </div>
                ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7 px-2 pb-2">
                {cells.map((day, i) => {
                    if (!day) return <div key={`empty-${i}`} className="h-12" />;

                    const date = new Date(year, month, day);
                    const key = toKey(date);
                    const dayGames = gamesByDate.get(key) ?? [];
                    const hasGames = dayGames.length > 0;
                    const isToday = toKey(today) === key;
                    const isSelected = selectedDay === day;

                    // Count available for this day's games
                    const totalIn = dayGames.reduce((sum, g) => {
                        const avail = scheduleAvailability.get(g.id) ?? [];
                        const guestStatusMap = g.guestAvailability ?? {};
                        return sum
                            + avail.filter(a => a.status === 'available').length
                            + (g.guestPlayers ?? []).filter(n => (guestStatusMap[n] ?? 'available') === 'available').length;
                    }, 0);

                    return (
                        <button
                            key={day}
                            onClick={() => hasGames ? setSelectedDay(isSelected ? null : day) : undefined}
                            className={`h-12 w-full flex flex-col items-center justify-center rounded-lg text-xs transition-colors relative ${
                                isSelected ? 'bg-green-500/20 ring-1 ring-green-400/40' :
                                hasGames ? 'hover:bg-white/10 cursor-pointer' :
                                ''
                            } ${isToday ? 'font-bold' : ''}`}
                        >
                            <span className={`${
                                isToday ? 'text-green-300' :
                                hasGames ? 'text-white' :
                                'text-white/25'
                            }`}>
                                {day}
                            </span>
                            {hasGames && (
                                <div className="flex items-center gap-0.5 mt-0.5">
                                    {dayGames.length > 1 ? (
                                        <span className="text-[9px] text-green-400 font-medium">{dayGames.length} games</span>
                                    ) : (
                                        <span className="text-[9px] text-green-400 tabular-nums">{totalIn} in</span>
                                    )}
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Selected day detail */}
            {selectedDay !== null && selectedGames.length > 0 && (
                <div className="border-t border-white/8 px-3 py-3 space-y-2">
                    <div className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">
                        {new Date(year, month, selectedDay).toLocaleDateString('en-GB', {
                            weekday: 'long', day: 'numeric', month: 'long',
                        })}
                    </div>
                    {selectedGames.map(game => {
                        const avail = scheduleAvailability.get(game.id) ?? [];
                        const myStatus = avail.find(a => a.userId === currentUserId)?.status;
                        const guestStatusMap = game.guestAvailability ?? {};
                        const inCount = avail.filter(a => a.status === 'available').length
                            + (game.guestPlayers ?? []).filter(n => (guestStatusMap[n] ?? 'available') === 'available').length;

                        return (
                            <div key={game.id} className="bg-white/5 border border-white/8 rounded-xl p-3">
                                <div className="flex items-center justify-between gap-2">
                                    <Link
                                        to={`/league/${code}/game/${game.gameCode || game.id}`}
                                        className="flex-1 min-w-0 hover:text-green-300 transition-colors"
                                    >
                                        <div className="text-white font-semibold text-sm">{game.title}</div>
                                        <div className="text-green-300/70 text-xs mt-0.5">
                                            {new Date(game.date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                            {game.location && <span className="text-white/30 ml-1.5">· {game.location}</span>}
                                        </div>
                                        <div className="text-xs text-green-400 mt-1">{inCount} available</div>
                                    </Link>
                                    <div className="flex gap-1 shrink-0">
                                        {(['available', 'maybe', 'unavailable'] as AvailabilityStatus[]).map(s => (
                                            <button
                                                key={s}
                                                onClick={() => onSetAvailability(game.id, s)}
                                                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
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
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default GameCalendar;
