import { Player, Team } from '../types';
import { MIN_PLAYERS, MAX_PLAYERS, NUM_TEAMS, SHIRT_NUMBER_MIN, SHIRT_NUMBER_MAX, BOLD_COLOURS } from '../constants/gameConstants';
import { pickSecondColor } from './colorUtils';
import { generateTeamName } from './teamNameGenerator';

export interface GenerateTeamsResult {
    teams: Team[];
    noGoalkeepers: boolean;
    playerNumbers: { [playerName: string]: number };
    error?: string;
}

/** Parse raw text lines into Player objects */
export function parsePlayers(lines: string[]): Player[] {
    return lines.map(line => {
        const [name, ...rawTags] = line.split('#').map(item => item.trim());
        const normalizedTags = rawTags
            .filter(Boolean)
            .map(tag => tag.toLowerCase().replace(/\s+/g, ''));
        const isGoalkeeper = normalizedTags.includes('g');
        const isStriker = normalizedTags.includes('s');
        const isDefender = normalizedTags.includes('d');
        const isteam1 = normalizedTags.some(tag => ['t1', 'team1', '1'].includes(tag));
        const isteam2 = !isteam1 && normalizedTags.some(tag => ['t2', 'team2', '2'].includes(tag));

        return {
            name,
            isGoalkeeper,
            isStriker,
            isDefender,
            isteam1,
            isteam2,
            role: isGoalkeeper ? 'goalkeeper' : (isStriker ? 'striker' : (isDefender ? 'defender' : 'outfield')),
            shirtNumber: null,
        };
    });
}

/** Shuffle an array in place (Fisher-Yates) and return it */
function shuffle<T>(arr: T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

/** Assign shirt numbers to all players across teams */
export function assignShirtNumbers(
    teams: Team[],
    existingNumbers: { [playerName: string]: number },
): { [playerName: string]: number } {
    const availableNumbers = Array.from(
        { length: SHIRT_NUMBER_MAX - SHIRT_NUMBER_MIN },
        (_, i) => i + SHIRT_NUMBER_MIN,
    );
    const newPlayerNumbers: { [playerName: string]: number } = { ...existingNumbers };

    teams.forEach(team => {
        team.players.forEach((player: Player) => {
            if (player.isGoalkeeper) {
                player.shirtNumber = 1;
                newPlayerNumbers[player.name] = 1;
            } else if (newPlayerNumbers[player.name]) {
                player.shirtNumber = newPlayerNumbers[player.name];
            } else {
                if (availableNumbers.length > 0) {
                    const randomIndex = Math.floor(Math.random() * availableNumbers.length);
                    const number = availableNumbers.splice(randomIndex, 1)[0];
                    player.shirtNumber = number;
                    newPlayerNumbers[player.name] = number;
                } else {
                    player.shirtNumber = null;
                }
            }
        });
    });

    return newPlayerNumbers;
}

/** Core team generation logic — pure function (aside from Math.random) */
export function generateTeamsFromText(
    playersText: string,
    places: string[],
    existingPlayerNumbers: { [playerName: string]: number },
): GenerateTeamsResult {
    if (!playersText.trim()) {
        return { teams: [], noGoalkeepers: false, playerNumbers: existingPlayerNumbers, error: 'Please enter player names' };
    }

    const playerLines = playersText.split('\n').filter(line => line.trim().length > 0);

    if (playerLines.length < MIN_PLAYERS) {
        return {
            teams: [],
            noGoalkeepers: false,
            playerNumbers: existingPlayerNumbers,
            error: `You need at least ${MIN_PLAYERS} players for two 5-a-side teams`,
        };
    }

    if (playerLines.length > MAX_PLAYERS) {
        return {
            teams: [],
            noGoalkeepers: false,
            playerNumbers: existingPlayerNumbers,
            error: `You can only have a maximum of ${MAX_PLAYERS} players`,
        };
    }

    const players = parsePlayers(playerLines);

    const goalkeepers = players.filter(p => p.isGoalkeeper);
    const strikers = players.filter(p => p.isStriker);
    const defenders = players.filter(p => p.isDefender);
    const outfieldPlayers = players.filter(
        p => !p.isGoalkeeper && !p.isStriker && !p.isDefender && !p.isteam1 && !p.isteam2,
    );

    if (goalkeepers.length < NUM_TEAMS) {
        // Not a hard error — teams can still be generated
    }

    const shuffledGoalkeepers = shuffle(goalkeepers);
    const shuffledStrikers = shuffle(strikers);
    const shuffledDefenders = shuffle(defenders);
    const shuffledOutfield = shuffle(outfieldPlayers);

    const selectedTeam1 = players.filter(p => p.isteam1);
    const selectedTeam2 = players.filter(p => p.isteam2);

    const generatedTeams: Team[] = [];
    const existingNames = new Set<string>();

    const primaryColor = BOLD_COLOURS[Math.floor(Math.random() * BOLD_COLOURS.length)];
    const secondaryColor = NUM_TEAMS > 1 ? pickSecondColor(primaryColor, BOLD_COLOURS) : primaryColor;

    for (let i = 0; i < NUM_TEAMS; i++) {
        const teamName = generateTeamName(existingNames, places) as string;
        existingNames.add(teamName);

        const team = {
            name: teamName,
            players: [shuffledGoalkeepers[i]],
            color: i === 0 ? primaryColor : secondaryColor,
        };
        generatedTeams.push(team);
    }

    let teamIndex = 0;

    selectedTeam1.forEach(player => {
        generatedTeams[0].players.push(player);
    });

    selectedTeam2.forEach(player => {
        generatedTeams[1].players.push(player);
    });

    shuffledDefenders.forEach(player => {
        generatedTeams[teamIndex].players.push(player);
        teamIndex = (teamIndex + 1) % NUM_TEAMS;
    });

    shuffledOutfield.forEach(player => {
        generatedTeams[teamIndex].players.push(player);
        teamIndex = (teamIndex + 1) % NUM_TEAMS;
    });

    shuffledStrikers.forEach(player => {
        generatedTeams[teamIndex].players.push(player);
        teamIndex = (teamIndex + 1) % NUM_TEAMS;
    });

    // Remove undefined entries (when no GK available)
    generatedTeams.forEach(team => {
        if (!team.players[0]) {
            team.players = team.players.filter((player): player is Player => Boolean(player));
        }
    });

    const newPlayerNumbers = assignShirtNumbers(generatedTeams, existingPlayerNumbers);

    // Rebalance if teams are unequal
    if (generatedTeams[0].players.length !== generatedTeams[1].players.length) {
        const largerTeamIndex = generatedTeams[0].players.length > generatedTeams[1].players.length ? 0 : 1;
        const smallerTeamIndex = largerTeamIndex === 0 ? 1 : 0;
        const playerToMove = generatedTeams[largerTeamIndex].players.pop();
        if (playerToMove) {
            generatedTeams[smallerTeamIndex].players.push(playerToMove);
        }
    }

    return {
        teams: generatedTeams,
        noGoalkeepers: goalkeepers.length === 0,
        playerNumbers: newPlayerNumbers,
    };
}
