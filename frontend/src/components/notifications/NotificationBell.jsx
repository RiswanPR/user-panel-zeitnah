import { useContext, useState, useRef, useEffect } from 'react';
import { Bell, Check, ExternalLink, Sparkles, Users, MessageSquare } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { NotificationContext } from '../../context/NotificationContext';
import { useNotifications } from '../../hooks/useNotifications';

export default function NotificationBell({ className = '' }) {
  const notifContext = useContext(NotificationContext);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const hookNotifs = useNotifications({ limit: 10 });

  const unreadCount = notifContext?.unreadCount !== undefined ? notifContext.unreadCount : hookNotifs.unreadCount;
  const notifications = hookNotifs.notifications || [];
  const markAsRead = hookNotifs.markAsRead;
  const markAllAsRead = hookNotifs.markAllAsRead;
  const isMarkingRead = hookNotifs.isMarkingRead;

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClick = () => {
    if (notifContext?.setIsDrawerOpen) {
      notifContext.setIsDrawerOpen(true);
    } else {
      setIsOpen(!isOpen);
    }
  };

  const handleNotificationClick = (notif) => {
    if (!notif.isRead) {
      markAsRead(notif._id);
    }
    setIsOpen(false);
    if (notif.targetUrl) {
      navigate(notif.targetUrl);
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'spaces':
        return <Users className="w-4 h-4 text-brand-mint" />;
      case 'discussions':
        return <MessageSquare className="w-4 h-4 text-cyan-400" />;
      case 'connections':
        return <Sparkles className="w-4 h-4 text-violet-400" />;
      default:
        return <Bell className="w-4 h-4 text-brand-yellow" />;
    }
  };

  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffSecs = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSecs < 60) return 'Just now';
    if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
    if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h ago`;
    return `${Math.floor(diffSecs / 86400)}d ago`;
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={handleClick}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        className="relative p-2 rounded-xl text-text-muted hover:text-white hover:bg-white/[0.04] transition-all cursor-pointer select-none"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-black bg-brand-mint rounded-full shadow-md animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Popup if not using Drawer */}
      {isOpen && !notifContext?.setIsDrawerOpen && (
        <div className="absolute right-0 mt-2 w-[340px] sm:w-[380px] rounded-2xl bg-[#0e0e10]/95 backdrop-blur-2xl border border-white/[0.08] shadow-2xl shadow-black/80 z-50 overflow-hidden flex flex-col">
          <div className="px-4 py-3.5 border-b border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-heading font-bold text-sm text-white">Notifications</h3>
              {unreadCount > 0 && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-brand-mint/20 text-brand-mint border border-brand-mint/30">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                disabled={isMarkingRead}
                className="text-[11px] font-medium text-text-muted hover:text-brand-mint flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Check className="w-3 h-3" />
                <span>Mark all as read</span>
              </button>
            )}
          </div>

          <div className="max-h-[360px] overflow-y-auto divide-y divide-white/[0.04]">
            {notifications.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-text-faint">
                  <Bell className="w-5 h-5" />
                </div>
                <p className="text-sm font-semibold text-text-secondary">No notifications yet</p>
                <p className="text-xs text-text-muted mt-1">We'll alert you when there are new updates.</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif._id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`px-4 py-3 flex items-start gap-3 transition-colors cursor-pointer ${
                    notif.isRead
                      ? 'hover:bg-white/[0.02]'
                      : 'bg-brand-mint/[0.03] hover:bg-brand-mint/[0.06]'
                  }`}
                >
                  <div className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/[0.06] shrink-0 flex items-center justify-center mt-0.5">
                    {getCategoryIcon(notif.category)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className={`text-xs truncate ${notif.isRead ? 'font-medium text-text-secondary' : 'font-bold text-white'}`}>
                        {notif.title}
                      </h4>
                      <span className="text-[10px] text-text-muted shrink-0">
                        {formatRelativeTime(notif.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-text-muted line-clamp-2 mt-0.5">
                      {notif.message}
                    </p>
                  </div>

                  {!notif.isRead && (
                    <span className="w-2 h-2 rounded-full bg-brand-mint shrink-0 self-center" />
                  )}
                </div>
              ))
            )}
          </div>

          <div className="px-4 py-2.5 bg-white/[0.02] border-t border-white/[0.06] flex items-center justify-between text-xs">
            <Link
              to="/notifications"
              onClick={() => setIsOpen(false)}
              className="text-text-muted hover:text-brand-mint font-semibold transition-colors flex items-center gap-1"
            >
              <span>View all notifications</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
