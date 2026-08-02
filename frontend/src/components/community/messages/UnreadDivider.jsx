import React from 'react';

export default function UnreadDivider() {
  return (
    <div className="flex items-center my-3 gap-2">
      <div className="flex-1 h-px bg-indigo-500/30" />
      <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
        New Unread Messages
      </span>
      <div className="flex-1 h-px bg-indigo-500/30" />
    </div>
  );
}
