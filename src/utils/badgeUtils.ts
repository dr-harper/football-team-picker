import { Game } from '../types';

export interface Badge {
    emoji: string;
    label: string;
}

/**
 * Compute player badges from completed games.
 * Pure function — no side effects.
 */
export function computeBadges(allCompleted: Game[], myId: string): Badge[] {
    const badges: Badge[] = [];

    let goals = 0;
    let motm = 0;
    let gamesPlayed = 0;
    let wins = 0;

    for (const g of allCompleted) {
        const inGame = g.teams?.some(t => t.players.some(p => (p.playerId ?? p.name) === myId));
        if (inGame) gamesPlayed++;

        const scorerEntry = g.goalScorers?.find(s => s.playerId === myId);
        if (scorerEntry) goals += scorerEntry.goals;

        if (g.manOfTheMatch === myId) motm++;

        if (g.score && g.teams) {
            const inTeam1 = g.teams[0]?.players.some(p => (p.playerId ?? p.name) === myId);
            const inTeam2 = g.teams[1]?.players.some(p => (p.playerId ?? p.name) === myId);
            if (inTeam1 && g.score.team1 > g.score.team2) wins++;
            else if (inTeam2 && g.score.team2 > g.score.team1) wins++;
        }
    }

    const hasHatTrick = allCompleted.some(g =>
        (g.goalScorers?.find(s => s.playerId === myId)?.goals ?? 0) >= 3
    );
    if (hasHatTrick) badges.push({ emoji: '🎯', label: 'Hat-trick Hero' });
    if (motm >= 5) badges.push({ emoji: '⭐', label: 'MOTM Machine' });
    if (allCompleted.length > 0 && gamesPlayed / allCompleted.length >= 0.8) {
        badges.push({ emoji: '📅', label: 'Ever Present' });
    }
    if (goals >= 10) badges.push({ emoji: '⚽', label: '10 Club' });
    if (wins >= 10) badges.push({ emoji: '🏆', label: 'Winner' });

    const recentGamesPlayed = allCompleted
        .filter(g => g.teams?.some(t => t.players.some(p => (p.playerId ?? p.name) === myId)))
        .sort((a, b) => b.date - a.date)
        .slice(0, 3);
    if (recentGamesPlayed.length === 3 && recentGamesPlayed.every(g =>
        (g.goalScorers?.find(s => s.playerId === myId)?.goals ?? 0) > 0
    )) {
        badges.push({ emoji: '🔥', label: 'On Fire' });
    }

    return badges;
}

/**
 * Compute personal stats from completed games.
 */
export function computePersonalStats(allCompleted: Game[], myId: string) {
    let goals = 0, assists = 0, motm = 0, gamesPlayed = 0;
    for (const g of allCompleted) {
        const inGame = g.teams?.some(t => t.players.some(p => (p.playerId ?? p.name) === myId));
        if (inGame) gamesPlayed++;
        const scorerEntry = g.goalScorers?.find(s => s.playerId === myId);
        if (scorerEntry) goals += scorerEntry.goals;
        const assisterEntry = g.assisters?.find(a => a.playerId === myId);
        if (assisterEntry) assists += assisterEntry.goals;
        if (g.manOfTheMatch === myId) motm++;
    }
    return { goals, assists, motm, games: gamesPlayed };
}
