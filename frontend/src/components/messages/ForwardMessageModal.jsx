import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Search,
  Check,
  Share2,
  Loader2,
  FileText,
  User,
  Users,
} from 'lucide-react';
import { messagingService } from '../../services/messagingService';
import { useToast } from '../ui/Toast';

export default function ForwardMessageModal({ isOpen, message, onClose }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConvIds, setSelectedConvIds] = useState(new Set());
  const [note, setNote] = useState('');
  const modalRef = useRef(null);
  const searchInputRef = useRef(null);
  const queryClient = useQueryClient();
  const toast = useToast();

  const sourceMsgId = message?.id || message?._id;

  // Query user conversations
  const { data: convData, isLoading } = useQuery({
    queryKey: ['conversations', 'forward-picker'],
    queryFn: () => messagingService.getConversations({ tab: 'chats', limit: 50 }),
    enabled: Boolean(isOpen),
  });

  const conversations = convData?.conversations || [];

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setSelectedConvIds(new Set());
      setNote('');
      setSearchQuery('');
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Escape key and focus handling
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
      };
    }
  }, [isOpen, onClose]);

  // Forward mutation
  const forwardMutation = useMutation({
    mutationFn: async () => {
      return messagingService.forwardMessage({
        sourceMessageId: sourceMsgId,
        targetConversationIds: Array.from(selectedConvIds),
        note: note.trim() || undefined,
      });
    },
    onSuccess: (res) => {
      toast.success(
        `Forwarded to ${res.forwardedCount} conversation${
          res.forwardedCount === 1 ? '' : 's'
        }`,
      );
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      onClose();
    },
    onError: (err) => {
      toast.error(
        'Forwarding failed',
        err.response?.data?.message || 'Could not forward message.',
      );
    },
  });

  const toggleSelect = (convId) => {
    setSelectedConvIds((prev) => {
      const next = new Set(prev);
      if (next.has(convId)) {
        next.delete(convId);
      } else {
        if (next.size >= 10) {
          toast.info('Maximum 10 destinations allowed simultaneously.');
          return prev;
        }
        next.add(convId);
      }
      return next;
    });
  };

  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const name = c.name || c.title || '';
    const q = searchQuery.toLowerCase();
    return name.toLowerCase().includes(q);
  });

  if (!isOpen || !message) return null;

  const senderName =
    message.senderId?.name || message.senderId?.username || 'Member';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/75 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.18 }}
          className="relative w-full max-w-lg bg-[#12141c] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] z-10"
          role="dialog"
          aria-modal="true"
          aria-labelledby="forward-modal-title"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/[0.02]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Share2 className="w-4 h-4" />
              </div>
              <div>
                <h2
                  id="forward-modal-title"
                  className="text-sm font-semibold text-slate-100"
                >
                  Forward Message
                </h2>
                <p className="text-xs text-slate-400">
                  Select destination conversations
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors hover:bg-white/5"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Message Preview Snippet */}
          <div className="px-5 py-3 bg-white/[0.015] border-b border-white/5">
            <div className="text-[11px] font-mono uppercase text-slate-400 tracking-wider mb-1">
              Quoting: {senderName}
            </div>
            <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/5 text-xs text-slate-300 line-clamp-2 italic">
              "{message.body || (message.attachments?.length ? 'Attachment' : 'Message')}"
            </div>
          </div>

          {/* Search bar */}
          <div className="p-4 border-b border-white/5">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations…"
                className="w-full pl-9 pr-4 py-2 bg-white/[0.04] border border-white/10 rounded-xl text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all"
              />
            </div>
          </div>

          {/* Destination Conversations List */}
          <div className="flex-1 overflow-y-auto px-4 py-2 divide-y divide-white/[0.03]">
            {isLoading ? (
              <div className="py-8 flex flex-col items-center justify-center text-slate-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                <span className="text-xs">Loading conversations…</span>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No matching conversations found.
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = selectedConvIds.has(conv.id || conv._id);
                const isGroup = conv.type === 'GROUP';
                const title = conv.name || conv.title || 'Conversation';

                return (
                  <button
                    key={conv.id || conv._id}
                    type="button"
                    onClick={() => toggleSelect(conv.id || conv._id)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left ${
                      isSelected
                        ? 'bg-emerald-500/15 border border-emerald-500/30'
                        : 'hover:bg-white/[0.04] border border-transparent'
                    }`}
                  >
                    {/* Checkbox indicator */}
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                        isSelected
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-white/20 bg-white/5'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>

                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 overflow-hidden flex items-center justify-center text-slate-300 font-medium text-xs flex-shrink-0">
                      {conv.avatar ? (
                        <img
                          src={conv.avatar}
                          alt={title}
                          className="w-full h-full object-cover"
                        />
                      ) : isGroup ? (
                        <Users className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <User className="w-4 h-4 text-slate-400" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-slate-200 truncate">
                          {title}
                        </span>
                        {isGroup && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-white/5 border border-white/10 text-slate-400 uppercase font-mono">
                            Group
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 truncate block">
                        {conv.lastMessage?.body || 'No messages yet'}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Optional Note Input */}
          <div className="p-4 border-t border-white/10 bg-white/[0.01]">
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add an optional note…"
              className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500/50 transition-all mb-3"
            />

            {/* Actions */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">
                {selectedConvIds.size} selected
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 rounded-xl border border-white/10 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => forwardMutation.mutate()}
                  disabled={
                    selectedConvIds.size === 0 || forwardMutation.isPending
                  }
                  className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:hover:bg-emerald-500 text-white text-xs font-medium transition-all flex items-center gap-1.5 shadow-sm"
                >
                  {forwardMutation.isPending && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  <span>Forward ({selectedConvIds.size})</span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
