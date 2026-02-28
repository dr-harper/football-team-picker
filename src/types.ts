export interface Player {
    name: string;
    isGoalkeeper: boolean;
    isStriker: boolean;
    isDefender: boolean;
    isteam1: boolean;
    isteam2: boolean;
    role: string;
    shirtNumber: number | null;
}

export interface Team {
    name: string;
    players: Player[];
    color: string;
}

export interface TeamSetup {
    id: string;
    teams: Team[];
    playersInput: string;
}

export interface PositionedPlayer {
    top: string;
    left: string;
    player: Player;
    playerIndex: number;
}

// --- Firebase / League types ---

export interface League {
    id: string;
    name: string;
    joinCode: string;
    createdBy: string;
    memberIds: string[];
    createdAt: number;
}

export type GameStatus = 'scheduled' | 'in_progress' | 'completed';

export interface GameScore {
    team1: number;
    team2: number;
}

export interface Game {
    id: string;
    leagueId: string;
    title: string;
    date: number; // timestamp
    status: GameStatus;
    playersText?: string;
    teams?: Team[];
    score?: GameScore;
    createdBy: string;
    createdAt: number;
}

export type AvailabilityStatus = 'available' | 'unavailable' | 'maybe';

export interface PlayerAvailability {
    id: string; // `${gameId}_${userId}`
    gameId: string;
    userId: string;
    displayName: string;
    status: AvailabilityStatus;
    updatedAt: number;
}
