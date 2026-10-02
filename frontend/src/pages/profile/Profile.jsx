import { useContext, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  RefreshCw,
  Award,
  BookOpen,
  Briefcase,
  Layers,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Edit3,
  ArrowRight,
  LogOut,
  ChevronRight,
  Clock,
  Send,
  Sparkles,
} from "lucide-react";
import { AuthContext } from "../../context/AuthContext";
import { coreProfileService } from "../../services/coreProfileService";
import { projectsService } from "../../services/projectsService";
import { useToast } from "../../components/ui/Toast";

// Core Reusable Profile Components
import ProfileNav from "../../components/profile/ProfileNav";
import ProfileHero from "../../components/profile/ProfileHero";
import ProfileAboutSection from "../../components/profile/ProfileAboutSection";
import ProfileExperienceSection from "../../components/profile/ProfileExperienceSection";
import ProfileEducationSection from "../../components/profile/ProfileEducationSection";
import ProfileSkillsSection from "../../components/profile/ProfileSkillsSection";
import ProfileProjectsSection from "../../components/profile/ProfileProjectsSection";
import ProfileCertificationsSection from "../../components/profile/ProfileCertificationsSection";
import ProfileRecommendationsSection from "../../components/profile/ProfileRecommendationsSection";
import ProfileCompletionCard from "../../components/profile/ProfileCompletionCard";
import AchievementsGrid from "../../components/profile/AchievementsGrid";

// Modals
import ShareProfileModal from "../../components/profile/ShareProfileModal";
import ChangeUsernameModal from "../../components/username/ChangeUsernameModal";
import ImageEditorModal from "../../components/common/ImageEditorModal";
import ProjectEditorModal from "../../components/profile/ProjectEditorModal";

export default function Profile() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { setUser, logout, requestLogout } = useContext(AuthContext);
  const toast = useToast();

  // Modals & Interactive States
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isChangeUsernameOpen, setIsChangeUsernameOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [editingImage, setEditingImage] = useState(null); // { file, type: 'avatar' | 'banner' }
  const [isProjectEditorOpen, setIsProjectEditorOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [activeSectionFilter, setActiveSectionFilter] = useState("all");

  // 1. Authoritative Profile Query
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

  const profile = data?.user || data?.profile || data;
  const completionData = data?.completion || profile?.completion;

  // 2. User's Projects Query
  const { data: myProjects, refetch: refetchProjects } = useQuery({
    queryKey: ["projects", "my"],
    queryFn: projectsService.getMyProjects,
    enabled: Boolean(profile),
  });
  const projectsList = Array.isArray(myProjects) ? myProjects : [];

  // 3. User's Recommendations Query
  const { data: recommendationsData } = useQuery({
    queryKey: ["profile", "recommendations"],
    queryFn: coreProfileService.getRecommendations,
    enabled: Boolean(profile),
  });
  const recommendationsList = Array.isArray(recommendationsData?.recommendations)
    ? recommendationsData.recommendations
    : Array.isArray(recommendationsData)
    ? recommendationsData
    : [];

  // ── Avatar Upload Mutation ──
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
      toast.success("Avatar updated", "Your profile photo has been refreshed.");
      if (res.newlyAwarded?.length) {
        res.newlyAwarded.forEach((m) => {
          toast.success(`+${m.points} XP Earned!`, m.label);
        });
      }
    },
    onError: (err) => {
      if (err.response?.status === 413) {
        toast.error("Upload failed", "That image is too large. Max size is 5 MB.");
      } else {
        const msg = err.response?.data?.message || "Could not upload avatar photo.";
        toast.error("Upload failed", msg);
      }
    },
  });

  // ── Cover Banner Upload Mutation ──
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
        toast.error("Upload failed", "That image is too large. Max size is 5 MB.");
      } else {
        const msg = err.response?.data?.message || "Could not upload banner.";
        toast.error("Upload failed", msg);
      }
    },
  });

  // ── Project Create / Update Mutation ──
  const projectMutation = useMutation({
    mutationFn: (formData) => {
      if (editingProject?._id || editingProject?.id) {
        return projectsService.updateProject(editingProject._id || editingProject.id, formData);
      }
      return projectsService.createProject(formData);
    },
    onSuccess: () => {
      refetchProjects();
      queryClient.invalidateQueries({ queryKey: ["profile", "me"] });
      setIsProjectEditorOpen(false);
      setEditingProject(null);
      toast.success(
        editingProject ? "Project updated" : "Project featured",
        "Your infrastructure deliverables have been saved."
      );
    },
    onError: (err) => {
      toast.error("Failed to save project", err.response?.data?.message || "Could not save project.");
    },
  });

  const handleAvatarFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      return toast.error("File too large", "Image must be under 25 MB.");
    }
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      return toast.error("Invalid format", "Only JPG, PNG, and WebP images are supported.");
    }
    setEditingImage({ file, type: "avatar" });
    e.target.value = "";
  };

  const handleBannerFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 30 * 1024 * 1024) {
      return toast.error("File too large", "Banner must be under 30 MB.");
    }
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      return toast.error("Invalid format", "Only JPG, PNG, and WebP images are supported.");
    }
    setEditingImage({ file, type: "banner" });
    e.target.value = "";
  };

  const handleShare = async () => {
    if (!profile) return;
    const shareUrl = `${window.location.origin}/u/${encodeURIComponent(profile.username || "")}`;
    const shareData = {
      title: `${profile.name || "Member"} — Zeitnah Identity`,
      text: `Check out ${profile.name || "my"}'s verified infrastructure profile on Zeitnah.`,
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

  // ── SKELETON LOADING STATE ──
  if (isLoading) {
    return (
      <div className="space-y-6 sm:space-y-8 animate-pulse max-w-7xl mx-auto pb-16">
        <div className="h-12 bg-white/[0.04] rounded-2xl border border-white/[0.06]" />
        <div className="h-80 bg-white/[0.04] rounded-3xl border border-white/[0.06]" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-6">
            <div className="h-64 bg-white/[0.04] rounded-3xl border border-white/[0.06]" />
            <div className="h-72 bg-white/[0.04] rounded-3xl border border-white/[0.06]" />
          </div>
          <div className="lg:col-span-4 space-y-6">
            <div className="h-48 bg-white/[0.04] rounded-3xl border border-white/[0.06]" />
            <div className="h-64 bg-white/[0.04] rounded-3xl border border-white/[0.06]" />
          </div>
        </div>
      </div>
    );
  }

  // ── ERROR RECOVERY STATE ──
  if (isError || !profile) {
    return (
      <div className="max-w-2xl mx-auto py-20 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto mb-4 shadow-sm">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-heading font-black text-white mb-2 tracking-tight">
          Unable to Load Profile
        </h2>
        <p className="text-sm text-text-muted mb-6 max-w-md mx-auto leading-relaxed">
          {error?.response?.data?.message || "We encountered an issue retrieving your identity data. Please check your connection."}
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="zn-btn-primary inline-flex items-center gap-2 py-2.5 px-6 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Try Again</span>
        </button>
      </div>
    );
  }

  const gamification = profile.gamification || {};
  const isPublished = Boolean(profile.publicProfilePublished);
  const isVerified = Boolean(profile.isVerified);

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto pb-20">
      {/* ── 01. UNIFIED PROFILE NAVIGATION ── */}
      <ProfileNav />

      {/* ── 02. EDITORIAL HERO ── */}
      <ProfileHero
        profile={profile}
        isOwner={true}
        onAvatarUpload={handleAvatarFile}
        onBannerUpload={handleBannerFile}
        isAvatarUploading={avatarMutation.isPending}
        isBannerUploading={bannerMutation.isPending}
        avatarError={avatarError}
        setAvatarError={setAvatarError}
        onShare={handleShare}
        onChangeUsername={() => setIsChangeUsernameOpen(true)}
        onLogout={() => (requestLogout ? requestLogout() : logout?.())}
      />

      {/* ── 03. IN-PAGE SECTION JUMP ANCHORS ── */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        {[
          { id: "all", label: "Full Profile" },
          { id: "about", label: "Story" },
          { id: "experience", label: "Experience" },
          { id: "education", label: "Education" },
          { id: "skills", label: "Skills" },
          { id: "projects", label: "Projects" },
          { id: "certifications", label: "Certifications" },
          { id: "recommendations", label: "Endorsements" },
        ].map((sec) => (
          <button
            key={sec.id}
            type="button"
            onClick={() => {
              setActiveSectionFilter(sec.id);
              if (sec.id !== "all") {
                const el = document.getElementById(sec.id);
                if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
              }
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer select-none focus-ring ${
              activeSectionFilter === sec.id
                ? "bg-brand-mint text-[#070B14] font-bold shadow-[0_0_12px_rgba(159,213,178,0.3)]"
                : "bg-white/[0.03] text-text-muted hover:text-white hover:bg-white/[0.06] border border-white/[0.06]"
            }`}
          >
            {sec.label}
          </button>
        ))}
      </div>

      {/* ── 04. EXPANSIVE DUAL-COLUMN LAYOUT ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
        {/* ── LEFT / MAIN CONTENT COLUMN (8 Cols) ── */}
        <div className="lg:col-span-8 space-y-6 sm:space-y-8 min-w-0">
          {/* About / Professional Story */}
          {(activeSectionFilter === "all" || activeSectionFilter === "about") && (
            <ProfileAboutSection profile={profile} isOwner={true} />
          )}

          {/* Career Experience Timeline */}
          {(activeSectionFilter === "all" || activeSectionFilter === "experience") && (
            <ProfileExperienceSection
              experience={profile.experience || []}
              isOwner={true}
              onAdd={() => navigate("/profile/edit?section=experience")}
              onEdit={() => navigate("/profile/edit?section=experience")}
              onDelete={() => navigate("/profile/edit?section=experience")}
            />
          )}

          {/* Academic Background */}
          {(activeSectionFilter === "all" || activeSectionFilter === "education") && (
            <ProfileEducationSection
              education={profile.education || []}
              isOwner={true}
              onAdd={() => navigate("/profile/edit?section=education")}
              onEdit={() => navigate("/profile/edit?section=education")}
              onDelete={() => navigate("/profile/edit?section=education")}
            />
          )}

          {/* Structured Skills & Software */}
          {(activeSectionFilter === "all" || activeSectionFilter === "skills") && (
            <ProfileSkillsSection
              skills={profile.skills || []}
              structuredSkills={profile.structuredSkills}
              isOwner={true}
            />
          )}

          {/* Featured Projects & Deliverables */}
          {(activeSectionFilter === "all" || activeSectionFilter === "projects") && (
            <ProfileProjectsSection
              projects={projectsList}
              isOwner={true}
              onAdd={() => {
                setEditingProject(null);
                setIsProjectEditorOpen(true);
              }}
            />
          )}

          {/* Licenses & Certifications */}
          {(activeSectionFilter === "all" || activeSectionFilter === "certifications") && (
            <ProfileCertificationsSection
              certifications={profile.certifications || []}
              isOwner={true}
              onAdd={() => navigate("/profile/edit?section=certifications")}
              onEdit={() => navigate("/profile/edit?section=certifications")}
              onDelete={() => navigate("/profile/edit?section=certifications")}
            />
          )}

          {/* Peer & Mentor Recommendations */}
          {(activeSectionFilter === "all" || activeSectionFilter === "recommendations") && (
            <ProfileRecommendationsSection
              recommendations={recommendationsList}
              isOwner={true}
              onRequestRecommendation={() => navigate("/profile/edit?section=recommendations")}
            />
          )}
        </div>

        {/* ── RIGHT STRATEGIC SIDEBAR (4 Cols) ── */}
        <div className="lg:col-span-4 space-y-6 sm:space-y-8">
          {/* Profile Strength & Readiness Card */}
          <ProfileCompletionCard completionData={completionData} />

          {/* Trust & Verification Status */}
          <div className="rounded-3xl border border-white/[0.08] bg-[#0A0F18]/90 backdrop-blur-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-brand-mint" />
                <h3 className="font-heading font-bold text-white text-base">
                  Trust & Verification
                </h3>
              </div>
              <Link
                to="/profile/verification"
                className="text-xs font-semibold text-brand-mint hover:underline inline-flex items-center gap-1"
              >
                Center
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <p className="text-xs text-text-muted leading-relaxed">
              Verify your professional credentials, engineering council ID, and EPC affiliation.
            </p>

            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <span className="text-xs font-medium text-white/90">Identity Verification</span>
                {isVerified ? (
                  <span className="px-2 py-0.5 rounded-full bg-brand-mint/10 border border-brand-mint/25 text-[10px] font-bold text-brand-mint">
                    Verified ✓
                  </span>
                ) : (
                  <span className="text-[10px] text-text-muted font-mono">Unverified</span>
                )}
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <span className="text-xs font-medium text-white/90">Council Licensure</span>
                {profile.certifications?.length > 0 ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-[10px] font-bold text-emerald-400">
                    Active
                  </span>
                ) : (
                  <span className="text-[10px] text-text-muted font-mono">Pending</span>
                )}
              </div>
            </div>

            <Link
              to="/profile/verification"
              className="w-full zn-btn-secondary text-xs py-2.5 flex items-center justify-center gap-1.5"
            >
              <span>Manage Trust Badges</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Curated Portfolio & Resume Shortcut */}
          <div className="rounded-3xl border border-white/[0.08] bg-[#0A0F18]/90 backdrop-blur-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Layers className="w-5 h-5 text-brand-yellow" />
                <h3 className="font-heading font-bold text-white text-base">
                  Portfolio & Artifacts
                </h3>
              </div>
              <Link
                to="/profile/portfolio"
                className="text-xs font-semibold text-brand-yellow hover:underline inline-flex items-center gap-1"
              >
                View
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <p className="text-xs text-text-muted leading-relaxed">
              Curate your engineering work samples, design packages, and resume PDF for recruiters.
            </p>

            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
              <span className="text-xs font-mono text-text-secondary">Curated Works</span>
              <span className="text-sm font-bold font-mono text-white">
                {projectsList.length} items
              </span>
            </div>

            <Link
              to="/profile/portfolio"
              className="w-full zn-btn-secondary text-xs py-2.5 flex items-center justify-center gap-1.5"
            >
              <span>Open Portfolio Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Learning & Coursework Progress */}
          <div className="rounded-3xl border border-white/[0.08] bg-[#0A0F18]/90 backdrop-blur-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-5 h-5 text-sky-400" />
                <h3 className="font-heading font-bold text-white text-base">
                  Course Progression
                </h3>
              </div>
              <Link
                to="/my-learning"
                className="text-xs font-semibold text-sky-400 hover:underline inline-flex items-center gap-1"
              >
                All Courses
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center">
                <span className="text-xl font-bold font-heading text-white block">
                  {gamification.completedCourses || 0}
                </span>
                <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
                  Courses Done
                </span>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center">
                <span className="text-xl font-bold font-heading text-sky-400 block">
                  {gamification.completedClasses || 0}
                </span>
                <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
                  Lectures Done
                </span>
              </div>
            </div>
          </div>

          {/* Gamification Achievements Grid */}
          <AchievementsGrid profile={profile} />

          {/* Account Security & Sign Out Section */}
          <div className="p-5 rounded-3xl border border-white/[0.08] bg-white/[0.01] flex items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-heading font-bold text-white uppercase tracking-wider">
                Session Control
              </h4>
              <p className="text-[11px] text-text-muted mt-0.5">
                Securely sign out on this device
              </p>
            </div>
            <button
              type="button"
              onClick={() => (requestLogout ? requestLogout() : logout?.())}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-500/25 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold transition-all cursor-pointer focus-ring"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── MODALS ── */}
      <ShareProfileModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        profile={profile}
      />

      <ChangeUsernameModal
        isOpen={isChangeUsernameOpen}
        onClose={() => setIsChangeUsernameOpen(false)}
      />

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
        currentAvatarUrl={profile?.avatar ? getUploadUrl(profile.avatar) : null}
        userName={profile?.name || "Member"}
        userRole={profile?.currentRole || profile?.headline || "Infrastructure Professional"}
        isUploading={avatarMutation.isPending || bannerMutation.isPending}
      />

      <ProjectEditorModal
        isOpen={isProjectEditorOpen}
        onClose={() => {
          setIsProjectEditorOpen(false);
          setEditingProject(null);
        }}
        initialData={editingProject}
        onSave={(formData) => projectMutation.mutate(formData)}
        isPending={projectMutation.isPending}
      />
    </div>
  );
}