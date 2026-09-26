import React from "react";

/**
 * Zeitnah 2.0 Unified Premium Card
 * Variants:
 * - "surface": Default calm layered surface
 * - "elevated": Modal or floating feature card
 * - "interactive": Clickable with subtle hover elevation & glow
 * - "panel": Tighter utility container
 * - "metric": KPI / stat showcase card
 * - "insight": Technical insight card with left indicator
 */
export default function PremiumCard({
  children,
  variant = "surface",
  className = "",
  onClick,
  accentLine = false,
  padding = "p-5 sm:p-6",
  ...props
}) {
  const isInteractive = Boolean(onClick) || variant === "interactive";

  let variantClasses = "zn-card";
  if (variant === "elevated") {
    variantClasses = "zn-card-elevated";
  } else if (variant === "panel") {
    variantClasses = "zn-panel";
  } else if (variant === "metric") {
    variantClasses = "zn-card bg-gradient-to-br from-[#0F1728]/90 via-[#0B111E]/95 to-[#070B14]";
  } else if (variant === "insight") {
    variantClasses = "zn-card border-l-2 border-l-brand-mint/60";
  }

  const interactiveClasses = isInteractive
    ? "zn-card-interactive cursor-pointer active:scale-[0.99] touch-manipulation"
    : "";

  return (
    <div
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        isInteractive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.(e);
              }
            }
          : undefined
      }
      className={`relative overflow-hidden ${variantClasses} ${interactiveClasses} ${padding} ${className}`}
      {...props}
    >
      {accentLine && (
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-brand-mint/30 to-transparent pointer-events-none" />
      )}
      {children}
    </div>
  );
}
