import { useEffect, useState, useContext, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Copy,
  ExternalLink,
  ShieldCheck,
  User,
  HeartHandshake,
  Check,
  X,
  Flag,
  Layers,
  Lock,
  Sparkles,
} from "lucide-react";
import api from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import { useToast } from "../../components/ui/Toast";
import coreProfileService from "../../services/coreProfileService";
import projectsService from "../../services/projectsService";
import { isRecruiterOrFounder } from "../../utils/roleNavigation";

// Reusable Profile Components
import ProfileHero from "../../components/profile/ProfileHero";
import ProfileAboutSection from "../../components/profile/ProfileAboutSection";
import ProfileExperienceSection from "../../components/profile/ProfileExperienceSection";
import ProfileEducationSection from "../../components/profile/ProfileEducationSection";
import ProfileSkillsSection from "../../components/profile/ProfileSkillsSection";
import ProfileProjectsSection from "../../components/profile/ProfileProjectsSection";
import ProfileCertificationsSection from "../../components/profile/ProfileCertificationsSection";
import ProfileRecommendationsSection from "../../components/profile/ProfileRecommendationsSection";

// Modals
import ShareProfileModal from "../../components/profile/ShareProfileModal";
import ReportModal from "../../components/network/ReportModal";
import SendOpportunityModal from "../../components/opportunities/SendOpportunityModal";

/**
 * Zeitnah Public Profile Page ("Zeitnah Professional Identity")
 * A high-trust, editorial, and sophisticated identity showcase designed for
 * visitors, recruiters, and colleagues within the connected Zeitnah ecosystem.
 */
export default function PublicProfilePage() {
  const { username: paramUsername } = useParams();
  const { user: authUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const toast = useToast();

  const targetUsername = paramUsername || authUser?.username;

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [projects, setProjects] = useState([]);
  const [activeSectionFilter, setActiveSectionFilter] = useState("all");

  // Modals
  const [isSendOpportunityOpen, setIsSendOpportunityOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isWriteRecOpen, setIsWriteRecOpen] = useState(false);
  const [recRelationship, setRecRelationship] = useState("Peer / Student");
  const [recContent, setRecContent] = useState("");
  const [isSubmittingRec, setIsSubmittingRec] = useState(false);

  // Background scroll lock when modals are open
  useEffect(() => {
    if (isWriteRecOpen || isShareOpen || isReportOpen || isSendOpportunityOpen) {
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [isWriteRecOpen, isShareOpen, isReportOpen, isSendOpportunityOpen]);

  const isOwnProfile = Boolean(
    authUser &&
      student &&
      (authUser.username?.toLowerCase() === student.username?.toLowerCase() ||
        authUser.id === student.id ||
        authUser._id === student.id ||
        authUser.userId === student.id)
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
          const userObj = res.data.user;
          if (Array.isArray(res.data.recommendations)) {
            userObj.recommendations = res.data.recommendations;
          }
          setStudent(userObj);
          setAvatarError(false);

          document.title = `${userObj.name} (@${userObj.username}) — Zeitnah Verified Profile`;

          // Load user projects
          const userId = userObj.id || userObj._id;
          if (userId) {
            projectsService
              .getUserProjects(userId)
              .then((data) => {
                if (mounted && Array.isArray(data)) setProjects(data);
              })
              .catch(() => {});
          }
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

  // Smart Back navigation: preserves session history or falls back safely to /network
  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate("/network");
    }
  };

  const handleCopyProfileLink = () => {
    const url = `${window.location.origin}/u/${encodeURIComponent(student?.username || "")}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    toast.success("Profile link copied", "Public URL copied to clipboard.");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleNativeShare = async () => {
    if (!student) return;
    const shareUrl = `${window.location.origin}/u/${encodeURIComponent(student.username)}`;
    const shareData = {
      title: `${student.name} — Zeitnah Infrastructure Profile`,
      text: `View ${student.name}'s verified infrastructure credentials and deliverables on Zeitnah.`,
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

  const handleSubmitRecommendation = async (e) => {
    e.preventDefault();
    if (!recContent.trim() || recContent.trim().length < 20 || isSubmittingRec) {
      return toast.error("Too short", "Endorsement must be at least 20 characters.");
    }

    try {
      setIsSubmittingRec(true);
      await coreProfileService.submitRecommendation({
        recipientId: student.id || student._id,
        relationship: recRelationship,
        content: recContent.trim(),
      });
      toast.success(
        "Endorsement submitted",
        `Your recommendation was submitted to ${student.name} for review.`
      );
      setIsWriteRecOpen(false);
      setRecContent("");
    } catch (err) {
      toast.error(
        "Submission failed",
        err.response?.data?.message || "Could not submit endorsement."
      );
    } finally {
      setIsSubmittingRec(false);
    }
  };

  // Privacy filters (respect user's privacySettings unless it's own profile)
  const isExpVisible = isOwnProfile || student?.privacySettings?.experienceVisibility !== "PRIVATE";
  const isEduVisible = isOwnProfile || student?.privacySettings?.educationVisibility !== "PRIVATE";
  const isProjectsVisible = isOwnProfile || student?.privacySettings?.projectsVisibility !== "PRIVATE";
  const isCertVisible = isOwnProfile || student?.privacySettings?.certificationsVisibility !== "PRIVATE";
  const canSendOpportunity = Boolean(authUser && isRecruiterOrFounder(authUser) && !isOwnProfile);

  // Dynamically compute available sections based strictly on actual populated data
  const availableSections = useMemo(() => {
    if (!student) return [];
    return [
      { id: "all", label: "Full Profile" },
      ...(student.bio || student.headline ? [{ id: "about", label: "Story" }] : []),
      ...(isExpVisible && student.experience?.length > 0 ? [{ id: "experience", label: "Experience" }] : []),
      ...(isEduVisible && student.education?.length > 0 ? [{ id: "education", label: "Education" }] : []),
      ...((student.skills?.length > 0 || student.structuredSkills) ? [{ id: "skills", label: "Skills" }] : []),
      ...(isProjectsVisible && projects.length > 0 ? [{ id: "projects", label: "Projects" }] : []),
      ...(isCertVisible && student.certifications?.length > 0 ? [{ id: "certifications", label: "Certifications" }] : []),
      ...(student.recommendations?.length > 0 ? [{ id: "recommendations", label: "Endorsements" }] : []),
    ];
  }, [student, isExpVisible, isEduVisible, isProjectsVisible, isCertVisible, projects]);

  // ── SKELETON LOADING STATE ──
  if (loading) {
    return (
      <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto pb-16 animate-pulse">
        <div className="h-10 w-28 bg-white/[0.04] rounded-xl border border-white/[0.06]" />
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

  // ── NOT FOUND STATE ──
  if (notFound || !student) {
    return (
      <div className="max-w-2xl mx-auto py-24 px-4 text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto shadow-sm">
          <User className="w-8 h-8" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-heading font-black text-white tracking-tight">
          Profile Not Found
        </h2>
        <p className="text-sm text-text-muted leading-relaxed max-w-md mx-auto">
          The requested profile @{targetUsername} either does not exist, has changed handles, or has not been published yet.
        </p>
        <div className="pt-2 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="zn-btn-secondary inline-flex items-center gap-2 py-2.5 px-5 text-xs font-semibold cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Back</span>
          </button>
          <Link
            to="/network"
            className="zn-btn-primary inline-flex items-center gap-2 py-2.5 px-5 text-xs font-semibold cursor-pointer"
          >
            <span>Explore Network</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto pb-20">
      {/* ── 00. CONTEXTUAL BACK CONTROL & BREADCRUMB ── */}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/20 text-white text-xs font-semibold transition-all cursor-pointer shadow-sm group focus-ring touch-manipulation select-none"
          aria-label="Go back to previous page"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-brand-mint transition-transform group-hover:-translate-x-0.5" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2 text-xs text-text-muted">
          <span className="hidden sm:inline">Zeitnah Professional Identity</span>
          <span className="text-white/20 hidden sm:inline">•</span>
          <span className="font-mono text-brand-mint/90 font-medium">@{student.username}</span>
        </div>
      </div>

      {/* ── 01. OWNER PREVIEW BANNER ── */}
      {isOwnProfile && (
        <div className="flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-brand-mint/10 border border-brand-mint/25 text-white shadow-sm">
          <div className="flex items-center gap-2.5 min-w-0">
            <Sparkles className="w-4 h-4 text-brand-mint shrink-0" />
            <span className="text-xs text-white/90 truncate">
              You are viewing your public identity as others see it.
            </span>
          </div>
          <Link
            to="/profile/edit"
            className="zn-btn-primary text-xs py-1.5 px-3 shrink-0 font-semibold cursor-pointer whitespace-nowrap"
          >
            Edit in Studio →
          </Link>
        </div>
      )}

      {/* ── 02. EDITORIAL HERO ── */}
      <ProfileHero
        profile={student}
        isOwner={isOwnProfile}
        avatarError={avatarError}
        setAvatarError={setAvatarError}
        onShare={handleNativeShare}
        onSendMessage={() => {
          navigate(`/messages?user=${encodeURIComponent(student.username)}`);
        }}
        onSendOpportunity={canSendOpportunity ? () => setIsSendOpportunityOpen(true) : undefined}
        onWriteRecommendation={() => setIsWriteRecOpen(true)}
        onReport={() => setIsReportOpen(true)}
      />

      {/* ── 03. IN-PAGE SECTION JUMP ANCHORS (Only visible if multiple populated sections exist) ── */}
      {availableSections.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {availableSections.map((sec) => (
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
      )}

      {/* ── 04. EXPANSIVE DUAL-COLUMN LAYOUT ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
        {/* ── LEFT / MAIN CONTENT COLUMN (8 Cols) ── */}
        <div className="lg:col-span-8 space-y-6 sm:space-y-8 min-w-0">
          {/* About / Professional Story */}
          {(activeSectionFilter === "all" || activeSectionFilter === "about") &&
            (student.bio || student.headline) && (
              <ProfileAboutSection profile={student} isOwner={isOwnProfile} />
            )}

          {/* Career Experience Timeline (Subject to Privacy & Data Presence) */}
          {(activeSectionFilter === "all" || activeSectionFilter === "experience") && (
            isExpVisible ? (
              student.experience?.length > 0 && (
                <ProfileExperienceSection
                  experience={student.experience}
                  isOwner={isOwnProfile}
                />
              )
            ) : (
              activeSectionFilter === "experience" && (
                <div className="p-6 rounded-3xl border border-white/[0.08] bg-white/[0.01] text-center">
                  <Lock className="w-5 h-5 text-text-muted mx-auto mb-2" />
                  <p className="text-xs text-text-muted">
                    Career experience is restricted by user privacy settings.
                  </p>
                </div>
              )
            )
          )}

          {/* Academic Background (Subject to Privacy & Data Presence) */}
          {(activeSectionFilter === "all" || activeSectionFilter === "education") && (
            isEduVisible ? (
              student.education?.length > 0 && (
                <ProfileEducationSection
                  education={student.education}
                  isOwner={isOwnProfile}
                />
              )
            ) : (
              activeSectionFilter === "education" && (
                <div className="p-6 rounded-3xl border border-white/[0.08] bg-white/[0.01] text-center">
                  <Lock className="w-5 h-5 text-text-muted mx-auto mb-2" />
                  <p className="text-xs text-text-muted">
                    Education records are restricted by user privacy settings.
                  </p>
                </div>
              )
            )
          )}

          {/* Structured Skills & Software */}
          {(activeSectionFilter === "all" || activeSectionFilter === "skills") &&
            (student.skills?.length > 0 || student.structuredSkills) && (
              <ProfileSkillsSection
                skills={student.skills || []}
                structuredSkills={student.structuredSkills}
                isOwner={isOwnProfile}
              />
            )}

          {/* Featured Projects & Deliverables (Subject to Privacy & Data Presence) */}
          {(activeSectionFilter === "all" || activeSectionFilter === "projects") && (
            isProjectsVisible ? (
              projects.length > 0 && (
                <ProfileProjectsSection
                  projects={projects}
                  isOwner={isOwnProfile}
                />
              )
            ) : (
              activeSectionFilter === "projects" && (
                <div className="p-6 rounded-3xl border border-white/[0.08] bg-white/[0.01] text-center">
                  <Lock className="w-5 h-5 text-text-muted mx-auto mb-2" />
                  <p className="text-xs text-text-muted">
                    Projects are restricted by user privacy settings.
                  </p>
                </div>
              )
            )
          )}

          {/* Licenses & Certifications (Subject to Privacy & Data Presence) */}
          {(activeSectionFilter === "all" || activeSectionFilter === "certifications") && (
            isCertVisible ? (
              student.certifications?.length > 0 && (
                <ProfileCertificationsSection
                  certifications={student.certifications}
                  isOwner={isOwnProfile}
                />
              )
            ) : (
              activeSectionFilter === "certifications" && (
                <div className="p-6 rounded-3xl border border-white/[0.08] bg-white/[0.01] text-center">
                  <Lock className="w-5 h-5 text-text-muted mx-auto mb-2" />
                  <p className="text-xs text-text-muted">
                    Certifications are restricted by user privacy settings.
                  </p>
                </div>
              )
            )
          )}

          {/* Peer & Mentor Recommendations */}
          {(activeSectionFilter === "all" || activeSectionFilter === "recommendations") &&
            student.recommendations?.length > 0 && (
              <ProfileRecommendationsSection
                recommendations={student.recommendations}
                isOwner={isOwnProfile}
                onWriteRecommendation={() => setIsWriteRecOpen(true)}
              />
            )}
        </div>

        {/* ── RIGHT STRATEGIC SIDEBAR (4 Cols) ── */}
        <div className="lg:col-span-4 space-y-6 sm:space-y-8">
          {/* Trust & Verified Credentials Card */}
          <div className="rounded-3xl border border-white/[0.08] bg-[#0A0F18]/90 backdrop-blur-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-brand-mint" />
              <h3 className="font-heading font-bold text-white text-base">
                Verified Credentials
              </h3>
            </div>

            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <span className="text-xs font-medium text-white/90">Identity Status</span>
                {student.isVerified ? (
                  <span className="px-2 py-0.5 rounded-full bg-brand-mint/10 border border-brand-mint/25 text-[10px] font-bold text-brand-mint">
                    Verified ✓
                  </span>
                ) : (
                  <span className="text-[10px] text-text-muted font-mono">Standard Member</span>
                )}
              </div>

              {student.verifications?.professional?.status === "VERIFIED" && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <span className="text-xs font-medium text-white/90">Council Licensure</span>
                  <span className="px-2 py-0.5 rounded-full bg-brand-yellow/10 border border-brand-yellow/25 text-[10px] font-bold text-brand-yellow">
                    Council Certified ✓
                  </span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleCopyProfileLink}
              className="w-full zn-btn-secondary text-xs py-2.5 flex items-center justify-center gap-2 cursor-pointer font-semibold"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-brand-mint" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? "Profile Link Copied!" : "Copy Profile Link"}</span>
            </button>
          </div>

          {/* Curated Portfolio Link */}
          <div className="rounded-3xl border border-white/[0.08] bg-[#0A0F18]/90 backdrop-blur-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5">
              <Layers className="w-5 h-5 text-brand-yellow" />
              <h3 className="font-heading font-bold text-white text-base">
                Portfolio Showcase
              </h3>
            </div>

            <p className="text-xs text-text-muted leading-relaxed">
              Explore {student.name}'s curated engineering deliverables, calculation notes, and resume.
            </p>

            <Link
              to={`/u/${encodeURIComponent(student.username)}/portfolio`}
              className="w-full zn-btn-secondary text-xs py-2.5 flex items-center justify-center gap-1.5 cursor-pointer font-semibold"
            >
              <span>View Full Portfolio</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Social Proof & Endorsement CTA */}
          {!isOwnProfile && (
            <div className="rounded-3xl border border-white/[0.08] bg-gradient-to-br from-rose-500/10 via-transparent to-transparent p-6 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-rose-300">
                <HeartHandshake className="w-5 h-5" />
                <h4 className="text-sm font-heading font-bold text-white">
                  Worked with {student.name?.split(" ")[0]}?
                </h4>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                Endorse their infrastructure competencies, technical leadership, or project delivery.
              </p>
              <button
                type="button"
                onClick={() => setIsWriteRecOpen(true)}
                className="w-full py-2.5 px-4 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/30 text-rose-200 text-xs font-semibold transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
              >
                <HeartHandshake className="w-3.5 h-3.5" />
                <span>Write Recommendation</span>
              </button>
            </div>
          )}

          {/* Flag Report Action (Quiet & respectful) */}
          {!isOwnProfile && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setIsReportOpen(true)}
                className="inline-flex items-center gap-1.5 text-[11px] text-text-muted hover:text-red-400 transition-colors py-1.5 px-3 rounded-lg hover:bg-red-500/10 cursor-pointer"
              >
                <Flag className="w-3.5 h-3.5" />
                <span>Report Profile</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── WRITE RECOMMENDATION MODAL ── */}
      <AnimatePresence>
        {isWriteRecOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="endorse-modal-title"
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-[2px] animate-fade-in"
            onClick={(e) => {
              if (e.target === e.currentTarget && !isSubmittingRec) {
                setIsWriteRecOpen(false);
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="relative w-full max-sm:rounded-t-3xl max-sm:rounded-b-none sm:rounded-3xl sm:max-w-lg bg-[#0F1724] border border-white/[0.12] p-6 sm:p-8 shadow-2xl z-10 space-y-5 max-sm:max-h-[90vh] overflow-y-auto"
            >
              <div className="w-10 h-1 rounded-full bg-white/20 mx-auto -mt-2 mb-2 sm:hidden" />

              <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-300">
                    <HeartHandshake className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 id="endorse-modal-title" className="font-heading font-bold text-white text-base">
                      Endorse {student.name}
                    </h3>
                    <p className="text-xs text-text-muted">
                      Your recommendation will be sent for review
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsWriteRecOpen(false)}
                  disabled={isSubmittingRec}
                  aria-label="Close dialog"
                  className="p-1 rounded-lg text-text-muted hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer disabled:opacity-40"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitRecommendation} className="space-y-4">
                <div>
                  <label
                    htmlFor="endorse-relationship"
                    className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5"
                  >
                    Your Professional Relationship
                  </label>
                  <select
                    id="endorse-relationship"
                    value={recRelationship}
                    onChange={(e) => setRecRelationship(e.target.value)}
                    disabled={isSubmittingRec}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs focus:border-brand-mint outline-none transition-colors cursor-pointer"
                  >
                    <option value="Peer / Student" className="bg-[#0F1724]">Peer / Student / Colleague</option>
                    <option value="Mentor" className="bg-[#0F1724]">Mentor / Senior Advisor</option>
                    <option value="Instructor" className="bg-[#0F1724]">Instructor / Professor</option>
                    <option value="Collaborator" className="bg-[#0F1724]">Project Collaborator / Partner</option>
                    <option value="Other" className="bg-[#0F1724]">Other Professional Relationship</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="endorse-content"
                      className="block text-xs font-semibold text-text-secondary uppercase tracking-wider"
                    >
                      Endorsement Message
                    </label>
                    <span className="text-[10px] text-text-muted font-mono">
                      {recContent.length} / 1000 (min 20)
                    </span>
                  </div>
                  <textarea
                    id="endorse-content"
                    rows={4}
                    value={recContent}
                    onChange={(e) => setRecContent(e.target.value)}
                    disabled={isSubmittingRec}
                    placeholder={`Describe your experience working with ${student.name}, their technical strengths, and project impact...`}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs placeholder:text-text-muted/60 focus:border-brand-mint outline-none transition-colors resize-none"
                    maxLength={1000}
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsWriteRecOpen(false)}
                    disabled={isSubmittingRec}
                    className="px-4 py-2 rounded-xl border border-white/10 text-text-muted hover:text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingRec || recContent.trim().length < 20}
                    className="zn-btn-primary text-xs px-5 py-2.5 cursor-pointer disabled:opacity-50 font-semibold"
                  >
                    {isSubmittingRec ? "Submitting..." : "Send Endorsement"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODALS ── */}
      <ShareProfileModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        profile={student}
      />

      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        targetType="USER"
        targetId={student.id || student._id}
        targetName={student.name}
      />

      <SendOpportunityModal
        isOpen={isSendOpportunityOpen}
        onClose={() => setIsSendOpportunityOpen(false)}
        candidateId={student.id || student._id}
        candidateName={student.name}
      />
    </div>
  );
}
