import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Users,
  UserCheck,
  UserPlus,
  Search,
  Check,
  X,
  MessageSquare,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Briefcase,
  Clock,
  Compass,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import useDebounce from '../../hooks/useDebounce';
import { networkConnectionsService } from '../../services/networkConnectionsService';
import { networkApi } from '../../services/networkApi';
import { useToast } from '../ui/Toast';

/**
 * Format integer count with locale commas
 */
function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  return Number(num).toLocaleString();
}

/**
 * Derives user initials
 */
function getInitials(name) {
  if (!name) return 'ZU';
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

const VALID_TABS = ['people', 'connections', 'followers', 'following', 'requests'];

export default function NetworkConnections({ defaultTab = 'people' }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const rawSub = searchParams.get('sub') || searchParams.get('view') || searchParams.get('networkTab');
  // Active Tab: 'people' (default) | 'connections' | 'followers' | 'following' | 'requests'
  const subTab = VALID_TABS.includes(rawSub) ? rawSub : (defaultTab || 'people');

  const [requestsSubTab, setRequestsSubTab] = useState('incoming'); // 'incoming' | 'outgoing'
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [roleFilter, setRoleFilter] = useState('all');
  const [page, setPage] = useState(1);

  // Authoritative Network Stats for Tab Badges & Metric Cards
  const { data: statsData } = useQuery({
    queryKey: ['network-profile-stats', 'me'],
    queryFn: () => networkConnectionsService.getProfileStats('me'),
    staleTime: 1000 * 30,
  });

  // Authoritative Requests Count
  const { data: countsData } = useQuery({
    queryKey: ['network-connection-counts'],
    queryFn: () => networkConnectionsService.getConnectionCounts(),
    staleTime: 1000 * 30,
  });

  // 1. My Connections Query
  const connectionsQuery = useQuery({
    queryKey: ['network-connections-list', page, debouncedSearch],
    queryFn: () =>
      networkConnectionsService.getUserConnections('me', {
        page,
        limit: 12,
        q: debouncedSearch,
      }),
    enabled: subTab === 'connections',
    staleTime: 1000 * 20,
  });

  // 2. Followers Query
  const followersQuery = useQuery({
    queryKey: ['network-followers-list', page, debouncedSearch],
    queryFn: () =>
      networkConnectionsService.getUserFollowers('me', {
        page,
        limit: 12,
        q: debouncedSearch,
      }),
    enabled: subTab === 'followers',
    staleTime: 1000 * 20,
  });

  // 3. Following Query
  const followingQuery = useQuery({
    queryKey: ['network-following-list', page, debouncedSearch],
    queryFn: () =>
      networkConnectionsService.getUserFollowing('me', {
        page,
        limit: 12,
        q: debouncedSearch,
      }),
    enabled: subTab === 'following',
    staleTime: 1000 * 20,
  });

  // 4. Requests Query
  const requestsQuery = useQuery({
    queryKey: ['network-requests'],
    queryFn: () => networkApi.getPendingRequests(),
    enabled: subTab === 'requests',
    staleTime: 1000 * 15,
  });

  // 5. Discover People Query
  const peopleQuery = useQuery({
    queryKey: ['network-people', { q: debouncedSearch, role: roleFilter, page }],
    queryFn: () => networkApi.getPeople({ q: debouncedSearch, role: roleFilter, page }),
    enabled: subTab === 'people',
    staleTime: 1000 * 20,
  });

  // Mutations
  const invalidateAllNetwork = () => {
    queryClient.invalidateQueries({ queryKey: ['network-connections-list'] });
    queryClient.invalidateQueries({ queryKey: ['network-followers-list'] });
    queryClient.invalidateQueries({ queryKey: ['network-following-list'] });
    queryClient.invalidateQueries({ queryKey: ['network-requests'] });
    queryClient.invalidateQueries({ queryKey: ['network-people'] });
    queryClient.invalidateQueries({ queryKey: ['network-profile-stats'] });
    queryClient.invalidateQueries({ queryKey: ['network-connection-counts'] });
    queryClient.invalidateQueries({ queryKey: ['network-profile'] });
  };

  // Follow / Unfollow Mutation
  const followMutation = useMutation({
    mutationFn: async ({ targetId, follow }) => {
      if (follow) {
        return networkConnectionsService.followUser(targetId);
      } else {
        return networkConnectionsService.unfollowUser(targetId);
      }
    },
    onSuccess: (_data, { follow, name }) => {
      toast.success(follow ? 'Following' : 'Unfollowed', follow ? `Now following ${name || 'user'}.` : `Unfollowed ${name || 'user'}.`);
      invalidateAllNetwork();
    },
    onError: (err) => {
      toast.error('Action Failed', err?.response?.data?.message || 'Could not update follow state.');
    },
  });

  // Send Connection Request Mutation
  const sendRequestMutation = useMutation({
    mutationFn: (recipientId) => networkConnectionsService.connectUser(recipientId),
    onSuccess: () => {
      toast.success('Request Sent', 'Connection request sent successfully.');
      invalidateAllNetwork();
    },
    onError: (err) => {
      toast.error('Unable to Connect', err?.response?.data?.message || 'Could not send connection request.');
    },
  });

  // Accept Request Mutation
  const acceptRequestMutation = useMutation({
    mutationFn: (requestId) => networkConnectionsService.acceptRequest(requestId),
    onSuccess: () => {
      toast.success('Connection Accepted', 'You are now connected!');
      invalidateAllNetwork();
    },
    onError: (err) => {
      toast.error('Accept Failed', err?.response?.data?.message || 'Could not accept connection request.');
    },
  });

  // Reject / Decline Request Mutation
  const declineRequestMutation = useMutation({
    mutationFn: (requestId) => networkConnectionsService.declineRequest(requestId),
    onSuccess: () => {
      toast.info('Request Declined', 'Connection request removed.');
      invalidateAllNetwork();
    },
    onError: (err) => {
      toast.error('Decline Failed', err?.response?.data?.message || 'Could not decline request.');
    },
  });

  // Cancel Outgoing Request Mutation
  const cancelRequestMutation = useMutation({
    mutationFn: (requestId) => networkConnectionsService.cancelRequest(requestId),
    onSuccess: () => {
      toast.info('Request Cancelled', 'Connection request cancelled.');
      invalidateAllNetwork();
    },
    onError: (err) => {
      toast.error('Cancel Failed', err?.response?.data?.message || 'Could not cancel request.');
    },
  });

  // Remove Connection Mutation
  const removeConnectionMutation = useMutation({
    mutationFn: (connectionIdOrUserId) => networkConnectionsService.removeConnection(connectionIdOrUserId),
    onSuccess: () => {
      toast.info('Connection Removed', 'Connection removed successfully.');
      invalidateAllNetwork();
    },
    onError: (err) => {
      toast.error('Remove Failed', err?.response?.data?.message || 'Could not remove connection.');
    },
  });

  const connectionsCount = statsData?.connections ?? countsData?.connectionsCount ?? 0;
  const followersCount = statsData?.followers ?? 0;
  const followingCount = statsData?.following ?? 0;
  const incomingRequestsCount = countsData?.incomingRequestsCount ?? requestsQuery.data?.incoming?.length ?? 0;
  const outgoingRequestsCount = countsData?.outgoingRequestsCount ?? requestsQuery.data?.outgoing?.length ?? 0;

  const handleTabChange = (newTab) => {
    setSearchQuery('');
    setPage(1);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (newTab === 'people') {
        next.delete('sub');
        next.delete('networkTab');
        next.delete('view');
      } else {
        next.set('sub', newTab);
      }
      return next;
    }, { replace: true });
  };

  return (
    <div className="space-y-8">
      {/* ── Section 10: "Your Network" Statistics Strip ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted">
              Your Network
            </h2>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-mint/10 text-brand-mint border border-brand-mint/20">
              <Sparkles className="w-2.5 h-2.5" />
              Live Metrics
            </span>
          </div>
          <span className="text-[11px] text-text-faint hidden sm:inline-block">
            Click any metric to manage connections & requests
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {/* 1. Connections Metric Card */}
          <button
            type="button"
            onClick={() => handleTabChange('connections')}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer group ${
              subTab === 'connections'
                ? 'bg-brand-mint/10 border-brand-mint/50 shadow-lg shadow-brand-mint/10'
                : 'bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.05] hover:border-white/[0.15]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-muted group-hover:text-white transition-colors">
                Connections
              </span>
              <div className={`p-2 rounded-xl transition-colors ${subTab === 'connections' ? 'bg-brand-mint/20 text-brand-mint' : 'bg-white/[0.04] text-text-muted'}`}>
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-heading font-black text-white">
              {formatNumber(connectionsCount)}
            </p>
            <p className="text-[10px] text-text-faint mt-0.5">Verified peer bonds</p>
          </button>

          {/* 2. Followers Metric Card */}
          <button
            type="button"
            onClick={() => handleTabChange('followers')}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer group ${
              subTab === 'followers'
                ? 'bg-brand-mint/10 border-brand-mint/50 shadow-lg shadow-brand-mint/10'
                : 'bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.05] hover:border-white/[0.15]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-muted group-hover:text-white transition-colors">
                Followers
              </span>
              <div className={`p-2 rounded-xl transition-colors ${subTab === 'followers' ? 'bg-brand-mint/20 text-brand-mint' : 'bg-white/[0.04] text-text-muted'}`}>
                <Users className="w-4 h-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-heading font-black text-white">
              {formatNumber(followersCount)}
            </p>
            <p className="text-[10px] text-text-faint mt-0.5">Learners following you</p>
          </button>

          {/* 3. Following Metric Card */}
          <button
            type="button"
            onClick={() => handleTabChange('following')}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer group ${
              subTab === 'following'
                ? 'bg-brand-mint/10 border-brand-mint/50 shadow-lg shadow-brand-mint/10'
                : 'bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.05] hover:border-white/[0.15]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-muted group-hover:text-white transition-colors">
                Following
              </span>
              <div className={`p-2 rounded-xl transition-colors ${subTab === 'following' ? 'bg-brand-mint/20 text-brand-mint' : 'bg-white/[0.04] text-text-muted'}`}>
                <UserPlus className="w-4 h-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-heading font-black text-white">
              {formatNumber(followingCount)}
            </p>
            <p className="text-[10px] text-text-faint mt-0.5">Learners you follow</p>
          </button>

          {/* 4. Requests Metric Card */}
          <button
            type="button"
            onClick={() => handleTabChange('requests')}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer group ${
              subTab === 'requests'
                ? 'bg-brand-mint/10 border-brand-mint/50 shadow-lg shadow-brand-mint/10'
                : 'bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.05] hover:border-white/[0.15]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-muted group-hover:text-white transition-colors">
                Requests
              </span>
              <div className={`p-2 rounded-xl transition-colors ${subTab === 'requests' ? 'bg-brand-mint/20 text-brand-mint' : incomingRequestsCount > 0 ? 'bg-brand-mint/15 text-brand-mint' : 'bg-white/[0.04] text-text-muted'}`}>
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <p className="text-2xl font-heading font-black text-white">
                {formatNumber(incomingRequestsCount)}
              </p>
              {outgoingRequestsCount > 0 && (
                <span className="text-[10px] font-mono text-text-muted">
                  ({outgoingRequestsCount} sent)
                </span>
              )}
            </div>
            <p className="text-[10px] text-text-faint mt-0.5">
              {incomingRequestsCount > 0 ? 'Awaiting your review' : 'No pending requests'}
            </p>
          </button>
        </div>
      </div>

      {/* ── Sub-tab Navigation Strip ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-x-auto">
          {[
            { id: 'people', label: 'Discover People', icon: Compass },
            { id: 'connections', label: 'Connections', count: connectionsCount, icon: UserCheck },
            { id: 'followers', label: 'Followers', count: followersCount, icon: Users },
            { id: 'following', label: 'Following', count: followingCount, icon: UserPlus },
            { id: 'requests', label: 'Requests', count: incomingRequestsCount, icon: Clock, badgeAccent: incomingRequestsCount > 0 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = subTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer focus-ring ${
                  isActive
                    ? 'bg-brand-mint text-black font-bold shadow-md shadow-brand-mint/15'
                    : 'text-text-muted hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-black/15 text-black'
                        : tab.badgeAccent
                        ? 'bg-brand-mint text-black font-bold'
                        : 'bg-white/[0.08] text-text-muted'
                    }`}
                  >
                    {formatNumber(tab.count)}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Role Filter for Discover People Tab */}
        {subTab === 'people' && (
          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            {[
              { id: 'all', label: 'All Roles' },
              { id: 'student', label: 'Students' },
              { id: 'teacher', label: 'Instructors' },
            ].map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  setRoleFilter(r.id);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  roleFilter === r.id
                    ? 'bg-white/10 text-white border border-white/10 shadow-sm'
                    : 'text-text-muted hover:text-white hover:bg-white/[0.03]'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Search Bar (except for requests tab) ── */}
      {subTab !== 'requests' && (
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder={
              subTab === 'connections'
                ? 'Search connections by name, handle, or course...'
                : subTab === 'followers'
                ? 'Search followers...'
                : subTab === 'following'
                ? 'Search people you follow...'
                : 'Search students by name, course, skills, or handle...'
            }
            className="w-full pl-10 pr-12 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] focus:border-brand-mint/40 text-xs text-white placeholder-text-muted focus:outline-none transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setPage(1);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted hover:text-white px-1.5 py-0.5 rounded cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* ── 1. DISCOVER PEOPLE TAB (MAIN) ── */}
      {subTab === 'people' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-heading font-bold text-white">
                Recommended & Community Learners
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                Connect with peers across cohorts, exchange insights, and build your Zeitnah network.
              </p>
            </div>
            {peopleQuery.data?.total !== undefined && (
              <span className="text-xs font-mono text-text-faint">
                {peopleQuery.data.total} {peopleQuery.data.total === 1 ? 'person' : 'people'}
              </span>
            )}
          </div>

          {peopleQuery.isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-48 rounded-2xl bg-white/[0.02] border border-white/[0.04] animate-pulse" />
              ))}
            </div>
          ) : peopleQuery.isError ? (
            <div className="p-8 rounded-2xl bg-danger/5 border border-danger/20 text-center">
              <AlertCircle className="w-8 h-8 text-danger mx-auto mb-2" />
              <p className="text-sm font-bold text-white">Failed to load student directory</p>
              <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
                Could not retrieve learners at this time. Please check your connection and try again.
              </p>
              <button
                type="button"
                onClick={() => peopleQuery.refetch()}
                className="btn-secondary mt-3 text-xs py-2 px-4 cursor-pointer inline-flex items-center gap-1.5"
              >
                <span>Try Again</span>
              </button>
            </div>
          ) : (peopleQuery.data?.people || []).length === 0 ? (
            <div className="p-16 rounded-3xl bg-[#111115]/60 border border-white/[0.06] text-center max-w-lg mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-4 text-text-faint">
                <Compass className="w-7 h-7" />
              </div>
              <h3 className="font-heading font-bold text-lg text-white">
                {debouncedSearch ? 'No people found' : 'No discoverable learners yet'}
              </h3>
              <p className="text-xs text-text-muted mt-1 leading-relaxed">
                {debouncedSearch
                  ? 'No people found matching your query. Try searching with a different name, skill, or course.'
                  : 'Check back soon as more learners join the Zeitnah ecosystem.'}
              </p>
              {debouncedSearch && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="mt-4 px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-bold text-white transition-colors cursor-pointer"
                >
                  Clear Search Filter
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(peopleQuery.data?.people || []).map((person) => {
                const identifier = person.username || person.id || person._id || '';
                const profileLink = `/network/profile/${encodeURIComponent(identifier)}`;
                const isFollowing = Boolean(person.isFollowing);

                return (
                  <div
                    key={person._id || person.id}
                    className="p-5 rounded-2xl bg-[#111115]/80 hover:bg-[#15151c] border border-white/[0.08] hover:border-brand-mint/30 transition-all flex flex-col justify-between gap-4 shadow-lg group"
                  >
                    {/* Top Identity Block */}
                    <div className="flex items-start gap-3.5 min-w-0">
                      <Link to={profileLink} className="relative shrink-0 block focus-ring rounded-2xl">
                        <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-brand-mint font-heading font-bold text-sm overflow-hidden group-hover:border-brand-mint/40 transition-colors">
                          {person.avatar ? (
                            <img src={person.avatar} alt={person.name} className="w-full h-full object-cover" />
                          ) : (
                            <span>{getInitials(person.name)}</span>
                          )}
                        </div>
                        {person.isVerified && (
                          <span
                            className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-mint text-bg-base shadow-sm"
                            title="Verified Learner"
                          >
                            <ShieldCheck className="h-3 w-3" />
                          </span>
                        )}
                      </Link>

                      <div className="min-w-0 flex-1">
                        <Link
                          to={profileLink}
                          className="font-heading font-bold text-sm text-white hover:text-brand-mint transition-colors truncate block focus-ring rounded"
                        >
                          {person.name}
                        </Link>
                        {person.username && (
                          <p className="text-[11px] font-mono text-text-muted truncate">
                            @{person.username}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-white/[0.06] text-white">
                            {person.role || 'Student'}
                          </span>
                          {person.course && (
                            <span className="px-2 py-0.5 rounded text-[9px] font-medium bg-brand-mint/10 text-brand-mint border border-brand-mint/20 truncate max-w-[140px] flex items-center gap-1">
                              <GraduationCap className="w-2.5 h-2.5 shrink-0" />
                              <span className="truncate">{person.course}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Headline / Bio */}
                    {person.headline && (
                      <p className="text-xs text-text-muted/90 line-clamp-2 leading-relaxed">
                        {person.headline}
                      </p>
                    )}

                    {/* Skills / Interests Tags */}
                    {Array.isArray(person.skills) && person.skills.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1">
                        {person.skills.slice(0, 3).map((skill, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-white/[0.03] text-text-secondary border border-white/[0.06]"
                          >
                            {skill}
                          </span>
                        ))}
                        {person.skills.length > 3 && (
                          <span className="text-[10px] text-text-faint self-center">
                            +{person.skills.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Action Row */}
                    <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/[0.06]">
                      <Link
                        to={profileLink}
                        className="px-2.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors focus-ring"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-text-muted" />
                        <span>View Profile</span>
                      </Link>

                      <div className="flex items-center gap-1.5">
                        {/* Connection State Action */}
                        {person.connectionStatus === 'connected' ? (
                          <span className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-300 text-[11px] font-semibold flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            <span>Connected</span>
                          </span>
                        ) : person.connectionStatus === 'pending_sent' || person.connectionStatus === 'pending' ? (
                          <span className="px-2.5 py-1.5 rounded-xl bg-white/[0.05] text-text-muted text-[11px] font-semibold flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>Requested</span>
                          </span>
                        ) : person.connectionStatus === 'pending_received' ? (
                          <button
                            type="button"
                            onClick={() => acceptRequestMutation.mutate(person.connectionId)}
                            disabled={acceptRequestMutation.isPending}
                            className="px-3 py-1.5 rounded-xl bg-brand-mint text-black font-bold text-xs cursor-pointer hover:bg-brand-mint/90 transition-colors"
                          >
                            Accept
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => sendRequestMutation.mutate(person._id || person.id)}
                            disabled={sendRequestMutation.isPending}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-brand-mint/15 hover:bg-brand-mint text-brand-mint hover:text-black font-bold text-xs transition-colors cursor-pointer"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Connect</span>
                          </button>
                        )}

                        {/* Follow / Following Toggle */}
                        <button
                          type="button"
                          onClick={() =>
                            followMutation.mutate({
                              targetId: person._id || person.id,
                              follow: !isFollowing,
                              name: person.name,
                            })
                          }
                          disabled={followMutation.isPending}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                            isFollowing
                              ? 'bg-white/[0.06] hover:bg-rose-500/15 text-text-muted hover:text-rose-300 border border-white/10'
                              : 'bg-white/[0.04] hover:bg-white/[0.08] text-white'
                          }`}
                          title={isFollowing ? 'Unfollow' : 'Follow'}
                        >
                          {isFollowing ? 'Following' : 'Follow'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {(peopleQuery.data?.totalPages || 1) > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
              <span className="text-xs text-text-muted font-mono">
                Page {page} of {peopleQuery.data?.totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/[0.04] hover:bg-white/[0.08] text-white disabled:opacity-40 cursor-pointer"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= peopleQuery.data?.totalPages}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/[0.04] hover:bg-white/[0.08] text-white disabled:opacity-40 cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 2. CONNECTIONS TAB ── */}
      {subTab === 'connections' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-heading font-bold text-white">Your Peer Connections</h3>
              <p className="text-xs text-text-muted mt-0.5">
                Mutual connections with fellow learners and instructors on Zeitnah.
              </p>
            </div>
            {connectionsCount > 0 && (
              <span className="text-xs font-mono text-text-faint">
                {connectionsCount} {connectionsCount === 1 ? 'connection' : 'connections'}
              </span>
            )}
          </div>

          {connectionsQuery.isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-36 rounded-2xl bg-white/[0.02] border border-white/[0.04] animate-pulse" />
              ))}
            </div>
          ) : connectionsQuery.isError ? (
            <div className="p-8 rounded-2xl bg-danger/5 border border-danger/20 text-center">
              <AlertCircle className="w-8 h-8 text-danger mx-auto mb-2" />
              <p className="text-sm font-bold text-white">Failed to load connections</p>
              <button
                type="button"
                onClick={() => connectionsQuery.refetch()}
                className="btn-secondary mt-3 text-xs py-2 px-4 cursor-pointer"
              >
                Try Again
              </button>
            </div>
          ) : (connectionsQuery.data?.data || []).length === 0 ? (
            <div className="p-16 rounded-3xl bg-[#111115]/60 border border-white/[0.06] text-center max-w-lg mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-4 text-text-faint">
                <UserCheck className="w-7 h-7" />
              </div>
              <h3 className="font-heading font-bold text-lg text-white">
                {debouncedSearch ? 'No matching connections' : 'No connections yet'}
              </h3>
              <p className="text-xs text-text-muted mt-1 leading-relaxed">
                {debouncedSearch
                  ? 'No connections found matching your search. Try another name or handle.'
                  : 'Connect with classmates, peers, and mentors to expand your learning network.'}
              </p>
              {!debouncedSearch && (
                <button
                  type="button"
                  onClick={() => handleTabChange('people')}
                  className="btn-primary mt-4 text-xs py-2.5 px-5 inline-flex items-center gap-2 cursor-pointer"
                >
                  <Compass className="w-4 h-4" />
                  <span>Discover People</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(connectionsQuery.data?.data || []).map((conn) => {
                const identifier = conn.username || conn.id || conn._id || '';
                const profileLink = `/network/profile/${encodeURIComponent(identifier)}`;

                return (
                  <div
                    key={conn.id || conn._id}
                    className="p-5 rounded-2xl bg-[#111115]/80 hover:bg-[#15151c] border border-white/[0.08] hover:border-brand-mint/30 transition-all flex flex-col justify-between gap-3 shadow-lg"
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <Link to={profileLink} className="relative shrink-0 block focus-ring rounded-2xl">
                        <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-brand-mint font-heading font-bold text-sm overflow-hidden">
                          {conn.avatar ? (
                            <img src={conn.avatar} alt={conn.name} className="w-full h-full object-cover" />
                          ) : (
                            <span>{getInitials(conn.name)}</span>
                          )}
                        </div>
                        {conn.isVerified && (
                          <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-mint text-bg-base shadow-sm">
                            <ShieldCheck className="h-3 w-3" />
                          </span>
                        )}
                      </Link>

                      <div className="min-w-0 flex-1">
                        <Link
                          to={profileLink}
                          className="font-heading font-bold text-sm text-white hover:text-brand-mint transition-colors truncate block focus-ring rounded"
                        >
                          {conn.name}
                        </Link>
                        {conn.username && (
                          <p className="text-xs font-mono text-brand-mint/90 truncate">@{conn.username}</p>
                        )}
                        {conn.headline ? (
                          <p className="text-xs text-text-muted/80 truncate mt-1">{conn.headline}</p>
                        ) : conn.currentRole ? (
                          <p className="text-xs text-text-muted/70 truncate mt-1 flex items-center gap-1">
                            <Briefcase className="w-3 h-3 shrink-0" />
                            <span>{conn.currentRole}</span>
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-white/[0.04] gap-2">
                      <div className="flex items-center gap-1.5">
                        <Link
                          to={profileLink}
                          className="px-2.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors focus-ring"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-text-muted" />
                          <span>Profile</span>
                        </Link>
                        <button
                          type="button"
                          onClick={() => navigate('/community/messages')}
                          className="px-2.5 py-1.5 rounded-xl bg-brand-mint/10 hover:bg-brand-mint/20 text-brand-mint text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Message</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Remove connection with ${conn.name}?`)) {
                            removeConnectionMutation.mutate(conn.id || conn._id);
                          }
                        }}
                        disabled={removeConnectionMutation.isPending}
                        className="p-1.5 rounded-xl text-text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Remove connection"
                        aria-label="Remove connection"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {(connectionsQuery.data?.totalPages || 1) > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
              <span className="text-xs text-text-muted font-mono">
                Page {page} of {connectionsQuery.data?.totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/[0.04] hover:bg-white/[0.08] text-white disabled:opacity-40 cursor-pointer"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!connectionsQuery.data?.hasNextPage}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/[0.04] hover:bg-white/[0.08] text-white disabled:opacity-40 cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 3. FOLLOWERS TAB ── */}
      {subTab === 'followers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-heading font-bold text-white">Your Followers</h3>
              <p className="text-xs text-text-muted mt-0.5">
                Learners and peers following your learning progress and updates.
              </p>
            </div>
            {followersCount > 0 && (
              <span className="text-xs font-mono text-text-faint">
                {followersCount} {followersCount === 1 ? 'follower' : 'followers'}
              </span>
            )}
          </div>

          {followersQuery.isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-36 rounded-2xl bg-white/[0.02] border border-white/[0.04] animate-pulse" />
              ))}
            </div>
          ) : followersQuery.isError ? (
            <div className="p-8 rounded-2xl bg-danger/5 border border-danger/20 text-center">
              <AlertCircle className="w-8 h-8 text-danger mx-auto mb-2" />
              <p className="text-sm font-bold text-white">Failed to load followers</p>
              <button
                type="button"
                onClick={() => followersQuery.refetch()}
                className="btn-secondary mt-3 text-xs py-2 px-4 cursor-pointer"
              >
                Try Again
              </button>
            </div>
          ) : (followersQuery.data?.data || []).length === 0 ? (
            <div className="p-16 rounded-3xl bg-[#111115]/60 border border-white/[0.06] text-center max-w-lg mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-4 text-text-faint">
                <Users className="w-7 h-7" />
              </div>
              <h3 className="font-heading font-bold text-lg text-white">
                {debouncedSearch ? 'No matching followers' : 'No followers yet'}
              </h3>
              <p className="text-xs text-text-muted mt-1 leading-relaxed">
                {debouncedSearch
                  ? 'No followers found matching your search.'
                  : 'When other students and mentors follow your learning journey, they will appear here.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(followersQuery.data?.data || []).map((user) => {
                const identifier = user.username || user.id || user._id || '';
                const profileLink = `/network/profile/${encodeURIComponent(identifier)}`;
                const isFollowing = Boolean(user.isFollowing);

                return (
                  <div
                    key={user.id || user._id}
                    className="p-5 rounded-2xl bg-[#111115]/80 hover:bg-[#15151c] border border-white/[0.08] hover:border-brand-mint/30 transition-all flex flex-col justify-between gap-3 shadow-lg"
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <Link to={profileLink} className="relative shrink-0 block focus-ring rounded-2xl">
                        <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-brand-mint font-heading font-bold text-sm overflow-hidden">
                          {user.avatar ? (
                            <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                          ) : (
                            <span>{getInitials(user.name)}</span>
                          )}
                        </div>
                        {user.isVerified && (
                          <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-mint text-bg-base shadow-sm">
                            <ShieldCheck className="h-3 w-3" />
                          </span>
                        )}
                      </Link>

                      <div className="min-w-0 flex-1">
                        <Link
                          to={profileLink}
                          className="font-heading font-bold text-sm text-white hover:text-brand-mint transition-colors truncate block focus-ring rounded"
                        >
                          {user.name}
                        </Link>
                        {user.username && (
                          <p className="text-xs font-mono text-brand-mint/90 truncate">@{user.username}</p>
                        )}
                        {user.headline ? (
                          <p className="text-xs text-text-muted/80 truncate mt-1">{user.headline}</p>
                        ) : user.currentRole ? (
                          <p className="text-xs text-text-muted/70 truncate mt-1">{user.currentRole}</p>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-white/[0.04] gap-2">
                      <Link
                        to={profileLink}
                        className="px-2.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors focus-ring"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-text-muted" />
                        <span>Profile</span>
                      </Link>

                      <div className="flex items-center gap-1.5">
                        {user.connectionStatus === 'connected' ? (
                          <span className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-300 text-[10px] font-bold">
                            Connected
                          </span>
                        ) : user.connectionStatus === 'pending' ? (
                          <span className="px-2.5 py-1.5 rounded-xl bg-white/[0.05] text-text-muted text-[10px] font-semibold">
                            Pending
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => sendRequestMutation.mutate(user.id || user._id)}
                            disabled={sendRequestMutation.isPending}
                            className="px-2.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white text-[11px] font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <UserCheck className="w-3.5 h-3.5 text-brand-mint" />
                            <span>Connect</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            followMutation.mutate({
                              targetId: user.id || user._id,
                              follow: !isFollowing,
                              name: user.name,
                            })
                          }
                          disabled={followMutation.isPending}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            isFollowing
                              ? 'bg-white/[0.08] hover:bg-rose-500/15 text-white hover:text-rose-300 border border-white/10'
                              : 'bg-brand-mint text-black hover:bg-brand-mint/90'
                          }`}
                        >
                          {isFollowing ? 'Following' : 'Follow Back'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {(followersQuery.data?.totalPages || 1) > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
              <span className="text-xs text-text-muted font-mono">
                Page {page} of {followersQuery.data?.totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/[0.04] hover:bg-white/[0.08] text-white disabled:opacity-40 cursor-pointer"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!followersQuery.data?.hasNextPage}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/[0.04] hover:bg-white/[0.08] text-white disabled:opacity-40 cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 4. FOLLOWING TAB ── */}
      {subTab === 'following' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-heading font-bold text-white">People You Follow</h3>
              <p className="text-xs text-text-muted mt-0.5">
                Stay updated on activities and projects from learners and mentors you follow.
              </p>
            </div>
            {followingCount > 0 && (
              <span className="text-xs font-mono text-text-faint">
                {followingCount} {followingCount === 1 ? 'person' : 'people'}
              </span>
            )}
          </div>

          {followingQuery.isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-36 rounded-2xl bg-white/[0.02] border border-white/[0.04] animate-pulse" />
              ))}
            </div>
          ) : followingQuery.isError ? (
            <div className="p-8 rounded-2xl bg-danger/5 border border-danger/20 text-center">
              <AlertCircle className="w-8 h-8 text-danger mx-auto mb-2" />
              <p className="text-sm font-bold text-white">Failed to load following list</p>
              <button
                type="button"
                onClick={() => followingQuery.refetch()}
                className="btn-secondary mt-3 text-xs py-2 px-4 cursor-pointer"
              >
                Try Again
              </button>
            </div>
          ) : (followingQuery.data?.data || []).length === 0 ? (
            <div className="p-16 rounded-3xl bg-[#111115]/60 border border-white/[0.06] text-center max-w-lg mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-4 text-text-faint">
                <UserPlus className="w-7 h-7" />
              </div>
              <h3 className="font-heading font-bold text-lg text-white">
                {debouncedSearch ? 'No matching users' : 'You are not following anyone yet'}
              </h3>
              <p className="text-xs text-text-muted mt-1 leading-relaxed">
                {debouncedSearch
                  ? 'No users found matching your search query.'
                  : 'Follow classmates, instructors, and community members to see their learning activity.'}
              </p>
              {!debouncedSearch && (
                <button
                  type="button"
                  onClick={() => handleTabChange('people')}
                  className="btn-primary mt-4 text-xs py-2.5 px-5 inline-flex items-center gap-2 cursor-pointer"
                >
                  <Compass className="w-4 h-4" />
                  <span>Explore Directory</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(followingQuery.data?.data || []).map((user) => {
                const identifier = user.username || user.id || user._id || '';
                const profileLink = `/network/profile/${encodeURIComponent(identifier)}`;

                return (
                  <div
                    key={user.id || user._id}
                    className="p-5 rounded-2xl bg-[#111115]/80 hover:bg-[#15151c] border border-white/[0.08] hover:border-brand-mint/30 transition-all flex flex-col justify-between gap-3 shadow-lg"
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <Link to={profileLink} className="relative shrink-0 block focus-ring rounded-2xl">
                        <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-brand-mint font-heading font-bold text-sm overflow-hidden">
                          {user.avatar ? (
                            <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                          ) : (
                            <span>{getInitials(user.name)}</span>
                          )}
                        </div>
                        {user.isVerified && (
                          <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-mint text-bg-base shadow-sm">
                            <ShieldCheck className="h-3 w-3" />
                          </span>
                        )}
                      </Link>

                      <div className="min-w-0 flex-1">
                        <Link
                          to={profileLink}
                          className="font-heading font-bold text-sm text-white hover:text-brand-mint transition-colors truncate block focus-ring rounded"
                        >
                          {user.name}
                        </Link>
                        {user.username && (
                          <p className="text-xs font-mono text-brand-mint/90 truncate">@{user.username}</p>
                        )}
                        {user.headline ? (
                          <p className="text-xs text-text-muted/80 truncate mt-1">{user.headline}</p>
                        ) : user.currentRole ? (
                          <p className="text-xs text-text-muted/70 truncate mt-1">{user.currentRole}</p>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-white/[0.04] gap-2">
                      <Link
                        to={profileLink}
                        className="px-2.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors focus-ring"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-text-muted" />
                        <span>Profile</span>
                      </Link>

                      <div className="flex items-center gap-1.5">
                        {user.connectionStatus === 'connected' ? (
                          <span className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-300 text-[10px] font-bold">
                            Connected
                          </span>
                        ) : user.connectionStatus === 'pending' ? (
                          <span className="px-2.5 py-1.5 rounded-xl bg-white/[0.05] text-text-muted text-[10px] font-semibold">
                            Pending
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => sendRequestMutation.mutate(user.id || user._id)}
                            disabled={sendRequestMutation.isPending}
                            className="px-2.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white text-[11px] font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <UserCheck className="w-3.5 h-3.5 text-brand-mint" />
                            <span>Connect</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            followMutation.mutate({
                              targetId: user.id || user._id,
                              follow: false,
                              name: user.name,
                            })
                          }
                          disabled={followMutation.isPending}
                          className="px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-rose-500/15 text-white hover:text-rose-300 border border-white/10 text-xs font-bold transition-all cursor-pointer"
                          title="Unfollow"
                        >
                          Unfollow
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {(followingQuery.data?.totalPages || 1) > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
              <span className="text-xs text-text-muted font-mono">
                Page {page} of {followingQuery.data?.totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/[0.04] hover:bg-white/[0.08] text-white disabled:opacity-40 cursor-pointer"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!followingQuery.data?.hasNextPage}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/[0.04] hover:bg-white/[0.08] text-white disabled:opacity-40 cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 5. CONNECTION REQUESTS TAB ── */}
      {subTab === 'requests' && (
        <div className="space-y-6">
          {/* Sub-selector for Incoming vs Outgoing */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setRequestsSubTab('incoming')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                requestsSubTab === 'incoming'
                  ? 'bg-brand-mint text-black shadow-md shadow-brand-mint/15'
                  : 'bg-white/[0.03] text-text-muted hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              <span>Incoming Requests</span>
              <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] bg-black/15 font-mono">
                {incomingRequestsCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setRequestsSubTab('outgoing')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                requestsSubTab === 'outgoing'
                  ? 'bg-brand-mint text-black shadow-md shadow-brand-mint/15'
                  : 'bg-white/[0.03] text-text-muted hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              <span>Sent Requests</span>
              <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] bg-white/[0.08] font-mono">
                {outgoingRequestsCount}
              </span>
            </button>
          </div>

          {/* Incoming Requests */}
          {requestsSubTab === 'incoming' && (
            <div>
              {requestsQuery.isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-28 rounded-2xl bg-white/[0.02] border border-white/[0.04] animate-pulse" />
                  ))}
                </div>
              ) : (requestsQuery.data?.incoming || []).length === 0 ? (
                <div className="p-12 rounded-2xl bg-[#111115]/60 border border-white/[0.06] text-center">
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-3 text-text-faint">
                    <UserCheck className="w-6 h-6" />
                  </div>
                  <h4 className="font-heading font-bold text-sm text-white">No pending incoming requests</h4>
                  <p className="text-xs text-text-muted mt-1">
                    When someone sends you a connection request, you'll be able to accept or decline it here.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(requestsQuery.data?.incoming || []).map((req) => {
                    const requester = req.requesterId || {};
                    const identifier = requester.username || requester.id || requester._id || '';
                    const profileLink = `/network/profile/${encodeURIComponent(identifier)}`;

                    return (
                      <div
                        key={req._id}
                        className="p-4 rounded-2xl bg-[#111115]/80 border border-white/[0.08] flex items-center justify-between gap-3 shadow-lg"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Link to={profileLink} className="w-10 h-10 rounded-xl bg-brand-mint/15 text-brand-mint font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden">
                            {requester.avatar ? (
                              <img src={requester.avatar} alt={requester.name} className="w-full h-full object-cover" />
                            ) : (
                              <span>{getInitials(requester.name)}</span>
                            )}
                          </Link>
                          <div className="min-w-0">
                            <Link to={profileLink} className="text-xs font-bold text-white hover:text-brand-mint transition-colors truncate block">
                              {requester.name || 'Student'}
                            </Link>
                            <p className="text-[10px] font-mono text-text-muted truncate">
                              @{requester.username || 'student'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => acceptRequestMutation.mutate(req._id)}
                            disabled={acceptRequestMutation.isPending}
                            className="px-3 py-1.5 rounded-xl bg-brand-mint text-black font-bold text-xs cursor-pointer hover:bg-brand-mint/90 transition-colors"
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            onClick={() => declineRequestMutation.mutate(req._id)}
                            disabled={declineRequestMutation.isPending}
                            className="p-1.5 rounded-xl text-text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Decline request"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Outgoing Requests */}
          {requestsSubTab === 'outgoing' && (
            <div>
              {requestsQuery.isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-28 rounded-2xl bg-white/[0.02] border border-white/[0.04] animate-pulse" />
                  ))}
                </div>
              ) : (requestsQuery.data?.outgoing || []).length === 0 ? (
                <div className="p-12 rounded-2xl bg-[#111115]/60 border border-white/[0.06] text-center">
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-3 text-text-faint">
                    <Clock className="w-6 h-6" />
                  </div>
                  <h4 className="font-heading font-bold text-sm text-white">No pending sent requests</h4>
                  <p className="text-xs text-text-muted mt-1">
                    You have no active outgoing connection requests awaiting response.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(requestsQuery.data?.outgoing || []).map((req) => {
                    const recipient = req.recipientId || {};
                    const identifier = recipient.username || recipient.id || recipient._id || '';
                    const profileLink = `/network/profile/${encodeURIComponent(identifier)}`;

                    return (
                      <div
                        key={req._id}
                        className="p-4 rounded-2xl bg-[#111115]/80 border border-white/[0.08] flex items-center justify-between gap-3 shadow-lg"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Link to={profileLink} className="w-10 h-10 rounded-xl bg-white/[0.04] text-text-muted font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden">
                            {recipient.avatar ? (
                              <img src={recipient.avatar} alt={recipient.name} className="w-full h-full object-cover" />
                            ) : (
                              <span>{getInitials(recipient.name)}</span>
                            )}
                          </Link>
                          <div className="min-w-0">
                            <Link to={profileLink} className="text-xs font-bold text-white hover:text-brand-mint transition-colors truncate block">
                              {recipient.name || 'Student'}
                            </Link>
                            <p className="text-[10px] font-mono text-text-muted truncate">
                              @{recipient.username || 'student'}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => cancelRequestMutation.mutate(req._id)}
                          disabled={cancelRequestMutation.isPending}
                          className="text-xs text-text-muted hover:text-rose-400 px-3 py-1.5 rounded-xl hover:bg-rose-500/10 transition-colors cursor-pointer border border-white/[0.06]"
                        >
                          Cancel
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
