import { AlertTriangle, Info, X, ArrowRight } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { Link } from 'react-router-dom';

export default function AnnouncementBanner() {
  const { announcements, dismissAnnouncement } = useNotifications();

  // Pick the highest priority active announcement to display as banner
  if (!announcements || announcements.length === 0) {
    return null;
  }

  // Find most urgent announcement
  const activeAnnouncement = announcements[0];
  if (!activeAnnouncement) return null;

  const isCritical =
    activeAnnouncement.type === 'CRITICAL' ||
    activeAnnouncement.priority === 'CRITICAL';
  const isHigh =
    activeAnnouncement.type === 'HIGH' ||
    activeAnnouncement.priority === 'HIGH';

  const containerStyle = isCritical
    ? 'border-rose-500/40 bg-gradient-to-r from-rose-950/80 via-rose-900/40 to-black/80 text-rose-200'
    : isHigh
    ? 'border-amber-500/40 bg-gradient-to-r from-amber-950/80 via-amber-900/40 to-black/80 text-amber-200'
    : 'border-brand-mint/30 bg-gradient-to-r from-brand-mint/15 via-white/[0.03] to-transparent text-white';

  const Icon = isCritical ? AlertTriangle : Info;

  return (
    <div
      role="alert"
      className={`relative mb-6 rounded-2xl border p-4 backdrop-blur-xl shadow-lg transition-all ${containerStyle}`}
    >
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2 rounded-xl bg-white/[0.05] shrink-0">
            <Icon className="w-4 h-4" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider opacity-80">
                {activeAnnouncement.type || 'Platform Announcement'}
              </span>
            </div>
            <h4 className="text-xs sm:text-sm font-heading font-bold text-white mt-0.5">
              {activeAnnouncement.title}
            </h4>
            <p className="text-xs opacity-90 mt-0.5 leading-relaxed">
              {activeAnnouncement.message}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {activeAnnouncement.actionUrl && (
            <Link
              to={activeAnnouncement.actionUrl}
              className="inline-flex items-center gap-1 text-xs font-bold text-brand-mint hover:underline px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] transition-all"
            >
              <span>{activeAnnouncement.actionLabel || 'Details'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}

          <button
            type="button"
            onClick={() =>
              dismissAnnouncement(
                activeAnnouncement._id || activeAnnouncement.id
              )
            }
            aria-label="Dismiss announcement"
            className="p-1.5 rounded-lg opacity-60 hover:opacity-100 hover:bg-white/[0.08] transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
