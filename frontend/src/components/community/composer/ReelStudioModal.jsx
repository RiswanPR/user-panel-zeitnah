import { useState, useRef, useEffect, useCallback, useContext } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Film,
  UploadCloud,
  Sparkles,
  AlertCircle,
  Loader2,
  Globe,
  Users,
  Lock,
  Trash2,
  RefreshCw,
  Hash,
  CheckCircle2,
} from 'lucide-react';
import { AuthContext } from '../../../context/AuthContext';
import { getUploadUrl } from '../../../utils/courseUi';
import { useCreatePost } from '../../../hooks/useCommunity';
import { communityApi } from '../../../services/communityApi';
import toast from 'react-hot-toast';

const POPULAR_REEL_HASHTAGS = [
  'structures',
  'bim',
  'engineering',
  'architecture',
  'geotechnical',
  'concrete',
  'infrastructure',
  'zeitnah',
];

const AUDIENCE_OPTIONS = [
  { id: 'PUBLIC', label: 'Public', description: 'Visible to entire community', icon: Globe },
  { id: 'COURSE', label: 'Course', description: 'Visible to course members', icon: Users },
  { id: 'PRIVATE', label: 'Private', description: 'Only mentors and connections', icon: Lock },
];

/**
 * ReelStudioModal — Purpose-built Reel creation foundation:
 * - Desktop: 2-column studio shell (9:16 true preview left, details right)
 * - Mobile: Responsive full-screen creation workflow
 * - 9:16 true video preview with play/pause, volume control, and resource cleanup
 * - Pre-upload client validation (<=90 seconds, <=1GB, MP4/MOV/WebM)
 * - Reuses existing communityApi.uploadMedia with honest real-time progress
 * - Cancel upload with AbortController
 * - Draft-ready status architecture ('SELECT' | 'READY' | 'UPLOADING' | 'PUBLISHED' | 'ERROR')
 * - Unsaved changes discard confirmation
 */
export default function ReelStudioModal({ isOpen, onClose, onSuccess }) {
  const { user } = useContext(AuthContext);
  const shouldReduceMotion = useReducedMotion();

  // Status: 'SELECT' | 'READY' | 'UPLOADING' | 'PUBLISHED' | 'ERROR'
  const [status, setStatus] = useState('SELECT');

  // Video State
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [videoDuration, setVideoDuration] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Form State
  const [caption, setCaption] = useState('');
  const [tags, setTags] = useState([]);
  const [audience, setAudience] = useState('PUBLIC');
  const [showAudienceMenu, setShowAudienceMenu] = useState(false);

  // Upload & Progress State
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState('');
  const [uploadedMediaData, setUploadedMediaData] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);

  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const modalRef = useRef(null);
  const previousActiveElementRef = useRef(null);
  const abortControllerRef = useRef(null);
  const isPublishingRef = useRef(false);
  const idempotencyKeyRef = useRef(null);

  const createPostMutation = useCreatePost();

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

  // Cleanup object URLs and active video resources
  const cleanupResources = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    if (videoRef.current) {
      try {
        videoRef.current.pause();
        videoRef.current.src = '';
        videoRef.current.load();
      } catch {}
    }
  }, [previewUrl]);

  // Reset state to initial
  const resetStudio = useCallback(
    (cleanS3 = false) => {
      cleanupResources();
      if (cleanS3 && uploadedMediaData?.url) {
        communityApi.deleteMedia(uploadedMediaData.url).catch(() => {});
      }
      setSelectedFile(null);
      setPreviewUrl(null);
      setVideoDuration(null);
      setIsPlaying(false);
      setCaption('');
      setTags([]);
      setAudience('PUBLIC');
      setStatus('SELECT');
      setUploadProgress(0);
      setUploadStatusText('');
      setUploadedMediaData(null);
      setUploadError(null);
      setShowDiscardDialog(false);
      isPublishingRef.current = false;
      idempotencyKeyRef.current = null;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [cleanupResources, uploadedMediaData]
  );

  // Focus management & body scroll lock
  useEffect(() => {
    if (isOpen) {
      previousActiveElementRef.current = document.activeElement;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
        if (previousActiveElementRef.current?.focus) {
          previousActiveElementRef.current.focus();
        }
      };
    }
  }, [isOpen]);

  // Clean resources on component unmount
  useEffect(() => {
    return () => {
      cleanupResources();
    };
  }, [cleanupResources]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleAttemptClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  });

  // Check if user has unsaved work
  const hasUnsavedChanges = Boolean(selectedFile || caption.trim() || tags.length > 0);

  const handleAttemptClose = () => {
    if (status === 'UPLOADING') {
      setShowDiscardDialog(true);
      return;
    }
    if (hasUnsavedChanges) {
      setShowDiscardDialog(true);
      return;
    }
    resetStudio(false);
    onClose();
  };

  const handleConfirmDiscard = () => {
    setShowDiscardDialog(false);
    resetStudio(true);
    onClose();
  };

  // Inspect video duration via browser DOM
  const checkVideoDuration = (file) => {
    return new Promise((resolve) => {
      try {
        const tempVideo = document.createElement('video');
        tempVideo.preload = 'metadata';
        const objUrl = URL.createObjectURL(file);
        tempVideo.onloadedmetadata = () => {
          URL.revokeObjectURL(objUrl);
          resolve(tempVideo.duration);
        };
        tempVideo.onerror = () => {
          URL.revokeObjectURL(objUrl);
          resolve(null);
        };
        tempVideo.src = objUrl;
      } catch {
        resolve(null);
      }
    });
  };

  // Validate and load video file
  const processVideoFile = async (file) => {
    if (!file) return;

    const ext = (file.name || '').split('.').pop()?.toLowerCase();
    const isAllowedExt = ['mp4', 'mov', 'webm'].includes(ext);
    const isAllowedMime = file.type.startsWith('video/') || ['video/mp4', 'video/quicktime', 'video/webm'].includes(file.type);

    if (!isAllowedExt && !isAllowedMime) {
      toast.error('Unsupported video format. Please upload MP4, MOV, or WebM.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Video size limit: 1 GiB / 1 GB user-facing
    if (file.size > 1024 * 1024 * 1024) {
      toast.error('Video exceeds the 1 GB file size limit.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Video duration limit: 90 seconds
    const duration = await checkVideoDuration(file);
    if (duration !== null && duration > 90) {
      toast.error('Reel must be 90 seconds or shorter.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Revoke previous URL if any
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    const newUrl = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewUrl(newUrl);
    setVideoDuration(duration);
    setStatus('READY');
    setIsPlaying(false);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processVideoFile(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      processVideoFile(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleRemoveVideo = () => {
    cleanupResources();
    setSelectedFile(null);
    setPreviewUrl(null);
    setVideoDuration(null);
    setStatus('SELECT');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const togglePlayPause = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted((prev) => !prev);
  };

  const handleAddHashtag = (tag) => {
    if (!tags.includes(tag)) {
      setTags((prev) => [...prev, tag]);
    }
    if (!caption.includes(`#${tag}`)) {
      setCaption((prev) => (prev ? `${prev} #${tag}` : `#${tag}`));
    }
  };

  const handleCancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setStatus('READY');
    setUploadProgress(0);
    setUploadStatusText('');
    isPublishingRef.current = false;
    toast('Upload cancelled', { icon: 'ℹ️' });
  };

  // Publish Reel Submission
  const handlePublishReel = async () => {
    if (isPublishingRef.current || createPostMutation.isPending) return;

    if (!selectedFile && !uploadedMediaData) {
      toast.error('Please select a video for your Reel.');
      return;
    }

    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = `reel_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }

    isPublishingRef.current = true;
    abortControllerRef.current = new AbortController();
    setStatus('UPLOADING');
    setUploadProgress(0);
    setUploadError(null);
    setUploadStatusText('Preparing Reel upload...');

    try {
      let mediaItem = uploadedMediaData;

      // 1. Upload video file if not already uploaded
      if (!mediaItem && selectedFile) {
        const response = await communityApi.uploadMedia(
          selectedFile,
          (progressEvent) => {
            if (progressEvent.total) {
              const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadProgress(Math.min(percent, 90));
              const loadedMB = (progressEvent.loaded / (1024 * 1024)).toFixed(1);
              const totalMB = (progressEvent.total / (1024 * 1024)).toFixed(1);
              setUploadStatusText(`Uploading Reel video (${loadedMB} MB / ${totalMB} MB)...`);
            }
          },
          abortControllerRef.current?.signal
        );

        const mediaUrl = response?.url || response?.data?.url || (typeof response === 'string' ? response : '');
        const mediaSize = response?.size || response?.data?.size || selectedFile.size;
        const mediaMime = response?.mimeType || response?.data?.mimeType || selectedFile.type || 'video/mp4';

        mediaItem = {
          url: mediaUrl,
          type: 'video',
          size: mediaSize,
          mimeType: mediaMime,
          thumbnailUrl: response?.thumbnailUrl || response?.data?.thumbnailUrl,
        };
        setUploadedMediaData(mediaItem);
      }

      setUploadStatusText('Finalizing Reel publication...');
      setUploadProgress(95);

      // 2. Submit post with VIDEO type
      await createPostMutation.mutateAsync({
        content: caption.trim(),
        type: 'VIDEO',
        media: [mediaItem],
        tags,
        audience,
        idempotencyKey: idempotencyKeyRef.current,
      });

      setUploadProgress(100);
      setStatus('PUBLISHED');
      toast.success('Reel published to Community!');

      idempotencyKeyRef.current = null;
      resetStudio(false);
      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') {
        setStatus('READY');
        return;
      }
      const msg = err?.response?.data?.message || err?.message || 'Failed to publish Reel. Please try again.';
      setUploadError(msg);
      setStatus('ERROR');
      toast.error(msg);
    } finally {
      isPublishingRef.current = false;
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatDuration = (seconds) => {
    if (!seconds && seconds !== 0) return '';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <div
        id="reel-studio-modal"
        className="fixed inset-0 z-[90] flex items-center justify-center p-0 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reel-studio-title"
        onClick={handleAttemptClose}
      >
        <motion.div
          ref={modalRef}
          initial={shouldReduceMotion ? { opacity: 0 } : { scale: 0.96, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={shouldReduceMotion ? { opacity: 0 } : { scale: 0.96, opacity: 0, y: 16 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-4xl bg-[#090E1A] sm:bg-[#0B111E] border-0 sm:border sm:border-white/[0.08] sm:rounded-2xl shadow-2xl flex flex-col text-white overflow-hidden select-none"
        >
          {/* ── Studio Header ── */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-white/[0.06] bg-[#0E1726]/60 backdrop-blur-sm shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-brand-mint/10 border border-brand-mint/20 flex items-center justify-center text-brand-mint">
                <Film className="w-4 h-4" />
              </div>
              <div>
                <h2 id="reel-studio-title" className="text-sm sm:text-base font-bold font-heading text-white flex items-center gap-2">
                  <span>Create Reel</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-brand-mint/15 text-brand-mint border border-brand-mint/30">
                    9:16
                  </span>
                </h2>
                <p className="text-[11px] text-text-muted hidden sm:block">
                  Short vertical video for high-impact community discovery
                </p>
              </div>
            </div>

            <button
              type="button"
              id="reel-studio-close-btn"
              onClick={handleAttemptClose}
              className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-text-muted hover:text-white hover:bg-white/[0.06] transition-colors flex items-center justify-center cursor-pointer"
              aria-label="Close Reel Studio"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* ── Main Studio Workspace (2-Column Desktop, Stacked Mobile) ── */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0">
            {status === 'UPLOADING' ? (
              /* ── Uploading View ── */
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center max-w-md mx-auto space-y-5">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-4 border-white/[0.06] border-t-brand-mint animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-mono font-bold text-brand-mint">
                    {uploadProgress}%
                  </div>
                </div>

                <div className="space-y-1.5 w-full">
                  <h3 className="text-base font-bold text-white">Uploading Reel</h3>
                  <p className="text-xs text-text-muted font-mono">{uploadStatusText}</p>

                  <div className="w-full h-2 bg-white/[0.06] rounded-full overflow-hidden mt-3">
                    <div
                      className="h-full bg-gradient-to-r from-brand-mint to-brand-yellow transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  data-testid="cancel-reel-upload-btn"
                  onClick={handleCancelUpload}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-medium text-text-muted hover:text-white transition-colors cursor-pointer"
                >
                  Cancel upload
                </button>
              </div>
            ) : status === 'ERROR' ? (
              /* ── Error Recovery View ── */
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center max-w-md mx-auto space-y-4">
                <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white">Upload failed</h3>
                  <p className="text-xs text-text-muted">{uploadError || 'Unable to upload video.'}</p>
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStatus('READY')}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-white/[0.06] text-xs font-semibold text-white"
                  >
                    Edit details
                  </button>
                  <button
                    type="button"
                    onClick={handlePublishReel}
                    className="min-h-[44px] px-5 py-2 rounded-xl bg-brand-mint text-bg-base text-xs font-bold flex items-center gap-2"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry</span>
                  </button>
                </div>
              </div>
            ) : (
              /* ── Creation Workspace: Left Canvas (9:16) + Right Details ── */
              <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">
                {/* ── Left Column: 9:16 Video Canvas ── */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-text-secondary tracking-wide uppercase">
                      Video Canvas
                    </span>
                    {selectedFile && (
                      <span className="text-[11px] font-mono text-brand-mint font-medium">
                        {formatDuration(videoDuration)} · {formatFileSize(selectedFile.size)}
                      </span>
                    )}
                  </div>

                  {!selectedFile ? (
                    /* ── Dropzone ── */
                    <div
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onClick={() => fileInputRef.current?.click()}
                      className={`aspect-[9/16] w-full max-w-[280px] mx-auto rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center p-6 text-center cursor-pointer group select-none ${
                        isDraggingOver
                          ? 'border-brand-mint bg-brand-mint/10'
                          : 'border-white/[0.12] hover:border-brand-mint/40 bg-white/[0.02] hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="w-14 h-14 rounded-2xl bg-brand-mint/10 border border-brand-mint/20 flex items-center justify-center text-brand-mint mb-4 group-hover:scale-110 transition-transform">
                        <UploadCloud className="w-7 h-7" />
                      </div>

                      <h4 className="text-sm font-bold text-white mb-1 group-hover:text-brand-mint transition-colors">
                        Add Reel Video
                      </h4>
                      <p className="text-xs text-text-muted mb-4">
                        Drag & drop or browse from device
                      </p>

                      <div className="space-y-1 text-[11px] text-text-muted/80 bg-white/[0.03] px-3 py-2 rounded-xl border border-white/[0.05]">
                        <p className="font-medium text-white/80">9:16 Vertical video</p>
                        <p>MP4, MOV or WebM</p>
                        <p>Up to 90 seconds · Max 1 GB</p>
                      </div>

                      <button
                        type="button"
                        className="mt-4 min-h-[44px] px-4 py-2 rounded-xl bg-white/[0.08] group-hover:bg-brand-mint group-hover:text-bg-base text-xs font-semibold text-white transition-all pointer-events-none"
                      >
                        Choose file
                      </button>
                    </div>
                  ) : (
                    /* ── Active 9:16 Video Preview ── */
                    <div className="relative aspect-[9/16] w-full max-w-[280px] mx-auto rounded-2xl bg-black overflow-hidden border border-white/[0.12] shadow-2xl group">
                      <video
                        ref={videoRef}
                        src={previewUrl}
                        playsInline
                        loop
                        muted={isMuted}
                        onClick={togglePlayPause}
                        className="w-full h-full object-cover cursor-pointer"
                        aria-label="Reel video preview"
                      />

                      {/* Play/Pause Overlay Indicator */}
                      <button
                        type="button"
                        onClick={togglePlayPause}
                        className={`absolute inset-0 flex items-center justify-center transition-opacity cursor-pointer ${
                          isPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'
                        }`}
                        aria-label={isPlaying ? 'Pause video' : 'Play video'}
                      >
                        <div className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-xl">
                          {isPlaying ? (
                            <Pause className="w-5 h-5 fill-current" />
                          ) : (
                            <Play className="w-5 h-5 fill-current ml-0.5" />
                          )}
                        </div>
                      </button>

                      {/* Sound Toggle */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleMute();
                        }}
                        className="min-h-[44px] min-w-[44px] absolute bottom-3 right-3 p-2 rounded-full bg-black/60 hover:bg-black/85 text-white backdrop-blur-md border border-white/10 transition-colors z-10 flex items-center justify-center"
                        aria-label={isMuted ? 'Unmute video' : 'Mute video'}
                      >
                        {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-brand-mint" />}
                      </button>

                      {/* Top Badges */}
                      <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none z-10">
                        <span className="px-2 py-0.5 rounded-full bg-black/65 backdrop-blur-md text-[10px] font-mono font-medium text-white/90 border border-white/10">
                          9:16 Preview
                        </span>
                      </div>

                      {/* Replace / Remove Action */}
                      <div className="absolute bottom-3 left-3 z-10">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveVideo();
                          }}
                          className="min-h-[44px] px-2.5 py-1.5 rounded-xl bg-black/60 hover:bg-rose-500/20 text-white/80 hover:text-rose-400 backdrop-blur-md border border-white/10 text-[11px] font-medium transition-colors flex items-center gap-1.5"
                          title="Change video"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Change</span>
                        </button>
                      </div>
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
                    onChange={handleFileChange}
                    className="hidden"
                    id="reel-studio-file-input"
                  />
                </div>

                {/* ── Right Column: Reel Details Workspace ── */}
                <div className="space-y-4">
                  {/* Creator Info */}
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <div className="w-10 h-10 rounded-full bg-brand-mint/15 border border-brand-mint/30 flex items-center justify-center text-xs font-bold text-brand-mint overflow-hidden shrink-0">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={user?.name || 'Creator'} className="w-full h-full object-cover" />
                      ) : (
                        userInitials
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">{user?.name || 'You'}</p>
                      <p className="text-[11px] text-text-muted">Posting a Reel to Community</p>
                    </div>
                  </div>

                  {/* Caption Input */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label htmlFor="reel-caption" className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                        Caption & Context
                      </label>
                      <span className="text-[11px] font-mono text-text-muted">
                        {caption.length} / 2200
                      </span>
                    </div>

                    <textarea
                      id="reel-caption"
                      rows={5}
                      maxLength={2200}
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder="Write an engaging caption for your Reel... Share what problem this solves, architectural details, or engineering insights."
                      className="w-full px-3.5 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] focus:border-brand-mint/60 focus:bg-white/[0.05] focus:outline-none text-xs text-white placeholder:text-text-muted/60 transition-colors resize-none leading-relaxed"
                    />
                  </div>

                  {/* Quick Topic / Hashtag Pills */}
                  <div className="space-y-2">
                    <span className="text-[11px] text-text-muted flex items-center gap-1.5">
                      <Hash className="w-3.5 h-3.5 text-brand-mint" />
                      <span>Suggested engineering topics</span>
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {POPULAR_REEL_HASHTAGS.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => handleAddHashtag(tag)}
                          className="min-h-[32px] px-2.5 py-1 rounded-lg bg-white/[0.03] hover:bg-brand-mint/15 text-[11px] font-medium text-text-muted hover:text-brand-mint border border-white/[0.06] hover:border-brand-mint/30 transition-colors cursor-pointer"
                        >
                          #{tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Audience Selector */}
                  <div className="space-y-1.5 pt-1">
                    <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                      Audience
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {AUDIENCE_OPTIONS.map((opt) => {
                        const Icon = opt.icon;
                        const isSelected = audience === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setAudience(opt.id)}
                            className={`min-h-[44px] p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-center ${
                              isSelected
                                ? 'bg-brand-mint/15 border-brand-mint/40 text-brand-mint'
                                : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05] text-text-muted'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <Icon className="w-3.5 h-3.5 shrink-0" />
                              <span className="text-xs font-bold text-white">{opt.label}</span>
                            </div>
                            <span className="text-[10px] text-text-muted line-clamp-1">
                              {opt.description}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Limits and Specification Note */}
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] text-[11px] text-text-muted flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-brand-mint shrink-0 mt-0.5" />
                    <span>
                      Reels are featured in the dedicated 9:16 fullscreen viewer and discoverable across the Community feed.
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Studio Bottom Bar ── */}
          {status !== 'UPLOADING' && status !== 'ERROR' && (
            <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-t border-white/[0.06] bg-[#0E1726]/80 backdrop-blur-sm shrink-0">
              <button
                type="button"
                onClick={handleAttemptClose}
                className="min-h-[44px] px-4 py-2 rounded-xl hover:bg-white/[0.06] text-xs font-semibold text-text-muted hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  id="reel-studio-publish-btn"
                  onClick={handlePublishReel}
                  disabled={!selectedFile || isPublishingRef.current || createPostMutation.isPending}
                  className="min-h-[44px] px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-mint to-[#D4E37A] hover:opacity-95 text-bg-base text-xs font-bold tracking-wide shadow-lg shadow-brand-mint/15 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Publish Reel</span>
                </button>
              </div>
            </div>
          )}

          {/* ── Discard Unsaved Changes Dialog ── */}
          <AnimatePresence>
            {showDiscardDialog && (
              <div
                className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="discard-reel-title"
              >
                <motion.div
                  initial={{ scale: 0.92, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.92, opacity: 0 }}
                  className="w-full max-w-sm bg-[#0E1726] border border-white/[0.1] rounded-2xl p-5 shadow-2xl text-center space-y-4 text-white"
                >
                  <h3 id="discard-reel-title" className="text-sm font-bold text-white">
                    Discard Reel changes?
                  </h3>
                  <p className="text-xs text-text-muted leading-relaxed">
                    Your video and caption haven't been published yet. If you discard, all unsaved progress will be lost.
                  </p>

                  <div className="space-y-2 pt-2">
                    <button
                      type="button"
                      id="discard-reel-confirm-btn"
                      onClick={handleConfirmDiscard}
                      className="w-full min-h-[44px] py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Discard Reel
                    </button>
                    <button
                      type="button"
                      id="discard-reel-cancel-btn"
                      onClick={() => setShowDiscardDialog(false)}
                      className="w-full min-h-[44px] py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Keep editing
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
