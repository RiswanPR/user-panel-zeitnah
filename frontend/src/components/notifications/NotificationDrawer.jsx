import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  X,
  CheckCheck,
  ExternalLink,
  BellOff,
  RefreshCw,
  ArrowLeft,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useNotifications } from '../../context/NotificationContext';
import notificationService from '../../services/notificationService';
import NotificationItem from './NotificationItem';
import { SkeletonCard } from '../ui/Skeleton';

const DRAWER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'announcements', label: 'Announcements' },
  { id: 'learning', label: 'Learning' },
  { id: 'social', label: 'Network' },
  { id: 'community', label: 'Spaces' },
  { id: 'system', label: 'System' },
];

export default function NotificationDrawer() {
  const {
    isDrawerOpen,
    setIsDrawerOpen,
    unreadCount,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  const [activeTab, setActiveTab] = useState('all');
  const drawerRef = useRef(null);
  const shouldReduceMotion = useReducedMotion();

  // Query notifications for active category / unread tab
  const categoryParam =
    activeTab === 'all' || activeTab === 'unread' ? '' : activeTab;
  const unreadOnly = activeTab === 'unread';

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['notifications', { category: categoryParam, unreadOnly }],
    queryFn: () =>
      notificationService.getNotifications({
        page: 1,
        limit: 30,
        category: categoryParam,
        unreadOnly,
      }),
    enabled: isDrawerOpen,
    staleTime: 1000 * 15,
  });

  // Handle both .notifications and .data defensively
  const notifications = data?.notifications || data?.data || [];

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isDrawerOpen) {
        setIsDrawerOpen(false);
      }
    };
    if (isDrawerOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isDrawerOpen, setIsDrawerOpen]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isDrawerOpen) {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [isDrawerOpen]);

  const handleMarkAll = () => {
    if (markAllAsRead) {
      markAllAsRead(categoryParam);
    }
  };

  return (
    <AnimatePresence>
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true" aria-label="Notifications panel">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsDrawerOpen(false)}
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
          />

          {/* Slide-over Drawer Panel */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
            <motion.div
              ref={drawerRef}
              initial={shouldReduceMotion ? false : { x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 350 }}
              className="w-screen max-w-md bg-[#090E1A] border-l border-white/[0.08] shadow-2xl flex flex-col h-full"
            >
              {/* Top Accent Gradient Line */}
              <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-brand-mint/70 to-transparent shrink-0" />

              {/* ── Drawer Header ── */}
              <div className="px-4 py-3.5 sm:px-5 sm:py-4 border-b border-white/[0.08] flex items-center justify-between gap-3 bg-[#0B111E]/90 backdrop-blur-xl shrink-0">
                <div className="flex items-center gap-2.5">
                  {/* Mobile Back button */}
                  <button
                    type="button"
                    onClick={() => setIsDrawerOpen(false)}
                    aria-label="Back"
                    className="sm:hidden p-1.5 -ml-1 text-text-muted hover:text-white rounded-lg focus-ring"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <h3 className="text-base font-heading font-extrabold text-white tracking-tight">
                    Notifications
                  </h3>

                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-brand-mint/15 border border-brand-mint/30 text-[11px] font-mono font-bold text-brand-mint">
                      {unreadCount} unread
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAll}
                      title="Mark all as read"
                      aria-label="Mark all as read"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-semibold text-text-secondary hover:text-white transition-colors focus-ring"
                    >
                      <CheckCheck className="w-4 h-4 text-brand-mint" aria-hidden="true" />
                      <span className="hidden xs:inline">Mark read</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsDrawerOpen(false)}
                    aria-label="Close notifications panel"
                    className="p-2 rounded-xl text-text-muted hover:text-white hover:bg-white/[0.05] transition-colors focus-ring"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* ── Category Filter Pills ── */}
              <div className="px-4 py-2.5 sm:px-5 sm:py-3 border-b border-white/[0.06] bg-black/20 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
                {DRAWER_TABS.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all focus-ring cursor-pointer ${
                        isActive
                          ? 'bg-brand-mint text-bg-base font-bold shadow-[0_0_12px_rgba(159,213,178,0.25)]'
                          : 'bg-white/[0.04] text-text-muted border border-white/[0.06] hover:bg-white/[0.08] hover:text-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* ── Notification Feed Content (Safe-Area Scroll) ── */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2.5 pb-24 sm:pb-6 overscroll-contain">
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                      <SkeletonCard key={i} className="min-h-[85px] rounded-2xl" />
                    ))}
                  </div>
                ) : isError ? (
                  <div className="p-8 text-center rounded-2xl border border-white/[0.08] bg-white/[0.02]">
                    <p className="text-xs text-text-muted mb-3">
                      Notifications couldn't load right now.
                    </p>
                    <button
                      type="button"
                      onClick={() => refetch()}
                      className="btn-secondary py-1.5 px-3 text-xs inline-flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Try again</span>
                    </button>
                  </div>
                ) : notifications.length > 0 ? (
                  notifications.map((notif) => (
                    <NotificationItem
                      key={notif.id || notif._id}
                      notification={notif}
                      onMarkRead={markAsRead}
                      onCloseDrawer={() => setIsDrawerOpen(false)}
                    />
                  ))
                ) : (
                  <div className="py-20 px-6 text-center flex flex-col items-center justify-center">
                    <div className="w-12 h-12 rounded-2xl border border-white/10 bg-white/[0.03] flex items-center justify-center text-text-faint mb-3">
                      <BellOff className="w-6 h-6 text-brand-mint/60" />
                    </div>
                    <h4 className="text-sm font-heading font-bold text-white mb-1">
                      You're all caught up
                    </h4>
                    <p className="text-xs text-text-muted max-w-xs leading-relaxed">
                      {unreadOnly
                        ? 'No unread notifications matching this filter.'
                        : 'New learning, network, and platform activity will appear here.'}
                    </p>
                  </div>
                )}
              </div>

              {/* ── Drawer Footer ── */}
              <div className="p-4 border-t border-white/[0.08] bg-[#070B14] flex items-center justify-between shrink-0">
                <Link
                  to="/notifications"
                  onClick={() => setIsDrawerOpen(false)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-mint hover:underline focus-ring rounded"
                >
                  <span>Open Full Notification Center</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>

                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="text-xs text-text-muted hover:text-white px-2 py-1 rounded"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
