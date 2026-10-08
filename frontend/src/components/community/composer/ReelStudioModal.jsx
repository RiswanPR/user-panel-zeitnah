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
  Scissors,
  Image,
  Info,
  Music2,
  Type,
  Smile,
  Subtitles,
  Layers,
} from 'lucide-react';
import { AuthContext } from '../../../context/AuthContext';
import { useActiveProfile } from '../../../context/ActiveProfileContext';
import { getUploadUrl } from '../../../utils/courseUi';
import { useCreatePost } from '../../../hooks/useCommunity';
import { communityApi } from '../../../services/communityApi';
import BusinessLogo from '../../business/BusinessLogo';
import toast from 'react-hot-toast';

import ReelTimeline from './ReelTimeline';
import ReelCoverSelector from './ReelCoverSelector';
import ReelAudioPicker from './ReelAudioPicker';
import PostAudienceSelector from './PostAudienceSelector';
import ReelOverlayStage from './ReelOverlayStage';
import ReelTextEditor from './ReelTextEditor';
import ReelStickerPicker from './ReelStickerPicker';
import ReelCaptionEditor from './ReelCaptionEditor';
import ReelLayerPanel from './ReelLayerPanel';

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

const REEL_DRAFT_KEY = 'zeitnah_reel_editor_draft_v1';

/**
 * ReelStudioModal — Creator-grade Reel Creation Studio for Zeitnah Community (Phase 3A):
 * - Portrait 9:16 video stage with accurate preview, volume toggle, and poster integration
 * - Video metadata extraction (duration, resolution, file size, MIME type)
 * - Authoritative pre-upload validation (<=90s, <=1GB, MP4/MOV/WebM)
 * - Precision timeline scrubber with non-destructive Trim Start / End controls
 * - Cover & Poster Studio (video frame extraction via Canvas + optional custom cover upload)
 * - Caption editor (2,200 max) with character counter, popular hashtags, and audience selector
 * - Processing-aware state machine ('SELECT' | 'READY' | 'UPLOADING' | 'UPLOADED' | 'VALIDATING' | 'READY_TO_PUBLISH' | 'PUBLISHING' | 'PUBLISHED' | 'ERROR')
 * - Real upload progress with AbortController cancellation and S3 cleanup
 * - Duplicate submission prevention with idempotencyKeyRef
 * - Full memory safety (URL.revokeObjectURL on replace/unmount)
 */
export default function ReelStudioModal({ isOpen, onClose, onSuccess, publishingContext: propPublishingContext }) {
  const { user } = useContext(AuthContext);
  const activeProfile = useActiveProfile?.() || {};
  const shouldReduceMotion = useReducedMotion();

  // Capture publishing identity when Reel Studio session begins to prevent in-flight profile mutation
  const [capturedPublishingContext, setCapturedPublishingContext] = useState(null);

  useEffect(() => {
    if (isOpen) {
      if (propPublishingContext) {
        setCapturedPublishingContext(propPublishingContext);
      } else {
        const isBiz = activeProfile.activeProfileType === 'business' && Boolean(activeProfile.activeBusinessId);
        setCapturedPublishingContext(
          isBiz
            ? {
                profileType: 'business',
                organizationId: activeProfile.activeBusinessId,
                organization: activeProfile.business,
              }
            : {
                profileType: 'personal',
                organizationId: null,
                organization: null,
              }
        );
      }
    }
  }, [isOpen, propPublishingContext, activeProfile.activeProfileType, activeProfile.activeBusinessId, activeProfile.business]);

  const effectivePublishingContext = capturedPublishingContext || propPublishingContext || {
    profileType: activeProfile.activeProfileType || 'personal',
    organizationId: activeProfile.activeProfileType === 'business' ? activeProfile.activeBusinessId : null,
    organization: activeProfile.activeProfileType === 'business' ? activeProfile.business : null,
  };

  const isBusinessMode =
    effectivePublishingContext?.profileType === 'business' &&
    Boolean(effectivePublishingContext?.organizationId);
  const currentBusiness = effectivePublishingContext?.organization || activeProfile.business;

  const reelDraftKey =
    isBusinessMode && effectivePublishingContext?.organizationId
      ? `${REEL_DRAFT_KEY}_business_${effectivePublishingContext.organizationId}`
      : `${REEL_DRAFT_KEY}_personal`;

  // Processing-Aware State Machine:
  // 'SELECT' | 'READY' | 'UPLOADING' | 'UPLOADED' | 'VALIDATING' | 'READY_TO_PUBLISH' | 'PUBLISHING' | 'PUBLISHED' | 'ERROR'
  const [status, setStatus] = useState('SELECT');

  // Video State
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoDimensions, setVideoDimensions] = useState({ width: 0, height: 0 });
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Trim State (non-destructive)
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);

  // Cover / Poster State
  const [selectedCover, setSelectedCover] = useState(null); // { file, previewUrl, source, timestamp }
  const [isCoverSelectorOpen, setIsCoverSelectorOpen] = useState(false);

  // Audio & Music State (Phase 3C)
  const [audioMode, setAudioMode] = useState('ORIGINAL_ONLY');
  const [selectedMusic, setSelectedMusic] = useState(null);
  const [musicStart, setMusicStart] = useState(0);
  const [musicEnd, setMusicEnd] = useState(30);
  const [originalVolume, setOriginalVolume] = useState(1.0);
  const [musicVolume, setMusicVolume] = useState(1.0);
  const [isAudioPickerOpen, setIsAudioPickerOpen] = useState(false);

  // Editor Layers State (Phase 3D)
  const [editorLayers, setEditorLayers] = useState([]);
  const [activeLayerId, setActiveLayerId] = useState(null);
  const [isTextEditorOpen, setIsTextEditorOpen] = useState(false);
  const [editingTextLayer, setEditingTextLayer] = useState(null);
  const [isStickerPickerOpen, setIsStickerPickerOpen] = useState(false);
  const [isCaptionEditorOpen, setIsCaptionEditorOpen] = useState(false);
  const [editingCaptionLayer, setEditingCaptionLayer] = useState(null);
  const [isLayerPanelOpen, setIsLayerPanelOpen] = useState(false);

  // Details State
  const [caption, setCaption] = useState('');
  const [tags, setTags] = useState([]);
  const [audience, setAudience] = useState('PUBLIC');
  const [tagInput, setTagInput] = useState('');

  // Upload, Processing & Publishing State
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState('');
  const [uploadedMediaData, setUploadedMediaData] = useState(null);
  const [processingMediaId, setProcessingMediaId] = useState(null);
  const [isProcessingRetryable, setIsProcessingRetryable] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);

  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const modalRef = useRef(null);
  const previousActiveElementRef = useRef(null);
  const abortControllerRef = useRef(null);
  const pollingTimerRef = useRef(null);
  const isPublishingRef = useRef(false);
  const idempotencyKeyRef = useRef(null);
  const musicAudioRef = useRef(null);

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
    if (selectedCover?.previewUrl && selectedCover.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(selectedCover.previewUrl);
    }
    if (videoRef.current) {
      try {
        videoRef.current.pause();
        videoRef.current.src = '';
        videoRef.current.load();
      } catch {}
    }
    if (musicAudioRef.current) {
      try {
        musicAudioRef.current.pause();
        musicAudioRef.current.removeAttribute('src');
        musicAudioRef.current.load();
      } catch {}
      musicAudioRef.current = null;
    }
  }, [previewUrl, selectedCover]);

  // Reset state to initial
  const resetStudio = useCallback(
    (cleanS3 = false) => {
      cleanupResources();
      if (pollingTimerRef.current) {
        clearTimeout(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
      if (cleanS3 && uploadedMediaData?.url) {
        communityApi.deleteMedia(uploadedMediaData.url).catch(() => {});
      }
      setSelectedFile(null);
      setPreviewUrl(null);
      setVideoDuration(0);
      setVideoDimensions({ width: 0, height: 0 });
      setCurrentTime(0);
      setTrimStart(0);
      setTrimEnd(0);
      setSelectedCover(null);
      setAudioMode('ORIGINAL_ONLY');
      setSelectedMusic(null);
      setMusicStart(0);
      setMusicEnd(30);
      setOriginalVolume(1.0);
      setMusicVolume(1.0);
      setIsAudioPickerOpen(false);
      setIsPlaying(false);
      setCaption('');
      setTags([]);
      setAudience('PUBLIC');
      setTagInput('');
      setStatus('SELECT');
      setUploadProgress(0);
      setUploadStatusText('');
      setUploadedMediaData(null);
      setProcessingMediaId(null);
      setIsProcessingRetryable(false);
      setEditorLayers([]);
      setActiveLayerId(null);
      setIsTextEditorOpen(false);
      setEditingTextLayer(null);
      setIsStickerPickerOpen(false);
      setIsCaptionEditorOpen(false);
      setEditingCaptionLayer(null);
      setIsLayerPanelOpen(false);
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

  // Draft restore on open (Phase 3D Section 34 & 67)
  useEffect(() => {
    if (isOpen) {
      try {
        const saved =
          localStorage.getItem(reelDraftKey) ||
          (!isBusinessMode ? localStorage.getItem(REEL_DRAFT_KEY) : null);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object') {
            if (parsed.caption && !caption) setCaption(parsed.caption);
            if (Array.isArray(parsed.tags) && tags.length === 0) setTags(parsed.tags);
            if (parsed.audience) setAudience(parsed.audience);
            if (Array.isArray(parsed.editorLayers) && editorLayers.length === 0) {
              setEditorLayers(parsed.editorLayers);
            }
            if (parsed.audioMode) setAudioMode(parsed.audioMode);
            if (parsed.selectedMusic) setSelectedMusic(parsed.selectedMusic);
            if (typeof parsed.originalVolume === 'number') setOriginalVolume(parsed.originalVolume);
            if (typeof parsed.musicVolume === 'number') setMusicVolume(parsed.musicVolume);
            if (typeof parsed.trimStart === 'number') setTrimStart(parsed.trimStart);
            if (typeof parsed.trimEnd === 'number') setTrimEnd(parsed.trimEnd);
          }
        }
      } catch {}
    }
  }, [isOpen, reelDraftKey, isBusinessMode]);

  // Draft autosave effect
  useEffect(() => {
    if (!isOpen) return;
    try {
      if (caption.trim() || tags.length > 0 || editorLayers.length > 0 || selectedMusic) {
        localStorage.setItem(
          reelDraftKey,
          JSON.stringify({
            caption,
            tags,
            audience,
            editorLayers,
            audioMode,
            selectedMusic,
            originalVolume,
            musicVolume,
            trimStart,
            trimEnd,
          })
        );
      }
    } catch {}
  }, [isOpen, caption, tags, audience, editorLayers, audioMode, selectedMusic, originalVolume, musicVolume, trimStart, trimEnd]);

  // Focus trap & body scroll lock
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
      if (pollingTimerRef.current) {
        clearTimeout(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [cleanupResources]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen || isCoverSelectorOpen) return;
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
  const hasUnsavedChanges = Boolean(
    selectedFile ||
    caption.trim() ||
    tags.length > 0 ||
    editorLayers.length > 0 ||
    selectedMusic ||
    trimStart > 0 ||
    trimEnd > 0
  );

  const handleAttemptClose = () => {
    if (status === 'UPLOADING' || status === 'VALIDATING' || status === 'PUBLISHING') {
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
    try {
      localStorage.removeItem(reelDraftKey);
      if (!isBusinessMode) localStorage.removeItem(REEL_DRAFT_KEY);
    } catch {}
    setShowDiscardDialog(false);
    resetStudio(true);
    onClose();
  };

  // Phase 3D: Layer Management Handlers
  const handleOpenAddText = () => {
    if (editorLayers.length >= 10) {
      toast.error('Maximum 10 layers allowed per Reel.');
      return;
    }
    setEditingTextLayer(null);
    setIsTextEditorOpen(true);
  };

  const handleSaveTextLayer = (layerData) => {
    setEditorLayers((prev) => {
      const exists = prev.some((l) => l.id === layerData.id);
      if (exists) {
        return prev.map((l) => (l.id === layerData.id ? { ...l, ...layerData } : l));
      }
      if (prev.length >= 10) {
        toast.error('Maximum 10 layers allowed per Reel.');
        return prev;
      }
      return [...prev, layerData];
    });
    setActiveLayerId(layerData.id);
    setIsTextEditorOpen(false);
    setEditingTextLayer(null);
  };

  const handleOpenStickerPicker = () => {
    if (editorLayers.length >= 10) {
      toast.error('Maximum 10 layers allowed per Reel.');
      return;
    }
    setIsStickerPickerOpen(true);
  };

  const handleSelectSticker = (stickerLayer) => {
    setEditorLayers((prev) => {
      if (prev.length >= 10) {
        toast.error('Maximum 10 layers allowed per Reel.');
        return prev;
      }
      return [...prev, stickerLayer];
    });
    setActiveLayerId(stickerLayer.id);
    setIsStickerPickerOpen(false);
  };

  const handleOpenAddCaption = () => {
    if (editorLayers.length >= 10) {
      toast.error('Maximum 10 layers allowed per Reel.');
      return;
    }
    setEditingCaptionLayer(null);
    setIsCaptionEditorOpen(true);
  };

  const handleSaveCaptionLayer = (layerData) => {
    setEditorLayers((prev) => {
      const exists = prev.some((l) => l.id === layerData.id);
      if (exists) {
        return prev.map((l) => (l.id === layerData.id ? { ...l, ...layerData } : l));
      }
      if (prev.length >= 10) {
        toast.error('Maximum 10 layers allowed per Reel.');
        return prev;
      }
      return [...prev, layerData];
    });
    setActiveLayerId(layerData.id);
    setIsCaptionEditorOpen(false);
    setEditingCaptionLayer(null);
  };

  const handleUpdateLayer = (layerId, updates) => {
    setEditorLayers((prev) =>
      prev.map((l) => (l.id === layerId ? { ...l, ...updates } : l))
    );
  };

  const handleDeleteLayer = (layerId) => {
    setEditorLayers((prev) => prev.filter((l) => l.id !== layerId));
    if (activeLayerId === layerId) {
      setActiveLayerId(null);
    }
  };

  const handleEditLayer = (layer) => {
    if (layer.type === 'TEXT') {
      setEditingTextLayer(layer);
      setIsTextEditorOpen(true);
    } else if (layer.type === 'CAPTION') {
      setEditingCaptionLayer(layer);
      setIsCaptionEditorOpen(true);
    }
  };

  // Inspect video duration and dimensions via browser DOM
  const checkVideoMetadata = (file) => {
    return new Promise((resolve) => {
      try {
        const tempVideo = document.createElement('video');
        tempVideo.preload = 'metadata';
        const objUrl = URL.createObjectURL(file);
        tempVideo.onloadedmetadata = () => {
          URL.revokeObjectURL(objUrl);
          resolve({
            duration: tempVideo.duration,
            width: tempVideo.videoWidth || 0,
            height: tempVideo.videoHeight || 0,
          });
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

    // Video duration limit: 90 seconds (client-side pre-validation)
    const meta = await checkVideoMetadata(file);
    if (meta?.duration && meta.duration > 90) {
      toast.error('Reel must be 90 seconds or shorter.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Revoke previous URL if any
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    const duration = meta?.duration || 0;
    const newUrl = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewUrl(newUrl);
    setVideoDuration(duration);
    setTrimStart(0);
    setTrimEnd(duration);
    setVideoDimensions({ width: meta?.width || 0, height: meta?.height || 0 });
    setStatus('READY');
    setIsPlaying(false);
    setCurrentTime(0);
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
    setVideoDuration(0);
    setTrimStart(0);
    setTrimEnd(0);
    setSelectedCover(null);
    setStatus('SELECT');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Synchronize soundtrack playback with Reel preview (Section 16)
  useEffect(() => {
    if (!selectedMusic?.audioUrl || audioMode === 'ORIGINAL_ONLY') {
      if (musicAudioRef.current) {
        try {
          musicAudioRef.current.pause();
        } catch {}
      }
      return;
    }

    if (!musicAudioRef.current) {
      const audio = new Audio();
      audio.preload = 'metadata';
      musicAudioRef.current = audio;
    }

    const musicAudio = musicAudioRef.current;
    if (musicAudio.src !== selectedMusic.audioUrl) {
      musicAudio.src = selectedMusic.audioUrl;
    }

    musicAudio.volume = audioMode === 'ORIGINAL_ONLY' ? 0 : Math.max(0, Math.min(musicVolume, 1));
    if (videoRef.current) {
      videoRef.current.volume = audioMode === 'MUSIC_ONLY' ? 0 : Math.max(0, Math.min(originalVolume, 1));
    }

    if (isPlaying) {
      const videoCurrent = videoRef.current?.currentTime || trimStart;
      const targetMusicTime = Math.max(0, musicStart + (videoCurrent - trimStart));
      if (Math.abs(musicAudio.currentTime - targetMusicTime) > 0.3) {
        musicAudio.currentTime = targetMusicTime;
      }
      musicAudio.play().catch(() => {});
    } else {
      musicAudio.pause();
    }
  }, [isPlaying, selectedMusic, audioMode, musicStart, musicEnd, musicVolume, originalVolume, trimStart]);

  // Playback control with trim respect
  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      // If outside trim bounds, seek to trimStart before playing
      if (video.currentTime < trimStart || video.currentTime >= trimEnd) {
        video.currentTime = trimStart;
        setCurrentTime(trimStart);
      }
      video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;

    const time = video.currentTime;
    setCurrentTime(time);

    // If reached trimEnd, pause automatically
    if (trimEnd > 0 && time >= trimEnd) {
      video.pause();
      video.currentTime = trimStart;
      setCurrentTime(trimStart);
      setIsPlaying(false);
      if (musicAudioRef.current) {
        musicAudioRef.current.pause();
        musicAudioRef.current.currentTime = musicStart;
      }
    }
  };

  const handleSeek = (time) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = time;
    setCurrentTime(time);
    if (musicAudioRef.current && selectedMusic) {
      const targetMusicTime = Math.max(0, musicStart + (time - trimStart));
      musicAudioRef.current.currentTime = targetMusicTime;
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted((prev) => !prev);
  };

  // Tag management
  const handleAddHashtag = (tag) => {
    const clean = tag.replace(/^#/, '').trim().toLowerCase();
    if (!clean) return;
    if (!tags.includes(clean)) {
      setTags((prev) => [...prev, clean]);
    }
    setTagInput('');
  };

  const handleRemoveHashtag = (tagToRemove) => {
    setTags((prev) => prev.filter((t) => t !== tagToRemove));
  };

  const handleCancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (pollingTimerRef.current) {
      clearTimeout(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
    setStatus('READY');
    setUploadProgress(0);
    setUploadStatusText('');
    isPublishingRef.current = false;
    toast('Upload cancelled', { icon: 'ℹ️' });
  };

  const pollStatusUntilReady = useCallback((mediaId, signal) => {
    return new Promise((resolve, reject) => {
      let isAborted = false;
      const onAbort = () => {
        isAborted = true;
        if (pollingTimerRef.current) {
          clearTimeout(pollingTimerRef.current);
          pollingTimerRef.current = null;
        }
        reject(new DOMException('Aborted', 'AbortError'));
      };
      if (signal) {
        signal.addEventListener('abort', onAbort, { once: true });
      }

      const check = async () => {
        if (isAborted) return;
        try {
          const res = await communityApi.getMediaProcessingStatus(mediaId, signal);
          const currentStatus = res?.status;

          if (currentStatus === 'READY') {
            resolve(res);
            return;
          }

          if (currentStatus === 'FAILED') {
            setIsProcessingRetryable(res?.isRetryable ?? true);
            reject(new Error(res?.error || 'Video processing failed.'));
            return;
          }

          if (currentStatus === 'PROCESSING') {
            setUploadStatusText('Transcoding Reel & optimizing playback (H.264 / faststart)...');
          } else if (currentStatus === 'QUEUED') {
            setUploadStatusText('Waiting in video optimization queue...');
          }

          pollingTimerRef.current = setTimeout(check, 2000);
        } catch (err) {
          if (isAborted) return;
          if (err?.name === 'AbortError' || err?.name === 'CanceledError') {
            reject(err);
            return;
          }
          // On transient network failure during status poll, retry
          pollingTimerRef.current = setTimeout(check, 3000);
        }
      };

      check();
    });
  }, []);

  const handleRetryProcessing = async () => {
    if (!processingMediaId) return;
    try {
      setStatus('PROCESSING');
      setUploadError(null);
      setUploadStatusText('Re-queuing video processing with audio configuration...');
      abortControllerRef.current = new AbortController();

      const audioConfigPayload = {
        audioMode,
        musicId: selectedMusic?._id || undefined,
        musicTitle: selectedMusic?.title || undefined,
        musicArtist: selectedMusic?.artist || undefined,
        musicCoverUrl: selectedMusic?.coverUrl || undefined,
        sourceStart: selectedMusic ? musicStart : undefined,
        sourceEnd: selectedMusic ? musicEnd : undefined,
        originalVolume: audioMode === 'MUSIC_ONLY' ? 0 : originalVolume,
        musicVolume: audioMode === 'ORIGINAL_ONLY' ? 0 : musicVolume,
        originalAudioName: user?.username ? `Original audio · @${user.username}` : 'Original audio',
      };

      const editorConfigPayload =
        editorLayers.length > 0
          ? {
              version: 1,
              layers: editorLayers.map((l) => ({
                id: l.id,
                type: l.type,
                start: Number(l.start),
                end: Number(l.end),
                x: Number(l.x),
                y: Number(l.y),
                scale: l.scale !== undefined ? Number(l.scale) : 1.0,
                rotation: l.rotation !== undefined ? Number(l.rotation) : 0,
                opacity: l.opacity !== undefined ? Number(l.opacity) : 1.0,
                content: l.content || undefined,
                fontFamily: l.fontFamily || undefined,
                fontSize: l.fontSize !== undefined ? Number(l.fontSize) : undefined,
                fontWeight: l.fontWeight || undefined,
                textAlign: l.textAlign || undefined,
                color: l.color || undefined,
                backgroundColor: l.backgroundColor || undefined,
                backgroundOpacity:
                  l.backgroundOpacity !== undefined ? Number(l.backgroundOpacity) : undefined,
                shadow: l.shadow !== undefined ? Boolean(l.shadow) : undefined,
                stickerId: l.stickerId || undefined,
                style: l.style || undefined,
              })),
            }
          : undefined;

      // communityApi.retryMediaProcessing(processingMediaId)
      await communityApi.retryMediaProcessing(processingMediaId, {
        audioConfig: audioConfigPayload,
        editorConfig: editorConfigPayload,
      });

      const processedResult = await pollStatusUntilReady(
        processingMediaId,
        abortControllerRef.current?.signal
      );

      let mediaItem = uploadedMediaData || {};
      if (processedResult?.playbackUrl) {
        mediaItem.url = processedResult.playbackUrl;
        mediaItem.processedUrl = processedResult.playbackUrl;
      }
      if (processedResult?.posterUrl) {
        mediaItem.posterUrl = processedResult.posterUrl;
        mediaItem.thumbnailUrl = processedResult.posterUrl;
      }
      if (processedResult?.duration) {
        mediaItem.duration = processedResult.duration;
      }
      setUploadedMediaData(mediaItem);

      setStatus('READY_TO_PUBLISH');
      setUploadStatusText('Submitting Reel to Community...');
      setUploadProgress(96);

      await createPostMutation.mutateAsync({
        content: caption.trim(),
        type: 'VIDEO',
        media: [
          {
            ...mediaItem,
            audioConfig: audioConfigPayload,
            editorConfig: editorConfigPayload,
          },
        ],
        tags,
        audience,
        idempotencyKey: idempotencyKeyRef.current,
      });

      setUploadProgress(100);
      setStatus('PUBLISHED');
      toast.success('Reel published to Community!');

      try {
        localStorage.removeItem(reelDraftKey);
        if (!isBusinessMode) localStorage.removeItem(REEL_DRAFT_KEY);
      } catch {}

      idempotencyKeyRef.current = null;
      resetStudio(false);
      onClose();
      if (onSuccess) onSuccess();
    } catch (retryErr) {
      if (retryErr?.name === 'CanceledError' || retryErr?.name === 'AbortError') {
        setStatus('READY');
        return;
      }
      const msg = retryErr?.message || 'Processing retry failed.';
      setUploadError(msg);
      setStatus('ERROR');
      toast.error(msg);
    }
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
    setUploadStatusText('Preparing Reel video upload...');

    try {
      let mediaItem = uploadedMediaData;

      // 1. Upload video file if not already uploaded
      if (!mediaItem && selectedFile) {
        const audioConfigPayload = {
          audioMode,
          musicId: selectedMusic?._id || undefined,
          musicTitle: selectedMusic?.title || undefined,
          musicArtist: selectedMusic?.artist || undefined,
          musicCoverUrl: selectedMusic?.coverUrl || undefined,
          sourceStart: selectedMusic ? musicStart : undefined,
          sourceEnd: selectedMusic ? musicEnd : undefined,
          originalVolume: audioMode === 'MUSIC_ONLY' ? 0 : originalVolume,
          musicVolume: audioMode === 'ORIGINAL_ONLY' ? 0 : musicVolume,
          originalAudioName: user?.username ? `Original audio · @${user.username}` : 'Original audio',
        };

        const editorConfigPayload =
          editorLayers.length > 0
            ? {
                version: 1,
                layers: editorLayers.map((l) => ({
                  id: l.id,
                  type: l.type,
                  start: Number(l.start),
                  end: Number(l.end),
                  x: Number(l.x),
                  y: Number(l.y),
                  scale: l.scale !== undefined ? Number(l.scale) : 1.0,
                  rotation: l.rotation !== undefined ? Number(l.rotation) : 0,
                  opacity: l.opacity !== undefined ? Number(l.opacity) : 1.0,
                  content: l.content || undefined,
                  fontFamily: l.fontFamily || undefined,
                  fontSize: l.fontSize !== undefined ? Number(l.fontSize) : undefined,
                  fontWeight: l.fontWeight || undefined,
                  textAlign: l.textAlign || undefined,
                  color: l.color || undefined,
                  backgroundColor: l.backgroundColor || undefined,
                  backgroundOpacity:
                    l.backgroundOpacity !== undefined ? Number(l.backgroundOpacity) : undefined,
                  shadow: l.shadow !== undefined ? Boolean(l.shadow) : undefined,
                  stickerId: l.stickerId || undefined,
                  style: l.style || undefined,
                })),
              }
            : undefined;

        const response = await communityApi.uploadMedia(
          selectedFile,
          (progressEvent) => {
            if (progressEvent.total) {
              const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadProgress(Math.min(percent, 85));
              const loadedMB = (progressEvent.loaded / (1024 * 1024)).toFixed(1);
              const totalMB = (progressEvent.total / (1024 * 1024)).toFixed(1);
              setUploadStatusText(`Uploading Reel video (${loadedMB} MB / ${totalMB} MB)...`);
            }
          },
          abortControllerRef.current?.signal,
          {
            trimStart,
            trimEnd,
            isReel: true,
            audioConfig: audioConfigPayload,
            editorConfig: editorConfigPayload,
          }
        );

        const mediaUrl = response?.url || response?.data?.url || (typeof response === 'string' ? response : '');
        const mediaSize = response?.size || response?.data?.size || selectedFile.size;
        const mediaMime = response?.mimeType || response?.data?.mimeType || selectedFile.type || 'video/mp4';
        const mediaId = response?.mediaId || response?.data?.mediaId;
        const jobStatus = response?.status || response?.data?.status;

        mediaItem = {
          url: mediaUrl,
          type: 'video',
          size: mediaSize,
          mimeType: mediaMime,
          thumbnailUrl: response?.thumbnailUrl || response?.data?.thumbnailUrl,
          mediaId,
        };
        setUploadedMediaData(mediaItem);
        if (mediaId) {
          setProcessingMediaId(mediaId);
        }

        // 2. Poll until READY if background job exists
        if (mediaId && jobStatus !== 'NOT_REQUIRED') {
          setStatus('PROCESSING');
          setUploadStatusText('Optimizing video and applying trim...');
          setUploadProgress(88);

          const processedResult = await pollStatusUntilReady(
            mediaId,
            abortControllerRef.current?.signal
          );

          if (processedResult?.playbackUrl) {
            mediaItem.url = processedResult.playbackUrl;
            mediaItem.processedUrl = processedResult.playbackUrl;
          }
          if (processedResult?.posterUrl) {
            mediaItem.posterUrl = processedResult.posterUrl;
            mediaItem.thumbnailUrl = processedResult.posterUrl;
          }
          if (processedResult?.duration) {
            mediaItem.duration = processedResult.duration;
          }
          setUploadedMediaData(mediaItem);
        }
      }

      setStatus('VALIDATING');
      setUploadStatusText('Validating video and cover parameters...');
      setUploadProgress(92);

      // 3. Upload custom cover frame if one was selected
      if (selectedCover?.file) {
        try {
          const coverRes = await communityApi.uploadMedia(
            selectedCover.file,
            undefined,
            abortControllerRef.current?.signal
          );
          const coverUrl = coverRes?.url || coverRes?.data?.url;
          if (coverUrl) {
            mediaItem.thumbnailUrl = coverUrl;
            mediaItem.posterUrl = coverUrl;
          }
        } catch {
          // If custom cover fails, continue with default video poster
        }
      }

      setStatus('READY_TO_PUBLISH');
      setUploadStatusText('Submitting Reel to Community...');
      setUploadProgress(96);

      // 4. Submit post with VIDEO type
      const audioConfigPayload = {
        audioMode,
        musicId: selectedMusic?._id || undefined,
        musicTitle: selectedMusic?.title || undefined,
        musicArtist: selectedMusic?.artist || undefined,
        musicCoverUrl: selectedMusic?.coverUrl || undefined,
        sourceStart: selectedMusic ? musicStart : undefined,
        sourceEnd: selectedMusic ? musicEnd : undefined,
        originalVolume: audioMode === 'MUSIC_ONLY' ? 0 : originalVolume,
        musicVolume: audioMode === 'ORIGINAL_ONLY' ? 0 : musicVolume,
        originalAudioName: user?.username ? `Original audio · @${user.username}` : 'Original audio',
      };

      const editorConfigPayload =
        editorLayers.length > 0
          ? {
              version: 1,
              layers: editorLayers.map((l) => ({
                id: l.id,
                type: l.type,
                start: Number(l.start),
                end: Number(l.end),
                x: Number(l.x),
                y: Number(l.y),
                scale: l.scale !== undefined ? Number(l.scale) : 1.0,
                rotation: l.rotation !== undefined ? Number(l.rotation) : 0,
                opacity: l.opacity !== undefined ? Number(l.opacity) : 1.0,
                content: l.content || undefined,
                fontFamily: l.fontFamily || undefined,
                fontSize: l.fontSize !== undefined ? Number(l.fontSize) : undefined,
                fontWeight: l.fontWeight || undefined,
                textAlign: l.textAlign || undefined,
                color: l.color || undefined,
                backgroundColor: l.backgroundColor || undefined,
                backgroundOpacity:
                  l.backgroundOpacity !== undefined ? Number(l.backgroundOpacity) : undefined,
                shadow: l.shadow !== undefined ? Boolean(l.shadow) : undefined,
                stickerId: l.stickerId || undefined,
                style: l.style || undefined,
              })),
            }
          : undefined;

      await createPostMutation.mutateAsync({
        content: caption.trim(),
        type: 'VIDEO',
        media: [
          {
            ...mediaItem,
            audioConfig: audioConfigPayload,
            editorConfig: editorConfigPayload,
          },
        ],
        tags,
        audience,
        idempotencyKey: idempotencyKeyRef.current,
        organizationId:
          isBusinessMode && effectivePublishingContext?.organizationId
            ? effectivePublishingContext.organizationId
            : undefined,
      });

      setUploadProgress(100);
      setStatus('PUBLISHED');
      toast.success('Reel published to Community!');

      try {
        localStorage.removeItem(reelDraftKey);
        if (!isBusinessMode) localStorage.removeItem(REEL_DRAFT_KEY);
      } catch {}

      idempotencyKeyRef.current = null;
      resetStudio(false);
      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED' || err?.name === 'AbortError') {
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
    if (!seconds && seconds !== 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <div
        id="reel-studio-modal"
        className="fixed inset-0 z-[90] flex items-center justify-center p-0 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md"
        role="dialog"
        aria-modal="true"
        aria-label="Create new reel"
        aria-labelledby="reel-studio-title"
      >
        <motion.div
          ref={modalRef}
          initial={shouldReduceMotion ? { opacity: 0 } : { scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.96, opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="relative w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-[1080px] bg-[#070B14] border-0 sm:border border-white/[0.1] rounded-none sm:rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.7)] flex flex-col overflow-hidden text-white"
        >
          {/* ── Studio Header Bar ── */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-white/[0.08] shrink-0 select-none bg-[#09111F]/90 backdrop-blur-md z-20">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleAttemptClose}
                className="p-1.5 -ml-1 rounded-xl text-text-muted hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                aria-label="Close reel studio"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2">
                <h2 id="reel-studio-title" className="text-sm sm:text-base font-bold font-heading text-white tracking-tight flex items-center gap-2">
                  <span>Create Reel</span>
                  <span className="px-2 py-0.5 rounded-full bg-brand-yellow/10 border border-brand-yellow/20 text-[10px] font-semibold text-brand-yellow uppercase tracking-wider">
                    Studio
                  </span>
                </h2>
                {videoDuration > 0 && (
                  <span className="text-xs text-text-muted font-mono hidden sm:inline-block">
                    · {formatDuration(videoDuration)}
                  </span>
                )}
              </div>
            </div>

            {/* Header Right Action */}
            <div className="flex items-center gap-2">
              {status === 'READY' && (
                <button
                  type="button"
                  onClick={handlePublishReel}
                  disabled={createPostMutation.isPending}
                  className="sm:hidden px-3.5 py-1.5 rounded-xl bg-brand-mint text-[#070B14] font-bold text-xs hover:opacity-90 disabled:opacity-40 transition-all cursor-pointer"
                >
                  Post
                </button>
              )}
            </div>
          </div>

          {/* ── Hidden File Input ── */}
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/quicktime,video/webm"
            onChange={handleFileChange}
            className="hidden"
            id="reel-video-file-input"
          />

          {/* ── MAIN WORKSPACE ── */}
          {status === 'SELECT' ? (
            /* STEP 1: Video File Dropzone */
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`flex-1 flex flex-col items-center justify-center p-8 sm:p-12 text-center min-h-[460px] overflow-hidden transition-all duration-300 ${
                isDraggingOver
                  ? 'bg-[#12314C]/45 border-2 border-dashed border-brand-mint/60 shadow-[0_0_32px_rgba(159,213,178,0.22)]'
                  : 'bg-transparent'
              }`}
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-brand-mint/10 border border-brand-mint/20 flex items-center justify-center text-brand-mint mb-5 shadow-[0_0_24px_rgba(159,213,178,0.15)]">
                <Film className="w-8 h-8 sm:w-10 sm:h-10" />
              </div>

              <h3 className="text-lg sm:text-xl font-bold font-heading text-white mb-2">
                Share a Reel with the Community
              </h3>
              <p className="text-xs sm:text-sm text-text-muted max-w-md mb-6 leading-relaxed">
                Upload vertical site walkthroughs, structural models, or engineering tutorials up to 90 seconds in MP4, MOV, or WebM format.
              </p>

              <button
                type="button"
                id="select-reel-video-btn"
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-brand-mint to-brand-yellow text-[#070B14] font-bold text-xs sm:text-sm hover:shadow-[0_0_24px_rgba(159,213,178,0.4)] transition-all cursor-pointer"
              >
                Select Video from Device
              </button>

              <div className="flex items-center gap-4 text-[11px] text-text-faint mt-8">
                <span>9:16 Portrait</span>
                <span>•</span>
                <span>Max 90 seconds</span>
                <span>•</span>
                <span>Up to 1 GB</span>
              </div>
            </div>
          ) : status === 'UPLOADING' || status === 'PROCESSING' || status === 'VALIDATING' || status === 'READY_TO_PUBLISH' || status === 'PUBLISHING' ? (
            /* UPLOADING & BACKGROUND PROCESSING OVERLAY */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[420px] bg-[#070B14]">
              <div className="max-w-md w-full p-8 rounded-3xl bg-[#09111F] border border-white/[0.08] text-center space-y-5">
                <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-2 border-brand-mint/20 border-t-brand-mint animate-spin" />
                  {status === 'PROCESSING' ? (
                    <Sparkles className="w-7 h-7 text-brand-mint animate-pulse" />
                  ) : (
                    <UploadCloud className="w-7 h-7 text-brand-mint" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {status === 'PROCESSING'
                      ? 'Optimizing Reel video…'
                      : status === 'READY_TO_PUBLISH' || status === 'PUBLISHING'
                      ? 'Publishing Reel…'
                      : 'Uploading video…'}
                  </h3>
                  <p className="text-xs text-text-muted mt-1">
                    {status === 'PROCESSING'
                      ? 'Trimming and optimizing video for high-speed playback.'
                      : 'Please keep this window open.'}
                  </p>
                </div>

                {/* Real progress bar */}
                <div className="space-y-1.5 text-left">
                  <div className="flex justify-between text-[11px] text-text-muted">
                    <span>{uploadStatusText}</span>
                    <span className="font-semibold text-white">
                      {status === 'PROCESSING' ? 'Processing' : `${uploadProgress}%`}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-white/[0.06] rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r from-brand-mint to-brand-yellow transition-all duration-300 rounded-full ${
                        status === 'PROCESSING' ? 'animate-pulse' : ''
                      }`}
                      style={{ width: status === 'PROCESSING' ? '100%' : `${uploadProgress}%` }}
                    />
                  </div>
                </div>

                {status !== 'READY_TO_PUBLISH' && status !== 'PUBLISHING' && (
                  <button
                    type="button"
                    data-testid="cancel-reel-upload-btn"
                    onClick={handleCancelUpload}
                    className="text-xs text-text-muted hover:text-white transition-colors cursor-pointer pt-2"
                  >
                    Cancel upload
                  </button>
                )}
              </div>
            </div>
          ) : status === 'ERROR' ? (
            /* ERROR & RECOVERY SCREEN */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[420px] bg-[#070B14]">
              <div className="max-w-md w-full p-6 rounded-3xl bg-[#0F1828] border border-rose-500/30 text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {uploadError?.toLowerCase().includes('process') || processingMediaId
                      ? 'Video processing failed'
                      : 'Reel Upload Failed'}
                  </h3>
                  <p className="text-xs text-text-muted mt-1 leading-relaxed">
                    {uploadError || "Zeitnah couldn't process this video."}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  {isProcessingRetryable && processingMediaId ? (
                    <button
                      type="button"
                      id="retry-processing-btn"
                      data-testid="retry-processing-btn"
                      onClick={handleRetryProcessing}
                      className="px-4 py-2 rounded-xl bg-brand-mint text-[#070B14] text-xs font-bold hover:opacity-90 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Retry processing</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handlePublishReel}
                      className="px-4 py-2 rounded-xl bg-brand-mint text-[#070B14] text-xs font-bold hover:opacity-90 transition-all cursor-pointer"
                    >
                      Try again
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleRemoveVideo}
                    className="px-4 py-2 rounded-xl bg-white/[0.06] text-white hover:bg-white/[0.1] text-xs font-semibold transition-all cursor-pointer"
                  >
                    Choose another video
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus('READY')}
                    className="px-4 py-2 rounded-xl bg-white/[0.03] text-text-muted hover:text-white text-xs font-medium transition-all cursor-pointer"
                  >
                    Keep editing
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* STUDIO READY WORKSPACE: 2-COLUMN (DESKTOP) & STACKED (MOBILE) */
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
              {/* LEFT COLUMN: 9:16 Video Preview Stage + Timeline + Trim */}
              <div className="flex-1 flex flex-col items-center justify-between p-4 sm:p-6 overflow-y-auto bg-black/40 space-y-4">
                {/* 9:16 Video Stage */}
                <div className="relative w-full max-w-[280px] sm:max-w-[320px] aspect-[9/16] rounded-3xl bg-black border border-white/[0.1] overflow-hidden shadow-2xl flex items-center justify-center group shrink-0">
                  <video
                    ref={videoRef}
                    src={previewUrl}
                    playsInline
                    muted={isMuted}
                    onTimeUpdate={handleTimeUpdate}
                    onClick={togglePlayPause}
                    className="w-full h-full object-cover cursor-pointer"
                  />

                  {/* Phase 3D: Interactive Reel Overlay Stage */}
                  <ReelOverlayStage
                    layers={editorLayers}
                    activeLayerId={activeLayerId}
                    currentTime={currentTime}
                    duration={trimEnd > trimStart ? trimEnd - trimStart : videoDuration}
                    onSelectLayer={setActiveLayerId}
                    onUpdateLayer={handleUpdateLayer}
                    onDeleteLayer={handleDeleteLayer}
                    onEditLayer={handleEditLayer}
                  />

                  {/* Play / Pause Central Overlay Button */}
                  {!isPlaying && (
                    <button
                      type="button"
                      onClick={togglePlayPause}
                      className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:scale-105 transition-all cursor-pointer shadow-lg z-20"
                      aria-label="Play video"
                    >
                      <Play className="w-6 h-6 ml-0.5 fill-current" />
                    </button>
                  )}

                  {/* Stage Quick Controls Overlay */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 z-20">
                    <button
                      type="button"
                      onClick={toggleMute}
                      className="p-2 rounded-full bg-black/60 backdrop-blur-md text-white hover:bg-black/80 transition-colors cursor-pointer"
                      aria-label={isMuted ? 'Unmute video' : 'Mute video'}
                    >
                      {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>

                    <button
                      type="button"
                      onClick={handleRemoveVideo}
                      className="p-2 rounded-full bg-black/60 backdrop-blur-md text-white hover:bg-rose-500/80 transition-colors cursor-pointer"
                      aria-label="Remove video"
                      title="Remove video"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Metadata Tag on Stage */}
                  <div className="absolute bottom-3 left-3 px-2 py-0.5 rounded-full bg-black/65 backdrop-blur-md text-[10px] font-mono text-white/90 border border-white/10 select-none z-20">
                    {videoDimensions.width > 0 && `${videoDimensions.width}×${videoDimensions.height} · `}
                    {formatFileSize(selectedFile?.size)}
                  </div>
                </div>

                {/* Phase 3D: Creator Tools Bar (Text, Sticker, Caption, Layers) */}
                <div className="w-full max-w-[480px] p-2 rounded-2xl bg-[#09111F] border border-white/[0.08] flex items-center justify-between gap-1.5 shadow-md shrink-0">
                  <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
                    <button
                      type="button"
                      id="reel-add-text-btn"
                      onClick={handleOpenAddText}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-semibold text-white hover:text-brand-mint transition-colors cursor-pointer shrink-0"
                    >
                      <Type className="w-3.5 h-3.5 text-brand-mint" />
                      <span>Text</span>
                    </button>

                    <button
                      type="button"
                      id="reel-add-sticker-btn"
                      onClick={handleOpenStickerPicker}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-semibold text-white hover:text-brand-yellow transition-colors cursor-pointer shrink-0"
                    >
                      <Smile className="w-3.5 h-3.5 text-brand-yellow" />
                      <span>Sticker</span>
                    </button>

                    <button
                      type="button"
                      id="reel-add-caption-btn"
                      onClick={handleOpenAddCaption}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-semibold text-white hover:text-sky-400 transition-colors cursor-pointer shrink-0"
                    >
                      <Subtitles className="w-3.5 h-3.5 text-sky-400" />
                      <span>Caption</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    id="reel-manage-layers-btn"
                    onClick={() => setIsLayerPanelOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-semibold text-white hover:text-indigo-400 transition-colors cursor-pointer shrink-0"
                  >
                    <Layers className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Layers</span>
                    {editorLayers.length > 0 && (
                      <span className="ml-1 px-1.5 py-0.2 rounded-full bg-brand-mint text-[#070B14] font-bold text-[10px]">
                        {editorLayers.length}
                      </span>
                    )}
                  </button>
                </div>

                {/* Timeline & Scrubber & Trim Section */}
                <div className="w-full max-w-[480px] p-3.5 rounded-2xl bg-[#09111F] border border-white/[0.08] space-y-3 shrink-0">
                  <ReelTimeline
                    duration={videoDuration}
                    currentTime={currentTime}
                    trimStart={trimStart}
                    trimEnd={trimEnd}
                    onSeek={handleSeek}
                    onTrimStartChange={setTrimStart}
                    onTrimEndChange={setTrimEnd}
                    selectedMusic={selectedMusic}
                    audioMode={audioMode}
                    musicStart={musicStart}
                    musicEnd={musicEnd}
                    layers={editorLayers}
                    activeLayerId={activeLayerId}
                    onSelectLayer={setActiveLayerId}
                  />

                  {/* Audio & Music Selection Trigger (Phase 3C) */}
                  <div className="flex items-center justify-between pt-1 border-t border-white/[0.06]">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-black/60 border border-white/[0.1] overflow-hidden flex items-center justify-center shrink-0 text-brand-mint">
                        <Music2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate">
                          {selectedMusic && audioMode !== 'ORIGINAL_ONLY'
                            ? selectedMusic.title
                            : 'Original Audio'}
                        </p>
                        <p className="text-[10px] text-text-muted truncate">
                          {audioMode === 'ORIGINAL_ONLY'
                            ? (user?.username ? `@${user.username}` : 'Default audio')
                            : audioMode === 'MUSIC_ONLY'
                            ? `Soundtrack · ${selectedMusic?.artist || ''}`
                            : `Mixed · ${selectedMusic?.artist || ''}`}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsAudioPickerOpen(true)}
                      className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-semibold text-brand-mint transition-colors cursor-pointer shrink-0"
                    >
                      {selectedMusic ? 'Edit Audio' : 'Add Music'}
                    </button>
                  </div>

                  {/* Cover Selection Trigger */}
                  <div className="flex items-center justify-between pt-1 border-t border-white/[0.06]">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-black/60 border border-white/[0.1] overflow-hidden flex items-center justify-center shrink-0">
                        {selectedCover?.previewUrl ? (
                          <img
                            src={selectedCover.previewUrl}
                            alt="Cover"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Image className="w-4 h-4 text-brand-mint" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-white">Reel Cover</p>
                        <p className="text-[10px] text-text-muted">
                          {selectedCover ? 'Custom frame selected' : 'Auto poster at 1.0s'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsCoverSelectorOpen(true)}
                      className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-semibold text-brand-mint transition-colors cursor-pointer"
                    >
                      Choose Cover
                    </button>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Reel Details, Caption, Hashtags, Audience */}
              <div className="w-full lg:w-[380px] border-t lg:border-t-0 lg:border-l border-white/[0.08] bg-[#09111F]/50 p-4 sm:p-6 space-y-5 overflow-y-auto">
                {/* Author Info */}
                <div className="flex items-center justify-between gap-3">
                  {isBusinessMode ? (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#0E1726] border border-white/[0.1] overflow-hidden flex items-center justify-center shrink-0">
                        <BusinessLogo
                          logo={currentBusiness?.logo}
                          name={currentBusiness?.name || 'Company'}
                          size="md"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs sm:text-sm font-bold text-white">
                            {currentBusiness?.name || 'Company'}
                          </p>
                          <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-brand-yellow/15 text-brand-yellow border border-brand-yellow/30">
                            Company Reel
                          </span>
                        </div>
                        <p className="text-[11px] text-text-muted">
                          {currentBusiness?.slug ? `@${currentBusiness.slug.replace(/^@/, '')}` : 'Business Profile'} · <span className="text-brand-yellow font-medium">Reel</span>
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#0E1726] border border-white/[0.1] overflow-hidden flex items-center justify-center text-xs font-bold text-brand-mint shrink-0">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt={user?.name || 'You'} className="w-full h-full object-cover" />
                        ) : (
                          userInitials
                        )}
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-bold text-white">{user?.name || 'You'}</p>
                        <p className="text-[11px] text-text-muted">
                          {user?.username ? `@${user.username}` : 'Verified Member'} · <span className="text-brand-yellow font-medium">Reel</span>
                        </p>
                      </div>
                    </div>
                  )}

                  <PostAudienceSelector audience={audience} onChange={setAudience} />
                </div>

                {/* Caption Textarea */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-text-muted">
                    <label htmlFor="reel-caption-input" className="font-semibold text-white">
                      Caption
                    </label>
                    <span className="font-mono text-[11px]">
                      {2200 - caption.length} left
                    </span>
                  </div>
                  <textarea
                    id="reel-caption-input"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Describe your Reel... Highlight key engineering details, site progress, or BIM lessons"
                    rows={4}
                    maxLength={2200}
                    className="w-full bg-white/[0.02] border border-white/[0.08] focus:border-brand-yellow/50 rounded-2xl p-3.5 text-xs sm:text-sm text-white placeholder-text-faint focus:outline-none resize-none leading-relaxed transition-colors"
                  />
                </div>

                {/* Hashtags Section */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-text-muted">
                    <span className="font-semibold text-white">Hashtags</span>
                    <span className="text-[10px]">{tags.length} added</span>
                  </div>

                  {/* Input */}
                  <div className="relative">
                    <Hash className="w-3.5 h-3.5 text-brand-yellow absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddHashtag(tagInput);
                        }
                      }}
                      placeholder="Add hashtag and press Enter..."
                      className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-brand-yellow/50 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-text-faint focus:outline-none transition-colors"
                    />
                  </div>

                  {/* Selected Tags */}
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-yellow/10 border border-brand-yellow/20 text-brand-yellow text-[11px] font-medium"
                        >
                          #{tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveHashtag(tag)}
                            className="p-0.5 hover:text-white cursor-pointer"
                            aria-label={`Remove tag ${tag}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Popular Suggestions */}
                  <div className="space-y-1.5 pt-1">
                    <p className="text-[10px] text-text-faint font-semibold uppercase tracking-wider">
                      Popular Reel tags
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {POPULAR_REEL_HASHTAGS.map((tag) => {
                        const isAdded = tags.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => (isAdded ? handleRemoveHashtag(tag) : handleAddHashtag(tag))}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-medium transition-colors cursor-pointer ${
                              isAdded
                                ? 'bg-brand-yellow text-[#070B14] font-semibold'
                                : 'bg-white/[0.04] text-text-muted hover:text-white border border-white/[0.06]'
                            }`}
                          >
                            #{tag}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Clip Summary Card */}
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                    <Info className="w-3.5 h-3.5 text-brand-mint" />
                    <span>Clip Specs</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-text-muted">
                    <div>
                      <span className="text-text-faint">Full Length:</span>{' '}
                      <span className="font-mono text-white">{formatDuration(videoDuration)}</span>
                    </div>
                    <div>
                      <span className="text-text-faint">Trimmed:</span>{' '}
                      <span className="font-mono text-brand-mint">
                        {formatDuration(trimEnd > 0 ? trimEnd - trimStart : videoDuration)}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-faint">Aspect:</span>{' '}
                      <span className="text-white">9:16 Portrait</span>
                    </div>
                    <div>
                      <span className="text-text-faint">File Size:</span>{' '}
                      <span className="text-white">{formatFileSize(selectedFile?.size)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Studio Bottom Publishing Bar ── */}
          {status !== 'SELECT' &&
            status !== 'UPLOADING' &&
            status !== 'PROCESSING' &&
            status !== 'VALIDATING' &&
            status !== 'READY_TO_PUBLISH' &&
            status !== 'ERROR' && (
            <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-t border-white/[0.08] bg-[#070B14] shrink-0 select-none pb-[env(safe-area-inset-bottom,14px)]">
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-muted">
                  {selectedFile ? 'Ready to publish' : 'Select video'}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleAttemptClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-text-muted hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  id="publish-reel-btn"
                  onClick={handlePublishReel}
                  disabled={createPostMutation.isPending || !selectedFile}
                  className={`min-h-[42px] px-6 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md cursor-pointer disabled:opacity-50 ${
                    createPostMutation.isPending
                      ? 'community-shimmer-btn text-[#070B14]'
                      : 'bg-gradient-to-r from-brand-yellow to-brand-mint text-[#070B14] hover:shadow-[0_0_24px_rgba(246,237,74,0.35)] hover:brightness-105 active:scale-95'
                  }`}
                >
                  {createPostMutation.isPending ? 'Publishing…' : 'Publish Reel →'}
                </button>
              </div>
            </div>
          )}

          {/* ── Unsaved Changes Discard Confirmation Dialog ── */}
          {showDiscardDialog && (
            <div
              className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="discard-reel-title"
              aria-describedby="discard-reel-desc"
            >
              <div className="w-full max-w-sm bg-[#0E1726] border border-white/[0.1] rounded-3xl p-6 shadow-2xl text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 id="discard-reel-title" className="text-base font-bold text-white">
                    Discard Reel changes?
                  </h3>
                  <p id="discard-reel-desc" className="text-xs text-text-muted mt-1 leading-relaxed">
                    Your Reel hasn't been published. If you exit now, any video adjustments and caption will be discarded.
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    onClick={handleConfirmDiscard}
                    className="w-full py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-semibold text-xs border border-rose-500/20 transition-all cursor-pointer"
                  >
                    Discard Reel
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowDiscardDialog(false)}
                    className="w-full py-2.5 rounded-xl bg-white/[0.06] text-white hover:bg-white/[0.1] font-medium text-xs transition-colors cursor-pointer"
                  >
                    Keep editing
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Cover Selector Modal ── */}
          <ReelCoverSelector
            isOpen={isCoverSelectorOpen}
            onClose={() => setIsCoverSelectorOpen(false)}
            videoRef={videoRef}
            videoDuration={videoDuration}
            currentTime={currentTime}
            currentCoverPreview={selectedCover?.previewUrl}
            onApplyCover={setSelectedCover}
          />

          {/* ── Audio & Music Picker Studio (Phase 3C) ── */}
          <ReelAudioPicker
            isOpen={isAudioPickerOpen}
            onClose={() => setIsAudioPickerOpen(false)}
            audioMode={audioMode}
            setAudioMode={setAudioMode}
            selectedMusic={selectedMusic}
            setSelectedMusic={setSelectedMusic}
            musicStart={musicStart}
            setMusicStart={setMusicStart}
            musicEnd={musicEnd}
            setMusicEnd={setMusicEnd}
            originalVolume={originalVolume}
            setOriginalVolume={setOriginalVolume}
            musicVolume={musicVolume}
            setMusicVolume={setMusicVolume}
            reelDuration={trimEnd > trimStart ? trimEnd - trimStart : videoDuration}
            creatorHandle={user?.username || ''}
          />

          {/* ── Text Overlay Editor Modal/Drawer (Phase 3D) ── */}
          <ReelTextEditor
            isOpen={isTextEditorOpen}
            initialLayer={editingTextLayer}
            duration={trimEnd > trimStart ? trimEnd - trimStart : videoDuration}
            currentTime={currentTime}
            onSave={handleSaveTextLayer}
            onClose={() => {
              setIsTextEditorOpen(false);
              setEditingTextLayer(null);
            }}
          />

          {/* ── Sticker Picker Drawer (Phase 3D) ── */}
          <ReelStickerPicker
            isOpen={isStickerPickerOpen}
            duration={trimEnd > trimStart ? trimEnd - trimStart : videoDuration}
            currentTime={currentTime}
            onSelectSticker={handleSelectSticker}
            onClose={() => setIsStickerPickerOpen(false)}
          />

          {/* ── Caption Editor Modal/Drawer (Phase 3D) ── */}
          <ReelCaptionEditor
            isOpen={isCaptionEditorOpen}
            initialLayer={editingCaptionLayer}
            duration={trimEnd > trimStart ? trimEnd - trimStart : videoDuration}
            currentTime={currentTime}
            onSave={handleSaveCaptionLayer}
            onClose={() => {
              setIsCaptionEditorOpen(false);
              setEditingCaptionLayer(null);
            }}
          />

          {/* ── Layer Manager Panel (Phase 3D) ── */}
          <ReelLayerPanel
            isOpen={isLayerPanelOpen}
            layers={editorLayers}
            activeLayerId={activeLayerId}
            onSelectLayer={setActiveLayerId}
            onEditLayer={handleEditLayer}
            onDeleteLayer={handleDeleteLayer}
            onOpenTextEditor={handleOpenAddText}
            onOpenStickerPicker={handleOpenStickerPicker}
            onOpenCaptionEditor={handleOpenAddCaption}
            onClose={() => setIsLayerPanelOpen(false)}
          />
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
