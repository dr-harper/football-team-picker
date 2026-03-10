import { Game, League, PlayerAvailability, TeamSetup } from '../types';

const PLAYERS = [
    'Jamie', 'Reece', 'Marcus', 'Declan', 'Bukayo',
    'Mason', 'Jude', 'Phil', 'Kyle', 'Harry',
    'Ollie', 'Trent', 'Jordan', 'Jack', 'Cole',
    'Ezri',
];

function makeTeams(teamAName: string, teamBName: string, teamA: string[], teamB: string[], colA = '#3b82f6', colB = '#ef4444') {
    const toPlayer = (name: string, idx: number) => ({
        name,
        isGoalkeeper: idx === 0,
        isStriker: idx >= 6,
        isDefender: idx >= 1 && idx <= 3,
        isteam1: false,
        isteam2: false,
        role: idx === 0 ? 'GK' : idx <= 3 ? 'DEF' : idx <= 5 ? 'MID' : 'FWD',
        shirtNumber: idx + 1,
    });
    return [
        { name: teamAName, players: teamA.map(toPlayer), color: colA },
        { name: teamBName, players: teamB.map(toPlayer), color: colB },
    ];
}

const DAY = 86_400_000;
const now = Date.now();

function weeksAgo(n: number): number {
    return now - n * 7 * DAY;
}

export const demoLeague: League = {
    id: 'demo-league',
    name: 'Thursday Night FC',
    joinCode: 'DEMO01',
    createdBy: 'demo-admin',
    memberIds: ['demo-admin', ...PLAYERS.map((_, i) => `demo-${i}`)],
    createdAt: weeksAgo(20),
    defaultVenue: 'Powerleague Shoreditch',
    defaultCostPerPerson: 7.50,
    adminIds: ['demo-admin'],
    payments: {
        Jamie: [{ amount: 40, date: weeksAgo(7) }, { amount: 40, date: weeksAgo(3) }],
        Reece: [{ amount: 45, date: weeksAgo(6) }, { amount: 35, date: weeksAgo(2) }],
        Marcus: [{ amount: 50, date: weeksAgo(8) }, { amount: 40, date: weeksAgo(3) }],
        Declan: [{ amount: 40, date: weeksAgo(5) }, { amount: 40, date: weeksAgo(1) }],
        Bukayo: [{ amount: 50, date: weeksAgo(7) }, { amount: 40, date: weeksAgo(2) }],
        Mason: [{ amount: 25, date: weeksAgo(6) }],
        Jude: [{ amount: 45, date: weeksAgo(6) }, { amount: 40, date: weeksAgo(2) }],
        Phil: [{ amount: 20, date: weeksAgo(8) }],
        Kyle: [{ amount: 40, date: weeksAgo(7) }, { amount: 40, date: weeksAgo(2) }],
        Harry: [{ amount: 50, date: weeksAgo(8) }, { amount: 50, date: weeksAgo(3) }],
        Ollie: [{ amount: 45, date: weeksAgo(5) }, { amount: 40, date: weeksAgo(1) }],
        Trent: [{ amount: 40, date: weeksAgo(6) }, { amount: 40, date: weeksAgo(2) }],
        Jordan: [{ amount: 40, date: weeksAgo(7) }, { amount: 40, date: weeksAgo(3) }],
        Jack: [{ amount: 40, date: weeksAgo(5) }, { amount: 40, date: weeksAgo(1) }],
        Cole: [{ amount: 15, date: weeksAgo(9) }],
        Ezri: [{ amount: 40, date: weeksAgo(6) }, { amount: 40, date: weeksAgo(2) }],
    },
    expenses: [],
};

// Game rosters — some players miss games to create varied attendance
// Mason misses 4, Phil misses 3, Cole misses 3, Ezri misses 2, Jordan misses 2
const g1a = ['Jamie', 'Reece', 'Marcus', 'Declan', 'Bukayo', 'Mason', 'Jude', 'Phil'];
const g1b = ['Kyle', 'Harry', 'Ollie', 'Trent', 'Jordan', 'Jack', 'Cole', 'Ezri'];

const g2a = ['Jamie', 'Reece', 'Marcus', 'Declan', 'Bukayo', 'Jude', 'Phil'];       // Mason out
const g2b = ['Kyle', 'Harry', 'Ollie', 'Trent', 'Jordan', 'Jack', 'Ezri'];           // Cole out

const g3a = ['Jamie', 'Reece', 'Marcus', 'Declan', 'Bukayo', 'Jude'];                // Mason, Phil out
const g3b = ['Kyle', 'Harry', 'Ollie', 'Trent', 'Jack', 'Cole', 'Ezri'];             // Jordan out

const g4a = ['Jamie', 'Reece', 'Marcus', 'Declan', 'Bukayo', 'Mason', 'Jude', 'Phil'];
const g4b = ['Kyle', 'Harry', 'Ollie', 'Trent', 'Jordan', 'Jack', 'Cole', 'Ezri'];

const g5a = ['Jamie', 'Reece', 'Marcus', 'Declan', 'Bukayo', 'Jude'];                // Mason, Phil out
const g5b = ['Kyle', 'Harry', 'Ollie', 'Trent', 'Jordan', 'Jack'];                   // Cole, Ezri out

const g6a = ['Jamie', 'Reece', 'Marcus', 'Declan', 'Bukayo', 'Mason', 'Jude', 'Phil'];
const g6b = ['Kyle', 'Harry', 'Ollie', 'Trent', 'Jack', 'Cole', 'Ezri'];             // Jordan out

const g7a = ['Jamie', 'Reece', 'Marcus', 'Declan', 'Bukayo', 'Jude', 'Phil'];        // Mason out
const g7b = ['Kyle', 'Harry', 'Ollie', 'Trent', 'Jordan', 'Jack', 'Ezri'];           // Cole out

const g8a = ['Jamie', 'Reece', 'Marcus', 'Declan', 'Bukayo', 'Mason', 'Jude'];       // Phil out
const g8b = ['Kyle', 'Harry', 'Ollie', 'Trent', 'Jordan', 'Jack', 'Cole', 'Ezri'];

const g9a = ['Jamie', 'Reece', 'Marcus', 'Declan', 'Bukayo', 'Jude'];                // Mason, Phil out
const g9b = ['Kyle', 'Harry', 'Ollie', 'Trent', 'Jack', 'Ezri'];                     // Jordan, Cole out

const g10a = ['Jamie', 'Reece', 'Marcus', 'Declan', 'Bukayo', 'Mason', 'Jude', 'Phil'];
const g10b = ['Kyle', 'Harry', 'Ollie', 'Trent', 'Jordan', 'Jack', 'Cole', 'Ezri'];

export const demoCompletedGames: Game[] = [
    {
        id: 'demo-g1', leagueId: 'demo-league', title: 'Week 10', date: weeksAgo(1),
        status: 'completed', createdBy: 'demo-admin', createdAt: weeksAgo(1),
        teams: makeTeams('Hackney Reds', 'Shoreditch Blues', g1a, g1b),
        score: { team1: 4, team2: 3 },
        goalScorers: [{ name: 'Bukayo', goals: 2 }, { name: 'Marcus', goals: 1 }, { name: 'Mason', goals: 1 }, { name: 'Harry', goals: 2 }, { name: 'Trent', goals: 1 }],
        assisters: [{ name: 'Jude', goals: 2 }, { name: 'Jamie', goals: 1 }, { name: 'Ollie', goals: 1 }],
        manOfTheMatch: 'Bukayo',
        attendees: [...g1a, ...g1b],
        costPerPerson: 7.50,
    },
    {
        id: 'demo-g2', leagueId: 'demo-league', title: 'Week 9', date: weeksAgo(2),
        status: 'completed', createdBy: 'demo-admin', createdAt: weeksAgo(2),
        teams: makeTeams('Dalston Dynamos', 'Bethnal Greens', g2a, g2b),
        score: { team1: 2, team2: 2 },
        goalScorers: [{ name: 'Jude', goals: 1 }, { name: 'Marcus', goals: 1 }, { name: 'Ollie', goals: 1 }, { name: 'Harry', goals: 1 }],
        assisters: [{ name: 'Bukayo', goals: 1 }, { name: 'Trent', goals: 1 }],
        manOfTheMatch: 'Jude',
        attendees: [...g2a, ...g2b],
        costPerPerson: 7.50,
    },
    {
        id: 'demo-g3', leagueId: 'demo-league', title: 'Week 8', date: weeksAgo(3),
        status: 'completed', createdBy: 'demo-admin', createdAt: weeksAgo(3),
        teams: makeTeams('Mile End United', 'Bow Rovers', g3a, g3b),
        score: { team1: 5, team2: 1 },
        goalScorers: [{ name: 'Bukayo', goals: 3 }, { name: 'Declan', goals: 1 }, { name: 'Reece', goals: 1 }, { name: 'Kyle', goals: 1 }],
        assisters: [{ name: 'Marcus', goals: 2 }, { name: 'Jude', goals: 1 }, { name: 'Bukayo', goals: 1 }],
        manOfTheMatch: 'Bukayo',
        attendees: [...g3a, ...g3b],
        costPerPerson: 7.50,
    },
    {
        id: 'demo-g4', leagueId: 'demo-league', title: 'Week 7', date: weeksAgo(4),
        status: 'completed', createdBy: 'demo-admin', createdAt: weeksAgo(4),
        teams: makeTeams('Hackney Reds', 'Shoreditch Blues', g4a, g4b),
        score: { team1: 1, team2: 3 },
        goalScorers: [{ name: 'Mason', goals: 1 }, { name: 'Harry', goals: 2 }, { name: 'Jack', goals: 1 }],
        assisters: [{ name: 'Phil', goals: 1 }, { name: 'Trent', goals: 2 }],
        manOfTheMatch: 'Harry',
        attendees: [...g4a, ...g4b],
        costPerPerson: 7.50,
    },
    {
        id: 'demo-g5', leagueId: 'demo-league', title: 'Week 6', date: weeksAgo(5),
        status: 'completed', createdBy: 'demo-admin', createdAt: weeksAgo(5),
        teams: makeTeams('Dalston Dynamos', 'Bethnal Greens', g5a, g5b),
        score: { team1: 3, team2: 2 },
        goalScorers: [{ name: 'Marcus', goals: 2 }, { name: 'Bukayo', goals: 1 }, { name: 'Ollie', goals: 1 }, { name: 'Jordan', goals: 1 }],
        assisters: [{ name: 'Declan', goals: 1 }, { name: 'Reece', goals: 1 }],
        manOfTheMatch: 'Marcus',
        attendees: [...g5a, ...g5b],
        costPerPerson: 7.50,
    },
    {
        id: 'demo-g6', leagueId: 'demo-league', title: 'Week 5', date: weeksAgo(6),
        status: 'completed', createdBy: 'demo-admin', createdAt: weeksAgo(6),
        teams: makeTeams('Mile End United', 'Bow Rovers', g6a, g6b),
        score: { team1: 0, team2: 1 },
        goalScorers: [{ name: 'Trent', goals: 1 }],
        assisters: [{ name: 'Kyle', goals: 1 }],
        manOfTheMatch: 'Jamie',
        attendees: [...g6a, ...g6b],
        costPerPerson: 7.50,
    },
    {
        id: 'demo-g7', leagueId: 'demo-league', title: 'Week 4', date: weeksAgo(7),
        status: 'completed', createdBy: 'demo-admin', createdAt: weeksAgo(7),
        teams: makeTeams('Hackney Reds', 'Shoreditch Blues', g7a, g7b),
        score: { team1: 2, team2: 0 },
        goalScorers: [{ name: 'Jude', goals: 1 }, { name: 'Declan', goals: 1 }],
        assisters: [{ name: 'Bukayo', goals: 1 }],
        manOfTheMatch: 'Declan',
        attendees: [...g7a, ...g7b],
        costPerPerson: 7.50,
    },
    {
        id: 'demo-g8', leagueId: 'demo-league', title: 'Week 3', date: weeksAgo(8),
        status: 'completed', createdBy: 'demo-admin', createdAt: weeksAgo(8),
        teams: makeTeams('Dalston Dynamos', 'Bethnal Greens', g8a, g8b),
        score: { team1: 4, team2: 4 },
        goalScorers: [{ name: 'Marcus', goals: 2 }, { name: 'Bukayo', goals: 1 }, { name: 'Mason', goals: 1 }, { name: 'Harry', goals: 2 }, { name: 'Ollie', goals: 1 }, { name: 'Jack', goals: 1 }],
        assisters: [{ name: 'Jude', goals: 2 }, { name: 'Trent', goals: 1 }, { name: 'Reece', goals: 1 }],
        manOfTheMatch: 'Marcus',
        attendees: [...g8a, ...g8b],
        costPerPerson: 7.50,
    },
    {
        id: 'demo-g9', leagueId: 'demo-league', title: 'Week 2', date: weeksAgo(9),
        status: 'completed', createdBy: 'demo-admin', createdAt: weeksAgo(9),
        teams: makeTeams('Mile End United', 'Bow Rovers', g9a, g9b),
        score: { team1: 3, team2: 1 },
        goalScorers: [{ name: 'Bukayo', goals: 1 }, { name: 'Jude', goals: 1 }, { name: 'Declan', goals: 1 }, { name: 'Ezri', goals: 1 }],
        assisters: [{ name: 'Marcus', goals: 1 }, { name: 'Reece', goals: 1 }],
        manOfTheMatch: 'Jude',
        attendees: [...g9a, ...g9b],
        costPerPerson: 7.50,
    },
    {
        id: 'demo-g10', leagueId: 'demo-league', title: 'Week 1', date: weeksAgo(10),
        status: 'completed', createdBy: 'demo-admin', createdAt: weeksAgo(10),
        teams: makeTeams('Hackney Reds', 'Shoreditch Blues', g10a, g10b),
        score: { team1: 2, team2: 3 },
        goalScorers: [{ name: 'Mason', goals: 1 }, { name: 'Phil', goals: 1 }, { name: 'Kyle', goals: 1 }, { name: 'Harry', goals: 1 }, { name: 'Jordan', goals: 1 }],
        assisters: [{ name: 'Jamie', goals: 1 }, { name: 'Ollie', goals: 1 }, { name: 'Cole', goals: 1 }],
        manOfTheMatch: 'Kyle',
        attendees: [...g10a, ...g10b],
        costPerPerson: 7.50,
    },
];

export const demoUpcomingGames: Game[] = [
    {
        id: 'demo-upcoming-1', leagueId: 'demo-league', title: 'Week 11',
        date: now + 4 * DAY,
        status: 'scheduled', createdBy: 'demo-admin', createdAt: now - DAY,
        location: 'Powerleague Shoreditch',
        costPerPerson: 7.50,
        guestPlayers: ['Dan'],
        guestAvailability: { Dan: 'available' },
        playerPositions: {
            Jamie: 'g', Kyle: 'g',
            Reece: 'd', Declan: 'd', Jordan: 'd', Trent: 'd',
            Bukayo: 's', Harry: 's', Jude: 's', Dan: 's',
        },
    },
    {
        id: 'demo-upcoming-2', leagueId: 'demo-league', title: 'Week 12',
        date: now + 11 * DAY,
        status: 'scheduled', createdBy: 'demo-admin', createdAt: now,
        location: 'Powerleague Shoreditch',
        costPerPerson: 7.50,
    },
];

// --- Demo availability for the upcoming game (Week 11) ---
const makeAvail = (name: string, status: 'available' | 'maybe' | 'unavailable'): PlayerAvailability => ({
    id: `demo-upcoming-1_demo-${name.toLowerCase()}`,
    gameId: 'demo-upcoming-1',
    userId: `demo-${name.toLowerCase()}`,
    displayName: name,
    status,
    updatedAt: now - Math.floor(Math.random() * 2 * DAY),
});

export const demoAvailability: PlayerAvailability[] = [
    makeAvail('Jamie', 'available'),
    makeAvail('Reece', 'available'),
    makeAvail('Marcus', 'available'),
    makeAvail('Declan', 'available'),
    makeAvail('Bukayo', 'available'),
    makeAvail('Jude', 'available'),
    makeAvail('Kyle', 'available'),
    makeAvail('Harry', 'available'),
    makeAvail('Ollie', 'available'),
    makeAvail('Trent', 'available'),
    makeAvail('Jordan', 'available'),
    makeAvail('Jack', 'available'),
    makeAvail('Mason', 'maybe'),
    makeAvail('Phil', 'maybe'),
    makeAvail('Cole', 'unavailable'),
    makeAvail('Ezri', 'unavailable'),
];

// --- Pre-generated teams for the demo "Generate teams" step ---
const demoTeamA = ['Jamie', 'Reece', 'Declan', 'Marcus', 'Bukayo', 'Jude', 'Dan'];
const demoTeamB = ['Kyle', 'Trent', 'Jordan', 'Ollie', 'Harry', 'Jack'];

export const demoGeneratedTeams: TeamSetup = {
    id: 'demo-setup-1',
    playersInput: '',
    teams: makeTeams('Hackney Reds', 'Shoreditch Blues', demoTeamA, demoTeamB),
};
