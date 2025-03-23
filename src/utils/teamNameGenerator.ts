import { teamSuffixes } from '../constants/teamConstants';

export const generateTeamName = (existingNames: Set<string>, places: string[]) => {
    let teamName;
    let attempts = 0;
    const usedPlaces = new Set<string>();

    do {
        const place = places[Math.floor(Math.random() * places.length)];
        const suffix = teamSuffixes[Math.floor(Math.random() * teamSuffixes.length)];

        if (usedPlaces.has(place)) {
            attempts++;
            continue; // Skip if the place is already used
        }

        teamName = `${place} ${suffix}`;
        if (!existingNames.has(teamName)) {
            usedPlaces.add(place); // Mark the place as used
            break;
        }

        attempts++;
    } while (attempts < 10); // Ensure uniqueness with a fallback

    return teamName;
};
