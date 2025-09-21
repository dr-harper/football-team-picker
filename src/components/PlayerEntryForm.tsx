import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from './ui/button';

interface PlayerEntryFormProps {
    playersText: string;
    onPlayersTextChange: (text: string) => void;
}

interface ParsedPlayer {
    name: string;
    isGoalkeeper: boolean;
    isDefender: boolean;
    isStriker: boolean;
    isTeam1: boolean;
    isTeam2: boolean;
}

const parsePlayers = (playersText: string): ParsedPlayer[] => {
    return playersText
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => {
            const [namePart, ...rawTags] = line.split('#');
            const name = namePart.trim();
            if (!name) {
                return null;
            }
            const tags = rawTags.map(tag => tag.trim().toLowerCase());

            return {
                name,
                isGoalkeeper: tags.includes('g'),
                isDefender: tags.includes('d'),
                isStriker: tags.includes('s'),
                isTeam1: tags.includes('t1'),
                isTeam2: tags.includes('t2'),
            } satisfies ParsedPlayer;
        })
        .filter((player): player is ParsedPlayer => Boolean(player));
};

const formatPlayerLine = (player: ParsedPlayer) => {
    const tags: string[] = [];

    if (player.isGoalkeeper) tags.push('#g');
    if (player.isDefender) tags.push('#d');
    if (player.isStriker) tags.push('#s');
    if (player.isTeam1) tags.push('#t1');
    if (player.isTeam2) tags.push('#t2');

    return tags.length > 0 ? `${player.name} ${tags.join(' ')}` : player.name;
};

const PlayerEntryForm: React.FC<PlayerEntryFormProps> = ({ playersText, onPlayersTextChange }) => {
    const parsedPlayers = useMemo(() => parsePlayers(playersText), [playersText]);

    const [playerName, setPlayerName] = useState('');
    const [isGoalkeeper, setIsGoalkeeper] = useState(false);
    const [isDefender, setIsDefender] = useState(false);
    const [isStriker, setIsStriker] = useState(false);
    const [isTeam1, setIsTeam1] = useState(false);
    const [isTeam2, setIsTeam2] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    const resetForm = useCallback(() => {
        setPlayerName('');
        setIsGoalkeeper(false);
        setIsDefender(false);
        setIsStriker(false);
        setIsTeam1(false);
        setIsTeam2(false);
        setEditingIndex(null);
        setError(null);
    }, []);

    useEffect(() => {
        if (editingIndex === null) {
            return;
        }

        const player = parsedPlayers[editingIndex];
        if (!player) {
            resetForm();
            return;
        }

        setPlayerName(player.name);
        setIsGoalkeeper(player.isGoalkeeper);
        setIsDefender(player.isDefender);
        setIsStriker(player.isStriker);
        setIsTeam1(player.isTeam1);
        setIsTeam2(player.isTeam2);
    }, [editingIndex, parsedPlayers, resetForm]);

    const writePlayers = (players: ParsedPlayer[]) => {
        const newText = players.map(formatPlayerLine).join('\n');
        onPlayersTextChange(newText);
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const trimmedName = playerName.trim();
        if (!trimmedName) {
            setError('Please enter a player name.');
            return;
        }

        const updatedPlayer: ParsedPlayer = {
            name: trimmedName,
            isGoalkeeper,
            isDefender,
            isStriker,
            isTeam1,
            isTeam2,
        };

        if (editingIndex === null) {
            writePlayers([...parsedPlayers, updatedPlayer]);
        } else {
            writePlayers(parsedPlayers.map((player, index) => (index === editingIndex ? updatedPlayer : player)));
        }

        resetForm();
    };

    const handleEdit = (index: number) => {
        setEditingIndex(index);
        setError(null);
    };

    const handleDelete = (index: number) => {
        const nextPlayers = parsedPlayers.filter((_, playerIndex) => playerIndex !== index);
        writePlayers(nextPlayers);

        if (editingIndex === null) {
            return;
        }

        if (editingIndex === index) {
            resetForm();
        } else if (editingIndex > index) {
            setEditingIndex(editingIndex - 1);
        }
    };

    const submitLabel = editingIndex !== null ? 'Update Player' : 'Add Player';

    return (
        <div className="mb-4 bg-green-800/70 rounded-md p-4 border border-green-600">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-semibold text-green-100 mb-1" htmlFor="player-name">
                        Player name
                    </label>
                    <input
                        id="player-name"
                        type="text"
                        value={playerName}
                        onChange={event => {
                            setPlayerName(event.target.value);
                            if (error) {
                                setError(null);
                            }
                        }}
                        className="w-full rounded border border-green-500 bg-green-700 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                        placeholder="e.g. Alex"
                    />
                </div>

                <div>
                    <p className="text-sm font-semibold text-green-100 mb-2">Tags</p>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-sm">
                        <label className="flex items-center space-x-2 rounded bg-green-700/60 px-3 py-2 cursor-pointer border border-green-600 hover:border-yellow-400">
                            <input
                                type="checkbox"
                                checked={isGoalkeeper}
                                onChange={event => setIsGoalkeeper(event.target.checked)}
                                className="accent-yellow-400"
                            />
                            <span className="text-green-100 font-medium">#g</span>
                        </label>
                        <label className="flex items-center space-x-2 rounded bg-green-700/60 px-3 py-2 cursor-pointer border border-green-600 hover:border-yellow-400">
                            <input
                                type="checkbox"
                                checked={isDefender}
                                onChange={event => setIsDefender(event.target.checked)}
                                className="accent-yellow-400"
                            />
                            <span className="text-green-100 font-medium">#d</span>
                        </label>
                        <label className="flex items-center space-x-2 rounded bg-green-700/60 px-3 py-2 cursor-pointer border border-green-600 hover:border-yellow-400">
                            <input
                                type="checkbox"
                                checked={isStriker}
                                onChange={event => setIsStriker(event.target.checked)}
                                className="accent-yellow-400"
                            />
                            <span className="text-green-100 font-medium">#s</span>
                        </label>
                        <label className="flex items-center space-x-2 rounded bg-green-700/60 px-3 py-2 cursor-pointer border border-green-600 hover:border-yellow-400">
                            <input
                                type="checkbox"
                                checked={isTeam1}
                                onChange={event => {
                                    const checked = event.target.checked;
                                    setIsTeam1(checked);
                                    if (checked) {
                                        setIsTeam2(false);
                                    }
                                }}
                                className="accent-yellow-400"
                            />
                            <span className="text-green-100 font-medium">#t1</span>
                        </label>
                        <label className="flex items-center space-x-2 rounded bg-green-700/60 px-3 py-2 cursor-pointer border border-green-600 hover:border-yellow-400">
                            <input
                                type="checkbox"
                                checked={isTeam2}
                                onChange={event => {
                                    const checked = event.target.checked;
                                    setIsTeam2(checked);
                                    if (checked) {
                                        setIsTeam1(false);
                                    }
                                }}
                                className="accent-yellow-400"
                            />
                            <span className="text-green-100 font-medium">#t2</span>
                        </label>
                    </div>
                </div>

                {error && <p className="text-sm text-yellow-300">{error}</p>}

                <div className="flex items-center gap-2">
                    <Button type="submit" className="bg-yellow-400 text-green-900 hover:bg-yellow-300">
                        {submitLabel}
                    </Button>
                    {editingIndex !== null && (
                        <Button type="button" variant="secondary" onClick={resetForm} className="text-sm">
                            Cancel
                        </Button>
                    )}
                </div>
            </form>

            {parsedPlayers.length > 0 && (
                <div className="mt-6 space-y-3">
                    <h3 className="text-sm font-semibold text-green-100 uppercase tracking-wide">Current players</h3>
                    <ul className="space-y-2">
                        {parsedPlayers.map((player, index) => {
                            const tags: string[] = [];
                            if (player.isGoalkeeper) tags.push('#g');
                            if (player.isDefender) tags.push('#d');
                            if (player.isStriker) tags.push('#s');
                            if (player.isTeam1) tags.push('#t1');
                            if (player.isTeam2) tags.push('#t2');

                            const isEditing = editingIndex === index;

                            return (
                                <li
                                    key={`${player.name}-${index}`}
                                    className={`flex items-center justify-between rounded border px-3 py-2 text-sm transition ${
                                        isEditing
                                            ? 'border-yellow-400 bg-green-900/70'
                                            : 'border-green-700 bg-green-900/40'
                                    } text-green-100`}
                                >
                                    <div>
                                        <p className="font-semibold text-white">{player.name}</p>
                                        {tags.length > 0 && <p className="text-xs text-green-200">{tags.join(' ')}</p>}
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            onClick={() => handleEdit(index)}
                                            className="text-xs"
                                        >
                                            Edit
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            onClick={() => handleDelete(index)}
                                            className="text-xs"
                                        >
                                            Delete
                                        </Button>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default PlayerEntryForm;
