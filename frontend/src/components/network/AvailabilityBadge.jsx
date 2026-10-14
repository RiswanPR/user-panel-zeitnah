import { Sparkles, Briefcase } from "lucide-react";
import { normalizeAvailability } from "../../utils/profileNormalization";

const AVAILABILITY_CONFIG = {
  OPEN_TO_HIRING: {
    label: "Open to Hiring",
    icon: Briefcase,
    color: "text-emerald-300",
    bg: "bg-emerald-500/15",
    border: "border-emerald-400/30",
    dot: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]",
    glow: "shadow-[0_0_14px_rgba(52,211,153,0.2)]",
  },
  OPEN_TO_WORK: {
    label: "Open to Work",
    icon: Sparkles,
    color: "text-sky-300",
    bg: "bg-sky-500/15",
    border: "border-sky-400/30",
    dot: "bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.6)]",
    glow: "shadow-[0_0_14px_rgba(56,189,248,0.2)]",
  },
};

export default function AvailabilityBadge({ availability, size = "sm", className = "" }) {
  const normalized = normalizeAvailability(availability);
  if (!normalized || normalized === "NOT_AVAILABLE") {
    return null;
  }

  const config = AVAILABILITY_CONFIG[normalized];
  if (!config) return null;

  const Icon = config.icon;

  const sizeClasses = {
    xs: "text-[10px] px-2 py-0.5 gap-1",
    sm: "text-xs px-2.5 py-1 gap-1.5",
    md: "text-xs sm:text-sm px-3.5 py-1.5 gap-2",
  };

  const iconSizes = {
    xs: "w-2.5 h-2.5",
    sm: "w-3 h-3",
    md: "w-3.5 h-3.5",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border ${config.bg} ${config.color} ${config.border} ${config.glow} ${
        sizeClasses[size] || sizeClasses.sm
      } font-semibold transition-all shadow-sm shrink-0 ${className}`}
      role="status"
      aria-label={`Availability: ${config.label}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot} animate-pulse shrink-0`} />
      <Icon className={`${iconSizes[size] || iconSizes.sm} shrink-0`} aria-hidden="true" />
      <span>{config.label}</span>
    </span>
  );
}

