import { GraduationCap, Briefcase, BookOpen, Compass, Search, Rocket } from "lucide-react";

const ROLE_CONFIG = {
  STUDENT: {
    label: "Student",
    icon: GraduationCap,
    bgColor: "bg-mint/10",
    textColor: "text-mint",
    borderColor: "border-mint/20",
  },
  PROFESSIONAL: {
    label: "Professional",
    icon: Briefcase,
    bgColor: "bg-purple-500/10",
    textColor: "text-purple-300",
    borderColor: "border-purple-500/20",
  },
  EDUCATOR: {
    label: "Educator",
    icon: BookOpen,
    bgColor: "bg-blue-500/10",
    textColor: "text-blue-300",
    borderColor: "border-blue-500/20",
  },
  MENTOR: {
    label: "Mentor",
    icon: Compass,
    bgColor: "bg-emerald-500/10",
    textColor: "text-emerald-300",
    borderColor: "border-emerald-500/20",
  },
  RECRUITER: {
    label: "Recruiter",
    icon: Search,
    bgColor: "bg-amber-500/10",
    textColor: "text-amber-300",
    borderColor: "border-amber-500/20",
  },
  FOUNDER: {
    label: "Founder",
    icon: Rocket,
    bgColor: "bg-rose-500/10",
    textColor: "text-rose-300",
    borderColor: "border-rose-500/20",
  },
};

export default function EcosystemRoleBadge({ role, size = "sm", showIcon = true }) {
  const normalized = (role || "STUDENT").toUpperCase();
  const config = ROLE_CONFIG[normalized] || ROLE_CONFIG.STUDENT;
  const Icon = config.icon;

  const sizeClasses =
    size === "xs"
      ? "text-[10px] px-2 py-0.5 gap-1"
      : size === "md"
      ? "text-xs px-3 py-1 gap-1.5 font-medium"
      : "text-[11px] px-2.5 py-0.5 gap-1.5 font-medium";

  return (
    <span
      className={`inline-flex items-center rounded-full border ${config.bgColor} ${config.textColor} ${config.borderColor} ${sizeClasses}`}
    >
      {showIcon && <Icon className={size === "xs" ? "h-3 w-3" : "h-3.5 w-3.5"} />}
      <span>{config.label}</span>
    </span>
  );
}
