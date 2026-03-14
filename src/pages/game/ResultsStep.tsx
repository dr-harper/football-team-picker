import React from 'react';
import { Trophy, Share2, Download, ChevronLeft } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Game, Team } from '../../types';

interface ResultsStepProps {
    game: Game;
    generatedTeams: Team[] | null;
    isAdmin: boolean;
    isPast: boolean;
    score1: string;
    score2: string;
    isExporting: boolean;
    allPlayerIds: string[];
    scoringControlsElement: React.ReactNode;
    attendanceSectionElement: React.ReactNode;
    onScore1Change: (val: string) => void;
    onScore2Change: (val: string) => void;
    onSaveScore: () => void;
    onShare: (count: number) => void;
    onExport: (count: number) => void;
    onBack: () => void;
    onGoToTeams: () => void;
}

const ResultsStep: React.FC<ResultsStepProps> = ({
    game, generatedTeams, isAdmin, isPast, score1, score2,
    isExporting, allPlayerIds,
    scoringControlsElement, attendanceSectionElement,
    onScore1Change, onScore2Change, onSaveScore,
    onShare, onExport, onBack, onGoToTeams,
}) => {
    const hasTeams = generatedTeams && generatedTeams.length === 2;

    return (
    <div className="max-w-4xl mx-auto space-y-4">
        {hasTeams ? (
            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-5">
                {isAdmin && (
                    <div className="flex justify-end gap-2 mb-3">
                        <Button onClick={() => onShare(1)} disabled={isExporting} className="bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg px-3 py-1.5 text-xs flex items-center gap-1.5">
                            <Share2 className="w-3.5 h-3.5" /> Share
                        </Button>
                        <Button onClick={() => onExport(1)} disabled={isExporting} className="bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg px-3 py-1.5 text-xs flex items-center gap-1.5">
                            <Download className="w-3.5 h-3.5" /> Save
                        </Button>
                    </div>
                )}

                {(isPast || game.status === 'in_progress') && isAdmin && (
                    <div>
                        <h3 className="text-white font-bold text-center mb-3 flex items-center justify-center gap-2">
                            <Trophy className="w-4 h-4" /> Record Score
                        </h3>
                        <div className="flex items-center justify-center gap-3">
                            <div className="text-center">
                                <div className="text-sm text-green-300 mb-1">{generatedTeams![0]?.name}</div>
                                <input
                                    type="number"
                                    value={score1}
                                    onChange={e => onScore1Change(e.target.value)}
                                    className="w-16 text-center text-2xl font-bold border border-white/10 rounded-lg p-2 bg-white/5 text-white"
                                    min="0"
                                />
                            </div>
                            <span className="text-white text-2xl font-bold">-</span>
                            <div className="text-center">
                                <div className="text-sm text-green-300 mb-1">{generatedTeams![1]?.name}</div>
                                <input
                                    type="number"
                                    value={score2}
                                    onChange={e => onScore2Change(e.target.value)}
                                    className="w-16 text-center text-2xl font-bold border border-white/10 rounded-lg p-2 bg-white/5 text-white"
                                    min="0"
                                />
                            </div>
                        </div>
                        <Button
                            onClick={onSaveScore}
                            disabled={score1 === '' || score2 === ''}
                            className="mt-3 w-full bg-green-600 hover:bg-green-500 text-white rounded-lg"
                        >
                            Save Final Score
                        </Button>
                    </div>
                )}
                {(isPast || game.status === 'in_progress') && isAdmin && allPlayerIds.length > 0 && scoringControlsElement}
                {(isPast || game.status === 'in_progress') && isAdmin && attendanceSectionElement}
            </div>
        ) : (
            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-8 text-center">
                <p className="text-green-300 mb-3">No teams committed yet.</p>
                <Button
                    onClick={onGoToTeams}
                    className="bg-green-600 hover:bg-green-500 text-white rounded-lg"
                >
                    Go to Generate Teams
                </Button>
            </div>
        )}

        <Button
            onClick={onBack}
            variant="ghost"
            className="text-white/60 hover:text-white flex items-center gap-1 text-sm"
        >
            <ChevronLeft className="w-4 h-4" /> Back to Live Match
        </Button>
    </div>
    );
};

export default ResultsStep;
