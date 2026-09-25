import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  MessageSquarePlus,
  Users,
  Archive,
  Inbox,
  VolumeX,
  Check,
  CheckCheck,
  Clock,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { messagingService } from '../../services/messagingService';
import { useMessaging } from '../../context/MessagingContext';
import { getUploadUrl } from '../../utils/courseUi';
import EcosystemRoleBadge from '../network/EcosystemRoleBadge';

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

function getInitials(name) {
  if (!name) return 'Z';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
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
  const { unreadCounts, isUserOnline, currentUserId } = useMessaging();

  const { data, isLoading } = useQuery({
    queryKey: ['conversations', { tab: activeTab, q: searchQuery }],
    queryFn: () => messagingService.getConversations({ tab: activeTab, q: searchQuery }),
    staleTime: 1000 * 10,
    refetchOnWindowFocus: false,
  });

  const conversations = data?.conversations || [];

  return (
    <div className="flex flex-col h-full bg-[#0D131F]/95 border-r border-white/[0.08]">
      {/* ── Top Header & Actions ── */}
      <div className="p-4 border-b border-white/[0.08] space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-heading font-black text-white tracking-tight">
            Messages
          </h2>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onNewGroup}
              className="p-2 rounded-xl text-text-muted hover:text-white hover:bg-white/[0.06] transition-colors focus-ring cursor-pointer"
              title="New Group Chat"
              aria-label="New Group Chat"
            >
              <Users className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onNewChat}
              className="p-2 rounded-xl bg-brand-mint/15 text-brand-mint hover:bg-brand-mint/25 transition-colors focus-ring cursor-pointer"
              title="New Conversation"
              aria-label="New Conversation"
            >
              <MessageSquarePlus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Tabs (Chats, Requests, Archived) ── */}
        <div className="grid grid-cols-3 gap-1 bg-white/[0.03] p-1 rounded-xl border border-white/[0.06]">
          <button
            type="button"
            onClick={() => onTabChange('chats')}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'chats'
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-text-muted hover:text-white'
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            <span>Chats</span>
            {unreadCounts.unreadMessages > 0 && (
              <span className="min-w-4 h-4 px-1 rounded-full bg-brand-mint text-bg-base text-[10px] font-bold flex items-center justify-center">
                {unreadCounts.unreadMessages > 99 ? '99+' : unreadCounts.unreadMessages}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onTabChange('requests')}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'requests'
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-text-muted hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Requests</span>
            {unreadCounts.unreadRequests > 0 && (
              <span className="min-w-4 h-4 px-1 rounded-full bg-brand-gold text-bg-base text-[10px] font-bold flex items-center justify-center">
                {unreadCounts.unreadRequests}
              </span>
            )}
          </button>

          <button
            type="button"
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] focus:border-brand-mint/40 text-xs text-white placeholder-text-muted focus:outline-none transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-text-muted hover:text-white"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* ── Conversations Scroll Area ── */}
      <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04]">
        {isLoading ? (
          <div className="p-3 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02] animate-pulse">
                <div className="w-11 h-11 rounded-2xl bg-white/[0.05]" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-white/[0.05] rounded w-2/3" />
                  <div className="h-3 bg-white/[0.03] rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-8 text-center">
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
              {activeTab === 'requests'
                ? 'No message requests'
                : activeTab === 'archived'
                ? 'No archived conversations'
                : 'No conversations yet'}
            </h4>
            <p className="text-xs text-text-muted max-w-[220px] mx-auto leading-relaxed">
              {activeTab === 'requests'
                ? 'When someone outside your connections messages you, it appears here.'
                : activeTab === 'archived'
                ? 'You can archive finished or inactive conversations to keep your inbox clean.'
                : 'Connect with infrastructure professionals and start a conversation.'}
            </p>
            {activeTab === 'chats' && (
              <button
                type="button"
                onClick={onNewChat}
                className="mt-4 px-3.5 py-1.5 rounded-xl bg-brand-mint text-bg-base text-xs font-bold hover:bg-brand-mint/90 transition-all cursor-pointer"
              >
                Find Professionals
              </button>
            )}
          </div>
        ) : (
          conversations.map((conv) => {
            const isSelected = conv._id === selectedConversationId;
            const otherUser = conv.otherParticipant;
            const isDirect = conv.type === 'DIRECT';
            const displayName = isDirect ? (otherUser?.name || 'User') : (conv.title || 'Group');
            const avatarUrl = isDirect ? otherUser?.avatarUrl : conv.avatarUrl;
            const initials = getInitials(displayName);
            const isOnline = isDirect && otherUser?._id && isUserOnline(otherUser._id);
            const unreadCount = conv.unreadCount || 0;
            const lastMsg = conv.lastMessage;
            const isMuted = Boolean(conv.isMuted);

            return (
              <button
                key={conv._id}
                type="button"
                onClick={() => onSelectConversation(conv)}
                className={`w-full text-left p-3.5 flex items-center gap-3 transition-colors cursor-pointer group focus-ring ${
                  isSelected
                    ? 'bg-brand-mint/[0.08] border-l-2 border-brand-mint'
                    : 'hover:bg-white/[0.03]'
                }`}
              >
                {/* Avatar with Presence Indicator */}
                <div className="relative shrink-0">
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center overflow-hidden text-brand-mint font-heading font-bold text-sm">
                    {avatarUrl ? (
                      <img src={getUploadUrl(avatarUrl)} alt={displayName} className="w-full h-full object-cover" />
                    ) : isDirect ? (
                      <span>{initials}</span>
                    ) : (
                      <Users className="w-5 h-5 text-brand-mint/80" />
                    )}
                  </div>
                  {isOnline && (
                    <span
                      className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#0D131F] bg-brand-mint shadow-sm"
                      title="Online"
                    />
                  )}
                </div>

                {/* Identity & Snippet */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`text-xs font-bold truncate ${isSelected ? 'text-brand-mint' : 'text-white'}`}>
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

                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-xs truncate ${unreadCount > 0 ? 'font-semibold text-white/90' : 'text-text-muted'}`}>
                      {lastMsg?.body || (lastMsg?.hasAttachments ? 'Attachment' : 'No messages yet')}
                    </p>

                    <div className="flex items-center gap-1 shrink-0">
                      {isMuted && <VolumeX className="w-3 h-3 text-text-faint" />}
                      {unreadCount > 0 && (
                        <span className="min-w-4 h-4 px-1 rounded-full bg-brand-mint text-bg-base text-[10px] font-bold flex items-center justify-center shadow-sm">
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
