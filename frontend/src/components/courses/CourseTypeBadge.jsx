import { Play, Video, CheckCircle2, Lock } from "lucide-react";

/**
 * CourseTypeBadge
 *
 * Renders a visually distinct, restrained badge for course types and statuses.
 * Follows official Zeitnah brand tokens:
 * - "Recording" → Brand yellow (#F6ED4A) accent with playback glyph
 * - "Online" / "Live" → Clean mint (#9FD5B2) accent with video glyph
 * - Status states: completed, enrolled, locked
 *
 * @param {string} type        – Course type ("recording" | "online")
 * @param {string} status      – Optional status ("completed" | "enrolled" | "locked" | "live")
 * @param {'sm'|'md'|'lg'} size – Badge size variant
 * @param {boolean} prominent  – When true, renders subtle elevation
 */
export default function CourseTypeBadge({
  type,
  status,
  size = "md",
  prominent = false,
}) {
  const isRecording = String(type || "").trim().toLowerCase() === "recording";

  // If a status is explicitly passed
  if (status) {
    const s = String(status).trim().toLowerCase();
    if (s === "completed") {
      return (
        <span
          className={`inline-flex items-center font-mono font-bold uppercase tracking-wider rounded-lg border backdrop-blur-md border-brand-mint/30 bg-brand-mint/15 text-brand-mint ${
            size === "sm"
              ? "px-2 py-0.5 text-[9px] gap-1"
              : size === "lg"
              ? "px-3.5 py-1.5 text-[11px] gap-2"
              : "px-2.5 py-1 text-[10px] gap-1.5"
          }`}
        >
          <CheckCircle2 className={`${size === "sm" ? "w-2.5 h-2.5" : size === "lg" ? "w-3.5 h-3.5" : "w-3 h-3"} shrink-0`} />
          Completed
        </span>
      );
    }
    if (s === "locked") {
      return (
        <span
          className={`inline-flex items-center font-mono font-bold uppercase tracking-wider rounded-lg border backdrop-blur-md border-white/15 bg-white/5 text-text-muted ${
            size === "sm"
              ? "px-2 py-0.5 text-[9px] gap-1"
              : size === "lg"
              ? "px-3.5 py-1.5 text-[11px] gap-2"
              : "px-2.5 py-1 text-[10px] gap-1.5"
          }`}
        >
          <Lock className={`${size === "sm" ? "w-2.5 h-2.5" : size === "lg" ? "w-3.5 h-3.5" : "w-3 h-3"} shrink-0`} />
          Locked
        </span>
      );
    }
    if (s === "enrolled") {
      return (
        <span
          className={`inline-flex items-center font-mono font-bold uppercase tracking-wider rounded-lg border backdrop-blur-md border-brand-yellow/30 bg-brand-yellow/15 text-brand-yellow ${
            size === "sm"
              ? "px-2 py-0.5 text-[9px] gap-1"
              : size === "lg"
              ? "px-3.5 py-1.5 text-[11px] gap-2"
              : "px-2.5 py-1 text-[10px] gap-1.5"
          }`}
        >
          Enrolled
        </span>
      );
    }
  }

  const label = isRecording ? "Recorded" : "Online";
  const Icon = isRecording ? Play : Video;

  /* ── Size scales ── */
  const sizeClasses = {
    sm: "px-2 py-0.5 text-[9px] gap-1",
    md: "px-2.5 py-1 text-[10px] gap-1.5",
    lg: "px-3.5 py-1.5 text-[11px] gap-2",
  };

  const iconSizes = {
    sm: "w-2.5 h-2.5",
    md: "w-3 h-3",
    lg: "w-3.5 h-3.5",
  };

  /* ── Colour tokens per type ── */
  const baseClasses = isRecording
    ? "border-brand-yellow/30 bg-brand-yellow/10 text-brand-yellow"
    : "border-brand-mint/30 bg-brand-mint/10 text-brand-mint";

  const prominentClasses = isRecording
    ? "border-brand-yellow/40 bg-brand-yellow/15 text-brand-yellow shadow-[0_0_12px_rgba(246,237,74,0.15)]"
    : "border-brand-mint/40 bg-brand-mint/15 text-brand-mint shadow-[0_0_12px_rgba(159,213,178,0.15)]";

  return (
    <span
      className={`
        inline-flex items-center font-mono font-bold uppercase tracking-wider
        rounded-lg border backdrop-blur-md
        ${sizeClasses[size]}
        ${prominent ? prominentClasses : baseClasses}
      `}
    >
      <Icon className={`${iconSizes[size]} shrink-0 ${isRecording ? "fill-current opacity-90" : ""}`} />
      {label}
    </span>
  );
}
