import { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  X,
  ExternalLink,
  Search,
  VolumeX,
  Volume2,
  Archive,
  Flag,
  Ban,
  Users,
  Image as ImageIcon,
  FileText,
  Download,
  Building2,
  MapPin,
  LogOut,
  Pin,
  Globe,
  ArrowRight,
  UserPlus,
  Shield,
  MoreVertical,
  Edit3,
  Trash2,
  ArrowLeft,
} from 'lucide-react';
import { messagingService } from '../../services/messagingService';
import { getUploadUrl } from '../../utils/courseUi';
import EcosystemRoleBadge from '../network/EcosystemRoleBadge';
import {
  getOtherParticipant,
  getConversationDisplayName,
  getConversationAvatar,
  getProfessionalContext,
  getUserDisplayName,
  getInitials,
  getUserId,
} from '../../utils/messagingIdentity';
import { getCanonicalProfileUrl } from '../../utils/roleNavigation';
import { useMessaging } from '../../context/MessagingContext';
import { useToast } from '../ui/Toast';
import AddGroupMemberModal from './AddGroupMemberModal';
import EditGroupModal from './EditGroupModal';

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ConversationContextPanel({
  conversation,
  messages = [],
  onClose,
  onOpenSearch,
  onToggleMute,
  onToggleArchive,
  onReport,
  onBlockUser,
  onLeaveGroup,
  onSelectImage,
  onJumpToMessage,
}) {
  const { currentUserId, formatUserPresence, isUserOnline, unpinMessage } = useMessaging();
  const isDirect =
    conversation?.type === 'DIRECT' ||
    conversation?.type === 'MESSAGE_REQUEST';

  const groupParticipants = useMemo(
    () => conversation?.participants || conversation?.members || [],
    [conversation?.participants, conversation?.members],
  );

  const [activeMediaTab, setActiveMediaTab] = useState(
    !isDirect ? 'members' : 'pinned',
  );

  useEffect(() => {
    if (isDirect && activeMediaTab === 'members') {
      setActiveMediaTab('pinned');
    }
  }, [isDirect, activeMediaTab]);

  const convId = conversation?._id || conversation?.id;
  const { data: rawPinnedData } = useQuery({
    queryKey: ['pinned', convId],
    queryFn: () => messagingService.getPinnedMessages(convId),
    enabled: Boolean(convId),
    staleTime: 1000 * 15,
  });

  const pinnedList = useMemo(() => {
    if (Array.isArray(rawPinnedData?.pinned)) return rawPinnedData.pinned;
    if (Array.isArray(rawPinnedData)) return rawPinnedData;
    return [];
  }, [rawPinnedData]);

  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showEditGroupModal, setShowEditGroupModal] = useState(false);
  const [activeMemberActionMenuId, setActiveMemberActionMenuId] = useState(null);
  const queryClient = useQueryClient();
  const toast = useToast();

  const isCallerAdmin =
    conversation?.isAdmin ||
    conversation?.callerRole === 'ADMIN' ||
    (conversation?.createdBy && String(conversation.createdBy) === String(currentUserId));

  const handleUpdateRole = async (targetUserId, newRole) => {
    try {
      await messagingService.updateGroupMemberRole(convId, targetUserId, newRole);
      toast.success('Role Updated', `Member role updated to ${newRole}.`);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversation', convId] });
      setActiveMemberActionMenuId(null);
    } catch (err) {
      toast.error('Failed to update role', err.response?.data?.message || 'Action failed');
    }
  };

  const handleRemoveMember = async (targetUserId, targetName) => {
    try {
      await messagingService.removeGroupMember(convId, targetUserId);
      toast.success('Member Removed', `${targetName} removed from group.`);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversation', convId] });
      setActiveMemberActionMenuId(null);
    } catch (err) {
      toast.error('Failed to remove member', err.response?.data?.message || 'Action failed');
    }
  };

  const filteredMembers = useMemo(() => {
    if (!memberSearchQuery.trim()) return groupParticipants;
    const q = memberSearchQuery.toLowerCase();
    return groupParticipants.filter((p) => {
      const name = (getUserDisplayName(p) || '').toLowerCase();
      const uname = (p?.username || '').toLowerCase();
      return name.includes(q) || uname.includes(q);
    });
  }, [groupParticipants, memberSearchQuery]);

  const otherUser = isDirect
    ? getOtherParticipant(conversation, currentUserId)
    : null;
  const displayName = getConversationDisplayName(conversation, currentUserId);
  const avatarUrl = getConversationAvatar(conversation, currentUserId);
  const initials = getInitials(displayName);
  const otherId = getUserId(otherUser);
  const isOnline = isDirect && otherId && isUserOnline(otherId);
  const presenceText = isDirect
    ? formatUserPresence(otherId, false, otherUser)
    : null;
  const isMuted = Boolean(conversation?.isMuted);
  const isArchived = Boolean(conversation?.isArchived);
  const professionalContext = isDirect
    ? getProfessionalContext(otherUser)
    : null;
  const username =
    isDirect && otherUser?.username
      ? `@${otherUser.username.replace(/^@/, '')}`
      : null;

  // Extract shared media & files from messages
  const allAttachments = useMemo(() => {
    const list = [];
    messages.forEach((m) => {
      if (m.attachments && Array.isArray(m.attachments)) {
        m.attachments.forEach((a) => {
          list.push({
            ...a,
            messageId: m._id || m.id,
            createdAt: m.createdAt,
          });
        });
      }
    });
    return list;
  }, [messages]);

  const mediaList = useMemo(() => {
    return allAttachments.filter(
      (a) =>
        a.type === 'image' || a.url?.match(/\.(jpeg|jpg|png|webp|gif)$/i),
    );
  }, [allAttachments]);

  const fileList = useMemo(() => {
    return allAttachments.filter(
      (a) =>
        a.type !== 'image' && !a.url?.match(/\.(jpeg|jpg|png|webp|gif)$/i),
    );
  }, [allAttachments]);

  // Extract safe links from messages
  const linkList = useMemo(() => {
    const list = [];
    messages.forEach((m) => {
      if (m.body && !m.isDeleted) {
        const matches = m.body.match(/https?:\/\/[^\s]+/gi);
        if (matches) {
          matches.forEach((url) => {
            try {
              const parsed = new URL(url);
              if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
                list.push({
                  url: parsed.href,
                  domain: parsed.hostname,
                  messageSnippet: m.body.slice(0, 100),
                  messageId: m._id || m.id,
                  sender: m.senderId,
                  createdAt: m.createdAt,
                });
              }
            } catch {
              // Ignore malformed URLs
            }
          });
        }
      }
    });
    return list;
  }, [messages]);

  return (
    <aside
      className="w-full xl:w-80 h-full bg-[#0A0F1A] border-l border-white/[0.08] flex flex-col shrink-0 overflow-y-auto"
      role="complementary"
      aria-label="Conversation details"
    >
      {/* ── Top Header ── */}
      <div className="p-4 border-b border-white/[0.08] flex items-center justify-between shrink-0 bg-[#0C121E]/90 backdrop-blur-md pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="sm:hidden min-h-[44px] min-w-[44px] -ml-2 flex items-center justify-center rounded-xl text-text-muted hover:text-white hover:bg-white/[0.06] transition-colors"
            aria-label="Back to conversation"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-text-muted">
            Conversation Info
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-text-muted hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
          aria-label="Close details panel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-5 pb-[max(2rem,env(safe-area-inset-bottom))] space-y-6 flex-1">
        {/* ── Identity Profile Card ── */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="relative">
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center overflow-hidden font-heading font-black text-xl shadow-xl transition-all ${
                isOnline
                  ? 'ring-2 ring-brand-mint/70 ring-offset-4 ring-offset-[#0A0F1A]'
                  : 'border-2 border-white/[0.1]'
              } ${
                avatarUrl
                  ? 'bg-white/[0.05]'
                  : 'bg-gradient-to-br from-[#1C2638] to-[#0E1524] text-brand-mint shadow-inner'
              }`}
            >
              {avatarUrl ? (
                <img
                  src={getUploadUrl(avatarUrl)}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : isDirect ? (
                <span className="tracking-wider">{initials}</span>
              ) : (
                <Users className="w-9 h-9 text-brand-mint" />
              )}
            </div>
            {isOnline && (
              <span
                className="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full border-2 border-[#0A0F1A] bg-brand-mint shadow-sm"
                title="Online"
                aria-label="Active now"
              />
            )}
          </div>

          <div className="space-y-1 w-full">
            <h4 className="text-base font-heading font-black text-white tracking-tight truncate">
              {displayName}
            </h4>

            {isDirect && (
              <>
                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                  {username && (
                    <span className="text-xs font-mono text-text-muted">
                      {username}
                    </span>
                  )}
                  {otherUser?.role && (
                    <EcosystemRoleBadge role={otherUser.role} size="xs" />
                  )}
                </div>

                {professionalContext && (
                  <p className="text-xs text-text-secondary leading-relaxed px-2">
                    {professionalContext}
                  </p>
                )}

                {/* Organization & Location if available */}
                {(otherUser?.organization || otherUser?.location) && (
                  <div className="flex flex-col items-center gap-1 pt-1 text-[11px] text-text-muted">
                    {otherUser?.organization && (
                      <div className="flex items-center gap-1.5 truncate max-w-full">
                        <Building2 className="w-3 h-3 text-text-faint shrink-0" />
                        <span className="truncate">{otherUser.organization}</span>
                      </div>
                    )}
                    {otherUser?.location && (
                      <div className="flex items-center gap-1.5 truncate max-w-full">
                        <MapPin className="w-3 h-3 text-text-faint shrink-0" />
                        <span className="truncate">{otherUser.location}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Presence pill */}
                <div className="pt-1.5">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono ${
                      isOnline
                        ? 'bg-brand-mint/15 text-brand-mint border border-brand-mint/30'
                        : 'bg-white/[0.03] text-text-muted border border-white/[0.06]'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isOnline ? 'bg-brand-mint animate-pulse' : 'bg-text-faint'
                      }`}
                    />
                    <span>{presenceText}</span>
                  </span>
                </div>
              </>
            )}

            {!isDirect && (
              <div className="space-y-1.5 pt-1">
                <p className="text-xs text-text-muted">
                  {conversation?.participants?.length || 0} participants in workspace
                </p>
                {conversation?.description && (
                  <p className="text-xs text-slate-300 leading-relaxed px-2.5 py-1.5 bg-white/[0.03] rounded-lg border border-white/5 italic">
                    "{conversation.description}"
                  </p>
                )}
                {isCallerAdmin && (
                  <button
                    type="button"
                    onClick={() => setShowEditGroupModal(true)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Edit Group Details</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Primary Profile Action */}
          {isDirect && otherUser && (
            <div className="w-full pt-2">
              <Link
                to={getCanonicalProfileUrl(otherUser)}
                className="w-full py-2.5 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/[0.08] text-xs font-semibold transition-all inline-flex items-center justify-center gap-2 shadow-sm focus-ring cursor-pointer"
              >
                <span>View Canonical Profile</span>
                <ExternalLink className="w-3.5 h-3.5 text-text-muted" />
              </Link>
            </div>
          )}
        </div>

        {/* ── Quick Conversation Actions ── */}
        <div className="space-y-1 pt-2 border-t border-white/[0.06]">
          <h5 className="text-[11px] font-mono uppercase tracking-wider text-text-faint px-1 mb-2">
            Conversation Controls
          </h5>

          <button
            type="button"
            onClick={onOpenSearch}
            className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/[0.04] text-xs text-text-secondary hover:text-white transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <Search className="w-4 h-4 text-text-muted group-hover:text-brand-mint transition-colors" />
              <span>Search in conversation</span>
            </div>
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/[0.04] text-xs text-text-secondary hover:text-white transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              {isMuted ? (
                <Volume2 className="w-4 h-4 text-brand-mint" />
              ) : (
                <VolumeX className="w-4 h-4 text-text-muted group-hover:text-white transition-colors" />
              )}
              <span>{isMuted ? 'Unmute Notifications' : 'Mute Notifications'}</span>
            </div>
            {isMuted && (
              <span className="text-[10px] font-mono text-brand-mint font-bold">
                Muted
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onToggleArchive}
            className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/[0.04] text-xs text-text-secondary hover:text-white transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <Archive className="w-4 h-4 text-text-muted group-hover:text-white transition-colors" />
              <span>{isArchived ? 'Unarchive Conversation' : 'Archive Conversation'}</span>
            </div>
          </button>
        </div>

        {/* ── Information Hub (Members, Pinned, Media, Files, Links) ── */}
        <div className="space-y-3 pt-2 border-t border-white/[0.06]">
          <div className="flex items-center justify-between px-1">
            <h5 className="text-[11px] font-mono uppercase tracking-wider text-text-faint">
              Hub
            </h5>
            <div
              className="flex items-center gap-1 bg-white/[0.03] p-0.5 rounded-lg border border-white/[0.06] overflow-x-auto no-scrollbar"
              role="tablist"
              aria-label="Workspace Information Hub"
            >
              {!isDirect && (
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeMediaTab === 'members'}
                  onClick={() => setActiveMediaTab('members')}
                  className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    activeMediaTab === 'members'
                      ? 'bg-white/10 text-white shadow-sm'
                      : 'text-text-muted hover:text-white'
                  }`}
                >
                  Members ({groupParticipants.length})
                </button>
              )}
              <button
                type="button"
                role="tab"
                aria-selected={activeMediaTab === 'pinned'}
                onClick={() => setActiveMediaTab('pinned')}
                className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  activeMediaTab === 'pinned'
                    ? 'bg-white/10 text-white shadow-sm'
                    : 'text-text-muted hover:text-white'
                }`}
              >
                Pinned ({pinnedList.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeMediaTab === 'media'}
                onClick={() => setActiveMediaTab('media')}
                className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  activeMediaTab === 'media'
                    ? 'bg-white/10 text-white shadow-sm'
                    : 'text-text-muted hover:text-white'
                }`}
              >
                Media ({mediaList.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeMediaTab === 'files'}
                onClick={() => setActiveMediaTab('files')}
                className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  activeMediaTab === 'files'
                    ? 'bg-white/10 text-white shadow-sm'
                    : 'text-text-muted hover:text-white'
                }`}
              >
                Files ({fileList.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeMediaTab === 'links'}
                onClick={() => setActiveMediaTab('links')}
                className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  activeMediaTab === 'links'
                    ? 'bg-white/10 text-white shadow-sm'
                    : 'text-text-muted hover:text-white'
                }`}
              >
                Links ({linkList.length})
              </button>
            </div>
          </div>

          {/* 0. Group Members Tab (Group Chats) */}
          {!isDirect && activeMediaTab === 'members' && (
            <div className="space-y-2.5" role="tabpanel">
              {/* Member Search and Add Member Bar */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={memberSearchQuery}
                    onChange={(e) => setMemberSearchQuery(e.target.value)}
                    placeholder="Search members…"
                    className="w-full pl-8 pr-2.5 py-1.5 bg-white/[0.03] border border-white/10 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
                  />
                </div>
                {isCallerAdmin && (
                  <button
                    type="button"
                    onClick={() => setShowAddMemberModal(true)}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                )}
              </div>

              {filteredMembers.length === 0 ? (
                <div className="p-6 text-center text-xs text-text-muted bg-white/[0.01] rounded-2xl border border-white/[0.04]">
                  <Users className="w-5 h-5 mx-auto mb-1.5 opacity-30 text-brand-mint" />
                  <span>No matching members</span>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {filteredMembers.map((p, idx) => {
                    const name = getUserDisplayName(p);
                    const pId = getUserId(p);
                    const isMe = pId === String(currentUserId);
                    const pAvatar = p?.avatar ? getUploadUrl(p.avatar) : null;
                    const pOnline = isUserOnline(pId);
                    const role = p?.role || p?.primaryRole || 'STUDENT';

                    const memberRecord = (conversation?.members || []).find(
                      (m) => String(m.userId) === pId,
                    );
                    const isCreator =
                      conversation?.createdBy &&
                      String(conversation.createdBy) === pId;
                    const isMemberAdmin = isCreator || memberRecord?.role === 'ADMIN';

                    return (
                      <div
                        key={pId || idx}
                        className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="relative shrink-0">
                            <div className="w-8 h-8 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center overflow-hidden text-brand-mint text-[11px] font-bold">
                              {pAvatar ? (
                                <img
                                  src={pAvatar}
                                  alt={name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span>{getInitials(name)}</span>
                              )}
                            </div>
                            {pOnline && (
                              <span
                                className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#0A0F1A] bg-brand-mint"
                                title="Online now"
                              />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-xs font-semibold text-white truncate">
                                {name}
                              </p>
                              {isMe && (
                                <span className="text-[10px] text-brand-mint font-bold">
                                  (You)
                                </span>
                              )}
                              {isCreator ? (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 uppercase font-mono font-bold tracking-wider">
                                  Owner
                                </span>
                              ) : isMemberAdmin ? (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 uppercase font-mono font-bold tracking-wider">
                                  Admin
                                </span>
                              ) : null}
                            </div>
                            <EcosystemRoleBadge role={role} size="xs" />
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {/* Admin action menu */}
                          {isCallerAdmin && !isMe && !isCreator && (
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() =>
                                  setActiveMemberActionMenuId(
                                    activeMemberActionMenuId === pId ? null : pId,
                                  )
                                }
                                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                                title="Manage member"
                                aria-label="Manage member"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>

                              {activeMemberActionMenuId === pId && (
                                <div className="absolute right-0 top-full mt-1 w-40 bg-[#161822] border border-white/10 rounded-xl shadow-xl py-1 z-30 divide-y divide-white/5 text-xs">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleUpdateRole(
                                        pId,
                                        isMemberAdmin ? 'MEMBER' : 'ADMIN',
                                      )
                                    }
                                    className="w-full text-left min-h-[44px] px-3.5 py-2.5 text-slate-300 hover:bg-white/5 transition-colors flex items-center gap-2"
                                  >
                                    <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
                                    <span>
                                      {isMemberAdmin ? 'Make Member' : 'Make Admin'}
                                    </span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveMember(pId, name)}
                                    className="w-full text-left min-h-[44px] px-3.5 py-2.5 text-rose-400 hover:bg-rose-500/10 transition-colors flex items-center gap-2"
                                  >
                                    <Trash2 className="w-4 h-4 shrink-0" />
                                    <span>Remove</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                          {!isMe && p && (
                            <Link
                              to={getCanonicalProfileUrl(p)}
                              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-text-muted hover:text-white hover:bg-white/[0.06] transition-colors"
                              title={`View ${name}'s profile`}
                              aria-label={`View ${name}'s profile`}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 1. Pinned Tab */}
          {activeMediaTab === 'pinned' && (
            pinnedList.length === 0 ? (
              <div className="p-6 text-center text-xs text-text-muted bg-white/[0.01] rounded-2xl border border-white/[0.04]">
                <Pin className="w-5 h-5 mx-auto mb-1.5 opacity-30 text-brand-gold" />
                <span>No pinned messages</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1" role="tabpanel">
                {pinnedList.map((m) => {
                  const sName = m.senderId?.name || (m.senderId?.username ? `@${m.senderId.username}` : 'Member');
                  return (
                    <div
                      key={m._id || m.id}
                      className="p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] space-y-1.5 text-left group transition-all"
                    >
                      <div className="flex items-center justify-between gap-1 text-[11px]">
                        <span className="font-bold text-white truncate">{sName}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => onJumpToMessage?.(m._id || m.id)}
                            className="p-1 min-w-[28px] min-h-[28px] flex items-center justify-center text-brand-mint hover:bg-white/[0.08] rounded-lg transition-colors cursor-pointer"
                            title="Jump to message"
                            aria-label="Jump to message"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => unpinMessage(convId, m._id || m.id)}
                            className="p-1 min-w-[28px] min-h-[28px] flex items-center justify-center text-text-muted hover:text-red-400 hover:bg-white/[0.08] rounded-lg transition-colors cursor-pointer"
                            title="Unpin message"
                            aria-label="Unpin message"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">
                        {m.body || 'Shared an attachment'}
                      </p>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* 2. Media Tab */}
          {activeMediaTab === 'media' && (
            mediaList.length === 0 ? (
              <div className="p-6 text-center text-xs text-text-muted bg-white/[0.01] rounded-2xl border border-white/[0.04]">
                <ImageIcon className="w-6 h-6 mx-auto mb-1.5 opacity-30 text-text-muted" />
                <span>No images shared yet</span>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1.5 max-h-48 overflow-y-auto" role="tabpanel">
                {mediaList.map((m, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onSelectImage?.(getUploadUrl(m.url))}
                    className="aspect-square rounded-xl overflow-hidden border border-white/[0.08] hover:border-brand-mint/50 transition-all cursor-pointer group bg-black/20"
                    aria-label={m.name || 'Shared image'}
                  >
                    <img
                      src={getUploadUrl(m.url)}
                      alt={m.name || 'Shared media'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            )
          )}

          {/* 3. Files Tab */}
          {activeMediaTab === 'files' && (
            fileList.length === 0 ? (
              <div className="p-6 text-center text-xs text-text-muted bg-white/[0.01] rounded-2xl border border-white/[0.04]">
                <FileText className="w-6 h-6 mx-auto mb-1.5 opacity-30 text-text-muted" />
                <span>No documents shared yet</span>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto" role="tabpanel">
                {fileList.map((f, idx) => (
                  <a
                    key={idx}
                    href={getUploadUrl(f.url)}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] flex items-center justify-between gap-2 text-xs text-text-secondary hover:text-white transition-all group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-brand-mint shrink-0" />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-xs">{f.name}</p>
                        {f.size > 0 && (
                          <p className="text-[10px] text-text-faint font-mono">
                            {formatFileSize(f.size)}
                          </p>
                        )}
                      </div>
                    </div>
                    <Download className="w-3.5 h-3.5 text-text-muted group-hover:text-white shrink-0" />
                  </a>
                ))}
              </div>
            )
          )}

          {/* 4. Links Tab */}
          {activeMediaTab === 'links' && (
            linkList.length === 0 ? (
              <div className="p-6 text-center text-xs text-text-muted bg-white/[0.01] rounded-2xl border border-white/[0.04]">
                <Globe className="w-6 h-6 mx-auto mb-1.5 opacity-30 text-brand-mint" />
                <span>No links shared yet</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1" role="tabpanel">
                {linkList.map((l, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] space-y-1.5 text-left group transition-all"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="px-1.5 py-0.5 rounded bg-brand-mint/10 text-brand-mint text-[10px] font-mono font-bold truncate">
                        {l.domain}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onJumpToMessage?.(l.messageId)}
                          className="p-1 min-w-[28px] min-h-[28px] flex items-center justify-center text-text-muted hover:text-white hover:bg-white/[0.08] rounded-lg transition-colors cursor-pointer"
                          title="Jump to message"
                          aria-label="Jump to source message"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                        <a
                          href={l.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="p-1 min-w-[28px] min-h-[28px] flex items-center justify-center text-text-muted hover:text-brand-mint hover:bg-white/[0.08] rounded-lg transition-colors"
                          title="Open link"
                          aria-label="Open link in new tab"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                    <p className="text-[11px] text-text-muted font-mono truncate">{l.url}</p>
                    {l.messageSnippet && (
                      <p className="text-xs text-text-secondary leading-relaxed line-clamp-1 italic">
                        "{l.messageSnippet}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        {/* ── Privacy & Safety Section ── */}
        <div className="space-y-1 pt-2 border-t border-white/[0.06]">
          <h5 className="text-[11px] font-mono uppercase tracking-wider text-text-faint px-1 mb-2">
            Safety & Moderation
          </h5>

          <button
            type="button"
            onClick={onReport}
            className="w-full flex items-center gap-2.5 p-2.5 rounded-xl text-xs text-text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer text-left"
          >
            <Flag className="w-4 h-4" />
            <span>Report Conversation</span>
          </button>

          {isDirect && otherId && (
            <button
              type="button"
              onClick={onBlockUser}
              className="w-full flex items-center gap-2.5 p-2.5 rounded-xl text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer text-left"
            >
              <Ban className="w-4 h-4" />
              <span>Block User</span>
            </button>
          )}

          {!isDirect && (
            <button
              type="button"
              onClick={onLeaveGroup}
              className="w-full flex items-center gap-2.5 p-2.5 rounded-xl text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer text-left"
            >
              <LogOut className="w-4 h-4" />
              <span>Leave Group Workspace</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      <AddGroupMemberModal
        isOpen={showAddMemberModal}
        conversation={conversation}
        onClose={() => setShowAddMemberModal(false)}
      />

      <EditGroupModal
        isOpen={showEditGroupModal}
        conversation={conversation}
        onClose={() => setShowEditGroupModal(false)}
      />
    </aside>
  );
}
