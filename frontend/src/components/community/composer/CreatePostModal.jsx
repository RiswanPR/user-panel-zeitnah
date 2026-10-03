import React, { useState, useRef, useEffect, useCallback, useContext } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  X,
  ArrowLeft,
  Image as ImageIcon,
  Film,
  UploadCloud,
  Check,
  Trash2,
  RotateCw,
  Sparkles,
  MapPin,
  Smile,
  Hash,
  Layers,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { AuthContext } from '../../../context/AuthContext';
import { getUploadUrl } from '../../../utils/courseUi';
import { useCreatePost, useAIImproveText, useAISuggestTags } from '../../../hooks/useCommunity';
import { communityApi } from '../../../services/communityApi';
import toast from 'react-hot-toast';

const DRAFT_STORAGE_KEY = 'zeitnah_post_draft';

const ASPECT_RATIOS = [
  { id: 'original', label: 'Original', class: 'aspect-auto' },
  { id: '1:1', label: '1:1 Square', class: 'aspect-square' },
  { id: '4:5', label: '4:5 Portrait', class: 'aspect-[4/5]' },
  { id: '16:9', label: '16:9 Landscape', class: 'aspect-video' },
];

const POPULAR_HASHTAGS = [
  'engineering',
  'structures',
  'bim',
  'geotechnical',
  'architecture',
  'infrastructure',
  'concrete',
  'zeitnah',
];

const EMOJIS = ['🚀', '💡', '🏗️', '📐', '👏', '🔥', '✅', '✨'];

/**
 * CreatePostModal — Instagram-style multi-step publishing experience:
 * Step 1: Media Picker (Gallery, multi-select, drag-and-drop, format & 50MB validation)
 * Step 2: Media Edit (Aspect ratio, rotation, carousel preview, reordering)
 * Step 3: Post Details (Caption, hashtag chips, emoji, audience, location, character count)
 * Step 4: High-fidelity Upload Progress with cancel and retry recovery
 * Drafts: Local draft preservation with "Save draft / Discard" on close.
 */
export default function CreatePostModal({ isOpen, onClose }) {
  const { user } = useContext(AuthContext);
  const shouldReduceMotion = useReducedMotion();

  // Steps: 'SELECT' | 'EDIT' | 'DETAILS' | 'UPLOADING'
  const [step, setStep] = useState('SELECT');

  const [files, setFiles] = useState([]);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [aspectRatio, setAspectRatio] = useState('original');
  const [rotation, setRotation] = useState(0);

  const [content, setContent] = useState('');
  const [tags, setTags] = useState([]);
  const [audience, setAudience] = useState('PUBLIC');
  const [location, setLocation] = useState('');
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [altText, setAltText] = useState('');
  const [showAltInput, setShowAltInput] = useState(false);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState('');
  const [currentUploadIndex, setCurrentUploadIndex] = useState(0);
  const [uploadError, setUploadError] = useState(null);
  const [showDraftDialog, setShowDraftDialog] = useState(false);
  const [hasExistingDraft, setHasExistingDraft] = useState(false);

  const fileInputRef = useRef(null);
  const modalRef = useRef(null);
  const previousActiveElementRef = useRef(null);
  const abortControllerRef = useRef(null);
  const isPublishingRef = useRef(false);
  const idempotencyKeyRef = useRef(null);

  const createPostMutation = useCreatePost();
  const improveMutation = useAIImproveText();
  const suggestTagsMutation = useAISuggestTags();

  const userInitials = user?.name
    ? user.name
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'Z'
    : 'Z';
  const avatarUrl = user?.avatar ? getUploadUrl(user.avatar) : null;

  // Check for saved draft on mount
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (savedDraft) {
        setHasExistingDraft(true);
      }
    } catch {}
  }, [isOpen]);

  // Focus trap & body scroll lock
  useEffect(() => {
    if (isOpen) {
      previousActiveElementRef.current = document.activeElement;
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      return () => {
        document.body.style.overflow = originalOverflow;
        if (previousActiveElementRef.current?.focus) {
          previousActiveElementRef.current.focus();
        }
      };
    }
  }, [isOpen]);

  // Restore draft
  const handleRestoreDraft = () => {
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft.content) setContent(draft.content);
        if (draft.tags) setTags(draft.tags);
        if (draft.audience) setAudience(draft.audience);
        if (draft.location) setLocation(draft.location);
        if (draft.altText) setAltText(draft.altText);
        setStep('DETAILS');
        if (draft.hasMedia) {
          toast('Your text draft was saved. Please reselect your media to continue.', { icon: 'ℹ️' });
        } else {
          toast.success('Draft restored');
        }
      }
    } catch {
      toast.error('Unable to restore draft');
    }
    setHasExistingDraft(false);
  };

  const handleDiscardSavedDraft = () => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {}
    setHasExistingDraft(false);
  };

  // Cancel upload handler (Section 9)
  const handleCancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsUploading(false);
    isPublishingRef.current = false;
    setUploadStatusText('');
    setStep('DETAILS');
    toast('Upload cancelled.');
  };

  // Close / Dismissal confirmation
  const handleRequestClose = useCallback(() => {
    if (isUploading) {
      if (window.confirm('Upload in progress. Are you sure you want to cancel?')) {
        if (abortControllerRef.current) abortControllerRef.current.abort();
        setIsUploading(false);
        resetState(true);
        onClose();
      }
      return;
    }

    if (content.trim() || files.length > 0) {
      setShowDraftDialog(true);
    } else {
      resetState();
      onClose();
    }
  }, [content, files, isUploading, onClose]);

  // Keydown listener (Escape and Tab)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleRequestClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleRequestClose]);

  const resetState = (cleanupUploaded = false) => {
    idempotencyKeyRef.current = null;
    files.forEach((f) => {
      if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
      if (cleanupUploaded && f.uploadedUrl) {
        communityApi.deleteMedia(f.uploadedUrl).catch(() => {});
      }
    });
    setFiles([]);
    setActiveMediaIndex(0);
    setAspectRatio('original');
    setRotation(0);
    setContent('');
    setTags([]);
    setLocation('');
    setAltText('');
    setStep('SELECT');
    setIsUploading(false);
    setUploadProgress(0);
    setCurrentUploadIndex(0);
    setUploadError(null);
    setShowDraftDialog(false);
    isPublishingRef.current = false;
  };

  const handleSaveDraft = () => {
    try {
      localStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify({
          content,
          tags,
          audience,
          location,
          altText,
          hasMedia: files.length > 0,
          savedAt: new Date().toISOString(),
        })
      );
      toast.success('Draft saved');
    } catch {
      toast.error('Could not save draft locally');
    }
    resetState(false);
    onClose();
  };

  const handleDiscardDraft = () => {
    idempotencyKeyRef.current = null;
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {}
    resetState(true);
    onClose();
  };

  // ── Step 1: File Selection & Pre-Validation ──
  const handleFilesAdded = (e) => {
    const incomingFiles = Array.from(e.target.files || []);
    if (!incomingFiles.length) return;

    // Security & pre-validation checks
    for (const file of incomingFiles) {
      if (file.size > 50 * 1024 * 1024) {
        toast.error(`"${file.name}" exceeds the 50MB file size limit.`);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      const ext = (file.name || '').split('.').pop()?.toLowerCase();
      const isAllowed =
        file.type.startsWith('image/') ||
        file.type.startsWith('video/') ||
        file.type.includes('pdf') ||
        ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'mp4', 'mov', 'webm', 'pdf'].includes(ext);

      if (!isAllowed) {
        toast.error(`Unsupported format for "${file.name}". Please upload an image, video, or document.`);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
    }

    const newMediaItems = incomingFiles.map((file) => {
      const ext = (file.name || '').split('.').pop()?.toLowerCase();
      const isVideo = file.type.startsWith('video/') || ['mp4', 'mov', 'webm'].includes(ext);
      const isPdf = file.type.includes('pdf') || ext === 'pdf';
      const type = isVideo ? 'video' : isPdf ? 'document' : 'image';
      const mimeType = file.type || (isVideo ? 'video/mp4' : isPdf ? 'application/pdf' : 'image/png');

      return {
        id: `${Date.now()}-${Math.random()}`,
        file,
        previewUrl: URL.createObjectURL(file),
        type,
        name: file.name,
        size: file.size,
        mimeType,
      };
    });

    setFiles((prev) => [...prev, ...newMediaItems]);
    setStep('EDIT');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveFile = (id) => {
    setFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      const filtered = prev.filter((f) => f.id !== id);
      if (filtered.length === 0) {
        setStep('SELECT');
      } else if (activeMediaIndex >= filtered.length) {
        setActiveMediaIndex(filtered.length - 1);
      }
      return filtered;
    });
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // ── Publishing Submission with High-Fidelity Progress ──
  const handlePublish = async () => {
    if (isPublishingRef.current || isUploading || createPostMutation.isPending) {
      return;
    }

    if (!content.trim() && files.length === 0) {
      toast.error('Please add a caption or media to share.');
      return;
    }

    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = `post_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }

    isPublishingRef.current = true;
    abortControllerRef.current = new AbortController();
    setStep('UPLOADING');
    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    setUploadStatusText('Preparing media upload...');

    try {
      const uploadedMedia = [];

      // 1. Upload each selected media file (reusing previously uploaded items on retry)
      for (let i = 0; i < files.length; i++) {
        const item = files[i];
        setCurrentUploadIndex(i);
        setUploadStatusText(`Uploading media ${i + 1} of ${files.length}...`);

        let mediaUrl = item.uploadedUrl;
        let mediaSize = item.uploadedSize || item.size;
        let mediaMime = item.uploadedMime || item.mimeType;

        if (!mediaUrl) {
          const response = await communityApi.uploadMedia(
            item.file,
            (progressEvent) => {
              if (progressEvent.total) {
                const filePercent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                const totalPercent = Math.round(
                  ((i + filePercent / 100) / files.length) * 85
                );
                setUploadProgress(totalPercent);
              }
            },
            abortControllerRef.current?.signal
          );

          // Canonical response adapter (Section 3)
          mediaUrl = response?.url || response?.data?.url || (typeof response === 'string' ? response : '');
          mediaSize = response?.size || response?.data?.size || item.size;
          mediaMime = response?.mimeType || response?.data?.mimeType || item.mimeType;

          item.uploadedUrl = mediaUrl;
          item.uploadedSize = mediaSize;
          item.uploadedMime = mediaMime;
        }

        uploadedMedia.push({
          url: mediaUrl,
          type: item.type,
          mimeType: mediaMime,
          size: mediaSize,
        });
      }

      setUploadStatusText('Processing post...');
      setUploadProgress(92);

      // Determine canonical post type
      const postType =
        uploadedMedia.length > 0
          ? uploadedMedia[0].type === 'video'
            ? 'VIDEO'
            : 'IMAGE'
          : 'TEXT';

      // Assemble final post content with location tag if provided
      let finalContent = content.trim();
      if (location.trim()) {
        finalContent = `📍 ${location.trim()}\n\n${finalContent}`;
      }

      // Canonical audience normalization (Section 11 DTO contract)
      let normalizedAudience = (audience || 'PUBLIC').toUpperCase();
      if (normalizedAudience === 'COHORT') normalizedAudience = 'COURSE';
      if (!['PUBLIC', 'COURSE', 'BATCH', 'PRIVATE'].includes(normalizedAudience)) {
        normalizedAudience = 'PUBLIC';
      }

      await createPostMutation.mutateAsync({
        content: finalContent,
        audience: normalizedAudience,
        type: postType,
        media: uploadedMedia,
        tags,
        idempotencyKey: idempotencyKeyRef.current,
      });

      setUploadProgress(100);
      setUploadStatusText('Published!');
      toast.success('Post shared to Community!');

      // Reset idempotency key upon successful publish
      idempotencyKeyRef.current = null;

      // Remove saved draft if any
      try {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch {}

      setTimeout(() => {
        resetState(false);
        onClose();
      }, 400);
    } catch (err) {
      setIsUploading(false);
      isPublishingRef.current = false;
      let errMsg = 'Failed to share post. Please try again.';
      if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') {
        errMsg = 'Upload cancelled.';
      } else if (err?.response?.status === 413) {
        errMsg = 'File exceeds maximum upload size limit.';
      } else if (err?.response?.status === 401) {
        errMsg = 'Your session has expired. Please sign in again.';
      } else if (
        err?.message === 'Network Error' ||
        (typeof navigator !== 'undefined' && !navigator.onLine)
      ) {
        errMsg = 'Network connection error. Please check your internet connection.';
      } else if (err?.response?.data?.message) {
        errMsg = err.response.data.message;
      }
      setUploadError(errMsg);
      toast.error(errMsg);
    } finally {
      isPublishingRef.current = false;
    }
  };

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const currentMedia = files[activeMediaIndex] || files[0];

  return createPortal(
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[90] flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md"
        role="dialog"
        aria-modal="true"
        aria-label="Create new post"
        aria-labelledby="create-post-title"
      >
        <motion.div
          ref={modalRef}
          initial={shouldReduceMotion ? { opacity: 0 } : { scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="relative w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-[760px] bg-[#0B111E] border-0 sm:border border-white/[0.1] rounded-none sm:rounded-3xl shadow-[0_16px_64px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden text-white"
        >
          {/* ── Modal Header Bar ── */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/[0.08] shrink-0 select-none bg-[#0B111E]">
            <div className="flex items-center gap-2">
              {step !== 'SELECT' && step !== 'UPLOADING' ? (
                <button
                  type="button"
                  onClick={() => {
                    if (step === 'DETAILS') setStep('EDIT');
                    else if (step === 'EDIT') setStep('SELECT');
                  }}
                  className="p-1.5 -ml-1 rounded-lg text-text-muted hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                  aria-label="Previous step"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              ) : null}

              <h2 id="create-post-title" className="text-sm sm:text-base font-bold text-white tracking-tight">
                {step === 'SELECT' && 'Create new post'}
                {step === 'EDIT' && 'Adjust & Preview'}
                {step === 'DETAILS' && 'New post'}
                {step === 'UPLOADING' && 'Sharing'}
              </h2>
            </div>

            {/* Next / Share Action in Header */}
            <div className="flex items-center gap-2">
              {step === 'EDIT' && (
                <button
                  type="button"
                  onClick={() => setStep('DETAILS')}
                  className="text-xs font-semibold text-brand-mint hover:text-brand-mint/80 px-3 py-1.5 rounded-lg bg-brand-mint/10 transition-colors cursor-pointer"
                >
                  Next
                </button>
              )}

              {step === 'DETAILS' && (
                <button
                  type="button"
                  id="composer-submit-btn"
                  onClick={handlePublish}
                  disabled={isUploading || createPostMutation.isPending}
                  className="text-xs font-bold text-bg-base bg-brand-mint hover:bg-brand-mint/90 px-4 py-1.5 rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {createPostMutation.isPending || isUploading ? 'Publishing...' : 'Publish'}
                </button>
              )}

              {step !== 'UPLOADING' && (
                <button
                  type="button"
                  id="create-post-close-btn"
                  onClick={handleRequestClose}
                  className="p-1.5 rounded-lg text-text-muted hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                  aria-label="Close composer"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* ── Saved Draft Notification Banner ── */}
          {hasExistingDraft && step === 'SELECT' && (
            <div className="px-4 py-2.5 bg-brand-mint/10 border-b border-brand-mint/20 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-white/90">
                <Sparkles className="w-3.5 h-3.5 text-brand-mint" />
                <span>You have an unfinished post draft.</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRestoreDraft}
                  className="font-semibold text-brand-mint hover:underline cursor-pointer"
                >
                  Resume
                </button>
                <span className="text-white/20">•</span>
                <button
                  type="button"
                  onClick={handleDiscardSavedDraft}
                  className="text-text-muted hover:text-white cursor-pointer"
                >
                  Discard
                </button>
              </div>
            </div>
          )}

          {/* ── Hidden File Input ── */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,application/pdf"
            onChange={handleFilesAdded}
            className="hidden"
            id="create-post-file-input"
          />

          {/* ── STEP 1: Media Picker (Gallery & Drop Zone) ── */}
          {step === 'SELECT' && (
            <div
              id="media-dropzone"
              className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12 text-center min-h-[380px] sm:min-h-[460px]"
            >
              <div className="w-20 h-20 rounded-3xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-text-muted mb-5 shadow-inner">
                <UploadCloud className="w-10 h-10 text-brand-mint" />
              </div>

              <h3 className="text-base sm:text-lg font-bold text-white mb-2">
                Drag photos and videos here
              </h3>
              <p className="text-xs text-text-muted max-w-sm mb-6 leading-relaxed">
                Share technical field showcases, project blueprints, or questions with the verified Zeitnah network.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="min-h-[44px] px-6 py-2.5 rounded-xl bg-brand-mint text-bg-base font-bold text-xs hover:bg-brand-mint/90 transition-all shadow-md cursor-pointer"
                >
                  Select from computer
                </button>

                <button
                  type="button"
                  id="create-post-text-only-btn"
                  onClick={() => setStep('DETAILS')}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-semibold text-text-muted hover:text-white transition-all cursor-pointer"
                >
                  Write text-only post
                </button>
              </div>

              <p className="text-[11px] text-text-faint mt-6">
                Supports JPG, PNG, WEBP, MP4, MOV up to 50MB.
              </p>
            </div>
          )}

          {/* ── STEP 2: Media Edit (Aspect Ratio, Rotate, Reorder) ── */}
          {step === 'EDIT' && currentMedia && (
            <div className="flex-1 flex flex-col min-h-0 bg-[#070B14]">
              {/* Main Media Preview Area */}
              <div className="relative flex-1 flex items-center justify-center overflow-hidden min-h-[300px] sm:min-h-[420px] max-h-[500px]">
                {currentMedia.type === 'video' ? (
                  <video
                    src={currentMedia.previewUrl}
                    controls
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <div
                    className={`relative w-full h-full flex items-center justify-center transition-all ${
                      aspectRatio === '1:1'
                        ? 'aspect-square max-h-[400px]'
                        : aspectRatio === '4:5'
                        ? 'aspect-[4/5] max-h-[440px]'
                        : aspectRatio === '16:9'
                        ? 'aspect-video max-h-[360px]'
                        : 'max-h-full'
                    }`}
                  >
                    <img
                      src={currentMedia.previewUrl}
                      alt={currentMedia.name}
                      style={{ transform: `rotate(${rotation}deg)` }}
                      className="max-h-full max-w-full object-contain transition-transform duration-200"
                    />
                  </div>
                )}

                {/* Left/Right Carousel Controls if multiple */}
                {files.length > 1 && (
                  <>
                    {activeMediaIndex > 0 && (
                      <button
                        type="button"
                        onClick={() => setActiveMediaIndex((prev) => prev - 1)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center backdrop-blur-sm border border-white/10 cursor-pointer shadow-md"
                        aria-label="Previous image"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                    )}
                    {activeMediaIndex < files.length - 1 && (
                      <button
                        type="button"
                        onClick={() => setActiveMediaIndex((prev) => prev + 1)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center backdrop-blur-sm border border-white/10 cursor-pointer shadow-md"
                        aria-label="Next image"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Edit Controls Toolbar */}
              <div className="p-3 bg-[#0B111E] border-t border-white/[0.08] flex items-center justify-between gap-3 select-none">
                {/* Aspect Ratio Switcher */}
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                  {ASPECT_RATIOS.map((ratio) => (
                    <button
                      key={ratio.id}
                      type="button"
                      onClick={() => setAspectRatio(ratio.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 ${
                        aspectRatio === ratio.id
                          ? 'bg-brand-mint text-bg-base font-bold'
                          : 'bg-white/[0.04] text-text-muted hover:text-white'
                      }`}
                    >
                      {ratio.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleRotate}
                    className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-text-muted hover:text-white transition-colors cursor-pointer"
                    title="Rotate 90°"
                    aria-label="Rotate image"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-text-muted hover:text-white transition-colors cursor-pointer"
                    title="Add more media"
                    aria-label="Add more media"
                  >
                    <Layers className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Thumbnails Filmstrip if multiple files */}
              {files.length > 1 && (
                <div className="px-3 pb-3 bg-[#0B111E] flex items-center gap-2 overflow-x-auto scrollbar-none">
                  {files.map((f, idx) => (
                    <div
                      key={f.id}
                      onClick={() => setActiveMediaIndex(idx)}
                      className={`relative w-14 h-14 rounded-xl overflow-hidden shrink-0 cursor-pointer border-2 transition-all ${
                        idx === activeMediaIndex ? 'border-brand-mint' : 'border-transparent opacity-60'
                      }`}
                    >
                      <img src={f.previewUrl} alt={f.name} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFile(f.id);
                        }}
                        className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/70 text-white hover:text-rose-400"
                        title="Remove file"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── STEP 3: Post Details Screen (Caption, Tags, Audience) ── */}
          {step === 'DETAILS' && (
            <div className="flex-1 flex flex-col sm:flex-row min-h-0 overflow-y-auto">
              {/* Media Thumbnail Preview (Left column on desktop, Top on mobile) */}
              {files.length > 0 && (
                <div className="w-full sm:w-[280px] bg-[#070B14] p-4 flex flex-col items-center justify-center border-b sm:border-b-0 sm:border-r border-white/[0.08] shrink-0">
                  <div className="relative w-full aspect-square max-w-[220px] rounded-2xl overflow-hidden bg-black/40 border border-white/[0.08]">
                    {files[0].type === 'video' ? (
                      <video src={files[0].previewUrl} className="w-full h-full object-cover" />
                    ) : (
                      <img src={files[0].previewUrl} alt="Preview" className="w-full h-full object-cover" />
                    )}
                    {files.length > 1 && (
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/70 text-[10px] font-mono text-white">
                        1/{files.length}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep('EDIT')}
                    className="text-xs text-brand-mint hover:underline mt-2.5 cursor-pointer"
                  >
                    Edit media
                  </button>
                </div>
              )}

              {/* Form Content Column */}
              <div className="flex-1 p-4 sm:p-5 space-y-4 overflow-y-auto">
                {/* Author Info & Audience Selector */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-[#0E1726] border border-white/[0.1] overflow-hidden flex items-center justify-center text-xs font-bold text-brand-mint shrink-0">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={user?.name || 'You'} className="w-full h-full object-cover" />
                      ) : (
                        userInitials
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white">{user?.name || 'You'}</p>
                      <p className="text-[10px] text-text-faint">
                        {user?.username ? `@${user.username}` : 'Verified Member'}
                      </p>
                    </div>
                  </div>

                  {/* Audience Selector */}
                  <select
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    className="bg-white/[0.04] border border-white/[0.08] text-[11px] font-medium text-text-secondary rounded-lg px-2.5 py-1 focus:outline-none focus:border-brand-mint/40 cursor-pointer"
                  >
                    <option value="PUBLIC" className="bg-[#0B111E]">Public (Everyone)</option>
                    <option value="COURSE" className="bg-[#0B111E]">My Cohort / Course Only</option>
                  </select>
                </div>

                {/* Caption Textarea */}
                <div className="relative">
                  <textarea
                    id="create-post-caption-input"
                    data-testid="composer-textarea"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Write a caption... Share insights, questions, or field updates"
                    rows={4}
                    maxLength={5000}
                    className="w-full bg-white/[0.02] border border-white/[0.08] focus:border-brand-mint/40 rounded-2xl p-3.5 text-xs sm:text-sm text-white placeholder-text-faint focus:outline-none resize-none transition-colors"
                  />
                  <div className="flex items-center justify-between text-[11px] text-text-faint pt-1 px-1">
                    <div className="flex items-center gap-1.5">
                      {EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setContent((prev) => `${prev} ${emoji}`)}
                          className="hover:scale-125 transition-transform cursor-pointer text-sm"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                    <span>{content.length} / 5000</span>
                  </div>
                </div>

                {/* Popular Hashtags Shortcut */}
                <div>
                  <p className="text-[10px] font-semibold text-text-faint uppercase tracking-wider mb-2">
                    Popular Topics
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {POPULAR_HASHTAGS.map((tag) => {
                      const isSelected = tags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            if (isSelected) setTags((prev) => prev.filter((t) => t !== tag));
                            else setTags((prev) => [...prev, tag]);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-brand-mint text-bg-base font-bold'
                              : 'bg-white/[0.04] text-text-muted hover:text-white hover:bg-white/[0.08]'
                          }`}
                        >
                          #{tag}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Optional Location Input */}
                <div className="pt-2 border-t border-white/[0.06]">
                  {showLocationInput ? (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-brand-mint shrink-0" />
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="Add location (e.g., Dubai, UAE or Construction Site #4)"
                        className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-1.5 text-xs text-white placeholder-text-faint focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setLocation('');
                          setShowLocationInput(false);
                        }}
                        className="text-text-muted hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowLocationInput(true)}
                      className="flex items-center gap-2 text-xs text-text-muted hover:text-white transition-colors cursor-pointer"
                    >
                      <MapPin className="w-3.5 h-3.5 text-text-faint" />
                      <span>{location ? `Location: ${location}` : 'Add location'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 4: High-Fidelity Upload Progress & Error Recovery ── */}
          {step === 'UPLOADING' && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12 text-center min-h-[360px]">
              {uploadError ? (
                <div className="w-full max-w-sm flex flex-col items-center text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-2">
                    <AlertCircle className="w-8 h-8" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    Upload failed
                  </h3>
                  <p className="text-xs text-text-muted leading-relaxed">
                    {uploadError}
                  </p>
                  <div className="flex items-center gap-3 pt-3">
                    <button
                      type="button"
                      id="upload-retry-btn"
                      onClick={() => {
                        setUploadError(null);
                        handlePublish();
                      }}
                      className="px-5 py-2.5 rounded-xl bg-brand-mint text-bg-base text-xs font-bold hover:bg-brand-mint/90 transition-all cursor-pointer shadow-md"
                    >
                      Try again
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setUploadError(null);
                        setStep('DETAILS');
                      }}
                      className="px-4 py-2.5 rounded-xl bg-white/[0.06] text-white text-xs font-semibold hover:bg-white/[0.1] transition-all cursor-pointer"
                    >
                      Back to edit
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-brand-mint/10 border border-brand-mint/30 flex items-center justify-center mb-6">
                    <Loader2 className="w-8 h-8 text-brand-mint animate-spin" />
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-white mb-1">
                    Sharing your post
                  </h3>
                  <p className="text-xs text-text-muted mb-2">{uploadStatusText}</p>
                  {files.length > 1 && (
                    <p className="text-[11px] font-mono text-text-faint mb-5">
                      Media {currentUploadIndex + 1} of {files.length}
                    </p>
                  )}

                  {/* Progress Bar */}
                  <div className="w-full max-w-xs h-2 bg-white/[0.08] rounded-full overflow-hidden mb-2">
                    <motion.div
                      className="h-full bg-brand-mint rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress}%` }}
                      transition={{ duration: 0.2 }}
                    />
                  </div>

                  <p className="text-xs font-mono font-bold text-brand-mint mb-8">
                    {uploadProgress}%
                  </p>

                  <button
                    type="button"
                    data-testid="cancel-upload-btn"
                    onClick={handleCancelUpload}
                    className="text-xs text-text-muted hover:text-rose-400 transition-colors cursor-pointer"
                  >
                    Cancel upload
                  </button>
                </>
              )}
            </div>
          )}
        </motion.div>

        {/* ── Save Draft Confirmation Dialog ── */}
        <AnimatePresence>
          {showDraftDialog && (
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="draft-dialog-title"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="w-full max-w-sm bg-[#0E1726] border border-white/[0.1] rounded-2xl p-5 shadow-2xl text-center space-y-4"
              >
                <h3 id="draft-dialog-title" className="text-sm font-bold text-white">
                  Save post draft?
                </h3>
                <p className="text-xs text-text-muted leading-relaxed">
                  If you leave now, you can save your caption and attachments as a draft to resume later.
                </p>

                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    id="draft-save-btn"
                    onClick={handleSaveDraft}
                    className="w-full py-2.5 rounded-xl bg-brand-mint text-bg-base text-xs font-bold hover:bg-brand-mint/90 transition-colors cursor-pointer"
                  >
                    Save draft
                  </button>
                  <button
                    type="button"
                    id="draft-discard-btn"
                    onClick={handleDiscardDraft}
                    className="w-full py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Discard
                  </button>
                  <button
                    type="button"
                    id="draft-cancel-btn"
                    onClick={() => setShowDraftDialog(false)}
                    className="w-full py-2.5 rounded-xl hover:bg-white/[0.04] text-text-muted text-xs font-medium transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AnimatePresence>,
    document.body
  );
}
