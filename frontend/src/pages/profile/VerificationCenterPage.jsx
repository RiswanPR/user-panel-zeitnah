import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Shield,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  UploadCloud,
  FileText,
  Lock,
  ArrowRight,
  Award,
  Building2,
  GraduationCap,
  Info,
  X,
} from 'lucide-react';
import { portfolioService } from '../../services/portfolioService';
import ProfileNav from '../../components/profile/ProfileNav';
import { useToast } from '../../components/ui/Toast';

const CATEGORY_META = {
  IDENTITY: {
    title: 'Identity Verification',
    description: 'Government-issued ID to establish genuine human identity and prevent impersonation.',
    icon: ShieldCheck,
    badgeColor: 'text-brand-mint border-brand-mint/30 bg-brand-mint/10',
    allowedTypes: ['Passport', 'National ID / Aadhaar', "Driver's License"],
  },
  PROFESSIONAL: {
    title: 'Professional Status',
    description: 'Engineering Council registration, Chartered Engineer, or active professional license.',
    icon: Award,
    badgeColor: 'text-brand-yellow border-brand-yellow/30 bg-brand-yellow/10',
    allowedTypes: ['Council of Engineers License', 'Chartered Engineer Certificate', 'Professional Membership'],
  },
  BUSINESS_AFFILIATION: {
    title: 'Business Affiliation',
    description: 'Official employment verification with an infrastructure enterprise or EPC firm.',
    icon: Building2,
    badgeColor: 'text-blue-400 border-blue-400/30 bg-blue-400/10',
    allowedTypes: ['Employment Contract / Letter', 'Work ID Card', 'Corporate Email Verification'],
  },
  CERTIFICATION: {
    title: 'Certification Verification',
    description: 'Validation of specialized software, Primavera P6, BIM, or PMP credentials.',
    icon: FileText,
    badgeColor: 'text-purple-400 border-purple-400/30 bg-purple-400/10',
    allowedTypes: ['Software Vendor Certificate (Oracle/Autodesk)', 'Project Management Certificate', 'Industry Diploma'],
  },
  EDUCATOR: {
    title: 'Educator Credential',
    description: 'Institution-affiliated faculty and academy trainer credentials. Admin assigned only.',
    icon: GraduationCap,
    badgeColor: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10',
    isAdminOnly: true,
  },
};

export default function VerificationCenterPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  // Request modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [category, setCategory] = useState('PROFESSIONAL');
  const [documentType, setDocumentType] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [issuingAuthority, setIssuingAuthority] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const loadVerificationCenter = async () => {
    setLoading(true);
    try {
      const res = await portfolioService.getVerificationCenter();
      setData(res);
    } catch (err) {
      console.error('Failed to load verification center:', err);
      toast?.error?.('Could not load verification records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVerificationCenter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenRequest = (cat) => {
    setCategory(cat || 'PROFESSIONAL');
    const meta = CATEGORY_META[cat || 'PROFESSIONAL'];
    setDocumentType(meta?.allowedTypes?.[0] || '');
    setDocumentNumber('');
    setIssuingAuthority('');
    setExpiresAt('');
    setFiles([]);
    setIsModalOpen(true);
  };

  const handleFileChange = (e) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      const invalid = selected.find((f) => f.size > 10 * 1024 * 1024);
      if (invalid) {
        toast?.error?.('Each file must be under 10MB.');
        return;
      }
      setFiles(selected);
    }
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (!category || !documentType) {
      toast?.error?.('Please choose a verification category and document type.');
      return;
    }
    if (files.length === 0) {
      toast?.error?.('Please upload at least one verification document for review.');
      return;
    }

    setSubmitting(true);
    try {
      await portfolioService.submitVerificationRequest(
        {
          category,
          documentType,
          documentNumber,
          issuingAuthority,
          expiresAt: expiresAt || undefined,
        },
        files
      );
      toast?.success?.('Verification request submitted for admin review.');
      setIsModalOpen(false);
      loadVerificationCenter();
    } catch (err) {
      toast?.error?.(err?.response?.data?.message || 'Failed to submit verification request.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStatusBadge = (status, validUntil) => {
    const s = (status || 'UNVERIFIED').toUpperCase();
    if (s === 'VERIFIED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
          <CheckCircle2 className="w-3.5 h-3.5" /> Verified
          {validUntil && <span className="text-[10px] text-text-muted">(exp {new Date(validUntil).toLocaleDateString()})</span>}
        </span>
      );
    }
    if (s === 'PENDING') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono bg-brand-yellow/10 text-brand-yellow border border-brand-yellow/25">
          <Clock className="w-3.5 h-3.5" /> Under Review
        </span>
      );
    }
    if (s === 'REJECTED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono bg-red-500/10 text-red-400 border border-red-500/25">
          <XCircle className="w-3.5 h-3.5" /> Rejected
        </span>
      );
    }
    if (s === 'EXPIRED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono bg-white/[0.05] text-text-muted border border-white/10">
          <AlertTriangle className="w-3.5 h-3.5" /> Expired
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono bg-white/[0.04] text-text-faint border border-white/[0.08]">
        Unverified
      </span>
    );
  };

  return (
    <div className="space-y-6 sm:space-y-8 max-w-6xl mx-auto pb-20">
      {/* ── 01. UNIFIED PROFILE NAVIGATION ── */}
      <ProfileNav />

      {/* ── 02. TRUST & VERIFICATION HERO ── */}
      <section className="relative overflow-hidden rounded-3xl bg-[#0A0F18]/95 border border-white/[0.08] p-6 sm:p-10 shadow-[0_12px_40px_rgba(0,0,0,0.4)]">
        <div
          className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-brand-mint/40 to-transparent pointer-events-none"
          aria-hidden="true"
        />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-mint/10 border border-brand-mint/20 text-brand-mint text-xs font-semibold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" /> Trust & Verification Center
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-black text-white tracking-tight">
              Verification Center
            </h1>
            <p className="text-text-muted text-xs sm:text-sm max-w-2xl leading-relaxed">
              Establish credible infrastructure authority. Badges represent verified credentials, council registrations, and validated enterprise affiliations.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/profile/portfolio"
              className="zn-btn-secondary text-xs sm:text-sm py-2.5 px-4"
            >
              View Portfolio
            </Link>
            <button
              type="button"
              onClick={() => handleOpenRequest('PROFESSIONAL')}
              className="zn-btn-primary text-xs sm:text-sm py-2.5 px-5 flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Request Verification</span>
            </button>
          </div>
        </div>

        {/* Security / Privacy notice */}
        <div className="mt-6 flex items-start gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-xs text-text-secondary">
          <Lock className="w-4 h-4 text-brand-mint shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-white">Strict Document Security:</strong> Verification documents and licenses are stored in private encrypted storage with authenticated signed tokens. Documents are never exposed on your public profile or shared with recruiters. Only the resulting verification badge is displayed.
          </p>
        </div>
      </section>

      {/* ── 03. CATEGORY CARDS ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-brand-mint/20 border-t-brand-mint animate-spin" />
          <p className="text-text-muted text-xs font-mono uppercase tracking-wider">
            Loading verification status...
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {Object.entries(CATEGORY_META).map(([catKey, meta]) => {
              const Icon = meta.icon;
              const catStatus = data?.verifications?.[catKey.toLowerCase()] || { status: 'UNVERIFIED' };
              const isVerified = catStatus.status === 'VERIFIED';
              const isPending = catStatus.status === 'PENDING';

              return (
                <div
                  key={catKey}
                  className="rounded-2xl border border-white/[0.08] bg-[#0A0F18]/90 p-5 sm:p-6 space-y-4 hover:border-white/20 transition-all shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${meta.badgeColor}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-base font-heading font-bold text-white">
                          {meta.title}
                        </h2>
                        <span className="text-[11px] text-text-muted font-mono uppercase">
                          {catKey.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                    {renderStatusBadge(catStatus.status, catStatus.validUntil)}
                  </div>

                  <p className="text-xs text-text-muted leading-relaxed">
                    {meta.description}
                  </p>

                  <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between">
                    {meta.isAdminOnly ? (
                      <span className="text-[11px] text-text-faint italic flex items-center gap-1">
                        <Info className="w-3.5 h-3.5" /> Administrator Controlled
                      </span>
                    ) : isVerified ? (
                      <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Badge Active on Profile
                      </span>
                    ) : isPending ? (
                      <span className="text-xs text-brand-yellow font-semibold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Review in progress
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenRequest(catKey)}
                        className="text-xs font-bold text-brand-mint hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>Verify this category</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── 04. VERIFICATION AUDIT TRAIL ── */}
          <section className="rounded-3xl border border-white/[0.08] bg-[#0A0F18]/90 backdrop-blur-xl p-6 sm:p-8 space-y-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-heading font-extrabold text-white tracking-tight">
                  Verification History
                </h2>
                <p className="text-xs text-text-muted mt-0.5">
                  Audit log of your submitted verification requests and decisions
                </p>
              </div>
            </div>

            {(!data?.requests || data.requests.length === 0) ? (
              <div className="py-10 text-center text-text-muted text-xs space-y-2 border border-dashed border-white/[0.08] rounded-2xl">
                <Shield className="w-8 h-8 opacity-30 mx-auto" />
                <p>No verification requests submitted yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.requests.map((req) => (
                  <div
                    key={req._id}
                    className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white uppercase font-mono">
                          {req.category}
                        </span>
                        <span>•</span>
                        <span className="text-text-secondary">{req.documentType}</span>
                        {req.issuingAuthority && (
                          <>
                            <span>•</span>
                            <span className="text-text-muted">{req.issuingAuthority}</span>
                          </>
                        )}
                      </div>
                      <p className="text-[11px] text-text-muted">
                        Submitted on {new Date(req.createdAt).toLocaleDateString()}
                      </p>
                      {req.rejectionReason && (
                        <p className="text-xs text-red-400 mt-1">
                          <strong>Admin Feedback:</strong> {req.rejectionReason}
                        </p>
                      )}
                    </div>

                    <div className="shrink-0">
                      {renderStatusBadge(req.status, req.validUntil)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ── 05. REQUEST VERIFICATION MODAL ── */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-[#0F1724] border border-white/[0.12] rounded-3xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto shadow-2xl space-y-5"
            >
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="absolute top-5 right-5 p-2 rounded-full border border-white/10 hover:bg-white/[0.08] text-text-muted hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div>
                <h3 className="text-xl font-heading font-bold text-white">
                  Request Credential Verification
                </h3>
                <p className="text-xs text-text-muted mt-1">
                  Upload official documentation to establish verified trust on Zeitnah.
                </p>
              </div>

              <form onSubmit={handleSubmitRequest} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      const meta = CATEGORY_META[e.target.value];
                      setDocumentType(meta?.allowedTypes?.[0] || '');
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs focus:border-brand-mint outline-none transition-colors"
                  >
                    {Object.entries(CATEGORY_META)
                      .filter(([, meta]) => !meta.isAdminOnly)
                      .map(([key, meta]) => (
                        <option key={key} value={key} className="bg-[#0F1724]">
                          {meta.title}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                    Document Type
                  </label>
                  <input
                    type="text"
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                    placeholder="e.g. Council Registration Certificate"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs focus:border-brand-mint outline-none transition-colors"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                      Document / License #
                    </label>
                    <input
                      type="text"
                      value={documentNumber}
                      onChange={(e) => setDocumentNumber(e.target.value)}
                      placeholder="Optional"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs focus:border-brand-mint outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                      Issuing Authority
                    </label>
                    <input
                      type="text"
                      value={issuingAuthority}
                      onChange={(e) => setIssuingAuthority(e.target.value)}
                      placeholder="e.g. Council of Engineers"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs focus:border-brand-mint outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                    Upload Official Evidence (PDF, JPG, PNG &le; 10MB)
                  </label>
                  <input
                    type="file"
                    multiple
                    accept="application/pdf,image/jpeg,image/png,image/webp"
                    onChange={handleFileChange}
                    className="w-full text-xs text-text-muted file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border file:border-white/10 file:bg-white/[0.05] file:text-white file:text-xs file:font-semibold hover:file:bg-white/[0.1] file:cursor-pointer"
                    required
                  />
                  {files.length > 0 && (
                    <p className="text-[11px] text-brand-mint mt-1">
                      {files.length} document{files.length > 1 ? 's' : ''} selected
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-white/10 text-text-muted hover:text-white text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="zn-btn-primary text-xs px-5 py-2.5 cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? 'Submitting...' : 'Submit Evidence'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
