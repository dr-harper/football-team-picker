import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarPickerProps {
    value: string; // YYYY-MM-DD
    min?: string;  // YYYY-MM-DD
    onChange: (value: string) => void;
}

const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

function parseDate(str: string): Date | null {
    if (!str) return null;
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
}

function toDateStr(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

const CalendarPicker: React.FC<CalendarPickerProps> = ({ value, min, onChange }) => {
    const selected = parseDate(value);
    const minDate = parseDate(min ?? '');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [cursor, setCursor] = useState<Date>(() => {
        const base = selected ?? today;
        return new Date(base.getFullYear(), base.getMonth(), 1);
    });

    const year = cursor.getFullYear();
    const month = cursor.getMonth();

    // Day of week for the 1st (Monday-based: 0=Mon … 6=Sun)
    const firstDow = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const prevMonth = () => setCursor(new Date(year, month - 1, 1));
    const nextMonth = () => setCursor(new Date(year, month + 1, 1));

    const handleDay = (day: number) => {
        const date = new Date(year, month, day);
        if (minDate && date < minDate) return;
        onChange(toDateStr(date));
    };

    const cells: (number | null)[] = [
        ...Array(firstDow).fill(null),
        ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];
    // Pad to complete last row
    while (cells.length % 7 !== 0) cells.push(null);

    return (
        <div className="bg-white/10 border border-white/20 rounded-xl p-2 select-none">
            {/* Header */}
            <div className="flex items-center justify-between mb-1">
                <button
                    type="button"
                    onClick={prevMonth}
                    className="p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                >
                    <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-white font-semibold text-xs">
                    {MONTHS[month]} {year}
                </span>
                <button
                    type="button"
                    onClick={nextMonth}
                    className="p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                >
                    <ChevronRight className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7">
                {DAYS.map(d => (
                    <div key={d} className="text-center text-xs font-medium text-green-300/70 py-0.5">
                        {d}
                    </div>
                ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7">
                {cells.map((day, i) => {
                    if (!day) return <div key={`empty-${i}`} className="h-7" />;

                    const date = new Date(year, month, day);
                    const dateStr = toDateStr(date);
                    const isSelected = value === dateStr;
                    const isToday = toDateStr(today) === dateStr;
                    const isDisabled = minDate ? date < minDate : false;

                    return (
                        <button
                            key={day}
                            type="button"
                            onClick={() => handleDay(day)}
                            disabled={isDisabled}
                            className={`
                                h-7 w-full flex items-center justify-center rounded-md text-xs transition-colors
                                ${isSelected
                                    ? 'bg-green-500 text-white font-bold'
                                    : isToday
                                    ? 'border border-green-400 text-green-300 font-semibold hover:bg-white/10'
                                    : isDisabled
                                    ? 'text-white/20 cursor-not-allowed'
                                    : 'text-white hover:bg-white/10'}
                            `}
                        >
                            {day}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default CalendarPicker;
