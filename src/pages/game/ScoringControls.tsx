import React from 'react';
import { Goal, Plus, Minus, Award, Star } from 'lucide-react';
import { GoalScorer } from '../../types';
import PlayerName from '../../components/PlayerName';

interface TallyRowsProps {
    allPlayerIds: string[];
    tally: GoalScorer[];
    onChange: (playerId: string, delta: number) => void;
    accentClass: string;
    lookup: Record<string, string>;
}

const TallyRows: React.FC<TallyRowsProps> = ({ allPlayerIds, tally, onChange, accentClass, lookup }) => (
    <div className="space-y-1.5">
        {allPlayerIds.map(pid => {
            const count = tally.find(t => t.playerId === pid)?.goals ?? 0;
            return (
                <div key={pid} className="flex items-center justify-between gap-2 bg-white/5 rounded-lg px-3 py-1.5">
                    <PlayerName id={pid} lookup={lookup} className="text-white text-sm truncate" />
                    <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => onChange(pid, -1)} disabled={count === 0} className="text-white/40 hover:text-white disabled:opacity-20 p-0.5">
                            <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-white font-bold text-sm w-4 text-center">{count}</span>
                        <button onClick={() => onChange(pid, 1)} className={`${accentClass} p-0.5`}>
                            <Plus className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            );
        })}
    </div>
);

interface ScoringControlsProps {
    allPlayerIds: string[];
    goalScorers: GoalScorer[];
    assisters: GoalScorer[];
    motm: string;
    motmNotes: string;
    lookup: Record<string, string>;
    enableAssists?: boolean;
    onGoalChange: (playerId: string, delta: number) => void;
    onAssistChange: (playerId: string, delta: number) => void;
    onSetMotm: (playerId: string) => void;
    onMotmNotesChange: (notes: string) => void;
}

const ScoringControls: React.FC<ScoringControlsProps> = ({
    allPlayerIds, goalScorers, assisters, motm, motmNotes, lookup, enableAssists,
    onGoalChange, onAssistChange, onSetMotm, onMotmNotesChange,
}) => {
    const notesTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const [localNotes, setLocalNotes] = React.useState(motmNotes);
    React.useEffect(() => { setLocalNotes(motmNotes); }, [motmNotes]);

    const handleNotesInput = (value: string) => {
        setLocalNotes(value);
        if (notesTimer.current) clearTimeout(notesTimer.current);
        notesTimer.current = setTimeout(() => onMotmNotesChange(value), 600);
    };

    return (
        <div className="border-t border-white/10 pt-4 mt-4 space-y-4">
            <div>
                <h4 className="text-white font-semibold mb-2 flex items-center gap-2 text-sm">
                    <Goal className="w-4 h-4 text-green-400" /> Goal Scorers
                </h4>
                <TallyRows allPlayerIds={allPlayerIds} tally={goalScorers} onChange={onGoalChange} accentClass="text-green-400 hover:text-green-300" lookup={lookup} />
            </div>
            {enableAssists && (
            <div>
                <h4 className="text-white font-semibold mb-2 flex items-center gap-2 text-sm">
                    <span className="text-blue-400 font-bold text-xs bg-blue-400/20 px-1.5 py-0.5 rounded">A</span> Assists
                </h4>
                <TallyRows allPlayerIds={allPlayerIds} tally={assisters} onChange={onAssistChange} accentClass="text-blue-400 hover:text-blue-300" lookup={lookup} />
            </div>
            )}
            <div>
                <h4 className="text-white font-semibold mb-2 flex items-center gap-2 text-sm">
                    <Award className="w-4 h-4 text-yellow-400" /> Man of the Match
                </h4>
                <div className="flex flex-wrap gap-2">
                    {allPlayerIds.map(pid => (
                        <button
                            key={pid}
                            onClick={() => onSetMotm(pid)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                                motm === pid
                                    ? 'bg-yellow-500 text-green-900'
                                    : 'bg-white/10 text-white hover:bg-white/20'
                            }`}
                        >
                            {motm === pid && <Star className="w-3 h-3 inline mr-1" />}<PlayerName id={pid} lookup={lookup} />
                        </button>
                    ))}
                </div>
                {motm && (
                    <textarea
                        value={localNotes}
                        onChange={e => handleNotesInput(e.target.value)}
                        placeholder="Add MOTM notes (shown in shared results)..."
                        className="mt-2 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-yellow-500/50 resize-none"
                        rows={2}
                        maxLength={200}
                    />
                )}
            </div>
        </div>
    );
};

export default ScoringControls;
