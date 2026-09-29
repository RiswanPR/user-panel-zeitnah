import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2, Ban, LogOut, X, Loader2 } from 'lucide-react';

export default function ConfirmActionModal({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  iconType = 'danger', // 'danger' | 'delete' | 'block' | 'leave'
  danger = true,
  isLoading = false,
  onConfirm,
  onClose,
  extraContent = null,
}) {
  const cancelBtnRef = useRef(null);
  const modalRef = useRef(null);

  // Focus cancel button on mount for safety
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        cancelBtnRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // ESC key and focus trap
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose?.();
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const renderIcon = () => {
    switch (iconType) {
      case 'delete':
        return <Trash2 className="w-5 h-5 text-rose-400" />;
      case 'block':
        return <Ban className="w-5 h-5 text-rose-400" />;
      case 'leave':
        return <LogOut className="w-5 h-5 text-amber-400" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-rose-400" />;
    }
  };

  const iconBg =
    iconType === 'leave'
      ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
      : 'bg-rose-500/10 border-rose-500/20 text-rose-400';

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
        onClick={(e) => {
          if (e.target === e.currentTarget && !isLoading) {
            onClose?.();
          }
        }}
      >
        <motion.div
          ref={modalRef}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          aria-describedby="confirm-dialog-desc"
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-md rounded-2xl border border-white/[0.09] bg-[#080D12] p-6 shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Subtle top ambient indicator */}
          <div
            className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent ${
              danger ? 'via-rose-500/60' : 'via-amber-500/60'
            } to-transparent`}
          />

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            aria-label="Close dialog"
            className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.03] border border-white/[0.06] text-text-muted hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="flex items-start gap-4 mb-4">
            <div
              className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 ${iconBg}`}
            >
              {renderIcon()}
            </div>
            <div className="pt-0.5 pr-6">
              <h2
                id="confirm-dialog-title"
                className="text-base font-heading font-black text-white tracking-tight"
              >
                {title}
              </h2>
              <p
                id="confirm-dialog-desc"
                className="text-xs text-text-muted mt-1 leading-relaxed"
              >
                {description}
              </p>
            </div>
          </div>

          {/* Extra options or radio selectors if any */}
          {extraContent && <div className="mb-5">{extraContent}</div>}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/[0.06]">
            <button
              ref={cancelBtnRef}
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] text-xs font-semibold text-text-secondary hover:text-white transition-all cursor-pointer disabled:opacity-50"
            >
              {cancelLabel}
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 ${
                danger
                  ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/20'
                  : 'bg-brand-yellow hover:bg-brand-yellow/90 text-[#12314C] shadow-lg shadow-brand-yellow/15'
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>{confirmLabel}</span>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
