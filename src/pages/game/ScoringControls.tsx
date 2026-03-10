import React from 'react';
import { Goal, Plus, Minus, Award, Star } from 'lucide-react';
import { GoalScorer } from '../../types';

interface TallyRowsProps {
    allPlayerNames: string[];
    tally: GoalScorer[];
    onChange: (name: string, delta: number) => void;
    accentClass: string;
}

const TallyRows: React.FC<TallyRowsProps> = ({ allPlayerNames, tally, onChange, accentClass }) => (
    <div className="space-y-1.5">
        {allPlayerNames.map(name => {
            const count = tally.find(t => t.name === name)?.goals ?? 0;
            return (
                <div key={name} className="flex items-center justify-between gap-2 bg-white/5 rounded-lg px-3 py-1.5">
                    <span className="text-white text-sm truncate">{name}</span>
                    <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => onChange(name, -1)} disabled={count === 0} className="text-white/40 hover:text-white disabled:opacity-20 p-0.5">
                            <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-white font-bold text-sm w-4 text-center">{count}</span>
                        <button onClick={() => onChange(name, 1)} className={`${accentClass} p-0.5`}>
                            <Plus className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            );
        })}
    </div>
);

interface ScoringControlsProps {
    allPlayerNames: string[];
    goalScorers: GoalScorer[];
    assisters: GoalScorer[];
    motm: string;
    onGoalChange: (name: string, delta: number) => void;
    onAssistChange: (name: string, delta: number) => void;
    onSetMotm: (name: string) => void;
}

const ScoringControls: React.FC<ScoringControlsProps> = ({
    allPlayerNames, goalScorers, assisters, motm,
    onGoalChange, onAssistChange, onSetMotm,
}) => (
    <div className="border-t border-white/10 pt-4 mt-4 space-y-4">
        <div>
            <h4 className="text-white font-semibold mb-2 flex items-center gap-2 text-sm">
                <Goal className="w-4 h-4 text-green-400" /> Goal Scorers
            </h4>
            <TallyRows allPlayerNames={allPlayerNames} tally={goalScorers} onChange={onGoalChange} accentClass="text-green-400 hover:text-green-300" />
        </div>
        <div>
            <h4 className="text-white font-semibold mb-2 flex items-center gap-2 text-sm">
                <span className="text-blue-400 font-bold text-xs bg-blue-400/20 px-1.5 py-0.5 rounded">A</span> Assists
            </h4>
            <TallyRows allPlayerNames={allPlayerNames} tally={assisters} onChange={onAssistChange} accentClass="text-blue-400 hover:text-blue-300" />
        </div>
        <div>
            <h4 className="text-white font-semibold mb-2 flex items-center gap-2 text-sm">
                <Award className="w-4 h-4 text-yellow-400" /> Man of the Match
            </h4>
            <div className="flex flex-wrap gap-2">
                {allPlayerNames.map(name => (
                    <button
                        key={name}
                        onClick={() => onSetMotm(name)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                            motm === name
                                ? 'bg-yellow-500 text-green-900'
                                : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                    >
                        {motm === name && <Star className="w-3 h-3 inline mr-1" />}{name}
                    </button>
                ))}
            </div>
        </div>
    </div>
);

export default ScoringControls;
