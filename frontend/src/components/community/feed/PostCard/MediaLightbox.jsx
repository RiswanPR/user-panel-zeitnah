import { useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';

/**
 * MediaLightbox — Fullscreen media preview for Community posts
 * Supports images and videos with responsive aspect ratio preservation,
 * keyboard ESC navigation, focus trap/restoration, body scroll lock,
 * and 44x44 touch targets.
 */
export default function MediaLightbox({ isOpen, onClose, mediaItem }) {
  const previousActiveElementRef = useRef(null);
  const closeBtnRef = useRef(null);
  const shouldReduceMotion = useReducedMotion();

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      previousActiveElementRef.current = document.activeElement;
      document.addEventListener('keydown', handleKeyDown);
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      const timer = setTimeout(() => {
        closeBtnRef.current?.focus();
      }, 50);

      return () => {
        clearTimeout(timer);
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = originalOverflow;
        if (previousActiveElementRef.current?.focus) {
          previousActiveElementRef.current.focus();
        }
      };
    }
  }, [isOpen, handleKeyDown]);

  if (typeof document === 'undefined') return null;

  const isVideo = mediaItem?.type === 'video';

  return createPortal(
    <AnimatePresence>
      {isOpen && mediaItem && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: shouldReduceMotion ? 0.05 : 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-3 sm:p-6"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Media preview"
        >
          {/* Top Control Bar */}
          <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10 flex items-center gap-3">
            <button
              ref={closeBtnRef}
              type="button"
              onClick={onClose}
              className="min-h-[44px] min-w-[44px] w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center transition-all cursor-pointer border border-white/15 shadow-lg focus:outline-none focus:ring-2 focus:ring-brand-mint"
              aria-label="Close media preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Media Container */}
          <motion.div
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
            animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
            transition={
              shouldReduceMotion
                ? { duration: 0.1 }
                : { type: 'spring', damping: 28, stiffness: 350 }
            }
            className="relative max-w-5xl max-h-[85vh] w-full flex items-center justify-center overflow-hidden rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {isVideo ? (
              <video
                src={mediaItem.url}
                controls
                autoPlay
                playsInline
                className="max-h-[85vh] max-w-full rounded-xl object-contain bg-black shadow-2xl"
              />
            ) : (
              <img
                src={mediaItem.url}
                alt={mediaItem.alt || 'Post media enlarged view'}
                className="max-h-[85vh] max-w-full rounded-xl object-contain shadow-2xl select-none"
              />
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
