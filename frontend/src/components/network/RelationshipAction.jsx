import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  UserPlus,
  UserCheck,
  UserMinus,
  Check,
  X,
  Loader2,
  Clock,
} from "lucide-react";
import { useToast } from "../ui/Toast";
import { networkConnectionsService } from "../../services/networkConnectionsService";

/**
 * RelationshipAction Component
 * Centralized relationship management button for Network:
 * Handles send, accept, decline, cancel, and remove actions with real-time feedback.
 *
 * @param {Object} props
 * @param {string} props.targetUserId - Target student's user ID
 * @param {string} [props.connectionId] - Existing connection ID (if known)
 * @param {'none' | 'outgoing_pending' | 'incoming_pending' | 'connected' | 'self'} [props.initialState='none']
 * @param {string} [props.studentName='Student'] - Name of the target student for toasts
 * @param {'compact' | 'full' | 'icon'} [props.variant='compact']
 * @param {function(string, string|null): void} [props.onStateChange]
 */
export default function RelationshipAction({
  targetUserId,
  connectionId: initialConnectionId = null,
  initialState = "none",
  studentName = "Student",
  variant = "compact",
  onStateChange,
}) {
  const toast = useToast();
  const queryClient = useQueryClient();

  const [currentState, setCurrentState] = useState(initialState);
  const [activeConnectionId, setActiveConnectionId] = useState(initialConnectionId);
  const [confirmRemove, setConfirmRemove] = useState(false);

  // Sync state if props change (e.g. from parent re-fetch)
  // We use keying or state comparison in render to avoid effect loops
  const effectiveState = currentState;
  const effectiveConnectionId = activeConnectionId || initialConnectionId;

  const updateState = (newState, newConnId = null) => {
    setCurrentState(newState);
    if (newConnId !== undefined) {
      setActiveConnectionId(newConnId);
    }
    setConfirmRemove(false);
    onStateChange?.(newState, newConnId);

    // Invalidate all relevant network query caches
    queryClient.invalidateQueries({ queryKey: ["network"] });
    queryClient.invalidateQueries({ queryKey: ["network-connections"] });
    queryClient.invalidateQueries({ queryKey: ["network-connection-counts"] });
  };

  // 1. Send Connection Request Mutation
  const sendMutation = useMutation({
    mutationFn: () => networkConnectionsService.sendRequest(targetUserId),
    onSuccess: (res) => {
      updateState(res.state || "outgoing_pending", res.connectionId);
      toast.success(
        "Request Sent",
        `Connection request sent to ${studentName}.`,
      );
    },
    onError: (err) => {
      const msg =
        err.response?.data?.message || "Failed to send connection request.";
      toast.error("Unable to Connect", msg);
    },
  });

  // 2. Accept Request Mutation
  const acceptMutation = useMutation({
    mutationFn: (connId) => networkConnectionsService.acceptRequest(connId),
    onSuccess: (res) => {
      updateState("connected", res.connectionId || effectiveConnectionId);
      toast.success(
        "Connected!",
        `You and ${studentName} are now connected.`,
      );
    },
    onError: (err) => {
      const msg =
        err.response?.data?.message || "Failed to accept connection request.";
      toast.error("Accept Failed", msg);
    },
  });

  // 3. Decline Request Mutation
  const declineMutation = useMutation({
    mutationFn: (connId) => networkConnectionsService.declineRequest(connId),
    onSuccess: () => {
      updateState("none", null);
      toast.info("Request Declined", `Declined connection request from ${studentName}.`);
    },
    onError: (err) => {
      const msg =
        err.response?.data?.message || "Failed to decline connection request.";
      toast.error("Action Failed", msg);
    },
  });

  // 4. Cancel Outgoing Request Mutation
  const cancelMutation = useMutation({
    mutationFn: (connId) => networkConnectionsService.cancelRequest(connId),
    onSuccess: () => {
      updateState("none", null);
      toast.info(
        "Request Cancelled",
        `Cancelled connection request to ${studentName}.`,
      );
    },
    onError: (err) => {
      const msg =
        err.response?.data?.message || "Failed to cancel connection request.";
      toast.error("Action Failed", msg);
    },
  });

  // 5. Remove Connection Mutation
  const removeMutation = useMutation({
    mutationFn: (connId) => networkConnectionsService.removeConnection(connId),
    onSuccess: () => {
      updateState("none", null);
      toast.info(
        "Connection Removed",
        `Removed ${studentName} from your connections.`,
      );
    },
    onError: (err) => {
      const msg =
        err.response?.data?.message || "Failed to remove connection.";
      toast.error("Action Failed", msg);
    },
  });

  const isLoading =
    sendMutation.isPending ||
    acceptMutation.isPending ||
    declineMutation.isPending ||
    cancelMutation.isPending ||
    removeMutation.isPending;

  // ── CASE: SELF ──
  if (effectiveState === "self") {
    return (
      <span className="inline-flex items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-text-muted select-none">
        You
      </span>
    );
  }

  // ── CASE: CONNECTED ──
  if (effectiveState === "connected") {
    if (confirmRemove) {
      return (
        <div className="flex items-center gap-1.5 animate-fadeIn">
          <span className="text-[11px] font-medium text-text-muted">Remove?</span>
          <button
            type="button"
            disabled={isLoading}
            onClick={() => {
              if (effectiveConnectionId) {
                removeMutation.mutate(effectiveConnectionId);
              }
            }}
            className="rounded-lg bg-red-500/20 border border-red-500/30 px-2 py-1 text-[11px] font-bold text-red-400 hover:bg-red-500/30 transition-colors focus-ring"
          >
            {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Yes"}
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={() => setConfirmRemove(false)}
            className="rounded-lg border border-white/[0.1] bg-white/[0.04] px-2 py-1 text-[11px] font-medium text-text-muted hover:text-white transition-colors focus-ring"
          >
            Cancel
          </button>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1">
        <span
          className={`inline-flex items-center gap-1.5 rounded-xl border border-brand-mint/30 bg-brand-mint/10 text-brand-mint font-semibold select-none ${
            variant === "full" ? "px-4 py-2 text-xs" : "px-2.5 py-1.5 text-xs"
          }`}
        >
          <UserCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>Connected</span>
        </span>
        <button
          type="button"
          disabled={isLoading}
          onClick={() => setConfirmRemove(true)}
          title={`Remove connection with ${studentName}`}
          aria-label={`Remove connection with ${studentName}`}
          className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-1.5 text-text-muted hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 transition-colors focus-ring"
        >
          <UserMinus className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    );
  }

  // ── CASE: OUTGOING PENDING (Request Sent) ──
  if (effectiveState === "outgoing_pending") {
    return (
      <div className="flex items-center gap-1">
        <span
          className={`inline-flex items-center gap-1.5 rounded-xl border border-brand-yellow/30 bg-brand-yellow/10 text-brand-yellow font-semibold select-none ${
            variant === "full" ? "px-4 py-2 text-xs" : "px-2.5 py-1.5 text-xs"
          }`}
        >
          <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>Pending</span>
        </span>
        <button
          type="button"
          disabled={isLoading}
          onClick={() => {
            if (effectiveConnectionId) {
              cancelMutation.mutate(effectiveConnectionId);
            }
          }}
          title={`Cancel connection request to ${studentName}`}
          aria-label={`Cancel connection request to ${studentName}`}
          className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-1.5 text-text-muted hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 transition-colors focus-ring"
        >
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </button>
      </div>
    );
  }

  // ── CASE: INCOMING PENDING (Accept / Decline) ──
  if (effectiveState === "incoming_pending") {
    return (
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={isLoading}
          onClick={() => {
            if (effectiveConnectionId) {
              acceptMutation.mutate(effectiveConnectionId);
            }
          }}
          className="inline-flex items-center gap-1 rounded-xl bg-brand-mint px-3 py-1.5 text-xs font-bold text-bg-base hover:bg-brand-mint/90 transition-all focus-ring shadow-sm"
        >
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          <span>Accept</span>
        </button>

        <button
          type="button"
          disabled={isLoading}
          onClick={() => {
            if (effectiveConnectionId) {
              declineMutation.mutate(effectiveConnectionId);
            }
          }}
          title={`Decline connection request from ${studentName}`}
          aria-label={`Decline connection request from ${studentName}`}
          className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-1.5 text-text-muted hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 transition-colors focus-ring"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    );
  }

  // ── CASE: NONE (Connect Action) ──
  return (
    <button
      type="button"
      disabled={isLoading}
      onClick={() => sendMutation.mutate()}
      aria-label={`Connect with ${studentName}`}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl border border-brand-mint/30 bg-brand-mint/10 text-brand-mint hover:bg-brand-mint/20 hover:border-brand-mint/50 font-semibold transition-all focus-ring ${
        variant === "full"
          ? "w-full py-2.5 px-4 text-xs font-bold"
          : variant === "icon"
          ? "p-2"
          : "py-2 px-3 text-xs"
      }`}
    >
      {isLoading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      {variant !== "icon" && <span>Connect</span>}
    </button>
  );
}
