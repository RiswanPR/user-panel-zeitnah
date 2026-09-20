import { AlertTriangle, Info, X, ExternalLink } from 'lucide-react';
import { usePlatformAnnouncements } from '../../hooks/usePlatformAnnouncements';
import { Link } from 'react-router-dom';

export default function PlatformAnnouncementBanner() {
  const { announcements, dismissAnnouncement } = usePlatformAnnouncements();

  if (!announcements || announcements.length === 0) return null;

  // Show the highest priority active announcement
  const topAnnouncement = announcements[0];
  const isCritical = topAnnouncement.priority === 'CRITICAL' || topAnnouncement.type === 'CRITICAL';

  return (
    <div
      className={`relative z-50 w-full px-4 py-2.5 transition-all duration-300 ${
        isCritical
          ? 'bg-gradient-to-r from-red-950/90 via-red-900/80 to-red-950/90 border-b border-red-500/30 text-red-100 shadow-lg shadow-red-950/40'
          : 'bg-gradient-to-r from-cyan-950/90 via-brand-surface/90 to-violet-950/90 border-b border-brand-mint/20 text-text-primary shadow-lg shadow-black/30'
      } backdrop-blur-xl`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center ${
              isCritical
                ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse'
                : 'bg-brand-mint/20 text-brand-mint border border-brand-mint/30'
            }`}
          >
            {isCritical ? <AlertTriangle className="w-4 h-4" /> : <Info className="w-4 h-4" />}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 min-w-0">
            <span
              className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 w-fit ${
                isCritical
                  ? 'bg-red-500/30 text-red-300 border border-red-500/40'
                  : 'bg-brand-mint/20 text-brand-mint border border-brand-mint/30'
              }`}
            >
              {topAnnouncement.priority || 'Notice'}
            </span>
            <p className="text-xs sm:text-sm font-semibold truncate">
              {topAnnouncement.title}:
              <span className="font-normal opacity-90 ml-1.5">{topAnnouncement.message}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {topAnnouncement.target?.courseId && (
            <Link
              to={`/courses/${topAnnouncement.target.courseId}`}
              className="hidden md:flex items-center gap-1 text-xs font-semibold text-brand-mint hover:underline"
            >
              <span>View Course</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          )}

          <button
            onClick={() => dismissAnnouncement(topAnnouncement._id)}
            className="p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Dismiss announcement"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
