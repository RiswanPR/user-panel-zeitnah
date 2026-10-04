import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  X,
  Image as ImageIcon,
  Type,
  UploadCloud,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import { communityApi } from '../../../services/communityApi';
import { useCreateStory } from '../../../hooks/useCommunity';
import toast from 'react-hot-toast';

// Subcomponents for Premium Story Editor
import StoryEditorCanvas from './editor/StoryEditorCanvas';
import StoryEditorToolbar from './editor/StoryEditorToolbar';
import StoryDrawingControls from './editor/StoryDrawingControls';
import StoryTextEditorModal from './editor/StoryTextEditorModal';
import StoryStickerPicker from './editor/StoryStickerPicker';
import StoryFilterPicker from './editor/StoryFilterPicker';
import StoryDiscardDialog from './editor/StoryDiscardDialog';
import { rasterizeStoryImage } from './editor/rasterizeStory';

const ALLOWED_IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
const ALLOWED_VIDEO_EXTS = ['mp4', 'webm', 'mov'];
const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024; // 8MB
const MAX_VIDEO_SIZE_BYTES = 1024 * 1024 * 1024; // 1GB
const MAX_VIDEO_DURATION_SECONDS = 90;

const BACKGROUND_COLORS = [
  'bg-gradient-to-br from-[#12314C] via-[#0C2033] to-[#070B14]',
  'bg-gradient-to-br from-[#0F283E] via-[#12314C] to-[#1B4B6F]',
  'bg-gradient-to-br from-[#0B1A28] via-[#12314C] to-[#0D2436]',
  'bg-gradient-to-br from-[#1A2E3D] via-[#12314C] to-[#252210]',
  'bg-gradient-to-br from-[#161F2E] via-[#0E1522] to-[#070B14]',
  'bg-gradient-to-b from-[#0E1726] to-[#060A12]',
];

/**
 * CreateStoryModal — Instagram-level Story creation, editing, and publishing.
 *
 * Supports:
 * - Media selection (photos <= 8MB, videos <= 1GB, duration <= 90s)
 * - Text stories with curated background gradients
 * - Live 9:16 composition canvas
 * - Text overlays (draggable, styled, colored, background pill)
 * - Drawing pen (color palette, stroke widths, undo, clear)
 * - Curated stickers (draggable, removable)
 * - Tonal photo mood filters (Vivid, Cinema, Warm, Noir)
 * - Audio mute toggle for video stories
 * - WYSIWYG offscreen canvas rasterization
 * - Upload progress tracking with abortable cancel
 * - Idempotency key tracking
 * - Draft protection ("Discard story?" confirmation)
 * - Full memory safety (object URL revocation & decoder cleanup)
 */
export default function CreateStoryModal({ isOpen, onClose }) {
  const [tab, setTab] = useState('media'); // 'media' | 'text'
  const [text, setText] = useState('');
  const [bgColor, setBgColor] = useState(BACKGROUND_COLORS[0]);

  // Media state
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploadedUrl, setUploadedUrl] = useState(null);

  // Editor Tools & Overlays State
  const [activeTool, setActiveTool] = useState(null); // 'text' | 'draw' | 'sticker' | 'filter' | null
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('none');

  // Drawing state
  const [drawingColor, setDrawingColor] = useState('#00F5A0');
  const [drawingStrokeWidth, setDrawingStrokeWidth] = useState(6);
  const [drawingPaths, setDrawingPaths] = useState([]);

  // Text overlay state
  const [textOverlays, setTextOverlays] = useState([]);
  const [editingTextOverlay, setEditingTextOverlay] = useState(null);
  const [isTextEditorOpen, setIsTextEditorOpen] = useState(false);

  // Sticker state
  const [stickers, setStickers] = useState([]);
  const [isStickerPickerOpen, setIsStickerPickerOpen] = useState(false);

  // Discard Confirmation Dialog State
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Publishing State Machine:
  // 'idle' -> 'selected' -> 'uploading' -> 'uploaded' -> 'publishing' -> 'published' | 'failed'
  const [state, setState] = useState('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState(null);

  const fileInputRef = useRef(null);
  const previousActiveElementRef = useRef(null);
  const abortControllerRef = useRef(null);
  const isSubmittingRef = useRef(false);
  const idempotencyKeyRef = useRef(null);

  const shouldReduceMotion = useReducedMotion();
  const createStoryMutation = useCreateStory();

  // Determine whether there are unsaved edits
  const hasUnsavedEdits = Boolean(
    (tab === 'media' && (file || textOverlays.length > 0 || drawingPaths.length > 0 || stickers.length > 0 || selectedFilter !== 'none')) ||
    (tab === 'text' && text.trim().length > 0)
  );

  // Pure cleanup function
  const executeCleanup = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    idempotencyKeyRef.current = null;
    isSubmittingRef.current = false;
    setTab('media');
    setBgColor(BACKGROUND_COLORS[0]);
    setText('');
    setFile(null);
    setPreviewUrl(null);
    setUploadedUrl(null);
    setActiveTool(null);
    setIsPreviewMode(false);
    setSelectedFilter('none');
    setDrawingPaths([]);
    setTextOverlays([]);
    setStickers([]);
    setShowDiscardConfirm(false);
    setState('idle');
    setUploadProgress(0);
    setErrorMessage(null);
    setStatusMessage('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose?.();
  }, [previewUrl, onClose]);

  // Handle Close with draft safety check
  const handleClose = useCallback(() => {
    if (state === 'uploading' || state === 'publishing') return;

    if (hasUnsavedEdits && state !== 'published') {
      setShowDiscardConfirm(true);
    } else {
      executeCleanup();
    }
  }, [hasUnsavedEdits, state, executeCleanup]);

  const validateFile = (selectedFile) => {
    if (!selectedFile) return 'Please select a photo or video.';

    const ext = (selectedFile.name.split('.').pop() || '').toLowerCase();
    const isImage = selectedFile.type.startsWith('image/') || ALLOWED_IMAGE_EXTS.includes(ext);
    const isVideo = selectedFile.type.startsWith('video/') || ALLOWED_VIDEO_EXTS.includes(ext);

    if (!isImage && !isVideo) {
      return 'Unsupported file format. Please choose a JPEG, PNG, WEBP, GIF, MP4, or MOV file.';
    }

    if (isImage && selectedFile.size > MAX_IMAGE_SIZE_BYTES) {
      return 'Photo must be 8 MB or smaller.';
    }

    if (isVideo && selectedFile.size > MAX_VIDEO_SIZE_BYTES) {
      return 'Video must be 1 GB or smaller.';
    }

    return null;
  };

  const applySelectedFile = (selectedFile) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(selectedFile);
    setUploadedUrl(null);
    // Reset overlays for new media
    setDrawingPaths([]);
    setTextOverlays([]);
    setStickers([]);
    setSelectedFilter('none');
    setActiveTool(null);
    setIsPreviewMode(false);

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);
    setState('selected');
    setErrorMessage(null);
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const validationError = validateFile(selectedFile);
    if (validationError) {
      toast.error(validationError);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const ext = (selectedFile.name.split('.').pop() || '').toLowerCase();
    const isVideo = selectedFile.type.startsWith('video/') || ALLOWED_VIDEO_EXTS.includes(ext);

    if (isVideo) {
      const tempVideo = document.createElement('video');
      tempVideo.preload = 'metadata';
      const objUrl = URL.createObjectURL(selectedFile);

      tempVideo.onloadedmetadata = () => {
        URL.revokeObjectURL(objUrl);
        if (tempVideo.duration > MAX_VIDEO_DURATION_SECONDS) {
          toast.error('Video must be 90 seconds or shorter.');
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }
        applySelectedFile(selectedFile);
      };

      tempVideo.onerror = () => {
        URL.revokeObjectURL(objUrl);
        applySelectedFile(selectedFile);
      };
      return;
    }

    applySelectedFile(selectedFile);
  };

  const handleRemoveMedia = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setUploadedUrl(null);
    setDrawingPaths([]);
    setTextOverlays([]);
    setStickers([]);
    setSelectedFilter('none');
    setActiveTool(null);
    setState('idle');
    setUploadProgress(0);
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState('selected');
    isSubmittingRef.current = false;
    setUploadProgress(0);
    setStatusMessage('');
    toast('Upload cancelled', { icon: 'ℹ️' });
  };

  const handleResetEdits = () => {
    setDrawingPaths([]);
    setTextOverlays([]);
    setStickers([]);
    setSelectedFilter('none');
    setActiveTool(null);
    toast.success('Edits reset');
  };

  // ── Text Overlay Handlers ──
  const handleOpenAddText = () => {
    setEditingTextOverlay(null);
    setIsTextEditorOpen(true);
  };

  const handleEditTextOverlay = (overlay) => {
    setEditingTextOverlay(overlay);
    setIsTextEditorOpen(true);
  };

  const handleSaveTextOverlay = (overlayData) => {
    setTextOverlays((prev) => {
      const exists = prev.some((o) => o.id === overlayData.id);
      if (exists) {
        return prev.map((o) => (o.id === overlayData.id ? overlayData : o));
      }
      return [...prev, overlayData];
    });
    setIsTextEditorOpen(false);
    setEditingTextOverlay(null);
  };

  const handleUpdateTextOverlay = (id, updates) => {
    setTextOverlays((prev) =>
      prev.map((o) => (o.id === id ? { ...o, ...updates } : o))
    );
  };

  const handleRemoveTextOverlay = (id) => {
    setTextOverlays((prev) => prev.filter((o) => o.id !== id));
  };

  // ── Sticker Handlers ──
  const handleAddSticker = (emoji) => {
    const newSticker = {
      id: `sticker_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      emoji,
      x: 0.5,
      y: 0.5,
      scale: 44,
    };
    setStickers((prev) => [...prev, newSticker]);
    setIsStickerPickerOpen(false);
  };

  const handleUpdateSticker = (id, updates) => {
    setStickers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  };

  const handleRemoveSticker = (id) => {
    setStickers((prev) => prev.filter((s) => s.id !== id));
  };

  // ── Drawing Handlers ──
  const handleAddDrawingPath = (path) => {
    setDrawingPaths((prev) => [...prev, path]);
  };

  const handleUndoDrawing = () => {
    setDrawingPaths((prev) => prev.slice(0, -1));
  };

  const handleClearDrawing = () => {
    setDrawingPaths([]);
  };

  // ── Submit / Publish Flow ──
  const handleSubmit = async () => {
    if (isSubmittingRef.current || state === 'uploading' || state === 'publishing') {
      return;
    }

    // Validation
    if (tab === 'media' && !file && !uploadedUrl) {
      toast.error('Please choose a photo or video to share.');
      return;
    }

    if (tab === 'text' && !text.trim()) {
      toast.error('Please type a message for your story.');
      return;
    }

    // Generate idempotency key once per logical publish attempt
    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = `story_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }

    isSubmittingRef.current = true;
    setErrorMessage(null);

    let finalMediaUrl = uploadedUrl;
    let storyType = 'TEXT';

    try {
      // ── Step 1: Upload Media to S3 if not already uploaded ──
      if (tab === 'media') {
        const isVideo =
          file?.type?.startsWith('video/') ||
          ALLOWED_VIDEO_EXTS.includes((file?.name?.split('.').pop() || '').toLowerCase());
        storyType = isVideo ? 'VIDEO' : 'IMAGE';

        if (!finalMediaUrl && file) {
          setState('uploading');
          setUploadProgress(0);
          setStatusMessage('Uploading story media...');
          abortControllerRef.current = new AbortController();

          let fileToUpload = file;

          // If it's an image with edits (drawings, text overlays, stickers, filters),
          // composite into a high-fidelity output image before uploading!
          const hasImageEdits =
            !isVideo &&
            (drawingPaths.length > 0 ||
              textOverlays.length > 0 ||
              stickers.length > 0 ||
              selectedFilter !== 'none');

          if (hasImageEdits && previewUrl) {
            setStatusMessage('Compositing story...');
            try {
              fileToUpload = await rasterizeStoryImage({
                imageSrc: previewUrl,
                filter: selectedFilter,
                drawingPaths,
                textOverlays,
                stickers,
                fileName: file.name,
              });
            } catch (err) {
              console.warn('Canvas rasterization fallback to original file:', err);
              fileToUpload = file;
            }
          }

          setStatusMessage('Uploading story media...');
          const uploadRes = await communityApi.uploadMedia(
            fileToUpload,
            (progressEvent) => {
              if (progressEvent.total) {
                const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                setUploadProgress(Math.min(95, percent));
              }
            },
            abortControllerRef.current.signal
          );

          // Canonical response adapter
          finalMediaUrl =
            uploadRes?.url || uploadRes?.data?.url || (typeof uploadRes === 'string' ? uploadRes : '');

          if (!finalMediaUrl) {
            throw new Error('Failed to retrieve uploaded media reference.');
          }

          setUploadedUrl(finalMediaUrl);
          setUploadProgress(98);
          setState('uploaded');
        }
      }

      // ── Step 2: Publish Story to Database ──
      setState('publishing');
      setStatusMessage('Sharing story to Community...');

      const payload = {
        type: storyType,
        text: tab === 'text' ? text.trim() : undefined,
        backgroundColor: tab === 'text' ? bgColor : undefined,
        mediaUrl: finalMediaUrl || undefined,
        mediaType: storyType === 'VIDEO' ? 'video' : 'image',
        mediaDuration: 0,
        idempotencyKey: idempotencyKeyRef.current,
      };

      await createStoryMutation.mutateAsync(payload);

      setState('published');
      setStatusMessage('Story published!');
      toast.success('Story shared to Community!');

      // Reset idempotency key upon success
      idempotencyKeyRef.current = null;

      setTimeout(() => {
        executeCleanup();
      }, 500);
    } catch (err) {
      isSubmittingRef.current = false;
      setState('failed');

      let userMsg = "Zeitnah couldn't publish this story right now. Please try again.";
      if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') {
        userMsg = 'Upload cancelled.';
      } else if (err?.response?.data?.message) {
        userMsg = err.response.data.message;
      } else if (err?.response?.status === 413) {
        userMsg = 'File exceeds maximum upload size limit.';
      } else if (err?.response?.status === 401) {
        userMsg = 'Your session expired. Please sign in again.';
      } else if (
        err?.message === 'Network Error' ||
        (typeof navigator !== 'undefined' && !navigator.onLine)
      ) {
        userMsg = "We couldn't upload this story. Check your connection and try again.";
      }

      setErrorMessage(userMsg);
      toast.error(userMsg);
    } finally {
      isSubmittingRef.current = false;
    }
  };

  // Keyboard and focus management
  useEffect(() => {
    if (!isOpen) return;

    previousActiveElementRef.current = document.activeElement;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && state !== 'uploading' && state !== 'publishing') {
        if (isTextEditorOpen) {
          setIsTextEditorOpen(false);
        } else if (isStickerPickerOpen) {
          setIsStickerPickerOpen(false);
        } else if (activeTool === 'draw') {
          setActiveTool(null);
        } else {
          handleClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
      if (previousActiveElementRef.current?.focus) {
        previousActiveElementRef.current.focus();
      }
    };
  }, [isOpen, state, isTextEditorOpen, isStickerPickerOpen, activeTool, handleClose]);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const isBusy = state === 'uploading' || state === 'publishing';
  const isVideo =
    file?.type?.startsWith('video/') ||
    ALLOWED_VIDEO_EXTS.includes((file?.name?.split('.').pop() || '').toLowerCase());
  const hasEdits = Boolean(
    drawingPaths.length > 0 ||
      textOverlays.length > 0 ||
      stickers.length > 0 ||
      selectedFilter !== 'none'
  );

  return createPortal(
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md select-none"
        role="dialog"
        aria-modal="true"
        aria-label="Create story"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: shouldReduceMotion ? 0.05 : 0.2 }}
          className="absolute inset-0 bg-transparent"
          onClick={() => {
            if (!isBusy) handleClose();
          }}
        />

        <motion.div
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 16 }}
          transition={{ type: 'spring', damping: 28, stiffness: 350 }}
          className="relative w-full max-w-md bg-[#0B111E] border border-white/[0.1] rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[96vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-white/[0.06] bg-[#0B111E]/80 backdrop-blur-md z-30">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>Create Story</span>
                {isPreviewMode && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 uppercase font-semibold">
                    Preview
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-text-muted">
                Visible to community members for 24 hours
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              disabled={isBusy}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-white/[0.05] hover:bg-white/[0.1] disabled:opacity-30 rounded-full transition-colors text-text-muted hover:text-white cursor-pointer"
              aria-label="Close create story modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Creation Mode Tabs (Only when no media selected) */}
          {!previewUrl && !isBusy && (
            <div className="flex px-4 pt-3 gap-2">
              <button
                type="button"
                onClick={() => setTab('media')}
                className={`flex-1 min-h-[44px] rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  tab === 'media'
                    ? 'bg-brand-mint text-bg-base shadow-sm'
                    : 'bg-white/[0.04] text-text-muted hover:text-white hover:bg-white/[0.08]'
                }`}
              >
                <ImageIcon className="w-4 h-4" /> Photo / Video
              </button>
              <button
                type="button"
                onClick={() => setTab('text')}
                className={`flex-1 min-h-[44px] rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  tab === 'text'
                    ? 'bg-brand-mint text-bg-base shadow-sm'
                    : 'bg-white/[0.04] text-text-muted hover:text-white hover:bg-white/[0.08]'
                }`}
              >
                <Type className="w-4 h-4" /> Text Story
              </button>
            </div>
          )}

          {/* Main Body Section */}
          <div className="relative flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 flex flex-col items-center justify-center">
            {/* ── Media Mode ── */}
            {tab === 'media' && (
              <div className="w-full relative flex flex-col items-center justify-center">
                {previewUrl ? (
                  <div className="relative w-full flex items-center justify-center">
                    {/* The 9:16 Interactive Canvas */}
                    <StoryEditorCanvas
                      file={file}
                      previewUrl={previewUrl}
                      isVideo={isVideo}
                      filter={selectedFilter}
                      isMuted={isMuted}
                      drawingPaths={drawingPaths}
                      onAddDrawingPath={handleAddDrawingPath}
                      isDrawingMode={activeTool === 'draw'}
                      drawingColor={drawingColor}
                      drawingStrokeWidth={drawingStrokeWidth}
                      textOverlays={textOverlays}
                      onUpdateTextOverlay={handleUpdateTextOverlay}
                      onRemoveTextOverlay={handleRemoveTextOverlay}
                      onEditTextOverlay={handleEditTextOverlay}
                      stickers={stickers}
                      onUpdateSticker={handleUpdateSticker}
                      onRemoveSticker={handleRemoveSticker}
                      isPreviewMode={isPreviewMode}
                    />

                    {/* Quick Media Actions: Change & Delete */}
                    {!isBusy && !isPreviewMode && (
                      <div className="absolute top-3 right-3 flex items-center gap-2 z-30">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="min-h-[44px] px-3.5 py-1.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white text-xs font-semibold border border-white/20 transition-all cursor-pointer shadow-md flex items-center justify-center"
                        >
                          Change
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveMedia}
                          className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-black/60 rounded-full hover:bg-rose-600 text-white transition-colors cursor-pointer border border-white/20 shadow-md"
                          aria-label="Remove media"
                          title="Remove media"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {/* Drawing Controls Overlay */}
                    {activeTool === 'draw' && (
                      <StoryDrawingControls
                        color={drawingColor}
                        strokeWidth={drawingStrokeWidth}
                        onColorChange={setDrawingColor}
                        onStrokeWidthChange={setDrawingStrokeWidth}
                        onUndo={handleUndoDrawing}
                        onClear={handleClearDrawing}
                        onDone={() => setActiveTool(null)}
                      />
                    )}

                    {/* Filters Strip Overlay */}
                    {activeTool === 'filter' && (
                      <StoryFilterPicker
                        selectedFilter={selectedFilter}
                        onSelectFilter={(f) => {
                          setSelectedFilter(f);
                        }}
                      />
                    )}
                  </div>
                ) : (
                  // Large Premium Dropzone with Native Camera/Gallery support
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-[9/16] w-full max-h-[76vh] rounded-2xl border-2 border-dashed border-white/[0.12] hover:border-brand-mint/60 bg-white/[0.02] hover:bg-white/[0.04] transition-all flex flex-col items-center justify-center p-6 text-center cursor-pointer group"
                    role="button"
                    tabIndex={0}
                    aria-label="Upload photo or video for story"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        fileInputRef.current?.click();
                      }
                    }}
                  >
                    <div className="w-14 h-14 rounded-full bg-white/[0.05] group-hover:bg-brand-mint/10 flex items-center justify-center text-text-muted group-hover:text-brand-mint transition-colors mb-3">
                      <UploadCloud className="w-7 h-7" />
                    </div>
                    <h3 className="text-sm font-bold text-white mb-1">
                      Choose photo or video
                    </h3>
                    <p className="text-xs text-text-muted max-w-[240px] leading-relaxed">
                      Photos up to 8 MB, vertical videos up to 1 GB (max 90s)
                    </p>
                    <span className="mt-4 min-h-[44px] px-4 py-2 rounded-xl bg-white/[0.06] group-hover:bg-brand-mint group-hover:text-[#0B111E] text-xs font-semibold text-white transition-all flex items-center justify-center">
                      Browse files
                    </span>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={isBusy}
                />
              </div>
            )}

            {/* ── Text Mode ── */}
            {tab === 'text' && (
              <div className="w-full space-y-4">
                <div
                  className={`aspect-[9/16] max-h-[76vh] rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-inner transition-colors duration-300 ${bgColor}`}
                >
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value.slice(0, 300))}
                    placeholder="Type something inspiring..."
                    className="w-full bg-transparent text-white placeholder-white/60 text-lg sm:text-xl font-bold text-center resize-none focus:outline-none drop-shadow-md leading-relaxed"
                    rows={6}
                    disabled={isBusy}
                    maxLength={300}
                    autoFocus
                  />
                  <span className="text-[11px] text-white/70 mt-2 font-mono">
                    {text.length}/300
                  </span>
                </div>

                {/* Background Color Presets */}
                {!isBusy && (
                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-2">
                      Background Gradient
                    </label>
                    <div className="flex gap-2 justify-between">
                      {BACKGROUND_COLORS.map((bg, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setBgColor(bg)}
                          className={`min-w-[44px] min-h-[44px] rounded-full ${bg} transition-all cursor-pointer ${
                            bgColor === bg
                              ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0B111E] scale-110'
                              : 'opacity-70 hover:opacity-100 hover:scale-105'
                          }`}
                          aria-label={`Select background ${idx + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Progress / Status Display during upload & publish */}
            {isBusy && (
              <div className="w-full p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-white flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-brand-mint" />
                    {statusMessage}
                  </span>
                  {state === 'uploading' && (
                    <span className="font-mono text-brand-mint font-bold">
                      {uploadProgress}%
                    </span>
                  )}
                </div>

                <div className="h-2 w-full bg-white/[0.08] rounded-full overflow-hidden p-0.5 shadow-inner">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-indigo-500 shadow-[0_0_12px_rgba(56,189,248,0.5)] transition-all duration-200 ease-out"
                    style={{
                      width: state === 'publishing' ? '100%' : `${uploadProgress}%`,
                    }}
                  />
                </div>

                {state === 'uploading' && (
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={handleCancelUpload}
                      className="min-h-[44px] px-3 text-xs text-rose-400 hover:text-rose-300 font-medium cursor-pointer flex items-center"
                    >
                      Cancel upload
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Error Banner with Specific Action */}
            {errorMessage && (
              <div className="w-full p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-2.5 text-xs text-rose-300">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="leading-snug">{errorMessage}</p>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Toolbar for Media Mode when Media is Selected */}
          {tab === 'media' && previewUrl && !isBusy && (
            <StoryEditorToolbar
              isVideo={isVideo}
              isMuted={isMuted}
              onToggleMute={() => setIsMuted((m) => !m)}
              activeTool={activeTool}
              onSelectTool={(tool) => {
                if (tool === 'text') {
                  handleOpenAddText();
                } else if (tool === 'sticker') {
                  setIsStickerPickerOpen(true);
                } else {
                  setActiveTool(tool);
                }
              }}
              isPreviewMode={isPreviewMode}
              onTogglePreview={() => setIsPreviewMode((p) => !p)}
              hasEdits={hasEdits}
              onResetEdits={handleResetEdits}
              disabled={isBusy}
            />
          )}

          {/* Action Footer */}
          <div className="p-3.5 sm:p-4 border-t border-white/[0.06] bg-[#0E1726]/60 flex items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isBusy}
              className="flex-1 min-h-[44px] rounded-xl bg-white/[0.05] hover:bg-white/[0.1] disabled:opacity-40 text-text-muted hover:text-white text-xs sm:text-sm font-semibold transition-all cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isBusy || (tab === 'media' && !file && !uploadedUrl) || (tab === 'text' && !text.trim())}
              className={`flex-1 min-h-[44px] rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                state === 'publishing'
                  ? 'community-shimmer-btn text-[#070B14]'
                  : 'bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 text-[#070B14] hover:shadow-[0_0_20px_rgba(52,211,153,0.4)] active:scale-95'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {state === 'uploading' ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Uploading {uploadProgress}%</span>
                </>
              ) : state === 'publishing' ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Publishing...</span>
                </>
              ) : state === 'published' ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Shared!</span>
                </>
              ) : state === 'failed' ? (
                uploadedUrl ? (
                  <span>Retry Publishing</span>
                ) : (
                  <span>Retry Upload</span>
                )
              ) : (
                <span>Share to Story</span>
              )}
            </button>
          </div>
        </motion.div>

        {/* Text Overlay Editor Modal */}
        <StoryTextEditorModal
          isOpen={isTextEditorOpen}
          initialData={editingTextOverlay}
          onSave={handleSaveTextOverlay}
          onCancel={() => {
            setIsTextEditorOpen(false);
            setEditingTextOverlay(null);
          }}
        />

        {/* Stickers Selection Modal */}
        <StoryStickerPicker
          isOpen={isStickerPickerOpen}
          onSelectSticker={handleAddSticker}
          onClose={() => setIsStickerPickerOpen(false)}
        />

        {/* Draft Protection Discard Confirmation */}
        <StoryDiscardDialog
          isOpen={showDiscardConfirm}
          onKeepEditing={() => setShowDiscardConfirm(false)}
          onDiscard={() => executeCleanup()}
        />
      </div>
    </AnimatePresence>,
    document.body
  );
}
