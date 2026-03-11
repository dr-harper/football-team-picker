export interface Player {
    name: string;
    playerId?: string;        // userId or 'guest:<name>' — set when generated from availability
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
    playerId: string;         // userId of the player who submitted
    playerName?: string;      // deprecated — kept for backward compat with old data
    amount: number;
    description: string;
    date: number;
    status: 'pending' | 'approved' | 'rejected';
}

export interface Season {
    id: string;
    name: string;           // e.g. "Spring 2026", "Season 3"
    startDate: number;      // timestamp
    endDate?: number;       // timestamp, set when archived
    status: 'active' | 'archived';
    createdAt: number;
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
    payments?: Record<string, PaymentRecord[]>; // playerId (userId) → dated payment history
    expenses?: LeagueExpense[];                 // player-submitted expenses awaiting admin approval
    seasons?: Record<string, Season>;          // season map keyed by ID
    activeSeasonId?: string;                   // which season is currently active
}

export type GameStatus = 'scheduled' | 'in_progress' | 'completed';

export interface GameScore {
    team1: number;
    team2: number;
}

export interface GoalScorer {
    playerId: string;  // userId or 'guest:<name>' — was 'name' (displayName)
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
    playerPositions?: Record<string, 'g' | 'd' | 's'>;    // playerId → position tag (g=GK, d=DEF, s=FWD)
    goalScorers?: GoalScorer[];    // tally per playerId
    assisters?: GoalScorer[];      // assist tally per playerId (reuses GoalScorer shape)
    manOfTheMatch?: string;        // playerId of player picked by admin
    gameCode?: string;             // short 6-char shareable code
    costPerPerson?: number;        // overrides league default; undefined = use league default
    attendees?: string[];          // playerIds who actually attended; set by admin post-game
    seasonId?: string;             // links game to a season (undefined = unassigned / pre-season)
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
