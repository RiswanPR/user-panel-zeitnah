import { useEffect, useState } from "react";
import {
  FiAward,
  FiBookOpen,
  FiCheckCircle,
  FiClock,
  FiLayers,
  FiTrendingUp,
  FiZap,
  FiChevronRight,
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

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="glass-card p-5 shadow-xl flex items-center justify-between relative overflow-hidden">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-1">
          {label}
        </p>
        <p className="text-xl sm:text-2xl font-heading font-black text-white truncate">
          {value}
        </p>
      </div>
      <div className="h-11 w-11 rounded-xl bg-[rgba(159,213,178,0.06)] border border-[rgba(159,213,178,0.15)] flex items-center justify-center text-[#9fd5b2] shrink-0 ml-3">
        <Icon className="text-lg" />
      </div>
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

  const summary = data?.summary || {};
  const courses = data?.courses || [];
  const completion = summary.overallCompletionPercent || 0;

  return (
    <div className="min-h-screen bg-[#07192a] relative overflow-hidden px-4 py-6 sm:py-10 font-body text-white antialiased selection:bg-[#f6ed4a] selection:text-[#07192a]">
      
      {/* Subtle Background Glow Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[400px] h-[400px] bg-[#9fd5b2] opacity-5 rounded-full blur-[100px]" />
        <div className="absolute bottom-[10%] right-[-10%] w-[450px] h-[450px] bg-[#f6ed4a] opacity-5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl space-y-6 sm:space-y-8">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between glass-card p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[rgba(159,213,178,0.25)] to-transparent" />
          
          <div className="space-y-1.5 text-center sm:text-left">
            <p className="text-xs font-bold uppercase tracking-widest text-[#9fd5b2]">
              Academics & Analytics
            </p>
            <h1 className="font-heading font-black text-3xl sm:text-4xl md:text-5xl text-white tracking-tight leading-none">
              Progress Dashboard
            </h1>
          </div>

          {/* Radial Circular Progress Indicator */}
          <div className="relative h-28 w-28 sm:h-32 sm:w-32 mx-auto sm:mx-0 shrink-0">
            <div
              className="absolute inset-0 rounded-full shadow-inner"
              style={{
                background: `conic-gradient(#9fd5b2 ${completion}%, rgba(255,255,255,0.05) 0)`,
              }}
            />
            <div className="absolute inset-2.5 flex flex-col items-center justify-center rounded-full bg-[#0d2035]">
              <span className="text-2xl sm:text-3xl font-heading font-black text-white leading-none">
                {completion}%
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 mt-1">Overall</span>
            </div>
          </div>
        </div>

        {/* METRICS PARAMETERS STATS GRID */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <StatCard
            icon={FiBookOpen}
            label="Total Courses"
            value={summary.totalCourses || 0}
          />
          <StatCard
            icon={FiCheckCircle}
            label="Completed Courses"
            value={summary.completedCourses || 0}
          />
          <StatCard
            icon={FiTrendingUp}
            label="Active Courses"
            value={summary.activeCourses || 0}
          />
          <StatCard
            icon={FiClock}
            label="Total Watch Time"
            value={formatMinutes(summary.totalWatchMinutes || 0)}
          />
          <StatCard
            icon={FiLayers}
            label="Total Classes"
            value={summary.totalClasses || 0}
          />
          <StatCard
            icon={FiAward}
            label="Completed Classes"
            value={summary.completedClasses || 0}
          />
          <StatCard
            icon={FiZap}
            label="Learning Streak"
            value={`${summary.learningStreak || 0} days`}
          />
          <StatCard
            icon={FiCheckCircle}
            label="Overall Completion"
            value={`${completion}%`}
          />
        </div>

        {/* INDIVIDUAL COURSE PROGRESS STREAM LIST */}
        <div className="glass-card p-6 shadow-2xl relative overflow-hidden flex flex-col">
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[rgba(159,213,178,0.25)] to-transparent" />
          
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg sm:text-xl font-heading font-black text-white tracking-tight">
              Course Progress
            </h2>
            <span className="rounded-full border border-[rgba(159,213,178,0.25)] bg-[rgba(159,213,178,0.08)] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#9fd5b2]">
              {summary.completedClasses || 0} / {summary.totalClasses || 0} Classes Complete
            </span>
          </div>

          <div className="space-y-4 w-full flex flex-col">
            {courses.length ? (
              courses.map((course) => {
                const progress = course.learningProgress || {};
                const percent = progress.completionPercent || 0;

                return (
                  <div
                    key={course._id}
                    className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-4 sm:p-5 hover:border-[rgba(159,213,178,0.3)] transition-colors duration-200"
                  >
                    <div className="mb-3.5 flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-bold text-white text-base sm:text-lg tracking-tight truncate">
                          {course.name}
                        </p>
                        <p className="mt-1 text-xs font-medium text-white/50">
                          {progress.completedClasses || 0} of {progress.totalClasses || 0} classes complete
                        </p>
                      </div>
                      <span className="text-sm font-bold tracking-wide text-[#9fd5b2] bg-[rgba(159,213,178,0.08)] px-2.5 py-0.5 rounded-md border border-[rgba(159,213,178,0.15)] shrink-0">
                        {percent}%
                      </span>
                    </div>
                    
                    {/* Linear Progress Bar */}
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#9fd5b2] to-[#f6ed4a] transition-all duration-500 ease-out"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-white/40 text-xs font-semibold uppercase tracking-wider py-4 text-center">
                No enrolled courses found in this workstation.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default MyLearning;