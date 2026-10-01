import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X,
  Send,
  Paperclip,
  CornerDownRight,
  Loader2,
  FileText,
  Download,
  User,
  ArrowLeft,
  MessageSquare,
} from 'lucide-react';
import { messagingService } from '../../services/messagingService';
import { useToast } from '../ui/Toast';
import MentionAutocomplete from './MentionAutocomplete';

const QUICK_EMOJIS = ['👍', '❤️', '🔥', '🎉', '💡', '👀'];

export default function ThreadPanel({
  rootMessage,
  conversationId,
  onClose,
  isMobile = false,
  currentUserId,
  onJumpToMessage,
}) {
  const rootId = rootMessage?.id || rootMessage?._id;
  const [replyText, setReplyText] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  // Mention state
  const [mentionVisible, setMentionVisible] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [collectedMentions, setCollectedMentions] = useState([]);

  const textareaRef = useRef(null);
  const scrollEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();
  const toast = useToast();

  // Query thread replies
  const {
    data: threadData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['thread', conversationId, rootId],
    queryFn: () => messagingService.getThreadReplies(conversationId, rootId),
    enabled: Boolean(conversationId && rootId),
    refetchInterval: false,
  });

  const replies = threadData?.replies || [];
  const currentRoot = threadData?.rootMessage || rootMessage;

  // Auto-scroll to bottom on replies change
  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [replies.length]);

  // Escape to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !mentionVisible) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, mentionVisible]);

  // Reply mutation
  const replyMutation = useMutation({
    mutationFn: async (payload) => {
      return messagingService.createThreadReply(conversationId, rootId, payload);
    },
    onSuccess: () => {
      setReplyText('');
      setAttachments([]);
      setCollectedMentions([]);
      queryClient.invalidateQueries({ queryKey: ['thread', conversationId, rootId] });
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setTimeout(() => {
        scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    },
    onError: (err) => {
      toast.error('Unable to send reply', err.response?.data?.message || 'Failed to post reply.');
    },
  });

  const handleSend = () => {
    const body = replyText.trim();
    if (!body && attachments.length === 0) return;
    if (replyMutation.isPending) return;

    replyMutation.mutate({
      body: body || 'Sent an attachment',
      attachments,
      mentions: collectedMentions.map((m) => m.username || m.id),
    });
  };

  const handleKeyDown = (e) => {
    const isMobileViewport = typeof window !== 'undefined' && window.innerWidth < 768;
    if (isMobileViewport) {
      // Mobile keyboards use Enter for newlines; dedicated Send button submits
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      if (!mentionVisible) {
        e.preventDefault();
        handleSend();
      }
    }
  };

  // Mention parsing
  const handleInputChange = (e) => {
    const val = e.target.value;
    const cursor = e.target.selectionStart;
    setReplyText(val);

    const textBeforeCursor = val.slice(0, cursor);
    const lastAt = textBeforeCursor.lastIndexOf('@');

    if (lastAt !== -1) {
      const charBeforeAt = lastAt > 0 ? textBeforeCursor[lastAt - 1] : ' ';
      const spaceOrNewline = /\s/.test(charBeforeAt);

      if (spaceOrNewline || lastAt === 0) {
        const query = textBeforeCursor.slice(lastAt + 1);
        if (!/\s/.test(query)) {
          setMentionQuery(query);
          setMentionStartIndex(lastAt);
          setMentionVisible(true);
          return;
        }
      }
    }

    setMentionVisible(false);
  };

  const handleMentionSelect = (user) => {
    if (mentionStartIndex === -1) return;

    const before = replyText.slice(0, mentionStartIndex);
    const after = replyText.slice(textareaRef.current?.selectionStart || replyText.length);
    const inserted = `@${user.username || user.name} `;
    const newText = before + inserted + after;

    setReplyText(newText);
    setCollectedMentions((prev) => [...prev, user]);
    setMentionVisible(false);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newCursor = before.length + inserted.length;
        textareaRef.current.setSelectionRange(newCursor, newCursor);
      }
    }, 10);
  };

  // File upload
  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);
    for (const file of files) {
      try {
        const res = await messagingService.uploadAttachment(file);
        setAttachments((prev) => [
          ...prev,
          {
            url: res.url,
            name: res.name || file.name,
            size: res.size || file.size,
            mimeType: res.mimeType || file.type,
          },
        ]);
      } catch (err) {
        toast.error('Upload failed', err.response?.data?.message || file.name);
      }
    }
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Toggle reaction
  const handleToggleReaction = async (messageId, emoji) => {
    try {
      await messagingService.toggleReaction(messageId, emoji);
      queryClient.invalidateQueries({ queryKey: ['thread', conversationId, rootId] });
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
    } catch {
      // Safe fail
    }
  };

  // Formatting helpers
  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? ''
      : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderBodyWithMentions = (text) => {
    if (!text) return null;
    const parts = text.split(/(@[a-zA-Z0-9_.-]+)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('@')) {
        const uname = part.slice(1);
        return (
          <a
            key={idx}
            href={`/u/${uname}`}
            className="inline-flex items-center text-emerald-400 font-medium hover:underline bg-emerald-500/10 px-1 py-0.5 rounded text-[13px] mx-0.5"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  return (
    <div
      className={`flex flex-col h-full bg-[#0d0f15] border-l border-white/10 ${
        isMobile ? 'fixed inset-0 z-50 w-full' : 'w-96 flex-shrink-0'
      }`}
    >
      {/* ── Thread Header ── */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/10 bg-[#12151e]/80 backdrop-blur-md pt-[max(0.875rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-2.5">
          {isMobile && (
            <button
              onClick={onClose}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center -ml-2 text-slate-400 hover:text-white rounded-lg transition-colors"
              aria-label="Back to chat"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-1.5">
              <span>Discussion</span>
              <span className="text-xs font-normal text-slate-400">
                ({replies.length} {replies.length === 1 ? 'reply' : 'replies'})
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Focused thread timeline
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {onJumpToMessage && (
            <button
              onClick={() => onJumpToMessage(rootId)}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-white/5 rounded-lg transition-colors text-xs flex items-center gap-1"
              title="Jump to original message in main chat"
            >
              <CornerDownRight className="w-4 h-4" />
              <span className="hidden sm:inline">Jump</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            aria-label="Close thread"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ── Thread Stream ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Root Message Card */}
        {currentRoot && (
          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 shadow-sm space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 overflow-hidden flex items-center justify-center text-slate-300 font-medium text-xs">
                  {currentRoot.senderId?.avatar ? (
                    <img
                      src={currentRoot.senderId.avatar}
                      alt={currentRoot.senderId?.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-4 h-4 text-slate-400" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-100">
                      {currentRoot.senderId?.name || 'Member'}
                    </span>
                    {currentRoot.senderId?.primaryRole && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/5 border border-white/10 text-slate-400 uppercase font-mono">
                        {currentRoot.senderId.primaryRole}
                      </span>
                    )}
                  </div>
                  {currentRoot.senderId?.username && (
                    <span className="text-[10px] text-slate-400">
                      @{currentRoot.senderId.username}
                    </span>
                  )}
                </div>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                {formatTime(currentRoot.createdAt)}
              </span>
            </div>

            {/* Root body */}
            <div className="text-xs text-slate-200 leading-relaxed break-words whitespace-pre-wrap">
              {renderBodyWithMentions(currentRoot.body)}
            </div>

            {/* Root attachments */}
            {currentRoot.attachments?.length > 0 && (
              <div className="space-y-1.5 pt-1">
                {currentRoot.attachments.map((att, aIdx) => (
                  <a
                    key={aIdx}
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.03] border border-white/5 hover:border-white/15 transition-colors text-xs text-slate-300"
                  >
                    <FileText className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span className="truncate flex-1">{att.name}</span>
                    <Download className="w-3.5 h-3.5 text-slate-400" />
                  </a>
                ))}
              </div>
            )}

            {/* Root reactions */}
            {currentRoot.reactions?.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {currentRoot.reactions.map((r, rIdx) => (
                  <button
                    key={rIdx}
                    onClick={() => handleToggleReaction(currentRoot._id || currentRoot.id, r.emoji)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[11px] text-slate-300 hover:bg-white/10 transition-colors"
                  >
                    <span>{r.emoji}</span>
                    <span>{r.count || 1}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Divider */}
        <div className="flex items-center gap-3 pt-1 pb-1">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
            Replies
          </span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        {/* Replies List */}
        {isLoading ? (
          <div className="py-8 flex flex-col items-center justify-center text-slate-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
            <span className="text-xs">Loading replies…</span>
          </div>
        ) : isError ? (
          <div className="py-6 text-center text-xs text-rose-400">
            Failed to load replies. Please try again.
          </div>
        ) : replies.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No replies yet in this discussion. Be the first to reply!
          </div>
        ) : (
          replies.map((reply) => {
            const isOwn = String(reply.senderId?._id || reply.senderId) === currentUserId;
            return (
              <div
                key={reply.id || reply._id}
                className="flex items-start gap-2.5 group/reply"
              >
                <div className="w-7 h-7 rounded-full bg-slate-800 border border-white/10 overflow-hidden flex items-center justify-center text-slate-300 font-medium text-[11px] flex-shrink-0 mt-0.5">
                  {reply.senderId?.avatar ? (
                    <img
                      src={reply.senderId.avatar}
                      alt={reply.senderId?.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <div className="flex items-baseline gap-1.5 truncate">
                      <span className="text-xs font-medium text-slate-200 truncate">
                        {reply.senderId?.name || 'Member'}
                      </span>
                      {reply.senderId?.username && (
                        <span className="text-[10px] text-slate-400 truncate">
                          @{reply.senderId.username}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono flex-shrink-0">
                      {formatTime(reply.createdAt)}
                    </span>
                  </div>

                  <div className={`p-2.5 rounded-xl border text-xs leading-relaxed break-words whitespace-pre-wrap ${
                    isOwn
                      ? 'bg-brand-mint/10 border-brand-mint/20 text-white'
                      : 'bg-white/[0.025] border-white/5 text-slate-200'
                  }`}>
                    {renderBodyWithMentions(reply.body)}

                    {reply.attachments?.length > 0 && (
                      <div className="space-y-1 mt-2">
                        {reply.attachments.map((att, aIdx) => (
                          <a
                            key={aIdx}
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-1.5 rounded-lg bg-black/20 hover:bg-black/40 border border-white/5 transition-colors text-[11px] text-slate-300"
                          >
                            <FileText className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                            <span className="truncate flex-1">{att.name}</span>
                            <Download className="w-3 h-3 text-slate-400" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Reaction bar on hover */}
                  <div className="flex items-center gap-1 mt-1 opacity-60 group-hover/reply:opacity-100 transition-opacity">
                    {QUICK_EMOJIS.slice(0, 3).map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleToggleReaction(reply.id || reply._id, emoji)}
                        className="text-[11px] p-0.5 hover:scale-125 transition-transform"
                      >
                        {emoji}
                      </button>
                    ))}
                    {reply.reactions?.length > 0 && (
                      <div className="flex gap-1 ml-1">
                        {reply.reactions.map((r, rIdx) => (
                          <span
                            key={rIdx}
                            className="text-[10px] px-1.5 py-0.2 rounded bg-white/5 border border-white/10 text-slate-300"
                          >
                            {r.emoji} {r.count}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={scrollEndRef} />
      </div>

      {/* ── Thread Composer ── */}
      <div className="p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-white/10 bg-[#12151e]/80 backdrop-blur-md relative">
        {/* Mention suggestions popup */}
        <MentionAutocomplete
          visible={mentionVisible}
          query={mentionQuery}
          conversationId={conversationId}
          onSelect={handleMentionSelect}
          onClose={() => setMentionVisible(false)}
        />

        {/* Attachment preview tags */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {attachments.map((att, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs truncate max-w-xs"
              >
                <FileText className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{att.name}</span>
                <button
                  type="button"
                  onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                  className="hover:text-white min-h-[32px] min-w-[32px] flex items-center justify-center"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2 bg-white/[0.04] border border-white/10 rounded-xl px-2.5 py-1.5 focus-within:border-emerald-500/50 focus-within:ring-1 focus-within:ring-emerald-500/30 transition-all">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            multiple
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-emerald-400 transition-colors flex-shrink-0"
            title="Attach file"
            aria-label="Attach file"
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
            ) : (
              <Paperclip className="w-4 h-4" />
            )}
          </button>

          <textarea
            ref={textareaRef}
            value={replyText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Reply in thread…"
            className="flex-1 bg-transparent resize-none border-none outline-none text-xs text-slate-100 placeholder-slate-500 max-h-24 overflow-y-auto leading-relaxed py-2.5"
          />

          <button
            type="button"
            onClick={handleSend}
            disabled={
              (!replyText.trim() && attachments.length === 0) ||
              replyMutation.isPending ||
              isUploading
            }
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-30 disabled:hover:bg-emerald-500 text-white transition-all flex-shrink-0"
            title="Send reply"
            aria-label="Send reply"
          >
            {replyMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
