import React from 'react';
import { Goal, Plus, Minus, Award, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { GoalScorer, Team } from '../../types';
import PlayerName from '../../components/PlayerName';
import { hapticSuccess } from '../../utils/haptics';

function findTeamIndex(playerId: string, teams: Team[]): number {
    for (let t = 0; t < teams.length; t++) {
        if (teams[t].players.some(p => (p.playerId ?? p.name) === playerId)) return t;
    }
    return -1;
}

function TallyRow({
    pid, count, onChange, accentClass, lookup,
}: {
    pid: string;
    count: number;
    onChange: (playerId: string, delta: number) => void;
    accentClass: string;
    lookup: Record<string, string>;
}) {
    const [undoFlash, setUndoFlash] = React.useState(false);
    const undoTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    React.useEffect(() => {
        return () => {
            if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
        };
    }, []);

    const handleUndo = () => {
        onChange(pid, -1);
        setUndoFlash(true);
        if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
        undoTimerRef.current = setTimeout(() => setUndoFlash(false), 600);
    };

    return (
        <div className={`flex items-center justify-between gap-2 rounded-lg px-3 py-1.5 transition-colors duration-300 ${undoFlash ? 'bg-red-500/20' : 'bg-white/5'}`}>
            <PlayerName id={pid} lookup={lookup} className="text-white text-sm truncate" />
            <div className="flex items-center gap-2 shrink-0">
                <button onClick={handleUndo} disabled={count === 0} className="text-white/40 hover:text-white disabled:opacity-20 p-0.5">
                    <Minus className="w-3.5 h-3.5" />
                </button>
                <motion.span
                    key={count}
                    className={`font-bold text-sm w-4 text-center transition-colors duration-300 ${undoFlash ? 'text-red-400' : 'text-white'}`}
                    initial={{ scale: 1.4 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                >
                    {count}
                </motion.span>
                <button onClick={() => onChange(pid, 1)} className={`${accentClass} p-0.5`}>
                    <Plus className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
}

function TeamColumnTally({
    label, colour, playerIds, tally, onChange, accentClass, lookup,
}: {
    label: string;
    colour?: string;
    playerIds: string[];
    tally: GoalScorer[];
    onChange: (playerId: string, delta: number) => void;
    accentClass: string;
    lookup: Record<string, string>;
}) {
    return (
        <div className="space-y-1.5">
            <div className="text-[10px] uppercase tracking-wider mb-1 truncate" style={{ color: colour || 'rgba(134,239,172,0.7)' }}>
                {label}
            </div>
            {playerIds.map(pid => (
                <TallyRow
                    key={pid}
                    pid={pid}
                    count={tally.find(t => t.playerId === pid)?.goals ?? 0}
                    onChange={onChange}
                    accentClass={accentClass}
                    lookup={lookup}
                />
            ))}
        </div>
    );
}

interface ScoringControlsProps {
    allPlayerIds: string[];
    goalScorers: GoalScorer[];
    assisters: GoalScorer[];
    motm: string;
    motmNotes: string;
    lookup: Record<string, string>;
    enableAssists?: boolean;
    teams?: Team[];
    disabled?: boolean;
    hideMotm?: boolean;
    hideHeadings?: boolean;
    onGoalChange: (playerId: string, delta: number) => void;
    onAssistChange: (playerId: string, delta: number) => void;
    onSetMotm: (playerId: string) => void;
    onMotmNotesChange: (notes: string) => void;
}

const ScoringControls: React.FC<ScoringControlsProps> = ({
    allPlayerIds, goalScorers, assisters, motm, motmNotes, lookup, enableAssists,
    teams, disabled, hideMotm, hideHeadings, onGoalChange, onAssistChange, onSetMotm, onMotmNotesChange,
}) => {
    const notesTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const [localNotes, setLocalNotes] = React.useState(motmNotes);
    React.useEffect(() => { setLocalNotes(motmNotes); }, [motmNotes]);

    const handleNotesInput = (value: string) => {
        setLocalNotes(value);
        if (notesTimer.current) clearTimeout(notesTimer.current);
        notesTimer.current = setTimeout(() => onMotmNotesChange(value), 600);
    };

    const hasTeams = teams && teams.length === 2;
    const team0Ids = hasTeams ? allPlayerIds.filter(pid => findTeamIndex(pid, teams) === 0) : [];
    const team1Ids = hasTeams ? allPlayerIds.filter(pid => findTeamIndex(pid, teams) === 1) : [];

    // Own goal IDs: og: scorer is on one team, goal counts for the other
    const ogIds = goalScorers.filter(g => g.playerId.startsWith('og:')).map(g => g.playerId);
    const team0OgIds = hasTeams ? ogIds.filter(id => {
        const realId = id.slice(3);
        return findTeamIndex(realId, teams) === 1; // team 1 player's OG counts for team 0
    }) : [];
    const team1OgIds = hasTeams ? ogIds.filter(id => {
        const realId = id.slice(3);
        return findTeamIndex(realId, teams) === 0; // team 0 player's OG counts for team 1
    }) : [];

    const renderTallySection = (
        label: string,
        icon: React.ReactNode,
        tally: GoalScorer[],
        onChange: (playerId: string, delta: number) => void,
        accentClass: string,
    ) => (
        <div>
            {!hideHeadings && (
                <h4 className="text-white font-semibold mb-2 flex items-center gap-2 text-sm">
                    {icon} {label}
                </h4>
            )}
            {hasTeams ? (
                <div className="grid grid-cols-2 gap-3">
                    <TeamColumnTally
                        label={teams[0].name}
                        colour={teams[0].color}
                        playerIds={[...team0Ids, ...(tally === goalScorers ? team0OgIds : [])]}
                        tally={tally}
                        onChange={onChange}
                        accentClass={accentClass}
                        lookup={lookup}
                    />
                    <TeamColumnTally
                        label={teams[1].name}
                        colour={teams[1].color}
                        playerIds={[...team1Ids, ...(tally === goalScorers ? team1OgIds : [])]}
                        tally={tally}
                        onChange={onChange}
                        accentClass={accentClass}
                        lookup={lookup}
                    />
                </div>
            ) : (
                <div className="space-y-1.5">
                    {allPlayerIds.map(pid => (
                        <TallyRow
                            key={pid}
                            pid={pid}
                            count={tally.find(t => t.playerId === pid)?.goals ?? 0}
                            onChange={onChange}
                            accentClass={accentClass}
                            lookup={lookup}
                        />
                    ))}
                </div>
            )}
        </div>
    );

    return (
        <div className={`border-t border-white/10 pt-4 mt-4 space-y-4 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
            {disabled && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2 text-yellow-300 text-xs text-center">
                    Resume match to score
                </div>
            )}
            {renderTallySection(
                'Goal Scorers',
                <Goal className="w-4 h-4 text-green-400" />,
                goalScorers,
                onGoalChange,
                'text-green-400 hover:text-green-300',
            )}
            {enableAssists && renderTallySection(
                'Assists',
                <span className="text-blue-400 font-bold text-xs bg-blue-400/20 px-1.5 py-0.5 rounded">A</span>,
                assisters,
                onAssistChange,
                'text-blue-400 hover:text-blue-300',
            )}
            {!hideMotm && <div>
                <h4 className="text-white font-semibold mb-2 flex items-center gap-2 text-sm">
                    <Award className="w-4 h-4 text-yellow-400" /> Man of the Match
                </h4>
                <div className="flex flex-wrap gap-2">
                    {allPlayerIds.map(pid => (
                        <button
                            key={pid}
                            onClick={() => { onSetMotm(pid); hapticSuccess(); }}
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
            </div>}
        </div>
    );
};

export default ScoringControls;
