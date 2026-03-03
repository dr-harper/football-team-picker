import { WeatherForecast } from '../types';

export interface GeoResult {
    lat: number;
    lon: number;
    displayName: string;
}

export async function geocodeLocation(location: string): Promise<GeoResult | null> {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1&addressdetails=1`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    const data = await res.json();
    if (!data.length) return null;
    const r = data[0];
    // Build a concise display name from address parts
    const a = r.address;
    const parts = [a.leisure || a.amenity || a.building || a.road, a.suburb || a.neighbourhood, a.city || a.town || a.village, a.country].filter(Boolean);
    return {
        lat: parseFloat(r.lat),
        lon: parseFloat(r.lon),
        displayName: parts.slice(0, 3).join(', ') || r.display_name.split(',').slice(0, 2).join(',').trim(),
    };
}

// WMO weather interpretation codes → emoji + label
export function describeWeatherCode(code: number): { emoji: string; label: string } {
    if (code === 0) return { emoji: '☀️', label: 'Clear sky' };
    if (code <= 2) return { emoji: '⛅', label: 'Partly cloudy' };
    if (code === 3) return { emoji: '☁️', label: 'Overcast' };
    if (code <= 49) return { emoji: '🌫️', label: 'Foggy' };
    if (code <= 57) return { emoji: '🌦️', label: 'Drizzle' };
    if (code <= 67) return { emoji: '🌧️', label: 'Rain' };
    if (code <= 77) return { emoji: '❄️', label: 'Snow' };
    if (code <= 82) return { emoji: '🌧️', label: 'Rain showers' };
    if (code <= 86) return { emoji: '🌨️', label: 'Snow showers' };
    if (code <= 99) return { emoji: '⛈️', label: 'Thunderstorm' };
    return { emoji: '🌡️', label: 'Unknown' };
}

export async function fetchWeather(location: string, timestamp: number, coords?: { lat: number; lon: number }): Promise<WeatherForecast | null> {
    const resolved = coords ?? await geocodeLocation(location);
    if (!resolved) return null;

    const date = new Date(timestamp);
    const dateStr = date.toISOString().split('T')[0];

    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', String(resolved.lat));
    url.searchParams.set('longitude', String(resolved.lon));
    url.searchParams.set('hourly', 'temperature_2m,precipitation_probability,precipitation,weathercode,windspeed_10m');
    url.searchParams.set('start_date', dateStr);
    url.searchParams.set('end_date', dateStr);
    url.searchParams.set('timezone', 'auto');
    url.searchParams.set('wind_speed_unit', 'mph');

    const res = await fetch(url.toString());
    const data = await res.json();
    if (!data.hourly) return null;

    // Find the hour closest to the game time
    const gameHour = date.getHours();
    const idx = Math.min(gameHour, data.hourly.time.length - 1);

    return {
        temperature: Math.round(data.hourly.temperature_2m[idx]),
        rainMm: data.hourly.precipitation[idx],
        rainProbability: data.hourly.precipitation_probability[idx],
        windSpeed: Math.round(data.hourly.windspeed_10m[idx]),
        weatherCode: data.hourly.weathercode[idx],
    };
}
