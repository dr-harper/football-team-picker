import React from 'react';
import { Game, WeatherForecast } from '../../types';
import { describeWeatherCode } from '../../utils/weather';
import LocationMap from '../../components/LocationMap';

interface GameHeaderProps {
    game: Game;
    weather: WeatherForecast | null;
    weatherLoading: boolean;
    isCompleted: boolean;
}

const GameHeader: React.FC<GameHeaderProps> = ({ game, weather, weatherLoading, isCompleted }) => (
    <div className="max-w-4xl mx-auto bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-4">
        <div className="text-center text-white font-medium">
            {new Date(game.date).toLocaleDateString('en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            })}
        </div>
        {game.location && (
            <div className="text-center text-green-300 text-sm mt-1">
                {game.location}
            </div>
        )}
        {game.locationLat !== undefined && game.locationLon !== undefined && (
            <div className="mt-3 rounded-lg overflow-hidden border border-white/10" style={{ height: 140 }}>
                <LocationMap lat={game.locationLat} lon={game.locationLon} height={140} />
            </div>
        )}
        {game.location && !isCompleted && (
            <div className="mt-3 pt-3 border-t border-white/10">
                {weatherLoading && (
                    <div className="text-center text-green-300/60 text-xs">Fetching forecast...</div>
                )}
                {!weatherLoading && weather && (() => {
                    const { emoji, label } = describeWeatherCode(weather.weatherCode);
                    return (
                        <div className="flex items-center justify-center gap-6 text-sm">
                            <span className="text-2xl">{emoji}</span>
                            <div className="text-center">
                                <div className="text-white font-semibold">{weather.temperature}°C</div>
                                <div className="text-green-300 text-xs">{label}</div>
                            </div>
                            <div className="text-center">
                                <div className="text-white font-semibold">{weather.rainProbability}%</div>
                                <div className="text-green-300 text-xs">rain chance</div>
                            </div>
                            <div className="text-center">
                                <div className="text-white font-semibold">{weather.windSpeed} mph</div>
                                <div className="text-green-300 text-xs">wind</div>
                            </div>
                        </div>
                    );
                })()}
                {!weatherLoading && !weather && (
                    <div className="text-center text-green-300/60 text-xs">No forecast available</div>
                )}
            </div>
        )}
    </div>
);

export default GameHeader;
