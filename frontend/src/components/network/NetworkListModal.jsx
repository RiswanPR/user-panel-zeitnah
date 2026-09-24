import { useState, useEffect, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  X,
  Search,
  Users,
  UserCheck,
  UserPlus,
  MessageSquare,
  ExternalLink,
  ShieldCheck,
  Check,
  RefreshCw,
  AlertCircle,
  Briefcase,
  MapPin,
} from "lucide-react";
import { AuthContext } from "../../context/AuthContext";
import { networkConnectionsService } from "../../services/networkConnectionsService";
import { useToast } from "../ui/Toast";

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

/**
 * Single User Row Card in Network List
 */
function NetworkUserRow({
  userItem,
  currentUserId,
  currentUsername,
  onFollowToggled,
  onConnectionToggled,
  onCloseModal,
}) {
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();

  const isSelf =
    userItem.id === currentUserId ||
    userItem._id === currentUserId ||
    (currentUsername && userItem.username?.toLowerCase() === currentUsername?.toLowerCase());

  const [followingOverride, setFollowingOverride] = useState(null);
  const [connectionOverride, setConnectionOverride] = useState(null);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [isConnectLoading, setIsConnectLoading] = useState(false);

  const isFollowing = followingOverride !== null ? followingOverride : Boolean(userItem.isFollowing);
  const connectionStatus = connectionOverride !== null ? connectionOverride : (userItem.connectionStatus || "none");

  // Handle Follow / Unfollow
  const handleFollowToggle = async () => {
    if (isFollowLoading || isSelf) return;
    const targetId = userItem.id || userItem._id || userItem.username;
    const nextFollowing = !isFollowing;

    // Optimistic
    setFollowingOverride(nextFollowing);
    setIsFollowLoading(true);

    try {
      if (nextFollowing) {
        await networkConnectionsService.followUser(targetId);
        toast.success("Following", `You are now following ${userItem.name}.`);
      } else {
        await networkConnectionsService.unfollowUser(targetId);
        toast.success("Unfollowed", `You unfollowed ${userItem.name}.`);
      }
      onFollowToggled?.(targetId, nextFollowing);
      queryClient.invalidateQueries({ queryKey: ["network-profile-stats"] });
    } catch (err) {
      // Rollback
      setFollowingOverride(!nextFollowing);
      toast.error("Action Failed", err?.response?.data?.message || "Could not update follow status.");
    } finally {
      setIsFollowLoading(false);
    }
  };

  // Handle Connect
  const handleConnect = async () => {
    if (isConnectLoading || isSelf || connectionStatus === "connected" || connectionStatus === "pending") return;
    const targetId = userItem.id || userItem._id;
    setIsConnectLoading(true);

    try {
      await networkConnectionsService.connectUser(targetId);
      setConnectionOverride("pending");
      toast.success("Request Sent", `Connection request sent to ${userItem.name}.`);
      onConnectionToggled?.(targetId, "pending");
      queryClient.invalidateQueries({ queryKey: ["network-profile-stats"] });
      queryClient.invalidateQueries({ queryKey: ["network-connections"] });
    } catch (err) {
      toast.error("Unable to Connect", err?.response?.data?.message || "Could not send connection request.");
    } finally {
      setIsConnectLoading(false);
    }
  };

  const profileLink = `/u/${encodeURIComponent(userItem.username || userItem.id || "")}`;
  const initials = getInitials(userItem.name);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-brand-mint/30 transition-all duration-200">
      {/* User Info Column */}
      <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
        <Link
          to={profileLink}
          onClick={onCloseModal}
          className="relative shrink-0 block focus-ring rounded-2xl"
          tabIndex={0}
        >
          <div className="w-12 h-12 rounded-2xl overflow-hidden border border-white/10 bg-bg-surface flex items-center justify-center text-brand-mint font-heading font-black text-sm">
            {userItem.avatar ? (
              <img
                src={userItem.avatar}
                alt={userItem.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <span>{initials}</span>
            )}
          </div>
          {userItem.isVerified && (
            <span
              className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-mint text-bg-base shadow-sm ring-1 ring-bg-surface"
              title="Verified Student"
            >
              <ShieldCheck className="h-3 w-3" />
            </span>
          )}
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to={profileLink}
              onClick={onCloseModal}
              className="font-heading font-bold text-sm text-white hover:text-brand-mint transition-colors truncate focus-ring rounded"
            >
              {userItem.name}
            </Link>
            {userItem.role && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white/[0.05] text-text-muted border border-white/[0.04]">
                {userItem.role}
              </span>
            )}
          </div>

          <p className="text-xs font-mono text-brand-mint/90 truncate">
            @{userItem.username || "student"}
          </p>

          {userItem.headline ? (
            <p className="text-xs text-text-muted/90 truncate mt-0.5 max-w-md">
              {userItem.headline}
            </p>
          ) : userItem.currentRole ? (
            <p className="text-xs text-text-muted/80 truncate mt-0.5 flex items-center gap-1">
              <Briefcase className="w-3 h-3 text-text-faint shrink-0" />
              <span>{userItem.currentRole}</span>
              {userItem.location && (
                <>
                  <span className="text-text-faint">•</span>
                  <MapPin className="w-3 h-3 text-text-faint shrink-0" />
                  <span>{userItem.location}</span>
                </>
              )}
            </p>
          ) : null}
        </div>
      </div>

      {/* Action Buttons Column */}
      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
        {!isSelf ? (
          <>
            {/* Follow / Following Toggle Button */}
            <button
              type="button"
              onClick={handleFollowToggle}
              disabled={isFollowLoading}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer focus-ring min-h-[36px] ${
                isFollowing
                  ? "bg-white/[0.08] hover:bg-rose-500/15 text-white/90 hover:text-rose-300 border border-white/10 hover:border-rose-500/30"
                  : "bg-brand-mint text-black hover:bg-brand-mint/90 shadow-sm"
              }`}
              title={isFollowing ? "Unfollow" : "Follow"}
            >
              {isFollowLoading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : isFollowing ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Following</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Follow</span>
                </>
              )}
            </button>

            {/* Connection / Message Action */}
            {connectionStatus === "connected" ? (
              <button
                type="button"
                onClick={() => {
                  onCloseModal?.();
                  navigate("/community/messages");
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/10 transition-all cursor-pointer focus-ring min-h-[36px]"
                title="Send Message"
              >
                <MessageSquare className="w-3.5 h-3.5 text-brand-mint" />
                <span>Message</span>
              </button>
            ) : connectionStatus === "pending" ? (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/[0.04] text-text-muted border border-white/[0.06] min-h-[36px]">
                <span>Pending</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={handleConnect}
                disabled={isConnectLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/10 hover:border-brand-mint/40 transition-all cursor-pointer focus-ring min-h-[36px]"
                title="Connect"
              >
                {isConnectLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <UserCheck className="w-3.5 h-3.5 text-brand-mint" />
                    <span>Connect</span>
                  </>
                )}
              </button>
            )}
          </>
        ) : (
          <span className="text-[11px] font-mono text-text-muted px-2 py-1 rounded bg-white/[0.03]">
            You
          </span>
        )}

        <Link
          to={profileLink}
          onClick={onCloseModal}
          className="p-2 rounded-xl text-text-muted hover:text-white hover:bg-white/[0.06] transition-colors focus-ring"
          title="View Profile"
        >
          <ExternalLink className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

/**
 * Skeleton Loader for User List
 */
function UserListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((idx) => (
        <div
          key={idx}
          className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04] animate-pulse gap-4"
        >
          <div className="flex items-center gap-3 flex-1">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.05]" />
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-white/[0.06] rounded w-1/3" />
              <div className="h-3 bg-white/[0.04] rounded w-1/4" />
            </div>
          </div>
          <div className="w-20 h-8 rounded-xl bg-white/[0.04]" />
        </div>
      ))}
    </div>
  );
}

/**
 * Internal modal content with tab and search state
 */
function NetworkListModalContent({
  onClose,
  initialTab = "followers",
  userIdOrUsername,
  profileName = "Student",
  onCountMutated,
}) {
  const { user: authUser } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState(initialTab || "followers");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  // Lock body scroll on mount
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = original;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  // Query Data based on active tab
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["network-users-list", userIdOrUsername, activeTab, page, searchQuery],
    queryFn: async () => {
      if (!userIdOrUsername) return { data: [], total: 0, totalPages: 1 };
      const params = { page, limit: 15, q: searchQuery };
      if (activeTab === "followers") {
        return networkConnectionsService.getUserFollowers(userIdOrUsername, params);
      } else if (activeTab === "following") {
        return networkConnectionsService.getUserFollowing(userIdOrUsername, params);
      } else {
        return networkConnectionsService.getUserConnections(userIdOrUsername, params);
      }
    },
    enabled: Boolean(userIdOrUsername),
    staleTime: 30000,
  });

  const usersList = data?.data || [];
  const totalCount = data?.total ?? 0;
  const totalPages = data?.totalPages || 1;
  const hasNextPage = data?.hasNextPage || page < totalPages;
  const hasPrevPage = page > 1;

  const currentUserId = authUser?.id || authUser?._id;
  const currentUsername = authUser?.username;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="network-modal-title"
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
      />

      {/* Modal Dialog Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-2xl max-h-[88vh] rounded-3xl bg-bg-surface border border-white/[0.1] shadow-2xl flex flex-col overflow-hidden z-10"
      >
        {/* Top Decorative Line */}
        <div className="h-1 bg-gradient-to-r from-brand-mint via-brand-yellow/80 to-brand-mint opacity-80 shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/[0.08] shrink-0">
          <div>
            <h2
              id="network-modal-title"
              className="font-heading font-black text-xl text-white tracking-tight flex items-center gap-2"
            >
              <span>{profileName}'s Network</span>
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Explore relationships, connections, and community members.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-text-muted hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer focus-ring"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Segmented Control / Tab Bar */}
        <div className="px-6 pt-4 pb-3 border-b border-white/[0.06] bg-white/[0.01] shrink-0">
          <div className="flex items-center gap-2 p-1 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            {[
              { id: "followers", label: "Followers", icon: Users },
              { id: "following", label: "Following", icon: UserPlus },
              { id: "connections", label: "Connections", icon: UserCheck },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    setPage(1);
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer focus-ring ${
                    isActive
                      ? "bg-brand-mint text-black shadow-md shadow-brand-mint/15"
                      : "text-text-muted hover:text-white hover:bg-white/[0.04]"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  {isActive && totalCount > 0 && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-black/15 text-black">
                      {formatNumber(totalCount)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search Input Bar */}
          <div className="relative mt-3">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder={`Search ${activeTab}...`}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] focus:border-brand-mint/50 text-xs text-white placeholder-text-muted focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-white text-xs"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* User List Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 min-h-[280px]">
          {isLoading ? (
            <UserListSkeleton />
          ) : isError ? (
            <div className="p-8 text-center rounded-2xl bg-danger/5 border border-danger/20">
              <AlertCircle className="w-8 h-8 text-danger mx-auto mb-2" />
              <p className="text-sm font-bold text-white">Unable to load {activeTab}</p>
              <p className="text-xs text-text-muted mt-1">
                {error?.response?.data?.message || "A network error occurred."}
              </p>
              <button
                type="button"
                onClick={() => refetch()}
                className="btn-secondary mt-4 text-xs py-2 px-4 inline-flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Try Again</span>
              </button>
            </div>
          ) : usersList.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white/[0.02] border border-white/[0.04]">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mx-auto mb-3 text-text-faint">
                {activeTab === "followers" ? (
                  <Users className="w-6 h-6" />
                ) : activeTab === "following" ? (
                  <UserPlus className="w-6 h-6" />
                ) : (
                  <UserCheck className="w-6 h-6" />
                )}
              </div>
              <h3 className="font-heading font-bold text-sm text-white">
                {searchQuery
                  ? `No matching ${activeTab} found`
                  : activeTab === "followers"
                  ? "No followers yet"
                  : activeTab === "following"
                  ? "Not following anyone yet"
                  : "No accepted connections yet"}
              </h3>
              <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
                {searchQuery
                  ? "Try adjusting your search keywords."
                  : activeTab === "followers"
                  ? "Share your profile to build your network and connect with peers."
                  : activeTab === "following"
                  ? "Explore the network directory to find classmates and instructors."
                  : "Mutual accepted connections will appear here once confirmed."}
              </p>
            </div>
          ) : (
            usersList.map((item) => (
              <NetworkUserRow
                key={item.id || item._id}
                userItem={item}
                currentUserId={currentUserId}
                currentUsername={currentUsername}
                onCloseModal={onClose}
                onFollowToggled={() => {
                  refetch();
                  onCountMutated?.();
                }}
                onConnectionToggled={() => {
                  refetch();
                  onCountMutated?.();
                }}
              />
            ))
          )}
        </div>

        {/* Footer with Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-white/[0.08] bg-white/[0.02] shrink-0">
            <span className="text-xs text-text-muted">
              Page <span className="font-bold text-white">{page}</span> of{" "}
              <span className="font-bold text-white">{totalPages}</span> ({formatNumber(totalCount)} total)
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!hasPrevPage || isLoading}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/[0.04] hover:bg-white/[0.08] text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={!hasNextPage || isLoading}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/[0.04] hover:bg-white/[0.08] text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

/**
 * NetworkListModal Component
 * Interactive modal that displays Followers, Following, or Connections lists for any profile
 * with search, pagination, follow/connect actions, and responsive layout.
 */
export default function NetworkListModal(props) {
  if (!props.isOpen) return null;
  return (
    <AnimatePresence>
      <NetworkListModalContent {...props} key={`${props.initialTab}-${props.userIdOrUsername}`} />
    </AnimatePresence>
  );
}
