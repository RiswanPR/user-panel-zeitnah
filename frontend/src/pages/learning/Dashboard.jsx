import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PlayCircle, Award, Clock, Trophy, Flame, TrendingUp, CheckCircle, Search } from 'lucide-react';
import api from '../../services/api';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await api.get('/courses/my-learning');
        setData(res.data);
      } catch (err) {
        console.error("Failed to load dashboard", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-mint"></div>
      </div>
    );
  }

  if (!data) return <div className="text-center text-text-muted">Unable to load dashboard.</div>;

  const { summary, courses, gamification } = data;

  return (
    <div className="max-w-6xl mx-auto space-y-10 py-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-white">My Learning</h1>
          <p className="text-text-muted mt-2">Track your progress, achievements, and courses.</p>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: <PlayCircle />, label: 'Active Courses', value: summary.activeCourses, color: 'text-brand-mint' },
          { icon: <Clock />, label: 'Watch Hours', value: Math.round(summary.totalWatchMinutes / 60), color: 'text-info' },
          { icon: <Flame />, label: 'Day Streak', value: summary.learningStreak, color: 'text-warning' },
          { icon: <Trophy />, label: 'Total Points', value: gamification?.totalPoints || 0, color: 'text-brand-yellow' }
        ].map((stat, i) => (
          <div key={i} className="bg-bg-card border border-white/10 rounded-2xl p-5 flex flex-col hover:border-white/20 transition-colors cursor-default group">
            <div className={`p-3 bg-white/5 rounded-xl w-12 h-12 flex items-center justify-center mb-4 ${stat.color} group-hover:scale-110 transition-transform`}>
              {stat.icon}
            </div>
            <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
            <div className="text-xs font-semibold text-text-muted uppercase tracking-wider">{stat.label}</div>
          </div>
        ))}
      </motion.div>

      {/* In Progress Courses */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Continue Learning</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.filter(c => !c.learningProgress?.certificateEligible).map(course => (
            <div key={course._id} className="bg-bg-card border border-white/10 rounded-2xl overflow-hidden hover:border-brand-mint/30 transition-all hover:-translate-y-1">
              <div className="aspect-video relative">
                <link rel="preload" as="image" href={course.coverImage} fetchPriority="high" />
                <img src={course.coverImage} alt={course.name} fetchPriority="high" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3">
                  <div className="text-sm font-bold text-white line-clamp-1">{course.name}</div>
                  <div className="text-xs text-brand-mint mt-1">{course.learningProgress?.completionPercent}% Completed</div>
                </div>
              </div>
              <div className="p-4">
                <div className="w-full bg-white/10 rounded-full h-1.5 mb-4">
                  <div className="bg-brand-mint h-1.5 rounded-full" style={{ width: `${course.learningProgress?.completionPercent || 0}%` }} />
                </div>
                <a href={`/courses/${course._id}`} className="block w-full text-center py-2 bg-brand-mint/10 text-brand-mint font-semibold rounded-xl hover:bg-brand-mint hover:text-black transition-colors">
                  Resume Course
                </a>
              </div>
            </div>
          ))}
          {courses.filter(c => !c.learningProgress?.certificateEligible).length === 0 && (
            <div className="col-span-full py-12 text-center text-text-muted border border-dashed border-white/20 rounded-2xl">
              <Search className="w-8 h-8 mx-auto mb-3 opacity-50" />
              <p>You don't have any active courses.</p>
            </div>
          )}
        </div>
      </div>

      {/* Completed Courses & Certificates */}
      <div>
        <h2 className="text-xl font-bold text-white mb-6">Completed Courses</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.filter(c => c.learningProgress?.certificateEligible).map(course => (
            <div key={course._id} className="bg-bg-card border border-success/20 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0">
                <img src={course.coverImage} alt={course.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-white text-sm line-clamp-1">{course.name}</h3>
                <div className="flex items-center gap-1.5 text-success text-xs mt-1.5 font-medium">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Completed
                </div>
              </div>
              <button className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider border border-white/20 rounded-lg hover:bg-white hover:text-black transition-colors shrink-0">
                Certificate
              </button>
            </div>
          ))}
          {courses.filter(c => c.learningProgress?.certificateEligible).length === 0 && (
            <div className="col-span-full py-8 text-center text-text-muted text-sm border border-dashed border-white/10 rounded-2xl">
              No completed courses yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
