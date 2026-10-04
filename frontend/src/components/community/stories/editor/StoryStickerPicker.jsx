import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { CURATED_STICKERS } from './storyEditorConstants';

/**
 * StoryStickerPicker — Popover or bottom drawer presenting curated social stickers.
 */
export default function StoryStickerPicker({ isOpen, onSelectSticker, onClose }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-label="Choose sticker"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          transition={{ duration: 0.18 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full sm:max-w-xs bg-[#0E1726] border border-white/10 rounded-t-3xl sm:rounded-2xl p-4 shadow-2xl space-y-3"
        >
          <div className="flex items-center justify-between pb-1 border-b border-white/[0.08]">
            <h3 className="text-xs font-bold text-white tracking-wide uppercase">
              Add Sticker
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] min-w-[44px] p-2 text-text-muted hover:text-white flex items-center justify-center cursor-pointer"
              aria-label="Close sticker picker"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2 pt-1">
            {CURATED_STICKERS.map((stk) => (
              <button
                key={stk.id}
                type="button"
                onClick={() => {
                  onSelectSticker(stk.emoji);
                  onClose();
                }}
                className="min-h-[48px] min-w-[48px] p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] active:scale-95 transition-all text-2xl flex items-center justify-center cursor-pointer hover:shadow-md"
                aria-label={stk.label}
                title={stk.label}
              >
                {stk.emoji}
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
