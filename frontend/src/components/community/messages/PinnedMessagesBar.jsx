import React from 'react';
import { Pin } from 'lucide-react';

export default function PinnedMessagesBar({ pinnedMessages = [], onSelectMessage }) {
  if (pinnedMessages.length === 0) return null;

  const latestPinned = pinnedMessages[pinnedMessages.length - 1];

  return (
    <div className="bg-indigo-950/40 border-b border-indigo-500/20 px-4 py-2 flex items-center justify-between gap-3 text-xs text-indigo-300">
      <div className="flex items-center gap-2 min-w-0">
        <Pin className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
        <span className="font-bold text-[10px] uppercase tracking-wider text-indigo-400">
          Pinned ({pinnedMessages.length}):
        </span>
        <p className="truncate text-slate-200">{latestPinned.content}</p>
      </div>

      <button
        onClick={() => onSelectMessage && onSelectMessage(latestPinned._id)}
        className="text-[10px] font-bold text-indigo-400 hover:underline flex-shrink-0"
      >
        View
      </button>
    </div>
  );
}
