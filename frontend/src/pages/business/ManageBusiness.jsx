import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  Building2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Plus,
  Briefcase,
  Users,
  Settings,
  MapPin,
  ExternalLink,
  FileText,
  Eye,
  RotateCcw,
  Sparkles,
  Edit3,
  Archive,
  Trash2,
  X,
} from 'lucide-react';
import { organizationService } from '../../services/organizationService';
import { opportunityService } from '../../services/opportunityService';
import { useToast } from '../../components/ui/Toast';
import { getErrorMessage } from '../../utils/errorMessage';
import CreateBusinessModal from './CreateBusinessModal';
import EditBusinessModal from './EditBusinessModal';
import CreateJobModal from './CreateJobModal';
import RecommendedTalent from './RecommendedTalent';

export default function ManageBusiness() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [selectedOrgId, setSelectedOrgId] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'jobs' | 'profile' | 'settings' | 'applicants' | 'offers' | 'talent'
  const [jobFilter, setJobFilter] = useState('ALL'); // 'ALL' | 'PUBLISHED' | 'DRAFT' | 'CLOSED' | 'ARCHIVED'
  const [selectedTalentJobId, setSelectedTalentJobId] = useState(null); // For per-job talent view

  // Modal states
  const [isCreateBusinessOpen, setIsCreateBusinessOpen] = useState(false);
  const [isEditBusinessOpen, setIsEditBusinessOpen] = useState(false);
  const [isCreateJobOpen, setIsCreateJobOpen] = useState(false);
  const [jobToEdit, setJobToEdit] = useState(null);
  const [missingFieldsPrompt, setMissingFieldsPrompt] = useState(null);

  // Status transition confirmation dialogs
  const [reopenJob, setReopenJob] = useState(null);
  const [reopenDeadline, setReopenDeadline] = useState('');
  const [closingJob, setClosingJob] = useState(null);
  const [archivingJob, setArchivingJob] = useState(null);
  const [deletingJob, setDeletingJob] = useState(null);

  // In-flight mutation tracking
  const [mutatingJobId, setMutatingJobId] = useState(null);
  const [currentTimestamp] = useState(() => Date.now());
  const [minReopenDate] = useState(() => new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  const [resubmitting, setResubmitting] = useState(false);

  // Applicant management workspace state
  const [selectedApplicantJobId, setSelectedApplicantJobId] = useState(null);
  const [applicantFilterStatus, setApplicantFilterStatus] = useState('ALL');
  const [applicantCoverNoteModal, setApplicantCoverNoteModal] = useState(null);

  // Fetch user businesses
  const {
    data: businesses = [],
    isLoading: loadingBusinesses,
    refetch: refetchBusinesses,
  } = useQuery({
    queryKey: ['my-businesses'],
    queryFn: () => organizationService.getMyOrganizations(),
  });

  // Select first business if none selected
  useEffect(() => {
    if (businesses.length > 0 && !selectedOrgId) {
      setSelectedOrgId(businesses[0]._id || businesses[0].id);
    }
  }, [businesses, selectedOrgId]);

  const activeBusiness =
    businesses.find((b) => (b._id || b.id) === selectedOrgId) || businesses[0];

  // Fetch jobs for selected business
  const {
    data: jobs = [],
    isLoading: _loadingJobs,
    refetch: refetchJobs,
  } = useQuery({
    queryKey: ['business-jobs', selectedOrgId, jobFilter],
    queryFn: () =>
      opportunityService.getBusinessJobs(selectedOrgId, jobFilter),
    enabled: !!selectedOrgId,
  });

  // Resolve current job for applicants view
  const activeApplicantJob =
    jobs.find((j) => (j._id || j.id) === selectedApplicantJobId) ||
    jobs.find((j) => (j.applicantCount || 0) > 0) ||
    jobs.find((j) => j.status === 'PUBLISHED') ||
    jobs[0];

  const currentApplicantJobId = activeApplicantJob?._id || activeApplicantJob?.id;

  // Fetch applications for selected job in applicants tab
  const {
    data: jobApplications = [],
    isLoading: loadingApplicants,
    refetch: refetchApplicants,
  } = useQuery({
    queryKey: ['job-applications', currentApplicantJobId],
    queryFn: () => opportunityService.getJobApplications(currentApplicantJobId),
    enabled: !!currentApplicantJobId && activeTab === 'applicants',
  });

  const isApproved =
    activeBusiness?.status === 'APPROVED' || activeBusiness?.isVerified;
  const isPending =
    activeBusiness?.status === 'PENDING' ||
    activeBusiness?.verificationStatus === 'PENDING';
  const isRejected = activeBusiness?.status === 'REJECTED';
  const isSuspended = activeBusiness?.status === 'SUSPENDED';

  const handleResubmit = async () => {
    try {
      setResubmitting(true);
      await organizationService.resubmitOrganization(
        activeBusiness._id || activeBusiness.id,
      );
      toast.success('Business resubmitted for admin review');
      refetchBusinesses();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to resubmit business'));
    } finally {
      setResubmitting(false);
    }
  };

  const handleUpdateJobStatus = async (jobId, newStatus, deadline = null) => {
    if (mutatingJobId === jobId) return;
    try {
      setMutatingJobId(jobId);
      await opportunityService.updateStatus(jobId, newStatus, deadline);
      toast.success(`Job status updated to ${newStatus}`);
      refetchJobs();
      refetchBusinesses();
      queryClient.invalidateQueries({ queryKey: ['business-jobs'] });
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update job status'));
    } finally {
      setMutatingJobId(null);
    }
  };

  // Re-open job logic (checks expired deadline first)
  const handleReopenClick = (job) => {
    const isExpired =
      job.applicationDeadline &&
      new Date(job.applicationDeadline).getTime() < Date.now();

    if (isExpired) {
      // Suggest future deadline (30 days from today)
      const defaultDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      setReopenDeadline(defaultDate);
      setReopenJob(job);
    } else {
      // Valid deadline: proceed directly
      handleUpdateJobStatus(job._id || job.id, 'PUBLISHED');
    }
  };

  const handleConfirmReopen = async () => {
    if (!reopenJob) return;
    if (!reopenDeadline) {
      toast.warning('Please select a new application deadline');
      return;
    }
    const deadlineDate = new Date(reopenDeadline);
    if (deadlineDate.getTime() < Date.now()) {
      toast.warning('New application deadline must be in the future');
      return;
    }

    try {
      setMutatingJobId(reopenJob._id || reopenJob.id);
      await opportunityService.updateStatus(
        reopenJob._id || reopenJob.id,
        'PUBLISHED',
        deadlineDate.toISOString(),
      );
      toast.success('Job re-opened and published successfully with new deadline!');
      setReopenJob(null);
      refetchJobs();
      refetchBusinesses();
      queryClient.invalidateQueries({ queryKey: ['business-jobs'] });
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to re-open job'));
    } finally {
      setMutatingJobId(null);
    }
  };

  // Smart draft publishing logic (validates before direct submit)
  const handlePublishDraftClick = (job) => {
    const missing = [];
    if (!job.title || !job.title.trim()) missing.push('Job title');
    const descLen = (job.description || '').trim().length;
    const respLen = (job.responsibilities || '').trim().length;
    const reqLen = (job.requirements || '').trim().length;
    if (descLen < 10 && respLen === 0 && reqLen === 0) {
      missing.push('Detailed description, responsibilities, or requirements');
    }
    const skills = job.requiredSkills || job.skills || [];
    if (skills.length === 0) {
      missing.push('At least one required skill');
    }
    if (
      job.applicationDeadline &&
      new Date(job.applicationDeadline).getTime() < currentTimestamp - 86400000
    ) {
      missing.push('Valid future application deadline');
    }
    if (!isApproved) {
      missing.push('Business approval by administrator');
    }

    if (missing.length > 0) {
      toast.warning('Please complete the missing details before publishing.');
      setJobToEdit(job);
      setMissingFieldsPrompt(missing.join(' • '));
      setIsCreateJobOpen(true);
      return;
    }

    handleUpdateJobStatus(job._id || job.id, 'PUBLISHED');
  };

  // Close job confirmation
  const handleConfirmClose = async () => {
    if (!closingJob) return;
    try {
      setMutatingJobId(closingJob._id || closingJob.id);
      await opportunityService.updateStatus(closingJob._id || closingJob.id, 'CLOSED');
      toast.success('Job closed successfully');
      setClosingJob(null);
      refetchJobs();
      refetchBusinesses();
      queryClient.invalidateQueries({ queryKey: ['business-jobs'] });
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to close job'));
    } finally {
      setMutatingJobId(null);
    }
  };

  // Archive job confirmation
  const handleConfirmArchive = async () => {
    if (!archivingJob) return;
    try {
      setMutatingJobId(archivingJob._id || archivingJob.id);
      await opportunityService.updateStatus(archivingJob._id || archivingJob.id, 'ARCHIVED');
      toast.success('Job archived successfully');
      setArchivingJob(null);
      refetchJobs();
      refetchBusinesses();
      queryClient.invalidateQueries({ queryKey: ['business-jobs'] });
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to archive job'));
    } finally {
      setMutatingJobId(null);
    }
  };

  // Delete job confirmation
  const handleConfirmDelete = async () => {
    if (!deletingJob) return;
    try {
      setMutatingJobId(deletingJob._id || deletingJob.id);
      await opportunityService.deleteOpportunity(deletingJob._id || deletingJob.id);
      toast.success('Job opportunity deleted successfully');
      setDeletingJob(null);
      refetchJobs();
      refetchBusinesses();
      queryClient.invalidateQueries({ queryKey: ['business-jobs'] });
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete job'));
    } finally {
      setMutatingJobId(null);
    }
  };

  // Update applicant review status
  const handleUpdateApplicationStatus = async (applicationId, newStatus) => {
    try {
      await opportunityService.updateApplicationStatus(applicationId, newStatus);
      toast.success(`Application status updated to ${newStatus}`);
      refetchApplicants();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update application status'));
    }
  };

  if (loadingBusinesses) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col items-center justify-center min-h-[50vh]">
        <div className="w-10 h-10 border-2 border-brand-mint/20 border-t-brand-mint rounded-full animate-spin" />
        <p className="text-xs text-text-muted mt-3 font-semibold uppercase tracking-wider">
          Loading business dashboard...
        </p>
      </div>
    );
  }

  // Empty state: User has no business yet
  if (businesses.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-brand-mint/10 border border-brand-mint/30 flex items-center justify-center text-brand-mint shadow-xl shadow-brand-mint/10 mb-6">
          <Building2 className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-heading font-extrabold text-white tracking-tight">
          Manage Business
        </h1>
        <p className="text-sm text-text-muted max-w-md mx-auto mt-2 leading-relaxed">
          You don't have any registered businesses yet. Create your verified employer profile to start publishing infrastructure jobs and sourcing specialized engineering talent.
        </p>
        <button
          onClick={() => setIsCreateBusinessOpen(true)}
          className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-brand-mint text-black font-bold text-sm shadow-xl shadow-brand-mint/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          <span>+ Create Business</span>
        </button>

        <CreateBusinessModal
          isOpen={isCreateBusinessOpen}
          onClose={() => setIsCreateBusinessOpen(false)}
          onSuccess={() => {
            toast.success('Business created and submitted for verification!');
            refetchBusinesses();
          }}
        />
      </div>
    );
  }

  // Filtered applicants in current tab
  const filteredApplicants = jobApplications.filter((app) => {
    if (applicantFilterStatus === 'ALL') return true;
    return app.status === applicantFilterStatus;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 pb-36 sm:pb-16">
      {/* Top Bar: Business Switcher & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.06]">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#181822] border border-white/[0.08] flex items-center justify-center overflow-hidden shrink-0 shadow-lg">
            {activeBusiness?.logo ? (
              <img
                src={activeBusiness.logo}
                alt={activeBusiness.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <Building2 className="w-7 h-7 text-brand-mint" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold font-heading text-white">
                {activeBusiness?.name}
              </h1>

              {/* Status Badge */}
              {isApproved && (
                <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Verified</span>
                </span>
              )}
              {isPending && (
                <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Verification Pending</span>
                </span>
              )}
              {isRejected && (
                <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30">
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Not Approved</span>
                </span>
              )}
              {isSuspended && (
                <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Suspended</span>
                </span>
              )}
            </div>

            <p className="text-xs text-text-muted mt-1 flex items-center gap-3 flex-wrap">
              <span>{activeBusiness?.industry || 'Infrastructure'}</span>
              {activeBusiness?.location && (
                <>
                  <span className="text-white/20">•</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span>{activeBusiness.location}</span>
                  </span>
                </>
              )}
              {activeBusiness?.slug && isApproved && (
                <>
                  <span className="text-white/20">•</span>
                  <Link
                    to={`/businesses/${activeBusiness.slug}`}
                    className="flex items-center gap-1 text-brand-mint hover:underline font-semibold"
                  >
                    <span>Public Profile</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Business Selector & Create Button */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {businesses.length > 1 && (
            <select
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value)}
              className="px-3.5 py-2.5 min-h-[44px] rounded-xl bg-[#161620] border border-white/[0.08] text-xs text-white font-medium outline-none focus:border-brand-mint cursor-pointer"
            >
              {businesses.map((b) => (
                <option key={b._id || b.id} value={b._id || b.id}>
                  {b.name} ({b.status})
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => setIsCreateBusinessOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 min-h-[44px] rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-semibold text-white border border-white/[0.08] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Business</span>
          </button>

          <button
            onClick={() => {
              setJobToEdit(null);
              setMissingFieldsPrompt(null);
              setIsCreateJobOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-xl bg-brand-mint text-black font-bold text-xs shadow-lg shadow-brand-mint/20 hover:opacity-90 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Create Job</span>
          </button>
        </div>
      </div>

      {/* Verification Status Alert Banners */}
      {isPending && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs flex items-start gap-3">
          <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-amber-300 text-sm">Business Verification Pending</h4>
            <p className="text-amber-200/80 leading-relaxed">
              Your business profile is currently under administrator verification review. You can prepare and save job drafts now. Once verified, your public business profile and jobs will become publicly discoverable across the Zeitnah network.
            </p>
          </div>
        </div>
      )}

      {isRejected && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-200 text-xs flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-red-300 text-sm">Business Verification Not Approved</h4>
              <p className="text-red-200/80 leading-relaxed">
                <strong>Reason:</strong>{' '}
                {activeBusiness.rejectionReason || 'Registration details did not meet platform infrastructure requirements.'}
              </p>
            </div>
          </div>
          <button
            onClick={handleResubmit}
            disabled={resubmitting}
            className="flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-xl bg-red-500 text-white font-bold text-xs hover:bg-red-600 transition-colors shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{resubmitting ? 'Submitting...' : 'Resubmit for Review'}</span>
          </button>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-x-auto">
        {[
          { id: 'overview', label: 'Overview', icon: Building2 },
          { id: 'jobs', label: `Jobs (${activeBusiness?.totalJobCount ?? jobs.length})`, icon: Briefcase },
          { id: 'talent', label: 'AI Talent', icon: Sparkles },
          { id: 'applicants', label: `Applicants (${jobs.reduce((acc, j) => acc + (j.applicantCount || 0), 0)})`, icon: Users },
          { id: 'profile', label: 'Business Profile', icon: FileText },
          { id: 'settings', label: 'Settings', icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                active
                  ? 'bg-brand-mint text-black font-bold shadow-md shadow-brand-mint/15'
                  : 'text-text-muted hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                Active Jobs
              </span>
              <p className="text-3xl font-extrabold text-white mt-1">
                {activeBusiness?.activeJobCount ?? 0}
              </p>
              <span className="text-[10px] text-emerald-400 mt-1 block">
                Live & discoverable
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                Draft Jobs
              </span>
              <p className="text-3xl font-extrabold text-white mt-1">
                {activeBusiness?.draftJobCount ?? 0}
              </p>
              <span className="text-[10px] text-text-muted mt-1 block">
                Ready to publish
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                Closed Jobs
              </span>
              <p className="text-3xl font-extrabold text-white mt-1">
                {activeBusiness?.closedJobCount ?? 0}
              </p>
              <span className="text-[10px] text-text-muted mt-1 block">
                Archived roles
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                Total Applicants
              </span>
              <p className="text-3xl font-extrabold text-cyan-300 mt-1">
                {jobs.reduce((acc, j) => acc + (j.applicantCount || 0), 0)}
              </p>
              <span className="text-[10px] text-cyan-400 mt-1 block">
                Applications received
              </span>
            </div>
          </div>

          {/* Quick Actions & Recent Jobs */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Jobs Column */}
            <div className="lg:col-span-2 p-6 rounded-3xl bg-white/[0.02] border border-white/[0.06] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white font-heading">
                  Recent Jobs Posted
                </h3>
                <button
                  onClick={() => setActiveTab('jobs')}
                  className="text-xs text-brand-mint hover:underline font-semibold cursor-pointer"
                >
                  View All Jobs
                </button>
              </div>

              {jobs.length === 0 ? (
                <div className="py-12 text-center text-text-muted space-y-2">
                  <Briefcase className="w-8 h-8 mx-auto text-white/20" />
                  <p className="text-xs">No jobs created yet for this business.</p>
                  <button
                    onClick={() => {
                      setJobToEdit(null);
                      setMissingFieldsPrompt(null);
                      setIsCreateJobOpen(true);
                    }}
                    className="text-xs text-brand-mint font-semibold hover:underline cursor-pointer"
                  >
                    + Create your first infrastructure job
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {jobs.slice(0, 4).map((job) => (
                    <div
                      key={job.id || job._id}
                      className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.1] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-sm text-white">
                            {job.title}
                          </h4>
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              job.status === 'PUBLISHED'
                                ? 'bg-emerald-500/15 text-emerald-400'
                                : job.status === 'DRAFT'
                                  ? 'bg-amber-500/15 text-amber-400'
                                  : 'bg-white/[0.05] text-white/50'
                            }`}
                          >
                            {job.status}
                          </span>
                        </div>
                        <p className="text-xs text-text-muted">
                          {job.discipline || 'Engineering'} • {job.workMode} •{' '}
                          {job.applicantCount || 0} applicants
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => {
                            setJobToEdit(job);
                            setMissingFieldsPrompt(null);
                            setIsCreateJobOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-semibold text-white/80 hover:text-white transition-colors cursor-pointer"
                        >
                          Edit
                        </button>
                        {job.status === 'PUBLISHED' && (
                          <button
                            onClick={() => setClosingJob(job)}
                            className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-red-500/20 text-xs font-semibold text-text-muted hover:text-red-300 transition-colors cursor-pointer"
                          >
                            Close
                          </button>
                        )}
                        {job.status === 'DRAFT' && isApproved && (
                          <button
                            onClick={() => handlePublishDraftClick(job)}
                            className="px-3 py-1.5 rounded-xl bg-brand-mint text-black font-bold text-xs hover:opacity-90 transition-opacity cursor-pointer"
                          >
                            Publish
                          </button>
                        )}
                        {job.status === 'CLOSED' && isApproved && (
                          <button
                            onClick={() => handleReopenClick(job)}
                            className="px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-semibold text-white transition-colors cursor-pointer"
                          >
                            Re-open
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Business Quick Details Card */}
            <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/[0.06] space-y-4">
              <h3 className="text-base font-bold text-white font-heading">
                Business Info
              </h3>
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-text-muted block text-[11px]">Type & Industry</span>
                  <span className="text-white font-medium">
                    {activeBusiness?.type} • {activeBusiness?.industry}
                  </span>
                </div>
                <div>
                  <span className="text-text-muted block text-[11px] mb-1">
                    Specializations
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {activeBusiness?.infrastructureSpecializations?.map((s) => (
                      <span
                        key={s}
                        className="px-2 py-0.5 rounded-md bg-brand-mint/10 text-brand-mint text-[10px] font-semibold"
                      >
                        {s}
                      </span>
                    )) || <span className="text-white/30">None added</span>}
                  </div>
                </div>
                <div>
                  <span className="text-text-muted block text-[11px]">Email & Phone</span>
                  <span className="text-white">
                    {activeBusiness?.businessEmail || 'Not specified'} •{' '}
                    {activeBusiness?.businessPhone || 'Not specified'}
                  </span>
                </div>
                <div>
                  <span className="text-text-muted block text-[11px]">Location</span>
                  <span className="text-white">
                    {activeBusiness?.officeLocation || activeBusiness?.location || 'Not specified'}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-white/[0.04]">
                <button
                  onClick={() => setIsEditBusinessOpen(true)}
                  className="w-full py-2.5 min-h-[44px] rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-semibold text-white transition-colors cursor-pointer"
                >
                  Edit Business Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: JOBS MANAGEMENT */}
      {activeTab === 'jobs' && (
        <div className="space-y-4">
          {/* Filter Pills */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              {['ALL', 'PUBLISHED', 'DRAFT', 'CLOSED', 'ARCHIVED'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setJobFilter(filter)}
                  className={`px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    jobFilter === filter
                      ? 'bg-brand-mint text-black font-bold'
                      : 'bg-white/[0.03] text-text-muted hover:text-white border border-white/[0.04]'
                  }`}
                >
                  {filter === 'ALL'
                    ? 'All Jobs'
                    : filter.charAt(0) + filter.slice(1).toLowerCase()}
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                setJobToEdit(null);
                setMissingFieldsPrompt(null);
                setIsCreateJobOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-xl bg-brand-mint text-black font-bold text-xs shadow-lg shadow-brand-mint/20 hover:opacity-90 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Create Job</span>
            </button>
          </div>

          {/* Job List */}
          {jobs.length === 0 ? (
            <div className="py-16 text-center text-text-muted bg-white/[0.02] border border-white/[0.06] rounded-3xl space-y-3">
              <Briefcase className="w-10 h-10 mx-auto text-white/20" />
              <h3 className="text-base font-bold text-white">No jobs found</h3>
              <p className="text-xs max-w-sm mx-auto">
                No jobs matching filter '{jobFilter}'. Create a new structured job to start recruiting.
              </p>
              <button
                onClick={() => {
                  setJobToEdit(null);
                  setMissingFieldsPrompt(null);
                  setIsCreateJobOpen(true);
                }}
                className="px-4 py-2.5 min-h-[44px] rounded-xl bg-brand-mint text-black font-bold text-xs cursor-pointer"
              >
                + Create Job
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {jobs.map((job) => {
                const isMutating = mutatingJobId === (job.id || job._id);
                const isExpired =
                  job.applicationDeadline &&
                  new Date(job.applicationDeadline).getTime() < currentTimestamp;

                return (
                  <div
                    key={job.id || job._id}
                    className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h4 className="text-base font-bold text-white font-heading">
                          {job.title}
                        </h4>
                        <span
                          className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                            job.status === 'PUBLISHED'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : job.status === 'DRAFT'
                                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                : job.status === 'ARCHIVED'
                                  ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                                  : 'bg-white/[0.05] text-white/50 border border-white/[0.08]'
                          }`}
                        >
                          {job.status}
                        </span>
                        {isExpired && job.status === 'CLOSED' && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-300 border border-rose-500/25">
                            Deadline Expired
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-text-muted flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-white/80">
                          {job.discipline || 'Engineering'}
                        </span>
                        <span>•</span>
                        <span>{job.infrastructureSector}</span>
                        <span>•</span>
                        <span>{job.workMode}</span>
                        <span>•</span>
                        <span>{job.location}</span>
                        <span>•</span>
                        <span>
                          Exp: {job.minYearsExperience}–{job.maxYearsExperience} yrs
                        </span>
                        {job.applicationDeadline && (
                          <>
                            <span>•</span>
                            <span className={isExpired ? 'text-rose-400 font-medium' : ''}>
                              Deadline: {dayjs(job.applicationDeadline).format('MMM D, YYYY')}
                            </span>
                          </>
                        )}
                      </p>

                      {job.requiredSkills && job.requiredSkills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {job.requiredSkills.map((sk) => (
                            <span
                              key={sk}
                              className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.04] text-cyan-300 border border-cyan-500/20"
                            >
                              {sk}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Actions & Applicant counter */}
                    <div className="flex items-center gap-2.5 flex-wrap shrink-0 self-end md:self-center">
                      <div className="text-right mr-2">
                        <span className="text-sm font-bold text-white block">
                          {job.applicantCount || 0}
                        </span>
                        <span className="text-[10px] text-text-muted">applicants</span>
                      </div>

                      {/* Edit Button */}
                      <button
                        onClick={() => {
                          setJobToEdit(job);
                          setMissingFieldsPrompt(null);
                          setIsCreateJobOpen(true);
                        }}
                        disabled={isMutating}
                        aria-label={`Edit ${job.title}`}
                        className="flex items-center gap-1 px-3 py-2 min-h-[40px] rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-semibold text-white transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      {/* AI Talent Button (Published) */}
                      {job.status === 'PUBLISHED' && (
                        <button
                          onClick={() => {
                            setSelectedTalentJobId(job.id || job._id);
                            setActiveTab('talent');
                          }}
                          className="flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl bg-brand-mint/10 hover:bg-brand-mint/20 text-brand-mint text-xs font-semibold border border-brand-mint/25 transition-all cursor-pointer"
                          title="View AI matched candidates for this job"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>AI Talent</span>
                        </button>
                      )}

                      {/* Close Button (Published) */}
                      {job.status === 'PUBLISHED' && (
                        <button
                          onClick={() => setClosingJob(job)}
                          disabled={isMutating}
                          className="px-3.5 py-2 min-h-[40px] rounded-xl bg-white/[0.04] hover:bg-red-500/20 text-xs font-semibold text-text-muted hover:text-red-300 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {isMutating ? 'Closing...' : 'Close'}
                        </button>
                      )}

                      {/* Publish Button (Draft) */}
                      {job.status === 'DRAFT' && isApproved && (
                        <button
                          onClick={() => handlePublishDraftClick(job)}
                          disabled={isMutating}
                          className="px-3.5 py-2 min-h-[40px] rounded-xl bg-brand-mint text-black font-bold text-xs transition-opacity hover:opacity-90 cursor-pointer disabled:opacity-50"
                        >
                          {isMutating ? 'Publishing...' : 'Publish'}
                        </button>
                      )}

                      {/* Re-open Button (Closed or Archived) */}
                      {(job.status === 'CLOSED' || job.status === 'ARCHIVED') && isApproved && (
                        <button
                          onClick={() => handleReopenClick(job)}
                          disabled={isMutating}
                          className="px-3.5 py-2 min-h-[40px] rounded-xl bg-brand-mint/15 hover:bg-brand-mint/25 text-brand-mint border border-brand-mint/30 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {isMutating ? 'Re-opening...' : 'Re-open'}
                        </button>
                      )}

                      {/* Archive Button (Published or Closed) */}
                      {(job.status === 'PUBLISHED' || job.status === 'CLOSED') && (
                        <button
                          onClick={() => setArchivingJob(job)}
                          disabled={isMutating}
                          aria-label={`Archive ${job.title}`}
                          title="Archive job"
                          className="p-2.5 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white/50 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                      )}

                      {/* Delete Button (Draft, Closed, Archived) */}
                      {(job.status === 'DRAFT' || job.status === 'CLOSED' || job.status === 'ARCHIVED') && (
                        <button
                          onClick={() => setDeletingJob(job)}
                          disabled={isMutating}
                          aria-label={`Delete ${job.title}`}
                          title="Delete job"
                          className="p-2.5 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl bg-white/[0.04] hover:bg-red-500/20 text-white/50 hover:text-red-400 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}

                      {/* Public View Link */}
                      <Link
                        to={`/jobs/${job.id || job._id}`}
                        aria-label={`View public posting for ${job.title}`}
                        className="p-2.5 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white/70 hover:text-white transition-colors"
                        title="View public job page"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: BUSINESS PROFILE PREVIEW */}
      {activeTab === 'profile' && (
        <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/[0.06] space-y-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-2xl font-bold font-heading text-white">
                {activeBusiness?.name}
              </h2>
              <p className="text-sm text-brand-mint mt-1">
                {activeBusiness?.industry} • {activeBusiness?.location}
              </p>
            </div>
            {isApproved && (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Verified Business</span>
              </span>
            )}
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
              About the Organization
            </h4>
            <p className="text-sm text-white/80 leading-relaxed max-w-3xl">
              {activeBusiness?.description || 'No description provided yet.'}
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
              Infrastructure Specializations
            </h4>
            <div className="flex flex-wrap gap-2">
              {activeBusiness?.infrastructureSpecializations?.map((spec) => (
                <span
                  key={spec}
                  className="px-3 py-1 rounded-xl bg-brand-mint/15 text-brand-mint border border-brand-mint/30 text-xs font-semibold"
                >
                  {spec}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-white/[0.06]">
            <div>
              <span className="text-[11px] text-text-muted block">Website</span>
              {activeBusiness?.website ? (
                <a
                  href={activeBusiness.website}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-brand-mint hover:underline font-semibold"
                >
                  {activeBusiness.website}
                </a>
              ) : (
                <span className="text-xs text-white">Not provided</span>
              )}
            </div>
            <div>
              <span className="text-[11px] text-text-muted block">Company Size</span>
              <span className="text-xs text-white">
                {activeBusiness?.companySize || 'Not specified'}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-text-muted block">Founded</span>
              <span className="text-xs text-white">
                {activeBusiness?.foundedYear || 'Not specified'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SETTINGS */}
      {activeTab === 'settings' && (
        <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/[0.06] space-y-6">
          <div>
            <h3 className="text-lg font-bold font-heading text-white mb-2">
              Edit Business Settings
            </h3>
            <p className="text-xs text-text-muted leading-relaxed max-w-xl">
              Update your organization's core profile, location, contact details, specializations, and company information. Changes are safely applied to your active business profile without affecting verification status.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setIsEditBusinessOpen(true)}
              className="px-5 py-2.5 min-h-[44px] rounded-xl bg-brand-mint text-black font-bold text-xs shadow-lg shadow-brand-mint/20 hover:opacity-90 cursor-pointer"
            >
              Update Business Profile
            </button>
            <button
              onClick={() => setIsCreateBusinessOpen(true)}
              className="px-4 py-2.5 min-h-[44px] rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-white text-xs font-semibold border border-white/[0.08] transition-colors cursor-pointer"
            >
              Register Another Business
            </button>
          </div>
        </div>
      )}

      {/* TAB: AI RECOMMENDED TALENT */}
      {activeTab === 'talent' && (
        <div className="space-y-5">
          {jobs.filter((j) => j.status === 'PUBLISHED').length === 0 ? (
            <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/[0.06] text-center space-y-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-white/[0.05] flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-text-muted" />
              </div>
              <h3 className="text-sm font-bold text-white">Publish a job to unlock AI talent matching</h3>
              <p className="text-xs text-text-muted max-w-sm mx-auto">
                AI talent matching automatically identifies compatible infrastructure professionals when you publish a structured job.
              </p>
              <button
                onClick={() => {
                  setJobToEdit(null);
                  setMissingFieldsPrompt(null);
                  setIsCreateJobOpen(true);
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl bg-brand-mint text-black font-bold text-xs shadow-lg shadow-brand-mint/20 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Create Job
              </button>
            </div>
          ) : (
            <>
              {/* Job Selector for Talent View */}
              <div className="flex items-center gap-3 pb-3 border-b border-white/[0.06] overflow-x-auto">
                <span className="text-xs font-semibold text-text-muted shrink-0">Select Job:</span>
                {jobs
                  .filter((j) => j.status === 'PUBLISHED')
                  .map((j) => {
                    const isSelected =
                      (selectedTalentJobId || jobs.filter((x) => x.status === 'PUBLISHED')[0]?._id) ===
                      (j._id || j.id);
                    return (
                      <button
                        key={j._id || j.id}
                        onClick={() => setSelectedTalentJobId(j._id || j.id)}
                        className={`px-3 py-1.5 min-h-[40px] rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-brand-mint text-black font-bold shadow-md shadow-brand-mint/15'
                            : 'bg-white/[0.03] text-text-muted hover:text-white border border-white/[0.04]'
                        }`}
                      >
                        {j.title}
                      </button>
                    );
                  })}
              </div>

              <RecommendedTalent
                jobId={
                  selectedTalentJobId ||
                  jobs.filter((j) => j.status === 'PUBLISHED')[0]?._id ||
                  jobs.filter((j) => j.status === 'PUBLISHED')[0]?.id
                }
                jobTitle={
                  jobs.find(
                    (j) =>
                      (j._id || j.id) ===
                      (selectedTalentJobId || jobs.filter((x) => x.status === 'PUBLISHED')[0]?._id),
                  )?.title || 'Job Opportunity'
                }
              />
            </>
          )}
        </div>
      )}

      {/* TAB: RECRUITER APPLICANT WORKSPACE */}
      {activeTab === 'applicants' && (
        <div className="space-y-6">
          {/* Header & Job Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
            <div>
              <h3 className="text-base font-bold font-heading text-white">
                Candidate Applications
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                Review submissions, examine engineering resumes, and manage hiring pipeline status.
              </p>
            </div>

            {jobs.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-muted shrink-0">Posting:</span>
                <select
                  value={currentApplicantJobId || ''}
                  onChange={(e) => setSelectedApplicantJobId(e.target.value)}
                  className="px-3 py-2 min-h-[44px] rounded-xl bg-[#161620] border border-white/[0.08] text-xs text-white font-medium outline-none focus:border-brand-mint cursor-pointer"
                >
                  {jobs.map((j) => (
                    <option key={j._id || j.id} value={j._id || j.id}>
                      {j.title} ({j.applicantCount || 0} applicants)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Applicant Filter Tabs */}
          {jobs.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {[
                { id: 'ALL', label: 'All Submissions' },
                { id: 'submitted', label: 'Submitted' },
                { id: 'reviewing', label: 'In Review' },
                { id: 'shortlisted', label: 'Shortlisted' },
                { id: 'offered', label: 'Offered' },
                { id: 'rejected', label: 'Rejected' },
              ].map((filter) => {
                const count =
                  filter.id === 'ALL'
                    ? jobApplications.length
                    : jobApplications.filter((a) => a.status === filter.id).length;
                return (
                  <button
                    key={filter.id}
                    onClick={() => setApplicantFilterStatus(filter.id)}
                    className={`px-3 py-1.5 min-h-[40px] rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      applicantFilterStatus === filter.id
                        ? 'bg-brand-mint text-black font-bold'
                        : 'bg-white/[0.03] text-text-muted hover:text-white border border-white/[0.04]'
                    }`}
                  >
                    {filter.label} ({count})
                  </button>
                );
              })}
            </div>
          )}

          {/* Applicant List State */}
          {loadingApplicants ? (
            <div className="p-12 text-center space-y-3 bg-white/[0.02] border border-white/[0.06] rounded-3xl">
              <div className="w-8 h-8 mx-auto border-2 border-brand-mint/20 border-t-brand-mint rounded-full animate-spin" />
              <p className="text-xs text-text-muted font-medium">Loading applications...</p>
            </div>
          ) : filteredApplicants.length === 0 ? (
            <div className="p-12 text-center space-y-3 bg-white/[0.02] border border-white/[0.06] rounded-3xl">
              <Users className="w-10 h-10 mx-auto text-white/20" />
              <h4 className="text-sm font-bold text-white">No applicants matching filter</h4>
              <p className="text-xs text-text-muted max-w-sm mx-auto">
                {jobApplications.length === 0
                  ? 'No candidates have applied to this posting yet. Qualified applicants will appear here automatically.'
                  : `No applications currently have status '${applicantFilterStatus}'.`}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredApplicants.map((app) => {
                const candidate = app.candidate || {};
                const candidateName = candidate.name || 'Anonymous Candidate';
                const candidateUsername = candidate.username ? `@${candidate.username}` : '';
                const candidateHeadline =
                  candidate.headline || candidate.primaryRole || 'Infrastructure Specialist';

                return (
                  <div
                    key={app.id || app._id}
                    className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    {/* Candidate Identity */}
                    <div className="flex items-start gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-mint/20 to-cyan-500/20 border border-brand-mint/30 flex items-center justify-center font-bold text-sm text-brand-mint shrink-0 overflow-hidden">
                        {candidate.avatar ? (
                          <img
                            src={candidate.avatar}
                            alt={candidateName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          candidateName.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-white font-heading">
                            {candidateName}
                          </h4>
                          {candidateUsername && (
                            <span className="text-xs text-text-muted font-mono">
                              {candidateUsername}
                            </span>
                          )}
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              app.status === 'shortlisted'
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : app.status === 'reviewing'
                                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                  : app.status === 'offered'
                                    ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                                    : app.status === 'rejected'
                                      ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                                      : 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                            }`}
                          >
                            {app.status}
                          </span>
                        </div>
                        <p className="text-xs text-text-muted">{candidateHeadline}</p>
                        <p className="text-[11px] text-white/40 flex items-center gap-2">
                          <span>
                            Applied on {dayjs(app.appliedAt).format('MMM D, YYYY')}
                          </span>
                          {candidate.email && (
                            <>
                              <span>•</span>
                              <span>{candidate.email}</span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Candidate Actions */}
                    <div className="flex items-center gap-2.5 flex-wrap self-end md:self-center">
                      {/* Cover Note button */}
                      {app.coverNote && (
                        <button
                          onClick={() =>
                            setApplicantCoverNoteModal({
                              candidateName,
                              note: app.coverNote,
                            })
                          }
                          className="px-3 py-1.5 min-h-[40px] rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-semibold text-white/80 hover:text-white transition-colors cursor-pointer"
                        >
                          Cover Note
                        </button>
                      )}

                      {/* Resume button */}
                      {app.resumeUrl ? (
                        <a
                          href={app.resumeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 min-h-[40px] rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/25 text-xs font-semibold transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Resume</span>
                          <ExternalLink className="w-3 h-3 ml-0.5" />
                        </a>
                      ) : (
                        <span className="text-[11px] text-text-muted px-2 py-1 bg-white/[0.02] rounded-lg">
                          No Resume
                        </span>
                      )}

                      {/* View Profile */}
                      {(candidate.username || candidate.id) && (
                        <Link
                          to={`/profile/${candidate.username || candidate.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white/60 hover:text-white transition-colors"
                          title="View public profile"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                      )}

                      {/* Pipeline Status Selector */}
                      <select
                        value={app.status}
                        onChange={(e) =>
                          handleUpdateApplicationStatus(app.id, e.target.value)
                        }
                        className="px-3 py-1.5 min-h-[40px] rounded-xl bg-[#161620] border border-white/[0.08] text-xs font-semibold text-white outline-none focus:border-brand-mint cursor-pointer"
                      >
                        <option value="submitted">Submitted</option>
                        <option value="reviewing">In Review</option>
                        <option value="shortlisted">Shortlisted</option>
                        <option value="offered">Offered</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── MODAL: RE-OPEN EXPIRED JOB ────────────────────────────── */}
      {reopenJob && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reopen-job-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        >
          <div className="w-full max-w-md bg-[#121217] border border-white/[0.1] rounded-3xl p-6 shadow-2xl space-y-4 text-white">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-brand-mint/15 border border-brand-mint/30 flex items-center justify-center text-brand-mint">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="reopen-job-modal-title" className="text-base font-bold font-heading text-white">
                    Re-open Opportunity
                  </h3>
                  <p className="text-xs text-text-muted">
                    Set a new application deadline to publish.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setReopenJob(null)}
                className="p-1.5 rounded-xl text-white/40 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs">
              This job's previous application deadline has passed. Please specify a new valid application deadline to publish this position on the live network.
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-white/80">
                New Application Deadline <span className="text-brand-mint">*</span>
              </label>
              <input
                type="date"
                min={minReopenDate}
                value={reopenDeadline}
                onChange={(e) => setReopenDeadline(e.target.value)}
                className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl bg-white/[0.04] border border-white/[0.08] focus:border-brand-mint text-sm text-white outline-none cursor-pointer"
              />
              <p className="text-[11px] text-text-muted">
                Must be at least 24 hours in the future.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={() => setReopenJob(null)}
                className="px-4 py-2 min-h-[44px] rounded-xl text-xs font-semibold text-white/60 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={mutatingJobId === reopenJob._id}
                onClick={handleConfirmReopen}
                className="px-5 py-2 min-h-[44px] rounded-xl bg-brand-mint text-black font-bold text-xs shadow-lg shadow-brand-mint/20 hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer"
              >
                {mutatingJobId === reopenJob._id ? 'Re-opening...' : 'Re-open & Publish'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CLOSE JOB CONFIRMATION ──────────────────────────── */}
      {closingJob && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="close-job-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        >
          <div className="w-full max-w-md bg-[#121217] border border-white/[0.1] rounded-3xl p-6 shadow-2xl space-y-4 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-300">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 id="close-job-modal-title" className="text-base font-bold font-heading text-white">
                  Close Job Opportunity?
                </h3>
                <p className="text-xs text-text-muted">{closingJob.title}</p>
              </div>
            </div>

            <p className="text-xs text-white/70 leading-relaxed">
              Closing this job will hide it from the active public search. Candidates will no longer be able to submit new applications. You can re-open it at any time from your business dashboard.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={() => setClosingJob(null)}
                className="px-4 py-2 min-h-[44px] rounded-xl text-xs font-semibold text-white/60 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={mutatingJobId === closingJob._id}
                onClick={handleConfirmClose}
                className="px-5 py-2 min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {mutatingJobId === closingJob._id ? 'Closing...' : 'Close Job'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: ARCHIVE JOB CONFIRMATION ────────────────────────── */}
      {archivingJob && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="archive-job-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        >
          <div className="w-full max-w-md bg-[#121217] border border-white/[0.1] rounded-3xl p-6 shadow-2xl space-y-4 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-300">
                <Archive className="w-5 h-5" />
              </div>
              <div>
                <h3 id="archive-job-modal-title" className="text-base font-bold font-heading text-white">
                  Archive Job Opportunity?
                </h3>
                <p className="text-xs text-text-muted">{archivingJob.title}</p>
              </div>
            </div>

            <p className="text-xs text-white/70 leading-relaxed">
              Archiving moves this posting to long-term storage and deactivates active AI talent matching. Existing applicants remain preserved for historical review.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={() => setArchivingJob(null)}
                className="px-4 py-2 min-h-[44px] rounded-xl text-xs font-semibold text-white/60 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={mutatingJobId === archivingJob._id}
                onClick={handleConfirmArchive}
                className="px-5 py-2 min-h-[44px] rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {mutatingJobId === archivingJob._id ? 'Archiving...' : 'Archive Job'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: DELETE JOB CONFIRMATION ──────────────────────────── */}
      {deletingJob && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-job-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        >
          <div className="w-full max-w-md bg-[#121217] border border-white/[0.1] rounded-3xl p-6 shadow-2xl space-y-4 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 id="delete-job-modal-title" className="text-base font-bold font-heading text-white">
                  Permanently Delete Job?
                </h3>
                <p className="text-xs text-text-muted">{deletingJob.title}</p>
              </div>
            </div>

            <p className="text-xs text-white/70 leading-relaxed">
              This action cannot be undone. The opportunity and all associated matching records will be removed. If this job has received candidate applications, deletion will be blocked to safeguard candidate records—you may archive it instead.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={() => setDeletingJob(null)}
                className="px-4 py-2 min-h-[44px] rounded-xl text-xs font-semibold text-white/60 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={mutatingJobId === deletingJob._id}
                onClick={handleConfirmDelete}
                className="px-5 py-2 min-h-[44px] rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {mutatingJobId === deletingJob._id ? 'Deleting...' : 'Delete Job'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: APPLICANT COVER NOTE ────────────────────────────── */}
      {applicantCoverNoteModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cover-note-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        >
          <div className="w-full max-w-lg bg-[#121217] border border-white/[0.1] rounded-3xl p-6 shadow-2xl space-y-4 text-white">
            <div className="flex items-start justify-between">
              <div>
                <h3 id="cover-note-modal-title" className="text-base font-bold font-heading text-white">
                  Candidate Cover Note
                </h3>
                <p className="text-xs text-text-muted">
                  Submitted by {applicantCoverNoteModal.candidateName}
                </p>
              </div>
              <button
                onClick={() => setApplicantCoverNoteModal(null)}
                className="p-1.5 rounded-xl text-white/40 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-xs text-white/90 leading-relaxed max-h-60 overflow-y-auto whitespace-pre-wrap">
              {applicantCoverNoteModal.note}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setApplicantCoverNoteModal(null)}
                className="px-4 py-2 min-h-[40px] rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-xs font-semibold text-white cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODALS: BUSINESS & JOB CRUD ────────────────────────────── */}
      <CreateBusinessModal
        isOpen={isCreateBusinessOpen}
        onClose={() => setIsCreateBusinessOpen(false)}
        onSuccess={() => {
          toast.success('Business registered successfully!');
          refetchBusinesses();
        }}
      />

      <EditBusinessModal
        isOpen={isEditBusinessOpen}
        onClose={() => setIsEditBusinessOpen(false)}
        business={activeBusiness}
        onSuccess={() => {
          toast.success('Business profile updated successfully!');
          refetchBusinesses();
        }}
      />

      <CreateJobModal
        isOpen={isCreateJobOpen}
        onClose={() => {
          setIsCreateJobOpen(false);
          setJobToEdit(null);
          setMissingFieldsPrompt(null);
        }}
        business={activeBusiness}
        jobToEdit={jobToEdit}
        missingFieldsPrompt={missingFieldsPrompt}
        onSuccess={() => {
          toast.success(
            jobToEdit
              ? 'Job opportunity updated successfully!'
              : 'Job opportunity created successfully!',
          );
          refetchJobs();
          refetchBusinesses();
          queryClient.invalidateQueries({ queryKey: ['business-jobs'] });
        }}
      />
    </div>
  );
}
