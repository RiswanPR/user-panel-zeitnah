import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Community Phase 3C — Reel Audio & Music Foundation Architecture', async (t) => {
  const reelModalPath = path.resolve('src/components/community/composer/ReelStudioModal.jsx');
  const reelModalContent = fs.readFileSync(reelModalPath, 'utf8');

  const apiPath = path.resolve('src/services/communityApi.js');
  const apiContent = fs.readFileSync(apiPath, 'utf8');

  const pickerPath = path.resolve('src/components/community/composer/ReelAudioPicker.jsx');
  const pickerContent = fs.readFileSync(pickerPath, 'utf8');

  const timelinePath = path.resolve('src/components/community/composer/ReelTimeline.jsx');
  const timelineContent = fs.readFileSync(timelinePath, 'utf8');

  const reelItemPath = path.resolve('src/components/community/reels/ReelItem.jsx');
  const reelItemContent = fs.readFileSync(reelItemPath, 'utf8');

  await t.test('1. communityApi exports music catalog and search endpoints', () => {
    assert.ok(
      apiContent.includes('getMusicCatalog: async'),
      'communityApi must export getMusicCatalog',
    );
    assert.ok(
      apiContent.includes('/community/music'),
      'getMusicCatalog must call GET /community/music',
    );
    assert.ok(
      apiContent.includes('searchMusic: async'),
      'communityApi must export searchMusic',
    );
    assert.ok(
      apiContent.includes('/community/music/search'),
      'searchMusic must call GET /community/music/search',
    );
    assert.ok(
      apiContent.includes('getMusicTrack: async'),
      'communityApi must export getMusicTrack',
    );
  });

  await t.test('2. communityApi.uploadMedia forwards audioConfig to multipart upload payload', () => {
    assert.ok(
      apiContent.includes("formData.append('audioConfig'"),
      'uploadMedia must append serialized audioConfig to FormData when provided',
    );
  });

  await t.test('3. ReelStudioModal maintains canonical audio state and controls', () => {
    assert.ok(
      reelModalContent.includes("const [audioMode, setAudioMode] = useState('ORIGINAL_ONLY')"),
      'ReelStudioModal must define audioMode initialized to ORIGINAL_ONLY',
    );
    assert.ok(
      reelModalContent.includes('const [selectedMusic, setSelectedMusic] = useState(null)'),
      'ReelStudioModal must maintain selectedMusic state',
    );
    assert.ok(
      reelModalContent.includes('const [originalVolume, setOriginalVolume] = useState(1.0)'),
      'ReelStudioModal must maintain originalVolume initialized to 1.0',
    );
    assert.ok(
      reelModalContent.includes('const [musicVolume, setMusicVolume] = useState(1.0)'),
      'ReelStudioModal must maintain musicVolume initialized to 1.0',
    );
    assert.ok(
      reelModalContent.includes('const [isAudioPickerOpen, setIsAudioPickerOpen] = useState(false)'),
      'ReelStudioModal must control Audio Picker visibility',
    );
  });

  await t.test('4. ReelAudioPicker implements 250ms search debounce and category filtering', () => {
    assert.ok(
      pickerContent.includes('searchDebounceTimerRef'),
      'ReelAudioPicker must maintain a timer ref for debouncing search',
    );
    assert.ok(
      pickerContent.includes('250'),
      'ReelAudioPicker must debounce search input by 250ms',
    );
    assert.ok(
      pickerContent.includes('MUSIC_CATEGORIES'),
      'ReelAudioPicker must define curated music categories (All, Upbeat, Chill, Inspiring, Focus)',
    );
  });

  await t.test('5. Single preview player lifecycle: guaranteed cleanup on change and unmount', () => {
    assert.ok(
      pickerContent.includes('previewAudioRef'),
      'ReelAudioPicker must use a single previewAudioRef',
    );
    assert.ok(
      pickerContent.includes('stopPreview'),
      'ReelAudioPicker must implement stopPreview method',
    );
    assert.ok(
      pickerContent.includes('previewAudioRef.current.pause()'),
      'stopPreview must pause active audio playback',
    );
    assert.ok(
      pickerContent.includes("previewAudioRef.current.removeAttribute('src')"),
      'stopPreview must release audio element source to prevent memory leaks',
    );
  });

  await t.test('6. ReelTimeline renders lightweight audio layer track visualization', () => {
    assert.ok(
      timelineContent.includes('selectedMusic'),
      'ReelTimeline must accept selectedMusic prop',
    );
    assert.ok(
      timelineContent.includes('audioMode'),
      'ReelTimeline must accept audioMode prop',
    );
    assert.ok(
      timelineContent.includes('Soundtrack Indicator Bar') || timelineContent.includes('Music2'),
      'ReelTimeline must visualize the audio layer track',
    );
  });

  await t.test('7. Publishing payload attaches canonical audioConfig with attribution', () => {
    assert.ok(
      reelModalContent.includes('audioConfigPayload'),
      'ReelStudioModal must construct audioConfigPayload',
    );
    assert.ok(
      reelModalContent.includes('originalAudioName: user?.username ? `Original audio · @${user.username}`'),
      'audioConfigPayload must format original audio with creator handle attribution',
    );
    assert.ok(
      reelModalContent.includes('audioConfig: audioConfigPayload'),
      'createPost must submit audioConfig in post media item',
    );
  });

  await t.test('8. ReelItem renders audio attribution pill for original audio or music soundtrack', () => {
    assert.ok(
      reelItemContent.includes('Music2'),
      'ReelItem must import Music2 icon',
    );
    assert.ok(
      reelItemContent.includes('audioConfig?.musicTitle') || reelItemContent.includes('originalAudioName'),
      'ReelItem must render soundtrack title or original audio attribution pill',
    );
  });

  await t.test('9. Studio synchronization: Reel preview synchronizes soundtrack with video playhead', () => {
    assert.ok(
      reelModalContent.includes('musicAudioRef'),
      'ReelStudioModal must maintain musicAudioRef for preview synchronization',
    );
    assert.ok(
      reelModalContent.includes('musicAudio.currentTime = targetMusicTime'),
      'ReelStudioModal must synchronize soundtrack playhead with video time and trimStart',
    );
  });
});
