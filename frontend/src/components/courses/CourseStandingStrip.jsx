import { useContext } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Trophy, ArrowRight, Star } from "lucide-react";
import { AuthContext } from "../../context/AuthContext";
import leaderboardService from "../../services/leaderboardService";

/**
 * Compact horizontal standing strip for the Courses page.
 * Placed at the bottom of the page (after all learning content) to provide
 * subtle progress visibility and motivation without dominating course discovery.
 */
export default function CourseStandingStrip() {
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
    <section aria-label="Your Learning Standing" className="pt-4">
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-r from-bg-card via-bg-surface/80 to-bg-card p-4 sm:p-5 shadow-sm">
        <div className="gradient-line-top" />
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-brand-yellow/5 blur-2xl" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Left: Standing Telemetry */}
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-brand-yellow/10 border border-brand-yellow/25 flex items-center justify-center text-brand-yellow shrink-0 shadow-sm">
              <Trophy className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  Your Standing
                </span>
                <span className="inline-flex items-center gap-0.5 rounded-md bg-brand-mint/10 border border-brand-mint/20 px-1.5 py-0.2 text-[9px] font-mono font-bold text-brand-mint">
                  <Star className="w-2.5 h-2.5 text-brand-yellow" />
                  Level {position.level || 1}
                </span>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 flex-wrap mt-0.5">
                <span className="font-heading font-black text-base sm:text-lg text-white font-mono">
                  #{position.rank}
                </span>
                <span className="text-white/[0.2] text-xs">•</span>
                <span className="text-xs font-mono font-bold text-text-secondary">
                  {(position.points || 0).toLocaleString()}{" "}
                  <span className="text-[10px] text-text-muted font-normal">XP</span>
                </span>
                {xpNeeded && xpNeeded > 0 ? (
                  <>
                    <span className="text-white/[0.2] text-xs hidden xs:inline">•</span>
                    <span className="text-xs text-text-muted hidden xs:inline">
                      <span className="font-semibold text-text-secondary font-mono">{xpNeeded.toLocaleString()} XP</span> to Level {nextLevel}
                    </span>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          {/* Right: Action CTA */}
          <Link
            to="/leaderboard"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs font-semibold text-white hover:bg-white/[0.08] hover:border-white/[0.15] transition-all cursor-pointer shrink-0 self-start sm:self-auto group"
          >
            <span>View Leaderboard</span>
            <ArrowRight className="w-3.5 h-3.5 text-text-muted group-hover:text-white group-hover:translate-x-0.5 transition-all" />
          </Link>
        </div>
      </div>
    </section>
  );
}
