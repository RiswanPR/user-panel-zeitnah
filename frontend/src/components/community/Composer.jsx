import React, { useState, useRef, useEffect, useContext, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Image,
  Video,
  Send,
  Globe,
  Users,
  Lock,
  ChevronDown,
  X,
  Sparkles,
  Hash,
  Loader2,
} from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { getUploadUrl } from '../../utils/courseUi';
import { useCreatePost, useAIImproveText, useAISuggestTags } from '../../hooks/useCommunity';
import { communityApi } from '../../services/communityApi';
import toast from 'react-hot-toast';

export default function Composer() {
  const { user } = useContext(AuthContext);
  const [content, setContent] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [audience, setAudience] = useState('PUBLIC');
  const [showAudienceMenu, setShowAudienceMenu] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const tagInputRef = useRef(null);

  const createPostMutation = useCreatePost();
  const improveMutation = useAIImproveText();
  const suggestTagsMutation = useAISuggestTags();

  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'Z';
  const avatarUrl = user?.avatar ? getUploadUrl(user.avatar) : null;

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 260)}px`;
    }
  }, [content]);

  const handleFileSelect = useCallback(async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

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
    } catch {
      toast.error('Failed to upload file. Check size and format.');
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
          toast.success('Text improved!');
        }
      },
    });
  }, [content, improveMutation]);

  const handleSuggestTags = useCallback(() => {
    if (!content.trim()) return;
    suggestTagsMutation.mutate(content, {
      onSuccess: (data) => {
        if (data?.tags) {
          const newTags = data.tags.filter((t) => !tags.includes(t));
          setTags((prev) => [...prev, ...newTags]);
        }
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
      if (!window.confirm('Discard this post?')) return;
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
        },
      }
    );
  };

  const getAudienceIcon = (type) => {
    switch (type) {
      case 'PUBLIC':
        return Globe;
      case 'COURSE':
        return Users;
      case 'PRIVATE':
        return Lock;
      default:
        return Globe;
    }
  };

  return (
    <motion.div
      layout
      className={`bg-[#0B111E]/90 backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.3)] p-4 sm:p-5 transition-all duration-200 ${
        isExpanded ? 'ring-1 ring-brand-mint/30 shadow-[0_0_25px_rgba(0,255,180,0.06)]' : ''
      }`}
    >
      <div className="flex gap-3 sm:gap-4">
        {/* User Avatar */}
        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#0E1726] border border-white/[0.1] shrink-0 overflow-hidden flex items-center justify-center">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs font-bold text-brand-mint">{userInitials}</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Audience Selector */}
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-3 relative"
            >
              <button
                type="button"
                onClick={() => setShowAudienceMenu(!showAudienceMenu)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-xs font-medium text-text-muted transition-colors border border-white/[0.08] cursor-pointer"
              >
                {React.createElement(getAudienceIcon(audience), {
                  className: 'w-3.5 h-3.5 text-brand-mint',
                })}
                <span className="capitalize">{audience.toLowerCase()}</span>
                <ChevronDown className="w-3 h-3 ml-0.5" />
              </button>

              <AnimatePresence>
                {showAudienceMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute top-full left-0 mt-2 w-48 rounded-xl bg-[#0E1726] border border-white/[0.1] shadow-2xl z-20 py-1 overflow-hidden"
                  >
                    {[
                      {
                        id: 'PUBLIC',
                        label: 'Anyone',
                        icon: Globe,
                        desc: 'Visible to entire community',
                      },
                      {
                        id: 'COURSE',
                        label: 'Course Members',
                        icon: Users,
                        desc: 'Visible to enrolled peers',
                      },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setAudience(opt.id);
                          setShowAudienceMenu(false);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-white/[0.06] transition-colors flex items-start gap-2.5 cursor-pointer"
                      >
                        <opt.icon className="w-4 h-4 text-text-muted mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-white">{opt.label}</p>
                          <p className="text-[10px] text-text-muted">{opt.desc}</p>
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Text Area */}
          <textarea
            id="composer-textarea"
            data-testid="composer-textarea"
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onFocus={() => setIsExpanded(true)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder={
              isExpanded
                ? "What's on your mind? Share an insight, project update, or ask a question..."
                : "Share an update with the Zeitnah community..."
            }
            className="w-full bg-transparent border-none text-sm sm:text-[15px] text-white placeholder-text-faint focus:outline-none resize-none min-h-[44px] leading-relaxed"
            rows={isExpanded ? 3 : 1}
          />

          {/* Upload Preview Grid */}
          {attachedFiles.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
              {attachedFiles.map((file, idx) => (
                <div
                  key={idx}
                  className="relative rounded-xl overflow-hidden border border-white/[0.1] aspect-video bg-[#0E1726] flex items-center justify-center group"
                >
                  {file.type === 'video' ? (
                    <video src={file.url} className="w-full h-full object-cover" />
                  ) : (
                    <img src={file.url} alt="Attached" className="w-full h-full object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 text-white hover:bg-rose-600 transition-colors cursor-pointer"
                    aria-label="Remove attachment"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload Progress Bar */}
          {isUploading && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-[11px] text-text-muted mb-1">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin text-brand-mint" />
                  Uploading media...
                </span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-1 w-full bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-mint transition-all duration-150"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Tags Display */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 text-xs font-medium text-brand-mint bg-brand-mint/10 px-2 py-0.5 rounded-full"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="hover:text-rose-400 p-0.5 cursor-pointer"
                    aria-label={`Remove tag ${tag}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Inline Tag Input */}
          {showTagInput && (
            <div className="flex items-center gap-2 mt-3">
              <input
                ref={tagInputRef}
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="tag name (press Enter)"
                className="bg-white/[0.04] border border-white/[0.1] rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-brand-mint"
                autoFocus
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-2.5 py-1 bg-brand-mint text-bg-base rounded-lg text-xs font-semibold"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setShowTagInput(false)}
                className="text-text-muted hover:text-white text-xs"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Action Row */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.06] gap-2 flex-wrap">
            <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleFileSelect}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="p-2 text-text-muted hover:text-brand-mint hover:bg-white/[0.04] rounded-lg transition-colors cursor-pointer"
                title="Add Image or Video"
                aria-label="Add Image or Video"
              >
                <Image className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setShowTagInput(!showTagInput)}
                className="p-2 text-text-muted hover:text-brand-mint hover:bg-white/[0.04] rounded-lg transition-colors cursor-pointer"
                title="Add Tag"
                aria-label="Add Tag"
              >
                <Hash className="w-4 h-4" />
              </button>

              {content.trim().length > 10 && (
                <>
                  <button
                    type="button"
                    onClick={handleImprove}
                    disabled={improveMutation.isPending}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs text-brand-mint bg-brand-mint/10 hover:bg-brand-mint/20 rounded-lg transition-colors cursor-pointer"
                    title="Improve with AI"
                  >
                    {improveMutation.isPending ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3" />
                    )}
                    <span className="hidden sm:inline">Enhance</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSuggestTags}
                    disabled={suggestTagsMutation.isPending}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs text-text-muted hover:text-white hover:bg-white/[0.04] rounded-lg transition-colors cursor-pointer"
                    title="Suggest tags"
                  >
                    <span className="hidden sm:inline">Suggest Tags</span>
                  </button>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isExpanded && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-3 py-1.5 text-xs font-semibold text-text-muted hover:text-white hover:bg-white/[0.04] rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              )}

              <button
                id="composer-submit-btn"
                data-testid="composer-submit-btn"
                type="button"
                onClick={handleSubmit}
                disabled={
                  (!content.trim() && attachedFiles.length === 0) ||
                  createPostMutation.isPending ||
                  isUploading
                }
                className="flex items-center gap-1.5 px-4 py-2 bg-brand-mint text-bg-base rounded-xl text-xs font-bold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm cursor-pointer"
              >
                {createPostMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Post</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
