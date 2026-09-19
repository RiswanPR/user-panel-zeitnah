import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, AlertCircle } from "lucide-react";
import communityService from "../../services/communityService";
import CommunityHero from "../../components/network/communities/CommunityHero";
import CommunityTabs from "../../components/network/communities/CommunityTabs";
import CommunityOverview from "../../components/network/communities/CommunityOverview";
import CommunityDiscussions from "../../components/network/communities/CommunityDiscussions";
import CommunityMembers from "../../components/network/communities/CommunityMembers";
import CommunityResources from "../../components/network/communities/CommunityResources";
import CommunityAnnouncements from "../../components/network/communities/CommunityAnnouncements";
import DiscussionComposerModal from "../../components/network/communities/DiscussionComposerModal";
import { CommunityHeroSkeleton } from "../../components/network/communities/CommunitySkeleton";

/**
 * CommunityDetailPage Component
 * Dedicated home and learning space for a community.
 */
export default function CommunityDetailPage() {
  const { slug } = useParams();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("overview");
  const [discussionType, setDiscussionType] = useState("all");
  const [discussionPage, setDiscussionPage] = useState(1);
  const [memberRole, setMemberRole] = useState("all");
  const [memberPage, setMemberPage] = useState(1);
  const [isComposerOpen, setIsComposerOpen] = useState(false);

  // 1. Main Community Details Query
  const {
    data: community,
    isLoading: isCommunityLoading,
    isError: isCommunityError,
    error: communityError,
    refetch: refetchCommunity,
  } = useQuery({
    queryKey: ["community", slug],
    queryFn: () => communityService.getCommunityBySlug(slug),
    staleTime: 1000 * 60 * 2,
  });

  // Update SEO Page Title
  useEffect(() => {
    if (community?.name) {
      document.title = `${community.name} — Learning Space | Zeitnah Network`;
    }
  }, [community?.name]);

  const communityId = community?.id;
  const isMember = community?.permissions?.isMember || false;
  const canModerate = community?.permissions?.canModerate || false;

  // 2. Discussions Query
  const {
    data: discussionsData,
    isLoading: isDiscussionsLoading,
    refetch: refetchDiscussions,
  } = useQuery({
    queryKey: ["community-discussions", communityId, discussionType, discussionPage],
    queryFn: () =>
      communityService.getDiscussions(communityId, {
        type: discussionType,
        page: discussionPage,
        limit: 15,
      }),
    enabled: Boolean(communityId) && (activeTab === "discussions" || activeTab === "overview"),
    staleTime: 1000 * 30,
  });

  // 3. Members Query
  const {
    data: membersData,
    isLoading: isMembersLoading,
  } = useQuery({
    queryKey: ["community-members", communityId, memberRole, memberPage],
    queryFn: () =>
      communityService.getCommunityMembers(communityId, {
        role: memberRole,
        page: memberPage,
        limit: 18,
      }),
    enabled: Boolean(communityId) && (activeTab === "members" || activeTab === "overview"),
    staleTime: 1000 * 60,
  });

  // 4. Resources Query
  const {
    data: resources = [],
    isLoading: isResourcesLoading,
    refetch: refetchResources,
  } = useQuery({
    queryKey: ["community-resources", communityId],
    queryFn: () => communityService.getResources(communityId),
    enabled: Boolean(communityId) && (activeTab === "resources" || activeTab === "overview"),
    staleTime: 1000 * 60 * 2,
  });

  // 5. Announcements Query
  const {
    data: announcements = [],
    isLoading: isAnnouncementsLoading,
    refetch: refetchAnnouncements,
  } = useQuery({
    queryKey: ["community-announcements", communityId],
    queryFn: () => communityService.getAnnouncements(communityId),
    enabled: Boolean(communityId) && (activeTab === "announcements" || activeTab === "overview"),
    staleTime: 1000 * 60 * 2,
  });

  // ── Mutations ──────────────────────────────────────────────

  // Join Community Mutation
  const joinMutation = useMutation({
    mutationFn: () => communityService.joinCommunity(communityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community", slug] });
      queryClient.invalidateQueries({ queryKey: ["community-members", communityId] });
      queryClient.invalidateQueries({ queryKey: ["network", "communities"] });
    },
  });

  // Leave Community Mutation
  const leaveMutation = useMutation({
    mutationFn: () => communityService.leaveCommunity(communityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community", slug] });
      queryClient.invalidateQueries({ queryKey: ["community-members", communityId] });
      queryClient.invalidateQueries({ queryKey: ["network", "communities"] });
    },
  });

  // Create Discussion Mutation
  const createDiscussionMutation = useMutation({
    mutationFn: (payload) => communityService.createDiscussion(communityId, payload),
    onSuccess: () => {
      refetchDiscussions();
      refetchCommunity();
      setActiveTab("discussions");
    },
  });

  // Create Resource Mutation
  const createResourceMutation = useMutation({
    mutationFn: (payload) => communityService.createResource(communityId, payload),
    onSuccess: () => {
      refetchResources();
    },
  });

  // Create Announcement Mutation
  const createAnnouncementMutation = useMutation({
    mutationFn: (payload) => communityService.createAnnouncement(communityId, payload),
    onSuccess: () => {
      refetchAnnouncements();
    },
  });

  // ── Loading & Error States ──────────────────────────────────

  if (isCommunityLoading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-32 rounded bg-white/[0.05] animate-pulse" />
        <CommunityHeroSkeleton />
      </div>
    );
  }

  if (isCommunityError || !community) {
    return (
      <div className="rounded-3xl border border-rose-500/20 bg-rose-500/[0.04] p-12 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-rose-400" />
        <h3 className="mt-4 text-lg font-heading font-bold text-white">
          Community not found or inaccessible
        </h3>
        <p className="mt-1 text-xs sm:text-sm text-text-muted max-w-md mx-auto">
          {communityError?.response?.data?.message ||
            "This learning space might be private, renamed, or no longer available."}
        </p>
        <Link
          to="/network?tab=communities"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-mint px-5 py-2.5 text-xs font-bold text-bg-base hover:bg-brand-mint/90 transition-all shadow-md focus-ring"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Communities</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Back Navigation Bar */}
      <div className="flex items-center justify-between">
        <Link
          to="/network?tab=communities"
          className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-1.5 text-xs font-semibold text-text-muted hover:text-white hover:bg-white/[0.06] hover:border-brand-mint/30 transition-all focus-ring"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>All Communities</span>
        </Link>
      </div>

      {/* Community Hero Header */}
      <CommunityHero
        community={community}
        onJoin={() => joinMutation.mutate()}
        onLeave={() => leaveMutation.mutate()}
        onOpenComposer={() => setIsComposerOpen(true)}
        isActionLoading={joinMutation.isPending || leaveMutation.isPending}
      />

      {/* Tabs Navigation */}
      <CommunityTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        discussionCount={community.discussionCount || 0}
        memberCount={community.memberCount || 0}
      />

      {/* Tab Panels */}
      <div>
        {activeTab === "overview" && (
          <CommunityOverview
            community={community}
            announcements={announcements}
            recentDiscussions={discussionsData?.data || []}
            resources={resources}
            membersPreview={membersData?.data || []}
            onTabChange={setActiveTab}
            onOpenComposer={() => setIsComposerOpen(true)}
          />
        )}

        {activeTab === "discussions" && (
          <CommunityDiscussions
            discussions={discussionsData?.data || []}
            total={discussionsData?.total || 0}
            page={discussionPage}
            totalPages={discussionsData?.totalPages || 1}
            communitySlug={slug}
            isMember={isMember}
            selectedType={discussionType}
            onTypeChange={(type) => {
              setDiscussionType(type);
              setDiscussionPage(1);
            }}
            onPageChange={setDiscussionPage}
            onOpenComposer={() => setIsComposerOpen(true)}
            isLoading={isDiscussionsLoading}
          />
        )}

        {activeTab === "members" && (
          <CommunityMembers
            members={membersData?.data || []}
            total={membersData?.total || 0}
            page={memberPage}
            totalPages={membersData?.totalPages || 1}
            selectedRole={memberRole}
            onRoleChange={(role) => {
              setMemberRole(role);
              setMemberPage(1);
            }}
            onPageChange={setMemberPage}
            isLoading={isMembersLoading}
          />
        )}

        {activeTab === "resources" && (
          <CommunityResources
            resources={resources}
            isMember={isMember}
            onCreateResource={(payload) => createResourceMutation.mutateAsync(payload)}
            isLoading={isResourcesLoading}
          />
        )}

        {activeTab === "announcements" && (
          <CommunityAnnouncements
            announcements={announcements}
            canModerate={canModerate}
            onCreateAnnouncement={(payload) => createAnnouncementMutation.mutateAsync(payload)}
            isLoading={isAnnouncementsLoading}
          />
        )}
      </div>

      {/* Start Topic Composer Modal */}
      <DiscussionComposerModal
        isOpen={isComposerOpen}
        onClose={() => setIsComposerOpen(false)}
        onSubmit={(payload) => createDiscussionMutation.mutateAsync(payload)}
        communityName={community.name}
      />
    </div>
  );
}
