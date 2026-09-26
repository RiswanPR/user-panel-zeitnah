import React from "react";
import { motion } from "framer-motion";

/**
 * Zeitnah 2.0 Editorial Page Header
 * Standardizes page hero statements, subtitles, metadata, and primary/secondary CTAs.
 */
export default function PageHeader({
  eyebrow,
  title,
  description,
  badge,
  actions,
  children,
  className = "",
  compact = false,
}) {
  return (
    <div
      className={`relative mb-6 sm:mb-8 border-b border-white/[0.06] pb-5 sm:pb-6 ${className}`}
    >
      {/* Top subtle hairline glow */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-mint/15 to-transparent pointer-events-none" />

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        {/* Left: Eyebrow + Title + Description */}
        <div className="min-w-0 max-w-3xl">
          {eyebrow && (
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-[0.16em] text-brand-mint/90 bg-brand-mint/10 border border-brand-mint/20 px-2.5 py-0.5 rounded-full inline-block">
                {eyebrow}
              </span>
              {badge && <div>{badge}</div>}
            </div>
          )}

          <h1
            className={`font-heading font-extrabold tracking-tight text-white ${
              compact
                ? "text-2xl sm:text-3xl"
                : "text-2xl sm:text-3xl lg:text-4xl"
            } leading-[1.15]`}
          >
            {title}
          </h1>

          {description && (
            <p className="mt-2 text-sm sm:text-base font-normal text-text-muted leading-relaxed max-w-2xl">
              {description}
            </p>
          )}
        </div>

        {/* Right: Actions / CTAs */}
        {actions && (
          <div className="flex items-center flex-wrap gap-2.5 shrink-0 self-start md:self-end mt-1 md:mt-0">
            {actions}
          </div>
        )}
      </div>

      {/* Optional sub-header tabs, filters, or metric summaries */}
      {children && <div className="mt-5 pt-3 border-t border-white/[0.04]">{children}</div>}
    </div>
  );
}
