import React from "react";
import { CheckCircle2, Clock, ShieldCheck, XCircle } from "lucide-react";

/**
 * Zeitnah 2.0 Status Badge
 * Communicates official verification and statuses cleanly.
 */
export default function StatusBadge({
  status = "neutral", // "verified" | "pending" | "mint" | "gold" | "danger" | "neutral" | "info"
  label,
  children,
  size = "md",
  pulse = false,
  className = "",
}) {
  const content = label || children;

  let badgeStyle;
  let Icon = null;

  switch (status?.toLowerCase()) {
    case "verified":
    case "mint":
    case "success":
    case "active":
      badgeStyle = "zn-badge-mint";
      Icon = CheckCircle2;
      break;
    case "pending":
    case "review":
    case "gold":
    case "warning":
      badgeStyle = "zn-badge-gold";
      Icon = Clock;
      break;
    case "rejected":
    case "danger":
    case "expired":
      badgeStyle = "zn-badge-danger";
      Icon = XCircle;
      break;
    case "official":
      badgeStyle = "zn-badge-mint";
      Icon = ShieldCheck;
      break;
    default:
      badgeStyle = "zn-badge-navy";
      break;
  }

  const sizeClass = size === "sm" ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-1";

  return (
    <span className={`zn-badge ${badgeStyle} ${sizeClass} ${className}`}>
      {pulse && (
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current" />
        </span>
      )}
      {Icon && !pulse && <Icon className="w-3 h-3 shrink-0" />}
      <span>{content}</span>
    </span>
  );
}
