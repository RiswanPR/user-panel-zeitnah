import { useContext, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Camera,
  CheckCircle2,
  Edit3,
  ExternalLink,
  LogOut,
  Pencil,
  Share2,
  User,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { AuthContext } from "../../context/AuthContext";
import { coreProfileService } from "../../services/coreProfileService";
import { getUploadUrl } from "../../utils/courseUi";
import { useToast } from "../../components/ui/Toast";
import ShareProfileModal from "../../components/profile/ShareProfileModal";
import ChangeUsernameModal from "../../components/username/ChangeUsernameModal";
import ProfileNav from "../../components/profile/ProfileNav";
import ProfileCompletionCard from "../../components/profile/ProfileCompletionCard";
import GamificationSummary from "../../components/profile/GamificationSummary";
import AchievementsGrid from "../../components/profile/AchievementsGrid";
import ProfileModulesGrid from "../../components/profile/ProfileModulesGrid";

export default function Profile() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setUser, logout } = useContext(AuthContext);
  const toast = useToast();
  const fileRef = useRef(null);

  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isChangeUsernameOpen, setIsChangeUsernameOpen] = useState(false);
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);

  // TanStack Query for Profile data with 5m cache
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["profile", "me"],
    queryFn: coreProfileService.getMyProfile,
  });

  const profile = data?.user;

  // Avatar Upload Mutation
  const avatarMutation = useMutation({
    mutationFn: (file) => coreProfileService.uploadAvatar(file),
    onSuccess: (res) => {
      // Optimistically update query cache
      queryClient.setQueryData(["profile", "me"], (old) => {
        if (!old?.user) return old;
        return {
          ...old,
          user: { ...old.user, avatar: res.avatar },
        };
      });
      // Synchronize central auth context
      setUser((prev) => (prev ? { ...prev, avatar: res.avatar } : prev));
      toast.success("Avatar updated", "Your profile photo has been updated successfully.");
    },
    onError: (err) => {
      const msg = err.response?.data?.message || "Could not upload avatar. Please try again.";
      toast.error("Upload failed", msg);
    },
  });

  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side file size guard (5 MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return toast.error("File too large", "Avatar image must be under 5 MB.");
    }

    // Client-side MIME validation
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return toast.error("Invalid format", "Only JPG, PNG, and WebP images are permitted.");
    }

    avatarMutation.mutate(file);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Loading skeleton matching final geometry
  if (isLoading) {
    return (
      <div className="space-y-6 sm:space-y-8 animate-pulse max-w-7xl mx-auto">
        <div className="h-14 bg-bg-card rounded-2xl border border-border-default" />
        <div className="h-72 bg-bg-card rounded-2xl border border-border-default" />
        <div className="h-44 bg-bg-card rounded-2xl border border-border-default" />
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          <div className="h-48 bg-bg-card rounded-2xl border border-border-default" />
          <div className="h-48 bg-bg-card rounded-2xl border border-border-default" />
          <div className="h-48 bg-bg-card rounded-2xl border border-border-default" />
        </div>
      </div>
    );
  }

  // Error state with retry
  if (isError || !profile) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-danger/10 border border-danger/20 text-danger flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-heading font-bold text-white mb-2">
          Unable to Load Profile
        </h2>
        <p className="text-sm text-text-muted mb-6">
          {error?.response?.data?.message || "We encountered an issue retrieving your identity data."}
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="btn-primary inline-flex items-center gap-2 py-2.5 px-6"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    );
  }

  const gamification = profile.gamification || {};
  const avatarUrl = getUploadUrl(profile.avatar);
  const initials = profile.name
    ? profile.name
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "ZU";

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      {/* ── Sub-Navigation Bar ── */}
      <ProfileNav />

      {/* ── Profile Hero ── */}
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-2xl bg-bg-card border border-border-default shadow-sm"
      >
        <div className="gradient-line-top" />

        {/* Ambient brand glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[320px] bg-brand-mint/5 rounded-full blur-[140px] pointer-events-none" />

        {/* Brand Logo Watermark */}
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 opacity-35 hover:opacity-100 transition-opacity">
          <div className="w-10 h-10 rounded-xl border border-brand-mint/30 overflow-hidden shadow-md bg-bg-elevated flex items-center justify-center">
            <img src="/zeitnah-logo.png" alt="Zeitnah Emblem" className="w-full h-full object-cover" />
          </div>
        </div>

        <div className="relative p-6 sm:p-10 flex flex-col md:flex-row gap-6 md:gap-10 items-center md:items-start w-full">
          {/* Avatar Container */}
          <div className="relative group shrink-0">
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border-2 border-brand-mint/25 bg-bg-elevated ring-4 ring-brand-mint/5 shadow-md flex items-center justify-center">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={profile.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-brand-mint/15 to-brand-navy/50 text-brand-mint">
                  <span className="font-heading font-extrabold text-2xl tracking-tight">
                    {initials}
                  </span>
                </div>
              )}
            </div>

            {/* Upload Overlay */}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={avatarMutation.isPending}
              className="absolute inset-0 bg-black/60 rounded-2xl flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white"
              title="Upload new avatar"
            >
              {avatarMutation.isPending ? (
                <RefreshCw className="w-6 h-6 animate-spin text-brand-mint" />
              ) : (
                <>
                  <Camera className="w-6 h-6 text-white mb-1" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Change</span>
                </>
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </div>

          {/* Student Identity Information */}
          <div className="flex-1 text-center md:text-left min-w-0 w-full">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 mb-1.5">
              <h1 className="font-heading font-black text-2xl sm:text-3xl lg:text-4xl text-white tracking-tight leading-none">
                {profile.name || "Zeitnah Student"}
              </h1>
              {profile.isVerified && (
                <span className="inline-flex items-center gap-1 rounded-full border border-brand-mint/25 bg-brand-mint/10 px-2 py-0.5 text-xs font-bold text-brand-mint">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Verified
                </span>
              )}
            </div>

            {/* Username Handle */}
            <div className="flex items-center justify-center md:justify-start gap-2 mb-3.5">
              <span className="font-mono text-sm sm:text-base font-bold text-brand-mint tracking-tight">
                @{profile.username || "student"}
              </span>
              {profile.usernameClaimed && (
                <span className="rounded-md border border-brand-mint/20 bg-brand-mint/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-mint/80">
                  Claimed
                </span>
              )}
              <button
                type="button"
                onClick={() => setIsChangeUsernameOpen(true)}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-text-muted hover:text-brand-mint transition-colors px-2 py-0.5 rounded-md hover:bg-white/[0.04] cursor-pointer"
                title="Change student handle"
              >
                <Pencil className="w-3 h-3" />
                <span className="hidden sm:inline">Edit</span>
              </button>
            </div>

            {/* Bio */}
            <p className="text-sm font-medium text-text-muted mb-4 leading-relaxed max-w-xl">
              {profile.bio || "No biography provided yet. Complete your personal details in Edit Profile."}
            </p>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 justify-center md:justify-start mb-5">
              <span className="rounded-lg border border-brand-mint/20 bg-brand-mint/8 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-mint">
                {profile.role || "Student"}
              </span>
              <span className="rounded-lg border border-brand-yellow/15 bg-brand-yellow/5 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-yellow">
                Level {gamification.level || 1}
              </span>
              <span className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1 text-xs font-semibold text-text-muted font-mono">
                {gamification.totalPoints || 0} XP
              </span>
            </div>

            {/* Skills Pills */}
            {profile.skills?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 justify-center md:justify-start mb-5">
                {profile.skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-md border border-white/[0.06] bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-text-secondary tracking-wide"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            )}

            {/* Action CTAs */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
              <button
                type="button"
                onClick={() => navigate("/profile/edit")}
                className="btn-primary text-xs uppercase tracking-wider flex items-center gap-1.5 py-2.5 px-4 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Edit Profile
              </button>

              <Link
                to="/public-profile"
                className="btn-secondary text-xs uppercase tracking-wider flex items-center gap-1.5 py-2.5 px-4 hover:text-brand-mint cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View Public Profile
              </Link>

              <button
                type="button"
                onClick={() => setIsShareOpen(true)}
                className="btn-secondary text-xs uppercase tracking-wider flex items-center gap-1.5 py-2.5 px-4 hover:border-brand-mint/30 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-brand-mint" />
                Share
              </button>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ── Profile Completion Milestone Card ── */}
      <ProfileCompletionCard
        profile={profile}
        onUploadAvatarClick={() => fileRef.current?.click()}
      />

      {/* ── Gamification Telemetry (Personal XP & Metrics Only) ── */}
      <GamificationSummary profile={profile} />

      {/* ── Achievements Showcase ── */}
      <AchievementsGrid profile={profile} />

      {/* ── Subsystems Grid ── */}
      <ProfileModulesGrid username={profile.username} />

      {/* ── Account Security & Sign Out Footer ── */}
      <div className="pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs text-text-faint text-center sm:text-left">
          Zeitnah Learning Platform · Account ID: <span className="font-mono">{profile._id || profile.id}</span>
        </p>

        <button
          type="button"
          onClick={() => setIsSignOutModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-danger hover:bg-danger/10 border border-danger/20 transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out of Account
        </button>
      </div>

      {/* ── Modals ── */}
      <ShareProfileModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        username={profile.username}
        name={profile.name}
      />

      <ChangeUsernameModal
        isOpen={isChangeUsernameOpen}
        onClose={() => setIsChangeUsernameOpen(false)}
        currentUsername={profile.username}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["profile", "me"] });
        }}
      />

      {/* Sign Out Confirmation Modal */}
      {isSignOutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-2xl border border-danger/30 bg-bg-card p-6 shadow-2xl relative overflow-hidden"
          >
            <div className="gradient-line-top" />
            <div className="w-12 h-12 rounded-xl bg-danger/10 border border-danger/20 text-danger flex items-center justify-center mb-4">
              <LogOut className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-heading font-bold text-white mb-2">
              Sign Out of Zeitnah?
            </h3>
            <p className="text-xs text-text-muted leading-relaxed mb-6">
              You will need to sign in again with your credentials or verification code to access your courses and progress.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsSignOutModalOpen(false)}
                className="btn-secondary py-2 px-4 text-xs uppercase tracking-wider"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="px-4 py-2 rounded-xl bg-danger hover:bg-danger/90 text-white text-xs font-bold uppercase tracking-wider transition-colors"
              >
                Sign Out
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}