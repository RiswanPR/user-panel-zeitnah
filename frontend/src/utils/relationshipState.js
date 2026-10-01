/**
 * @file relationshipState.js
 * Centralized, canonical normalization of Zeitnah Network relationship states.
 *
 * Requirements Met:
 * - Single source of truth for relationship state across cards, search, requests, profile.
 * - Handles differences between backend services (e.g. pending_sent vs outgoing_pending).
 * - Implements strict state machine:
 *     NONE -> PENDING_OUTGOING -> CONNECTED
 *     PENDING_INCOMING -> CONNECTED
 *     Transitions back to NONE upon decline, cancel, or remove.
 */

export const RELATIONSHIP_STATES = Object.freeze({
  NONE: "none",
  PENDING_OUTGOING: "outgoing_pending",
  PENDING_INCOMING: "incoming_pending",
  CONNECTED: "connected",
  SELF: "self",
});

/**
 * Normalizes any person/connection object or state string into an authoritative state.
 *
 * @param {string|Object|null|undefined} input
 * @returns {'none' | 'outgoing_pending' | 'incoming_pending' | 'connected' | 'self'}
 */
export function normalizeRelationshipState(input) {
  if (!input) return RELATIONSHIP_STATES.NONE;

  let raw = "";
  let isRequester = undefined;
  let direction = undefined;

  if (typeof input === "string") {
    raw = input;
  } else if (typeof input === "object") {
    // If input is a user/connection wrapper
    raw =
      input.relationshipState ||
      input.connectionStatus ||
      input.state ||
      input.status ||
      "";
    isRequester = input.isRequester;
    direction = input.direction;
  }

  const s = String(raw).toLowerCase().trim();

  if (s === "self") {
    return RELATIONSHIP_STATES.SELF;
  }

  if (s === "connected" || s === "accepted") {
    return RELATIONSHIP_STATES.CONNECTED;
  }

  if (
    s === "outgoing_pending" ||
    s === "pending_sent" ||
    s === "sent" ||
    s === "pending_outgoing"
  ) {
    return RELATIONSHIP_STATES.PENDING_OUTGOING;
  }

  if (
    s === "incoming_pending" ||
    s === "pending_received" ||
    s === "received" ||
    s === "pending_incoming"
  ) {
    return RELATIONSHIP_STATES.PENDING_INCOMING;
  }

  // Handle generic "pending" status with context
  if (s === "pending") {
    if (isRequester === true || direction === "outgoing" || direction === "sent") {
      return RELATIONSHIP_STATES.PENDING_OUTGOING;
    }
    if (isRequester === false || direction === "incoming" || direction === "received") {
      return RELATIONSHIP_STATES.PENDING_INCOMING;
    }
    // Default fallback for ambiguous pending
    return RELATIONSHIP_STATES.PENDING_OUTGOING;
  }

  // If declined, cancelled, none, or unknown, relationship is NONE
  return RELATIONSHIP_STATES.NONE;
}

export function isPendingState(state) {
  const norm = normalizeRelationshipState(state);
  return (
    norm === RELATIONSHIP_STATES.PENDING_OUTGOING ||
    norm === RELATIONSHIP_STATES.PENDING_INCOMING
  );
}

export function isConnectedState(state) {
  return normalizeRelationshipState(state) === RELATIONSHIP_STATES.CONNECTED;
}

export function isSelfState(state) {
  return normalizeRelationshipState(state) === RELATIONSHIP_STATES.SELF;
}
