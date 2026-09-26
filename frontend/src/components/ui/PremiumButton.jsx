import React from "react";
import { Loader2 } from "lucide-react";

/**
 * Zeitnah 2.0 Unified Button Component
 * Enforces 44px minimum touch targets, subtle micro-interactions, and accessible states.
 */
export default function PremiumButton({
  children,
  variant = "primary", // "primary" | "accent" | "secondary" | "ghost" | "danger"
  size = "md", // "sm" | "md" | "lg"
  icon: Icon,
  iconPosition = "left",
  loading = false,
  disabled = false,
  fullWidth = false,
  className = "",
  type = "button",
  onClick,
  ...props
}) {
  let variantClass = "zn-btn-primary";
  if (variant === "accent") variantClass = "zn-btn-accent";
  else if (variant === "secondary") variantClass = "zn-btn-secondary";
  else if (variant === "ghost") variantClass = "zn-btn-ghost";
  else if (variant === "danger") variantClass = "zn-btn-danger";

  let sizeClass = "px-4 py-2 text-xs sm:text-sm min-h-[44px]";
  if (size === "sm") sizeClass = "px-3 py-1.5 text-xs min-h-[36px] sm:min-h-[40px]";
  else if (size === "lg") sizeClass = "px-6 py-3 text-sm sm:text-base min-h-[48px]";

  const widthClass = fullWidth ? "w-full" : "";
  const stateClass = disabled || loading ? "opacity-45 cursor-not-allowed pointer-events-none" : "";

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${variantClass} ${sizeClass} ${widthClass} ${stateClass} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : (
        Icon && iconPosition === "left" && <Icon className="w-4 h-4 shrink-0" />
      )}

      {children && <span>{children}</span>}

      {!loading && Icon && iconPosition === "right" && <Icon className="w-4 h-4 shrink-0" />}
    </button>
  );
}
