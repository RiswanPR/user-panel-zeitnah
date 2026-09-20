import { useState, useContext, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useInfiniteQuery, useMutation } from "@tanstack/react-query";
import { AuthContext } from "../../context/AuthContext";
import networkService from "../../services/networkService";
import networkConnectionsService from "../../services/networkConnectionsService";
import communityService from "../../services/communityService";

import NetworkHero from "../../components/network/NetworkHero";
import DiscoverHero from "../../components/network/DiscoverHero";
import NetworkTabs from "../../components/network/NetworkTabs";
import NetworkSearch from "../../components/network/NetworkSearch";
import StudentFilters from "../../components/network/StudentFilters";
import SuggestedStudents from "../../components/network/SuggestedStudents";
import StudentCard from "../../components/network/StudentCard";
import StudentProfilePreviewModal from "../../components/network/StudentProfilePreviewModal";
import DiscoverSkeleton from "../../components/network/DiscoverSkeleton";
import NetworkActivity from "../../components/network/NetworkActivity";
import NetworkEmptyState from "../../components/network/NetworkEmptyState";
import NetworkSkeleton from "../../components/network/NetworkSkeleton";
import NetworkErrorState from "../../components/network/NetworkErrorState";
import ConnectionsList from "../../components/network/ConnectionsList";
import CommunityCard from "../../components/network/communities/CommunityCard";
import CommunityEmptyState from "../../components/network/communities/CommunityEmptyState";
import { CommunityCardSkeleton } from "../../components/network/communities/CommunitySkeleton";
import organizationService from "../../services/organizationService";
import opportunityService from "../../services/opportunityService";
import OrganizationCard from "../../components/network/OrganizationCard";
import OpportunityCard from "../../components/network/OpportunityCard";
import OpportunityDetailModal from "../../components/network/OpportunityDetailModal";
import { Users, SearchX, FilterX, Loader2, ChevronLeft, ChevronRight, Check, ArrowRight, Building2, Briefcase, Sparkles } from "lucide-react";

/**
 * NetworkPage Component
 * Main orchestrator for Zeitnah LMS Network & Student Discovery.
 */
export default function NetworkPage() {
  const { user } = useContext(AuthContext);
  const [searchParams, setSearchParams] = useSearchParams();

  // ── URL State Synchronization ──────────────────────────────
  const activeTab = searchParams.get("tab") || "overview";
  const searchQuery = searchParams.get("q") || "";
  const filterCourse = searchParams.get("course") || "";
  const filterLevel = searchParams.get("level") || "";
  const filterInterest = searchParams.get("interest") || "";
  const filterInstitution = searchParams.get("institution") || "";
  const sortOption = searchParams.get("sort") || "recommended";

  // Communities params
  const commType = searchParams.get("commType") || "all";
  const commSort = searchParams.get("commSort") || "recommended";
  const myCommunities = searchParams.get("myCommunities") === "true";
  const commPage = Number(searchParams.get("commPage")) || 1;

  // Ecosystem Discover Mode ('people' | 'organizations' | 'opportunities')
  const discoverMode = searchParams.get("discoverMode") || "people";

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);

  // Update SEO Page Title
  useEffect(() => {
    document.title =
      activeTab === "discover"
        ? "Student Discovery — Zeitnah Network"
        : activeTab === "communities"
        ? "Learning Communities — Zeitnah Network"
        : activeTab === "connections"
        ? "Connections & Requests — Zeitnah Network"
        : "Network — Discover & Connect | Zeitnah LMS";
  }, [activeTab]);

  // Fetch real connection counts
  const { data: countsData } = useQuery({
    queryKey: ["network-connection-counts"],
    queryFn: () => networkConnectionsService.getConnectionCounts(),
    staleTime: 1000 * 30,
  });

  // URL state updater helper
  const updateUrlParams = useCallback(
    (newParams) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          Object.entries(newParams).forEach(([k, v]) => {
            if (v === "" || v === undefined || v === null) {
              next.delete(k);
            } else {
              next.set(k, String(v));
            }
          });
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const handleTabChange = (tabId) => {
    updateUrlParams({ tab: tabId === "overview" ? null : tabId });
  };

  const handleSearchChange = (q) => {
    if (activeTab === "overview" && q && q.trim().length > 0) {
      updateUrlParams({ tab: "discover", q });
    } else {
      updateUrlParams({ q: q || null });
    }
  };

  const handleFiltersChange = (newFilters) => {
    updateUrlParams({
      course: newFilters.course || null,
      level: newFilters.level || null,
      interest: newFilters.interest || null,
      institution: newFilters.institution || null,
      sort: newFilters.sort === "recommended" ? null : newFilters.sort,
    });
  };

  // ── Queries ───────────────────────────────────────────────

  // High-level Network Stats
  const {
    data: stats,
    isLoading: isStatsLoading,
  } = useQuery({
    queryKey: ["network", "stats"],
    queryFn: () => networkService.getNetworkStats(),
    staleTime: 1000 * 60 * 2,
  });

  // Available real filters
  const { data: availableFilters } = useQuery({
    queryKey: ["network", "filters"],
    queryFn: () => networkService.getDiscoverFilters(),
    staleTime: 1000 * 60 * 5,
  });

  // Suggested Students for Overview
  const {
    data: overviewStudents = [],
    isLoading: isOverviewLoading,
  } = useQuery({
    queryKey: ["network", "overview-students"],
    queryFn: () => networkService.getSuggestedStudents({ limit: 6 }),
    staleTime: 1000 * 60 * 2,
  });

  // Featured Learning Spaces for Overview Tab
  const { data: overviewCommunities } = useQuery({
    queryKey: ["network", "overview-communities"],
    queryFn: () => communityService.getCommunities({ limit: 3, sort: "popular" }),
    staleTime: 1000 * 60 * 5,
    enabled: activeTab === "overview",
  });

  // Ecosystem Organizations Query
  const { data: organizationsData, isLoading: isOrgsLoading } = useQuery({
    queryKey: ["network-organizations", searchQuery],
    queryFn: () => organizationService.getOrganizations({ q: searchQuery, limit: 12 }),
    staleTime: 1000 * 60 * 2,
    enabled: activeTab === "discover" && discoverMode === "organizations" || activeTab === "overview",
  });

  // Ecosystem Opportunities Query
  const { data: opportunitiesData, isLoading: isOppsLoading } = useQuery({
    queryKey: ["network-opportunities", searchQuery],
    queryFn: () => opportunityService.getOpportunities({ q: searchQuery, limit: 12 }),
    staleTime: 1000 * 60 * 2,
    enabled: activeTab === "discover" && discoverMode === "opportunities" || activeTab === "overview",
  });


  // Discover Students Infinite Query (Server-driven pagination & filtering)
  const {
    data: infiniteData,
    isLoading: isDiscoverLoading,
    isFetchingNextPage,
    isError: isDiscoverError,
    hasNextPage,
    fetchNextPage,
    refetch: refetchDiscover,
  } = useInfiniteQuery({
    queryKey: [
      "network",
      "discover",
      searchQuery,
      filterCourse,
      filterLevel,
      filterInterest,
      filterInstitution,
      sortOption,
    ],
    queryFn: ({ pageParam = 1 }) =>
      networkService.getDiscoverStudents({
        q: searchQuery,
        course: filterCourse,
        level: filterLevel,
        interest: filterInterest,
        institution: filterInstitution,
        sort: sortOption,
        page: pageParam,
        limit: 12,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasNextPage ? lastPage.page + 1 : undefined,
    staleTime: 1000 * 60 * 1,
    enabled: activeTab === "discover",
  });

  // Communities Query (Phase 6)
  const {
    data: communitiesData,
    isLoading: isCommunitiesLoading,
    isError: isCommunitiesError,
    refetch: refetchCommunities,
  } = useQuery({
    queryKey: [
      "network",
      "communities",
      searchQuery,
      commType,
      commSort,
      myCommunities,
      commPage,
    ],
    queryFn: () =>
      communityService.getCommunities({
        q: searchQuery,
        type: commType,
        sort: commSort,
        myCommunities,
        page: commPage,
        limit: 12,
      }),
    enabled: activeTab === "communities",
    staleTime: 1000 * 60 * 1,
  });

  const joinCommunityMutation = useMutation({
    mutationFn: (commId) => communityService.joinCommunity(commId),
    onSuccess: () => {
      refetchCommunities();
    },
  });

  // Flatten pages into a clean list of students
  const accumulatedStudents = useMemo(() => {
    return infiniteData?.pages.flatMap((page) => page.data) || [];
  }, [infiniteData]);

  const totalStudentsCount = infiniteData?.pages?.[0]?.total;

  const handleClearAllFilters = () => {
    updateUrlParams({
      q: null,
      course: null,
      level: null,
      interest: null,
      institution: null,
      sort: null,
    });
  };

  const hasActiveFilters = Boolean(
    filterCourse || filterLevel || filterInterest || filterInstitution,
  );

  const filterState = useMemo(
    () => ({
      course: filterCourse,
      level: filterLevel,
      interest: filterInterest,
      institution: filterInstitution,
      sort: sortOption,
    }),
    [filterCourse, filterLevel, filterInterest, filterInstitution, sortOption],
  );

  if (activeTab === "overview" && isStatsLoading && isOverviewLoading) {
    return <NetworkSkeleton />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-10 pb-16">
      {/* ═══════════════════════════════════════════════
          1. HERO SECTION (Dynamic based on Tab)
          ═══════════════════════════════════════════════ */}
      {activeTab === "discover" ? (
        <DiscoverHero />
      ) : (
        <NetworkHero user={user} stats={stats} loading={isStatsLoading} />
      )}

      {/* ═══════════════════════════════════════════════
          2. NAVIGATION CONTROLS (TABS & SEARCH)
          ═══════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Navigation Tabs (Overview, Discover, Connections) */}
        <NetworkTabs
          activeTab={activeTab}
          onTabChange={handleTabChange}
          connectionsCount={countsData?.connectionsCount ?? 0}
        />

        {/* Global Search Input (only for Overview and Discover) */}
        {activeTab !== "connections" && (
          <div className="w-full sm:w-80 md:w-96 shrink-0">
            <NetworkSearch
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder={
                activeTab === "communities"
                  ? "Search learning spaces, topics, or courses..."
                  : "Search students, usernames, courses, skills..."
              }
            />
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════
          3. TAB CONTENT
          ═══════════════════════════════════════════════ */}

      {/* ── OVERVIEW TAB (PERSONAL COMMAND CENTER) ── */}
      {activeTab === "overview" && (
        <div className="space-y-10">
          {/* Section 1: People Worth Meeting */}
          <SuggestedStudents
            students={overviewStudents}
            loading={isOverviewLoading}
            onPreview={setSelectedStudent}
            onExplore={() => handleTabChange("discover")}
            title="People worth meeting"
            description="Students who share your courses, interests, and learning focus."
            courses={availableFilters?.courses || []}
            showFilterChips={false}
          />

          {/* Section 2: What's Happening & Learning Spaces */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Activity Stream Column (2 cols) */}
            <div className="lg:col-span-2 space-y-4">
              <NetworkActivity
                onExploreDiscover={() => handleTabChange("discover")}
              />
            </div>

            {/* Learning Spaces Preview Column (1 col) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-heading font-extrabold text-white tracking-tight">
                    Learning Spaces
                  </h3>
                  <p className="text-xs text-text-muted">
                    Active communities and study groups
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleTabChange("communities")}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-brand-mint hover:underline focus-ring rounded"
                >
                  <span>All Spaces</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>

              {overviewCommunities?.data && overviewCommunities.data.length > 0 ? (
                <div className="space-y-3.5">
                  {overviewCommunities.data.slice(0, 3).map((community) => (
                    <CommunityCard
                      key={community.id}
                      community={community}
                      onJoin={(id) => joinCommunityMutation.mutate(id)}
                      isJoining={
                        joinCommunityMutation.isPending &&
                        joinCommunityMutation.variables === community.id
                      }
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-white/[0.08] bg-bg-surface/50 p-6 text-center text-xs text-text-muted">
                  Explore available communities to collaborate with peers.
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Ecosystem Explore Navigation Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            <button
              type="button"
              onClick={() => updateUrlParams({ tab: "discover", discoverMode: "people" })}
              className="flex items-center justify-between rounded-2xl border border-white/[0.08] bg-gradient-to-r from-brand-mint/[0.06] via-white/[0.02] to-transparent p-5 text-left transition-all hover:border-brand-mint/30 hover:bg-white/[0.04] focus-ring group"
            >
              <div>
                <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-brand-mint">
                  TALENT & LEARNERS
                </span>
                <h4 className="text-sm font-heading font-bold text-white mt-1 group-hover:text-brand-mint transition-colors">
                  Discover People
                </h4>
                <p className="text-xs text-text-secondary mt-0.5">
                  Find students, professionals & mentors.
                </p>
              </div>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.04] text-white group-hover:border-brand-mint/40 group-hover:text-brand-mint transition-all">
                <ArrowRight className="h-4 w-4" />
              </div>
            </button>

            <button
              type="button"
              onClick={() => updateUrlParams({ tab: "discover", discoverMode: "organizations" })}
              className="flex items-center justify-between rounded-2xl border border-white/[0.08] bg-gradient-to-r from-purple-500/10 via-white/[0.02] to-transparent p-5 text-left transition-all hover:border-purple-500/30 hover:bg-white/[0.04] focus-ring group"
            >
              <div>
                <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-purple-300">
                  ECOSYSTEM ENTITIES
                </span>
                <h4 className="text-sm font-heading font-bold text-white mt-1 group-hover:text-purple-300 transition-colors">
                  Organizations
                </h4>
                <p className="text-xs text-text-secondary mt-0.5">
                  Explore companies, schools & universities.
                </p>
              </div>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.04] text-white group-hover:border-purple-500/40 group-hover:text-purple-300 transition-all">
                <ArrowRight className="h-4 w-4" />
              </div>
            </button>

            <button
              type="button"
              onClick={() => updateUrlParams({ tab: "discover", discoverMode: "opportunities" })}
              className="flex items-center justify-between rounded-2xl border border-white/[0.08] bg-gradient-to-r from-blue-500/10 via-white/[0.02] to-transparent p-5 text-left transition-all hover:border-blue-500/30 hover:bg-white/[0.04] focus-ring group"
            >
              <div>
                <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-blue-300">
                  CAREER & PROJECTS
                </span>
                <h4 className="text-sm font-heading font-bold text-white mt-1 group-hover:text-blue-300 transition-colors">
                  Opportunities
                </h4>
                <p className="text-xs text-text-secondary mt-0.5">
                  Internships, jobs & mentorship.
                </p>
              </div>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.04] text-white group-hover:border-blue-500/40 group-hover:text-blue-300 transition-all">
                <ArrowRight className="h-4 w-4" />
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange("communities")}
              className="flex items-center justify-between rounded-2xl border border-white/[0.08] bg-gradient-to-r from-[#4928C2]/10 via-white/[0.02] to-transparent p-5 text-left transition-all hover:border-indigo-500/30 hover:bg-white/[0.04] focus-ring group"
            >
              <div>
                <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#E3D9FC]">
                  COMMUNITIES & GROUPS
                </span>
                <h4 className="text-sm font-heading font-bold text-white mt-1 group-hover:text-[#E3D9FC] transition-colors">
                  Learning Spaces
                </h4>
                <p className="text-xs text-text-secondary mt-0.5">
                  Subject study groups & project teams.
                </p>
              </div>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.04] text-white group-hover:border-[#E3D9FC]/40 group-hover:text-[#E3D9FC] transition-all">
                <ArrowRight className="h-4 w-4" />
              </div>
            </button>
          </div>
        </div>
      )}

      {/* ── DISCOVER TAB (PHASE 2 DIRECTORY & ECOSYSTEM) ── */}
      {activeTab === "discover" && (
        <div className="space-y-6">
          {/* Ecosystem Discovery Mode Selector */}
          <div className="flex flex-wrap items-center gap-2 border-b border-white/5 pb-4">
            <button
              type="button"
              onClick={() => updateUrlParams({ discoverMode: "people" })}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                discoverMode === "people"
                  ? "bg-mint text-dark shadow-sm"
                  : "bg-white/5 text-text-muted hover:text-white hover:bg-white/10"
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>People & Talent</span>
            </button>

            <button
              type="button"
              onClick={() => updateUrlParams({ discoverMode: "organizations" })}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                discoverMode === "organizations"
                  ? "bg-mint text-dark shadow-sm"
                  : "bg-white/5 text-text-muted hover:text-white hover:bg-white/10"
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>Organizations</span>
            </button>

            <button
              type="button"
              onClick={() => updateUrlParams({ discoverMode: "opportunities" })}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                discoverMode === "opportunities"
                  ? "bg-mint text-dark shadow-sm"
                  : "bg-white/5 text-text-muted hover:text-white hover:bg-white/10"
              }`}
            >
              <Briefcase className="h-3.5 w-3.5" />
              <span>Opportunities</span>
            </button>
          </div>

          {/* ORGANIZATIONS VIEW */}
          {discoverMode === "organizations" ? (
            isOrgsLoading ? (
              <DiscoverSkeleton count={6} />
            ) : organizationsData?.data && organizationsData.data.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {organizationsData.data.map((org) => (
                  <OrganizationCard key={org._id || org.id} organization={org} />
                ))}
              </div>
            ) : (
              <NetworkEmptyState
                icon={Building2}
                title="No organizations found"
                description="Try searching with different terms or explore learning communities."
                action={() => handleSearchChange("")}
                actionLabel="Clear Search"
              />
            )
          ) : discoverMode === "opportunities" ? (
            /* OPPORTUNITIES VIEW */
            isOppsLoading ? (
              <DiscoverSkeleton count={6} />
            ) : opportunitiesData?.data && opportunitiesData.data.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {opportunitiesData.data.map((opp) => (
                  <OpportunityCard
                    key={opp.id}
                    opportunity={opp}
                    onSelect={setSelectedOpportunity}
                  />
                ))}
              </div>
            ) : (
              <NetworkEmptyState
                icon={Briefcase}
                title="No opportunities found"
                description="No opportunities match your current filters. Check back soon for new internships and projects."
                action={() => handleSearchChange("")}
                actionLabel="Clear Search"
              />
            )
          ) : (
            /* PEOPLE & TALENT VIEW */
            <>
              {/* Filter Toolbar */}
              <StudentFilters
                filters={filterState}
                onFilterChange={handleFiltersChange}
                availableFilters={
                  availableFilters || {
                    courses: [],
                    interests: [],
                    institutions: [],
                    levels: [],
                  }
                }
              />

              {/* Active Search / Result Feedback */}
              {searchQuery && (
                <div className="flex items-center justify-between text-xs text-text-muted">
                  <p>
                    Results for <span className="text-white font-semibold">"{searchQuery}"</span>
                    {totalStudentsCount !== undefined && (
                      <span> • {totalStudentsCount} student{totalStudentsCount === 1 ? "" : "s"} found</span>
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleSearchChange("")}
                    className="text-brand-mint hover:underline"
                  >
                    Clear query
                  </button>
                </div>
              )}

              {/* Error State */}
              {isDiscoverError ? (
                <NetworkErrorState
                  title="We couldn't load students."
                  message="Please check your connection or try again."
                  onRetry={refetchDiscover}
                />
              ) : isDiscoverLoading && accumulatedStudents.length === 0 ? (
                /* Initial / Searching Skeleton */
                <DiscoverSkeleton count={8} />
              ) : accumulatedStudents.length > 0 ? (
                /* Student Discovery Grid */
                <div className="space-y-8">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {accumulatedStudents.map((student) => (
                      <StudentCard
                        key={student.id}
                        student={student}
                        onPreview={setSelectedStudent}
                      />
                    ))}
                  </div>

              {/* Load More Pagination */}
              {hasNextPage && (
                <div className="flex justify-center pt-2">
                  <button
                    type="button"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/[0.1] bg-white/[0.04] px-6 py-3 text-xs font-bold text-white hover:border-brand-mint/40 hover:bg-white/[0.08] transition-all focus-ring disabled:opacity-50"
                  >
                    {isFetchingNextPage ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-brand-mint" />
                        <span>Loading...</span>
                      </>
                    ) : (
                      <span>Load More Students</span>
                    )}
                  </button>
                </div>
              )}
            </div>
          ) : searchQuery ? (
            /* Empty Search Results */
            <NetworkEmptyState
              icon={SearchX}
              title="No students found"
              description={`No students match "${searchQuery}". Try searching by a different name, username, course, or learning interest.`}
              action={() => handleSearchChange("")}
              actionLabel="Clear Search"
            />
          ) : hasActiveFilters ? (
            /* Empty Filtered Results */
            <NetworkEmptyState
              icon={FilterX}
              title="No students match these filters"
              description="Try adjusting or clearing your filters to discover more students in the network."
              action={handleClearAllFilters}
              actionLabel="Clear Filters"
            />
          ) : (
            /* Empty Directory Default */
            <NetworkEmptyState
              icon={Users}
              title="Student directory is quiet"
              description="Check back soon as more learners join the Zeitnah network."
            />
          )}
        </>
      )}
    </div>
  )}

      {/* ── COMMUNITIES TAB (PHASE 6) ── */}
      {activeTab === "communities" && (
        <div className="space-y-6">
          {/* Category & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {[
                { id: "all", label: "All Spaces" },
                { id: "course", label: "Courses" },
                { id: "subject", label: "Subjects" },
                { id: "interest", label: "Interests" },
                { id: "project", label: "Projects" },
                { id: "general", label: "General" },
              ].map((c) => {
                const isSelected = commType === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() =>
                      updateUrlParams({
                        commType: c.id === "all" ? null : c.id,
                        commPage: null,
                      })
                    }
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all focus-ring ${
                      isSelected
                        ? "border border-brand-mint/40 bg-brand-mint/15 text-brand-mint shadow-sm"
                        : "border border-white/[0.08] bg-white/[0.02] text-text-muted hover:text-white hover:bg-white/[0.04]"
                    }`}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>

            {/* Right Controls: My Communities toggle & Sort */}
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() =>
                  updateUrlParams({
                    myCommunities: myCommunities ? null : "true",
                    commPage: null,
                  })
                }
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all focus-ring ${
                  myCommunities
                    ? "border-brand-mint/40 bg-brand-mint/15 text-brand-mint shadow-sm"
                    : "border-white/[0.08] bg-white/[0.02] text-text-muted hover:text-white"
                }`}
              >
                {myCommunities && <Check className="h-3.5 w-3.5" />}
                <span>My Spaces</span>
              </button>

              <select
                value={commSort}
                onChange={(e) =>
                  updateUrlParams({
                    commSort:
                      e.target.value === "recommended" ? null : e.target.value,
                    commPage: null,
                  })
                }
                className="rounded-xl border border-white/[0.1] bg-[#111A29] px-3 py-1.5 text-xs font-semibold text-white focus:border-brand-mint/50 focus:outline-none"
              >
                <option value="recommended">Recommended</option>
                <option value="popular">Most Popular</option>
                <option value="newest">Newest</option>
                <option value="active">Recently Active</option>
              </select>
            </div>
          </div>

          {/* Active Search Feedback */}
          {searchQuery && (
            <div className="flex items-center justify-between text-xs text-text-muted">
              <p>
                Spaces matching{" "}
                <span className="text-white font-semibold">"{searchQuery}"</span>
                {communitiesData?.total !== undefined && (
                  <span> • {communitiesData.total} found</span>
                )}
              </p>
              <button
                type="button"
                onClick={() => handleSearchChange("")}
                className="text-brand-mint hover:underline"
              >
                Clear query
              </button>
            </div>
          )}

          {/* Communities Grid */}
          {isCommunitiesError ? (
            <NetworkErrorState
              title="Failed to load learning communities"
              message="Please check your connection and try again."
              onRetry={refetchCommunities}
            />
          ) : isCommunitiesLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <CommunityCardSkeleton key={n} />
              ))}
            </div>
          ) : communitiesData?.data && communitiesData.data.length > 0 ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {communitiesData.data.map((community) => (
                  <CommunityCard
                    key={community.id}
                    community={community}
                    onJoin={(id) => joinCommunityMutation.mutate(id)}
                    isJoining={
                      joinCommunityMutation.isPending &&
                      joinCommunityMutation.variables === community.id
                    }
                  />
                ))}
              </div>

              {/* Pagination */}
              {communitiesData.totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
                  <p className="text-xs text-text-muted">
                    Page{" "}
                    <span className="font-semibold text-white">
                      {communitiesData.page}
                    </span>{" "}
                    of{" "}
                    <span className="font-semibold text-white">
                      {communitiesData.totalPages}
                    </span>
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        updateUrlParams({
                          commPage: Math.max(1, communitiesData.page - 1),
                        })
                      }
                      disabled={communitiesData.page <= 1}
                      className="inline-flex items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-text-muted hover:text-white transition-colors disabled:opacity-40 disabled:pointer-events-none focus-ring"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      <span>Prev</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateUrlParams({
                          commPage: communitiesData.page + 1,
                        })
                      }
                      disabled={!communitiesData.hasNextPage}
                      className="inline-flex items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-text-muted hover:text-white transition-colors disabled:opacity-40 disabled:pointer-events-none focus-ring"
                    >
                      <span>Next</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <CommunityEmptyState
              title={
                searchQuery
                  ? "No matching learning spaces"
                  : myCommunities
                  ? "You haven't joined any learning spaces yet"
                  : "No learning spaces found"
              }
              description={
                searchQuery
                  ? `No spaces match "${searchQuery}". Try different keywords.`
                  : myCommunities
                  ? "Explore available communities and join one to learn with peers."
                  : "Communities will appear here as learning spaces are created."
              }
              onReset={
                searchQuery || commType !== "all" || myCommunities
                  ? () =>
                      updateUrlParams({
                        q: null,
                        commType: null,
                        myCommunities: null,
                        commPage: null,
                      })
                  : undefined
              }
            />
          )}
        </div>
      )}

      {/* ── CONNECTIONS TAB ── */}
      {activeTab === "connections" && (
        <ConnectionsList
          onPreview={(student) => setSelectedStudent(student)}
          onSwitchToDiscover={() => handleTabChange("discover")}
        />
      )}

      {/* ═══════════════════════════════════════════════
          4. MODALS (STUDENT PREVIEW & OPPORTUNITY DETAIL)
          ═══════════════════════════════════════════════ */}
      {selectedStudent && (
        <StudentProfilePreviewModal
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
        />
      )}

      {selectedOpportunity && (
        <OpportunityDetailModal
          opportunity={selectedOpportunity}
          onClose={() => setSelectedOpportunity(null)}
        />
      )}
    </div>
  );
}
