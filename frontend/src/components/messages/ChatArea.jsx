import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Send,
  MoreVertical,
  ArrowLeft,
  Smile,
  Reply,
  Copy,
  Edit2,
  Trash2,
  Flag,
  VolumeX,
  Volume2,
  Archive,
  Ban,
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  ExternalLink,
  Users,
  Paperclip,
  X,
  RefreshCw,
} from 'lucide-react';
import { messagingService } from '../../services/messagingService';
import moderationService from '../../services/moderationService';
import { useMessaging } from '../../context/MessagingContext';
import { useToast } from '../ui/Toast';
import { getUploadUrl } from '../../utils/courseUi';
import EcosystemRoleBadge from '../network/EcosystemRoleBadge';
import ReportModal from '../network/ReportModal';

const REACTION_EMOJIS = ['👍', '❤️', '👏', '🎯'];

function formatTime(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateDivider(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
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

export default function ChatArea({ conversationId, onBack }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const {
    currentUserId,
    joinConversation,
    leaveConversation,
    sendTyping,
    markRead,
    getTypingUsers,
    isUserOnline,
    connectionStatus,
  } = useMessaging();

  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [reportTarget, setReportTarget] = useState(null); // { type, id, name }

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  // ── 1. Fetch Conversation Details ──
  const { data: convData } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: () => messagingService.getConversation(conversationId),
    enabled: Boolean(conversationId),
    staleTime: 1000 * 30,
  });

  const conversation = convData?.conversation;
  const isDirect = conversation?.type === 'DIRECT';
  const otherUser = conversation?.otherParticipant;
  const displayName = isDirect ? (otherUser?.name || 'Professional') : (conversation?.title || 'Group');
  const avatarUrl = isDirect ? otherUser?.avatarUrl : conversation?.avatarUrl;
  const isOnline = isDirect && otherUser?._id && isUserOnline(otherUser._id);
  const isMuted = Boolean(conversation?.isMuted);
  const isArchived = Boolean(conversation?.isArchived);

  // ── 2. Fetch Messages ──
  const {
    data: messagesData,
    isLoading: isLoadingMessages,
  } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => messagingService.getMessages(conversationId, { limit: 50 }),
    enabled: Boolean(conversationId),
    staleTime: 1000 * 5,
    refetchOnWindowFocus: false,
  });

  const messages = messagesData?.messages || [];

  // Join socket room & mark as read
  useEffect(() => {
    if (!conversationId) return;
    joinConversation(conversationId);
    markRead(conversationId);

    return () => {
      leaveConversation(conversationId);
    };
  }, [conversationId, joinConversation, leaveConversation, markRead]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // ── Send Message Mutation ──
  const sendMutation = useMutation({
    mutationFn: (payload) => messagingService.sendMessage(conversationId, payload),
    onSuccess: (res) => {
      setInputText('');
      setReplyingTo(null);
      // Immediately stop typing
      if (isTypingRef.current) {
        sendTyping(conversationId, false);
        isTypingRef.current = false;
      }
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (err) => {
      const msg = err.response?.data?.message || 'Failed to send message.';
      toast.error('Unable to send', msg);
    },
  });

  // ── Edit Message Mutation ──
  const editMutation = useMutation({
    mutationFn: ({ messageId, body }) => messagingService.editMessage(messageId, { body }),
    onSuccess: () => {
      setEditingMessage(null);
      setInputText('');
      toast.success('Message updated');
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
    },
    onError: (err) => {
      toast.error('Edit failed', err.response?.data?.message || 'Could not edit message.');
    },
  });

  // ── Delete Message Mutation ──
  const deleteMutation = useMutation({
    mutationFn: ({ messageId, mode }) => messagingService.deleteMessage(messageId, mode),
    onSuccess: () => {
      toast.success('Message deleted');
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (err) => {
      toast.error('Delete failed', err.response?.data?.message || 'Could not delete message.');
    },
  });

  // ── Reaction Mutation ──
  const reactionMutation = useMutation({
    mutationFn: ({ messageId, emoji }) => messagingService.toggleReaction(messageId, emoji),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
    },
  });

  // ── Mute / Archive Mutations ──
  const muteMutation = useMutation({
    mutationFn: (muted) => messagingService.muteConversation(conversationId, { muted }),
    onSuccess: (_, muted) => {
      toast.success(muted ? 'Conversation Muted' : 'Conversation Unmuted');
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (archived) => messagingService.archiveConversation(conversationId, { archived }),
    onSuccess: (_, archived) => {
      toast.success(archived ? 'Conversation Archived' : 'Conversation Unarchived');
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  const blockUserMutation = useMutation({
    mutationFn: (userId) => moderationService.blockUser(userId),
    onSuccess: () => {
      toast.success('User Blocked', 'You will no longer receive messages from this user.');
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      onBack?.();
    },
  });

  // Handle typing input
  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputText(val);

    if (!isTypingRef.current && val.trim().length > 0) {
      isTypingRef.current = true;
      sendTyping(conversationId, true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (isTypingRef.current) {
        isTypingRef.current = false;
        sendTyping(conversationId, false);
      }
    }, 2000);
  };

  const handleSend = (e) => {
    e?.preventDefault();
    if (!inputText.trim()) return;

    if (editingMessage) {
      editMutation.mutate({ messageId: editingMessage._id, body: inputText.trim() });
    } else {
      sendMutation.mutate({
        body: inputText.trim(),
        replyToId: replyingTo?._id,
      });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const typingUsers = getTypingUsers(conversationId);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0A0E17] relative">
      {/* ── Reconnecting Banner ── */}
      {connectionStatus === 'reconnecting' && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-1.5 flex items-center justify-between text-xs text-amber-300">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Real-time connection lost. Reconnecting...</span>
          </div>
          <button
            type="button"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['messages', conversationId] })}
            className="underline hover:text-white font-semibold"
          >
            Refresh
          </button>
        </div>
      )}

      {/* ── 1. CONVERSATION HEADER ── */}
      <div className="p-3.5 sm:px-6 border-b border-white/[0.08] bg-[#0E1524]/90 backdrop-blur-xl flex items-center justify-between gap-3 shrink-0 z-10">
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile Back Button */}
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="md:hidden p-2 rounded-xl text-text-muted hover:text-white hover:bg-white/[0.06] transition-colors focus-ring cursor-pointer"
              aria-label="Back to conversations"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          {/* Avatar with Presence */}
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-2xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center overflow-hidden text-brand-mint font-heading font-bold text-sm">
              {avatarUrl ? (
                <img src={getUploadUrl(avatarUrl)} alt={displayName} className="w-full h-full object-cover" />
              ) : isDirect ? (
                <span>{getInitials(displayName)}</span>
              ) : (
                <Users className="w-5 h-5 text-brand-mint" />
              )}
            </div>
            {isOnline && (
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0E1524] bg-brand-mint shadow-sm" />
            )}
          </div>

          {/* Name, Role & Presence status */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white truncate">{displayName}</h3>
              {isDirect && otherUser?.role && (
                <EcosystemRoleBadge role={otherUser.role} size="xs" />
              )}
            </div>

            <p className="text-[11px] text-text-muted truncate mt-0.5">
              {isDirect
                ? isOnline
                  ? 'Online'
                  : otherUser?.headline || 'Infrastructure Professional'
                : `${conversation?.members?.length || 0} members`}
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isDirect && otherUser?.username && (
            <Link
              to={`/network/profile/${encodeURIComponent(otherUser.username)}`}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/[0.1] bg-white/[0.04] text-xs font-semibold text-text-secondary hover:text-white hover:bg-white/[0.08] transition-all focus-ring"
            >
              <span>View Profile</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          )}

          {/* More Options Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-xl text-text-muted hover:text-white hover:bg-white/[0.06] transition-colors focus-ring cursor-pointer"
              aria-label="Conversation options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 rounded-2xl border border-white/[0.1] bg-[#111A29]/95 p-1.5 shadow-2xl backdrop-blur-xl z-30 divide-y divide-white/[0.06]">
                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => {
                      muteMutation.mutate(!isMuted);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-text-secondary hover:text-white hover:bg-white/[0.06] rounded-xl transition-colors text-left"
                  >
                    {isMuted ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                    <span>{isMuted ? 'Unmute Chat' : 'Mute Chat'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      archiveMutation.mutate(!isArchived);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-text-secondary hover:text-white hover:bg-white/[0.06] rounded-xl transition-colors text-left"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>{isArchived ? 'Unarchive' : 'Archive'}</span>
                  </button>
                </div>

                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setReportTarget({
                        type: 'CONVERSATION',
                        id: conversationId,
                        name: displayName,
                      });
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-text-muted hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors text-left"
                  >
                    <Flag className="w-3.5 h-3.5" />
                    <span>Report Conversation</span>
                  </button>

                  {isDirect && otherUser?._id && (
                    <button
                      type="button"
                      onClick={() => {
                        blockUserMutation.mutate(otherUser._id);
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-colors text-left"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>Block User</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 2. MESSAGES STREAM ── */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {isLoadingMessages ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}
              >
                <div className="w-48 sm:w-64 h-14 rounded-2xl bg-white/[0.03] animate-pulse" />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <div className="w-14 h-14 rounded-3xl bg-brand-mint/10 border border-brand-mint/20 flex items-center justify-center text-brand-mint mb-3">
              <Smile className="w-7 h-7" />
            </div>
            <h4 className="text-sm font-bold text-white mb-1">Say hello!</h4>
            <p className="text-xs text-text-muted max-w-xs leading-relaxed">
              Start your professional conversation with {displayName}.
            </p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = String(msg.senderId?._id || msg.senderId) === currentUserId;
            const senderName = msg.senderId?.name || 'User';
            const showDateDivider =
              index === 0 ||
              new Date(msg.createdAt).toDateString() !==
                new Date(messages[index - 1].createdAt).toDateString();

            return (
              <div key={msg._id} className="space-y-2">
                {showDateDivider && (
                  <div className="flex items-center justify-center my-4">
                    <span className="px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-[10px] font-mono uppercase tracking-wider text-text-muted">
                      {formatDateDivider(msg.createdAt)}
                    </span>
                  </div>
                )}

                <div
                  className={`group relative flex flex-col ${
                    isMe ? 'items-end' : 'items-start'
                  }`}
                >
                  {/* Sender Name in group chat */}
                  {!isMe && !isDirect && (
                    <span className="text-[11px] font-medium text-text-muted mb-1 ml-2">
                      {senderName}
                    </span>
                  )}

                  {/* Message Bubble Container */}
                  <div className="relative max-w-[85%] sm:max-w-[70%]">
                    {/* Hover Floating Actions Menu */}
                    <div
                      className={`absolute top-0 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center gap-1 bg-[#151D2C] border border-white/[0.1] rounded-xl px-1.5 py-1 shadow-lg ${
                        isMe ? 'right-0' : 'left-0'
                      }`}
                    >
                      {/* Quick Reactions */}
                      {REACTION_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => reactionMutation.mutate({ messageId: msg._id, emoji })}
                          className="hover:scale-125 transition-transform text-xs p-1"
                        >
                          {emoji}
                        </button>
                      ))}

                      <div className="w-[1px] h-3 bg-white/10 mx-0.5" />

                      <button
                        type="button"
                        onClick={() => {
                          setReplyingTo(msg);
                          setEditingMessage(null);
                        }}
                        className="p-1 text-text-muted hover:text-white"
                        title="Reply"
                      >
                        <Reply className="w-3 h-3" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(msg.body);
                          toast.success('Copied to clipboard');
                        }}
                        className="p-1 text-text-muted hover:text-white"
                        title="Copy"
                      >
                        <Copy className="w-3 h-3" />
                      </button>

                      {isMe ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingMessage(msg);
                              setInputText(msg.body);
                              setReplyingTo(null);
                            }}
                            className="p-1 text-text-muted hover:text-white"
                            title="Edit"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteMutation.mutate({ messageId: msg._id, mode: 'me' })}
                            className="p-1 text-text-muted hover:text-rose-400"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            setReportTarget({
                              type: 'MESSAGE',
                              id: msg._id,
                              name: `Message from ${senderName}`,
                            })
                          }
                          className="p-1 text-text-muted hover:text-rose-400"
                          title="Report"
                        >
                          <Flag className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* Actual Bubble */}
                    <div
                      className={`p-3.5 rounded-2xl text-xs leading-relaxed shadow-md ${
                        isMe
                          ? 'bg-brand-mint text-bg-base font-medium rounded-br-xs'
                          : 'bg-[#151D2C] border border-white/[0.08] text-white rounded-bl-xs'
                      }`}
                    >
                      {/* Reply-To Preview if present */}
                      {msg.replyTo && (
                        <div
                          className={`mb-2 p-2 rounded-lg text-[11px] border-l-2 ${
                            isMe
                              ? 'bg-black/10 border-bg-base/40 text-bg-base/90'
                              : 'bg-white/[0.04] border-brand-mint text-text-secondary'
                          }`}
                        >
                          <p className="font-semibold">{msg.replyTo.senderName || 'Replied to'}</p>
                          <p className="truncate line-clamp-1">{msg.replyTo.bodySnippet}</p>
                        </div>
                      )}

                      {/* Body */}
                      <p className="whitespace-pre-wrap break-words">{msg.body}</p>

                      {/* Timestamp & Meta */}
                      <div
                        className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                          isMe ? 'text-bg-base/70' : 'text-text-faint'
                        }`}
                      >
                        {msg.isEdited && <span>(edited)</span>}
                        <span>{formatTime(msg.createdAt)}</span>
                        {isMe && (
                          <span title={msg.status}>
                            {msg.status === 'read' ? (
                              <CheckCheck className="w-3 h-3 text-bg-base" />
                            ) : msg.status === 'delivered' ? (
                              <CheckCheck className="w-3 h-3 opacity-70" />
                            ) : (
                              <Check className="w-3 h-3 opacity-70" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Reactions Display */}
                    {msg.reactions && msg.reactions.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {msg.reactions.map((r, rIdx) => {
                          const userHasReacted = r.users?.some(
                            (u) => String(u) === currentUserId,
                          );
                          return (
                            <button
                              key={rIdx}
                              type="button"
                              onClick={() => reactionMutation.mutate({ messageId: msg._id, emoji: r.emoji })}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border cursor-pointer ${
                                userHasReacted
                                  ? 'bg-brand-mint/15 border-brand-mint/40 text-brand-mint font-bold'
                                  : 'bg-white/[0.04] border-white/[0.08] text-text-muted hover:text-white'
                              }`}
                            >
                              <span>{r.emoji}</span>
                              <span>{r.count}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── 3. TYPING INDICATOR ── */}
      {typingUsers.length > 0 && (
        <div className="px-6 py-1.5 text-xs text-brand-mint flex items-center gap-1.5 bg-[#0E1524]/60">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-mint animate-pulse" />
          <span>{typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...</span>
        </div>
      )}

      {/* ── 4. STICKY COMPOSER ── */}
      <div className="p-3 sm:p-4 border-t border-white/[0.08] bg-[#0E1524]/90 backdrop-blur-xl shrink-0 space-y-2">
        {/* Reply / Edit Banner */}
        {(replyingTo || editingMessage) && (
          <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs">
            <div className="flex items-center gap-2 truncate">
              {editingMessage ? (
                <Edit2 className="w-3.5 h-3.5 text-brand-gold shrink-0" />
              ) : (
                <Reply className="w-3.5 h-3.5 text-brand-mint shrink-0" />
              )}
              <div className="truncate">
                <p className="font-semibold text-white">
                  {editingMessage ? 'Editing message' : `Replying to ${replyingTo?.senderId?.name || 'message'}`}
                </p>
                <p className="text-text-muted truncate text-[11px]">
                  {editingMessage ? editingMessage.body : replyingTo?.body}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setReplyingTo(null);
                setEditingMessage(null);
                setInputText('');
              }}
              className="p-1 rounded-lg text-text-muted hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Quick Emoji Bar (Collapsible) */}
        {showEmojiPicker && (
          <div className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            {['👋', '👍', '❤️', '👏', '🎯', '🚀', '🔥', '💡'].map((em) => (
              <button
                key={em}
                type="button"
                onClick={() => setInputText((prev) => prev + em)}
                className="hover:scale-125 transition-transform text-base p-1"
              >
                {em}
              </button>
            ))}
          </div>
        )}

        {/* Main Input Row */}
        <form onSubmit={handleSend} className="flex items-end gap-2">
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-2.5 rounded-xl text-text-muted hover:text-white hover:bg-white/[0.06] transition-colors focus-ring"
            title="Emoji picker"
          >
            <Smile className="w-4 h-4" />
          </button>

          <textarea
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder={
              editingMessage
                ? 'Update your message...'
                : `Message ${displayName}... (Press Enter to send)`
            }
            className="flex-1 max-h-32 min-h-[42px] py-2.5 px-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] focus:border-brand-mint/40 text-xs text-white placeholder-text-muted resize-none focus:outline-none transition-colors"
          />

          <button
            type="submit"
            disabled={!inputText.trim() || sendMutation.isPending || editMutation.isPending}
            className="p-2.5 rounded-xl bg-brand-mint text-bg-base font-bold hover:bg-brand-mint/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed focus-ring cursor-pointer"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Moderation Report Modal */}
      {reportTarget && (
        <ReportModal
          targetType={reportTarget.type}
          targetId={reportTarget.id}
          targetName={reportTarget.name}
          onClose={() => setReportTarget(null)}
        />
      )}
    </div>
  );
}
