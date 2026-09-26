import { useState, useEffect, useMemo } from 'react';
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
} from 'lucide-react';
import { messagingService } from '../../services/messagingService';
import { useMessaging } from '../../context/MessagingContext';
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
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const { unreadCounts, isUserOnline, currentUserId } = useMessaging();

  // Debounce search input to avoid query thrashing
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 250);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['conversations', { tab: activeTab, q: debouncedQuery }],
    queryFn: () =>
      messagingService.getConversations({ tab: activeTab, q: debouncedQuery }),
    staleTime: 1000 * 10,
    refetchOnWindowFocus: false,
  });

  const rawConversations = useMemo(() => data?.conversations || [], [data?.conversations]);

  // Client-side quick filter for instant keyboard feedback while debouncing
  const conversations = useMemo(() => {
    if (!searchQuery.trim()) return rawConversations;
    const q = searchQuery.toLowerCase().trim();
    return rawConversations.filter((conv) => {
      const name = getConversationDisplayName(conv, currentUserId).toLowerCase();
      const other = getOtherParticipant(conv, currentUserId);
      const username = other?.username ? String(other.username).toLowerCase() : '';
      const lastMsg = conv.lastMessage?.body ? String(conv.lastMessage.body).toLowerCase() : '';
      return name.includes(q) || username.includes(q) || lastMsg.includes(q);
    });
  }, [rawConversations, searchQuery, currentUserId]);

  return (
    <div
      className="flex flex-col h-full bg-[#0B0F19] border-r border-white/[0.08]"
      role="region"
      aria-label="Conversation list"
    >
      {/* ── Top Header & Actions ── */}
      <div className="p-3.5 sm:p-4 border-b border-white/[0.08] space-y-3 shrink-0 bg-[#0E1424]/90 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-heading font-black text-white tracking-tight">
              Messages
            </h2>
            {unreadCounts?.unreadMessages > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-brand-mint/15 text-brand-mint border border-brand-mint/25 text-[11px] font-bold">
                {unreadCounts.unreadMessages} new
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onNewGroup}
              className="p-2 rounded-xl text-text-muted hover:text-white hover:bg-white/[0.06] transition-colors focus-ring cursor-pointer"
              title="New Group Chat"
              aria-label="Create new group chat"
            >
              <Users className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onNewChat}
              className="p-2 rounded-xl bg-brand-mint/15 text-brand-mint hover:bg-brand-mint/25 transition-colors focus-ring cursor-pointer"
              title="New Direct Message"
              aria-label="Start new direct message"
            >
              <MessageSquarePlus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Tabs (Chats, Requests, Archived) ── */}
        <div
          className="grid grid-cols-3 gap-1 bg-white/[0.03] p-1 rounded-xl border border-white/[0.06]"
          role="tablist"
          aria-label="Message folders"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'chats'}
            onClick={() => onTabChange('chats')}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'chats'
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-text-muted hover:text-white'
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            <span>Chats</span>
            {unreadCounts?.unreadMessages > 0 && (
              <span className="min-w-4 h-4 px-1 rounded-full bg-brand-mint text-bg-base text-[10px] font-bold flex items-center justify-center">
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
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'requests'
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-text-muted hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Requests</span>
            {unreadCounts?.unreadRequests > 0 && (
              <span className="min-w-4 h-4 px-1 rounded-full bg-brand-gold text-bg-base text-[10px] font-bold flex items-center justify-center">
                {unreadCounts.unreadRequests}
              </span>
            )}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'archived'}
            onClick={() => onTabChange('archived')}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'archived'
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-text-muted hover:text-white'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            <span>Archived</span>
          </button>
        </div>

        {/* ── Search Input ── */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations by name, role, text..."
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] focus:border-brand-mint/40 text-xs text-white placeholder-text-muted focus:outline-none transition-colors"
            aria-label="Search conversations"
          />
          {isFetching ? (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-brand-mint animate-spin" />
          ) : searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-text-muted hover:text-white hover:bg-white/[0.06] transition-colors"
              aria-label="Clear search"
            >
              <X className="w-3 h-3" />
            </button>
          ) : null}
        </div>
      </div>

      {/* ── Conversations Scroll Area ── */}
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
                <div className="w-12 h-12 rounded-2xl bg-white/[0.05] shrink-0" />
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
                <Inbox className="w-6 h-6" />
              )}
            </div>
            <h4 className="text-sm font-bold text-white mb-1">
              {searchQuery
                ? 'No matching conversations'
                : activeTab === 'requests'
                ? 'No message requests'
                : activeTab === 'archived'
                ? 'No archived conversations'
                : 'No conversations yet'}
            </h4>
            <p className="text-xs text-text-muted max-w-[240px] mx-auto leading-relaxed">
              {searchQuery
                ? 'Try searching by a different name, username, or message preview.'
                : activeTab === 'requests'
                ? 'When someone outside your connections messages you, it appears here.'
                : activeTab === 'archived'
                ? 'You can archive conversations to keep your primary inbox organized.'
                : 'Connect with infrastructure professionals and start a discussion.'}
            </p>
            {activeTab === 'chats' && !searchQuery && (
              <button
                type="button"
                onClick={onNewChat}
                className="mt-4 px-4 py-2 rounded-xl bg-brand-mint text-bg-base text-xs font-bold hover:bg-brand-mint/90 transition-all cursor-pointer shadow-md inline-flex items-center gap-1.5"
              >
                <MessageSquarePlus className="w-3.5 h-3.5" />
                <span>Find Professionals</span>
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

            return (
              <button
                key={convId}
                type="button"
                role="listitem"
                onClick={() => onSelectConversation(conv)}
                className={`w-full text-left p-3.5 flex items-start gap-3 transition-all cursor-pointer group focus-ring border-l-2 ${
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
                {/* Avatar with Presence Indicator */}
                <div className="relative shrink-0 mt-0.5">
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center overflow-hidden text-brand-mint font-heading font-bold text-sm shadow-sm">
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
                      className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#0B0F19] bg-brand-mint shadow-sm"
                      title="Online"
                      aria-label="Online status"
                    />
                  )}
                </div>

                {/* Identity & Message Preview */}
                <div className="min-w-0 flex-1">
                  {/* Top Line: Name, Role Badge, Timestamp */}
                  <div className="flex items-center justify-between gap-1.5 mb-0.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className={`text-xs font-bold truncate ${
                          isSelected
                            ? 'text-brand-mint'
                            : unreadCount > 0
                            ? 'text-white'
                            : 'text-white/95'
                        }`}
                      >
                        {displayName}
                      </span>
                      {isDirect && otherUser?.role && (
                        <EcosystemRoleBadge role={otherUser.role} size="xs" />
                      )}
                    </div>
                    {lastMsg?.createdAt && (
                      <span className="text-[10px] font-mono text-text-faint shrink-0">
                        {formatTimestamp(lastMsg.createdAt)}
                      </span>
                    )}
                  </div>

                  {/* Subline: Username or Professional Context or Group Member Count */}
                  <div className="flex items-center gap-2 text-[11px] text-text-muted truncate mb-1">
                    {isDirect ? (
                      <>
                        {username && (
                          <span className="font-mono text-text-muted/80 truncate">
                            {username}
                          </span>
                        )}
                        {username && professionalContext && (
                          <span className="text-white/20">•</span>
                        )}
                        {professionalContext && (
                          <span className="text-text-muted truncate">
                            {professionalContext}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-text-muted truncate">
                        {conv.memberCount ||
                          conv.members?.length ||
                          conv.participants?.length ||
                          0}{' '}
                        members
                      </span>
                    )}
                  </div>

                  {/* Bottom Line: Last Message Preview & Unread / Muted Indicators */}
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={`text-xs truncate ${
                        unreadCount > 0
                          ? 'font-semibold text-white/90'
                          : 'text-text-muted'
                      }`}
                    >
                      {lastMsg?.body ||
                        (lastMsg?.attachments?.length || lastMsg?.hasAttachments
                          ? 'Sent an attachment'
                          : 'No messages yet')}
                    </p>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isMuted && (
                        <VolumeX
                          className="w-3 h-3 text-text-faint"
                          aria-label="Muted conversation"
                        />
                      )}
                      {unreadCount > 0 && (
                        <span className="min-w-4 h-4 px-1.5 rounded-full bg-brand-mint text-bg-base text-[10px] font-extrabold flex items-center justify-center shadow-sm">
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
    </div>
  );
}
