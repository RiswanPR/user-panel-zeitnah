import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Image,
  Send,
  Globe,
  Users,
  ChevronDown,
  X,
  Sparkles,
  Hash,
  Loader2,
} from 'lucide-react';
import BusinessLogo from '../../business/BusinessLogo';

const AUDIENCE_OPTIONS = [
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
];

/**
 * ComposerExpanded — Full expanded state for post creation
 * Includes audience selector, auto-resizing textarea, media previews,
 * upload progress, tag management, AI assist, and mobile-friendly action bar.
 * Fully supports Personal and Company active profile modes.
 */
export default function ComposerExpanded({
  avatarUrl,
  userInitials,
  content,
  setContent,
  audience,
  setAudience,
  showAudienceMenu,
  setShowAudienceMenu,
  tags,
  tagInput,
  setTagInput,
  showTagInput,
  setShowTagInput,
  handleAddTag,
  removeTag,
  attachedFiles,
  isUploading,
  uploadProgress,
  removeFile,
  handleFileSelect,
  fileInputRef,
  textareaRef,
  handleImprove,
  isImproving,
  handleSuggestTags,
  isSuggestingTags,
  handleCancel,
  handleSubmit,
  isSubmitting,
  isBusinessMode = false,
  business = null,
}) {
  const tagInputRef = useRef(null);
  const audienceMenuRef = useRef(null);

  // Focus tag input when opened
  useEffect(() => {
    if (showTagInput && tagInputRef.current) {
      tagInputRef.current.focus();
    }
  }, [showTagInput]);

  // Click outside listener for audience menu
  useEffect(() => {
    function handleClickOutside(e) {
      if (audienceMenuRef.current && !audienceMenuRef.current.contains(e.target)) {
        setShowAudienceMenu(false);
      }
    }
    if (showAudienceMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAudienceMenu, setShowAudienceMenu]);

  const CurrentAudienceIcon = audience === 'COURSE' ? Users : Globe;

  return (
    <div className="bg-surface-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl p-4 sm:p-5 transition-all">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-border mb-3.5">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-text-primary tracking-tight">
            {isBusinessMode && business ? `Publish as ${business.name}` : 'Create post'}
          </h3>
          {isBusinessMode && business && (
            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-brand-mint/15 text-brand-mint border border-brand-mint/30">
              Company
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleCancel}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-elevated transition-colors cursor-pointer"
          aria-label="Close composer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex gap-3 sm:gap-4 items-start">
        {/* User / Company Avatar */}
        {isBusinessMode && business ? (
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-surface-elevated ring-1 ring-brand-mint/30 shrink-0 overflow-hidden flex items-center justify-center">
            <BusinessLogo
              logo={business.logo}
              name={business.name}
              size="md"
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-surface-elevated ring-1 ring-border shrink-0 overflow-hidden flex items-center justify-center">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-brand-mint select-none tracking-wider">
                {userInitials}
              </span>
            )}
          </div>
        )}

        <div className="flex-1 min-w-0">
          {/* Audience Selector */}
          <div className="mb-2.5 relative" ref={audienceMenuRef}>
            <button
              type="button"
              onClick={() => setShowAudienceMenu(!showAudienceMenu)}
              className="min-h-[44px] inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-elevated hover:bg-surface-elevated/80 text-xs font-medium text-text-muted hover:text-text-primary transition-colors border border-border cursor-pointer"
              aria-label="Select post audience"
              aria-expanded={showAudienceMenu}
            >
              <CurrentAudienceIcon className="w-3.5 h-3.5 text-brand-mint" />
              <span className="capitalize">{audience === 'COURSE' ? 'Course Members' : 'Anyone'}</span>
              <ChevronDown className="w-3 h-3 ml-0.5 opacity-70" />
            </button>

            <AnimatePresence>
              {showAudienceMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ duration: 0.12 }}
                  className="absolute top-full left-0 mt-2 w-52 rounded-xl bg-surface-card border border-border shadow-2xl z-30 py-1 overflow-hidden"
                >
                  {AUDIENCE_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setAudience(opt.id);
                        setShowAudienceMenu(false);
                      }}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-surface-elevated transition-colors flex items-start gap-2.5 cursor-pointer min-h-[44px]"
                    >
                      <opt.icon className="w-4 h-4 text-brand-mint mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-text-primary">{opt.label}</p>
                        <p className="text-[10px] text-text-muted mt-0.5">{opt.desc}</p>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Text Area */}
          <textarea
            id="composer-textarea"
            data-testid="composer-textarea"
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder={
              isBusinessMode && business
                ? `What would ${business.name} like to share? Announcements, insights, or updates...`
                : "What's happening? Share insights, questions, or showcases..."
            }
            className="w-full bg-transparent border-none text-sm sm:text-[15px] text-text-primary placeholder-text-faint focus:outline-none resize-none min-h-[90px] leading-relaxed"
            rows={3}
            autoFocus
          />

          {/* Upload Preview Grid */}
          {attachedFiles.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 mb-3">
              {attachedFiles.map((file, idx) => (
                <div
                  key={idx}
                  className="relative rounded-xl overflow-hidden border border-border aspect-video bg-surface-elevated flex items-center justify-center group"
                >
                  {file.type === 'video' ? (
                    <video src={file.url} className="w-full h-full object-cover" />
                  ) : (
                    <img src={file.url} alt="Attachment preview" className="w-full h-full object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    className="min-h-[44px] min-w-[44px] absolute top-1.5 right-1.5 p-1 rounded-full bg-black/70 text-white hover:bg-rose-600 transition-colors cursor-pointer flex items-center justify-center"
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
            <div className="mt-2 mb-3">
              <div className="flex items-center justify-between text-[11px] text-text-muted mb-1">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin text-brand-mint" />
                  Uploading media...
                </span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-1.5 w-full bg-surface-elevated border border-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-mint transition-all duration-150"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Tags Display */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2 mb-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 text-xs font-medium text-brand-mint bg-brand-mint/10 border border-brand-mint/20 px-2 py-0.5 rounded-full"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="hover:text-rose-400 p-0.5 cursor-pointer min-h-[32px] inline-flex items-center"
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
            <div className="flex items-center gap-2 mt-2 mb-3">
              <input
                ref={tagInputRef}
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  } else if (e.key === 'Escape') {
                    setShowTagInput(false);
                  }
                }}
                placeholder="tag name (press Enter)"
                className="bg-surface-elevated border border-border rounded-lg px-2.5 py-1 text-xs text-text-primary focus:outline-none focus:border-brand-mint min-h-[44px]"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="min-h-[44px] px-3.5 py-1 bg-brand-mint text-bg-base rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer inline-flex items-center justify-center"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setShowTagInput(false)}
                className="min-h-[44px] text-text-muted hover:text-text-primary text-xs cursor-pointer inline-flex items-center"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Bottom Action Row */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border gap-2 flex-wrap">
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
                className="min-h-[44px] min-w-[44px] p-2 text-text-muted hover:text-brand-mint hover:bg-surface-elevated rounded-lg transition-colors cursor-pointer flex items-center justify-center"
                title="Add Image or Video"
                aria-label="Add Image or Video"
              >
                <Image className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setShowTagInput(!showTagInput)}
                className="min-h-[44px] min-w-[44px] p-2 text-text-muted hover:text-brand-mint hover:bg-surface-elevated rounded-lg transition-colors cursor-pointer flex items-center justify-center"
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
                    disabled={isImproving}
                    className="min-h-[44px] flex items-center gap-1 px-2.5 py-1 text-xs text-brand-mint bg-brand-mint/10 hover:bg-brand-mint/20 rounded-lg transition-colors cursor-pointer border border-brand-mint/20"
                    title="Improve with AI"
                  >
                    {isImproving ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    <span className="hidden sm:inline font-medium">Enhance</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSuggestTags}
                    disabled={isSuggestingTags}
                    className="min-h-[44px] flex items-center gap-1 px-2.5 py-1 text-xs text-text-muted hover:text-text-primary hover:bg-surface-elevated rounded-lg transition-colors cursor-pointer"
                    title="Suggest tags"
                  >
                    <span className="hidden sm:inline font-medium">Suggest Tags</span>
                  </button>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCancel}
                className="min-h-[44px] px-3.5 py-1.5 text-xs font-semibold text-text-muted hover:text-text-primary hover:bg-surface-elevated rounded-xl transition-colors cursor-pointer inline-flex items-center"
              >
                Cancel
              </button>

              <button
                id="composer-submit-btn"
                data-testid="composer-submit-btn"
                type="button"
                onClick={handleSubmit}
                disabled={
                  (!content.trim() && attachedFiles.length === 0) ||
                  isSubmitting ||
                  isUploading
                }
                className="min-h-[44px] flex items-center gap-1.5 px-4 py-2 bg-brand-mint text-bg-base rounded-xl text-xs font-bold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm cursor-pointer"
              >
                {isSubmitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
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
    </div>
  );
}
