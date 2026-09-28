import { useContext, memo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Trophy, ArrowRight, Award } from "lucide-react";
import { AuthContext } from "../../context/AuthContext";
import leaderboardService from "../../services/leaderboardService";
import ZeitnahZMotif from "./ZeitnahZMotif";

/**
 * CourseStandingStrip
 *
 * Achievement and learning standing strip.
 * Designed with deep navy #12314C, brand mint, and yellow accents.
 * Minimal typography, oversized rank numerals, clean editorial presence.
 */
const CourseStandingStrip = memo(function CourseStandingStrip() {
  const { user } = useContext(AuthContext);
  const currentUserId = user?._id || user?.userId;

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
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-r from-[#12314C]/80 via-[#0A0F14] to-[#07090B] p-5 sm:p-7 shadow-xl">
        {/* Subtle accent hairline */}
        <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-brand-yellow/30 to-transparent pointer-events-none" />

        {/* Ambient subtle glow */}
        <div className="pointer-events-none absolute -right-16 -top-16 w-56 h-56 rounded-full bg-brand-yellow/6 blur-[70px]" />
        <div className="pointer-events-none absolute -left-16 -bottom-16 w-56 h-56 rounded-full bg-brand-mint/6 blur-[70px]" />

        {/* Subtle Z Motif Watermark */}
        <div className="pointer-events-none absolute right-16 top-1/2 -translate-y-1/2 w-48 h-48 select-none opacity-[0.035]">
          <ZeitnahZMotif variant="yellow" className="w-full h-full rotate-6" />
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          {/* ── Left: Standing Telemetry & Rank ── */}
          <div className="flex items-center gap-4 sm:gap-5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-[#12314C] border border-brand-yellow/30 flex items-center justify-center text-brand-yellow shrink-0 shadow-md">
              <Trophy className="w-6 h-6" />
            </div>

            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-text-muted">
                  GLOBAL STANDING
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-brand-mint/10 border border-brand-mint/25 px-2 py-0.5 text-[9px] font-mono font-bold text-brand-mint">
                  <Award className="w-2.5 h-2.5 text-brand-mint" />
                  LEVEL {position.level || 1}
                </span>
              </div>

              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="font-heading font-extrabold text-2xl sm:text-3xl text-white font-mono tracking-tight">
                  #{position.rank}
                </span>
                <span className="text-white/20 text-sm">•</span>
                <span className="text-xs sm:text-sm font-mono font-bold text-text-secondary">
                  {(position.points || 0).toLocaleString()}{" "}
                  <span className="text-[10px] text-text-muted font-normal uppercase">
                    XP Telemetry
                  </span>
                </span>
                {xpNeeded && xpNeeded > 0 ? (
                  <>
                    <span className="text-white/20 text-xs hidden md:inline">•</span>
                    <span className="text-xs text-text-muted font-mono hidden md:inline">
                      <span className="text-white font-semibold">
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
            className="inline-flex items-center justify-center gap-2.5 px-5 py-3 rounded-2xl bg-white/[0.04] border border-white/[0.1] text-xs font-mono font-bold uppercase tracking-wider text-white hover:bg-white/[0.08] hover:border-brand-mint/35 transition-all cursor-pointer shrink-0 self-start sm:self-auto group active:scale-[0.98] shadow-sm"
          >
            <span>View Standings</span>
            <ArrowRight className="w-3.5 h-3.5 text-text-muted group-hover:text-brand-mint group-hover:translate-x-1 transition-all" />
          </Link>
        </div>
      </div>
    </section>
  );
});

export default CourseStandingStrip;
