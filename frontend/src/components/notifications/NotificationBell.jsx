import { Bell } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';

/**
 * NotificationBell Component
 * Global header / sidebar entry point for the notification drawer.
 * Displays a subtle unread indicator dot or count badge without visual clutter.
 */
export default function NotificationBell({ className = '' }) {
  const { unreadCount, setIsDrawerOpen } = useNotifications();

  return (
    <button
      type="button"
      onClick={() => setIsDrawerOpen(true)}
      aria-label={
        unreadCount > 0
          ? `Notifications, ${unreadCount} unread`
          : 'Notifications'
      }
      title={
        unreadCount > 0
          ? `Notifications (${unreadCount} unread)`
          : 'Notifications'
      }
      className={`relative p-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] text-text-muted hover:text-white transition-all duration-200 active:scale-95 focus-ring cursor-pointer flex items-center justify-center ${className}`}
    >
      <Bell className="w-4 h-4 transition-colors" />

      {/* Subtle Unread Badge / Dot */}
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand-mint px-1 text-[10px] font-mono font-bold text-bg-base shadow-[0_0_8px_rgba(159,213,178,0.5)] animate-pulse">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}
