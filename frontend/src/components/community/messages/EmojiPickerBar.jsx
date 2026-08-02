import React from 'react';

const POPULAR_EMOJIS = ['👍', '❤️', '😂', '🎉', '🔥', '👏', '😍', '😮', '💯', '🚀'];

export default function EmojiPickerBar({ onSelectEmoji }) {
  return (
    <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-full shadow-xl">
      {POPULAR_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => onSelectEmoji(emoji)}
          className="p-1 hover:bg-slate-800 rounded-full transition-transform transform hover:scale-125 text-base"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
