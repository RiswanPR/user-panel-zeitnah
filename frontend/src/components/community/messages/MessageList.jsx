import React, { useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';
import DateSeparator from './DateSeparator';

export default function MessageList({
  messages = [],
  currentUserId,
  loading,
  hasMore,
  onLoadMore,
  onEditMessage,
  onDeleteMessage,
}) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-2">
      {hasMore && (
        <div className="text-center py-2">
          <button
            onClick={onLoadMore}
            disabled={loading}
            className="text-xs text-indigo-400 hover:underline font-semibold bg-slate-900/60 px-3 py-1.5 rounded-full border border-slate-800"
          >
            {loading ? 'Loading history...' : 'Load older messages'}
          </button>
        </div>
      )}

      {messages.map((msg, index) => {
        const prevMsg = messages[index - 1];
        const isFirstInDate =
          !prevMsg ||
          new Date(msg.createdAt).toDateString() !==
            new Date(prevMsg.createdAt).toDateString();

        const isOutgoing =
          msg.senderId === currentUserId ||
          msg.senderId === 'me' ||
          msg.sending;

        return (
          <React.Fragment key={msg._id || index}>
            {isFirstInDate && <DateSeparator date={msg.createdAt} />}
            <MessageBubble
              message={msg}
              isOutgoing={isOutgoing}
              onEdit={onEditMessage}
              onDelete={onDeleteMessage}
            />
          </React.Fragment>
        );
      })}

      <div ref={bottomRef} />
    </div>
  );
}
