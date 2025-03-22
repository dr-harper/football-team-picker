import { teamSuffixes } from '../constants/teamConstants';

export const generateTeamName = (existingNames: Set<string>, places: string[]) => {
    let teamName;
    let attempts = 0;

    do {
        const place = places[Math.floor(Math.random() * places.length)];
        const suffix = teamSuffixes[Math.floor(Math.random() * teamSuffixes.length)];
        teamName = `${place} ${suffix}`;
        attempts++;
    } while (existingNames.has(teamName) && attempts < 100); // Ensure uniqueness with a fallback

    return teamName;
};
