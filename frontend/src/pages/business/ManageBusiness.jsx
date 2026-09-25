import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
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
  Globe,
  MapPin,
  ExternalLink,
  ChevronDown,
  FileText,
  Eye,
  Check,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { organizationService } from '../../services/organizationService';
import { opportunityService } from '../../services/opportunityService';
import { useToast } from '../../components/ui/Toast';
import CreateBusinessModal from './CreateBusinessModal';
import CreateJobModal from './CreateJobModal';
import RecommendedTalent from './RecommendedTalent';

export default function ManageBusiness() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const [selectedOrgId, setSelectedOrgId] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'jobs' | 'profile' | 'settings' | 'applicants' | 'offers' | 'talent'
  const [jobFilter, setJobFilter] = useState('ALL'); // 'ALL' | 'PUBLISHED' | 'DRAFT' | 'CLOSED'
  const [selectedTalentJobId, setSelectedTalentJobId] = useState(null); // For per-job talent view

  const [isCreateBusinessOpen, setIsCreateBusinessOpen] = useState(false);
  const [isCreateJobOpen, setIsCreateJobOpen] = useState(false);
  const [resubmitting, setResubmitting] = useState(false);

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
    isLoading: loadingJobs,
    refetch: refetchJobs,
  } = useQuery({
    queryKey: ['business-jobs', selectedOrgId, jobFilter],
    queryFn: () =>
      opportunityService.getBusinessJobs(selectedOrgId, jobFilter),
    enabled: !!selectedOrgId,
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
      addToast('Business resubmitted for admin review', 'success');
      refetchBusinesses();
    } catch (err) {
      addToast(
        err?.response?.data?.message || 'Failed to resubmit business',
        'error',
      );
    } finally {
      setResubmitting(false);
    }
  };

  const handleUpdateJobStatus = async (jobId, newStatus) => {
    try {
      await opportunityService.updateStatus(jobId, newStatus);
      addToast(`Job status updated to ${newStatus}`, 'success');
      refetchJobs();
      refetchBusinesses();
    } catch (err) {
      addToast(
        err?.response?.data?.message || 'Failed to update job status',
        'error',
      );
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
            addToast('Business created and submitted for verification!', 'success');
            refetchBusinesses();
          }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
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

            <p className="text-xs text-text-muted mt-1 flex items-center gap-3">
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
        <div className="flex items-center gap-2.5">
          {businesses.length > 1 && (
            <select
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value)}
              className="px-3.5 py-2 rounded-xl bg-[#161620] border border-white/[0.08] text-xs text-white font-medium outline-none focus:border-brand-mint"
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
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-semibold text-white border border-white/[0.08] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Business</span>
          </button>

          <button
            onClick={() => setIsCreateJobOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-mint text-black font-bold text-xs shadow-lg shadow-brand-mint/20 hover:opacity-90 transition-all cursor-pointer"
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
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-red-500 text-white font-bold text-xs hover:bg-red-600 transition-colors shrink-0 cursor-pointer"
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
          { id: 'applicants', label: 'Applicants', icon: Users },
          { id: 'profile', label: 'Business Profile', icon: FileText },
          { id: 'settings', label: 'Settings', icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
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
                  className="text-xs text-brand-mint hover:underline font-semibold"
                >
                  View All Jobs
                </button>
              </div>

              {jobs.length === 0 ? (
                <div className="py-12 text-center text-text-muted space-y-2">
                  <Briefcase className="w-8 h-8 mx-auto text-white/20" />
                  <p className="text-xs">No jobs created yet for this business.</p>
                  <button
                    onClick={() => setIsCreateJobOpen(true)}
                    className="text-xs text-brand-mint font-semibold hover:underline"
                  >
                    + Create your first infrastructure job
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {jobs.slice(0, 4).map((job) => (
                    <div
                      key={job.id || job._id}
                      className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.1] transition-all flex items-center justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-2">
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
                        <p className="text-xs text-text-muted mt-1">
                          {job.discipline || 'Engineering'} • {job.workMode} •{' '}
                          {job.applicantCount || 0} applicants
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {job.status === 'PUBLISHED' && (
                          <button
                            onClick={() =>
                              handleUpdateJobStatus(job.id || job._id, 'CLOSED')
                            }
                            className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-red-500/20 text-xs font-semibold text-text-muted hover:text-red-300 transition-colors"
                          >
                            Close Job
                          </button>
                        )}
                        {job.status === 'DRAFT' && isApproved && (
                          <button
                            onClick={() =>
                              handleUpdateJobStatus(
                                job.id || job._id,
                                'PUBLISHED',
                              )
                            }
                            className="px-3 py-1.5 rounded-xl bg-brand-mint text-black font-bold text-xs transition-opacity hover:opacity-90"
                          >
                            Publish
                          </button>
                        )}
                        <Link
                          to={`/jobs/${job.id || job._id}`}
                          className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white/60 hover:text-white transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Business Snapshot Card */}
            <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/[0.06] space-y-4">
              <h3 className="text-base font-bold text-white font-heading">
                Business Information
              </h3>
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-text-muted block text-[11px]">Type</span>
                  <span className="font-semibold text-white">
                    {activeBusiness?.type?.replace(/_/g, ' ') || 'Company'}
                  </span>
                </div>
                <div>
                  <span className="text-text-muted block text-[11px]">
                    Specializations
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1">
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
                  <span className="text-text-muted block text-[11px]">
                    Email & Phone
                  </span>
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
                  onClick={() => setActiveTab('settings')}
                  className="w-full py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-semibold text-white transition-colors cursor-pointer"
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
            <div className="flex items-center gap-2">
              {['ALL', 'PUBLISHED', 'DRAFT', 'CLOSED'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setJobFilter(filter)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
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
              onClick={() => setIsCreateJobOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-mint text-black font-bold text-xs shadow-lg shadow-brand-mint/20 hover:opacity-90 cursor-pointer"
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
                onClick={() => setIsCreateJobOpen(true)}
                className="px-4 py-2 rounded-xl bg-brand-mint text-black font-bold text-xs"
              >
                + Create Job
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {jobs.map((job) => (
                <div
                  key={job.id || job._id}
                  className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
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
                              : 'bg-white/[0.05] text-white/50 border border-white/[0.08]'
                        }`}
                      >
                        {job.status}
                      </span>
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
                  <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                    <div className="text-right mr-2">
                      <span className="text-xs font-bold text-white block">
                        {job.applicantCount || 0}
                      </span>
                      <span className="text-[10px] text-text-muted">applicants</span>
                    </div>

                    {job.status === 'PUBLISHED' && (
                      <button
                        onClick={() => {
                          setSelectedTalentJobId(job.id || job._id);
                          setActiveTab('talent');
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-mint/10 hover:bg-brand-mint/20 text-brand-mint text-xs font-semibold border border-brand-mint/25 transition-all cursor-pointer"
                        title="View AI matched candidates for this job"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>AI Talent</span>
                      </button>
                    )}

                    {job.status === 'PUBLISHED' && (
                      <button
                        onClick={() =>
                          handleUpdateJobStatus(job.id || job._id, 'CLOSED')
                        }
                        className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-red-500/20 text-xs font-semibold text-text-muted hover:text-red-300 transition-colors cursor-pointer"
                      >
                        Close
                      </button>
                    )}

                    {job.status === 'DRAFT' && isApproved && (
                      <button
                        onClick={() =>
                          handleUpdateJobStatus(job.id || job._id, 'PUBLISHED')
                        }
                        className="px-3.5 py-2 rounded-xl bg-brand-mint text-black font-bold text-xs transition-opacity hover:opacity-90 cursor-pointer"
                      >
                        Publish
                      </button>
                    )}

                    {job.status === 'CLOSED' && isApproved && (
                      <button
                        onClick={() =>
                          handleUpdateJobStatus(job.id || job._id, 'PUBLISHED')
                        }
                        className="px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-semibold text-white transition-colors cursor-pointer"
                      >
                        Re-open
                      </button>
                    )}

                    <Link
                      to={`/jobs/${job.id || job._id}`}
                      className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white/70 hover:text-white transition-colors"
                      title="View public job page"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: BUSINESS PROFILE PREVIEW */}
      {activeTab === 'profile' && (
        <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/[0.06] space-y-6">
          <div className="flex items-start justify-between">
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
                <span className="text-xs text-white/40">None</span>
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
        <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/[0.06]">
          <h3 className="text-lg font-bold font-heading text-white mb-4">
            Edit Business Settings
          </h3>
          <p className="text-xs text-text-muted mb-6">
            Update your organization's core profile, location, contact details, and social links.
          </p>
          <button
            onClick={() => setIsCreateBusinessOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-brand-mint text-black font-bold text-xs shadow-lg shadow-brand-mint/20 cursor-pointer"
          >
            Update Business Profile
          </button>
        </div>
      )}

      {/* TAB: AI RECOMMENDED TALENT */}
      {activeTab === 'talent' && (
        <div className="space-y-5">
          {/* Job selector for talent view */}
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
                onClick={() => setIsCreateJobOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-mint text-black font-bold text-xs shadow-lg shadow-brand-mint/20 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Create Job
              </button>
            </div>
          ) : (
            <>
              {/* Job selector */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                  Select Job:
                </span>
                {jobs.filter((j) => j.status === 'PUBLISHED').map((job) => (
                  <button
                    key={job.id || job._id}
                    onClick={() => setSelectedTalentJobId(job.id || job._id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      selectedTalentJobId === (job.id || job._id)
                        ? 'bg-brand-mint text-black font-bold shadow-md'
                        : 'bg-white/[0.04] text-text-muted hover:text-white hover:bg-white/[0.08] border border-white/[0.06]'
                    }`}
                  >
                    {job.title}
                  </button>
                ))}
              </div>

              {selectedTalentJobId ? (
                <RecommendedTalent
                  jobId={selectedTalentJobId}
                  jobTitle={jobs.find((j) => (j.id || j._id) === selectedTalentJobId)?.title}
                />
              ) : (
                <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/[0.06] text-center space-y-3">
                  <Sparkles className="w-8 h-8 mx-auto text-brand-mint/40" />
                  <p className="text-xs text-text-muted">
                    Select a published job above to view AI-recommended candidates.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* TAB: APPLICANTS */}
      {activeTab === 'applicants' && (
        <div className="space-y-5">
          {/* Applicants per job */}
          {jobs.filter((j) => j.status === 'PUBLISHED' || j.applicantCount > 0).length === 0 ? (
            <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/[0.06] text-center space-y-3">
              <Users className="w-10 h-10 mx-auto text-white/20" />
              <h3 className="text-sm font-bold text-white">No applicants yet</h3>
              <p className="text-xs text-text-muted max-w-sm mx-auto">
                Applications will appear here once candidates apply to your published jobs.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.filter((j) => j.applicantCount > 0 || j.status === 'PUBLISHED').map((job) => (
                <div
                  key={job.id || job._id}
                  className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-all flex items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white">{job.title}</h4>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        job.status === 'PUBLISHED'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-white/[0.05] text-white/50'
                      }`}>
                        {job.status}
                      </span>
                    </div>
                    <p className="text-xs text-text-muted mt-1">
                      {job.discipline || 'Engineering'} • {job.applicantCount || 0} applications
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-extrabold text-cyan-300">
                      {job.applicantCount || 0}
                    </span>
                    <Link
                      to={`/jobs/${job.id || job._id}`}
                      className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white/60 hover:text-white transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal Dialogs */}
      <CreateBusinessModal
        isOpen={isCreateBusinessOpen}
        onClose={() => setIsCreateBusinessOpen(false)}
        onSuccess={() => {
          addToast('Business registered successfully!', 'success');
          refetchBusinesses();
        }}
      />

      <CreateJobModal
        isOpen={isCreateJobOpen}
        onClose={() => setIsCreateJobOpen(false)}
        business={activeBusiness}
        onSuccess={() => {
          addToast('Job opportunity created successfully!', 'success');
          refetchJobs();
          refetchBusinesses();
        }}
      />
    </div>
  );
}
