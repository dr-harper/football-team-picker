import React, { useState } from 'react';
import { Shuffle, Check, Share2, Download, Users, ArrowRight, Scale, UserCheck } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { TeamSetup, Player } from '../../types';
import TeamSetupCard from '../../components/TeamSetupCard';
import PlaceholderPitch from '../../components/PlaceholderPitch';

interface TeamsStepProps {
    totalAvailable: number;
    playersText: string;
    showTextarea: boolean;
    genError: string;
    pendingSetups: TeamSetup[];
    isExporting: boolean;
    isAdmin: boolean;
    selectedPlayer: { setupIndex: number; teamIndex: number; playerIndex: number } | null;
    availablePlayers: { playerId: string; name: string }[];
    lookup: Record<string, string>;
    onPlayersTextChange: (text: string) => void;
    onToggleTextarea: () => void;
    onGenerateFromAvailable: (count?: number) => void;
    onGenerateFromText: (count?: number) => void;
    onPickSetup: (setup: TeamSetup) => void;
    onDeleteSetup: (setupId: string) => void;
    onColorChange: (setupIndex: number, teamIndex: number, color: string) => void;
    onPlayerClick: (setupIndex: number, teamIndex: number, playerIndex: number) => void;
    onShare: (count: number) => void;
    onExport: (count: number) => void;
    onBack: () => void;
    onCompleteWithoutScore?: () => void;
}

type AssignMode = 'choose' | 'shuffle' | 'manual';

const TEAM_COLOURS = ['#22C55E', '#3B82F6'];
const TEAM_NAMES = ['Team 1', 'Team 2'];

function makePlayer(id: string, name: string): Player {
    return {
        name,
        playerId: id,
        isGoalkeeper: false,
        isStriker: false,
        isDefender: false,
        isteam1: false,
        isteam2: false,
        role: '',
        shirtNumber: null,
    };
}

const TeamsStep: React.FC<TeamsStepProps> = ({
    totalAvailable, genError,
    pendingSetups, isExporting, isAdmin, selectedPlayer,
    availablePlayers,
    onGenerateFromAvailable,
    onPickSetup, onDeleteSetup, onColorChange,
    onPlayerClick, onShare, onExport, onCompleteWithoutScore,
}) => {
    const [mode, setMode] = useState<AssignMode>(pendingSetups.length > 0 ? 'shuffle' : 'choose');

    // Manual assignment state: map of playerId → 0 (team 1), 1 (team 2), or undefined (unassigned)
    const [assignments, setAssignments] = useState<Record<string, number>>({});

    const unassigned = availablePlayers.filter(p => assignments[p.playerId] === undefined);
    const team1 = availablePlayers.filter(p => assignments[p.playerId] === 0);
    const team2 = availablePlayers.filter(p => assignments[p.playerId] === 1);

    const canConfirmManual = team1.length >= 1 && team2.length >= 1;

    const handleAssign = (playerId: string, team: number) => {
        if (team < 0) {
            // Unassign
            setAssignments(prev => {
                const next = { ...prev };
                delete next[playerId];
                return next;
            });
        } else {
            setAssignments(prev => ({ ...prev, [playerId]: team }));
        }
    };

    const handleConfirmManual = () => {
        const setup: TeamSetup = {
            id: crypto.randomUUID(),
            teams: [
                {
                    name: TEAM_NAMES[0],
                    color: TEAM_COLOURS[0],
                    players: team1.map(p => makePlayer(p.playerId, p.name)),
                },
                {
                    name: TEAM_NAMES[1],
                    color: TEAM_COLOURS[1],
                    players: team2.map(p => makePlayer(p.playerId, p.name)),
                },
            ],
            playersInput: '',
        };
        onPickSetup(setup);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-4">
            {/* Mode selector — only show when no drafts yet */}
            {pendingSetups.length === 0 && mode === 'choose' && (
                <div className="space-y-3">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Users className="w-5 h-5" /> Pick Teams
                    </h2>

                    {/* Shuffle option */}
                    <button
                        onClick={() => { setMode('shuffle'); if (totalAvailable >= 4) onGenerateFromAvailable(3); }}
                        className="w-full bg-green-500/10 border border-green-500/20 hover:bg-green-500/15 rounded-xl p-4 text-left transition-all"
                    >
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center shrink-0">
                                <Shuffle className="w-5 h-5 text-green-400" />
                            </div>
                            <div className="flex-1">
                                <h4 className="text-white font-semibold text-sm">Shuffle Teams</h4>
                                <p className="text-white/40 text-xs mt-0.5">
                                    Auto-generate balanced teams from {totalAvailable} available players. Respects position tags.
                                </p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-white/20 shrink-0 mt-3" />
                        </div>
                    </button>

                    {/* Manual option */}
                    <button
                        onClick={() => setMode('manual')}
                        className="w-full bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/15 rounded-xl p-4 text-left transition-all"
                    >
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
                                <Users className="w-5 h-5 text-blue-400" />
                            </div>
                            <div className="flex-1">
                                <h4 className="text-white font-semibold text-sm">Manually Assign</h4>
                                <p className="text-white/40 text-xs mt-0.5">
                                    Pick who goes on which team yourself. Tap each player to assign them.
                                </p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-white/20 shrink-0 mt-3" />
                        </div>
                    </button>

                    {/* Autobalance — coming soon */}
                    <div className="w-full bg-amber-500/5 border border-amber-500/10 rounded-xl p-4 text-left opacity-60">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                                <Scale className="w-5 h-5 text-amber-400/60" />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <h4 className="text-white/60 font-semibold text-sm">Autobalance</h4>
                                    <span className="text-[9px] font-semibold text-amber-400/70 bg-amber-500/15 px-1.5 py-0.5 rounded">COMING SOON</span>
                                </div>
                                <p className="text-white/25 text-xs mt-0.5">
                                    Uses player form, goal stats, and match history to create the most balanced game possible.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Skip teams — attendance only */}
                    {isAdmin && onCompleteWithoutScore && (
                        <button
                            onClick={onCompleteWithoutScore}
                            className="w-full bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl p-4 text-left transition-all"
                        >
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                                    <UserCheck className="w-5 h-5 text-white/40" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-white/60 font-semibold text-sm">Skip — just track attendance</h4>
                                    <p className="text-white/25 text-xs mt-0.5">
                                        Mark who showed up without generating teams or recording a score.
                                    </p>
                                </div>
                                <ArrowRight className="w-4 h-4 text-white/20 shrink-0 mt-3" />
                            </div>
                        </button>
                    )}
                </div>
            )}

            {/* Shuffle mode — initial generate button (before any drafts) */}
            {mode === 'shuffle' && pendingSetups.length === 0 && (
                <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-5">
                    <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                        <Shuffle className="w-5 h-5" /> Shuffle Teams
                    </h2>
                    {totalAvailable >= 4 ? (
                        <div className="space-y-2">
                            <Button
                                onClick={() => onGenerateFromAvailable(3)}
                                className="w-full bg-green-600 hover:bg-green-500 text-white rounded-lg flex items-center justify-center gap-2 py-3"
                            >
                                <Shuffle className="w-4 h-4" /> Shuffle ({totalAvailable} players)
                            </Button>
                            <div className="flex items-center justify-between">
                                <p className="text-white/30 text-[10px]">
                                    Generates 3 balanced options. Swap players after.
                                </p>
                                <button onClick={() => setMode('choose')} className="text-white/30 hover:text-white/50 text-[10px] transition-colors">
                                    ← Back
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-4">
                            <p className="text-white/50 text-sm">Need at least 4 available players.</p>
                        </div>
                    )}
                    {genError && (
                        <div className="text-red-400 text-sm bg-red-500/10 p-3 rounded-lg mt-3">
                            {genError}
                        </div>
                    )}
                </div>
            )}

            {/* Manual assignment mode */}
            {mode === 'manual' && pendingSetups.length === 0 && (
                <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <Users className="w-5 h-5" /> Assign Teams
                        </h2>
                        <button onClick={() => setMode('choose')} className="text-white/30 hover:text-white/50 text-xs transition-colors">
                            ← Back
                        </button>
                    </div>

                    {/* Player list with team toggles */}
                    <div className="space-y-1.5">
                        {availablePlayers.map(p => {
                            const team = assignments[p.playerId];
                            return (
                                <div key={p.playerId} className={`flex items-center gap-2 rounded-lg px-3 py-2 transition-colors ${
                                    team === 0 ? 'bg-green-500/10' : team === 1 ? 'bg-blue-500/10' : 'bg-white/5'
                                }`}>
                                    <span className={`flex-1 text-sm font-medium ${
                                        team !== undefined ? 'text-white' : 'text-white/50'
                                    }`}>
                                        {p.name}
                                    </span>
                                    <button
                                        onClick={() => handleAssign(p.playerId, team === 0 ? -1 : 0)}
                                        className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
                                            team === 0
                                                ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                                                : 'bg-white/5 text-white/20 hover:bg-green-500/20 hover:text-green-300'
                                        }`}
                                    >
                                        1
                                    </button>
                                    <button
                                        onClick={() => handleAssign(p.playerId, team === 1 ? -1 : 1)}
                                        className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
                                            team === 1
                                                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                                                : 'bg-white/5 text-white/20 hover:bg-blue-500/20 hover:text-blue-300'
                                        }`}
                                    >
                                        2
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    {/* Live counter */}
                    <div className="flex items-center justify-center gap-4 text-xs">
                        <span className="text-green-400 font-semibold">Team 1: {team1.length}</span>
                        <span className="text-white/20">·</span>
                        <span className="text-blue-400 font-semibold">Team 2: {team2.length}</span>
                        {unassigned.length > 0 && (
                            <>
                                <span className="text-white/20">·</span>
                                <span className="text-white/30">{unassigned.length} left</span>
                            </>
                        )}
                    </div>

                    {/* Confirm */}
                    <Button
                        onClick={handleConfirmManual}
                        disabled={!canConfirmManual}
                        className="w-full bg-green-600 hover:bg-green-500 disabled:bg-white/5 disabled:text-white/20 text-white rounded-lg flex items-center justify-center gap-2 py-3"
                    >
                        <Check className="w-4 h-4" /> Confirm Teams
                    </Button>
                    {!canConfirmManual && unassigned.length === availablePlayers.length && (
                        <p className="text-white/20 text-[10px] text-center">Tap 1 or 2 next to each player</p>
                    )}
                </div>
            )}

            {/* Generated drafts */}
            {pendingSetups.length === 0 && mode !== 'manual' && <PlaceholderPitch />}

            {pendingSetups.length > 0 && (
                <>
                    <div className="flex items-center justify-between">
                        <p className="text-green-300 text-sm">
                            {pendingSetups.length} option{pendingSetups.length !== 1 ? 's' : ''} — pick the one you want
                        </p>
                        {isAdmin && (
                            <div className="flex gap-2">
                                <Button onClick={() => onShare(pendingSetups.length)} disabled={isExporting} className="bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg px-3 py-1.5 text-xs flex items-center gap-1.5">
                                    <Share2 className="w-3.5 h-3.5" /> Share
                                </Button>
                                <Button onClick={() => onExport(pendingSetups.length)} disabled={isExporting} className="bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg px-3 py-1.5 text-xs flex items-center gap-1.5">
                                    <Download className="w-3.5 h-3.5" /> Save
                                </Button>
                            </div>
                        )}
                    </div>
                    {pendingSetups.map((setup, idx) => (
                        <TeamSetupCard
                            key={setup.id}
                            setup={setup}
                            setupIndex={idx}
                            totalSetups={pendingSetups.length}
                            selectedPlayer={selectedPlayer}
                            onPlayerClick={onPlayerClick}
                            onDelete={() => onDeleteSetup(setup.id)}
                            onColorChange={onColorChange}
                            onPick={() => onPickSetup(setup)}
                            aiEnabled={false}
                            onGenerateSummary={() => {}}
                        />
                    ))}

                    {/* Generate more */}
                    <button
                        onClick={() => onGenerateFromAvailable(3)}
                        className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-3 text-white/50 hover:text-white/70 text-sm font-medium transition-all"
                    >
                        <Shuffle className="w-4 h-4" /> Generate more options
                    </button>
                </>
            )}
        </div>
    );
};

export default TeamsStep;
