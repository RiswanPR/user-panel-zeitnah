import { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, X } from "lucide-react";
import AnnouncementIcon from "./AnnouncementIcon";

/**
 * Format relative countdown or maintenance window
 */
function getMaintenanceStatus(startsAt, expiresAt) {
  const now = new Date();
  const start = new Date(startsAt);
  const end = expiresAt ? new Date(expiresAt) : null;

  if (start > now) {
    const diffMs = start.getTime() - now.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `Maintenance begins in ${days}d ${hours % 24}h`;
    }
    return `Maintenance begins in ${String(hours).padStart(2, "0")}h ${String(
      mins
    ).padStart(2, "0")}m`;
  }

  if (end && now <= end) {
    return "Maintenance in progress";
  }

  return null;
}

export default function AnnouncementCard({
  announcement,
  onDismiss,
  pagination = null, // e.g. "01 / 03"
  isSingle = false,
}) {
  const {
    id,
    type,
    priority,
    eyebrow,
    title,
    message,
    cta,
    allowDismiss,
    startsAt,
    expiresAt,
  } = announcement;

  // Maintenance badge calculation
  const maintenanceStatus = useMemo(() => {
    if (type === "maintenance") {
      return getMaintenanceStatus(startsAt, expiresAt);
    }
    return null;
  }, [type, startsAt, expiresAt]);

  // Visual accents by type & priority
  const theme = useMemo(() => {
    switch (type) {
      case "critical":
        return {
          border: "border-danger/30 hover:border-danger/50",
          gradientLine: "bg-gradient-to-r from-danger via-danger/60 to-transparent",
          eyebrowColor: "text-danger",
          badgeBg: "bg-danger/10 border-danger/25 text-danger",
          ambientGlow: "bg-danger/8",
          ctaButton:
            "bg-danger text-white hover:bg-danger/90 shadow-[0_0_20px_rgba(239,68,68,0.2)]",
        };
      case "maintenance":
        return {
          border: "border-warning/30 hover:border-warning/50",
          gradientLine: "bg-gradient-to-r from-warning via-warning/60 to-transparent",
          eyebrowColor: "text-warning",
          badgeBg: "bg-warning/10 border-warning/25 text-warning",
          ambientGlow: "bg-warning/8",
          ctaButton:
            "bg-warning text-bg-base font-bold hover:bg-warning/90 shadow-[0_0_20px_rgba(245,158,11,0.2)]",
        };
      case "platform":
        return {
          border: "border-brand-mint/25 hover:border-brand-mint/45",
          gradientLine: "bg-gradient-to-r from-brand-mint via-brand-mint/60 to-transparent",
          eyebrowColor: "text-brand-mint",
          badgeBg: "bg-brand-mint/10 border-brand-mint/25 text-brand-mint",
          ambientGlow: "bg-brand-mint/6",
          ctaButton:
            "bg-brand-mint text-bg-base font-bold hover:bg-brand-mint/90 shadow-[0_0_20px_rgba(159,213,178,0.2)]",
        };
      case "course":
      case "content":
        return {
          border: "border-info/25 hover:border-info/45",
          gradientLine: "bg-gradient-to-r from-info via-info/60 to-transparent",
          eyebrowColor: "text-info",
          badgeBg: "bg-info/10 border-info/25 text-info",
          ambientGlow: "bg-info/6",
          ctaButton:
            "bg-info text-bg-base font-bold hover:bg-info/90 shadow-[0_0_20px_rgba(56,189,248,0.2)]",
        };
      case "feature":
      case "event":
        return {
          border: "border-brand-yellow/25 hover:border-brand-yellow/45",
          gradientLine:
            "bg-gradient-to-r from-brand-yellow via-brand-yellow/60 to-transparent",
          eyebrowColor: "text-brand-yellow",
          badgeBg: "bg-brand-yellow/10 border-brand-yellow/25 text-brand-yellow",
          ambientGlow: "bg-brand-yellow/6",
          ctaButton:
            "bg-brand-yellow text-bg-base font-bold hover:bg-brand-yellow/90 shadow-[0_0_20px_rgba(246,237,74,0.2)]",
        };
      case "general":
      default:
        return {
          border: "border-white/10 hover:border-white/20",
          gradientLine: "bg-gradient-to-r from-white/30 via-white/10 to-transparent",
          eyebrowColor: "text-text-muted",
          badgeBg: "bg-white/[0.04] border-white/10 text-text-secondary",
          ambientGlow: "bg-white/[0.02]",
          ctaButton:
            "bg-white/10 text-white font-semibold hover:bg-white/15 border border-white/10",
        };
    }
  }, [type]);

  const defaultEyebrow = useMemo(() => {
    if (eyebrow) return eyebrow;
    switch (type) {
      case "critical":
        return "CRITICAL NOTICE";
      case "maintenance":
        return "SCHEDULED MAINTENANCE";
      case "platform":
        return "PLATFORM UPDATE";
      case "course":
        return "COURSE RELEASE";
      case "content":
        return "NEW LESSONS";
      case "feature":
        return "NEW FEATURE";
      case "event":
        return "SPECIAL EVENT";
      case "important":
        return "IMPORTANT NOTICE";
      case "general":
      default:
        return "ANNOUNCEMENT";
    }
  }, [eyebrow, type]);

  // Safe CTA URL handling
  const safeCta = useMemo(() => {
    if (!cta?.url) return null;
    const url = cta.url.trim();
    if (url.toLowerCase().startsWith("javascript:")) return null;
    const isExternal = url.startsWith("http://") || url.startsWith("https://");
    return {
      label: cta.label || "Learn more",
      url,
      isExternal,
    };
  }, [cta]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.99 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-bg-card/95 via-bg-surface/90 to-bg-card/95 border ${theme.border} backdrop-blur-xl p-5 sm:p-6 transition-all duration-300 shadow-md group`}
      role="region"
      aria-label={`${defaultEyebrow}: ${title}`}
    >
      {/* Top gradient accent line */}
      <div className={`absolute top-0 inset-x-0 h-[2px] ${theme.gradientLine}`} />

      {/* Subtle ambient glow behind the card */}
      <div
        className={`pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full ${theme.ambientGlow} blur-[64px]`}
      />

      <div className="relative z-10 flex flex-col gap-4 sm:gap-5">
        {/* ── TOP BAR: Eyebrow + Status Badges + Dismiss / Pagination ── */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-[0.14em] ${theme.badgeBg}`}
            >
              <AnnouncementIcon type={type} className="w-3 h-3" />
              <span>{defaultEyebrow}</span>
            </span>

            {maintenanceStatus && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-warning/30 bg-warning/10 text-[10px] font-semibold text-warning">
                <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
                {maintenanceStatus}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0 ml-auto">
            {pagination && (
              <span className="text-[11px] font-mono font-medium text-text-muted select-none">
                {pagination}
              </span>
            )}

            {allowDismiss && onDismiss && (
              <button
                type="button"
                onClick={() => onDismiss(id)}
                aria-label="Dismiss announcement"
                className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer focus-ring"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* ── CONTENT: Title & Supporting Message ── */}
        <div className="space-y-1.5 pr-2">
          <h3 className="font-heading font-extrabold text-base sm:text-lg lg:text-xl text-white tracking-tight leading-snug">
            {title}
          </h3>
          <p className="text-xs sm:text-sm font-medium text-text-secondary leading-relaxed max-w-4xl">
            {message}
          </p>
        </div>

        {/* ── BOTTOM ROW: CTA Action ── */}
        {safeCta && (
          <div className="pt-1 flex items-center">
            {safeCta.isExternal ? (
              <a
                href={safeCta.url}
                target="_blank"
                rel="noreferrer"
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer focus-ring group/cta ${theme.ctaButton}`}
              >
                <span>{safeCta.label}</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover/cta:translate-x-1" />
              </a>
            ) : (
              <Link
                to={safeCta.url}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer focus-ring group/cta ${theme.ctaButton}`}
              >
                <span>{safeCta.label}</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover/cta:translate-x-1" />
              </Link>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
