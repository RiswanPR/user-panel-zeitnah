import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, Sparkles, X } from "lucide-react";
import { useAnnouncements } from "../../hooks/useAnnouncements";
import NotificationItem from "./NotificationItem";

export default function NotificationCenter({ isMobile = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const {
    allAnnouncements,
    unreadCount,
    markRead,
    markAllRead,
    isAllLoading,
  } = useAnnouncements();

  // Close on Click Outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target) &&
        isOpen
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Close on ESC
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative inline-block">
      {/* ── Bell Trigger Button ── */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={`Notifications (${unreadCount} unread)`}
        aria-expanded={isOpen}
        className={`relative flex items-center justify-center rounded-xl transition-all duration-200 cursor-pointer focus-ring ${
          isMobile
            ? "w-8 h-8 rounded-full border border-white/10 bg-white/[0.04] text-text-muted hover:text-white"
            : "w-9 h-9 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] text-text-muted hover:text-white"
        } ${isOpen ? "border-brand-mint/30 bg-brand-mint/10 text-brand-mint" : ""}`}
      >
        <Bell className="w-4 h-4" />

        {/* Subtle unread indicator dot (Apple/Linear style) */}
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-mint opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-mint shadow-[0_0_8px_rgba(159,213,178,0.8)]" />
          </span>
        )}
      </button>

      {/* ── Popover / Drawer ── */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Mobile backdrop */}
            {isMobile && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsOpen(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 md:hidden"
              />
            )}

            <motion.div
              initial={{ opacity: 0, y: isMobile ? 20 : 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: isMobile ? 20 : 10, scale: 0.96 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className={`z-50 overflow-hidden rounded-2xl border border-white/10 bg-bg-surface/95 backdrop-blur-2xl shadow-2xl flex flex-col ${
                isMobile
                  ? "fixed inset-x-3 top-16 max-h-[80vh]"
                  : "absolute right-0 mt-2.5 w-80 sm:w-96 max-h-[520px]"
              }`}
            >
              {/* Gradient accent line */}
              <div className="gradient-line-top" />

              {/* ── Header ── */}
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/[0.06] bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <h3 className="font-heading font-bold text-sm text-white">
                    Notifications
                  </h3>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-brand-mint/10 border border-brand-mint/20 text-[10px] font-bold text-brand-mint">
                      {unreadCount}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={() => markAllRead()}
                      className="text-[11px] font-semibold text-text-muted hover:text-brand-mint transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" />
                      <span>Mark all read</span>
                    </button>
                  )}
                  {isMobile && (
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      aria-label="Close notifications"
                      className="w-6 h-6 rounded flex items-center justify-center text-text-muted hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* ── Notifications List ── */}
              <div className="flex-1 overflow-y-auto divide-y divide-white/[0.03] p-1.5 max-h-[380px] no-scrollbar">
                {isAllLoading ? (
                  <div className="p-8 text-center text-xs text-text-muted space-y-2">
                    <div className="w-6 h-6 rounded-full border-2 border-brand-mint border-t-transparent animate-spin mx-auto" />
                    <p>Loading notifications...</p>
                  </div>
                ) : allAnnouncements.length === 0 ? (
                  <div className="py-12 px-4 text-center space-y-2">
                    <div className="w-10 h-10 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto text-text-muted">
                      <Bell className="w-4 h-4 opacity-50" />
                    </div>
                    <p className="text-xs font-semibold text-white">
                      All caught up
                    </p>
                    <p className="text-[11px] text-text-muted">
                      No active notifications at this time.
                    </p>
                  </div>
                ) : (
                  allAnnouncements.map((announcement) => (
                    <NotificationItem
                      key={announcement.id}
                      announcement={announcement}
                      onRead={markRead}
                      onClose={() => setIsOpen(false)}
                    />
                  ))
                )}
              </div>

              {/* ── Footer Link ── */}
              <div className="px-4 py-2.5 border-t border-white/[0.06] bg-white/[0.01] flex items-center justify-between text-[11px] font-semibold">
                <span className="text-text-muted">Stay informed</span>
                <Link
                  to="/updates"
                  onClick={() => setIsOpen(false)}
                  className="inline-flex items-center gap-1 text-brand-mint hover:underline"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>View What's New →</span>
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
