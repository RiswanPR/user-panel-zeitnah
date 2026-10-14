import { useState, useEffect } from "react";
import { ShieldCheck, Briefcase, Sparkles } from "lucide-react";
import { getUploadUrl } from "../../utils/courseUi";
import { normalizeAvailability } from "../../utils/profileNormalization";

/**
 * ProfileAvatar — Premium, shared avatar presentation component with
 * availability frames and non-colliding credential status markers.
 *
 * Supported Sizes:
 * - 'xs': 32px (h-8 w-8)
 * - 'sm': 40px (h-10 w-10)
 * - 'md': 52px (h-13 w-13) (standard network & directory cards)
 * - 'lg': 80px (h-20 w-20)
 * - 'xl': 112px/144px (w-28 h-28 sm:w-36 sm:h-36) (profile hero & showcase)
 */

const SIZE_STYLES = {
  xxs: {
    container: "w-7 h-7",
    rounded: "rounded-full",
    text: "text-[9px]",
    ringOffset: "ring-offset-1",
    marker: "w-3 h-3 -top-0.5 -right-0.5 p-0.5",
    markerIcon: "w-1.5 h-1.5",
    badge: "w-2.5 h-2.5 -bottom-0.5 -right-0.5",
    badgeIcon: "w-1.5 h-1.5",
  },
  xs: {
    container: "w-8 h-8",
    rounded: "rounded-xl",
    text: "text-xs",
    ringOffset: "ring-offset-1",
    marker: "w-3.5 h-3.5 -top-0.5 -right-0.5 p-0.5",
    markerIcon: "w-2 h-2",
    badge: "w-3 h-3 -bottom-0.5 -right-0.5",
    badgeIcon: "w-2 h-2",
  },
  sm: {
    container: "w-10 h-10",
    rounded: "rounded-xl",
    text: "text-xs",
    ringOffset: "ring-offset-1 sm:ring-offset-2",
    marker: "w-4 h-4 -top-0.5 -right-0.5 p-0.5",
    markerIcon: "w-2.5 h-2.5",
    badge: "w-3.5 h-3.5 -bottom-0.5 -right-0.5",
    badgeIcon: "w-2.5 h-2.5",
  },
  md: {
    container: "w-13 h-13 sm:w-14 sm:h-14",
    rounded: "rounded-2xl",
    text: "text-sm",
    ringOffset: "ring-offset-2",
    marker: "w-5 h-5 -top-1 -right-1 p-0.5",
    markerIcon: "w-3 h-3",
    badge: "h-4 w-4 -bottom-0.5 -right-0.5",
    badgeIcon: "w-3 h-3",
  },
  lg: {
    container: "w-20 h-20",
    rounded: "rounded-2xl",
    text: "text-xl",
    ringOffset: "ring-offset-2 sm:ring-offset-3",
    marker: "w-6 h-6 -top-1.5 -right-1.5 p-1",
    markerIcon: "w-3.5 h-3.5",
    badge: "w-5 h-5 -bottom-1 -right-1",
    badgeIcon: "w-3.5 h-3.5",
  },
  xl: {
    container: "w-28 h-28 sm:w-36 sm:h-36 md:w-40 md:h-40",
    rounded: "rounded-full",
    text: "text-3xl sm:text-4xl md:text-5xl",
    ringOffset: "ring-offset-4",
    marker: "w-8 h-8 sm:w-9 sm:h-9 top-0 right-0 sm:top-1 sm:right-1 p-1.5 shadow-xl",
    markerIcon: "w-4 h-4 sm:w-4.5 sm:h-4.5",
    badge: "w-7 h-7 sm:w-8 sm:h-8 bottom-0 right-0 sm:bottom-1 sm:right-1",
    badgeIcon: "w-4 h-4 sm:w-5 sm:h-5",
  },
};

export default function ProfileAvatar({
  src,
  name = "Member",
  alt,
  initials: explicitInitials,
  size = "md",
  shape = "circle",
  availability,
  isVerified = false,
  showVerificationBadge = false,
  isActive = false,
  className = "",
  containerClassName = "",
  children,
}) {
  const [imgError, setImgError] = useState(false);
  const avatarUrl = getUploadUrl(src);

  useEffect(() => {
    setImgError(false);
  }, [src, avatarUrl]);

  const initials =
    explicitInitials ||
    (name
      ? name
          .split(" ")
          .filter(Boolean)
          .map((p) => p[0])
          .slice(0, 2)
          .join("")
          .toUpperCase()
      : "ZU");

  const normalizedAvailability = normalizeAvailability(availability);
  const sizeConfig = SIZE_STYLES[size] || SIZE_STYLES.md;
  const isCircle = shape === "circle";

  // Frame styling based on availability
  let ringClasses = "ring-1 ring-white/10";
  let statusMarker = null;

  if (normalizedAvailability === "OPEN_TO_HIRING") {
    ringClasses = `ring-2 sm:ring-[3px] ring-emerald-400/90 ring-offset-[#0A0F18] ${sizeConfig.ringOffset} shadow-[0_0_24px_rgba(52,211,153,0.28)]`;
    statusMarker = {
      type: "HIRING",
      label: "Open to Hiring",
      bg: "bg-[#0A101D] border border-emerald-400/90 text-emerald-300",
      Icon: Briefcase,
    };
  } else if (normalizedAvailability === "OPEN_TO_WORK") {
    ringClasses = `ring-2 sm:ring-[3px] ring-sky-400/90 ring-offset-[#0A0F18] ${sizeConfig.ringOffset} shadow-[0_0_24px_rgba(56,189,248,0.28)]`;
    statusMarker = {
      type: "WORK",
      label: "Open to Work",
      bg: "bg-[#0A101D] border border-sky-400/90 text-sky-300",
      Icon: Sparkles,
    };
  }

  return (
    <div className={`relative shrink-0 select-none ${containerClassName}`}>
      {/* ── Main Avatar Surface ── */}
      <div
        className={`relative overflow-hidden bg-[#0F1724] border border-white/10 flex items-center justify-center transition-all ${sizeConfig.container} ${isCircle ? "rounded-full aspect-square shrink-0" : sizeConfig.rounded} ${ringClasses} ${className}`}
        style={isCircle ? { aspectRatio: "1 / 1", borderRadius: "50%" } : undefined}
      >
        {avatarUrl && !imgError ? (
          <img
            src={avatarUrl}
            alt={alt || name || "Member Avatar"}
            onError={() => setImgError(true)}
            className={`w-full h-full object-cover ${isCircle ? "rounded-full" : ""}`}
            style={isCircle ? { aspectRatio: "1 / 1", borderRadius: "50%", objectFit: "cover" } : { objectFit: "cover" }}
          />
        ) : (
          <div
            className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-mint/20 via-brand-navy/60 to-[#0A0F18] text-brand-mint font-heading font-black ${isCircle ? "rounded-full" : ""} ${sizeConfig.text}`}
            style={isCircle ? { aspectRatio: "1 / 1", borderRadius: "50%" } : undefined}
          >
            {initials}
          </div>
        )}

        {/* Optional Interactive Overlay (e.g. upload trigger in hero) */}
        {children}
      </div>

      {/* ── Top-Right Status Marker (Non-overlapping with bottom-right badges) ── */}
      {statusMarker && (
        <span
          className={`absolute flex items-center justify-center rounded-full shadow-lg z-10 ${statusMarker.bg} ${sizeConfig.marker}`}
          title={statusMarker.label}
          role="status"
          aria-label={`Availability: ${statusMarker.label}`}
        >
          <statusMarker.Icon className={sizeConfig.markerIcon} aria-hidden="true" />
        </span>
      )}

      {/* ── Bottom-Right Verification Badge or Active Status Dot ── */}
      {showVerificationBadge && isVerified ? (
        <span
          className={`absolute flex items-center justify-center rounded-full bg-brand-mint text-bg-base shadow-md z-10 ${sizeConfig.badge}`}
          title="Verified Member"
          aria-label="Verified Member"
        >
          <ShieldCheck className={sizeConfig.badgeIcon} />
        </span>
      ) : showVerificationBadge && isActive ? (
        <span
          className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-bg-surface bg-brand-mint shadow-sm z-10"
          aria-hidden="true"
        />
      ) : null}
    </div>
  );
}

