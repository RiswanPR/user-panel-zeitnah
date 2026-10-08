import React, { useState, useMemo, Suspense } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Building2,
  CheckCircle2,
  MapPin,
  Globe,
  Briefcase,
  Users,
  Calendar,
  ArrowLeft,
  ExternalLink,
  ChevronRight,
  AlertCircle,
  Sparkles,
  Settings,
  Radio,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { organizationService } from '../../services/organizationService';
import { opportunityService } from '../../services/opportunityService';
import { useActiveProfile } from '../../context/ActiveProfileContext';
import lazyWithRetry from '../../utils/lazyWithRetry';

const CreateActionModal = lazyWithRetry(() => import('../../components/community/composer/CreateActionModal'));
const CreatePostModal = lazyWithRetry(() => import('../../components/community/composer/CreatePostModal'));
const ReelStudioModal = lazyWithRetry(() => import('../../components/community/composer/ReelStudioModal'));
const CreateStoryModal = lazyWithRetry(() => import('../../components/community/stories/CreateStoryModal'));

export default function PublicBusinessProfilePage() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const {
    businesses,
    activeProfileType,
    activeBusinessId,
    switchToBusiness,
  } = useActiveProfile();

  // Creation modal states
  const [isCreateActionOpen, setIsCreateActionOpen] = useState(false);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [isCreateReelOpen, setIsCreateReelOpen] = useState(false);
  const [isCreateStoryOpen, setIsCreateStoryOpen] = useState(false);

  // Fetch business details
  const {
    data: business,
    isLoading: loadingOrg,
    error: orgError,
  } = useQuery({
    queryKey: ['public-business', slug],
    queryFn: () => organizationService.getOrganizationBySlug(slug),
    enabled: !!slug,
  });

  // Fetch open active jobs for this business
  const {
    data: jobsData,
    isLoading: loadingJobs,
  } = useQuery({
    queryKey: ['business-public-jobs', business?._id],
    queryFn: () =>
      opportunityService.getOpportunities({
        organizationId: business?._id,
      }),
    enabled: !!business?._id,
  });

  const jobs = jobsData?.data || [];

  const businessId = business?._id || business?.id;
  const isMyBusiness = useMemo(() => {
    if (!businesses || !businessId) return false;
    return businesses.some(
      (b) =>
        String(b.id || b._id) === String(businessId) ||
        (b.slug && business.slug && b.slug.toLowerCase() === business.slug.toLowerCase())
    );
  }, [businesses, businessId, business?.slug]);

  const isActiveProfile =
    isMyBusiness &&
    activeProfileType === 'business' &&
    String(activeBusinessId) === String(businessId);

  const publishingContext = useMemo(() => {
    if (!business) return null;
    return {
      profileType: 'business',
      organizationId: businessId,
      organization: business,
    };
  }, [business, businessId]);

  const handleViewCompanyFeed = () => {
    if (isMyBusiness && businessId) {
      switchToBusiness(businessId);
    }
    navigate('/community');
  };

  const handleSwitchToThisBusiness = () => {
    if (businessId) {
      const switched = switchToBusiness(businessId);
      if (switched) {
        toast.success(`Switched active profile to ${business.name}`);
      }
    }
  };

  const handleOpenCreate = () => {
    setIsCreateActionOpen(true);
  };

  if (loadingOrg) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 flex flex-col items-center justify-center space-y-3 min-h-[60vh]">
        <div className="w-10 h-10 border-2 border-brand-mint/20 border-t-brand-mint rounded-full animate-spin" />
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Loading business profile...
        </p>
      </div>
    );
  }

  if (orgError || !business) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white">Business Profile Not Found</h2>
        <p className="text-xs text-text-muted">
          This organization might be unverified, private, or does not exist.
        </p>
        <Link
          to="/network?tab=organizations"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-mint text-black font-bold text-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Explore Organizations</span>
        </Link>
      </div>
    );
  }

  const isVerified = business.isVerified || business.verificationStatus === 'VERIFIED';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back button */}
      <div>
        <Link
          to="/network?tab=organizations"
          className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Organizations</span>
        </Link>
      </div>

      {/* ── Business Header ── */}
      <div className="p-8 rounded-3xl bg-[#111116] border border-white/[0.08] shadow-2xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex items-start gap-5">
            <div className="w-20 h-20 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center overflow-hidden shrink-0 shadow-lg">
              {business.logo ? (
                <img
                  src={business.logo}
                  alt={business.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Building2 className="w-10 h-10 text-brand-mint" />
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-white tracking-tight">
                  {business.name}
                </h1>

                {isVerified && (
                  <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Verified Infrastructure Partner</span>
                  </span>
                )}
              </div>

              <p className="text-xs text-brand-mint font-semibold">
                {business.type?.replace(/_/g, ' ')} • {business.industry}
              </p>

              {business.location && (
                <p className="text-xs text-text-muted flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-text-faint" />
                  <span>{business.location}</span>
                </p>
              )}
            </div>
          </div>

          {/* Header Action Shortcuts */}
          <div className="shrink-0 self-start flex flex-wrap items-center gap-2">
            {business.website && (
              <a
                href={business.website}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-semibold text-white border border-white/[0.08] transition-colors"
              >
                <Globe className="w-3.5 h-3.5 text-brand-mint" />
                <span>Website</span>
                <ExternalLink className="w-3 h-3 text-white/40" />
              </a>
            )}

            {/* View Company Feed (Community) */}
            <button
              type="button"
              onClick={handleViewCompanyFeed}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-semibold text-white border border-white/[0.08] hover:border-brand-mint/30 transition-all cursor-pointer"
              title={`View ${business.name} Company Feed in Community`}
              aria-label={`View ${business.name} Company Feed in Community`}
            >
              <Radio className="w-3.5 h-3.5 text-brand-mint" />
              <span>Company Feed</span>
            </button>

            {/* Owner / Member specific actions */}
            {isMyBusiness && (
              <>
                {isActiveProfile ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-mint/15 text-brand-mint border border-brand-mint/30 text-xs font-semibold select-none">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Active Profile</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleSwitchToThisBusiness}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.08] hover:bg-brand-mint/20 text-xs font-semibold text-white hover:text-brand-mint border border-white/10 hover:border-brand-mint/30 transition-all cursor-pointer"
                    title={`Switch active profile to ${business.name}`}
                  >
                    <span>Switch to Profile</span>
                  </button>
                )}

                {/* Create content for this business */}
                <button
                  type="button"
                  onClick={handleOpenCreate}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-mint text-bg-base hover:bg-brand-mint/90 text-xs font-bold transition-all cursor-pointer shadow-sm shadow-brand-mint/20"
                  aria-label={`Create content as ${business.name}`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Create</span>
                </button>

                {/* Manage Business link */}
                <Link
                  to="/manage-business"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-semibold text-text-muted hover:text-white border border-white/[0.08] transition-colors"
                  title="Manage Business"
                  aria-label="Manage Business"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Manage</span>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Highlight Metrics */}
        <div className="pt-6 border-t border-white/[0.06] grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-[11px] text-text-muted block">Company Size</span>
            <span className="font-semibold text-white mt-0.5 block">
              {business.companySize || 'Enterprise'}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-text-muted block">Founded</span>
            <span className="font-semibold text-white mt-0.5 block">
              {business.foundedYear || 'Established Partner'}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-text-muted block">Members / Team</span>
            <span className="font-semibold text-white mt-0.5 block">
              {business.memberCount || 1} members
            </span>
          </div>
          <div>
            <span className="text-[11px] text-text-muted block">Active Opportunities</span>
            <span className="font-semibold text-brand-mint mt-0.5 block">
              {jobs.length} active jobs
            </span>
          </div>
        </div>
      </div>

      {/* ── Details Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 cols): About, Specializations, Open Jobs */}
        <div className="lg:col-span-2 space-y-8">
          {/* About */}
          <div className="space-y-3">
            <h3 className="text-base font-bold font-heading text-white">About Organization</h3>
            <p className="text-sm text-white/80 leading-relaxed whitespace-pre-line">
              {business.description ||
                'Leading infrastructure and engineering services provider, collaborating with technical talent and executing critical projects.'}
            </p>
          </div>

          {/* Infrastructure Specializations */}
          {business.infrastructureSpecializations?.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-base font-bold font-heading text-white">
                Infrastructure Specializations
              </h3>
              <div className="flex flex-wrap gap-2">
                {business.infrastructureSpecializations.map((spec) => (
                  <span
                    key={spec}
                    className="px-3.5 py-1.5 rounded-xl bg-brand-mint/15 text-brand-mint border border-brand-mint/30 text-xs font-semibold"
                  >
                    {spec}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Open Active Jobs */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold font-heading text-white flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-brand-mint" />
                <span>Open Infrastructure Jobs ({jobs.length})</span>
              </h3>
            </div>

            {loadingJobs ? (
              <div className="py-8 text-center text-text-muted text-xs">
                Loading job listings...
              </div>
            ) : jobs.length === 0 ? (
              <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center text-text-muted text-xs">
                No active openings currently available from this business.
              </div>
            ) : (
              <div className="space-y-3">
                {jobs.map((job) => (
                  <div
                    key={job.id}
                    className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-brand-mint/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <h4 className="font-bold text-sm text-white">{job.title}</h4>
                      <p className="text-xs text-text-muted flex items-center gap-2">
                        <span className="text-cyan-300 font-semibold">{job.discipline}</span>
                        <span>•</span>
                        <span>{job.workMode}</span>
                        <span>•</span>
                        <span>{job.location}</span>
                      </p>
                    </div>

                    <Link
                      to={`/jobs/${job.id}`}
                      className="flex items-center gap-1 px-4 py-2 rounded-xl bg-brand-mint text-black font-bold text-xs shadow-md shadow-brand-mint/15 self-end sm:self-center"
                    >
                      <span>View & Apply</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Contact & Information */}
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-[#111116] border border-white/[0.08] space-y-4 text-xs">
            <h3 className="text-sm font-bold font-heading text-white uppercase tracking-wider">
              Contact Information
            </h3>

            {business.businessEmail && (
              <div>
                <span className="text-text-muted block text-[11px]">Email</span>
                <span className="text-white font-medium">{business.businessEmail}</span>
              </div>
            )}

            {business.businessPhone && (
              <div>
                <span className="text-text-muted block text-[11px]">Phone</span>
                <span className="text-white font-medium">{business.businessPhone}</span>
              </div>
            )}

            {business.officeLocation && (
              <div>
                <span className="text-text-muted block text-[11px]">Headquarters Address</span>
                <span className="text-white font-medium leading-relaxed block">
                  {business.officeLocation}
                </span>
              </div>
            )}

            {business.linkedin && (
              <div>
                <span className="text-text-muted block text-[11px]">LinkedIn</span>
                <a
                  href={business.linkedin}
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand-mint hover:underline font-semibold"
                >
                  View LinkedIn Profile
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* ── Studio Modals when launching creation directly from Business Profile ── */}
      {isMyBusiness && (
        <Suspense fallback={null}>
          {isCreateActionOpen && (
            <CreateActionModal
              isOpen={isCreateActionOpen}
              onClose={() => setIsCreateActionOpen(false)}
              onSelectPost={() => {
                setIsCreateActionOpen(false);
                setIsCreatePostOpen(true);
              }}
              onSelectReel={() => {
                setIsCreateActionOpen(false);
                setIsCreateReelOpen(true);
              }}
              onSelectStory={() => {
                setIsCreateActionOpen(false);
                setIsCreateStoryOpen(true);
              }}
              publishingContext={publishingContext}
            />
          )}

          {isCreatePostOpen && (
            <CreatePostModal
              isOpen={isCreatePostOpen}
              onClose={() => setIsCreatePostOpen(false)}
              publishingContext={publishingContext}
            />
          )}

          {isCreateReelOpen && (
            <ReelStudioModal
              isOpen={isCreateReelOpen}
              onClose={() => setIsCreateReelOpen(false)}
              onSuccess={() => {
                toast.success('Reel published to Company Feed!');
                navigate('/community');
              }}
              publishingContext={publishingContext}
            />
          )}

          {isCreateStoryOpen && (
            <CreateStoryModal
              isOpen={isCreateStoryOpen}
              onClose={() => setIsCreateStoryOpen(false)}
              publishingContext={publishingContext}
            />
          )}
        </Suspense>
      )}
    </div>
  );
}
