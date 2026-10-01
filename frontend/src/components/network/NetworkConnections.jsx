import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import {
  Users,
  UserCheck,
  UserPlus,
  Clock,
  Compass,
  Briefcase,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  X,
} from "lucide-react";
import useDebounce from "../../hooks/useDebounce";
import { networkConnectionsService } from "../../services/networkConnectionsService";
import { networkApi } from "../../services/networkApi";
import { useToast } from "../ui/Toast";
import InfrastructurePeopleCard from "./InfrastructurePeopleCard";
import InfrastructurePeopleFilters from "./InfrastructurePeopleFilters";
import ConnectionRequestCard from "./ConnectionRequestCard";
import SendMessageRequestModal from "./SendMessageRequestModal";
import StudentProfilePreviewModal from "./StudentProfilePreviewModal";
import NetworkSearch from "./NetworkSearch";
import { getCanonicalProfileUrl } from "../../utils/roleNavigation";

/**
 * Premium skeleton matching InfrastructurePeopleCard layout
 */
function PeopleCardSkeleton() {
  return (
    <div className="relative flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#0A0F14]/90 p-5 shadow-xl animate-pulse min-h-[290px]">
      <div>
        {/* Header: Avatar + Identity */}
        <div className="flex items-start gap-3.5">
          <div className="h-14 w-14 rounded-2xl bg-white/[0.06] shrink-0" />
          <div className="min-w-0 flex-1 space-y-2 pt-0.5">
            <div className="h-4 w-3/5 rounded bg-white/[0.08]" />
            <div className="h-3 w-2/5 rounded bg-white/[0.04]" />
            <div className="h-4 w-24 rounded-full bg-white/[0.05]" />
          </div>
        </div>

        {/* Headline / Role */}
        <div className="mt-4 space-y-2">
          <div className="h-3 w-4/5 rounded bg-white/[0.06]" />
          <div className="h-3 w-2/3 rounded bg-white/[0.04]" />
        </div>

        {/* Skills pill placeholders */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          <div className="h-5 w-16 rounded-md bg-white/[0.04]" />
          <div className="h-5 w-20 rounded-md bg-white/[0.04]" />
          <div className="h-5 w-14 rounded-md bg-white/[0.04]" />
        </div>
      </div>

      {/* Footer Actions */}
      <div className="mt-6 flex items-center gap-2 pt-4 border-t border-white/[0.06]">
        <div className="h-9 flex-1 rounded-xl bg-white/[0.06]" />
        <div className="h-9 flex-1 rounded-xl bg-white/[0.04]" />
      </div>
    </div>
  );
}

/**
 * Clean skeleton for Connections / Followers / Following cards
 */
function ConnectionCardSkeleton() {
  return (
    <div className="p-5 rounded-2xl bg-[#0A0F14] border border-white/[0.08] flex flex-col justify-between gap-3 animate-pulse min-h-[140px]">
      <div className="flex items-start gap-3.5 min-w-0">
        <div className="w-13 h-13 rounded-2xl bg-white/[0.06] shrink-0" />
        <div className="min-w-0 flex-1 space-y-2 pt-0.5">
          <div className="h-4 w-3/4 rounded bg-white/[0.08]" />
          <div className="h-3 w-1/2 rounded bg-white/[0.04]" />
          <div className="h-3 w-2/3 rounded bg-white/[0.04]" />
        </div>
      </div>
      <div className="pt-3 border-t border-white/[0.04] flex items-center justify-between">
        <div className="h-3 w-24 rounded bg-white/[0.04]" />
        <div className="h-7 w-20 rounded-xl bg-white/[0.06]" />
      </div>
    </div>
  );
}

/**
 * Format integer count with locale commas
 */
function formatNumber(num) {
  if (num === null || num === undefined) return "0";
  return Number(num).toLocaleString();
}

/**
 * Format connection duration relative to now (Section 15)
 */
function formatConnectedSince(dateStr) {
  if (!dateStr) return "Connected recently";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "Connected recently";

  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 1) return "Connected today";
  if (diffDays === 1) return "Connected yesterday";
  if (diffDays < 30) return `Connected ${diffDays} days ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths === 1) return "Connected 1 month ago";
  if (diffMonths < 12) return `Connected ${diffMonths} months ago`;
  const diffYears = Math.floor(diffDays / 365);
  return `Connected ${diffYears > 1 ? `${diffYears} years` : "1 year"} ago`;
}

/**
 * Derives user initials
 */
function getInitials(name) {
  if (!name) return "ZU";
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const VALID_TABS = ["people", "discover", "connections", "followers", "following", "requests"];

/**
 * NetworkConnections Component
 * Contextual People management view inside the Zeitnah Network Command Center.
 *
 * Implements:
 * - Section 5: People You May Know discovery grid
 * - Section 6: Restrained card interactions
 * - Section 8: Dedicated, compact connection requests inbox
 * - Section 9: My Network connections view
 * - Section 10: Standardized search and skeletal states
 * - Section 11: Structured infrastructure filters
 * - Section 25: Canonical profile routing safety
 */
export default function NetworkConnections({
  defaultTab = "people",
  searchQuery: externalSearchQuery,
  onSearchChange: externalOnSearchChange,
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // Support subTab, sub, view, networkTab
  const rawSub =
    searchParams.get("subTab") ||
    searchParams.get("sub") ||
    searchParams.get("view") ||
    searchParams.get("networkTab");

  const resolvedSub = VALID_TABS.includes(rawSub) ? rawSub : defaultTab || "people";
  const subTab = resolvedSub === "discover" ? "people" : resolvedSub;

  const [requestsSubTab, setRequestsSubTab] = useState("incoming"); // 'incoming' | 'outgoing'
  const [internalSearchQuery, setInternalSearchQuery] = useState("");
  const activeSearch = externalSearchQuery !== undefined ? externalSearchQuery : internalSearchQuery;
  const debouncedSearch = useDebounce(activeSearch, 300);

  const handleSearchChange = (val) => {
    setInternalSearchQuery(val);
    externalOnSearchChange?.(val);
    setPage(1);
  };

  const [confirmRemoveId, setConfirmRemoveId] = useState(null);

  const [infraFilters, setInfraFilters] = useState({
    role: "all",
    discipline: "",
    specialization: "",
    sector: "",
    software: "",
    skill: "",
    experience: "",
    location: "",
    institution: "",
    company: "",
  });

  const [selectedPreviewPerson, setSelectedPreviewPerson] = useState(null);
  const [messageRequestRecipient, setMessageRequestRecipient] = useState(null);
  const [page, setPage] = useState(1);

  // Authoritative Network Stats for Tab Badges
  const { data: statsData } = useQuery({
    queryKey: ["network-profile-stats", "me"],
    queryFn: () => networkConnectionsService.getProfileStats("me"),
    staleTime: 1000 * 30,
  });

  // Authoritative Requests Count
  const { data: countsData } = useQuery({
    queryKey: ["network-connection-counts"],
    queryFn: () => networkConnectionsService.getConnectionCounts(),
    staleTime: 1000 * 30,
  });

  // 1. My Connections Query
  const connectionsQuery = useQuery({
    queryKey: ["network-connections-list", page, debouncedSearch],
    queryFn: () =>
      networkConnectionsService.getUserConnections("me", {
        page,
        limit: 12,
        q: debouncedSearch,
      }),
    enabled: subTab === "connections",
    staleTime: 1000 * 20,
  });

  // 2. Followers Query
  const followersQuery = useQuery({
    queryKey: ["network-followers-list", page, debouncedSearch],
    queryFn: () =>
      networkConnectionsService.getUserFollowers("me", {
        page,
        limit: 12,
        q: debouncedSearch,
      }),
    enabled: subTab === "followers",
    staleTime: 1000 * 20,
  });

  // 3. Following Query
  const followingQuery = useQuery({
    queryKey: ["network-following-list", page, debouncedSearch],
    queryFn: () =>
      networkConnectionsService.getUserFollowing("me", {
        page,
        limit: 12,
        q: debouncedSearch,
      }),
    enabled: subTab === "following",
    staleTime: 1000 * 20,
  });

  // 4. Requests Query
  const requestsQuery = useQuery({
    queryKey: ["network-requests"],
    queryFn: () => networkApi.getPendingRequests(),
    enabled: subTab === "requests",
    staleTime: 1000 * 15,
  });

  // 5. Discover People Query
  const peopleQuery = useQuery({
    queryKey: ["network-people", { q: debouncedSearch, ...infraFilters, page }],
    queryFn: () => networkApi.getPeople({ q: debouncedSearch, ...infraFilters, page }),
    enabled: subTab === "people",
    staleTime: 1000 * 20,
  });

  // Cache Invalidation
  const invalidateAllNetwork = () => {
    queryClient.invalidateQueries({ queryKey: ["network-connections-list"] });
    queryClient.invalidateQueries({ queryKey: ["network-followers-list"] });
    queryClient.invalidateQueries({ queryKey: ["network-following-list"] });
    queryClient.invalidateQueries({ queryKey: ["network-requests"] });
    queryClient.invalidateQueries({ queryKey: ["network-sent"] });
    queryClient.invalidateQueries({ queryKey: ["network-people"] });
    queryClient.invalidateQueries({ queryKey: ["network-connections"] });
    queryClient.invalidateQueries({ queryKey: ["network-profile-stats"] });
    queryClient.invalidateQueries({ queryKey: ["network-connection-counts"] });
    queryClient.invalidateQueries({ queryKey: ["network-profile"] });
    queryClient.invalidateQueries({ queryKey: ["network-stats"] });
    queryClient.invalidateQueries({ queryKey: ["network-people-summary-count"] });
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
      toast.success(
        follow ? "Following" : "Unfollowed",
        follow ? `Now following ${name || "user"}.` : `Unfollowed ${name || "user"}.`
      );
      invalidateAllNetwork();
    },
    onError: (err) => {
      toast.error("Action Failed", err?.response?.data?.message || "Could not update follow state.");
    },
  });

  // Accept Request Mutation
  const acceptRequestMutation = useMutation({
    mutationFn: (requestId) => networkConnectionsService.acceptRequest(requestId),
    onSuccess: () => {
      toast.success("Connection Accepted", "You are now connected!");
      invalidateAllNetwork();
    },
    onError: (err) => {
      toast.error("Accept Failed", err?.response?.data?.message || "Could not accept connection request.");
    },
  });

  // Reject / Decline Request Mutation
  const declineRequestMutation = useMutation({
    mutationFn: (requestId) => networkConnectionsService.declineRequest(requestId),
    onSuccess: () => {
      toast.info("Request Declined", "Connection request removed.");
      invalidateAllNetwork();
    },
    onError: (err) => {
      toast.error("Decline Failed", err?.response?.data?.message || "Could not decline request.");
    },
  });

  // Cancel Outgoing Request Mutation
  const cancelRequestMutation = useMutation({
    mutationFn: (requestId) => networkConnectionsService.cancelRequest(requestId),
    onSuccess: () => {
      toast.info("Request Cancelled", "Connection request cancelled.");
      invalidateAllNetwork();
    },
    onError: (err) => {
      toast.error("Cancel Failed", err?.response?.data?.message || "Could not cancel request.");
    },
  });

  // Remove Connection Mutation (Inline confirmation)
  const removeConnectionMutation = useMutation({
    mutationFn: (connectionIdOrUserId) =>
      networkConnectionsService.removeConnection(connectionIdOrUserId),
    onSuccess: () => {
      setConfirmRemoveId(null);
      toast.info("Connection Removed", "Connection removed successfully.");
      invalidateAllNetwork();
    },
    onError: (err) => {
      toast.error("Remove Failed", err?.response?.data?.message || "Could not remove connection.");
    },
  });

  const connectionsCount = statsData?.connections ?? countsData?.connectionsCount ?? 0;
  const followersCount = statsData?.followers ?? 0;
  const followingCount = statsData?.following ?? 0;
  const incomingRequestsCount =
    countsData?.incomingRequestsCount ?? requestsQuery.data?.incoming?.length ?? 0;
  const outgoingRequestsCount =
    countsData?.outgoingRequestsCount ?? requestsQuery.data?.outgoing?.length ?? 0;

  const handleTabChange = (newTab) => {
    handleSearchChange("");
    setPage(1);
    setConfirmRemoveId(null);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (newTab === "people") {
          next.delete("sub");
          next.delete("subTab");
          next.delete("networkTab");
          next.delete("view");
        } else {
          next.set("sub", newTab);
          next.delete("subTab");
        }
        return next;
      },
      { replace: true }
    );
  };

  return (
    <div className="space-y-6">
      {/* ── 1. Contextual Secondary Segmented Navigation Strip (Section 13) ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.06]">
        {/* Sub-tab segmented bar */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.02] border border-white/[0.06] overflow-x-auto no-scrollbar scroll-smooth">
          {[
            { id: "people", label: "Discover", icon: Compass },
            { id: "connections", label: "Connections", count: connectionsCount, icon: UserCheck },
            {
              id: "requests",
              label: "Requests",
              count: incomingRequestsCount,
              icon: Clock,
              hasAttention: incomingRequestsCount > 0,
            },
            { id: "followers", label: "Followers", count: followersCount, icon: Users },
            { id: "following", label: "Following", count: followingCount, icon: UserPlus },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = subTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer min-h-[36px] focus-ring ${
                  isActive
                    ? "bg-white/[0.08] text-white font-bold border border-white/[0.08] shadow-sm"
                    : "text-text-muted hover:text-white hover:bg-white/[0.03]"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-brand-mint" : "text-text-muted"}`} />
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                      isActive
                        ? "bg-white/20 text-white"
                        : tab.hasAttention
                        ? "bg-amber-400/15 text-amber-200 border border-amber-400/25"
                        : "bg-white/[0.06] text-text-muted"
                    }`}
                  >
                    {formatNumber(tab.count)}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Local Search for Connections / Followers / Following */}
        {subTab !== "people" && subTab !== "requests" && (
          <div className="w-full sm:w-72">
            <NetworkSearch
              value={activeSearch}
              onChange={handleSearchChange}
              placeholder={`Filter ${subTab}...`}
              size="sm"
            />
          </div>
        )}
      </div>

      {/* ── 2. TAB 1: PEOPLE DISCOVERY ("PEOPLE YOU MAY KNOW") ── */}
      {subTab === "people" && (
        <section aria-labelledby="people-discovery-heading" className="space-y-6">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 id="people-discovery-heading" className="text-xl sm:text-2xl font-heading font-extrabold text-white tracking-tight">
                People You May Know
              </h2>
              <p className="text-xs text-text-muted mt-0.5 font-medium">
                Verified infrastructure engineers, faculty mentors, and peers across civil disciplines.
              </p>
            </div>

            {peopleQuery.data?.total !== undefined && (
              <span className="text-xs font-mono text-text-muted bg-white/[0.03] border border-white/[0.06] px-3 py-1 rounded-xl shrink-0 self-start sm:self-auto">
                <span className="text-white font-bold">{formatNumber(peopleQuery.data.total)}</span>{" "}
                {peopleQuery.data.total === 1 ? "profile available" : "profiles available"}
              </span>
            )}
          </div>

          {/* Infrastructure Structured Filters */}
          <InfrastructurePeopleFilters
            filters={infraFilters}
            onChange={(nextFilters) => {
              setInfraFilters(nextFilters);
              setPage(1);
            }}
            onFilterChange={(nextFilters) => {
              setInfraFilters(nextFilters);
              setPage(1);
            }}
            onReset={() => {
              setInfraFilters({
                role: "all",
                discipline: "",
                specialization: "",
                sector: "",
                software: "",
                skill: "",
                experience: "",
                location: "",
                institution: "",
                company: "",
              });
              setPage(1);
            }}
          />

          {/* People Grid */}
          {peopleQuery.isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <PeopleCardSkeleton key={i} />
              ))}
            </div>
          ) : peopleQuery.isError ? (
            <div className="p-10 rounded-3xl bg-rose-500/5 border border-rose-500/20 text-center max-w-md mx-auto">
              <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-white">Failed to load directory</p>
              <p className="text-xs text-text-muted mt-1 leading-relaxed">
                Could not retrieve candidates at this time. Please check your connection.
              </p>
              <button
                type="button"
                onClick={() => peopleQuery.refetch()}
                className="btn-secondary mt-4 text-xs py-2 px-4 cursor-pointer inline-flex items-center gap-1.5 focus-ring"
              >
                Try Again
              </button>
            </div>
          ) : (peopleQuery.data?.people || []).length === 0 ? (
            <div className="p-14 sm:p-16 rounded-3xl bg-[#0A0F14] border border-white/[0.06] text-center max-w-lg mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-4 text-text-muted">
                <Compass className="w-7 h-7 text-brand-mint/80" />
              </div>
              <h3 className="font-heading font-bold text-lg text-white">
                {debouncedSearch ? "No people found" : "No matching professionals"}
              </h3>
              <p className="text-xs text-text-muted mt-1 leading-relaxed max-w-sm mx-auto">
                {debouncedSearch
                  ? `No members found matching "${debouncedSearch}". Try a different name, role, or search term.`
                  : "Try clearing or adjusting disciplines, sectors, or software tags."}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 mt-5">
                <button
                  type="button"
                  onClick={() => {
                    handleSearchChange("");
                    setInfraFilters({
                      role: "all",
                      discipline: "",
                      specialization: "",
                      sector: "",
                      software: "",
                      skill: "",
                      experience: "",
                      location: "",
                      institution: "",
                      company: "",
                    });
                    setPage(1);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-bold text-white transition-colors cursor-pointer focus-ring"
                >
                  Reset All Filters
                </button>
                {activeSearch && (
                  <button
                    type="button"
                    onClick={() => handleSearchChange("")}
                    className="px-4 py-2.5 rounded-xl bg-brand-mint/10 text-brand-mint border border-brand-mint/30 hover:bg-brand-mint/20 text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5 focus-ring"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Clear Search</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {(peopleQuery.data?.people || []).map((person) => (
                <InfrastructurePeopleCard
                  key={person._id || person.id}
                  person={person}
                  onPreview={(p) => setSelectedPreviewPerson(p)}
                  onMessageRequest={(p) => setMessageRequestRecipient(p)}
                />
              ))}
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
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white/[0.04] hover:bg-white/[0.08] text-white disabled:opacity-40 cursor-pointer min-h-[36px] focus-ring"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= peopleQuery.data?.totalPages}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white/[0.04] hover:bg-white/[0.08] text-white disabled:opacity-40 cursor-pointer min-h-[36px] focus-ring"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── 3. TAB 2: MY NETWORK (EXISTING CONNECTIONS) ── */}
      {subTab === "connections" && (
        <section aria-labelledby="connections-heading" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 id="connections-heading" className="text-xl sm:text-2xl font-heading font-extrabold text-white tracking-tight">
                My Network
              </h2>
              <p className="text-xs text-text-muted mt-0.5 font-medium">
                Verified peer connections with fellow infrastructure engineers and faculty mentors.
              </p>
            </div>
            {connectionsCount > 0 && (
              <span className="text-xs font-mono text-text-muted bg-white/[0.03] border border-white/[0.06] px-3 py-1 rounded-xl">
                <span className="text-white font-bold">{connectionsCount}</span>{" "}
                {connectionsCount === 1 ? "connection" : "connections"}
              </span>
            )}
          </div>

          {connectionsQuery.isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <ConnectionCardSkeleton key={i} />
              ))}
            </div>
          ) : connectionsQuery.isError ? (
            <div className="p-8 rounded-3xl bg-rose-500/5 border border-rose-500/20 text-center max-w-md mx-auto">
              <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-white">Failed to load connections</p>
              <button
                type="button"
                onClick={() => connectionsQuery.refetch()}
                className="btn-secondary mt-3 text-xs py-2 px-4 cursor-pointer focus-ring"
              >
                Try Again
              </button>
            </div>
          ) : (connectionsQuery.data?.data || []).length === 0 ? (
            <div className="py-20 px-6 rounded-2xl border border-white/[0.06] bg-white/[0.01] text-center max-w-md mx-auto">
              <h3 className="font-heading font-bold text-xl text-white">
                {debouncedSearch ? "No matching connections" : "Your network starts here"}
              </h3>
              <p className="text-xs text-text-muted mt-2 leading-relaxed max-w-xs mx-auto">
                {debouncedSearch
                  ? "No connections found matching your search."
                  : "Discover people across the Zeitnah community and build meaningful professional relationships."}
              </p>
              {debouncedSearch ? (
                <button
                  type="button"
                  onClick={() => handleSearchChange("")}
                  className="mt-5 px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-bold text-white transition-colors cursor-pointer inline-flex items-center gap-1.5 focus-ring"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Clear Search</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleTabChange("people")}
                  className="mt-6 px-5 py-2.5 rounded-xl bg-brand-mint text-black font-bold text-xs hover:bg-brand-mint/90 transition-all shadow-sm cursor-pointer inline-flex items-center gap-2 focus-ring"
                >
                  <Compass className="w-4 h-4" />
                  <span>Discover People</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(connectionsQuery.data?.data || []).map((conn) => {
                const connId = conn.id || conn._id;
                const profileLink = getCanonicalProfileUrl(conn);
                const role = conn.currentRole || conn.headline || "Infrastructure Professional";
                const org = conn.organization || conn.company || conn.institution || "Zeitnah Academy";
                const location =
                  conn.location ||
                  (conn.city ? `${conn.city}${conn.country ? ` · ${conn.country}` : ""}` : null);
                const connectedTime = formatConnectedSince(conn.connectedAt || conn.createdAt);

                return (
                  <div
                    key={connId}
                    className="group relative flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#0A0F14]/95 p-5 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-white/[0.16] shadow-sm hover:shadow-lg"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        {/* Avatar (56px circular) */}
                        <Link to={profileLink} className="relative shrink-0 block focus-ring rounded-full">
                          <div className="w-14 h-14 rounded-full bg-[#070B14] border border-white/[0.08] flex items-center justify-center text-brand-mint font-heading font-bold text-sm overflow-hidden transition-transform duration-200 ease-out group-hover:scale-[1.02]">
                            {conn.avatar ? (
                              <img src={conn.avatar} alt={conn.name} className="w-full h-full object-cover" />
                            ) : (
                              <span>{getInitials(conn.name)}</span>
                            )}
                          </div>
                          {conn.isVerified && (
                            <span
                              className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-mint text-black shadow-sm"
                              title="Verified Member"
                            >
                              <ShieldCheck className="h-2.5 w-2.5" />
                            </span>
                          )}
                        </Link>

                        {/* Secondary Remove Trigger */}
                        {confirmRemoveId === connId ? (
                          <div className="flex items-center gap-1.5 animate-fade-in bg-white/[0.04] p-1 rounded-xl border border-white/[0.08]">
                            <span className="text-[11px] font-medium text-text-muted px-1">Remove?</span>
                            <button
                              type="button"
                              disabled={removeConnectionMutation.isPending}
                              onClick={() => removeConnectionMutation.mutate(connId)}
                              className="px-2 py-0.5 rounded-lg bg-rose-500/20 text-rose-300 text-[11px] font-bold hover:bg-rose-500/30 transition-colors cursor-pointer"
                            >
                              Yes
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmRemoveId(null)}
                              className="px-2 py-0.5 rounded-lg bg-white/[0.06] text-text-muted hover:text-white text-[11px] font-medium transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmRemoveId(connId)}
                            className="p-1.5 rounded-lg text-text-muted/60 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer focus-ring opacity-60 group-hover:opacity-100"
                            title="Remove connection"
                            aria-label={`Remove connection with ${conn.name}`}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Identity */}
                      <div className="mt-3.5 space-y-1">
                        <Link
                          to={profileLink}
                          className="font-heading font-bold text-base text-white hover:text-brand-mint transition-colors truncate block focus-ring rounded"
                        >
                          {conn.name}
                        </Link>
                        {conn.username && (
                          <p className="text-xs font-mono text-text-muted truncate">@{conn.username}</p>
                        )}

                        {/* Role & Org */}
                        <div className="pt-1.5 text-xs text-text-secondary leading-snug">
                          <p className="font-medium text-white/90 truncate">{role}</p>
                          {org && <p className="text-text-muted truncate mt-0.5">{org}</p>}
                        </div>

                        {/* Location */}
                        {location && (
                          <p className="text-[11px] text-text-muted/80 truncate pt-1">{location}</p>
                        )}
                      </div>
                    </div>

                    {/* Footer: Connected time + Quiet Connected badge & View Profile */}
                    <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2">
                      <span className="text-[11px] font-mono text-text-muted/70 truncate">
                        {connectedTime}
                      </span>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-white/[0.08] bg-white/[0.03] text-text-secondary text-xs font-medium tracking-tight">
                          <UserCheck className="w-3 h-3 text-brand-mint" />
                          <span>Connected</span>
                        </span>

                        <Link
                          to={profileLink}
                          className="p-1.5 rounded-lg text-text-muted hover:text-white hover:bg-white/[0.04] transition-colors focus-ring"
                          title="View Profile"
                          aria-label={`View ${conn.name}'s profile`}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
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
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white/[0.04] hover:bg-white/[0.08] text-white disabled:opacity-40 cursor-pointer min-h-[36px] focus-ring"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!connectionsQuery.data?.hasNextPage}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white/[0.04] hover:bg-white/[0.08] text-white disabled:opacity-40 cursor-pointer min-h-[36px] focus-ring"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── 4. TAB 3: DEDICATED CONNECTION REQUESTS INBOX (SECTION 14) ── */}
      {subTab === "requests" && (
        <section aria-labelledby="requests-heading" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.06]">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 id="requests-heading" className="text-sm font-mono uppercase tracking-widest text-text-muted font-bold">
                  Connection Requests
                </h2>
                {incomingRequestsCount > 0 && (
                  <span className="text-xs font-mono font-bold text-amber-200 bg-amber-400/15 border border-amber-400/25 px-2 py-0.5 rounded-full">
                    {incomingRequestsCount < 10 ? `0${incomingRequestsCount}` : incomingRequestsCount}
                  </span>
                )}
              </div>
              <p className="text-xs text-text-secondary mt-1">
                Manage incoming networking inquiries and track invitations you have dispatched.
              </p>
            </div>

            {/* Sub-selector for Incoming vs Outgoing */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] self-start sm:self-auto shrink-0">
              <button
                type="button"
                onClick={() => setRequestsSubTab("incoming")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer min-h-[34px] focus-ring ${
                  requestsSubTab === "incoming"
                    ? "bg-white/[0.1] text-white font-bold border border-white/[0.08]"
                    : "text-text-muted hover:text-white"
                }`}
              >
                <span>Incoming</span>
                {incomingRequestsCount > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-white/[0.08] text-white">
                    {incomingRequestsCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setRequestsSubTab("outgoing")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer min-h-[34px] focus-ring ${
                  requestsSubTab === "outgoing"
                    ? "bg-white/[0.1] text-white font-bold border border-white/[0.08]"
                    : "text-text-muted hover:text-white"
                }`}
              >
                <span>Sent</span>
                {outgoingRequestsCount > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-white/[0.08] text-white">
                    {outgoingRequestsCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Incoming Requests View */}
          {requestsSubTab === "incoming" && (
            <div>
              {requestsQuery.isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-32 rounded-2xl bg-[#0A0F14] border border-white/[0.04] animate-pulse"
                    />
                  ))}
                </div>
              ) : (requestsQuery.data?.incoming || []).length === 0 ? (
                <div className="py-16 px-6 rounded-2xl border border-white/[0.06] bg-white/[0.01] text-center max-w-sm mx-auto">
                  <h4 className="font-heading font-bold text-base text-white">
                    You're all caught up
                  </h4>
                  <p className="text-xs text-text-muted mt-1.5 leading-relaxed">
                    New connection requests will appear here when peers invite you to connect.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(requestsQuery.data?.incoming || []).map((req) => {
                    const reqId = req.connectionId || req._id;
                    return (
                      <ConnectionRequestCard
                        key={reqId}
                        request={req}
                        type="incoming"
                        onAccept={(id) => acceptRequestMutation.mutate(id)}
                        onDecline={(id) => declineRequestMutation.mutate(id)}
                        isAccepting={acceptRequestMutation.isPending && acceptRequestMutation.variables === reqId}
                        isDeclining={declineRequestMutation.isPending && declineRequestMutation.variables === reqId}
                        onPreview={(m) => setSelectedPreviewPerson(m)}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Outgoing Requests View */}
          {requestsSubTab === "outgoing" && (
            <div>
              {requestsQuery.isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-32 rounded-2xl bg-[#0A0F14] border border-white/[0.04] animate-pulse"
                    />
                  ))}
                </div>
              ) : (requestsQuery.data?.outgoing || []).length === 0 ? (
                <div className="py-16 px-6 rounded-2xl border border-white/[0.06] bg-white/[0.01] text-center max-w-sm mx-auto">
                  <h4 className="font-heading font-bold text-base text-white">
                    No pending sent requests
                  </h4>
                  <p className="text-xs text-text-muted mt-1.5 leading-relaxed">
                    When you send connection requests, you can review and track their status here.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(requestsQuery.data?.outgoing || []).map((req) => {
                    const reqId = req.connectionId || req._id;
                    return (
                      <ConnectionRequestCard
                        key={reqId}
                        request={req}
                        type="outgoing"
                        onCancel={(id) => cancelRequestMutation.mutate(id)}
                        isCancelling={cancelRequestMutation.isPending && cancelRequestMutation.variables === reqId}
                        onPreview={(m) => setSelectedPreviewPerson(m)}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* ── 5. TAB 4: FOLLOWERS ── */}
      {subTab === "followers" && (
        <section aria-labelledby="followers-heading" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 id="followers-heading" className="text-xl sm:text-2xl font-heading font-extrabold text-white tracking-tight">
                Your Followers
              </h2>
              <p className="text-xs text-text-muted mt-0.5 font-medium">
                Engineers and students following your projects and progress.
              </p>
            </div>
            {followersCount > 0 && (
              <span className="text-xs font-mono text-text-muted bg-white/[0.03] border border-white/[0.06] px-3 py-1 rounded-xl">
                <span className="text-white font-bold">{followersCount}</span>{" "}
                {followersCount === 1 ? "follower" : "followers"}
              </span>
            )}
          </div>

          {followersQuery.isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <ConnectionCardSkeleton key={i} />
              ))}
            </div>
          ) : followersQuery.isError ? (
            <div className="p-8 rounded-3xl bg-rose-500/5 border border-rose-500/20 text-center max-w-md mx-auto">
              <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-white">Failed to load followers</p>
              <button
                type="button"
                onClick={() => followersQuery.refetch()}
                className="btn-secondary mt-3 text-xs py-2 px-4 cursor-pointer focus-ring"
              >
                Try Again
              </button>
            </div>
          ) : (followersQuery.data?.data || []).length === 0 ? (
            <div className="py-20 px-6 rounded-2xl border border-white/[0.06] bg-white/[0.01] text-center max-w-md mx-auto">
              <h3 className="font-heading font-bold text-xl text-white">
                {debouncedSearch ? "No matching followers" : "No followers yet"}
              </h3>
              <p className="text-xs text-text-muted mt-2 leading-relaxed max-w-xs mx-auto">
                {debouncedSearch
                  ? "No followers found matching your search."
                  : "When fellow students and mentors follow your learning journey, they appear here."}
              </p>
              {debouncedSearch && (
                <button
                  type="button"
                  onClick={() => handleSearchChange("")}
                  className="mt-5 px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-bold text-white transition-colors cursor-pointer inline-flex items-center gap-1.5 focus-ring"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Clear Search</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(followersQuery.data?.data || []).map((user) => {
                const profileLink = getCanonicalProfileUrl(user);
                const isFollowing = Boolean(user.isFollowing);

                return (
                  <div
                    key={user.id || user._id}
                    className="group relative flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#0A0F14]/95 p-5 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-white/[0.16] shadow-sm hover:shadow-lg"
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <Link to={profileLink} className="relative shrink-0 block focus-ring rounded-full">
                        <div className="w-14 h-14 rounded-full bg-[#070B14] border border-white/[0.08] flex items-center justify-center text-brand-mint font-heading font-bold text-sm overflow-hidden transition-transform duration-200 ease-out group-hover:scale-[1.02]">
                          {user.avatar ? (
                            <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                          ) : (
                            <span>{getInitials(user.name)}</span>
                          )}
                        </div>
                        {user.isVerified && (
                          <span
                            className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-mint text-black shadow-sm"
                            title="Verified Member"
                          >
                            <ShieldCheck className="h-2.5 w-2.5" />
                          </span>
                        )}
                      </Link>

                      <div className="min-w-0 flex-1">
                        <Link
                          to={profileLink}
                          className="font-heading font-bold text-base text-white hover:text-brand-mint transition-colors truncate block focus-ring rounded"
                        >
                          {user.name}
                        </Link>
                        {user.username && (
                          <p className="text-xs font-mono text-text-muted truncate">@{user.username}</p>
                        )}
                        {user.headline && (
                          <p className="text-xs text-text-muted truncate mt-1">{user.headline}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-white/[0.06] gap-2 mt-4">
                      <Link
                        to={profileLink}
                        className="px-3 py-1.5 rounded-lg text-text-muted hover:text-white hover:bg-white/[0.04] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors focus-ring"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-text-muted" />
                        <span>Profile</span>
                      </Link>

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
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[34px] focus-ring ${
                          isFollowing
                            ? "bg-white/[0.08] hover:bg-rose-500/15 text-white hover:text-rose-300 border border-white/10"
                            : "bg-brand-mint text-black hover:bg-brand-mint/90 shadow-sm shadow-brand-mint/20"
                        }`}
                      >
                        {isFollowing ? "Following" : "Follow Back"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ── 6. TAB 5: FOLLOWING ── */}
      {subTab === "following" && (
        <section aria-labelledby="following-heading" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 id="following-heading" className="text-xl sm:text-2xl font-heading font-extrabold text-white tracking-tight">
                People You Follow
              </h2>
              <p className="text-xs text-text-muted mt-0.5 font-medium">
                Stay updated on designs, contributions, and updates from peers you track.
              </p>
            </div>
            {followingCount > 0 && (
              <span className="text-xs font-mono text-text-muted bg-white/[0.03] border border-white/[0.06] px-3 py-1 rounded-xl">
                <span className="text-white font-bold">{followingCount}</span>{" "}
                {followingCount === 1 ? "person" : "people"}
              </span>
            )}
          </div>

          {followingQuery.isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <ConnectionCardSkeleton key={i} />
              ))}
            </div>
          ) : followingQuery.isError ? (
            <div className="p-8 rounded-3xl bg-rose-500/5 border border-rose-500/20 text-center max-w-md mx-auto">
              <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-white">Failed to load following list</p>
              <button
                type="button"
                onClick={() => followingQuery.refetch()}
                className="btn-secondary mt-3 text-xs py-2 px-4 cursor-pointer focus-ring"
              >
                Try Again
              </button>
            </div>
          ) : (followingQuery.data?.data || []).length === 0 ? (
            <div className="py-20 px-6 rounded-2xl border border-white/[0.06] bg-white/[0.01] text-center max-w-md mx-auto">
              <h3 className="font-heading font-bold text-xl text-white">
                {debouncedSearch ? "No matching users" : "You are not following anyone yet"}
              </h3>
              <p className="text-xs text-text-muted mt-2 leading-relaxed max-w-xs mx-auto">
                Follow peers, faculty mentors, and industry practitioners to see their contributions.
              </p>
              {debouncedSearch ? (
                <button
                  type="button"
                  onClick={() => handleSearchChange("")}
                  className="mt-5 px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-bold text-white transition-colors cursor-pointer inline-flex items-center gap-1.5 focus-ring"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Clear Search</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleTabChange("people")}
                  className="mt-6 px-5 py-2.5 rounded-xl bg-brand-mint text-black font-bold text-xs hover:bg-brand-mint/90 transition-all shadow-sm cursor-pointer inline-flex items-center gap-2 focus-ring"
                >
                  <Compass className="w-4 h-4" />
                  <span>Explore Directory</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(followingQuery.data?.data || []).map((user) => {
                const profileLink = getCanonicalProfileUrl(user);

                return (
                  <div
                    key={user.id || user._id}
                    className="group relative flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#0A0F14]/95 p-5 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-white/[0.16] shadow-sm hover:shadow-lg"
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <Link to={profileLink} className="relative shrink-0 block focus-ring rounded-full">
                        <div className="w-14 h-14 rounded-full bg-[#070B14] border border-white/[0.08] flex items-center justify-center text-brand-mint font-heading font-bold text-sm overflow-hidden transition-transform duration-200 ease-out group-hover:scale-[1.02]">
                          {user.avatar ? (
                            <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                          ) : (
                            <span>{getInitials(user.name)}</span>
                          )}
                        </div>
                        {user.isVerified && (
                          <span
                            className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-mint text-black shadow-sm"
                            title="Verified Member"
                          >
                            <ShieldCheck className="h-2.5 w-2.5" />
                          </span>
                        )}
                      </Link>

                      <div className="min-w-0 flex-1">
                        <Link
                          to={profileLink}
                          className="font-heading font-bold text-base text-white hover:text-brand-mint transition-colors truncate block focus-ring rounded"
                        >
                          {user.name}
                        </Link>
                        {user.username && (
                          <p className="text-xs font-mono text-text-muted truncate">@{user.username}</p>
                        )}
                        {user.headline && (
                          <p className="text-xs text-text-muted truncate mt-1">{user.headline}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-white/[0.06] gap-2 mt-4">
                      <Link
                        to={profileLink}
                        className="px-3 py-1.5 rounded-lg text-text-muted hover:text-white hover:bg-white/[0.04] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors focus-ring"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-text-muted" />
                        <span>Profile</span>
                      </Link>

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
                        className="px-3.5 py-1.5 rounded-xl bg-white/[0.08] hover:bg-rose-500/15 text-white hover:text-rose-300 border border-white/10 text-xs font-bold transition-all cursor-pointer min-h-[34px] focus-ring"
                      >
                        Unfollow
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ── Modals: Lightweight Profile Preview & Message Request ── */}
      {selectedPreviewPerson && (
        <StudentProfilePreviewModal
          student={selectedPreviewPerson}
          onClose={() => setSelectedPreviewPerson(null)}
          onMessageRequest={(p) => setMessageRequestRecipient(p)}
        />
      )}

      {messageRequestRecipient && (
        <SendMessageRequestModal
          recipient={messageRequestRecipient}
          onClose={() => setMessageRequestRecipient(null)}
          onSuccess={() => {
            peopleQuery.refetch();
          }}
        />
      )}
    </div>
  );
}
