import { useEffect, useState } from "react";
import {
  FiAward,
  FiBookOpen,
  FiCheckCircle,
  FiClock,
  FiLayers,
  FiTrendingUp,
  FiZap,
} from "react-icons/fi";
import api from "../../services/api";

const formatMinutes = (minutes = 0) => {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;

  return remaining ? `${hours}h ${remaining}m` : `${hours}h`;
};

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.04] p-5 shadow-2xl shadow-black/30 backdrop-blur-xl">
      <div
        className={`mb-5 flex h-11 w-11 items-center justify-center rounded-2xl ${accent}`}
      >
        <Icon className="text-lg text-white" />
      </div>
      <p className="text-sm text-white/45">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function MyLearning() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get("/courses/my-learning");
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

  const summary = data?.summary || {};
  const courses = data?.courses || [];
  const completion = summary.overallCompletionPercent || 0;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#080808] px-4 py-10">
      <div className="absolute left-[-120px] top-[-140px] h-[430px] w-[430px] rounded-full bg-cyan-500/10 blur-[120px]" />
      <div className="absolute right-[-120px] top-[180px] h-[360px] w-[360px] rounded-full bg-emerald-500/10 blur-[120px]" />
      <div className="absolute bottom-[-120px] left-[30%] h-[340px] w-[340px] rounded-full bg-rose-500/10 blur-[120px]" />

      <div className="relative z-10 mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/70">
              My Learning
            </p>
            <h1 className="mt-4 font-['Sora'] text-4xl font-semibold text-white sm:text-5xl">
              Progress Dashboard
            </h1>
          </div>

          <div className="relative h-36 w-36">
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: `conic-gradient(#22d3ee ${completion}%, rgba(255,255,255,0.08) 0)`,
              }}
            />
            <div className="absolute inset-3 flex flex-col items-center justify-center rounded-full bg-[#111111]">
              <span className="text-3xl font-semibold text-white">
                {completion}%
              </span>
              <span className="text-xs text-white/40">Overall</span>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={FiBookOpen}
            label="Total Courses"
            value={summary.totalCourses || 0}
            accent="bg-cyan-500/20"
          />
          <StatCard
            icon={FiCheckCircle}
            label="Completed Courses"
            value={summary.completedCourses || 0}
            accent="bg-emerald-500/20"
          />
          <StatCard
            icon={FiTrendingUp}
            label="Active Courses"
            value={summary.activeCourses || 0}
            accent="bg-amber-500/20"
          />
          <StatCard
            icon={FiClock}
            label="Total Watch Time"
            value={formatMinutes(summary.totalWatchMinutes || 0)}
            accent="bg-rose-500/20"
          />
          <StatCard
            icon={FiLayers}
            label="Total Classes"
            value={summary.totalClasses || 0}
            accent="bg-sky-500/20"
          />
          <StatCard
            icon={FiAward}
            label="Completed Classes"
            value={summary.completedClasses || 0}
            accent="bg-violet-500/20"
          />
          <StatCard
            icon={FiZap}
            label="Learning Streak"
            value={`${summary.learningStreak || 0} days`}
            accent="bg-orange-500/20"
          />
          <StatCard
            icon={FiCheckCircle}
            label="Overall Completion"
            value={`${completion}%`}
            accent="bg-teal-500/20"
          />
        </div>

        <div className="mt-8 rounded-[30px] border border-white/[0.08] bg-[#111111]/90 p-6 backdrop-blur-xl">
          <div className="mb-6 flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold text-white">
              Course Progress
            </h2>
            <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-sm text-white/50">
              {summary.completedClasses || 0}/{summary.totalClasses || 0} classes
            </span>
          </div>

          <div className="space-y-4">
            {courses.length ? (
              courses.map((course) => {
                const progress = course.learningProgress || {};
                const percent = progress.completionPercent || 0;

                return (
                  <div
                    key={course._id}
                    className="rounded-[24px] border border-white/[0.07] bg-white/[0.03] p-4"
                  >
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-white">{course.name}</p>
                        <p className="mt-1 text-sm text-white/40">
                          {progress.completedClasses || 0}/
                          {progress.totalClasses || 0} classes complete
                        </p>
                      </div>
                      <span className="text-sm font-medium text-cyan-200">
                        {percent}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-emerald-300 to-amber-300 transition-all duration-700"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-white/40">No enrolled courses yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default MyLearning;
