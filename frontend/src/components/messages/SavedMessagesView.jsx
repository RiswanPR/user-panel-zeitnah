import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bookmark,
  Search,
  Paperclip,
  Trash2,
  MessageSquare,
  ArrowRight,
  X,
} from 'lucide-react';
import { messagingService } from '../../services/messagingService';
import { getUploadUrl } from '../../utils/courseUi';
import EcosystemRoleBadge from '../network/EcosystemRoleBadge';
import { getInitials } from '../../utils/messagingIdentity';

function formatTimestamp(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function SavedMessagesView({ onSelectMessage, onClose }) {
  const queryClient = useQueryClient();
  const [searchFilter, setSearchFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['saved-messages'],
    queryFn: () => messagingService.getSavedMessages({ limit: 50 }),
    staleTime: 1000 * 30,
  });

  const rawSaved = useMemo(() => data?.savedMessages || [], [data?.savedMessages]);

  const unsaveMutation = useMutation({
    mutationFn: (messageId) => messagingService.unsaveMessage(messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-messages'] });
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });

  const filteredItems = useMemo(() => {
    if (!searchFilter.trim()) return rawSaved;
    const q = searchFilter.toLowerCase().trim();
    return rawSaved.filter((item) => {
      const body = (item.message?.body || '').toLowerCase();
      const senderName = (item.message?.senderId?.name || '').toLowerCase();
      const convName = (item.conversation?.name || '').toLowerCase();
      return body.includes(q) || senderName.includes(q) || convName.includes(q);
    });
  }, [rawSaved, searchFilter]);

  return (
    <div
      className="flex flex-col h-full bg-[#080C14] border-r border-white/[0.08]"
      role="region"
      aria-label="Saved messages"
    >
      {/* Header */}
      <div className="p-4 border-b border-white/[0.08] bg-[#0C121E]/95 backdrop-blur-md space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-brand-gold/15 text-brand-gold flex items-center justify-center border border-brand-gold/30">
              <Bookmark className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-heading font-black text-white tracking-tight">
                Saved Messages
              </h2>
              <p className="text-[11px] text-text-muted">
                {rawSaved.length} bookmarked {rawSaved.length === 1 ? 'item' : 'items'}
              </p>
            </div>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-text-muted hover:text-white hover:bg-white/[0.06] transition-colors"
              aria-label="Close saved messages"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Filter saved messages..."
            className="w-full pl-8 pr-8 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.08] focus:border-brand-gold/40 text-xs text-white placeholder-text-muted focus:outline-none transition-colors"
          />
          {searchFilter && (
            <button
              type="button"
              onClick={() => setSearchFilter('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {isLoading ? (
          <div className="space-y-3 p-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] animate-pulse space-y-2.5"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-white/[0.08]" />
                  <div className="space-y-1 flex-1">
                    <div className="h-3 w-24 bg-white/[0.08] rounded" />
                    <div className="h-2 w-16 bg-white/[0.04] rounded" />
                  </div>
                </div>
                <div className="h-4 w-full bg-white/[0.06] rounded" />
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-16 px-6 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-text-muted mx-auto">
              <Bookmark className="w-6 h-6 opacity-40" />
            </div>
            <div className="space-y-1 max-w-xs mx-auto">
              <h4 className="text-sm font-bold text-white">No saved messages</h4>
              <p className="text-xs text-text-muted leading-relaxed">
                {searchFilter
                  ? 'No saved messages match your filter.'
                  : 'Hover over or tap any message and select "Save" to keep important notes and discussions here.'}
              </p>
            </div>
          </div>
        ) : (
          filteredItems.map((item) => {
            const sender = item.message?.senderId;
            const senderName = sender?.name || (sender?.username ? `@${sender.username}` : 'Member');
            const avatarUrl = sender?.avatar;
            const initials = getInitials(senderName);
            const convName = item.conversation?.name || 'Direct Conversation';
            const hasAttachments = item.message?.attachments?.length > 0;

            return (
              <div
                key={item.id}
                className="group relative p-3.5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] hover:border-brand-gold/30 transition-all space-y-2.5 text-left cursor-pointer"
                onClick={() => onSelectMessage?.(item.conversationId, item.messageId)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectMessage?.(item.conversationId, item.messageId);
                  }
                }}
              >
                {/* Header: Sender & Conversation Context */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-white/[0.08] border border-white/[0.1] overflow-hidden flex items-center justify-center text-[10px] font-bold text-brand-mint shrink-0">
                      {avatarUrl ? (
                        <img
                          src={getUploadUrl(avatarUrl)}
                          alt={senderName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        initials
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-xs font-bold text-white truncate">
                          {senderName}
                        </span>
                        {sender?.primaryRole && (
                          <EcosystemRoleBadge role={sender.primaryRole} size="xs" />
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-text-muted truncate">
                        <MessageSquare className="w-2.5 h-2.5 text-brand-mint shrink-0" />
                        <span className="truncate">{convName}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        unsaveMutation.mutate(item.messageId);
                      }}
                      className="p-1 rounded-lg text-text-muted hover:text-red-400 hover:bg-white/[0.06] transition-colors"
                      title="Remove from saved"
                      aria-label="Remove from saved messages"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <span className="p-1 text-text-muted group-hover:text-brand-gold transition-colors">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>

                {/* Message Body Snippet */}
                <p className="text-xs text-text-secondary leading-relaxed line-clamp-3 bg-white/[0.01] p-2 rounded-xl border border-white/[0.03]">
                  {item.message?.body || (hasAttachments ? 'Shared an attachment' : '')}
                </p>

                {/* Footer: Attachments & Saved Timestamp */}
                <div className="flex items-center justify-between text-[10px] text-text-muted pt-0.5">
                  <div className="flex items-center gap-2">
                    {hasAttachments && (
                      <span className="flex items-center gap-1 text-brand-mint font-mono font-medium">
                        <Paperclip className="w-3 h-3" />
                        <span>{item.message.attachments.length} attachment</span>
                      </span>
                    )}
                  </div>
                  <span>Saved {formatTimestamp(item.savedAt)}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
