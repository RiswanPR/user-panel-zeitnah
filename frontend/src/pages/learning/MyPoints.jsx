import { useEffect, useState } from "react";
import {
  FiAward,
  FiCheckCircle,
  FiClock,
  FiStar,
  FiTarget,
  FiTrendingUp,
  FiChevronRight,
} from "react-icons/fi";
import api from "../../services/api";

const activityIcon = {
  class_completed: FiCheckCircle,
  course_completed: FiAward,
  watch_minutes: FiClock,
  profile_completion: FiTarget,
};

function MyPoints() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get("/courses/my-points");
        setData(res.data);
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07192a] text-white font-body">
        <div className="flex items-center gap-3">
          <svg className="animate-spin h-5 w-5 text-[#9fd5b2]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm font-semibold uppercase tracking-widest text-white/60">Loading Metrics…</span>
        </div>
      </div>
    );
  }

  const gamification = data?.gamification || {};
  const levelProgress = data?.levelProgress || {};
  const activities = data?.recentActivities || [];
  const progressPercent = levelProgress.progressPercent || 0;

  return (
    <div className="min-h-screen bg-[#07192a] relative overflow-hidden px-4 py-6 sm:py-10 font-body text-white antialiased selection:bg-[#f6ed4a] selection:text-[#07192a]">
      
      {/* Ambient background flares */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[350px] h-[350px] bg-[#9fd5b2] opacity-5 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-[#12314c] opacity-20 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl space-y-6">
        
        {/* HEADER VIEWS TITLE BANNER */}
        <div className="space-y-1.5 text-center sm:text-left">
          <p className="text-xs font-bold uppercase tracking-widest text-[#9fd5b2]">
            Gamification & Standings
          </p>
          <h1 className="font-heading font-black text-3xl sm:text-4xl md:text-5xl text-white tracking-tight leading-none mt-2">
            Level & Rewards
          </h1>
        </div>

        {/* PRIMARY TWO-COLUMN SPLIT FRAMEWORK */}
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] items-start">
          
          {/* LEFT INTERIOR PANEL: SCOREBOARD HERO CARD */}
          <div className="glass-card p-6 sm:p-8 shadow-2xl relative overflow-hidden flex flex-col">
            <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[rgba(159,213,178,0.25)] to-transparent" />
            
            <div className="flex flex-col sm:flex-row items-center gap-8 w-full">
              
              {/* Conic Level Circular Tracking Progress Unit */}
              <div className="relative h-40 w-44 sm:h-44 sm:w-44 flex-shrink-0 flex items-center justify-center">
                <div
                  className="absolute inset-0 rounded-full shadow-lg"
                  style={{
                    background: `conic-gradient(#9fd5b2 ${progressPercent}%, rgba(255,255,255,0.04) 0)`,
                  }}
                />
                <div className="absolute inset-3 flex flex-col items-center justify-center rounded-full bg-[#0d2035] border border-[rgba(159,213,178,0.1)]">
                  <FiStar className="mb-1 text-xl text-[#9fd5b2]" />
                  <span className="text-3xl sm:text-4xl font-heading font-black text-white leading-none">
                    {gamification.level || 1}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/40 mt-1">Level</span>
                </div>
              </div>

              {/* Text Parametric Value Streams */}
              <div className="flex-1 text-center sm:text-left min-w-0 w-full">
                <p className="text-xs font-bold uppercase tracking-wider text-white/40 mb-1">
                  Total Points Cumulative
                </p>
                <p className="font-heading font-black text-4xl sm:text-5xl text-white tracking-tight truncate leading-none">
                  {gamification.totalPoints || 0}
                </p>

                {/* Badges / Pill Markers */}
                <div className="mt-4 flex flex-wrap gap-2 justify-center sm:justify-start">
                  <span className="rounded-lg border border-[rgba(159,213,178,0.25)] bg-[rgba(159,213,178,0.06)] px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#9fd5b2]">
                    {gamification.rank || "Beginner"}
                  </span>
                  <span className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1 text-xs font-semibold tracking-wide text-white/70">
                    {levelProgress.pointsToNextLevel || 0} PTS TO NEXT LEVEL
                  </span>
                </div>

                {/* Linear Threshold Status Indicators */}
                <div className="mt-6 w-full">
                  <div className="mb-2 flex justify-between text-[11px] font-bold uppercase tracking-wider text-white/40">
                    <span>Level {gamification.level || 1}</span>
                    <span>
                      {levelProgress.nextLevel ? `Level ${levelProgress.nextLevel}` : "Top Milestone"}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#9fd5b2] to-[#f6ed4a] transition-all duration-500 ease-out"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* RIGHT INTERIOR PANEL: ACHIEVEMENTS CASKS MODULE */}
          <div className="glass-card p-6 shadow-2xl relative overflow-hidden flex flex-col">
            <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[rgba(159,213,178,0.25)] to-transparent" />
            
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[rgba(159,213,178,0.1)] border border-[rgba(159,213,178,0.15)] text-[#9fd5b2] shrink-0">
                <FiAward className="w-4 h-4" />
              </span>
              <h2 className="text-lg font-heading font-black text-white tracking-tight">
                Achievements Unlocked
              </h2>
            </div>

            <div className="flex flex-wrap gap-2 w-full">
              {gamification.achievements?.length ? (
                gamification.achievements.map((achievement) => (
                  <span
                    key={achievement}
                    className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-xs font-medium text-white/80 tracking-wide"
                  >
                    {achievement}
                  </span>
                ))
              ) : (
                <p className="text-white/40 text-xs font-semibold uppercase tracking-wider py-2">
                  No specialized milestone parameters unlocked yet.
                </p>
              )}
            </div>
          </div>

        </div>

        {/* RECENT HISTORICAL ACTIVITY LOG SHEET STREAM */}
        <div className="glass-card p-6 shadow-2xl relative overflow-hidden flex flex-col w-full">
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[rgba(159,213,178,0.25)] to-transparent" />
          
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[rgba(159,213,178,0.1)] border border-[rgba(159,213,178,0.15)] text-[#9fd5b2] shrink-0">
              <FiTrendingUp className="w-4 h-4" />
            </span>
            <h2 className="text-lg font-heading font-black text-white tracking-tight">
              Recent Point Activities
            </h2>
          </div>

          <div className="space-y-3 w-full flex flex-col">
            {activities.length ? (
              activities.map((activity, index) => {
                const Icon = activityIcon[activity.type] || FiStar;

                return (
                  <div
                    key={`${activity.type}-${activity.createdAt}-${index}`}
                    className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.04] bg-white/[0.02] p-4 hover:border-[rgba(159,213,178,0.25)] transition-colors duration-200"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(7,25,42,0.6)] border border-white/[0.05] text-[#9fd5b2] shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-white text-sm sm:text-base tracking-tight truncate">
                          {activity.label}
                        </p>
                        <p className="text-xs font-medium text-white/40 mt-0.5">
                          {activity.createdAt ? new Date(activity.createdAt).toLocaleDateString() : ""}
                        </p>
                      </div>
                    </div>

                    <span className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-400 tracking-wide shrink-0">
                      +{activity.points} PTS
                    </span>
                  </div>
                );
              })
            ) : (
              <p className="text-white/40 text-xs font-semibold uppercase tracking-wider py-4 text-center">
                No verified operational activity allocations indexed.
              </p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default MyPoints;