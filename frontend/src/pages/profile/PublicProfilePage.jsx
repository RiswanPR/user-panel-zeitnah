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
} from "lucide-react";
import api from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import { useToast } from "../../components/ui/Toast";
import ShareProfileModal from "../../components/profile/ShareProfileModal";
import ProfileNav from "../../components/profile/ProfileNav";
import { getUploadUrl } from "../../utils/courseUi";

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

  // Background scroll lock when modal is open
  useEffect(() => {
    if (isWriteRecOpen || isShareOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isWriteRecOpen, isShareOpen]);

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
          setAvatarError(false);
          // SEO / Document title update
          document.title = `${res.data.user.name} (@${res.data.user.username}) — Zeitnah Student Identity`;
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
      title: `${student.name} — Zeitnah Student Identity`,
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

  const handleSubmitRecommendation = async (e) => {
    e.preventDefault();
    if (!recContent.trim() || recContent.trim().length < 20) {
      return toast.error("Too short", "Recommendation must be at least 20 characters.");
    }
    if (!authUser) {
      return toast.error("Sign in required", "Please sign in to write an endorsement.");
    }

    try {
      setIsSubmittingRec(true);
      const res = await api.post("/profile/recommendations", {
        recipientId: student.id,
        relationship: recRelationship,
        content: recContent.trim(),
      });
      toast.success("Endorsement submitted", res.data.message || "Recommendation submitted for review.");
      setIsWriteRecOpen(false);
      setRecContent("");
      // Refresh public profile to include new recommendation if approved
      const refresh = await api.get(`/profile/u/${encodeURIComponent(targetUsername)}`);
      setStudent(refresh.data.user);
    } catch (err) {
      toast.error("Submission failed", err.response?.data?.message || "Could not submit endorsement.");
    } finally {
      setIsSubmittingRec(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 sm:space-y-8 max-w-5xl mx-auto py-8 px-4 animate-pulse">
        {authUser && <div className="h-14 bg-bg-card rounded-2xl border border-border-default" />}
        <div className="h-80 bg-bg-card rounded-3xl border border-border-default" />
        <div className="h-44 bg-bg-card rounded-2xl border border-border-default" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-48 bg-bg-card rounded-2xl border border-border-default" />
          <div className="h-48 bg-bg-card rounded-2xl border border-border-default" />
        </div>
      </div>
    );
  }

  if (notFound || !student) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 bg-bg-base text-white max-w-4xl mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-4 text-text-muted">
          <User className="w-8 h-8" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-heading font-black tracking-tight mb-2">
          Student Profile Not Found
        </h1>
        <p className="text-sm text-text-muted max-w-md mb-6 leading-relaxed">
          The requested student profile @{targetUsername || "unknown"} is private, unpublished, or does not exist.
        </p>
        <Link
          to="/"
          className="btn-primary inline-flex items-center gap-2 py-2.5 px-6 text-xs uppercase tracking-wider cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Return to Zeitnah
        </Link>
      </div>
    );
  }

  const gamification = student.gamification || {};
  const avatarUrl = getUploadUrl(student.avatar);
  const bannerUrl = getUploadUrl(student.backgroundImage);
  const initials = student.name
    ? student.name
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "ZU";

  return (
    <div className="space-y-6 sm:space-y-8 max-w-5xl mx-auto py-4 sm:py-8 px-4 pb-16">
      {/* If authenticated user is browsing, show the core profile navigation */}
      {authUser && <ProfileNav />}

      {/* ── 01. PUBLIC PROFILE HERO ── */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative overflow-hidden rounded-3xl bg-bg-card border border-border-default shadow-sm"
      >
        <div className="gradient-line-top" />

        {/* Background Cover Image with subtle gradient overlay */}
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
                  Zeitnah Learning Identity
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
                    <span className="inline-flex items-center gap-1 rounded-full border border-brand-mint/25 bg-brand-mint/10 px-2 py-0.5 text-xs font-bold text-brand-mint">
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

                {student.headline && (
                  <p className="text-sm sm:text-base font-medium text-white/90 max-w-xl leading-relaxed break-words">
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
                  {student.industry && (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-yellow/60" />
                      {student.industry}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Level, Rank, XP Badges and Action CTAs */}
            <div className="flex flex-col items-center md:items-end gap-4 shrink-0 w-full md:w-auto">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-xl border border-brand-yellow/20 bg-brand-yellow/10 text-xs font-bold font-mono text-brand-yellow uppercase tracking-wider">
                  LEVEL {gamification.level || 1}
                </span>
                <span className="px-3 py-1.5 rounded-xl border border-brand-mint/20 bg-brand-mint/10 text-xs font-bold uppercase tracking-wider text-brand-mint">
                  {gamification.rank || "Beginner"}
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
                    Write Endorsement
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
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ── 02. ABOUT SECTION ── */}
      {student.bio ? (
        <section className="w-full max-w-full min-w-0 rounded-3xl border border-border-default bg-bg-card p-5 sm:p-6 md:p-8 space-y-3 sm:space-y-4 shadow-sm">
          <h2 className="text-base sm:text-lg font-heading font-extrabold text-white flex items-center gap-2">
            <span className="w-1.5 h-4 rounded-full bg-brand-mint shrink-0" />
            About
          </h2>
          <div className="w-full max-w-[72ch] min-w-0 text-left">
            <p className="text-sm sm:text-base text-text-secondary leading-relaxed sm:leading-loose whitespace-pre-wrap break-words [overflow-wrap:anywhere] [word-break:break-word] text-left font-normal">
              {student.bio}
            </p>
          </div>
        </section>
      ) : null}

      {/* ── 03. EXPERIENCE SECTION ── */}
      <section className="rounded-3xl border border-border-default bg-bg-card p-6 sm:p-8 space-y-4 shadow-sm">
        <h2 className="text-lg font-heading font-extrabold text-white flex items-center gap-2">
          <span className="w-1.5 h-4 rounded-full bg-brand-mint" />
          Experience
        </h2>

        {student.experience?.length > 0 ? (
          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-white/[0.08]">
            {student.experience.map((exp) => (
              <div key={exp.id} className="relative group">
                <div className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-brand-mint border-2 border-bg-card shadow-sm ring-2 ring-brand-mint/20" />

                <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] space-y-1.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs font-mono font-bold text-brand-mint uppercase tracking-wider">
                      {new Date(exp.startDate).getFullYear()} — {exp.currentlyActive ? "Present" : exp.endDate ? new Date(exp.endDate).getFullYear() : "Present"}
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white/[0.04] text-text-muted">
                      {exp.employmentType}
                    </span>
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
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center border border-dashed border-white/[0.06] rounded-2xl">
            <p className="text-xs text-text-muted">
              Add work, internships, projects, or leadership when you're ready.
            </p>
          </div>
        )}
      </section>

      {/* ── 04. EDUCATION SECTION ── */}
      <section className="rounded-3xl border border-border-default bg-bg-card p-6 sm:p-8 space-y-4 shadow-sm">
        <h2 className="text-lg font-heading font-extrabold text-white flex items-center gap-2">
          <span className="w-1.5 h-4 rounded-full bg-brand-mint" />
          Education
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
            <p className="text-xs text-text-muted">Show your learning journey.</p>
          </div>
        )}
      </section>

      {/* ── 05. LICENSES & CERTIFICATIONS ── */}
      <section className="rounded-3xl border border-border-default bg-bg-card p-6 sm:p-8 space-y-4 shadow-sm">
        <h2 className="text-lg font-heading font-extrabold text-white flex items-center gap-2">
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
                        <span className="text-text-muted">Credential Record</span>
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
            <p className="text-xs text-text-muted">Showcase credentials as you earn them.</p>
          </div>
        )}
      </section>

      {/* ── 06. SKILLS & COMPETENCIES ── */}
      {student.skills?.length > 0 && (
        <section className="rounded-3xl border border-border-default bg-bg-card p-6 sm:p-8 space-y-3 shadow-sm">
          <h2 className="text-lg font-heading font-extrabold text-white flex items-center gap-2">
            <span className="w-1.5 h-4 rounded-full bg-brand-mint" />
            Skills & Competencies
          </h2>
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
        </section>
      )}

      {/* ── 07. VERIFIED ACHIEVEMENTS ── */}
      {gamification.achievements?.length > 0 && (
        <section className="rounded-3xl border border-border-default bg-bg-card p-6 sm:p-8 space-y-4 shadow-sm">
          <h2 className="text-lg font-heading font-extrabold text-white flex items-center gap-2">
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

      {/* ── 08. RECOMMENDATIONS ── */}
      <section className="rounded-3xl border border-border-default bg-bg-card p-6 sm:p-8 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-heading font-extrabold text-white flex items-center gap-2">
            <span className="w-1.5 h-4 rounded-full bg-brand-mint" />
            Recommendations
          </h2>

          {!isOwnProfile && authUser && (
            <button
              type="button"
              onClick={() => setIsWriteRecOpen(true)}
              className="btn-secondary text-xs uppercase tracking-wider flex items-center gap-1.5 py-1.5 px-3 cursor-pointer shadow-sm"
            >
              <HeartHandshake className="w-3.5 h-3.5" />
              Write Recommendation
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
              Recommendations will appear here when others write one for {student.name}.
            </p>
          </div>
        )}
      </section>

      {/* ── Write Recommendation Modal ── */}
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
              Submit a professional endorsement highlighting {student.name}'s collaboration, technical skills, or learning dedication.
            </p>

            <form onSubmit={handleSubmitRecommendation} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                  Your Relationship
                </label>
                <select
                  value={recRelationship}
                  onChange={(e) => setRecRelationship(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-bg-elevated border border-border-default text-sm text-white focus:border-brand-mint focus:outline-none"
                >
                  <option value="Peer / Student">Peer / Fellow Student</option>
                  <option value="Mentor">Mentor</option>
                  <option value="Instructor">Instructor / Teacher</option>
                  <option value="Collaborator">Project Collaborator</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                  Recommendation Content (20 - 1000 characters) <span className="text-brand-mint">*</span>
                </label>
                <textarea
                  rows={5}
                  value={recContent}
                  onChange={(e) => setRecContent(e.target.value)}
                  required
                  minLength={20}
                  maxLength={1000}
                  placeholder={`Share specific examples of how ${student.name} excels, collaborates, or solves problems...`}
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
    </div>
  );
}
