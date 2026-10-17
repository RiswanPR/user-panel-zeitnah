import React, { useState, useMemo, useContext, Suspense } from 'react';
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
  UserPlus,
  UserCheck,
  Bell,
  BellOff,
  Loader2,
  MessageSquare,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { organizationService } from '../../services/organizationService';
import { opportunityService } from '../../services/opportunityService';
import { AuthContext } from '../../context/AuthContext';
import { useActiveProfile } from '../../context/ActiveProfileContext';
import {
  useCommunityFeed,
  useOrganizationFollow,
} from '../../hooks/useCommunity';
import PostCard from '../../components/community/PostCard';
import PostCardSkeleton from '../../components/community/feed/PostCard/PostCardSkeleton';
import EmptyState from '../../components/ui/EmptyState';
import lazyWithRetry from '../../utils/lazyWithRetry';

const CommentDrawer = lazyWithRetry(() =>
  import('../../components/community/comments/CommentDrawer'),
);
const CreateActionModal = lazyWithRetry(() =>
  import('../../components/community/composer/CreateActionModal'),
);
const CreatePostModal = lazyWithRetry(() =>
  import('../../components/community/composer/CreatePostModal'),
);
const ReelStudioModal = lazyWithRetry(() =>
  import('../../components/community/composer/ReelStudioModal'),
);
const CreateStoryModal = lazyWithRetry(() =>
  import('../../components/community/stories/CreateStoryModal'),
);

export default function PublicBusinessProfilePage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const {
    businesses,
    activeProfileType,
    activeBusinessId,
    switchToBusiness,
  } = useActiveProfile();

  // Active view tab in details section: 'posts' | 'about'
  const [activeTab, setActiveTab] = useState('posts');
  const [activeCommentPost, setActiveCommentPost] = useState(null);

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

  const businessId = business?._id || business?.id;

  // Organization Follow Hook (Phase 3 Feature A & D)
  const {
    isFollowing,
    notificationsEnabled,
    followersCount,
    isPending: isFollowPending,
    isUpdatingNotifications,
    toggleFollow,
    toggleNotifications,
  } = useOrganizationFollow(businessId, {
    initialData: business
      ? {
          isFollowing: Boolean(business.isFollowing),
          notificationsEnabled: Boolean(business.notificationsEnabled),
          followersCount: Number(business.followersCount) || 0,
        }
      : undefined,
  });

  // Dedicated Company Post Feed Hook (Phase 3 Feature B)
  const {
    data: feedData,
    isLoading: feedLoading,
    isError: feedError,
    refetch: refetchFeed,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useCommunityFeed({
    organizationId: businessId,
    filter: 'all',
  });

  const feedPosts = useMemo(() => {
    const pages = feedData?.pages || [];
    const seen = new Set();
    const result = [];
    for (const page of pages) {
      if (!page?.items) continue;
      for (const post of page.items) {
        if (!post) continue;
        const id = post._id || post.id;
        if (id && !seen.has(id)) {
          seen.add(id);
          result.push(post);
        }
      }
    }
    return result;
  }, [feedData]);

  // Fetch open active jobs for this business
  const { data: jobsData, isLoading: loadingJobs } = useQuery({
    queryKey: ['business-public-jobs', business?._id],
    queryFn: () =>
      opportunityService.getOpportunities({
        organizationId: business?._id,
      }),
    enabled: !!business?._id,
  });

  const jobs = jobsData?.data || [];

  const isMyBusiness = useMemo(() => {
    if (!businesses || !businessId) return false;
    return businesses.some(
      (b) =>
        String(b.id || b._id) === String(businessId) ||
        (b.slug &&
          business?.slug &&
          b.slug.toLowerCase() === business.slug.toLowerCase()),
    );
  }, [businesses, businessId, business]);

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

  const handleToggleFollow = () => {
    if (!user) {
      toast.error('Please sign in to follow this organization');
      navigate('/login');
      return;
    }
    toggleFollow();
  };

  const handleToggleNotifications = () => {
    if (!user) {
      toast.error('Please sign in to configure notifications');
      navigate('/login');
      return;
    }
    toggleNotifications();
  };

  const handleViewCompanyFeed = () => {
    setActiveTab('posts');
    const feedElem = document.getElementById('company-content-tabs');
    if (feedElem) {
      feedElem.scrollIntoView({ behavior: 'smooth' });
    }
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
        <h2 className="text-xl font-bold text-text-primary">Business Profile Not Found</h2>
        <p className="text-xs text-text-muted">
          This organization might be unverified, private, or does not exist.
        </p>
        <Link
          to="/network?tab=organizations"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-mint text-brand-navy font-bold text-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Explore Organizations</span>
        </Link>
      </div>
    );
  }

  const isVerified =
    business.isVerified || business.verificationStatus === 'VERIFIED';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back button */}
      <div>
        <Link
          to="/network?tab=organizations"
          className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Organizations</span>
        </Link>
      </div>

      {/* ── Business Header ── */}
      <div className="p-8 rounded-3xl bg-surface-card border border-border shadow-2xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex items-start gap-5">
            <div className="w-20 h-20 rounded-2xl bg-surface-elevated border border-border flex items-center justify-center overflow-hidden shrink-0 shadow-lg">
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
                <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-text-primary tracking-tight">
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
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-elevated hover:bg-surface-elevated/80 text-xs font-semibold text-text-primary border border-border transition-colors"
              >
                <Globe className="w-3.5 h-3.5 text-brand-mint" />
                <span>Website</span>
                <ExternalLink className="w-3 h-3 text-text-muted" />
              </a>
            )}

            {/* Follow / Unfollow & Notification Controls (Phase 3 Feature A & D) */}
            {!isMyBusiness && (
              <>
                <button
                  type="button"
                  onClick={handleToggleFollow}
                  disabled={isFollowPending}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm disabled:opacity-50 ${
                    isFollowing
                      ? 'bg-surface-elevated hover:bg-red-500/15 text-brand-mint hover:text-red-400 border border-brand-mint/30 hover:border-red-500/30'
                      : 'bg-brand-mint text-brand-navy hover:opacity-90 shadow-brand-mint/20'
                  }`}
                  title={isFollowing ? 'Unfollow organization' : 'Follow organization'}
                  aria-label={isFollowing ? 'Unfollow organization' : 'Follow organization'}
                >
                  {isFollowPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : isFollowing ? (
                    <UserCheck className="w-3.5 h-3.5" />
                  ) : (
                    <UserPlus className="w-3.5 h-3.5" />
                  )}
                  <span>{isFollowing ? 'Following' : 'Follow'}</span>
                </button>

                {/* Per-Company Notification Bell (Phase 3 Feature D) */}
                {isFollowing && (
                  <button
                    type="button"
                    onClick={handleToggleNotifications}
                    disabled={isUpdatingNotifications}
                    className={`p-2 rounded-xl border transition-all cursor-pointer ${
                      notificationsEnabled
                        ? 'bg-brand-mint/15 text-brand-mint border-brand-mint/30 hover:bg-brand-mint/25'
                        : 'bg-surface-elevated text-text-muted border-border hover:text-text-primary hover:bg-surface-elevated/80'
                    }`}
                    title={
                      notificationsEnabled
                        ? 'Post notifications enabled (click to mute)'
                        : 'Post notifications muted (click to enable)'
                    }
                    aria-label="Toggle company post notifications"
                  >
                    {isUpdatingNotifications ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : notificationsEnabled ? (
                      <Bell className="w-3.5 h-3.5" />
                    ) : (
                      <BellOff className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </>
            )}

            {/* View Company Feed Shortcut */}
            <button
              type="button"
              onClick={handleViewCompanyFeed}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                activeTab === 'posts'
                  ? 'bg-brand-mint/15 text-brand-mint border-brand-mint/30'
                  : 'bg-surface-elevated hover:bg-surface-elevated/80 text-text-primary border-border hover:border-brand-mint/30'
              }`}
              title={`View ${business.name} Company Posts`}
              aria-label={`View ${business.name} Company Posts`}
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
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-elevated hover:bg-brand-mint/20 text-xs font-semibold text-text-primary hover:text-brand-mint border border-border hover:border-brand-mint/30 transition-all cursor-pointer"
                    title={`Switch active profile to ${business.name}`}
                  >
                    <span>Switch to Profile</span>
                  </button>
                )}

                {/* Create content for this business */}
                <button
                  type="button"
                  onClick={handleOpenCreate}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-mint text-brand-navy hover:opacity-90 text-xs font-bold transition-all cursor-pointer shadow-sm shadow-brand-mint/20"
                  aria-label={`Create content as ${business.name}`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Create</span>
                </button>

                {/* Manage Business link */}
                <Link
                  to="/manage-business"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-elevated hover:bg-surface-elevated/80 text-xs font-semibold text-text-muted hover:text-text-primary border border-border transition-colors"
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
        <div className="pt-6 border-t border-border grid grid-cols-2 sm:grid-cols-5 gap-4 text-xs">
          <div>
            <span className="text-[11px] text-text-muted block">Followers</span>
            <span className="font-semibold text-brand-mint mt-0.5 block">
              {followersCount || 0} followers
            </span>
          </div>
          <div>
            <span className="text-[11px] text-text-muted block">Company Size</span>
            <span className="font-semibold text-text-primary mt-0.5 block">
              {business.companySize || 'Enterprise'}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-text-muted block">Founded</span>
            <span className="font-semibold text-text-primary mt-0.5 block">
              {business.foundedYear || 'Established Partner'}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-text-muted block">Members / Team</span>
            <span className="font-semibold text-text-primary mt-0.5 block">
              {business.memberCount || 1} members
            </span>
          </div>
          <div>
            <span className="text-[11px] text-text-muted block">Active Opportunities</span>
            <span className="font-semibold text-text-primary mt-0.5 block">
              {jobs.length} active jobs
            </span>
          </div>
        </div>
      </div>

      {/* ── Content View Tabs ── */}
      <div
        id="company-content-tabs"
        className="flex items-center gap-2 border-b border-border pb-3"
      >
        <button
          type="button"
          onClick={() => setActiveTab('posts')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'posts'
              ? 'bg-brand-mint text-brand-navy shadow-sm shadow-brand-mint/20 font-bold'
              : 'text-text-muted hover:text-text-primary bg-surface-elevated/40 hover:bg-surface-elevated'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>Company Posts ({feedPosts.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('about')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'about'
              ? 'bg-brand-mint text-brand-navy shadow-sm shadow-brand-mint/20 font-bold'
              : 'text-text-muted hover:text-text-primary bg-surface-elevated/40 hover:bg-surface-elevated'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>About & Jobs ({jobs.length})</span>
        </button>
      </div>

      {/* ── Details Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 cols): Tab Content */}
        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'posts' ? (
            /* ── Embedded Public Company Feed (Phase 3 Feature B) ── */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold font-heading text-text-primary flex items-center gap-2">
                  <Radio className="w-4 h-4 text-brand-mint" />
                  <span>Posts from {business.name}</span>
                </h3>
                {isMyBusiness && (
                  <button
                    type="button"
                    onClick={handleOpenCreate}
                    className="text-xs font-semibold text-brand-mint hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Publish Post</span>
                  </button>
                )}
              </div>

              {feedLoading ? (
                Array.from({ length: 2 }).map((_, i) => (
                  <PostCardSkeleton key={i} />
                ))
              ) : feedError ? (
                <EmptyState
                  icon={AlertCircle}
                  title="Couldn't load company feed"
                  description="We were unable to load posts for this business. Please try again."
                  action={() => refetchFeed()}
                  actionLabel="Try again"
                />
              ) : feedPosts.length === 0 ? (
                <div className="p-12 rounded-3xl bg-surface-card border border-border text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-surface-elevated border border-border flex items-center justify-center mx-auto text-text-muted">
                    <MessageSquare className="w-6 h-6 text-brand-mint" />
                  </div>
                  <h4 className="text-sm font-bold text-text-primary">No posts published yet</h4>
                  <p className="text-xs text-text-muted max-w-sm mx-auto leading-relaxed">
                    {business.name} has not published any public Community updates yet. Follow to receive notifications when new updates arrive.
                  </p>
                  {!isFollowing && !isMyBusiness && (
                    <button
                      type="button"
                      onClick={handleToggleFollow}
                      disabled={isFollowPending}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-mint text-brand-navy text-xs font-bold hover:opacity-90 transition-all cursor-pointer shadow-sm shadow-brand-mint/20 mt-2"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Follow {business.name}</span>
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {feedPosts.map((post) => {
                    const postId = post._id || post.id;
                    const isCurrentActivePost = Boolean(
                      activeCommentPost &&
                        (activeCommentPost._id || activeCommentPost.id) === postId,
                    );
                    return (
                      <PostCard
                        key={postId}
                        post={post}
                        onOpenComments={setActiveCommentPost}
                        isActiveCommentPost={isCurrentActivePost}
                      />
                    );
                  })}

                  {/* Infinite pagination trigger / button */}
                  {hasNextPage && (
                    <div className="py-4 text-center">
                      <button
                        type="button"
                        onClick={() => fetchNextPage()}
                        disabled={isFetchingNextPage}
                        className="px-4 py-2 bg-surface-elevated hover:bg-surface-elevated/80 text-text-primary border border-border rounded-xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
                      >
                        {isFetchingNextPage ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Loading more...</span>
                          </>
                        ) : (
                          <span>Load more posts</span>
                        )}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            /* ── About & Jobs Tab Content ── */
            <div className="space-y-8">
              {/* About */}
              <div className="space-y-3">
                <h3 className="text-base font-bold font-heading text-text-primary">
                  About Organization
                </h3>
                <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">
                  {business.description ||
                    'Leading infrastructure and engineering services provider, collaborating with technical talent and executing critical projects.'}
                </p>
              </div>

              {/* Infrastructure Specializations */}
              {business.infrastructureSpecializations?.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-base font-bold font-heading text-text-primary">
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
                  <h3 className="text-base font-bold font-heading text-text-primary flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-brand-mint" />
                    <span>Open Infrastructure Jobs ({jobs.length})</span>
                  </h3>
                </div>

                {loadingJobs ? (
                  <div className="py-8 text-center text-text-muted text-xs">
                    Loading job listings...
                  </div>
                ) : jobs.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-surface-card border border-border text-center text-text-muted text-xs">
                    No active openings currently available from this business.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {jobs.map((job) => (
                      <div
                        key={job.id}
                        className="p-5 rounded-2xl bg-surface-card border border-border hover:border-brand-mint/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <h4 className="font-bold text-sm text-text-primary">
                            {job.title}
                          </h4>
                          <p className="text-xs text-text-muted flex items-center gap-2">
                            <span className="text-cyan-300 font-semibold">
                              {job.discipline}
                            </span>
                            <span>•</span>
                            <span>{job.workMode}</span>
                            <span>•</span>
                            <span>{job.location}</span>
                          </p>
                        </div>

                        <Link
                          to={`/jobs/${job.id}`}
                          className="flex items-center gap-1 px-4 py-2 rounded-xl bg-brand-mint text-brand-navy font-bold text-xs shadow-md shadow-brand-mint/15 self-end sm:self-center"
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
          )}
        </div>

        {/* Right Column: Contact & Information */}
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-surface-card border border-border space-y-4 text-xs">
            <h3 className="text-sm font-bold font-heading text-text-primary uppercase tracking-wider">
              Contact Information
            </h3>

            {business.businessEmail && (
              <div>
                <span className="text-text-muted block text-[11px]">Email</span>
                <span className="text-text-primary font-medium">
                  {business.businessEmail}
                </span>
              </div>
            )}

            {business.businessPhone && (
              <div>
                <span className="text-text-muted block text-[11px]">Phone</span>
                <span className="text-text-primary font-medium">
                  {business.businessPhone}
                </span>
              </div>
            )}

            {business.officeLocation && (
              <div>
                <span className="text-text-muted block text-[11px]">
                  Headquarters Address
                </span>
                <span className="text-text-primary font-medium leading-relaxed block">
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

      {/* ── Comment Drawer ── */}
      {activeCommentPost && (
        <Suspense fallback={null}>
          <CommentDrawer
            post={activeCommentPost}
            isOpen={Boolean(activeCommentPost)}
            onClose={() => setActiveCommentPost(null)}
          />
        </Suspense>
      )}

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
