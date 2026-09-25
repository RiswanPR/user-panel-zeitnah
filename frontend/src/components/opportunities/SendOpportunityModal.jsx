import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Send,
  Building2,
  Briefcase,
  AlertCircle,
  CheckCircle2,
  Lock,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import opportunityService from '../../services/opportunityService';
import organizationService from '../../services/organizationService';
import { useToast } from '../ui/Toast';

export default function SendOpportunityModal({
  isOpen,
  onClose,
  candidate,
  onSuccess,
}) {
  const toast = useToast();
  const [businesses, setBusinesses] = useState([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState('');
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingJobs, setFetchingJobs] = useState(false);
  const [fetchingBiz, setFetchingBiz] = useState(false);

  // Initialize modal state
  useEffect(() => {
    if (isOpen) {
      loadBusinesses();
      setMessage(
        `Hi ${candidate?.name || 'there'},\n\nWe came across your infrastructure portfolio on Zeitnah and were impressed by your project experience. We'd love to discuss an exciting opportunity with our team.`,
      );
    } else {
      setSelectedBusinessId('');
      setSelectedJobId('');
      setJobs([]);
    }
  }, [isOpen, candidate]);

  // Load recruiter's active approved businesses
  const loadBusinesses = async () => {
    setFetchingBiz(true);
    try {
      const data = await organizationService.getMyOrganizations();
      const approved = (Array.isArray(data) ? data : data?.items || []).filter(
        (b) =>
          b.status === 'APPROVED' &&
          (b.verificationStatus === 'VERIFIED' || b.status === 'APPROVED'),
      );
      setBusinesses(approved);
      if (approved.length > 0) {
        setSelectedBusinessId(approved[0]._id);
      }
    } catch (err) {
      console.error('Failed to load businesses:', err);
    } finally {
      setFetchingBiz(false);
    }
  };

  // Load published jobs for selected business
  useEffect(() => {
    if (!selectedBusinessId) return;

    const loadJobs = async () => {
      setFetchingJobs(true);
      try {
        const res = await opportunityService.getBusinessJobs(
          selectedBusinessId,
          'PUBLISHED',
        );
        const publishedJobs = Array.isArray(res) ? res : res?.items || [];
        setJobs(publishedJobs);
        if (publishedJobs.length > 0) {
          setSelectedJobId(publishedJobs[0]._id);
        } else {
          setSelectedJobId('');
        }
      } catch (err) {
        console.error('Failed to load business jobs:', err);
        setJobs([]);
      } finally {
        setFetchingJobs(false);
      }
    };

    loadJobs();
  }, [selectedBusinessId]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!selectedBusinessId || !selectedJobId || !candidate?._id) {
      toast.show('Please select a business and a job position.', { type: 'error' });
      return;
    }

    setLoading(true);
    try {
      await opportunityService.sendOpportunity({
        businessId: selectedBusinessId,
        jobId: selectedJobId,
        candidateUserId: candidate._id,
        message: message.trim(),
      });

      toast.show('Opportunity sent successfully to candidate!', { type: 'success' });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to send opportunity.';
      toast.show(msg, { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/75 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg bg-[#0e141b] border border-white/[0.12] rounded-3xl shadow-2xl p-6 sm:p-8 text-white"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-text-muted hover:text-white hover:bg-white/[0.06] transition"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-brand-mint/10 border border-brand-mint/20 flex items-center justify-center text-brand-mint">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white">
                Send Career Opportunity
              </h2>
              <p className="text-xs text-text-muted">
                To <span className="font-semibold text-white">{candidate?.name}</span> ({candidate?.currentRole || candidate?.primaryRole || 'Infrastructure Specialist'})
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSend} className="space-y-4">
            {/* Business Selector */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
                Hiring Business
              </label>
              {fetchingBiz ? (
                <div className="h-11 bg-white/[0.03] rounded-xl animate-pulse" />
              ) : businesses.length === 0 ? (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>No approved businesses found under your management.</span>
                </div>
              ) : (
                <div className="relative">
                  <select
                    value={selectedBusinessId}
                    onChange={(e) => setSelectedBusinessId(e.target.value)}
                    className="w-full h-11 px-4 pr-10 bg-[#161f28] border border-white/[0.1] rounded-xl text-sm text-white appearance-none focus:outline-none focus:border-brand-mint transition"
                  >
                    {businesses.map((b) => (
                      <option key={b._id} value={b._id} className="bg-[#161f28]">
                        {b.name} ({b.industry || 'Infrastructure'})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-3.5 top-3.5 text-text-muted pointer-events-none" />
                </div>
              )}
            </div>

            {/* Job Selector */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
                Select Active Job
              </label>
              {fetchingJobs ? (
                <div className="h-11 bg-white/[0.03] rounded-xl animate-pulse" />
              ) : jobs.length === 0 ? (
                <div className="p-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-xs text-text-muted">
                  No active published jobs found for this business. Publish a job first.
                </div>
              ) : (
                <div className="relative">
                  <select
                    value={selectedJobId}
                    onChange={(e) => setSelectedJobId(e.target.value)}
                    className="w-full h-11 px-4 pr-10 bg-[#161f28] border border-white/[0.1] rounded-xl text-sm text-white appearance-none focus:outline-none focus:border-brand-mint transition"
                  >
                    {jobs.map((j) => (
                      <option key={j._id} value={j._id} className="bg-[#161f28]">
                        {j.title} • {j.location} ({j.workMode})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-3.5 top-3.5 text-text-muted pointer-events-none" />
                </div>
              )}
            </div>

            {/* Custom Message */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
                Personalized Note to Candidate
              </label>
              <textarea
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={1000}
                placeholder="Mention why their infrastructure background stands out..."
                className="w-full p-3.5 bg-[#161f28] border border-white/[0.1] rounded-xl text-sm text-white placeholder-text-muted/50 focus:outline-none focus:border-brand-mint transition resize-none"
              />
              <div className="flex justify-between items-center text-[10px] text-text-muted mt-1">
                <span>Keep it authentic and professional.</span>
                <span>{message.length} / 1000</span>
              </div>
            </div>

            {/* Notice / Terms */}
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-start gap-2.5 text-xs text-text-muted">
              <Lock className="w-4 h-4 text-brand-mint shrink-0 mt-0.5" />
              <span>
                Sending an opportunity notifies the candidate privately. They can review your job and choose to accept, decline, or message you. This does not automatically create an application.
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-white/[0.1] text-xs font-semibold text-text-muted hover:text-white hover:bg-white/[0.04] transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !selectedJobId || businesses.length === 0}
                className="px-6 py-2.5 rounded-xl bg-brand-mint text-bg-base text-xs font-bold flex items-center gap-2 hover:bg-brand-mint/90 transition shadow-lg shadow-brand-mint/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>Sending...</>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Opportunity</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
