import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  Users,
  Briefcase,
  Building2,
} from "lucide-react";
import { networkApi } from "../../services/networkApi";
import { networkConnectionsService } from "../../services/networkConnectionsService";
import NetworkConnections from "../../components/network/NetworkConnections";
import OrganizationCard from "../../components/network/OrganizationCard";
import OpportunityCard from "../../components/network/OpportunityCard";
import NetworkHero from "../../components/network/NetworkHero";
import NetworkSearch from "../../components/network/NetworkSearch";
import EmptyState from "../../components/ui/EmptyState";
import { SkeletonCard } from "../../components/ui/Skeleton";

/**
 * NetworkPage Component
 * Extra-Premium Professional Discovery Center for the Zeitnah Infrastructure Ecosystem.
 *
 * Architecture:
 * - Top: Premium Network Header with live telemetry strip and unified command search.
 * - Primary Navigation: PEOPLE | OPPORTUNITIES | ORGANIZATIONS
 * - Contextual Content for each section
 * - Backward compatibility with deep links (e.g. /network?tab=connections&subTab=requests).
 * - Canonical profile identity routing safety across all children.
 */
export default function NetworkPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get("tab");
  const rawSubTab = searchParams.get("subTab") || searchParams.get("sub");

  // Tab mapping with backward compatibility
  const tabMap = {
    network: "people",
    people: "people",
    discover: "people",
    connections: "people",
    followers: "people",
    following: "people",
    requests: "people",
    overview: "people",
    spaces: "people",
    communities: "people",
    opportunities: "opportunities",
    organizations: "organizations",
  };

  const currentTab = tabMap[rawTab] || rawTab || "people";

  // Search states for individual tabs
  const [peopleHeroSearch, setPeopleHeroSearch] = useState("");
  const [oppSearch, setOppSearch] = useState("");
  const [oppWorkMode, setOppWorkMode] = useState("");
  const [orgSearch, setOrgSearch] = useState("");

  // Queries for Telemetry in Header & Tab counts
  const { data: statsData } = useQuery({
    queryKey: ["network-profile-stats", "me"],
    queryFn: () => networkConnectionsService.getProfileStats("me"),
    staleTime: 1000 * 30,
  });

  const { data: countsData } = useQuery({
    queryKey: ["network-connection-counts"],
    queryFn: () => networkConnectionsService.getConnectionCounts(),
    staleTime: 1000 * 30,
  });

  // Query directory summary count for real directory metric
  const { data: directorySummary } = useQuery({
    queryKey: ["network-people-summary-count"],
    queryFn: () => networkApi.getPeople({ limit: 1 }),
    staleTime: 1000 * 60,
  });

  // Queries for Sections
  const opportunitiesQuery = useQuery({
    queryKey: ["network-opportunities", { q: oppSearch, workMode: oppWorkMode }],
    queryFn: () => networkApi.getOpportunities({ q: oppSearch, workMode: oppWorkMode }),
    enabled: currentTab === "opportunities",
    staleTime: 1000 * 30,
  });

  const organizationsQuery = useQuery({
    queryKey: ["network-organizations", { q: orgSearch }],
    queryFn: () => networkApi.getOrganizations({ q: orgSearch }),
    enabled: currentTab === "organizations",
    staleTime: 1000 * 30,
  });

  const setPrimaryTab = (tab) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (tab === "people") {
        next.delete("tab");
      } else {
        next.set("tab", tab);
        next.delete("sub");
        next.delete("subTab");
      }
      return next;
    });
  };

  const opportunities = opportunitiesQuery.data?.opportunities || [];
  const organizations = organizationsQuery.data?.organizations || [];

  // Active label for Header Search placeholder
  const activeTabMeta = useMemo(() => {
    switch (currentTab) {
      case "opportunities":
        return { label: "Opportunities", count: opportunities.length };
      case "organizations":
        return { label: "Organizations", count: organizations.length };
      case "people":
      default:
        return { label: "People", count: statsData?.connections ?? 0 };
    }
  }, [currentTab, opportunities.length, organizations.length, statsData]);

  // Unified header search handler
  const handleHeroSearch = (query) => {
    if (currentTab === "opportunities") setOppSearch(query);
    else if (currentTab === "organizations") setOrgSearch(query);
    else setPeopleHeroSearch(query);
  };

  const currentSearchValue = useMemo(() => {
    if (currentTab === "opportunities") return oppSearch;
    if (currentTab === "organizations") return orgSearch;
    return peopleHeroSearch;
  }, [currentTab, oppSearch, orgSearch, peopleHeroSearch]);

  const isCurrentSearching = useMemo(() => {
    if (currentTab === "opportunities") return opportunitiesQuery.isFetching;
    if (currentTab === "organizations") return organizationsQuery.isFetching;
    return false;
  }, [currentTab, opportunitiesQuery.isFetching, organizationsQuery.isFetching]);

  // Handle stat click from the Header statistics strip
  const handleHeaderStatClick = (statKey) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("tab"); // Switch to People tab
      if (statKey === "connections") {
        next.set("sub", "connections");
      } else if (statKey === "requests") {
        next.set("sub", "requests");
      } else if (statKey === "followers") {
        next.set("sub", "followers");
      } else {
        next.delete("sub");
        next.delete("subTab");
      }
      return next;
    });
  };

  // Primary Navigation Tabs
  const PRIMARY_NAV = [
    {
      id: "people",
      label: "PEOPLE",
      subLabel: "Candidates & Peers",
      icon: Users,
      badge: countsData?.incomingRequestsCount > 0 ? `${countsData.incomingRequestsCount} new` : null,
      badgeColor: "bg-[#F6ED4A]/15 text-[#F6ED4A] border-[#F6ED4A]/30",
    },
    {
      id: "opportunities",
      label: "OPPORTUNITIES",
      subLabel: "Industry Roles & Jobs",
      icon: Briefcase,
      badge: opportunities.length > 0 ? `${opportunities.length}` : null,
      badgeColor: "bg-white/[0.08] text-white/80 border-white/[0.1]",
    },
    {
      id: "organizations",
      label: "ORGANIZATIONS",
      subLabel: "Consultancies & Colleges",
      icon: Building2,
      badge: organizations.length > 0 ? `${organizations.length}` : null,
      badgeColor: "bg-white/[0.08] text-white/80 border-white/[0.1]",
    },
  ];

  return (
    <div className="max-w-[1440px] mx-auto space-y-8 pb-16">
      {/* ── 1. PREMIUM NETWORK HEADER (SECTION 3 & 4) ── */}
      <NetworkHero
        searchQuery={currentSearchValue}
        onSearchChange={handleHeroSearch}
        isSearching={isCurrentSearching}
        activeTabLabel={activeTabMeta.label}
        onStatClick={handleHeaderStatClick}
        showFilterButton={false}
        stats={{
          connections: statsData?.connections ?? countsData?.connectionsCount ?? 0,
          incomingRequestsCount: countsData?.incomingRequestsCount ?? 0,
          followers: statsData?.followers ?? 0,
          directoryCount: directorySummary?.total || undefined,
        }}
      />

      {/* ── 2. NETWORK COMMAND CENTER ── */}
      <section aria-label="Network Command Center" className="space-y-6">
        {/* ── PRIMARY NAVIGATION STRIP ── */}
        <div className="relative border-b border-white/[0.08]">
          <nav
            role="tablist"
            aria-label="Primary Network Navigation"
            className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5"
          >
            {PRIMARY_NAV.map((tab) => {
              const Icon = tab.icon;
              const isActive = currentTab === tab.id;

              return (
                <button
                  key={tab.id}
                  role="tab"
                  id={`tab-${tab.id}`}
                  aria-selected={isActive}
                  aria-controls={`panel-${tab.id}`}
                  onClick={() => setPrimaryTab(tab.id)}
                  className={`group relative flex items-center gap-3 px-5 py-3.5 rounded-t-2xl font-degular-black text-sm sm:text-base tracking-wide uppercase transition-all duration-200 cursor-pointer min-h-[48px] select-none shrink-0 focus-ring ${
                    isActive
                      ? "text-white bg-[#0A0F14] border-t border-x border-white/[0.1] shadow-lg"
                      : "text-text-muted hover:text-white hover:bg-white/[0.02]"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 transition-colors shrink-0 ${
                      isActive ? "text-brand-mint" : "text-text-muted group-hover:text-white"
                    }`}
                    aria-hidden="true"
                  />
                  <span>{tab.label}</span>

                  {tab.badge && (
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold ${tab.badgeColor}`}
                    >
                      {tab.badge}
                    </span>
                  )}

                  {/* Active Bottom Mint Indicator Line */}
                  {isActive && (
                    <div className="absolute -bottom-px left-0 right-0 h-[2px] bg-brand-mint shadow-[0_0_12px_rgba(159,213,178,0.6)]" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* ── 3. TAB 1: PEOPLE & CANDIDATES ── */}
        {currentTab === "people" && (
          <div role="tabpanel" id="panel-people" aria-labelledby="tab-people">
            <NetworkConnections
              defaultTab={
                rawSubTab === "requests"
                  ? "requests"
                  : rawTab === "connections"
                  ? "connections"
                  : rawTab === "followers"
                  ? "followers"
                  : rawTab === "following"
                  ? "following"
                  : rawTab === "requests"
                  ? "requests"
                  : "people"
              }
              searchQuery={peopleHeroSearch}
              onSearchChange={setPeopleHeroSearch}
            />
          </div>
        )}

        {/* ── 4. TAB 2: OPPORTUNITIES (CAREER DISCOVERY) ── */}
        {currentTab === "opportunities" && (
          <div role="tabpanel" id="panel-opportunities" aria-labelledby="tab-opportunities" className="space-y-6">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#0A0F14] border border-white/[0.08]">
              {/* Unified Search */}
              <div className="w-full sm:max-w-md">
                <NetworkSearch
                  value={oppSearch}
                  onChange={(val) => setOppSearch(val)}
                  placeholder="Search by role, skills, or location..."
                  size="sm"
                />
              </div>

              {/* Work Mode Filters */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
                {["", "REMOTE", "HYBRID", "ONSITE"].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setOppWorkMode(mode)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer min-h-[36px] whitespace-nowrap focus-ring ${
                      oppWorkMode === mode
                        ? "bg-brand-mint text-black font-bold shadow-md shadow-brand-mint/15"
                        : "text-text-muted hover:text-white hover:bg-white/[0.04] bg-[#070B14] border border-white/[0.06]"
                    }`}
                  >
                    {mode === "" ? "All Modes" : mode}
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
                description="Verified opportunities posted by enterprise partners, consultancies, and infrastructure firms will appear here."
                action={() => {
                  setOppSearch("");
                  setOppWorkMode("");
                }}
                actionLabel="Reset Search & Filters"
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

        {/* ── 6. TAB 4: ORGANIZATIONS (DIRECTORY) ── */}
        {currentTab === "organizations" && (
          <div role="tabpanel" id="panel-organizations" aria-labelledby="tab-organizations" className="space-y-6">
            <div className="w-full sm:max-w-md">
              <NetworkSearch
                value={orgSearch}
                onChange={(val) => setOrgSearch(val)}
                placeholder="Search partner companies, consultancies, universities..."
                size="sm"
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
                action={() => setOrgSearch("")}
                actionLabel="Reset Search"
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {organizations.map((org) => (
                  <OrganizationCard key={org._id || org.slug} org={org} />
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
