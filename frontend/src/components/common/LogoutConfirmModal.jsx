import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, AlertTriangle, Loader2, X } from 'lucide-react';

export default function LogoutConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  isLoggingOut = false,
  user = null,
}) {
  const cancelBtnRef = useRef(null);

  // Focus cancel button on open to avoid accidental Enter presses logging out
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        cancelBtnRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // ESC key listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isLoggingOut) {
        onClose?.();
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
  }, [isOpen, isLoggingOut, onClose]);

  if (!isOpen) return null;

  const avatarUrl = user?.profilePicture || user?.avatar || '';
  const userInitials = (user?.name || user?.username || 'U')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <AnimatePresence>
      <div
        className="modal-backdrop"
        onClick={(e) => {
          if (e.target === e.currentTarget && !isLoggingOut) {
            onClose?.();
          }
        }}
      >
        <motion.div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="logout-title"
          aria-describedby="logout-desc"
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ type: 'spring', stiffness: 450, damping: 32 }}
          className="relative w-full max-w-md rounded-2xl border border-white/[0.1] bg-[#090D11] p-6 sm:p-7 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Subtle top ambient gradient line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            disabled={isLoggingOut}
            aria-label="Close"
            className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.03] border border-white/[0.06] text-text-muted hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Icon + Title */}
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shrink-0 shadow-[0_0_20px_rgba(239,68,68,0.15)]">
              <LogOut className="w-6 h-6" />
            </div>
            <div className="pt-0.5">
              <h2 id="logout-title" className="text-lg font-heading font-bold text-white tracking-tight">
                Sign Out of Zeitnah?
              </h2>
              <p id="logout-desc" className="text-xs text-text-muted mt-1 leading-relaxed">
                Are you sure you want to end your current session on this device?
              </p>
            </div>
          </div>

          {/* Current User Card */}
          {user && (
            <div className="my-4 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center gap-3">
              <div className="w-9 h-9 rounded-full border border-brand-mint/25 overflow-hidden flex items-center justify-center bg-brand-mint/20 shrink-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-heading font-bold text-brand-mint">{userInitials}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white truncate">
                  {user.name || 'Zeitnah User'}
                </p>
                <p className="text-[11px] text-text-muted truncate font-mono">
                  @{user.username || 'user'} {user.email && `• ${user.email}`}
                </p>
              </div>
            </div>
          )}

          {/* Warning / Note */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/[0.08] border border-amber-500/20 text-amber-300 text-xs mb-6">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="text-[11.5px] leading-snug">
              Any unsaved changes or active course progress that hasn't synced will be interrupted.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3">
            <button
              ref={cancelBtnRef}
              type="button"
              onClick={onClose}
              disabled={isLoggingOut}
              className="px-4 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-xs font-semibold text-text-secondary hover:text-white transition-all cursor-pointer disabled:opacity-50"
            >
              Stay Signed In
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoggingOut}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-xs font-bold text-white shadow-[0_0_20px_rgba(239,68,68,0.3)] transition-all cursor-pointer disabled:opacity-50"
            >
              {isLoggingOut ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Signing Out...</span>
                </>
              ) : (
                <>
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
