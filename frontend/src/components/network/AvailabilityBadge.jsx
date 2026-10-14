import { Sparkles, Briefcase } from "lucide-react";
import { normalizeAvailability } from "../../utils/profileNormalization";

const AVAILABILITY_CONFIG = {
  OPEN_TO_HIRING: {
    label: "Hiring Talent",
    icon: Briefcase,
    color: "text-emerald-300",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/25",
    dot: "bg-emerald-400",
  },
  OPEN_TO_WORK: {
    label: "Open to Work",
    icon: Sparkles,
    color: "text-sky-300",
    bg: "bg-sky-500/10",
    border: "border-sky-500/25",
    dot: "bg-sky-400",
  },
};

export default function AvailabilityBadge({ availability, size = "sm" }) {
  const normalized = normalizeAvailability(availability);
  if (!normalized || normalized === "NOT_AVAILABLE") {
    return null;
  }

  const config = AVAILABILITY_CONFIG[normalized];
  if (!config) return null;

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${config.bg} ${config.color} ${config.border} ${
        size === "xs" ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-1"
      } font-medium`}
      role="status"
      aria-label={`Availability: ${config.label}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot} animate-pulse`} />
      <Icon className={size === "xs" ? "w-2.5 h-2.5" : "w-3 h-3"} aria-hidden="true" />
      <span>{config.label}</span>
    </span>
  );
}
