import { useEffect, useState, useContext } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Award,
  BookOpen,
  CheckCircle2,
  Copy,
  Edit3,
  ExternalLink,
  Share2,
  ShieldCheck,
  Star,
  TrendingUp,
  User,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import api from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import { useToast } from "../../components/ui/Toast";
import ShareProfileModal from "../../components/profile/ShareProfileModal";
import ProfileNav from "../../components/profile/ProfileNav";
import EmptyState from "../../components/ui/EmptyState";
import { getUploadUrl } from "../../utils/courseUi";

const ACHIEVEMENT_METADATA = {
  first_class: {
    title: "First Step",
    desc: "Completed first video lecture on Zeitnah.",
    icon: Star,
  },
  five_classes: {
    title: "Dedicated Learner",
    desc: "Successfully finished 5 video classes.",
    icon: CheckCircle2,
  },
  ten_classes: {
    title: "Knowledge Seeker",
    desc: "Completed 10 interactive classes.",
    icon: Award,
  },
  course_completed: {
    title: "Course Graduate",
    desc: "Fully completed an entire curriculum course.",
    icon: Award,
  },
  profile_100: {
    title: "Identity Master",
    desc: "Reached 100% profile completeness.",
    icon: Sparkles,
  },
};

export default function PublicProfilePage() {
  const { username: paramUsername } = useParams();
  const { user: authUser } = useContext(AuthContext);
  const toast = useToast();

  // If no paramUsername is present (i.e. accessed at /public-profile), use authUser.username
  const targetUsername = paramUsername || authUser?.username;

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [copiedHandle, setCopiedHandle] = useState(false);

  const isOwnProfile = Boolean(
    authUser &&
      student &&
      (authUser.username?.toLowerCase() === student.username?.toLowerCase() ||
        authUser.id === student.id ||
        authUser._id === student.id)
  );

  useEffect(() => {
    let mounted = true;

    const fetchPublicProfile = async () => {
      if (!targetUsername) {
        if (mounted) {
          setLoading(false);
          setNotFound(true);
        }
        return;
      }

      try {
        setLoading(true);
        setNotFound(false);
        const res = await api.get(`/profile/u/${encodeURIComponent(targetUsername)}`);
        if (mounted) {
          setStudent(res.data.user);
        }
      } catch {
        if (mounted) {
          setNotFound(true);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchPublicProfile();

    return () => {
      mounted = false;
    };
  }, [targetUsername]);

  const handleCopyHandle = () => {
    if (!student?.username) return;
    navigator.clipboard.writeText(`@${student.username}`);
    setCopiedHandle(true);
    toast.success("Handle copied", `@${student.username} copied to clipboard.`);
    setTimeout(() => setCopiedHandle(false), 2000);
  };

  const handleNativeShare = async () => {
    if (!student) return;
    const shareUrl = `${window.location.origin}/u/${encodeURIComponent(student.username)}`;
    const shareData = {
      title: `${student.name} — Zeitnah Student Profile`,
      text: `Check out ${student.name}'s verified student profile on Zeitnah Academy.`,
      url: shareUrl,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        if (err.name !== "AbortError") {
          setIsShareOpen(true);
        }
      }
    } else {
      setIsShareOpen(true);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 sm:space-y-8 max-w-5xl mx-auto py-8 px-4 animate-pulse">
        {authUser && <div className="h-14 bg-bg-card rounded-2xl border border-border-default" />}
        <div className="h-80 bg-bg-card rounded-3xl border border-border-default" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-44 bg-bg-card rounded-2xl border border-border-default" />
          <div className="h-44 bg-bg-card rounded-2xl border border-border-default" />
        </div>
      </div>
    );
  }

  if (notFound || !student) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 bg-bg-base text-white max-w-4xl mx-auto">
        <EmptyState
          icon={User}
          title="Student Profile Not Found"
          description={`The student handle @${targetUsername || "unknown"} could not be found on Zeitnah Academy.`}
          action={() => (window.location.href = "/courses")}
          actionLabel="Explore Courses"
        />
      </div>
    );
  }

  const gamification = student.gamification || {};
  const avatarUrl = getUploadUrl(student.avatar);
  const initials = student.name
    ? student.name
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "ZU";

  const achievements = gamification.achievements || [];

  return (
    <div className="min-h-screen bg-bg-base text-white relative overflow-hidden py-6 sm:py-10 px-4 sm:px-6">
      {/* Ambient brand glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[750px] h-[350px] bg-brand-mint/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8 relative z-10">
        {/* Render ProfileNav if authenticated owner or on /public-profile */}
        {authUser && isOwnProfile && <ProfileNav />}

        {/* ── Top Header Bar ── */}
        <header className="flex items-center justify-between pb-2">
          <Link to="/courses" className="flex items-center gap-3 group select-none">
            <div className="w-10 h-10 rounded-xl border border-brand-mint/30 overflow-hidden shadow-sm bg-bg-surface flex items-center justify-center">
              <img src="/zeitnah-logo.png" alt="Zeitnah Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <span className="text-sm font-heading font-extrabold tracking-wider uppercase text-white group-hover:text-brand-mint transition-colors">
                Zeitnah
              </span>
              <p className="text-[10px] font-medium text-text-muted">Verified Student Identity</p>
            </div>
          </Link>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleNativeShare}
              className="btn-secondary text-xs uppercase tracking-wider inline-flex items-center gap-1.5 py-2.5 px-4 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-brand-mint" />
              <span>Share</span>
            </button>

            {isOwnProfile ? (
              <Link
                to="/profile/edit"
                className="btn-primary text-xs uppercase tracking-wider inline-flex items-center gap-1.5 py-2.5 px-4 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </Link>
            ) : !authUser ? (
              <Link
                to="/login"
                className="btn-primary text-xs uppercase tracking-wider py-2.5 px-4"
              >
                Sign In
              </Link>
            ) : null}
          </div>
        </header>

        {/* ── Public Profile Hero ── */}
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="relative overflow-hidden rounded-3xl bg-bg-card border border-border-default p-6 sm:p-10 shadow-2xl"
        >
          <div className="gradient-line-top" />

          <div className="flex flex-col sm:flex-row gap-6 sm:gap-10 items-center sm:items-start text-center sm:text-left">
            {/* Large Avatar */}
            <div className="relative shrink-0">
              <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-3xl overflow-hidden border-2 border-brand-mint/30 bg-bg-elevated ring-4 ring-brand-mint/5 shadow-2xl flex items-center justify-center">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={student.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-brand-mint/20 to-brand-navy/60 text-brand-mint font-heading font-black text-3xl">
                    {initials}
                  </div>
                )}
              </div>
            </div>

            {/* Core Identity Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 mb-1.5">
                <h1 className="font-heading font-black text-2xl sm:text-3xl lg:text-4xl text-white tracking-tight leading-none">
                  {student.name || "Zeitnah Student"}
                </h1>
                {student.isVerified && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-brand-mint/25 bg-brand-mint/10 px-2.5 py-0.5 text-xs font-bold text-brand-mint">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verified Student
                  </span>
                )}
              </div>

              {/* Username Handle with Copy Button */}
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-4">
                <span className="font-mono text-base font-bold text-brand-mint tracking-tight">
                  @{student.username}
                </span>
                <button
                  type="button"
                  onClick={handleCopyHandle}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-text-muted hover:text-brand-mint transition-colors px-2 py-0.5 rounded-md hover:bg-white/[0.04] cursor-pointer"
                  title="Copy student handle"
                >
                  <Copy className="w-3 h-3" />
                  <span className="hidden sm:inline">{copiedHandle ? "Copied" : "Copy"}</span>
                </button>
              </div>

              {/* Badges: Role, Level, Rank */}
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start mb-6">
                <span className="rounded-lg border border-brand-mint/20 bg-brand-mint/8 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-mint">
                  {student.role || "Student"}
                </span>
                <span className="rounded-lg border border-brand-yellow/15 bg-brand-yellow/5 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-yellow">
                  Level {gamification.level || 1}
                </span>
                <span className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-xs font-bold uppercase tracking-wider text-text-secondary font-mono">
                  {gamification.rank || "Beginner"}
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="btn-secondary text-xs uppercase tracking-wider inline-flex items-center gap-2 py-2.5 px-4 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5 text-brand-mint" />
                  Share Profile
                </button>

                {isOwnProfile && (
                  <Link
                    to="/profile/edit"
                    className="btn-primary text-xs uppercase tracking-wider inline-flex items-center gap-2 py-2.5 px-4 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit Personal Info
                  </Link>
                )}
              </div>
            </div>
          </div>
        </motion.section>

        {/* ── About & Skills Two-Column Layout ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* ABOUT SECTION */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-border-default bg-bg-card p-6 sm:p-7 relative overflow-hidden shadow-sm"
          >
            <div className="gradient-line-top" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-brand-mint mb-3 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              About
            </h2>

            {student.bio ? (
              <p className="text-sm font-medium text-text-secondary leading-relaxed">
                {student.bio}
              </p>
            ) : (
              <p className="text-xs text-text-muted italic py-2">
                No public bio added yet.
              </p>
            )}
          </motion.div>

          {/* SKILLS SECTION */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-2xl border border-border-default bg-bg-card p-6 sm:p-7 relative overflow-hidden shadow-sm"
          >
            <div className="gradient-line-top" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-brand-mint mb-3 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Skills & Specialties
            </h2>

            {student.skills?.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {student.skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-white tracking-wide"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-text-muted italic py-2">
                Skills will appear here when added.
              </p>
            )}
          </motion.div>
        </div>

        {/* ── Personal Gamification Telemetry (STRICTLY NO LEADERBOARD) ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-border-default bg-bg-card p-6 sm:p-7 relative overflow-hidden shadow-sm"
        >
          <div className="gradient-line-top" />
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-heading font-bold text-white tracking-tight">
                Learning Milestones
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Verified achievements and progress points on Zeitnah Academy
              </p>
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-brand-mint font-mono px-3 py-1 rounded-lg bg-brand-mint/10 border border-brand-mint/20">
              {gamification.rank || "Beginner"}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <div className="flex items-center gap-2 mb-2 text-brand-yellow">
                <Star className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Total XP</span>
              </div>
              <p className="text-2xl sm:text-3xl font-heading font-black text-white font-mono">
                {(gamification.totalPoints || 0).toLocaleString()}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <div className="flex items-center gap-2 mb-2 text-brand-mint">
                <TrendingUp className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Tier Level</span>
              </div>
              <p className="text-2xl sm:text-3xl font-heading font-black text-white font-mono">
                Level {gamification.level || 1}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <div className="flex items-center gap-2 mb-2 text-brand-mint">
                <BookOpen className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Watched</span>
              </div>
              <p className="text-2xl sm:text-3xl font-heading font-black text-white font-mono">
                {gamification.watchedClasses || 0}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <div className="flex items-center gap-2 mb-2 text-brand-mint">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Completed</span>
              </div>
              <p className="text-2xl sm:text-3xl font-heading font-black text-white font-mono">
                {gamification.completedClasses || 0}
              </p>
            </div>
          </div>
        </motion.div>

        {/* ── Unlocked Achievements ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="rounded-2xl border border-border-default bg-bg-card p-6 sm:p-7 relative overflow-hidden shadow-sm"
        >
          <div className="gradient-line-top" />
          <h2 className="text-lg sm:text-xl font-heading font-bold text-white tracking-tight mb-1">
            Platform Achievements
          </h2>
          <p className="text-xs text-text-muted mb-5">
            Milestone achievements earned through course lectures and progress
          </p>

          {achievements.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border-default bg-white/[0.01] p-8 text-center">
              <Award className="w-8 h-8 text-text-muted mx-auto mb-2" />
              <p className="text-xs text-text-muted">No achievements unlocked yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {achievements.map((key, i) => {
                const meta = ACHIEVEMENT_METADATA[key] || {
                  title: String(key)
                    .replaceAll("_", " ")
                    .replace(/\b\w/g, (l) => l.toUpperCase()),
                  desc: "Platform achievement unlocked.",
                  icon: Award,
                };
                const Icon = meta.icon;

                return (
                  <div
                    key={key}
                    className="rounded-xl border border-brand-mint/20 bg-white/[0.02] p-4 flex items-start gap-3"
                  >
                    <div className="w-10 h-10 rounded-xl bg-brand-mint/10 border border-brand-mint/20 flex items-center justify-center text-brand-mint shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-heading font-bold text-white truncate">
                        {meta.title}
                      </p>
                      <p className="text-xs text-text-muted leading-relaxed line-clamp-2 mt-0.5">
                        {meta.desc}
                      </p>
                      <span className="inline-block mt-2 text-[10px] font-bold uppercase tracking-wider text-brand-mint font-mono">
                        Unlocked
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      {/* Share Modal */}
      <ShareProfileModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        username={student.username}
        name={student.name}
      />
    </div>
  );
}
