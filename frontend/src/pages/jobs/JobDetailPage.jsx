import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Briefcase,
  Building2,
  CheckCircle2,
  MapPin,
  Clock,
  Bookmark,
  BookmarkCheck,
  Send,
  Calendar,
  DollarSign,
  GraduationCap,
  Award,
  Cpu,
  Layers,
  Globe,
  Share2,
  ArrowLeft,
  X,
  AlertCircle,
  FileCheck2,
  ExternalLink,
} from 'lucide-react';
import { opportunityService } from '../../services/opportunityService';
import { useToast } from '../../components/ui/Toast';

export default function JobDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [coverNote, setCoverNote] = useState('');
  const [resumeUrl, setResumeUrl] = useState('');

  const {
    data: job,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['job-detail', id],
    queryFn: () => opportunityService.getOpportunityById(id),
    enabled: !!id,
  });

  // Toggle Save Mutation
  const toggleSaveMutation = useMutation({
    mutationFn: async () => {
      if (job?.isSaved) {
        return opportunityService.unsaveJob(id);
      } else {
        return opportunityService.saveJob(id);
      }
    },
    onSuccess: () => {
      addToast(
        job?.isSaved ? 'Job removed from saved' : 'Job bookmarked to saved list!',
        'success',
      );
      queryClient.invalidateQueries({ queryKey: ['job-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['saved-jobs'] });
    },
  });

  // Apply Mutation
  const applyMutation = useMutation({
    mutationFn: () =>
      opportunityService.applyToJob(id, {
        coverNote,
        resumeUrl,
      }),
    onSuccess: () => {
      addToast('Application submitted successfully to employer!', 'success');
      setIsApplyModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['job-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['my-applications'] });
    },
    onError: (err) => {
      addToast(
        err?.response?.data?.message || 'Failed to submit application',
        'error',
      );
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 flex flex-col items-center justify-center space-y-3 min-h-[60vh]">
        <div className="w-10 h-10 border-2 border-brand-mint/20 border-t-brand-mint rounded-full animate-spin" />
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Loading job details...
        </p>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white">Job Not Found</h2>
        <p className="text-xs text-text-muted">
          This infrastructure job may have expired, been closed, or does not exist.
        </p>
        <Link
          to="/jobs"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-mint text-black font-bold text-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Jobs</span>
        </Link>
      </div>
    );
  }

  const org = job.organization || {};
  const isVerified = org.isVerified || org.verificationStatus === 'VERIFIED';
  const hasApplied = job.hasApplied;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back button */}
      <div>
        <Link
          to="/jobs"
          className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Jobs Board</span>
        </Link>
      </div>

      {/* ── Main Job Header ── */}
      <div className="p-8 rounded-3xl bg-[#111116] border border-white/[0.08] shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 relative z-10">
          <div className="flex items-start gap-5">
            {/* Logo */}
            <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center overflow-hidden shrink-0 shadow-lg">
              {org.logo ? (
                <img src={org.logo} alt={org.name} className="w-full h-full object-cover" />
              ) : (
                <Building2 className="w-8 h-8 text-brand-mint" />
              )}
            </div>

            <div className="space-y-1.5">
              <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-white tracking-tight">
                {job.title}
              </h1>

              {/* Company line with Verified badge */}
              <div className="flex items-center gap-2 flex-wrap">
                {org.slug ? (
                  <Link
                    to={`/businesses/${org.slug}`}
                    className="font-bold text-sm text-brand-mint hover:underline"
                  >
                    {org.name}
                  </Link>
                ) : (
                  <span className="font-bold text-sm text-brand-mint">{org.name}</span>
                )}

                {isVerified && (
                  <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Verified</span>
                  </span>
                )}
              </div>

              {/* Meta line */}
              <div className="flex items-center gap-3 text-xs text-text-muted flex-wrap pt-1">
                {job.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-text-faint" />
                    <span>{job.location}</span>
                  </span>
                )}
                <span>•</span>
                <span className="px-2 py-0.5 rounded-md bg-white/[0.04] text-white/80 font-semibold">
                  {job.workMode || 'On-site'}
                </span>
                <span>•</span>
                <span className="px-2 py-0.5 rounded-md bg-white/[0.04] text-white/80 font-semibold">
                  {job.jobType || 'Full-time'}
                </span>
                <span>•</span>
                <span>
                  {job.minYearsExperience}–{job.maxYearsExperience} yrs experience
                </span>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-3 shrink-0 self-stretch sm:self-auto justify-end">
            <button
              onClick={() => toggleSaveMutation.mutate()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-semibold text-white border border-white/[0.08] transition-all cursor-pointer"
            >
              {job.isSaved ? (
                <>
                  <BookmarkCheck className="w-4 h-4 text-brand-mint" />
                  <span>Saved</span>
                </>
              ) : (
                <>
                  <Bookmark className="w-4 h-4 text-white/60" />
                  <span>Save Job</span>
                </>
              )}
            </button>

            {hasApplied ? (
              <span className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-bold text-xs">
                <FileCheck2 className="w-4 h-4" />
                <span>Applied</span>
              </span>
            ) : (
              <button
                onClick={() => setIsApplyModalOpen(true)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-brand-mint to-cyan-400 text-black font-extrabold text-xs shadow-lg shadow-brand-mint/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Apply Now</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Highlights Bar */}
        <div className="mt-8 pt-6 border-t border-white/[0.06] grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-[11px] text-text-muted block">Discipline</span>
            <span className="font-semibold text-white mt-0.5 block">{job.discipline}</span>
          </div>
          <div>
            <span className="text-[11px] text-text-muted block">Infrastructure Sector</span>
            <span className="font-semibold text-white mt-0.5 block">
              {job.infrastructureSector}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-text-muted block">Compensation</span>
            <span className="font-semibold text-brand-mint mt-0.5 block">
              {job.salaryMin && job.salaryMax
                ? `${job.currency} ${job.salaryMin.toLocaleString()} – ${job.salaryMax.toLocaleString()}`
                : 'Competitive Industry Standards'}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-text-muted block">Application Deadline</span>
            <span className="font-semibold text-white mt-0.5 block">
              {job.applicationDeadline
                ? new Date(job.applicationDeadline).toLocaleDateString()
                : 'Open until filled'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Content Grid: Details & Company Sidebar ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Details (Left 2 cols) */}
        <div className="lg:col-span-2 space-y-8">
          {/* About the Role */}
          <div className="space-y-3">
            <h3 className="text-base font-bold font-heading text-white flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-brand-mint" />
              <span>About the Role</span>
            </h3>
            <p className="text-sm text-white/80 leading-relaxed whitespace-pre-line">
              {job.description || job.responsibilities}
            </p>
          </div>

          {/* Key Responsibilities */}
          {job.responsibilities && (
            <div className="space-y-3">
              <h3 className="text-base font-bold font-heading text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>Responsibilities</span>
              </h3>
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-sm text-white/80 leading-relaxed whitespace-pre-line">
                {job.responsibilities}
              </div>
            </div>
          )}

          {/* Requirements */}
          {job.requirements && (
            <div className="space-y-3">
              <h3 className="text-base font-bold font-heading text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-brand-mint" />
                <span>Requirements & Experience</span>
              </h3>
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-sm text-white/80 leading-relaxed whitespace-pre-line">
                {job.requirements}
              </div>
            </div>
          )}

          {/* Software Requirements */}
          <div className="space-y-3">
            <h3 className="text-base font-bold font-heading text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-violet-400" />
              <span>Structured Software Requirements</span>
            </h3>
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 block mb-2">
                  Required Software (Must-have)
                </span>
                <div className="flex flex-wrap gap-2">
                  {job.requiredSoftware?.length > 0 ? (
                    job.requiredSoftware.map((sw) => (
                      <span
                        key={sw}
                        className="px-3 py-1.5 rounded-xl bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-xs font-semibold"
                      >
                        {sw}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-white/40">General tools as required</span>
                  )}
                </div>
              </div>

              {job.preferredSoftware?.length > 0 && (
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-violet-400 block mb-2">
                    Preferred Software (Advantageous)
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {job.preferredSoftware.map((sw) => (
                      <span
                        key={sw}
                        className="px-3 py-1.5 rounded-xl bg-violet-500/15 text-violet-300 border border-violet-500/30 text-xs font-semibold"
                      >
                        {sw}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Skills Requirements */}
          <div className="space-y-3">
            <h3 className="text-base font-bold font-heading text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-brand-mint" />
              <span>Skills Taxonomy</span>
            </h3>
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 block mb-2">
                  Required Skills
                </span>
                <div className="flex flex-wrap gap-2">
                  {job.requiredSkills?.map((sk) => (
                    <span
                      key={sk}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-semibold"
                    >
                      {sk}
                    </span>
                  ))}
                </div>
              </div>

              {job.preferredSkills?.length > 0 && (
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-white/60 block mb-2">
                    Preferred Skills
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {job.preferredSkills.map((sk) => (
                      <span
                        key={sk}
                        className="px-3 py-1.5 rounded-xl bg-white/[0.04] text-white/80 border border-white/[0.06] text-xs font-medium"
                      >
                        {sk}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Education & Certifications */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-brand-mint" />
                <span>Education</span>
              </h4>
              <p className="text-sm font-semibold text-white">
                {job.requiredEducation || 'Degree / Diploma in Engineering or relevant field'}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                <Award className="w-4 h-4 text-brand-mint" />
                <span>Certifications</span>
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {job.requiredCertifications?.length > 0 ? (
                  job.requiredCertifications.map((c) => (
                    <span
                      key={c}
                      className="px-2.5 py-1 rounded-lg bg-white/[0.05] text-xs font-medium text-white/90"
                    >
                      {c}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-white/40">None required</span>
                )}
              </div>
            </div>
          </div>

          {/* Benefits */}
          {job.benefits && (
            <div className="space-y-3">
              <h3 className="text-base font-bold font-heading text-white">
                Benefits & Perks
              </h3>
              <p className="text-sm text-white/80 leading-relaxed whitespace-pre-line p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                {job.benefits}
              </p>
            </div>
          )}
        </div>

        {/* Company & Context Sidebar (Right 1 col) */}
        <div className="space-y-6">
          {/* About the Company */}
          <div className="p-6 rounded-3xl bg-[#111116] border border-white/[0.08] space-y-4">
            <h3 className="text-base font-bold font-heading text-white">
              About the Employer
            </h3>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center overflow-hidden shrink-0">
                {org.logo ? (
                  <img src={org.logo} alt={org.name} className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="w-6 h-6 text-brand-mint" />
                )}
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">{org.name}</h4>
                <span className="text-xs text-text-muted">{org.industry}</span>
              </div>
            </div>

            <p className="text-xs text-text-muted leading-relaxed line-clamp-4">
              {org.description || 'Specialized infrastructure engineering organization.'}
            </p>

            {org.website && (
              <a
                href={org.website}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-xs text-brand-mint hover:underline font-semibold"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Visit Company Website</span>
              </a>
            )}

            {org.slug && (
              <div className="pt-2">
                <Link
                  to={`/businesses/${org.slug}`}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-semibold text-white transition-colors"
                >
                  <span>View Company Profile</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            )}
          </div>

          {/* Other Jobs from this Business */}
          {job.otherJobs && job.otherJobs.length > 0 && (
            <div className="p-6 rounded-3xl bg-[#111116] border border-white/[0.08] space-y-4">
              <h3 className="text-sm font-bold font-heading text-white uppercase tracking-wider">
                More Jobs from {org.name}
              </h3>
              <div className="space-y-3">
                {job.otherJobs.map((oj) => (
                  <Link
                    key={oj._id}
                    to={`/jobs/${oj._id}`}
                    className="block p-3.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.04] transition-all"
                  >
                    <h5 className="font-bold text-xs text-white line-clamp-1">{oj.title}</h5>
                    <p className="text-[11px] text-text-muted mt-1">
                      {oj.location} • {oj.workMode}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Apply Now Modal ── */}
      {isApplyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg bg-[#14141c] border border-white/[0.1] rounded-3xl shadow-2xl p-6 sm:p-8 text-white space-y-5">
            <div className="flex items-start justify-between pb-4 border-b border-white/[0.08]">
              <div>
                <h3 className="text-lg font-bold font-heading text-white">Apply for {job.title}</h3>
                <p className="text-xs text-brand-mint font-semibold mt-0.5">{org.name}</p>
              </div>
              <button
                onClick={() => setIsApplyModalOpen(false)}
                className="p-1.5 rounded-xl text-white/40 hover:text-white hover:bg-white/[0.06]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-white/80 font-semibold mb-1.5">
                  Portfolio / Resume URL <span className="text-brand-mint">*</span>
                </label>
                <input
                  type="url"
                  required
                  value={resumeUrl}
                  onChange={(e) => setResumeUrl(e.target.value)}
                  placeholder="https://drive.google.com/... or your personal site"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-white/30 outline-none focus:border-brand-mint"
                />
              </div>

              <div>
                <label className="block text-white/80 font-semibold mb-1.5">
                  Cover Note / Engineering Highlights
                </label>
                <textarea
                  rows={4}
                  value={coverNote}
                  onChange={(e) => setCoverNote(e.target.value)}
                  placeholder="Briefly state your relevant infrastructure project experience and software expertise..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-white/30 outline-none focus:border-brand-mint resize-none"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-[11px] text-text-muted leading-relaxed">
                By submitting this application, your verified Zeitnah profile and project portfolio will be made available to the hiring team at {org.name}.
              </div>
            </div>

            <div className="pt-4 border-t border-white/[0.08] flex items-center justify-end gap-3">
              <button
                onClick={() => setIsApplyModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white/60 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => applyMutation.mutate()}
                disabled={applyMutation.isPending || !resumeUrl.trim()}
                className="px-6 py-2.5 rounded-xl bg-brand-mint text-black font-bold text-xs shadow-lg shadow-brand-mint/20 hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer"
              >
                {applyMutation.isPending ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
