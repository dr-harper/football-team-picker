import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeftRight, Watch, Clock, Smartphone, Pause, Play, Square, Mic, Check, Loader2, Goal, Trash2, ChevronDown, LayoutGrid, RotateCcw, SkipForward } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Button } from '../../components/ui/button';
import { Game, Team, GoalScorer, MatchEvent, MatchEventType } from '../../types';
import PitchRenderer from '../../components/PitchRenderer';
import PlayerName from '../../components/PlayerName';
import InlineEventForm from './InlineEventForm';

function formatElapsed(ms: number): string {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
}

const EVENT_TAG_CONFIG: Record<MatchEventType, { emoji: string; label: string; colour: string }> = {
    goal: { emoji: '⚽', label: 'Goal', colour: 'bg-green-500/30 text-green-300' },
    'own-goal': { emoji: '🙈', label: 'Own Goal', colour: 'bg-red-500/20 text-red-300' },
    'penalty-scored': { emoji: '🎯', label: 'Pen Scored', colour: 'bg-green-500/20 text-green-200' },
    'penalty-missed': { emoji: '❌', label: 'Pen Missed', colour: 'bg-red-500/20 text-red-200' },
    'penalty-conceded': { emoji: '🫣', label: 'Pen Conceded', colour: 'bg-orange-500/20 text-orange-200' },
    save: { emoji: '🧤', label: 'Save', colour: 'bg-yellow-500/30 text-yellow-300' },
    tackle: { emoji: '🛡️', label: 'Tackle', colour: 'bg-orange-500/30 text-orange-300' },
    card: { emoji: '🟨', label: 'Card', colour: 'bg-red-500/30 text-red-300' },
    swap: { emoji: '🔄', label: 'Swap', colour: 'bg-purple-500/30 text-purple-300' },
    highlight: { emoji: '✨', label: 'Highlight', colour: 'bg-amber-500/30 text-amber-300' },
    note: { emoji: '💬', label: 'Note', colour: 'bg-white/10 text-white/50' },
};

const ALL_EVENT_TYPES: MatchEventType[] = ['goal', 'own-goal', 'penalty-scored', 'penalty-missed', 'penalty-conceded', 'save', 'tackle', 'card', 'swap', 'highlight', 'note'];

function formatGoalTime(seconds: number): string {
    return `${Math.floor(seconds / 60)}'`;
}

interface MatchStepProps {
    game: Game;
    generatedTeams: Team[] | null;
    isAdmin: boolean;
    selectedPlayer: { setupIndex: number; teamIndex: number; playerIndex: number } | null;
    goalScorers: GoalScorer[];
    matchEvents?: MatchEvent[];
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
    onRestartTimer?: () => void;
    onOpenOnWatch?: () => void;
    onGoalChange?: (playerId: string, delta: number) => void;
    onApplyVoiceEvent?: (event: MatchEvent) => void;
    onUpdateMatchEvent?: (eventId: string, updates: Partial<MatchEvent>) => void;
    onDeleteMatchEvent?: (eventId: string) => void;
    onAddMatchEvent?: (event: MatchEvent) => void;
    lookup?: Record<string, string>;
}

const MatchStep: React.FC<MatchStepProps> = ({
    game, generatedTeams, isAdmin,
    selectedPlayer, goalScorers, matchEvents, computedScores, scoringControlsElement,
    onPlayerClick, onNext, onGoToTeams,
    onSendToWatch, onStartMatch, onPauseMatch, onResumeMatch, onEndMatch, onUndoEnd, onRestartTimer, onOpenOnWatch,
    onGoalChange, onUpdateMatchEvent, onDeleteMatchEvent, onAddMatchEvent, lookup,
}) => {
    const [watchSent, setWatchSent] = useState(false);
    const [elapsedMs, setElapsedMs] = useState(0);
    const [confirmEnd, setConfirmEnd] = useState(false);
    const [confirmRestart, setConfirmRestart] = useState(false);
    const [showStickyPill, setShowStickyPill] = useState(false);
    const scoreBannerRef = useRef<HTMLDivElement>(null);
    // Watch support: Android now, iOS when WatchConnectivity plugin is added
    const hasWatchSupport = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
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

    const hasTeams = generatedTeams && generatedTeams.length === 2;

    // All players for the editable picker
    const allRosterPlayers = hasTeams
        ? generatedTeams!.flatMap(t => t.players.map(p => ({ id: p.playerId ?? p.name, name: p.name })))
        : [];

    // Track which field is being edited: "eventId:field"
    const [editingPlayer, setEditingPlayer] = useState<string | null>(null);
    const [editingTag, setEditingTag] = useState<string | null>(null);
    const [addEventType, setAddEventType] = useState<MatchEventType | null>(null);
    const [viewMode, setViewMode] = useState<'pitch' | 'table'>('table');

    // Treat stale processing events as parsed in the UI (don't write to Firestore)
    const resolvedMatchEvents = (matchEvents ?? []).map(e =>
        e.status === 'processing' && Date.now() - e.createdAt > 10_000
            ? { ...e, status: 'parsed' as const }
            : e
    );

    // Build team lookup for two-column display
    const team0Ids = hasTeams ? new Set(generatedTeams![0].players.map(p => p.playerId ?? p.name)) : new Set<string>();

    // Collect goal events with times for the timeline
    const goalEvents = goalScorers.flatMap(gs =>
        (gs.goalTimes ?? []).map(timeSec => ({
            playerId: gs.playerId,
            timeSec,
            type: 'goal' as const,
            transcript: undefined as string | undefined,
            teamIndex: team0Ids.has(gs.playerId) ? 0 : 1,
        }))
    );

    // Merge voice note events into the timeline
    const voiceNoteEvents = resolvedMatchEvents
        .filter(e => e.type === 'note' && e.elapsedSec !== undefined)
        .map(e => ({
            playerId: e.playerId ?? '',
            timeSec: e.elapsedSec!,
            type: 'note' as const,
            transcript: e.transcript,
            teamIndex: -1,
        }));

    const timelineEvents = [...goalEvents, ...voiceNoteEvents].sort((a, b) => a.timeSec - b.timeSec);

    const scores = computedScores ?? { team1: 0, team2: 0 };

    return (
    <div className="max-w-4xl md:max-w-none mx-auto space-y-4">
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

        {/* Pitch — show before live scoring when match not started */}
        {hasTeams && !matchStarted && (
            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                <PitchRenderer
                    teams={generatedTeams!}
                    setupIndex={0}
                    selectedPlayer={selectedPlayer}
                    onPlayerClick={(_, tIdx, pIdx) => onPlayerClick(0, tIdx, pIdx)}
                    lookup={lookup}
                />
                <p className="text-center text-green-300/50 text-[10px] mt-2 flex items-center justify-center gap-1">
                    <ArrowLeftRight className="w-3 h-3" />
                    Tap any two players to swap positions
                </p>
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
                                    onClick={() => setConfirmRestart(true)}
                                    className="flex items-center gap-1.5 bg-white/5 border border-white/10 hover:bg-white/10 rounded-lg px-3 py-1.5 text-xs font-semibold text-white/40 transition-all"
                                >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={() => setConfirmEnd(true)}
                                    className="flex items-center gap-1.5 bg-red-600/20 border border-red-500/30 hover:bg-red-600/30 rounded-lg px-3 py-1.5 text-xs font-semibold text-red-300 transition-all"
                                >
                                    <Square className="w-3.5 h-3.5" /> End Match
                                </button>
                            </div>
                        )}

                        {hasWatchSupport && (
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
                    <div className="space-y-3">
                        {/* Watch card — premium, most prominent */}
                        {hasWatchSupport ? (
                            <div className={`rounded-xl p-4 transition-all ${
                                watchSent
                                    ? 'bg-green-900/30 border border-green-500/30'
                                    : 'bg-blue-500/10 border border-blue-400/20 hover:bg-blue-500/15'
                            }`}>
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
                                        <Watch className={`w-5 h-5 ${watchSent ? 'text-green-400' : 'text-blue-400'}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-white font-semibold text-sm">Score from your Watch</h4>
                                        <p className="text-white/40 text-xs mt-0.5 leading-relaxed">
                                            Tap goals from your wrist while you play. Voice dictation auto-tags events with AI.
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleWatchSend}
                                    className={`w-full mt-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                                        watchSent
                                            ? 'bg-green-600/30 text-green-300'
                                            : 'bg-blue-600 hover:bg-blue-500 text-white'
                                    }`}
                                >
                                    {watchSent ? '✓ Sent — tap Start Match on your watch' : 'Send to Watch'}
                                </button>
                            </div>
                        ) : (
                            <div className="rounded-xl p-4 bg-blue-500/5 border border-blue-400/10">
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                                        <Watch className="w-5 h-5 text-blue-400/40" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-white/50 font-semibold text-sm">Score from your Watch</h4>
                                        <p className="text-white/25 text-xs mt-0.5 leading-relaxed">
                                            Tap goals from your wrist while you play. Voice dictation auto-tags events with AI.
                                        </p>
                                        <p className="text-blue-300/40 text-[10px] mt-1.5">Available on Apple Watch &amp; Wear OS</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Phone card */}
                        <div className="rounded-xl p-4 bg-green-500/10 border border-green-500/20 hover:bg-green-500/15 transition-all">
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center shrink-0">
                                    <Smartphone className="w-5 h-5 text-green-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-white font-semibold text-sm">Score from Phone</h4>
                                    <p className="text-white/40 text-xs mt-0.5 leading-relaxed">
                                        Track goals, events, and timestamps live. Get an AI match report when the game ends.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onStartMatch}
                                className="w-full mt-3 py-2 rounded-lg text-sm font-semibold bg-green-600 hover:bg-green-500 text-white transition-all"
                            >
                                Start Match
                            </button>
                        </div>

                        {/* Skip card */}
                        <div className="rounded-xl p-4 bg-white/5 border border-white/10 hover:bg-white/8 transition-all">
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                                    <SkipForward className="w-5 h-5 text-white/40" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-white/70 font-semibold text-sm">Skip to Results</h4>
                                    <p className="text-white/30 text-xs mt-0.5 leading-relaxed">
                                        Record the final score after the game. No live tracking or event tagging.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onNext}
                                className="w-full mt-3 py-2 rounded-lg text-sm font-medium bg-white/10 hover:bg-white/15 text-white/60 hover:text-white/80 transition-all"
                            >
                                Go to Results
                            </button>
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* Scoring section — separate card so sticky pill triggers earlier */}
        {isAdmin && hasTeams && matchStarted && (
            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                            <span className="text-white/40 text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                                <Goal className="w-3 h-3" /> Goal Scorers
                            </span>
                            <div className="flex items-center gap-0.5 bg-white/5 rounded-full p-0.5">
                                <button
                                    onClick={() => setViewMode('pitch')}
                                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
                                        viewMode === 'pitch' ? 'bg-green-500/30 text-green-300' : 'text-white/30 hover:text-white/50'
                                    }`}
                                >
                                    Pitch
                                </button>
                                <button
                                    onClick={() => setViewMode('table')}
                                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium transition-colors flex items-center gap-1 ${
                                        viewMode === 'table' ? 'bg-green-500/30 text-green-300' : 'text-white/30 hover:text-white/50'
                                    }`}
                                >
                                    <LayoutGrid className="w-2.5 h-2.5" /> Table
                                </button>
                            </div>
                        </div>
                        {viewMode === 'pitch' ? (
                            <PitchRenderer
                                teams={generatedTeams!}
                                setupIndex={0}
                                selectedPlayer={selectedPlayer}
                                onPlayerClick={(_, tIdx, pIdx) => onPlayerClick(0, tIdx, pIdx)}
                                lookup={lookup}
                                goalScorers={goalScorers}
                                onGoalChange={isAdmin ? onGoalChange : undefined}
                                scoringDisabled={matchPaused}
                            />
                        ) : (
                            <div>{scoringControlsElement}</div>
                        )}

                        {/* Match events — inline tag & add */}
                        {!matchEnded && (
                            <div className="space-y-3 border-t border-white/10 pt-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-white/40 text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                                        <Mic className="w-3 h-3" /> Match Events
                                    </span>
                                    <span className="text-white/20 text-[9px] italic">Use companion watch app for voice-to-event tagging</span>
                                </div>
                                {/* Tag buttons */}
                                <div className="grid grid-cols-3 gap-1.5">
                                    {ALL_EVENT_TYPES.map(tag => (
                                        <button
                                            key={tag}
                                            onClick={() => setAddEventType(addEventType === tag ? null : tag)}
                                            className={`px-3 py-2.5 rounded-lg text-xs font-semibold transition-all border text-center ${
                                                addEventType === tag
                                                    ? EVENT_TAG_CONFIG[tag].colour + ' ring-1 ring-white/30'
                                                    : EVENT_TAG_CONFIG[tag].colour + ' opacity-60 hover:opacity-100'
                                            }`}
                                        >
                                            {EVENT_TAG_CONFIG[tag].emoji} {EVENT_TAG_CONFIG[tag].label}
                                        </button>
                                    ))}
                                </div>
                                {/* Inline event form — expands when a tag is selected */}
                                {addEventType && hasTeams && onAddMatchEvent && (
                                    <InlineEventForm
                                        eventType={addEventType}
                                        players={generatedTeams!.flatMap(t =>
                                            t.players.map(p => ({
                                                id: p.playerId ?? p.name,
                                                name: p.name,
                                                teamColour: t.color,
                                            }))
                                        )}
                                        lookup={lookup ?? {}}
                                        elapsedSec={game.matchStartedAt
                                            ? Math.floor((Date.now() - game.matchStartedAt - (game.totalPausedMs ?? 0)) / 1000)
                                            : undefined}
                                        onAdd={evt => { onAddMatchEvent(evt); setAddEventType(null); }}
                                        onCancel={() => setAddEventType(null)}
                                    />
                                )}
                            </div>
                        )}

                {timelineEvents.length > 0 && (
                    <div className="border-t border-white/10 pt-3">
                        <div className="relative">
                            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/10" />
                            <div className="space-y-1.5">
                                {timelineEvents.map((evt, i) => {
                                    if (evt.type === 'note') {
                                        return (
                                            <div key={i} className="flex items-center justify-center gap-1.5 text-xs">
                                                <Mic className="w-3 h-3 text-red-400/60 shrink-0" />
                                                <span className="text-white/40 font-mono text-[10px]">{formatGoalTime(evt.timeSec)}</span>
                                                <span className="text-white/40 italic truncate">{evt.transcript}</span>
                                            </div>
                                        );
                                    }
                                    const isTeam1 = evt.teamIndex === 0;
                                    return (
                                        <div key={i} className={`flex items-center gap-1.5 ${isTeam1 ? 'flex-row' : 'flex-row-reverse'}`}>
                                            <div className={`flex-1 flex items-center gap-1.5 ${isTeam1 ? 'justify-end' : 'justify-end flex-row-reverse'}`}>
                                                <PlayerName id={evt.playerId} lookup={lookup ?? {}} className="text-white text-xs truncate" />
                                                <span className="text-white/30 text-xs shrink-0">&#9917;</span>
                                            </div>
                                            <div className="w-10 text-center shrink-0">
                                                <span className="text-white/50 font-mono text-[10px] bg-white/5 rounded px-1.5 py-0.5">
                                                    {formatGoalTime(evt.timeSec)}
                                                </span>
                                            </div>
                                            <div className="flex-1" />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                        {/* Voice notes */}
                        {resolvedMatchEvents.length > 0 && (
                            <div className="border-t border-white/10 pt-3">
                                <h4 className="text-white/40 text-[10px] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <Mic className="w-3 h-3" /> Game Notes
                                </h4>
                                <div className="space-y-2">
                                    {resolvedMatchEvents
                                        .sort((a, b) => (a.elapsedSec ?? 0) - (b.elapsedSec ?? 0))
                                        .map(evt => (
                                            <div key={evt.id} className={`rounded-lg px-3 py-2 text-xs ${
                                                evt.status === 'processing' ? 'bg-blue-500/10 border border-blue-500/20' :
                                                evt.status === 'applied' ? 'bg-green-500/10 border border-green-500/20' :
                                                'bg-white/5 border border-white/10'
                                            }`}>
                                                <div className="flex items-start gap-2">
                                                    <span className="text-white/40 font-mono text-[10px] shrink-0 pt-0.5">
                                                        {evt.elapsedSec !== undefined ? formatGoalTime(evt.elapsedSec) : '—'}
                                                    </span>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-white/60 italic">&ldquo;{evt.transcript}&rdquo;</p>
                                                        {evt.status === 'processing' ? (
                                                            <div className="flex items-center gap-1 mt-1 text-blue-300">
                                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                                <span>Processing...</span>
                                                            </div>
                                                        ) : (
                                                            <div className="mt-1.5 space-y-1.5">
                                                                {/* Primary event line */}
                                                                <div className="flex items-center gap-1.5">
                                                                    <div className="relative">
                                                                        <button
                                                                            onClick={() => setEditingTag(editingTag === evt.id ? null : evt.id)}
                                                                            className={`px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 flex items-center gap-0.5 ${EVENT_TAG_CONFIG[evt.type].colour}`}
                                                                        >
                                                                            {EVENT_TAG_CONFIG[evt.type].emoji} {EVENT_TAG_CONFIG[evt.type].label}
                                                                            <ChevronDown className="w-2.5 h-2.5 opacity-40" />
                                                                        </button>
                                                                        {editingTag === evt.id && (
                                                                            <div className="absolute top-full left-0 mt-1 z-50 bg-gray-900 border border-white/10 rounded-lg shadow-xl overflow-hidden w-32">
                                                                                {ALL_EVENT_TYPES.map(t => (
                                                                                    <button
                                                                                        key={t}
                                                                                        onClick={() => { onUpdateMatchEvent?.(evt.id, { type: t }); setEditingTag(null); }}
                                                                                        className={`w-full text-left px-3 py-1.5 text-xs hover:bg-white/10 transition-colors flex items-center gap-1.5 ${t === evt.type ? EVENT_TAG_CONFIG[t].colour : 'text-white/50'}`}
                                                                                    >
                                                                                        {EVENT_TAG_CONFIG[t].emoji} {EVENT_TAG_CONFIG[t].label}
                                                                                    </button>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div className="relative">
                                                                        <button
                                                                            onClick={() => setEditingPlayer(editingPlayer === `${evt.id}:player` ? null : `${evt.id}:player`)}
                                                                            className="flex items-center gap-0.5 hover:bg-white/10 rounded px-1 py-0.5 transition-colors"
                                                                        >
                                                                            {evt.playerId ? (
                                                                                <PlayerName id={evt.playerId} lookup={lookup ?? {}} className="text-white text-xs" />
                                                                            ) : (
                                                                                <span className="text-white/30 text-xs">No player</span>
                                                                            )}
                                                                            <ChevronDown className="w-2.5 h-2.5 text-white/20" />
                                                                        </button>
                                                                        {editingPlayer === `${evt.id}:player` && (
                                                                            <div className="absolute top-full left-0 mt-1 z-50 bg-gray-900 border border-white/10 rounded-lg shadow-xl max-h-40 overflow-y-auto w-36">
                                                                                {allRosterPlayers.map(p => (
                                                                                    <button
                                                                                        key={p.id}
                                                                                        onClick={() => { onUpdateMatchEvent?.(evt.id, { playerId: p.id }); setEditingPlayer(null); }}
                                                                                        className={`w-full text-left px-3 py-1.5 text-xs hover:bg-white/10 transition-colors ${p.id === evt.playerId ? 'text-green-300' : 'text-white/70'}`}
                                                                                    >
                                                                                        {p.name}
                                                                                    </button>
                                                                                ))}
                                                                                <button
                                                                                    onClick={() => { onUpdateMatchEvent?.(evt.id, { playerId: undefined }); setEditingPlayer(null); }}
                                                                                    className="w-full text-left px-3 py-1.5 text-xs text-white/30 hover:bg-white/10 transition-colors border-t border-white/5"
                                                                                >
                                                                                    Clear
                                                                                </button>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    {evt.description && (
                                                                        <span className="text-white/20 text-[10px]">— {evt.description}</span>
                                                                    )}
                                                                    {evt.status === 'applied' && !evt.assisterId && (
                                                                        <Check className="w-3 h-3 text-green-400/60" />
                                                                    )}
                                                                </div>
                                                                {/* Card colour indicator */}
                                                                {evt.type === 'card' && evt.cardColour && (
                                                                    <div className="flex items-center gap-1.5 ml-0.5">
                                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${
                                                                            evt.cardColour === 'red' ? 'bg-red-500/30 text-red-300' : 'bg-yellow-500/30 text-yellow-300'
                                                                        }`}>
                                                                            {evt.cardColour === 'red' ? '🟥' : '🟨'} {evt.cardColour}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                                {/* Swap partner line */}
                                                                {evt.type === 'swap' && evt.swappedWithId && (
                                                                    <div className="flex items-center gap-1.5 ml-0.5">
                                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-500/30 text-purple-300 shrink-0">
                                                                            🔄 with
                                                                        </span>
                                                                        <div className="relative">
                                                                            <button
                                                                                onClick={() => setEditingPlayer(editingPlayer === `${evt.id}:swap` ? null : `${evt.id}:swap`)}
                                                                                className="flex items-center gap-0.5 hover:bg-white/10 rounded px-1 py-0.5 transition-colors"
                                                                            >
                                                                                <PlayerName id={evt.swappedWithId} lookup={lookup ?? {}} className="text-purple-300 text-xs" />
                                                                                <ChevronDown className="w-2.5 h-2.5 text-purple-300/30" />
                                                                            </button>
                                                                            {editingPlayer === `${evt.id}:swap` && (
                                                                                <div className="absolute top-full left-0 mt-1 z-50 bg-gray-900 border border-white/10 rounded-lg shadow-xl max-h-40 overflow-y-auto w-36">
                                                                                    {allRosterPlayers.map(p => (
                                                                                        <button
                                                                                            key={p.id}
                                                                                            onClick={() => { onUpdateMatchEvent?.(evt.id, { swappedWithId: p.id }); setEditingPlayer(null); }}
                                                                                            className={`w-full text-left px-3 py-1.5 text-xs hover:bg-white/10 transition-colors ${p.id === evt.swappedWithId ? 'text-purple-300' : 'text-white/70'}`}
                                                                                        >
                                                                                            {p.name}
                                                                                        </button>
                                                                                    ))}
                                                                                    <button
                                                                                        onClick={() => { onUpdateMatchEvent?.(evt.id, { swappedWithId: undefined }); setEditingPlayer(null); }}
                                                                                        className="w-full text-left px-3 py-1.5 text-xs text-white/30 hover:bg-white/10 transition-colors border-t border-white/5"
                                                                                    >
                                                                                        Clear
                                                                                    </button>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {/* Assist line (only if present) */}
                                                                {evt.assisterId && (
                                                                    <div className="flex items-center gap-1.5 ml-0.5">
                                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/30 text-blue-300 shrink-0">
                                                                            🅰️ assist
                                                                        </span>
                                                                        <div className="relative">
                                                                            <button
                                                                                onClick={() => setEditingPlayer(editingPlayer === `${evt.id}:assist` ? null : `${evt.id}:assist`)}
                                                                                className="flex items-center gap-0.5 hover:bg-white/10 rounded px-1 py-0.5 transition-colors"
                                                                            >
                                                                                <PlayerName id={evt.assisterId} lookup={lookup ?? {}} className="text-blue-300 text-xs" />
                                                                                <ChevronDown className="w-2.5 h-2.5 text-blue-300/30" />
                                                                            </button>
                                                                            {editingPlayer === `${evt.id}:assist` && (
                                                                                <div className="absolute top-full left-0 mt-1 z-50 bg-gray-900 border border-white/10 rounded-lg shadow-xl max-h-40 overflow-y-auto w-36">
                                                                                    {allRosterPlayers.map(p => (
                                                                                        <button
                                                                                            key={p.id}
                                                                                            onClick={() => { onUpdateMatchEvent?.(evt.id, { assisterId: p.id }); setEditingPlayer(null); }}
                                                                                            className={`w-full text-left px-3 py-1.5 text-xs hover:bg-white/10 transition-colors ${p.id === evt.assisterId ? 'text-blue-300' : 'text-white/70'}`}
                                                                                        >
                                                                                            {p.name}
                                                                                        </button>
                                                                                    ))}
                                                                                    <button
                                                                                        onClick={() => { onUpdateMatchEvent?.(evt.id, { assisterId: undefined }); setEditingPlayer(null); }}
                                                                                        className="w-full text-left px-3 py-1.5 text-xs text-white/30 hover:bg-white/10 transition-colors border-t border-white/5"
                                                                                    >
                                                                                        Clear
                                                                                    </button>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        {evt.status === 'applied' && (
                                                                            <Check className="w-3 h-3 text-green-400/60" />
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                    {/* Delete button */}
                                                    <button
                                                        onClick={() => onDeleteMatchEvent?.(evt.id)}
                                                        className="shrink-0 text-white/20 hover:text-red-400 transition-colors p-0.5"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>
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
                {timelineEvents.length > 0 && (
                    <div className="border-t border-white/10 pt-3">
                        <div className="relative">
                            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/10" />
                            <div className="space-y-1.5">
                                {timelineEvents.map((evt, i) => {
                                    if (evt.type === 'note') {
                                        return (
                                            <div key={i} className="flex items-center justify-center gap-1.5 text-xs">
                                                <Mic className="w-3 h-3 text-red-400/60 shrink-0" />
                                                <span className="text-white/40 font-mono text-[10px]">{formatGoalTime(evt.timeSec)}</span>
                                                <span className="text-white/40 italic truncate">{evt.transcript}</span>
                                            </div>
                                        );
                                    }
                                    const isTeam1 = evt.teamIndex === 0;
                                    return (
                                        <div key={i} className={`flex items-center gap-1.5 ${isTeam1 ? 'flex-row' : 'flex-row-reverse'}`}>
                                            <div className={`flex-1 flex items-center gap-1.5 ${isTeam1 ? 'justify-end' : 'justify-end flex-row-reverse'}`}>
                                                <PlayerName id={evt.playerId} lookup={lookup ?? {}} className="text-white text-xs truncate" />
                                                <span className="text-white/30 text-xs shrink-0">&#9917;</span>
                                            </div>
                                            <div className="w-10 text-center shrink-0">
                                                <span className="text-white/50 font-mono text-[10px] bg-white/5 rounded px-1.5 py-0.5">
                                                    {formatGoalTime(evt.timeSec)}
                                                </span>
                                            </div>
                                            <div className="flex-1" />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )}

        {!hasTeams && (
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


        {/* Restart timer confirmation modal */}
        {confirmRestart && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center" onClick={() => setConfirmRestart(false)}>
                <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 mx-4 max-w-sm w-full text-center space-y-4" onClick={e => e.stopPropagation()}>
                    <RotateCcw className="w-8 h-8 text-white/40 mx-auto" />
                    <h3 className="text-white font-semibold text-lg">Restart timer?</h3>
                    <p className="text-white/50 text-sm">This will reset the clock to 0:00. Scores and events will be kept.</p>
                    <div className="flex gap-3 justify-center pt-2">
                        <button
                            onClick={() => { setConfirmRestart(false); onRestartTimer?.(); }}
                            className="bg-white/20 hover:bg-white/30 text-white rounded-lg px-6 py-2.5 text-sm font-semibold transition-all"
                        >
                            Restart
                        </button>
                        <button
                            onClick={() => setConfirmRestart(false)}
                            className="bg-white/10 hover:bg-white/20 text-white rounded-lg px-6 py-2.5 text-sm transition-all"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        )}

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
