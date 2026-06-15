import { useContext, useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Award,
  BarChart3,
  BookOpen,
  Camera,
  CheckCircle2,
  Edit3,
  FileText,
  LogOut,
  Shield,
  Star,
  TrendingUp,
  User,
} from "lucide-react";
import api from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import { getUploadUrl } from "../../utils/courseUi";

function Profile() {
  const navigate = useNavigate();
  const { user, setUser, logout } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await api.get("/profile/me");
        setProfile(res.data.user);
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) return alert("Max 5 MB");
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("avatar", file);
      const res = await api.post("/profile/avatar", formData, { headers: { "Content-Type": "multipart/form-data" } });
      setProfile((prev) => ({ ...prev, avatar: res.data.avatar }));
      setUser((prev) => prev ? { ...prev, avatar: res.data.avatar } : prev);
    } catch (err) {
      alert(err.response?.data?.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-64 shimmer rounded-2xl" />
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => <div key={i} className="h-24 shimmer rounded-2xl" />)}
        </div>
      </div>
    );
  }

  const gamification = profile?.gamification || {};
  const avatarUrl = getUploadUrl(profile?.avatar);
  const quickLinks = [
    { path: "/my-learning", label: "My Learning", desc: "Progress & analytics", icon: BarChart3 },
    { path: "/my-points", label: "My Points", desc: "Level & rewards", icon: Star },
    { path: "/active-sessions", label: "Sessions", desc: "Active devices", icon: Shield },
    { path: "/audit-logs", label: "Audit Logs", desc: "Account activity", icon: FileText },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">

      {/* ── Profile Hero ── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-2xl bg-bg-card border border-border-default"
      >
        <div className="gradient-line-top" />

        {/* Ambient gradient */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-brand-mint/4 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative p-6 sm:p-10 flex flex-col md:flex-row gap-6 md:gap-10 items-center md:items-start w-full">

          {/* Avatar */}
          <div className="relative group shrink-0">
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border-2 border-brand-mint/25 bg-bg-elevated ring-4 ring-brand-mint/5">
              {avatarUrl ? (
                <img src={avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-brand-mint">
                  <User className="w-12 h-12" />
                </div>
              )}
            </div>

            {/* Upload overlay */}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              <Camera className="w-5 h-5 text-white" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </div>

          {/* Info */}
          <div className="flex-1 text-center md:text-left min-w-0 w-full">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-2">
              <h1 className="font-heading font-extrabold text-2xl sm:text-3xl lg:text-4xl text-white tracking-tight leading-none">
                {profile.name || "Zeitnah User"}
              </h1>
              {profile.isVerified && (
                <CheckCircle2 className="w-5 h-5 text-brand-mint shrink-0" />
              )}
            </div>

            <p className="text-sm font-medium text-text-muted mb-4 leading-relaxed max-w-xl">
              {profile.bio || "Complete your profile to personalize your learning experience."}
            </p>

            {/* Role & Level badges */}
            <div className="flex flex-wrap gap-2 justify-center md:justify-start mb-5">
              <span className="rounded-lg border border-brand-mint/20 bg-brand-mint/8 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-mint">
                {profile.role || "Student"}
              </span>
              <span className="rounded-lg border border-brand-yellow/15 bg-brand-yellow/5 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-yellow">
                Level {gamification.level || 1}
              </span>
              <span className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1 text-xs font-semibold text-text-muted">
                {gamification.totalPoints || 0} Points
              </span>
            </div>

            {/* Skills */}
            {profile.skills?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 justify-center md:justify-start">
                {profile.skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-md border border-white/[0.06] bg-white/[0.03] px-2.5 py-1 text-[10px] font-medium text-text-secondary tracking-wide"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            )}

            {/* Edit button */}
            <button
              type="button"
              onClick={() => navigate("/profile/edit")}
              className="btn-secondary text-xs uppercase tracking-wider mt-5"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit Profile
            </button>
          </div>
        </div>
      </motion.section>

      {/* ── Gamification Stats Grid ── */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { icon: Star, label: "Total Pts", value: gamification.totalPoints || 0 },
          { icon: Award, label: "Rank", value: gamification.rank || "N/A" },
          { icon: TrendingUp, label: "Level", value: gamification.level || 1 },
          { icon: BookOpen, label: "Watched", value: gamification.watchedClasses || 0 },
          { icon: CheckCircle2, label: "Done", value: gamification.completedClasses || 0 },
          { icon: Award, label: "Badges", value: gamification.achievements?.length || 0 },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.04 }}
            className="rounded-2xl border border-border-default bg-bg-card p-4 text-center hover:border-brand-mint/15 transition-colors"
          >
            <stat.icon className="w-4 h-4 text-brand-mint mx-auto mb-2" />
            <p className="text-[9px] font-semibold uppercase tracking-wider text-text-muted mb-0.5">{stat.label}</p>
            <p className="text-lg font-heading font-extrabold text-white truncate">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* ── Quick Links ── */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {quickLinks.map((link, i) => (
          <motion.div
            key={link.path}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.05 }}
          >
            <Link
              to={link.path}
              className="group rounded-2xl border border-border-default bg-bg-card p-5 flex items-center gap-4 hover:border-brand-mint/20 transition-all duration-200 w-full"
            >
              <div className="h-11 w-11 rounded-xl bg-brand-mint/8 border border-brand-mint/15 flex items-center justify-center text-brand-mint shrink-0 group-hover:bg-brand-mint/12 transition-colors">
                <link.icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white group-hover:text-brand-mint transition-colors truncate">{link.label}</p>
                <p className="text-xs font-medium text-text-muted mt-0.5">{link.desc}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* ── Logout ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex justify-start"
      >
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-2 rounded-xl border border-danger/20 bg-danger/5 px-5 py-3 text-xs font-bold uppercase tracking-wider text-danger hover:bg-danger/10 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </motion.div>
    </div>
  );
}

export default Profile;