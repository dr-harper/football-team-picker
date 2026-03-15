import React from 'react';
import { Game, WeatherForecast } from '../../types';
import { describeWeatherCode } from '../../utils/weather';

interface GameHeaderProps {
    game: Game;
    weather: WeatherForecast | null;
    weatherLoading: boolean;
    isCompleted: boolean;
}

const GameHeader: React.FC<GameHeaderProps> = ({ game, weather, weatherLoading, isCompleted }) => {
    const showWeather = game.location && !isCompleted && !weatherLoading && weather;
    const weatherInfo = showWeather ? describeWeatherCode(weather!.weatherCode) : null;

    return (
        <div className="max-w-4xl mx-auto px-1">
            <div className="flex items-baseline justify-between">
                <span className="text-white font-medium text-sm">
                    {new Date(game.date).toLocaleDateString('en-GB', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                    })}
                </span>
                {weatherInfo && (
                    <span className="text-white/70 text-xs flex items-center gap-1">
                        {weatherInfo.emoji} {weather!.temperature}°C {weatherInfo.label}
                    </span>
                )}
            </div>
            <div className="flex items-baseline justify-between mt-0.5">
                {game.location && (
                    <span className="text-green-300 text-xs">{game.location}</span>
                )}
                {weatherInfo && (
                    <span className="text-white/40 text-xs">
                        {weather!.rainProbability}% rain · {weather!.windSpeed} mph wind
                    </span>
                )}
            </div>
        </div>
    );
};

export default GameHeader;
