import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  User,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  Bookmark,
  Eye,
  X,
  Loader2,
  RefreshCw,
  Zap,
  Target,
  BarChart3,
  Brain,
  ShieldCheck,
  Info,
  MessageSquare,
  BookmarkCheck,
} from 'lucide-react';
import { matchingService } from '../../services/matchingService';
import { useToast } from '../../components/ui/Toast';

// ─── Match Category Badges ──────────────────────────────────────────────────

const CATEGORY_CONFIG = {
  HIGHLY_COMPATIBLE: {
    label: 'Highly Compatible',
    color: 'emerald',
    bgClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    icon: Zap,
  },
  STRONGLY_COMPATIBLE: {
    label: 'Strongly Compatible',
    color: 'cyan',
    bgClass: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    icon: Target,
  },
  POTENTIALLY_COMPATIBLE: {
    label: 'Potentially Compatible',
    color: 'amber',
    bgClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    icon: BarChart3,
  },
};

// ─── Candidate Card ─────────────────────────────────────────────────────────

function CandidateCard({ match, jobId, onInviteSent, onSaveToggled, onDismissed }) {
  const [expanded, setExpanded] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const { addToast } = useToast();

  const candidate = match.candidate;
  if (!candidate) return null;

  const handleToggleSave = async () => {
    try {
      setSaving(true);
      const res = await matchingService.toggleSaveCandidate(jobId, candidate.id);
      addToast(
        res.isSaved ? `${candidate.name} saved to shortlist` : `${candidate.name} removed from shortlist`,
        'success',
      );
      onSaveToggled?.();
    } catch (err) {
      addToast(err?.response?.data?.message || 'Failed to update saved status', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDismiss = async () => {
    try {
      setDismissing(true);
      await matchingService.dismissCandidate(jobId, candidate.id);
      addToast(`${candidate.name} removed from recommendations`, 'info');
      onDismissed?.();
    } catch (err) {
      addToast(err?.response?.data?.message || 'Failed to remove candidate', 'error');
    } finally {
      setDismissing(false);
    }
  };

  const catConfig = CATEGORY_CONFIG[match.category] || CATEGORY_CONFIG.POTENTIALLY_COMPATIBLE;
  const CatIcon = catConfig.icon;

  return (
    <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-all group">
      {/* Header */}
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="w-14 h-14 rounded-2xl bg-[#181822] border border-white/[0.08] flex items-center justify-center overflow-hidden shrink-0">
          {candidate.avatar ? (
            <img
              src={candidate.avatar}
              alt={candidate.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <User className="w-7 h-7 text-brand-mint/60" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-white text-sm">{candidate.name}</h3>
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${catConfig.bgClass}`}>
              <CatIcon className="w-3 h-3" />
              {catConfig.label}
            </span>
          </div>

          <p className="text-xs text-text-muted mt-0.5">
            {candidate.headline || candidate.currentRole || 'Infrastructure Professional'}
          </p>

          {/* Key attributes */}
          <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-2 text-[11px] text-text-muted">
            {candidate.yearsOfExperience > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {candidate.yearsOfExperience} years
              </span>
            )}
            {candidate.primaryDiscipline && (
              <span>• {candidate.primaryDiscipline}</span>
            )}
            {candidate.infrastructureSectors?.[0] && (
              <span>• {candidate.infrastructureSectors[0]}</span>
            )}
            {candidate.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {candidate.location}
              </span>
            )}
          </div>

          {/* Software chips */}
          {candidate.softwareSkills?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {candidate.softwareSkills.slice(0, 5).map((sw) => (
                <span
                  key={sw}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold ${
                    match.matchedSoftware?.includes(sw)
                      ? 'bg-brand-mint/15 text-brand-mint border border-brand-mint/30'
                      : 'bg-white/[0.04] text-text-muted border border-white/[0.06]'
                  }`}
                >
                  {sw}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Score */}
        <div className="text-center shrink-0">
          <div className="relative w-16 h-16">
            <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
              <circle
                cx="32" cy="32" r="28"
                fill="none"
                stroke="rgba(255,255,255,0.04)"
                strokeWidth="4"
              />
              <circle
                cx="32" cy="32" r="28"
                fill="none"
                stroke={match.score >= 80 ? '#34d399' : match.score >= 60 ? '#22d3ee' : '#f59e0b'}
                strokeWidth="4"
                strokeDasharray={`${(match.score / 100) * 175.9} 175.9`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-extrabold text-white leading-none">{match.score}</span>
              <span className="text-[8px] text-text-muted font-medium">%</span>
            </div>
          </div>
          <p className="text-[9px] text-text-muted mt-1 font-medium">Profile<br />Compatibility</p>
        </div>
      </div>

      {/* Expandable Explanation */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-3 flex items-center gap-1.5 text-[11px] text-brand-mint font-semibold hover:underline cursor-pointer"
      >
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        {expanded ? 'Hide' : 'View'} match details
      </button>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-3">
          {/* Strong Matches */}
          {match.matchReasons?.length > 0 && (
            <div>
              <h4 className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-1.5">
                Strong matches
              </h4>
              <div className="space-y-1">
                {match.matchReasons.map((reason, i) => (
                  <p key={i} className="text-xs text-emerald-300/80 flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{reason}</span>
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Potential Gaps */}
          {match.gapReasons?.length > 0 && (
            <div>
              <h4 className="text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-1.5">
                Potential gaps
              </h4>
              <div className="space-y-1">
                {match.gapReasons.map((gap, i) => (
                  <p key={i} className="text-xs text-amber-300/80 flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{gap}</span>
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Hard Requirement Failures */}
          {match.hardRequirementFailures?.length > 0 && (
            <div>
              <h4 className="text-[11px] font-bold text-red-400 uppercase tracking-wider mb-1.5">
                Hard requirement gaps
              </h4>
              <div className="space-y-1">
                {match.hardRequirementFailures.map((f, i) => (
                  <p key={i} className="text-xs text-red-300/80 flex items-start gap-1.5">
                    <X className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>
                      {f.type}: Expected {String(f.expected)}, Actual {String(f.actual)}
                    </span>
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Matched Projects */}
          {match.matchedProjects?.length > 0 && (
            <div>
              <h4 className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider mb-1.5">
                Relevant project experience
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {match.matchedProjects.map((proj, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-300 text-[10px] font-medium border border-cyan-500/20">
                    {proj}
                  </span>
                ))}
              </div>
            </div>
          )}

          <p className="text-[9px] text-text-muted/50 flex items-center gap-1">
            <Brain className="w-3 h-3" />
            Matching Engine {match.matchingEngineVersion || 'v1'} •
            Calculated {match.calculatedAt ? new Date(match.calculatedAt).toLocaleDateString() : 'Recently'}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to={`/u/${candidate.username || candidate.id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs text-white font-semibold transition-all"
          >
            <Eye className="w-3.5 h-3.5" />
            View Profile
          </Link>

          <button
            onClick={handleToggleSave}
            disabled={saving}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              match.isSaved
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-white/[0.05] hover:bg-white/[0.1] text-text-muted hover:text-white'
            }`}
            title={match.isSaved ? 'Remove from saved candidates' : 'Save candidate'}
          >
            {match.isSaved ? (
              <BookmarkCheck className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Bookmark className="w-3.5 h-3.5" />
            )}
            <span>{match.isSaved ? 'Saved' : 'Save'}</span>
          </button>

          <Link
            to="/network"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs text-text-muted hover:text-white font-semibold transition-all"
            title="Message candidate on network"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Message
          </Link>

          <button
            onClick={handleDismiss}
            disabled={dismissing}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/[0.03] hover:bg-red-500/20 text-xs text-text-muted hover:text-red-300 transition-all cursor-pointer"
            title="Remove from recommended talent"
          >
            <X className="w-3.5 h-3.5" />
            Remove
          </button>
        </div>

        <div>
          {match.inviteStatus ? (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-mint/10 text-brand-mint text-xs font-semibold border border-brand-mint/20">
              <Send className="w-3.5 h-3.5" />
              {match.inviteStatus === 'INTERESTED' ? 'Interested!' :
               match.inviteStatus === 'DECLINED' ? 'Declined' :
               match.inviteStatus === 'VIEWED' ? 'Viewed' : 'Invite Sent'}
            </span>
          ) : (
            <button
              onClick={() => setShowSendModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-mint text-black font-bold text-xs hover:opacity-90 transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              Send Opportunity
            </button>
          )}
        </div>
      </div>

      {/* Send Opportunity Modal */}
      {showSendModal && (
        <SendOpportunityModal
          jobId={jobId}
          candidate={candidate}
          onClose={() => setShowSendModal(false)}
          onSuccess={() => {
            setShowSendModal(false);
            onInviteSent?.();
          }}
        />
      )}
    </div>
  );
}

// ─── Send Opportunity Modal ─────────────────────────────────────────────────

function SendOpportunityModal({ jobId, candidate, onClose, onSuccess }) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const { addToast } = useToast();

  const handleSend = async () => {
    try {
      setSending(true);
      await matchingService.sendOpportunityInvite(jobId, candidate.id, message);
      addToast(`Opportunity sent to ${candidate.name}`, 'success');
      onSuccess?.();
    } catch (err) {
      addToast(
        err?.response?.data?.message || 'Failed to send opportunity',
        'error',
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl bg-[#12121a] border border-white/[0.08] p-6 shadow-2xl space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white font-heading">
            Send Opportunity
          </h3>
          <button onClick={onClose} className="text-text-muted hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
          <p className="text-xs text-text-muted">To:</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-8 h-8 rounded-lg bg-[#181822] border border-white/[0.08] flex items-center justify-center overflow-hidden">
              {candidate.avatar ? (
                <img src={candidate.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="w-4 h-4 text-brand-mint/60" />
              )}
            </div>
            <div>
              <p className="text-sm font-bold text-white">{candidate.name}</p>
              <p className="text-[11px] text-text-muted">{candidate.headline || candidate.primaryDiscipline}</p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-text-muted mb-1.5">
            Message (optional)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Share why you think this candidate would be a great fit..."
            rows={3}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#161620] border border-white/[0.08] text-sm text-white placeholder-text-muted/50 resize-none outline-none focus:border-brand-mint transition-colors"
          />
        </div>

        <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
          <p className="text-[10px] text-amber-300/70 flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>Sending an opportunity does not create a job application. The candidate will choose whether to proceed.</span>
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-white/[0.05] text-white text-xs font-semibold hover:bg-white/[0.1] transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending}
            className="flex-1 py-2.5 rounded-xl bg-brand-mint text-black font-bold text-xs shadow-lg shadow-brand-mint/20 hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {sending ? 'Sending...' : 'Send Opportunity'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function RecommendedTalent({ jobId, jobTitle }) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [categoryFilter, setCategoryFilter] = useState('');
  const [savedOnly, setSavedOnly] = useState(false);
  const [page, setPage] = useState(1);

  // Fetch match summary (dashboard independent counts)
  const { data: summary, refetch: refetchSummary } = useQuery({
    queryKey: ['job-match-summary', jobId],
    queryFn: () => matchingService.getJobMatchSummary(jobId),
    enabled: !!jobId,
    staleTime: 30_000,
  });

  // Fetch recommended talent
  const {
    data: talentData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['recommended-talent', jobId, categoryFilter, savedOnly, page],
    queryFn: () =>
      matchingService.getRecommendedTalent(jobId, {
        page,
        limit: 20,
        category: categoryFilter || undefined,
        saved: savedOnly ? 'true' : undefined,
      }),
    enabled: !!jobId,
    retry: 1,
    staleTime: 60_000,
  });

  // Trigger matching mutation
  const triggerMutation = useMutation({
    mutationFn: () => matchingService.triggerMatching(jobId),
    onSuccess: (data) => {
      addToast(
        `Matching completed: ${data.candidatesScored} candidates analyzed in ${data.processingDurationMs}ms`,
        'success',
      );
      queryClient.invalidateQueries({ queryKey: ['recommended-talent', jobId] });
    },
    onError: (err) => {
      addToast(
        err?.response?.data?.message || 'Talent matching failed. The job is still published.',
        'error',
      );
    },
  });

  const matches = talentData?.data || [];
  const counts = talentData?.categoryCounts || {};
  const totalMatches = talentData?.total || 0;

  // ── Loading State ─────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/[0.06] text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-full bg-brand-mint/10 border border-brand-mint/20 flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-brand-mint animate-pulse" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">
            AI is finding relevant infrastructure talent...
          </h3>
          <p className="text-xs text-text-muted mt-1">
            Analyzing profiles, skills, experience, and project portfolios
          </p>
        </div>
        <div className="w-48 h-1 mx-auto rounded-full bg-white/[0.06] overflow-hidden">
          <div className="h-full bg-brand-mint rounded-full animate-pulse" style={{ width: '60%' }} />
        </div>
      </div>
    );
  }

  // ── Error State ───────────────────────────────────────────────
  if (isError) {
    return (
      <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/[0.06] text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-red-400" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">
            Talent recommendations are temporarily unavailable
          </h3>
          <p className="text-xs text-text-muted mt-1">
            The job is still published and searchable. Matching can be retried.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.05] text-xs text-white font-semibold hover:bg-white/[0.1] cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    );
  }

  // ── Empty State ───────────────────────────────────────────────
  if (matches.length === 0 && !isLoading) {
    return (
      <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/[0.06] text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-text-muted" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">
            No strong profile matches found yet
          </h3>
          <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
            Try expanding the job's preferred requirements or running matching to analyze additional talent profiles.
          </p>
        </div>
        <button
          onClick={() => triggerMutation.mutate()}
          disabled={triggerMutation.isPending}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-mint text-black font-bold text-xs shadow-lg shadow-brand-mint/20 hover:opacity-90 cursor-pointer disabled:opacity-50"
        >
          {triggerMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          {triggerMutation.isPending ? 'Analyzing...' : 'Run AI Talent Matching'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Key Metrics (Independent Counts) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
            Applicants
          </span>
          <p className="text-2xl font-extrabold text-white mt-1">
            {summary?.applicants ?? 0}
          </p>
          <span className="text-[10px] text-text-muted">Direct applicants</span>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-brand-mint">
            AI Recommended
          </span>
          <p className="text-2xl font-extrabold text-brand-mint mt-1">
            {summary?.totalRecommendedTalent ?? totalMatches}
          </p>
          <span className="text-[10px] text-brand-mint/70">Matched profiles</span>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
            Saved Candidates
          </span>
          <p className="text-2xl font-extrabold text-amber-300 mt-1">
            {summary?.savedCandidates ?? 0}
          </p>
          <span className="text-[10px] text-amber-400/70">Shortlisted for review</span>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
            Offers Sent
          </span>
          <p className="text-2xl font-extrabold text-cyan-300 mt-1">
            {summary?.offersSent ?? 0}
          </p>
          <span className="text-[10px] text-cyan-400/70">Opportunities sent</span>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-brand-mint/10 border border-brand-mint/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-brand-mint" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white font-heading">
              AI Recommended Talent
            </h2>
            <p className="text-[11px] text-text-muted mt-0.5">
              {totalMatches} relevant profiles found for {jobTitle || 'this job'}
            </p>
          </div>
        </div>

        <button
          onClick={() => triggerMutation.mutate()}
          disabled={triggerMutation.isPending}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs text-white font-semibold border border-white/[0.08] transition-all cursor-pointer disabled:opacity-50"
        >
          {triggerMutation.isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          {triggerMutation.isPending ? 'Analyzing...' : 'Refresh Matches'}
        </button>
      </div>

      {/* Category & Status Counters */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => { setCategoryFilter(''); setSavedOnly(false); setPage(1); }}
          className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${
            !categoryFilter && !savedOnly
              ? 'bg-brand-mint text-black font-bold'
              : 'bg-white/[0.04] text-text-muted hover:text-white hover:bg-white/[0.08] border border-white/[0.06]'
          }`}
        >
          All ({totalMatches})
        </button>
        <button
          onClick={() => { setSavedOnly(!savedOnly); setPage(1); }}
          className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
            savedOnly
              ? 'bg-amber-400 text-black font-bold shadow-md'
              : 'bg-white/[0.04] text-text-muted hover:text-white hover:bg-white/[0.08] border border-white/[0.06]'
          }`}
        >
          <Bookmark className="w-3 h-3" /> Saved ({summary?.savedCandidates ?? 0})
        </button>
        {counts.highlyCompatible > 0 && (
          <button
            onClick={() => { setCategoryFilter('HIGHLY_COMPATIBLE'); setPage(1); }}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              categoryFilter === 'HIGHLY_COMPATIBLE'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold'
                : 'bg-white/[0.04] text-text-muted hover:text-white hover:bg-white/[0.08] border border-white/[0.06]'
            }`}
          >
            <Zap className="w-3 h-3" /> Highly Compatible ({counts.highlyCompatible})
          </button>
        )}
        {counts.stronglyCompatible > 0 && (
          <button
            onClick={() => { setCategoryFilter('STRONGLY_COMPATIBLE'); setPage(1); }}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              categoryFilter === 'STRONGLY_COMPATIBLE'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold'
                : 'bg-white/[0.04] text-text-muted hover:text-white hover:bg-white/[0.08] border border-white/[0.06]'
            }`}
          >
            <Target className="w-3 h-3" /> Strongly Compatible ({counts.stronglyCompatible})
          </button>
        )}
        {counts.potentiallyCompatible > 0 && (
          <button
            onClick={() => { setCategoryFilter('POTENTIALLY_COMPATIBLE'); setPage(1); }}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              categoryFilter === 'POTENTIALLY_COMPATIBLE'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold'
                : 'bg-white/[0.04] text-text-muted hover:text-white hover:bg-white/[0.08] border border-white/[0.06]'
            }`}
          >
            <BarChart3 className="w-3 h-3" /> Potentially Compatible ({counts.potentiallyCompatible})
          </button>
        )}
      </div>

      {/* Trust banner */}
      <div className="p-3 rounded-xl bg-white/[0.015] border border-white/[0.04] flex items-start gap-2">
        <ShieldCheck className="w-4 h-4 text-brand-mint/60 shrink-0 mt-0.5" />
        <p className="text-[10px] text-text-muted leading-relaxed">
          <strong className="text-white/70">Profile Compatibility</strong> scores
          are based on structured profile data including discipline, skills, software,
          experience, projects, and career preferences. They indicate alignment — not
          a guarantee of hiring success. The recruiter makes the hiring decision.
        </p>
      </div>

      {/* Candidate Cards */}
      <div className="space-y-4">
        {matches.map((match) => (
          <CandidateCard
            key={match.matchId}
            match={match}
            jobId={jobId}
            onInviteSent={() => {
              queryClient.invalidateQueries({ queryKey: ['recommended-talent', jobId] });
              refetchSummary();
            }}
            onSaveToggled={() => {
              queryClient.invalidateQueries({ queryKey: ['recommended-talent', jobId] });
              refetchSummary();
            }}
            onDismissed={() => {
              queryClient.invalidateQueries({ queryKey: ['recommended-talent', jobId] });
              refetchSummary();
            }}
          />
        ))}
      </div>

      {/* Pagination */}
      {talentData?.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-4 py-2 rounded-xl bg-white/[0.05] text-xs text-white font-semibold hover:bg-white/[0.1] disabled:opacity-30 cursor-pointer"
          >
            Previous
          </button>
          <span className="text-xs text-text-muted">
            Page {page} of {talentData.totalPages}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={!talentData?.hasNextPage}
            className="px-4 py-2 rounded-xl bg-white/[0.05] text-xs text-white font-semibold hover:bg-white/[0.1] disabled:opacity-30 cursor-pointer"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
