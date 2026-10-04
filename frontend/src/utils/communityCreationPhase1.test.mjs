import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Zeitnah Community — Phase 1: Premium Create Foundation Verification', async (t) => {
  const srcDir = path.resolve('src');

  await t.test('1. CreateActionModal defines premium Create Chooser with Post and Reel pillars', () => {
    const chooserPath = path.join(srcDir, 'components', 'community', 'composer', 'CreateActionModal.jsx');
    assert.ok(fs.existsSync(chooserPath), 'CreateActionModal.jsx must exist');
    const content = fs.readFileSync(chooserPath, 'utf8');

    // Desktop geometry & dialog attributes
    assert.ok(content.includes('role="dialog"'), 'CreateActionModal must have role="dialog"');
    assert.ok(content.includes('aria-modal="true"'), 'CreateActionModal must have aria-modal="true"');
    assert.ok(content.includes('aria-labelledby="create-chooser-title"'), 'CreateActionModal must be labelled by create-chooser-title');
    assert.ok(content.includes('What do you want to share?'), 'CreateActionModal must present clear creation prompt');

    // Post choice
    assert.ok(content.includes('id="create-action-post"'), 'CreateActionModal must have create-action-post button');
    assert.ok(content.includes('POST'), 'CreateActionModal must offer POST format');
    assert.ok(content.includes('onSelectPost'), 'CreateActionModal must call onSelectPost');

    // Reel choice
    assert.ok(content.includes('id="create-action-reel"'), 'CreateActionModal must have create-action-reel button');
    assert.ok(content.includes('REEL'), 'CreateActionModal must offer REEL format');
    assert.ok(content.includes('onSelectReel'), 'CreateActionModal must call onSelectReel');

    // Keyboard & accessibility
    assert.ok(content.includes("e.key === 'Escape'"), 'CreateActionModal must handle Escape key dismissal');
    assert.ok(content.includes('useReducedMotion'), 'CreateActionModal must support reduced motion');
  });

  await t.test('2. ReelStudioModal establishes 9:16 preview, validation, and upload architecture', () => {
    const reelStudioPath = path.join(srcDir, 'components', 'community', 'composer', 'ReelStudioModal.jsx');
    assert.ok(fs.existsSync(reelStudioPath), 'ReelStudioModal.jsx must exist');
    const content = fs.readFileSync(reelStudioPath, 'utf8');

    // True 9:16 aspect ratio
    assert.ok(content.includes('aspect-[9/16]'), 'ReelStudioModal must enforce true 9:16 aspect ratio preview');

    // Client-side video validation limits (90 seconds duration, 1 GB size, supported formats)
    assert.ok(content.includes('duration > 90'), 'ReelStudioModal must enforce 90-second duration limit');
    assert.ok(content.includes('1024 * 1024 * 1024'), 'ReelStudioModal must enforce 1 GB file size limit');
    assert.ok(content.includes("['mp4', 'mov', 'webm']"), 'ReelStudioModal must validate supported video extensions');

    // Reuses existing communityApi.uploadMedia with honest progress
    assert.ok(content.includes('communityApi.uploadMedia'), 'ReelStudioModal must reuse existing communityApi.uploadMedia');
    assert.ok(content.includes('progressEvent.total'), 'ReelStudioModal must track honest progress via upload events');

    // Upload cancellation with AbortController
    assert.ok(content.includes('abortControllerRef'), 'ReelStudioModal must define abortControllerRef');
    assert.ok(content.includes('data-testid="cancel-reel-upload-btn"'), 'ReelStudioModal must provide cancel-reel-upload-btn');

    // Unsaved changes discard guard
    assert.ok(content.includes('Discard Reel changes?'), 'ReelStudioModal must prompt on discard with unsaved changes');
    assert.ok(content.includes('handleConfirmDiscard'), 'ReelStudioModal must provide handleConfirmDiscard');

    // Resource cleanup
    assert.ok(content.includes('URL.revokeObjectURL'), 'ReelStudioModal must revoke object URLs on cleanup');
  });

  await t.test('3. PostStudioModal shell exists and wraps post composer capabilities', () => {
    const postStudioPath = path.join(srcDir, 'components', 'community', 'composer', 'PostStudioModal.jsx');
    assert.ok(fs.existsSync(postStudioPath), 'PostStudioModal.jsx must exist');
    const content = fs.readFileSync(postStudioPath, 'utf8');
    assert.ok(content.includes('CreatePostModal'), 'PostStudioModal must wrap CreatePostModal');
  });

  await t.test('4. App.jsx defines dedicated creation routes without breaking existing routes', () => {
    const appPath = path.join(srcDir, 'App.jsx');
    const content = fs.readFileSync(appPath, 'utf8');
    assert.ok(content.includes('path="/community/create/post"'), 'App.jsx must register /community/create/post route');
    assert.ok(content.includes('path="/community/create/reel"'), 'App.jsx must register /community/create/reel route');
    assert.ok(content.includes('path="/community"'), 'App.jsx must preserve /community route');
    assert.ok(content.includes('path="/community/reels"'), 'App.jsx must preserve /community/reels route');
  });

  await t.test('5. CommunityHome.jsx orchestrates both Post and Reel studios with lazy loading and route sync', () => {
    const homePath = path.join(srcDir, 'pages', 'community', 'CommunityHome.jsx');
    const content = fs.readFileSync(homePath, 'utf8');
    assert.ok(content.includes('const ReelStudioModal = lazyWithRetry('), 'CommunityHome must lazily import ReelStudioModal');
    assert.ok(content.includes('const CreatePostModal = lazyWithRetry('), 'CommunityHome must lazily import CreatePostModal');
    assert.ok(content.includes('onSelectPost={handleOpenCreatePost}'), 'CommunityHome must wire onSelectPost with route sync');
    assert.ok(content.includes('onSelectReel={handleOpenCreateReel}'), 'CommunityHome must wire onSelectReel with route sync');
    assert.ok(content.includes('<ReelStudioModal'), 'CommunityHome must render ReelStudioModal');
    assert.ok(content.includes('<CreatePostModal'), 'CommunityHome must render CreatePostModal');
  });
});
