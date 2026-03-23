import React, { useState, useEffect, useCallback } from 'react';
import { hapticLight } from '../../utils/haptics';
import { Link } from 'react-router-dom';
import { Plus, Trash2, ArrowRight, CheckCircle, HelpCircle, XCircle, Grid3X3, List, CalendarDays, Pencil, X, Check } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { League, Game, PlayerAvailability, AvailabilityStatus } from '../../types';
import {
    createGame,
    deleteGame,
    setAvailability,
    clearAvailability,
    subscribeToGameAvailability,
    updateGameDetails,
} from '../../utils/firestore';
import type { GameFormatConfig } from '../../types';
import FormatSelector from '../../components/FormatSelector';
import { DEFAULT_FORMAT } from '../../constants/gameConstants';
import { computeWaitlist, resolveGameFormat } from '../../utils/waitlist';
import { groupGamesByWeek } from '../../utils/weekGrouping';
import CalendarPicker from '../../components/CalendarPicker';
import { geocodeLocation, GeoResult } from '../../utils/weather';
import AvailabilityGrid from './AvailabilityGrid';
import GameCalendar from './GameCalendar';
import type { User } from 'firebase/auth';

interface Member {
    id: string;
    displayName: string;
    email: string;
}

interface UpcomingTabProps {
    leagueId: string;
    league: League;
    code: string;
    user: User;
    members: Member[];
    upcomingGames: Game[];
    allGames: Game[];
    isAdmin: boolean;
}

const UpcomingTab: React.FC<UpcomingTabProps> = ({
    leagueId, league, code, user, members, upcomingGames, allGames, isAdmin,
}) => {
    const today = new Date().toISOString().split('T')[0];
    const [showNewGame, setShowNewGame] = useState(false);
    const [newGameTitle, setNewGameTitle] = useState('');
    const [newGameDate, setNewGameDate] = useState(today);
    const [newGameTime, setNewGameTime] = useState('19:00');
    const [newGameLocation, setNewGameLocation] = useState('');
    const [verifiedLocation, setVerifiedLocation] = useState<GeoResult | null>(null);
    const [verifyingLocation, setVerifyingLocation] = useState(false);
    const [repeatWeeks, setRepeatWeeks] = useState(1);
    const [newGameCost, setNewGameCost] = useState('');
    const [scheduleAvailability, setScheduleAvailability] = useState<Map<string, PlayerAvailability[]>>(new Map());
    const [expandedAvailGame, setExpandedAvailGame] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'list' | 'grid' | 'calendar'>('list');
    const [formatOverride, setFormatOverride] = useState<GameFormatConfig | null>(null);
    const [showFormatOverride, setShowFormatOverride] = useState(false);
    const [newGameDeadline, setNewGameDeadline] = useState('');
    const [editingGameId, setEditingGameId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [editDate, setEditDate] = useState('');
    const [editTime, setEditTime] = useState('');
    const [editLocation, setEditLocation] = useState('');

    const startEditGame = (game: Game) => {
        setEditingGameId(game.id);
        setEditTitle(game.title);
        const d = new Date(game.date);
        setEditDate(d.toISOString().split('T')[0]);
        setEditTime(d.toTimeString().slice(0, 5));
        setEditLocation(game.location || '');
    };

    const cancelEditGame = () => {
        setEditingGameId(null);
        setEditTitle('');
        setEditDate('');
        setEditTime('');
        setEditLocation('');
    };

    const handleSaveGameEdit = async () => {
        if (!editingGameId || !editTitle.trim() || !editDate) return;
        const date = new Date(`${editDate}T${editTime}`).getTime();
        await updateGameDetails(editingGameId, {
            title: editTitle.trim(),
            date,
            location: editLocation.trim(),
        });
        cancelEditGame();
    };

    const handleSetAvailability = useCallback(async (gameId: string, status: AvailabilityStatus, currentStatus?: AvailabilityStatus) => {
        if (!user) return;
        hapticLight();
        if (currentStatus === status) {
            await clearAvailability(gameId, user.uid);
        } else {
            await setAvailability(gameId, user.uid, user.displayName || user.email?.split('@')[0] || 'Player', status);
        }
    }, [user]);

    // Subscribe to availability for all upcoming games
    useEffect(() => {
        if (!user || upcomingGames.length === 0) return;
        const unsubs = upcomingGames.map(game =>
            subscribeToGameAvailability(game.id, (avail) => {
                setScheduleAvailability(prev => {
                    const next = new Map(prev);
                    next.set(game.id, avail);
                    return next;
                });
            })
        );
        return () => unsubs.forEach(u => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [upcomingGames.map(g => g.id).join(',')]);

    const handleCreateGame = async () => {
        if (!user || !leagueId || !newGameTitle.trim() || !newGameDate) return;
        const base = new Date(`${newGameDate}T${newGameTime}`);
        const locationName = verifiedLocation?.displayName || newGameLocation.trim() || undefined;
        const parsedCost = parseFloat(newGameCost);
        const costPerPerson = !isNaN(parsedCost) && newGameCost.trim() !== '' ? parsedCost : undefined;
        const deadlineTs = newGameDeadline ? new Date(newGameDeadline).getTime() : undefined;
        const deadlineOffset = deadlineTs ? deadlineTs - base.getTime() : undefined;
        await Promise.all(
            Array.from({ length: repeatWeeks }, (_, i) => {
                const date = new Date(base.getTime() + i * 7 * 24 * 60 * 60 * 1000);
                const gameDeadline = deadlineOffset !== undefined ? date.getTime() + deadlineOffset : undefined;
                return createGame(
                    leagueId,
                    newGameTitle.trim(),
                    date.getTime(),
                    user.uid,
                    locationName,
                    verifiedLocation?.lat,
                    verifiedLocation?.lon,
                    costPerPerson,
                    undefined, // seasonId auto-determined by date range
                    formatOverride ?? undefined,
                    gameDeadline,
                );
            })
        );
        setNewGameTitle('');
        setNewGameDate(today);
        setNewGameLocation('');
        setVerifiedLocation(null);
        setRepeatWeeks(1);
        setNewGameCost('');
        setFormatOverride(null);
        setShowFormatOverride(false);
        setNewGameDeadline('');
        setShowNewGame(false);
    };

    const handleDeleteGame = async (gameId: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this game?')) {
            await deleteGame(gameId);
        }
    };

    return (
        <div className="space-y-3">
            {/* Main game list */}
            <div className="space-y-3">

            {!showNewGame ? (
                <Button
                    onClick={() => {
                        setShowNewGame(true);
                        if (league?.defaultVenue && !newGameLocation) {
                            setNewGameLocation(league.defaultVenue);
                            if (league.defaultVenueLat !== undefined && league.defaultVenueLon !== undefined) {
                                setVerifiedLocation({ displayName: league.defaultVenue, lat: league.defaultVenueLat, lon: league.defaultVenueLon });
                            }
                        }
                    }}
                    className="w-full bg-green-600 hover:bg-green-500 text-white rounded-lg flex items-center justify-center gap-2 py-3"
                >
                    <Plus className="w-4 h-4" /> Schedule a Game
                </Button>
            ) : (
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-white font-semibold">Schedule a Game</span>
                        <button onClick={() => setShowNewGame(false)} className="text-white/40 hover:text-white transition-colors text-xl leading-none">&times;</button>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-green-300 mb-1">Title</label>
                        <input
                            type="text"
                            value={newGameTitle}
                            onChange={e => setNewGameTitle(e.target.value)}
                            placeholder="e.g. Weekly kickabout"
                            className="w-full bg-white/10 border border-white/20 rounded-lg p-2.5 text-white placeholder-white/40 focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-green-300 mb-1">Location <span className="text-white/30 font-normal">(optional)</span></label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newGameLocation}
                                onChange={e => { setNewGameLocation(e.target.value); setVerifiedLocation(null); }}
                                onKeyDown={async e => {
                                    if (e.key === 'Enter' && newGameLocation.trim()) {
                                        e.preventDefault();
                                        setVerifyingLocation(true);
                                        const result = await geocodeLocation(newGameLocation.trim());
                                        setVerifiedLocation(result);
                                        setVerifyingLocation(false);
                                    }
                                }}
                                placeholder="e.g. Hackney Marshes, London"
                                className="flex-1 bg-white/10 border border-white/20 rounded-lg p-2.5 text-white placeholder-white/40 focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                            />
                            <button
                                type="button"
                                disabled={!newGameLocation.trim() || verifyingLocation}
                                onClick={async () => {
                                    setVerifyingLocation(true);
                                    const result = await geocodeLocation(newGameLocation.trim());
                                    setVerifiedLocation(result);
                                    setVerifyingLocation(false);
                                }}
                                className="px-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white text-xs transition-colors disabled:opacity-40"
                            >
                                {verifyingLocation ? '…' : 'Verify'}
                            </button>
                        </div>
                        {verifiedLocation && (
                            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-green-300">
                                <span>📍</span>
                                <span>{verifiedLocation.displayName}</span>
                                <span className="text-green-400">✓</span>
                            </div>
                        )}
                        {verifiedLocation === null && newGameLocation.trim() && !verifyingLocation && (
                            <div className="mt-1 text-xs text-white/30">Press Verify or Enter to confirm location</div>
                        )}
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-green-300 mb-1">Date</label>
                        <CalendarPicker
                            value={newGameDate}
                            min={today}
                            onChange={setNewGameDate}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-green-300 mb-1">Time</label>
                        <input
                            type="time"
                            value={newGameTime}
                            onChange={e => setNewGameTime(e.target.value)}
                            className="w-full bg-white/10 border border-white/20 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-green-300 mb-1">
                            Cost per person <span className="text-white/30 font-normal">(leave blank for league default{league.defaultCostPerPerson !== undefined ? ` · £${league.defaultCostPerPerson.toFixed(2)}` : ''})</span>
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 text-sm">£</span>
                            <input
                                type="number"
                                value={newGameCost}
                                onChange={e => setNewGameCost(e.target.value)}
                                placeholder="e.g. 5"
                                min="0"
                                step="0.5"
                                className="w-full bg-white/10 border border-white/20 rounded-lg p-2.5 pl-7 text-white placeholder-white/40 focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                            />
                        </div>
                    </div>
                    {/* Format override */}
                    {(() => {
                        const leagueFormat = league.defaultFormat ?? DEFAULT_FORMAT;
                        return (<div>
                        {!showFormatOverride ? (
                            <div className="flex items-center justify-between">
                                <div className="text-xs text-white/40">
                                    Format: {leagueFormat.format} ({leagueFormat.minPlayers}–{leagueFormat.maxPlayers} players)
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowFormatOverride(true)}
                                    className="text-xs text-green-400 hover:text-green-300 transition-colors"
                                >
                                    Override
                                </button>
                            </div>
                        ) : (
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="text-xs font-medium text-green-300">Format override</label>
                                    <button
                                        type="button"
                                        onClick={() => { setShowFormatOverride(false); setFormatOverride(null); }}
                                        className="text-xs text-white/30 hover:text-white/60 transition-colors"
                                    >
                                        Use league default
                                    </button>
                                </div>
                                <FormatSelector
                                    compact
                                    value={formatOverride ?? leagueFormat}
                                    onChange={setFormatOverride}
                                />
                            </div>
                        )}
                    </div>);
                    })()}

                    <div>
                        <label className="block text-xs font-medium text-green-300 mb-1">
                            Response deadline <span className="text-white/30 font-normal">(optional)</span>
                        </label>
                        <input
                            type="datetime-local"
                            value={newGameDeadline}
                            onChange={e => setNewGameDeadline(e.target.value)}
                            className="w-full bg-white/10 border border-white/20 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm [color-scheme:dark]"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-green-300 mb-1">Repeat weekly</label>
                        <div className="flex items-center gap-3">
                            <input
                                type="range"
                                min={1}
                                max={20}
                                value={repeatWeeks}
                                onChange={e => setRepeatWeeks(Number(e.target.value))}
                                className="flex-1 accent-green-500"
                            />
                            <span className="w-20 text-xs text-center font-medium text-white bg-white/10 rounded-lg px-2 py-1.5">
                                {repeatWeeks === 1 ? 'Once' : `${repeatWeeks} weeks`}
                            </span>
                        </div>
                        {repeatWeeks > 1 && newGameDate && (
                            <p className="text-xs text-green-300/70 mt-1">
                                Creates {repeatWeeks} games from {new Date(`${newGameDate}T${newGameTime}`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} to {new Date(new Date(`${newGameDate}T${newGameTime}`).getTime() + (repeatWeeks - 1) * 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                            </p>
                        )}
                    </div>
                    <Button
                        onClick={handleCreateGame}
                        disabled={!newGameTitle.trim() || !newGameDate}
                        className="w-full bg-green-600 hover:bg-green-500 text-white rounded-lg"
                    >
                        {repeatWeeks === 1 ? 'Schedule' : `Schedule ${repeatWeeks} games`}
                    </Button>
                </div>
            )}

            {/* View toggle */}
            {upcomingGames.length > 0 && (
                <div className="flex justify-end">
                    <div className="flex bg-white/5 rounded-lg p-0.5">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                                viewMode === 'list' ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/70'
                            }`}
                        >
                            <List className="w-3.5 h-3.5" /> List
                        </button>
                        <button
                            onClick={() => setViewMode('calendar')}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                                viewMode === 'calendar' ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/70'
                            }`}
                        >
                            <CalendarDays className="w-3.5 h-3.5" /> Calendar
                        </button>
                        {isAdmin && (
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                                    viewMode === 'grid' ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/70'
                                }`}
                            >
                                <Grid3X3 className="w-3.5 h-3.5" /> Grid
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Grid view (admin only) */}
            {viewMode === 'grid' && isAdmin && upcomingGames.length > 0 ? (
                <AvailabilityGrid
                    upcomingGames={upcomingGames}
                    allGames={allGames}
                    members={members}
                    scheduleAvailability={scheduleAvailability}
                    currentUserId={user.uid}
                    code={code}
                />
            ) : viewMode === 'calendar' && upcomingGames.length > 0 ? (
                <GameCalendar
                    games={allGames}
                    scheduleAvailability={scheduleAvailability}
                    currentUserId={user.uid}
                    code={code}
                    onSetAvailability={(gameId, status, currentStatus) => handleSetAvailability(gameId, status, currentStatus)}
                />
            ) : (() => {
                // Precompute waitlists
                const waitlistMap = new Map(upcomingGames.map(game => {
                    const avail = scheduleAvailability.get(game.id) ?? [];
                    const guestStatusMap = game.guestAvailability ?? {};
                    const availableAvail = avail.filter(a => a.status === 'available');
                    const maybeAvail = avail.filter(a => a.status === 'maybe');
                    const gAvailable = (game.guestPlayers ?? []).filter(n => (guestStatusMap[n] ?? 'available') === 'available');
                    const gMaybe = (game.guestPlayers ?? []).filter(n => guestStatusMap[n] === 'maybe');
                    const ef = resolveGameFormat(game, league);
                    return [game.id, computeWaitlist(availableAvail, maybeAvail, gAvailable, gMaybe, ef)] as const;
                }));
                const weekGroups = groupGamesByWeek(upcomingGames);
                const statusBorder = (status: string) =>
                    status === 'in_progress' ? 'border-l-4 border-l-amber-500' :
                    status === 'completed' ? 'border-l-4 border-l-green-500' :
                    'border-l-4 border-l-blue-500';

                return weekGroups.length === 0 ? (
                <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-8 text-center">
                    <p className="text-green-300">No upcoming games. Schedule one!</p>
                </div>
            ) : (
                weekGroups.map(group => (
                    <div key={group.label} className="space-y-2">
                        <div className="text-xs font-semibold text-white/40 uppercase tracking-wider px-1 pt-2">
                            {group.label}
                        </div>
                        {group.games.map(game => {
                    const waitlist = waitlistMap.get(game.id);
                    if (!waitlist) return null;
                    const avail = scheduleAvailability.get(game.id) ?? [];
                    const myStatus = avail.find(a => a.userId === user?.uid)?.status;
                    const inCount = waitlist.inPlayers.length;
                    const waitlistedCount = waitlist.waitlistedAvailable.length + waitlist.waitlistedMaybe.length;
                    const noResponseCount = members.filter(m => !avail.find(a => a.userId === m.id)).length;
                    const isExpanded = expandedAvailGame === game.id;
                    const gameDate = new Date(game.date);
                    const deadlinePassed = game.responseDeadline && game.responseDeadline < Date.now();
                    return (
                        <div key={game.id} className={`bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden ${statusBorder(game.status)}`}>
                          <div className="p-4">
                            {editingGameId === game.id ? (
                                <div className="space-y-2">
                                    <input
                                        type="text"
                                        value={editTitle}
                                        onChange={e => setEditTitle(e.target.value)}
                                        className="w-full bg-white/10 border border-white/20 rounded-lg px-2.5 py-1.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-green-400"
                                        autoFocus
                                    />
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            type="date"
                                            value={editDate}
                                            onChange={e => setEditDate(e.target.value)}
                                            className="bg-white/10 border border-white/20 rounded-lg px-2.5 py-1.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-green-400 [color-scheme:dark]"
                                        />
                                        <input
                                            type="time"
                                            value={editTime}
                                            onChange={e => setEditTime(e.target.value)}
                                            className="bg-white/10 border border-white/20 rounded-lg px-2.5 py-1.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-green-400 [color-scheme:dark]"
                                        />
                                    </div>
                                    <input
                                        type="text"
                                        value={editLocation}
                                        onChange={e => setEditLocation(e.target.value)}
                                        placeholder="Location (optional)"
                                        className="w-full bg-white/10 border border-white/20 rounded-lg px-2.5 py-1.5 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-green-400"
                                    />
                                    <div className="flex gap-2">
                                        <button onClick={handleSaveGameEdit} disabled={!editTitle.trim() || !editDate} className="text-green-400 hover:text-green-300 disabled:opacity-40 flex items-center gap-1 text-xs">
                                            <Check className="w-3.5 h-3.5" /> Save
                                        </button>
                                        <button onClick={cancelEditGame} className="text-white/40 hover:text-white flex items-center gap-1 text-xs">
                                            <X className="w-3.5 h-3.5" /> Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (<>
                            <div className="flex items-center gap-3">
                                {/* Date badge */}
                                <div className="w-12 shrink-0 text-center">
                                    <div className="text-[10px] uppercase text-white/40 font-semibold leading-tight">
                                        {gameDate.toLocaleDateString('en-GB', { month: 'short' })}
                                    </div>
                                    <div className="text-xl font-bold text-white leading-tight">
                                        {gameDate.getDate()}
                                    </div>
                                </div>
                                <Link to={`/league/${code}/game/${game.gameCode || game.id}`} className="flex-1 min-w-0 hover:text-green-300 transition-colors">
                                    <div className="text-white font-bold">{game.title}</div>
                                    <div className="text-green-300 text-sm mt-0.5">
                                        {gameDate.toLocaleDateString('en-GB', {
                                            weekday: 'long',
                                        })}{' '}
                                        at{' '}
                                        {gameDate.toLocaleTimeString('en-GB', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                        {game.location && <span className="text-white/40 ml-2">· {game.location}</span>}
                                    </div>
                                    <div className="flex items-center gap-3 mt-1 text-xs">
                                        <span className="text-green-400">{inCount}/{waitlist.maxPlayers} spots</span>
                                        {waitlistedCount > 0 && <span className="text-amber-400">{waitlistedCount} waitlisted</span>}
                                        {noResponseCount > 0 && (
                                            <button
                                                onClick={e => { e.preventDefault(); if (isAdmin) setExpandedAvailGame(isExpanded ? null : game.id); }}
                                                className={`text-white/35 ${isAdmin ? 'hover:text-white/60 cursor-pointer' : ''}`}
                                            >
                                                {noResponseCount} no response
                                            </button>
                                        )}
                                    </div>
                                    {game.responseDeadline && (
                                        <div className={`mt-1 text-xs ${deadlinePassed ? 'text-white/30 line-through' : 'text-red-400'}`}>
                                            {deadlinePassed ? 'Deadline passed' : `Respond by: ${new Date(game.responseDeadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}, ${new Date(game.responseDeadline).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`}
                                        </div>
                                    )}
                                </Link>
                                <div className="flex items-center gap-2 shrink-0">
                                    {user && isAdmin && (
                                        <button
                                            onClick={() => startEditGame(game)}
                                            className="text-white/30 hover:text-white/70 transition-colors"
                                            title="Edit game"
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                    {user && (
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => handleSetAvailability(game.id, 'available', myStatus)}
                                                title="I'm in"
                                                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                                                    myStatus === 'available'
                                                        ? 'bg-green-600 text-white'
                                                        : 'bg-white/10 text-white/50 hover:bg-white/20'
                                                }`}
                                            >
                                                <CheckCircle className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleSetAvailability(game.id, 'maybe', myStatus)}
                                                title="Maybe"
                                                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                                                    myStatus === 'maybe'
                                                        ? 'bg-yellow-600 text-white'
                                                        : 'bg-white/10 text-white/50 hover:bg-white/20'
                                                }`}
                                            >
                                                <HelpCircle className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleSetAvailability(game.id, 'unavailable', myStatus)}
                                                title="Can't make it"
                                                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                                                    myStatus === 'unavailable'
                                                        ? 'bg-red-600 text-white'
                                                        : 'bg-white/10 text-white/50 hover:bg-white/20'
                                                }`}
                                            >
                                                <XCircle className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                    {user && game.createdBy === user.uid && (
                                        <button
                                            onClick={(e) => handleDeleteGame(game.id, e)}
                                            className="text-red-400/50 hover:text-red-400 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                    <ArrowRight className="w-4 h-4 text-white/40" />
                                </div>
                            </div>
                            {/* Admin member availability panel */}
                            {isAdmin && isExpanded && (
                                <div className="mt-3 pt-3 border-t border-white/10 space-y-1.5">
                                    {members.map(member => {
                                        const avails = scheduleAvailability.get(game.id) ?? [];
                                        const memberStatus = avails.find(a => a.userId === member.id)?.status;
                                        return (
                                            <div key={member.id} className="flex items-center justify-between gap-2">
                                                <span className={`text-sm truncate ${member.id === user?.uid ? 'text-green-300' : 'text-white/70'}`}>
                                                    {member.displayName}
                                                </span>
                                                <div className="flex gap-1 shrink-0">
                                                    <button
                                                        onClick={() => setAvailability(game.id, member.id, member.displayName, 'available')}
                                                        title="Mark in"
                                                        className={`w-7 h-7 rounded flex items-center justify-center transition-colors text-xs ${memberStatus === 'available' ? 'bg-green-600 text-white' : 'bg-white/8 text-white/30 hover:bg-white/15 hover:text-white/60'}`}
                                                    >
                                                        <CheckCircle className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => setAvailability(game.id, member.id, member.displayName, 'maybe')}
                                                        title="Mark maybe"
                                                        className={`w-7 h-7 rounded flex items-center justify-center transition-colors text-xs ${memberStatus === 'maybe' ? 'bg-yellow-600 text-white' : 'bg-white/8 text-white/30 hover:bg-white/15 hover:text-white/60'}`}
                                                    >
                                                        <HelpCircle className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => setAvailability(game.id, member.id, member.displayName, 'unavailable')}
                                                        title="Mark out"
                                                        className={`w-7 h-7 rounded flex items-center justify-center transition-colors text-xs ${memberStatus === 'unavailable' ? 'bg-red-600 text-white' : 'bg-white/8 text-white/30 hover:bg-white/15 hover:text-white/60'}`}
                                                    >
                                                        <XCircle className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            </>)}
                          </div>{/* end p-4 wrapper */}
                        </div>
                    );
                })}
                    </div>
                ))
            )})()}
            </div>{/* end main game list */}
        </div>
    );
};

export default UpcomingTab;
