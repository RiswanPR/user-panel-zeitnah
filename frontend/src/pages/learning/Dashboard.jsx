import { useContext } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  Clock,
  Flame,
  Sparkles,
  Star,
  TrendingUp,
  ArrowRight,
  Users,
  MessageCircle,
  BookOpen,
} from "lucide-react";
import { useApi } from "../../hooks/useApi";
import { AuthContext } from "../../context/AuthContext";
import { Skeleton, SkeletonCard } from "../../components/ui/Skeleton";
import ErrorState from "../../components/ui/ErrorState";
import EmptyState from "../../components/ui/EmptyState";

const formatMinutes = (minutes = 0) => {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining ? `${hours}h ${remaining}m` : `${hours}h`;
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

function Dashboard() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { data, loading, error, refetch } = useApi("/courses/my-learning", {
    cacheTTL: 60000,
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 rounded-2xl" />
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorState onRetry={refetch} />;
  }

  const summary = data?.summary || {};
  const courses = data?.courses || [];
  const activeCourses = courses.filter(
    (c) => c.learningProgress && c.learningProgress.completionPercent < 100
  );
  const firstName = user?.name?.split(" ")[0] || "Learner";

  const stats = [
    { icon: BookOpen, label: "Courses", value: summary.totalCourses || 0 },
    { icon: CheckCircle2, label: "Completed", value: summary.completedCourses || 0 },
    { icon: Clock, label: "Watch Time", value: formatMinutes(summary.totalWatchMinutes || 0) },
    { icon: Flame, label: "Streak", value: `${summary.learningStreak || 0}d` },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">

      {/* ── Greeting Hero ── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-2xl bg-bg-card border border-border-default"
      >
        <div className="gradient-line-top" />
        <div className="absolute top-0 right-0 w-[400px] h-[300px] bg-brand-mint/4 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[200px] bg-brand-yellow/3 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative p-6 sm:p-8 lg:p-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-lg bg-brand-mint/8 border border-brand-mint/15 px-3 py-1.5 text-xs font-semibold text-brand-mint uppercase tracking-wider mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                {getGreeting()}
              </div>
              <h1 className="font-heading font-extrabold text-3xl sm:text-4xl lg:text-5xl text-white tracking-tight leading-none">
                Welcome back, <span className="text-gradient">{firstName}</span>
              </h1>
              <p className="text-sm font-medium text-text-muted mt-3 max-w-lg leading-relaxed">
                {activeCourses.length > 0
                  ? `You have ${activeCourses.length} course${activeCourses.length !== 1 ? "s" : ""} in progress. Keep up the momentum!`
                  : "Explore courses and start your learning journey today."}
              </p>
            </div>

            {/* Completion circle */}
            <div className="relative h-24 w-24 sm:h-28 sm:w-28 mx-auto sm:mx-0 shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                <motion.circle
                  cx="60" cy="60" r="52" fill="none" stroke="url(#dashGrad)" strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 52}`}
                  initial={{ strokeDashoffset: 2 * Math.PI * 52 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 52 * (1 - (summary.overallCompletionPercent || 0) / 100) }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                />
                <defs>
                  <linearGradient id="dashGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#9FD5B2" />
                    <stop offset="100%" stopColor="#F6ED4A" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl sm:text-2xl font-heading font-extrabold text-white">
                  {summary.overallCompletionPercent || 0}%
                </span>
                <span className="text-[9px] font-semibold uppercase tracking-wider text-text-muted">Overall</span>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ── Stats Grid ── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            className="rounded-2xl border border-border-default bg-bg-card p-5 flex items-center justify-between group hover:border-brand-mint/15 transition-colors relative overflow-hidden"
          >
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">{stat.label}</p>
              <p className="text-xl sm:text-2xl font-heading font-extrabold text-white truncate">{stat.value}</p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-brand-mint/8 border border-brand-mint/15 flex items-center justify-center text-brand-mint shrink-0 ml-3 group-hover:bg-brand-mint/12 transition-colors">
              <stat.icon className="w-5 h-5" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Continue Learning ── */}
      {activeCourses.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-heading font-bold text-white">Continue Learning</h2>
            <button
              type="button"
              onClick={() => navigate("/courses")}
              className="text-xs font-semibold text-brand-mint hover:text-white transition-colors inline-flex items-center gap-1 cursor-pointer"
            >
              View All
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {activeCourses.slice(0, 3).map((course, i) => {
              const progress = course.learningProgress;
              const percent = progress?.completionPercent || 0;
              return (
                <motion.button
                  key={course._id}
                  type="button"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 + i * 0.06 }}
                  onClick={() => navigate(`/courses/${course._id}/chapters`)}
                  className="group text-left rounded-2xl border border-border-default bg-bg-card p-5 hover:border-brand-mint/20 transition-all duration-300 hover:-translate-y-0.5 cursor-pointer relative overflow-hidden w-full"
                >
                  <div className="gradient-line-top" />
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">Course</p>
                      <h3 className="font-semibold text-white text-base tracking-tight line-clamp-2 group-hover:text-brand-mint transition-colors">
                        {course.name}
                      </h3>
                    </div>
                    <span className="text-sm font-bold text-brand-mint bg-brand-mint/8 px-2.5 py-0.5 rounded-lg border border-brand-mint/15 shrink-0">
                      {percent}%
                    </span>
                  </div>
                  <p className="text-xs font-medium text-text-muted mb-3">
                    {progress?.completedClasses || 0} of {progress?.totalClasses || 0} classes
                  </p>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percent}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className="h-full rounded-full bg-gradient-to-r from-brand-mint to-brand-yellow"
                    />
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.section>
      )}

      {/* ── Quick Actions ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="grid gap-4 grid-cols-1 sm:grid-cols-3"
      >
        {[
          { label: "Browse Courses", desc: "Explore all available courses", icon: BookOpen, path: "/courses" },
          { label: "View Progress", desc: "Track your learning analytics", icon: TrendingUp, path: "/my-learning" },
          { label: "My Profile", desc: "Settings & achievements", icon: Star, path: "/profile" },
        ].map((action) => (
          <button
            key={action.path}
            type="button"
            onClick={() => navigate(action.path)}
            className="group rounded-2xl border border-border-default bg-bg-card p-5 flex items-center gap-4 hover:border-brand-mint/20 transition-all duration-200 w-full text-left cursor-pointer"
          >
            <div className="h-11 w-11 rounded-xl bg-brand-mint/8 border border-brand-mint/15 flex items-center justify-center text-brand-mint shrink-0 group-hover:bg-brand-mint/12 transition-colors">
              <action.icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white group-hover:text-brand-mint transition-colors truncate">{action.label}</p>
              <p className="text-xs font-medium text-text-muted mt-0.5">{action.desc}</p>
            </div>
          </button>
        ))}
      </motion.div>

      {/* ── Community Activity Widget ── */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mt-8"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg sm:text-xl font-heading font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-mint" />
            Community Activity
          </h2>
          <button
            type="button"
            onClick={() => navigate("/community")}
            className="text-xs font-semibold text-brand-mint hover:text-white transition-colors inline-flex items-center gap-1 cursor-pointer"
          >
            Enter Community
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          {/* Latest Discussions */}
          <div className="rounded-2xl border border-border-default bg-bg-card p-5 hover:border-brand-mint/15 transition-colors">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-4 flex items-center gap-2">
              <MessageCircle className="w-3.5 h-3.5" /> Latest Discussions
            </h3>
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="flex gap-3 cursor-pointer group">
                  <div className="w-8 h-8 rounded-full bg-brand-mint/20 shrink-0 overflow-hidden mt-0.5 border border-brand-mint/30">
                    <img src={`https://i.pravatar.cc/150?img=${i+10}`} alt="Avatar" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary group-hover:text-white transition-colors line-clamp-2">
                      Does anyone have resources for Advanced System Design patterns?
                    </p>
                    <p className="text-[10px] text-text-muted mt-1 font-medium">Alex Developer • 2h ago</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Trending Stories */}
          <div className="rounded-2xl border border-border-default bg-bg-card p-5 hover:border-brand-mint/15 transition-colors">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-4 flex items-center gap-2">
              <Flame className="w-3.5 h-3.5" /> Trending Stories
            </h3>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group">
                  <div className="w-14 h-14 rounded-full p-[2px] bg-gradient-to-tr from-brand-yellow to-brand-mint group-hover:scale-105 transition-transform">
                    <div className="w-full h-full rounded-full bg-bg-card border-2 border-bg-base overflow-hidden">
                      <img src={`https://i.pravatar.cc/150?img=${i+20}`} alt="Avatar" className="w-full h-full object-cover" />
                    </div>
                  </div>
                  <span className="text-[9px] font-semibold text-text-muted group-hover:text-white transition-colors truncate w-14 text-center">Mentor {i}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.section>

      {/* ── Empty state if no courses ── */}
      {courses.length === 0 && (
        <EmptyState
          icon={BookOpen}
          title="No courses yet"
          description="Start your learning journey by exploring our available courses."
          action={() => navigate("/courses")}
          actionLabel="Browse Courses"
        />
      )}
    </div>
  );
}

export default Dashboard;
