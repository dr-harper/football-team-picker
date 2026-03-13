import React, { useRef, useState, useEffect } from 'react';
import { Minus, Plus, Star, Pencil, Users } from 'lucide-react';
import { GoalScorer, Team } from '../../types';
import PlayerName from '../../components/PlayerName';

interface ScoringTableProps {
    teams: Team[];
    allPlayerIds: string[];
    goalScorers: GoalScorer[];
    assisters: GoalScorer[];
    motm: string;
    motmNotes: string;
    lookup: Record<string, string>;
    enableAssists: boolean;
    attendees: string[];
    effectiveCost: number;
    editingCost: boolean;
    costInput: string;
    isLeagueDefault: boolean;
    onGoalChange: (playerId: string, delta: number) => void;
    onAssistChange: (playerId: string, delta: number) => void;
    onSetMotm: (playerId: string) => void;
    onMotmNotesChange: (notes: string) => void;
    onToggleAttendee: (playerId: string) => void;
    onCostInputChange: (value: string) => void;
    onEditCost: () => void;
    onSaveCost: () => void;
    onCancelCost: () => void;
}

/** Find which team (0 or 1) a player belongs to, -1 if not found */
function findTeamIndex(playerId: string, teams: Team[]): number {
    for (let t = 0; t < teams.length; t++) {
        if (teams[t].players.some(p => (p.playerId ?? p.name) === playerId)) return t;
    }
    return -1;
}

function Counter({ count, onDec, onInc, accent }: {
    count: number;
    onDec: () => void;
    onInc: () => void;
    accent: string;
}) {
    return (
        <div className="flex items-center gap-1">
            <button onClick={onDec} disabled={count === 0} className="text-white/30 hover:text-white disabled:opacity-20 p-0.5">
                <Minus className="w-3 h-3" />
            </button>
            <span className={`font-bold text-xs w-4 text-center ${count > 0 ? accent : 'text-white/30'}`}>{count}</span>
            <button onClick={onInc} className={`${accent} p-0.5 hover:opacity-80`}>
                <Plus className="w-3 h-3" />
            </button>
        </div>
    );
}

const ScoringTable: React.FC<ScoringTableProps> = ({
    teams, allPlayerIds, goalScorers, assisters, motm, motmNotes, lookup,
    enableAssists, attendees, effectiveCost, editingCost, costInput, isLeagueDefault,
    onGoalChange, onAssistChange, onSetMotm, onMotmNotesChange,
    onToggleAttendee, onCostInputChange, onEditCost, onSaveCost, onCancelCost,
}) => {
    const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [localNotes, setLocalNotes] = useState(motmNotes);
    useEffect(() => { setLocalNotes(motmNotes); }, [motmNotes]);

    const handleNotesInput = (value: string) => {
        setLocalNotes(value);
        if (notesTimer.current) clearTimeout(notesTimer.current);
        notesTimer.current = setTimeout(() => onMotmNotesChange(value), 600);
    };

    // Group players by team, then unassigned
    const team0Ids = allPlayerIds.filter(pid => findTeamIndex(pid, teams) === 0);
    const team1Ids = allPlayerIds.filter(pid => findTeamIndex(pid, teams) === 1);
    const unassigned = allPlayerIds.filter(pid => findTeamIndex(pid, teams) === -1);

    const getGoals = (pid: string) => goalScorers.find(g => g.playerId === pid)?.goals ?? 0;
    const getAssists = (pid: string) => assisters.find(a => a.playerId === pid)?.goals ?? 0;

    const pot = attendees.length * effectiveCost;

    const colCount = 4 + (enableAssists ? 1 : 0);

    const renderGroup = (playerIds: string[], teamName?: string, teamColour?: string) => (
        <>
            {teamName && (
                <tr>
                    <td colSpan={colCount} className="pt-3 pb-1 px-2">
                        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: teamColour || 'rgba(134,239,172,0.7)' }}>
                            {teamName}
                        </span>
                    </td>
                </tr>
            )}
            {playerIds.map(pid => {
                const isMotm = motm === pid;
                const attended = attendees.includes(pid);
                return (
                    <tr
                        key={pid}
                        className={isMotm
                            ? 'bg-yellow-500/15'
                            : 'hover:bg-white/5'
                        }
                    >
                        {/* Player name */}
                        <td className="py-1.5 px-2">
                            <PlayerName
                                id={pid}
                                lookup={lookup}
                                className={`text-sm truncate ${isMotm ? 'text-yellow-200 font-semibold' : 'text-white'}`}
                            />
                        </td>
                        {/* Goals */}
                        <td className="py-1.5 px-1">
                            <Counter
                                count={getGoals(pid)}
                                onDec={() => onGoalChange(pid, -1)}
                                onInc={() => onGoalChange(pid, 1)}
                                accent="text-green-400"
                            />
                        </td>
                        {/* Assists */}
                        {enableAssists && (
                            <td className="py-1.5 px-1">
                                <Counter
                                    count={getAssists(pid)}
                                    onDec={() => onAssistChange(pid, -1)}
                                    onInc={() => onAssistChange(pid, 1)}
                                    accent="text-blue-400"
                                />
                            </td>
                        )}
                        {/* Attendance */}
                        <td className="py-1.5 px-2 text-center">
                            <input
                                type="checkbox"
                                checked={attended}
                                onChange={() => onToggleAttendee(pid)}
                                className="w-3.5 h-3.5 accent-green-500"
                            />
                        </td>
                        {/* MOTM */}
                        <td className="py-1.5 px-2 text-center">
                            <button
                                onClick={() => onSetMotm(pid)}
                                className="group p-0.5"
                            >
                                {isMotm ? (
                                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                ) : (
                                    <Star className="w-4 h-4 text-white/10 group-hover:text-white/30 transition-colors" />
                                )}
                            </button>
                        </td>
                    </tr>
                );
            })}
        </>
    );

    return (
        <div className="border-t border-white/10 pt-4 mt-4 space-y-3">
            {/* Cost per person */}
            <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-green-400" />
                <span className="text-white/60 text-sm">Cost:</span>
                {editingCost ? (
                    <div className="flex items-center gap-2">
                        <span className="text-white/60 text-sm">&pound;</span>
                        <input
                            type="number"
                            value={costInput}
                            onChange={e => onCostInputChange(e.target.value)}
                            placeholder="0.00"
                            min="0"
                            step="0.5"
                            autoFocus
                            className="w-20 bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-white text-sm"
                        />
                        <button onClick={onSaveCost} className="text-green-400 hover:text-green-300 text-xs px-2 py-1 bg-green-600/20 rounded">Save</button>
                        <button onClick={onCancelCost} className="text-white/40 hover:text-white text-xs">Cancel</button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <span className="text-white font-semibold text-sm">
                            {effectiveCost > 0 ? `£${effectiveCost.toFixed(2)}` : 'Free'}
                        </span>
                        {isLeagueDefault && (
                            <span className="text-white/30 text-xs">(default)</span>
                        )}
                        <button onClick={onEditCost} className="text-white/40 hover:text-white/70 transition-colors">
                            <Pencil className="w-3 h-3" />
                        </button>
                        <span className="text-white/30 text-xs ml-auto">
                            {attendees.length} attended &middot; &pound;{pot.toFixed(2)}
                        </span>
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="overflow-x-auto -mx-1">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="text-white/40 text-[10px] uppercase tracking-wider border-b border-white/10">
                            <th className="text-left px-2 pb-2 font-medium">Player</th>
                            <th className="px-1 pb-2 font-medium w-20">Goals</th>
                            {enableAssists && <th className="px-1 pb-2 font-medium w-20">Assists</th>}
                            <th className="px-2 pb-2 font-medium w-14">Attended</th>
                            <th className="px-2 pb-2 font-medium w-12">MOTM</th>
                        </tr>
                    </thead>
                    <tbody>
                        {team0Ids.length > 0 && renderGroup(team0Ids, teams[0]?.name, teams[0]?.color)}
                        {team1Ids.length > 0 && renderGroup(team1Ids, teams[1]?.name, teams[1]?.color)}
                        {unassigned.length > 0 && renderGroup(unassigned, unassigned.length > 0 && (team0Ids.length > 0 || team1Ids.length > 0) ? 'Other' : undefined)}
                    </tbody>
                </table>
            </div>

            {/* MOTM notes */}
            {motm && (
                <textarea
                    value={localNotes}
                    onChange={e => handleNotesInput(e.target.value)}
                    placeholder="Add MOTM notes (shown in shared results)..."
                    className="w-full bg-white/5 border border-yellow-500/20 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-yellow-500/50 resize-none"
                    rows={2}
                    maxLength={200}
                />
            )}
        </div>
    );
};

export default ScoringTable;
