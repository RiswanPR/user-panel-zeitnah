import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Zeitnah Community — Phase 3A: Premium Reel Studio Verification', async (t) => {
  const srcDir = path.resolve('src');

  await t.test('1. ReelStudioModal implements 9:16 preview stage and metadata extraction', () => {
    const reelStudioPath = path.join(srcDir, 'components', 'community', 'composer', 'ReelStudioModal.jsx');
    assert.ok(fs.existsSync(reelStudioPath), 'ReelStudioModal.jsx must exist');
    const content = fs.readFileSync(reelStudioPath, 'utf8');

    // True 9:16 aspect ratio
    assert.ok(content.includes('aspect-[9/16]'), 'ReelStudioModal must enforce true 9:16 portrait aspect ratio');

    // Video metadata state
    assert.ok(content.includes('videoDimensions'), 'ReelStudioModal must track video dimensions');
    assert.ok(content.includes('videoDuration'), 'ReelStudioModal must track video duration');
    assert.ok(content.includes('formatFileSize'), 'ReelStudioModal must format and display file size');

    // Video playback controls
    assert.ok(content.includes('togglePlayPause'), 'ReelStudioModal must provide togglePlayPause');
    assert.ok(content.includes('toggleMute'), 'ReelStudioModal must provide toggleMute');
    assert.ok(content.includes('onTimeUpdate'), 'ReelStudioModal must bind onTimeUpdate');
  });

  await t.test('2. Video validation enforces 90s duration and 1GB size boundaries', () => {
    const reelStudioPath = path.join(srcDir, 'components', 'community', 'composer', 'ReelStudioModal.jsx');
    const content = fs.readFileSync(reelStudioPath, 'utf8');

    // Authoritative client pre-validation
    assert.ok(content.includes('duration > 90'), 'ReelStudioModal must reject video longer than 90 seconds');
    assert.ok(content.includes('1024 * 1024 * 1024'), 'ReelStudioModal must enforce 1 GB size limit');
    assert.ok(content.includes("['mp4', 'mov', 'webm']"), 'ReelStudioModal must check supported video extensions');
    assert.ok(content.includes('Reel must be 90 seconds or shorter.'), 'ReelStudioModal must show clear duration error message');
  });

  await t.test('3. ReelTimeline provides seeking, non-destructive trimming, and clip duration', () => {
    const timelinePath = path.join(srcDir, 'components', 'community', 'composer', 'ReelTimeline.jsx');
    assert.ok(fs.existsSync(timelinePath), 'ReelTimeline.jsx must exist');
    const content = fs.readFileSync(timelinePath, 'utf8');

    // Timeline seeking & range
    assert.ok(content.includes('handleTrackClick'), 'ReelTimeline must support track click seeking');
    assert.ok(content.includes('handleStartTrimDrag'), 'ReelTimeline must support dragging trim start');
    assert.ok(content.includes('handleEndTrimDrag'), 'ReelTimeline must support dragging trim end');

    // Boundary constraints: min 1 second clip duration
    assert.ok(content.includes('val <= effectiveTrimEnd - 1.0'), 'ReelTimeline must enforce trim start constraint');
    assert.ok(content.includes('val >= trimStart + 1.0'), 'ReelTimeline must enforce trim end constraint');
    assert.ok(content.includes('selectedDuration'), 'ReelTimeline must calculate selected clip duration');

    // ARIA accessibility
    assert.ok(content.includes('aria-label="Trim clip start"'), 'ReelTimeline must have aria-label for trim start');
  });

  await t.test('4. ReelCoverSelector provides frame extraction and custom cover upload', () => {
    const coverPath = path.join(srcDir, 'components', 'community', 'composer', 'ReelCoverSelector.jsx');
    assert.ok(fs.existsSync(coverPath), 'ReelCoverSelector.jsx must exist');
    const content = fs.readFileSync(coverPath, 'utf8');

    // Canvas frame extraction
    assert.ok(content.includes("document.createElement('canvas')"), 'ReelCoverSelector must create canvas for extraction');
    assert.ok(content.includes('ctx.drawImage(video'), 'ReelCoverSelector must draw current video frame');
    assert.ok(content.includes('canvas.toBlob'), 'ReelCoverSelector must convert canvas to blob');

    // Custom image upload & 8MB limit
    assert.ok(content.includes('8 * 1024 * 1024'), 'ReelCoverSelector must enforce 8MB limit for cover images');
    assert.ok(content.includes("['jpg', 'jpeg', 'png', 'webp']"), 'ReelCoverSelector must check cover image formats');

    // Cleanup
    assert.ok(content.includes('URL.revokeObjectURL'), 'ReelCoverSelector must clean up preview object URLs');
  });

  await t.test('5. Processing-aware state machine and upload cancellation', () => {
    const reelStudioPath = path.join(srcDir, 'components', 'community', 'composer', 'ReelStudioModal.jsx');
    const content = fs.readFileSync(reelStudioPath, 'utf8');

    // State machine steps
    assert.ok(content.includes("setStatus('SELECT')"), 'ReelStudioModal must support SELECT status');
    assert.ok(content.includes("setStatus('READY')"), 'ReelStudioModal must support READY status');
    assert.ok(content.includes("setStatus('UPLOADING')"), 'ReelStudioModal must support UPLOADING status');
    assert.ok(content.includes("setStatus('VALIDATING')"), 'ReelStudioModal must support VALIDATING status');
    assert.ok(content.includes("setStatus('READY_TO_PUBLISH')"), 'ReelStudioModal must support READY_TO_PUBLISH status');
    assert.ok(content.includes("setStatus('PUBLISHED')"), 'ReelStudioModal must support PUBLISHED status');
    assert.ok(content.includes("setStatus('ERROR')"), 'ReelStudioModal must support ERROR status');

    // Upload cancellation
    assert.ok(content.includes('abortControllerRef'), 'ReelStudioModal must define abortControllerRef');
    assert.ok(content.includes('handleCancelUpload'), 'ReelStudioModal must implement handleCancelUpload');
    assert.ok(content.includes('data-testid="cancel-reel-upload-btn"'), 'ReelStudioModal must provide cancel-reel-upload-btn testid');

    // Duplicate submission prevention
    assert.ok(content.includes('isPublishingRef'), 'ReelStudioModal must use isPublishingRef');
    assert.ok(content.includes('idempotencyKeyRef'), 'ReelStudioModal must use idempotencyKeyRef');
  });

  await t.test('6. Details section supports caption counter, hashtags, and audience', () => {
    const reelStudioPath = path.join(srcDir, 'components', 'community', 'composer', 'ReelStudioModal.jsx');
    const content = fs.readFileSync(reelStudioPath, 'utf8');

    // Caption limit (2200 chars)
    assert.ok(content.includes('2200 - caption.length'), 'ReelStudioModal must display remaining caption counter');
    assert.ok(content.includes('maxLength={2200}'), 'ReelStudioModal must enforce 2200 max length');

    // Hashtags
    assert.ok(content.includes('POPULAR_REEL_HASHTAGS'), 'ReelStudioModal must provide popular reel hashtags');
    assert.ok(content.includes('handleAddHashtag'), 'ReelStudioModal must provide handleAddHashtag');

    // Audience
    assert.ok(content.includes('PostAudienceSelector'), 'ReelStudioModal must integrate PostAudienceSelector');
  });

  await t.test('7. Unsaved changes protection and memory safety', () => {
    const reelStudioPath = path.join(srcDir, 'components', 'community', 'composer', 'ReelStudioModal.jsx');
    const content = fs.readFileSync(reelStudioPath, 'utf8');

    // Discard protection dialog
    assert.ok(content.includes('Discard Reel changes?'), 'ReelStudioModal must show discard changes dialog');
    assert.ok(content.includes('handleConfirmDiscard'), 'ReelStudioModal must handle confirm discard');

    // S3 cleanup on discard
    assert.ok(content.includes('communityApi.deleteMedia'), 'ReelStudioModal must clean up S3 objects on discard');

    // Resource cleanup
    assert.ok(content.includes('URL.revokeObjectURL'), 'ReelStudioModal must revoke object URLs on cleanup');
  });
});
