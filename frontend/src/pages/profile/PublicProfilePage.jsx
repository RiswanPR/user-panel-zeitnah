import { useEffect, useState, useContext } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Award,
  CheckCircle2,
  Copy,
  ExternalLink,
  Share2,
  ShieldCheck,
  User,
  ArrowLeft,
  MapPin,
  Briefcase,
  HeartHandshake,
  Check,
  X,
  Flag,
  Layers,
  Send,
  Lock,
} from "lucide-react";
import api from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import { useToast } from "../../components/ui/Toast";
import coreProfileService from "../../services/coreProfileService";
import projectsService from "../../services/projectsService";
import { isRecruiterOrFounder, isAdmin } from "../../utils/roleNavigation";

// Reusable Profile Components
import ProfileNav from "../../components/profile/ProfileNav";
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

export default function PublicProfilePage() {
  const { username: paramUsername } = useParams();
  const { user: authUser } = useContext(AuthContext);
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
    if (!recContent.trim() || recContent.trim().length < 20) {
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

  // ── SKELETON LOADING STATE ──
  if (loading) {
    return (
      <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto pb-16 animate-pulse">
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
        <div className="pt-2">
          <Link
            to="/profile"
            className="zn-btn-primary inline-flex items-center gap-2 py-3 px-6 text-xs uppercase tracking-wider cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Profile</span>
          </Link>
        </div>
      </div>
    );
  }

  // Privacy filters (respect user's privacySettings unless it's own profile)
  const isExpVisible = isOwnProfile || student.privacySettings?.experienceVisibility !== "PRIVATE";
  const isEduVisible = isOwnProfile || student.privacySettings?.educationVisibility !== "PRIVATE";
  const isProjectsVisible = isOwnProfile || student.privacySettings?.projectsVisibility !== "PRIVATE";
  const isCertVisible = isOwnProfile || student.privacySettings?.certificationsVisibility !== "PRIVATE";
  const canSendOpportunity = Boolean(authUser && isRecruiterOrFounder(authUser) && !isOwnProfile);

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto pb-20">
      {/* ── 01. NAVIGATION (Show if authenticated) ── */}
      {authUser && <ProfileNav />}

      {/* ── 02. EDITORIAL HERO ── */}
      <ProfileHero
        profile={student}
        isOwner={isOwnProfile}
        onShare={handleNativeShare}
        onSendMessage={() => {
          window.location.href = `/messages?user=${encodeURIComponent(student.username)}`;
        }}
        onSendOpportunity={canSendOpportunity ? () => setIsSendOpportunityOpen(true) : undefined}
        onWriteRecommendation={() => setIsWriteRecOpen(true)}
        onReport={() => setIsReportOpen(true)}
      />

      {/* ── 03. IN-PAGE SECTION JUMP ANCHORS ── */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        {[
          { id: "all", label: "Full Profile" },
          { id: "about", label: "Story" },
          ...(isExpVisible ? [{ id: "experience", label: "Experience" }] : []),
          ...(isEduVisible ? [{ id: "education", label: "Education" }] : []),
          { id: "skills", label: "Skills" },
          ...(isProjectsVisible ? [{ id: "projects", label: "Projects" }] : []),
          ...(isCertVisible ? [{ id: "certifications", label: "Certifications" }] : []),
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
            <ProfileAboutSection profile={student} isOwner={isOwnProfile} />
          )}

          {/* Career Experience Timeline (Subject to Privacy) */}
          {(activeSectionFilter === "all" || activeSectionFilter === "experience") && (
            isExpVisible ? (
              <ProfileExperienceSection
                experience={student.experience || []}
                isOwner={isOwnProfile}
              />
            ) : (
              <div className="p-6 rounded-3xl border border-white/[0.08] bg-white/[0.01] text-center">
                <Lock className="w-5 h-5 text-text-muted mx-auto mb-2" />
                <p className="text-xs text-text-muted">
                  Career experience is restricted by user privacy settings.
                </p>
              </div>
            )
          )}

          {/* Academic Background (Subject to Privacy) */}
          {(activeSectionFilter === "all" || activeSectionFilter === "education") && (
            isEduVisible ? (
              <ProfileEducationSection
                education={student.education || []}
                isOwner={isOwnProfile}
              />
            ) : (
              <div className="p-6 rounded-3xl border border-white/[0.08] bg-white/[0.01] text-center">
                <Lock className="w-5 h-5 text-text-muted mx-auto mb-2" />
                <p className="text-xs text-text-muted">
                  Education records are restricted by user privacy settings.
                </p>
              </div>
            )
          )}

          {/* Structured Skills & Software */}
          {(activeSectionFilter === "all" || activeSectionFilter === "skills") && (
            <ProfileSkillsSection
              skills={student.skills || []}
              structuredSkills={student.structuredSkills}
              isOwner={isOwnProfile}
            />
          )}

          {/* Featured Projects & Deliverables (Subject to Privacy) */}
          {(activeSectionFilter === "all" || activeSectionFilter === "projects") && (
            isProjectsVisible ? (
              <ProfileProjectsSection
                projects={projects}
                isOwner={isOwnProfile}
              />
            ) : (
              <div className="p-6 rounded-3xl border border-white/[0.08] bg-white/[0.01] text-center">
                <Lock className="w-5 h-5 text-text-muted mx-auto mb-2" />
                <p className="text-xs text-text-muted">
                  Projects are restricted by user privacy settings.
                </p>
              </div>
            )
          )}

          {/* Licenses & Certifications (Subject to Privacy) */}
          {(activeSectionFilter === "all" || activeSectionFilter === "certifications") && (
            isCertVisible ? (
              <ProfileCertificationsSection
                certifications={student.certifications || []}
                isOwner={isOwnProfile}
              />
            ) : (
              <div className="p-6 rounded-3xl border border-white/[0.08] bg-white/[0.01] text-center">
                <Lock className="w-5 h-5 text-text-muted mx-auto mb-2" />
                <p className="text-xs text-text-muted">
                  Certifications are restricted by user privacy settings.
                </p>
              </div>
            )
          )}

          {/* Peer & Mentor Recommendations */}
          {(activeSectionFilter === "all" || activeSectionFilter === "recommendations") && (
            <ProfileRecommendationsSection
              recommendations={student.recommendations || []}
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
                  <span className="text-[10px] text-text-muted font-mono">Unverified</span>
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
              className="w-full zn-btn-secondary text-xs py-2.5 flex items-center justify-center gap-2"
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
              className="w-full zn-btn-secondary text-xs py-2.5 flex items-center justify-center gap-1.5"
            >
              <span>View Full Portfolio</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Social Proof & Endorsement CTA */}
          <div className="rounded-3xl border border-white/[0.08] bg-gradient-to-br from-rose-500/10 via-transparent to-transparent p-6 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-rose-300">
              <HeartHandshake className="w-5 h-5" />
              <h4 className="text-sm font-heading font-bold text-white">
                Worked with {student.name.split(" ")[0]}?
              </h4>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              Endorse their infrastructure competencies, project leadership, or engineering execution.
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
        </div>
      </div>

      {/* ── WRITE RECOMMENDATION MODAL ── */}
      <AnimatePresence>
        {isWriteRecOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsWriteRecOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="relative w-full max-w-lg rounded-3xl bg-[#0F1724] border border-white/[0.12] p-6 sm:p-8 shadow-2xl z-10 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-300">
                    <HeartHandshake className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-white text-base">
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
                  className="p-1 rounded-lg text-text-muted hover:text-white hover:bg-white/[0.06] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitRecommendation} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                    Your Professional Relationship
                  </label>
                  <select
                    value={recRelationship}
                    onChange={(e) => setRecRelationship(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs focus:border-brand-mint outline-none transition-colors"
                  >
                    <option value="Peer / Student" className="bg-[#0F1724]">Peer / Student / Colleague</option>
                    <option value="Mentor" className="bg-[#0F1724]">Mentor / Senior Advisor</option>
                    <option value="Instructor" className="bg-[#0F1724]">Instructor / Professor</option>
                    <option value="Collaborator" className="bg-[#0F1724]">Project Collaborator / Partner</option>
                    <option value="Other" className="bg-[#0F1724]">Other Professional Relationship</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                    Endorsement Message
                  </label>
                  <textarea
                    rows={4}
                    value={recContent}
                    onChange={(e) => setRecContent(e.target.value)}
                    placeholder={`Describe your experience working with ${student.name}, their technical strengths, and project impact...`}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs placeholder:text-text-muted/60 focus:border-brand-mint outline-none transition-colors resize-none"
                    maxLength={1000}
                  />
                  <span className="text-[10px] text-text-muted block text-right mt-1">
                    {recContent.length} / 1000 characters (min 20)
                  </span>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsWriteRecOpen(false)}
                    className="px-4 py-2 rounded-xl border border-white/10 text-text-muted hover:text-white text-xs font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingRec || recContent.trim().length < 20}
                    className="zn-btn-primary text-xs px-5 py-2.5 cursor-pointer disabled:opacity-50"
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
