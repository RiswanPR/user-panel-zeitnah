import { useState } from 'react';
import { Bell, CheckCheck, Users, MessageSquare, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../hooks/useNotifications';

export default function NotificationsPage() {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead, isMarkingRead, isLoading } = useNotifications({
    unreadOnly,
    limit: 50,
  });

  const handleNotificationClick = (notif) => {
    if (!notif.isRead) {
      markAsRead(notif._id);
    }
    if (notif.targetUrl) {
      navigate(notif.targetUrl);
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'spaces':
        return <Users className="w-5 h-5 text-brand-mint" />;
      case 'discussions':
        return <MessageSquare className="w-5 h-5 text-cyan-400" />;
      case 'connections':
        return <Sparkles className="w-5 h-5 text-violet-400" />;
      default:
        return <Bell className="w-5 h-5 text-brand-yellow" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading font-extrabold text-2xl text-white">Notifications</h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-mint/20 text-brand-mint border border-brand-mint/30">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="text-xs text-text-muted mt-1">
            Stay updated with space announcements, discussion replies, and connection requests.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setUnreadOnly(!unreadOnly)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              unreadOnly
                ? 'bg-brand-mint text-black'
                : 'bg-white/[0.03] text-text-muted hover:text-white'
            }`}
          >
            {unreadOnly ? 'Showing Unread' : 'Show All'}
          </button>

          {unreadCount > 0 && (
            <button
              onClick={() => markAllAsRead()}
              disabled={isMarkingRead}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-semibold text-text-secondary hover:text-white transition-colors cursor-pointer"
            >
              <CheckCheck className="w-4 h-4 text-brand-mint" />
              <span>Mark all as read</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-white/[0.02] border border-white/[0.04] animate-pulse" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="p-16 rounded-3xl bg-[#111115]/60 border border-white/[0.06] text-center max-w-sm mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-3 text-text-faint">
            <Bell className="w-6 h-6" />
          </div>
          <h3 className="font-heading font-bold text-base text-white">No notifications</h3>
          <p className="text-xs text-text-muted mt-1">
            {unreadOnly ? 'You have caught up with all your notifications.' : 'Notifications will appear here as activity occurs.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {notifications.map((notif) => (
            <div
              key={notif._id}
              onClick={() => handleNotificationClick(notif)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-4 ${
                notif.isRead
                  ? 'bg-[#111115]/80 hover:bg-[#14141a] border-white/[0.06]'
                  : 'bg-gradient-to-r from-brand-mint/[0.04] via-[#111115] to-transparent border-brand-mint/30 shadow-lg shadow-brand-mint/5'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center shrink-0 mt-0.5">
                {getCategoryIcon(notif.category)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className={`text-xs sm:text-sm truncate ${notif.isRead ? 'font-semibold text-text-secondary' : 'font-bold text-white'}`}>
                    {notif.title}
                  </h4>
                  <span className="text-[10px] text-text-muted shrink-0">
                    {new Date(notif.createdAt).toLocaleDateString()} • {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <p className="text-xs text-text-muted mt-1 leading-relaxed">
                  {notif.message}
                </p>
              </div>

              {!notif.isRead && (
                <span className="w-2.5 h-2.5 rounded-full bg-brand-mint shrink-0 self-center" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
