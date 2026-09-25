import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Inbox,
  Send,
  Search,
  SearchX,
  Compass,
} from "lucide-react";
import ConnectionCard from "./ConnectionCard";
import ConnectionRequestCard from "./ConnectionRequestCard";
import DiscoverSkeleton from "./DiscoverSkeleton";
import NetworkEmptyState from "./NetworkEmptyState";
import { networkConnectionsService } from "../../services/networkConnectionsService";

/**
 * ConnectionsList Component
 * Full relationship management interface with sub-tabs for:
 * - Active Connections
 * - Incoming Requests
 * - Sent Requests
 *
 * @param {Object} props
 * @param {function(Object): void} props.onPreview - Open student preview modal
 * @param {function(): void} props.onSwitchToDiscover - Switch main tab to Discover
 */
export default function ConnectionsList({ onPreview, onSwitchToDiscover }) {
  const [subTab, setSubTab] = useState("connections"); // 'connections' | 'requests' | 'sent'
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search by 250ms to avoid hammering backend
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 250);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // 1. Fetch real counts
  const { data: countsData } = useQuery({
    queryKey: ["network-connection-counts"],
    queryFn: () => networkConnectionsService.getConnectionCounts(),
    staleTime: 1000 * 30,
  });

  const connectionsCount = countsData?.connectionsCount ?? 0;
  const incomingCount = countsData?.incomingRequestsCount ?? 0;
  const outgoingCount = countsData?.outgoingRequestsCount ?? 0;

  // 2. Fetch Active Connections with debounced query
  const {
    data: connectionsData,
    isLoading: isConnectionsLoading,
  } = useQuery({
    queryKey: ["network-connections", debouncedSearch],
    queryFn: () =>
      networkConnectionsService.getConnections({
        page: 1,
        limit: 50,
        q: debouncedSearch,
      }),
    enabled: subTab === "connections",
    staleTime: 1000 * 30,
  });

  // 3. Fetch Incoming Requests
  const {
    data: incomingData,
    isLoading: isIncomingLoading,
  } = useQuery({
    queryKey: ["network-requests"],
    queryFn: () => networkConnectionsService.getIncomingRequests(),
    enabled: subTab === "requests",
    staleTime: 1000 * 30,
  });

  // 4. Fetch Outgoing Requests
  const {
    data: outgoingData,
    isLoading: isOutgoingLoading,
  } = useQuery({
    queryKey: ["network-sent"],
    queryFn: () => networkConnectionsService.getOutgoingRequests(),
    enabled: subTab === "sent",
    staleTime: 1000 * 30,
  });

  // Instant client-side fallback filtering for active connections
  const filteredConnections = useMemo(() => {
    const list = connectionsData?.data || [];
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (item) =>
        item.user?.name?.toLowerCase().includes(q) ||
        item.user?.username?.toLowerCase().includes(q) ||
        item.user?.course?.toLowerCase().includes(q) ||
        item.user?.headline?.toLowerCase().includes(q),
    );
  }, [connectionsData, searchQuery]);

  // Filter requests locally if search is typed
  const filteredIncoming = useMemo(() => {
    const list = incomingData?.data || [];
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (item) =>
        item.user?.name?.toLowerCase().includes(q) ||
        item.user?.username?.toLowerCase().includes(q) ||
        item.user?.course?.toLowerCase().includes(q) ||
        item.user?.headline?.toLowerCase().includes(q),
    );
  }, [incomingData, searchQuery]);

  const filteredOutgoing = useMemo(() => {
    const list = outgoingData?.data || [];
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (item) =>
        item.user?.name?.toLowerCase().includes(q) ||
        item.user?.username?.toLowerCase().includes(q) ||
        item.user?.course?.toLowerCase().includes(q) ||
        item.user?.headline?.toLowerCase().includes(q),
    );
  }, [outgoingData, searchQuery]);

  const SUB_TABS = [
    {
      id: "connections",
      label: "Connections",
      count: connectionsCount,
      icon: Users,
    },
    {
      id: "requests",
      label: "Requests",
      count: incomingCount,
      icon: Inbox,
      highlight: incomingCount > 0,
    },
    {
      id: "sent",
      label: "Sent",
      count: outgoingCount,
      icon: Send,
    },
  ];

  const isLoading =
    (subTab === "connections" && isConnectionsLoading) ||
    (subTab === "requests" && isIncomingLoading) ||
    (subTab === "sent" && isOutgoingLoading);

  return (
    <div className="space-y-6">
      {/* Editorial Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-heading font-extrabold text-white tracking-tight">
            Connections
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
            {connectionsCount === 1 ? "1 person" : `${connectionsCount} people`} in your learning network
          </p>
        </div>
      </div>

      {/* Sub-Tabs Bar & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        {/* Navigation Pill Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          {SUB_TABS.map((tab) => {
            const isActive = subTab === tab.id;
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setSubTab(tab.id);
                  setSearchQuery("");
                }}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition-all focus-ring shrink-0 ${
                  isActive
                    ? "bg-brand-mint/15 text-white border border-brand-mint/30 shadow-[0_0_12px_rgba(159,213,178,0.1)]"
                    : "text-text-muted hover:text-white hover:bg-white/[0.04] border border-transparent"
                }`}
              >
                <Icon
                  className={`h-4 w-4 ${
                    isActive ? "text-brand-mint" : "text-text-muted"
                  }`}
                />
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono font-bold ${
                      tab.highlight
                        ? "bg-brand-mint text-bg-base"
                        : isActive
                        ? "bg-white/[0.1] text-white"
                        : "bg-white/[0.06] text-text-muted"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Local Search Input */}
        <div className="relative w-full sm:w-72">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Filter ${subTab}...`}
            className="w-full rounded-xl border border-white/[0.08] bg-bg-surface/80 py-2 pl-9 pr-3 text-xs text-white placeholder:text-text-muted focus:border-brand-mint/40 focus:outline-none focus:ring-1 focus:ring-brand-mint/40 transition-all"
          />
        </div>
      </div>

      {/* Tab Content */}
      {isLoading ? (
        <DiscoverSkeleton count={6} />
      ) : (
        <AnimatePresence mode="wait">
          {/* ── 1. ACTIVE CONNECTIONS ── */}
          {subTab === "connections" && (
            <motion.div
              key="subtab-connections"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {filteredConnections.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                  {filteredConnections.map((conn) => (
                    <ConnectionCard
                      key={conn.connectionId || conn.user?.id}
                      connection={conn}
                      onPreview={onPreview}
                    />
                  ))}
                </div>
              ) : searchQuery ? (
                <NetworkEmptyState
                  icon={SearchX}
                  title="No connections match your filter"
                  description={`No connections found matching "${searchQuery}".`}
                  action={() => setSearchQuery("")}
                  actionLabel="Clear filter"
                />
              ) : (
                <NetworkEmptyState
                  icon={Users}
                  title="Your network is waiting to grow"
                  description="Connect with fellow learners to collaborate, share study progress, and learn together."
                  action={onSwitchToDiscover}
                  actionLabel="Discover Students"
                />
              )}
            </motion.div>
          )}

          {/* ── 2. INCOMING REQUESTS ── */}
          {subTab === "requests" && (
            <motion.div
              key="subtab-requests"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {filteredIncoming.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                  {filteredIncoming.map((req) => (
                    <ConnectionRequestCard
                      key={req.connectionId}
                      request={req}
                      type="incoming"
                      onPreview={onPreview}
                    />
                  ))}
                </div>
              ) : searchQuery ? (
                <NetworkEmptyState
                  icon={SearchX}
                  title="No requests match your filter"
                  description={`No incoming requests found matching "${searchQuery}".`}
                  action={() => setSearchQuery("")}
                  actionLabel="Clear filter"
                />
              ) : (
                <NetworkEmptyState
                  icon={Inbox}
                  title="No pending requests"
                  description="When other students reach out to connect with you, their requests will appear here."
                />
              )}
            </motion.div>
          )}

          {/* ── 3. OUTGOING / SENT REQUESTS ── */}
          {subTab === "sent" && (
            <motion.div
              key="subtab-sent"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {filteredOutgoing.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                  {filteredOutgoing.map((req) => (
                    <ConnectionRequestCard
                      key={req.connectionId}
                      request={req}
                      type="outgoing"
                      onPreview={onPreview}
                    />
                  ))}
                </div>
              ) : searchQuery ? (
                <NetworkEmptyState
                  icon={SearchX}
                  title="No sent requests match your filter"
                  description={`No sent requests found matching "${searchQuery}".`}
                  action={() => setSearchQuery("")}
                  actionLabel="Clear filter"
                />
              ) : (
                <NetworkEmptyState
                  icon={Compass}
                  title="No sent requests"
                  description="You haven't sent any connection requests yet. Explore the student directory to start connecting!"
                  action={onSwitchToDiscover}
                  actionLabel="Discover Students"
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
