import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sparkles, Check, X, Ban, ShieldAlert, Layers, MapPin, Briefcase } from 'lucide-react';
import { messagingService } from '../../services/messagingService';
import moderationService from '../../services/moderationService';
import { useToast } from '../ui/Toast';
import { getUploadUrl } from '../../utils/courseUi';
import EcosystemRoleBadge from '../network/EcosystemRoleBadge';

function getInitials(name) {
  if (!name) return 'Z';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function MessageRequestsView({ onSelectConversation }) {
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['conversations', { tab: 'requests' }],
    queryFn: () => messagingService.getConversations({ tab: 'requests' }),
    staleTime: 1000 * 10,
  });

  const requests = data?.conversations || [];

  // Accept Mutation
  const acceptMutation = useMutation({
    mutationFn: (conversationId) => messagingService.acceptRequest(conversationId),
    onSuccess: (res, conversationId) => {
      toast.success('Request Accepted', 'Conversation is now active.');
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['messages', 'unread-counts'] });
      if (res?.conversation) {
        onSelectConversation(res.conversation);
      }
    },
    onError: (err) => {
      toast.error('Failed to accept', err.response?.data?.message || 'Please try again.');
    },
  });

  // Decline Mutation
  const declineMutation = useMutation({
    mutationFn: (conversationId) => messagingService.declineRequest(conversationId),
    onSuccess: () => {
      toast.success('Request Declined', 'The sender cannot send additional messages.');
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['messages', 'unread-counts'] });
    },
    onError: (err) => {
      toast.error('Failed to decline', err.response?.data?.message || 'Please try again.');
    },
  });

  // Block Mutation
  const blockMutation = useMutation({
    mutationFn: async ({ conversationId, targetUserId }) => {
      await moderationService.blockUser(targetUserId);
      await messagingService.declineRequest(conversationId).catch(() => {});
    },
    onSuccess: () => {
      toast.success('User Blocked', 'They can no longer contact you.');
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['messages', 'unread-counts'] });
    },
    onError: (err) => {
      toast.error('Failed to block', err.response?.data?.message || 'Please try again.');
    },
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0A0E17] overflow-y-auto p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-white/[0.08]">
          <div className="w-10 h-10 rounded-2xl bg-brand-gold/15 border border-brand-gold/30 flex items-center justify-center text-brand-gold">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-heading font-black text-white tracking-tight">
              Message Requests
            </h1>
            <p className="text-xs text-text-muted mt-0.5">
              Professionals who want to start a conversation with you. Accepting opens regular messaging.
            </p>
          </div>
        </div>

        {/* Requests List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] animate-pulse h-40" />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div className="p-16 rounded-3xl bg-white/[0.02] border border-white/[0.06] text-center max-w-md mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-3 text-text-muted">
              <Check className="w-6 h-6 text-brand-mint" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">No pending message requests</h3>
            <p className="text-xs text-text-muted leading-relaxed">
              When someone outside your direct connections contacts you, their introduction will appear here for review.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((conv) => {
              const sender = conv.otherParticipant;
              const senderName = sender?.name || 'Professional';
              const senderHeadline = sender?.headline || '';
              const senderRole = sender?.role || 'PROFESSIONAL';
              const initialMessage = conv.lastMessage?.body || 'Sent an introductory message request.';
              const avatarSrc = sender?.avatarUrl ? getUploadUrl(sender.avatarUrl) : null;

              return (
                <div
                  key={conv._id}
                  className="rounded-2xl border border-white/[0.08] bg-[#111827]/80 p-5 shadow-lg space-y-4 hover:border-brand-mint/30 transition-all"
                >
                  {/* Sender Details */}
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-white/[0.05] border border-brand-mint/30 flex items-center justify-center overflow-hidden text-brand-mint font-heading font-bold text-sm shrink-0">
                      {avatarSrc ? (
                        <img src={avatarSrc} alt={senderName} className="w-full h-full object-cover" />
                      ) : (
                        <span>{getInitials(senderName)}</span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white truncate">{senderName}</h3>
                        <EcosystemRoleBadge role={senderRole} size="xs" />
                      </div>
                      {senderHeadline && (
                        <p className="text-xs text-text-secondary line-clamp-1 mt-0.5 font-medium">
                          {senderHeadline}
                        </p>
                      )}
                      {sender?.username && (
                        <p className="text-[11px] font-mono text-text-muted mt-0.5">
                          @{sender.username}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Introductory Message Snippet */}
                  <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs text-white/90 leading-relaxed font-sans">
                    <p className="italic text-text-muted mb-1 text-[11px]">Message Request:</p>
                    <p className="whitespace-pre-wrap">{initialMessage}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/[0.04]">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => acceptMutation.mutate(conv._id)}
                        disabled={acceptMutation.isPending}
                        className="px-4 py-2 rounded-xl bg-brand-mint text-bg-base text-xs font-bold hover:bg-brand-mint/90 transition-all cursor-pointer inline-flex items-center gap-1.5 focus-ring"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Accept Request</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => declineMutation.mutate(conv._id)}
                        disabled={declineMutation.isPending}
                        className="px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-text-secondary hover:text-white text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 focus-ring"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Decline</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => blockMutation.mutate({ conversationId: conv._id, targetUserId: sender?._id })}
                      disabled={blockMutation.isPending}
                      className="px-3 py-1.5 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 text-xs font-medium transition-all cursor-pointer inline-flex items-center gap-1"
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
