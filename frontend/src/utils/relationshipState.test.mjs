import test from "node:test";
import assert from "node:assert/strict";
import {
  RELATIONSHIP_STATES,
  normalizeRelationshipState,
  isPendingState,
  isConnectedState,
  isSelfState,
} from "./relationshipState.js";

test("Relationship State Machine Normalization", async (t) => {
  await t.test("maps various pending_sent and outgoing_pending values to outgoing_pending", () => {
    assert.equal(normalizeRelationshipState("pending_sent"), RELATIONSHIP_STATES.PENDING_OUTGOING);
    assert.equal(normalizeRelationshipState("outgoing_pending"), RELATIONSHIP_STATES.PENDING_OUTGOING);
    assert.equal(normalizeRelationshipState("sent"), RELATIONSHIP_STATES.PENDING_OUTGOING);
    assert.equal(normalizeRelationshipState("pending_outgoing"), RELATIONSHIP_STATES.PENDING_OUTGOING);
    assert.equal(
      normalizeRelationshipState({ connectionStatus: "pending_sent" }),
      RELATIONSHIP_STATES.PENDING_OUTGOING
    );
    assert.equal(
      normalizeRelationshipState({ relationshipState: "outgoing_pending" }),
      RELATIONSHIP_STATES.PENDING_OUTGOING
    );
    assert.equal(
      normalizeRelationshipState({ status: "pending", isRequester: true }),
      RELATIONSHIP_STATES.PENDING_OUTGOING
    );
  });

  await t.test("maps incoming pending representations to incoming_pending", () => {
    assert.equal(normalizeRelationshipState("pending_received"), RELATIONSHIP_STATES.PENDING_INCOMING);
    assert.equal(normalizeRelationshipState("incoming_pending"), RELATIONSHIP_STATES.PENDING_INCOMING);
    assert.equal(normalizeRelationshipState("received"), RELATIONSHIP_STATES.PENDING_INCOMING);
    assert.equal(
      normalizeRelationshipState({ connectionStatus: "pending_received" }),
      RELATIONSHIP_STATES.PENDING_INCOMING
    );
    assert.equal(
      normalizeRelationshipState({ status: "pending", isRequester: false }),
      RELATIONSHIP_STATES.PENDING_INCOMING
    );
  });

  await t.test("maps connected and accepted to connected", () => {
    assert.equal(normalizeRelationshipState("connected"), RELATIONSHIP_STATES.CONNECTED);
    assert.equal(normalizeRelationshipState("accepted"), RELATIONSHIP_STATES.CONNECTED);
    assert.equal(
      normalizeRelationshipState({ connectionStatus: "connected" }),
      RELATIONSHIP_STATES.CONNECTED
    );
  });

  await t.test("maps declined, cancelled, none, and falsy to none", () => {
    assert.equal(normalizeRelationshipState("declined"), RELATIONSHIP_STATES.NONE);
    assert.equal(normalizeRelationshipState("cancelled"), RELATIONSHIP_STATES.NONE);
    assert.equal(normalizeRelationshipState("none"), RELATIONSHIP_STATES.NONE);
    assert.equal(normalizeRelationshipState(null), RELATIONSHIP_STATES.NONE);
    assert.equal(normalizeRelationshipState(undefined), RELATIONSHIP_STATES.NONE);
    assert.equal(normalizeRelationshipState(""), RELATIONSHIP_STATES.NONE);
  });

  await t.test("maps self to self", () => {
    assert.equal(normalizeRelationshipState("self"), RELATIONSHIP_STATES.SELF);
    assert.equal(isSelfState("self"), true);
  });

  await t.test("helper predicates work accurately", () => {
    assert.equal(isPendingState("pending_sent"), true);
    assert.equal(isPendingState("incoming_pending"), true);
    assert.equal(isPendingState("connected"), false);

    assert.equal(isConnectedState("accepted"), true);
    assert.equal(isConnectedState("connected"), true);
    assert.equal(isConnectedState("none"), false);
  });
});
