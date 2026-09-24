import { useContext, useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Camera,
  CheckCircle2,
  Edit3,
  ExternalLink,
  Pencil,
  Share2,
  AlertCircle,
  RefreshCw,
  MapPin,
  Briefcase,
  Sparkles,
  Award,
  BookOpen,
  GraduationCap,
  Globe,
  Check,
  Circle,
  ChevronRight,
  Code2,
  ArrowRight,
  LogOut,
} from "lucide-react";
import { AuthContext } from "../../context/AuthContext";
import { coreProfileService } from "../../services/coreProfileService";
import { getUploadUrl } from "../../utils/courseUi";
import { useToast } from "../../components/ui/Toast";
import ShareProfileModal from "../../components/profile/ShareProfileModal";
import ChangeUsernameModal from "../../components/username/ChangeUsernameModal";
import ProfileNav from "../../components/profile/ProfileNav";
import ProfileCompletionCard from "../../components/profile/ProfileCompletionCard";
import AchievementsGrid from "../../components/profile/AchievementsGrid";
import ImageEditorModal from "../../components/common/ImageEditorModal";
import ProfileNetworkStats from "../../components/network/ProfileNetworkStats";

/**
 * Animated XP Counter for subtle, elegant point transitions.
 */
function XPCountUp({ value = 0, duration = 800 }) {
  const prefersReducedMotion = useReducedMotion();
  const [displayValue, setDisplayValue] = useState(value);
  const prevValueRef = useRef(value);

  useEffect(() => {
    if (prefersReducedMotion) {
      setDisplayValue(value);
      prevValueRef.current = value;
      return;
    }

    const start = prevValueRef.current;
    const end = value;
    if (start === end) return;

    const startTime = performance.now();

    const update = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (end - start) * ease);
      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        prevValueRef.current = end;
      }
    };

    requestAnimationFrame(update);
  }, [value, duration, prefersReducedMotion]);

  return <span>{displayValue}</span>;
}

export default function Profile() {
  const queryClient = useQueryClient();
  const { setUser, logout, requestLogout } = useContext(AuthContext);
  const toast = useToast();
  const avatarFileRef = useRef(null);
  const bannerFileRef = useRef(null);

  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isChangeUsernameOpen, setIsChangeUsernameOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [editingImage, setEditingImage] = useState(null); // { file, type: 'avatar' | 'banner' }

  // TanStack Query for authoritative profile data
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
  const completionData = data?.completion;

  // Avatar Upload Mutation
  const avatarMutation = useMutation({
    mutationFn: (file) => coreProfileService.uploadAvatar(file),
    onSuccess: (res) => {
      queryClient.setQueryData(["profile", "me"], (old) => {
        if (!old?.user) return old;
        return {
          ...old,
          user: { ...old.user, avatar: res.avatar },
          completion: res.completion || old.completion,
        };
      });
      setUser((prev) => (prev ? { ...prev, avatar: res.avatar } : prev));
      setAvatarError(false);
      toast.success("Avatar updated", "Your profile photo has been updated.");
      if (res.newlyAwarded?.length) {
        res.newlyAwarded.forEach((m) => {
          toast.success(`+${m.points} XP Earned!`, m.label);
        });
      }
    },
    onError: (err) => {
      if (err.response?.status === 413) {
        toast.error("Upload failed", "That image is too large to upload. Try a smaller crop or lower image quality.");
      } else {
        const msg = err.response?.data?.message || "Could not upload avatar. Please try again.";
        toast.error("Upload failed", msg);
      }
    },
  });

  // Background Banner Upload Mutation
  const bannerMutation = useMutation({
    mutationFn: (file) => coreProfileService.uploadBackground(file),
    onSuccess: (res) => {
      queryClient.setQueryData(["profile", "me"], (old) => {
        if (!old?.user) return old;
        return {
          ...old,
          user: { ...old.user, backgroundImage: res.backgroundImage },
          completion: res.completion || old.completion,
        };
      });
      toast.success("Cover banner updated", "Your background cover has been customized.");
      if (res.newlyAwarded?.length) {
        res.newlyAwarded.forEach((m) => {
          toast.success(`+${m.points} XP Earned!`, m.label);
        });
      }
    },
    onError: (err) => {
      if (err.response?.status === 413) {
        toast.error("Upload failed", "That image is too large to upload. Try a smaller crop or lower image quality.");
      } else {
        const msg = err.response?.data?.message || "Could not upload cover image.";
        toast.error("Upload failed", msg);
      }
    },
  });

  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      return toast.error("File too large", "Avatar image must be under 25 MB.");
    }
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return toast.error("Invalid format", "Only JPG, PNG, and WebP images are permitted.");
    }

    setEditingImage({ file, type: "avatar" });
    e.target.value = "";
  };

  const handleBannerUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 30 * 1024 * 1024) {
      return toast.error("File too large", "Banner image must be under 30 MB.");
    }
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return toast.error("Invalid format", "Only JPG, PNG, and WebP images are permitted.");
    }

    setEditingImage({ file, type: "banner" });
    e.target.value = "";
  };

  const handleShare = async () => {
    if (!profile) return;
    const shareUrl = `${window.location.origin}/u/${encodeURIComponent(profile.username || "")}`;
    const shareData = {
      title: `${profile.name || "Student"} — Zeitnah Student Identity`,
      text: `Check out ${profile.name || "my"}'s verified student profile on Zeitnah Academy.`,
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

  if (isLoading) {
    return (
      <div className="space-y-6 sm:space-y-8 animate-pulse max-w-7xl mx-auto pb-12">
        <div className="h-14 bg-bg-card rounded-2xl border border-border-default" />
        <div className="h-80 bg-bg-card rounded-3xl border border-border-default" />
        <div className="h-56 bg-bg-card rounded-3xl border border-border-default" />
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <div className="h-28 bg-bg-card rounded-2xl border border-border-default" />
          <div className="h-28 bg-bg-card rounded-2xl border border-border-default" />
          <div className="h-28 bg-bg-card rounded-2xl border border-border-default" />
          <div className="h-28 bg-bg-card rounded-2xl border border-border-default" />
        </div>
      </div>
    );
  }

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
          className="btn-primary inline-flex items-center gap-2 py-2.5 px-6 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    );
  }

  const gamification = profile.gamification || {};
  const avatarUrl = getUploadUrl(profile.avatar);
  const bannerUrl = getUploadUrl(profile.backgroundImage);
  const initials = profile.name
    ? profile.name
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "ZU";

  // Section completion evaluation
  const sections = [
    {
      id: "introduction",
      title: "Introduction",
      desc: "Photo, cover, headline, role, location & industry",
      done: Boolean(profile.avatar && profile.headline && (profile.location || profile.industry || profile.currentRole)),
      partDone: Boolean(profile.avatar || profile.headline),
      to: "/profile/edit?section=introduction",
    },
    {
      id: "about",
      title: "About",
      desc: "Your learning journey, goals, and interests",
      done: Boolean(profile.bio && profile.bio.trim().length >= 20),
      partDone: Boolean(profile.bio && profile.bio.trim().length > 0),
      to: "/profile/edit?section=about",
    },
    {
      id: "experience",
      title: "Experience",
      desc: "Internships, jobs, projects & leadership roles",
      done: Boolean(Array.isArray(profile.experience) && profile.experience.length > 0),
      partDone: false,
      to: "/profile/edit?section=experience",
    },
    {
      id: "education",
      title: "Education",
      desc: "Your academic background and studies",
      done: Boolean(Array.isArray(profile.education) && profile.education.length > 0),
      partDone: false,
      to: "/profile/edit?section=education",
    },
    {
      id: "certifications",
      title: "Licenses & Certifications",
      desc: "Verified credentials, certificates & licenses",
      done: Boolean(Array.isArray(profile.certifications) && profile.certifications.length > 0),
      partDone: false,
      to: "/profile/edit?section=certifications",
    },
    {
      id: "skills",
      title: "Skills",
      desc: "Technologies and core competencies (3+ for milestone)",
      done: Boolean(Array.isArray(profile.skills) && profile.skills.length >= 3),
      partDone: Boolean(Array.isArray(profile.skills) && profile.skills.length > 0),
      to: "/profile/edit?section=skills",
    },
    {
      id: "recommendations",
      title: "Recommendations",
      desc: "Endorsements from mentors, teachers & peers",
      done: Boolean(data?.recommendationsCount > 0),
      partDone: false,
      to: "/profile/edit?section=recommendations",
    },
    {
      id: "public-profile",
      title: "Public Profile Status",
      desc: profile.publicProfilePublished ? "Published and shareable at /u/:username" : "Draft preview ready",
      done: Boolean(profile.publicProfilePublished),
      partDone: Boolean(completionData?.publicProfileReady),
      to: "/profile/edit?section=public-profile",
    },
  ];

  const publicProfileReady = completionData?.publicProfileReady;
  const isPublished = profile.publicProfilePublished;

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto pb-16">
      {/* ── Sub-Navigation Bar ── */}
      <ProfileNav />

      {/* ── 01. PREMIUM PROFILE HERO ── */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative overflow-hidden rounded-3xl bg-bg-card border border-border-default shadow-sm"
      >
        <div className="gradient-line-top" />

        {/* Custom Cover Banner Image with subtle gradient overlay */}
        <div className="relative h-48 sm:h-60 md:h-72 w-full overflow-hidden">
          {bannerUrl ? (
            <img
              src={bannerUrl}
              alt="Profile Cover"
              className="w-full h-full object-cover"
            />
          ) : (
            /* Editorial fallback backdrop - no generic stock image */
            <div className="w-full h-full relative overflow-hidden bg-gradient-to-br from-[#0c1520] via-[#080d14] to-[#04070a] flex items-center justify-center">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(159,213,178,0.12),rgba(255,255,255,0))]" />
              <div className="absolute right-12 bottom-10 w-48 h-48 rounded-full bg-brand-yellow/[0.04] blur-3xl pointer-events-none" />
              <div className="text-center opacity-30 select-none">
                <span className="font-mono text-xs uppercase tracking-[0.25em] text-brand-mint font-semibold">
                  Zeitnah Learning Identity
                </span>
              </div>
            </div>
          )}

          {/* Subtle dark gradient overlay at bottom for smooth avatar and text transition */}
          <div className="absolute inset-0 bg-gradient-to-t from-bg-card via-black/35 to-transparent pointer-events-none" />

          {/* Banner Change Trigger */}
          <button
            type="button"
            onClick={() => bannerFileRef.current?.click()}
            disabled={bannerMutation.isPending}
            className="absolute top-4 right-4 z-10 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/60 hover:bg-black/85 backdrop-blur-md border border-white/10 text-xs font-semibold text-white transition-all cursor-pointer shadow-sm"
            title="Upload cover banner"
          >
            {bannerMutation.isPending ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-brand-mint" />
            ) : (
              <Camera className="w-3.5 h-3.5 text-brand-mint" />
            )}
            <span className="hidden sm:inline">Change Cover</span>
          </button>
          <input
            ref={bannerFileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleBannerUpload}
          />
        </div>

        {/* Hero Identity Body */}
        <div className="relative px-6 sm:px-10 pb-8 sm:pb-10 pt-0">
          <div className="flex flex-col md:flex-row items-center md:items-end justify-between gap-6 -mt-16 sm:-mt-20">
            {/* Avatar & Identifiers */}
            <div className="flex flex-col md:flex-row items-center md:items-end gap-5 text-center md:text-left">
              {/* Avatar with Upload Badge & error fallback */}
              <div className="relative group shrink-0">
                <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl overflow-hidden border-4 border-bg-card bg-bg-elevated shadow-xl flex items-center justify-center ring-1 ring-white/10">
                  {avatarUrl && !avatarError ? (
                    <img
                      src={avatarUrl}
                      alt={profile.name}
                      onError={() => setAvatarError(true)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-mint/15 to-brand-navy/50 text-brand-mint font-heading font-black text-3xl sm:text-4xl">
                      {initials}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => avatarFileRef.current?.click()}
                  disabled={avatarMutation.isPending}
                  className="absolute inset-0 bg-black/60 rounded-3xl flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white"
                  title="Upload avatar"
                >
                  {avatarMutation.isPending ? (
                    <RefreshCw className="w-6 h-6 animate-spin text-brand-mint" />
                  ) : (
                    <>
                      <Camera className="w-6 h-6 text-brand-mint mb-1" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Change</span>
                    </>
                  )}
                </button>
                <input
                  ref={avatarFileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </div>

              {/* Name, Username, Headline, Role & Location */}
              <div className="space-y-1.5 pb-1">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
                  <h1 className="font-heading font-black text-2xl sm:text-3xl lg:text-4xl text-white tracking-tight leading-tight break-words">
                    {profile.name || "Student Identity"}
                  </h1>
                  {profile.isVerified && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-brand-mint/25 bg-brand-mint/10 px-2 py-0.5 text-xs font-bold text-brand-mint">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Verified
                    </span>
                  )}
                </div>

                {/* Handle and Edit Handle */}
                <div className="flex items-center justify-center md:justify-start gap-2">
                  <span className="font-mono text-sm sm:text-base font-bold text-brand-mint">
                    @{profile.username || "username"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsChangeUsernameOpen(true)}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-text-muted hover:text-brand-mint transition-colors px-2 py-0.5 rounded-md hover:bg-white/[0.04] cursor-pointer"
                    title="Change handle"
                  >
                    <Pencil className="w-3 h-3" />
                    <span className="hidden sm:inline">Edit</span>
                  </button>
                </div>

                {/* Headline / Invitation for empty profile */}
                {profile.headline ? (
                  <p className="text-sm sm:text-base font-medium text-white/90 max-w-xl leading-relaxed break-words">
                    {profile.headline}
                  </p>
                ) : !profile.currentRole && !profile.location && !profile.industry ? (
                  <p className="text-xs sm:text-sm text-text-muted/80 max-w-md leading-relaxed pt-0.5">
                    Introduce yourself, highlight your focus, and start building your student profile.
                  </p>
                ) : null}

                {/* Role, Location, Industry Meta */}
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-xs text-text-muted pt-1">
                  {profile.currentRole && (
                    <span className="inline-flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-text-faint" />
                      {profile.currentRole}
                    </span>
                  )}
                  {profile.location && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-text-faint" />
                      {profile.location}
                    </span>
                  )}
                  {profile.industry && (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-yellow/60" />
                      {profile.industry}
                    </span>
                  )}
                </div>

                {/* ── Network Statistics (Followers, Following, Connections) ── */}
                <div className="pt-3 w-full max-w-md">
                  <ProfileNetworkStats
                    userIdOrUsername={profile.id || profile.username}
                    profileName={profile.name}
                  />
                </div>
              </div>
            </div>

            {/* Level, Rank, XP Badges and Primary Actions */}
            <div className="flex flex-col items-center md:items-end gap-4 shrink-0 w-full md:w-auto">
              {/* Supportive Gamification Badge Line */}
              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-xl border border-brand-yellow/20 bg-brand-yellow/10 text-xs font-bold font-mono text-brand-yellow uppercase tracking-wider">
                  LEVEL {gamification.level || 1}
                </span>
                <span className="px-3 py-1.5 rounded-xl border border-brand-mint/20 bg-brand-mint/10 text-xs font-bold uppercase tracking-wider text-brand-mint">
                  {gamification.rank || "Beginner"}
                </span>
                <span className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.03] text-xs font-bold font-mono text-white">
                  <XPCountUp value={gamification.totalPoints || 0} /> XP
                </span>
              </div>

              {/* Action Buttons with >=44px mobile touch ergonomics */}
              <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-center">
                <Link
                  to="/profile/edit"
                  className="btn-primary text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 py-3 px-5 min-h-[44px] cursor-pointer shadow-sm flex-1 sm:flex-initial"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit Profile
                </Link>

                <Link
                  to="/public-profile"
                  className="btn-secondary text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 py-3 px-4 min-h-[44px] cursor-pointer flex-1 sm:flex-initial"
                >
                  <ExternalLink className="w-4 h-4" />
                  Public Profile
                </Link>

                <button
                  type="button"
                  onClick={handleShare}
                  className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl border border-border-default bg-white/[0.02] hover:bg-white/[0.05] text-text-muted hover:text-white transition-colors cursor-pointer shrink-0"
                  title="Share profile"
                  aria-label="Share profile"
                >
                  <Share2 className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => (requestLogout ? requestLogout() : logout?.())}
                  className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/15 text-red-400 hover:text-red-300 transition-colors cursor-pointer shrink-0"
                  title="Log out"
                  aria-label="Log out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ── 02 & 03. PROFILE STRENGTH + YOUR NEXT STEP ── */}
      <ProfileCompletionCard completionData={completionData} />

      {/* ── 04. PROFILE SNAPSHOT (COMPACT SUPPORTING TILES) ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Skills */}
        <Link
          to="/profile/edit?section=skills"
          className="p-4 sm:p-5 rounded-2xl border border-border-default bg-bg-card hover:border-brand-mint/30 transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">
            <span>Skills</span>
            <Code2 className="w-4 h-4 text-brand-mint group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-black font-heading text-white">
            {profile.skills?.length || 0}
          </div>
          <p className="text-[11px] text-text-muted mt-0.5 truncate">
            {profile.skills?.length > 0
              ? profile.skills.slice(0, 2).join(", ") + (profile.skills.length > 2 ? "..." : "")
              : "No skills added"}
          </p>
        </Link>

        {/* Learning */}
        <Link
          to="/my-learning"
          className="p-4 sm:p-5 rounded-2xl border border-border-default bg-bg-card hover:border-brand-mint/30 transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">
            <span>Courses</span>
            <BookOpen className="w-4 h-4 text-brand-mint group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-black font-heading text-white">
            {gamification.completedCourses || 0}
          </div>
          <p className="text-[11px] text-text-muted mt-0.5">
            {gamification.completedClasses || 0} lecture{gamification.completedClasses === 1 ? "" : "s"} finished
          </p>
        </Link>

        {/* Achievements */}
        <Link
          to="/my-points"
          className="p-4 sm:p-5 rounded-2xl border border-border-default bg-bg-card hover:border-brand-yellow/30 transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">
            <span>Achievements</span>
            <Award className="w-4 h-4 text-brand-yellow group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-black font-heading text-white">
            {gamification.achievements?.length || 0}
          </div>
          <p className="text-[11px] text-text-muted mt-0.5">Earned milestones</p>
        </Link>

        {/* Public Status */}
        <Link
          to="/public-profile"
          className="p-4 sm:p-5 rounded-2xl border border-border-default bg-bg-card hover:border-brand-mint/30 transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">
            <span>Public Status</span>
            <Globe className="w-4 h-4 text-brand-mint group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-xl font-bold font-heading text-white flex items-center gap-1.5">
            {isPublished ? (
              <span className="text-brand-mint flex items-center gap-1 text-sm sm:text-base">
                <CheckCircle2 className="w-4 h-4" /> Published
              </span>
            ) : (
              <span className="text-text-muted text-sm sm:text-base">Draft</span>
            )}
          </div>
          <p className="text-[11px] text-text-muted mt-0.5 truncate">
            {profile.username ? `@${profile.username}` : "Pending handle"}
          </p>
        </Link>
      </div>

      {/* ── 05. SECTION OVERVIEW WITH TRIPARTITE STATES ── */}
      <div className="rounded-3xl border border-border-default bg-bg-card p-6 sm:p-8 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg sm:text-xl font-heading font-extrabold text-white">
              Profile Sections Overview
            </h3>
            <p className="text-xs sm:text-sm text-text-muted mt-0.5">
              Keep your personal learning identity up to date across all sections
            </p>
          </div>
          <Link
            to="/profile/edit"
            className="text-xs font-semibold text-brand-mint hover:underline inline-flex items-center gap-1"
          >
            Manage All
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {sections.map((sec) => (
            <Link
              key={sec.id}
              to={sec.to}
              className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:border-brand-mint/30 hover:bg-white/[0.03] transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    sec.done
                      ? "bg-brand-mint/10 text-brand-mint border border-brand-mint/20"
                      : sec.partDone
                      ? "bg-brand-yellow/10 text-brand-yellow border border-brand-yellow/20"
                      : "bg-white/[0.04] text-text-faint border border-white/[0.06]"
                  }`}
                >
                  {sec.done ? (
                    <Check className="w-4 h-4" />
                  ) : sec.partDone ? (
                    <Circle className="w-4 h-4 fill-brand-yellow/40 text-brand-yellow" />
                  ) : (
                    <Circle className="w-4 h-4" />
                  )}
                </div>

                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-white group-hover:text-brand-mint transition-colors truncate">
                    {sec.title}
                  </h4>
                  <p className="text-xs text-text-muted truncate mt-0.5">
                    {sec.desc}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-3">
                <span
                  className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                    sec.done
                      ? "text-brand-mint bg-brand-mint/10"
                      : sec.partDone
                      ? "text-brand-yellow bg-brand-yellow/10"
                      : "text-text-muted bg-white/[0.03]"
                  }`}
                >
                  {sec.done ? "✓ Complete" : sec.partDone ? "◐ In Progress" : "○ Not Started"}
                </span>
                <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-white group-hover:translate-x-0.5 transition-all" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── 06. ACHIEVEMENTS SECTION ── */}
      <AchievementsGrid profile={profile} />

      {/* ── 07. PUBLIC PROFILE STATUS ── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-border-default bg-bg-card p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-5 shadow-sm"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
              Public Profile
            </span>
            <span
              className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                isPublished
                  ? "bg-brand-mint/10 text-brand-mint border border-brand-mint/20"
                  : "bg-white/[0.04] text-text-muted border border-white/[0.06]"
              }`}
            >
              {isPublished ? "Published ✓" : "Almost Ready"}
            </span>
          </div>

          <h3 className="text-lg sm:text-xl font-heading font-extrabold text-white">
            {isPublished
              ? "Your profile is ready to share."
              : publicProfileReady
              ? "Your public profile is ready to publish."
              : `${completionData?.remainingMilestones?.length || 2} steps remaining before publish.`}
          </h3>

          <p className="text-xs sm:text-sm text-text-muted max-w-xl leading-relaxed">
            {isPublished
              ? `Live at /u/${profile.username}. Anyone with the link can view your verified learning credentials.`
              : "Complete your identity essentials to unlock your verified shareable student link."}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {isPublished ? (
            <Link
              to="/public-profile"
              className="btn-primary text-xs uppercase tracking-wider flex items-center gap-1.5 py-3 px-5 cursor-pointer shadow-md"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View Public Profile
            </Link>
          ) : (
            <Link
              to="/profile/edit?section=public-profile"
              className="btn-primary text-xs uppercase tracking-wider flex items-center gap-1.5 py-3 px-5 cursor-pointer shadow-md"
            >
              <span>Finish Setup</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </motion.div>

      {/* ── 04. ACCOUNT & SIGN OUT SECTION ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl border border-border-default bg-bg-card/50 backdrop-blur-md"
      >
        <div>
          <h3 className="text-sm font-heading font-bold text-white">Sign Out</h3>
          <p className="text-xs text-text-muted mt-0.5">Securely end your session on this device.</p>
        </div>
        <button
          type="button"
          onClick={() => (requestLogout ? requestLogout() : logout?.())}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 text-xs font-semibold tracking-wide transition-all cursor-pointer focus-ring"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </motion.div>

      {/* ── Share Modal ── */}
      <ShareProfileModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        profile={profile}
      />

      {/* ── Change Username Modal ── */}
      <ChangeUsernameModal
        isOpen={isChangeUsernameOpen}
        onClose={() => setIsChangeUsernameOpen(false)}
      />

      {/* ── Image Editor Modal for Avatar & Banner ── */}
      <ImageEditorModal
        isOpen={Boolean(editingImage)}
        onClose={() => setEditingImage(null)}
        imageFile={editingImage?.file}
        type={editingImage?.type || "avatar"}
        onSave={(processedFile) => {
          if (editingImage?.type === "avatar") {
            avatarMutation.mutate(processedFile, {
              onSuccess: () => setEditingImage(null),
            });
          } else {
            bannerMutation.mutate(processedFile, {
              onSuccess: () => setEditingImage(null),
            });
          }
        }}
        currentAvatarUrl={avatarUrl}
        userName={profile?.name || "Student"}
        userRole={profile?.currentRole || profile?.headline || "Student Developer"}
        isUploading={avatarMutation.isPending || bannerMutation.isPending}
      />
    </div>
  );
}