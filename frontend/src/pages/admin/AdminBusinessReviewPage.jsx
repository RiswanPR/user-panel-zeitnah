import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Search,
  ExternalLink,
  ShieldAlert,
  User,
  MapPin,
  Globe,
  X,
  RotateCcw,
} from 'lucide-react';
import { organizationService } from '../../services/organizationService';
import { useToast } from '../../components/ui/Toast';

export default function AdminBusinessReviewPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const [statusFilter, setStatusFilter] = useState('PENDING'); // 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'ALL'
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states for action confirmation
  const [reviewingOrg, setReviewingOrg] = useState(null);
  const [rejectingOrg, setRejectingOrg] = useState(null);
  const [suspendingOrg, setSuspendingOrg] = useState(null);
  const [reasonInput, setReasonInput] = useState('');

  // Fetch admin businesses
  const {
    data: adminData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['admin-businesses', statusFilter, searchQuery],
    queryFn: () =>
      organizationService.getOrganizationsForAdmin({
        status: statusFilter,
        q: searchQuery,
      }),
  });

  const businesses = adminData?.data || [];

  // Approve Mutation
  const approveMutation = useMutation({
    mutationFn: (orgId) => organizationService.approveOrganization(orgId),
    onSuccess: (data) => {
      addToast(`Business '${data.name}' has been APPROVED and verified!`, 'success');
      setReviewingOrg(null);
      queryClient.invalidateQueries({ queryKey: ['admin-businesses'] });
    },
    onError: (err) => {
      addToast(err?.response?.data?.message || 'Failed to approve business', 'error');
    },
  });

  // Reject Mutation
  const rejectMutation = useMutation({
    mutationFn: ({ orgId, reason }) =>
      organizationService.rejectOrganization(orgId, reason),
    onSuccess: (data) => {
      addToast(`Business '${data.name}' has been REJECTED`, 'info');
      setRejectingOrg(null);
      setReasonInput('');
      queryClient.invalidateQueries({ queryKey: ['admin-businesses'] });
    },
    onError: (err) => {
      addToast(err?.response?.data?.message || 'Failed to reject business', 'error');
    },
  });

  // Suspend Mutation
  const suspendMutation = useMutation({
    mutationFn: ({ orgId, reason }) =>
      organizationService.suspendOrganization(orgId, reason),
    onSuccess: (data) => {
      addToast(`Business '${data.name}' has been SUSPENDED`, 'info');
      setSuspendingOrg(null);
      setReasonInput('');
      queryClient.invalidateQueries({ queryKey: ['admin-businesses'] });
    },
    onError: (err) => {
      addToast(err?.response?.data?.message || 'Failed to suspend business', 'error');
    },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-mint/15 text-brand-mint border border-brand-mint/30">
              Admin Governance
            </span>
          </div>
          <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-white mt-2 tracking-tight">
            Business Verification Management
          </h1>
          <p className="text-sm text-text-muted mt-1 leading-relaxed">
            Review employer business registration submissions, verify infrastructure credentials, and manage business authorization.
          </p>
        </div>
      </div>

      {/* ── Filters & Tabs ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-x-auto">
          {[
            { id: 'PENDING', label: 'Pending Review', icon: Clock },
            { id: 'APPROVED', label: 'Approved', icon: CheckCircle2 },
            { id: 'REJECTED', label: 'Rejected', icon: XCircle },
            { id: 'SUSPENDED', label: 'Suspended', icon: AlertTriangle },
            { id: 'ALL', label: 'All Businesses', icon: Building2 },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  active
                    ? 'bg-brand-mint text-black font-bold shadow-md shadow-brand-mint/20'
                    : 'text-text-muted hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-white/30 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by business name or email..."
            className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder-white/30 outline-none focus:border-brand-mint"
          />
        </div>
      </div>

      {/* ── Table / Cards List ── */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <div className="w-10 h-10 border-2 border-brand-mint/20 border-t-brand-mint rounded-full animate-spin" />
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            Loading business submissions...
          </p>
        </div>
      ) : businesses.length === 0 ? (
        <div className="py-16 text-center bg-white/[0.02] border border-white/[0.06] rounded-3xl space-y-3">
          <Building2 className="w-10 h-10 mx-auto text-white/20" />
          <h3 className="text-base font-bold text-white">No businesses found</h3>
          <p className="text-xs text-text-muted max-w-sm mx-auto">
            No business registrations match status '{statusFilter}'.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {businesses.map((org) => {
            const owner = org.createdBy || {};
            return (
              <div
                key={org._id}
                className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-5"
              >
                {/* Org Info */}
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center overflow-hidden shrink-0">
                    {org.logo ? (
                      <img src={org.logo} alt={org.name} className="w-full h-full object-cover" />
                    ) : (
                      <Building2 className="w-6 h-6 text-brand-mint" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-base font-bold text-white font-heading">{org.name}</h4>
                      <span
                        className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                          org.status === 'APPROVED'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : org.status === 'PENDING'
                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                              : 'bg-red-500/15 text-red-400 border border-red-500/30'
                        }`}
                      >
                        {org.status}
                      </span>
                    </div>

                    <p className="text-xs text-text-muted flex items-center gap-2 flex-wrap">
                      <span>{org.industry || 'Infrastructure'}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-text-faint" />
                        <span>{org.location || 'Location not specified'}</span>
                      </span>
                      {org.website && (
                        <>
                          <span>•</span>
                          <a
                            href={org.website}
                            target="_blank"
                            rel="noreferrer"
                            className="text-brand-mint hover:underline font-semibold"
                          >
                            Website
                          </a>
                        </>
                      )}
                    </p>

                    {/* Owner detail */}
                    <div className="flex items-center gap-2 pt-1 text-xs text-white/70">
                      <User className="w-3.5 h-3.5 text-text-faint" />
                      <span>
                        Owner: <strong>{owner.name || owner.email || 'User'}</strong>
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-white/[0.04] text-[10px] font-semibold text-brand-mint">
                        {owner.primaryRole || 'RECRUITER'}
                      </span>
                      <span className="text-text-faint">•</span>
                      <span className="text-text-muted text-[11px]">
                        Submitted {new Date(org.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2.5 shrink-0 self-end lg:self-center">
                  <button
                    onClick={() => setReviewingOrg(org)}
                    className="px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-semibold text-white transition-colors cursor-pointer"
                  >
                    Review Details
                  </button>

                  {org.status !== 'APPROVED' && (
                    <button
                      onClick={() => approveMutation.mutate(org._id)}
                      disabled={approveMutation.isPending}
                      className="px-4 py-2 rounded-xl bg-emerald-500 text-black font-bold text-xs hover:bg-emerald-400 transition-colors shadow-md shadow-emerald-500/20 cursor-pointer"
                    >
                      Approve
                    </button>
                  )}

                  {org.status !== 'REJECTED' && (
                    <button
                      onClick={() => {
                        setRejectingOrg(org);
                        setReasonInput('');
                      }}
                      className="px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Reject
                    </button>
                  )}

                  {org.status === 'APPROVED' && (
                    <button
                      onClick={() => {
                        setSuspendingOrg(org);
                        setReasonInput('');
                      }}
                      className="px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Suspend
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Review Modal ── */}
      {reviewingOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-2xl bg-[#14141c] border border-white/[0.1] rounded-3xl shadow-2xl p-6 sm:p-8 text-white space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-4 border-b border-white/[0.08]">
              <div>
                <h3 className="text-xl font-bold font-heading">{reviewingOrg.name}</h3>
                <p className="text-xs text-brand-mint font-semibold mt-0.5">
                  Registration Review • Status: {reviewingOrg.status}
                </p>
              </div>
              <button
                onClick={() => setReviewingOrg(null)}
                className="p-1.5 rounded-xl text-white/40 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <span className="text-[11px] text-text-muted uppercase font-bold block">
                  Description
                </span>
                <p className="text-sm text-white/90 leading-relaxed mt-1">
                  {reviewingOrg.description || 'No description provided.'}
                </p>
              </div>

              <div>
                <span className="text-[11px] text-text-muted uppercase font-bold block">
                  Infrastructure Specializations
                </span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {reviewingOrg.infrastructureSpecializations?.map((s) => (
                    <span
                      key={s}
                      className="px-2.5 py-1 rounded-lg bg-brand-mint/15 text-brand-mint font-semibold text-xs"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                <div>
                  <span className="text-text-muted block text-[11px]">Business Email</span>
                  <span className="font-semibold text-white">
                    {reviewingOrg.businessEmail || 'None'}
                  </span>
                </div>
                <div>
                  <span className="text-text-muted block text-[11px]">Business Phone</span>
                  <span className="font-semibold text-white">
                    {reviewingOrg.businessPhone || 'None'}
                  </span>
                </div>
                <div>
                  <span className="text-text-muted block text-[11px]">Website</span>
                  <span className="font-semibold text-white">{reviewingOrg.website || 'None'}</span>
                </div>
                <div>
                  <span className="text-text-muted block text-[11px]">Headquarters Location</span>
                  <span className="font-semibold text-white">
                    {reviewingOrg.officeLocation || reviewingOrg.location || 'None'}
                  </span>
                </div>
              </div>

              {reviewingOrg.rejectionReason && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300">
                  <strong>Rejection Reason:</strong> {reviewingOrg.rejectionReason}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-white/[0.08] flex items-center justify-end gap-3">
              <button
                onClick={() => setReviewingOrg(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white/60 hover:text-white"
              >
                Close
              </button>
              {reviewingOrg.status !== 'APPROVED' && (
                <button
                  onClick={() => approveMutation.mutate(reviewingOrg._id)}
                  disabled={approveMutation.isPending}
                  className="px-6 py-2.5 rounded-xl bg-emerald-500 text-black font-bold text-xs hover:bg-emerald-400"
                >
                  Approve Business
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Reject Modal with Mandatory Reason ── */}
      {rejectingOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-[#14141c] border border-white/[0.1] rounded-3xl shadow-2xl p-6 text-white space-y-4">
            <h3 className="text-lg font-bold font-heading text-red-400">
              Reject Business Verification
            </h3>
            <p className="text-xs text-text-muted">
              Please enter the specific reason for rejecting <strong>{rejectingOrg.name}</strong>. The employer will be notified and permitted to rectify and resubmit.
            </p>
            <textarea
              rows={3}
              value={reasonInput}
              onChange={(e) => setReasonInput(e.target.value)}
              placeholder="e.g. Incomplete business address or website not responding..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder-white/30 outline-none focus:border-red-400 resize-none"
            />
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setRejectingOrg(null)}
                className="px-4 py-2 rounded-xl text-xs text-white/60 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  rejectMutation.mutate({ orgId: rejectingOrg._id, reason: reasonInput })
                }
                disabled={rejectMutation.isPending || !reasonInput.trim()}
                className="px-5 py-2 rounded-xl bg-red-500 text-white font-bold text-xs disabled:opacity-50 hover:bg-red-600 transition-colors"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Suspend Modal with Mandatory Reason ── */}
      {suspendingOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-[#14141c] border border-white/[0.1] rounded-3xl shadow-2xl p-6 text-white space-y-4">
            <h3 className="text-lg font-bold font-heading text-amber-400">
              Suspend Business Operations
            </h3>
            <p className="text-xs text-text-muted">
              Please enter the reason for suspending <strong>{suspendingOrg.name}</strong>. Their active jobs and public verification badge will be immediately withdrawn.
            </p>
            <textarea
              rows={3}
              value={reasonInput}
              onChange={(e) => setReasonInput(e.target.value)}
              placeholder="e.g. Compliance failure or fraudulent job posting reports..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder-white/30 outline-none focus:border-amber-400 resize-none"
            />
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setSuspendingOrg(null)}
                className="px-4 py-2 rounded-xl text-xs text-white/60 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  suspendMutation.mutate({ orgId: suspendingOrg._id, reason: reasonInput })
                }
                disabled={suspendMutation.isPending || !reasonInput.trim()}
                className="px-5 py-2 rounded-xl bg-amber-500 text-black font-bold text-xs disabled:opacity-50 hover:bg-amber-400 transition-colors"
              >
                Confirm Suspension
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
