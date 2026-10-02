import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Bell,
  CheckCheck,
  Search,
  RefreshCw,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Filter,
  Trash2,
  Inbox,
  X,
} from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import notificationService from '../../services/notificationService';
import NotificationItem from '../../components/notifications/NotificationItem';
import {
  deduplicateAndSortNotifications,
  groupNotificationsByDate,
} from '../../utils/notificationUtils';

const CATEGORY_TABS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'announcements', label: 'Announcements' },
  { id: 'learning', label: 'Learning' },
  { id: 'social', label: 'Network' },
  { id: 'community', label: 'Spaces' },
  { id: 'system', label: 'System' },
];

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { unreadCount, markAsRead, markAllAsRead, clearRead } = useNotifications();

  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Reset page when switching tabs
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setPage(1);
  };

  const categoryParam =
    activeTab === 'all' || activeTab === 'unread' ? '' : activeTab;
  const unreadOnly = activeTab === 'unread';

  // ── Query Paginated Notifications ──
  const {
    data,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['notifications', { category: categoryParam, unreadOnly, page, pageSize }],
    queryFn: () =>
      notificationService.getNotifications({
        page,
        limit: pageSize,
        category: categoryParam,
        unreadOnly,
      }),
    staleTime: 1000 * 20,
    keepPreviousData: true,
  });

  const rawNotifications = data?.notifications || data?.data || [];
  const notifications = useMemo(
    () => deduplicateAndSortNotifications(rawNotifications),
    [rawNotifications]
  );
  const total = Number(data?.total) || notifications.length;
  const totalPages = Math.max(1, Number(data?.totalPages) || Math.ceil(total / pageSize) || 1);

  // Filter client-side by search query if user types
  const filteredNotifications = useMemo(() => {
    if (!searchQuery.trim()) return notifications;
    const query = searchQuery.toLowerCase();
    return notifications.filter(
      (n) =>
        n.title?.toLowerCase().includes(query) ||
        n.message?.toLowerCase().includes(query) ||
        n.actorId?.name?.toLowerCase().includes(query) ||
        n.actor?.name?.toLowerCase().includes(query)
    );
  }, [notifications, searchQuery]);

  // Group filtered notifications by date: Today, Yesterday, Earlier
  const dateGroups = useMemo(
    () => groupNotificationsByDate(filteredNotifications),
    [filteredNotifications]
  );

  // Safe Back action
  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.state?.idx > 0) {
      navigate(-1);
    } else {
      navigate('/network');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 pb-28 md:pb-16">
      {/* ── Top Back Navigation & Context ── */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleBack}
          aria-label="Go back"
          className="inline-flex items-center gap-2 text-xs font-semibold text-text-muted hover:text-white transition-colors py-1.5 px-2.5 -ml-2.5 rounded-xl hover:bg-white/[0.04] focus-ring cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-brand-mint" aria-hidden="true" />
          <span>Back</span>
        </button>

        {unreadCount > 0 && (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-brand-mint/15 text-brand-mint border border-brand-mint/30 shadow-sm">
            {unreadCount} unread
          </span>
        )}
      </div>

      {/* ── Header Area ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-heading font-black text-2xl sm:text-3xl text-white tracking-tight">
              Notification Center
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-text-muted mt-1 leading-relaxed max-w-xl">
            Stay in sync with institutional announcements, learning progress, course updates, and peer interactions.
          </p>
        </div>

        {/* Global Read Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => markAllAsRead(categoryParam)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-xs font-semibold text-white transition-all cursor-pointer focus-ring shadow-sm"
            >
              <CheckCheck className="w-4 h-4 text-brand-mint" aria-hidden="true" />
              <span>Mark all as read</span>
            </button>
          )}

          {clearRead && (
            <button
              type="button"
              onClick={() => clearRead()}
              title="Clear all read notifications"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.02] hover:bg-red-500/10 hover:border-red-500/25 border border-white/[0.06] text-xs font-semibold text-text-muted hover:text-red-400 transition-all cursor-pointer focus-ring"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Clear read</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="space-y-3">
        {/* Search Input Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notifications by title, keyword, or actor..."
            className="w-full h-10 pl-10 pr-9 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-white/[0.14] focus:border-brand-mint/40 text-xs sm:text-sm text-white placeholder:text-text-muted transition-all outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {CATEGORY_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer focus-ring ${
                  isActive
                    ? 'bg-brand-mint text-bg-base font-bold shadow-[0_0_12px_rgba(159,213,178,0.25)]'
                    : 'bg-white/[0.03] text-text-muted border border-white/[0.06] hover:bg-white/[0.06] hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Notification Feed Stream ── */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-20 rounded-2xl bg-white/[0.02] border border-white/[0.05] animate-pulse"
            />
          ))}
        </div>
      ) : isError ? (
        <div className="p-12 text-center rounded-2xl border border-white/[0.08] bg-[#0E131F]/60 max-w-md mx-auto">
          <p className="text-xs sm:text-sm text-text-muted mb-4">
            We couldn't load your notifications right now.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] text-xs font-semibold text-white transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try again</span>
          </button>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="py-20 px-4 text-center rounded-3xl bg-[#0B111E]/40 border border-white/[0.06] max-w-md mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center mx-auto mb-3.5 text-text-faint">
            <Inbox className="w-6 h-6 text-brand-mint/60" />
          </div>
          <h3 className="font-heading font-bold text-base text-white">
            {searchQuery ? 'No matching notifications' : 'No notifications'}
          </h3>
          <p className="text-xs text-text-muted mt-1 leading-relaxed max-w-xs mx-auto">
            {searchQuery
              ? `No activity matching "${searchQuery}". Try a different search term.`
              : unreadOnly
              ? 'You have caught up with all your notifications.'
              : 'Institutional, learning, and network updates will appear here as they occur.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {dateGroups.map((group) => (
            <div key={group.label} className="space-y-2.5">
              {/* Group Heading */}
              <div className="flex items-center gap-2 px-1">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-text-muted">
                  {group.label}
                </span>
                <div className="flex-1 h-px bg-white/[0.05]" />
              </div>

              {/* Group Items */}
              <div className="space-y-2">
                {group.items.map((notif) => (
                  <NotificationItem
                    key={notif._id || notif.id}
                    notification={notif}
                    onMarkRead={markAsRead}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* ── Pagination Controls ── */}
          {totalPages > 1 && (
            <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between gap-4">
              <span className="text-xs font-mono text-text-muted">
                Page {page} of {totalPages} ({total} total)
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1 || isFetching}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-white transition-all focus-ring"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <button
                  type="button"
                  disabled={page >= totalPages || isFetching}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-white transition-all focus-ring"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
