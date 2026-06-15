import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Award, BookOpen, CheckCircle2, Clock, Layers, TrendingUp, Zap } from "lucide-react";
import api from "../../services/api";

const formatMinutes = (minutes = 0) => {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining ? `${hours}h ${remaining}m` : `${hours}h`;
};

function StatCard({ icon: Icon, label, value, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="rounded-2xl border border-border-default bg-bg-card p-5 flex items-center justify-between relative overflow-hidden group hover:border-brand-mint/15 transition-colors"
    >
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-1">{label}</p>
        <p className="text-xl sm:text-2xl font-heading font-extrabold text-white truncate">{value}</p>
      </div>
      <div className="h-11 w-11 rounded-xl bg-brand-mint/8 border border-brand-mint/15 flex items-center justify-center text-brand-mint shrink-0 ml-3 group-hover:bg-brand-mint/12 transition-colors">
        <Icon className="w-5 h-5" />
      </div>
    </motion.div>
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
      <div className="space-y-6">
        <div className="h-40 shimmer rounded-2xl" />
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => <div key={i} className="h-24 shimmer rounded-2xl" />)}
        </div>
        <div className="h-64 shimmer rounded-2xl" />
      </div>
    );
  }

  const summary = data?.summary || {};
  const courses = data?.courses || [];
  const completion = summary.overallCompletionPercent || 0;

  return (
    <div className="space-y-6 sm:space-y-8">

      {/* ── Hero Header ── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-2xl bg-bg-card border border-border-default"
      >
        <div className="gradient-line-top" />
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-brand-mint/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-lg bg-brand-mint/8 border border-brand-mint/15 px-3 py-1.5 text-xs font-semibold text-brand-mint uppercase tracking-wider">
              <TrendingUp className="w-3.5 h-3.5" />
              Analytics
            </div>
            <h1 className="font-heading font-extrabold text-3xl sm:text-4xl md:text-5xl text-white tracking-tight leading-none">
              Learning Progress
            </h1>
          </div>

          {/* Circular progress */}
          <div className="relative h-28 w-28 sm:h-32 sm:w-32 mx-auto sm:mx-0 shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
              <motion.circle
                cx="60" cy="60" r="52" fill="none" stroke="url(#progressGrad)" strokeWidth="8" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 52}`}
                initial={{ strokeDashoffset: 2 * Math.PI * 52 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 52 * (1 - completion / 100) }}
                transition={{ duration: 1.2, ease: "easeOut" }}
              />
              <defs>
                <linearGradient id="progressGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#9FD5B2" />
                  <stop offset="100%" stopColor="#F6ED4A" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl sm:text-3xl font-heading font-extrabold text-white">{completion}%</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mt-0.5">Overall</span>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ── Stats Grid ── */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={BookOpen} label="Total Courses" value={summary.totalCourses || 0} delay={0} />
        <StatCard icon={CheckCircle2} label="Completed" value={summary.completedCourses || 0} delay={0.05} />
        <StatCard icon={TrendingUp} label="Active" value={summary.activeCourses || 0} delay={0.1} />
        <StatCard icon={Clock} label="Watch Time" value={formatMinutes(summary.totalWatchMinutes || 0)} delay={0.15} />
        <StatCard icon={Layers} label="Total Classes" value={summary.totalClasses || 0} delay={0.2} />
        <StatCard icon={Award} label="Classes Done" value={summary.completedClasses || 0} delay={0.25} />
        <StatCard icon={Zap} label="Streak" value={`${summary.learningStreak || 0} days`} delay={0.3} />
        <StatCard icon={CheckCircle2} label="Completion" value={`${completion}%`} delay={0.35} />
      </div>

      {/* ── Course Progress List ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-2xl border border-border-default bg-bg-card p-6 relative overflow-hidden"
      >
        <div className="gradient-line-top" />

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg sm:text-xl font-heading font-bold text-white">Course Progress</h2>
          <span className="rounded-full border border-brand-mint/20 bg-brand-mint/8 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-mint">
            {summary.completedClasses || 0} / {summary.totalClasses || 0} Classes
          </span>
        </div>

        <div className="space-y-4 w-full">
          {courses.length ? (
            courses.map((course) => {
              const progress = course.learningProgress || {};
              const percent = progress.completionPercent || 0;
              return (
                <div key={course._id} className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-4 sm:p-5 hover:border-brand-mint/15 transition-colors">
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-semibold text-white text-base sm:text-lg tracking-tight truncate">{course.name}</p>
                      <p className="mt-1 text-xs font-medium text-text-muted">{progress.completedClasses || 0} of {progress.totalClasses || 0} classes</p>
                    </div>
                    <span className="text-sm font-bold text-brand-mint bg-brand-mint/8 px-2.5 py-0.5 rounded-lg border border-brand-mint/15 shrink-0">{percent}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percent}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      className="h-full rounded-full bg-gradient-to-r from-brand-mint to-brand-yellow"
                    />
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-text-muted text-sm font-medium py-4 text-center">No enrolled courses found.</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default MyLearning;