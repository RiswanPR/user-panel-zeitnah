import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  Check,
  X,
  Ban,
  ExternalLink,
  MessageSquare,
} from 'lucide-react';
import { messagingService } from '../../services/messagingService';
import moderationService from '../../services/moderationService';
import { useMessaging } from '../../context/MessagingContext';
import { useToast } from '../ui/Toast';
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
import { getCanonicalProfileUrl } from '../../utils/roleNavigation';

function formatRequestTimestamp(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now - date) / 86400000);
  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' });
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function MessageRequestsView({ onSelectConversation }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { currentUserId } = useMessaging();

  const { data, isLoading } = useQuery({
    queryKey: ['conversations', { tab: 'requests' }],
    queryFn: () => messagingService.getConversations({ tab: 'requests' }),
    staleTime: 1000 * 10,
  });

  const requests = data?.conversations || [];

  // Accept Mutation
  const acceptMutation = useMutation({
    mutationFn: (conversationId) =>
      messagingService.acceptRequest(conversationId),
    onSuccess: (res) => {
      toast.success('Request Accepted', 'Conversation is now active.');
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['messages', 'unread-counts'] });
      const conv = res?.conversation || res;
      if (conv) {
        onSelectConversation(conv);
      }
    },
    onError: (err) => {
      toast.error(
        'Failed to accept',
        err.response?.data?.message || 'Please try again.',
      );
    },
  });

  // Decline Mutation
  const declineMutation = useMutation({
    mutationFn: (conversationId) =>
      messagingService.declineRequest(conversationId),
    onSuccess: () => {
      toast.success(
        'Request Declined',
        'The sender cannot send additional messages.',
      );
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['messages', 'unread-counts'] });
    },
    onError: (err) => {
      toast.error(
        'Failed to decline',
        err.response?.data?.message || 'Please try again.',
      );
    },
  });

  // Block Mutation
  const blockMutation = useMutation({
    mutationFn: async ({ conversationId, targetUserId }) => {
      if (targetUserId) {
        await moderationService.blockUser(targetUserId);
      }
      await messagingService.declineRequest(conversationId).catch(() => {});
    },
    onSuccess: () => {
      toast.success('User Blocked', 'They can no longer contact you.');
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['messages', 'unread-counts'] });
    },
    onError: (err) => {
      toast.error(
        'Failed to block',
        err.response?.data?.message || 'Please try again.',
      );
    },
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-[#080C14] overflow-y-auto p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3.5 pb-5 border-b border-white/[0.08]">
          <div className="w-11 h-11 rounded-2xl bg-brand-gold/15 border border-brand-gold/30 flex items-center justify-center text-brand-gold shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-heading font-black text-white tracking-tight">
              Message Requests
            </h1>
            <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
              Professionals outside your immediate network seeking introduction. Accepting moves the thread directly into your primary chats.
            </p>
          </div>
        </div>

        {/* Requests List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] animate-pulse h-40"
              />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div className="p-16 rounded-3xl bg-white/[0.02] border border-white/[0.06] text-center max-w-md mx-auto my-12">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-3 text-text-muted">
              <Check className="w-6 h-6 text-brand-mint" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1 tracking-tight">
              You&apos;re all caught up.
            </h3>
            <p className="text-xs text-text-muted leading-relaxed">
              When someone outside your network introduces themselves, their request will appear here for review.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((conv) => {
              const convId = conv._id || conv.id;
              const sender = getOtherParticipant(conv, currentUserId);
              const senderName = getConversationDisplayName(conv, currentUserId);
              const avatarSrc = getConversationAvatar(conv, currentUserId);
              const senderId = getUserId(sender);
              const professionalContext = getProfessionalContext(sender);
              const senderRole = sender?.role || sender?.primaryRole || 'PROFESSIONAL';
              const initialMessage =
                conv.lastMessage?.body ||
                'Sent an introductory message request.';
              const initials = getInitials(senderName);
              const timestamp = formatRequestTimestamp(conv.lastMessageAt || conv.createdAt);

              return (
                <div
                  key={convId}
                  className="rounded-2xl border border-white/[0.08] bg-[#0E1524] p-5 shadow-xl space-y-4 hover:border-brand-mint/30 transition-all"
                >
                  {/* Sender Details */}
                  <div className="flex items-start justify-between gap-3.5">
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className="w-12 h-12 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center overflow-hidden text-brand-mint font-heading font-bold text-xs shrink-0 shadow-inner">
                        {avatarSrc ? (
                          <img
                            src={getUploadUrl(avatarSrc)}
                            alt={senderName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span>{initials}</span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-white truncate tracking-tight">
                            {senderName}
                          </h3>
                          {senderRole && (
                            <EcosystemRoleBadge role={senderRole} size="xs" />
                          )}
                        </div>

                        {professionalContext && (
                          <p className="text-xs text-text-secondary line-clamp-1 mt-0.5 font-medium">
                            {professionalContext}
                          </p>
                        )}

                        {sender?.username && (
                          <p className="text-[11px] font-mono text-text-muted mt-0.5">
                            @{sender.username.replace(/^@/, '')}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {timestamp && (
                        <span className="text-[10px] font-mono text-text-faint">
                          {timestamp}
                        </span>
                      )}
                      {sender && (
                        <Link
                          to={getCanonicalProfileUrl(sender)}
                          className="p-1.5 rounded-xl text-text-muted hover:text-white hover:bg-white/[0.06] transition-colors"
                          title="View Canonical Profile"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Introductory Message Snippet */}
                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs text-white/90 leading-relaxed">
                    <div className="flex items-center gap-1.5 text-text-muted mb-1 text-[11px] font-mono uppercase tracking-wider">
                      <MessageSquare className="w-3 h-3 text-brand-gold" />
                      <span>Introduction</span>
                    </div>
                    <p className="whitespace-pre-wrap">{initialMessage}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/[0.04]">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => acceptMutation.mutate(convId)}
                        disabled={acceptMutation.isPending}
                        className="px-4 py-2 rounded-xl bg-brand-mint text-bg-base text-xs font-bold hover:bg-brand-mint/90 transition-all cursor-pointer inline-flex items-center gap-1.5 focus-ring disabled:opacity-50 min-h-[40px] shadow-sm shadow-brand-mint/10"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Accept Request</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => declineMutation.mutate(convId)}
                        disabled={declineMutation.isPending}
                        className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-text-secondary hover:text-white text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 focus-ring disabled:opacity-50 min-h-[40px]"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Decline</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        blockMutation.mutate({
                          conversationId: convId,
                          targetUserId: senderId,
                        })
                      }
                      disabled={blockMutation.isPending || !senderId}
                      className="px-3 py-1.5 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 text-xs font-medium transition-all cursor-pointer inline-flex items-center gap-1 disabled:opacity-50 min-h-[36px]"
                      title="Block sender"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>Block</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
