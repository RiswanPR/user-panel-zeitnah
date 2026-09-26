import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  Search,
  MapPin,
  Building2,
  CheckCircle2,
  Bookmark,
  BookmarkCheck,
  Filter,
  X,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight,
  FileCheck2,
  Mail,
  ThumbsUp,
  ThumbsDown,
  RotateCw,
  AlertCircle,
} from 'lucide-react';
import { opportunityService } from '../../services/opportunityService';
import { matchingService } from '../../services/matchingService';
import { useToast } from '../../components/ui/Toast';
import PageHeader from '../../components/ui/PageHeader';
import {
  INFRASTRUCTURE_DISCIPLINES,
  INFRASTRUCTURE_SECTORS,
  INFRASTRUCTURE_SOFTWARE,
  WORK_MODES,
  JOB_TYPES,
} from '../../constants/infrastructureTaxonomy';

export default function JobsPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState('forYou'); // 'forYou' | 'all' | 'recent' | 'saved' | 'applications' | 'invites'
  const [recCategory, setRecCategory] = useState('');
  const [recType, setRecType] = useState('');
  const [explanationModalJob, setExplanationModalJob] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDiscipline, setSelectedDiscipline] = useState('');
  const [selectedSector, setSelectedSector] = useState('');
  const [selectedSoftware, setSelectedSoftware] = useState('');
  const [selectedWorkMode, setSelectedWorkMode] = useState('');
  const [selectedJobType, setSelectedJobType] = useState('');
  const [minExp, setMinExp] = useState('');

  // ── Phase 4: Fetch "Jobs For You" recommendations ──────────────────
  const {
    data: recsData,
    isLoading: loadingRecs,
    isRefetching: refetchingRecs,
    refetch: refetchRecs,
    error: recsError,
  } = useQuery({
    queryKey: ['recommended-jobs', { category: recCategory, type: recType }],
    queryFn: () =>
      matchingService.getRecommendedJobs({
        category: recCategory || undefined,
        type: recType || undefined,
      }),
    enabled: activeTab === 'forYou',
  });

  // ── Phase 4: Fetch Career Profile Insights ────────────────────────
  const { data: profileInsights } = useQuery({
    queryKey: ['profile-job-insights'],
    queryFn: () => matchingService.getProfileJobInsights(),
    enabled: activeTab === 'forYou',
  });

  // ── Phase 4: Explanation query when modal opens ───────────────────
  const {
    data: jobExplanation,
    isLoading: loadingExplanation,
  } = useQuery({
    queryKey: ['job-explanation', explanationModalJob?.jobId],
    queryFn: () =>
      matchingService.getJobRecommendationExplanation(explanationModalJob.jobId),
    enabled: !!explanationModalJob,
  });

  // ── Phase 4: Refresh recommendations mutation ─────────────────────
  const refreshRecsMutation = useMutation({
    mutationFn: () => matchingService.refreshRecommendedJobs(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['recommended-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['profile-job-insights'] });
      addToast(
        data?.recommendationsCount > 0
          ? `AI matched ${data.recommendationsCount} opportunities for your profile!`
          : 'Recommendations refreshed based on your profile.',
        'success',
      );
    },
    onError: () => addToast('Failed to refresh recommendations', 'error'),
  });

  // ── Phase 4: Hide job mutation ────────────────────────────────────
  const hideJobMutation = useMutation({
    mutationFn: (jobId) => matchingService.hideRecommendedJob(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recommended-jobs'] });
      addToast('Job hidden from recommendations', 'success');
    },
  });

  // ── Phase 4: Feedback mutation (Interested / Not Interested) ──────
  const feedbackMutation = useMutation({
    mutationFn: ({ jobId, feedback }) =>
      matchingService.recordJobFeedback(jobId, feedback),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['recommended-jobs'] });
      addToast(
        vars.feedback === 'INTERESTED'
          ? 'Marked as interested! We will prioritize similar roles.'
          : 'Marked as not interested.',
        'success',
      );
    },
  });

  // Fetch Public / Filtered Jobs
  const {
    data: jobsData,
    isLoading: loadingJobs,
    refetch: refetchJobs,
  } = useQuery({
    queryKey: [
      'jobs',
      {
        q: searchQuery,
        discipline: selectedDiscipline,
        sector: selectedSector,
        software: selectedSoftware,
        workMode: selectedWorkMode,
        jobType: selectedJobType,
        minExp,
      },
    ],
    queryFn: () =>
      opportunityService.getOpportunities({
        q: searchQuery,
        discipline: selectedDiscipline,
        sector: selectedSector,
        software: selectedSoftware,
        workMode: selectedWorkMode,
        jobType: selectedJobType,
        minExp: minExp ? Number(minExp) : undefined,
      }),
    enabled: activeTab === 'all' || activeTab === 'recent',
  });

  // Fetch Saved Jobs
  const {
    data: savedJobs = [],
    isLoading: loadingSaved,
    refetch: refetchSaved,
  } = useQuery({
    queryKey: ['saved-jobs'],
    queryFn: () => opportunityService.getSavedJobs(),
    enabled: activeTab === 'saved',
  });

  // Fetch My Applications
  const {
    data: myApplications = [],
    isLoading: loadingApps,
    refetch: refetchApps,
  } = useQuery({
    queryKey: ['my-applications'],
    queryFn: () => opportunityService.getMyApplications(),
    enabled: activeTab === 'applications',
  });

  // Fetch Received Opportunities / Invites
  const {
    data: invites = [],
    isLoading: loadingInvites,
    refetch: refetchInvites,
  } = useQuery({
    queryKey: ['my-invites'],
    queryFn: () => matchingService.getMyInvites(),
    enabled: activeTab === 'invites',
  });

  // Respond to Opportunity Invite Mutation
  const respondInviteMutation = useMutation({
    mutationFn: ({ inviteId, response }) =>
      matchingService.respondToInvite(inviteId, response),
    onSuccess: (_, vars) => {
      addToast(
        vars.response === 'interested'
          ? 'Marked as interested! The employer has been notified.'
          : 'Opportunity declined.',
        'success',
      );
      refetchInvites();
    },
    onError: (err) => {
      addToast(err?.response?.data?.message || 'Failed to update invite', 'error');
    },
  });

  // Toggle Save Job Mutation
  const toggleSaveMutation = useMutation({
    mutationFn: async ({ jobId, isSaved }) => {
      if (isSaved) {
        return opportunityService.unsaveJob(jobId);
      } else {
        return opportunityService.saveJob(jobId);
      }
    },
    onSuccess: (data, variables) => {
      addToast(
        variables.isSaved ? 'Job removed from saved' : 'Job saved to bookmarks!',
        'success',
      );
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['saved-jobs'] });
    },
    onError: () => {
      addToast('Failed to update saved job status', 'error');
    },
  });

  // Withdraw Application Mutation
  const withdrawMutation = useMutation({
    mutationFn: (appId) => opportunityService.withdrawApplication(appId),
    onSuccess: () => {
      addToast('Application withdrawn successfully', 'info');
      queryClient.invalidateQueries({ queryKey: ['my-applications'] });
    },
    onError: (err) => {
      addToast(err?.response?.data?.message || 'Failed to withdraw application', 'error');
    },
  });

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedDiscipline('');
    setSelectedSector('');
    setSelectedSoftware('');
    setSelectedWorkMode('');
    setSelectedJobType('');
    setMinExp('');
  };

  const hasActiveFilters =
    searchQuery ||
    selectedDiscipline ||
    selectedSector ||
    selectedSoftware ||
    selectedWorkMode ||
    selectedJobType ||
    minExp;

  const rawJobs = jobsData?.data || [];
  const displayJobs =
    activeTab === 'recent'
      ? [...rawJobs].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
      : rawJobs;

  return (
    <div className="max-w-[1440px] mx-auto space-y-6 sm:space-y-8">
      {/* ── Zeitnah 2.0 Page Header ── */}
      <PageHeader
        eyebrow="CAREER MARKETPLACE"
        title="Infrastructure Jobs"
        description="Discover verified engineering, BIM, construction management, and energy infrastructure roles matched with your profile."
        actions={
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-md overflow-x-auto max-w-full no-scrollbar">
            {[
              { id: 'forYou', label: 'For You', icon: Sparkles },
              { id: 'all', label: 'All Jobs', icon: Briefcase },
              { id: 'recent', label: 'Recent', icon: Clock },
              { id: 'saved', label: 'Saved Jobs', icon: Bookmark },
              { id: 'applications', label: 'Applications', icon: FileCheck2 },
              {
                id: 'invites',
                label: invites.length > 0 ? `Invitations (${invites.length})` : 'Invitations',
                icon: Mail,
              },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer min-h-[38px] touch-manipulation ${
                    active
                      ? 'bg-brand-mint text-black font-bold shadow-md shadow-brand-mint/15'
                      : 'text-text-muted hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        }
      />

      {/* ── Search & Filter Controls (For Explore & Recent tabs) ── */}
      {(activeTab === 'all' || activeTab === 'recent') && (
        <div className="space-y-3 p-5 rounded-3xl bg-white/[0.02] border border-white/[0.06]">
          {/* Main search bar */}
          <div className="relative">
            <Search className="w-5 h-5 text-white/30 absolute left-4 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, skills, software, company, or keywords..."
              className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] focus:border-brand-mint text-sm text-white placeholder-white/30 outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-3.5 text-white/40 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Pills Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2">
            {/* Discipline */}
            <select
              value={selectedDiscipline}
              onChange={(e) => setSelectedDiscipline(e.target.value)}
              className="px-3 py-2 rounded-xl bg-[#161620] border border-white/[0.08] text-xs text-white/90 outline-none focus:border-brand-mint"
            >
              <option value="">All Disciplines</option>
              {INFRASTRUCTURE_DISCIPLINES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            {/* Sector */}
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="px-3 py-2 rounded-xl bg-[#161620] border border-white/[0.08] text-xs text-white/90 outline-none focus:border-brand-mint"
            >
              <option value="">All Sectors</option>
              {INFRASTRUCTURE_SECTORS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            {/* Software */}
            <select
              value={selectedSoftware}
              onChange={(e) => setSelectedSoftware(e.target.value)}
              className="px-3 py-2 rounded-xl bg-[#161620] border border-white/[0.08] text-xs text-white/90 outline-none focus:border-brand-mint"
            >
              <option value="">All Software Tools</option>
              {INFRASTRUCTURE_SOFTWARE.map((sw) => (
                <option key={sw} value={sw}>
                  {sw}
                </option>
              ))}
            </select>

            {/* Work Mode */}
            <select
              value={selectedWorkMode}
              onChange={(e) => setSelectedWorkMode(e.target.value)}
              className="px-3 py-2 rounded-xl bg-[#161620] border border-white/[0.08] text-xs text-white/90 outline-none focus:border-brand-mint"
            >
              <option value="">All Work Modes</option>
              {WORK_MODES.map((wm) => (
                <option key={wm} value={wm}>
                  {wm}
                </option>
              ))}
            </select>

            {/* Job Type */}
            <select
              value={selectedJobType}
              onChange={(e) => setSelectedJobType(e.target.value)}
              className="px-3 py-2 rounded-xl bg-[#161620] border border-white/[0.08] text-xs text-white/90 outline-none focus:border-brand-mint"
            >
              <option value="">All Job Types</option>
              {JOB_TYPES.map((jt) => (
                <option key={jt} value={jt}>
                  {jt}
                </option>
              ))}
            </select>

            {/* Min Experience */}
            <select
              value={minExp}
              onChange={(e) => setMinExp(e.target.value)}
              className="px-3 py-2 rounded-xl bg-[#161620] border border-white/[0.08] text-xs text-white/90 outline-none focus:border-brand-mint"
            >
              <option value="">Experience Level</option>
              <option value="0">0+ Years (Entry)</option>
              <option value="2">2+ Years</option>
              <option value="5">5+ Years (Mid/Senior)</option>
              <option value="8">8+ Years (Lead/Executive)</option>
            </select>
          </div>

          {hasActiveFilters && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-text-muted">
                Showing filtered infrastructure opportunities
              </span>
              <button
                onClick={clearFilters}
                className="text-xs text-brand-mint hover:underline font-semibold"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Content View ── */}

      {/* ── TAB: FOR YOU (AI-POWERED MATCHING) ── */}
      {activeTab === 'forYou' && (
        <div className="space-y-6">
          {/* Header & Insights Banner */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-brand-mint/10 via-purple-500/5 to-white/[0.02] border border-brand-mint/20 relative overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-mint/15 border border-brand-mint/30 text-brand-mint text-xs font-bold mb-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Personalized Job Recommendations</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Jobs For You
                </h2>
                <p className="text-xs sm:text-sm text-text-muted mt-1 max-w-2xl leading-relaxed">
                  Automatically tailored to your infrastructure discipline, engineering software, project track record, and career preferences.
                </p>
              </div>

              {/* Action buttons & Stats */}
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => refreshRecsMutation.mutate()}
                  disabled={refreshRecsMutation.isPending || refetchingRecs}
                  className="px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-xs font-semibold text-white transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  title="Refresh recommendations based on latest profile changes"
                >
                  <RotateCw
                    className={`w-3.5 h-3.5 ${
                      refreshRecsMutation.isPending || refetchingRecs ? 'animate-spin text-brand-mint' : ''
                    }`}
                  />
                  <span>
                    {refreshRecsMutation.isPending || refetchingRecs ? 'Analyzing...' : 'Refresh'}
                  </span>
                </button>
              </div>
            </div>

            {/* Profile Insights Summary Bar */}
            {profileInsights && profileInsights.totalRecommended > 0 && (
              <div className="mt-5 pt-4 border-t border-white/[0.08] grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-2xl bg-black/30 border border-white/[0.05]">
                  <span className="text-[11px] text-text-muted block">Total Matched</span>
                  <span className="text-lg font-black text-white">
                    {profileInsights.totalRecommended} Jobs
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-black/30 border border-white/[0.05]">
                  <span className="text-[11px] text-text-muted block">Highly Compatible (80%+)</span>
                  <span className="text-lg font-black text-emerald-400">
                    {profileInsights.highlyCompatibleCount}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-black/30 border border-white/[0.05] sm:col-span-2">
                  <span className="text-[11px] text-text-muted block">Top Matching Sectors</span>
                  <span className="text-xs font-bold text-brand-mint truncate block mt-1">
                    {profileInsights.topMatchingSectors?.join(' • ') || 'Civil Infrastructure'}
                  </span>
                </div>
              </div>
            )}

            {/* Profile Improvement Loop Hint */}
            {profileInsights?.profileImprovements?.length > 0 && (
              <div className="mt-4 p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.07] flex items-start gap-3">
                <div className="p-1.5 rounded-xl bg-amber-500/10 text-amber-400 shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <span className="font-bold text-white block">
                    Improve Job Discovery:
                  </span>
                  <p className="text-text-muted mt-0.5">
                    {profileInsights.profileImprovements[0].advice}
                  </p>
                </div>
                <Link
                  to="/profile/edit"
                  className="ml-auto text-[11px] font-bold text-brand-mint hover:underline whitespace-nowrap self-center"
                >
                  Edit Profile →
                </Link>
              </div>
            )}
          </div>

          {/* Sub-Filters: Category & Type pills */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-text-muted mr-1">Filter by:</span>
            {[
              { id: '', label: 'All Recommendations' },
              { id: 'HIGHLY_COMPATIBLE', label: 'Highly Compatible (80%+)' },
              { id: 'STRONGLY_COMPATIBLE', label: 'Strongly Compatible (60%+)' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setRecCategory(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  recCategory === f.id
                    ? 'bg-brand-mint text-black font-bold'
                    : 'bg-white/[0.04] text-white/70 hover:text-white hover:bg-white/[0.08]'
                }`}
              >
                {f.label}
              </button>
            ))}

            <div className="h-4 w-px bg-white/10 mx-1 hidden sm:block" />

            {[
              { id: 'role_match', label: 'Role Matches' },
              { id: 'skill_match', label: 'Skill Matches' },
              { id: 'project_match', label: 'Project Matches' },
              { id: 'new_relevant_job', label: 'Newly Published' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setRecType(recType === t.id ? '' : t.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  recType === t.id
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold'
                    : 'bg-white/[0.04] text-white/70 hover:text-white hover:bg-white/[0.08]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Recommendations Content */}
          {loadingRecs ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <div className="w-10 h-10 border-2 border-brand-mint/20 border-t-brand-mint rounded-full animate-spin" />
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                AI is finding relevant infrastructure opportunities for you...
              </p>
            </div>
          ) : recsError ? (
            <div className="py-16 text-center bg-white/[0.02] border border-white/[0.06] rounded-3xl space-y-3 p-6">
              <AlertCircle className="w-10 h-10 mx-auto text-amber-400" />
              <h3 className="text-base font-bold text-white">
                Talent recommendations are temporarily unavailable
              </h3>
              <p className="text-xs text-text-muted max-w-md mx-auto">
                The job board is still published and searchable. Browse all opportunities or try refreshing your recommendations.
              </p>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => refetchRecs()}
                  className="px-4 py-2 rounded-xl bg-brand-mint text-black font-bold text-xs cursor-pointer"
                >
                  Retry Matching
                </button>
                <button
                  onClick={() => setActiveTab('all')}
                  className="px-4 py-2 rounded-xl bg-white/[0.06] text-white font-semibold text-xs cursor-pointer"
                >
                  Browse All Jobs
                </button>
              </div>
            </div>
          ) : !recsData?.data || recsData.data.length === 0 ? (
            <div className="py-16 text-center bg-white/[0.02] border border-white/[0.06] rounded-3xl space-y-3 p-6">
              <Sparkles className="w-10 h-10 mx-auto text-brand-mint/40" />
              <h3 className="text-base font-bold text-white">
                No strong profile matches found yet
              </h3>
              <p className="text-xs text-text-muted max-w-md mx-auto">
                Zeitnah matches you against active jobs based on your engineering discipline, software tools, projects, and career preferences. Add more details to your profile to unlock recommendations.
              </p>
              <div className="flex items-center justify-center gap-2 pt-2">
                <Link
                  to="/profile/edit"
                  className="px-4 py-2 rounded-xl bg-brand-mint text-black font-bold text-xs"
                >
                  Edit Profile Details
                </Link>
                <button
                  onClick={() => setActiveTab('all')}
                  className="px-4 py-2 rounded-xl bg-white/[0.06] text-white font-semibold text-xs"
                >
                  Explore All Jobs
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recsData.data.map((rec) => (
                <RecommendedJobCard
                  key={rec.id}
                  rec={rec}
                  onWhyThisJob={() => setExplanationModalJob(rec)}
                  onToggleSave={() =>
                    toggleSaveMutation.mutate({
                      jobId: rec.jobId,
                      isSaved: rec.isSaved,
                    })
                  }
                  onHide={() => hideJobMutation.mutate(rec.jobId)}
                  onFeedback={(type) =>
                    feedbackMutation.mutate({
                      jobId: rec.jobId,
                      feedback: type,
                    })
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* TABS: ALL & RECENT */}
      {(activeTab === 'all' || activeTab === 'recent') && (
        <div>
          {loadingJobs ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <div className="w-10 h-10 border-2 border-brand-mint/20 border-t-brand-mint rounded-full animate-spin" />
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                Loading infrastructure opportunities...
              </p>
            </div>
          ) : displayJobs.length === 0 ? (
            <div className="py-16 text-center bg-white/[0.02] border border-white/[0.06] rounded-3xl space-y-3">
              <Briefcase className="w-10 h-10 mx-auto text-white/20" />
              <h3 className="text-base font-bold text-white">No jobs found</h3>
              <p className="text-xs text-text-muted max-w-sm mx-auto">
                No active infrastructure jobs match your search parameters. Try clearing filters or exploring other sectors.
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 rounded-xl bg-brand-mint text-black font-bold text-xs"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {displayJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onToggleSave={() =>
                    toggleSaveMutation.mutate({ jobId: job.id, isSaved: job.isSaved })
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: SAVED JOBS */}
      {activeTab === 'saved' && (
        <div>
          {loadingSaved ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <div className="w-10 h-10 border-2 border-brand-mint/20 border-t-brand-mint rounded-full animate-spin" />
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                Loading saved jobs...
              </p>
            </div>
          ) : savedJobs.length === 0 ? (
            <div className="py-16 text-center bg-white/[0.02] border border-white/[0.06] rounded-3xl space-y-3">
              <Bookmark className="w-10 h-10 mx-auto text-white/20" />
              <h3 className="text-base font-bold text-white">No saved jobs</h3>
              <p className="text-xs text-text-muted max-w-sm mx-auto">
                Bookmark interesting opportunities to review and apply to them later.
              </p>
              <button
                onClick={() => setActiveTab('all')}
                className="px-4 py-2 rounded-xl bg-brand-mint text-black font-bold text-xs"
              >
                Browse All Jobs
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={{ ...job, isSaved: true }}
                  onToggleSave={() =>
                    toggleSaveMutation.mutate({ jobId: job.id, isSaved: true })
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: MY APPLICATIONS */}
      {activeTab === 'applications' && (
        <div>
          {loadingApps ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <div className="w-10 h-10 border-2 border-brand-mint/20 border-t-brand-mint rounded-full animate-spin" />
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                Loading your applications...
              </p>
            </div>
          ) : myApplications.length === 0 ? (
            <div className="py-16 text-center bg-white/[0.02] border border-white/[0.06] rounded-3xl space-y-3">
              <FileCheck2 className="w-10 h-10 mx-auto text-white/20" />
              <h3 className="text-base font-bold text-white">No active applications</h3>
              <p className="text-xs text-text-muted max-w-sm mx-auto">
                You haven't submitted any job applications yet. Explore openings and apply directly.
              </p>
              <button
                onClick={() => setActiveTab('all')}
                className="px-4 py-2 rounded-xl bg-brand-mint text-black font-bold text-xs"
              >
                Discover Opportunities
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {myApplications.map((app) => (
                <div
                  key={app.id}
                  className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <h4 className="text-base font-bold text-white font-heading">
                        {app.job?.title || 'Infrastructure Position'}
                      </h4>
                      <span
                        className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                          app.status === 'submitted'
                            ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                            : 'bg-white/[0.05] text-white/50 border border-white/[0.08]'
                        }`}
                      >
                        {app.status}
                      </span>
                    </div>

                    <p className="text-xs text-text-muted flex items-center gap-2">
                      <span className="text-brand-mint font-semibold">
                        {app.business?.name || 'Company'}
                      </span>
                      <span>•</span>
                      <span>{app.job?.location || 'India'}</span>
                      <span>•</span>
                      <span>
                        Applied on {new Date(app.appliedAt).toLocaleDateString()}
                      </span>
                    </p>

                    {app.coverNote && (
                      <p className="text-xs text-white/70 italic line-clamp-1 pt-1">
                        "{app.coverNote}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    {app.status === 'submitted' && (
                      <button
                        onClick={() => withdrawMutation.mutate(app.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-red-500/20 text-xs font-semibold text-text-muted hover:text-red-300 transition-colors"
                      >
                        Withdraw
                      </button>
                    )}
                    {app.job?.id && (
                      <Link
                        to={`/jobs/${app.job.id}`}
                        className="flex items-center gap-1 px-4 py-2 rounded-xl bg-brand-mint text-black font-bold text-xs shadow-md shadow-brand-mint/15"
                      >
                        <span>View Job</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: RECEIVED OPPORTUNITY INVITATIONS ── */}
      {activeTab === 'invites' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
            <div>
              <h2 className="text-lg font-bold text-white">Direct Employer Opportunities</h2>
              <p className="text-xs text-text-muted mt-0.5">
                Employers and recruiters who matched with your profile and reached out with opportunities.
              </p>
            </div>
          </div>

          {loadingInvites ? (
            <div className="py-20 text-center text-text-muted">
              <Clock className="w-8 h-8 animate-spin mx-auto text-brand-mint/40 mb-3" />
              <p className="text-xs">Loading received invitations...</p>
            </div>
          ) : invites.length === 0 ? (
            <div className="py-16 text-center text-text-muted bg-white/[0.02] border border-white/[0.06] rounded-3xl space-y-3">
              <Mail className="w-10 h-10 mx-auto text-white/20" />
              <h3 className="text-base font-bold text-white">No invitations received yet</h3>
              <p className="text-xs max-w-sm mx-auto">
                When recruiters match a published job to your expertise, their direct opportunities will appear here. Ensure your profile is discoverable in settings.
              </p>
              <Link
                to="/profile/edit"
                className="inline-block px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-brand-mint font-semibold text-xs border border-brand-mint/30"
              >
                Update Profile & Preferences
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {invites.map((invite) => {
                const job = invite.job || {};
                const business = invite.business || {};
                const isPending = invite.status === 'sent' || invite.status === 'viewed';

                return (
                  <div
                    key={invite.id}
                    className="p-5 rounded-3xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-all flex flex-col md:flex-row md:items-center justify-between gap-5"
                  >
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-bold text-base text-white">
                          {job.title || 'Infrastructure Position'}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                            invite.status === 'interested'
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : invite.status === 'declined'
                                ? 'bg-red-500/15 text-red-400 border-red-500/30'
                                : 'bg-brand-mint/15 text-brand-mint border-brand-mint/30'
                          }`}
                        >
                          {invite.status === 'sent'
                            ? 'New Opportunity'
                            : invite.status.toUpperCase()}
                        </span>
                      </div>

                      <p className="text-xs text-text-muted flex items-center gap-2 flex-wrap">
                        <span className="text-white font-semibold">{business.name || 'Employer'}</span>
                        <span>•</span>
                        <span>{job.discipline || 'Engineering'}</span>
                        <span>•</span>
                        <span>{job.location || 'India'}</span>
                        <span>•</span>
                        <span>Received {new Date(invite.createdAt).toLocaleDateString()}</span>
                      </p>

                      {invite.message && (
                        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.04] text-xs text-white/80 italic">
                          "{invite.message}"
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
                      {isPending && (
                        <>
                          <button
                            onClick={() =>
                              respondInviteMutation.mutate({
                                inviteId: invite.id,
                                response: 'interested',
                              })
                            }
                            disabled={respondInviteMutation.isPending}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all cursor-pointer"
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                            <span>I'm Interested</span>
                          </button>
                          <button
                            onClick={() =>
                              respondInviteMutation.mutate({
                                inviteId: invite.id,
                                response: 'declined',
                              })
                            }
                            disabled={respondInviteMutation.isPending}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.03] hover:bg-red-500/20 text-text-muted hover:text-red-300 text-xs font-semibold transition-all cursor-pointer"
                          >
                            <ThumbsDown className="w-3.5 h-3.5" />
                            <span>Decline</span>
                          </button>
                        </>
                      )}

                      {job.id && (
                        <Link
                          to={`/jobs/${job.id}`}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-brand-mint text-white hover:text-black font-bold text-xs transition-all"
                        >
                          <span>View Job</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Explanation Modal ── */}
      {explanationModalJob && (
        <WhyThisJobModal
          job={explanationModalJob}
          explanation={jobExplanation}
          isLoading={loadingExplanation}
          onClose={() => setExplanationModalJob(null)}
        />
      )}
    </div>
  );
}

// ── Reusable Structured Infrastructure Job Card ──
function JobCard({ job, onToggleSave }) {
  const org = job.organization || {};
  const isVerified = org.isVerified || org.verificationStatus === 'VERIFIED';

  return (
    <div className="p-6 rounded-3xl bg-[#111116] border border-white/[0.07] hover:border-brand-mint/30 transition-all flex flex-col justify-between group shadow-lg">
      <div className="space-y-4">
        {/* Card Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center overflow-hidden shrink-0">
              {org.logo ? (
                <img src={org.logo} alt={org.name} className="w-full h-full object-cover" />
              ) : (
                <Building2 className="w-6 h-6 text-brand-mint" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-xs text-white/90 line-clamp-1">
                  {org.name || 'Infrastructure Employer'}
                </span>
                {isVerified && (
                  <span
                    title="Verified Infrastructure Employer"
                    className="flex items-center text-emerald-400 shrink-0"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>
              <span className="text-[11px] text-text-muted block mt-0.5">
                {job.location || 'Site Location'}
              </span>
            </div>
          </div>

          {/* Bookmark Button */}
          <button
            onClick={onToggleSave}
            title={job.isSaved ? 'Remove from saved' : 'Save job'}
            className="p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-white/40 hover:text-brand-mint transition-colors cursor-pointer"
          >
            {job.isSaved ? (
              <BookmarkCheck className="w-4 h-4 text-brand-mint" />
            ) : (
              <Bookmark className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Job Title */}
        <div>
          <Link
            to={`/jobs/${job.id}`}
            className="font-heading font-bold text-lg text-white hover:text-brand-mint transition-colors line-clamp-1"
          >
            {job.title}
          </Link>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap text-xs text-text-muted">
            <span className="font-semibold text-cyan-300">{job.discipline}</span>
            <span>•</span>
            <span>{job.infrastructureSector}</span>
            <span>•</span>
            <span className="px-2 py-0.5 rounded-md bg-white/[0.04] text-[10px] font-semibold text-white/70">
              {job.workMode || 'On-site'}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-white/[0.04] text-[10px] font-semibold text-white/70">
              {job.jobType || 'Full-time'}
            </span>
          </div>
        </div>

        {/* Structured Software Requirements */}
        {job.requiredSoftware && job.requiredSoftware.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {job.requiredSoftware.slice(0, 3).map((sw) => (
              <span
                key={sw}
                className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-500/20"
              >
                {sw}
              </span>
            ))}
            {job.requiredSoftware.length > 3 && (
              <span className="text-[10px] text-white/40 self-center">
                +{job.requiredSoftware.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Description snippet */}
        <p className="text-xs text-text-muted line-clamp-2 leading-relaxed">
          {job.responsibilities || job.description}
        </p>
      </div>

      {/* Card Footer */}
      <div className="mt-5 pt-4 border-t border-white/[0.05] flex items-center justify-between text-xs">
        <div>
          <span className="text-[11px] text-text-muted block">
            Experience: {job.minYearsExperience}–{job.maxYearsExperience} yrs
          </span>
          {job.salaryMin && job.salaryMax && (
            <span className="text-xs font-semibold text-brand-mint">
              {job.currency} {job.salaryMin.toLocaleString()} – {job.salaryMax.toLocaleString()}
            </span>
          )}
        </div>

        <Link
          to={`/jobs/${job.id}`}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/[0.05] group-hover:bg-brand-mint text-white group-hover:text-black font-bold text-xs transition-all"
        >
          <span>View Job</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 4: AI RECOMMENDED JOB CARD & "WHY THIS JOB" EXPLANATION MODAL
// ═══════════════════════════════════════════════════════════════════════════

function RecommendedJobCard({ rec, onWhyThisJob, onToggleSave, onHide, onFeedback }) {
  const isHighly = rec.compatibilityScore >= 80;
  const isStrongly = rec.compatibilityScore >= 60;

  const scoreBadgeColor = isHighly
    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
    : isStrongly
    ? 'bg-brand-mint/10 border-brand-mint/30 text-brand-mint'
    : 'bg-white/[0.06] border-white/10 text-white/80';

  return (
    <div className="p-6 rounded-3xl bg-[#111116] border border-white/[0.08] hover:border-brand-mint/30 transition-all flex flex-col justify-between group shadow-lg">
      <div className="space-y-4">
        {/* Card Header: Company, Role, Compatibility Badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center overflow-hidden shrink-0">
              {rec.business?.logo ? (
                <img
                  src={rec.business.logo}
                  alt={rec.business.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Building2 className="w-6 h-6 text-brand-mint" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-xs text-white/90 line-clamp-1">
                  {rec.business?.name || 'Verified Infrastructure Partner'}
                </span>
                {rec.business?.verified && (
                  <span title="Verified Employer" className="text-emerald-400 flex items-center shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>
              <span className="text-[11px] text-text-muted block mt-0.5">
                {rec.location || 'Site Location'}
              </span>
            </div>
          </div>

          {/* Compatibility Pill */}
          <div
            className={`px-3 py-1 rounded-xl border text-xs font-bold shrink-0 flex items-center gap-1.5 shadow-sm ${scoreBadgeColor}`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{rec.compatibilityScore}% Compatibility</span>
          </div>
        </div>

        {/* Job Title */}
        <div>
          <Link
            to={`/jobs/${rec.jobId}`}
            className="font-heading font-bold text-lg text-white group-hover:text-brand-mint transition-colors line-clamp-1"
          >
            {rec.title}
          </Link>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap text-xs text-text-muted">
            <span className="font-semibold text-cyan-300">{rec.discipline}</span>
            <span>•</span>
            <span>{rec.infrastructureSector}</span>
            <span>•</span>
            <span className="px-2 py-0.5 rounded-md bg-white/[0.04] text-[10px] font-semibold text-white/70">
              {rec.workMode || 'On-site'}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-white/[0.04] text-[10px] font-semibold text-white/70">
              {rec.jobType || 'Full-time'}
            </span>
          </div>
        </div>

        {/* Matched Tags */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {rec.matchedSectors?.slice(0, 1).map((s) => (
            <span
              key={s}
              className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-brand-mint/10 text-brand-mint border border-brand-mint/20"
            >
              ✓ {s}
            </span>
          ))}
          {rec.matchedSoftware?.slice(0, 2).map((sw) => (
            <span
              key={sw}
              className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-500/20"
            >
              ✓ {sw}
            </span>
          ))}
          {rec.matchedSkills?.slice(0, 2).map((sk) => (
            <span
              key={sk}
              className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20"
            >
              ✓ {sk}
            </span>
          ))}
        </div>

        {/* Top match reason */}
        {rec.matchReasons?.length > 0 && (
          <p className="text-xs text-emerald-400/90 flex items-center gap-1.5 pt-1 line-clamp-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
            <span>Why it matches: {rec.matchReasons[0]}</span>
          </p>
        )}
      </div>

      {/* Card Footer: Actions */}
      <div className="mt-5 pt-4 border-t border-white/[0.05] flex items-center justify-between text-xs">
        <button
          onClick={onWhyThisJob}
          className="text-xs font-semibold text-brand-mint hover:underline flex items-center gap-1 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Why this job?</span>
        </button>

        <div className="flex items-center gap-1.5">
          {/* Feedback buttons */}
          <button
            onClick={() => onFeedback('INTERESTED')}
            title="Interested in this role"
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              rec.feedback === 'INTERESTED'
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'hover:bg-white/[0.06] text-white/40 hover:text-white'
            }`}
          >
            <ThumbsUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onFeedback('NOT_INTERESTED')}
            title="Not interested"
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              rec.feedback === 'NOT_INTERESTED'
                ? 'bg-red-500/20 text-red-400'
                : 'hover:bg-white/[0.06] text-white/40 hover:text-white'
            }`}
          >
            <ThumbsDown className="w-3.5 h-3.5" />
          </button>

          {/* Bookmark Button */}
          <button
            onClick={onToggleSave}
            title={rec.isSaved ? 'Remove from saved' : 'Save job'}
            className="p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-white/40 hover:text-brand-mint transition-colors cursor-pointer"
          >
            {rec.isSaved ? (
              <BookmarkCheck className="w-4 h-4 text-brand-mint" />
            ) : (
              <Bookmark className="w-4 h-4" />
            )}
          </button>

          {/* Hide Button */}
          <button
            onClick={onHide}
            title="Hide this job"
            className="p-2 rounded-xl bg-white/[0.03] hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <Link
            to={`/jobs/${rec.jobId}`}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/[0.05] group-hover:bg-brand-mint text-white group-hover:text-black font-bold text-xs transition-all ml-1"
          >
            <span>View Job</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function WhyThisJobModal({ job, explanation, isLoading, onClose }) {
  if (!job) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#12121A] border border-white/[0.12] rounded-3xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-5 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-mint/10 border border-brand-mint/20 text-brand-mint text-[11px] font-bold mb-1.5">
              <Sparkles className="w-3 h-3" />
              <span>AI Match Analysis</span>
            </div>
            <h2 className="text-lg font-bold text-white leading-tight">
              Why Zeitnah recommends this job
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              {job.title} • {job.business?.name || 'Infrastructure Employer'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Compatibility banner */}
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
          <div>
            <span className="text-xs text-text-muted">Profile Compatibility</span>
            <p className="text-2xl font-black text-brand-mint">
              {job.compatibilityScore}%
            </p>
          </div>
          <span className="text-xs text-right text-text-muted max-w-[200px]">
            Based on your discipline, projects, skills, software, and career preferences.
          </span>
        </div>

        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-2">
            <div className="w-8 h-8 border-2 border-brand-mint/20 border-t-brand-mint rounded-full animate-spin" />
            <p className="text-xs text-text-muted">Analyzing match details...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Strong alignment */}
            {explanation?.strongMatches?.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Strong Alignment
                </h4>
                <div className="space-y-1.5">
                  {explanation.strongMatches.map((m, idx) => (
                    <div
                      key={idx}
                      className="px-3 py-2 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/15 text-xs text-white/90 flex items-center gap-2"
                    >
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>{m}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Additional alignment */}
            {explanation?.additionalMatches?.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">
                  Additional Alignment
                </h4>
                <div className="space-y-1.5">
                  {explanation.additionalMatches.map((m, idx) => (
                    <div
                      key={idx}
                      className="px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs text-white/80 flex items-center gap-2"
                    >
                      <span className="text-brand-mint">✓</span>
                      <span>{m}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Potential Gaps */}
            {explanation?.potentialGaps?.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
                  Potential Gaps
                </h4>
                <div className="space-y-1.5">
                  {explanation.potentialGaps.map((g, idx) => (
                    <div
                      key={idx}
                      className="px-3 py-2 rounded-xl bg-amber-500/[0.06] border border-amber-500/15 text-xs text-amber-200/90 flex items-center gap-2"
                    >
                      <span className="text-amber-400 font-bold">△</span>
                      <span>{g}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dimension Breakdown Bars */}
            {explanation?.dimensionScores?.length > 0 && (
              <div className="pt-2 border-t border-white/[0.06]">
                <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2.5">
                  Alignment by Dimension
                </h4>
                <div className="space-y-2">
                  {explanation.dimensionScores.slice(0, 6).map((dim, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-text-muted capitalize">{dim.dimension}</span>
                        <span className="text-white font-semibold">{dim.score}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                          className="h-full bg-brand-mint rounded-full"
                          style={{ width: `${dim.score}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal footer */}
        <div className="pt-4 border-t border-white/[0.06] flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-semibold text-white transition-all cursor-pointer"
          >
            Close
          </button>
          <Link
            to={`/jobs/${job.jobId}`}
            className="px-5 py-2 rounded-xl bg-brand-mint text-black font-bold text-xs hover:shadow-lg hover:shadow-brand-mint/20 transition-all flex items-center gap-1.5"
          >
            <span>View Full Opportunity</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

