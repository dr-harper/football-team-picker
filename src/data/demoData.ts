import { Game, League, PlayerAvailability, TeamSetup } from '../types';

const PLAYERS = [
    'Jamie', 'Reece', 'Marcus', 'Declan', 'Bukayo',
    'Mason', 'Jude', 'Phil', 'Kyle', 'Harry',
    'Ollie', 'Trent', 'Jordan', 'Jack', 'Cole',
    'Ezri',
];

const demoId = (name: string) => `demo-${PLAYERS.indexOf(name)}`;

function makeTeams(teamAName: string, teamBName: string, teamA: string[], teamB: string[], colA = '#3b82f6', colB = '#ef4444') {
    const toPlayer = (name: string, idx: number) => ({
        name,
        playerId: PLAYERS.includes(name) ? demoId(name) : name,
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
        [demoId('Jamie')]: [{ amount: 40, date: weeksAgo(7) }, { amount: 40, date: weeksAgo(3) }],
        [demoId('Reece')]: [{ amount: 45, date: weeksAgo(6) }, { amount: 35, date: weeksAgo(2) }],
        [demoId('Marcus')]: [{ amount: 50, date: weeksAgo(8) }, { amount: 40, date: weeksAgo(3) }],
        [demoId('Declan')]: [{ amount: 40, date: weeksAgo(5) }, { amount: 40, date: weeksAgo(1) }],
        [demoId('Bukayo')]: [{ amount: 50, date: weeksAgo(7) }, { amount: 40, date: weeksAgo(2) }],
        [demoId('Mason')]: [{ amount: 25, date: weeksAgo(6) }],
        [demoId('Jude')]: [{ amount: 45, date: weeksAgo(6) }, { amount: 40, date: weeksAgo(2) }],
        [demoId('Phil')]: [{ amount: 20, date: weeksAgo(8) }],
        [demoId('Kyle')]: [{ amount: 40, date: weeksAgo(7) }, { amount: 40, date: weeksAgo(2) }],
        [demoId('Harry')]: [{ amount: 50, date: weeksAgo(8) }, { amount: 50, date: weeksAgo(3) }],
        [demoId('Ollie')]: [{ amount: 45, date: weeksAgo(5) }, { amount: 40, date: weeksAgo(1) }],
        [demoId('Trent')]: [{ amount: 40, date: weeksAgo(6) }, { amount: 40, date: weeksAgo(2) }],
        [demoId('Jordan')]: [{ amount: 40, date: weeksAgo(7) }, { amount: 40, date: weeksAgo(3) }],
        [demoId('Jack')]: [{ amount: 40, date: weeksAgo(5) }, { amount: 40, date: weeksAgo(1) }],
        [demoId('Cole')]: [{ amount: 15, date: weeksAgo(9) }],
        [demoId('Ezri')]: [{ amount: 40, date: weeksAgo(6) }, { amount: 40, date: weeksAgo(2) }],
    },
    expenses: [],
};

// Game rosters — some players miss games to create varied attendance
// Mason misses 4, Phil misses 3, Cole misses 3, Ezri misses 2, Jordan misses 2
const g1a = [demoId('Jamie'), demoId('Reece'), demoId('Marcus'), demoId('Declan'), demoId('Bukayo'), demoId('Mason'), demoId('Jude'), demoId('Phil')];
const g1b = [demoId('Kyle'), demoId('Harry'), demoId('Ollie'), demoId('Trent'), demoId('Jordan'), demoId('Jack'), demoId('Cole'), demoId('Ezri')];

const g2a = [demoId('Jamie'), demoId('Reece'), demoId('Marcus'), demoId('Declan'), demoId('Bukayo'), demoId('Jude'), demoId('Phil')];       // Mason out
const g2b = [demoId('Kyle'), demoId('Harry'), demoId('Ollie'), demoId('Trent'), demoId('Jordan'), demoId('Jack'), demoId('Ezri')];           // Cole out

const g3a = [demoId('Jamie'), demoId('Reece'), demoId('Marcus'), demoId('Declan'), demoId('Bukayo'), demoId('Jude')];                // Mason, Phil out
const g3b = [demoId('Kyle'), demoId('Harry'), demoId('Ollie'), demoId('Trent'), demoId('Jack'), demoId('Cole'), demoId('Ezri')];             // Jordan out

const g4a = [demoId('Jamie'), demoId('Reece'), demoId('Marcus'), demoId('Declan'), demoId('Bukayo'), demoId('Mason'), demoId('Jude'), demoId('Phil')];
const g4b = [demoId('Kyle'), demoId('Harry'), demoId('Ollie'), demoId('Trent'), demoId('Jordan'), demoId('Jack'), demoId('Cole'), demoId('Ezri')];

const g5a = [demoId('Jamie'), demoId('Reece'), demoId('Marcus'), demoId('Declan'), demoId('Bukayo'), demoId('Jude')];                // Mason, Phil out
const g5b = [demoId('Kyle'), demoId('Harry'), demoId('Ollie'), demoId('Trent'), demoId('Jordan'), demoId('Jack')];                   // Cole, Ezri out

const g6a = [demoId('Jamie'), demoId('Reece'), demoId('Marcus'), demoId('Declan'), demoId('Bukayo'), demoId('Mason'), demoId('Jude'), demoId('Phil')];
const g6b = [demoId('Kyle'), demoId('Harry'), demoId('Ollie'), demoId('Trent'), demoId('Jack'), demoId('Cole'), demoId('Ezri')];             // Jordan out

const g7a = [demoId('Jamie'), demoId('Reece'), demoId('Marcus'), demoId('Declan'), demoId('Bukayo'), demoId('Jude'), demoId('Phil')];        // Mason out
const g7b = [demoId('Kyle'), demoId('Harry'), demoId('Ollie'), demoId('Trent'), demoId('Jordan'), demoId('Jack'), demoId('Ezri')];           // Cole out

const g8a = [demoId('Jamie'), demoId('Reece'), demoId('Marcus'), demoId('Declan'), demoId('Bukayo'), demoId('Mason'), demoId('Jude')];       // Phil out
const g8b = [demoId('Kyle'), demoId('Harry'), demoId('Ollie'), demoId('Trent'), demoId('Jordan'), demoId('Jack'), demoId('Cole'), demoId('Ezri')];

const g9a = [demoId('Jamie'), demoId('Reece'), demoId('Marcus'), demoId('Declan'), demoId('Bukayo'), demoId('Jude')];                // Mason, Phil out
const g9b = [demoId('Kyle'), demoId('Harry'), demoId('Ollie'), demoId('Trent'), demoId('Jack'), demoId('Ezri')];                     // Jordan, Cole out

const g10a = [demoId('Jamie'), demoId('Reece'), demoId('Marcus'), demoId('Declan'), demoId('Bukayo'), demoId('Mason'), demoId('Jude'), demoId('Phil')];
const g10b = [demoId('Kyle'), demoId('Harry'), demoId('Ollie'), demoId('Trent'), demoId('Jordan'), demoId('Jack'), demoId('Cole'), demoId('Ezri')];

export const demoCompletedGames: Game[] = [
    {
        id: 'demo-g1', leagueId: 'demo-league', title: 'Week 10', date: weeksAgo(1),
        status: 'completed', createdBy: 'demo-admin', createdAt: weeksAgo(1),
        teams: makeTeams('Hackney Reds', 'Shoreditch Blues', g1a, g1b),
        score: { team1: 4, team2: 3 },
        goalScorers: [{ playerId: demoId('Bukayo'), goals: 2 }, { playerId: demoId('Marcus'), goals: 1 }, { playerId: demoId('Mason'), goals: 1 }, { playerId: demoId('Harry'), goals: 2 }, { playerId: demoId('Trent'), goals: 1 }],
        assisters: [{ playerId: demoId('Jude'), goals: 2 }, { playerId: demoId('Jamie'), goals: 1 }, { playerId: demoId('Ollie'), goals: 1 }],
        manOfTheMatch: demoId('Bukayo'),
        attendees: [...g1a, ...g1b],
        costPerPerson: 7.50,
    },
    {
        id: 'demo-g2', leagueId: 'demo-league', title: 'Week 9', date: weeksAgo(2),
        status: 'completed', createdBy: 'demo-admin', createdAt: weeksAgo(2),
        teams: makeTeams('Dalston Dynamos', 'Bethnal Greens', g2a, g2b),
        score: { team1: 2, team2: 2 },
        goalScorers: [{ playerId: demoId('Jude'), goals: 1 }, { playerId: demoId('Marcus'), goals: 1 }, { playerId: demoId('Ollie'), goals: 1 }, { playerId: demoId('Harry'), goals: 1 }],
        assisters: [{ playerId: demoId('Bukayo'), goals: 1 }, { playerId: demoId('Trent'), goals: 1 }],
        manOfTheMatch: demoId('Jude'),
        attendees: [...g2a, ...g2b],
        costPerPerson: 7.50,
    },
    {
        id: 'demo-g3', leagueId: 'demo-league', title: 'Week 8', date: weeksAgo(3),
        status: 'completed', createdBy: 'demo-admin', createdAt: weeksAgo(3),
        teams: makeTeams('Mile End United', 'Bow Rovers', g3a, g3b),
        score: { team1: 5, team2: 1 },
        goalScorers: [{ playerId: demoId('Bukayo'), goals: 3 }, { playerId: demoId('Declan'), goals: 1 }, { playerId: demoId('Reece'), goals: 1 }, { playerId: demoId('Kyle'), goals: 1 }],
        assisters: [{ playerId: demoId('Marcus'), goals: 2 }, { playerId: demoId('Jude'), goals: 1 }, { playerId: demoId('Bukayo'), goals: 1 }],
        manOfTheMatch: demoId('Bukayo'),
        attendees: [...g3a, ...g3b],
        costPerPerson: 7.50,
    },
    {
        id: 'demo-g4', leagueId: 'demo-league', title: 'Week 7', date: weeksAgo(4),
        status: 'completed', createdBy: 'demo-admin', createdAt: weeksAgo(4),
        teams: makeTeams('Hackney Reds', 'Shoreditch Blues', g4a, g4b),
        score: { team1: 1, team2: 3 },
        goalScorers: [{ playerId: demoId('Mason'), goals: 1 }, { playerId: demoId('Harry'), goals: 2 }, { playerId: demoId('Jack'), goals: 1 }],
        assisters: [{ playerId: demoId('Phil'), goals: 1 }, { playerId: demoId('Trent'), goals: 2 }],
        manOfTheMatch: demoId('Harry'),
        attendees: [...g4a, ...g4b],
        costPerPerson: 7.50,
    },
    {
        id: 'demo-g5', leagueId: 'demo-league', title: 'Week 6', date: weeksAgo(5),
        status: 'completed', createdBy: 'demo-admin', createdAt: weeksAgo(5),
        teams: makeTeams('Dalston Dynamos', 'Bethnal Greens', g5a, g5b),
        score: { team1: 3, team2: 2 },
        goalScorers: [{ playerId: demoId('Marcus'), goals: 2 }, { playerId: demoId('Bukayo'), goals: 1 }, { playerId: demoId('Ollie'), goals: 1 }, { playerId: demoId('Jordan'), goals: 1 }],
        assisters: [{ playerId: demoId('Declan'), goals: 1 }, { playerId: demoId('Reece'), goals: 1 }],
        manOfTheMatch: demoId('Marcus'),
        attendees: [...g5a, ...g5b],
        costPerPerson: 7.50,
    },
    {
        id: 'demo-g6', leagueId: 'demo-league', title: 'Week 5', date: weeksAgo(6),
        status: 'completed', createdBy: 'demo-admin', createdAt: weeksAgo(6),
        teams: makeTeams('Mile End United', 'Bow Rovers', g6a, g6b),
        score: { team1: 0, team2: 1 },
        goalScorers: [{ playerId: demoId('Trent'), goals: 1 }],
        assisters: [{ playerId: demoId('Kyle'), goals: 1 }],
        manOfTheMatch: demoId('Jamie'),
        attendees: [...g6a, ...g6b],
        costPerPerson: 7.50,
    },
    {
        id: 'demo-g7', leagueId: 'demo-league', title: 'Week 4', date: weeksAgo(7),
        status: 'completed', createdBy: 'demo-admin', createdAt: weeksAgo(7),
        teams: makeTeams('Hackney Reds', 'Shoreditch Blues', g7a, g7b),
        score: { team1: 2, team2: 0 },
        goalScorers: [{ playerId: demoId('Jude'), goals: 1 }, { playerId: demoId('Declan'), goals: 1 }],
        assisters: [{ playerId: demoId('Bukayo'), goals: 1 }],
        manOfTheMatch: demoId('Declan'),
        attendees: [...g7a, ...g7b],
        costPerPerson: 7.50,
    },
    {
        id: 'demo-g8', leagueId: 'demo-league', title: 'Week 3', date: weeksAgo(8),
        status: 'completed', createdBy: 'demo-admin', createdAt: weeksAgo(8),
        teams: makeTeams('Dalston Dynamos', 'Bethnal Greens', g8a, g8b),
        score: { team1: 4, team2: 4 },
        goalScorers: [{ playerId: demoId('Marcus'), goals: 2 }, { playerId: demoId('Bukayo'), goals: 1 }, { playerId: demoId('Mason'), goals: 1 }, { playerId: demoId('Harry'), goals: 2 }, { playerId: demoId('Ollie'), goals: 1 }, { playerId: demoId('Jack'), goals: 1 }],
        assisters: [{ playerId: demoId('Jude'), goals: 2 }, { playerId: demoId('Trent'), goals: 1 }, { playerId: demoId('Reece'), goals: 1 }],
        manOfTheMatch: demoId('Marcus'),
        attendees: [...g8a, ...g8b],
        costPerPerson: 7.50,
    },
    {
        id: 'demo-g9', leagueId: 'demo-league', title: 'Week 2', date: weeksAgo(9),
        status: 'completed', createdBy: 'demo-admin', createdAt: weeksAgo(9),
        teams: makeTeams('Mile End United', 'Bow Rovers', g9a, g9b),
        score: { team1: 3, team2: 1 },
        goalScorers: [{ playerId: demoId('Bukayo'), goals: 1 }, { playerId: demoId('Jude'), goals: 1 }, { playerId: demoId('Declan'), goals: 1 }, { playerId: demoId('Ezri'), goals: 1 }],
        assisters: [{ playerId: demoId('Marcus'), goals: 1 }, { playerId: demoId('Reece'), goals: 1 }],
        manOfTheMatch: demoId('Jude'),
        attendees: [...g9a, ...g9b],
        costPerPerson: 7.50,
    },
    {
        id: 'demo-g10', leagueId: 'demo-league', title: 'Week 1', date: weeksAgo(10),
        status: 'completed', createdBy: 'demo-admin', createdAt: weeksAgo(10),
        teams: makeTeams('Hackney Reds', 'Shoreditch Blues', g10a, g10b),
        score: { team1: 2, team2: 3 },
        goalScorers: [{ playerId: demoId('Mason'), goals: 1 }, { playerId: demoId('Phil'), goals: 1 }, { playerId: demoId('Kyle'), goals: 1 }, { playerId: demoId('Harry'), goals: 1 }, { playerId: demoId('Jordan'), goals: 1 }],
        assisters: [{ playerId: demoId('Jamie'), goals: 1 }, { playerId: demoId('Ollie'), goals: 1 }, { playerId: demoId('Cole'), goals: 1 }],
        manOfTheMatch: demoId('Kyle'),
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
            [demoId('Jamie')]: 'g', [demoId('Kyle')]: 'g',
            [demoId('Reece')]: 'd', [demoId('Declan')]: 'd', [demoId('Jordan')]: 'd', [demoId('Trent')]: 'd',
            [demoId('Bukayo')]: 's', [demoId('Harry')]: 's', [demoId('Jude')]: 's', Dan: 's',
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
    id: `demo-upcoming-1_${demoId(name)}`,
    gameId: 'demo-upcoming-1',
    userId: demoId(name),
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
const demoTeamA = [demoId('Jamie'), demoId('Reece'), demoId('Declan'), demoId('Marcus'), demoId('Bukayo'), demoId('Jude'), 'Dan'];
const demoTeamB = [demoId('Kyle'), demoId('Trent'), demoId('Jordan'), demoId('Ollie'), demoId('Harry'), demoId('Jack')];

export const demoGeneratedTeams: TeamSetup = {
    id: 'demo-setup-1',
    playersInput: '',
    teams: makeTeams('Hackney Reds', 'Shoreditch Blues', demoTeamA, demoTeamB),
};
