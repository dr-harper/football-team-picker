import React from 'react';
import { Shuffle, Check, Share2, Download, ChevronLeft } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { TeamSetup } from '../../types';
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
}

const TeamsStep: React.FC<TeamsStepProps> = ({
    totalAvailable, playersText, showTextarea, genError,
    pendingSetups, isExporting, isAdmin, selectedPlayer,
    onPlayersTextChange, onToggleTextarea, onGenerateFromAvailable,
    onGenerateFromText, onPickSetup, onDeleteSetup, onColorChange,
    onPlayerClick, onShare, onExport, onBack,
}) => (
    <div className="max-w-4xl mx-auto space-y-4">
        <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-5">
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <Shuffle className="w-5 h-5" /> Generate Teams
            </h2>
            {totalAvailable >= 4 && (
                <Button
                    onClick={() => onGenerateFromAvailable(3)}
                    className="w-full bg-green-600 hover:bg-green-500 text-white rounded-lg flex items-center justify-center gap-2 py-3 mb-3"
                >
                    <Shuffle className="w-4 h-4" /> Generate 3 options from available ({totalAvailable})
                </Button>
            )}
            <button
                onClick={onToggleTextarea}
                className="text-xs text-green-300/70 hover:text-green-300 transition-colors flex items-center gap-1 mb-2"
            >
                {showTextarea ? '\u25B2' : '\u25BC'} Enter players manually
            </button>
            {showTextarea && (
                <div>
                    <textarea
                        value={playersText}
                        onChange={e => onPlayersTextChange(e.target.value)}
                        className="w-full h-32 border border-white/10 rounded-lg p-3 bg-white/5 text-white placeholder-white/30 focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                        placeholder={"Player 1\nPlayer 2 #g\nPlayer 3 #d\n..."}
                    />
                    <div className="flex gap-2 mt-2">
                        <Button
                            onClick={() => onGenerateFromText(1)}
                            className="flex-1 bg-green-600 hover:bg-green-500 text-white rounded-lg flex items-center justify-center gap-2"
                        >
                            <Shuffle className="w-4 h-4" /> Create Teams
                        </Button>
                        <Button
                            onClick={() => onGenerateFromText(3)}
                            className="bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg px-4"
                        >
                            x3
                        </Button>
                    </div>
                </div>
            )}
            {genError && (
                <div className="text-red-400 text-sm bg-red-500/10 p-3 rounded-lg mt-3">
                    {genError}
                </div>
            )}
        </div>

        {pendingSetups.length === 0 && <PlaceholderPitch />}

        {pendingSetups.length > 0 && (
            <>
                <div className="flex items-center justify-between">
                    <p className="text-green-300 text-sm">
                        {pendingSetups.length} draft{pendingSetups.length !== 1 ? 's' : ''} — pick the setup you want
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
                    <div key={setup.id} className="flex flex-col">
                        <TeamSetupCard
                            setup={setup}
                            setupIndex={idx}
                            totalSetups={pendingSetups.length}
                            selectedPlayer={selectedPlayer}
                            onPlayerClick={onPlayerClick}
                            onDelete={() => onDeleteSetup(setup.id)}
                            onColorChange={onColorChange}
                            aiEnabled={false}
                            onGenerateSummary={() => {}}
                        />
                        <Button
                            onClick={() => onPickSetup(setup)}
                            className="mt-2 bg-green-600 hover:bg-green-500 text-white rounded-lg flex items-center justify-center gap-2"
                        >
                            <Check className="w-4 h-4" /> Use these teams
                        </Button>
                    </div>
                ))}
            </>
        )}

        <Button
            onClick={onBack}
            variant="ghost"
            className="text-white/60 hover:text-white flex items-center gap-1 text-sm"
        >
            <ChevronLeft className="w-4 h-4" /> Back to Availability
        </Button>
    </div>
);

export default TeamsStep;
