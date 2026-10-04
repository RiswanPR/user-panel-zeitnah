import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle } from 'lucide-react';

/**
 * StoryDiscardDialog — Accessible confirmation modal triggered when a user
 * tries to close or cancel an active story session with unsaved edits.
 */
export default function StoryDiscardDialog({ isOpen, onKeepEditing, onDiscard }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="discard-title"
        aria-describedby="discard-desc"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 8 }}
          transition={{ duration: 0.16 }}
          className="w-full max-w-sm bg-[#0E1726] border border-white/10 rounded-2xl p-5 shadow-2xl space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 id="discard-title" className="text-base font-bold text-white tracking-tight">
                Discard story?
              </h3>
              <p id="discard-desc" className="text-xs text-text-muted mt-0.5">
                If you go back now, your current edits will be lost.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onKeepEditing}
              className="flex-1 min-h-[44px] px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
            >
              Keep Editing
            </button>
            <button
              type="button"
              onClick={onDiscard}
              className="flex-1 min-h-[44px] px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs sm:text-sm font-bold transition-colors cursor-pointer shadow-lg shadow-rose-500/20"
            >
              Discard
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
