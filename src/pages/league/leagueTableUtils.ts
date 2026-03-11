import { Game } from '../../types';

export type FormResult = 'W' | 'D' | 'L';

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
    form: FormResult[];
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
            s = { playerId, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0, form: [] };
            standings.set(playerId, s);
        }
        return s;
    };

    // Sort by date so form array reflects chronological order
    const sorted = [...games].sort((a, b) => a.date - b.date);

    for (const game of sorted) {
        if (game.status !== 'completed' || !game.score || !game.teams || game.teams.length < 2) continue;

        const { team1: score1, team2: score2 } = game.score;
        const team1Players = game.teams[0]?.players ?? [];
        const team2Players = game.teams[1]?.players ?? [];

        const t1Result: FormResult = score1 > score2 ? 'W' : score1 === score2 ? 'D' : 'L';
        const t2Result: FormResult = score2 > score1 ? 'W' : score2 === score1 ? 'D' : 'L';

        for (const p of team1Players) {
            const id = p.playerId ?? p.name;
            const s = getOrCreate(id);
            s.played++;
            s.goalsFor += score1;
            s.goalsAgainst += score2;
            s.form.push(t1Result);
            if (t1Result === 'W') { s.won++; s.points += 3; }
            else if (t1Result === 'D') { s.drawn++; s.points += 1; }
            else { s.lost++; }
        }

        for (const p of team2Players) {
            const id = p.playerId ?? p.name;
            const s = getOrCreate(id);
            s.played++;
            s.goalsFor += score2;
            s.goalsAgainst += score1;
            s.form.push(t2Result);
            if (t2Result === 'W') { s.won++; s.points += 3; }
            else if (t2Result === 'D') { s.drawn++; s.points += 1; }
            else { s.lost++; }
        }
    }

    // Trim form to last 5 results
    for (const s of standings.values()) {
        s.form = s.form.slice(-5);
    }

    // Compute GD and sort
    for (const s of standings.values()) {
        s.goalDifference = s.goalsFor - s.goalsAgainst;
    }

    return [...standings.values()].sort((a, b) =>
        b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor
    );
}
