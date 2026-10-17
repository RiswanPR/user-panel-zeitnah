import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
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
  Building2,
  Bell,
} from 'lucide-react';
import notificationService from '../../services/notificationService';
import organizationService from '../../services/organizationService';
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

  const notifications = useMemo(() => data?.notifications || data?.data || [], [data?.notifications, data?.data]);
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

  const { data: followedOrgsData = [] } = useQuery({
    queryKey: ['organizations', 'followed'],
    queryFn: () => organizationService.getMyFollowedOrganizations(),
    enabled: isPreferencesOpen,
  });

  const toggleCompanyNotificationMutation = useMutation({
    mutationFn: ({ orgId, notificationsEnabled }) =>
      organizationService.updateNotificationPreferences(orgId, {
        notificationsEnabled,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations', 'followed'] });
      toast.success('Updated', 'Company notification setting saved.');
    },
    onError: (err) => {
      toast.error(
        'Update failed',
        err.response?.data?.message || 'Could not update setting.',
      );
    },
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-heading font-black text-text-primary tracking-tight">
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
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-surface-elevated hover:bg-surface-card text-xs font-semibold text-text-secondary hover:text-text-primary transition-all focus-ring cursor-pointer"
          >
            <CheckCheck className="w-3.5 h-3.5 text-brand-mint" />
            <span>Mark all read</span>
          </button>

          <button
            type="button"
            onClick={() => clearRead()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-surface-elevated hover:bg-red-500/10 hover:border-red-500/20 text-xs font-semibold text-text-muted hover:text-red-400 transition-all focus-ring cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear read</span>
          </button>

          <button
            type="button"
            onClick={() => setIsPreferencesOpen(true)}
            aria-label="Notification preferences"
            className="p-2 rounded-xl border border-border bg-surface-elevated hover:bg-surface-card text-text-muted hover:text-text-primary transition-all focus-ring cursor-pointer"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Toolbar: Category Tabs & Search ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-2 rounded-2xl border border-border bg-surface-card shadow-sm">
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
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all focus-ring cursor-pointer ${
                  isActive
                    ? 'bg-brand-mint text-brand-navy font-bold shadow-[0_0_12px_rgba(159,213,178,0.25)]'
                    : 'bg-surface-elevated text-text-muted hover:bg-surface-card hover:text-text-primary'
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
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-border bg-surface-elevated text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-accent"
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
          <div className="p-12 text-center rounded-3xl border border-border bg-surface-card">
            <p className="text-sm text-text-muted mb-4">
              Unable to load your notifications right now.
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="btn-primary py-2 px-5 text-xs inline-flex items-center gap-2 cursor-pointer"
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
          <div className="py-20 px-6 text-center rounded-3xl border border-border bg-surface-card flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-2xl border border-border bg-surface-elevated flex items-center justify-center text-text-faint mb-3 shadow-inner">
              <BellOff className="w-7 h-7" />
            </div>
            <h3 className="text-base font-heading font-bold text-text-primary mb-1">
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
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <span className="text-xs text-text-muted">
            Page <span className="font-semibold text-text-primary">{page}</span> of{' '}
            <span className="font-semibold text-text-primary">{totalPages}</span> ({total} total)
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 rounded-xl border border-border bg-surface-elevated px-3 py-1.5 text-xs font-semibold text-text-muted hover:text-text-primary hover:bg-surface-card transition-colors disabled:opacity-40 disabled:pointer-events-none focus-ring cursor-pointer"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Previous</span>
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="inline-flex items-center gap-1 rounded-xl border border-border bg-surface-elevated px-3 py-1.5 text-xs font-semibold text-text-muted hover:text-text-primary hover:bg-surface-card transition-colors disabled:opacity-40 disabled:pointer-events-none focus-ring cursor-pointer"
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
              className="relative w-full max-w-lg rounded-3xl border border-border bg-surface-card p-6 shadow-2xl z-10 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div>
                  <h3 className="text-base font-heading font-bold text-text-primary">
                    Notification Preferences
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    Customize delivery channels for different notification types.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPreferencesOpen(false)}
                  className="p-2 rounded-xl text-text-muted hover:text-text-primary cursor-pointer"
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
                        className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface-elevated"
                      >
                        <span className="text-xs font-semibold text-text-primary">
                          {cat.label}
                        </span>
                        <div className="flex items-center gap-4 text-xs">
                          <label className="flex items-center gap-1.5 cursor-pointer text-text-muted hover:text-text-primary">
                            <input
                              type="checkbox"
                              name={`${cat.id}_inApp`}
                              defaultChecked={pref.inApp}
                              className="rounded border-border bg-surface-card text-brand-mint focus:ring-brand-mint"
                            />
                            <span>In-App</span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer text-text-muted hover:text-text-primary">
                            <input
                              type="checkbox"
                              name={`${cat.id}_email`}
                              defaultChecked={pref.email}
                              className="rounded border-border bg-surface-card text-brand-mint focus:ring-brand-mint"
                            />
                            <span>Email</span>
                          </label>
                        </div>
                      </div>
                    );
                  })}

                  {/* Followed Organizations Notification Settings (Phase 3 Feature D) */}
                  <div className="pt-2 border-t border-border space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-brand-mint" />
                        <span>Followed Organizations</span>
                      </span>
                      <span className="text-[11px] text-text-muted">
                        Post alerts
                      </span>
                    </div>

                    {followedOrgsData.length === 0 ? (
                      <p className="text-[11px] text-text-muted italic bg-surface-elevated p-2.5 rounded-xl border border-border">
                        You are not following any organizations yet. Visit Network &gt; Organizations to discover partners.
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {followedOrgsData.map((item) => {
                          const org = item.organization;
                          if (!org) return null;
                          const orgId = org._id || org.id;
                          return (
                            <div
                              key={orgId}
                              className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-surface-elevated"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-6 h-6 rounded-lg bg-surface-card border border-border flex items-center justify-center shrink-0 overflow-hidden">
                                  {org.logo ? (
                                    <img
                                      src={org.logo}
                                      alt={org.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <Building2 className="w-3.5 h-3.5 text-brand-mint" />
                                  )}
                                </div>
                                <span className="text-xs font-medium text-text-primary truncate max-w-[180px]">
                                  {org.name}
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  toggleCompanyNotificationMutation.mutate({
                                    orgId,
                                    notificationsEnabled:
                                      !item.notificationsEnabled,
                                  })
                                }
                                disabled={
                                  toggleCompanyNotificationMutation.isPending
                                }
                                className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                                  item.notificationsEnabled
                                    ? 'bg-brand-mint/15 text-brand-mint border-brand-mint/30 hover:bg-brand-mint/25'
                                    : 'bg-surface-card text-text-muted border-border hover:text-text-primary'
                                }`}
                              >
                                {item.notificationsEnabled ? (
                                  <>
                                    <Bell className="w-3 h-3" />
                                    <span>Enabled</span>
                                  </>
                                ) : (
                                  <>
                                    <BellOff className="w-3 h-3" />
                                    <span>Muted</span>
                                  </>
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Security Notice */}
                  <div className="flex items-start gap-2.5 p-3 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-300 text-xs">
                    <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      <strong>Security & Account Alerts</strong> are always delivered via In-App and Email for the protection of your account.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setIsPreferencesOpen(false)}
                    className="btn-secondary py-2 px-4 text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updatePreferencesMutation.isPending}
                    className="btn-primary py-2 px-5 text-xs font-semibold cursor-pointer"
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
