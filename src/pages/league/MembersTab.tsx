import React, { useState, useMemo } from 'react';
import { Users, Copy, Check, Trash2, Pencil, X, LogOut, Trophy, Archive, UserPlus, Link2, Calendar, Settings, MapPin } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { League, Game, Season } from '../../types';
import {
    removeMember, updateUserDisplayName, updateLeagueAdmins,
    createSeason, archiveSeason, updateSeason, deleteSeason,
    extractGuestsFromGames, linkGuestToMember,
    updateLeagueEnableAssists, updateLeagueDefaultVenue, updateLeagueMatchDuration,
} from '../../utils/firestore';
import type { User } from 'firebase/auth';
import { logger } from '../../utils/logger';
import CollapsibleSection from '../../components/CollapsibleSection';
import { geocodeLocation, GeoResult } from '../../utils/weather';

interface Member {
    id: string;
    displayName: string;
    email: string;
}

interface MembersTabProps {
    league: League;
    leagueId: string;
    user: User;
    members: Member[];
    games: Game[];
    isOwner: boolean;
    isAdmin: boolean;
    code: string;
    copiedCode: boolean;
    onCopyCode: () => void;
    onLeaveLeague: () => void;
    onDeleteLeague: () => void;
    onMembersChanged: (members: Member[]) => void;
}

function toDateInput(ts: number): string {
    return new Date(ts).toISOString().split('T')[0];
}

function fromDateInput(val: string): number {
    return new Date(val + 'T00:00:00').getTime();
}

const MembersTab: React.FC<MembersTabProps> = ({
    league, leagueId, user, members, games, isOwner, isAdmin,
    copiedCode, onCopyCode, onLeaveLeague, onDeleteLeague, onMembersChanged,
}) => {
    const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
    const [editingMemberName, setEditingMemberName] = useState('');
    const [showNewSeason, setShowNewSeason] = useState(false);
    const [newSeasonName, setNewSeasonName] = useState('');
    const [newSeasonStart, setNewSeasonStart] = useState('');
    const [newSeasonEnd, setNewSeasonEnd] = useState('');
    const [savingSeason, setSavingSeason] = useState(false);
    const [seasonError, setSeasonError] = useState('');
    const [editingSeasonId, setEditingSeasonId] = useState<string | null>(null);
    const [editSeasonName, setEditSeasonName] = useState('');
    const [editSeasonStart, setEditSeasonStart] = useState('');
    const [editSeasonEnd, setEditSeasonEnd] = useState('');

    // Guest linking state
    const [linkingGuestId, setLinkingGuestId] = useState<string | null>(null);
    const [selectedMemberId, setSelectedMemberId] = useState('');
    const [linkingInProgress, setLinkingInProgress] = useState(false);
    const [linkResult, setLinkResult] = useState<{ guestId: string; count: number } | null>(null);

    // Venue editing state
    const [editingVenue, setEditingVenue] = useState(false);
    const [venueInput, setVenueInput] = useState('');
    const [verifiedVenue, setVerifiedVenue] = useState<GeoResult | null>(null);
    const [verifyingVenue, setVerifyingVenue] = useState(false);

    const guests = useMemo(() => extractGuestsFromGames(games), [games]);

    const handleCreateSeason = async () => {
        const trimmed = newSeasonName.trim();
        if (!trimmed || !newSeasonStart) return;
        setSavingSeason(true);
        setSeasonError('');
        try {
            const startTs = fromDateInput(newSeasonStart);
            const endTs = newSeasonEnd ? fromDateInput(newSeasonEnd) : undefined;
            await createSeason(leagueId, trimmed, startTs, endTs);
            setNewSeasonName('');
            setNewSeasonStart('');
            setNewSeasonEnd('');
            setShowNewSeason(false);
        } catch (err) {
            logger.error('[createSeason]', err);
            setSeasonError('Failed to create season. Please try again.');
        } finally {
            setSavingSeason(false);
        }
    };

    const handleUpdateSeason = async (seasonId: string) => {
        const trimmed = editSeasonName.trim();
        if (!trimmed || !editSeasonStart) return;
        setSeasonError('');
        try {
            await updateSeason(leagueId, seasonId, {
                name: trimmed,
                startDate: fromDateInput(editSeasonStart),
                endDate: editSeasonEnd ? fromDateInput(editSeasonEnd) : undefined,
            });
            setEditingSeasonId(null);
        } catch (err) {
            logger.error('[updateSeason]', err);
            setSeasonError('Failed to update season.');
        }
    };

    const handleLinkGuest = async (guestId: string) => {
        if (!selectedMemberId) return;
        setLinkingInProgress(true);
        try {
            const count = await linkGuestToMember(leagueId, guestId, selectedMemberId);
            setLinkResult({ guestId, count });
            setLinkingGuestId(null);
            setSelectedMemberId('');
        } catch (err) {
            logger.error('[linkGuest]', err);
        } finally {
            setLinkingInProgress(false);
        }
    };

    const countGamesInSeason = (season: Season): number => {
        const start = season.startDate;
        const end = season.endDate ?? Infinity;
        return games.filter(g => g.status === 'completed' && g.date >= start && g.date <= end).length;
    };

    const handleSaveVenue = async () => {
        const name = verifiedVenue?.displayName || venueInput.trim();
        if (!name) return;
        await updateLeagueDefaultVenue(leagueId, name, verifiedVenue?.lat, verifiedVenue?.lon);
        setEditingVenue(false);
        setVenueInput('');
        setVerifiedVenue(null);
    };

    return (
        <div className="space-y-3">
            {/* Invite others */}
            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                <div className="text-white font-medium mb-2">Invite others</div>
                <div className="flex items-center gap-2">
                    <div className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white/70 truncate">
                        {window.location.origin}/join/{league.joinCode}
                    </div>
                    <Button
                        onClick={onCopyCode}
                        className="bg-green-600 hover:bg-green-500 text-white px-4 shrink-0"
                    >
                        {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                </div>
                <p className="text-green-300/70 text-xs mt-2">Share this link with others so they can join your league.</p>
            </div>

            {/* Members list */}
            <CollapsibleSection title="Members" icon={<Users className="w-4 h-4 text-green-400" />} badge={`${members.length}`} defaultOpen>
                {members.map((member, i) => {
                    const isEditing = editingMemberId === member.id;
                    return (
                        <div
                            key={member.id}
                            className={`flex items-center justify-between p-4 gap-3 ${
                                i !== members.length - 1 ? 'border-b border-white/10' : ''
                            }`}
                        >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="w-8 h-8 shrink-0 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-sm">
                                    {member.displayName.charAt(0).toUpperCase()}
                                </div>
                                {isEditing ? (
                                    <form
                                        className="flex items-center gap-2 flex-1"
                                        onSubmit={async e => {
                                            e.preventDefault();
                                            const trimmed = editingMemberName.trim();
                                            if (!trimmed) return;
                                            await updateUserDisplayName(member.id, trimmed);
                                            onMembersChanged(members.map(m => m.id === member.id ? { ...m, displayName: trimmed } : m));
                                            setEditingMemberId(null);
                                        }}
                                    >
                                        <input
                                            autoFocus
                                            value={editingMemberName}
                                            onChange={e => setEditingMemberName(e.target.value)}
                                            maxLength={30}
                                            className="flex-1 bg-white/10 border border-white/30 rounded-lg px-2 py-1 text-white text-sm focus:ring-2 focus:ring-green-400 outline-none"
                                        />
                                        <button type="submit" className="text-green-400 hover:text-green-300 shrink-0">
                                            <Check className="w-4 h-4" />
                                        </button>
                                        <button type="button" onClick={() => setEditingMemberId(null)} className="text-white/40 hover:text-white shrink-0">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </form>
                                ) : (
                                    <div className="min-w-0">
                                        <div className="text-white font-medium truncate">{member.displayName}</div>
                                        <div className="text-green-300 text-xs truncate">{member.email}</div>
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                {member.id === league.createdBy ? (
                                    <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-full">Owner</span>
                                ) : (league.adminIds ?? []).includes(member.id) ? (
                                    <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">Admin</span>
                                ) : null}
                                {isOwner && member.id !== league.createdBy && !isEditing && (
                                    <button
                                        onClick={async () => {
                                            if (!leagueId || !league) return;
                                            const currentAdmins = league.adminIds ?? [];
                                            const isMemberAdmin = currentAdmins.includes(member.id);
                                            const updated = isMemberAdmin
                                                ? currentAdmins.filter(a => a !== member.id)
                                                : [...currentAdmins, member.id];
                                            await updateLeagueAdmins(leagueId, updated);
                                        }}
                                        className="text-white/30 hover:text-blue-400 transition-colors"
                                        title={(league.adminIds ?? []).includes(member.id) ? 'Remove admin' : 'Make admin'}
                                    >
                                        <Users className="w-3.5 h-3.5" />
                                    </button>
                                )}
                                {isAdmin && !isEditing && (
                                    <button
                                        onClick={() => { setEditingMemberId(member.id); setEditingMemberName(member.displayName); }}
                                        className="text-white/30 hover:text-white/70 transition-colors"
                                        title="Edit name"
                                    >
                                        <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                )}
                                {isAdmin && member.id !== league.createdBy && !isEditing && (
                                    <button
                                        onClick={async () => {
                                            if (!leagueId) return;
                                            if (confirm(`Remove ${member.displayName} from the league?`)) {
                                                await removeMember(leagueId, member.id);
                                                onMembersChanged(members.filter(m => m.id !== member.id));
                                            }
                                        }}
                                        className="text-white/30 hover:text-red-400 transition-colors"
                                        title="Remove member"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </CollapsibleSection>

            {/* Guest Players — admin only */}
            {isAdmin && guests.length > 0 && (
                <CollapsibleSection title="Guest Players" icon={<UserPlus className="w-4 h-4 text-orange-400" />} badge={`${guests.length} guests`}>
                    <p className="text-white/40 text-xs mb-3">
                        Link a guest to a signed-up member to merge their stats (goals, assists, MoTM, attendance).
                    </p>
                    <div className="space-y-2">
                        {guests
                            .filter(g => linkResult?.guestId !== g.guestId)
                            .map(guest => (
                            <div key={guest.guestId} className="flex items-center gap-3 bg-white/5 rounded-lg px-3 py-2">
                                <div className="w-7 h-7 shrink-0 rounded-full bg-orange-600/30 border border-orange-500/30 flex items-center justify-center text-orange-300 font-bold text-xs">
                                    {guest.guestName.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-white text-sm truncate">{guest.guestName}</div>
                                    <div className="text-white/30 text-xs">{guest.gameCount} game{guest.gameCount !== 1 ? 's' : ''}</div>
                                </div>
                                {linkingGuestId === guest.guestId ? (
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={selectedMemberId}
                                            onChange={e => setSelectedMemberId(e.target.value)}
                                            className="bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-green-400 max-w-[140px]"
                                        >
                                            <option value="" className="bg-green-900">Select member...</option>
                                            {members.map(m => (
                                                <option key={m.id} value={m.id} className="bg-green-900">{m.displayName}</option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={() => handleLinkGuest(guest.guestId)}
                                            disabled={!selectedMemberId || linkingInProgress}
                                            className="text-green-400 hover:text-green-300 disabled:opacity-40 shrink-0"
                                            title="Confirm link"
                                        >
                                            {linkingInProgress ? <span className="text-xs">...</span> : <Check className="w-4 h-4" />}
                                        </button>
                                        <button
                                            onClick={() => { setLinkingGuestId(null); setSelectedMemberId(''); }}
                                            className="text-white/40 hover:text-white shrink-0"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => { setLinkingGuestId(guest.guestId); setSelectedMemberId(''); setLinkResult(null); }}
                                        className="text-white/30 hover:text-green-400 transition-colors flex items-center gap-1 text-xs"
                                        title="Link to member"
                                    >
                                        <Link2 className="w-3.5 h-3.5" /> Link
                                    </button>
                                )}
                            </div>
                        ))}
                        {linkResult && (
                            <div className="text-green-400 text-xs bg-green-500/10 rounded-lg px-3 py-2">
                                Linked successfully — updated {linkResult.count} game{linkResult.count !== 1 ? 's' : ''}.
                            </div>
                        )}
                    </div>
                </CollapsibleSection>
            )}

            {/* League Settings — admin only */}
            {isAdmin && (
                <CollapsibleSection title="League Settings" icon={<Settings className="w-4 h-4 text-white/50" />}>
                    <div className="space-y-4">
                        {/* Default venue */}
                        <div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-white text-sm font-medium">Default venue</div>
                                    <div className="text-white/30 text-xs">
                                        {league.defaultVenue || 'Not set'}
                                    </div>
                                </div>
                                {!editingVenue ? (
                                    <button
                                        onClick={() => { setEditingVenue(true); setVenueInput(league.defaultVenue || ''); }}
                                        className="text-white/30 hover:text-white/70 transition-colors"
                                    >
                                        <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                ) : (
                                    <button onClick={() => { setEditingVenue(false); setVenueInput(''); setVerifiedVenue(null); }} className="text-white/40 hover:text-white">
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                            {editingVenue && (
                                <div className="mt-2 space-y-2">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={venueInput}
                                            onChange={e => { setVenueInput(e.target.value); setVerifiedVenue(null); }}
                                            onKeyDown={async e => {
                                                if (e.key === 'Enter' && venueInput.trim()) {
                                                    e.preventDefault();
                                                    setVerifyingVenue(true);
                                                    const result = await geocodeLocation(venueInput.trim());
                                                    setVerifiedVenue(result);
                                                    setVerifyingVenue(false);
                                                }
                                            }}
                                            placeholder="e.g. Hackney Marshes, London"
                                            className="flex-1 bg-white/10 border border-white/20 rounded-lg px-2.5 py-1.5 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-green-400"
                                            autoFocus
                                        />
                                        <button
                                            type="button"
                                            disabled={!venueInput.trim() || verifyingVenue}
                                            onClick={async () => {
                                                setVerifyingVenue(true);
                                                const result = await geocodeLocation(venueInput.trim());
                                                setVerifiedVenue(result);
                                                setVerifyingVenue(false);
                                            }}
                                            className="px-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white text-xs transition-colors disabled:opacity-40"
                                        >
                                            {verifyingVenue ? '…' : 'Verify'}
                                        </button>
                                    </div>
                                    {verifiedVenue && (
                                        <div className="flex items-center gap-1.5 text-xs text-green-300">
                                            <MapPin className="w-3 h-3" />
                                            <span>{verifiedVenue.displayName}</span>
                                        </div>
                                    )}
                                    <button
                                        onClick={handleSaveVenue}
                                        disabled={!venueInput.trim()}
                                        className="text-xs text-green-400 hover:text-green-300 disabled:opacity-40 transition-colors"
                                    >
                                        Save venue
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Track assists */}
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-white text-sm font-medium">Track assists</div>
                                <div className="text-white/30 text-xs">Record assists alongside goals</div>
                            </div>
                            <button
                                onClick={async () => {
                                    await updateLeagueEnableAssists(leagueId, !(league.enableAssists === true));
                                }}
                                className={`relative w-11 h-6 rounded-full transition-colors ${
                                    league.enableAssists ? 'bg-green-500' : 'bg-white/20'
                                }`}
                            >
                                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                                    league.enableAssists ? 'translate-x-5' : ''
                                }`} />
                            </button>
                        </div>

                        {/* Match duration */}
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-white text-sm font-medium">Match duration</div>
                                <div className="text-white/30 text-xs">Length of each game in minutes</div>
                            </div>
                            <select
                                value={league.matchDurationMinutes ?? 60}
                                onChange={async (e) => {
                                    await updateLeagueMatchDuration(leagueId, Number(e.target.value));
                                }}
                                className="bg-white/10 text-white text-sm rounded-lg px-3 py-1.5 border border-white/10 focus:outline-none focus:ring-1 focus:ring-green-500"
                            >
                                <option value={30}>30 min</option>
                                <option value={45}>45 min</option>
                                <option value={60}>60 min</option>
                                <option value={75}>75 min</option>
                                <option value={90}>90 min</option>
                                <option value={120}>120 min</option>
                            </select>
                        </div>
                    </div>
                </CollapsibleSection>
            )}

            {/* Season Management — admin only */}
            {isAdmin && (
                <CollapsibleSection title="Seasons" icon={<Trophy className="w-4 h-4 text-yellow-400" />}>
                    <div className="flex items-center justify-end mb-3">
                        {!showNewSeason && (
                            <button
                                onClick={() => setShowNewSeason(true)}
                                className="text-xs text-green-400 hover:text-green-300 transition-colors"
                            >
                                + New Season
                            </button>
                        )}
                    </div>

                    {showNewSeason && (
                        <div className="space-y-2 mb-3 bg-white/5 rounded-lg p-3">
                            <input
                                type="text"
                                value={newSeasonName}
                                onChange={e => setNewSeasonName(e.target.value)}
                                placeholder='e.g. "Spring 2026"'
                                maxLength={30}
                                autoFocus
                                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-green-400"
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs text-white/40 mb-1">Start date</label>
                                    <input
                                        type="date"
                                        value={newSeasonStart}
                                        onChange={e => setNewSeasonStart(e.target.value)}
                                        className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-green-400 [color-scheme:dark]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-white/40 mb-1">End date</label>
                                    <input
                                        type="date"
                                        value={newSeasonEnd}
                                        onChange={e => setNewSeasonEnd(e.target.value)}
                                        className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-green-400 [color-scheme:dark]"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleCreateSeason}
                                    disabled={!newSeasonName.trim() || !newSeasonStart || savingSeason}
                                    className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white text-sm px-3 py-2 rounded-lg transition-colors"
                                >
                                    {savingSeason ? '...' : 'Create Season'}
                                </button>
                                <button
                                    onClick={() => { setShowNewSeason(false); setNewSeasonName(''); setNewSeasonStart(''); setNewSeasonEnd(''); }}
                                    className="text-white/40 hover:text-white/70 px-2"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}

                    {seasonError && (
                        <p className="text-red-400 text-xs mb-2">{seasonError}</p>
                    )}

                    {(() => {
                        const seasons = Object.values(league.seasons ?? {}) as Season[];
                        if (seasons.length === 0 && !showNewSeason) {
                            return <p className="text-white/30 text-xs">No seasons yet. Create one to track league standings over time.</p>;
                        }

                        const sorted = [...seasons].sort((a, b) => b.startDate - a.startDate);

                        return (
                            <div className="space-y-2">
                                {sorted.map(s => {
                                    const isActive = s.id === league.activeSeasonId;
                                    const isEditingSeason = editingSeasonId === s.id;
                                    const gameCount = countGamesInSeason(s);

                                    if (isEditingSeason) {
                                        return (
                                            <div key={s.id} className="space-y-2 bg-white/5 rounded-lg p-3">
                                                <input
                                                    type="text"
                                                    value={editSeasonName}
                                                    onChange={e => setEditSeasonName(e.target.value)}
                                                    maxLength={30}
                                                    autoFocus
                                                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-green-400"
                                                />
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <label className="block text-xs text-white/40 mb-1">Start</label>
                                                        <input
                                                            type="date"
                                                            value={editSeasonStart}
                                                            onChange={e => setEditSeasonStart(e.target.value)}
                                                            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-green-400 [color-scheme:dark]"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs text-white/40 mb-1">End</label>
                                                        <input
                                                            type="date"
                                                            value={editSeasonEnd}
                                                            onChange={e => setEditSeasonEnd(e.target.value)}
                                                            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-green-400 [color-scheme:dark]"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleUpdateSeason(s.id)}
                                                        disabled={!editSeasonName.trim() || !editSeasonStart}
                                                        className="text-green-400 hover:text-green-300 disabled:opacity-40 text-xs"
                                                    >
                                                        Save
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingSeasonId(null)}
                                                        className="text-white/40 hover:text-white text-xs"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div
                                            key={s.id}
                                            className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                                                isActive ? 'bg-green-500/10 border border-green-500/20' : 'bg-white/5'
                                            }`}
                                        >
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-sm font-medium ${isActive ? 'text-white' : 'text-white/60'}`}>{s.name}</span>
                                                    {isActive && <span className="text-green-400 text-xs">Active</span>}
                                                </div>
                                                <div className="flex items-center gap-1 text-white/25 text-xs mt-0.5">
                                                    <Calendar className="w-3 h-3" />
                                                    {new Date(s.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    {s.endDate && ` – ${new Date(s.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                                                    {!s.endDate && ' – ongoing'}
                                                    <span className="ml-1">({gameCount} game{gameCount !== 1 ? 's' : ''})</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <button
                                                    onClick={() => {
                                                        setEditingSeasonId(s.id);
                                                        setEditSeasonName(s.name);
                                                        setEditSeasonStart(toDateInput(s.startDate));
                                                        setEditSeasonEnd(s.endDate ? toDateInput(s.endDate) : '');
                                                    }}
                                                    className="text-white/30 hover:text-white/70 transition-colors"
                                                    title="Edit season"
                                                >
                                                    <Pencil className="w-3 h-3" />
                                                </button>
                                                {isActive && (
                                                    <button
                                                        onClick={async () => {
                                                            if (confirm(`End "${s.name}"? You can start a new season afterwards.`)) {
                                                                setSeasonError('');
                                                                try {
                                                                    await archiveSeason(leagueId, s.id);
                                                                } catch (err) {
                                                                    logger.error('[archiveSeason]', err);
                                                                    setSeasonError('Failed to end season.');
                                                                }
                                                            }
                                                        }}
                                                        className="text-xs text-white/40 hover:text-yellow-400 transition-colors flex items-center gap-1"
                                                    >
                                                        <Archive className="w-3 h-3" /> End
                                                    </button>
                                                )}
                                                {!isActive && (
                                                    <button
                                                        onClick={async () => {
                                                            if (confirm(`Delete "${s.name}"? This cannot be undone.`)) {
                                                                try {
                                                                    await deleteSeason(leagueId, s.id);
                                                                } catch (err) {
                                                                    logger.error('[deleteSeason]', err);
                                                                    setSeasonError('Failed to delete season.');
                                                                }
                                                            }
                                                        }}
                                                        className="text-white/30 hover:text-red-400 transition-colors"
                                                        title="Delete season"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })()}
                </CollapsibleSection>
            )}

            {league.createdBy !== user.uid && (
                <Button
                    onClick={onLeaveLeague}
                    className="w-full bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/20 rounded-lg flex items-center justify-center gap-2"
                >
                    <LogOut className="w-4 h-4" /> Leave League
                </Button>
            )}
            {league.createdBy === user.uid && (
                <Button
                    onClick={onDeleteLeague}
                    className="w-full bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/20 rounded-lg flex items-center justify-center gap-2"
                >
                    <Trash2 className="w-4 h-4" /> Delete League
                </Button>
            )}
        </div>
    );
};

export default MembersTab;
