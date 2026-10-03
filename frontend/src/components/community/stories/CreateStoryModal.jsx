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

const ALLOWED_IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
const ALLOWED_VIDEO_EXTS = ['mp4', 'webm', 'mov'];
const MAX_IMAGE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB
const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

const BACKGROUND_COLORS = [
  'bg-gradient-to-br from-[#12314C] via-[#0C2033] to-[#070B14]',
  'bg-gradient-to-br from-[#0F283E] via-[#12314C] to-[#1B4B6F]',
  'bg-gradient-to-br from-[#0B1A28] via-[#12314C] to-[#0D2436]',
  'bg-gradient-to-br from-[#1A2E3D] via-[#12314C] to-[#252210]',
  'bg-gradient-to-br from-[#161F2E] via-[#0E1522] to-[#070B14]',
  'bg-gradient-to-b from-[#0E1726] to-[#060A12]',
];

/**
 * Story Publishing State Machine:
 * 'idle' -> 'selected' -> 'uploading' -> 'uploaded' -> 'publishing' -> 'published' | 'failed'
 */
export default function CreateStoryModal({ isOpen, onClose }) {
  const [tab, setTab] = useState('media'); // 'media' | 'text'
  const [text, setText] = useState('');
  const [bgColor, setBgColor] = useState(BACKGROUND_COLORS[0]);

  // Media state
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploadedUrl, setUploadedUrl] = useState(null);

  // State machine & progress
  const [state, setState] = useState('idle'); // idle | selected | uploading | uploaded | publishing | published | failed
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

  const handleClose = useCallback(() => {
    // Abort active upload if in-flight
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    // Clean up preview blob URL
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
    setState('idle');
    setUploadProgress(0);
    setErrorMessage(null);
    setStatusMessage('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose?.();
  }, [previewUrl, onClose]);

  const validateFile = (selectedFile) => {
    if (!selectedFile) return 'Please select a photo or video.';

    const ext = (selectedFile.name.split('.').pop() || '').toLowerCase();
    const isImage = selectedFile.type.startsWith('image/') || ALLOWED_IMAGE_EXTS.includes(ext);
    const isVideo = selectedFile.type.startsWith('video/') || ALLOWED_VIDEO_EXTS.includes(ext);

    if (!isImage && !isVideo) {
      return 'Unsupported file format. Please choose a JPEG, PNG, WEBP, GIF, MP4, or MOV file.';
    }

    if (isImage && selectedFile.size > MAX_IMAGE_SIZE_BYTES) {
      return 'This image is too large (max 15MB). Please choose a smaller image.';
    }

    if (isVideo && selectedFile.size > MAX_VIDEO_SIZE_BYTES) {
      return 'This video is too large (max 50MB). Please choose a smaller video.';
    }

    return null;
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const validationError = validateFile(selectedFile);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);

    setFile(selectedFile);
    setUploadedUrl(null); // Reset previously uploaded url when new file chosen
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);
    setState('selected');
    setErrorMessage(null);
  };

  const handleRemoveMedia = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setUploadedUrl(null);
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

          const uploadRes = await communityApi.uploadMedia(
            file,
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
        handleClose();
      }, 500);
    } catch (err) {
      isSubmittingRef.current = false;
      setState('failed');

      let userMsg = "Zeitnah couldn't publish this story right now. Please try again.";
      if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') {
        userMsg = 'Upload cancelled.';
      } else if (err?.response?.status === 413) {
        userMsg = 'File exceeds maximum upload size limit.';
      } else if (err?.response?.status === 401) {
        userMsg = 'Your session expired. Please sign in again.';
      } else if (
        err?.message === 'Network Error' ||
        (typeof navigator !== 'undefined' && !navigator.onLine)
      ) {
        userMsg = "We couldn't upload this story. Check your connection and try again.";
      } else if (err?.response?.data?.message) {
        userMsg = err.response.data.message;
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
        handleClose();
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
  }, [isOpen, state, handleClose]);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const isBusy = state === 'uploading' || state === 'publishing';
  const isVideo = file?.type?.startsWith('video/') || false;

  return createPortal(
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md select-none"
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
          className="relative w-full max-w-md bg-[#0B111E] border border-white/[0.1] rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-4.5 border-b border-white/[0.06]">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Create Story
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

          {/* Creation Mode Tabs */}
          {!isBusy && (
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

          {/* Body Section */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* ── Media Mode ── */}
            {tab === 'media' && (
              <div className="space-y-3">
                {previewUrl ? (
                  // Preview Container (9:16 aspect ratio)
                  <div className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-black border border-white/[0.1] flex items-center justify-center shadow-inner">
                    {isVideo ? (
                      <video
                        src={previewUrl}
                        className="w-full h-full object-cover"
                        controls
                        autoPlay
                        loop
                        muted
                      />
                    ) : (
                      <img
                        src={previewUrl}
                        alt="Story preview"
                        className="w-full h-full object-cover"
                      />
                    )}

                    {!isBusy && (
                      <div className="absolute top-3 right-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-2.5 py-1.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white text-xs font-medium border border-white/20 transition-all cursor-pointer shadow-md"
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
                  </div>
                ) : (
                  // Large Premium Dropzone
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-[9/16] rounded-2xl border-2 border-dashed border-white/[0.12] hover:border-brand-mint/60 bg-white/[0.02] hover:bg-white/[0.04] transition-all flex flex-col items-center justify-center p-6 text-center cursor-pointer group"
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
                      Photos up to 15MB, vertical videos up to 50MB
                    </p>
                    <span className="mt-4 px-3.5 py-1.5 rounded-xl bg-white/[0.06] group-hover:bg-brand-mint group-hover:text-[#0B111E] text-xs font-semibold text-white transition-all">
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
              <div className="space-y-4">
                {/* Live Preview Container */}
                <div
                  className={`aspect-[9/16] rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-inner transition-colors duration-300 ${bgColor}`}
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
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-2">
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
                      className="text-[11px] text-rose-400 hover:text-rose-300 font-medium cursor-pointer"
                    >
                      Cancel upload
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Error Banner with Specific Action */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-2.5 text-xs text-rose-300">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="leading-snug">{errorMessage}</p>
                </div>
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="p-4 border-t border-white/[0.06] bg-[#0E1726]/60 flex items-center gap-2">
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
      </div>
    </AnimatePresence>,
    document.body
  );
}
