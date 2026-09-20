import { Sparkles, Users, MessageSquare } from "lucide-react";

const AVAILABILITY_CONFIG = {
  OPEN_TO_OPPORTUNITIES: {
    label: "Open to Opportunities",
    icon: Sparkles,
    color: "text-mint",
    bg: "bg-mint/10",
    border: "border-mint/20",
    dot: "bg-mint",
  },
  AVAILABLE_FOR_MENTORSHIP: {
    label: "Available for Mentorship",
    icon: MessageSquare,
    color: "text-purple-300",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
    dot: "bg-purple-400",
  },
  AVAILABLE_FOR_COLLABORATION: {
    label: "Open to Collaboration",
    icon: Users,
    color: "text-blue-300",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    dot: "bg-blue-400",
  },
};

export default function AvailabilityBadge({ availability, size = "sm" }) {
  if (!availability || availability === "NOT_CURRENTLY_AVAILABLE") {
    return null;
  }

  const config = AVAILABILITY_CONFIG[availability];
  if (!config) return null;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${config.bg} ${config.color} ${config.border} ${
        size === "xs" ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-1"
      } font-medium`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot} animate-pulse`} />
      <span>{config.label}</span>
    </span>
  );
}
