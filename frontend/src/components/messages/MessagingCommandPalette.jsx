import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  MessageSquarePlus,
  Users,
  Inbox,
  Sparkles,
  Archive,
  ArrowRight,
  X,
  Bookmark,
  FileText,
  Globe,
  MessageSquare,
  Loader2,
} from 'lucide-react';
import { messagingService } from '../../services/messagingService';
import { getUploadUrl } from '../../utils/courseUi';
import EcosystemRoleBadge from '../network/EcosystemRoleBadge';
import {
  getConversationDisplayName,
  getOtherParticipant,
  getInitials,
} from '../../utils/messagingIdentity';

export default function MessagingCommandPalette({
  isOpen,
  onClose,
  conversations = [],
  currentUserId,
  onSelectConversation,
  onNewChat,
  onNewGroup,
  onSwitchTab,
  onFilterUnread,
  onJumpToMessage,
}) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Built-in navigation commands
  const defaultCommands = useMemo(
    () => [
      {
        id: 'new_chat',
        type: 'action',
        section: 'COMMANDS',
        title: 'Start Direct Message',
        subtitle: 'Connect with a professional in your network',
        icon: MessageSquarePlus,
        color: 'text-brand-mint',
        action: () => {
          onClose();
          onNewChat?.();
        },
      },
      {
        id: 'new_group',
        type: 'action',
        section: 'COMMANDS',
        title: 'Create Group Workspace',
        subtitle: 'Start a collaborative project workspace',
        icon: Users,
        color: 'text-brand-gold',
        action: () => {
          onClose();
          onNewGroup?.();
        },
      },
      {
        id: 'saved',
        type: 'action',
        section: 'COMMANDS',
        title: 'Open Saved Messages',
        subtitle: 'Review bookmarked items and essential notes',
        icon: Bookmark,
        color: 'text-brand-gold',
        action: () => {
          onClose();
          onSwitchTab?.('saved');
        },
      },
      {
        id: 'unread_chats',
        type: 'action',
        section: 'COMMANDS',
        title: 'Jump to Unread Conversations',
        subtitle: 'Filter inbox to threads requiring response',
        icon: Inbox,
        color: 'text-brand-mint',
        action: () => {
          onClose();
          onSwitchTab?.('chats');
          onFilterUnread?.();
        },
      },
      {
        id: 'requests',
        type: 'action',
        section: 'COMMANDS',
        title: 'View Message Requests',
        subtitle: 'Review introduction requests from external members',
        icon: Sparkles,
        color: 'text-brand-gold',
        action: () => {
          onClose();
          onSwitchTab?.('requests');
        },
      },
      {
        id: 'archived',
        type: 'action',
        section: 'COMMANDS',
        title: 'View Archived Chats',
        subtitle: 'Access past stored discussions',
        icon: Archive,
        color: 'text-text-muted',
        action: () => {
          onClose();
          onSwitchTab?.('archived');
        },
      },
    ],
    [onClose, onNewChat, onNewGroup, onSwitchTab, onFilterUnread],
  );

  // Global search across accessible conversations from backend
  const trimmedQuery = query.trim();
  const { data: searchResults, isFetching } = useQuery({
    queryKey: ['global-search', trimmedQuery],
    queryFn: () => messagingService.searchGlobal({ q: trimmedQuery }),
    enabled: Boolean(trimmedQuery.length >= 2),
    staleTime: 1000 * 10,
  });

  // Client fallback for conversations matching locally
  const matchingConversations = useMemo(() => {
    if (!trimmedQuery) return [];
    const q = trimmedQuery.toLowerCase();
    return conversations
      .filter((c) => {
        const name = getConversationDisplayName(c, currentUserId).toLowerCase();
        const other = getOtherParticipant(c, currentUserId);
        const username = other?.username ? String(other.username).toLowerCase() : '';
        const headline = other?.headline ? String(other.headline).toLowerCase() : '';
        const lastMsg = c.lastMessage?.body ? String(c.lastMessage.body).toLowerCase() : '';
        return (
          name.includes(q) ||
          username.includes(q) ||
          headline.includes(q) ||
          lastMsg.includes(q)
        );
      })
      .slice(0, 5);
  }, [conversations, trimmedQuery, currentUserId]);

  // Aggregate items into categorized sections
  const items = useMemo(() => {
    const list = [];

    // When query is active and backend returned results:
    if (trimmedQuery.length >= 2 && searchResults) {
      // 1. People
      (searchResults.people || []).forEach((p) => {
        list.push({
          id: `person_${p.id || p._id}`,
          type: 'person',
          section: 'PEOPLE',
          data: p,
        });
      });

      // 2. Conversations
      const backendConvs = searchResults.conversations || [];
      const convList = backendConvs.length > 0 ? backendConvs : matchingConversations;
      convList.forEach((c) => {
        list.push({
          id: `conv_${c._id || c.id}`,
          type: 'conversation',
          section: 'CONVERSATIONS',
          data: c,
        });
      });

      // 3. Messages
      (searchResults.messages || []).forEach((m) => {
        list.push({
          id: `msg_${m.id || m._id}`,
          type: 'message',
          section: 'MESSAGES',
          data: m,
        });
      });

      // 4. Files
      (searchResults.files || []).forEach((f, idx) => {
        list.push({
          id: `file_${f.messageId}_${idx}`,
          type: 'file',
          section: 'FILES',
          data: f,
        });
      });

      // 5. Links
      (searchResults.links || []).forEach((l, idx) => {
        list.push({
          id: `link_${l.messageId}_${idx}`,
          type: 'link',
          section: 'LINKS',
          data: l,
        });
      });
    } else {
      // Prioritize local matching conversations if 1 char query
      matchingConversations.forEach((c) => {
        list.push({
          id: `conv_${c._id || c.id}`,
          type: 'conversation',
          section: 'CONVERSATIONS',
          data: c,
        });
      });
    }

    // Matching default commands
    defaultCommands
      .filter((cmd) => {
        if (!trimmedQuery) return true;
        const q = trimmedQuery.toLowerCase();
        return (
          cmd.title.toLowerCase().includes(q) ||
          cmd.subtitle.toLowerCase().includes(q)
        );
      })
      .forEach((cmd) => {
        list.push(cmd);
      });

    return list;
  }, [trimmedQuery, searchResults, matchingConversations, defaultCommands]);

  const handleSelectItem = (item) => {
    if (!item) return;
    onClose();

    if (item.type === 'conversation') {
      onSelectConversation?.(item.data);
    } else if (item.type === 'message') {
      onSelectConversation?.({ _id: item.data.conversationId });
      onJumpToMessage?.(item.data._id || item.data.id);
    } else if (item.type === 'file' || item.type === 'link') {
      onSelectConversation?.({ _id: item.data.conversationId });
      onJumpToMessage?.(item.data.messageId);
    } else if (item.type === 'person') {
      if (item.data.conversationId) {
        onSelectConversation?.({ _id: item.data.conversationId });
      } else {
        onNewChat?.();
      }
    } else if (item.action) {
      item.action();
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, items.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev - 1 < 0 ? Math.max(0, items.length - 1) : prev - 1,
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSelectItem(items[selectedIndex]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/80 backdrop-blur-md"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Command search palette"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="relative w-full max-w-2xl rounded-2xl border border-white/[0.1] bg-[#0C121E] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search Input Bar */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.08] bg-[#0E1524]">
            {isFetching ? (
              <Loader2 className="w-5 h-5 text-brand-mint animate-spin shrink-0" />
            ) : (
              <Search className="w-5 h-5 text-brand-mint shrink-0" />
            )}
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search people, conversations, messages, files, links..."
              className="w-full bg-transparent text-sm text-white placeholder-text-muted focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="p-1 rounded-lg text-text-muted hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-text-faint bg-white/[0.04] border border-white/[0.08] rounded">
              ESC
            </kbd>
          </div>

          {/* Results List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {items.length === 0 ? (
              <div className="p-10 text-center text-xs text-text-muted space-y-1">
                <p className="font-semibold text-white">No results found for "{query}"</p>
                <p>Try searching for a participant, message snippet, or document title.</p>
              </div>
            ) : (
              items.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                const prevItem = items[idx - 1];
                const showSectionHeader = !prevItem || prevItem.section !== item.section;

                return (
                  <div key={item.id} className="space-y-1">
                    {showSectionHeader && (
                      <div className="px-3 pt-2.5 pb-1 text-[10px] font-mono font-bold uppercase tracking-wider text-text-muted/70">
                        {item.section}
                      </div>
                    )}

                    {/* Person Item */}
                    {item.type === 'person' && (
                      <button
                        type="button"
                        onClick={() => handleSelectItem(item)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`w-full p-2.5 rounded-xl flex items-center justify-between text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-brand-mint/10 border border-brand-mint/30'
                            : 'hover:bg-white/[0.03] border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center overflow-hidden text-brand-mint text-xs font-bold shrink-0">
                            {item.data.avatar ? (
                              <img
                                src={getUploadUrl(item.data.avatar)}
                                alt={item.data.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span>{getInitials(item.data.name)}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-white truncate">
                                {item.data.name}
                              </span>
                              {item.data.role && (
                                <EcosystemRoleBadge role={item.data.role} size="xs" />
                              )}
                            </div>
                            <p className="text-[11px] text-text-muted font-mono truncate">
                              @{item.data.username || 'member'}
                            </p>
                          </div>
                        </div>
                        <ArrowRight
                          className={`w-3.5 h-3.5 transition-opacity shrink-0 ${
                            isSelected ? 'opacity-100 text-brand-mint' : 'opacity-0'
                          }`}
                        />
                      </button>
                    )}

                    {/* Conversation Item */}
                    {item.type === 'conversation' && (
                      <button
                        type="button"
                        onClick={() => handleSelectItem(item)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`w-full p-2.5 rounded-xl flex items-center justify-between text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-brand-mint/10 border border-brand-mint/30'
                            : 'hover:bg-white/[0.03] border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center overflow-hidden text-brand-mint text-xs font-bold shrink-0">
                            {item.data.avatar ? (
                              <img
                                src={getUploadUrl(item.data.avatar)}
                                alt={item.data.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span>{getInitials(item.data.name)}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-white truncate block">
                              {item.data.name}
                            </span>
                            <p className="text-[11px] text-text-muted truncate mt-0.5">
                              {item.data.lastMessage?.body || 'No messages yet'}
                            </p>
                          </div>
                        </div>
                        <ArrowRight
                          className={`w-3.5 h-3.5 transition-opacity shrink-0 ${
                            isSelected ? 'opacity-100 text-brand-mint' : 'opacity-0'
                          }`}
                        />
                      </button>
                    )}

                    {/* Message Snippet Item */}
                    {item.type === 'message' && (
                      <button
                        type="button"
                        onClick={() => handleSelectItem(item)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`w-full p-2.5 rounded-xl flex items-center justify-between text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-brand-mint/10 border border-brand-mint/30'
                            : 'hover:bg-white/[0.03] border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-brand-mint/10 text-brand-mint flex items-center justify-center shrink-0 border border-brand-mint/20">
                            <MessageSquare className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 text-[11px]">
                              <span className="font-bold text-white truncate">
                                {item.data.senderId?.name || 'Member'}
                              </span>
                              <span className="text-text-muted">•</span>
                              <span className="text-text-muted truncate font-mono text-[10px]">
                                {item.data.conversationName}
                              </span>
                            </div>
                            <p className="text-xs text-text-secondary truncate mt-0.5">
                              "{item.data.body}"
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-brand-mint font-semibold shrink-0">
                          Jump
                        </span>
                      </button>
                    )}

                    {/* File Item */}
                    {item.type === 'file' && (
                      <button
                        type="button"
                        onClick={() => handleSelectItem(item)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`w-full p-2.5 rounded-xl flex items-center justify-between text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-brand-mint/10 border border-brand-mint/30'
                            : 'hover:bg-white/[0.03] border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-white truncate">
                              {item.data.name}
                            </p>
                            <p className="text-[10px] text-text-muted font-mono truncate">
                              Shared in {item.data.conversationName}
                            </p>
                          </div>
                        </div>
                        <ArrowRight
                          className={`w-3.5 h-3.5 transition-opacity shrink-0 ${
                            isSelected ? 'opacity-100 text-brand-mint' : 'opacity-0'
                          }`}
                        />
                      </button>
                    )}

                    {/* Link Item */}
                    {item.type === 'link' && (
                      <button
                        type="button"
                        onClick={() => handleSelectItem(item)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`w-full p-2.5 rounded-xl flex items-center justify-between text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-brand-mint/10 border border-brand-mint/30'
                            : 'hover:bg-white/[0.03] border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
                            <Globe className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 text-[11px]">
                              <span className="font-mono font-bold text-brand-mint">
                                {item.data.hostname}
                              </span>
                              <span className="text-text-muted">•</span>
                              <span className="text-text-muted text-[10px] truncate">
                                {item.data.conversationName}
                              </span>
                            </div>
                            <p className="text-xs text-text-muted font-mono truncate">
                              {item.data.url}
                            </p>
                          </div>
                        </div>
                        <ArrowRight
                          className={`w-3.5 h-3.5 transition-opacity shrink-0 ${
                            isSelected ? 'opacity-100 text-brand-mint' : 'opacity-0'
                          }`}
                        />
                      </button>
                    )}

                    {/* Action Command */}
                    {item.type === 'action' && (
                      <button
                        type="button"
                        onClick={() => handleSelectItem(item)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`w-full p-2.5 rounded-xl flex items-center justify-between text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-brand-mint/10 border border-brand-mint/30'
                            : 'hover:bg-white/[0.03] border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`p-2 rounded-xl bg-white/[0.04] border border-white/[0.06] ${item.color} shrink-0`}
                          >
                            <item.icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-white">
                              {item.title}
                            </p>
                            <p className="text-[11px] text-text-muted truncate">
                              {item.subtitle}
                            </p>
                          </div>
                        </div>

                        <ArrowRight
                          className={`w-3.5 h-3.5 transition-opacity shrink-0 ${
                            isSelected ? 'opacity-100 text-brand-mint' : 'opacity-0'
                          }`}
                        />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Hints */}
          <div className="px-4 py-2 border-t border-white/[0.06] bg-[#0A0F1A] flex items-center justify-between text-[11px] font-mono text-text-faint">
            <div className="flex items-center gap-3">
              <span>↑↓ Navigate</span>
              <span>↵ Open</span>
              <span>ESC Close</span>
            </div>
            <span>Zeitnah Command Center</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
