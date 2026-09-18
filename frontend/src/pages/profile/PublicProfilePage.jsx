import { useEffect, useState, useContext } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Award,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  Share2,
  Star,
  TrendingUp,
  User,
  ArrowLeft,
  Users,
} from "lucide-react";
import api from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import ShareProfileModal from "../../components/profile/ShareProfileModal";

export default function PublicProfilePage() {
  const { username } = useParams();
  const { user: authUser } = useContext(AuthContext);

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    const fetchPublicProfile = async () => {
      try {
        setLoading(true);
        setNotFound(false);
        const res = await api.get(`/profile/u/${encodeURIComponent(username)}`);
        if (mounted) {
          setStudent(res.data.user);
        }
      } catch (err) {
        if (mounted) {
          setNotFound(true);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    if (username) {
      fetchPublicProfile();
    }

    return () => {
      mounted = false;
    };
  }, [username]);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-base text-white p-6 flex items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="w-16 h-16 rounded-2xl shimmer mx-auto" />
          <div className="w-48 h-6 shimmer mx-auto rounded-xl" />
          <div className="w-32 h-4 shimmer mx-auto rounded-lg" />
        </div>
      </div>
    );
  }

  if (notFound || !student) {
    return (
      <div className="min-h-screen bg-bg-base text-white flex items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-danger/10 border border-danger/20 text-danger flex items-center justify-center mx-auto text-2xl font-bold">
            !
          </div>
          <div>
            <h1 className="text-2xl font-heading font-extrabold text-white">
              Student Profile Not Found
            </h1>
            <p className="text-sm text-text-muted mt-2">
              The handle <span className="font-mono text-brand-mint">@{username}</span> does not belong to any active student on Zeitnah Academy.
            </p>
          </div>
          <Link
            to="/courses"
            className="inline-flex items-center gap-2 btn-secondary text-xs uppercase tracking-wider"
          >
            <ArrowLeft className="w-4 h-4" />
            Explore Courses
          </Link>
        </div>
      </div>
    );
  }

  const gamification = student.gamification || {};

  return (
    <div className="min-h-screen bg-bg-base text-white relative overflow-hidden py-10 px-4 sm:px-6">
      {/* Ambient background glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-brand-mint/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-4xl mx-auto space-y-8 relative z-10">
        {/* Top Navbar / Branding */}
        <header className="flex items-center justify-between">
          <Link to="/courses" className="flex items-center gap-3 group select-none">
            <div className="w-9 h-9 rounded-xl border border-brand-mint/30 overflow-hidden shadow-sm bg-bg-surface flex items-center justify-center">
              <img src="/zeitnah-logo.png" alt="Zeitnah Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <span className="text-sm font-heading font-extrabold tracking-wider uppercase text-white group-hover:text-brand-mint transition-colors">
                Zeitnah
              </span>
              <p className="text-[9px] font-medium text-text-muted">Student Showcase</p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsShareOpen(true)}
              className="btn-secondary text-xs uppercase tracking-wider flex items-center gap-1.5 py-2 px-3.5"
            >
              <Share2 className="w-3.5 h-3.5 text-brand-mint" />
              <span>Share</span>
            </button>

            {authUser ? (
              <Link
                to={`/community/profile/${student.username}`}
                className="btn-primary text-xs uppercase tracking-wider flex items-center gap-1.5 py-2 px-3.5"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Community Profile</span>
              </Link>
            ) : (
              <Link
                to="/login"
                className="btn-primary text-xs uppercase tracking-wider py-2 px-3.5"
              >
                Sign In
              </Link>
            )}
          </div>
        </header>

        {/* Profile Hero Card */}
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden rounded-3xl bg-bg-card border border-border-default p-6 sm:p-10 shadow-2xl"
        >
          <div className="gradient-line-top" />

          <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 items-center sm:items-start text-center sm:text-left">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl overflow-hidden border-2 border-brand-mint/30 bg-bg-elevated ring-4 ring-brand-mint/5 shadow-xl">
                {student.avatar ? (
                  <img src={student.avatar} alt={student.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-brand-mint">
                    <User className="w-12 h-12" />
                  </div>
                )}
              </div>
            </div>

            {/* Core Identity Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1.5">
                <h1 className="font-heading font-black text-2xl sm:text-3xl text-white tracking-tight">
                  {student.name || "Zeitnah Student"}
                </h1>
                {student.isVerified && (
                  <CheckCircle2 className="w-5 h-5 text-brand-mint shrink-0" title="Verified Student" />
                )}
              </div>

              {/* Username Handle */}
              <div className="mb-3">
                <span className="font-mono text-sm sm:text-base font-semibold text-brand-mint tracking-tight">
                  @{student.username}
                </span>
              </div>

              <p className="text-sm text-text-muted max-w-xl mb-5 leading-relaxed">
                {student.bio || "Student at Zeitnah Academy pursuing mastery in engineering and design."}
              </p>

              {/* Badges & Role */}
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                <span className="rounded-lg border border-brand-mint/20 bg-brand-mint/8 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-mint">
                  {student.role || "Student"}
                </span>
                <span className="rounded-lg border border-brand-yellow/15 bg-brand-yellow/5 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-yellow">
                  Level {gamification.level || 1}
                </span>
                <span className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1 text-xs font-semibold text-text-muted">
                  {gamification.rank || "Learner"}
                </span>
                <span className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1 text-xs font-semibold text-text-muted">
                  {gamification.totalPoints || 0} XP
                </span>
              </div>
            </div>
          </div>

          {/* Skills Section */}
          {student.skills?.length > 0 && (
            <div className="mt-8 pt-6 border-t border-border-subtle">
              <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-3">
                Endorsed Skills & Topics
              </p>
              <div className="flex flex-wrap gap-1.5">
                {student.skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-xs font-medium text-text-secondary"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </motion.section>

        {/* Gamification Telemetry Grid */}
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { icon: Star, label: "Total Points", value: gamification.totalPoints || 0 },
            { icon: Award, label: "Tier Rank", value: gamification.rank || "Learner" },
            { icon: TrendingUp, label: "Level", value: gamification.level || 1 },
            { icon: BookOpen, label: "Completed", value: gamification.completedClasses || 0 },
            { icon: CheckCircle2, label: "Courses", value: gamification.completedCourses || 0 },
            { icon: Award, label: "Badges", value: gamification.achievements?.length || 0 },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.04 }}
              className="rounded-2xl border border-border-default bg-bg-card p-4 text-center shadow-sm"
            >
              <stat.icon className="w-4 h-4 text-brand-mint mx-auto mb-2" />
              <p className="text-[9px] font-semibold uppercase tracking-wider text-text-muted mb-0.5">
                {stat.label}
              </p>
              <p className="text-lg font-heading font-extrabold text-white truncate">
                {stat.value}
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      <ShareProfileModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        username={student.username}
        name={student.name}
      />
    </div>
  );
}
