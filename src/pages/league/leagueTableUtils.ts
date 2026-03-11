import { Game } from '../../types';

export interface PlayerStanding {
    playerId: string;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDifference: number;
    points: number;
}

/**
 * Compute individual league table standings from completed games.
 * Each player's result is determined by which team they were on.
 * W=3, D=1, L=0. Sorted by: points desc, GD desc, GF desc.
 */
export function computeLeagueTable(games: Game[]): PlayerStanding[] {
    const standings = new Map<string, PlayerStanding>();

    const getOrCreate = (playerId: string): PlayerStanding => {
        let s = standings.get(playerId);
        if (!s) {
            s = { playerId, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0 };
            standings.set(playerId, s);
        }
        return s;
    };

    for (const game of games) {
        if (game.status !== 'completed' || !game.score || !game.teams || game.teams.length < 2) continue;

        const { team1: score1, team2: score2 } = game.score;
        const team1Players = game.teams[0]?.players ?? [];
        const team2Players = game.teams[1]?.players ?? [];

        for (const p of team1Players) {
            const id = p.playerId ?? p.name;
            const s = getOrCreate(id);
            s.played++;
            s.goalsFor += score1;
            s.goalsAgainst += score2;
            if (score1 > score2) { s.won++; s.points += 3; }
            else if (score1 === score2) { s.drawn++; s.points += 1; }
            else { s.lost++; }
        }

        for (const p of team2Players) {
            const id = p.playerId ?? p.name;
            const s = getOrCreate(id);
            s.played++;
            s.goalsFor += score2;
            s.goalsAgainst += score1;
            if (score2 > score1) { s.won++; s.points += 3; }
            else if (score2 === score1) { s.drawn++; s.points += 1; }
            else { s.lost++; }
        }
    }

    // Compute GD and sort
    for (const s of standings.values()) {
        s.goalDifference = s.goalsFor - s.goalsAgainst;
    }

    return [...standings.values()].sort((a, b) =>
        b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor
    );
}
