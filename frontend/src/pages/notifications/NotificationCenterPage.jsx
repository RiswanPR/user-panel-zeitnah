import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  CheckCheck,
  Trash2,
  Settings,
  Search,
  ChevronLeft,
  ChevronRight,
  BellOff,
  RefreshCw,
  X,
  ShieldCheck,
} from 'lucide-react';
import notificationService from '../../services/notificationService';
import { useNotifications } from '../../context/NotificationContext';
import NotificationItem from '../../components/notifications/NotificationItem';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/Toast';

const CATEGORY_TABS = [
  { id: 'all', label: 'All Notifications' },
  { id: 'unread', label: 'Unread' },
  { id: 'learning', label: 'Learning & Courses' },
  { id: 'social', label: 'Network & Peers' },
  { id: 'community', label: 'Space Discussions' },
  { id: 'system', label: 'System & Security' },
];

export default function NotificationCenterPage() {
  const { unreadCount, markAsRead, markAllAsRead, clearRead } = useNotifications();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const queryClient = useQueryClient();
  const toast = useToast();

  const categoryParam =
    activeTab === 'all' || activeTab === 'unread' ? '' : activeTab;
  const unreadOnly = activeTab === 'unread';

  // ── 1. Fetch Paginated Notifications ──
  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['notifications', { category: categoryParam, unreadOnly, page }],
    queryFn: () =>
      notificationService.getNotifications({
        page,
        limit: 15,
        category: categoryParam,
        unreadOnly,
      }),
    staleTime: 1000 * 20,
  });

  const notifications = data?.data || [];
  const totalPages = data?.totalPages || 1;
  const total = data?.total || 0;

  // Filter client-side by search query if user types
  const filteredNotifications = useMemo(() => {
    if (!searchQuery.trim()) return notifications;
    const query = searchQuery.toLowerCase();
    return notifications.filter(
      (n) =>
        n.title?.toLowerCase().includes(query) ||
        n.message?.toLowerCase().includes(query) ||
        n.actor?.name?.toLowerCase().includes(query)
    );
  }, [notifications, searchQuery]);

  // ── 2. Preferences Query & Mutation ──
  const { data: preferences } = useQuery({
    queryKey: ['notifications', 'preferences'],
    queryFn: notificationService.getPreferences,
    enabled: isPreferencesOpen,
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: (dto) => notificationService.updatePreferences(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'preferences'] });
      toast.success('Preferences saved', 'Your notification settings have been updated.');
      setIsPreferencesOpen(false);
    },
    onError: (err) => {
      toast.error('Update failed', err.response?.data?.message || 'Could not update preferences.');
    },
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-heading font-black text-white tracking-tight">
              Notification Center
            </h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-brand-mint/15 border border-brand-mint/30 text-xs font-mono font-bold text-brand-mint">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-text-muted mt-0.5">
            Manage your personal alerts, learning progress, and platform communications.
          </p>
        </div>

        {/* Global Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => markAllAsRead(categoryParam)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] text-xs font-semibold text-text-secondary hover:text-white transition-all focus-ring"
          >
            <CheckCheck className="w-3.5 h-3.5 text-brand-mint" />
            <span>Mark all read</span>
          </button>

          <button
            type="button"
            onClick={() => clearRead()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-red-500/10 hover:border-red-500/20 text-xs font-semibold text-text-muted hover:text-red-400 transition-all focus-ring"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear read</span>
          </button>

          <button
            type="button"
            onClick={() => setIsPreferencesOpen(true)}
            aria-label="Notification preferences"
            className="p-2 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] text-text-muted hover:text-white transition-all focus-ring"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Toolbar: Category Tabs & Search ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-2 rounded-2xl border border-white/[0.08] bg-bg-surface/60 backdrop-blur-xl">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 md:pb-0">
          {CATEGORY_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all focus-ring ${
                  isActive
                    ? 'bg-brand-mint text-bg-base font-bold shadow-[0_0_12px_rgba(159,213,178,0.25)]'
                    : 'bg-white/[0.03] text-text-muted hover:bg-white/[0.06] hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-faint pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notifications..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-white/[0.08] bg-white/[0.03] text-white placeholder-text-faint focus:outline-none focus:border-brand-mint/50"
          />
        </div>
      </div>

      {/* ── Notifications List ── */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <SkeletonCard key={i} className="min-h-[85px] rounded-2xl" />
            ))}
          </div>
        ) : isError ? (
          <div className="p-12 text-center rounded-3xl border border-white/[0.08] bg-bg-surface/50 backdrop-blur-xl">
            <p className="text-sm text-text-muted mb-4">
              Unable to load your notifications right now.
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="btn-primary py-2 px-5 text-xs inline-flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry</span>
            </button>
          </div>
        ) : filteredNotifications.length > 0 ? (
          filteredNotifications.map((notif) => (
            <NotificationItem
              key={notif.id || notif._id}
              notification={notif}
              onMarkRead={markAsRead}
            />
          ))
        ) : (
          <div className="py-20 px-6 text-center rounded-3xl border border-white/[0.08] bg-bg-surface/40 backdrop-blur-xl flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-2xl border border-white/10 bg-white/[0.03] flex items-center justify-center text-text-faint mb-3 shadow-inner">
              <BellOff className="w-7 h-7" />
            </div>
            <h3 className="text-base font-heading font-bold text-white mb-1">
              {searchQuery ? 'No matching notifications' : "You're all caught up"}
            </h3>
            <p className="text-xs sm:text-sm text-text-muted max-w-sm leading-relaxed">
              {searchQuery
                ? `No notifications found matching "${searchQuery}". Try different keywords.`
                : 'New learning updates, connection requests, and system alerts will appear here.'}
            </p>
          </div>
        )}
      </div>

      {/* ── Pagination Controls ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
          <span className="text-xs text-text-muted">
            Page <span className="font-semibold text-white">{page}</span> of{' '}
            <span className="font-semibold text-white">{totalPages}</span> ({total} total)
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-text-muted hover:text-white transition-colors disabled:opacity-40 disabled:pointer-events-none focus-ring"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Previous</span>
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="inline-flex items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-text-muted hover:text-white transition-colors disabled:opacity-40 disabled:pointer-events-none focus-ring"
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── Preferences Modal ── */}
      <AnimatePresence>
        {isPreferencesOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPreferencesOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="relative w-full max-w-lg rounded-3xl border border-white/[0.1] bg-[#0C1220] p-6 shadow-2xl z-10 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                <div>
                  <h3 className="text-base font-heading font-bold text-white">
                    Notification Preferences
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    Customize delivery channels for different notification types.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPreferencesOpen(false)}
                  className="p-2 rounded-xl text-text-muted hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Preferences Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const update = {
                    social: {
                      inApp: formData.get('social_inApp') === 'on',
                      email: formData.get('social_email') === 'on',
                    },
                    learning: {
                      inApp: formData.get('learning_inApp') === 'on',
                      email: formData.get('learning_email') === 'on',
                    },
                    course: {
                      inApp: formData.get('course_inApp') === 'on',
                      email: formData.get('course_email') === 'on',
                    },
                    achievement: {
                      inApp: formData.get('achievement_inApp') === 'on',
                      email: formData.get('achievement_email') === 'on',
                    },
                    community: {
                      inApp: formData.get('community_inApp') === 'on',
                      email: formData.get('community_email') === 'on',
                    },
                    announcement: {
                      inApp: formData.get('announcement_inApp') === 'on',
                      email: formData.get('announcement_email') === 'on',
                    },
                  };
                  updatePreferencesMutation.mutate(update);
                }}
                className="space-y-4"
              >
                <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                  {[
                    { id: 'social', label: 'Network & Connection Requests' },
                    { id: 'learning', label: 'Learning Milestones & Progress' },
                    { id: 'course', label: 'Course Updates & New Lessons' },
                    { id: 'achievement', label: 'Achievements & Badges' },
                    { id: 'community', label: 'Space Replies & Mentions' },
                    { id: 'announcement', label: 'Platform Announcements' },
                  ].map((cat) => {
                    const pref = preferences?.[cat.id] || { inApp: true, email: false };
                    return (
                      <div
                        key={cat.id}
                        className="flex items-center justify-between p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]"
                      >
                        <span className="text-xs font-semibold text-white">
                          {cat.label}
                        </span>
                        <div className="flex items-center gap-4 text-xs">
                          <label className="flex items-center gap-1.5 cursor-pointer text-text-muted hover:text-white">
                            <input
                              type="checkbox"
                              name={`${cat.id}_inApp`}
                              defaultChecked={pref.inApp}
                              className="rounded border-white/20 bg-white/10 text-brand-mint focus:ring-brand-mint"
                            />
                            <span>In-App</span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer text-text-muted hover:text-white">
                            <input
                              type="checkbox"
                              name={`${cat.id}_email`}
                              defaultChecked={pref.email}
                              className="rounded border-white/20 bg-white/10 text-brand-mint focus:ring-brand-mint"
                            />
                            <span>Email</span>
                          </label>
                        </div>
                      </div>
                    );
                  })}

                  {/* Security Notice */}
                  <div className="flex items-start gap-2.5 p-3 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-300 text-xs">
                    <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      <strong>Security & Account Alerts</strong> are always delivered via In-App and Email for the protection of your account.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => setIsPreferencesOpen(false)}
                    className="btn-secondary py-2 px-4 text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updatePreferencesMutation.isPending}
                    className="btn-primary py-2 px-5 text-xs font-semibold"
                  >
                    {updatePreferencesMutation.isPending ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
