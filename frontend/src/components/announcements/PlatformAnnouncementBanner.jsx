import { useState, useCallback } from 'react';
import { AlertTriangle, Info, X, ExternalLink, ArrowRight, Check } from 'lucide-react';
import { usePlatformAnnouncements } from '../../hooks/usePlatformAnnouncements';
import { Link } from 'react-router-dom';

export default function PlatformAnnouncementBanner() {
  const [actionPendingId, setActionPendingId] = useState(null);
  const {
    announcements,
    dismissAnnouncement,
    acknowledgeAnnouncement,
    isDismissing,
    isAcknowledging,
  } = usePlatformAnnouncements();

  if (!announcements || announcements.length === 0) return null;

  // Show the highest priority active announcement
  const topAnnouncement = announcements[0];
  if (!topAnnouncement) return null;

  const isCritical = Boolean(
    topAnnouncement.isCritical === true ||
      String(topAnnouncement.isCritical) === 'true' ||
      topAnnouncement.priority?.toUpperCase() === 'CRITICAL' ||
      topAnnouncement.type?.toUpperCase() === 'CRITICAL',
  );

  const isHigh =
    !isCritical &&
    Boolean(
      topAnnouncement.priority?.toUpperCase() === 'HIGH' ||
        topAnnouncement.priority?.toUpperCase() === 'IMPORTANT' ||
        topAnnouncement.type?.toUpperCase() === 'IMPORTANT' ||
        topAnnouncement.type?.toUpperCase() === 'MAINTENANCE',
    );

  const allowDismiss = topAnnouncement.allowDismiss !== false;

  // Clean HTML tags from message snippet if any
  const plainMessage = String(topAnnouncement.message || '')
    .replace(/<[^>]*>?/gm, '')
    .trim();

  // CTA resolution
  const ctaUrl =
    topAnnouncement.cta?.url ||
    topAnnouncement.actionUrl ||
    (topAnnouncement.target?.courseId ? `/courses/${topAnnouncement.target.courseId}` : null);

  const ctaLabel =
    topAnnouncement.cta?.label ||
    topAnnouncement.actionLabel ||
    (topAnnouncement.target?.courseId ? 'View Course' : 'Details');

  const isExternalUrl = ctaUrl && (ctaUrl.startsWith('http://') || ctaUrl.startsWith('https://'));

  const bannerTheme = isCritical
    ? 'bg-gradient-to-r from-red-950/95 via-red-900/85 to-red-950/95 border-b border-red-500/40 text-red-100 shadow-lg shadow-red-950/50'
    : isHigh
    ? 'bg-gradient-to-r from-amber-950/95 via-amber-900/85 to-amber-950/95 border-b border-amber-500/30 text-amber-100 shadow-lg shadow-black/40'
    : 'bg-gradient-to-r from-cyan-950/95 via-brand-surface/90 to-violet-950/95 border-b border-brand-mint/20 text-text-primary shadow-lg shadow-black/30';

  const badgeTheme = isCritical
    ? 'bg-red-500/30 text-red-200 border-red-500/40'
    : isHigh
    ? 'bg-amber-500/30 text-amber-200 border-amber-500/40'
    : 'bg-brand-mint/20 text-brand-mint border-brand-mint/30';

  const iconTheme = isCritical
    ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse'
    : isHigh
    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
    : 'bg-brand-mint/20 text-brand-mint border border-brand-mint/30';

  const displayPriority = isCritical
    ? 'CRITICAL ALERT'
    : isHigh
    ? 'IMPORTANT'
    : (topAnnouncement.priority || 'NOTICE').toUpperCase();

  return (
    <div
      role="alert"
      className={`relative z-50 w-full px-4 py-2.5 transition-all duration-300 backdrop-blur-xl ${bannerTheme}`}
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left: Icon & Content */}
        <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
          <div className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center mt-0.5 sm:mt-0 ${iconTheme}`}>
            {isCritical ? <AlertTriangle className="w-4 h-4" /> : <Info className="w-4 h-4" />}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2.5 min-w-0 flex-1">
            <span
              className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 w-fit border ${badgeTheme}`}
            >
              {displayPriority}
            </span>
            <div className="text-xs sm:text-sm min-w-0 font-medium leading-snug">
              <span className="font-bold text-white mr-1.5">{topAnnouncement.title}:</span>
              <span className="opacity-90">{plainMessage}</span>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center pl-10 sm:pl-0">
          {ctaUrl && (
            isExternalUrl ? (
              <a
                href={ctaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <span>{ctaLabel}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            ) : (
              <Link
                to={ctaUrl}
                className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <span>{ctaLabel}</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            )
          )}

          {allowDismiss ? (
            <button
              type="button"
              disabled={isDismissing || Boolean(actionPendingId)}
              onClick={() => {
                const targetId = topAnnouncement._id || topAnnouncement.id || topAnnouncement.platformAnnouncementId;
                if (!targetId || isDismissing || actionPendingId) return;
                setActionPendingId(targetId);
                dismissAnnouncement(targetId, {
                  onSettled: () => setActionPendingId(null),
                });
              }}
              className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title="Dismiss announcement"
              aria-label="Dismiss announcement"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={isAcknowledging || Boolean(actionPendingId)}
              onClick={() => {
                const targetId = topAnnouncement._id || topAnnouncement.id || topAnnouncement.platformAnnouncementId;
                if (!targetId || isAcknowledging || actionPendingId) return;
                setActionPendingId(targetId);
                acknowledgeAnnouncement(targetId, {
                  onSettled: () => setActionPendingId(null),
                });
              }}
              className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white border border-white/20 transition-all cursor-pointer shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
              title="Acknowledge mandatory announcement"
            >
              <Check className="w-3 h-3" />
              <span>Acknowledge</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
