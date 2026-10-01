import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
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
  Sparkles,
  X,
  Check,
} from "lucide-react";
import useDebounce from "../../hooks/useDebounce";
import { networkConnectionsService } from "../../services/networkConnectionsService";
import { networkApi } from "../../services/networkApi";
import { useToast } from "../ui/Toast";
import InfrastructurePeopleCard from "./InfrastructurePeopleCard";
import InfrastructurePeopleFilters from "./InfrastructurePeopleFilters";
import SendMessageRequestModal from "./SendMessageRequestModal";
import StudentProfilePreviewModal from "./StudentProfilePreviewModal";
import NetworkSearch from "./NetworkSearch";
import { getCanonicalProfileUrl } from "../../utils/roleNavigation";

/**
 * Premium skeleton matching InfrastructurePeopleCard layout
 */
function PeopleCardSkeleton() {
  return (
    <div className="relative flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#0A0F14]/90 p-5 shadow-xl animate-pulse">
      <div>
        {/* Header: Avatar + Identity */}
        <div className="flex items-start gap-3.5">
          <div className="h-13 w-13 rounded-2xl bg-white/[0.06] shrink-0" />
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
        <div className="h-8 flex-1 rounded-xl bg-white/[0.06]" />
        <div className="h-8 w-24 rounded-xl bg-white/[0.04]" />
      </div>
    </div>
  );
}

/**
 * Clean skeleton for Connections / Followers / Following cards
 */
function ConnectionCardSkeleton() {
  return (
    <div className="p-5 rounded-2xl bg-[#0A0F14] border border-white/[0.08] flex flex-col justify-between gap-3 animate-pulse">
      <div className="flex items-start gap-3.5 min-w-0">
        <div className="w-12 h-12 rounded-2xl bg-white/[0.06] shrink-0" />
        <div className="min-w-0 flex-1 space-y-2 pt-0.5">
          <div className="h-3.5 w-3/4 rounded bg-white/[0.08]" />
          <div className="h-2.5 w-1/2 rounded bg-white/[0.04]" />
          <div className="h-2.5 w-2/3 rounded bg-white/[0.04]" />
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
 * Requirements Met:
 * - Clear secondary navigation clearly distinct from the top primary navigation.
 * - Deep-link support for subTab, sub, view, and networkTab.
 * - Clean optimistic mutations with zero native confirm() / alert().
 * - Requests inbox view with Accept/Decline and Pending/Cancel.
 * - Integrated standardized NetworkSearch and InfrastructurePeopleFilters.
 */
export default function NetworkConnections({
  defaultTab = "people",
  searchQuery: externalSearchQuery,
  onSearchChange: externalOnSearchChange,
}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
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

  // Authoritative Network Stats for Tab Badges & Metric Cards
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
    queryClient.invalidateQueries({ queryKey: ["network-people"] });
    queryClient.invalidateQueries({ queryKey: ["network-profile-stats"] });
    queryClient.invalidateQueries({ queryKey: ["network-connection-counts"] });
    queryClient.invalidateQueries({ queryKey: ["network-profile"] });
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

  // Send Connection Request Mutation
  const sendRequestMutation = useMutation({
    mutationFn: (recipientId) => networkConnectionsService.connectUser(recipientId),
    onSuccess: () => {
      toast.success("Request Sent", "Connection request sent successfully.");
      invalidateAllNetwork();
    },
    onError: (err) => {
      toast.error("Unable to Connect", err?.response?.data?.message || "Could not send connection request.");
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

  // Remove Connection Mutation (Zero native confirm)
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
    <div className="space-y-8">
      {/* ── 1. "Your Network" Interactive Telemetry Cards ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-text-muted">
              Live Network Metrics
            </h2>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-brand-mint/10 text-brand-mint border border-brand-mint/20">
              <Sparkles className="w-2.5 h-2.5" />
              Real-time
            </span>
          </div>
          <span className="text-[11px] text-text-muted font-medium hidden sm:inline-block">
            Select any metric to filter members & manage requests
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {/* 1. Connections Metric Card */}
          <button
            type="button"
            onClick={() => handleTabChange("connections")}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer group ${
              subTab === "connections"
                ? "bg-[#0A0F14] border-brand-mint/60 shadow-[0_4px_24px_rgba(159,213,178,0.12)] ring-1 ring-brand-mint/30"
                : "bg-[#070B14] border-white/[0.08] hover:bg-[#0A0F14] hover:border-white/[0.16]"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-muted group-hover:text-white transition-colors">
                Connections
              </span>
              <div
                className={`p-2 rounded-xl transition-colors ${
                  subTab === "connections"
                    ? "bg-brand-mint/20 text-brand-mint"
                    : "bg-white/[0.04] text-text-muted"
                }`}
              >
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-heading font-black text-white">
              {formatNumber(connectionsCount)}
            </p>
            <p className="text-[10px] text-text-muted mt-0.5 font-medium">Verified peer bonds</p>
          </button>

          {/* 2. Followers Metric Card */}
          <button
            type="button"
            onClick={() => handleTabChange("followers")}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer group ${
              subTab === "followers"
                ? "bg-[#0A0F14] border-brand-mint/60 shadow-[0_4px_24px_rgba(159,213,178,0.12)] ring-1 ring-brand-mint/30"
                : "bg-[#070B14] border-white/[0.08] hover:bg-[#0A0F14] hover:border-white/[0.16]"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-muted group-hover:text-white transition-colors">
                Followers
              </span>
              <div
                className={`p-2 rounded-xl transition-colors ${
                  subTab === "followers"
                    ? "bg-brand-mint/20 text-brand-mint"
                    : "bg-white/[0.04] text-text-muted"
                }`}
              >
                <Users className="w-4 h-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-heading font-black text-white">
              {formatNumber(followersCount)}
            </p>
            <p className="text-[10px] text-text-muted mt-0.5 font-medium">Following your work</p>
          </button>

          {/* 3. Following Metric Card */}
          <button
            type="button"
            onClick={() => handleTabChange("following")}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer group ${
              subTab === "following"
                ? "bg-[#0A0F14] border-brand-mint/60 shadow-[0_4px_24px_rgba(159,213,178,0.12)] ring-1 ring-brand-mint/30"
                : "bg-[#070B14] border-white/[0.08] hover:bg-[#0A0F14] hover:border-white/[0.16]"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-muted group-hover:text-white transition-colors">
                Following
              </span>
              <div
                className={`p-2 rounded-xl transition-colors ${
                  subTab === "following"
                    ? "bg-brand-mint/20 text-brand-mint"
                    : "bg-white/[0.04] text-text-muted"
                }`}
              >
                <UserPlus className="w-4 h-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-heading font-black text-white">
              {formatNumber(followingCount)}
            </p>
            <p className="text-[10px] text-text-muted mt-0.5 font-medium">Engineers you track</p>
          </button>

          {/* 4. Requests Metric Card */}
          <button
            type="button"
            onClick={() => handleTabChange("requests")}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer group ${
              subTab === "requests"
                ? "bg-[#0A0F14] border-brand-mint/60 shadow-[0_4px_24px_rgba(159,213,178,0.12)] ring-1 ring-brand-mint/30"
                : "bg-[#070B14] border-white/[0.08] hover:bg-[#0A0F14] hover:border-white/[0.16]"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-muted group-hover:text-white transition-colors">
                Requests Inbox
              </span>
              <div
                className={`p-2 rounded-xl transition-colors ${
                  subTab === "requests"
                    ? "bg-brand-mint/20 text-brand-mint"
                    : incomingRequestsCount > 0
                    ? "bg-[#F6ED4A]/15 text-[#F6ED4A]"
                    : "bg-white/[0.04] text-text-muted"
                }`}
              >
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
            <p className="text-[10px] text-text-muted mt-0.5 font-medium">
              {incomingRequestsCount > 0 ? "Awaiting review" : "Inbox zero"}
            </p>
          </button>
        </div>
      </div>

      {/* ── 2. Contextual Secondary Navigation Bar (Distinct & Subordinate) ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.06]">
        {/* Sub-tab segmented bar */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0A0F14] border border-white/[0.08] overflow-x-auto no-scrollbar">
          {[
            { id: "people", label: "Discover", icon: Compass },
            { id: "connections", label: "Connections", count: connectionsCount, icon: UserCheck },
            { id: "followers", label: "Followers", count: followersCount, icon: Users },
            { id: "following", label: "Following", count: followingCount, icon: UserPlus },
            {
              id: "requests",
              label: "Requests",
              count: incomingRequestsCount,
              icon: Clock,
              hasAttention: incomingRequestsCount > 0,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = subTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? "bg-white/10 text-white font-bold shadow-sm border border-white/10"
                    : "text-text-muted hover:text-white hover:bg-white/[0.03]"
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                      isActive
                        ? "bg-white/20 text-white"
                        : tab.hasAttention
                        ? "bg-[#F6ED4A]/20 text-[#F6ED4A] font-bold"
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

        {/* Search for people / connections / followers / following */}
        {subTab !== "requests" && (
          <div className="w-full sm:w-80">
            <NetworkSearch
              value={activeSearch}
              onChange={handleSearchChange}
              placeholder={
                subTab === "people"
                  ? "Search by name, role, skill, or company..."
                  : `Search ${subTab}...`
              }
              size="sm"
            />
          </div>
        )}
      </div>

      {/* ── 3. DISCOVER PEOPLE (PRIMARY TAB) ── */}
      {subTab === "people" && (
        <div className="space-y-6">
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

          {/* Directory Count Header */}
          <div className="flex items-center justify-between text-xs text-text-muted pt-1">
            <span>Verified infrastructure candidates, mentors, and engineers</span>
            {peopleQuery.data?.total !== undefined && (
              <span className="font-mono text-white/80">
                {peopleQuery.data.total} {peopleQuery.data.total === 1 ? "profile" : "profiles"}
              </span>
            )}
          </div>

          {/* People Grid */}
          {peopleQuery.isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <PeopleCardSkeleton key={i} />
              ))}
            </div>
          ) : peopleQuery.isError ? (
            <div className="p-10 rounded-2xl bg-danger/5 border border-danger/20 text-center">
              <AlertCircle className="w-8 h-8 text-danger mx-auto mb-2" />
              <p className="text-sm font-bold text-white">Failed to load directory</p>
              <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
                Could not retrieve candidates at this time. Please check your connection.
              </p>
              <button
                type="button"
                onClick={() => peopleQuery.refetch()}
                className="btn-secondary mt-3 text-xs py-2 px-4 cursor-pointer inline-flex items-center gap-1.5"
              >
                Try Again
              </button>
            </div>
          ) : (peopleQuery.data?.people || []).length === 0 ? (
            <div className="p-16 rounded-3xl bg-[#0A0F14] border border-white/[0.06] text-center max-w-lg mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-4 text-text-muted">
                <Compass className="w-7 h-7" />
              </div>
              <h3 className="font-heading font-bold text-lg text-white">
                {debouncedSearch
                  ? "No candidates matching your search"
                  : "No matching infrastructure candidates"}
              </h3>
              <p className="text-xs text-text-muted mt-1 leading-relaxed">
                {debouncedSearch
                  ? `No members found matching "${debouncedSearch}". Try resetting search or adjusting filters.`
                  : "Try clearing or adjusting disciplines, sectors, or software tags."}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
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
                  className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-bold text-white transition-colors cursor-pointer"
                >
                  Reset All Filters
                </button>
                {activeSearch && (
                  <button
                    type="button"
                    onClick={() => handleSearchChange("")}
                    className="px-4 py-2 rounded-xl bg-brand-mint/10 text-brand-mint border border-brand-mint/30 hover:bg-brand-mint/20 text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5"
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

      {/* ── 4. CONNECTIONS TAB ── */}
      {subTab === "connections" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-heading font-bold text-white">Your Peer Connections</h3>
              <p className="text-xs text-text-muted mt-0.5">
                Mutual connections with fellow infrastructure engineers and faculty mentors.
              </p>
            </div>
            {connectionsCount > 0 && (
              <span className="text-xs font-mono text-text-muted">
                {connectionsCount} {connectionsCount === 1 ? "connection" : "connections"}
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
            <div className="p-16 rounded-3xl bg-[#0A0F14] border border-white/[0.06] text-center max-w-lg mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-4 text-text-muted">
                <UserCheck className="w-7 h-7" />
              </div>
              <h3 className="font-heading font-bold text-lg text-white">
                {debouncedSearch ? "No matching connections" : "No connections yet"}
              </h3>
              <p className="text-xs text-text-muted mt-1 leading-relaxed">
                {debouncedSearch
                  ? "No connections found matching your search."
                  : "Connect with classmates, peers, and mentors to expand your learning network."}
              </p>
              {debouncedSearch ? (
                <button
                  type="button"
                  onClick={() => handleSearchChange("")}
                  className="mt-4 px-4 py-2 rounded-xl bg-brand-mint/10 text-brand-mint border border-brand-mint/30 hover:bg-brand-mint/20 text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Clear Search</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleTabChange("people")}
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
                const connId = conn.id || conn._id;
                const profileLink = getCanonicalProfileUrl(conn);

                return (
                  <div
                    key={connId}
                    className="p-5 rounded-2xl bg-[#0A0F14] hover:bg-[#0D141F] border border-white/[0.08] hover:border-brand-mint/30 transition-all flex flex-col justify-between gap-3 shadow-lg"
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <Link to={profileLink} className="relative shrink-0 block focus-ring rounded-2xl">
                        <div className="w-12 h-12 rounded-2xl bg-[#070B14] border border-white/[0.08] flex items-center justify-center text-brand-mint font-heading font-bold text-sm overflow-hidden">
                          {conn.avatar ? (
                            <img src={conn.avatar} alt={conn.name} className="w-full h-full object-cover" />
                          ) : (
                            <span>{getInitials(conn.name)}</span>
                          )}
                        </div>
                        {conn.isVerified && (
                          <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-mint text-black shadow-sm">
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
                          <p className="text-xs text-text-muted truncate mt-1">{conn.headline}</p>
                        ) : conn.currentRole ? (
                          <p className="text-xs text-text-muted truncate mt-1 flex items-center gap-1">
                            <Briefcase className="w-3 h-3 shrink-0" />
                            <span>{conn.currentRole}</span>
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-white/[0.04] gap-2">
                      <Link
                        to={profileLink}
                        className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors focus-ring"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-text-muted" />
                        <span>View Profile</span>
                      </Link>

                      {/* Zero native confirm: Inline stateful confirmation */}
                      {confirmRemoveId === connId ? (
                        <div className="flex items-center gap-1.5 animate-fade-in">
                          <span className="text-[11px] font-medium text-text-muted">Remove?</span>
                          <button
                            type="button"
                            disabled={removeConnectionMutation.isPending}
                            onClick={() => removeConnectionMutation.mutate(connId)}
                            className="px-2 py-1 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[11px] font-bold hover:bg-rose-500/30 transition-colors cursor-pointer"
                          >
                            Yes
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmRemoveId(null)}
                            className="px-2 py-1 rounded-lg border border-white/[0.1] bg-white/[0.04] text-text-muted hover:text-white text-[11px] font-medium transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmRemoveId(connId)}
                          className="p-1.5 rounded-xl text-text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Remove connection"
                          aria-label="Remove connection"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
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

      {/* ── 5. FOLLOWERS TAB ── */}
      {subTab === "followers" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-heading font-bold text-white">Your Followers</h3>
              <p className="text-xs text-text-muted mt-0.5">
                Engineers and students following your projects and progress.
              </p>
            </div>
            {followersCount > 0 && (
              <span className="text-xs font-mono text-text-muted">
                {followersCount} {followersCount === 1 ? "follower" : "followers"}
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
            <div className="p-16 rounded-3xl bg-[#0A0F14] border border-white/[0.06] text-center max-w-lg mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-4 text-text-muted">
                <Users className="w-7 h-7" />
              </div>
              <h3 className="font-heading font-bold text-lg text-white">
                {debouncedSearch ? "No matching followers" : "No followers yet"}
              </h3>
              <p className="text-xs text-text-muted mt-1 leading-relaxed">
                {debouncedSearch
                  ? "No followers found matching your search."
                  : "When fellow students and mentors follow your learning journey, they appear here."}
              </p>
              {debouncedSearch && (
                <button
                  type="button"
                  onClick={() => handleSearchChange("")}
                  className="mt-4 px-4 py-2 rounded-xl bg-brand-mint/10 text-brand-mint border border-brand-mint/30 hover:bg-brand-mint/20 text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5"
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
                    className="p-5 rounded-2xl bg-[#0A0F14] hover:bg-[#0D141F] border border-white/[0.08] hover:border-brand-mint/30 transition-all flex flex-col justify-between gap-3 shadow-lg"
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <Link to={profileLink} className="relative shrink-0 block focus-ring rounded-2xl">
                        <div className="w-12 h-12 rounded-2xl bg-[#070B14] border border-white/[0.08] flex items-center justify-center text-brand-mint font-heading font-bold text-sm overflow-hidden">
                          {user.avatar ? (
                            <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                          ) : (
                            <span>{getInitials(user.name)}</span>
                          )}
                        </div>
                        {user.isVerified && (
                          <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-mint text-black shadow-sm">
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
                        {user.headline && (
                          <p className="text-xs text-text-muted truncate mt-1">{user.headline}</p>
                        )}
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
                              ? "bg-white/[0.08] hover:bg-rose-500/15 text-white hover:text-rose-300 border border-white/10"
                              : "bg-brand-mint text-black hover:bg-brand-mint/90"
                          }`}
                        >
                          {isFollowing ? "Following" : "Follow Back"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── 6. FOLLOWING TAB ── */}
      {subTab === "following" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-heading font-bold text-white">People You Follow</h3>
              <p className="text-xs text-text-muted mt-0.5">
                Stay updated on activities and designs from peers you follow.
              </p>
            </div>
            {followingCount > 0 && (
              <span className="text-xs font-mono text-text-muted">
                {followingCount} {followingCount === 1 ? "person" : "people"}
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
            <div className="p-16 rounded-3xl bg-[#0A0F14] border border-white/[0.06] text-center max-w-lg mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-4 text-text-muted">
                <UserPlus className="w-7 h-7" />
              </div>
              <h3 className="font-heading font-bold text-lg text-white">
                {debouncedSearch ? "No matching users" : "You are not following anyone yet"}
              </h3>
              <p className="text-xs text-text-muted mt-1 leading-relaxed">
                Follow peers, faculty, and industry leaders to see their contributions.
              </p>
              {debouncedSearch ? (
                <button
                  type="button"
                  onClick={() => handleSearchChange("")}
                  className="mt-4 px-4 py-2 rounded-xl bg-brand-mint/10 text-brand-mint border border-brand-mint/30 hover:bg-brand-mint/20 text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Clear Search</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleTabChange("people")}
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
                const profileLink = getCanonicalProfileUrl(user);

                return (
                  <div
                    key={user.id || user._id}
                    className="p-5 rounded-2xl bg-[#0A0F14] hover:bg-[#0D141F] border border-white/[0.08] hover:border-brand-mint/30 transition-all flex flex-col justify-between gap-3 shadow-lg"
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <Link to={profileLink} className="relative shrink-0 block focus-ring rounded-2xl">
                        <div className="w-12 h-12 rounded-2xl bg-[#070B14] border border-white/[0.08] flex items-center justify-center text-brand-mint font-heading font-bold text-sm overflow-hidden">
                          {user.avatar ? (
                            <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                          ) : (
                            <span>{getInitials(user.name)}</span>
                          )}
                        </div>
                        {user.isVerified && (
                          <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-mint text-black shadow-sm">
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
                        {user.headline && (
                          <p className="text-xs text-text-muted truncate mt-1">{user.headline}</p>
                        )}
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
                      >
                        Unfollow
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── 7. CONNECTION REQUESTS INBOX (INBOX FEEL) ── */}
      {subTab === "requests" && (
        <div className="space-y-6">
          {/* Sub-selector for Incoming vs Outgoing */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setRequestsSubTab("incoming")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                requestsSubTab === "incoming"
                  ? "bg-brand-mint text-black shadow-md shadow-brand-mint/15 font-bold"
                  : "bg-[#0A0F14] text-text-muted hover:text-white border border-white/[0.08]"
              }`}
            >
              <span>Incoming Requests</span>
              <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] bg-black/15 font-mono">
                {incomingRequestsCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setRequestsSubTab("outgoing")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                requestsSubTab === "outgoing"
                  ? "bg-brand-mint text-black shadow-md shadow-brand-mint/15 font-bold"
                  : "bg-[#0A0F14] text-text-muted hover:text-white border border-white/[0.08]"
              }`}
            >
              <span>Sent Requests</span>
              <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] bg-white/[0.08] font-mono">
                {outgoingRequestsCount}
              </span>
            </button>
          </div>

          {/* Incoming Requests List */}
          {requestsSubTab === "incoming" && (
            <div>
              {requestsQuery.isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-28 rounded-2xl bg-[#0A0F14] border border-white/[0.04] animate-pulse"
                    />
                  ))}
                </div>
              ) : (requestsQuery.data?.incoming || []).length === 0 ? (
                <div className="p-12 rounded-2xl bg-[#0A0F14] border border-white/[0.06] text-center max-w-md mx-auto">
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-3 text-text-muted">
                    <UserCheck className="w-6 h-6 text-brand-mint" />
                  </div>
                  <h4 className="font-heading font-bold text-sm text-white">
                    No pending incoming requests
                  </h4>
                  <p className="text-xs text-text-muted mt-1 leading-relaxed">
                    When someone sends you a connection request, review and accept them here.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(requestsQuery.data?.incoming || []).map((req) => {
                    const requester = req.requester || req.requesterId || {};
                    const profileLink = getCanonicalProfileUrl(requester);

                    return (
                      <div
                        key={req._id}
                        className="p-4 rounded-2xl bg-[#0A0F14] border border-white/[0.08] flex items-center justify-between gap-3 shadow-lg"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Link
                            to={profileLink}
                            className="w-11 h-11 rounded-xl bg-[#070B14] border border-white/[0.08] text-brand-mint font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden"
                          >
                            {requester.avatar ? (
                              <img
                                src={requester.avatar}
                                alt={requester.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span>{getInitials(requester.name)}</span>
                            )}
                          </Link>
                          <div className="min-w-0">
                            <Link
                              to={profileLink}
                              className="text-xs font-bold text-white hover:text-brand-mint transition-colors truncate block"
                            >
                              {requester.name || "Member"}
                            </Link>
                            <p className="text-[10px] font-mono text-text-muted truncate">
                              @{requester.username || "user"}
                            </p>
                            {requester.headline && (
                              <p className="text-[11px] text-text-muted truncate mt-0.5">
                                {requester.headline}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => acceptRequestMutation.mutate(req._id)}
                            disabled={acceptRequestMutation.isPending}
                            className="px-3.5 py-1.5 rounded-xl bg-brand-mint text-black font-bold text-xs cursor-pointer hover:bg-brand-mint/90 transition-all shadow-md shadow-brand-mint/15"
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

          {/* Outgoing Requests List */}
          {requestsSubTab === "outgoing" && (
            <div>
              {requestsQuery.isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-28 rounded-2xl bg-[#0A0F14] border border-white/[0.04] animate-pulse"
                    />
                  ))}
                </div>
              ) : (requestsQuery.data?.outgoing || []).length === 0 ? (
                <div className="p-12 rounded-2xl bg-[#0A0F14] border border-white/[0.06] text-center max-w-md mx-auto">
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-3 text-text-muted">
                    <Clock className="w-6 h-6 text-text-muted" />
                  </div>
                  <h4 className="font-heading font-bold text-sm text-white">
                    No pending sent requests
                  </h4>
                  <p className="text-xs text-text-muted mt-1 leading-relaxed">
                    You have no active outgoing connection requests awaiting response.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(requestsQuery.data?.outgoing || []).map((req) => {
                    const recipient = req.recipient || req.recipientId || {};
                    const profileLink = getCanonicalProfileUrl(recipient);

                    return (
                      <div
                        key={req._id}
                        className="p-4 rounded-2xl bg-[#0A0F14] border border-white/[0.08] flex items-center justify-between gap-3 shadow-lg"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Link
                            to={profileLink}
                            className="w-11 h-11 rounded-xl bg-[#070B14] border border-white/[0.08] text-text-muted font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden"
                          >
                            {recipient.avatar ? (
                              <img
                                src={recipient.avatar}
                                alt={recipient.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span>{getInitials(recipient.name)}</span>
                            )}
                          </Link>
                          <div className="min-w-0">
                            <Link
                              to={profileLink}
                              className="text-xs font-bold text-white hover:text-brand-mint transition-colors truncate block"
                            >
                              {recipient.name || "Member"}
                            </Link>
                            <p className="text-[10px] font-mono text-text-muted truncate">
                              @{recipient.username || "user"}
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

      {/* Modals for profile preview and message request */}
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
