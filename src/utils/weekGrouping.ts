import type { Game } from '../types';

export interface WeekGroup {
    label: string;
    games: Game[];
}

/** Get the Monday of the ISO week containing `date` */
function getWeekMonday(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Monday = 1, Sunday = 0 → -6
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

/** Format a week range label like "10–16 April" or "28 Apr – 4 May" */
function formatWeekLabel(monday: Date): string {
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const dayFmt = { day: 'numeric' as const };
    const monthFmt = { month: 'long' as const };

    const monMonth = monday.toLocaleDateString('en-GB', monthFmt);
    const sunMonth = sunday.toLocaleDateString('en-GB', monthFmt);
    const monDay = monday.toLocaleDateString('en-GB', dayFmt);
    const sunDay = sunday.toLocaleDateString('en-GB', dayFmt);

    if (monMonth === sunMonth) {
        return `${monDay}–${sunDay} ${monMonth}`;
    }
    // Week spans two months
    const shortMon = monday.toLocaleDateString('en-GB', { month: 'short' });
    const shortSun = sunday.toLocaleDateString('en-GB', { month: 'short' });
    return `${monDay} ${shortMon} – ${sunDay} ${shortSun}`;
}

/** Group games by ISO week, sorted ascending by date */
export function groupGamesByWeek(games: Game[]): WeekGroup[] {
    if (games.length === 0) return [];

    const sorted = [...games].sort((a, b) => a.date - b.date);
    const groups: WeekGroup[] = [];
    let currentMonday: string | null = null;
    let currentGroup: Game[] = [];

    for (const game of sorted) {
        const monday = getWeekMonday(new Date(game.date));
        const key = monday.toISOString();

        if (key !== currentMonday) {
            if (currentGroup.length > 0 && currentMonday) {
                groups.push({
                    label: formatWeekLabel(new Date(currentMonday)),
                    games: currentGroup,
                });
            }
            currentMonday = key;
            currentGroup = [game];
        } else {
            currentGroup.push(game);
        }
    }

    if (currentGroup.length > 0 && currentMonday) {
        groups.push({
            label: formatWeekLabel(new Date(currentMonday)),
            games: currentGroup,
        });
    }

    return groups;
}
