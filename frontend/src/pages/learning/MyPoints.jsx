import { useEffect, useState } from "react";
import {
  FiAward,
  FiCheckCircle,
  FiClock,
  FiStar,
  FiTarget,
  FiTrendingUp,
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
      <div className="flex min-h-screen items-center justify-center bg-[#080808] text-white">
        Loading...
      </div>
    );
  }

  const gamification = data?.gamification || {};
  const levelProgress = data?.levelProgress || {};
  const activities = data?.recentActivities || [];
  const progressPercent = levelProgress.progressPercent || 0;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#080808] px-4 py-10">
      <div className="absolute left-[-120px] top-[-140px] h-[430px] w-[430px] rounded-full bg-cyan-500/10 blur-[120px]" />
      <div className="absolute right-[-120px] top-[160px] h-[360px] w-[360px] rounded-full bg-amber-500/10 blur-[120px]" />
      <div className="absolute bottom-[-140px] left-[20%] h-[360px] w-[360px] rounded-full bg-emerald-500/10 blur-[120px]" />

      <div className="relative z-10 mx-auto max-w-7xl">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-200/70">
            My Points
          </p>
          <h1 className="mt-4 font-['Sora'] text-4xl font-semibold text-white sm:text-5xl">
            Level & Rewards
          </h1>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[34px] border border-white/[0.08] bg-white/[0.04] p-6 shadow-2xl shadow-black/40 backdrop-blur-xl">
            <div className="flex flex-col gap-8 md:flex-row md:items-center">
              <div className="relative h-44 w-44 shrink-0">
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: `conic-gradient(#f59e0b ${progressPercent}%, rgba(255,255,255,0.08) 0)`,
                  }}
                />
                <div className="absolute inset-4 flex flex-col items-center justify-center rounded-full bg-[#111111]">
                  <FiStar className="mb-2 text-2xl text-amber-300" />
                  <span className="text-4xl font-semibold text-white">
                    {gamification.level || 1}
                  </span>
                  <span className="text-xs text-white/40">Level</span>
                </div>
              </div>

              <div className="flex-1">
                <p className="text-sm text-white/45">Total Points</p>
                <p className="mt-2 text-5xl font-semibold text-white">
                  {gamification.totalPoints || 0}
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-200">
                    {gamification.rank || "Beginner"}
                  </span>
                  <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-200">
                    {levelProgress.pointsToNextLevel || 0} pts to next level
                  </span>
                </div>

                <div className="mt-6">
                  <div className="mb-2 flex justify-between text-sm text-white/45">
                    <span>Level {gamification.level || 1}</span>
                    <span>
                      {levelProgress.nextLevel
                        ? `Level ${levelProgress.nextLevel}`
                        : "Top level"}
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-white/[0.07]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-300 via-cyan-300 to-emerald-300 transition-all duration-700"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[34px] border border-white/[0.08] bg-[#111111]/90 p-6 backdrop-blur-xl">
            <div className="mb-5 flex items-center gap-3">
              <FiAward className="text-cyan-300" />
              <h2 className="text-xl font-semibold text-white">
                Achievements
              </h2>
            </div>

            <div className="flex flex-wrap gap-2">
              {gamification.achievements?.length ? (
                gamification.achievements.map((achievement) => (
                  <span
                    key={achievement}
                    className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70"
                  >
                    {achievement}
                  </span>
                ))
              ) : (
                <p className="text-white/40">No achievements unlocked yet.</p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-[30px] border border-white/[0.08] bg-[#111111]/90 p-6 backdrop-blur-xl">
          <div className="mb-6 flex items-center gap-3">
            <FiTrendingUp className="text-emerald-300" />
            <h2 className="text-xl font-semibold text-white">
              Recent Activities
            </h2>
          </div>

          <div className="space-y-3">
            {activities.length ? (
              activities.map((activity, index) => {
                const Icon = activityIcon[activity.type] || FiStar;

                return (
                  <div
                    key={`${activity.type}-${activity.createdAt}-${index}`}
                    className="flex items-center justify-between gap-4 rounded-[22px] border border-white/[0.07] bg-white/[0.03] p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.06]">
                        <Icon className="text-cyan-200" />
                      </div>
                      <div>
                        <p className="font-medium text-white">
                          {activity.label}
                        </p>
                        <p className="text-sm text-white/35">
                          {activity.createdAt
                            ? new Date(activity.createdAt).toLocaleDateString()
                            : ""}
                        </p>
                      </div>
                    </div>

                    <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-sm font-semibold text-emerald-200">
                      +{activity.points}
                    </span>
                  </div>
                );
              })
            ) : (
              <p className="text-white/40">No point activity yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default MyPoints;
