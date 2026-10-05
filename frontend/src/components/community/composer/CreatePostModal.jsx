import { useState, useRef, useEffect, useCallback, useContext } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  X,
  ArrowLeft,
  UploadCloud,
  RotateCw,
  Sparkles,
  MapPin,
  Layers,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Loader2,
  Image,
  Video,
  BarChart2,
  Hash,
  AtSign,
  Eye,
  Edit3,
  Check,
  CheckCircle2,
  MessageSquare,
  Lock,
  Globe,
  Users,
  BookOpen,
} from 'lucide-react';
import { AuthContext } from '../../../context/AuthContext';
import { getUploadUrl } from '../../../utils/courseUi';
import { useCreatePost } from '../../../hooks/useCommunity';
import { communityApi } from '../../../services/communityApi';
import toast from 'react-hot-toast';
import BrandAmbientShape from '../ui/BrandAmbientShape';

import PostPollBuilder from './PostPollBuilder';
import PostMediaManager from './PostMediaManager';
import PostAudienceSelector from './PostAudienceSelector';
import PostPreview from './PostPreview';
import MentionAutocompletePopup from './MentionAutocompletePopup';

const DRAFT_STORAGE_KEY = 'zeitnah_post_draft';

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
 * CreatePostModal — Creator-grade Post Studio for Zeitnah Community:
 * Phase 2 upgrades provide a unified workspace on desktop and mobile:
 * - Direct Composer with auto-growing textarea, character counting, and safe placeholders
 * - Advanced Media & Multi-Image Carousel Manager (reordering, replace, remove, aspect ratios)
 * - Native Poll Creator (2-5 options, duplicate check, expiration duration mapping to backend)
 * - Topics & Hashtags (search via communityApi.searchCommunity and popular tags)
 * - Interactive @Mentions autocomplete with debounced user search & keyboard navigation
 * - Audience Controls (PUBLIC, COURSE, BATCH, PRIVATE) matching backend schema
 * - Real-time Post Preview tab mirroring feed PostCard without network mutations
 * - Reliable local draft autosave & restore safeguards
 * - Explicit publishing state machine with AbortController cancellation & S3 cleanup on discard
 */
export default function CreatePostModal({ isOpen, onClose }) {
  const { user } = useContext(AuthContext);
  const shouldReduceMotion = useReducedMotion();

  // Mode: 'EDIT' | 'PREVIEW'
  const [viewMode, setViewMode] = useState('EDIT');

  // Step compatibility: 'SELECT' | 'EDIT' | 'DETAILS' | 'UPLOADING'
  const [step, setStep] = useState('DETAILS');

  // Media files state
  const [files, setFiles] = useState([]);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [aspectRatio, setAspectRatio] = useState('original');
  const [rotation, setRotation] = useState(0);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Content state
  const [content, setContent] = useState('');
  const [tags, setTags] = useState([]);
  const [audience, setAudience] = useState('PUBLIC');
  const [location, setLocation] = useState('');
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [altText, setAltText] = useState('');
  const [allowComments, setAllowComments] = useState('everyone');

  // Poll state
  const [showPoll, setShowPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [pollDurationDays, setPollDurationDays] = useState(7);

  // Topics search state
  const [topicQuery, setTopicQuery] = useState('');
  const [topicSuggestions, setTopicSuggestions] = useState([]);
  const [isSearchingTopics, setIsSearchingTopics] = useState(false);

  // Mentions autocomplete state
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [showMentionPopup, setShowMentionPopup] = useState(false);

  // Publishing / Uploading states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState('');
  const [currentUploadIndex, setCurrentUploadIndex] = useState(0);
  const [uploadError, setUploadError] = useState(null);

  // Drafts & unsaved changes
  const [showDraftDialog, setShowDraftDialog] = useState(false);
  const [hasExistingDraft, setHasExistingDraft] = useState(false);
  const [isDraftSaved, setIsDraftSaved] = useState(false);

  const fileInputRef = useRef(null);
  const modalRef = useRef(null);
  const textareaRef = useRef(null);
  const previousActiveElementRef = useRef(null);
  const abortControllerRef = useRef(null);
  const isPublishingRef = useRef(false);
  const idempotencyKeyRef = useRef(null);
  const autosaveTimerRef = useRef(null);

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

  // Autosave draft debounce
  useEffect(() => {
    if (!isOpen || isUploading) return;

    const hasContent = content.trim().length > 0 || files.length > 0 || pollQuestion.trim().length > 0 || tags.length > 0;
    if (!hasContent) return;

    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);

    autosaveTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(
          DRAFT_STORAGE_KEY,
          JSON.stringify({
            content,
            tags,
            audience,
            location,
            altText,
            showPoll,
            pollQuestion,
            pollOptions,
            pollDurationDays,
            hasMedia: files.length > 0,
            savedAt: new Date().toISOString(),
          })
        );
        setIsDraftSaved(true);
      } catch {}
    }, 1200);

    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [content, tags, audience, location, altText, showPoll, pollQuestion, pollOptions, pollDurationDays, files.length, isOpen, isUploading]);

  // Topic suggestions query debounce
  useEffect(() => {
    if (!topicQuery.trim()) {
      setTopicSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingTopics(true);
      try {
        const res = await communityApi.searchCommunity({
          q: topicQuery.trim(),
          type: 'topics',
          limit: 5,
        });
        const list = Array.isArray(res?.topics) ? res.topics.map((t) => t.tag || t) : [];
        setTopicSuggestions(list);
      } catch {
        setTopicSuggestions([]);
      } finally {
        setIsSearchingTopics(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [topicQuery]);

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
        if (draft.showPoll) {
          setShowPoll(true);
          if (draft.pollQuestion) setPollQuestion(draft.pollQuestion);
          if (draft.pollOptions) setPollOptions(draft.pollOptions);
          if (draft.pollDurationDays) setPollDurationDays(draft.pollDurationDays);
        }
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

  // Cancel upload handler
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

  const resetState = useCallback((cleanupUploaded = false) => {
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
    setShowPoll(false);
    setPollQuestion('');
    setPollOptions(['', '']);
    setStep('DETAILS');
    setViewMode('EDIT');
    setIsUploading(false);
    setUploadProgress(0);
    setCurrentUploadIndex(0);
    setUploadError(null);
    setShowDraftDialog(false);
    isPublishingRef.current = false;
  }, [files]);

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

    const hasUnsavedWork =
      content.trim().length > 0 ||
      files.length > 0 ||
      (showPoll && pollQuestion.trim().length > 0) ||
      tags.length > 0;

    if (hasUnsavedWork) {
      setShowDraftDialog(true);
    } else {
      resetState();
      onClose();
    }
  }, [content, files, showPoll, pollQuestion, tags, isUploading, onClose, resetState]);

  // Keydown listener (Escape)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !showMentionPopup) {
        e.preventDefault();
        handleRequestClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showMentionPopup, handleRequestClose]);

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
          showPoll,
          pollQuestion,
          pollOptions,
          pollDurationDays,
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

  // Content change & @mention detection
  const handleContentChange = (e) => {
    const val = e.target.value;
    setContent(val);
    setIsDraftSaved(false);

    const cursorPos = e.target.selectionStart;
    const textBefore = val.slice(0, cursorPos);
    const lastAt = textBefore.lastIndexOf('@');

    if (lastAt !== -1) {
      const queryAfterAt = textBefore.slice(lastAt + 1);
      if (!queryAfterAt.includes(' ') && !queryAfterAt.includes('\n')) {
        setMentionQuery(queryAfterAt);
        setMentionStartIndex(lastAt);
        setShowMentionPopup(true);
        return;
      }
    }
    setShowMentionPopup(false);
  };

  // Select mention
  const handleSelectMention = (targetUser) => {
    if (mentionStartIndex === -1) return;
    const handle = targetUser.username || targetUser.name?.toLowerCase().replace(/\s+/g, '') || 'member';
    const before = content.slice(0, mentionStartIndex);
    const after = content.slice(textareaRef.current?.selectionStart || content.length);
    const updated = `${before}@${handle} ${after}`;
    setContent(updated);
    setShowMentionPopup(false);

    if (textareaRef.current) {
      const nextPos = before.length + handle.length + 2;
      setTimeout(() => {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(nextPos, nextPos);
      }, 0);
    }
  };

  // File selection & validation
  const handleFilesAdded = async (e) => {
    const incomingFiles = Array.from(e.target.files || []);
    if (!incomingFiles.length) return;

    const checkBrowserDuration = (file) => {
      return new Promise((resolve) => {
        try {
          const video = document.createElement('video');
          video.preload = 'metadata';
          const objUrl = URL.createObjectURL(file);
          video.onloadedmetadata = () => {
            URL.revokeObjectURL(objUrl);
            resolve(video.duration);
          };
          video.onerror = () => {
            URL.revokeObjectURL(objUrl);
            resolve(null);
          };
          video.src = objUrl;
        } catch {
          resolve(null);
        }
      });
    };

    for (const file of incomingFiles) {
      const ext = (file.name || '').split('.').pop()?.toLowerCase();
      const isImage = file.type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext);
      const isVideo = file.type.startsWith('video/') || ['mp4', 'mov', 'webm'].includes(ext);

      if (isImage && file.size > 8 * 1024 * 1024) {
        toast.error('Photo must be 8 MB or smaller.');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      if (isVideo && file.size > 1024 * 1024 * 1024) {
        toast.error('Video must be 1 GB or smaller.');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      if (isVideo) {
        const duration = await checkBrowserDuration(file);
        if (duration !== null && duration > 90) {
          toast.error('Video must be 90 seconds or shorter.');
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }
      }

      if (!isImage && !isVideo && file.size > 50 * 1024 * 1024) {
        toast.error(`"${file.name}" exceeds the 50MB file size limit.`);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      const isAllowed =
        isImage ||
        isVideo ||
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
    setStep('DETAILS');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveFile = (id) => {
    setFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      const filtered = prev.filter((f) => f.id !== id);
      if (activeMediaIndex >= filtered.length) {
        setActiveMediaIndex(Math.max(0, filtered.length - 1));
      }
      return filtered;
    });
  };

  const handleMoveLeft = (index) => {
    if (index <= 0) return;
    setFiles((prev) => {
      const next = [...prev];
      const temp = next[index - 1];
      next[index - 1] = next[index];
      next[index] = temp;
      return next;
    });
    setActiveMediaIndex((prev) => prev - 1);
  };

  const handleMoveRight = (index) => {
    if (index >= files.length - 1) return;
    setFiles((prev) => {
      const next = [...prev];
      const temp = next[index + 1];
      next[index + 1] = next[index];
      next[index] = temp;
      return next;
    });
    setActiveMediaIndex((prev) => prev + 1);
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Tag management
  const handleAddTag = (rawTag) => {
    const clean = rawTag.replace(/^#/, '').trim().toLowerCase();
    if (!clean) return;
    if (tags.includes(clean)) return;
    setTags((prev) => [...prev, clean]);
    setTopicQuery('');
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags((prev) => prev.filter((t) => t !== tagToRemove));
  };

  // Publishing submission
  const handlePublish = async () => {
    if (isPublishingRef.current || isUploading || createPostMutation.isPending) {
      return;
    }

    const trimmedContent = content.trim();
    const hasMedia = files.length > 0;
    const hasValidPoll =
      showPoll &&
      pollQuestion.trim().length > 0 &&
      pollOptions.filter((o) => o && o.trim()).length >= 2;

    if (!trimmedContent && !hasMedia && !hasValidPoll) {
      toast.error('Please add text, media, or a poll to publish your post.');
      return;
    }

    if (showPoll) {
      if (!pollQuestion.trim()) {
        toast.error('Please specify a poll question.');
        return;
      }
      const validOptions = pollOptions.filter((o) => o && o.trim());
      if (validOptions.length < 2) {
        toast.error('Please provide at least 2 poll options.');
        return;
      }
      const uniqueOptions = new Set(validOptions.map((o) => o.trim().toLowerCase()));
      if (uniqueOptions.size !== validOptions.length) {
        toast.error('Poll options must be unique.');
        return;
      }
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
    setUploadStatusText('Preparing post...');

    try {
      const uploadedMedia = [];

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

                const loadedMB = (progressEvent.loaded / (1024 * 1024)).toFixed(1);
                const totalMB = (progressEvent.total / (1024 * 1024)).toFixed(1);
                const fileTypeLabel = item.type === 'video' ? 'video' : 'media';
                setUploadStatusText(`Uploading ${fileTypeLabel} ${i + 1} of ${files.length} (${loadedMB} MB / ${totalMB} MB)...`);
              }
            },
            abortControllerRef.current?.signal
          );

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

      setUploadStatusText('Publishing post to Community...');
      setUploadProgress(92);

      let postType = 'TEXT';
      if (hasValidPoll) {
        postType = 'POLL';
      } else if (uploadedMedia.length > 0) {
        postType = uploadedMedia[0].type === 'video' ? 'VIDEO' : 'IMAGE';
      }

      let finalContent = trimmedContent;
      if (location.trim()) {
        finalContent = `📍 ${location.trim()}\n\n${finalContent}`;
      }

      let normalizedAudience = (audience || 'PUBLIC').toUpperCase();
      if (normalizedAudience === 'COHORT') normalizedAudience = 'COURSE';
      if (!['PUBLIC', 'COURSE', 'BATCH', 'PRIVATE'].includes(normalizedAudience)) {
        normalizedAudience = 'PUBLIC';
      }

      const payload = {
        content: finalContent,
        audience: normalizedAudience,
        type: postType,
        media: uploadedMedia,
        tags,
        idempotencyKey: idempotencyKeyRef.current,
      };

      if (hasValidPoll) {
        payload.pollQuestion = pollQuestion.trim();
        payload.pollOptions = pollOptions
          .filter((o) => o && o.trim())
          .map((o) => ({ text: o.trim() }));
        payload.pollExpiresAt = new Date(Date.now() + (pollDurationDays || 7) * 24 * 60 * 60 * 1000);
      }

      await createPostMutation.mutateAsync(payload);

      setUploadProgress(100);
      setUploadStatusText('Published!');
      toast.success('Post shared to Community!');

      idempotencyKeyRef.current = null;

      try {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch {}

      setTimeout(() => {
        resetState(false);
        onClose();
      }, 350);
    } catch (err) {
      setIsUploading(false);
      isPublishingRef.current = false;
      let errMsg = 'Failed to share post. Please try again.';
      if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') {
        errMsg = 'Upload cancelled.';
      } else if (err?.response?.data?.message) {
        errMsg = err.response.data.message;
      } else if (err?.response?.status === 413) {
        errMsg = 'File exceeds maximum upload size limit.';
      } else if (err?.response?.status === 401) {
        errMsg = 'Your session has expired. Please sign in again.';
      } else if (
        err?.message === 'Network Error' ||
        (typeof navigator !== 'undefined' && !navigator.onLine)
      ) {
        errMsg = 'Network connection error. Please check your internet connection.';
      }

      setUploadError(errMsg);
      toast.error(errMsg);
    } finally {
      isPublishingRef.current = false;
    }
  };

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[90] flex items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md"
        role="dialog"
        aria-modal="true"
        aria-label="Create new post"
        aria-labelledby="create-post-title"
      >
        <motion.div
          ref={modalRef}
          initial={shouldReduceMotion ? { opacity: 0 } : { scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.96, opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="relative w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-[1040px] bg-[#070B14] border-0 sm:border border-white/[0.1] rounded-none sm:rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.7)] flex flex-col overflow-hidden text-white"
        >
          {/* ── Studio Header Bar ── */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-white/[0.08] shrink-0 select-none bg-[#09111F]/90 backdrop-blur-md z-20">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleRequestClose}
                className="p-1.5 -ml-1 rounded-xl text-text-muted hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                aria-label="Close post studio"
              >
                <ArrowLeft className="w-5 h-5 sm:hidden" />
                <X className="w-5 h-5 hidden sm:block" />
              </button>

              <div>
                <h2 id="create-post-title" className="text-sm sm:text-base font-bold font-heading text-white tracking-tight flex items-center gap-2">
                  <span>Create Post</span>
                  <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-brand-mint/10 border border-brand-mint/20 text-[10px] font-semibold text-brand-mint uppercase tracking-wider">
                    Studio
                  </span>
                </h2>
                <p className="text-[11px] text-text-faint hidden sm:block">
                  {'Adjust & Preview your post before sharing with Zeitnah'}
                </p>
              </div>
            </div>

            {/* View Switch: Edit vs Preview */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-white/[0.04] p-1 rounded-xl border border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setViewMode('EDIT')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    viewMode === 'EDIT'
                      ? 'bg-brand-mint text-[#070B14] font-semibold shadow-sm'
                      : 'text-text-muted hover:text-white'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('PREVIEW')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    viewMode === 'PREVIEW'
                      ? 'bg-brand-mint text-[#070B14] font-semibold shadow-sm'
                      : 'text-text-muted hover:text-white'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview</span>
                </button>
              </div>

              {/* Mobile Publish Button in Header */}
              <button
                type="button"
                onClick={handlePublish}
                disabled={isUploading || createPostMutation.isPending}
                className="sm:hidden px-3.5 py-1.5 rounded-xl bg-brand-mint text-[#070B14] font-bold text-xs hover:opacity-90 disabled:opacity-40 transition-all cursor-pointer"
              >
                {isUploading ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>

          {/* ── Saved Draft Notification Banner ── */}
          {hasExistingDraft && (
            <div className="px-4 sm:px-6 py-2 bg-brand-mint/10 border-b border-brand-mint/20 flex items-center justify-between text-xs shrink-0">
              <span className="flex items-center gap-2 text-white/90">
                <Sparkles className="w-3.5 h-3.5 text-brand-mint" />
                <span>You have an unfinished post draft.</span>
              </span>
              <div className="flex items-center gap-2.5">
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

          {/* ── Hidden File Inputs ── */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,application/pdf"
            onChange={handleFilesAdded}
            className="hidden"
            id="create-post-file-input"
          />

          {/* ── UPLOADING / PUBLISHING OVERLAY ── */}
          {step === 'UPLOADING' ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[420px] bg-[#070B14]">
              {uploadError ? (
                <div className="max-w-md w-full p-6 rounded-3xl bg-[#0F1828] border border-rose-500/30 text-center space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Upload failed</h3>
                    <p className="text-xs text-text-muted mt-1 leading-relaxed">{uploadError}</p>
                  </div>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => handlePublish()}
                      className="px-4 py-2 rounded-xl bg-brand-mint text-[#070B14] text-xs font-bold hover:opacity-90 transition-all cursor-pointer"
                    >
                      Retry
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep('DETAILS')}
                      className="px-4 py-2 rounded-xl bg-white/[0.06] text-white hover:bg-white/[0.1] text-xs font-semibold transition-all cursor-pointer"
                    >
                      Keep editing
                    </button>
                  </div>
                </div>
              ) : (
                <div className="max-w-md w-full p-8 rounded-3xl bg-[#09111F] border border-white/[0.08] text-center space-y-5">
                  <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-2 border-brand-mint/20 border-t-brand-mint animate-spin" />
                    <UploadCloud className="w-7 h-7 text-brand-mint" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Publishing post…</h3>
                    <p className="text-xs text-text-muted mt-1">Please keep this window open.</p>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1.5 text-left">
                    <div className="flex justify-between text-[11px] text-text-muted">
                      <span>{uploadStatusText}</span>
                      <span className="font-semibold text-white">{uploadProgress}%</span>
                    </div>
                    <div className="h-2 w-full bg-white/[0.06] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-brand-mint to-brand-yellow transition-all duration-300 rounded-full"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    data-testid="cancel-upload-btn"
                    onClick={handleCancelUpload}
                    className="text-xs text-text-muted hover:text-white transition-colors cursor-pointer pt-2"
                  >
                    Cancel upload
                  </button>
                </div>
              )}
            </div>
          ) : viewMode === 'PREVIEW' ? (
            /* ── PREVIEW MODE VIEW ── */
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-[#040810]/70">
              <PostPreview
                user={user}
                content={content}
                files={files}
                tags={tags}
                audience={audience}
                pollQuestion={pollQuestion}
                pollOptions={pollOptions}
                pollDurationDays={pollDurationDays}
                aspectRatio={aspectRatio}
                rotation={rotation}
              />
            </div>
          ) : (
            /* ── DUAL PANE WORKSPACE (DESKTOP) & STACKED (MOBILE) ── */
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
              {/* LEFT / MAIN COLUMN: Composer, Media, Poll */}
              <div
                className="flex-1 flex flex-col overflow-y-auto p-4 sm:p-6 space-y-4"
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingOver(true);
                }}
                onDragLeave={() => setIsDraggingOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingOver(false);
                  if (e.dataTransfer?.files?.length) {
                    handleFilesAdded({ target: { files: e.dataTransfer.files } });
                  }
                }}
              >
                {/* Author Info Bar */}
                <div className="flex items-center justify-between gap-3 shrink-0">
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
                        {user?.username ? `@${user.username}` : 'Verified Member'} · <span className="text-brand-mint font-medium">{audience}</span>
                      </p>
                    </div>
                  </div>

                  {/* Audience Selector on top */}
                  <PostAudienceSelector audience={audience} onChange={setAudience} />
                </div>

                {/* Main Textarea Writing Area with @Mention Popup */}
                <div className="relative flex-1 flex flex-col min-h-[140px]">
                  <textarea
                    ref={textareaRef}
                    id="create-post-caption-input"
                    data-testid="composer-textarea"
                    value={content}
                    onChange={handleContentChange}
                    placeholder={
                      showPoll
                        ? 'Ask a question or explain the context for this poll...'
                        : files.length > 0
                        ? 'Write a caption... Share engineering insights, site updates, or project lessons'
                        : 'Share an idea, insight, project lesson, question, or something useful...'
                    }
                    rows={4}
                    maxLength={5000}
                    className="flex-1 w-full bg-white/[0.02] border border-white/[0.08] focus:border-brand-mint/40 rounded-2xl p-4 text-sm sm:text-base text-white placeholder-text-faint focus:outline-none resize-none leading-relaxed transition-colors"
                  />

                  {/* Mentions Autocomplete Popup */}
                  <MentionAutocompletePopup
                    visible={showMentionPopup}
                    query={mentionQuery}
                    onSelect={handleSelectMention}
                    onClose={() => setShowMentionPopup(false)}
                  />

                  {/* Character Counter & Emoji Strip */}
                  <div className="flex items-center justify-between text-[11px] text-text-faint pt-2 px-1">
                    <div className="flex items-center gap-1.5 overflow-x-auto">
                      {EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setContent((prev) => `${prev}${emoji}`)}
                          className="hover:scale-125 transition-transform p-0.5 cursor-pointer"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>

                    <div className="text-[11px] text-text-muted font-medium shrink-0">
                      {5000 - content.length} characters left
                    </div>
                  </div>
                </div>

                {/* Attached Media Manager */}
                {files.length > 0 && (
                  <PostMediaManager
                    files={files}
                    activeMediaIndex={activeMediaIndex}
                    onSelectIndex={setActiveMediaIndex}
                    onRemoveFile={handleRemoveFile}
                    onMoveLeft={handleMoveLeft}
                    onMoveRight={handleMoveRight}
                    onAddMoreFiles={handleFilesAdded}
                    aspectRatio={aspectRatio}
                    onAspectRatioChange={setAspectRatio}
                    rotation={rotation}
                    onRotate={handleRotate}
                    isUploading={isUploading}
                  />
                )}

                {/* Poll Creator Panel */}
                {showPoll && (
                  <PostPollBuilder
                    question={pollQuestion}
                    onQuestionChange={setPollQuestion}
                    options={pollOptions}
                    onOptionsChange={setPollOptions}
                    durationDays={pollDurationDays}
                    onDurationChange={setPollDurationDays}
                    onRemovePoll={() => {
                      setShowPoll(false);
                      setPollQuestion('');
                      setPollOptions(['', '']);
                    }}
                  />
                )}

                {/* Quick Attachments Toolbar */}
                <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-xs text-text-secondary hover:text-white border border-white/[0.06] transition-colors cursor-pointer"
                  >
                    <Image className="w-3.5 h-3.5 text-brand-mint" />
                    <span>Photo / Video</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowPoll((prev) => !prev)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs border transition-colors cursor-pointer ${
                      showPoll
                        ? 'bg-brand-mint/10 border-brand-mint/30 text-brand-mint font-semibold'
                        : 'bg-white/[0.03] hover:bg-white/[0.08] border-white/[0.06] text-text-secondary hover:text-white'
                    }`}
                  >
                    <BarChart2 className="w-3.5 h-3.5 text-brand-yellow" />
                    <span>Poll</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setContent((prev) => `${prev}@`);
                      if (textareaRef.current) textareaRef.current.focus();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-xs text-text-secondary hover:text-white border border-white/[0.06] transition-colors cursor-pointer"
                  >
                    <AtSign className="w-3.5 h-3.5 text-sky-400" />
                    <span>Mention</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowLocationInput((prev) => !prev)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs border transition-colors cursor-pointer ${
                      showLocationInput || location
                        ? 'bg-purple-500/10 border-purple-500/30 text-purple-300 font-semibold'
                        : 'bg-white/[0.03] hover:bg-white/[0.08] border-white/[0.06] text-text-secondary hover:text-white'
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5 text-purple-400" />
                    <span>Location</span>
                  </button>
                </div>

                {/* Optional Location Input */}
                {showLocationInput && (
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <MapPin className="w-4 h-4 text-purple-400 shrink-0" />
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Add project site, city or venue..."
                      className="w-full bg-transparent text-xs text-white placeholder-text-faint focus:outline-none"
                    />
                    {location && (
                      <button
                        type="button"
                        onClick={() => setLocation('')}
                        className="p-1 text-text-muted hover:text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* RIGHT / SETTINGS COLUMN (Desktop >=1024px) */}
              <div className="w-full lg:w-[360px] border-t lg:border-t-0 lg:border-l border-white/[0.08] bg-[#09111F]/50 p-4 sm:p-6 space-y-5 overflow-y-auto">
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                  Post Settings
                </h3>

                {/* Audience Control Card */}
                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">Audience</span>
                    <span className="text-[10px] text-brand-mint font-medium">{audience}</span>
                  </div>
                  <p className="text-[11px] text-text-muted leading-relaxed">
                    {audience === 'PUBLIC' && 'Visible to all community members on Zeitnah.'}
                    {audience === 'COURSE' && 'Visible only to students enrolled in your course.'}
                    {audience === 'BATCH' && 'Visible only to peers in your current batch.'}
                    {audience === 'PRIVATE' && 'Visible only to assigned mentors and administrators.'}
                  </p>
                  <PostAudienceSelector audience={audience} onChange={setAudience} />
                </div>

                {/* Topics / Hashtags Section */}
                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">Topics &amp; Hashtags</span>
                    <span className="text-[10px] text-text-muted">{tags.length} selected</span>
                  </div>

                  {/* Topic search / input */}
                  <div className="relative">
                    <Hash className="w-3.5 h-3.5 text-brand-mint absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={topicQuery}
                      onChange={(e) => setTopicQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag(topicQuery);
                        }
                      }}
                      placeholder="Search or add topic..."
                      className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-brand-mint/50 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-text-faint focus:outline-none transition-colors"
                    />

                    {/* Suggestions dropdown */}
                    {topicSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-[#0E1726] border border-white/[0.12] rounded-xl shadow-xl p-1 z-30 divide-y divide-white/[0.04]">
                        {topicSuggestions.map((t, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleAddTag(t)}
                            className="w-full text-left px-3 py-1.5 text-xs text-brand-mint hover:bg-white/[0.06] rounded-lg transition-colors cursor-pointer"
                          >
                            #{t}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Selected topic pills */}
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-mint/10 border border-brand-mint/20 text-brand-mint text-[11px] font-medium"
                        >
                          #{tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="p-0.5 hover:text-white cursor-pointer"
                            aria-label={`Remove topic ${tag}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Popular tags suggestions */}
                  <div className="space-y-1.5 pt-1">
                    <p className="text-[10px] text-text-faint font-semibold uppercase tracking-wider">
                      Popular topics
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {POPULAR_HASHTAGS.map((hashtag) => {
                        const isAdded = tags.includes(hashtag);
                        return (
                          <button
                            key={hashtag}
                            type="button"
                            onClick={() => (isAdded ? handleRemoveTag(hashtag) : handleAddTag(hashtag))}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-medium transition-colors cursor-pointer ${
                              isAdded
                                ? 'bg-brand-mint text-[#070B14] font-semibold'
                                : 'bg-white/[0.04] text-text-muted hover:text-white border border-white/[0.06]'
                            }`}
                          >
                            #{hashtag}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Comment Settings */}
                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">Comment Permissions</span>
                    <MessageSquare className="w-3.5 h-3.5 text-text-muted" />
                  </div>
                  <select
                    value={allowComments}
                    onChange={(e) => setAllowComments(e.target.value)}
                    className="w-full bg-[#0E1726] border border-white/[0.08] text-xs text-white rounded-xl px-3 py-2 focus:outline-none focus:border-brand-mint/50 cursor-pointer"
                  >
                    <option value="everyone">Allow comments from everyone</option>
                    <option value="connections">Connections &amp; cohort members only</option>
                    <option value="off">Off (Comments locked)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ── Studio Bottom Publishing Bar ── */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-t border-white/[0.08] bg-[#070B14] shrink-0 select-none pb-[env(safe-area-inset-bottom,14px)]">
            {/* Draft status indicator */}
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs text-text-muted">
                {isDraftSaved ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-brand-mint" />
                    <span className="text-brand-mint font-medium">Draft saved</span>
                  </>
                ) : (
                  <span>Draft</span>
                )}
              </span>
              <button
                type="button"
                onClick={handleSaveDraft}
                className="text-xs text-text-muted hover:text-white transition-colors cursor-pointer ml-1"
              >
                Save
              </button>
            </div>

            {/* Publishing action buttons */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                id="create-post-close-btn"
                onClick={handleRequestClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-text-muted hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                id="composer-submit-btn"
                onClick={handlePublish}
                disabled={isUploading || createPostMutation.isPending}
                className={`min-h-[42px] px-6 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md cursor-pointer disabled:opacity-50 ${
                  createPostMutation.isPending || isUploading
                    ? 'community-shimmer-btn text-[#070B14]'
                    : 'bg-gradient-to-r from-brand-mint to-brand-yellow text-[#070B14] hover:shadow-[0_0_24px_rgba(159,213,178,0.4),0_0_14px_rgba(246,237,74,0.2)] hover:brightness-105 active:scale-95'
                }`}
              >
                {createPostMutation.isPending || isUploading ? 'Publishing…' : 'Publish Post →'}
              </button>
            </div>
          </div>

          {/* ── Unsaved Changes Discard Confirmation Dialog ── */}
          {showDraftDialog && (
            <div
              className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="discard-title"
              aria-describedby="discard-desc"
            >
              <div className="w-full max-w-sm bg-[#0E1726] border border-white/[0.1] rounded-3xl p-6 shadow-2xl text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 id="discard-title" className="text-base font-bold text-white">
                    Discard changes?
                  </h3>
                  <p id="discard-desc" className="text-xs text-text-muted mt-1 leading-relaxed">
                    Your post hasn't been published. You can save it as a draft or discard.
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    className="w-full py-2.5 rounded-xl bg-brand-mint text-[#070B14] font-bold text-xs hover:opacity-90 transition-all cursor-pointer"
                  >
                    Save as draft
                  </button>

                  <button
                    type="button"
                    onClick={handleDiscardDraft}
                    className="w-full py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-semibold text-xs border border-rose-500/20 transition-all cursor-pointer"
                  >
                    Discard post
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowDraftDialog(false)}
                    className="w-full py-2 rounded-xl text-text-muted hover:text-white font-medium text-xs transition-colors cursor-pointer"
                  >
                    Keep editing
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
