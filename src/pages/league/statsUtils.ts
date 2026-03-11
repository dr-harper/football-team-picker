import { Game } from '../../types';

export interface GameStats {
    scorerTotals: Map<string, number>;
    assistTotals: Map<string, number>;
    motmTotals: Map<string, number>;
    winCounts: Map<string, number>;
    gamesPlayedCounts: Map<string, number>;
}

export interface ExtendedGameStats extends GameStats {
    cleanSheets: Map<string, number>;
    hatTricks: Map<string, number>;
    form: Map<string, ('W' | 'D' | 'L')[]>;
}

/** All Maps are keyed by playerId (userId or 'guest:<name>'). */
export function computeGameStats(games: Game[]): GameStats {
    const scorerTotals = new Map<string, number>();
    games.forEach(g => {
        g.goalScorers?.forEach(gs => scorerTotals.set(gs.playerId, (scorerTotals.get(gs.playerId) ?? 0) + gs.goals));
    });

    const assistTotals = new Map<string, number>();
    games.forEach(g => {
        g.assisters?.forEach(a => assistTotals.set(a.playerId, (assistTotals.get(a.playerId) ?? 0) + a.goals));
    });

    const motmTotals = new Map<string, number>();
    games.forEach(g => {
        if (g.manOfTheMatch) motmTotals.set(g.manOfTheMatch, (motmTotals.get(g.manOfTheMatch) ?? 0) + 1);
    });

    const winCounts = new Map<string, number>();
    const gamesPlayedCounts = new Map<string, number>();
    games.forEach(g => {
        if (!g.teams || !g.score) return;
        g.teams.forEach((team, idx) => {
            const won = idx === 0 ? g.score!.team1 > g.score!.team2 : g.score!.team2 > g.score!.team1;
            team.players.forEach(p => {
                const pid = p.playerId ?? p.name;
                gamesPlayedCounts.set(pid, (gamesPlayedCounts.get(pid) ?? 0) + 1);
                if (won) winCounts.set(pid, (winCounts.get(pid) ?? 0) + 1);
            });
        });
    });

    return { scorerTotals, assistTotals, motmTotals, winCounts, gamesPlayedCounts };
}

export function computeExtendedStats(games: Game[]): ExtendedGameStats {
    const base = computeGameStats(games);

    const cleanSheets = new Map<string, number>();
    games.forEach(g => {
        if (!g.teams || !g.score) return;
        g.teams.forEach((team, idx) => {
            const conceded = idx === 0 ? g.score!.team2 : g.score!.team1;
            if (conceded === 0) {
                team.players.forEach(p => {
                    const pid = p.playerId ?? p.name;
                    cleanSheets.set(pid, (cleanSheets.get(pid) ?? 0) + 1);
                });
            }
        });
    });

    const hatTricks = new Map<string, number>();
    games.forEach(g => {
        g.goalScorers?.forEach(gs => {
            if (gs.goals >= 3) hatTricks.set(gs.playerId, (hatTricks.get(gs.playerId) ?? 0) + 1);
        });
    });

    const form = new Map<string, ('W' | 'D' | 'L')[]>();
    [...games].reverse().forEach(g => {
        if (!g.teams || !g.score) return;
        g.teams.forEach((team, idx) => {
            const scored = idx === 0 ? g.score!.team1 : g.score!.team2;
            const conceded = idx === 0 ? g.score!.team2 : g.score!.team1;
            const result: 'W' | 'D' | 'L' = scored > conceded ? 'W' : scored < conceded ? 'L' : 'D';
            team.players.forEach(p => {
                const pid = p.playerId ?? p.name;
                const prev = form.get(pid) ?? [];
                form.set(pid, [...prev, result].slice(-5));
            });
        });
    });

    return { ...base, cleanSheets, hatTricks, form };
}

export interface PersonalStats {
    goals: number;
    assists: number;
    motm: number;
    gamesPlayed: number;
    wins: number;
}

export function getPersonalStats(stats: GameStats, playerId: string): PersonalStats {
    return {
        goals: stats.scorerTotals.get(playerId) ?? 0,
        assists: stats.assistTotals.get(playerId) ?? 0,
        motm: stats.motmTotals.get(playerId) ?? 0,
        gamesPlayed: stats.gamesPlayedCounts.get(playerId) ?? 0,
        wins: stats.winCounts.get(playerId) ?? 0,
    };
}
