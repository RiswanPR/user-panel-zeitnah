import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Users, Briefcase, Building2, Compass, Search } from 'lucide-react';
import { networkApi } from '../../services/networkApi';
import LearningSpaceCard from '../../components/network/LearningSpaceCard';
import NetworkConnections from '../../components/network/NetworkConnections';
import OrganizationCard from '../../components/network/OrganizationCard';
import OpportunityCard from '../../components/network/OpportunityCard';
import PageHeader from '../../components/ui/PageHeader';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonCard } from '../../components/ui/Skeleton';

export default function NetworkPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab');
  const tabMap = {
    network: 'network',
    discover: 'network',
    connections: 'network',
    people: 'network',
    overview: 'network',
    spaces: 'spaces',
    communities: 'spaces',
    opportunities: 'opportunities',
    organizations: 'organizations',
  };
  const currentTab = tabMap[rawTab] || rawTab || 'network'; // 'network' | 'spaces' | 'opportunities' | 'organizations'
  const spaceFilter = searchParams.get('filter') || 'all'; // 'all' | 'joined' | 'discover'

  const [spaceSearch, setSpaceSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [oppSearch, setOppSearch] = useState('');
  const [oppWorkMode, setOppWorkMode] = useState('');
  const [orgSearch, setOrgSearch] = useState('');

  // Queries
  const spacesQuery = useQuery({
    queryKey: ['learning-spaces', { filter: spaceFilter, q: spaceSearch, category: categoryFilter }],
    queryFn: () => networkApi.getSpaces({ filter: spaceFilter, q: spaceSearch, category: categoryFilter }),
    enabled: currentTab === 'spaces',
  });

  const opportunitiesQuery = useQuery({
    queryKey: ['network-opportunities', { q: oppSearch, workMode: oppWorkMode }],
    queryFn: () => networkApi.getOpportunities({ q: oppSearch, workMode: oppWorkMode }),
    enabled: currentTab === 'opportunities',
  });

  const organizationsQuery = useQuery({
    queryKey: ['network-organizations', { q: orgSearch }],
    queryFn: () => networkApi.getOrganizations({ q: orgSearch }),
    enabled: currentTab === 'organizations',
  });

  const setTab = (tab) => {
    setSearchParams({ tab });
  };

  const setSubFilter = (filter) => {
    setSearchParams({ tab: 'spaces', filter });
  };

  const spaces = spacesQuery.data?.spaces || [];
  const opportunities = opportunitiesQuery.data?.opportunities || [];
  const organizations = organizationsQuery.data?.organizations || [];

  return (
    <div className="max-w-[1440px] mx-auto space-y-6 sm:space-y-8">
      {/* ── Zeitnah 2.0 Page Header ── */}
      <PageHeader
        eyebrow="PROFESSIONAL DISCOVERY CENTER"
        title="Network & Spaces"
        description="Connect with infrastructure engineers, BIM specialists, project managers, verified institutions, and employer cohorts across the Zeitnah ecosystem."
        actions={
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-md overflow-x-auto max-w-full no-scrollbar">
            {[
              { id: 'network', label: 'People & Network', icon: Compass },
              { id: 'spaces', label: 'Learning Spaces', icon: Users },
              { id: 'opportunities', label: 'Opportunities', icon: Briefcase },
              { id: 'organizations', label: 'Organizations', icon: Building2 },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer min-h-[38px] touch-manipulation ${
                    active
                      ? 'bg-brand-mint text-black shadow-md shadow-brand-mint/15 font-bold'
                      : 'text-text-muted hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        }
      />

      {/* ── TAB 1: DISCOVER PEOPLE & NETWORK ── */}
      {currentTab === 'network' && (
        <NetworkConnections
          defaultTab={
            searchParams.get('sub') ||
            (rawTab === 'connections'
              ? 'connections'
              : rawTab === 'followers'
              ? 'followers'
              : rawTab === 'following'
              ? 'following'
              : rawTab === 'requests'
              ? 'requests'
              : 'people')
          }
        />
      )}

      {/* ── TAB 2: LEARNING SPACES ── */}
      {currentTab === 'spaces' && (
        <div className="space-y-6">
          {/* Sub-filters & Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-md">
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-x-auto no-scrollbar">
              {[
                { id: 'all', label: 'All Spaces' },
                { id: 'joined', label: 'My Enrolled Spaces' },
                { id: 'discover', label: 'Open Spaces' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSubFilter(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap min-h-[36px] touch-manipulation ${
                    spaceFilter === f.id
                      ? 'bg-white/10 text-white font-bold shadow-sm'
                      : 'text-text-muted hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="text"
                  value={spaceSearch}
                  onChange={(e) => setSpaceSearch(e.target.value)}
                  placeholder="Search spaces by name or code..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs text-white placeholder-text-muted focus:outline-none focus:border-brand-mint/40 min-h-[40px] transition-colors"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-[#0D1625] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-brand-mint/40 min-h-[40px] transition-colors cursor-pointer"
              >
                <option value="">All Categories</option>
                <option value="Batch">Batch</option>
                <option value="Study Group">Study Group</option>
                <option value="Department">Department</option>
                <option value="Program">Program</option>
              </select>
            </div>
          </div>

          {/* Grid */}
          {spacesQuery.isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : spaces.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No Learning Spaces Found"
              description={
                spaceFilter === 'joined'
                  ? 'You are not currently enrolled in any Learning Spaces. Switch to "All Spaces" to discover and join active cohorts.'
                  : 'No cohorts match your current search or category filter. Try clearing filters.'
              }
              action={() => {
                setSubFilter('all');
                setSpaceSearch('');
                setCategoryFilter('');
              }}
              actionLabel="View All Spaces"
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {spaces.map((space) => (
                <LearningSpaceCard key={space._id} space={space} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: OPPORTUNITIES ── */}
      {currentTab === 'opportunities' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-md">
            <div className="relative flex-1 sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                value={oppSearch}
                onChange={(e) => setOppSearch(e.target.value)}
                placeholder="Search opportunities by role, skills, or location..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs text-white placeholder-text-muted focus:outline-none focus:border-brand-mint/40 min-h-[40px] transition-colors"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {['', 'REMOTE', 'HYBRID', 'ONSITE'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setOppWorkMode(mode)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer min-h-[36px] touch-manipulation whitespace-nowrap ${
                    oppWorkMode === mode
                      ? 'bg-white/10 text-white font-bold'
                      : 'text-text-muted hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  {mode === '' ? 'All Modes' : mode}
                </button>
              ))}
            </div>
          </div>

          {opportunitiesQuery.isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : opportunities.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title="No Active Opportunities Found"
              description="Opportunities posted by verified institutional partners, recruiters, and infrastructure firms will appear here."
              action={() => {
                setOppSearch('');
                setOppWorkMode('');
              }}
              actionLabel="Clear Filters"
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {opportunities.map((opp) => (
                <OpportunityCard key={opp._id} opp={opp} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: ORGANIZATIONS ── */}
      {currentTab === 'organizations' && (
        <div className="space-y-6">
          <div className="relative sm:max-w-md p-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              value={orgSearch}
              onChange={(e) => setOrgSearch(e.target.value)}
              placeholder="Search companies, colleges, and training institutes..."
              className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs text-white placeholder-text-muted focus:outline-none focus:border-brand-mint/40 min-h-[44px] transition-colors"
            />
          </div>

          {organizationsQuery.isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : organizations.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No Organizations Found"
              description="Verified institutional companies, academic colleges, and industry enterprises will appear here."
              action={() => setOrgSearch('')}
              actionLabel="Reset Search"
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {organizations.map((org) => (
                <OrganizationCard key={org._id} org={org} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
