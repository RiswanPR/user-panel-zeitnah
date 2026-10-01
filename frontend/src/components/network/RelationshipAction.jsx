import { useState, useEffect, useRef } from "react";
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
import {
  RELATIONSHIP_STATES,
  normalizeRelationshipState,
} from "../../utils/relationshipState";

/**
 * RelationshipAction Component
 * Centralized, authoritative relationship action button for Zeitnah Network.
 *
 * Implements:
 * - Section 2: Canonical Relationship State Machine:
 *     NONE -> CONNECT (Connecting...) -> PENDING_OUTGOING -> CONNECTED
 *     PENDING_INCOMING -> ACCEPT (Accepting...) -> CONNECTED
 *     PENDING_OUTGOING -> CANCEL (Cancelling...) -> NONE
 *     PENDING_INCOMING -> DECLINE (Declining...) -> NONE
 *     CONNECTED -> REMOVE (Removing...) -> NONE
 * - Section 3: Exact Connect Button Behavior (Immediate Connecting... -> ◷ Pending).
 * - Section 4: Authoritative Backend Synchronization with rollback on error.
 * - Section 5: Double-click Prevention across all states.
 * - Section 14 & 15: Ultra-premium button design & stable, zero-reflow transitions.
 * - Section 20: Contextual micro-confirmation (✓ Request sent -> ◷ Pending).
 * - Section 24 & 25: Accessible focus rings, screen reader labels, high contrast.
 *
 * @param {Object} props
 * @param {string} props.targetUserId - Target user ID
 * @param {string} [props.connectionId] - Existing connection ID (if known)
 * @param {string} [props.initialState='none'] - Raw state from backend/parent
 * @param {string} [props.studentName='Student'] - Name of the target member for toasts
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

  const normalizedInitial = normalizeRelationshipState(initialState);
  const [currentState, setCurrentState] = useState(normalizedInitial);
  const [activeConnectionId, setActiveConnectionId] = useState(initialConnectionId);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [justSent, setJustSent] = useState(false);
  const justSentTimerRef = useRef(null);

  // Sync state if props change from parent re-fetch, tab change, or cache update
  useEffect(() => {
    setCurrentState(normalizeRelationshipState(initialState));
  }, [initialState]);

  useEffect(() => {
    if (initialConnectionId) {
      setActiveConnectionId(initialConnectionId);
    }
  }, [initialConnectionId]);

  useEffect(() => {
    return () => {
      if (justSentTimerRef.current) {
        clearTimeout(justSentTimerRef.current);
      }
    };
  }, []);

  const effectiveState = currentState;
  const effectiveConnectionId = activeConnectionId || initialConnectionId;

  // Invalidate all relevant network query caches across all views
  const invalidateNetworkQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["network-people"] });
    queryClient.invalidateQueries({ queryKey: ["network-connections-list"] });
    queryClient.invalidateQueries({ queryKey: ["network-connections"] });
    queryClient.invalidateQueries({ queryKey: ["network-requests"] });
    queryClient.invalidateQueries({ queryKey: ["network-sent"] });
    queryClient.invalidateQueries({ queryKey: ["network-connection-counts"] });
    queryClient.invalidateQueries({ queryKey: ["network-profile-stats"] });
    queryClient.invalidateQueries({ queryKey: ["network-profile"] });
    queryClient.invalidateQueries({ queryKey: ["network-followers-list"] });
    queryClient.invalidateQueries({ queryKey: ["network-following-list"] });
    queryClient.invalidateQueries({ queryKey: ["network-people-summary-count"] });
  };

  const updateState = (newState, newConnId = null) => {
    const normalized = normalizeRelationshipState(newState);
    setCurrentState(normalized);
    if (newConnId !== undefined && newConnId !== null) {
      setActiveConnectionId(newConnId);
    }
    setConfirmRemove(false);
    onStateChange?.(normalized, newConnId);
    invalidateNetworkQueries();
  };

  // ── 1. Send Connection Request Mutation ──
  const sendMutation = useMutation({
    mutationFn: () => networkConnectionsService.sendRequest(targetUserId),
    onMutate: () => {
      const prevState = currentState;
      return { prevState };
    },
    onSuccess: (res) => {
      const returnedConnId =
        res?.connectionId || res?._id || res?.id || effectiveConnectionId || null;
      const returnedState =
        normalizeRelationshipState(res?.state || res?.connectionStatus) ||
        RELATIONSHIP_STATES.PENDING_OUTGOING;

      updateState(returnedState, returnedConnId);

      // Brief contextual micro-interaction (Section 20)
      setJustSent(true);
      if (justSentTimerRef.current) clearTimeout(justSentTimerRef.current);
      justSentTimerRef.current = setTimeout(() => {
        setJustSent(false);
      }, 1500);

      toast.success(
        "Request Sent",
        `Connection invitation dispatched to ${studentName}.`
      );
    },
    onError: (err, _variables, context) => {
      if (context?.prevState) setCurrentState(context.prevState);
      const msg =
        err.response?.data?.message || "Failed to send connection request.";
      toast.error("Unable to Connect", msg);
    },
  });

  // ── 2. Accept Request Mutation ──
  const acceptMutation = useMutation({
    mutationFn: (connId) => networkConnectionsService.acceptRequest(connId),
    onMutate: () => {
      const prevState = currentState;
      return { prevState };
    },
    onSuccess: (res) => {
      const returnedConnId =
        res?.connectionId || res?._id || res?.id || effectiveConnectionId || null;
      updateState(RELATIONSHIP_STATES.CONNECTED, returnedConnId);
      toast.success(
        "Connected",
        `You and ${studentName} are now connected on Zeitnah.`
      );
    },
    onError: (err, _variables, context) => {
      if (context?.prevState) setCurrentState(context.prevState);
      const msg =
        err.response?.data?.message || "Failed to accept connection request.";
      toast.error("Accept Failed", msg);
    },
  });

  // ── 3. Decline Request Mutation ──
  const declineMutation = useMutation({
    mutationFn: (connId) => networkConnectionsService.declineRequest(connId),
    onMutate: () => {
      const prevState = currentState;
      return { prevState };
    },
    onSuccess: () => {
      updateState(RELATIONSHIP_STATES.NONE, null);
      toast.info(
        "Request Declined",
        `Declined connection request from ${studentName}.`
      );
    },
    onError: (err, _variables, context) => {
      if (context?.prevState) setCurrentState(context.prevState);
      const msg =
        err.response?.data?.message || "Failed to decline connection request.";
      toast.error("Action Failed", msg);
    },
  });

  // ── 4. Cancel Outgoing Request Mutation ──
  const cancelMutation = useMutation({
    mutationFn: (connId) => networkConnectionsService.cancelRequest(connId),
    onMutate: () => {
      const prevState = currentState;
      return { prevState };
    },
    onSuccess: () => {
      updateState(RELATIONSHIP_STATES.NONE, null);
      toast.info(
        "Request Cancelled",
        `Cancelled connection request to ${studentName}.`
      );
    },
    onError: (err, _variables, context) => {
      if (context?.prevState) setCurrentState(context.prevState);
      const msg =
        err.response?.data?.message || "Failed to cancel connection request.";
      toast.error("Action Failed", msg);
    },
  });

  // ── 5. Remove Connection Mutation ──
  const removeMutation = useMutation({
    mutationFn: (connId) => networkConnectionsService.removeConnection(connId),
    onMutate: () => {
      const prevState = currentState;
      return { prevState };
    },
    onSuccess: () => {
      updateState(RELATIONSHIP_STATES.NONE, null);
      toast.info(
        "Connection Removed",
        `Removed ${studentName} from your network.`
      );
    },
    onError: (err, _variables, context) => {
      if (context?.prevState) setCurrentState(context.prevState);
      const msg =
        err.response?.data?.message || "Failed to remove connection.";
      toast.error("Action Failed", msg);
    },
  });

  const isSending = sendMutation.isPending;
  const isAccepting = acceptMutation.isPending;
  const isDeclining = declineMutation.isPending;
  const isCancelling = cancelMutation.isPending;
  const isRemoving = removeMutation.isPending;

  const isAnyActionPending =
    isSending || isAccepting || isDeclining || isCancelling || isRemoving;

  // ── CASE: SELF ──
  if (effectiveState === RELATIONSHIP_STATES.SELF) {
    return (
      <span className="inline-flex items-center justify-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs font-semibold text-text-muted select-none min-h-[38px]">
        You
      </span>
    );
  }

  // ── CASE: CONNECTED (Quiet Completed Relationship) ──
  if (effectiveState === RELATIONSHIP_STATES.CONNECTED) {
    if (confirmRemove) {
      return (
        <div className="flex items-center justify-end gap-1.5 animate-fade-in min-h-[38px]">
          <span className="text-[11px] font-medium text-text-muted select-none">
            Remove?
          </span>
          <button
            type="button"
            disabled={isRemoving}
            onClick={() => {
              const idToUse = effectiveConnectionId || targetUserId;
              if (idToUse) removeMutation.mutate(idToUse);
            }}
            aria-label={`Confirm remove connection with ${studentName}`}
            className="rounded-lg bg-rose-500/15 border border-rose-500/30 px-2.5 py-1 text-[11px] font-bold text-rose-300 hover:bg-rose-500/25 transition-colors focus-ring disabled:opacity-50 cursor-pointer"
          >
            {isRemoving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Yes"}
          </button>
          <button
            type="button"
            disabled={isRemoving}
            onClick={() => setConfirmRemove(false)}
            aria-label="Cancel removal"
            className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-text-muted hover:text-white transition-colors focus-ring disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1.5 min-h-[38px] w-full justify-end">
        <span
          className={`inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-text-secondary font-medium select-none transition-all duration-200 ${
            variant === "full"
              ? "w-full py-2 px-4 text-xs"
              : variant === "icon"
              ? "p-2"
              : "flex-1 py-1.5 px-3 text-xs"
          }`}
        >
          <UserCheck className="h-3.5 w-3.5 text-brand-mint/90 shrink-0" aria-hidden="true" />
          <span>Connected</span>
        </span>

        {/* Quiet Remove Action */}
        <button
          type="button"
          disabled={isAnyActionPending}
          onClick={() => setConfirmRemove(true)}
          title={`Remove connection with ${studentName}`}
          aria-label={`Remove connection with ${studentName}`}
          className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2 text-text-muted/70 hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-400 transition-colors focus-ring cursor-pointer shrink-0 disabled:opacity-50 min-h-[38px] min-w-[38px] flex items-center justify-center"
        >
          {isRemoving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-400" />
          ) : (
            <UserMinus className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </button>
      </div>
    );
  }

  // ── CASE: OUTGOING PENDING (Refined Warm Muted Status) ──
  if (effectiveState === RELATIONSHIP_STATES.PENDING_OUTGOING) {
    return (
      <div className="flex items-center gap-1.5 min-h-[38px] w-full justify-end">
        <span
          className={`inline-flex items-center justify-center gap-1.5 rounded-xl border select-none transition-all duration-200 ${
            justSent
              ? "border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-300 font-semibold"
              : "border-amber-400/25 bg-amber-400/[0.06] text-amber-200/90 font-medium"
          } ${
            variant === "full"
              ? "w-full py-2 px-4 text-xs"
              : variant === "icon"
              ? "p-2"
              : "flex-1 py-1.5 px-3 text-xs"
          }`}
        >
          {justSent ? (
            <>
              <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400 animate-scale-in" aria-hidden="true" />
              <span>Request Sent</span>
            </>
          ) : (
            <>
              <Clock className="h-3.5 w-3.5 text-amber-400/80 shrink-0" aria-hidden="true" />
              <span>Pending</span>
            </>
          )}
        </span>

        {/* Quiet Cancel Outgoing Request Trigger */}
        <button
          type="button"
          disabled={isAnyActionPending}
          onClick={() => {
            const idToUse = effectiveConnectionId || targetUserId;
            if (idToUse) cancelMutation.mutate(idToUse);
          }}
          title={`Cancel connection request to ${studentName}`}
          aria-label={`Cancel connection request to ${studentName}`}
          className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2 text-text-muted/70 hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-400 transition-colors focus-ring cursor-pointer shrink-0 disabled:opacity-50 min-h-[38px] min-w-[38px] flex items-center justify-center"
        >
          {isCancelling ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-400" />
          ) : (
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </button>
      </div>
    );
  }

  // ── CASE: INCOMING PENDING (Accept / Decline) ──
  if (effectiveState === RELATIONSHIP_STATES.PENDING_INCOMING) {
    return (
      <div className="flex items-center gap-2 min-h-[38px] w-full justify-end">
        {/* Decline: Restrained non-destructive neutral */}
        <button
          type="button"
          disabled={isAnyActionPending}
          onClick={() => {
            const idToUse = effectiveConnectionId || targetUserId;
            if (idToUse) declineMutation.mutate(idToUse);
          }}
          title={`Decline connection request from ${studentName}`}
          aria-label={`Decline connection request from ${studentName}`}
          className="rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07] text-text-muted hover:text-white p-2 text-xs font-semibold transition-all focus-ring cursor-pointer shrink-0 disabled:opacity-50 min-h-[38px] min-w-[38px] flex items-center justify-center"
        >
          {isDeclining ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </button>

        {/* Accept: Primary brand mint */}
        <button
          type="button"
          disabled={isAnyActionPending}
          onClick={() => {
            const idToUse = effectiveConnectionId || targetUserId;
            if (idToUse) acceptMutation.mutate(idToUse);
          }}
          aria-label={`Accept connection request from ${studentName}`}
          className={`inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand-mint text-bg-base font-bold hover:bg-brand-mint/90 transition-all focus-ring shadow-sm shadow-brand-mint/15 disabled:opacity-60 cursor-pointer min-h-[38px] ${
            variant === "full" ? "w-full py-2 px-4 text-xs" : "flex-1 py-1.5 px-3 text-xs"
          }`}
        >
          {isAccepting ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Accepting...</span>
            </>
          ) : (
            <>
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Accept</span>
            </>
          )}
        </button>
      </div>
    );
  }

  // ── CASE: NONE (Connect Action & Connecting... state) ──
  return (
    <button
      type="button"
      disabled={isAnyActionPending}
      onClick={() => {
        if (!isAnyActionPending) {
          sendMutation.mutate();
        }
      }}
      aria-label={
        isSending
          ? `Connecting with ${studentName}...`
          : `Connect with ${studentName}`
      }
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl border border-brand-mint/30 bg-brand-mint/[0.08] hover:bg-brand-mint/[0.16] hover:border-brand-mint/50 text-brand-mint font-bold transition-all duration-200 focus-ring cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed min-h-[38px] ${
        variant === "full"
          ? "w-full py-2 px-4 text-xs font-bold"
          : variant === "icon"
          ? "p-2"
          : "w-full py-1.5 px-3 text-xs min-w-[96px]"
      }`}
    >
      {isSending ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-mint shrink-0" />
          {variant !== "icon" && <span>Connecting...</span>}
        </>
      ) : (
        <>
          <UserPlus className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {variant !== "icon" && <span>Connect</span>}
        </>
      )}
    </button>
  );
}
