import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  Users,
  Briefcase,
  Building2,
  Compass,
  Search,
  Sparkles,
  ArrowUpRight,
  SlidersHorizontal,
  X,
} from 'lucide-react';

import { networkApi } from '../../services/networkApi';
import LearningSpaceCard from '../../components/network/LearningSpaceCard';
import NetworkConnections from '../../components/network/NetworkConnections';
import OrganizationCard from '../../components/network/OrganizationCard';
import OpportunityCard from '../../components/network/OpportunityCard';

const tabs = [
  {
    id: 'network',
    label: 'Network',
    description: 'Connect with your ecosystem',
    icon: Compass,
  },
  {
    id: 'spaces',
    label: 'Learning Spaces',
    description: 'Learn with your community',
    icon: Users,
  },
  {
    id: 'opportunities',
    label: 'Opportunities',
    description: 'Discover your next move',
    icon: Briefcase,
  },
  {
    id: 'organizations',
    label: 'Organizations',
    description: 'Explore verified partners',
    icon: Building2,
  },
];

const spaceFilters = [
  { id: 'all', label: 'All Spaces' },
  { id: 'joined', label: 'My Spaces' },
  { id: 'discover', label: 'Discover' },
];

const workModes = ['', 'REMOTE', 'HYBRID', 'ONSITE'];

function SectionHeader({ eyebrow, title, description }) {
  return (
    <div>
      {eyebrow && (
        <div className="inline-flex items-center gap-2 mb-3">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-mint shadow-[0_0_10px_rgba(52,211,153,0.7)]" />
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-mint">
            {eyebrow}
          </span>
        </div>
      )}

      <h2 className="font-heading font-bold text-xl sm:text-2xl text-white tracking-tight">
        {title}
      </h2>

      {description && (
        <p className="mt-1.5 text-sm text-text-muted max-w-2xl leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
}

function SearchInput({ value, onChange, placeholder }) {
  return (
    <div className="relative w-full">
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-faint pointer-events-none" />

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="
          w-full
          h-11
          pl-10
          pr-10
          rounded-xl
          bg-white/[0.035]
          border border-white/[0.07]
          text-sm text-white
          placeholder:text-text-faint
          outline-none
          transition-all
          duration-200
          hover:bg-white/[0.045]
          hover:border-white/[0.11]
          focus:bg-white/[0.05]
          focus:border-brand-mint/40
          focus:ring-4
          focus:ring-brand-mint/5
        "
      />

      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="
            absolute
            right-3
            top-1/2
            -translate-y-1/2
            flex
            h-6
            w-6
            items-center
            justify-center
            rounded-lg
            text-text-faint
            hover:text-white
            hover:bg-white/[0.06]
            transition-colors
          "
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/[0.07] bg-white/[0.025] p-12 sm:p-16 text-center">
      <div className="absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-brand-mint/[0.06] blur-3xl" />

      <div className="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.045] shadow-2xl">
        <Icon className="h-7 w-7 text-text-muted" />
      </div>

      <div className="relative">
        <h3 className="font-heading text-lg font-bold text-white">
          {title}
        </h3>

        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-text-muted">
          {description}
        </p>
      </div>
    </div>
  );
}

function LoadingGrid({ height = 'h-64' }) {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className={`
            ${height}
relative
overflow - hidden
rounded - 3xl
            border border - white / [0.06]
bg - white / [0.025]
  `}
        >
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_infinite] bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />

          <div className="p-5 space-y-4">
            <div className="h-32 rounded-2xl bg-white/[0.035]" />
            <div className="h-4 w-3/4 rounded-full bg-white/[0.04]" />
            <div className="h-3 w-1/2 rounded-full bg-white/[0.035]" />
            <div className="h-10 w-full rounded-xl bg-white/[0.03]" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function NetworkPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const rawTab = searchParams.get('tab');

  // Legacy routes -> new tab structure.
  // Network is the primary/default tab.
  const tabMap = {
    overview: 'network',
    communities: 'spaces',
    discover: 'network',
    connections: 'network',
  };

  const currentTab =
    tabMap[rawTab] ||
      ['network', 'spaces', 'opportunities', 'organizations'].includes(rawTab)
      ? rawTab
      : 'network';

  const spaceFilter = searchParams.get('filter') || 'all';

  const [spaceSearch, setSpaceSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [oppSearch, setOppSearch] = useState('');
  const [oppWorkMode, setOppWorkMode] = useState('');
  const [orgSearch, setOrgSearch] = useState('');

  // ─────────────────────────────────────────────
  // Queries
  // ─────────────────────────────────────────────

  const spacesQuery = useQuery({
    queryKey: [
      'learning-spaces',
      {
        filter: spaceFilter,
        q: spaceSearch,
        category: categoryFilter,
      },
    ],
    queryFn: () =>
      networkApi.getSpaces({
        filter: spaceFilter,
        q: spaceSearch,
        category: categoryFilter,
      }),
    enabled: currentTab === 'spaces',
  });

  const opportunitiesQuery = useQuery({
    queryKey: [
      'network-opportunities',
      {
        q: oppSearch,
        workMode: oppWorkMode,
      },
    ],
    queryFn: () =>
      networkApi.getOpportunities({
        q: oppSearch,
        workMode: oppWorkMode,
      }),
    enabled: currentTab === 'opportunities',
  });

  const organizationsQuery = useQuery({
    queryKey: ['network-organizations', { q: orgSearch }],
    queryFn: () =>
      networkApi.getOrganizations({
        q: orgSearch,
      }),
    enabled: currentTab === 'organizations',
  });

  // ─────────────────────────────────────────────
  // Navigation
  // ─────────────────────────────────────────────

  const setTab = (tab) => {
    if (tab === 'network') {
      setSearchParams({});
      return;
    }

    setSearchParams({ tab });
  };

  const setSubFilter = (filter) => {
    setSearchParams({
      tab: 'spaces',
      filter,
    });
  };

  const spaces = spacesQuery.data?.spaces || [];
  const opportunities = opportunitiesQuery.data?.opportunities || [];
  const organizations = organizationsQuery.data?.organizations || [];

  const activeTab = tabs.find((tab) => tab.id === currentTab) || tabs[0];

  return (
    <div className="relative min-h-full overflow-hidden">
      {/* ─────────────────────────────────────────────
          Ambient Background
      ───────────────────────────────────────────── */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[8%] top-[-120px] h-[420px] w-[420px] rounded-full bg-brand-mint/[0.045] blur-[120px]" />
        <div className="absolute right-[-100px] top-[12%] h-[360px] w-[360px] rounded-full bg-violet-500/[0.035] blur-[120px]" />
        <div className="absolute bottom-[-180px] left-[35%] h-[400px] w-[400px] rounded-full bg-blue-500/[0.025] blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8 xl:px-10">
        {/* ─────────────────────────────────────────────
            Hero / Page Header
        ───────────────────────────────────────────── */}

        <section className="relative overflow-hidden rounded-[28px] border border-white/[0.07] bg-white/[0.025] shadow-[0_20px_80px_rgba(0,0,0,0.22)]">
          {/* Hero glow */}
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-mint/[0.08] blur-[90px]" />

          <div className="relative p-5 sm:p-7 lg:p-8">
            <div className="flex flex-col gap-7">
              {/* Eyebrow */}
              <div className="flex items-center justify-between gap-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-brand-mint/20 bg-brand-mint/[0.07] px-3 py-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-brand-mint" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-mint">
                    Zeitnah Ecosystem
                  </span>
                </div>

                <div className="hidden items-center gap-2 text-[11px] text-text-faint sm:flex">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-mint shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
                  Connected learning
                </div>
              </div>

              {/* Main heading */}
              <div className="max-w-3xl">
                <h1 className="font-heading text-3xl font-extrabold tracking-[-0.035em] text-white sm:text-4xl lg:text-[44px] lg:leading-[1.05]">
                  Your network for{' '}
                  <span className="bg-gradient-to-r from-white via-white to-white/55 bg-clip-text text-transparent">
                    learning & growth.
                  </span>
                </h1>

                <p className="mt-4 max-w-2xl text-sm leading-6 text-text-muted sm:text-base">
                  Build meaningful connections, discover learning communities,
                  explore opportunities, and connect with verified
                  organizations — all in one place.
                </p>
              </div>

              {/* Premium tab navigation */}
              <div className="rounded-2xl border border-white/[0.07] bg-black/20 p-1.5 backdrop-blur-xl">
                <div className="grid grid-cols-2 gap-1 md:grid-cols-4">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const active = currentTab === tab.id;

                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setTab(tab.id)}
                        className={`
group
relative
flex
min - h - [66px]
items - center
gap - 3
rounded - xl
px - 3
py - 3
text - left
transition - all
duration - 200
cursor - pointer
                          ${active
                            ? 'bg-white/[0.075] shadow-lg shadow-black/20'
                            : 'hover:bg-white/[0.035]'
                          }
`}
                      >
                        {active && (
                          <span className="absolute inset-x-3 bottom-0 h-px bg-gradient-to-r from-transparent via-brand-mint to-transparent" />
                        )}

                        <span
                          className={`
flex
h - 10
w - 10
shrink - 0
items - center
justify - center
rounded - xl
border
transition - all
                            ${active
                              ? 'border-brand-mint/25 bg-brand-mint/10 text-brand-mint shadow-[0_0_24px_rgba(52,211,153,0.08)]'
                              : 'border-white/[0.06] bg-white/[0.025] text-text-muted group-hover:border-white/[0.1] group-hover:text-white'
                            }
`}
                        >
                          <Icon className="h-4 w-4" />
                        </span>

                        <span className="min-w-0">
                          <span
                            className={`
                              block truncate text - xs font - bold
                              ${active
                                ? 'text-white'
                                : 'text-text-muted group-hover:text-white'
                              }
`}
                          >
                            {tab.label}
                          </span>

                          <span className="mt-0.5 hidden truncate text-[10px] text-text-faint xl:block">
                            {tab.description}
                          </span>
                        </span>

                        {active && (
                          <ArrowUpRight className="ml-auto hidden h-3.5 w-3.5 text-brand-mint sm:block" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────
            Active section indicator
        ───────────────────────────────────────────── */}

        <div className="mt-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-1 rounded-full bg-brand-mint shadow-[0_0_14px_rgba(52,211,153,0.45)]" />

            <div>
              <p className="text-xs font-bold text-white">{activeTab.label}</p>
              <p className="text-[11px] text-text-faint">
                {activeTab.description}
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-2 text-[10px] font-medium uppercase tracking-widest text-text-faint sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-mint" />
            Live ecosystem
          </div>
        </div>

        {/* ─────────────────────────────────────────────
            NETWORK
        ───────────────────────────────────────────── */}

        {currentTab === 'network' && (
          <section className="mt-5">
            <NetworkConnections />
          </section>
        )}

        {/* ─────────────────────────────────────────────
            LEARNING SPACES
        ───────────────────────────────────────────── */}

        {currentTab === 'spaces' && (
          <section className="mt-5 space-y-6">
            <div className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-4 shadow-[0_12px_50px_rgba(0,0,0,0.15)] sm:p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                {/* Filter pills */}
                <div className="flex items-center gap-1 overflow-x-auto rounded-xl border border-white/[0.06] bg-black/15 p-1">
                  {spaceFilters.map((filter) => {
                    const active = spaceFilter === filter.id;

                    return (
                      <button
                        key={filter.id}
                        type="button"
                        onClick={() => setSubFilter(filter.id)}
                        className={`
whitespace - nowrap
rounded - lg
px - 3.5
py - 2
text - [11px]
font - bold
transition - all
cursor - pointer
                          ${active
                            ? 'bg-white/[0.09] text-white shadow-sm'
                            : 'text-text-faint hover:bg-white/[0.04] hover:text-text-muted'
                          }
`}
                      >
                        {filter.label}
                      </button>
                    );
                  })}
                </div>

                {/* Search + category */}
                <div className="flex flex-col gap-3 sm:flex-row xl:w-[560px]">
                  <div className="flex-1">
                    <SearchInput
                      value={spaceSearch}
                      onChange={setSpaceSearch}
                      placeholder="Search learning spaces..."
                    />
                  </div>

                  <div className="relative sm:w-48">
                    <SlidersHorizontal className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-faint" />

                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="
                        h-11
                        w-full
                        appearance-none
                        rounded-xl
                        border border-white/[0.07]
                        bg-white/[0.035]
                        pl-10
                        pr-8
                        text-xs
                        font-semibold
                        text-white
                        outline-none
                        transition-all
                        hover:border-white/[0.11]
                        focus:border-brand-mint/40
                        focus:ring-4
                        focus:ring-brand-mint/5
                        cursor-pointer
                      "
                    >
                      <option value="" className="bg-[#111115] text-white">
                        All Categories
                      </option>
                      <option
                        value="Batch"
                        className="bg-[#111115] text-white"
                      >
                        Batch
                      </option>
                      <option
                        value="Study Group"
                        className="bg-[#111115] text-white"
                      >
                        Study Group
                      </option>
                      <option
                        value="Department"
                        className="bg-[#111115] text-white"
                      >
                        Department
                      </option>
                      <option
                        value="Program"
                        className="bg-[#111115] text-white"
                      >
                        Program
                      </option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {spacesQuery.isLoading ? (
              <LoadingGrid />
            ) : spaces.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No learning spaces found"
                description={
                  spaceFilter === 'joined'
                    ? 'You are not currently enrolled in any Learning Spaces. Explore all spaces to discover active cohorts and communities.'
                    : 'No learning spaces match your current search or category filters.'
                }
              />
            ) : (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {spaces.map((space) => (
                  <LearningSpaceCard
                    key={space._id}
                    space={space}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* ─────────────────────────────────────────────
            OPPORTUNITIES
        ───────────────────────────────────────────── */}

        {currentTab === 'opportunities' && (
          <section className="mt-5 space-y-6">
            <div className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-4 shadow-[0_12px_50px_rgba(0,0,0,0.15)] sm:p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="w-full xl:max-w-xl">
                  <SearchInput
                    value={oppSearch}
                    onChange={setOppSearch}
                    placeholder="Search by role, skills, or location..."
                  />
                </div>

                <div className="flex items-center gap-1 overflow-x-auto rounded-xl border border-white/[0.06] bg-black/15 p-1">
                  {workModes.map((mode) => {
                    const active = oppWorkMode === mode;

                    return (
                      <button
                        key={mode || 'ALL'}
                        type="button"
                        onClick={() => setOppWorkMode(mode)}
                        className={`
whitespace - nowrap
rounded - lg
px - 3.5
py - 2
text - [11px]
font - bold
transition - all
cursor - pointer
                          ${active
                            ? 'bg-white/[0.09] text-white shadow-sm'
                            : 'text-text-faint hover:bg-white/[0.04] hover:text-text-muted'
                          }
`}
                      >
                        {mode === '' ? 'All Modes' : mode}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {opportunitiesQuery.isLoading ? (
              <LoadingGrid height="h-52" />
            ) : opportunities.length === 0 ? (
              <EmptyState
                icon={Briefcase}
                title="No active opportunities"
                description="Verified institutional partners and recruiters will publish opportunities here as they become available."
              />
            ) : (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {opportunities.map((opp) => (
                  <OpportunityCard
                    key={opp._id}
                    opp={opp}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* ─────────────────────────────────────────────
            ORGANIZATIONS
        ───────────────────────────────────────────── */}

        {currentTab === 'organizations' && (
          <section className="mt-5 space-y-6">
            <div className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-4 shadow-[0_12px_50px_rgba(0,0,0,0.15)] sm:p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-xl">
                  <SectionHeader
                    eyebrow="Verified ecosystem"
                    title="Organizations & Partners"
                    description="Explore companies, colleges, training institutes, and verified ecosystem partners."
                  />
                </div>

                <div className="w-full lg:max-w-md">
                  <SearchInput
                    value={orgSearch}
                    onChange={setOrgSearch}
                    placeholder="Search organizations..."
                  />
                </div>
              </div>
            </div>

            {organizationsQuery.isLoading ? (
              <LoadingGrid height="h-48" />
            ) : organizations.length === 0 ? (
              <EmptyState
                icon={Building2}
                title="No organizations found"
                description="Verified institutional organizations and ecosystem partners will be displayed here."
              />
            ) : (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {organizations.map((org) => (
                  <OrganizationCard
                    key={org._id}
                    org={org}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Footer spacing */}
        <div className="h-8" />
      </div>

      {/* Local shimmer keyframes */}
      <style>
        {`
@keyframes shimmer {
  100 % {
    transform: translateX(100 %);
  }
}
`}
      </style>
    </div>
  );
}
