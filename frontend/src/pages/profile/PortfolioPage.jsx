import React, { useState, useEffect, useContext, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  FileCheck,
  FileText,
  Hammer,
  Layers,
  Lock,
  MapPin,
  Plus,
  Printer,
  Share2,
  ShieldCheck,
  Sparkles,
  Trash2,
  UploadCloud,
  User,
  X,
  XCircle,
  Cpu,
  Code2,
  ArrowLeft,
  Check,
} from 'lucide-react';
import { portfolioService } from '../../services/portfolioService';
import { AuthContext } from '../../context/AuthContext';
import { useToast } from '../../components/ui/Toast';
import ProfileNav from '../../components/profile/ProfileNav';
import { isRecruiterOrFounder, isAdmin } from '../../utils/roleNavigation';
import SendOpportunityModal from '../../components/opportunities/SendOpportunityModal';
import { getUploadUrl } from '../../utils/courseUi';
import projectsService from '../../services/projectsService';

export default function PortfolioPage({ isPublic = false }) {
  const { username: paramUsername } = useParams();
  const { user: authUser } = useContext(AuthContext);
  const toast = useToast();
  const navigate = useNavigate();

  const isOwner = !isPublic && !paramUsername;
  const targetUsername = paramUsername || authUser?.username;

  const [loading, setLoading] = useState(true);
  const [portfolioData, setPortfolioData] = useState(null);
  const [candidateProfile, setCandidateProfile] = useState(null);
  const [allProjects, setAllProjects] = useState([]);

  // Modals & UI states
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isSendOpportunityOpen, setIsSendOpportunityOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [isResumeUploading, setIsResumeUploading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Portfolio Editor form state
  const [editHeadline, setEditHeadline] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editFeaturedProjects, setEditFeaturedProjects] = useState([]);
  const [editFeaturedSkills, setEditFeaturedSkills] = useState([]);
  const [editFeaturedSoftware, setEditFeaturedSoftware] = useState([]);
  const [editSectionVisibility, setEditSectionVisibility] = useState({
    about: true,
    skills: true,
    experience: true,
    projects: true,
    certifications: true,
    resume: true,
    contact: true,
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // Resume upload input ref
  const resumeInputRef = useRef(null);

  const loadPortfolio = async () => {
    setLoading(true);
    try {
      if (isOwner) {
        const res = await portfolioService.getMyPortfolio();
        setPortfolioData(res);
        setCandidateProfile(res.user);

        // Prepopulate editor state
        const p = res.portfolio || {};
        setEditHeadline(p.headline || '');
        setEditBio(p.bio || '');
        setEditFeaturedProjects(p.featuredProjects || []);
        setEditFeaturedSkills(p.featuredSkills || []);
        setEditFeaturedSoftware(p.featuredSoftware || []);
        if (p.sectionVisibility) {
          setEditSectionVisibility((prev) => ({
            ...prev,
            ...p.sectionVisibility,
          }));
        }

        // Fetch user projects for selection in editor
        try {
          const prjRes = await projectsService.getMyProjects();
          setAllProjects(Array.isArray(prjRes) ? prjRes : prjRes?.items || []);
        } catch {
          // silent
        }
      } else {
        const res = await portfolioService.getPublicPortfolio(targetUsername);
        setPortfolioData(res);
        setCandidateProfile(res.user);
      }
    } catch (err) {
      console.error('Failed to load portfolio:', err);
      toast?.error?.('Could not load portfolio.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPortfolio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetUsername, isOwner]);

  const handleSavePortfolio = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await portfolioService.updatePortfolio({
        headline: editHeadline,
        bio: editBio,
        featuredProjects: editFeaturedProjects,
        featuredSkills: editFeaturedSkills,
        featuredSoftware: editFeaturedSoftware,
        sectionVisibility: editSectionVisibility,
      });
      toast?.success?.('Portfolio updated successfully!');
      setIsEditorOpen(false);
      loadPortfolio();
    } catch (err) {
      toast?.error?.(err?.response?.data?.message || 'Failed to update portfolio.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleResumeUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast?.error?.('Please upload a PDF document.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast?.error?.('Resume file size must be under 10MB.');
      return;
    }

    setIsResumeUploading(true);
    try {
      await portfolioService.uploadResume(file);
      toast?.success?.('Resume uploaded securely.');
      loadPortfolio();
    } catch (err) {
      toast?.error?.(err?.response?.data?.message || 'Failed to upload resume.');
    } finally {
      setIsResumeUploading(false);
    }
  };

  const handleDeleteResume = async () => {
    if (!window.confirm('Are you sure you want to remove your resume?')) return;
    try {
      await portfolioService.deleteResume();
      toast?.success?.('Resume removed.');
      loadPortfolio();
    } catch (err) {
      toast?.error?.('Failed to delete resume.');
    }
  };

  const handleUpdateResumeVisibility = async (newVisibility) => {
    try {
      await portfolioService.updatePortfolio({
        resumeVisibility: newVisibility,
      });
      toast?.success?.(`Resume visibility updated to ${newVisibility}.`);
      loadPortfolio();
    } catch (err) {
      toast?.error?.('Failed to update resume visibility.');
    }
  };

  const handleDownloadResume = async () => {
    try {
      const targetId = candidateProfile?._id || candidateProfile?.id;
      const res = await portfolioService.getResumeDownloadUrl(targetId);
      if (res?.downloadUrl) {
        window.open(res.downloadUrl, '_blank');
      } else {
        toast?.error?.('Resume download not authorized.');
      }
    } catch (err) {
      toast?.error?.('Resume not available or access restricted.');
    }
  };

  const handleSharePortfolio = () => {
    const url = `${window.location.origin}/u/${candidateProfile?.username}/portfolio`;
    if (navigator.share) {
      navigator
        .share({
          title: `${candidateProfile?.name} — Infrastructure Portfolio`,
          text: `View ${candidateProfile?.name}'s professional infrastructure portfolio on Zeitnah`,
          url,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      toast?.success?.('Portfolio link copied to clipboard!');
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-pulse">
        <div className="h-12 bg-white/[0.04] rounded-2xl border border-white/[0.06]" />
        <div className="h-64 bg-white/[0.04] rounded-3xl border border-white/[0.06]" />
        <div className="h-96 bg-white/[0.04] rounded-3xl border border-white/[0.06]" />
      </div>
    );
  }

  const user = candidateProfile || {};
  const portfolio = portfolioData?.portfolio || {};
  const verifications = portfolioData?.verifications || user?.verifications || {};
  const featuredProjects = portfolioData?.projects || [];
  const resume = portfolioData?.resume || user?.resume;
  const avatarUrl = getUploadUrl(user.avatar);

  const canRecruiterSendOpportunity = Boolean(
    authUser && isRecruiterOrFounder(authUser) && !isOwner
  );

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto pb-20">
      {/* ── 01. NAVIGATION BAR ── */}
      {authUser && <ProfileNav />}

      {/* ── 02. EDITORIAL PORTFOLIO HERO ── */}
      <section className="relative overflow-hidden rounded-3xl bg-[#0A0F18]/95 border border-white/[0.08] p-6 sm:p-10 shadow-[0_12px_40px_rgba(0,0,0,0.4)]">
        <div
          className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-brand-yellow/30 to-transparent pointer-events-none"
          aria-hidden="true"
        />

        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left min-w-0">
            {/* Avatar */}
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-2 border-white/10 bg-[#0F1724] shrink-0 shadow-xl">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={user.name || 'Member'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-yellow/20 to-brand-navy/60 text-brand-yellow font-heading font-black text-2xl">
                  {user.name ? user.name.slice(0, 2).toUpperCase() : 'ZU'}
                </div>
              )}
            </div>

            {/* Identity details */}
            <div className="space-y-2 min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                <h1 className="font-heading font-black text-2xl sm:text-3xl text-white tracking-tight">
                  {user.name}
                </h1>
                {user.isVerified && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-brand-mint/30 bg-brand-mint/10 px-2 py-0.5 text-xs font-bold text-brand-mint">
                    <CheckCircle2 className="w-3 h-3" />
                    Verified
                  </span>
                )}
              </div>

              <p className="font-mono text-sm text-brand-mint">
                @{user.username}
              </p>

              <p className="text-sm sm:text-base text-white/90 font-medium max-w-2xl leading-relaxed">
                {portfolio.headline || user.headline || 'Infrastructure Engineer & Problem Solver'}
              </p>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-text-muted pt-1">
                {user.currentRole && (
                  <span className="inline-flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-text-faint" />
                    <span>{user.currentRole}</span>
                  </span>
                )}
                {user.location && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-text-faint" />
                    <span>{user.location}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 shrink-0">
            {isOwner ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(true)}
                  className="zn-btn-primary text-xs uppercase tracking-wider flex items-center gap-1.5 py-3 px-5 shadow-sm"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Curate Showcase</span>
                </button>
                <button
                  type="button"
                  onClick={handleSharePortfolio}
                  className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-text-muted hover:text-white transition-colors cursor-pointer focus-ring"
                  title="Share portfolio"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-brand-mint" /> : <Share2 className="w-4 h-4" />}
                </button>
              </>
            ) : (
              <>
                {canRecruiterSendOpportunity && (
                  <button
                    type="button"
                    onClick={() => setIsSendOpportunityOpen(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-3 rounded-xl bg-gradient-to-r from-brand-yellow/20 to-brand-mint/20 border border-brand-yellow/30 text-brand-yellow text-xs font-bold uppercase tracking-wider hover:border-brand-yellow/50 transition-all shadow-sm"
                  >
                    <Briefcase className="w-4 h-4" />
                    <span>Send Opportunity</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSharePortfolio}
                  className="zn-btn-secondary text-xs uppercase tracking-wider flex items-center gap-1.5 py-3 px-4"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share</span>
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── 03. RESUME & VERIFIED EVIDENCE STRIP ── */}
      <section className="rounded-3xl border border-white/[0.08] bg-[#0A0F18]/90 backdrop-blur-xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-brand-yellow/10 border border-brand-yellow/25 flex items-center justify-center text-brand-yellow shadow-inner">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-heading font-extrabold text-white tracking-tight">
                  Official Resume & Credentials
                </h2>
                {resume?.url && (
                  <span className="px-2 py-0.5 rounded-full bg-brand-mint/10 border border-brand-mint/25 text-[10px] font-bold text-brand-mint">
                    PDF Ready
                  </span>
                )}
              </div>
              <p className="text-xs text-text-muted mt-0.5">
                {resume?.url
                  ? `Uploaded ${new Date(resume.updatedAt || Date.now()).toLocaleDateString()}`
                  : 'No verified CV uploaded yet'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {resume?.url ? (
              <>
                <button
                  type="button"
                  onClick={handleDownloadResume}
                  className="zn-btn-primary text-xs flex items-center gap-1.5 py-2.5 px-4 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download CV</span>
                </button>

                {isOwner && (
                  <>
                    <button
                      type="button"
                      onClick={() => resumeInputRef.current?.click()}
                      disabled={isResumeUploading}
                      className="zn-btn-secondary text-xs flex items-center gap-1.5 py-2.5 px-4 cursor-pointer"
                    >
                      <UploadCloud className="w-4 h-4" />
                      <span>{isResumeUploading ? 'Uploading...' : 'Replace'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteResume}
                      className="p-2.5 rounded-xl border border-red-500/25 bg-red-500/10 text-red-400 hover:text-red-300 transition-colors"
                      title="Remove resume"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </>
            ) : isOwner ? (
              <button
                type="button"
                onClick={() => resumeInputRef.current?.click()}
                disabled={isResumeUploading}
                className="zn-btn-primary text-xs flex items-center gap-1.5 py-2.5 px-5 cursor-pointer"
              >
                <UploadCloud className="w-4 h-4" />
                <span>{isResumeUploading ? 'Uploading...' : 'Upload PDF Resume'}</span>
              </button>
            ) : (
              <span className="text-xs text-text-muted italic">
                Resume is not publicly available
              </span>
            )}

            <input
              ref={resumeInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handleResumeUpload}
            />
          </div>
        </div>
      </section>

      {/* ── 04. FEATURED DELIVERABLES & PROJECTS SHOWCASE ── */}
      <section className="rounded-3xl border border-white/[0.08] bg-[#0A0F18]/90 backdrop-blur-xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-mint/10 border border-brand-mint/20 flex items-center justify-center text-brand-mint shadow-inner">
              <Hammer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-heading font-extrabold text-white tracking-tight">
                Curated Engineering Deliverables
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Technical drawings, project case studies, and engineering deliverables
              </p>
            </div>
          </div>

          {isOwner && (
            <button
              type="button"
              onClick={() => setIsEditorOpen(true)}
              className="zn-btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Select Featured</span>
            </button>
          )}
        </div>

        {featuredProjects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/[0.1] bg-white/[0.01] p-10 text-center">
            <Hammer className="w-8 h-8 text-text-muted mx-auto mb-3" />
            <h3 className="text-sm font-heading font-bold text-white mb-1">
              No featured deliverables selected
            </h3>
            <p className="text-xs text-text-muted max-w-sm mx-auto mb-4">
              {isOwner
                ? 'Select specific projects from your catalog to feature on your official portfolio showcase.'
                : 'This member has not pinned featured deliverables yet.'}
            </p>
            {isOwner && (
              <button
                type="button"
                onClick={() => setIsEditorOpen(true)}
                className="zn-btn-primary text-xs py-2.5 px-5"
              >
                <span>Curate Showcase Now</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {featuredProjects.map((proj, idx) => {
              const coverImg = proj.thumbnailUrl || (proj.media && proj.media[0]?.url);
              const resolvedCover = coverImg ? getUploadUrl(coverImg) : null;

              return (
                <div
                  key={proj._id || proj.id || idx}
                  className="rounded-2xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] hover:border-brand-mint/30 transition-all p-5 flex flex-col justify-between group shadow-sm"
                >
                  <div>
                    {resolvedCover && (
                      <div
                        className="h-44 w-full rounded-xl overflow-hidden mb-4 bg-black/40 border border-white/[0.06] relative cursor-pointer"
                        onClick={() => setSelectedMedia({ url: resolvedCover, title: proj.title })}
                      >
                        <img
                          src={resolvedCover}
                          alt={proj.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {proj.sector && (
                          <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-white/10 text-[10px] font-mono text-white font-semibold">
                            {proj.sector}
                          </span>
                        )}
                      </div>
                    )}

                    <h3 className="text-base font-heading font-bold text-white group-hover:text-brand-mint transition-colors tracking-tight line-clamp-1 mb-1">
                      {proj.title}
                    </h3>

                    {proj.role && (
                      <p className="text-xs font-semibold text-brand-yellow mb-2">
                        {proj.role}
                      </p>
                    )}

                    {proj.description && (
                      <p className="text-xs text-text-secondary leading-relaxed line-clamp-3 mb-4">
                        {proj.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-white/[0.05] flex items-center justify-between text-xs font-mono">
                    <span className="text-text-muted">
                      {proj.startDate ? new Date(proj.startDate).getFullYear() : 'Ongoing'}
                    </span>
                    {proj.projectUrl && (
                      <a
                        href={proj.projectUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-brand-mint hover:underline"
                      >
                        <span>View Deliverable</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── 05. CURATION MODAL (OWNER ONLY) ── */}
      <AnimatePresence>
        {isEditorOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditorOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl bg-[#0F1724] border border-white/[0.12] p-6 sm:p-8 shadow-2xl z-10 space-y-6"
            >
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-brand-yellow/10 border border-brand-yellow/25 flex items-center justify-center text-brand-yellow">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-white text-base">
                      Curate Portfolio Showcase
                    </h3>
                    <p className="text-xs text-text-muted">
                      Configure your showcase headline and featured deliverables
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="p-1.5 rounded-lg text-text-muted hover:text-white hover:bg-white/[0.06] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSavePortfolio} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                    Portfolio Headline
                  </label>
                  <input
                    type="text"
                    value={editHeadline}
                    onChange={(e) => setEditHeadline(e.target.value)}
                    placeholder="e.g. Senior Bridge Engineer | Specialized in Seismic Retrofitting"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs focus:border-brand-mint outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                    Select Projects to Feature
                  </label>
                  {allProjects.length === 0 ? (
                    <p className="text-xs text-text-muted italic">
                      No projects found. Add projects from your Profile page first.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar pr-1">
                      {allProjects.map((p) => {
                        const pid = p._id || p.id;
                        const isSelected = editFeaturedProjects.includes(pid);

                        return (
                          <div
                            key={pid}
                            onClick={() => {
                              if (isSelected) {
                                setEditFeaturedProjects(editFeaturedProjects.filter((id) => id !== pid));
                              } else {
                                setEditFeaturedProjects([...editFeaturedProjects, pid]);
                              }
                            }}
                            className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-brand-mint/10 border-brand-mint/30 text-white'
                                : 'bg-white/[0.02] border-white/[0.06] text-text-secondary hover:border-white/20'
                            }`}
                          >
                            <span className="text-xs font-medium truncate">{p.title}</span>
                            <span
                              className={`w-4 h-4 rounded-md border flex items-center justify-center text-[10px] ${
                                isSelected
                                  ? 'bg-brand-mint text-[#070B14] border-brand-mint font-bold'
                                  : 'border-white/20'
                              }`}
                            >
                              {isSelected ? '✓' : ''}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => setIsEditorOpen(false)}
                    className="px-4 py-2 rounded-xl border border-white/10 text-text-muted hover:text-white text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="zn-btn-primary text-xs px-5 py-2.5 cursor-pointer disabled:opacity-50"
                  >
                    {savingSettings ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── 06. MEDIA LIGHTBOX MODAL ── */}
      <AnimatePresence>
        {selectedMedia && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/90 backdrop-blur-lg"
              onClick={() => setSelectedMedia(null)}
            />
            <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl z-10">
              <button
                type="button"
                onClick={() => setSelectedMedia(null)}
                className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors z-20"
              >
                <X className="w-5 h-5" />
              </button>
              <img
                src={selectedMedia.url}
                alt={selectedMedia.title}
                className="w-full h-auto max-h-[85vh] object-contain rounded-2xl"
              />
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ── 07. SEND OPPORTUNITY MODAL (FOR RECRUITERS) ── */}
      <SendOpportunityModal
        isOpen={isSendOpportunityOpen}
        onClose={() => setIsSendOpportunityOpen(false)}
        candidateId={user.id || user._id}
        candidateName={user.name}
      />
    </div>
  );
}
