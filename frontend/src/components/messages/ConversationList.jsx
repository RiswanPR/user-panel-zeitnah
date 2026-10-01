import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  MessageSquarePlus,
  Users,
  Archive,
  Inbox,
  VolumeX,
  Sparkles,
  Loader2,
  X,
  Paperclip,
  CheckCheck,
  Check,
  Edit3,
  Bookmark,
} from 'lucide-react';
import { messagingService } from '../../services/messagingService';
import { useMessaging } from '../../context/MessagingContext';
import SavedMessagesView from './SavedMessagesView';
import { getUploadUrl } from '../../utils/courseUi';
import EcosystemRoleBadge from '../network/EcosystemRoleBadge';
import {
  getOtherParticipant,
  getConversationDisplayName,
  getConversationAvatar,
  getProfessionalContext,
  getInitials,
  getUserId,
} from '../../utils/messagingIdentity';
import { getConversationDraft, hasConversationDraft } from '../../utils/messagingDrafts';

function formatTimestamp(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' });
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function ConversationList({
  activeTab,
  onTabChange,
  selectedConversationId,
  onSelectConversation,
  onNewChat,
  onNewGroup,
  onOpenCommandPalette,
  subFilter = 'all',
  onSubFilterChange,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [localSubFilter, setLocalSubFilter] = useState(subFilter);
  const searchInputRef = useRef(null);

  const { unreadCounts, isUserOnline, formatUserPresence, currentUserId, setTargetMessageId } =
    useMessaging();

  const currentSubFilter = onSubFilterChange ? subFilter : localSubFilter;
  const handleSubFilterSelect = (filterId) => {
    if (onSubFilterChange) {
      onSubFilterChange(filterId);
    } else {
      setLocalSubFilter(filterId);
    }
  };

  // ── Keyboard shortcut: ⌘K or / to open Command Palette or focus search ──
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (onOpenCommandPalette) {
          onOpenCommandPalette();
        } else {
          searchInputRef.current?.focus();
        }
      } else if (
        e.key === '/' &&
        document.activeElement !== searchInputRef.current &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenCommandPalette]);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 200);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Synchronize draft changes in real time across the conversation list
  const [, setDraftTick] = useState(0);
  useEffect(() => {
    const handleDraftUpdate = () => {
      setDraftTick((prev) => prev + 1);
    };
    window.addEventListener('zeitnah-draft-updated', handleDraftUpdate);
    window.addEventListener('storage', handleDraftUpdate);
    return () => {
      window.removeEventListener('zeitnah-draft-updated', handleDraftUpdate);
      window.removeEventListener('storage', handleDraftUpdate);
    };
  }, []);

  const effectiveTab =
    activeTab === 'chats' && currentSubFilter === 'mentions'
      ? 'mentions'
      : activeTab;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['conversations', { tab: effectiveTab, q: debouncedQuery }],
    queryFn: () =>
      messagingService.getConversations({ tab: effectiveTab, q: debouncedQuery }),
    staleTime: 1000 * 10,
    refetchOnWindowFocus: false,
  });

  const rawConversations = useMemo(
    () => data?.conversations || [],
    [data?.conversations],
  );

  // Client-side filtering by query and subfilter chip
  const conversations = useMemo(() => {
    let list = rawConversations;

    // Subfilter (for 'chats' tab)
    if (activeTab === 'chats' && currentSubFilter !== 'all') {
      if (currentSubFilter === 'unread') {
        list = list.filter((c) => (c.unreadCount || 0) > 0);
      } else if (currentSubFilter === 'direct') {
        list = list.filter(
          (c) => c.type === 'DIRECT' || c.type === 'MESSAGE_REQUEST',
        );
      } else if (currentSubFilter === 'groups') {
        list = list.filter((c) => c.type === 'GROUP');
      }
    }

    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase().trim();
    return list.filter((conv) => {
      const name = getConversationDisplayName(conv, currentUserId).toLowerCase();
      const other = getOtherParticipant(conv, currentUserId);
      const username = other?.username ? String(other.username).toLowerCase() : '';
      const headline = other?.headline ? String(other.headline).toLowerCase() : '';
      const lastMsg = conv.lastMessage?.body
        ? String(conv.lastMessage.body).toLowerCase()
        : '';
      return (
        name.includes(q) ||
        username.includes(q) ||
        headline.includes(q) ||
        lastMsg.includes(q)
      );
    });
  }, [rawConversations, currentSubFilter, activeTab, searchQuery, currentUserId]);

  const unreadChatsCount = useMemo(() => {
    return rawConversations.filter((c) => (c.unreadCount || 0) > 0).length;
  }, [rawConversations]);

  return (
    <div
      className="flex flex-col h-full bg-[#080C14] border-r border-white/[0.08]"
      role="region"
      aria-label="Conversation list"
    >
      {/* ── Top Header & Actions ── */}
      <div className="p-3.5 sm:p-4 border-b border-white/[0.08] space-y-3 shrink-0 bg-[#0C121E]/95 backdrop-blur-md pt-[max(0.875rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[10px] font-mono tracking-widest uppercase text-text-muted/80">
              Zeitnah
            </span>
            <span className="text-white/20 font-light text-xs">/</span>
            <h2 className="text-base sm:text-lg font-heading font-black text-white tracking-tight">
              Messages
            </h2>
            {unreadCounts?.unreadMessages > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-brand-mint/15 text-brand-mint border border-brand-mint/30 text-[10px] font-mono font-bold tracking-tight">
                {unreadCounts.unreadMessages}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onOpenCommandPalette}
              className="rounded-xl text-text-muted hover:text-white hover:bg-white/[0.06] transition-colors focus-ring cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="Search Messages (⌘K)"
              aria-label="Search messages"
            >
              <Search className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onNewGroup}
              className="rounded-xl text-text-muted hover:text-white hover:bg-white/[0.06] transition-colors focus-ring cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="New Group Workspace"
              aria-label="Create new group chat"
            >
              <Users className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onNewChat}
              className="rounded-xl bg-brand-mint/15 text-brand-mint hover:bg-brand-mint/25 transition-colors focus-ring cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center shadow-sm"
              title="New Direct Message"
              aria-label="Start new direct message"
            >
              <MessageSquarePlus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Main Folder Tabs (Chats, Requests, Saved, Archived) ── */}
        <div
          className="grid grid-cols-4 gap-1 bg-white/[0.03] p-1 rounded-xl border border-white/[0.06]"
          role="tablist"
          aria-label="Message folders"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'chats'}
            onClick={() => onTabChange('chats')}
            className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg text-xs font-semibold transition-all cursor-pointer min-h-[36px] ${
              activeTab === 'chats'
                ? 'bg-white/10 text-white shadow-sm font-bold'
                : 'text-text-muted hover:text-white'
            }`}
          >
            <Inbox className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Chats</span>
            {unreadCounts?.unreadMessages > 0 && (
              <span className="min-w-4 h-4 px-1 rounded-full bg-brand-mint text-bg-base text-[10px] font-bold flex items-center justify-center shrink-0">
                {unreadCounts.unreadMessages > 99
                  ? '99+'
                  : unreadCounts.unreadMessages}
              </span>
            )}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'requests'}
            onClick={() => onTabChange('requests')}
            className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg text-xs font-semibold transition-all cursor-pointer min-h-[36px] ${
              activeTab === 'requests'
                ? 'bg-white/10 text-white shadow-sm font-bold'
                : 'text-text-muted hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Requests</span>
            {unreadCounts?.unreadRequests > 0 && (
              <span className="min-w-4 h-4 px-1 rounded-full bg-brand-gold text-bg-base text-[10px] font-bold flex items-center justify-center shrink-0">
                {unreadCounts.unreadRequests}
              </span>
            )}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'saved'}
            onClick={() => onTabChange('saved')}
            className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg text-xs font-semibold transition-all cursor-pointer min-h-[36px] ${
              activeTab === 'saved'
                ? 'bg-white/10 text-white shadow-sm font-bold'
                : 'text-text-muted hover:text-white'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Saved</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'archived'}
            onClick={() => onTabChange('archived')}
            className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg text-xs font-semibold transition-all cursor-pointer min-h-[36px] ${
              activeTab === 'archived'
                ? 'bg-white/10 text-white shadow-sm font-bold'
                : 'text-text-muted hover:text-white'
            }`}
          >
            <Archive className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Archive</span>
          </button>
        </div>

        {/* ── Search Command Bar ── */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations, names, handles..."
            className="w-full pl-9 pr-14 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] focus:border-brand-mint/40 text-xs text-white placeholder-text-muted focus:outline-none transition-colors min-h-[40px]"
            aria-label="Search conversations"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {isFetching ? (
              <Loader2 className="w-3.5 h-3.5 text-brand-mint animate-spin" />
            ) : searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="p-1 rounded-lg text-text-muted hover:text-white hover:bg-white/[0.06] transition-colors"
                aria-label="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenCommandPalette}
                className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-text-faint bg-white/[0.04] border border-white/[0.08] rounded hover:text-white hover:bg-white/[0.08] cursor-pointer"
                title="Open Command Palette (⌘K)"
              >
                ⌘K
              </button>
            )}
          </div>
        </div>

        {/* ── Subfilter Chips (All, Unread, Mentions, Direct, Groups) ── */}
        {activeTab === 'chats' && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
            {[
              { id: 'all', label: 'All' },
              {
                id: 'unread',
                label: 'Unread',
                count: unreadChatsCount,
              },
              { id: 'mentions', label: '@ Mentions' },
              { id: 'direct', label: 'Direct' },
              { id: 'groups', label: 'Groups' },
            ].map((f) => {
              const active = currentSubFilter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => handleSubFilterSelect(f.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all shrink-0 cursor-pointer flex items-center gap-1 min-h-[32px] ${
                    active
                      ? 'bg-brand-mint/15 text-brand-mint border border-brand-mint/30 font-semibold'
                      : 'bg-white/[0.02] text-text-muted hover:text-white border border-white/[0.05]'
                  }`}
                >
                  <span>{f.label}</span>
                  {Boolean(f.count) && f.count > 0 && (
                    <span className="min-w-3.5 h-3.5 px-1 rounded-full bg-brand-mint text-bg-base text-[9px] font-extrabold flex items-center justify-center">
                      {f.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Conversations Scroll Area OR Saved Messages View ── */}
      {activeTab === 'saved' ? (
        <div className="flex-1 overflow-hidden flex flex-col">
          <SavedMessagesView
            onSelectMessage={(cId, mId) => {
              onSelectConversation({ _id: cId });
              setTargetMessageId(mId);
            }}
          />
        </div>
      ) : (
        <div
          className="flex-1 overflow-y-auto divide-y divide-white/[0.04]"
          role="list"
          aria-label="Conversations"
        >
        {isLoading ? (
          <div className="p-3 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/[0.04] animate-pulse"
              >
                <div className="w-11 h-11 rounded-full bg-white/[0.05] shrink-0" />
                <div className="flex-1 space-y-2 min-w-0">
                  <div className="h-3.5 bg-white/[0.06] rounded w-2/3" />
                  <div className="h-3 bg-white/[0.03] rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-8 text-center my-auto">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mx-auto mb-3 text-text-muted">
              {activeTab === 'requests' ? (
                <Sparkles className="w-6 h-6 text-brand-gold/70" />
              ) : activeTab === 'archived' ? (
                <Archive className="w-6 h-6" />
              ) : (
                <Inbox className="w-6 h-6 text-brand-mint/70" />
              )}
            </div>
            <h4 className="text-sm font-bold text-white mb-1 tracking-tight">
              {searchQuery
                ? 'Nothing found.'
                : activeTab === 'requests'
                ? "You're all caught up."
                : activeTab === 'archived'
                ? 'No archived conversations'
                : 'Your conversations start here.'}
            </h4>
            <p className="text-xs text-text-muted max-w-[240px] mx-auto leading-relaxed">
              {searchQuery
                ? 'Try another name, conversation, or keyword.'
                : activeTab === 'requests'
                ? 'When someone outside your connections messages you, it appears here for review.'
                : activeTab === 'archived'
                ? 'Archive conversations to keep your primary inbox organized and clutter-free.'
                : 'Connect with people across Zeitnah.'}
            </p>
            {activeTab === 'chats' && !searchQuery && (
              <button
                type="button"
                onClick={onNewChat}
                className="mt-4 px-4 py-2 rounded-xl bg-brand-mint text-bg-base text-xs font-bold hover:bg-brand-mint/90 transition-all cursor-pointer shadow-md inline-flex items-center gap-1.5 focus-ring min-h-[40px]"
              >
                <MessageSquarePlus className="w-3.5 h-3.5" />
                <span>Start Direct Message</span>
              </button>
            )}
          </div>
        ) : (
          conversations.map((conv) => {
            const convId = conv._id || conv.id;
            const isSelected = String(convId) === String(selectedConversationId);
            const isDirect =
              conv.type === 'DIRECT' || conv.type === 'MESSAGE_REQUEST';
            const otherUser = isDirect
              ? getOtherParticipant(conv, currentUserId)
              : null;
            const displayName = getConversationDisplayName(conv, currentUserId);
            const avatarUrl = getConversationAvatar(conv, currentUserId);
            const initials = getInitials(displayName);
            const otherId = getUserId(otherUser);
            const isOnline = isDirect && otherId && isUserOnline(otherId);
            const presenceTooltip = isDirect && otherId
              ? formatUserPresence(otherId, false, otherUser)
              : '';
            const unreadCount = conv.unreadCount || 0;
            const lastMsg = conv.lastMessage;
            const isMuted = Boolean(conv.isMuted);
            const professionalContext = isDirect
              ? getProfessionalContext(otherUser)
              : null;
            const username =
              isDirect && otherUser?.username
                ? `@${otherUser.username.replace(/^@/, '')}`
                : null;

            const isLastMsgOwn =
              lastMsg?.senderId &&
              String(lastMsg.senderId?._id || lastMsg.senderId) ===
                String(currentUserId);

            // Draft persistence check
            const draftText = getConversationDraft(convId);
            const hasDraft = hasConversationDraft(convId);

            return (
              <button
                key={convId}
                type="button"
                role="listitem"
                onClick={() => onSelectConversation(conv)}
                className={`w-full text-left p-3 sm:p-3.5 flex items-start gap-3 transition-all cursor-pointer group focus-ring border-l-2 relative min-h-[64px] ${
                  isSelected
                    ? 'bg-brand-mint/[0.08] border-brand-mint shadow-inner'
                    : unreadCount > 0
                    ? 'bg-white/[0.02] border-transparent hover:bg-white/[0.04]'
                    : 'border-transparent hover:bg-white/[0.03]'
                }`}
                aria-label={`Conversation with ${displayName}${
                  unreadCount > 0 ? `, ${unreadCount} unread messages` : ''
                }`}
              >
                {/* Avatar with Subtle Active Ring System */}
                <div className="relative shrink-0 mt-0.5">
                  <div
                    className={`w-11 h-11 rounded-full flex items-center justify-center overflow-hidden font-heading font-bold text-xs transition-all ${
                      isOnline
                        ? 'ring-2 ring-brand-mint/70 ring-offset-2 ring-offset-[#080C14]'
                        : 'border border-white/[0.08]'
                    } ${
                      avatarUrl
                        ? 'bg-white/[0.05]'
                        : 'bg-gradient-to-br from-[#1A2333] to-[#0D1424] text-brand-mint shadow-inner'
                    }`}
                  >
                    {avatarUrl ? (
                      <img
                        src={getUploadUrl(avatarUrl)}
                        alt={displayName}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : isDirect ? (
                      <span className="tracking-wider">{initials}</span>
                    ) : (
                      <Users className="w-5 h-5 text-brand-mint/80" />
                    )}
                  </div>
                  {isOnline && (
                    <span
                      className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#080C14] bg-brand-mint shadow-sm"
                      title={presenceTooltip}
                      aria-label={presenceTooltip}
                    />
                  )}
                </div>

                {/* Identity & Message Preview */}
                <div className="min-w-0 flex-1 flex flex-col justify-center">
                  {/* Line 1: Name and Timestamp */}
                  <div className="flex items-baseline justify-between gap-2 mb-0.5">
                    <span
                      className={`text-xs sm:text-[13px] font-bold truncate ${
                        isSelected
                          ? 'text-brand-mint'
                          : unreadCount > 0
                          ? 'text-white font-extrabold'
                          : 'text-white/95'
                      }`}
                    >
                      {displayName}
                    </span>
                    {lastMsg?.createdAt && (
                      <span className="text-[10px] font-mono text-text-faint shrink-0 whitespace-nowrap">
                        {formatTimestamp(lastMsg.createdAt)}
                      </span>
                    )}
                  </div>

                  {/* Line 2: Role / Presence / Group Context */}
                  <div className="flex items-center gap-1.5 text-[11px] text-text-muted truncate mb-1">
                    {isDirect ? (
                      <>
                        {otherUser?.role && (
                          <span className="inline-flex items-center shrink-0">
                            <EcosystemRoleBadge role={otherUser.role} size="xs" />
                          </span>
                        )}
                        <span className="truncate flex items-center gap-1">
                          {isOnline ? (
                            <span className="text-brand-mint font-medium flex items-center gap-1 shrink-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-brand-mint animate-pulse" />
                              Online
                            </span>
                          ) : (
                            <span className="text-text-muted/80 truncate">
                              {professionalContext || username || 'Offline'}
                            </span>
                          )}
                        </span>
                      </>
                    ) : (
                      <span className="text-text-muted/80 truncate">
                        {conv.memberCount ||
                          conv.members?.length ||
                          conv.participants?.length ||
                          0}{' '}
                        members
                      </span>
                    )}
                  </div>

                  {/* Line 3: Last Message Preview + Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <div
                      className={`text-xs truncate flex items-center gap-1 min-w-0 flex-1 ${
                        unreadCount > 0
                          ? 'font-semibold text-white/90'
                          : 'text-text-muted'
                      }`}
                    >
                      {hasDraft && !isSelected ? (
                        <span className="text-amber-400 font-medium truncate flex items-center gap-1 text-xs">
                          <Edit3 className="w-3 h-3 text-amber-400 shrink-0" />
                          <span className="font-bold shrink-0">Draft:</span>
                          <span className="truncate">{draftText}</span>
                        </span>
                      ) : (
                        <>
                          {isLastMsgOwn && (
                            <span className="text-[11px] text-text-faint shrink-0 flex items-center gap-0.5">
                              <span>You:</span>
                              {lastMsg.status === 'read' ? (
                                <CheckCheck className="w-3 h-3 text-brand-mint inline" />
                              ) : lastMsg.status === 'delivered' ? (
                                <CheckCheck className="w-3 h-3 text-text-faint inline" />
                              ) : (
                                <Check className="w-3 h-3 text-text-faint inline" />
                              )}
                            </span>
                          )}

                          {lastMsg?.hasAttachments ||
                          lastMsg?.attachments?.length ? (
                            <span className="inline-flex items-center gap-1 text-text-secondary truncate">
                              <Paperclip className="w-3 h-3 text-brand-mint shrink-0" />
                              <span className="truncate">
                                {lastMsg.body || 'Attachment'}
                              </span>
                            </span>
                          ) : (
                            <span className="truncate">
                              {lastMsg?.body || 'No messages yet'}
                            </span>
                          )}
                        </>
                      )}
                    </div>

                    {/* Badges Container with Reserved Width & No Collisions */}
                    <div className="flex items-center gap-1.5 shrink-0 pl-1">
                      {isMuted && (
                        <VolumeX
                          className="w-3 h-3 text-text-faint shrink-0"
                          aria-label="Muted conversation"
                        />
                      )}
                      {lastMsg?.mentions?.some(
                        (m) =>
                          String(m.userId?._id || m.userId?.id || m.userId) ===
                          String(currentUserId),
                      ) && (
                        <span
                          className="px-1.5 py-0.2 rounded-full bg-brand-mint/15 text-brand-mint border border-brand-mint/30 font-mono text-[9px] font-bold shrink-0"
                          title="You were mentioned"
                        >
                          @
                        </span>
                      )}
                      {lastMsg?.threadReplyCount > 0 && (
                        <span
                          className="px-1.5 py-0.2 rounded-full bg-white/[0.06] text-text-muted font-mono text-[9px] flex items-center gap-0.5 shrink-0"
                          title={`${lastMsg.threadReplyCount} thread replies`}
                        >
                          💬 {lastMsg.threadReplyCount}
                        </span>
                      )}
                      {unreadCount > 0 && (
                        <span className="min-w-4 h-4 px-1.5 rounded-full bg-brand-mint text-bg-base text-[10px] font-extrabold flex items-center justify-center shadow-sm shrink-0">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
      )}
    </div>
  );
}
