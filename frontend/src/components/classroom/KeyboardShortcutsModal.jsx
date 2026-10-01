import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Keyboard, X } from 'lucide-react';

export default function KeyboardShortcutsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Space / K', action: 'Play / Pause playback' },
    { key: '← / →', action: 'Seek backward / forward 5 seconds' },
    { key: 'J / L', action: 'Seek backward / forward 10 seconds' },
    { key: '↑ / ↓', action: 'Increase / decrease volume' },
    { key: 'M', action: 'Mute / unmute audio' },
    { key: 'F', action: 'Toggle fullscreen video mode' },
    { key: 'P', action: 'Toggle Picture-in-Picture' },
    { key: 'Esc', action: 'Dismiss dialogs or sidebars' },
    { key: '?', action: 'Open / close keyboard shortcuts' },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-lg rounded-2xl sm:rounded-3xl border border-white/10 bg-bg-surface p-6 shadow-2xl shadow-black/80 z-10 space-y-5"
        >
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-brand-mint/10 border border-brand-mint/20 text-brand-mint flex items-center justify-center">
                <Keyboard className="w-4 h-4" />
              </div>
              <h3 className="font-heading font-bold text-base text-white">
                Keyboard Shortcuts
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close keyboard shortcuts"
              className="h-8 w-8 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.08] text-white/60 hover:text-white flex items-center justify-center transition-all cursor-pointer focus-ring"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2 max-h-[60vh] overflow-y-auto no-scrollbar">
            {shortcuts.map((sc, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl border border-white/[0.04] bg-white/[0.02]"
              >
                <span className="text-xs sm:text-sm text-text-secondary">{sc.action}</span>
                <kbd className="px-2.5 py-1 rounded-lg border border-white/15 bg-white/[0.06] text-white font-mono text-[11px] font-bold shadow-xs">
                  {sc.key}
                </kbd>
              </div>
            ))}
          </div>

          <div className="pt-2 text-center text-[11px] text-text-muted">
            Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono">?</kbd> anywhere in the studio to toggle this dialog.
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
