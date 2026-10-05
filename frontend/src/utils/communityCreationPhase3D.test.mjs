import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Community Phase 3D — Advanced Reel Editor Foundation Architecture', async (t) => {
  const reelModalPath = path.resolve('src/components/community/composer/ReelStudioModal.jsx');
  const reelModalContent = fs.readFileSync(reelModalPath, 'utf8');

  const stagePath = path.resolve('src/components/community/composer/ReelOverlayStage.jsx');
  const stageContent = fs.readFileSync(stagePath, 'utf8');

  const textEditorPath = path.resolve('src/components/community/composer/ReelTextEditor.jsx');
  const textEditorContent = fs.readFileSync(textEditorPath, 'utf8');

  const stickerPickerPath = path.resolve('src/components/community/composer/ReelStickerPicker.jsx');
  const stickerPickerContent = fs.readFileSync(stickerPickerPath, 'utf8');

  const captionEditorPath = path.resolve('src/components/community/composer/ReelCaptionEditor.jsx');
  const captionEditorContent = fs.readFileSync(captionEditorPath, 'utf8');

  const layerPanelPath = path.resolve('src/components/community/composer/ReelLayerPanel.jsx');
  const layerPanelContent = fs.readFileSync(layerPanelPath, 'utf8');

  const timelinePath = path.resolve('src/components/community/composer/ReelTimeline.jsx');
  const timelineContent = fs.readFileSync(timelinePath, 'utf8');

  const apiPath = path.resolve('src/services/communityApi.js');
  const apiContent = fs.readFileSync(apiPath, 'utf8');

  const stickerIconPath = path.resolve('src/components/community/composer/StickerIcon.jsx');
  const stickerIconContent = fs.readFileSync(stickerIconPath, 'utf8');

  await t.test('1. Add Text — ReelStudioModal maintains text layer addition and bounds', () => {
    assert.ok(
      reelModalContent.includes('handleOpenAddText'),
      'ReelStudioModal must define handleOpenAddText handler',
    );
    assert.ok(
      reelModalContent.includes('handleSaveTextLayer'),
      'ReelStudioModal must define handleSaveTextLayer handler',
    );
    assert.ok(
      reelModalContent.includes('Maximum 10 layers allowed'),
      'ReelStudioModal must enforce a 10 layer limit on text creation',
    );
  });

  await t.test('2. Edit Text — ReelTextEditor supports pre-filling layer and live edits', () => {
    assert.ok(
      textEditorContent.includes('initialLayer'),
      'ReelTextEditor must accept initialLayer for updating existing layers',
    );
    assert.ok(
      textEditorContent.includes('setContent(initialLayer.content'),
      'ReelTextEditor must populate content when initialLayer is present',
    );
  });

  await t.test('3. Delete Text & Layers — Stage and Panel support layer deletion', () => {
    assert.ok(
      reelModalContent.includes('handleDeleteLayer'),
      'ReelStudioModal must provide handleDeleteLayer callback',
    );
    assert.ok(
      stageContent.includes('onDeleteLayer?.(layer.id)'),
      'ReelOverlayStage must trigger onDeleteLayer when delete button is clicked',
    );
    assert.ok(
      layerPanelContent.includes('onDeleteLayer?.(layer.id)'),
      'ReelLayerPanel must trigger onDeleteLayer',
    );
  });

  await t.test('4. Text Timing — Start and end intervals are enforced', () => {
    assert.ok(
      textEditorContent.includes('setStart'),
      'ReelTextEditor must maintain start timing state',
    );
    assert.ok(
      textEditorContent.includes('setEnd'),
      'ReelTextEditor must maintain end timing state',
    );
    assert.ok(
      stageContent.includes('currentTime >= Number(layer.start'),
      'ReelOverlayStage must only show layer when currentTime is within start interval',
    );
  });

  await t.test('5. Text Positioning — Normalized coordinates with direct pointer dragging', () => {
    assert.ok(
      stageContent.includes('normDx = dx / dragInfoRef.current.stageWidth'),
      'ReelOverlayStage must normalize X delta against stage width',
    );
    assert.ok(
      stageContent.includes('normDy = dy / dragInfoRef.current.stageHeight'),
      'ReelOverlayStage must normalize Y delta against stage height',
    );
    assert.ok(
      stageContent.includes('Math.max(0.05, Math.min(0.95'),
      'ReelOverlayStage must bound normalized X within safe margins',
    );
  });

  await t.test('6. Text Styling — Curated fonts, colors, background opacity, and text shadow', () => {
    assert.ok(
      textEditorContent.includes("id: 'Inter'"),
      'ReelTextEditor must provide Inter font option',
    );
    assert.ok(
      textEditorContent.includes('PRESET_COLORS'),
      'ReelTextEditor must offer curated color swatches',
    );
    assert.ok(
      textEditorContent.includes('backgroundOpacity'),
      'ReelTextEditor must offer card background opacity slider',
    );
    assert.ok(
      textEditorContent.includes('shadow'),
      'ReelTextEditor must offer shadow toggle',
    );
  });

  await t.test('7. Add Sticker — Sticker picker and selection handler', () => {
    assert.ok(
      reelModalContent.includes('handleOpenStickerPicker'),
      'ReelStudioModal must define handleOpenStickerPicker',
    );
    assert.ok(
      reelModalContent.includes('handleSelectSticker'),
      'ReelStudioModal must define handleSelectSticker',
    );
    assert.ok(
      stickerPickerContent.includes("type: 'STICKER'"),
      'ReelStickerPicker must create a layer with type STICKER',
    );
  });

  await t.test('8. Delete Sticker — Deletion uses unified layer deletion', () => {
    assert.ok(
      reelModalContent.includes('handleDeleteLayer'),
      'ReelStudioModal must delete sticker layer by ID',
    );
  });

  await t.test('9. Sticker Timing — Sticker layer duration is set within video bounds', () => {
    assert.ok(
      stickerPickerContent.includes('Math.min(currentTime'),
      'ReelStickerPicker must default sticker start to current playhead',
    );
    assert.ok(
      stickerPickerContent.includes('Math.min(duration'),
      'ReelStickerPicker must clamp sticker end to video duration',
    );
  });

  await t.test('10. Sticker Positioning — Normalized coordinates and pure React SVG rendering', () => {
    assert.ok(
      stageContent.includes('StickerIcon'),
      'ReelOverlayStage must render stickers via safe StickerIcon component',
    );
    assert.ok(
      !stageContent.includes('dangerouslySetInnerHTML'),
      'ReelOverlayStage must NOT use dangerouslySetInnerHTML',
    );
    assert.ok(
      stickerIconContent.includes('case \'zn-verified\':'),
      'StickerIcon must handle verified badge',
    );
  });

  await t.test('11. Add Caption — Caption editor with curated styles', () => {
    assert.ok(
      reelModalContent.includes('handleOpenAddCaption'),
      'ReelStudioModal must define handleOpenAddCaption',
    );
    assert.ok(
      reelModalContent.includes('handleSaveCaptionLayer'),
      'ReelStudioModal must define handleSaveCaptionLayer',
    );
    assert.ok(
      captionEditorContent.includes('CAPTION_STYLES'),
      'ReelCaptionEditor must define curated caption styles',
    );
  });

  await t.test('12. Caption Timing — Caption duration bounds', () => {
    assert.ok(
      captionEditorContent.includes('initialStart'),
      'ReelCaptionEditor calculates start based on current playhead',
    );
    assert.ok(
      captionEditorContent.includes('setEnd(Number(Math.min(duration'),
      'ReelCaptionEditor clamps end to duration',
    );
  });

  await t.test('13. Layer Selection — Active layer state and selection handles', () => {
    assert.ok(
      reelModalContent.includes('const [activeLayerId, setActiveLayerId] = useState(null)'),
      'ReelStudioModal must track activeLayerId',
    );
    assert.ok(
      stageContent.includes('isSelected &&'),
      'ReelOverlayStage must visually highlight the selected layer',
    );
  });

  await t.test('14. Layer Deletion & Edit Routing — Edit text or caption depending on layer type', () => {
    assert.ok(
      reelModalContent.includes("if (layer.type === 'TEXT')"),
      'handleEditLayer must route text layers to text editor',
    );
    assert.ok(
      reelModalContent.includes("else if (layer.type === 'CAPTION')"),
      'handleEditLayer must route caption layers to caption editor',
    );
  });

  await t.test('15. Timeline Multi-Track Visualization — Shows visual tracks for text, sticker, and caption', () => {
    assert.ok(
      timelineContent.includes('layers.length > 0'),
      'ReelTimeline must render track for overlay layers',
    );
    assert.ok(
      timelineContent.includes('layer.type === \'TEXT\''),
      'ReelTimeline must color-code TEXT layers',
    );
    assert.ok(
      timelineContent.includes('layer.type === \'STICKER\''),
      'ReelTimeline must color-code STICKER layers',
    );
    assert.ok(
      timelineContent.includes('layer.type === \'CAPTION\''),
      'ReelTimeline must color-code CAPTION layers',
    );
  });

  await t.test('16. Preview Synchronization — ReelOverlayStage is positioned directly over video stage', () => {
    assert.ok(
      reelModalContent.includes('<ReelOverlayStage'),
      'ReelStudioModal must embed ReelOverlayStage directly over video element',
    );
    assert.ok(
      stageContent.includes('absolute inset-0'),
      'ReelOverlayStage must cover the exact stage bounds',
    );
  });

  await t.test('17. Audio Preservation — Phase 3C audio settings preserved alongside editor layers', () => {
    assert.ok(
      reelModalContent.includes('audioConfigPayload'),
      'ReelStudioModal must continue assembling audioConfigPayload',
    );
    assert.ok(
      reelModalContent.includes('musicAudioRef'),
      'ReelStudioModal must maintain Phase 3C music soundtrack synchronization',
    );
  });

  await t.test('18. Draft Persistence — Preserves editor layers, audio, and captions in localStorage', () => {
    assert.ok(
      reelModalContent.includes('REEL_DRAFT_KEY'),
      'ReelStudioModal must define canonical REEL_DRAFT_KEY',
    );
    assert.ok(
      reelModalContent.includes('editorLayers: parsed.editorLayers') ||
      reelModalContent.includes('parsed.editorLayers'),
      'ReelStudioModal must restore editor layers from draft',
    );
    assert.ok(
      reelModalContent.includes('localStorage.removeItem(REEL_DRAFT_KEY)'),
      'ReelStudioModal must clear draft upon successful publish or discard',
    );
  });

  await t.test('19. Unsaved Changes — Warns before discarding edits if layers exist', () => {
    assert.ok(
      reelModalContent.includes('editorLayers.length > 0'),
      'hasUnsavedChanges must consider editorLayers.length > 0',
    );
    assert.ok(
      reelModalContent.includes('handleAttemptClose'),
      'ReelStudioModal prompts discard dialog when hasUnsavedChanges is true',
    );
  });

  await t.test('20. Processing State — Displays authentic processing stages and progress', () => {
    assert.ok(
      reelModalContent.includes('status === \'PROCESSING\''),
      'ReelStudioModal displays authentic optimization status',
    );
    assert.ok(
      reelModalContent.includes('pollStatusUntilReady'),
      'ReelStudioModal polls backend processing job until READY',
    );
  });

  await t.test('21. Retry — Preserves original source, audioConfig, and editorConfig on retry', () => {
    assert.ok(
      reelModalContent.includes('communityApi.retryMediaProcessing(processingMediaId, {'),
      'handleRetryProcessing must forward audioConfig and editorConfig to retry API',
    );
  });

  await t.test('22. Publish Protection — Disables publishing during pending mutation or processing', () => {
    assert.ok(
      reelModalContent.includes('disabled={isPublishingRef.current || createPostMutation.isPending'),
      'Publish button must be disabled while publishing or processing',
    );
  });

  await t.test('23. Mobile Editor State — Bottom toolbar and bottom sheets for mobile viewport', () => {
    assert.ok(
      reelModalContent.includes('id="reel-add-text-btn"'),
      'ReelStudioModal provides compact mobile-friendly toolbar buttons',
    );
    assert.ok(
      layerPanelContent.includes('max-h-[85vh]'),
      'ReelLayerPanel renders as a bottom drawer on mobile screens',
    );
  });

  await t.test('24. Desktop Editor State — Clean responsive 2-column layout', () => {
    assert.ok(
      reelModalContent.includes('flex flex-col lg:flex-row'),
      'ReelStudioModal supports 2-column layout on desktop viewports',
    );
    assert.ok(
      reelModalContent.includes('aspect-[9/16]'),
      'ReelStudioModal maintains fixed 9:16 portrait video stage',
    );
  });
});
