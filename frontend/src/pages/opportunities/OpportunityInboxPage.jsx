import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  Inbox,
  Building2,
  Briefcase,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  Archive,
  MessageSquare,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  ChevronRight,
  Filter,
  DollarSign,
  Calendar,
  Sparkles,
  Send,
  Eye,
} from 'lucide-react';
import opportunityService from '../../services/opportunityService';
import { useToast } from '../../components/ui/Toast';
import { getUploadUrl } from '../../utils/courseUi';

const DECLINE_REASONS = [
  { value: 'not_interested', label: 'Not interested in this role' },
  { value: 'location', label: 'Location or commute mismatch' },
  { value: 'role_mismatch', label: 'Role does not align with my focus' },
  { value: 'salary_mismatch', label: 'Compensation does not meet expectations' },
  { value: 'timing', label: 'Not actively looking at this moment' },
  { value: 'other', label: 'Other' },
];

export default function OpportunityInboxPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('new');
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  // Modals & Action State
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState('not_interested');
  const [declineNote, setDeclineNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Success / Next steps modal after marking Interested
  const [interestedSuccessData, setInterestedSuccessData] = useState(null);

  const loadInbox = useCallback(async (tab) => {
    setLoading(true);
    try {
      const data = await opportunityService.getCandidateInbox(tab);
      const items = Array.isArray(data) ? data : data?.items || [];
      setOpportunities(items);

      // Refresh unread count
      const countRes = await opportunityService.getInboxUnreadCount();
      setUnreadCount(countRes?.unreadCount || 0);
    } catch (err) {
      console.error('Failed to load opportunities:', err);
      toast?.error?.('Could not load your opportunity inbox.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadInbox(activeTab);
  }, [activeTab, loadInbox]);

  const handleOpenDetail = async (opp) => {
    setSelectedOpportunity(opp);
    setIsDetailOpen(true);
    // If it was SENT, backend marks it VIEWED when fetched or viewed
    if (opp.status === 'SENT') {
      try {
        await opportunityService.getCandidateOpportunityById(opp._id);
        setOpportunities((prev) =>
          prev.map((item) => (item._id === opp._id ? { ...item, status: 'VIEWED' } : item))
        );
      } catch {
        // silent
      }
    }
  };

  const handleMarkInterested = async (opp) => {
    setActionLoading(true);
    try {
      const res = await opportunityService.markInterested(opp._id);
      toast?.success?.('Interest registered! You can now message the recruiter or apply.');
      setOpportunities((prev) =>
        prev.map((item) => (item._id === opp._id ? { ...item, status: 'INTERESTED' } : item))
      );
      if (selectedOpportunity?._id === opp._id) {
        setSelectedOpportunity({ ...selectedOpportunity, status: 'INTERESTED' });
      }
      setInterestedSuccessData({
        opportunity: opp,
        recruiterId: opp.senderUserId?._id || opp.senderUserId,
        recruiterName: opp.senderUserId?.name || 'Recruiter',
        jobId: opp.jobId?._id || opp.jobId,
        jobTitle: opp.jobId?.title || 'Position',
      });
      loadInbox(activeTab);
    } catch (err) {
      toast?.error?.(err?.response?.data?.message || 'Failed to update opportunity status.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenDeclineModal = (opp) => {
    setSelectedOpportunity(opp);
    setDeclineReason('not_interested');
    setDeclineNote('');
    setIsDeclineModalOpen(true);
  };

  const handleConfirmDecline = async () => {
    if (!selectedOpportunity) return;
    setActionLoading(true);
    try {
      await opportunityService.declineOpportunity(selectedOpportunity._id, {
        reason: declineReason,
        note: declineNote,
      });
      toast?.success?.('Opportunity declined politely.');
      setIsDeclineModalOpen(false);
      if (isDetailOpen) setIsDetailOpen(false);
      loadInbox(activeTab);
    } catch (err) {
      toast?.error?.(err?.response?.data?.message || 'Failed to decline opportunity.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleArchive = async (opp) => {
    setActionLoading(true);
    try {
      await opportunityService.archiveOpportunity(opp._id);
      toast?.success?.('Opportunity archived.');
      if (isDetailOpen) setIsDetailOpen(false);
      loadInbox(activeTab);
    } catch (err) {
      toast?.error?.('Failed to archive opportunity.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-6xl mx-auto pb-16">
      {/* ── HEADER ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-surface-card via-surface-card/90 to-surface-elevated border border-border p-6 sm:p-8 backdrop-blur-xl shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-mint/5 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-mint/10 border border-brand-mint/20 text-brand-mint text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> Direct Employer Outreach
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-text-primary flex items-center gap-3">
              Opportunity Inbox
              {unreadCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-brand-mint text-brand-navy">
                  {unreadCount} new
                </span>
              )}
            </h1>
            <p className="text-text-muted text-sm max-w-2xl">
              Employers and verified infrastructure recruiters reach out to you directly based on your verified expertise, canonical skills, and project portfolio.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/profile"
              className="px-4 py-2.5 rounded-xl border border-border hover:border-border-accent bg-surface-elevated text-text-primary text-xs sm:text-sm font-semibold flex items-center gap-2 hover:bg-surface-elevated/80 transition-all"
            >
              <Briefcase className="w-4 h-4 text-brand-mint" /> View My Profile
            </Link>
            <Link
              to="/profile/account?section=verification"
              className="px-4 py-2.5 rounded-xl border border-brand-mint/30 bg-brand-mint/10 hover:bg-brand-mint/20 text-brand-mint text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all shadow-sm"
            >
              <ShieldCheck className="w-4 h-4" /> Verification Center
            </Link>
          </div>
        </div>

        {/* ── TABS ── */}
        <div
          role="tablist"
          aria-label="Opportunity Inbox Tabs"
          className="flex items-center gap-2 mt-8 border-b border-border pb-1 overflow-x-auto no-scrollbar"
        >
          {[
            { id: 'new', label: 'New & Active', icon: Inbox },
            { id: 'interested', label: 'Interested', icon: CheckCircle2 },
            { id: 'declined', label: 'Declined', icon: XCircle },
            { id: 'archived', label: 'Archive', icon: Archive },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                id={`opportunity-tab-${tab.id}`}
                aria-selected={active}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  active
                    ? 'text-text-primary bg-surface-elevated border border-border shadow-sm'
                    : 'text-text-muted hover:text-text-primary hover:bg-surface-elevated/40'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-brand-primary dark:text-brand-mint' : 'text-text-faint'}`} />
                {tab.label}
                {tab.id === 'new' && unreadCount > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-brand-primary text-white dark:bg-brand-mint dark:text-brand-navy">
                    {unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── CONTENT AREA ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-brand-mint/20 border-t-brand-mint animate-spin" />
          <p className="text-text-muted text-xs font-mono uppercase tracking-wider">
            Loading opportunities...
          </p>
        </div>
      ) : opportunities.length === 0 ? (
        <div className="rounded-3xl border border-border bg-surface-card/50 p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-surface-elevated border border-border flex items-center justify-center mx-auto text-text-muted">
            <Inbox className="w-8 h-8 opacity-40" />
          </div>
          <h3 className="text-lg font-heading font-bold text-text-primary">No opportunities in {activeTab}</h3>
          <p className="text-text-muted text-sm max-w-md mx-auto">
            {activeTab === 'new'
              ? 'When verified infrastructure recruiters discover your portfolio and match you to active projects, their direct opportunities will appear here.'
              : `You do not have any opportunities marked as ${activeTab}.`}
          </p>
          {activeTab === 'new' && (
            <div className="pt-2">
              <Link
                to="/profile/edit"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-primary text-white hover:bg-brand-primary/90 dark:bg-brand-mint dark:text-brand-navy dark:hover:bg-brand-mint/90 text-xs font-bold font-heading transition-all shadow-sm min-h-[40px]"
              >
                Boost Profile Completeness
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {opportunities.map((opp) => {
            const biz = opp.businessId;
            const job = opp.jobId;
            const sender = opp.senderUserId;
            const isNew = opp.status === 'SENT';

            return (
              <motion.div
                key={opp._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`group relative rounded-2xl border transition-all duration-200 p-5 sm:p-6 backdrop-blur-xl ${
                  isNew
                    ? 'bg-gradient-to-r from-brand-mint/[0.04] via-surface-card to-surface-card border-brand-mint/30 shadow-lg shadow-brand-mint/5'
                    : 'bg-surface-card hover:bg-surface-elevated/50 border-border hover:border-border-accent'
                }`}
              >
                {/* Top strip: Business & Status */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    {/* Business logo / avatar */}
                    <div className="w-12 h-12 rounded-xl bg-surface-elevated border border-border flex items-center justify-center overflow-hidden shrink-0">
                      {biz?.logo ? (
                        <img
                          src={getUploadUrl(biz.logo)}
                          alt={biz.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Building2 className="w-6 h-6 text-brand-mint" />
                      )}
                    </div>

                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          to={biz?.slug ? `/businesses/${biz.slug}` : '#'}
                          className="text-sm font-bold text-text-primary hover:text-brand-primary dark:hover:text-brand-mint transition-colors flex items-center gap-1.5"
                        >
                          {biz?.name || 'Infrastructure Enterprise'}
                          <ShieldCheck className="w-4 h-4 text-brand-primary dark:text-brand-mint" title="Verified Business" />
                        </Link>
                        {isNew && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-brand-primary text-white dark:bg-brand-mint dark:text-brand-navy uppercase">
                            New Opportunity
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                            opp.status === 'INTERESTED'
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                              : opp.status === 'DECLINED'
                              ? 'bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20'
                              : opp.status === 'EXPIRED'
                              ? 'bg-surface-elevated text-text-muted border border-border'
                              : 'bg-surface-elevated text-text-secondary'
                          }`}
                        >
                          {opp.status}
                        </span>
                      </div>

                      {/* Job Title & Specs */}
                      <h2 className="text-lg font-heading font-extrabold text-text-primary group-hover:text-brand-mint transition-colors">
                        {job?.title || 'Infrastructure Engineering Position'}
                      </h2>

                      <div className="flex items-center gap-4 text-xs text-text-muted flex-wrap">
                        {job?.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-text-faint" />
                            {job.location} ({job.workMode || 'On-site'})
                          </span>
                        )}
                        {job?.infrastructureSector && (
                          <span className="flex items-center gap-1">
                            <Briefcase className="w-3.5 h-3.5 text-text-faint" />
                            {job.infrastructureSector}
                          </span>
                        )}
                        {job?.experienceYears && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-text-faint" />
                            {job.experienceYears}y exp
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-text-faint" />
                          Received {new Date(opp.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right side: Recruiter Avatar / Name */}
                  {sender && (
                    <div className="text-right text-xs text-text-muted hidden md:block shrink-0">
                      <p className="font-semibold text-text-primary">{sender.name}</p>
                      <p className="text-[11px] text-text-muted">{sender.primaryRole || 'Hiring Team'}</p>
                    </div>
                  )}
                </div>

                {/* Recruiter Personalized Note */}
                {opp.message && (
                  <div className="mt-4 p-3.5 rounded-xl bg-surface-elevated/50 border border-border text-xs text-text-secondary leading-relaxed line-clamp-2">
                    <span className="font-semibold text-text-primary mr-1.5">Note from employer:</span>
                    {opp.message}
                  </div>
                )}

                {/* Decline reason if declined */}
                {opp.status === 'DECLINED' && opp.candidateDeclineReason && (
                  <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300">
                    <span className="font-bold mr-1">Declined:</span>
                    {opp.candidateDeclineReason} {opp.candidateDeclineNote && `— "${opp.candidateDeclineNote}"`}
                  </div>
                )}

                {/* Action Footer */}
                <div className="mt-5 pt-4 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenDetail(opp)}
                      className="px-3.5 py-1.5 rounded-xl border border-border hover:border-border-accent bg-surface-elevated text-xs font-semibold text-text-primary flex items-center gap-1.5 transition-all"
                    >
                      <Eye className="w-3.5 h-3.5 text-text-muted" /> View Details
                    </button>
                    {job?._id && (
                      <Link
                        to={`/jobs/${job._id}`}
                        className="px-3.5 py-1.5 rounded-xl border border-border hover:border-border-accent bg-surface-elevated text-xs font-semibold text-text-secondary hover:text-text-primary flex items-center gap-1.5 transition-all"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-text-faint" /> View Job Post
                      </Link>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Primary actions based on status */}
                    {(opp.status === 'SENT' || opp.status === 'VIEWED') && (
                      <>
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => handleMarkInterested(opp)}
                          className="px-4 py-1.5 rounded-xl bg-brand-primary text-white hover:bg-brand-primary/90 dark:bg-brand-mint dark:text-brand-navy dark:hover:bg-brand-mint/90 text-xs font-bold font-heading transition-all shadow-sm flex items-center gap-1.5 cursor-pointer min-h-[38px]"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> I'm Interested
                        </button>
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => handleOpenDeclineModal(opp)}
                          className="px-3.5 py-1.5 rounded-xl border border-red-500/30 hover:border-red-500/50 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer min-h-[38px]"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Decline
                        </button>
                      </>
                    )}

                    {opp.status === 'INTERESTED' && (
                      <>
                        <Link
                          to={`/messages?user=${sender?._id || sender}`}
                          className="px-4 py-1.5 rounded-xl bg-brand-mint/15 border border-brand-mint/30 text-brand-primary dark:text-brand-mint text-xs font-bold hover:bg-brand-mint/25 transition-all flex items-center gap-1.5 min-h-[38px]"
                        >
                          <MessageSquare className="w-3.5 h-3.5" /> Message Recruiter
                        </Link>
                        {job?._id && (
                          <Link
                            to={`/jobs/${job._id}`}
                            className="px-4 py-1.5 rounded-xl bg-brand-primary text-white hover:bg-brand-primary/90 dark:bg-brand-mint dark:text-brand-navy dark:hover:bg-brand-mint/90 text-xs font-bold hover:bg-brand-mint/90 transition-all flex items-center gap-1.5 min-h-[38px]"
                          >
                            <Briefcase className="w-3.5 h-3.5" /> Apply Now
                          </Link>
                        )}
                      </>
                    )}

                    {opp.status !== 'ARCHIVED' && (
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => handleArchive(opp)}
                        title="Archive Opportunity"
                        className="p-1.5 rounded-xl border border-border hover:border-border-accent hover:bg-surface-elevated text-text-faint hover:text-text-muted transition-all"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── DETAIL MODAL ── */}
      <AnimatePresence>
        {isDetailOpen && selectedOpportunity && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-2xl bg-surface-card border border-border text-text-primary rounded-3xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto shadow-2xl space-y-6"
            >
              {/* Close */}
              <button
                type="button"
                onClick={() => setIsDetailOpen(false)}
                className="absolute top-5 right-5 p-2 rounded-full border border-border hover:bg-surface-elevated text-text-muted hover:text-text-primary transition-all"
              >
                ✕
              </button>

              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-mint/10 border border-brand-mint/20 text-brand-mint text-xs font-mono font-bold uppercase">
                  Opportunity Details
                </div>
                <h3 className="text-xl sm:text-2xl font-heading font-extrabold text-text-primary">
                  {selectedOpportunity.jobId?.title || 'Infrastructure Role'}
                </h3>
                <div className="flex items-center gap-3 text-xs text-text-muted">
                  <span className="font-semibold text-text-primary flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-brand-mint" />
                    {selectedOpportunity.businessId?.name}
                  </span>
                  <span>•</span>
                  <span>{selectedOpportunity.jobId?.location || 'India'}</span>
                  <span>•</span>
                  <span>Received {new Date(selectedOpportunity.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Message from recruiter */}
              <div className="p-4 rounded-2xl bg-surface-elevated/50 border border-border space-y-2">
                <p className="text-xs font-mono font-bold text-brand-mint uppercase">
                  Message from {selectedOpportunity.senderUserId?.name || 'Recruiter'}
                </p>
                <p className="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">
                  {selectedOpportunity.message || 'We would like to connect regarding this opportunity.'}
                </p>
              </div>

              {/* Job summary specs */}
              {selectedOpportunity.jobId && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-surface-elevated/40 border border-border text-xs">
                  <div>
                    <span className="text-text-faint block">Work Mode</span>
                    <span className="font-bold text-text-primary">{selectedOpportunity.jobId.workMode || 'On-site'}</span>
                  </div>
                  <div>
                    <span className="text-text-faint block">Sector</span>
                    <span className="font-bold text-text-primary">{selectedOpportunity.jobId.infrastructureSector || 'Civil'}</span>
                  </div>
                  <div>
                    <span className="text-text-faint block">Experience</span>
                    <span className="font-bold text-text-primary">{selectedOpportunity.jobId.experienceYears || '3+'} Years</span>
                  </div>
                </div>
              )}

              {/* Action Buttons in Modal */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                {(selectedOpportunity.status === 'SENT' || selectedOpportunity.status === 'VIEWED') && (
                  <>
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleMarkInterested(selectedOpportunity)}
                      className="px-5 py-2.5 rounded-xl bg-brand-mint text-brand-navy text-xs font-bold font-heading hover:bg-brand-mint/90 transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" /> I'm Interested
                    </button>
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => {
                        setIsDetailOpen(false);
                        handleOpenDeclineModal(selectedOpportunity);
                      }}
                      className="px-4 py-2.5 rounded-xl border border-red-500/30 hover:bg-red-500/10 text-red-400 text-xs font-semibold transition-all cursor-pointer"
                    >
                      Decline
                    </button>
                  </>
                )}
                {selectedOpportunity.status === 'INTERESTED' && (
                  <Link
                    to={`/messages?user=${selectedOpportunity.senderUserId?._id || selectedOpportunity.senderUserId}`}
                    className="px-5 py-2.5 rounded-xl bg-brand-mint text-brand-navy text-xs font-bold font-heading hover:bg-brand-mint/90 transition-all flex items-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4" /> Message Recruiter
                  </Link>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── DECLINE MODAL ── */}
      <AnimatePresence>
        {isDeclineModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-surface-card border border-border text-text-primary rounded-3xl p-6 space-y-5 shadow-2xl"
            >
              <h3 className="text-lg font-heading font-bold text-text-primary">Decline Opportunity</h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Let the employer know politely why this opportunity isn't a fit. This helps improve future opportunities without affecting your profile ranking.
              </p>

              {/* Reasons radio */}
              <div className="space-y-2">
                {DECLINE_REASONS.map((r) => (
                  <label
                    key={r.value}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      declineReason === r.value
                        ? 'border-brand-mint/40 bg-brand-mint/10 text-text-primary font-semibold'
                        : 'border-border bg-surface-elevated/40 text-text-secondary hover:bg-surface-elevated'
                    }`}
                  >
                    <input
                      type="radio"
                      name="declineReason"
                      value={r.value}
                      checked={declineReason === r.value}
                      onChange={(e) => setDeclineReason(e.target.value)}
                      className="accent-brand-mint"
                    />
                    {r.label}
                  </label>
                ))}
              </div>

              {/* Optional note */}
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">
                  Optional note to recruiter (private):
                </label>
                <textarea
                  rows={2}
                  value={declineNote}
                  onChange={(e) => setDeclineNote(e.target.value)}
                  placeholder="Thank you for considering me. At this moment..."
                  className="w-full rounded-xl bg-surface-elevated border border-border p-3 text-xs text-text-primary placeholder-text-faint focus:outline-none focus:border-brand-mint resize-none"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDeclineModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border text-text-muted hover:text-text-primary text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleConfirmDecline}
                  className="px-5 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold font-heading transition-all shadow-sm"
                >
                  {actionLoading ? 'Declining...' : 'Confirm Decline'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── INTERESTED NEXT STEPS MODAL ── */}
      <AnimatePresence>
        {interestedSuccessData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-surface-card border border-brand-mint/30 text-text-primary rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl text-center"
            >
              <div className="w-16 h-16 rounded-full bg-brand-mint/15 border border-brand-mint/30 flex items-center justify-center mx-auto text-brand-mint">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-heading font-extrabold text-text-primary">Interest Expressed!</h3>
                <p className="text-xs text-text-muted max-w-md mx-auto leading-relaxed">
                  We've notified {interestedSuccessData.recruiterName} that you're interested in the{' '}
                  <span className="text-text-primary font-semibold">{interestedSuccessData.jobTitle}</span> role. What would you like to do next?
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const recId = interestedSuccessData.recruiterId;
                    setInterestedSuccessData(null);
                    navigate(`/messages?user=${recId}`);
                  }}
                  className="p-4 rounded-2xl border border-brand-mint/30 bg-brand-mint/10 hover:bg-brand-mint/20 text-text-primary text-left space-y-1.5 transition-all group cursor-pointer"
                >
                  <MessageSquare className="w-5 h-5 text-brand-mint" />
                  <p className="text-xs font-bold font-heading text-text-primary">Message Recruiter</p>
                  <p className="text-[11px] text-text-muted">Start a conversation in Phase 7 Messaging</p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const jId = interestedSuccessData.jobId;
                    setInterestedSuccessData(null);
                    navigate(`/jobs/${jId}`);
                  }}
                  className="p-4 rounded-2xl border border-border bg-surface-elevated hover:bg-surface-elevated/80 text-text-primary text-left space-y-1.5 transition-all group cursor-pointer"
                >
                  <Briefcase className="w-5 h-5 text-brand-yellow" />
                  <p className="text-xs font-bold font-heading text-text-primary">Review & Apply</p>
                  <p className="text-[11px] text-text-muted">Open the job description and submit your application</p>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setInterestedSuccessData(null)}
                className="text-xs text-text-muted hover:text-text-primary transition-colors"
              >
                Close and stay in Inbox
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
