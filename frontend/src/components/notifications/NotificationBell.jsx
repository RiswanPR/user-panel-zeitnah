import { useContext, useState, useRef, useEffect, useId } from 'react';
import { Bell, CheckCheck, ExternalLink, RefreshCw, Sparkles, Inbox } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { NotificationContext } from '../../context/NotificationContext';
import notificationService from '../../services/notificationService';
import NotificationItem from './NotificationItem';

const DROPDOWN_TABS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'social', label: 'Network' },
  { id: 'learning', label: 'Learning' },
];

export default function NotificationBell({ className = '' }) {
  const notifContext = useContext(NotificationContext);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  const navigate = useNavigate();
  const dropdownId = useId();

  const unreadCount = Number(notifContext?.unreadCount || 0);
  const markAsRead = notifContext?.markAsRead;
  const markAllAsRead = notifContext?.markAllAsRead;

  // Filter params for the quick dropdown stream
  const categoryParam = activeTab === 'all' || activeTab === 'unread' ? '' : activeTab;
  const unreadOnly = activeTab === 'unread';

  // Desktop quick notification query (enabled only when dropdown is open on desktop)
  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['notifications', { category: categoryParam, unreadOnly, preview: true }],
    queryFn: () =>
      notificationService.getNotifications({
        page: 1,
        limit: 15,
        category: categoryParam,
        unreadOnly,
      }),
    enabled: isOpen,
    staleTime: 1000 * 20,
    retry: 1,
  });

  const notifications = data?.notifications || data?.data || [];

  // Click outside to dismiss
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Escape key listener to close dropdown & return focus
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen]);

  const handleToggle = () => {
    // On mobile screens (< 768px), prefer the native drawer for spacious touch interaction
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      if (notifContext?.setIsDrawerOpen) {
        notifContext.setIsDrawerOpen(true);
        return;
      }
      navigate('/notifications');
      return;
    }

    // On desktop, toggle the anchored dropdown
    setIsOpen((prev) => !prev);
  };

  const handleMarkAll = (e) => {
    e.stopPropagation();
    if (markAllAsRead) {
      markAllAsRead(categoryParam);
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-controls={isOpen ? dropdownId : undefined}
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : 'Notifications'
        }
        title={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
        className={`relative p-2 rounded-xl text-text-muted hover:text-white transition-all cursor-pointer select-none focus-ring ${
          isOpen ? 'bg-white/[0.08] text-white' : 'hover:bg-white/[0.04]'
        }`}
      >
        <Bell className="w-5 h-5" aria-hidden="true" />

        {/* Unread Pill Badge */}
        {unreadCount > 0 && (
          <span
            className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-mono font-bold text-bg-base bg-brand-mint rounded-full shadow-[0_0_10px_rgba(159,213,178,0.5)] animate-in fade-in zoom-in duration-200"
            aria-hidden="true"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Desktop Dropdown Panel */}
      {isOpen && (
        <div
          id={dropdownId}
          role="region"
          aria-label="Notification Center Preview"
          className="hidden md:flex absolute right-0 mt-2 w-[390px] lg:w-[420px] rounded-2xl bg-[#0B111E]/95 backdrop-blur-2xl border border-white/[0.1] shadow-2xl shadow-black/90 z-50 overflow-hidden flex-col animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Top Subtle Mint Accent */}
          <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-brand-mint/60 to-transparent" />

          {/* ── Dropdown Header ── */}
          <div className="px-4 py-3.5 border-b border-white/[0.07] bg-white/[0.02] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h3 className="font-heading font-extrabold text-sm text-white tracking-tight">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-brand-mint/15 text-brand-mint border border-brand-mint/30">
                  {unreadCount} unread
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAll}
                className="text-[11px] font-semibold text-text-muted hover:text-brand-mint flex items-center gap-1.5 transition-colors cursor-pointer focus-ring rounded-lg px-2 py-1"
                title="Mark all as read"
              >
                <CheckCheck className="w-3.5 h-3.5 text-brand-mint" aria-hidden="true" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* ── Filter Tabs ── */}
          <div className="px-3.5 py-2 border-b border-white/[0.05] bg-black/20 flex items-center gap-1.5">
            {DROPDOWN_TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer focus-ring ${
                    isActive
                      ? 'bg-brand-mint/15 text-brand-mint border border-brand-mint/30 shadow-sm'
                      : 'text-text-muted hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* ── Notification Feed Area (Internal Scroll) ── */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-white/[0.04] p-2 space-y-1 overscroll-contain">
            {isLoading ? (
              <div className="p-4 space-y-2.5">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-16 rounded-xl bg-white/[0.02] border border-white/[0.04] animate-pulse"
                  />
                ))}
              </div>
            ) : isError ? (
              <div className="py-10 px-4 text-center">
                <p className="text-xs text-text-muted mb-2.5">
                  Unable to load notifications right now.
                </p>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-semibold text-white transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry</span>
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-12 px-4 text-center flex flex-col items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-white/[0.03] border border-white/[0.07] flex items-center justify-center text-text-faint mb-2.5">
                  <Inbox className="w-5 h-5 text-brand-mint/70" />
                </div>
                <h4 className="text-xs font-heading font-bold text-white">
                  You're all caught up
                </h4>
                <p className="text-[11px] text-text-muted max-w-[240px] mt-0.5 leading-relaxed">
                  {unreadOnly
                    ? 'No unread notifications at the moment.'
                    : 'Institutional and network updates will appear here.'}
                </p>
              </div>
            ) : (
              notifications.map((notif) => (
                <NotificationItem
                  key={notif._id || notif.id}
                  notification={notif}
                  onMarkRead={markAsRead}
                  onCloseDrawer={() => setIsOpen(false)}
                  compact={true}
                />
              ))
            )}
          </div>

          {/* ── Dropdown Footer ── */}
          <div className="px-4 py-2.5 bg-black/30 border-t border-white/[0.07] flex items-center justify-between text-xs">
            <Link
              to="/notifications"
              onClick={() => setIsOpen(false)}
              className="text-text-muted hover:text-brand-mint font-semibold transition-colors flex items-center gap-1.5 focus-ring rounded"
            >
              <span>View all notifications</span>
              <ExternalLink className="w-3 h-3 text-brand-mint" aria-hidden="true" />
            </Link>

            <span className="text-[10px] font-mono text-text-faint">
              Zeitnah System
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
