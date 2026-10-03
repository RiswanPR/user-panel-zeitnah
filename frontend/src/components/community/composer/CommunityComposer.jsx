import React, { useState, useRef, useEffect, useContext, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthContext } from '../../../context/AuthContext';
import { getUploadUrl } from '../../../utils/courseUi';
import { useCreatePost, useAIImproveText, useAISuggestTags } from '../../../hooks/useCommunity';
import { communityApi } from '../../../services/communityApi';
import toast from 'react-hot-toast';

import ComposerCollapsed from './ComposerCollapsed';
import ComposerExpanded from './ComposerExpanded';
import CreatePostModal from './CreatePostModal';

/**
 * CommunityComposer — Orchestrator for Zeitnah Community post creation
 * Manages collapsed vs expanded state with smooth layout transitions,
 * file uploads, AI assistance, tag generation, and audience selection.
 */
export default function CommunityComposer({ onOpenModal }) {
  const { user } = useContext(AuthContext);
  const [content, setContent] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [audience, setAudience] = useState('PUBLIC');
  const [showAudienceMenu, setShowAudienceMenu] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

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

  // Auto-resize textarea when expanded and content changes
  useEffect(() => {
    if (isExpanded && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 260)}px`;
    }
  }, [content, isExpanded]);

  const handleFileSelect = useCallback(async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    // Client-side pre-validation
    for (const file of files) {
      if (file.size > 50 * 1024 * 1024) {
        toast.error(`"${file.name}" exceeds the 50MB upload limit.`);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      const isAllowed =
        file.type.startsWith('image/') ||
        file.type.startsWith('video/') ||
        file.type.includes('pdf');
      if (!isAllowed) {
        toast.error(`Unsupported format for "${file.name}". Please upload an image, video, or PDF.`);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
    }

    setIsUploading(true);
    setUploadProgress(0);
    try {
      const uploadedMedia = [];
      for (const file of files) {
        const response = await communityApi.uploadMedia(file, (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress(percentCompleted);
          }
        });

        uploadedMedia.push({
          url: response.url,
          type: file.type.startsWith('video/')
            ? 'video'
            : file.type.includes('pdf')
            ? 'document'
            : 'image',
          mimeType: file.type,
          size: file.size,
        });
      }
      setAttachedFiles((prev) => [...prev, ...uploadedMedia]);
      setIsExpanded(true);
      toast.success('Media uploaded successfully');
    } catch (err) {
      if (err?.response?.status === 413) {
        toast.error('File exceeds maximum upload size limit.');
      } else if (err?.response?.status === 401) {
        toast.error('Your session has expired. Please sign in again.');
      } else if (err?.message === 'Network Error' || (typeof navigator !== 'undefined' && !navigator.onLine)) {
        toast.error('Network connection error. Please check your internet connection.');
      } else {
        toast.error(err?.response?.data?.message || 'Failed to upload media. Please try again.');
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, []);

  const removeFile = useCallback(
    async (index) => {
      const file = attachedFiles[index];
      if (file && file.url) {
        try {
          await communityApi.deleteMedia(file.url);
        } catch (err) {
          console.error('Failed to delete media', err);
        }
      }
      setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
    },
    [attachedFiles]
  );

  const handleImprove = useCallback(() => {
    if (!content.trim()) return;
    improveMutation.mutate(content, {
      onSuccess: (data) => {
        if (data?.improved) {
          setContent(data.improved);
          toast.success('Text improved with AI!');
        }
      },
      onError: () => {
        toast.error('Unable to improve text at this moment.');
      },
    });
  }, [content, improveMutation]);

  const handleSuggestTags = useCallback(() => {
    if (!content.trim()) return;
    suggestTagsMutation.mutate(content, {
      onSuccess: (data) => {
        if (data?.tags && data.tags.length > 0) {
          const newTags = data.tags.filter((t) => !tags.includes(t));
          setTags((prev) => [...prev, ...newTags]);
          toast.success(`Added ${newTags.length} suggested tags`);
        }
      },
      onError: () => {
        toast.error('Unable to suggest tags at this moment.');
      },
    });
  }, [content, tags, suggestTagsMutation]);

  const handleAddTag = () => {
    const clean = tagInput.trim().replace(/^#/, '');
    if (clean && !tags.includes(clean)) {
      setTags((prev) => [...prev, clean]);
      setTagInput('');
      setShowTagInput(false);
    }
  };

  const removeTag = useCallback((tagToRemove) => {
    setTags((prev) => prev.filter((t) => t !== tagToRemove));
  }, []);

  const handleCancel = () => {
    if (content.trim() || attachedFiles.length > 0) {
      if (!window.confirm('Discard this post draft?')) return;
    }
    setContent('');
    setTags([]);
    setAttachedFiles([]);
    setIsExpanded(false);
    setShowTagInput(false);
  };

  const handleSubmit = () => {
    if (!content.trim() && attachedFiles.length === 0) return;

    const postType =
      attachedFiles.length > 0
        ? attachedFiles[0].type === 'video'
          ? 'VIDEO'
          : 'IMAGE'
        : 'TEXT';

    createPostMutation.mutate(
      {
        content: content.trim(),
        audience,
        type: postType,
        media: attachedFiles,
        tags,
      },
      {
        onSuccess: () => {
          setContent('');
          setTags([]);
          setAttachedFiles([]);
          setIsExpanded(false);
          setShowTagInput(false);
          toast.success('Post published to Community!');
        },
        onError: () => {
          toast.error('Failed to create post. Please try again.');
        },
      }
    );
  };

  const handleCollapsedMediaClick = () => {
    setIsExpanded(true);
    // Short timeout to allow fileInputRef to mount in expanded view
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 50);
  };

  return (
    <motion.div
      layout
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="mb-4"
    >
      <AnimatePresence mode="wait">
        {!isExpanded ? (
          <motion.div
            key="collapsed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <ComposerCollapsed
              avatarUrl={avatarUrl}
              userInitials={userInitials}
              onExpand={() => {
                if (onOpenModal) onOpenModal();
                else setIsModalOpen(true);
              }}
              onMediaClick={() => {
                if (onOpenModal) onOpenModal();
                else setIsModalOpen(true);
              }}
              onVideoClick={() => {
                if (onOpenModal) onOpenModal();
                else setIsModalOpen(true);
              }}
              onQuestionClick={() => {
                if (onOpenModal) onOpenModal();
                else setIsModalOpen(true);
              }}
            />
          </motion.div>
        ) : (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            <ComposerExpanded
              avatarUrl={avatarUrl}
              userInitials={userInitials}
              content={content}
              setContent={setContent}
              audience={audience}
              setAudience={setAudience}
              showAudienceMenu={showAudienceMenu}
              setShowAudienceMenu={setShowAudienceMenu}
              tags={tags}
              tagInput={tagInput}
              setTagInput={setTagInput}
              showTagInput={showTagInput}
              setShowTagInput={setShowTagInput}
              handleAddTag={handleAddTag}
              removeTag={removeTag}
              attachedFiles={attachedFiles}
              isUploading={isUploading}
              uploadProgress={uploadProgress}
              removeFile={removeFile}
              handleFileSelect={handleFileSelect}
              fileInputRef={fileInputRef}
              textareaRef={textareaRef}
              handleImprove={handleImprove}
              isImproving={improveMutation.isPending}
              handleSuggestTags={handleSuggestTags}
              isSuggestingTags={suggestTagsMutation.isPending}
              handleCancel={handleCancel}
              handleSubmit={handleSubmit}
              isSubmitting={createPostMutation.isPending}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <CreatePostModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </motion.div>
  );
}
