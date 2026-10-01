import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
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
  Search,
  ExternalLink,
  Users,
  X,
  RefreshCw,
  Paperclip,
  FileText,
  Download,
  Image as ImageIcon,
  Loader2,
  CornerDownRight,
  PanelRightClose,
  PanelRightOpen,
  ArrowDown,
  Pin,
  PinOff,
  Bookmark,
  BookmarkCheck,
  Maximize2,
  Link2,
  MessageSquare,
  Share2,
  CornerUpRight,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { messagingService } from '../../services/messagingService';
import moderationService from '../../services/moderationService';
import { useMessaging } from '../../context/MessagingContext';
import { useToast } from '../ui/Toast';
import { getUploadUrl } from '../../utils/courseUi';
import EcosystemRoleBadge from '../network/EcosystemRoleBadge';
import ReportModal from '../network/ReportModal';
import ConversationContextPanel from './ConversationContextPanel';
import MentionAutocomplete from './MentionAutocomplete';
import ThreadPanel from './ThreadPanel';
import ForwardMessageModal from './ForwardMessageModal';
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
import {
  getConversationDraft,
  setConversationDraft,
  clearConversationDraft,
} from '../../utils/messagingDrafts';

// Backend AddReactionDto strictly allows: 👍, ❤️, 👏, 🎯
const REACTION_EMOJIS = ['👍', '❤️', '👏', '🎯'];

function formatTime(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateDivider(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Safe client-side URL detection without SSRF vulnerabilities
function extractUrlMetadata(text) {
  if (!text) return null;
  const match = text.match(/https?:\/\/[^\s]+/i);
  if (!match) return null;
  try {
    const parsed = new URL(match[0]);
    return {
      rawUrl: match[0],
      hostname: parsed.hostname,
      pathname: parsed.pathname.length > 20 ? `${parsed.pathname.slice(0, 20)}…` : parsed.pathname,
    };
  } catch {
    return null;
  }
}

// Pure emoji-only message detection (1-3 emojis without extra text)
function isPureEmojiMessage(text) {
  if (!text) return false;
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 12) return false;
  const emojiRegex = /^(\p{Extended_Pictographic}|\p{Emoji_Presentation}|\u200d|\ufe0f){1,3}$/u;
  return emojiRegex.test(trimmed);
}

// Structured mention rendering with canonical profile routing
function renderBodyWithMentions(body, _mentions = [], isMe = false) {
  if (!body) return null;
  const parts = body.split(/(@[a-zA-Z0-9_]+)/g);
  return (
    <p className="whitespace-pre-wrap break-words">
      {parts.map((part, idx) => {
        if (part.startsWith('@')) {
          const uName = part.slice(1);
          return (
            <Link
              key={idx}
              to={`/u/${uName}`}
              onClick={(e) => e.stopPropagation()}
              className={`inline-flex items-center font-semibold rounded px-1 py-0.2 mx-0.5 transition-colors ${
                isMe
                  ? 'bg-black/15 text-bg-base hover:underline'
                  : 'bg-brand-mint/15 text-brand-mint hover:text-brand-mint/80 hover:bg-brand-mint/25'
              }`}
            >
              {part}
            </Link>
          );
        }
        return <span key={idx}>{part}</span>;
      })}
    </p>
  );
}

export default function ChatArea({ conversationId, onBack }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const urlMessageId = searchParams.get('m');
  const urlThreadId = searchParams.get('t');

  const {
    currentUserId,
    joinConversation,
    leaveConversation,
    sendTyping,
    markRead,
    getTypingUsers,
    isUserOnline,
    formatUserPresence,
    connectionStatus,
    targetMessageId,
    setTargetMessageId,
    saveMessage,
    unsaveMessage,
    pinMessage,
    unpinMessage,
    activeThreadRoot,
    openThread,
    closeThread,
    forwardMessageTarget,
    openForwardModal,
    closeForwardModal,
  } = useMessaging();

  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [failedUploads, setFailedUploads] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showInChatSearch, setShowInChatSearch] = useState(false);
  const [chatSearchText, setChatSearchText] = useState('');
  const [showContextPanel, setShowContextPanel] = useState(false);
  const [activeMobileMessage, setActiveMobileMessage] = useState(null);
  const [reportTarget, setReportTarget] = useState(null); // { type, id, name }
  const [lightboxMedia, setLightboxMedia] = useState(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const [focusedMessage, setFocusedMessage] = useState(null);
  const [showPinnedModal, setShowPinnedModal] = useState(false);
  const [pressedMessageId, setPressedMessageId] = useState(null);
  const touchStartPos = useRef({ x: 0, y: 0 });
  const longPressTimer = useRef(null);
  const lastTapRef = useRef({ time: 0, msgId: null });

  // Close active mobile message on Android back or Escape
  useEffect(() => {
    if (!activeMobileMessage) return;
    const handlePop = () => {
      setActiveMobileMessage(null);
    };
    const handleEsc = (e) => {
      if (e.key === 'Escape') setActiveMobileMessage(null);
    };
    window.addEventListener('popstate', handlePop);
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('popstate', handlePop);
      window.removeEventListener('keydown', handleEsc);
    };
  }, [activeMobileMessage]);

  const handleTouchStart = (e, msg) => {
    if (!e.touches || e.touches.length === 0) return;
    const now = e.timeStamp || 0;
    const msgId = msg._id || msg.id;

    // Check for quick double tap on the same message (Section 16: quick ❤️ reaction)
    if (
      lastTapRef.current.msgId === msgId &&
      now - lastTapRef.current.time < 320
    ) {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
      setPressedMessageId(null);
      lastTapRef.current = { time: 0, msgId: null };
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate(30);
        } catch {
          // Ignore vibration permission errors
        }
      }
      reactionMutation.mutate({ messageId: msgId, emoji: '❤️' });
      return;
    }

    lastTapRef.current = { time: now, msgId };
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    setPressedMessageId(msgId);
    longPressTimer.current = setTimeout(() => {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate(40);
        } catch {
          // Ignore vibration permission errors
        }
      }
      setActiveMobileMessage(msg);
      setPressedMessageId(null);
    }, 420);
  };

  const handleTouchMove = (e) => {
    if (!touchStartPos.current || !longPressTimer.current) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPos.current.x);
    const dy = Math.abs(touch.clientY - touchStartPos.current.y);
    if (dx > 10 || dy > 10) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
      setPressedMessageId(null);
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setPressedMessageId(null);
  };

  const handleTouchCancel = handleTouchEnd;

  // ── Tier 3 Mention State ──
  const [mentionVisible, setMentionVisible] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [collectedMentions, setCollectedMentions] = useState([]);

  const messagesEndRef = useRef(null);
  const firstUnreadRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  // ── 1. Fetch Conversation Details ──
  const { data: convData } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: () => messagingService.getConversation(conversationId),
    enabled: Boolean(conversationId),
    staleTime: 1000 * 30,
  });

  const conversation = convData?.conversation || convData;
  const isDirect =
    conversation?.type === 'DIRECT' ||
    conversation?.type === 'MESSAGE_REQUEST';
  const otherUser = isDirect
    ? getOtherParticipant(conversation, currentUserId)
    : null;
  const displayName = getConversationDisplayName(conversation, currentUserId);
  const avatarUrl = getConversationAvatar(conversation, currentUserId);
  const initials = getInitials(displayName);
  const otherId = getUserId(otherUser);
  const isOnline = isDirect && otherId && isUserOnline(otherId);
  const isMuted = Boolean(conversation?.isMuted);
  const isArchived = Boolean(conversation?.isArchived);
  const professionalContext = isDirect
    ? getProfessionalContext(otherUser)
    : null;
  const username =
    isDirect && otherUser?.username
      ? `@${otherUser.username.replace(/^@/, '')}`
      : null;
  const participants = useMemo(
    () => conversation?.participants || conversation?.members || [],
    [conversation?.participants, conversation?.members],
  );
  const memberCount =
    conversation?.memberCount ||
    participants.length ||
    0;

  // Real-time online member count for group conversations
  const onlineGroupCount = useMemo(() => {
    if (isDirect) return 0;
    return participants.filter((p) => {
      const pId = getUserId(p);
      return pId && String(pId) !== String(currentUserId) && isUserOnline(pId);
    }).length;
  }, [isDirect, participants, currentUserId, isUserOnline]);

  // ── 2. Draft Persistence Handling ──
  useEffect(() => {
    if (!conversationId) return;
    const savedDraft = getConversationDraft(conversationId);
    setInputText(savedDraft || '');
    setReplyingTo(null);
    setEditingMessage(null);
    setAttachments([]);
  }, [conversationId]);

  // ── 3. Fetch Messages ──
  const { data: messagesData, isLoading: isLoadingMessages } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => messagingService.getMessages(conversationId, { limit: 50 }),
    enabled: Boolean(conversationId),
    staleTime: 1000 * 5,
    refetchOnWindowFocus: false,
  });

  const rawMessages = useMemo(() => messagesData?.messages || [], [messagesData?.messages]);

  // Filter messages if in-chat search active
  const messages = useMemo(() => {
    if (!chatSearchText.trim()) return rawMessages;
    const q = chatSearchText.toLowerCase();
    return rawMessages.filter(
      (m) =>
        (m.body && m.body.toLowerCase().includes(q)) ||
        m.attachments?.some((a) => a.name && a.name.toLowerCase().includes(q)),
    );
  }, [rawMessages, chatSearchText]);

  // Calculate first unread message divider position
  const firstUnreadIndex = useMemo(() => {
    const unreadCount = conversation?.unreadCount || 0;
    if (unreadCount <= 0 || rawMessages.length === 0) return -1;
    let remaining = unreadCount;
    for (let i = rawMessages.length - 1; i >= 0; i--) {
      const isMe =
        String(rawMessages[i].senderId?._id || rawMessages[i].senderId?.id || rawMessages[i].senderId) ===
        String(currentUserId);
      if (!isMe) {
        remaining--;
        if (remaining === 0) return i;
      }
    }
    return -1;
  }, [conversation?.unreadCount, rawMessages, currentUserId]);

  // Join socket room & mark as read
  useEffect(() => {
    if (!conversationId) return;
    joinConversation(conversationId);
    markRead(conversationId);

    return () => {
      leaveConversation(conversationId);
    };
  }, [conversationId, joinConversation, leaveConversation, markRead]);

  // ── 4. Fetch Pinned Messages ──
  const { data: pinnedData } = useQuery({
    queryKey: ['pinned', conversationId],
    queryFn: () => messagingService.getPinnedMessages(conversationId),
    enabled: Boolean(conversationId),
    staleTime: 1000 * 30,
  });
  const pinnedMessages = useMemo(() => {
    if (Array.isArray(pinnedData?.pinned)) return pinnedData.pinned;
    if (Array.isArray(pinnedData)) return pinnedData;
    return [];
  }, [pinnedData]);

  const isGroup = conversation?.type === 'GROUP';
  const myMember = useMemo(
    () =>
      conversation?.members?.find(
        (m) => String(m.userId?._id || m.userId) === String(currentUserId),
      ),
    [conversation?.members, currentUserId],
  );
  const isGroupAdmin =
    isGroup &&
    (myMember?.role === 'ADMIN' ||
      String(conversation?.createdBy?._id || conversation?.createdBy) === String(currentUserId));
  const canPinMsg = useCallback(
    (msg) =>
      !isGroup ||
      isGroupAdmin ||
      String(msg?.senderId?._id || msg?.senderId) === String(currentUserId),
    [isGroup, isGroupAdmin, currentUserId],
  );

  // Scroll to bottom on new messages (unless in-chat search active or jumping to message)
  useEffect(() => {
    if (!chatSearchText && !targetMessageId && !highlightedMessageId) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, chatSearchText, targetMessageId, highlightedMessageId]);

  // ── 5. Jump to Message Handler ──
  const handleJumpToMessage = useCallback(
    async (msgId) => {
      if (!msgId) return;

      const findAndScroll = () => {
        const el = document.getElementById(`message-${msgId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setHighlightedMessageId(msgId);
          setTimeout(() => {
            setHighlightedMessageId((curr) => (curr === msgId ? null : curr));
          }, 2500);
          return true;
        }
        return false;
      };

      if (findAndScroll()) return;

      // Not loaded in current DOM window, load around target message
      try {
        const res = await messagingService.getMessages(conversationId, {
          around: msgId,
          limit: 35,
        });
        if (res?.messages && res.messages.length > 0) {
          queryClient.setQueryData(['messages', conversationId], (old) => ({
            ...old,
            messages: res.messages,
          }));

          // If target is inside a thread, open the thread root panel
          if (res.targetThreadRootId) {
            const rootMsg = res.messages.find(
              (m) => String(m._id || m.id) === String(res.targetThreadRootId),
            );
            if (rootMsg) {
              openThread(rootMsg);
            }
          }

          setTimeout(() => {
            findAndScroll();
          }, 150);
        } else {
          toast.info('Message unavailable in this conversation');
        }
      } catch (err) {
        console.error('Failed to load message range:', err);
        toast.error('Jump failed', 'Could not locate message in history.');
      }
    },
    [conversationId, queryClient, toast, openThread],
  );

  const hasHandledUrlJumpRef = useRef(null);
  const hasHandledThreadDeepLinkRef = useRef(null);

  // Jump to message if url ?m= or context targetMessageId specified
  useEffect(() => {
    const target = urlMessageId || targetMessageId;
    if (target && !isLoadingMessages && rawMessages.length > 0) {
      if (urlMessageId && hasHandledUrlJumpRef.current === urlMessageId) {
        return;
      }
      if (urlMessageId) {
        hasHandledUrlJumpRef.current = urlMessageId;
      }
      handleJumpToMessage(target);
      if (targetMessageId && setTargetMessageId) {
        setTargetMessageId(null);
      }
    }
  }, [
    urlMessageId,
    targetMessageId,
    isLoadingMessages,
    rawMessages.length,
    handleJumpToMessage,
    setTargetMessageId,
  ]);

  // Deep-link direct to thread: ?t=<threadReplyId> or ?m=<rootId>&t=<threadReplyId>
  useEffect(() => {
    if (urlThreadId && !isLoadingMessages && rawMessages.length > 0) {
      if (hasHandledThreadDeepLinkRef.current === urlThreadId) {
        return;
      }
      hasHandledThreadDeepLinkRef.current = urlThreadId;
      // If root message is urlMessageId, open its thread
      if (urlMessageId) {
        const rootMsg = rawMessages.find(
          (m) => String(m._id || m.id) === String(urlMessageId),
        );
        if (rootMsg) {
          openThread(rootMsg);
        } else {
          handleJumpToMessage(urlMessageId);
        }
      } else {
        handleJumpToMessage(urlThreadId);
      }
    }
  }, [
    urlThreadId,
    urlMessageId,
    isLoadingMessages,
    rawMessages,
    openThread,
    handleJumpToMessage,
  ]);

  // Handle Focus Mode Escape Key
  useEffect(() => {
    if (!focusedMessage) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setFocusedMessage(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedMessage]);

  const handleCopyMessageLink = useCallback(
    (msgId) => {
      if (!msgId) return;
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const link = `${origin}/messages?c=${conversationId}&m=${msgId}`;
      navigator.clipboard.writeText(link);
      toast.success(
        'Message link copied',
        'Direct link to this message saved to clipboard.',
      );
    },
    [conversationId, toast],
  );

  // ── Send Message Mutation ──
  const sendMutation = useMutation({
    mutationFn: (payload) =>
      messagingService.sendMessage(conversationId, payload),
    onSuccess: () => {
      clearConversationDraft(conversationId);
      setInputText('');
      setReplyingTo(null);
      setAttachments([]);
      if (isTypingRef.current) {
        sendTyping(conversationId, false);
        isTypingRef.current = false;
      }
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    },
    onError: (err) => {
      const msg = err.response?.data?.message || 'Failed to send message.';
      toast.error('Unable to send', msg);
    },
  });

  // ── Edit Message Mutation ──
  const editMutation = useMutation({
    mutationFn: ({ messageId, body }) =>
      messagingService.editMessage(messageId, { body }),
    onSuccess: () => {
      setEditingMessage(null);
      setInputText('');
      toast.success('Message updated');
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
    },
    onError: (err) => {
      toast.error(
        'Edit failed',
        err.response?.data?.message || 'Could not edit message.',
      );
    },
  });

  // ── Delete Message Mutation ──
  const deleteMutation = useMutation({
    mutationFn: ({ messageId, mode }) =>
      messagingService.deleteMessage(messageId, mode),
    onSuccess: () => {
      toast.success('Message deleted');
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (err) => {
      toast.error(
        'Delete failed',
        err.response?.data?.message || 'Could not delete message.',
      );
    },
  });

  // ── Reaction Mutation ──
  const reactionMutation = useMutation({
    mutationFn: ({ messageId, emoji }) =>
      messagingService.toggleReaction(messageId, emoji),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
    },
  });

  // ── Mute / Archive Mutations ──
  const muteMutation = useMutation({
    mutationFn: (muted) =>
      messagingService.muteConversation(conversationId, { muted }),
    onSuccess: (_, muted) => {
      toast.success(muted ? 'Conversation Muted' : 'Conversation Unmuted');
      queryClient.invalidateQueries({
        queryKey: ['conversation', conversationId],
      });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (archived) =>
      messagingService.archiveConversation(conversationId, { archived }),
    onSuccess: (_, archived) => {
      toast.success(
        archived ? 'Conversation Archived' : 'Conversation Unarchived',
      );
      queryClient.invalidateQueries({
        queryKey: ['conversation', conversationId],
      });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  const blockUserMutation = useMutation({
    mutationFn: (userId) => moderationService.blockUser(userId),
    onSuccess: () => {
      toast.success(
        'User Blocked',
        'You will no longer receive messages from this user.',
      );
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      onBack?.();
    },
  });

  const leaveGroupMutation = useMutation({
    mutationFn: () => messagingService.leaveGroup(conversationId),
    onSuccess: () => {
      toast.success('Left group');
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      onBack?.();
    },
    onError: (err) => {
      toast.error(
        'Failed to leave group',
        err.response?.data?.message || 'Please try again.',
      );
    },
  });

  // ── File Upload Handler ──
  const handleFileUpload = async (file) => {
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      toast.error('File too large', 'Max file size is 25MB.');
      return;
    }
    setIsUploadingAttachment(true);
    setUploadProgress(20);

    const progressTimer = setInterval(() => {
      setUploadProgress((p) => (p < 85 ? p + 15 : p));
    }, 150);

    try {
      const res = await messagingService.uploadAttachment(file);
      clearInterval(progressTimer);
      setUploadProgress(100);

      setAttachments((prev) => [
        ...prev,
        {
          url: res.url,
          name: res.name || file.name,
          type: res.type || (file.type.startsWith('image/') ? 'image' : 'file'),
          size: res.size || file.size,
        },
      ]);
      setFailedUploads((prev) => prev.filter((f) => f.name !== file.name));
      toast.success('Attachment ready', file.name);
    } catch (err) {
      clearInterval(progressTimer);
      setFailedUploads((prev) => [
        ...prev.filter((f) => f.name !== file.name),
        file,
      ]);
      toast.error(
        'Attachment upload failed',
        err.response?.data?.message || 'Could not upload attachment.',
      );
    } finally {
      setTimeout(() => {
        setIsUploadingAttachment(false);
        setUploadProgress(0);
      }, 300);
    }
  };

  const handleFileInputChange = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach(handleFileUpload);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Drag & Drop Handlers ──
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files || []);
    files.forEach(handleFileUpload);
  };

  // ── Paste Image from Clipboard ──
  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          handleFileUpload(file);
          break;
        }
      }
    }
  };

  // ── Input & Typing Change with Draft Persistence & Mention Detection ──
  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputText(val);
    setConversationDraft(conversationId, val);

    // Auto-expand textarea up to max-height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }

    // Auto-detect @mention query
    const cursor = e.target.selectionEnd || val.length;
    const textBefore = val.slice(0, cursor);
    const match = textBefore.match(/(?:^|\s)@([a-zA-Z0-9_]*)$/);
    if (match) {
      setMentionStartIndex(cursor - match[1].length - 1);
      setMentionQuery(match[1]);
      setMentionVisible(true);
    } else {
      setMentionVisible(false);
    }

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

  // ── Mention Autocomplete Selection ──
  const handleMentionSelect = (user) => {
    if (!user || mentionStartIndex < 0) return;
    const before = inputText.slice(0, mentionStartIndex);
    const afterAt = inputText.slice(mentionStartIndex);
    const match = afterAt.match(/^@[a-zA-Z0-9_]*/);
    const tokenLength = match ? match[0].length : 1;
    const after = inputText.slice(mentionStartIndex + tokenLength);
    const newText = `${before}@${user.username} ${after}`;
    setInputText(newText);
    setConversationDraft(conversationId, newText);

    const uId = user.userId || user.id || user._id;
    if (uId) {
      setCollectedMentions((prev) => (prev.includes(uId) ? prev : [...prev, uId]));
    }
    setMentionVisible(false);
    setMentionQuery('');

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newCursor = before.length + (user.username?.length || 0) + 2;
        textareaRef.current.setSelectionRange(newCursor, newCursor);
      }
    }, 0);
  };

  const handleSend = (e) => {
    e?.preventDefault();
    if (!inputText.trim() && attachments.length === 0) return;

    if (editingMessage) {
      editMutation.mutate({
        messageId: editingMessage._id,
        body: inputText.trim(),
      });
    } else {
      const fallbackBody =
        attachments.length > 0
          ? `📎 ${attachments[0].name}`
          : 'Sent a message';
      const bodyToSend = inputText.trim() || fallbackBody;

      sendMutation.mutate({
        body: bodyToSend,
        replyToId: replyingTo?._id,
        attachments: attachments.length > 0 ? attachments : undefined,
        mentions: collectedMentions.length > 0 ? collectedMentions : undefined,
      });
      setCollectedMentions([]);
      setMentionVisible(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      if (typeof window !== 'undefined' && window.innerWidth >= 768) {
        e.preventDefault();
        handleSend();
      }
    }
  };

  const typingUsers = getTypingUsers(conversationId);

  return (
    <div
      className="flex-1 flex flex-col h-full bg-[#080C14] relative overflow-hidden"
      role="main"
      aria-label={`Chat with ${displayName}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* ── Drag Overlay ── */}
      {isDragOver && (
        <div className="absolute inset-0 z-50 bg-[#080C14]/90 backdrop-blur-md border-2 border-dashed border-brand-mint flex flex-col items-center justify-center pointer-events-none">
          <Paperclip className="w-12 h-12 text-brand-mint animate-bounce mb-3" />
          <h3 className="text-base font-bold text-white tracking-tight">
            Drop files to attach
          </h3>
          <p className="text-xs text-text-muted mt-1">
            Images, blueprints, specifications, PDFs up to 25MB
          </p>
        </div>
      )}

      {/* ── Reconnecting Banner ── */}
      {connectionStatus === 'reconnecting' && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-1.5 flex items-center justify-between text-xs text-amber-300 z-30">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Connection lost. Reconnecting to messaging server...</span>
          </div>
          <button
            type="button"
            onClick={() =>
              queryClient.invalidateQueries({
                queryKey: ['messages', conversationId],
              })
            }
            className="underline hover:text-white font-semibold cursor-pointer"
          >
            Refresh
          </button>
        </div>
      )}

      {/* ── 1. TIER 1 CONVERSATION HEADER (Sticky, Safe-Area Supported, Never Disappearing) ── */}
      <div className="sticky top-0 z-30 pt-[env(safe-area-inset-top,0px)] border-b border-white/[0.08] bg-[#0C121E]/95 backdrop-blur-xl p-2.5 sm:px-6 sm:py-3.5 flex items-center justify-between gap-2 sm:gap-3 shrink-0 shadow-sm">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
          {/* Mobile Back Button */}
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="md:hidden p-2 -ml-1 rounded-xl text-text-muted hover:text-white hover:bg-white/[0.06] transition-colors focus-ring cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
              aria-label="Back to conversations list"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          {/* Identity Container: Avatar + Presence Indicator + Details (Clickable on Mobile to Open Info) */}
          <div
            onClick={() => {
              if (typeof window !== 'undefined' && window.innerWidth < 1280) {
                setShowContextPanel(true);
              }
            }}
            className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 cursor-pointer xl:cursor-default"
            title="View conversation details"
          >
            {/* Avatar with Presence Indicator */}
            <div className="relative shrink-0">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center overflow-hidden text-brand-mint font-heading font-bold text-xs shadow-inner">
                {avatarUrl ? (
                  <img
                    src={getUploadUrl(avatarUrl)}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                ) : isDirect ? (
                  <span className="tracking-wider">{initials}</span>
                ) : (
                  <Users className="w-5 h-5 text-brand-mint" />
                )}
              </div>
              {isOnline && (
                <span
                  className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#0C121E] bg-brand-mint shadow-sm"
                  title="Online"
                  aria-label="Online"
                />
              )}
            </div>

            {/* Identity & Status */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-white truncate tracking-tight">
                  {displayName}
                </h3>
                {username && (
                  <span className="hidden lg:inline text-[11px] font-mono text-text-muted/70 truncate">
                    {username}
                  </span>
                )}
                {isDirect && otherUser?.role && (
                  <span className="hidden sm:inline-flex">
                    <EcosystemRoleBadge role={otherUser.role} size="xs" />
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 text-[11px] text-text-muted truncate mt-0.5">
                {isDirect ? (
                  <>
                    {isOnline ? (
                      <span className="text-brand-mint font-medium flex items-center gap-1 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-mint animate-pulse inline-block" />
                        Active now
                      </span>
                    ) : (
                      <span className="text-text-muted shrink-0">
                        {formatUserPresence(otherId, false, otherUser)}
                      </span>
                    )}
                    {professionalContext && (
                      <>
                        <span className="text-white/20">•</span>
                        <span className="truncate">{professionalContext}</span>
                      </>
                    )}
                  </>
                ) : (
                  <span>
                    {memberCount} members
                    {onlineGroupCount > 0 ? ` · ${onlineGroupCount} online` : ''}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Desktop Toolbar */}
          <div className="hidden md:flex items-center gap-1">
            {/* Pinned Messages Indicator Badge */}
            {pinnedMessages.length > 0 && (
              <button
                type="button"
                onClick={() => setShowPinnedModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-mint/10 border border-brand-mint/30 text-brand-mint text-xs font-semibold hover:bg-brand-mint/20 transition-all cursor-pointer shadow-xs min-h-[36px]"
                title="View pinned messages in this conversation"
                aria-label={`${pinnedMessages.length} pinned messages`}
              >
                <span>📌</span>
                <span className="font-mono">{pinnedMessages.length}</span>
                <span className="hidden sm:inline">pinned</span>
              </button>
            )}

            {/* Search Toggle */}
            <button
              type="button"
              onClick={() => setShowInChatSearch(!showInChatSearch)}
              className={`p-2 rounded-xl transition-colors focus-ring cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center ${
                showInChatSearch
                  ? 'bg-brand-mint/15 text-brand-mint'
                  : 'text-text-muted hover:text-white hover:bg-white/[0.06]'
              }`}
              title="Search in conversation"
              aria-label="Search messages in conversation"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Canonical Profile Link */}
            {isDirect && otherUser && (
              <Link
                to={getCanonicalProfileUrl(otherUser)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-xs font-semibold text-text-secondary hover:text-white hover:bg-white/[0.06] transition-all focus-ring min-h-[36px]"
                title="View canonical profile"
              >
                <span>Profile</span>
                <ExternalLink className="w-3 h-3 text-text-faint" />
              </Link>
            )}

            {/* Toggle Professional Context Panel (3rd Column) */}
            <button
              type="button"
              onClick={() => setShowContextPanel(!showContextPanel)}
              className={`p-2 rounded-xl transition-colors focus-ring cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center ${
                showContextPanel
                  ? 'bg-brand-mint/15 text-brand-mint border border-brand-mint/30'
                  : 'text-text-muted hover:text-white hover:bg-white/[0.06]'
              }`}
              title={showContextPanel ? 'Close Workspace Panel' : 'Open Workspace Panel'}
              aria-label="Toggle workspace context panel"
            >
              {showContextPanel ? (
                <PanelRightClose className="w-4 h-4" />
              ) : (
                <PanelRightOpen className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Search Toggle (Mobile) */}
          <button
            type="button"
            onClick={() => setShowInChatSearch(!showInChatSearch)}
            className={`md:hidden p-2 rounded-xl transition-colors focus-ring cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center ${
              showInChatSearch
                ? 'bg-brand-mint/15 text-brand-mint'
                : 'text-text-muted hover:text-white hover:bg-white/[0.06]'
            }`}
            title="Search in conversation"
            aria-label="Search messages in conversation"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* More Options Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-xl text-text-muted hover:text-white hover:bg-white/[0.06] transition-colors focus-ring cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="More conversation options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <div
                className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-white/[0.1] bg-[#0E1524]/98 p-1.5 shadow-2xl backdrop-blur-xl z-30 divide-y divide-white/[0.06]"
                role="menu"
              >
                {/* Mobile info entry point */}
                <div className="py-1 md:hidden">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setShowMenu(false);
                      setShowContextPanel(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-brand-mint hover:bg-brand-mint/10 rounded-xl transition-colors text-left cursor-pointer"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Conversation Info</span>
                  </button>
                  {pinnedMessages.length > 0 && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setShowMenu(false);
                        setShowPinnedModal(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-text-secondary hover:text-white hover:bg-white/[0.06] rounded-xl transition-colors text-left cursor-pointer"
                    >
                      <Pin className="w-3.5 h-3.5 text-brand-mint" />
                      <span>Pinned Messages ({pinnedMessages.length})</span>
                    </button>
                  )}
                  {isDirect && otherUser && (
                    <Link
                      to={getCanonicalProfileUrl(otherUser)}
                      onClick={() => setShowMenu(false)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-text-secondary hover:text-white hover:bg-white/[0.06] rounded-xl transition-colors text-left cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                      <span>View Canonical Profile</span>
                    </Link>
                  )}
                </div>

                <div className="py-1">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      muteMutation.mutate(!isMuted);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-text-secondary hover:text-white hover:bg-white/[0.06] rounded-xl transition-colors text-left cursor-pointer"
                  >
                    {isMuted ? (
                      <Volume2 className="w-3.5 h-3.5 text-brand-mint" />
                    ) : (
                      <VolumeX className="w-3.5 h-3.5" />
                    )}
                    <span>{isMuted ? 'Unmute Chat' : 'Mute Chat'}</span>
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      archiveMutation.mutate(!isArchived);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-text-secondary hover:text-white hover:bg-white/[0.06] rounded-xl transition-colors text-left cursor-pointer"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>{isArchived ? 'Unarchive' : 'Archive'}</span>
                  </button>
                </div>

                {!isDirect && (
                  <div className="py-1">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setShowMenu(false);
                        leaveGroupMutation.mutate();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-colors text-left cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Leave Group</span>
                    </button>
                  </div>
                )}

                <div className="py-1">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setReportTarget({
                        type: 'CONVERSATION',
                        id: conversationId,
                        name: displayName,
                      });
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-text-muted hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors text-left cursor-pointer"
                  >
                    <Flag className="w-3.5 h-3.5" />
                    <span>Report Conversation</span>
                  </button>

                  {isDirect && otherId && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        blockUserMutation.mutate(otherId);
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-colors text-left cursor-pointer"
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

      {/* ── Optional In-Chat Search Bar ── */}
      {showInChatSearch && (
        <div className="px-4 py-2 border-b border-white/[0.08] bg-[#0C121E]/90 flex items-center gap-2 shrink-0">
          <Search className="w-4 h-4 text-text-muted shrink-0" />
          <input
            type="text"
            value={chatSearchText}
            onChange={(e) => setChatSearchText(e.target.value)}
            placeholder="Search messages or attachments in this conversation..."
            className="w-full bg-transparent text-xs text-white placeholder-text-muted focus:outline-none"
            autoFocus
          />
          {chatSearchText && (
            <button
              type="button"
              onClick={() => setChatSearchText('')}
              className="p-1 rounded-lg text-text-muted hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setShowInChatSearch(false);
              setChatSearchText('');
            }}
            className="text-xs text-text-muted hover:text-white px-2 py-1 font-semibold"
          >
            Done
          </button>
        </div>
      )}

      {/* ── MAIN WORKSPACE CONTENT: MESSAGES STREAM + COLLAPSIBLE CONTEXT PANEL ── */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Stream & Composer Column */}
        <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
          {/* Floating Jump to Unread Button */}
          {firstUnreadIndex !== -1 && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
              <button
                type="button"
                onClick={() => {
                  firstUnreadRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                  });
                }}
                className="px-3.5 py-1.5 rounded-full bg-[#0E1524]/95 border border-brand-mint/40 text-brand-mint text-xs font-semibold shadow-xl backdrop-blur-md hover:bg-brand-mint/20 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>Jump to unread</span>
                <ArrowDown className="w-3 h-3 animate-bounce" />
              </button>
            </div>
          )}

          {/* ── 2. MESSAGES STREAM ── */}
          <div
            className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3"
            role="log"
            aria-label="Message history"
          >
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
              <div className="h-full flex flex-col items-center justify-center text-center p-8 my-auto">
                <div className="w-14 h-14 rounded-3xl bg-brand-mint/10 border border-brand-mint/20 flex items-center justify-center text-brand-mint mb-3 shadow-lg">
                  <Smile className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-bold text-white mb-1 tracking-tight">
                  {chatSearchText ? 'No matching messages' : 'Your conversations start here.'}
                </h4>
                <p className="text-xs text-text-muted max-w-xs leading-relaxed">
                  {chatSearchText
                    ? 'Try searching with different keywords.'
                    : `Send a direct message to ${displayName} and collaborate across infrastructure domains.`}
                </p>
              </div>
            ) : (
              messages.map((msg, index) => {
                const isMe =
                  String(msg.senderId?._id || msg.senderId?.id || msg.senderId) ===
                  String(currentUserId);
                const senderName = getUserDisplayName(msg.senderId);

                const showDateDivider =
                  index === 0 ||
                  new Date(msg.createdAt).toDateString() !==
                    new Date(messages[index - 1].createdAt).toDateString();

                // Grouping: consecutive messages by same author within 2 minutes
                const prevMsg = index > 0 ? messages[index - 1] : null;
                const isSameSenderAsPrev =
                  prevMsg &&
                  String(prevMsg.senderId?._id || prevMsg.senderId) ===
                    String(msg.senderId?._id || msg.senderId) &&
                  new Date(msg.createdAt) - new Date(prevMsg.createdAt) < 120000 &&
                  !showDateDivider;

                const nextMsg = index < messages.length - 1 ? messages[index + 1] : null;
                const nextMsgDateDivider =
                  nextMsg &&
                  new Date(nextMsg.createdAt).toDateString() !==
                    new Date(msg.createdAt).toDateString();
                const isSameSenderAsNext =
                  nextMsg &&
                  String(nextMsg.senderId?._id || nextMsg.senderId) ===
                    String(msg.senderId?._id || msg.senderId) &&
                  new Date(nextMsg.createdAt) - new Date(msg.createdAt) < 120000 &&
                  !nextMsgDateDivider;

                // Unread divider check
                const isFirstUnread = index === firstUnreadIndex;
                const urlMetadata = extractUrlMetadata(msg.body);

                // Image vs Document attachments
                const imageAttachments = (msg.attachments || []).filter(
                  (att) => att.type === 'image' || att.url?.match(/\.(jpeg|jpg|png|webp|gif)$/i),
                );
                const docAttachments = (msg.attachments || []).filter(
                  (att) => att.type !== 'image' && !att.url?.match(/\.(jpeg|jpg|png|webp|gif)$/i),
                );

                // Short message density check (Phase 7)
                const isShortMessage =
                  !msg.replyTo &&
                  (!msg.attachments || msg.attachments.length === 0) &&
                  !urlMetadata &&
                  !msg.threadReplyCount &&
                  !msg.isPinned &&
                  !msg.isSaved &&
                  Boolean(msg.body && msg.body.trim().length <= 35 && !msg.body.includes('\n'));

                // Pure emoji-only message detection (Section 11)
                const isEmojiOnly =
                  !msg.replyTo &&
                  (!msg.attachments || msg.attachments.length === 0) &&
                  !urlMetadata &&
                  !msg.threadReplyCount &&
                  !msg.isPinned &&
                  !msg.isSaved &&
                  isPureEmojiMessage(msg.body);

                // Connected border-radius styling for message grouping (Phase 6)
                const bubbleCornerRadius = isMe
                  ? isSameSenderAsNext && isSameSenderAsPrev
                    ? 'rounded-2xl rounded-tr-md rounded-br-md'
                    : isSameSenderAsNext && !isSameSenderAsPrev
                    ? 'rounded-2xl rounded-br-md'
                    : !isSameSenderAsNext && isSameSenderAsPrev
                    ? 'rounded-2xl rounded-tr-md rounded-br-xs'
                    : 'rounded-2xl rounded-br-xs'
                  : isSameSenderAsNext && isSameSenderAsPrev
                  ? 'rounded-2xl rounded-tl-md rounded-bl-md'
                  : isSameSenderAsNext && !isSameSenderAsPrev
                  ? 'rounded-2xl rounded-bl-md'
                  : !isSameSenderAsNext && isSameSenderAsPrev
                  ? 'rounded-2xl rounded-tl-md rounded-bl-xs'
                  : 'rounded-2xl rounded-bl-xs';

                return (
                  <div
                    key={msg._id || msg.id}
                    id={`message-${msg._id || msg.id}`}
                    className={`space-y-0.5 transition-all duration-200 rounded-2xl ${
                      isSameSenderAsPrev ? 'mt-0.5 sm:mt-1' : 'mt-2.5 sm:mt-3'
                    } ${
                      highlightedMessageId === (msg._id || msg.id)
                        ? 'p-2 ring-2 ring-brand-mint/60 bg-brand-mint/10 shadow-lg shadow-brand-mint/15'
                        : activeMobileMessage?._id === (msg._id || msg.id)
                        ? 'z-40 relative scale-[1.01] ring-2 ring-brand-mint/60 shadow-2xl'
                        : ''
                    }`}
                  >
                    {showDateDivider && (
                      <div className="flex items-center justify-center my-4">
                        <span className="px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-[10px] font-mono uppercase tracking-wider text-text-muted">
                          {formatDateDivider(msg.createdAt)}
                        </span>
                      </div>
                    )}

                    {/* Unread Messages Divider */}
                    {isFirstUnread && (
                      <div
                        ref={firstUnreadRef}
                        className="flex items-center justify-center my-4 py-1"
                      >
                        <div className="flex-1 border-t border-brand-mint/30" />
                        <span className="px-3.5 py-1 rounded-full bg-brand-mint/15 border border-brand-mint/30 text-[10px] font-mono font-bold text-brand-mint uppercase tracking-wider mx-3 shadow-sm flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-mint animate-pulse" />
                          {conversation.unreadCount} NEW {conversation.unreadCount === 1 ? 'MESSAGE' : 'MESSAGES'}
                        </span>
                        <div className="flex-1 border-t border-brand-mint/30" />
                      </div>
                    )}

                    <div
                      className={`group relative flex flex-col ${
                        isMe ? 'items-end' : 'items-start'
                      }`}
                    >
                      {/* Sender Name in group chat */}
                      {!isMe && !isDirect && !isSameSenderAsPrev && (
                        <span className="text-[11px] font-semibold text-brand-mint/90 mb-1 ml-2">
                          {senderName}
                        </span>
                      )}

                      {/* Message Bubble Container with Contextual Action Support */}
                      <div className={`relative max-w-[88%] sm:max-w-[75%] flex items-end ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className="relative min-w-0">
                          {/* Hover Floating Actions Menu (Desktop) */}
                          <div
                            className={`absolute top-0 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10 hidden sm:flex items-center gap-1 bg-[#101726] border border-white/[0.1] rounded-xl px-1.5 py-1 shadow-xl backdrop-blur-md ${
                              isMe ? 'right-0' : 'left-0'
                            }`}
                          >
                          {/* Reaction Emojis: 👍, ❤️, 👏, 🎯 */}
                          {REACTION_EMOJIS.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() =>
                                reactionMutation.mutate({
                                  messageId: msg._id,
                                  emoji,
                                })
                              }
                              className="hover:scale-125 transition-transform text-xs p-1 cursor-pointer"
                              title={`React with ${emoji}`}
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
                            className="p-1 text-text-muted hover:text-white cursor-pointer"
                            title="Reply"
                            aria-label="Reply to message"
                          >
                            <Reply className="w-3 h-3" />
                          </button>

                          {/* Reply in Thread */}
                          <button
                            type="button"
                            onClick={() => openThread(msg)}
                            className="p-1 text-text-muted hover:text-white cursor-pointer"
                            title="Reply in thread"
                            aria-label="Reply in thread"
                          >
                            <MessageSquare className="w-3 h-3" />
                          </button>

                          {/* Forward Message */}
                          <button
                            type="button"
                            onClick={() => openForwardModal(msg)}
                            className="p-1 text-text-muted hover:text-white cursor-pointer"
                            title="Forward message"
                            aria-label="Forward message"
                          >
                            <Share2 className="w-3 h-3" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(msg.body);
                              toast.success('Copied to clipboard');
                            }}
                            className="p-1 text-text-muted hover:text-white cursor-pointer"
                            title="Copy message text"
                            aria-label="Copy message text"
                          >
                            <Copy className="w-3 h-3" />
                          </button>

                          {/* Save / Unsave Message */}
                          <button
                            type="button"
                            onClick={() => {
                              if (msg.isSaved) {
                                unsaveMessage(msg._id);
                              } else {
                                saveMessage(msg._id);
                              }
                            }}
                            className={`p-1 cursor-pointer transition-colors ${
                              msg.isSaved
                                ? 'text-brand-gold hover:text-brand-gold/80'
                                : 'text-text-muted hover:text-white'
                            }`}
                            title={msg.isSaved ? 'Unsave message' : 'Save message'}
                            aria-label={msg.isSaved ? 'Unsave message' : 'Save message'}
                          >
                            {msg.isSaved ? (
                              <BookmarkCheck className="w-3 h-3 fill-brand-gold/20" />
                            ) : (
                              <Bookmark className="w-3 h-3" />
                            )}
                          </button>

                          {/* Pin / Unpin Message */}
                          {canPinMsg(msg) && (
                            <button
                              type="button"
                              onClick={() => {
                                if (msg.isPinned) {
                                  unpinMessage(conversationId, msg._id);
                                } else {
                                  pinMessage(conversationId, msg._id);
                                }
                              }}
                              className={`p-1 cursor-pointer transition-colors ${
                                msg.isPinned
                                  ? 'text-brand-mint hover:text-brand-mint/80'
                                  : 'text-text-muted hover:text-white'
                              }`}
                              title={msg.isPinned ? 'Unpin message' : 'Pin message'}
                              aria-label={msg.isPinned ? 'Unpin message' : 'Pin message'}
                            >
                              {msg.isPinned ? (
                                <PinOff className="w-3 h-3" />
                              ) : (
                                <Pin className="w-3 h-3" />
                              )}
                            </button>
                          )}

                          {/* Focus Message Mode */}
                          <button
                            type="button"
                            onClick={() => setFocusedMessage(msg)}
                            className="p-1 text-text-muted hover:text-white cursor-pointer"
                            title="Focus message (Esc to close)"
                            aria-label="Focus message"
                          >
                            <Maximize2 className="w-3 h-3" />
                          </button>

                          {/* Copy Link to Message */}
                          <button
                            type="button"
                            onClick={() => handleCopyMessageLink(msg._id)}
                            className="p-1 text-text-muted hover:text-white cursor-pointer"
                            title="Copy link to message"
                            aria-label="Copy message link"
                          >
                            <Link2 className="w-3 h-3" />
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
                                className="p-1 text-text-muted hover:text-white cursor-pointer"
                                title="Edit"
                                aria-label="Edit message"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  deleteMutation.mutate({
                                    messageId: msg._id,
                                    mode: 'me',
                                  })
                                }
                                className="p-1 text-text-muted hover:text-rose-400 cursor-pointer"
                                title="Delete"
                                aria-label="Delete message"
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
                              className="p-1 text-text-muted hover:text-rose-400 cursor-pointer"
                              title="Report"
                              aria-label="Report message"
                            >
                              <Flag className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        {/* Actual Message Bubble */}
                        <div
                          role="article"
                          tabIndex={0}
                          aria-label={`Message: ${msg.body || 'attachment'}. Press Enter or long-press for options.`}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setActiveMobileMessage(msg);
                            }
                          }}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            reactionMutation.mutate({ messageId: msg._id || msg.id, emoji: '❤️' });
                          }}
                          onTouchStart={(e) => handleTouchStart(e, msg)}
                          onTouchMove={handleTouchMove}
                          onTouchEnd={handleTouchEnd}
                          onTouchCancel={handleTouchCancel}
                          className={`transition-all duration-150 select-text outline-none focus-visible:ring-2 focus-visible:ring-brand-mint/60 ${bubbleCornerRadius} ${
                            isEmojiOnly
                              ? 'p-1.5 bg-transparent shadow-none cursor-pointer'
                              : isShortMessage
                              ? 'px-3.5 py-1.5 text-xs leading-relaxed shadow-xs cursor-default'
                              : 'p-3 sm:p-3.5 text-xs leading-relaxed shadow-xs cursor-default'
                          } ${
                            pressedMessageId === (msg._id || msg.id)
                              ? 'scale-[0.98] ring-2 ring-brand-mint/50 opacity-90'
                              : ''
                          } ${
                            isEmojiOnly
                              ? ''
                              : isMe
                              ? 'bg-gradient-to-br from-[#9FD5B2] via-[#94CFAB] to-[#80BF98] text-[#07130E] font-medium border border-white/10'
                              : 'bg-[#0E1524] border border-white/[0.07] text-[#F3F4F6]'
                          }`}
                        >
                          {isEmojiOnly ? (
                            <div className="flex items-end gap-2 py-0.5">
                              <span className="text-3xl sm:text-4xl leading-none select-none">
                                {msg.body.trim()}
                              </span>
                              <span className="text-[9px] font-mono text-text-faint/80 shrink-0 mb-0.5">
                                {formatTime(msg.createdAt)}
                              </span>
                            </div>
                          ) : isShortMessage ? (
                            <div className="flex items-baseline gap-2">
                              {renderBodyWithMentions(msg.body, msg.mentions, isMe)}
                              <span
                                className={`inline-flex items-center gap-0.5 text-[9px] font-mono shrink-0 whitespace-nowrap ml-1 ${
                                  isMe ? 'text-[#07130E]/70' : 'text-text-faint'
                                }`}
                              >
                                {msg.isEdited && <span className="mr-0.5">(edited)</span>}
                                {formatTime(msg.createdAt)}
                                {isMe && (
                                  <span title={msg.status}>
                                    {msg.status === 'read' ? (
                                      <CheckCheck className="w-2.5 h-2.5 text-[#07130E] inline ml-0.5" />
                                    ) : msg.status === 'delivered' ? (
                                      <CheckCheck className="w-2.5 h-2.5 opacity-70 inline ml-0.5" />
                                    ) : (
                                      <Check className="w-2.5 h-2.5 opacity-70 inline ml-0.5" />
                                    )}
                                  </span>
                                )}
                              </span>
                            </div>
                          ) : (
                            <>
                          {/* Saved & Pinned Indicator Badges */}
                          {(msg.isPinned || msg.isSaved) && (
                            <div className="flex items-center gap-1.5 mb-1.5">
                              {msg.isPinned && (
                                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md shadow-xs ${
                                  isMe
                                    ? 'bg-black/15 text-bg-base border border-bg-base/30'
                                    : 'bg-brand-mint/15 text-brand-mint border border-brand-mint/30'
                                }`}>
                                  <Pin className="w-2.5 h-2.5" />
                                  <span>Pinned</span>
                                </span>
                              )}
                              {msg.isSaved && (
                                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md shadow-xs ${
                                  isMe
                                    ? 'bg-black/15 text-bg-base border border-bg-base/30'
                                    : 'bg-brand-gold/15 text-brand-gold border border-brand-gold/30'
                                }`}>
                                  <Bookmark className="w-2.5 h-2.5 fill-current" />
                                  <span>Saved</span>
                                </span>
                              )}
                            </div>
                          )}

                          {/* Reply-To Preview (Clickable Jump) */}
                          {msg.replyTo && (
                            <div
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation();
                                const parentId = msg.replyTo.messageId || msg.replyTo._id;
                                if (parentId) {
                                  handleJumpToMessage(parentId);
                                } else {
                                  toast.info('Original message unavailable');
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const parentId = msg.replyTo.messageId || msg.replyTo._id;
                                  if (parentId) handleJumpToMessage(parentId);
                                }
                              }}
                              className={`mb-2 p-2 rounded-xl text-[11px] border-l-2 cursor-pointer transition-all hover:opacity-90 active:scale-[0.99] ${
                                isMe
                                  ? 'bg-black/10 border-bg-base/40 text-bg-base/90 hover:bg-black/15'
                                  : 'bg-white/[0.04] border-brand-mint text-text-secondary hover:bg-white/[0.07]'
                              }`}
                              title="Click to jump to original message"
                            >
                              <div className="flex items-center justify-between gap-1 font-semibold">
                                <div className="flex items-center gap-1">
                                  <CornerDownRight className="w-3 h-3" />
                                  <span>{msg.replyTo.senderName || 'Replied to'}</span>
                                </div>
                                <span className="text-[9px] opacity-60 font-mono tracking-wider">JUMP ↑</span>
                              </div>
                              <p className="truncate line-clamp-1 mt-0.5">
                                {msg.replyTo.bodySnippet || 'Original message unavailable'}
                              </p>
                            </div>
                          )}

                          {/* Image Attachments (Multi-Image Social Grid) */}
                          {imageAttachments.length > 0 && (
                            <div
                              className={`rounded-2xl overflow-hidden mb-2 ${
                                imageAttachments.length === 1
                                  ? 'max-w-md'
                                  : imageAttachments.length === 2
                                  ? 'grid grid-cols-2 gap-1.5 max-w-sm'
                                  : imageAttachments.length === 3
                                  ? 'grid grid-cols-3 gap-1.5 max-w-sm'
                                  : 'grid grid-cols-2 gap-1.5 max-w-sm'
                              }`}
                            >
                              {imageAttachments.slice(0, 4).map((att, aIdx) => {
                                const isFourth = aIdx === 3;
                                const remainingCount = imageAttachments.length - 4;
                                return (
                                  <div
                                    key={aIdx}
                                    className={`relative group/att overflow-hidden bg-black/30 cursor-pointer ${
                                      imageAttachments.length === 1
                                        ? 'max-h-80 rounded-2xl'
                                        : 'aspect-square rounded-xl'
                                    }`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setLightboxMedia({
                                        items: imageAttachments.map((a) => ({
                                          url: getUploadUrl(a.url),
                                          name: a.name || 'Attachment',
                                        })),
                                        index: aIdx,
                                      });
                                    }}
                                  >
                                    <img
                                      src={getUploadUrl(att.url)}
                                      alt={att.name || 'Attachment'}
                                      className="w-full h-full object-cover hover:scale-[1.03] transition-transform duration-300"
                                      loading="lazy"
                                    />
                                    {isFourth && remainingCount > 0 && (
                                      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center text-white font-heading font-black text-lg">
                                        +{remainingCount + 1}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Document Attachments */}
                          {docAttachments.length > 0 && (
                            <div className="space-y-1.5 mb-2">
                              {docAttachments.map((att, dIdx) => (
                                <a
                                  key={dIdx}
                                  href={getUploadUrl(att.url)}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all ${
                                    isMe
                                      ? 'bg-black/10 border-bg-base/20 hover:bg-black/15 text-bg-base'
                                      : 'bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.08] text-white'
                                  }`}
                                >
                                  <FileText className="w-4 h-4 shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <p className="font-semibold truncate text-xs">
                                      {att.name}
                                    </p>
                                    {att.size > 0 && (
                                      <p className="text-[10px] opacity-75 font-mono">
                                        {formatFileSize(att.size)}
                                      </p>
                                    )}
                                  </div>
                                  <Download className="w-3.5 h-3.5 shrink-0 opacity-70" />
                                </a>
                              ))}
                            </div>
                          )}

                          {/* Forwarded Status Banner */}
                          {msg.isForwarded && (
                            <div
                              className={`flex items-center gap-1.5 text-[10px] mb-1.5 font-medium italic ${
                                isMe ? 'text-bg-base/80' : 'text-text-muted'
                              }`}
                            >
                              <CornerUpRight className="w-3 h-3" />
                              <span>
                                Forwarded{msg.forwardedFrom?.originalSenderName ? ` from ${msg.forwardedFrom.originalSenderName}` : ''}
                              </span>
                            </div>
                          )}

                          {/* Message Body Text with Structured Mentions */}
                          {renderBodyWithMentions(msg.body, msg.mentions, isMe)}

                          {/* Thread Discussion Trigger */}
                          {msg.threadReplyCount > 0 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openThread(msg);
                              }}
                              className={`flex items-center gap-1.5 px-2.5 py-1 mt-1.5 rounded-xl border text-[11px] font-semibold transition-all cursor-pointer ${
                                isMe
                                  ? 'bg-black/10 border-bg-base/30 text-bg-base hover:bg-black/20'
                                  : 'bg-brand-mint/10 border-brand-mint/25 text-brand-mint hover:bg-brand-mint/20'
                              }`}
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>
                                {msg.threadReplyCount} {msg.threadReplyCount === 1 ? 'reply' : 'replies'}
                              </span>
                              {msg.threadLastReplyAt && (
                                <span className="opacity-70 font-mono text-[10px]">
                                  · {formatTime(msg.threadLastReplyAt)}
                                </span>
                              )}
                            </button>
                          )}

                          {/* Safe Client-Side Link Preview */}
                          {urlMetadata && (
                            <a
                              href={urlMetadata.rawUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className={`mt-2 flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                                isMe
                                  ? 'bg-black/10 border-bg-base/20 hover:bg-black/15 text-bg-base'
                                  : 'bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.08] text-white'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <ExternalLink
                                  className={`w-3.5 h-3.5 shrink-0 ${
                                    isMe ? 'text-bg-base' : 'text-brand-mint'
                                  }`}
                                />
                                <div className="truncate">
                                  <p className="font-bold text-xs truncate">
                                    {urlMetadata.hostname}
                                  </p>
                                  <p className="text-[10px] opacity-75 truncate">
                                    {urlMetadata.pathname}
                                  </p>
                                </div>
                              </div>
                              <span className="text-[10px] font-semibold underline shrink-0 ml-2">
                                Visit ↗
                              </span>
                            </a>
                          )}

                          {/* Timestamp & Delivery Meta */}
                          <div
                            className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                              isMe ? 'text-[#07130E]/70' : 'text-text-faint'
                            }`}
                          >
                            {msg.isEdited && <span>(edited)</span>}
                            <span className="font-mono">{formatTime(msg.createdAt)}</span>
                            {isMe && (
                              <span title={msg.status}>
                                {msg.status === 'read' ? (
                                  <CheckCheck className="w-3 h-3 text-[#07130E] inline" />
                                ) : msg.status === 'delivered' ? (
                                  <CheckCheck className="w-3 h-3 opacity-70 inline" />
                                ) : (
                                  <Check className="w-3 h-3 opacity-70 inline" />
                                )}
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                        {/* Reactions Display */}
                        {msg.reactions && msg.reactions.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {msg.reactions.map((r, rIdx) => {
                              const userHasReacted = r.users?.some(
                                (u) => String(u) === String(currentUserId),
                              );
                              return (
                                <button
                                  key={rIdx}
                                  type="button"
                                  onClick={() =>
                                    reactionMutation.mutate({
                                      messageId: msg._id,
                                      emoji: r.emoji,
                                    })
                                  }
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border cursor-pointer transition-all ${
                                    userHasReacted
                                      ? 'bg-brand-mint/15 border-brand-mint/40 text-brand-mint font-bold'
                                      : 'bg-white/[0.04] border-white/[0.08] text-text-muted hover:text-white'
                                  }`}
                                >
                                  <span>{r.emoji}</span>
                                  <span className="font-mono text-[10px]">
                                    {r.count}
                                  </span>
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
            <div className="px-6 py-1.5 text-xs text-brand-mint flex items-center gap-1.5 bg-[#0C121E]/60 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-mint animate-pulse" />
              <span>
                {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'}{' '}
                typing...
              </span>
            </div>
          )}

          {/* ── 4. STICKY COMPOSER ── */}
          <div className="p-3 sm:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-white/[0.08] bg-[#0C121E]/95 backdrop-blur-xl shrink-0 space-y-2">
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
                      {editingMessage
                        ? 'Editing message'
                        : `Replying to ${getUserDisplayName(replyingTo?.senderId)}`}
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
                  className="p-1 rounded-lg text-text-muted hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Failed Uploads Retry Banner */}
            {failedUploads.length > 0 && (
              <div className="space-y-1.5">
                {failedUploads.map((file, fIdx) => (
                  <div
                    key={fIdx}
                    className="flex items-center justify-between p-2 px-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-semibold text-rose-400 shrink-0">Upload failed:</span>
                      <span className="truncate max-w-[200px] text-white/90">{file.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleFileUpload(file)}
                        className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-white font-semibold text-[11px] transition-colors cursor-pointer"
                      >
                        Retry
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setFailedUploads((prev) =>
                            prev.filter((_, i) => i !== fIdx),
                          )
                        }
                        className="p-1 rounded-lg text-rose-300 hover:text-white cursor-pointer"
                        title="Dismiss"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Uploading progress indicator */}
            {isUploadingAttachment && (
              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-1.5">
                <div className="flex items-center justify-between text-xs text-brand-mint">
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Uploading attachment...
                  </span>
                  <span className="font-mono text-[10px]">{uploadProgress}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full bg-brand-mint transition-all duration-150"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Compact Pre-Send Attachment Cards */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 p-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                {attachments.map((att, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-[#111726] border border-white/[0.08] text-xs text-white min-w-[200px]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {att.type === 'image' ? (
                        <ImageIcon className="w-4 h-4 text-brand-mint shrink-0" />
                      ) : (
                        <FileText className="w-4 h-4 text-brand-mint shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-white/90">
                          {att.name}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-text-muted mt-0.5">
                          {att.size > 0 && (
                            <span className="font-mono">{formatFileSize(att.size)}</span>
                          )}
                          <span className="text-brand-mint font-medium">✓ Ready to send</span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(i)}
                      className="p-1 rounded-lg text-text-muted hover:text-white hover:bg-white/[0.06] cursor-pointer"
                      title="Remove attachment"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Quick Emoji Bar (Collapsible) */}
            {showEmojiPicker && (
              <div className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                {['👋', '👍', '❤️', '👏', '🎯', '🚀', '🔥', '💡', '✅', '🏗️'].map(
                  (em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => {
                        const newText = inputText + em;
                        setInputText(newText);
                        setConversationDraft(conversationId, newText);
                      }}
                      className="hover:scale-125 transition-transform text-base p-1 cursor-pointer"
                    >
                      {em}
                    </button>
                  ),
                )}
              </div>
            )}

            {/* Main Input Row */}
            <form onSubmit={handleSend} className="flex items-end gap-2">
              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip"
                onChange={handleFileInputChange}
                className="hidden"
              />

              {/* Attachment Paperclip Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAttachment}
                className="p-2.5 rounded-xl text-text-muted hover:text-white hover:bg-white/[0.06] transition-colors focus-ring cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0 disabled:opacity-50"
                title="Attach images or documents"
                aria-label="Attach file"
              >
                {isUploadingAttachment ? (
                  <Loader2 className="w-4 h-4 text-brand-mint animate-spin" />
                ) : (
                  <Paperclip className="w-4 h-4" />
                )}
              </button>

              {/* Emoji Trigger */}
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-2.5 rounded-xl text-text-muted hover:text-white hover:bg-white/[0.06] transition-colors focus-ring cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
                title="Emoji picker"
                aria-label="Toggle emoji picker"
              >
                <Smile className="w-4 h-4" />
              </button>

              {/* Multiline Auto-expanding Textarea with Mention Autocomplete */}
              <div className="flex-1 relative">
                <MentionAutocomplete
                  visible={mentionVisible}
                  query={mentionQuery}
                  conversationId={conversationId}
                  onSelect={handleMentionSelect}
                  onClose={() => setMentionVisible(false)}
                />
                <textarea
                  ref={textareaRef}
                  value={inputText}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  rows={1}
                  placeholder={
                    editingMessage
                      ? 'Update your message...'
                      : isDirect
                      ? `Message ${displayName}...`
                      : 'Write a message...'
                  }
                  className="w-full max-h-32 min-h-[44px] py-2.5 px-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] focus:border-brand-mint/40 text-xs text-white placeholder-text-muted resize-none focus:outline-none transition-colors"
                  aria-label={`Write message to ${displayName}`}
                />
              </div>

              {/* Send Button with Dynamic Active States */}
              <button
                type="submit"
                disabled={
                  (!inputText.trim() && attachments.length === 0) ||
                  sendMutation.isPending ||
                  editMutation.isPending ||
                  isUploadingAttachment
                }
                className={`p-2.5 rounded-xl font-bold transition-all focus-ring cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0 ${
                  inputText.trim() || attachments.length > 0
                    ? 'bg-gradient-to-br from-[#9FD5B2] via-[#94CFAB] to-[#80BF98] text-[#07130E] shadow-md shadow-brand-mint/20 scale-100 active:scale-95'
                    : 'bg-white/[0.04] text-text-muted/40 cursor-not-allowed'
                }`}
                aria-label="Send message"
              >
                {sendMutation.isPending || editMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin text-current" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </form>
          </div>
        </div>

        {/* ── 5. THREAD WORKSPACE (DESKTOP COLUMN) ── */}
        {activeThreadRoot && (
          <div className="hidden xl:flex h-full border-l border-white/[0.08]">
            <ThreadPanel
              rootMessage={activeThreadRoot}
              conversationId={conversationId}
              onClose={closeThread}
              currentUserId={currentUserId}
              onJumpToMessage={handleJumpToMessage}
            />
          </div>
        )}

        {/* ── THREAD WORKSPACE (TABLET / MOBILE SLIDE-OVER) ── */}
        {activeThreadRoot && (
          <div className="xl:hidden">
            <ThreadPanel
              rootMessage={activeThreadRoot}
              conversationId={conversationId}
              onClose={closeThread}
              isMobile={true}
              currentUserId={currentUserId}
              onJumpToMessage={handleJumpToMessage}
            />
          </div>
        )}

        {/* ── 6. PROFESSIONAL CONTEXT PANEL (COLLAPSIBLE 3RD COLUMN ON DESKTOP) ── */}
        {showContextPanel && (
          <>
            {/* Desktop 3rd Column */}
            <div className="hidden xl:flex w-80 shrink-0 border-l border-white/[0.08] h-full bg-[#0A0F1D] flex-col overflow-hidden">
              <ConversationContextPanel
                conversation={conversation}
                messages={rawMessages}
                onClose={() => setShowContextPanel(false)}
                onOpenSearch={() => setShowInChatSearch(true)}
                onToggleMute={(muted) => muteMutation.mutate(muted)}
                onToggleArchive={(archived) => archiveMutation.mutate(archived)}
                onReport={(target) => setReportTarget(target)}
                onBlockUser={(uId) => blockUserMutation.mutate(uId)}
                onLeaveGroup={() => leaveGroupMutation.mutate()}
                onSelectImage={(url) => setLightboxMedia({ items: [{ url }], index: 0 })}
                onJumpToMessage={handleJumpToMessage}
              />
            </div>

            {/* Tablet / Mobile Slide-over Drawer */}
            <div
              className="xl:hidden fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm"
              onClick={() => setShowContextPanel(false)}
            >
              <div
                className="w-full sm:max-w-md h-full bg-[#0A0F1D] shadow-2xl border-l border-white/[0.1] flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <ConversationContextPanel
                  conversation={conversation}
                  messages={rawMessages}
                  onClose={() => setShowContextPanel(false)}
                  onOpenSearch={() => {
                    setShowContextPanel(false);
                    setShowInChatSearch(true);
                  }}
                  onToggleMute={(muted) => muteMutation.mutate(muted)}
                  onToggleArchive={(archived) => archiveMutation.mutate(archived)}
                  onReport={(target) => {
                    setShowContextPanel(false);
                    setReportTarget(target);
                  }}
                  onBlockUser={(uId) => {
                    setShowContextPanel(false);
                    blockUserMutation.mutate(uId);
                  }}
                  onLeaveGroup={() => {
                    setShowContextPanel(false);
                    leaveGroupMutation.mutate();
                  }}
                  onSelectImage={(url) => {
                    setShowContextPanel(false);
                    setLightboxMedia({ items: [{ url }], index: 0 });
                  }}
                  onJumpToMessage={(msgId) => {
                    setShowContextPanel(false);
                    handleJumpToMessage(msgId);
                  }}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Mobile Message Action Bottom Sheet ── */}
      {activeMobileMessage && (
        <div
          className="sm:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-end p-0 sm:p-4"
          onClick={() => setActiveMobileMessage(null)}
        >
          <div
            className="bg-[#0E1524] border-t border-white/[0.12] rounded-t-3xl p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-3.5 shadow-2xl max-h-[88dvh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto shrink-0 mb-0.5" />

            <div className="flex items-center justify-between pb-2 border-b border-white/[0.08] shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Message Options
                </span>
                <span className="text-[11px] text-text-muted font-mono">
                  {formatTime(activeMobileMessage.createdAt)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveMobileMessage(null)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-text-muted hover:text-white hover:bg-white/[0.06] transition-colors"
                aria-label="Close message actions"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Message quote preview */}
            <div className="px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs text-text-muted italic line-clamp-2 shrink-0">
              "{activeMobileMessage.body || (activeMobileMessage.attachments?.length ? '📎 Attachment' : 'Message')}"
            </div>

            {/* Quick Reactions */}
            <div className="flex items-center justify-around py-2 px-1 bg-white/[0.03] rounded-2xl border border-white/[0.06] shrink-0">
              {REACTION_EMOJIS.map((emoji) => {
                const reactionObj = activeMobileMessage.reactions?.find((r) => r.emoji === emoji);
                const userHasReacted = reactionObj?.users?.some(
                  (u) => String(u) === String(currentUserId)
                );
                const count = reactionObj?.count || 0;

                return (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      reactionMutation.mutate({
                        messageId: activeMobileMessage._id,
                        emoji,
                      });
                      setActiveMobileMessage(null);
                    }}
                    className={`min-h-[48px] px-3.5 py-2 flex items-center gap-1.5 rounded-xl text-2xl transition-all active:scale-95 ${
                      userHasReacted
                        ? 'bg-brand-mint/20 border border-brand-mint/50 ring-2 ring-brand-mint/30 scale-105'
                        : 'hover:bg-white/[0.06] border border-transparent'
                    }`}
                    aria-label={`React with ${emoji}${userHasReacted ? ' (active)' : ''}`}
                  >
                    <span>{emoji}</span>
                    {count > 0 && (
                      <span className="text-xs font-mono font-bold text-text-muted">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Action buttons categorized by priority */}
            <div className="space-y-3 overflow-y-auto pr-0.5">
              {/* Primary Actions */}
              <div className="space-y-1">
                <div className="px-2 pb-1 text-[10px] font-mono uppercase tracking-wider text-text-muted/70 font-semibold">
                  Primary Actions
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setReplyingTo(activeMobileMessage);
                    setActiveMobileMessage(null);
                  }}
                  className="w-full min-h-[48px] flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs font-semibold text-white bg-white/[0.02] hover:bg-white/[0.06] active:bg-white/[0.08] border border-white/[0.04] transition-colors"
                >
                  <Reply className="w-4 h-4 text-brand-mint shrink-0" />
                  <span className="flex-1 text-left">Reply</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    openThread(activeMobileMessage);
                    setActiveMobileMessage(null);
                  }}
                  className="w-full min-h-[48px] flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs font-semibold text-white bg-white/[0.02] hover:bg-white/[0.06] active:bg-white/[0.08] border border-white/[0.04] transition-colors"
                >
                  <MessageSquare className="w-4 h-4 text-brand-mint shrink-0" />
                  <span className="flex-1 text-left">Reply in Thread</span>
                  {activeMobileMessage.threadReplyCount > 0 && (
                    <span className="text-[11px] font-mono text-brand-mint bg-brand-mint/10 px-2 py-0.5 rounded-full border border-brand-mint/20">
                      {activeMobileMessage.threadReplyCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    openForwardModal(activeMobileMessage);
                    setActiveMobileMessage(null);
                  }}
                  className="w-full min-h-[48px] flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs font-semibold text-white bg-white/[0.02] hover:bg-white/[0.06] active:bg-white/[0.08] border border-white/[0.04] transition-colors"
                >
                  <Share2 className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="flex-1 text-left">Forward Message</span>
                </button>
              </div>

              {/* Organization Actions */}
              <div className="space-y-1 pt-1 border-t border-white/[0.04]">
                <div className="px-2 pb-1 text-[10px] font-mono uppercase tracking-wider text-text-muted/70 font-semibold">
                  Organization
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (activeMobileMessage.isSaved) {
                      unsaveMessage(activeMobileMessage._id);
                    } else {
                      saveMessage(activeMobileMessage._id);
                    }
                    setActiveMobileMessage(null);
                  }}
                  className="w-full min-h-[48px] flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs font-semibold text-white bg-white/[0.02] hover:bg-white/[0.06] active:bg-white/[0.08] border border-white/[0.04] transition-colors"
                >
                  {activeMobileMessage.isSaved ? (
                    <BookmarkCheck className="w-4 h-4 text-brand-gold fill-brand-gold/20 shrink-0" />
                  ) : (
                    <Bookmark className="w-4 h-4 text-brand-gold shrink-0" />
                  )}
                  <span className="flex-1 text-left">
                    {activeMobileMessage.isSaved ? 'Unsave Message' : 'Save Message'}
                  </span>
                </button>

                {canPinMsg(activeMobileMessage) && (
                  <button
                    type="button"
                    onClick={() => {
                      if (activeMobileMessage.isPinned) {
                        unpinMessage(conversationId, activeMobileMessage._id);
                      } else {
                        pinMessage(conversationId, activeMobileMessage._id);
                      }
                      setActiveMobileMessage(null);
                    }}
                    className="w-full min-h-[48px] flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs font-semibold text-white bg-white/[0.02] hover:bg-white/[0.06] active:bg-white/[0.08] border border-white/[0.04] transition-colors"
                  >
                    {activeMobileMessage.isPinned ? (
                      <PinOff className="w-4 h-4 text-brand-mint shrink-0" />
                    ) : (
                      <Pin className="w-4 h-4 text-brand-mint shrink-0" />
                    )}
                    <span className="flex-1 text-left">
                      {activeMobileMessage.isPinned ? 'Unpin Message' : 'Pin Message'}
                    </span>
                  </button>
                )}

                {activeMobileMessage.body && (
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(activeMobileMessage.body);
                      toast.success('Copied to clipboard');
                      setActiveMobileMessage(null);
                    }}
                    className="w-full min-h-[48px] flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs font-semibold text-white bg-white/[0.02] hover:bg-white/[0.06] active:bg-white/[0.08] border border-white/[0.04] transition-colors"
                  >
                    <Copy className="w-4 h-4 text-brand-gold shrink-0" />
                    <span className="flex-1 text-left">Copy Text</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    handleCopyMessageLink(activeMobileMessage._id);
                    setActiveMobileMessage(null);
                  }}
                  className="w-full min-h-[48px] flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs font-semibold text-white bg-white/[0.02] hover:bg-white/[0.06] active:bg-white/[0.08] border border-white/[0.04] transition-colors"
                >
                  <Link2 className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="flex-1 text-left">Copy Message Link</span>
                </button>
              </div>

              {/* Advanced Actions */}
              <div className="space-y-1 pt-1 border-t border-white/[0.04]">
                <div className="px-2 pb-1 text-[10px] font-mono uppercase tracking-wider text-text-muted/70 font-semibold">
                  Advanced
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFocusedMessage(activeMobileMessage);
                    setActiveMobileMessage(null);
                  }}
                  className="w-full min-h-[48px] flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs font-semibold text-white bg-white/[0.02] hover:bg-white/[0.06] active:bg-white/[0.08] border border-white/[0.04] transition-colors"
                >
                  <Maximize2 className="w-4 h-4 text-brand-mint shrink-0" />
                  <span className="flex-1 text-left">Focus Mode</span>
                </button>

                {String(activeMobileMessage.senderId?._id || activeMobileMessage.senderId) === String(currentUserId) ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingMessage(activeMobileMessage);
                        setInputText(activeMobileMessage.body);
                        setActiveMobileMessage(null);
                      }}
                      className="w-full min-h-[48px] flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs font-semibold text-white bg-white/[0.02] hover:bg-white/[0.06] active:bg-white/[0.08] border border-white/[0.04] transition-colors"
                    >
                      <Edit2 className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span className="flex-1 text-left">Edit Message</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        deleteMutation.mutate({
                          messageId: activeMobileMessage._id,
                          mode: 'me',
                        });
                        setActiveMobileMessage(null);
                      }}
                      className="w-full min-h-[48px] flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs font-semibold text-rose-400 bg-rose-500/[0.04] hover:bg-rose-500/10 active:bg-rose-500/20 border border-rose-500/20 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 shrink-0" />
                      <span className="flex-1 text-left">Delete Message</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setReportTarget({
                        type: 'MESSAGE',
                        id: activeMobileMessage._id,
                        name: `Message from ${getUserDisplayName(activeMobileMessage.senderId)}`,
                      });
                      setActiveMobileMessage(null);
                    }}
                    className="w-full min-h-[48px] flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs font-semibold text-rose-400 bg-rose-500/[0.04] hover:bg-rose-500/10 active:bg-rose-500/20 border border-rose-500/20 transition-colors"
                  >
                    <Flag className="w-4 h-4 shrink-0" />
                    <span className="flex-1 text-left">Report Message</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Pinned Messages Modal ── */}
      {showPinnedModal && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setShowPinnedModal(false)}
        >
          <div
            className="w-full max-w-lg bg-[#0E1524] border border-white/[0.1] rounded-3xl p-5 shadow-2xl space-y-4 max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
                  <span>📌</span>
                  <span>Pinned Messages</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-brand-mint/15 text-[11px] font-mono font-bold text-brand-mint">
                  {pinnedMessages.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowPinnedModal(false)}
                className="p-1 rounded-lg text-text-muted hover:text-white hover:bg-white/[0.06] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 divide-y divide-white/[0.04]">
              {pinnedMessages.length === 0 ? (
                <div className="text-center py-8 text-text-muted text-xs">
                  No pinned messages in this conversation.
                </div>
              ) : (
                pinnedMessages.map((pin) => {
                  const sName = getUserDisplayName(pin.senderId);
                  return (
                    <div
                      key={pin._id}
                      className="pt-2.5 first:pt-0 flex items-start justify-between gap-3 group"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-semibold text-white truncate">{sName}</span>
                          <span className="text-[10px] text-text-faint font-mono">
                            {formatTime(pin.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-text-secondary line-clamp-3 leading-relaxed">
                          {pin.body || 'Attachment'}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setShowPinnedModal(false);
                            handleJumpToMessage(pin._id);
                          }}
                          className="px-2.5 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-semibold text-brand-mint border border-white/[0.08] transition-colors cursor-pointer"
                          title="Jump to message"
                        >
                          Jump
                        </button>
                        <button
                          type="button"
                          onClick={() => unpinMessage(conversationId, pin._id)}
                          className="p-1.5 rounded-xl text-text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Unpin message"
                        >
                          <PinOff className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Message Focus Mode Overlay ── */}
      {focusedMessage && (
        <div
          className="fixed inset-0 z-50 bg-[#080C14]/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
          onClick={() => setFocusedMessage(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Message focus mode"
        >
          <div
            className="w-full max-w-xl bg-[#0E1524] border border-white/[0.12] rounded-3xl p-6 shadow-2xl space-y-5 relative max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with Sender Identity & Close */}
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center font-bold text-xs text-brand-mint">
                  {getInitials(getUserDisplayName(focusedMessage.senderId))}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white truncate">
                      {getUserDisplayName(focusedMessage.senderId)}
                    </span>
                    {focusedMessage.senderId?.role && (
                      <EcosystemRoleBadge role={focusedMessage.senderId.role} size="xs" />
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-text-muted">
                    {formatTime(focusedMessage.createdAt)} · Focus Mode
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-block text-[10px] font-mono text-text-faint px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.06]">
                  ESC to close
                </span>
                <button
                  type="button"
                  onClick={() => setFocusedMessage(null)}
                  className="p-1.5 rounded-xl text-text-muted hover:text-white hover:bg-white/[0.06] cursor-pointer"
                  aria-label="Exit focus mode"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quoted Reply if present */}
            {focusedMessage.replyTo && (
              <div className="p-3 rounded-2xl bg-white/[0.03] border-l-2 border-brand-mint text-xs text-text-secondary">
                <div className="flex items-center gap-1 font-semibold text-brand-mint mb-0.5">
                  <CornerDownRight className="w-3.5 h-3.5" />
                  <span>{focusedMessage.replyTo.senderName || 'Replied to'}</span>
                </div>
                <p className="line-clamp-2">{focusedMessage.replyTo.bodySnippet}</p>
              </div>
            )}

            {/* Attachments if present */}
            {focusedMessage.attachments && focusedMessage.attachments.length > 0 && (
              <div className="space-y-2">
                {focusedMessage.attachments.map((att, aIdx) => (
                  <div
                    key={aIdx}
                    className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <FileText className="w-4 h-4 text-brand-mint shrink-0" />
                      <span className="font-semibold text-white truncate">{att.name}</span>
                    </div>
                    <a
                      href={getUploadUrl(att.url)}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-brand-mint text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </a>
                  </div>
                ))}
              </div>
            )}

            {/* Large Focused Message Body */}
            {focusedMessage.body && (
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                <p className="text-sm sm:text-base leading-relaxed text-white font-normal whitespace-pre-wrap select-text">
                  {focusedMessage.body}
                </p>
              </div>
            )}

            {/* Reactions summary + quick reacts */}
            <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
              <div className="flex items-center gap-1">
                {REACTION_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      reactionMutation.mutate({
                        messageId: focusedMessage._id,
                        emoji,
                      });
                    }}
                    className="text-lg p-1.5 hover:scale-125 transition-transform cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* Status Badges */}
              <div className="flex items-center gap-1.5">
                {focusedMessage.isPinned && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-brand-mint/15 text-brand-mint text-[11px] font-semibold">
                    <Pin className="w-3 h-3" /> Pinned
                  </span>
                )}
                {focusedMessage.isSaved && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-brand-gold/15 text-brand-gold text-[11px] font-semibold">
                    <Bookmark className="w-3 h-3 fill-current" /> Saved
                  </span>
                )}
              </div>
            </div>

            {/* Bottom Action Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setReplyingTo(focusedMessage);
                  setFocusedMessage(null);
                  textareaRef.current?.focus();
                }}
                className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-brand-mint text-bg-base text-xs font-bold hover:bg-brand-mint/90 transition-colors cursor-pointer"
              >
                <Reply className="w-3.5 h-3.5" />
                <span>Reply</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(focusedMessage.body);
                  toast.success('Copied text to clipboard');
                }}
                className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white text-xs font-semibold border border-white/[0.08] transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (focusedMessage.isSaved) {
                    unsaveMessage(focusedMessage._id);
                    setFocusedMessage((prev) => (prev ? { ...prev, isSaved: false } : null));
                  } else {
                    saveMessage(focusedMessage._id);
                    setFocusedMessage((prev) => (prev ? { ...prev, isSaved: true } : null));
                  }
                }}
                className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white text-xs font-semibold border border-white/[0.08] transition-colors cursor-pointer"
              >
                {focusedMessage.isSaved ? (
                  <>
                    <BookmarkCheck className="w-3.5 h-3.5 text-brand-gold" />
                    <span>Saved</span>
                  </>
                ) : (
                  <>
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>Save</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleCopyMessageLink(focusedMessage._id)}
                className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white text-xs font-semibold border border-white/[0.08] transition-colors cursor-pointer"
              >
                <Link2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Link</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  openThread(focusedMessage);
                  setFocusedMessage(null);
                }}
                className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-brand-mint text-xs font-semibold border border-white/[0.08] transition-colors cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Thread</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  openForwardModal(focusedMessage);
                  setFocusedMessage(null);
                }}
                className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-cyan-400 text-xs font-semibold border border-white/[0.08] transition-colors cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Forward</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Moderation Report Modal */}
      {reportTarget && (
        <ReportModal
          targetType={reportTarget.type}
          targetId={reportTarget.id}
          targetName={reportTarget.name}
          onClose={() => setReportTarget(null)}
        />
      )}

      {/* Immersive Lightbox Modal for Media (Section 19) */}
      {lightboxMedia && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col justify-between p-4 sm:p-6"
          onClick={() => setLightboxMedia(null)}
        >
          {/* Top Controls */}
          <div
            className="flex items-center justify-between text-white shrink-0 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setLightboxMedia(null)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                aria-label="Close image viewer"
              >
                <X className="w-5 h-5" />
              </button>
              {lightboxMedia.items?.length > 1 && (
                <span className="text-xs font-mono text-white/80">
                  {lightboxMedia.index + 1} / {lightboxMedia.items.length}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <a
                href={lightboxMedia.items[lightboxMedia.index]?.url}
                download
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-medium"
                aria-label="Download image"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Save</span>
              </a>
            </div>
          </div>

          {/* Center Image with Prev / Next Navigation */}
          <div
            className="flex-1 flex items-center justify-center relative min-h-0 py-2"
            onClick={(e) => e.stopPropagation()}
          >
            {lightboxMedia.items?.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setLightboxMedia((prev) => ({
                    ...prev,
                    index:
                      prev.index > 0
                        ? prev.index - 1
                        : prev.items.length - 1,
                  }))
                }
                className="absolute left-2 sm:left-4 z-10 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all backdrop-blur-sm cursor-pointer"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            <img
              src={lightboxMedia.items[lightboxMedia.index]?.url}
              alt={lightboxMedia.items[lightboxMedia.index]?.name || 'Media view'}
              className="max-h-[82vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl transition-all duration-200 select-none"
            />

            {lightboxMedia.items?.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setLightboxMedia((prev) => ({
                    ...prev,
                    index:
                      prev.index < prev.items.length - 1
                        ? prev.index + 1
                        : 0,
                  }))
                }
                className="absolute right-2 sm:right-4 z-10 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all backdrop-blur-sm cursor-pointer"
                aria-label="Next image"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Bottom Caption */}
          <div className="text-center text-xs text-white/60 shrink-0 font-medium pb-2">
            {lightboxMedia.items[lightboxMedia.index]?.name || ''}
          </div>
        </div>
      )}

      {/* Forward Message Modal */}
      <ForwardMessageModal
        isOpen={Boolean(forwardMessageTarget)}
        message={forwardMessageTarget}
        onClose={closeForwardModal}
      />
    </div>
  );
}
