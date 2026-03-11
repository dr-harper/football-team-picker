import { Game, Player, Team, GameScore, GoalScorer, League, PaymentRecord, Season } from '../../src/types';

let counter = 0;

function nextId(): string {
    return `test-${++counter}`;
}

export function resetCounter(): void {
    counter = 0;
}

export function makePlayer(overrides: Partial<Player> = {}): Player {
    return {
        name: overrides.name ?? `Player ${nextId()}`,
        isGoalkeeper: false,
        isStriker: false,
        isDefender: false,
        isteam1: false,
        isteam2: false,
        role: 'outfield',
        shirtNumber: null,
        ...overrides,
    };
}

export function makeTeam(overrides: Partial<Team> & { players?: Partial<Player>[] } = {}): Team {
    const players = (overrides.players ?? []).map(p => makePlayer(p));
    return {
        name: overrides.name ?? `Team ${nextId()}`,
        color: overrides.color ?? '#ff0000',
        players,
    };
}

export function makeGame(overrides: Partial<Game> = {}): Game {
    const id = overrides.id ?? nextId();
    return {
        id,
        leagueId: overrides.leagueId ?? 'league-1',
        title: overrides.title ?? 'Test Game',
        date: overrides.date ?? Date.now(),
        status: overrides.status ?? 'completed',
        createdBy: overrides.createdBy ?? 'user-1',
        createdAt: overrides.createdAt ?? Date.now(),
        ...overrides,
    };
}

export function makeCompletedGame(opts: {
    team1Players: Partial<Player>[];
    team2Players: Partial<Player>[];
    score: GameScore;
    goalScorers?: GoalScorer[];
    assisters?: GoalScorer[];
    manOfTheMatch?: string;
    attendees?: string[];
    costPerPerson?: number;
    date?: number;
    seasonId?: string;
} & Partial<Game>): Game {
    return makeGame({
        status: 'completed',
        teams: [
            makeTeam({ name: 'Team A', players: opts.team1Players }),
            makeTeam({ name: 'Team B', players: opts.team2Players }),
        ],
        score: opts.score,
        goalScorers: opts.goalScorers,
        assisters: opts.assisters,
        manOfTheMatch: opts.manOfTheMatch,
        attendees: opts.attendees,
        costPerPerson: opts.costPerPerson,
        date: opts.date,
        seasonId: opts.seasonId,
        ...opts,
    });
}

export function makeLeague(overrides: Partial<League> = {}): League {
    return {
        id: overrides.id ?? nextId(),
        name: overrides.name ?? 'Test League',
        joinCode: overrides.joinCode ?? 'ABC123',
        createdBy: overrides.createdBy ?? 'user-1',
        memberIds: overrides.memberIds ?? ['user-1'],
        createdAt: overrides.createdAt ?? Date.now(),
        ...overrides,
    };
}

export function makePaymentRecord(overrides: Partial<PaymentRecord> = {}): PaymentRecord {
    return {
        amount: overrides.amount ?? 10,
        date: overrides.date ?? Date.now(),
        ...overrides,
    };
}

export function makeSeason(overrides: Partial<Season> = {}): Season {
    const id = overrides.id ?? nextId();
    return {
        id,
        name: overrides.name ?? 'Season 1',
        startDate: overrides.startDate ?? Date.now(),
        status: overrides.status ?? 'active',
        createdAt: overrides.createdAt ?? Date.now(),
        ...overrides,
    };
}
