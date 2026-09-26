import React, { useState, useEffect, useContext, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  FileCheck,
  FileText,
  Hammer,
  Layers,
  Lock,
  Mail,
  MapPin,
  MessageSquare,
  Plus,
  Printer,
  Send,
  Share2,
  ShieldCheck,
  Sparkles,
  Trash2,
  UploadCloud,
  User,
  X,
  XCircle,
  FileSpreadsheet,
  Image as ImageIcon,
} from 'lucide-react';
import { portfolioService } from '../../services/portfolioService';
import { AuthContext } from '../../context/AuthContext';
import { useToast } from '../../components/ui/Toast';
import ProfileNav from '../../components/profile/ProfileNav';
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
          setEditSectionVisibility({
            ...editSectionVisibility,
            ...p.sectionVisibility,
          });
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
      toast?.success?.('Portfolio link copied to clipboard!');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-brand-mint/20 border-t-brand-mint animate-spin" />
        <p className="text-text-muted text-xs font-mono uppercase tracking-wider">
          Loading professional portfolio...
        </p>
      </div>
    );
  }

  const user = candidateProfile || {};
  const portfolio = portfolioData?.portfolio || {};
  const verifications = portfolioData?.verifications || user?.verifications || {};
  const completeness = portfolioData?.completeness || portfolio?.completeness || 0;
  const missingItems = portfolioData?.missingItems || [];
  const projects = portfolioData?.projects || [];
  const isBusinessViewer =
    ['RECRUITER', 'FOUNDER', 'ADMIN'].includes(authUser?.primaryRole?.toUpperCase()) && !isOwner;

  return (
    <div className="space-y-8 animate-fadeIn max-w-6xl mx-auto pb-16 print:p-0 print:m-0 print:space-y-4">
      {/* ── PROFILE NAV (OWNER VIEW ONLY) ── */}
      {isOwner && <ProfileNav className="print:hidden" />}

      {/* ── HERO BANNER ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-bg-surface via-bg-surface/90 to-brand-navy/30 border border-border-subtle p-6 sm:p-10 backdrop-blur-xl shadow-xl print:border-none print:shadow-none print:bg-white print:text-black">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-mint/5 rounded-full blur-3xl -z-10 pointer-events-none print:hidden" />

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Avatar */}
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-br from-brand-mint/20 to-brand-navy/40 border-2 border-brand-mint/30 flex items-center justify-center overflow-hidden shrink-0 shadow-lg">
              {user.avatar ? (
                <img
                  src={getUploadUrl(user.avatar)}
                  alt={user.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-3xl font-heading font-black text-brand-mint">
                  {user.name ? user.name.slice(0, 2).toUpperCase() : 'Z'}
                </span>
              )}
            </div>

            {/* Profile identity info */}
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-white print:text-black">
                  {user.name}
                </h1>
                {/* Role Tag */}
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-white/[0.06] border border-white/10 text-white/90">
                  {user.primaryRole || 'Professional'}
                </span>

                {/* Verification Badges */}
                {verifications?.professional?.status === 'VERIFIED' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                    <ShieldCheck className="w-3.5 h-3.5" /> Professional Verified
                  </span>
                )}
                {verifications?.identity?.status === 'VERIFIED' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-brand-mint/10 border border-brand-mint/30 text-brand-mint">
                    <CheckCircle2 className="w-3.5 h-3.5" /> ID Verified
                  </span>
                )}
              </div>

              {/* Headline */}
              <p className="text-sm sm:text-base text-brand-mint/90 font-medium max-w-2xl leading-snug">
                {portfolio.headline || user.headline || 'Civil & Infrastructure Engineering Professional'}
              </p>

              {/* Infrastructure Discipline & Location */}
              <div className="flex items-center gap-4 text-xs text-text-muted flex-wrap pt-1 print:text-gray-700">
                {user.infrastructureDomain && (
                  <span className="flex items-center gap-1 font-semibold text-white/80 print:text-black">
                    <Hammer className="w-3.5 h-3.5 text-brand-mint" />
                    {user.infrastructureDomain}
                  </span>
                )}
                {user.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-text-faint" />
                    {user.location}
                  </span>
                )}
                {user.experienceYears !== undefined && (
                  <span className="flex items-center gap-1 font-mono">
                    <Clock className="w-3.5 h-3.5 text-text-faint" />
                    {user.experienceYears} Years Experience
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5 flex-wrap shrink-0 print:hidden">
            {isOwner ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-brand-mint text-black text-xs font-bold font-heading hover:bg-brand-mint/90 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 className="w-4 h-4" /> Edit Portfolio
                </button>
                <Link
                  to="/profile/verification"
                  className="px-4 py-2.5 rounded-xl border border-white/10 hover:border-brand-mint/40 bg-white/[0.04] text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <ShieldCheck className="w-4 h-4 text-brand-mint" /> Verification Center
                </Link>
                <button
                  type="button"
                  onClick={handleSharePortfolio}
                  className="p-2.5 rounded-xl border border-white/10 hover:border-white/20 bg-white/[0.04] text-white transition-all cursor-pointer"
                  title="Share Portfolio Link"
                >
                  <Share2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="p-2.5 rounded-xl border border-white/10 hover:border-white/20 bg-white/[0.04] text-white transition-all cursor-pointer"
                  title="Download / Print PDF"
                >
                  <Printer className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                {isBusinessViewer && (
                  <button
                    type="button"
                    onClick={() => setIsSendOpportunityOpen(true)}
                    className="px-5 py-2.5 rounded-xl bg-brand-mint text-black text-xs font-bold font-heading hover:bg-brand-mint/90 transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                  >
                    <Send className="w-4 h-4" /> Send Opportunity
                  </button>
                )}
                <Link
                  to={`/messages?user=${user._id || user.id}`}
                  className="px-4 py-2.5 rounded-xl border border-brand-mint/30 bg-brand-mint/10 hover:bg-brand-mint/20 text-brand-mint text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <MessageSquare className="w-4 h-4" /> Message
                </Link>
                <button
                  type="button"
                  onClick={handleSharePortfolio}
                  className="p-2.5 rounded-xl border border-white/10 hover:border-white/20 bg-white/[0.04] text-white transition-all cursor-pointer"
                  title="Share Portfolio"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── PORTFOLIO COMPLETENESS CARD (OWNER ONLY) ── */}
        {isOwner && completeness < 100 && (
          <div className="mt-8 pt-6 border-t border-white/[0.08] flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
            <div className="space-y-1.5">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  Portfolio Completeness
                </span>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-brand-mint/15 text-brand-mint border border-brand-mint/30">
                  {completeness}%
                </span>
              </div>
              <div className="w-64 sm:w-80 h-2 rounded-full bg-white/[0.08] overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-brand-mint to-brand-yellow rounded-full transition-all duration-500"
                  style={{ width: `${completeness}%` }}
                />
              </div>
            </div>

            {missingItems.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap text-xs text-text-muted">
                <span className="font-semibold text-text-secondary">Missing for 100%:</span>
                {missingItems.map((item, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] text-text-secondary"
                  >
                    + {item}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── ABOUT / BIO SECTION ── */}
      {portfolio.bio && (
        <div className="rounded-3xl border border-border-subtle bg-bg-surface/60 backdrop-blur-xl p-6 sm:p-8 space-y-3">
          <h2 className="text-base font-heading font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
            <User className="w-4 h-4 text-brand-mint" /> Professional Summary
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">
            {portfolio.bio}
          </p>
        </div>
      )}

      {/* ── FEATURED INFRASTRUCTURE PROJECTS ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-heading font-extrabold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-brand-mint" /> Infrastructure Projects & Artifacts
            </h2>
            <p className="text-xs text-text-muted">
              Engineering packages, drawings, BOQ documentation, and execution highlights.
            </p>
          </div>
          {isOwner && (
            <Link
              to="/profile/edit#projects"
              className="text-xs font-semibold text-brand-mint hover:underline flex items-center gap-1 print:hidden"
            >
              <Plus className="w-3.5 h-3.5" /> Manage Projects
            </Link>
          )}
        </div>

        {projects.length === 0 ? (
          <div className="rounded-2xl border border-border-subtle bg-bg-surface/40 p-8 text-center text-xs text-text-muted space-y-2">
            <Layers className="w-8 h-8 opacity-30 mx-auto" />
            <p>No featured projects displayed yet.</p>
            {isOwner && (
              <button
                type="button"
                onClick={() => setIsEditorOpen(true)}
                className="text-brand-mint font-semibold hover:underline cursor-pointer"
              >
                Select featured projects to showcase
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {projects.map((project) => {
              const media = project.portfolioMedia || [];
              const publicMedia = isOwner
                ? media
                : media.filter((m) => m.visibility === 'PUBLIC' || !m.visibility);

              return (
                <div
                  key={project._id}
                  className="rounded-2xl border border-border-subtle bg-bg-surface/70 backdrop-blur-xl p-5 sm:p-6 space-y-4 hover:border-white/20 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-brand-mint/10 text-brand-mint border border-brand-mint/20">
                          {project.infrastructureSector || 'Infrastructure'}
                        </span>
                        <h3 className="text-base font-heading font-bold text-white">
                          {project.title}
                        </h3>
                      </div>
                      {project.role && (
                        <span className="text-xs font-mono font-semibold text-text-muted shrink-0">
                          {project.role}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-text-muted flex-wrap">
                      {project.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-text-faint" />
                          {project.location}
                        </span>
                      )}
                      {(project.startDate || project.endDate) && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-text-faint" />
                          {project.startDate ? new Date(project.startDate).getFullYear() : ''} -{' '}
                          {project.isCurrent ? 'Present' : project.endDate ? new Date(project.endDate).getFullYear() : ''}
                        </span>
                      )}
                      {project.projectScale && (
                        <span className="font-mono text-brand-yellow/90">
                          Scale: {project.projectScale}
                        </span>
                      )}
                    </div>

                    {project.description && (
                      <p className="text-xs text-text-secondary leading-relaxed line-clamp-3">
                        {project.description}
                      </p>
                    )}

                    {/* Key Responsibilities list */}
                    {project.responsibilities && project.responsibilities.length > 0 && (
                      <div className="space-y-1 pt-1">
                        <span className="text-[11px] font-mono text-text-muted uppercase">Key Responsibilities:</span>
                        <ul className="list-disc list-inside text-xs text-text-secondary space-y-0.5">
                          {project.responsibilities.slice(0, 3).map((resp, i) => (
                            <li key={i} className="line-clamp-1">{resp}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Skills & Software tags */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-2">
                      {project.skillsUsed?.map((sk, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-[11px] text-text-secondary font-mono"
                        >
                          {sk}
                        </span>
                      ))}
                      {project.softwareUsed?.map((sw, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-brand-yellow/10 border border-brand-yellow/20 text-[11px] text-brand-yellow font-mono"
                        >
                          {sw}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Portfolio Media attachments */}
                  {publicMedia.length > 0 && (
                    <div className="pt-4 border-t border-white/[0.06] space-y-2">
                      <span className="text-[11px] font-mono text-text-muted uppercase flex items-center gap-1.5">
                        <FileCheck className="w-3.5 h-3.5 text-brand-mint" /> Portfolio Media ({publicMedia.length})
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {publicMedia.map((m, idx) => {
                          const isImg = m.mimeType?.startsWith('image/');
                          const isPdf = m.mimeType === 'application/pdf';

                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setSelectedMedia(m)}
                              className="group/media relative p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] hover:border-brand-mint/40 text-left transition-all cursor-pointer overflow-hidden"
                            >
                              <div className="flex items-center gap-2">
                                {isImg ? (
                                  <ImageIcon className="w-4 h-4 text-brand-mint shrink-0" />
                                ) : (
                                  <FileText className="w-4 h-4 text-brand-yellow shrink-0" />
                                )}
                                <span className="text-xs font-semibold text-white/90 truncate block">
                                  {m.name || 'Artifact'}
                                </span>
                              </div>
                              {m.caption && (
                                <p className="text-[10px] text-text-muted truncate mt-0.5">{m.caption}</p>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── FEATURED SKILLS & SOFTWARE ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Skills */}
        <div className="rounded-3xl border border-border-subtle bg-bg-surface/60 backdrop-blur-xl p-6 sm:p-8 space-y-4">
          <h2 className="text-base font-heading font-extrabold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-mint" /> Canonical Infrastructure Skills
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            {portfolio.featuredSkills && portfolio.featuredSkills.length > 0 ? (
              portfolio.featuredSkills.map((sk, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1.5 rounded-xl bg-brand-mint/10 border border-brand-mint/20 text-brand-mint text-xs font-semibold font-mono"
                >
                  {sk}
                </span>
              ))
            ) : user.skills && user.skills.length > 0 ? (
              user.skills.slice(0, 10).map((sk, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/90 text-xs font-mono"
                >
                  {typeof sk === 'string' ? sk : sk.name}
                </span>
              ))
            ) : (
              <span className="text-xs text-text-muted">No featured skills selected.</span>
            )}
          </div>
        </div>

        {/* Software */}
        <div className="rounded-3xl border border-border-subtle bg-bg-surface/60 backdrop-blur-xl p-6 sm:p-8 space-y-4">
          <h2 className="text-base font-heading font-extrabold text-white flex items-center gap-2">
            <Hammer className="w-4 h-4 text-brand-yellow" /> Featured Engineering Software
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            {portfolio.featuredSoftware && portfolio.featuredSoftware.length > 0 ? (
              portfolio.featuredSoftware.map((sw, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1.5 rounded-xl bg-brand-yellow/10 border border-brand-yellow/20 text-brand-yellow text-xs font-semibold font-mono"
                >
                  {sw}
                </span>
              ))
            ) : (
              <span className="text-xs text-text-muted">Primavera P6, AutoCAD, Civil 3D, Revit.</span>
            )}
          </div>
        </div>
      </div>

      {/* ── PROFESSIONAL RESUME / CV CARD ── */}
      <div className="rounded-3xl border border-border-subtle bg-bg-surface/60 backdrop-blur-xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 print:hidden">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0 text-brand-mint">
            <FileText className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-heading font-bold text-white">
                Professional Resume / CV
              </h2>
              {portfolio.resumeUrl ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  PDF Available ({portfolio.resumeVisibility || 'RECRUITERS'})
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/[0.04] text-text-muted">
                  No Resume Uploaded
                </span>
              )}
            </div>
            <p className="text-xs text-text-muted max-w-xl">
              {isOwner
                ? 'Your resume is protected. Choose whether recruiters, the public, or only you can view/download it.'
                : 'Verified professional curriculum vitae containing detailed project track record.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          {/* Download button if available */}
          {portfolio.resumeUrl && (
            <button
              type="button"
              onClick={handleDownloadResume}
              className="px-4 py-2.5 rounded-xl bg-brand-mint text-black text-xs font-bold font-heading hover:bg-brand-mint/90 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Download className="w-4 h-4" /> Download Resume
            </button>
          )}

          {/* Owner controls: upload / replace / change visibility */}
          {isOwner && (
            <>
              <input
                ref={resumeInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handleResumeUpload}
              />
              <button
                type="button"
                disabled={isResumeUploading}
                onClick={() => resumeInputRef.current?.click()}
                className="px-4 py-2.5 rounded-xl border border-white/10 hover:border-white/20 bg-white/[0.04] hover:bg-white/[0.08] text-white text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <UploadCloud className="w-4 h-4 text-brand-mint" />
                {isResumeUploading ? 'Uploading...' : portfolio.resumeUrl ? 'Replace PDF' : 'Upload PDF'}
              </button>

              {portfolio.resumeUrl && (
                <>
                  <select
                    value={portfolio.resumeVisibility || 'RECRUITERS'}
                    onChange={(e) => handleUpdateResumeVisibility(e.target.value)}
                    className="rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-mint"
                  >
                    <option value="PRIVATE" className="bg-bg-surface">Private (Only Me)</option>
                    <option value="RECRUITERS" className="bg-bg-surface">Recruiters & Founders</option>
                    <option value="PUBLIC" className="bg-bg-surface">Public</option>
                  </select>

                  <button
                    type="button"
                    onClick={handleDeleteResume}
                    className="p-2.5 rounded-xl border border-red-500/20 hover:bg-red-500/10 text-red-400 transition-all cursor-pointer"
                    title="Delete Resume"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── PORTFOLIO MEDIA VIEWER MODAL ── */}
      <AnimatePresence>
        {selectedMedia && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-2xl bg-bg-surface border border-border-subtle rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xl"
            >
              <button
                type="button"
                onClick={() => setSelectedMedia(null)}
                className="absolute top-5 right-5 p-2 rounded-full border border-white/10 hover:bg-white/[0.08] text-text-muted hover:text-white"
              >
                ✕
              </button>

              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase text-brand-mint font-bold">
                  {selectedMedia.mediaType || 'Artifact'}
                </span>
                <h3 className="text-xl font-heading font-bold text-white">
                  {selectedMedia.name || 'Project Document'}
                </h3>
                {selectedMedia.caption && (
                  <p className="text-xs text-text-secondary">{selectedMedia.caption}</p>
                )}
              </div>

              {/* Image preview */}
              {selectedMedia.mimeType?.startsWith('image/') && selectedMedia.fileUrl && (
                <div className="rounded-2xl overflow-hidden border border-white/10 max-h-[50vh] bg-black/40 flex items-center justify-center">
                  <img
                    src={getUploadUrl(selectedMedia.fileUrl)}
                    alt={selectedMedia.name}
                    className="w-full h-auto max-h-[50vh] object-contain"
                  />
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-3 pt-3">
                {selectedMedia.fileUrl && (
                  <a
                    href={getUploadUrl(selectedMedia.fileUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 rounded-xl bg-brand-mint text-black text-xs font-bold font-heading hover:bg-brand-mint/90 transition-all flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Open / Download File
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedMedia(null)}
                  className="px-4 py-2 rounded-xl border border-white/10 text-xs font-semibold text-text-muted hover:text-white"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── PORTFOLIO EDITOR MODAL ── */}
      <AnimatePresence>
        {isEditorOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-2xl bg-bg-surface border border-border-subtle rounded-3xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto shadow-2xl space-y-6"
            >
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="absolute top-5 right-5 p-2 rounded-full border border-white/10 hover:bg-white/[0.08] text-text-muted hover:text-white"
              >
                ✕
              </button>

              <div>
                <h3 className="text-xl font-heading font-bold text-white">
                  Curate Infrastructure Portfolio
                </h3>
                <p className="text-xs text-text-muted mt-1">
                  Customize the presentation of your verified engineering work, canonical skills, and featured projects.
                </p>
              </div>

              <form onSubmit={handleSavePortfolio} className="space-y-5">
                {/* Headline */}
                <div>
                  <label className="block text-xs font-semibold text-text-muted uppercase mb-1">
                    Custom Professional Headline
                  </label>
                  <input
                    type="text"
                    value={editHeadline}
                    onChange={(e) => setEditHeadline(e.target.value)}
                    placeholder="e.g. Senior Planning Engineer | Highways & Bridges EPC"
                    className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-mint"
                  />
                </div>

                {/* Bio / Summary */}
                <div>
                  <label className="block text-xs font-semibold text-text-muted uppercase mb-1">
                    Portfolio Bio & Value Proposition
                  </label>
                  <textarea
                    rows={4}
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    placeholder="Provide a compelling narrative of your engineering track record, mega-projects executed, and core competencies..."
                    className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] p-3 text-xs text-white focus:outline-none focus:border-brand-mint resize-none"
                  />
                </div>

                {/* Featured Projects Selection */}
                {allProjects.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-text-muted uppercase mb-2">
                      Featured Projects (Select to highlight)
                    </label>
                    <div className="space-y-2 max-h-48 overflow-y-auto p-2 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                      {allProjects.map((p) => {
                        const isFeatured = editFeaturedProjects.includes(p._id);
                        return (
                          <label
                            key={p._id}
                            className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                              isFeatured
                                ? 'border-brand-mint/40 bg-brand-mint/10 text-white'
                                : 'border-white/[0.06] text-text-secondary hover:bg-white/[0.03]'
                            }`}
                          >
                            <span className="font-semibold">{p.title}</span>
                            <input
                              type="checkbox"
                              checked={isFeatured}
                              onChange={() => {
                                if (isFeatured) {
                                  setEditFeaturedProjects(editFeaturedProjects.filter((id) => id !== p._id));
                                } else {
                                  setEditFeaturedProjects([...editFeaturedProjects, p._id]);
                                }
                              }}
                              className="accent-brand-mint"
                            />
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Section Visibility toggles */}
                <div>
                  <label className="block text-xs font-semibold text-text-muted uppercase mb-2">
                    Section Visibility
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {['about', 'projects', 'skills', 'experience', 'certifications', 'resume'].map((sec) => (
                      <label
                        key={sec}
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                          editSectionVisibility[sec]
                            ? 'border-brand-mint/30 bg-brand-mint/5 text-white'
                            : 'border-white/[0.06] text-text-muted'
                        }`}
                      >
                        <span className="capitalize">{sec}</span>
                        <input
                          type="checkbox"
                          checked={editSectionVisibility[sec] ?? true}
                          onChange={(e) =>
                            setEditSectionVisibility({
                              ...editSectionVisibility,
                              [sec]: e.target.checked,
                            })
                          }
                          className="accent-brand-mint"
                        />
                      </label>
                    ))}
                  </div>
                </div>

                {/* Submit */}
                <div className="flex items-center justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsEditorOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-white/10 text-xs font-semibold text-text-muted hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="px-5 py-2.5 rounded-xl bg-brand-mint text-black text-xs font-bold font-heading hover:bg-brand-mint/90 transition-all shadow-sm cursor-pointer"
                  >
                    {savingSettings ? 'Saving...' : 'Save Portfolio'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── SEND OPPORTUNITY MODAL (FOR RECRUITERS VIEWING CANDIDATE) ── */}
      <SendOpportunityModal
        isOpen={isSendOpportunityOpen}
        onClose={() => setIsSendOpportunityOpen(false)}
        candidate={candidateProfile}
        onSuccess={() => {
          toast?.success?.('Opportunity sent successfully to candidate inbox!');
        }}
      />
    </div>
  );
}
