import { teamPlaces } from '../constants/teamConstants';
export const getPlacesBasedOnLocation = async () => {
    try {
        const position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject));
        const { latitude, longitude } = position.coords;
        // Print the latitude and longitude
        console.log(`Latitude: ${latitude}, Longitude: ${longitude}`);
        // Iterate through teamPlaces to find the nearest location
        for (const [location, data] of Object.entries(teamPlaces)) {
            if (data.coordinates) {
                const { latitude: locLat, longitude: locLon } = data.coordinates;
                const isNear = isWithinRadius(latitude, longitude, locLat, locLon, 50); // 50km radius
                if (isNear)
                    return { location, places: data.places };
            }
        }
        // Default to Generic places
        return { location: 'Generic', places: teamPlaces['Generic'].places };
    }
    catch (error) {
        console.error('Failed to get location:', error);
        return { location: 'Generic', places: teamPlaces['Generic'].places }; // Default to Generic places if location fails
    }
};
const isWithinRadius = (lat1, lon1, lat2, lon2, radiusKm) => {
    const toRadians = (degrees) => (degrees * Math.PI) / 180;
    const earthRadiusKm = 6371;
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = earthRadiusKm * c;
    return distance <= radiusKm;
};
