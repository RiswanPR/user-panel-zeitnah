import React, { useMemo } from "react";
import { Clock, Briefcase, Sparkles } from "lucide-react";
import { calculateTotalExperience } from "../../utils/experienceTimeline";

/**
 * Premium Total Professional Experience Summary Card for Zeitnah Profile Studio.
 *
 * Displays:
 * 1. Total Experience: e.g. "24+ Years", "8 Years", "2 Years 6 Months" (merged deduplicated intervals)
 * 2. Career Roles: number of career experience entries recorded
 * 3. Current Roles: number of roles marked as currently active
 *
 * Designed with Zeitnah dark aesthetic, subtle green accents, refined typography, and thin borders.
 */
export default function ExperienceSummaryCard({ experience = [], className = "" }) {
  const summary = useMemo(() => {
    return calculateTotalExperience(experience);
  }, [experience]);

  return (
    <div
      data-testid="experience-summary-card"
      aria-label="Total Professional Experience Summary"
      className={`rounded-2xl border border-white/[0.08] bg-[#0A0F18]/80 backdrop-blur-md p-4 sm:p-5 shadow-inner transition-all ${className}`}
    >
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 items-stretch">
        {/* Metric 1: Total Experience (Primary Metric) */}
        <div
          data-testid="experience-summary-total"
          className="md:col-span-6 flex flex-col justify-between p-4 sm:p-4.5 rounded-xl bg-gradient-to-br from-brand-mint/[0.07] via-white/[0.02] to-transparent border border-brand-mint/25 shadow-sm group"
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-mono uppercase font-bold tracking-wider text-brand-mint">
              Total Experience
            </span>
            <div className="w-7 h-7 rounded-lg bg-brand-mint/15 border border-brand-mint/30 flex items-center justify-center text-brand-mint shrink-0 shadow-sm">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div
              data-testid="total-experience-value"
              className="text-2xl sm:text-[26px] lg:text-3xl font-heading font-black text-white tracking-tight leading-tight whitespace-nowrap overflow-hidden text-ellipsis"
            >
              {summary.formattedTotal}
            </div>
            <p className="text-xs text-text-muted mt-1.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-mint shrink-0" />
              <span>Total professional experience</span>
            </p>
          </div>
        </div>

        {/* Metric 2: Career Roles (Secondary Metric) */}
        <div
          data-testid="experience-summary-roles"
          className="md:col-span-3 flex flex-col justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-colors group"
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-mono uppercase font-bold tracking-wider text-text-muted group-hover:text-text-secondary transition-colors">
              Career Roles
            </span>
            <div className="w-7 h-7 rounded-lg bg-brand-yellow/10 border border-brand-yellow/20 flex items-center justify-center text-brand-yellow shrink-0 shadow-sm">
              <Briefcase className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div
              data-testid="career-roles-value"
              className="text-xl sm:text-2xl font-heading font-bold text-white/95 tracking-tight leading-tight"
            >
              {summary.totalRoles}
            </div>
            <p className="text-xs text-text-muted mt-1.5 truncate">
              {summary.totalRoles === 1 ? "1 position recorded" : `${summary.totalRoles} positions recorded`}
            </p>
          </div>
        </div>

        {/* Metric 3: Current Roles (Secondary Metric) */}
        <div
          data-testid="experience-summary-current"
          className="md:col-span-3 flex flex-col justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-colors group"
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-mono uppercase font-bold tracking-wider text-text-muted group-hover:text-text-secondary transition-colors">
              Current Roles
            </span>
            <div className="w-7 h-7 rounded-lg bg-brand-mint/10 border border-brand-mint/20 flex items-center justify-center text-brand-mint shrink-0 shadow-sm">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div
              data-testid="current-roles-value"
              className="text-xl sm:text-2xl font-heading font-bold text-white/95 tracking-tight leading-tight flex items-center gap-2"
            >
              <span>{summary.currentRoles}</span>
              {summary.currentRoles > 0 && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-brand-mint/15 text-brand-mint border border-brand-mint/25">
                  CURRENT
                </span>
              )}
            </div>
            <p className="text-xs text-text-muted mt-1.5 flex items-center gap-1.5 truncate">
              {summary.currentRoles > 0 ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-mint animate-pulse shrink-0" />
                  <span className="text-brand-mint/90 font-medium">Currently engaged</span>
                </>
              ) : (
                <span>No active roles</span>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
