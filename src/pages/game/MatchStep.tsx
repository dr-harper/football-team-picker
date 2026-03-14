import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeftRight, ChevronLeft, ChevronRight, Watch, Clock, Smartphone, Pause, Play, Square } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Button } from '../../components/ui/button';
import { Game, Team, GoalScorer } from '../../types';
import PitchRenderer from '../../components/PitchRenderer';
import PlayerName from '../../components/PlayerName';

function formatElapsed(ms: number): string {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
}

function formatGoalTime(seconds: number): string {
    return `${Math.floor(seconds / 60)}'`;
}

interface MatchStepProps {
    game: Game;
    generatedTeams: Team[] | null;
    isAdmin: boolean;
    selectedPlayer: { setupIndex: number; teamIndex: number; playerIndex: number } | null;
    goalScorers: GoalScorer[];
    computedScores?: { team1: number; team2: number } | null;
    scoringControlsElement?: React.ReactNode;
    onPlayerClick: (setupIndex: number, teamIndex: number, playerIndex: number) => void;
    onBack: () => void;
    onNext: () => void;
    onGoToTeams: () => void;
    onSendToWatch?: () => Promise<void>;
    onStartMatch?: () => void;
    onPauseMatch?: () => void;
    onResumeMatch?: () => void;
    onEndMatch?: () => void;
    onUndoEnd?: () => void;
    onOpenOnWatch?: () => void;
    lookup?: Record<string, string>;
}

const MatchStep: React.FC<MatchStepProps> = ({
    game, generatedTeams, isAdmin,
    selectedPlayer, goalScorers, computedScores, scoringControlsElement,
    onPlayerClick, onBack, onNext, onGoToTeams,
    onSendToWatch, onStartMatch, onPauseMatch, onResumeMatch, onEndMatch, onUndoEnd, onOpenOnWatch, lookup,
}) => {
    const [watchSent, setWatchSent] = useState(false);
    const [elapsedMs, setElapsedMs] = useState(0);
    const [confirmEnd, setConfirmEnd] = useState(false);
    const [showStickyPill, setShowStickyPill] = useState(false);
    const scoreBannerRef = useRef<HTMLDivElement>(null);
    const isNativeAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
    const matchStarted = !!game.matchStartedAt;
    const matchPaused = !!game.matchPausedAt;
    const matchEnded = !!game.matchEndedAt;

    // Live timer (accounts for paused time)
    useEffect(() => {
        if (!game.matchStartedAt) return;
        const totalPaused = game.totalPausedMs ?? 0;
        if (game.matchPausedAt) {
            // Paused: show frozen time
            const pausedElapsed = game.matchPausedAt - game.matchStartedAt - totalPaused;
            setElapsedMs(pausedElapsed);
            return;
        }
        if (game.matchEndedAt) {
            // Ended: show final time
            const endedElapsed = game.matchEndedAt - game.matchStartedAt - totalPaused;
            setElapsedMs(endedElapsed);
            return;
        }
        const update = () => setElapsedMs(Date.now() - game.matchStartedAt! - totalPaused);
        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [game.matchStartedAt, game.matchPausedAt, game.matchEndedAt, game.totalPausedMs]);

    // Show sticky pill when score banner scrolls out of view
    useEffect(() => {
        if (!matchStarted || !scoreBannerRef.current) return;
        const observer = new IntersectionObserver(
            ([entry]) => setShowStickyPill(!entry.isIntersecting),
            { threshold: 0 },
        );
        observer.observe(scoreBannerRef.current);
        return () => observer.disconnect();
    }, [matchStarted]);

    const handleWatchSend = async () => {
        if (onSendToWatch) {
            await onSendToWatch();
            setWatchSent(true);
        }
    };

    // Collect goal events with times for the timeline
    const goalEvents = goalScorers.flatMap(gs =>
        (gs.goalTimes ?? []).map(timeSec => ({
            playerId: gs.playerId,
            timeSec,
        }))
    ).sort((a, b) => a.timeSec - b.timeSec);

    const hasTeams = generatedTeams && generatedTeams.length === 2;
    const scores = computedScores ?? { team1: 0, team2: 0 };

    return (
    <div className="max-w-4xl mx-auto space-y-4">
        {/* Sticky score pill */}
        {matchStarted && hasTeams && showStickyPill && (
            <div className="fixed top-0 left-0 right-0 z-40 flex justify-center pointer-events-none">
                <div className="mt-2 bg-black/80 backdrop-blur-md border border-white/10 rounded-full px-4 py-1.5 flex items-center gap-3 shadow-lg pointer-events-auto">
                    <span className="text-xs font-bold" style={{ color: generatedTeams![0].color }}>{scores.team1}</span>
                    <span className="text-white/30 text-xs">–</span>
                    <span className="text-xs font-bold" style={{ color: generatedTeams![1].color }}>{scores.team2}</span>
                    <span className="text-white/40 text-[10px] font-mono">{formatElapsed(elapsedMs)}</span>
                    {matchEnded ? (
                        <span className="bg-red-500/30 text-red-400 text-[9px] font-bold px-1.5 py-0.5 rounded">END</span>
                    ) : matchPaused ? (
                        <span className="bg-yellow-500/30 text-yellow-400 text-[9px] font-bold px-1.5 py-0.5 rounded">PAUSED</span>
                    ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    )}
                </div>
            </div>
        )}

        {/* Live scoring banner */}
        {isAdmin && hasTeams && (
            <div ref={scoreBannerRef} className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-4 space-y-3">
                <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                    <Clock className="w-4 h-4 text-green-400" /> Live Scoring
                </h3>

                {matchStarted ? (
                    <>
                        {/* Score + timer */}
                        <div className="flex flex-col items-center gap-1 py-2">
                            <div className="flex items-center gap-4">
                                <div className="text-center">
                                    <div className="text-[10px] uppercase tracking-wider truncate" style={{ color: generatedTeams![0].color }}>{generatedTeams![0].name}</div>
                                    <div className="text-white font-bold text-3xl">{scores.team1}</div>
                                </div>
                                <div className="text-white/30 text-lg font-light">–</div>
                                <div className="text-center">
                                    <div className="text-[10px] uppercase tracking-wider truncate" style={{ color: generatedTeams![1].color }}>{generatedTeams![1].name}</div>
                                    <div className="text-white font-bold text-3xl">{scores.team2}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-white/60 font-mono text-sm">{formatElapsed(elapsedMs)}</span>
                                {matchEnded ? (
                                    <span className="bg-red-500/20 text-red-400 text-xs font-bold px-2 py-0.5 rounded">ENDED</span>
                                ) : matchPaused ? (
                                    <span className="bg-yellow-500/20 text-yellow-400 text-xs font-bold px-2 py-0.5 rounded">PAUSED</span>
                                ) : (
                                    <span className="bg-green-500/20 text-green-400 text-xs font-bold px-2 py-0.5 rounded">LIVE</span>
                                )}
                            </div>
                        </div>

                        {/* Reopen match after ending */}
                        {matchEnded && (
                            <div className="flex items-center justify-center">
                                <button
                                    onClick={onUndoEnd}
                                    className="flex items-center gap-1.5 bg-amber-600/20 border border-amber-500/30 hover:bg-amber-600/30 rounded-lg px-3 py-1.5 text-xs font-semibold text-amber-300 transition-all"
                                >
                                    <Play className="w-3.5 h-3.5" /> Reopen Match
                                </button>
                            </div>
                        )}

                        {/* Match controls: pause/resume + end */}
                        {!matchEnded && (
                            <div className="flex items-center justify-center gap-2">
                                {matchPaused ? (
                                    <button
                                        onClick={onResumeMatch}
                                        className="flex items-center gap-1.5 bg-green-600/20 border border-green-500/30 hover:bg-green-600/30 rounded-lg px-3 py-1.5 text-xs font-semibold text-green-300 transition-all"
                                    >
                                        <Play className="w-3.5 h-3.5" /> Resume
                                    </button>
                                ) : (
                                    <button
                                        onClick={onPauseMatch}
                                        className="flex items-center gap-1.5 bg-yellow-600/20 border border-yellow-500/30 hover:bg-yellow-600/30 rounded-lg px-3 py-1.5 text-xs font-semibold text-yellow-300 transition-all"
                                    >
                                        <Pause className="w-3.5 h-3.5" /> Pause
                                    </button>
                                )}
                                <button
                                    onClick={() => setConfirmEnd(true)}
                                    className="flex items-center gap-1.5 bg-red-600/20 border border-red-500/30 hover:bg-red-600/30 rounded-lg px-3 py-1.5 text-xs font-semibold text-red-300 transition-all"
                                >
                                    <Square className="w-3.5 h-3.5" /> End Match
                                </button>
                            </div>
                        )}

                        {goalEvents.length > 0 && (
                            <div className="border-t border-white/10 pt-3">
                                <div className="space-y-1">
                                    {goalEvents.map((evt, i) => (
                                        <div key={i} className="flex items-center gap-2 text-sm">
                                            <span className="text-green-400 font-mono text-xs w-8 text-right">{formatGoalTime(evt.timeSec)}</span>
                                            <span className="text-white/30 text-xs">&#9917;</span>
                                            <PlayerName id={evt.playerId} lookup={lookup ?? {}} className="text-white text-sm" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {isNativeAndroid && (
                            <button
                                onClick={onOpenOnWatch}
                                className="flex items-center justify-center gap-2 w-full pt-2 border-t border-white/10 hover:opacity-80 transition-opacity"
                            >
                                <Watch className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                                <span className="text-blue-300/70 text-xs">{matchStarted ? 'Re-sync to watch' : 'Open on watch'}</span>
                            </button>
                        )}
                    </>
                ) : (
                    <>
                        <p className="text-white/50 text-xs">
                            Track goal times by starting the match clock. Use your watch to score while playing, or use this phone if someone on the sideline is keeping score.
                        </p>
                        <div className="flex gap-2">
                            {isNativeAndroid && (
                                <button
                                    onClick={handleWatchSend}
                                    className={`flex-1 flex items-center gap-2.5 rounded-lg py-2.5 px-3 transition-all ${
                                        watchSent
                                            ? 'bg-green-900/40 border border-green-500/30'
                                            : 'bg-blue-600/20 border border-blue-400/30 hover:bg-blue-600/30'
                                    }`}
                                >
                                    <Watch className={`w-5 h-5 flex-shrink-0 ${watchSent ? 'text-green-400' : 'text-blue-400'}`} />
                                    <div className="text-left">
                                        <div className={`text-xs font-semibold ${watchSent ? 'text-green-300' : 'text-white'}`}>
                                            {watchSent ? 'Sent to watch' : 'Send to watch'}
                                        </div>
                                        <div className="text-[10px] text-white/40">
                                            {watchSent ? 'Tap Start Match on your watch' : 'Score while you play'}
                                        </div>
                                    </div>
                                </button>
                            )}
                            <button
                                onClick={onStartMatch}
                                className="flex-1 flex items-center gap-2.5 rounded-lg py-2.5 px-3 bg-green-600/20 border border-green-500/30 hover:bg-green-600/30 transition-all"
                            >
                                <Smartphone className="w-5 h-5 flex-shrink-0 text-green-400" />
                                <div className="text-left">
                                    <div className="text-xs font-semibold text-white">Score from phone</div>
                                    <div className="text-[10px] text-white/40">For a non-player on the sideline</div>
                                </div>
                            </button>
                        </div>
                    </>
                )}
            </div>
        )}

        {/* Read-only live view for non-admins */}
        {!isAdmin && hasTeams && matchStarted && (
            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-4 space-y-3">
                <div className="flex flex-col items-center gap-1 py-2">
                    <div className="flex items-center gap-4">
                        <div className="text-center">
                            <div className="text-[10px] uppercase tracking-wider truncate" style={{ color: generatedTeams![0].color }}>{generatedTeams![0].name}</div>
                            <div className="text-white font-bold text-3xl">{scores.team1}</div>
                        </div>
                        <div className="text-white/30 text-lg font-light">–</div>
                        <div className="text-center">
                            <div className="text-[10px] uppercase tracking-wider truncate" style={{ color: generatedTeams![1].color }}>{generatedTeams![1].name}</div>
                            <div className="text-white font-bold text-3xl">{scores.team2}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-white/60 font-mono text-sm">{formatElapsed(elapsedMs)}</span>
                        {matchEnded ? (
                            <span className="bg-red-500/20 text-red-400 text-xs font-bold px-2 py-0.5 rounded">ENDED</span>
                        ) : matchPaused ? (
                            <span className="bg-yellow-500/20 text-yellow-400 text-xs font-bold px-2 py-0.5 rounded">PAUSED</span>
                        ) : (
                            <span className="bg-green-500/20 text-green-400 text-xs font-bold px-2 py-0.5 rounded">LIVE</span>
                        )}
                    </div>
                </div>
                {goalEvents.length > 0 && (
                    <div className="border-t border-white/10 pt-3">
                        <div className="space-y-1">
                            {goalEvents.map((evt, i) => (
                                <div key={i} className="flex items-center gap-2 text-sm">
                                    <span className="text-green-400 font-mono text-xs w-8 text-right">{formatGoalTime(evt.timeSec)}</span>
                                    <span className="text-white/30 text-xs">&#9917;</span>
                                    <PlayerName id={evt.playerId} lookup={lookup ?? {}} className="text-white text-sm" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        )}

        {hasTeams ? (
            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-5">
                <div id="team-setup-0">
                    <div className="flex justify-around mb-2">
                        <h3 className="font-bold text-lg" style={{ color: generatedTeams![0].color }}>
                            {generatedTeams![0].name}
                        </h3>
                        <h3 className="font-bold text-lg" style={{ color: generatedTeams![1].color }}>
                            {generatedTeams![1].name}
                        </h3>
                    </div>
                    <p className="text-center text-green-300/70 text-xs mb-3 flex items-center justify-center gap-1.5">
                        <ArrowLeftRight className="w-3 h-3" />
                        Click any two players to swap their positions
                    </p>
                    <PitchRenderer
                        teams={generatedTeams!}
                        setupIndex={0}
                        selectedPlayer={selectedPlayer}
                        onPlayerClick={(_, tIdx, pIdx) => onPlayerClick(0, tIdx, pIdx)}
                        lookup={lookup}
                    />
                </div>
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

        {isAdmin && matchStarted && scoringControlsElement}

        <div className="flex items-center justify-between">
            <Button
                onClick={onBack}
                variant="ghost"
                className="text-white/60 hover:text-white flex items-center gap-1 text-sm"
            >
                <ChevronLeft className="w-4 h-4" /> Back to Teams
            </Button>
            <Button
                onClick={onNext}
                variant="ghost"
                className="text-white/60 hover:text-white flex items-center gap-1 text-sm"
            >
                {matchStarted ? 'Results' : 'Skip to Results'} <ChevronRight className="w-4 h-4" />
            </Button>
        </div>

        {/* Full-screen end match confirmation modal */}
        {confirmEnd && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center" onClick={() => setConfirmEnd(false)}>
                <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 mx-4 max-w-sm w-full text-center space-y-4" onClick={e => e.stopPropagation()}>
                    <div className="text-white font-mono text-2xl font-bold">{formatElapsed(elapsedMs)}</div>
                    <h3 className="text-white font-semibold text-lg">End this match?</h3>
                    <p className="text-white/50 text-sm">This will stop the clock and move to results.</p>
                    <div className="flex gap-3 justify-center pt-2">
                        <button
                            onClick={() => { setConfirmEnd(false); onEndMatch?.(); }}
                            className="bg-red-600 hover:bg-red-500 text-white rounded-lg px-6 py-2.5 text-sm font-semibold transition-all"
                        >
                            End Match
                        </button>
                        <button
                            onClick={() => setConfirmEnd(false)}
                            className="bg-white/10 hover:bg-white/20 text-white rounded-lg px-6 py-2.5 text-sm transition-all"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
    );
};

export default MatchStep;
