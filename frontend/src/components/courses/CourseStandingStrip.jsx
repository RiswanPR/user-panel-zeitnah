import { useContext, memo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Trophy, ArrowRight, Award } from "lucide-react";
import { AuthContext } from "../../context/AuthContext";
import leaderboardService from "../../services/leaderboardService";
import ZeitnahZMotif from "./ZeitnahZMotif";
import { useCardSpotlight } from "../../hooks/useCardSpotlight";

/**
 * CourseStandingStrip
 *
 * Achievement and learning standing strip.
 * Designed with deep navy #12314C, brand mint, and yellow accents.
 * Directly grounded in the Zeitnah Group of Institution Brand Guideline.
 *
 * Features & Effects:
 * - Interactive mouse-tracking tactile spotlight in Light Mode
 * - Minimal typography, oversized rank numerals, clean editorial presence
 * - Direct action link to Leaderboard with hover spring
 */
const CourseStandingStrip = memo(function CourseStandingStrip() {
  const { user } = useContext(AuthContext);
  const currentUserId = user?._id || user?.userId;
  const { onMouseMove, onMouseLeave, spotlightStyle } = useCardSpotlight({
    radius: 400,
  });

  const { data: position } = useQuery({
    queryKey: ["leaderboard", "position"],
    queryFn: () => leaderboardService.getMyLeaderboardPosition(),
    staleTime: 1000 * 60 * 2, // 2 minutes
    enabled: Boolean(currentUserId),
    retry: 1,
  });

  // Fails silently if not logged in or data not available yet
  if (!position || !position.rank) {
    return null;
  }

  const nextLevel = (position.level || 1) + 1;
  const xpNeeded = position.levelProgress?.pointsNeededForNextLevel;

  return (
    <section aria-label="Learning Standing & Standings" className="pt-2">
      <div
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        className="group relative overflow-hidden rounded-3xl border border-border/80 bg-surface-card bg-gradient-to-r from-white via-amber-50/20 to-white dark:from-transparent dark:to-transparent p-5 sm:p-7 shadow-xs hover:shadow-md transition-all duration-300"
      >
        {/* Subtle accent hairline */}
        <div className="zn-hairline-yellow" />

        {/* ── INTERACTIVE MOUSE SPOTLIGHT (Light Mode Tactile Sheen) ── */}
        <div
          className="pointer-events-none absolute inset-0 z-0"
          style={spotlightStyle}
        />

        {/* Ambient subtle glow */}
        <div className="pointer-events-none absolute -right-16 -top-16 w-56 h-56 rounded-full bg-brand-yellow/8 blur-[70px]" />
        <div className="pointer-events-none absolute -left-16 -bottom-16 w-56 h-56 rounded-full bg-brand-mint/8 blur-[70px]" />

        {/* Subtle Z Motif Watermark */}
        <div className="pointer-events-none absolute right-16 top-1/2 -translate-y-1/2 w-48 h-48 select-none opacity-[0.035] group-hover:opacity-[0.06] transition-opacity duration-300 z-0">
          <ZeitnahZMotif variant="yellow" className="w-full h-full rotate-6" />
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          {/* ── Left: Standing Telemetry & Rank ── */}
          <div className="flex items-center gap-4 sm:gap-5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 dark:bg-brand-yellow/10 dark:border-brand-yellow/30 flex items-center justify-center text-amber-700 dark:text-brand-yellow shrink-0 shadow-md group-hover:scale-105 transition-transform">
              <Trophy className="w-6 h-6" />
            </div>

            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-text-muted">
                  GLOBAL STANDING
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-brand-surface-subtle dark:bg-brand-mint/10 border border-emerald-600/20 dark:border-brand-mint/25 px-2 py-0.5 text-[9px] font-mono font-bold text-brand-primary dark:text-brand-mint shadow-xs">
                  <Award className="w-2.5 h-2.5 text-brand-primary dark:text-brand-mint" />
                  LEVEL {position.level || 1}
                </span>
              </div>

              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="font-heading font-extrabold text-2xl sm:text-3xl text-text-primary font-mono tracking-tight">
                  #{position.rank}
                </span>
                <span className="text-text-faint text-sm">•</span>
                <span className="text-xs sm:text-sm font-mono font-bold text-text-secondary">
                  {(position.points || 0).toLocaleString()}{" "}
                  <span className="text-[10px] text-text-muted font-normal uppercase">
                    XP Telemetry
                  </span>
                </span>
                {xpNeeded && xpNeeded > 0 ? (
                  <>
                    <span className="text-text-faint text-xs hidden md:inline">•</span>
                    <span className="text-xs text-text-muted font-mono hidden md:inline">
                      <span className="text-text-primary font-semibold">
                        {xpNeeded.toLocaleString()} XP
                      </span>{" "}
                      to Level {nextLevel}
                    </span>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          {/* ── Right: Direct Action CTA ── */}
          <Link
            to="/leaderboard"
            className="inline-flex items-center justify-center gap-2.5 px-5 py-3 rounded-2xl bg-surface-elevated border border-border text-xs font-mono font-bold uppercase tracking-wider text-text-primary hover:bg-surface-card hover:border-brand-mint/40 transition-all cursor-pointer shrink-0 self-start sm:self-auto group active:scale-[0.98] shadow-sm min-h-[44px]"
          >
            <span>View Standings</span>
            <ArrowRight className="w-3.5 h-3.5 text-brand-mint group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
});

export default CourseStandingStrip;
