import React, { useState } from 'react';
import { Users, Copy, Check, Trash2, Pencil, X, LogOut, Trophy, Archive } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { League, Season } from '../../types';
import { removeMember, updateUserDisplayName, updateLeagueAdmins, createSeason, archiveSeason } from '../../utils/firestore';
import type { User } from 'firebase/auth';

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
    isOwner: boolean;
    isAdmin: boolean;
    code: string;
    copiedCode: boolean;
    onCopyCode: () => void;
    onLeaveLeague: () => void;
    onDeleteLeague: () => void;
    onMembersChanged: (members: Member[]) => void;
}

const MembersTab: React.FC<MembersTabProps> = ({
    league, leagueId, user, members, isOwner, isAdmin,
    copiedCode, onCopyCode, onLeaveLeague, onDeleteLeague, onMembersChanged,
}) => {
    const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
    const [editingMemberName, setEditingMemberName] = useState('');
    const [showNewSeason, setShowNewSeason] = useState(false);
    const [newSeasonName, setNewSeasonName] = useState('');
    const [savingSeason, setSavingSeason] = useState(false);
    const [seasonError, setSeasonError] = useState('');

    const handleCreateSeason = async () => {
        const trimmed = newSeasonName.trim();
        if (!trimmed) return;
        setSavingSeason(true);
        setSeasonError('');
        try {
            await createSeason(leagueId, trimmed);
            setNewSeasonName('');
            setShowNewSeason(false);
        } catch (err) {
            console.error('[createSeason]', err);
            setSeasonError('Failed to create season. Please try again.');
        } finally {
            setSavingSeason(false);
        }
    };

    return (
        <div className="space-y-3">
            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
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
            </div>

            {/* Share section */}
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
                <p className="text-green-300/70 text-xs mt-2">Share this code with others so they can join your league.</p>
            </div>

            {/* Season Management — admin only */}
            {isAdmin && (
                <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Trophy className="w-4 h-4 text-yellow-400" />
                            <span className="text-white font-medium text-sm">Seasons</span>
                        </div>
                        {!league.activeSeasonId && !showNewSeason && (
                            <button
                                onClick={() => setShowNewSeason(true)}
                                className="text-xs text-green-400 hover:text-green-300 transition-colors"
                            >
                                + New Season
                            </button>
                        )}
                    </div>

                    {showNewSeason && (
                        <div className="flex gap-2 mb-3">
                            <input
                                type="text"
                                value={newSeasonName}
                                onChange={e => setNewSeasonName(e.target.value)}
                                placeholder='e.g. "Spring 2026"'
                                maxLength={30}
                                autoFocus
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && newSeasonName.trim()) {
                                        handleCreateSeason();
                                    }
                                }}
                                className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-green-400"
                            />
                            <button
                                onClick={() => {
                                    if (!newSeasonName.trim()) return;
                                    handleCreateSeason();
                                }}
                                disabled={!newSeasonName.trim() || savingSeason}
                                className="bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white text-sm px-3 py-2 rounded-lg transition-colors"
                            >
                                {savingSeason ? '…' : 'Start'}
                            </button>
                            <button
                                onClick={() => { setShowNewSeason(false); setNewSeasonName(''); }}
                                className="text-white/40 hover:text-white/70 px-1"
                            >
                                <X className="w-4 h-4" />
                            </button>
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

                        const active = seasons.find(s => s.id === league.activeSeasonId);
                        const archived = seasons.filter(s => s.status === 'archived').sort((a, b) => (b.endDate ?? 0) - (a.endDate ?? 0));

                        return (
                            <div className="space-y-2">
                                {active && (
                                    <div className="flex items-center justify-between bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
                                        <div>
                                            <span className="text-white text-sm font-medium">{active.name}</span>
                                            <span className="text-green-400 text-xs ml-2">Active</span>
                                        </div>
                                        <button
                                            onClick={async () => {
                                                if (confirm(`End "${active.name}"? You can start a new season afterwards.`)) {
                                                    setSeasonError('');
                                                    try {
                                                        await archiveSeason(leagueId, active.id);
                                                    } catch (err) {
                                                        console.error('[archiveSeason]', err);
                                                        setSeasonError('Failed to end season. Please try again.');
                                                    }
                                                }
                                            }}
                                            className="text-xs text-white/40 hover:text-yellow-400 transition-colors flex items-center gap-1"
                                        >
                                            <Archive className="w-3 h-3" /> End
                                        </button>
                                    </div>
                                )}
                                {archived.map(s => (
                                    <div key={s.id} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                                        <div>
                                            <span className="text-white/60 text-sm">{s.name}</span>
                                            <span className="text-white/25 text-xs ml-2">
                                                {new Date(s.startDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                                                {s.endDate && ` – ${new Date(s.endDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        );
                    })()}
                </div>
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
