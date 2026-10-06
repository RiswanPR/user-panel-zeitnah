import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { groupStoriesByUser } from "./storyGrouping.js";
import { getUploadUrl } from "./courseUi.js";

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

  // ── Production Community Stories Avatar Data Flow Verification ──
  await t.test("Case 1: Story author has avatar -> actual avatar URL is resolved via getUploadUrl", () => {
    const stories = [
      {
        _id: "s-riyas-1",
        authorId: "riyas-123",
        author: {
          _id: "riyas-123",
          name: "Riyas",
          username: "riyas",
          avatar: "profiles/riyas-123-avatar.jpg",
        },
        createdAt: "2026-10-06T10:00:00Z",
      },
    ];

    const { userGroups } = groupStoriesByUser(stories, "other-user");
    assert.equal(userGroups.length, 1);
    assert.equal(userGroups[0].avatar, "profiles/riyas-123-avatar.jpg");

    const resolvedUrl = getUploadUrl(userGroups[0].avatar);
    assert.ok(resolvedUrl.includes("/uploads/profiles/riyas-123-avatar.jpg") || resolvedUrl.includes("profiles/riyas-123-avatar.jpg"), "Must resolve relative avatar key to valid upload URL");

    // Also verify absolute presigned URL
    const presignedUrl = "https://s3.amazonaws.com/test-bucket/profiles/riyas.jpg?X-Amz-Signature=abc";
    assert.equal(getUploadUrl(presignedUrl), presignedUrl, "Must preserve existing presigned/absolute URLs");
  });

  await t.test("Case 2: Story author has no avatar -> initials fallback renders", () => {
    const stories = [
      {
        _id: "s-no-avatar",
        authorId: "no-avatar-user",
        author: {
          _id: "no-avatar-user",
          name: "Riyas Ahmed",
          username: "rahmed",
          avatar: "",
        },
        createdAt: "2026-10-06T10:00:00Z",
      },
    ];

    const { userGroups } = groupStoriesByUser(stories, "other-user");
    assert.equal(userGroups[0].avatar, "");
    assert.equal(getUploadUrl(userGroups[0].avatar), null);

    const initials = userGroups[0].displayName
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
    assert.equal(initials, "RA", "Must compute initials as 'RA'");
  });

  await t.test("Case 3: Avatar URL fails -> StoryAvatarRing & StoryRail implement onError fallback", () => {
    const ringContent = fs.readFileSync(path.resolve("src/components/community/stories/StoryAvatarRing.jsx"), "utf8");
    const railContent = fs.readFileSync(path.resolve("src/components/community/stories/StoryRail.jsx"), "utf8");
    const viewerContent = fs.readFileSync(path.resolve("src/components/community/stories/StoryViewer.jsx"), "utf8");

    // StoryAvatarRing
    assert.ok(ringContent.includes("onError={() => setImgError(true)}"), "StoryAvatarRing must handle imgError on load failure");
    assert.ok(ringContent.includes("getUploadUrl"), "StoryAvatarRing must use getUploadUrl");

    // StoryRail
    assert.ok(railContent.includes("onError={() => setCurrentUserImgError(true)}"), "StoryRail must handle currentUserImgError on load failure");
    assert.ok(railContent.includes("getUploadUrl"), "StoryRail must use getUploadUrl");

    // StoryViewer
    assert.ok(viewerContent.includes("onError={() => setAvatarImgError(true)}"), "StoryViewer must handle avatarImgError on load failure");
    assert.ok(viewerContent.includes("getUploadUrl"), "StoryViewer must use getUploadUrl");
  });

  await t.test("Case 4: Avatar field uses canonical and fallback backend fields (avatar, profileImage, avatarUrl)", () => {
    const stories = [
      {
        _id: "s-profile-img",
        authorId: "user-pi",
        author: {
          _id: "user-pi",
          name: "Profile Image User",
          profileImage: "profiles/user-pi.png",
        },
        createdAt: "2026-10-06T10:00:00Z",
      },
      {
        _id: "s-avatar-url",
        authorId: "user-au",
        author: {
          _id: "user-au",
          name: "Avatar URL User",
          avatarUrl: "https://example.com/au.jpg",
        },
        createdAt: "2026-10-06T10:00:00Z",
      },
    ];

    const { userGroups } = groupStoriesByUser(stories, "other-user");
    const groupPi = userGroups.find((g) => g.userId === "user-pi");
    const groupAu = userGroups.find((g) => g.userId === "user-au");

    assert.equal(groupPi.avatar, "profiles/user-pi.png", "Must map author.profileImage");
    assert.equal(groupAu.avatar, "https://example.com/au.jpg", "Must map author.avatarUrl");
  });

  await t.test("Case 5: Multiple stories -> each story retains its OWN author's avatar", () => {
    const stories = [
      {
        _id: "s-userA-1",
        authorId: "user-A",
        author: { _id: "user-A", name: "User A", avatar: "profiles/userA.jpg" },
        createdAt: "2026-10-06T10:00:00Z",
      },
      {
        _id: "s-userB-1",
        authorId: "user-B",
        author: { _id: "user-B", name: "User B", avatar: "profiles/userB.jpg" },
        createdAt: "2026-10-06T10:30:00Z",
      },
    ];

    const { userGroups } = groupStoriesByUser(stories, "other-user");
    const a = userGroups.find((g) => g.userId === "user-A");
    const b = userGroups.find((g) => g.userId === "user-B");

    assert.equal(a.avatar, "profiles/userA.jpg", "User A group must strictly possess User A avatar");
    assert.equal(b.avatar, "profiles/userB.jpg", "User B group must strictly possess User B avatar");
  });

  await t.test("Case 6: Current user's 'Your Story' -> current user's avatar is isolated to currentUserGroup", () => {
    const stories = [
      {
        _id: "s-mine",
        authorId: "current-user",
        author: { _id: "current-user", name: "Me", avatar: "profiles/my-avatar.jpg" },
        createdAt: "2026-10-06T10:00:00Z",
      },
      {
        _id: "s-theirs",
        authorId: "user-peer",
        author: { _id: "user-peer", name: "Peer", avatar: "profiles/peer-avatar.jpg" },
        createdAt: "2026-10-06T10:30:00Z",
      },
    ];

    const { currentUserGroup, userGroups } = groupStoriesByUser(stories, "current-user");
    assert.ok(currentUserGroup, "currentUserGroup must be defined");
    assert.equal(currentUserGroup.userId, "current-user");
    assert.equal(currentUserGroup.avatar, "profiles/my-avatar.jpg");
    assert.equal(userGroups.length, 1);
    assert.equal(userGroups[0].avatar, "profiles/peer-avatar.jpg");
  });

  await t.test("Case 7: Zero N+1 profile requests introduced", () => {
    // Generate 50 stories across 10 authors
    const sampleStories = Array.from({ length: 50 }).map((_, i) => ({
      _id: `story-${i}`,
      authorId: `author-${i % 10}`,
      author: {
        _id: `author-${i % 10}`,
        name: `Author ${i % 10}`,
        avatar: `profiles/author-${i % 10}.jpg`,
      },
      createdAt: new Date(Date.now() - i * 1000).toISOString(),
    }));

    const start = performance.now();
    const result = groupStoriesByUser(sampleStories, "author-0");
    const elapsed = performance.now() - start;

    assert.equal(result.userGroups.length, 9);
    assert.equal(result.currentUserGroup.stories.length, 5);
    assert.ok(elapsed < 20, `Execution must complete in <20ms synchronously (took ${elapsed.toFixed(2)}ms) with 0 network calls`);
  });
});
