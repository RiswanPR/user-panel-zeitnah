import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, UserPlus, UserCheck } from "lucide-react";
import { networkConnectionsService } from "../../services/networkConnectionsService";
import NetworkListModal from "./NetworkListModal";

/**
 * Format integer count with locale commas (e.g. 1,245)
 */
function formatNumber(num) {
  if (num === null || num === undefined) return "0";
  return Number(num).toLocaleString();
}

/**
 * ProfileNetworkStats Component
 * Renders professional interactive network statistics:
 * Followers, Following, and Connections.
 *
 * Clicking each statistic opens the dedicated NetworkListModal
 * showing that list with search, pagination, and actions.
 *
 * @param {Object} props
 * @param {string} props.userIdOrUsername - User ID or username
 * @param {Object} [props.stats] - Pre-fetched stats object { followers, following, connections }
 * @param {string} [props.profileName='Student'] - Profile owner's display name
 * @param {string} [props.className=''] - Additional CSS classes
 * @param {function(string): void} [props.onStatClick] - Custom callback instead of opening modal
 */
export default function ProfileNetworkStats({
  userIdOrUsername,
  stats: initialStats,
  profileName = "Student",
  className = "",
  onStatClick,
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState("followers"); // 'followers' | 'following' | 'connections'

  // Authoritative TanStack Query to fetch fresh database-level counts
  const {
    data: fetchedStats,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["network-profile-stats", userIdOrUsername],
    queryFn: () => networkConnectionsService.getProfileStats(userIdOrUsername),
    enabled: Boolean(userIdOrUsername),
    staleTime: 1000 * 30, // 30 seconds
    initialData: initialStats ? initialStats : undefined,
  });

  const stats = fetchedStats || initialStats || { followers: 0, following: 0, connections: 0 };

  const handleOpenList = (tabKey) => {
    if (onStatClick) {
      onStatClick(tabKey);
      return;
    }
    setModalTab(tabKey);
    setModalOpen(true);
  };

  const statItems = [
    {
      id: "followers",
      label: "Followers",
      value: stats.followers ?? 0,
      icon: Users,
      accent: "text-brand-mint",
      bgAccent: "group-hover:bg-brand-mint/10",
      borderAccent: "group-hover:border-brand-mint/30",
      description: "Users following this profile",
    },
    {
      id: "following",
      label: "Following",
      value: stats.following ?? 0,
      icon: UserPlus,
      accent: "text-brand-yellow",
      bgAccent: "group-hover:bg-brand-yellow/10",
      borderAccent: "group-hover:border-brand-yellow/30",
      description: "Users this profile follows",
    },
    {
      id: "connections",
      label: "Connections",
      value: stats.connections ?? 0,
      icon: UserCheck,
      accent: "text-emerald-400",
      bgAccent: "group-hover:bg-emerald-400/10",
      borderAccent: "group-hover:border-emerald-400/30",
      description: "Accepted mutual connections",
    },
  ];

  // Render hero bar layout (prominently placed near identity section)
  return (
    <>
      <div
        className={`flex items-center gap-2 sm:gap-3 p-1.5 sm:p-2 rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-md ${className}`}
        role="region"
        aria-label="Network Statistics"
      >
        {statItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <div key={item.id} className="flex items-center flex-1 min-w-0">
              <button
                type="button"
                onClick={() => handleOpenList(item.id)}
                className="group w-full flex flex-col items-center justify-center py-2 px-2.5 sm:px-4 rounded-xl hover:bg-white/[0.05] transition-all cursor-pointer focus-ring text-center"
                title={`${item.label}: ${item.description}`}
                aria-label={`View ${formatNumber(item.value)} ${item.label}`}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Icon className={`w-3.5 h-3.5 ${item.accent} opacity-80 group-hover:opacity-100 transition-opacity`} />
                  <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-text-muted group-hover:text-white transition-colors">
                    {item.label}
                  </span>
                </div>

                <div className="font-heading font-black text-base sm:text-xl text-white tracking-tight group-hover:scale-105 transition-transform">
                  {isLoading && !fetchedStats ? (
                    <span className="inline-block w-8 h-5 bg-white/[0.08] rounded animate-pulse" />
                  ) : (
                    formatNumber(item.value)
                  )}
                </div>
              </button>

              {/* Divider between stat items */}
              {index < statItems.length - 1 && (
                <div className="h-8 w-px bg-white/[0.08] mx-0.5 sm:mx-1 shrink-0" aria-hidden="true" />
              )}
            </div>
          );
        })}
      </div>

      {/* Network List Modal for Interactive Drilldown */}
      {modalOpen && (
        <NetworkListModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          initialTab={modalTab}
          userIdOrUsername={userIdOrUsername}
          profileName={profileName}
          onCountMutated={() => refetch()}
        />
      )}
    </>
  );
}
