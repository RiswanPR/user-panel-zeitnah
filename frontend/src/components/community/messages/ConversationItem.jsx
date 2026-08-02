import React from 'react';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';
import OnlineBadge from './OnlineBadge';

export default function ConversationItem({
  conversation,
  isActive,
  onClick,
}) {
  const participantName =
    conversation.otherUser?.username ||
    conversation.participants?.[0] ||
    'Direct Chat';

  const avatarUrl =
    conversation.otherUser?.profilePicture ||
    `https://api.dicebear.com/7.x/bottts/svg?seed=${participantName}`;

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = dayjs(dateStr);
    if (d.isSame(dayjs(), 'day')) return d.format('HH:mm');
    if (d.isSame(dayjs().subtract(1, 'day'), 'day')) return 'Yesterday';
    return d.format('MMM D');
  };

  return (
    <motion.button
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={`w-full text-left p-3.5 rounded-2xl flex items-center gap-3.5 transition-all ${
        isActive
          ? 'bg-gradient-to-r from-indigo-600/20 via-purple-600/10 to-transparent border border-indigo-500/30 text-white shadow-lg'
          : 'hover:bg-slate-900/60 border border-transparent text-slate-300'
      }`}
    >
      {/* Avatar with Online dot */}
      <div className="relative flex-shrink-0">
        <img
          src={avatarUrl}
          alt={participantName}
          className="w-12 h-12 rounded-full object-cover border border-slate-800"
        />
        <div className="absolute bottom-0 right-0">
          <OnlineBadge
            status={conversation.otherUser?.status || 'ONLINE'}
            size="sm"
          />
        </div>
      </div>

      {/* Info & Last Preview */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center justify-between gap-1">
          <h4 className="text-xs font-bold text-white truncate">
            @{participantName}
          </h4>
          <span className="text-[10px] text-slate-500 font-medium">
            {formatTime(conversation.lastActivity)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-1">
          <p className="text-[11px] text-slate-400 truncate">
            {conversation.isTyping ? (
              <span className="text-indigo-400 font-medium animate-pulse">
                typing...
              </span>
            ) : (
              conversation.lastMessagePreview || 'No messages yet'
            )}
          </p>

          {conversation.unreadCount > 0 && (
            <span className="flex items-center justify-center min-w-4 h-4 text-[10px] font-bold text-white bg-indigo-600 rounded-full px-1">
              {conversation.unreadCount}
            </span>
          )}
        </div>
      </div>
    </motion.button>
  );
}
