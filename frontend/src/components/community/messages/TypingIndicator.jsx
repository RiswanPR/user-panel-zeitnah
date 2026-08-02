import React from 'react';
import { motion } from 'framer-motion';

export default function TypingIndicator({ username }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 text-xs text-indigo-400 font-medium bg-slate-900/60 rounded-full border border-slate-800 w-fit">
      <span>{username ? `${username} is typing` : 'Typing'}</span>
      <div className="flex items-center gap-1">
        <motion.span
          animate={{ scale: [1, 1.5, 1] }}
          transition={{ repeat: Infinity, duration: 0.8, delay: 0 }}
          className="w-1.5 h-1.5 rounded-full bg-indigo-400"
        />
        <motion.span
          animate={{ scale: [1, 1.5, 1] }}
          transition={{ repeat: Infinity, duration: 0.8, delay: 0.2 }}
          className="w-1.5 h-1.5 rounded-full bg-indigo-400"
        />
        <motion.span
          animate={{ scale: [1, 1.5, 1] }}
          transition={{ repeat: Infinity, duration: 0.8, delay: 0.4 }}
          className="w-1.5 h-1.5 rounded-full bg-indigo-400"
        />
      </div>
    </div>
  );
}
