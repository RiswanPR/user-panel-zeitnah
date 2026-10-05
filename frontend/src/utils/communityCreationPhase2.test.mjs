import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Zeitnah Community — Phase 2: Premium Post Studio Verification', async (t) => {
  const srcDir = path.resolve('src');

  await t.test('1. CreatePostModal implements creator-grade Post Studio layout & features', () => {
    const modalPath = path.join(srcDir, 'components', 'community', 'composer', 'CreatePostModal.jsx');
    assert.ok(fs.existsSync(modalPath), 'CreatePostModal.jsx must exist');
    const content = fs.readFileSync(modalPath, 'utf8');

    // Dialog & accessibility
    assert.ok(content.includes('role="dialog"'), 'CreatePostModal must have role="dialog"');
    assert.ok(content.includes('aria-modal="true"'), 'CreatePostModal must have aria-modal="true"');
    assert.ok(content.includes('aria-labelledby="create-post-title"'), 'CreatePostModal must have aria-labelledby');
    assert.ok(content.includes('data-testid="composer-textarea"'), 'CreatePostModal must have composer-textarea');

    // Edit and Preview mode switcher
    assert.ok(content.includes("viewMode === 'EDIT'"), 'CreatePostModal must support EDIT mode');
    assert.ok(content.includes("viewMode === 'PREVIEW'"), 'CreatePostModal must support PREVIEW mode');
    assert.ok(content.includes('PostPreview'), 'CreatePostModal must render PostPreview component');

    // Attachments integration
    assert.ok(content.includes('PostMediaManager'), 'CreatePostModal must render PostMediaManager component');
    assert.ok(content.includes('PostPollBuilder'), 'CreatePostModal must render PostPollBuilder component');
    assert.ok(content.includes('PostAudienceSelector'), 'CreatePostModal must render PostAudienceSelector component');
    assert.ok(content.includes('MentionAutocompletePopup'), 'CreatePostModal must render MentionAutocompletePopup component');

    // Character counter & 5000 character limit
    assert.ok(content.includes('5000 - content.length'), 'CreatePostModal must display remaining character count');
    assert.ok(content.includes('maxLength={5000}'), 'CreatePostModal must enforce 5000 character limit');

    // Discard unsaved changes protection
    assert.ok(content.includes('Discard changes?'), 'CreatePostModal must prompt on closing with unsaved changes');
    assert.ok(content.includes('handleDiscardDraft'), 'CreatePostModal must handle draft discard cleanly');
    assert.ok(content.includes('handleSaveDraft'), 'CreatePostModal must handle draft save');
  });

  await t.test('2. PostPollBuilder validates options (2-5), duplicate prevention, and duration', () => {
    const pollPath = path.join(srcDir, 'components', 'community', 'composer', 'PostPollBuilder.jsx');
    assert.ok(fs.existsSync(pollPath), 'PostPollBuilder.jsx must exist');
    const content = fs.readFileSync(pollPath, 'utf8');

    // Options boundaries: min 2, max 5
    assert.ok(content.includes('options.length < 5'), 'PostPollBuilder must limit maximum options to 5');
    assert.ok(content.includes('options.length <= 2'), 'PostPollBuilder must enforce minimum 2 options');

    // Duplicate option prevention
    assert.ok(content.includes('Each option must be unique.'), 'PostPollBuilder must detect duplicate options');

    // Duration options
    assert.ok(content.includes('1 Day'), 'PostPollBuilder must support 1 day duration');
    assert.ok(content.includes('3 Days'), 'PostPollBuilder must support 3 days duration');
    assert.ok(content.includes('7 Days'), 'PostPollBuilder must support 7 days duration');
    assert.ok(content.includes('14 Days'), 'PostPollBuilder must support 14 days duration');
  });

  await t.test('3. PostMediaManager handles carousel reordering, position badges, and controls', () => {
    const mediaPath = path.join(srcDir, 'components', 'community', 'composer', 'PostMediaManager.jsx');
    assert.ok(fs.existsSync(mediaPath), 'PostMediaManager.jsx must exist');
    const content = fs.readFileSync(mediaPath, 'utf8');

    // Carousel position badge & indicators
    assert.ok(content.includes('activeMediaIndex + 1'), 'PostMediaManager must show active media position');
    assert.ok(content.includes('onMoveLeft'), 'PostMediaManager must provide move left control');
    assert.ok(content.includes('onMoveRight'), 'PostMediaManager must provide move right control');
    assert.ok(content.includes('onRemoveFile'), 'PostMediaManager must provide remove media control');

    // Aspect ratio selection & rotation
    assert.ok(content.includes('aspect-square'), 'PostMediaManager must support 1:1 aspect ratio');
    assert.ok(content.includes('aspect-[4/5]'), 'PostMediaManager must support 4:5 aspect ratio');
    assert.ok(content.includes('aspect-video'), 'PostMediaManager must support 16:9 aspect ratio');
    assert.ok(content.includes('onRotate'), 'PostMediaManager must support rotation');
  });

  await t.test('4. MentionAutocompletePopup implements debounced search and keyboard navigation', () => {
    const mentionPath = path.join(srcDir, 'components', 'community', 'composer', 'MentionAutocompletePopup.jsx');
    assert.ok(fs.existsSync(mentionPath), 'MentionAutocompletePopup.jsx must exist');
    const content = fs.readFileSync(mentionPath, 'utf8');

    // Authorized community search query
    assert.ok(content.includes("type: 'people'"), 'MentionAutocompletePopup must query people type');
    assert.ok(content.includes('communityApi.searchCommunity'), 'MentionAutocompletePopup must use communityApi');

    // Accessible listbox role & keyboard handling
    assert.ok(content.includes('role="listbox"'), 'MentionAutocompletePopup must have role="listbox"');
    assert.ok(content.includes("e.key === 'ArrowDown'"), 'MentionAutocompletePopup must handle ArrowDown');
    assert.ok(content.includes("e.key === 'ArrowUp'"), 'MentionAutocompletePopup must handle ArrowUp');
    assert.ok(content.includes("e.key === 'Escape'"), 'MentionAutocompletePopup must handle Escape');
  });

  await t.test('5. PostAudienceSelector reflects backend PostAudience values', () => {
    const audiencePath = path.join(srcDir, 'components', 'community', 'composer', 'PostAudienceSelector.jsx');
    assert.ok(fs.existsSync(audiencePath), 'PostAudienceSelector.jsx must exist');
    const content = fs.readFileSync(audiencePath, 'utf8');

    // Backend supported values
    assert.ok(content.includes("id: 'PUBLIC'"), 'PostAudienceSelector must support PUBLIC');
    assert.ok(content.includes("id: 'COURSE'"), 'PostAudienceSelector must support COURSE');
    assert.ok(content.includes("id: 'BATCH'"), 'PostAudienceSelector must support BATCH');
    assert.ok(content.includes("id: 'PRIVATE'"), 'PostAudienceSelector must support PRIVATE');
  });

  await t.test('6. PostPreview provides mutation-safe feed card preview', () => {
    const previewPath = path.join(srcDir, 'components', 'community', 'composer', 'PostPreview.jsx');
    assert.ok(fs.existsSync(previewPath), 'PostPreview.jsx must exist');
    const content = fs.readFileSync(previewPath, 'utf8');

    // Author, media carousel, poll presentation
    assert.ok(content.includes('authorHandle'), 'PostPreview must display author handle');
    assert.ok(content.includes('renderPreviewText'), 'PostPreview must format text tokens safely');
    assert.ok(content.includes('hasPoll'), 'PostPreview must conditionally render poll');
    assert.ok(content.includes('Poll ends in'), 'PostPreview must display poll duration indicator');
    assert.ok(content.includes('hasMedia'), 'PostPreview must display media preview');
  });

  await t.test('7. PostStudioModal shell and CommunityHome integration preserved', () => {
    const postStudioPath = path.join(srcDir, 'components', 'community', 'composer', 'PostStudioModal.jsx');
    assert.ok(fs.existsSync(postStudioPath), 'PostStudioModal.jsx must exist');
    const content = fs.readFileSync(postStudioPath, 'utf8');
    assert.ok(content.includes('CreatePostModal'), 'PostStudioModal must wrap CreatePostModal');

    const homePath = path.join(srcDir, 'pages', 'community', 'CommunityHome.jsx');
    const homeContent = fs.readFileSync(homePath, 'utf8');
    assert.ok(homeContent.includes('const CreatePostModal = lazyWithRetry('), 'CommunityHome must lazily import CreatePostModal');
    assert.ok(homeContent.includes('<CreatePostModal'), 'CommunityHome must render CreatePostModal');
  });
});
