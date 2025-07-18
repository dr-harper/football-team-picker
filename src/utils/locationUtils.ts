import { teamPlaces } from '../constants/teamConstants';

export const getPlacesBasedOnLocation = async (): Promise<{ location: string; places: string[] }> => {
    try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject)
        );

        const { latitude, longitude } = position.coords;

        // Print the latitude and longitude when developing
        if (import.meta.env.DEV) {
            console.log(`Latitude: ${latitude}, Longitude: ${longitude}`);
        }

        let closestLocation = 'Generic';
        let closestPlaces = teamPlaces.Generic.places;
        let shortestDistance = Infinity;

        // Iterate through teamPlaces to find the closest location
        for (const [location, data] of Object.entries(teamPlaces)) {
            if (data.coordinates) {
                const { latitude: locLat, longitude: locLon } = data.coordinates;
                const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

                const earthRadiusKm = 6371;
                const dLat = toRadians(locLat - latitude);
                const dLon = toRadians(locLon - longitude);

                const a =
                    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(toRadians(latitude)) * Math.cos(toRadians(locLat)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                const distance = earthRadiusKm * c;

                if (distance < shortestDistance) {
                    shortestDistance = distance;
                    closestLocation = location;
                    closestPlaces = data.places;
                }
            }
        }

        return { location: closestLocation, places: closestPlaces };

        // Default to Generic places
        return { location: 'Generic', places: teamPlaces.Generic.places };
    } catch (error) {
        console.error('Failed to get location:', error);
        return { location: 'Generic', places: teamPlaces.Generic.places }; // Default to Generic places if location fails
    }
};
