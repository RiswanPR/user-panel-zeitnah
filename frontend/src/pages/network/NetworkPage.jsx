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
import { Users, SearchX, FilterX, Loader2, ChevronLeft, ChevronRight, Check } from "lucide-react";

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

  const [selectedStudent, setSelectedStudent] = useState(null);

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
    updateUrlParams({ q: q || null });
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
    <div className="space-y-6 sm:space-y-8">
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
              placeholder="Search students, usernames, interests..."
            />
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════
          3. TAB CONTENT
          ═══════════════════════════════════════════════ */}

      {/* ── OVERVIEW TAB ── */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
          {/* Suggested Students Column */}
          <div className="lg:col-span-2 space-y-6">
            <SuggestedStudents
              students={overviewStudents}
              loading={isOverviewLoading}
              title="Suggested for you"
              description="People you may want to connect with."
              showFilterChips={false}
            />
          </div>

          {/* Network Activity Column */}
          <div className="lg:col-span-1 space-y-6">
            <NetworkActivity
              onExploreDiscover={() => handleTabChange("discover")}
            />
          </div>
        </div>
      )}

      {/* ── DISCOVER TAB (PHASE 2 DIRECTORY) ── */}
      {activeTab === "discover" && (
        <div className="space-y-6">
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
          4. STUDENT PROFILE PREVIEW MODAL
          ═══════════════════════════════════════════════ */}
      {selectedStudent && (
        <StudentProfilePreviewModal
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
        />
      )}
    </div>
  );
}
