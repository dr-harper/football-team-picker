import { teamSuffixes } from '../constants/teamConstants';
import { TEAM_NAME_MAX_ATTEMPTS } from '../constants/gameConstants';

export const generateTeamName = (existingNames: Set<string>, places: string[]) => {
    let teamName;
    let attempts = 0;
    const usedPlaces = new Set<string>();
    const usedSuffixes = new Set<string>();

    do {
        const place = places[Math.floor(Math.random() * places.length)];
        const suffix = teamSuffixes[Math.floor(Math.random() * teamSuffixes.length)];

        if (usedPlaces.has(place) || usedSuffixes.has(suffix)) {
            attempts++;
            continue;
        }

        teamName = `${place} ${suffix}`;
        if (!existingNames.has(teamName)) {
            usedPlaces.add(place);
            usedSuffixes.add(suffix);
            break;
        }

        attempts++;
    } while (attempts < TEAM_NAME_MAX_ATTEMPTS);

    return teamName;
};
