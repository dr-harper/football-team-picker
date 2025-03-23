import { teamSuffixes } from '../constants/teamConstants';

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
            continue; // Skip if the place or suffix is already used
        }

        teamName = `${place} ${suffix}`;
        if (!existingNames.has(teamName)) {
            usedPlaces.add(place); // Mark the place as used
            usedSuffixes.add(suffix); // Mark the suffix as used
            break;
        }

        attempts++;
    } while (attempts < 20); // Ensure uniqueness with a fallback

    return teamName;
};
