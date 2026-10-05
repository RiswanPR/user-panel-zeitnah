import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Community Phase 3B — Video Processing & Transcoding Architecture', async (t) => {
  const reelModalPath = path.resolve('src/components/community/composer/ReelStudioModal.jsx');
  const reelModalContent = fs.readFileSync(reelModalPath, 'utf8');

  const apiPath = path.resolve('src/services/communityApi.js');
  const apiContent = fs.readFileSync(apiPath, 'utf8');

  const reelItemPath = path.resolve('src/components/community/reels/ReelItem.jsx');
  const reelItemContent = fs.readFileSync(reelItemPath, 'utf8');

  await t.test('1. communityApi exports processing status and retry endpoints', () => {
    assert.ok(
      apiContent.includes('getMediaProcessingStatus: async (mediaId, signal)'),
      'communityApi must export getMediaProcessingStatus',
    );
    assert.ok(
      apiContent.includes('/community/media/${mediaId}/status'),
      'getMediaProcessingStatus must call GET /community/media/:mediaId/status',
    );
    assert.ok(
      apiContent.includes('retryMediaProcessing: async (mediaId)'),
      'communityApi must export retryMediaProcessing',
    );
    assert.ok(
      apiContent.includes('/community/media/${mediaId}/retry'),
      'retryMediaProcessing must call POST /community/media/:mediaId/retry',
    );
  });

  await t.test('2. communityApi.uploadMedia forwards trim parameters to backend', () => {
    assert.ok(
      apiContent.includes("formData.append('trimStart'"),
      'uploadMedia must append trimStart to FormData when present',
    );
    assert.ok(
      apiContent.includes("formData.append('trimEnd'"),
      'uploadMedia must append trimEnd to FormData when present',
    );
    assert.ok(
      apiContent.includes("formData.append('isReel', 'true')"),
      'uploadMedia must mark Reel uploads with isReel flag',
    );
  });

  await t.test('3. ReelStudioModal initiates processing polling after original upload', () => {
    assert.ok(
      reelModalContent.includes('pollStatusUntilReady'),
      'ReelStudioModal must define pollStatusUntilReady loop',
    );
    assert.ok(
      reelModalContent.includes("setStatus('PROCESSING')"),
      'ReelStudioModal must transition to PROCESSING while backend worker transcodes',
    );
    assert.ok(
      reelModalContent.includes('communityApi.getMediaProcessingStatus'),
      'ReelStudioModal must poll backend processing status endpoint',
    );
    assert.ok(
      reelModalContent.includes('processingMediaId'),
      'ReelStudioModal must track processingMediaId for status and retry',
    );
  });

  await t.test('4. Publishing blocked until media is READY; attaches processedUrl on completion', () => {
    assert.ok(
      reelModalContent.includes('status !== \'PROCESSING\''),
      'Publish button must be hidden/disabled while status is PROCESSING',
    );
    assert.ok(
      reelModalContent.includes('mediaItem.processedUrl = processedResult.playbackUrl'),
      'ReelStudioModal must attach processedUrl to post media payload upon processing completion',
    );
  });

  await t.test('5. Handles processing failure with retry capability without re-uploading original source', () => {
    assert.ok(
      reelModalContent.includes('handleRetryProcessing'),
      'ReelStudioModal must implement handleRetryProcessing without re-uploading video',
    );
    assert.ok(
      reelModalContent.includes('communityApi.retryMediaProcessing(processingMediaId)'),
      'handleRetryProcessing must call retryMediaProcessing on existing mediaId',
    );
    assert.ok(
      reelModalContent.includes('retry-processing-btn'),
      'Error screen must offer retry processing button when retryable',
    );
  });

  await t.test('6. Memory & resource safety: unmount cleans up polling timer and aborts pending requests', () => {
    assert.ok(
      reelModalContent.includes('pollingTimerRef.current'),
      'ReelStudioModal must maintain pollingTimerRef for interval cancellation',
    );
    assert.ok(
      reelModalContent.includes('clearTimeout(pollingTimerRef.current)'),
      'ReelStudioModal must clear polling timer on unmount and cancel',
    );
  });

  await t.test('7. ReelItem player prioritizes processedUrl with seamless legacy fallback', () => {
    assert.ok(
      reelItemContent.includes('videoMedia?.processedUrl || videoMedia?.url'),
      'ReelItem must prioritize processedUrl while preserving url for legacy reels',
    );
    assert.ok(
      reelItemContent.includes('videoMedia?.posterUrl || videoMedia?.thumbnailUrl'),
      'ReelItem must prioritize posterUrl while preserving thumbnailUrl fallback',
    );
  });
});
