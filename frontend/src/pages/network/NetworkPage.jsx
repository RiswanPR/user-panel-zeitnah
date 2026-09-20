import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Users, Briefcase, Building2, Compass, Search } from 'lucide-react';
import { networkApi } from '../../services/networkApi';
import LearningSpaceCard from '../../components/network/LearningSpaceCard';
import NetworkConnections from '../../components/network/NetworkConnections';
import OrganizationCard from '../../components/network/OrganizationCard';
import OpportunityCard from '../../components/network/OpportunityCard';

export default function NetworkPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab');
  const tabMap = {
    overview: 'spaces',
    communities: 'spaces',
    discover: 'network',
    connections: 'network',
  };
  const currentTab = tabMap[rawTab] || rawTab || 'spaces'; // 'spaces' | 'network' | 'opportunities' | 'organizations'
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-mint/15 text-brand-mint border border-brand-mint/30">
              Ecosystem
            </span>
          </div>
          <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-white mt-2 tracking-tight">
            Learning Spaces & Professional Network
          </h1>
          <p className="text-sm text-text-muted mt-1 max-w-2xl">
            Cohort learning spaces, peer connections, verified institutional partners, and career opportunities.
          </p>
        </div>

        {/* Primary Tab Navigation */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-x-auto">
          {[
            { id: 'spaces', label: 'Learning Spaces', icon: Users },
            { id: 'network', label: 'Network', icon: Compass },
            { id: 'opportunities', label: 'Opportunities', icon: Briefcase },
            { id: 'organizations', label: 'Organizations', icon: Building2 },
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
      </div>

      {/* ── TAB 1: LEARNING SPACES ── */}
      {currentTab === 'spaces' && (
        <div className="space-y-6">
          {/* Sub-filters & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.02] border border-white/[0.06] w-fit">
              {[
                { id: 'all', label: 'All Spaces' },
                { id: 'joined', label: 'My Enrolled Spaces' },
                { id: 'discover', label: 'Discover Open Spaces' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSubFilter(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    spaceFilter === f.id
                      ? 'bg-white/10 text-white'
                      : 'text-text-muted hover:text-white'
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
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs text-white placeholder-text-muted focus:outline-none focus:border-brand-mint/40 transition-colors"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs text-white focus:outline-none focus:border-brand-mint/40 transition-colors cursor-pointer"
              >
                <option value="" className="bg-bg-surface text-white">All Categories</option>
                <option value="Batch" className="bg-bg-surface text-white">Batch</option>
                <option value="Study Group" className="bg-bg-surface text-white">Study Group</option>
                <option value="Department" className="bg-bg-surface text-white">Department</option>
                <option value="Program" className="bg-bg-surface text-white">Program</option>
              </select>
            </div>
          </div>

          {/* Grid */}
          {spacesQuery.isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-64 rounded-2xl bg-white/[0.02] border border-white/[0.04] animate-pulse" />
              ))}
            </div>
          ) : spaces.length === 0 ? (
            <div className="p-16 rounded-3xl bg-[#111115]/60 border border-white/[0.06] text-center max-w-lg mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-4 text-text-faint">
                <Users className="w-7 h-7" />
              </div>
              <h3 className="font-heading font-bold text-lg text-white">No Learning Spaces found</h3>
              <p className="text-xs text-text-muted mt-1 leading-relaxed">
                {spaceFilter === 'joined'
                  ? 'You are not currently enrolled in any Learning Spaces. Switch to "All Spaces" to discover and join active cohorts.'
                  : 'No cohorts match your current search or category filter.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {spaces.map((space) => (
                <LearningSpaceCard key={space._id} space={space} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: MY NETWORK & CONNECTIONS ── */}
      {currentTab === 'network' && <NetworkConnections />}

      {/* ── TAB 3: OPPORTUNITIES ── */}
      {currentTab === 'opportunities' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="relative flex-1 sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                value={oppSearch}
                onChange={(e) => setOppSearch(e.target.value)}
                placeholder="Search by title, required skills, or location..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs text-white placeholder-text-muted focus:outline-none focus:border-brand-mint/40 transition-colors"
              />
            </div>

            <div className="flex items-center gap-2">
              {['', 'REMOTE', 'HYBRID', 'ONSITE'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setOppWorkMode(mode)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    oppWorkMode === mode
                      ? 'bg-white/10 text-white'
                      : 'text-text-muted hover:text-white'
                  }`}
                >
                  {mode === '' ? 'All Modes' : mode}
                </button>
              ))}
            </div>
          </div>

          {opportunitiesQuery.isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 rounded-2xl bg-white/[0.02] border border-white/[0.04] animate-pulse" />
              ))}
            </div>
          ) : opportunities.length === 0 ? (
            <div className="p-16 rounded-3xl bg-[#111115]/60 border border-white/[0.06] text-center max-w-lg mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-4 text-text-faint">
                <Briefcase className="w-7 h-7" />
              </div>
              <h3 className="font-heading font-bold text-lg text-white">No active opportunities found</h3>
              <p className="text-xs text-text-muted mt-1 leading-relaxed">
                Opportunities posted by verified institutional partners and recruiters will be displayed here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
          <div className="relative sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              value={orgSearch}
              onChange={(e) => setOrgSearch(e.target.value)}
              placeholder="Search companies, colleges, and training institutes..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs text-white placeholder-text-muted focus:outline-none focus:border-brand-mint/40 transition-colors"
            />
          </div>

          {organizationsQuery.isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-44 rounded-2xl bg-white/[0.02] border border-white/[0.04] animate-pulse" />
              ))}
            </div>
          ) : organizations.length === 0 ? (
            <div className="p-16 rounded-3xl bg-[#111115]/60 border border-white/[0.06] text-center max-w-lg mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-4 text-text-faint">
                <Building2 className="w-7 h-7" />
              </div>
              <h3 className="font-heading font-bold text-lg text-white">No organizations found</h3>
              <p className="text-xs text-text-muted mt-1 leading-relaxed">
                Verified institutional organizations will be displayed here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
