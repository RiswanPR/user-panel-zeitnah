import { Play, Video } from "lucide-react";

/**
 * CourseTypeBadge
 *
 * Renders a visually distinct badge based on course type.
 * - "Recording" → amber / premium signal with ▶ icon
 * - everything else → mint / standard with Video icon
 *
 * @param {string} type      – Course type string from the API (e.g. "Recording")
 * @param {'sm'|'md'|'lg'}  size  – Badge size variant
 * @param {boolean} prominent – When true, renders an elevated pill with glow
 */
export default function CourseTypeBadge({ type, size = "md", prominent = false }) {
  const isRecording = String(type || "").trim().toLowerCase() === "recording";

  const label = isRecording ? "Recording Class" : "Online Class";
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
    ? "border-warning/30 bg-warning/10 text-warning"
    : "border-brand-mint/20 bg-brand-mint/8 text-brand-mint";

  const prominentClasses = isRecording
    ? "border-warning/40 bg-warning/15 text-warning shadow-[0_0_12px_rgba(245,158,11,0.15)]"
    : "border-brand-mint/30 bg-brand-mint/12 text-brand-mint shadow-[0_0_12px_rgba(159,213,178,0.12)]";

  return (
    <span
      className={`
        inline-flex items-center font-bold uppercase tracking-wider
        rounded-lg border backdrop-blur-md
        ${sizeClasses[size]}
        ${prominent ? prominentClasses : baseClasses}
      `}
    >
      <Icon className={`${iconSizes[size]} shrink-0 ${isRecording ? "fill-current opacity-80" : ""}`} />
      {label}
    </span>
  );
}
