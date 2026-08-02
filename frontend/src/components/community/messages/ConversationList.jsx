import React from 'react';
import ConversationItem from './ConversationItem';

export default function ConversationList({
  conversations = [],
  activeId,
  loading,
  onSelectConversation,
}) {
  if (loading) {
    return (
      <div className="space-y-3 p-3 animate-pulse">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="w-full h-16 bg-slate-900/80 rounded-2xl border border-slate-800"
          />
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="p-6 text-center text-xs text-slate-500 italic">
        No conversations found.
      </div>
    );
  }

  return (
    <div className="space-y-1.5 p-2 overflow-y-auto max-h-[calc(100vh-140px)]">
      {conversations.map((conv) => (
        <ConversationItem
          key={conv._id}
          conversation={conv}
          isActive={conv._id === activeId}
          onClick={() => onSelectConversation(conv._id)}
        />
      ))}
    </div>
  );
}
