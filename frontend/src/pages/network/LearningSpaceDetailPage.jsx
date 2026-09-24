// LearningSpaceDetailPage
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Megaphone,
  MessageSquare,
  FileText,
  Info,
  ShieldAlert,
  Lock,
  ArrowLeft,
} from 'lucide-react';
import { networkApi } from '../../services/networkApi';
import LearningSpaceHero from '../../components/network/LearningSpaceHero';
import SpaceAnnouncements from '../../components/network/SpaceAnnouncements';
import SpaceDiscussions from '../../components/network/SpaceDiscussions';
import SpaceResources from '../../components/network/SpaceResources';
import SpaceMembers from '../../components/network/SpaceMembers';

export default function LearningSpaceDetailPage() {
  const { slugOrId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'discussions'; // 'overview' | 'announcements' | 'discussions' | 'resources' | 'members'
  const queryClient = useQueryClient();

  const setTab = (tab) => {
    setSearchParams({ tab });
  };

  // Queries
  const spaceQuery = useQuery({
    queryKey: ['learning-space', slugOrId],
    queryFn: () => networkApi.getSpace(slugOrId),
  });

  const announcementsQuery = useQuery({
    queryKey: ['space-announcements', slugOrId],
    queryFn: () => networkApi.getSpaceAnnouncements(slugOrId),
    enabled: currentTab === 'announcements' || currentTab === 'overview',
  });

  const discussionsQuery = useQuery({
    queryKey: ['space-discussions', slugOrId],
    queryFn: () => networkApi.getSpaceDiscussions(slugOrId),
    enabled: currentTab === 'discussions' || currentTab === 'overview',
  });

  const resourcesQuery = useQuery({
    queryKey: ['space-resources', slugOrId],
    queryFn: () => networkApi.getSpaceResources(slugOrId),
    enabled: currentTab === 'resources' || currentTab === 'overview',
  });

  const membersQuery = useQuery({
    queryKey: ['space-members', slugOrId],
    queryFn: () => networkApi.getSpaceMembers(slugOrId),
    enabled: currentTab === 'members' || currentTab === 'overview',
  });

  // Mutations
  const joinMutation = useMutation({
    mutationFn: () => networkApi.joinSpace(slugOrId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learning-space', slugOrId] });
      queryClient.invalidateQueries({ queryKey: ['learning-spaces'] });
    },
  });

  const leaveMutation = useMutation({
    mutationFn: () => networkApi.leaveSpace(slugOrId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learning-space', slugOrId] });
      queryClient.invalidateQueries({ queryKey: ['learning-spaces'] });
    },
  });

  const postAnnouncementMutation = useMutation({
    mutationFn: (data) => networkApi.createSpaceAnnouncement(slugOrId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['space-announcements', slugOrId] });
    },
  });

  const postDiscussionMutation = useMutation({
    mutationFn: (data) => networkApi.createSpaceDiscussion(slugOrId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['space-discussions', slugOrId] });
    },
  });

  const postResourceMutation = useMutation({
    mutationFn: (data) => networkApi.createSpaceResource(slugOrId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['space-resources', slugOrId] });
    },
  });

  if (spaceQuery.isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 space-y-6">
        <div className="h-48 rounded-3xl bg-white/[0.02] border border-white/[0.04] animate-pulse" />
        <div className="h-64 rounded-3xl bg-white/[0.02] border border-white/[0.04] animate-pulse" />
      </div>
    );
  }

  if (spaceQuery.isError) {
    const status = spaceQuery.error?.response?.status;
    return (
      <div className="max-w-md mx-auto my-20 p-8 rounded-3xl bg-[#111115] border border-white/[0.08] text-center shadow-2xl">
        <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
          {status === 403 ? <Lock className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
        </div>
        <h2 className="font-heading font-bold text-xl text-white">
          {status === 403 ? 'Access Restricted' : 'Space Not Found'}
        </h2>
        <p className="text-xs text-text-muted mt-2 leading-relaxed">
          {status === 403
            ? 'This Learning Space is restricted to enrolled students and assigned faculty. Please contact your instructor for access.'
            : 'The requested Learning Space does not exist or has been archived.'}
        </p>
        <Link
          to="/network?tab=spaces"
          className="inline-flex items-center gap-1.5 mt-6 px-5 py-2.5 rounded-xl bg-brand-mint text-black font-semibold text-xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Spaces</span>
        </Link>
      </div>
    );
  }

  const space = spaceQuery.data;
  const access = space.access || {};
  const isMember = access.isMember;
  const userRole = access.userRole;
  const canPostAnnouncement = access.isAdmin || access.isTeacher || userRole === 'owner' || userRole === 'moderator';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Header */}
      <LearningSpaceHero
        space={space}
        isMember={isMember}
        userRole={userRole}
        onJoin={() => joinMutation.mutate()}
        onLeave={() => leaveMutation.mutate()}
        isJoining={joinMutation.isPending || leaveMutation.isPending}
      />

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-2xl bg-white/[0.03] border border-white/[0.06] mb-8 overflow-x-auto">
        {[
          { id: 'discussions', label: 'Discussions', icon: MessageSquare },
          { id: 'announcements', label: 'Announcements', icon: Megaphone },
          { id: 'resources', label: 'Resources', icon: FileText },
          { id: 'members', label: 'Cohort Members', icon: Users },
          { id: 'overview', label: 'Space Overview', icon: Info },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                active
                  ? 'bg-brand-mint text-black shadow-lg shadow-brand-mint/15 font-bold'
                  : 'text-text-muted hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      {currentTab === 'discussions' && (
        <SpaceDiscussions
          spaceIdOrSlug={slugOrId}
          discussions={discussionsQuery.data?.discussions || []}
          canPost={isMember}
          onPost={(data) => postDiscussionMutation.mutateAsync(data)}
          isPosting={postDiscussionMutation.isPending}
          isLoading={discussionsQuery.isLoading}
        />
      )}

      {currentTab === 'announcements' && (
        <SpaceAnnouncements
          announcements={announcementsQuery.data || []}
          canPost={canPostAnnouncement}
          onPost={(data) => postAnnouncementMutation.mutateAsync(data)}
          isPosting={postAnnouncementMutation.isPending}
          isLoading={announcementsQuery.isLoading}
        />
      )}

      {currentTab === 'resources' && (
        <SpaceResources
          resources={resourcesQuery.data || []}
          canPost={isMember}
          onPost={(data) => postResourceMutation.mutateAsync(data)}
          isPosting={postResourceMutation.isPending}
          isLoading={resourcesQuery.isLoading}
        />
      )}

      {currentTab === 'members' && (
        <SpaceMembers
          members={membersQuery.data?.members || []}
          teachers={space.teachers || []}
          isLoading={membersQuery.isLoading}
        />
      )}

      {currentTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="p-6 rounded-3xl bg-[#111115]/90 border border-white/[0.06]">
              <h3 className="font-heading font-bold text-base text-white mb-2">About this Learning Space</h3>
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed whitespace-pre-line">
                {space.description || 'Welcome to this cohort learning space. Here you can collaborate with peers, ask academic questions, access curated materials, and stay updated with faculty announcements.'}
              </p>
            </div>

            {/* Quick Discussions Snapshot */}
            <div className="p-6 rounded-3xl bg-[#111115]/90 border border-white/[0.06]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading font-bold text-base text-white">Recent Discussions</h3>
                <button
                  onClick={() => setTab('discussions')}
                  className="text-xs font-semibold text-brand-mint hover:underline"
                >
                  View All
                </button>
              </div>
              <SpaceDiscussions
                spaceIdOrSlug={slugOrId}
                discussions={(discussionsQuery.data?.discussions || []).slice(0, 3)}
                canPost={false}
                isLoading={discussionsQuery.isLoading}
              />
            </div>
          </div>

          <div className="space-y-6">
            {/* Guidelines / Rules */}
            <div className="p-6 rounded-3xl bg-[#111115]/90 border border-white/[0.06]">
              <h3 className="font-heading font-bold text-base text-white mb-3">Conduct Guidelines</h3>
              <ul className="space-y-2 text-xs text-text-muted">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-mint mt-1 shrink-0" />
                  <span>Be respectful and constructive in all forum interactions.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-mint mt-1 shrink-0" />
                  <span>Post questions in the appropriate category with clear context.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-mint mt-1 shrink-0" />
                  <span>Verify and cite shared resources and academic references.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
