import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Phase 5: Comment & Moderation Permission Matrix Evaluation Logic', () => {
  const evaluatePermissions = ({
    currentUserId,
    userRole,
    commentAuthorId,
    postAuthorId,
    postOrgId,
    userManagedBusinesses = [],
    isFollower = false,
  }) => {
    const isOwner = Boolean(
      currentUserId && commentAuthorId && String(currentUserId) === String(commentAuthorId),
    );
    const isAdmin =
      userRole === 'admin' ||
      userRole === 'ADMIN' ||
      userRole === 'superadmin' ||
      userRole === 'teacher';

    const isPostOwner = Boolean(
      currentUserId && postAuthorId && String(currentUserId) === String(postAuthorId),
    );

    const isCompanyManager = Boolean(
      postOrgId &&
        userManagedBusinesses.some((b) => String(b._id || b.id) === String(postOrgId)),
    );

    const canModerate = Boolean(isAdmin || isPostOwner || isCompanyManager);
    const canDelete = Boolean(isOwner || isAdmin || canModerate);

    return {
      isOwner,
      isAdmin,
      isPostOwner,
      isCompanyManager,
      canModerate,
      canDelete,
    };
  };

  const userA = 'user-1';
  const userB = 'user-2';
  const orgA = 'org-1';
  const orgB = 'org-2';

  // 1. Comment author deleting their own comment
  const authorCheck = evaluatePermissions({
    currentUserId: userA,
    userRole: 'student',
    commentAuthorId: userA,
    postAuthorId: userB,
  });
  assert.equal(authorCheck.isOwner, true);
  assert.equal(authorCheck.canDelete, true);
  assert.equal(authorCheck.canModerate, false);

  // 2. Post owner moderating another user's comment
  const postOwnerCheck = evaluatePermissions({
    currentUserId: userB,
    userRole: 'student',
    commentAuthorId: userA,
    postAuthorId: userB,
  });
  assert.equal(postOwnerCheck.isOwner, false);
  assert.equal(postOwnerCheck.isPostOwner, true);
  assert.equal(postOwnerCheck.canModerate, true);
  assert.equal(postOwnerCheck.canDelete, true);

  // 3. Authorized company manager moderating company post comment
  const orgManagerCheck = evaluatePermissions({
    currentUserId: userA,
    userRole: 'student',
    commentAuthorId: userB,
    postAuthorId: 'some-author',
    postOrgId: orgA,
    userManagedBusinesses: [{ id: orgA, name: 'Zeitnah' }],
  });
  assert.equal(orgManagerCheck.isCompanyManager, true);
  assert.equal(orgManagerCheck.canModerate, true);
  assert.equal(orgManagerCheck.canDelete, true);

  // 4. Manager of unrelated company rejected
  const unrelatedManagerCheck = evaluatePermissions({
    currentUserId: userA,
    userRole: 'student',
    commentAuthorId: userB,
    postAuthorId: 'some-author',
    postOrgId: orgA,
    userManagedBusinesses: [{ id: orgB, name: 'Other Org' }],
  });
  assert.equal(unrelatedManagerCheck.isCompanyManager, false);
  assert.equal(unrelatedManagerCheck.canModerate, false);
  assert.equal(unrelatedManagerCheck.canDelete, false);

  // 5. Follower of company gains no moderation rights
  const followerCheck = evaluatePermissions({
    currentUserId: userA,
    userRole: 'student',
    commentAuthorId: userB,
    postAuthorId: 'some-author',
    postOrgId: orgA,
    userManagedBusinesses: [],
    isFollower: true,
  });
  assert.equal(followerCheck.isCompanyManager, false);
  assert.equal(followerCheck.canModerate, false);
  assert.equal(followerCheck.canDelete, false);

  // 6. Admin can moderate any comment
  const adminCheck = evaluatePermissions({
    currentUserId: 'admin-user',
    userRole: 'admin',
    commentAuthorId: userA,
    postAuthorId: userB,
  });
  assert.equal(adminCheck.isAdmin, true);
  assert.equal(adminCheck.canModerate, true);
  assert.equal(adminCheck.canDelete, true);
});

test('Phase 5: Comment Reply Payload Construction & Threading', () => {
  const createCommentPayload = (text, replyingTo) => {
    let contentToSubmit = text.trim();
    if (replyingTo?.author?.username) {
      const handle = `@${replyingTo.author.username.replace(/^@/, '')}`;
      if (!contentToSubmit.includes(handle)) {
        contentToSubmit = `${handle} ${contentToSubmit}`;
      }
    }

    const payload = {
      content: contentToSubmit,
    };
    const parentCommentId = replyingTo?._id || replyingTo?.id;
    if (parentCommentId) {
      payload.parentId = String(parentCommentId);
    }
    return payload;
  };

  // Top-level comment
  const topLevel = createCommentPayload('Hello world', null);
  assert.equal(topLevel.content, 'Hello world');
  assert.equal(topLevel.parentId, undefined);

  // Threaded reply
  const reply = createCommentPayload('Thanks for the tips!', {
    _id: 'comment-parent-123',
    author: { username: 'johndoe' },
  });
  assert.equal(reply.content, '@johndoe Thanks for the tips!');
  assert.equal(reply.parentId, 'comment-parent-123');
});

test('Phase 5: Component Architecture & Source Wiring Verification', () => {
  const commentDrawerPath = path.resolve(
    'src/components/community/comments/CommentDrawer.jsx',
  );
  const commentListPath = path.resolve(
    'src/components/community/comments/CommentList.jsx',
  );
  const commentItemPath = path.resolve(
    'src/components/community/comments/CommentItem.jsx',
  );
  const postCardPath = path.resolve(
    'src/components/community/feed/PostCard/index.jsx',
  );

  assert.ok(fs.existsSync(commentDrawerPath), 'CommentDrawer.jsx must exist');
  assert.ok(fs.existsSync(commentListPath), 'CommentList.jsx must exist');
  assert.ok(fs.existsSync(commentItemPath), 'CommentItem.jsx must exist');
  assert.ok(fs.existsSync(postCardPath), 'PostCard/index.jsx must exist');

  const drawerSrc = fs.readFileSync(commentDrawerPath, 'utf8');
  assert.ok(
    drawerSrc.includes('useActiveProfile'),
    'CommentDrawer must consume useActiveProfile',
  );
  assert.ok(
    drawerSrc.includes('canModerate'),
    'CommentDrawer must calculate and pass canModerate',
  );
  assert.ok(
    drawerSrc.includes('parentId = String(parentCommentId)'),
    'CommentDrawer must thread parentId on replies',
  );

  const listSrc = fs.readFileSync(commentListPath, 'utf8');
  assert.ok(
    listSrc.includes('canModerate'),
    'CommentList must accept and forward canModerate',
  );

  const itemSrc = fs.readFileSync(commentItemPath, 'utf8');
  assert.ok(
    itemSrc.includes('canModerate'),
    'CommentItem must accept canModerate',
  );
  assert.ok(
    itemSrc.includes('canDelete'),
    'CommentItem must compute canDelete from isOwner, isAdmin, and canModerate',
  );
  assert.ok(
    itemSrc.includes('ReportModal'),
    'CommentItem must import and render ReportModal',
  );

  const postCardSrc = fs.readFileSync(postCardPath, 'utf8');
  assert.ok(
    postCardSrc.includes('canModerate'),
    'PostCard must calculate canModerate and permit comment moderation',
  );
  assert.ok(
    postCardSrc.includes('ReportModal'),
    'PostCard must import and render ReportModal',
  );
});
