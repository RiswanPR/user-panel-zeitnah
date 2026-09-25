import { useEffect, useState, useContext } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Award,
  CheckCircle2,
  Copy,
  Edit3,
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
  Building,
  Hammer,
  Cpu,
  Code2,
  GraduationCap,
  Calendar,
  Lock,
  BookOpen,
  Sparkles,
} from "lucide-react";
import api from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import { useToast } from "../../components/ui/Toast";
import ShareProfileModal from "../../components/profile/ShareProfileModal";
import ProfileNav from "../../components/profile/ProfileNav";
import { getUploadUrl } from "../../utils/courseUi";
import EcosystemRoleBadge from "../../components/network/EcosystemRoleBadge";
import AvailabilityBadge from "../../components/network/AvailabilityBadge";
import ReportModal from "../../components/network/ReportModal";
import projectsService from "../../services/projectsService";
import ProfileNetworkStats from "../../components/network/ProfileNetworkStats";

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

  // Recommendation submission modal
  const [isWriteRecOpen, setIsWriteRecOpen] = useState(false);
  const [recRelationship, setRecRelationship] = useState("Peer / Student");
  const [recContent, setRecContent] = useState("");
  const [isSubmittingRec, setIsSubmittingRec] = useState(false);

  // Report modal state
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [projects, setProjects] = useState([]);

  // Background scroll lock when modal is open
  useEffect(() => {
    if (isWriteRecOpen || isShareOpen || isReportOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isWriteRecOpen, isShareOpen, isReportOpen]);

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
          setStudent(userObj);
          setAvatarError(false);

          document.title = `${userObj.name} (@${userObj.username}) — Zeitnah Infrastructure Profile`;

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
    toast.success("Profile link copied", "Shareable URL copied to clipboard.");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleNativeShare = async () => {
    if (!student) return;
    const shareUrl = `${window.location.origin}/u/${encodeURIComponent(student.username)}`;
    const shareData = {
      title: `${student.name} — Zeitnah Infrastructure Identity`,
      text: `View ${student.name}'s verified infrastructure profile on Zeitnah LMS Network.`,
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
      await api.post(`/profile/u/${encodeURIComponent(student.username)}/recommend`, {
        relationship: recRelationship,
        content: recContent.trim(),
      });
      toast.success(
        "Endorsement submitted",
        `Your recommendation was sent to ${student.name} for review.`
      );
      setIsWriteRecOpen(false);
      setRecContent("");
    } catch (err) {
      toast.error("Failed to submit", err.response?.data?.message || "Could not submit endorsement.");
    } finally {
      setIsSubmittingRec(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto pb-16 animate-pulse">
        <div className="h-64 sm:h-80 rounded-3xl bg-bg-card border border-border-default" />
        <div className="h-44 rounded-3xl bg-bg-card border border-border-default" />
        <div className="h-64 rounded-3xl bg-bg-card border border-border-default" />
      </div>
    );
  }

  if (notFound || !student) {
    return (
      <div className="max-w-2xl mx-auto py-20 px-4 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-danger/10 border border-danger/20 text-danger flex items-center justify-center mx-auto">
          <User className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-heading font-extrabold text-white">
          Infrastructure Profile Not Found
        </h2>
        <p className="text-sm text-text-muted leading-relaxed max-w-md mx-auto">
          The requested profile @{targetUsername} either does not exist, has changed handle, or has not been published.
        </p>
        <div className="pt-2">
          <Link
            to="/profile"
            className="btn-primary inline-flex items-center gap-2 py-3 px-6 text-xs uppercase tracking-wider cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to My Profile
          </Link>
        </div>
      </div>
    );
  }

  const avatarUrl = getUploadUrl(student.avatar);
  const bannerUrl = getUploadUrl(student.backgroundImage);
  const initials = student.name
    ? student.name
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U";

  const gamification = student.gamification || {};
  const structuredSkills = student.structuredSkills || {};
  const hasStructuredSkills =
    structuredSkills.software?.length > 0 ||
    structuredSkills.technical?.length > 0 ||
    structuredSkills.industry?.length > 0 ||
    structuredSkills.professional?.length > 0;

  // Privacy filters (respect user's privacySettings unless it's own profile)
  const isExpVisible = isOwnProfile || student.privacySettings?.experienceVisibility !== "PRIVATE";
  const isEduVisible = isOwnProfile || student.privacySettings?.educationVisibility !== "PRIVATE";
  const isProjectsVisible = isOwnProfile || student.privacySettings?.projectsVisibility !== "PRIVATE";
  const isCertVisible = isOwnProfile || student.privacySettings?.certificationsVisibility !== "PRIVATE";

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto pb-16">
      {/* ── Sub-Navigation Bar ── */}
      <ProfileNav />

      {/* ── 01. PROFILE HEADER: HERO, ROLE & HEADLINE ── */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative overflow-hidden rounded-3xl bg-bg-card border border-border-default shadow-sm"
      >
        <div className="gradient-line-top" />

        {/* Cover Banner */}
        <div className="relative h-48 sm:h-60 md:h-72 w-full overflow-hidden">
          {bannerUrl ? (
            <img
              src={bannerUrl}
              alt="Cover Banner"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full relative overflow-hidden bg-gradient-to-br from-[#0c1520] via-[#080d14] to-[#04070a] flex items-center justify-center">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(159,213,178,0.12),rgba(255,255,255,0))]" />
              <div className="text-center opacity-30 select-none">
                <span className="font-mono text-xs uppercase tracking-[0.25em] text-brand-mint font-semibold">
                  Zeitnah Infrastructure Network
                </span>
              </div>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-bg-card via-black/35 to-transparent pointer-events-none" />
        </div>

        {/* Hero Identity Body */}
        <div className="relative px-6 sm:px-10 pb-8 sm:pb-10 pt-0">
          <div className="flex flex-col md:flex-row items-center md:items-end justify-between gap-6 -mt-16 sm:-mt-20">
            {/* Avatar & Identifiers */}
            <div className="flex flex-col md:flex-row items-center md:items-end gap-5 text-center md:text-left">
              <div className="relative shrink-0">
                <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl overflow-hidden border-4 border-bg-card bg-bg-elevated shadow-xl flex items-center justify-center ring-1 ring-white/10">
                  {avatarUrl && !avatarError ? (
                    <img
                      src={avatarUrl}
                      alt={student.name}
                      onError={() => setAvatarError(true)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-mint/15 to-brand-navy/50 text-brand-mint font-heading font-black text-3xl sm:text-4xl">
                      {initials}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1.5 pb-1">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
                  <h1 className="font-heading font-black text-2xl sm:text-3xl lg:text-4xl text-white tracking-tight leading-tight break-words">
                    {student.name}
                  </h1>
                  {student.isVerified && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-brand-mint/25 bg-brand-mint/10 px-2.5 py-0.5 text-xs font-bold text-brand-mint">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Verified
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-center md:justify-start gap-2">
                  <span className="font-mono text-sm sm:text-base font-bold text-brand-mint">
                    @{student.username}
                  </span>
                </div>

                {/* Ecosystem Role & Availability Badges */}
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-1">
                  <EcosystemRoleBadge role={student.primaryRole || "STUDENT"} size="sm" />
                  <AvailabilityBadge availability={student.availability} size="sm" />
                  {student.yearsOfExperience > 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-white/10 bg-white/[0.04] text-[11px] font-mono font-medium text-white/90">
                      {student.yearsOfExperience}+ Years Exp
                    </span>
                  )}
                </div>

                {/* Professional Headline */}
                {student.headline && (
                  <p className="text-sm sm:text-base font-medium text-white/90 max-w-xl leading-relaxed break-words pt-0.5">
                    {student.headline}
                  </p>
                )}

                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-xs text-text-muted pt-1">
                  {student.currentRole && (
                    <span className="inline-flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-text-faint" />
                      {student.currentRole}
                    </span>
                  )}
                  {student.location && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-text-faint" />
                      {student.location}
                    </span>
                  )}
                </div>

                {/* Network Statistics */}
                <div className="pt-3 w-full max-w-md">
                  <ProfileNetworkStats
                    userIdOrUsername={student.id || student._id || student.username}
                    profileName={student.name}
                  />
                </div>
              </div>
            </div>

            {/* Level, Rank, XP Badges and CTAs */}
            <div className="flex flex-col items-center md:items-end gap-4 shrink-0 w-full md:w-auto">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-xl border border-brand-yellow/20 bg-brand-yellow/10 text-xs font-bold font-mono text-brand-yellow uppercase tracking-wider">
                  LEVEL {gamification.level || 1}
                </span>
                <span className="px-3 py-1.5 rounded-xl border border-brand-mint/20 bg-brand-mint/10 text-xs font-bold uppercase tracking-wider text-brand-mint">
                  {gamification.rank || "Explorer"}
                </span>
                <span className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.03] text-xs font-bold font-mono text-white">
                  {gamification.totalPoints || 0} XP
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-center">
                {isOwnProfile ? (
                  <Link
                    to="/profile/edit"
                    className="btn-primary text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 py-3 px-5 min-h-[44px] cursor-pointer shadow-md flex-1 sm:flex-initial"
                  >
                    <Edit3 className="w-4 h-4" />
                    Edit Profile
                  </Link>
                ) : authUser ? (
                  <button
                    type="button"
                    onClick={() => setIsWriteRecOpen(true)}
                    className="btn-primary text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 py-3 px-5 min-h-[44px] cursor-pointer shadow-md flex-1 sm:flex-initial"
                  >
                    <HeartHandshake className="w-4 h-4" />
                    Endorse
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={handleCopyProfileLink}
                  className="btn-secondary text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 py-3 px-4 min-h-[44px] cursor-pointer flex-1 sm:flex-initial"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-brand-mint" /> : <Copy className="w-4 h-4" />}
                  {copiedLink ? "Copied" : "Copy Link"}
                </button>

                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl border border-border-default bg-white/[0.02] hover:bg-white/[0.05] text-text-muted hover:text-white transition-colors cursor-pointer shrink-0"
                  title="Share profile"
                  aria-label="Share profile"
                >
                  <Share2 className="w-4 h-4" />
                </button>

                {!isOwnProfile && (
                  <button
                    type="button"
                    onClick={() => setIsReportOpen(true)}
                    className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl border border-border-default bg-white/[0.02] hover:bg-rose-500/10 hover:border-rose-500/20 text-text-muted hover:text-rose-400 transition-colors cursor-pointer shrink-0"
                    title="Report profile"
                    aria-label="Report profile"
                  >
                    <Flag className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ── 02. ABOUT SECTION ── */}
      {student.bio ? (
        <section className="w-full rounded-3xl border border-border-default bg-bg-card p-6 sm:p-8 space-y-3 shadow-sm">
          <h2 className="text-base sm:text-lg font-heading font-extrabold text-white flex items-center gap-2">
            <span className="w-1.5 h-4 rounded-full bg-brand-mint shrink-0" />
            About
          </h2>
          <div className="w-full max-w-[72ch] text-left">
            <p className="text-sm sm:text-base text-text-secondary leading-relaxed sm:leading-loose whitespace-pre-wrap break-words font-normal">
              {student.bio}
            </p>
          </div>
        </section>
      ) : null}

      {/* ── 03. INFRASTRUCTURE EXPERTISE ── */}
      {(student.primaryDiscipline || student.infrastructureSectors?.length > 0 || student.specializations?.length > 0) && (
        <section className="rounded-3xl border border-border-default bg-bg-card p-6 sm:p-8 space-y-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-heading font-extrabold text-white flex items-center gap-2">
              <span className="w-1.5 h-4 rounded-full bg-brand-mint shrink-0" />
              Infrastructure Expertise
            </h2>
            {student.primaryDiscipline && (
              <span className="px-3 py-1 rounded-xl bg-brand-mint/15 border border-brand-mint/30 text-brand-mint text-xs font-bold">
                {student.primaryDiscipline}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
            {/* Sectors */}
            {student.infrastructureSectors?.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-text-secondary block">
                  Infrastructure Sectors
                </span>
                <div className="flex flex-wrap gap-2">
                  {student.infrastructureSectors.map((sector) => (
                    <span
                      key={sector}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs font-medium text-white shadow-sm"
                    >
                      <Building className="w-3.5 h-3.5 text-brand-mint" />
                      <span>{sector}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Specializations */}
            {student.specializations?.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-text-secondary block">
                  Engineering Specializations
                </span>
                <div className="flex flex-wrap gap-2">
                  {student.specializations.map((spec) => (
                    <span
                      key={spec}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-brand-mint/10 border border-brand-mint/20 text-xs font-medium text-brand-mint"
                    >
                      <Sparkles className="w-3 h-3 text-brand-yellow" />
                      <span>{spec}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Preferred Locations */}
          {student.preferredLocations?.length > 0 && (
            <div className="pt-3 border-t border-white/[0.04] space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-text-secondary block">
                Target Project / Work Locations
              </span>
              <div className="flex flex-wrap gap-2">
                {student.preferredLocations.map((loc) => (
                  <span
                    key={loc}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-white/[0.02] border border-white/[0.06] text-xs text-text-muted"
                  >
                    <MapPin className="w-3 h-3 text-brand-mint" />
                    <span>{loc}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── 04. SKILLS & SOFTWARE ── */}
      <section className="rounded-3xl border border-border-default bg-bg-card p-6 sm:p-8 space-y-5 shadow-sm">
        <h2 className="text-base sm:text-lg font-heading font-extrabold text-white flex items-center gap-2">
          <span className="w-1.5 h-4 rounded-full bg-brand-mint shrink-0" />
          Skills & Software Competencies
        </h2>

        {hasStructuredSkills ? (
          <div className="space-y-4">
            {/* Software Tools */}
            {structuredSkills.software?.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-brand-mint" />
                  Software & BIM Tools
                </span>
                <div className="flex flex-wrap gap-2">
                  {structuredSkills.software.map((tool) => (
                    <span
                      key={tool}
                      className="px-3 py-1.5 rounded-xl bg-brand-mint/10 border border-brand-mint/25 text-xs font-bold text-brand-mint"
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Technical Skills */}
            {structuredSkills.technical?.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5 text-brand-yellow" />
                  Technical & Engineering Calculations
                </span>
                <div className="flex flex-wrap gap-2">
                  {structuredSkills.technical.map((sk) => (
                    <span
                      key={sk}
                      className="px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs font-medium text-white"
                    >
                      {sk}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Industry Standards */}
            {structuredSkills.industry?.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                  <Hammer className="w-3.5 h-3.5 text-purple-300" />
                  Industry Frameworks & Codes
                </span>
                <div className="flex flex-wrap gap-2">
                  {structuredSkills.industry.map((ind) => (
                    <span
                      key={ind}
                      className="px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs font-medium text-text-secondary"
                    >
                      {ind}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Professional Leadership */}
            {structuredSkills.professional?.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-300" />
                  Professional & Management
                </span>
                <div className="flex flex-wrap gap-2">
                  {structuredSkills.professional.map((p) => (
                    <span
                      key={p}
                      className="px-3 py-1.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs font-medium text-text-muted"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : student.skills?.length > 0 ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {student.skills.map((skill) => (
              <span
                key={skill}
                className="px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs font-semibold text-white tracking-wide"
              >
                {skill}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-text-muted">No skills listed yet.</p>
        )}
      </section>

      {/* ── 05. EXPERIENCE ── */}
      {isExpVisible ? (
        <section className="rounded-3xl border border-border-default bg-bg-card p-6 sm:p-8 space-y-4 shadow-sm">
          <h2 className="text-base sm:text-lg font-heading font-extrabold text-white flex items-center gap-2">
            <span className="w-1.5 h-4 rounded-full bg-brand-mint" />
            Professional Experience
          </h2>

          {student.experience?.length > 0 ? (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-white/[0.08]">
              {student.experience.map((exp) => (
                <div key={exp.id} className="relative group">
                  <div className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-brand-mint border-2 border-bg-card shadow-sm ring-2 ring-brand-mint/20" />

                  <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-brand-mint uppercase tracking-wider">
                          {new Date(exp.startDate).getFullYear()} — {exp.currentlyActive ? "Present" : exp.endDate ? new Date(exp.endDate).getFullYear() : "Present"}
                        </span>
                        <span className="text-xs text-text-faint">•</span>
                        <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white/[0.04] text-text-muted">
                          {exp.employmentType}
                        </span>
                      </div>

                      {exp.infrastructureSector && (
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-brand-mint/10 border border-brand-mint/20 text-brand-mint font-medium">
                          {exp.infrastructureSector}
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-white leading-snug">{exp.role}</h3>
                    <div className="text-sm font-semibold text-text-secondary">
                      {exp.organization} {exp.location && `• ${exp.location}`}
                    </div>

                    {exp.description && (
                      <p className="text-xs text-text-secondary leading-relaxed pt-1 whitespace-pre-line">
                        {exp.description}
                      </p>
                    )}

                    {(exp.softwareUsed?.length > 0 || exp.skillsUsed?.length > 0) && (
                      <div className="flex flex-wrap gap-1.5 pt-2">
                        {exp.softwareUsed?.map((sw) => (
                          <span key={sw} className="px-2 py-0.5 rounded-md bg-brand-mint/10 text-[11px] text-brand-mint font-medium">
                            {sw}
                          </span>
                        ))}
                        {exp.skillsUsed?.map((sk) => (
                          <span key={sk} className="px-2 py-0.5 rounded-md bg-white/[0.04] text-[11px] text-text-secondary">
                            {sk}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center border border-dashed border-white/[0.06] rounded-2xl">
              <p className="text-xs text-text-muted">
                No professional experience shared on this profile.
              </p>
            </div>
          )}
        </section>
      ) : null}

      {/* ── 06. PROJECTS ── */}
      {isProjectsVisible ? (
        <section className="rounded-3xl border border-border-default bg-bg-card p-6 sm:p-8 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-heading font-extrabold text-white flex items-center gap-2">
              <span className="w-1.5 h-4 rounded-full bg-brand-mint" />
              Infrastructure Projects
            </h2>
            {isOwnProfile && (
              <Link
                to="/profile/edit?section=projects"
                className="text-xs font-semibold text-brand-mint hover:underline"
              >
                + Add Project
              </Link>
            )}
          </div>

          {projects && projects.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {projects.map((proj) => (
                <div
                  key={proj._id || proj.id}
                  className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] space-y-3 flex flex-col justify-between hover:border-brand-mint/30 transition-all shadow-sm"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono font-bold text-brand-mint uppercase tracking-wider">
                        {proj.infrastructureSector || "Infrastructure"}
                      </span>
                      {proj.projectType && (
                        <span className="text-[10px] uppercase font-bold text-white/80 bg-white/[0.04] px-2 py-0.5 rounded">
                          {proj.projectType}
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-white leading-snug">{proj.title}</h3>

                    {proj.role && (
                      <span className="text-xs font-medium text-text-secondary block">
                        Role: {proj.role} {proj.location && `• ${proj.location}`}
                      </span>
                    )}

                    {proj.description && (
                      <p className="text-xs text-text-secondary line-clamp-3 leading-relaxed">
                        {proj.description}
                      </p>
                    )}

                    {proj.responsibilities && (
                      <p className="text-[11px] text-text-muted line-clamp-2 italic">
                        {proj.responsibilities}
                      </p>
                    )}

                    {/* Software & Skills Used */}
                    {(proj.softwareUsed?.length > 0 || proj.skills?.length > 0) && (
                      <div className="flex flex-wrap gap-1.5 pt-2">
                        {proj.softwareUsed?.map((sw) => (
                          <span key={sw} className="px-2 py-0.5 rounded bg-brand-mint/10 text-[10px] text-brand-mint font-medium">
                            {sw}
                          </span>
                        ))}
                        {proj.skills?.map((sk, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded bg-white/[0.04] text-[10px] text-text-muted">
                            {sk}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {(proj.links?.githubUrl || proj.links?.liveDemoUrl) && (
                    <div className="pt-3 border-t border-white/[0.04] flex items-center gap-3">
                      {proj.links?.githubUrl && (
                        <a
                          href={proj.links.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-brand-mint hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          <span>Code</span>
                        </a>
                      )}
                      {proj.links?.liveDemoUrl && (
                        <a
                          href={proj.links.liveDemoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-brand-mint hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          <span>Case Study</span>
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center border border-dashed border-white/[0.06] rounded-2xl">
              <p className="text-xs text-text-muted">
                No infrastructure projects listed yet.
              </p>
            </div>
          )}
        </section>
      ) : null}

      {/* ── 07. EDUCATION ── */}
      {isEduVisible ? (
        <section className="rounded-3xl border border-border-default bg-bg-card p-6 sm:p-8 space-y-4 shadow-sm">
          <h2 className="text-base sm:text-lg font-heading font-extrabold text-white flex items-center gap-2">
            <span className="w-1.5 h-4 rounded-full bg-brand-mint" />
            Education & Degrees
          </h2>

          {student.education?.length > 0 ? (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-white/[0.08]">
              {student.education.map((edu) => (
                <div key={edu.id} className="relative group">
                  <div className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-brand-mint border-2 border-bg-card shadow-sm ring-2 ring-brand-mint/20" />

                  <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] space-y-1.5">
                    <span className="text-xs font-mono font-bold text-brand-mint uppercase tracking-wider">
                      {new Date(edu.startDate).getFullYear()} — {edu.currentlyStudying ? "Present" : edu.endDate ? new Date(edu.endDate).getFullYear() : "Present"}
                    </span>
                    <h3 className="text-base font-bold text-white leading-snug">{edu.institution}</h3>
                    <div className="text-sm font-semibold text-text-secondary">
                      {edu.qualification} {edu.fieldOfStudy && `• ${edu.fieldOfStudy}`}
                    </div>
                    {edu.description && (
                      <p className="text-xs text-text-secondary leading-relaxed pt-1">
                        {edu.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center border border-dashed border-white/[0.06] rounded-2xl">
              <p className="text-xs text-text-muted">No education credentials shared.</p>
            </div>
          )}
        </section>
      ) : null}

      {/* ── 08. LICENSES & CERTIFICATIONS ── */}
      {isCertVisible ? (
        <section className="rounded-3xl border border-border-default bg-bg-card p-6 sm:p-8 space-y-4 shadow-sm">
          <h2 className="text-base sm:text-lg font-heading font-extrabold text-white flex items-center gap-2">
            <span className="w-1.5 h-4 rounded-full bg-brand-mint" />
            Licenses & Certifications
          </h2>

          {student.certifications?.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {student.certifications.map((cert) => (
                <div
                  key={cert.id}
                  className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] space-y-2 flex flex-col justify-between shadow-sm"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold">
                      {cert.isVerified || cert.issuer?.toLowerCase().includes("zeitnah") ? (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5 text-brand-mint" />
                          <span className="text-brand-mint">Verified by Zeitnah</span>
                        </>
                      ) : (
                        <>
                          <Award className="w-3.5 h-3.5 text-text-muted" />
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white/[0.04] text-text-muted border border-white/[0.08]">
                            Unverified
                          </span>
                        </>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-white leading-snug break-words">{cert.name}</h3>
                    <div className="text-xs font-semibold text-text-secondary break-words">{cert.issuer}</div>
                    <div className="text-[11px] text-text-muted">
                      Issued {new Date(cert.issueDate).toLocaleDateString(undefined, { month: "short", year: "numeric" })}
                      {cert.expirationDate && ` • Expires ${new Date(cert.expirationDate).toLocaleDateString(undefined, { month: "short", year: "numeric" })}`}
                    </div>
                  </div>

                  {cert.credentialUrl && (
                    <div className="pt-2 border-t border-white/[0.04]">
                      <a
                        href={cert.credentialUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-brand-mint hover:underline font-semibold cursor-pointer"
                      >
                        <span>Verify Credential</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center border border-dashed border-white/[0.06] rounded-2xl">
              <p className="text-xs text-text-muted">No licenses or certifications shared.</p>
            </div>
          )}
        </section>
      ) : null}

      {/* ── 09. COURSES & ACADEMY LEARNING ── */}
      {student.courses?.length > 0 && (
        <section className="rounded-3xl border border-border-default bg-bg-card p-6 sm:p-8 space-y-4 shadow-sm">
          <h2 className="text-base sm:text-lg font-heading font-extrabold text-white flex items-center gap-2">
            <span className="w-1.5 h-4 rounded-full bg-brand-mint" />
            Academy Courses & Credentials
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
            {student.courses.map((course, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] space-y-1.5 shadow-sm"
              >
                <div className="w-8 h-8 rounded-xl bg-brand-mint/15 flex items-center justify-center text-brand-mint mb-2">
                  <BookOpen className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-bold text-white line-clamp-2">{course.title || course.name}</h4>
                <p className="text-xs text-text-muted">{course.category || "Infrastructure Course"}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── 10. ACHIEVEMENTS & GAMIFICATION ── */}
      {gamification.achievements?.length > 0 && (
        <section className="rounded-3xl border border-border-default bg-bg-card p-6 sm:p-8 space-y-4 shadow-sm">
          <h2 className="text-base sm:text-lg font-heading font-extrabold text-white flex items-center gap-2">
            <span className="w-1.5 h-4 rounded-full bg-brand-yellow" />
            Verified Achievements
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
            {gamification.achievements.map((ach) => (
              <div
                key={ach}
                className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center gap-3 shadow-sm"
              >
                <div className="w-9 h-9 rounded-xl bg-brand-yellow/10 border border-brand-yellow/20 flex items-center justify-center text-brand-yellow shrink-0">
                  <Award className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-white truncate">{ach}</h4>
                  <p className="text-[11px] text-text-muted truncate">Verified Platform Milestone</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── 11. RECOMMENDATIONS & ACTIVITY ── */}
      <section className="rounded-3xl border border-border-default bg-bg-card p-6 sm:p-8 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-heading font-extrabold text-white flex items-center gap-2">
            <span className="w-1.5 h-4 rounded-full bg-brand-mint" />
            Peer & Mentor Endorsements
          </h2>

          {!isOwnProfile && authUser && (
            <button
              type="button"
              onClick={() => setIsWriteRecOpen(true)}
              className="btn-secondary text-xs uppercase tracking-wider flex items-center gap-1.5 py-1.5 px-3 cursor-pointer shadow-sm"
            >
              <HeartHandshake className="w-3.5 h-3.5" />
              Write Endorsement
            </button>
          )}
        </div>

        {student.recommendations?.length > 0 ? (
          <div className="space-y-4 pt-1">
            {student.recommendations.map((rec) => (
              <div
                key={rec.id}
                className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] space-y-3 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-bg-elevated border border-white/10 flex items-center justify-center">
                    {rec.authorAvatar ? (
                      <img src={rec.authorAvatar} alt={rec.authorName} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-5 h-5 text-brand-mint" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{rec.authorName}</h4>
                    <p className="text-xs text-text-muted">
                      @{rec.authorUsername} • {rec.relationship}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-text-secondary leading-relaxed italic border-l-2 border-brand-mint/30 pl-3">
                  "{rec.content}"
                </p>

                <div className="text-[11px] text-text-muted">
                  {new Date(rec.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center border border-dashed border-white/[0.06] rounded-2xl">
            <p className="text-xs text-text-muted">
              Endorsements will appear here when mentors, instructors, or peers write one for {student.name}.
            </p>
          </div>
        )}
      </section>

      {/* ── Endorsement Submission Modal ── */}
      {isWriteRecOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-3xl border border-border-default bg-bg-card p-6 sm:p-8 space-y-5 shadow-2xl max-h-[90dvh] sm:max-h-[85vh] overflow-y-auto overscroll-contain">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-heading font-extrabold text-white">
                Endorse {student.name}
              </h3>
              <button
                type="button"
                onClick={() => setIsWriteRecOpen(false)}
                className="p-2.5 -mr-1.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-text-muted hover:text-white cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-text-muted leading-relaxed">
              Submit a professional endorsement highlighting {student.name}'s infrastructure expertise, project collaboration, or technical problem-solving.
            </p>

            <form onSubmit={handleSubmitRecommendation} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                  Your Professional Relationship
                </label>
                <select
                  value={recRelationship}
                  onChange={(e) => setRecRelationship(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-bg-elevated border border-border-default text-sm text-white focus:border-brand-mint focus:outline-none"
                >
                  <option value="Peer / Colleague">Colleague / Peer Engineer</option>
                  <option value="Mentor">Senior Mentor / Lead</option>
                  <option value="Project Director">Project Director / Client</option>
                  <option value="Instructor">Instructor / Professor</option>
                  <option value="Collaborator">Project Collaborator</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                  Endorsement Content (20 - 1000 characters) <span className="text-brand-mint">*</span>
                </label>
                <textarea
                  rows={5}
                  value={recContent}
                  onChange={(e) => setRecContent(e.target.value)}
                  required
                  minLength={20}
                  maxLength={1000}
                  placeholder={`Share specific examples of ${student.name}'s engineering capabilities, attention to detail, or deliverables...`}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-bg-elevated border border-border-default text-sm text-white focus:border-brand-mint focus:outline-none resize-none"
                />
                <div className="flex justify-between text-[11px] text-text-muted mt-1">
                  <span>Min 20 characters</span>
                  <span>{recContent.length} / 1000</span>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsWriteRecOpen(false)}
                  className="btn-secondary text-xs py-3 px-5 min-h-[44px] w-full sm:w-auto cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRec || recContent.trim().length < 20}
                  className="btn-primary text-xs py-3 px-6 min-h-[44px] w-full sm:w-auto cursor-pointer disabled:opacity-50 shadow-sm"
                >
                  {isSubmittingRec ? "Submitting..." : "Submit Endorsement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Share Profile Modal ── */}
      <ShareProfileModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        profile={student}
      />

      {/* ── Report Modal ── */}
      {isReportOpen && (
        <ReportModal
          targetType="USER"
          targetId={student.id || student._id}
          targetName={student.name}
          onClose={() => setIsReportOpen(false)}
        />
      )}
    </div>
  );
}
