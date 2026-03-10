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

export interface PaymentRecord {
    amount: number;
    date: number; // timestamp
}

export interface LeagueExpense {
    id: string;
    playerName: string;
    amount: number;
    description: string;
    date: number;
    status: 'pending' | 'approved' | 'rejected';
}

export interface League {
    id: string;
    name: string;
    joinCode: string;
    createdBy: string;
    memberIds: string[];
    createdAt: number;
    defaultVenue?: string;
    defaultVenueLat?: number;
    defaultVenueLon?: number;
    adminIds?: string[];               // promoted admins (subset of memberIds, excludes owner)
    defaultCostPerPerson?: number;
    payments?: Record<string, PaymentRecord[]>; // playerName → dated payment history
    expenses?: LeagueExpense[];                 // player-submitted expenses awaiting admin approval
}

export type GameStatus = 'scheduled' | 'in_progress' | 'completed';

export interface GameScore {
    team1: number;
    team2: number;
}

export interface GoalScorer {
    name: string;
    goals: number;
}

export interface Game {
    id: string;
    leagueId: string;
    title: string;
    date: number; // timestamp
    status: GameStatus;
    location?: string;
    locationLat?: number;
    locationLon?: number;
    playersText?: string;
    teams?: Team[];
    draftSetups?: TeamSetup[];
    score?: GameScore;
    guestPlayers?: string[];           // ringer names added by admin, no account needed
    guestAvailability?: Record<string, AvailabilityStatus>; // per-guest status override (default: available)
    playerPositions?: Record<string, 'g' | 'd' | 's'>;    // position tag per player name (g=GK, d=DEF, s=FWD)
    goalScorers?: GoalScorer[];    // simple tally per player
    assisters?: GoalScorer[];      // assist tally per player (reuses GoalScorer shape)
    manOfTheMatch?: string;        // player name picked by admin
    gameCode?: string;             // short 6-char shareable code
    costPerPerson?: number;        // overrides league default; undefined = use league default
    attendees?: string[];          // player names who actually attended; set by admin post-game
    createdBy: string;
    createdAt: number;
}

export interface NotificationPreferences {
    gameScheduled: boolean;
    availabilityReminder: boolean;
    teamsGenerated: boolean;
    resultRecorded: boolean;
    paymentReminder: boolean;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
    gameScheduled: true,
    availabilityReminder: true,
    teamsGenerated: true,
    resultRecorded: false,
    paymentReminder: false,
};

export interface WeatherForecast {
    temperature: number;
    rainMm: number;
    rainProbability: number;
    windSpeed: number;
    weatherCode: number;
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
