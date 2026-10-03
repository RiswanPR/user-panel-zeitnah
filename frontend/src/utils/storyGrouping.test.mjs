import test from "node:test";
import assert from "node:assert/strict";
import { groupStoriesByUser } from "./storyGrouping.js";

test("Story Grouping & Ordering — Phase 5 Verification", async (t) => {
  const currentUserId = "user-current";

  await t.test("Case 1: Alice has 1 story -> exactly 1 Story group", () => {
    const stories = [
      {
        _id: "story-1",
        authorId: "alice",
        author: { _id: "alice", name: "Alice", username: "alice" },
        createdAt: "2026-10-01T10:00:00Z",
      },
    ];

    const { userGroups } = groupStoriesByUser(stories, currentUserId);
    assert.equal(userGroups.length, 1);
    assert.equal(userGroups[0].userId, "alice");
    assert.equal(userGroups[0].displayName, "Alice");
    assert.equal(userGroups[0].stories.length, 1);
  });

  await t.test("Case 2: Alice has 3 stories -> ONE Story icon only", () => {
    const stories = [
      {
        _id: "story-1",
        authorId: "alice",
        author: { _id: "alice", name: "Alice" },
        createdAt: "2026-10-01T10:00:00Z",
      },
      {
        _id: "story-2",
        authorId: "alice",
        author: { _id: "alice", name: "Alice" },
        createdAt: "2026-10-01T11:00:00Z",
      },
      {
        _id: "story-3",
        authorId: "alice",
        author: { _id: "alice", name: "Alice" },
        createdAt: "2026-10-01T12:00:00Z",
      },
    ];

    const { userGroups } = groupStoriesByUser(stories, currentUserId);
    assert.equal(userGroups.length, 1, "Must have exactly 1 icon for Alice");
    assert.equal(userGroups[0].userId, "alice");
    assert.equal(userGroups[0].stories.length, 3, "Alice group must contain all 3 stories");
  });

  await t.test("Case 3: Alice 3, Bob 2, Chris 1 -> exactly 3 icons", () => {
    const stories = [
      { _id: "a1", authorId: "alice", author: { _id: "alice", name: "Alice" }, createdAt: "2026-10-01T10:00:00Z" },
      { _id: "b1", authorId: "bob", author: { _id: "bob", name: "Bob" }, createdAt: "2026-10-01T10:30:00Z" },
      { _id: "a2", authorId: "alice", author: { _id: "alice", name: "Alice" }, createdAt: "2026-10-01T11:00:00Z" },
      { _id: "c1", authorId: "chris", author: { _id: "chris", name: "Chris" }, createdAt: "2026-10-01T11:30:00Z" },
      { _id: "b2", authorId: "bob", author: { _id: "bob", name: "Bob" }, createdAt: "2026-10-01T12:00:00Z" },
      { _id: "a3", authorId: "alice", author: { _id: "alice", name: "Alice" }, createdAt: "2026-10-01T12:30:00Z" },
    ];

    const { userGroups } = groupStoriesByUser(stories, currentUserId);
    assert.equal(userGroups.length, 3, "Must have exactly 3 icons for 3 unique users");
    const userIds = userGroups.map((g) => g.userId);
    assert.ok(userIds.includes("alice"));
    assert.ok(userIds.includes("bob"));
    assert.ok(userIds.includes("chris"));
  });

  await t.test("Case 4: Alice uploads a new story -> still exactly 1 Alice icon with 4 stories internally", () => {
    const storiesInitial = [
      { _id: "a1", authorId: "alice", author: { _id: "alice", name: "Alice" }, createdAt: "2026-10-01T10:00:00Z" },
      { _id: "a2", authorId: "alice", author: { _id: "alice", name: "Alice" }, createdAt: "2026-10-01T11:00:00Z" },
      { _id: "a3", authorId: "alice", author: { _id: "alice", name: "Alice" }, createdAt: "2026-10-01T12:00:00Z" },
    ];

    const initial = groupStoriesByUser(storiesInitial, currentUserId);
    assert.equal(initial.userGroups.length, 1);
    assert.equal(initial.userGroups[0].stories.length, 3);

    // New story added
    const storiesUpdated = [
      ...storiesInitial,
      { _id: "a4", authorId: "alice", author: { _id: "alice", name: "Alice" }, createdAt: "2026-10-01T13:00:00Z" },
    ];

    const updated = groupStoriesByUser(storiesUpdated, currentUserId);
    assert.equal(updated.userGroups.length, 1, "Must still have exactly 1 icon for Alice");
    assert.equal(updated.userGroups[0].stories.length, 4, "Must now have 4 stories internally");
  });

  await t.test("Case 5: One Alice story expires -> Alice still appears if active story remains", () => {
    const future = new Date(Date.now() + 1000 * 60 * 60).toISOString();
    const past = new Date(Date.now() - 1000 * 60 * 60).toISOString();

    const stories = [
      { _id: "a1", authorId: "alice", author: { _id: "alice", name: "Alice" }, expiresAt: past },
      { _id: "a2", authorId: "alice", author: { _id: "alice", name: "Alice" }, expiresAt: future },
    ];

    const { userGroups } = groupStoriesByUser(stories, currentUserId);
    assert.equal(userGroups.length, 1);
    assert.equal(userGroups[0].stories.length, 1);
    assert.equal(userGroups[0].stories[0]._id, "a2");
  });

  await t.test("Case 6: All Alice stories expire -> Alice disappears", () => {
    const past = new Date(Date.now() - 1000 * 60 * 60).toISOString();

    const stories = [
      { _id: "a1", authorId: "alice", author: { _id: "alice", name: "Alice" }, expiresAt: past },
      { _id: "a2", authorId: "alice", author: { _id: "alice", name: "Alice" }, expiresAt: past },
    ];

    const { userGroups } = groupStoriesByUser(stories, currentUserId);
    assert.equal(userGroups.length, 0, "Alice must disappear when all stories expire");
  });

  await t.test("Case 7: Duplicate API records accidentally appear -> single Alice group with deduplicated stories", () => {
    const stories = [
      { _id: "a1", authorId: "alice", author: { _id: "alice", name: "Alice" }, createdAt: "2026-10-01T10:00:00Z" },
      { _id: "a1", authorId: "alice", author: { _id: "alice", name: "Alice" }, createdAt: "2026-10-01T10:00:00Z" },
      { _id: "a2", authorId: "alice", author: { _id: "alice", name: "Alice" }, createdAt: "2026-10-01T11:00:00Z" },
    ];

    const { userGroups } = groupStoriesByUser(stories, currentUserId);
    assert.equal(userGroups.length, 1);
    assert.equal(userGroups[0].stories.length, 2, "Duplicate story record must be filtered");
  });

  await t.test("Case 8: Stories within user group ordered oldest -> newest for sequential playback", () => {
    const stories = [
      { _id: "s3", authorId: "alice", author: { _id: "alice", name: "Alice" }, createdAt: "2026-10-01T14:00:00Z" },
      { _id: "s1", authorId: "alice", author: { _id: "alice", name: "Alice" }, createdAt: "2026-10-01T10:00:00Z" },
      { _id: "s2", authorId: "alice", author: { _id: "alice", name: "Alice" }, createdAt: "2026-10-01T12:00:00Z" },
    ];

    const { userGroups } = groupStoriesByUser(stories, currentUserId);
    assert.equal(userGroups[0].stories[0]._id, "s1");
    assert.equal(userGroups[0].stories[1]._id, "s2");
    assert.equal(userGroups[0].stories[2]._id, "s3");
  });

  await t.test("Case 9: Current user stories isolated to currentUserGroup", () => {
    const stories = [
      { _id: "own1", authorId: currentUserId, author: { _id: currentUserId, name: "Me" }, createdAt: "2026-10-01T10:00:00Z" },
      { _id: "other1", authorId: "bob", author: { _id: "bob", name: "Bob" }, createdAt: "2026-10-01T11:00:00Z" },
    ];

    const { currentUserGroup, userGroups } = groupStoriesByUser(stories, currentUserId);
    assert.ok(currentUserGroup, "Must identify current user group");
    assert.equal(currentUserGroup.userId, currentUserId);
    assert.equal(userGroups.length, 1);
    assert.equal(userGroups[0].userId, "bob");
  });

  await t.test("Case 10: Unseen story groups prioritized over seen story groups", () => {
    const viewedIds = new Set(["seen1"]);
    const stories = [
      { _id: "seen1", authorId: "bob", author: { _id: "bob", name: "Bob" }, createdAt: "2026-10-01T12:00:00Z" },
      { _id: "unseen1", authorId: "alice", author: { _id: "alice", name: "Alice" }, createdAt: "2026-10-01T10:00:00Z" },
    ];

    const { userGroups } = groupStoriesByUser(stories, currentUserId, viewedIds);
    assert.equal(userGroups[0].userId, "alice", "Alice with unseen story must be prioritized over Bob");
    assert.equal(userGroups[1].userId, "bob");
  });
});
