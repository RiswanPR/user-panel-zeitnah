import React, { useState, useRef, useEffect, useContext, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image, Video, Send, Globe, Users, Lock, ChevronDown, X, Sparkles, Hash } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { getUploadUrl } from '../../utils/courseUi';
import { useCreatePost, useAIImproveText, useAISuggestTags } from '../../hooks/useCommunity';
import { communityApi } from '../../services/communityApi';
import toast from 'react-hot-toast';

export default function Composer() {
  const { user } = useContext(AuthContext);
  const [content, setContent] = useState('');
  const [tags, setTags] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);
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
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "Z";
  const avatarUrl = user?.avatar ? getUploadUrl(user.avatar) : null;

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 300)}px`;
    }
  }, [content]);

  const handleFileSelect = useCallback(async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    setIsUploading(true);
    setUploadProgress(0);
    try {
      const uploadedMedia = [];
      for (const file of files) {
        // Upload each file via API
        const response = await communityApi.uploadMedia(file, (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        });
        
        uploadedMedia.push({
          url: response.url,
          type: file.type.startsWith('video/') ? 'video' : 'image',
          mimeType: file.type,
          size: file.size,
        });
      }
      setAttachedFiles((prev) => [...prev, ...uploadedMedia]);
    } catch {
      toast.error('Failed to upload file');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, []);

  const removeFile = useCallback((index) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleImprove = useCallback(() => {
    if (!content.trim()) return;
    improveMutation.mutate(content, {
      onSuccess: (data) => setContent(data.improved)
    });
  }, [content, improveMutation]);

  const handleSuggestTags = useCallback(() => {
    if (!content.trim()) return;
    suggestTagsMutation.mutate(content, {
      onSuccess: (data) => {
        const newTags = data.tags.filter(t => !tags.includes(t));
        setTags(prev => [...prev, ...newTags]);
      }
    });
  }, [content, tags, suggestTagsMutation]);

  const removeTag = useCallback((tagToRemove) => {
    setTags(prev => prev.filter(t => t !== tagToRemove));
  }, []);

  const handleSubmit = () => {
    if (!content.trim() && attachedFiles.length === 0) return;
    createPostMutation.mutate(
      {
        content,
        audience,
        type: 'TEXT',
        media: attachedFiles,
        tags,
      },
      {
        onSuccess: () => {
          setContent('');
          setTags([]);
          setIsExpanded(false);
          setAttachedFiles([]);
        },
      }
    );
  };

  const getAudienceIcon = (type) => {
    switch(type) {
      case 'PUBLIC': return Globe;
      case 'COURSE': return Users;
      case 'PRIVATE': return Lock;
      default: return Globe;
    }
  };



  return (
    <motion.div 
      layout
      className={`glass-card p-4 sm:p-5 transition-all duration-300 ${isExpanded ? 'ring-1 ring-brand-mint/30 shadow-glow-mint' : ''}`}
    >
      <div className="flex gap-3 sm:gap-4">
        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-brand-mint/20 shrink-0 overflow-hidden border border-brand-mint/30">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-brand-mint">
              {userInitials}
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          {isExpanded && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-3 relative">
              <button 
                onClick={() => setShowAudienceMenu(!showAudienceMenu)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-xs font-medium text-text-muted transition-colors border border-white/[0.06]"
              >
                {React.createElement(getAudienceIcon(audience), { className: "w-3.5 h-3.5" })}
                <span className="capitalize">{audience.toLowerCase()}</span>
                <ChevronDown className="w-3 h-3 ml-0.5" />
              </button>

              <AnimatePresence>
                {showAudienceMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute top-full left-0 mt-2 w-48 rounded-xl bg-bg-surface border border-border-default shadow-2xl z-20 py-1 overflow-hidden"
                  >
                    {[
                      { id: 'PUBLIC', label: 'Anyone', icon: Globe, desc: 'Visible to entire community' },
                      { id: 'COURSE', label: 'Course Members', icon: Users, desc: 'Visible to course students' },
                      { id: 'PRIVATE', label: 'Mentors Only', icon: Lock, desc: 'Visible to your mentors' },
                    ].map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => { setAudience(opt.id); setShowAudienceMenu(false); }}
                        className="w-full text-left px-3 py-2 hover:bg-white/[0.04] transition-colors flex items-start gap-2.5"
                      >
                        <opt.icon className="w-4 h-4 text-text-muted mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-white">{opt.label}</p>
                          <p className="text-[10px] text-text-muted">{opt.desc}</p>
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onFocus={() => setIsExpanded(true)}
            placeholder="Share your learning progress, ask a question, or post a resource..."
            className="w-full bg-transparent resize-none outline-none text-white placeholder-text-faint sm:text-base font-medium mt-1 min-h-[24px]"
            rows={isExpanded ? 3 : 1}
          />
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            {/* Attached Files Preview */}
            {attachedFiles.length > 0 && (
              <div className="flex gap-3 mt-3 overflow-x-auto pb-2">
                {attachedFiles.map((file, i) => (
                  <div key={i} className="relative w-20 h-20 shrink-0 rounded-lg overflow-hidden bg-bg-base border border-white/[0.05]">
                    {file.type === 'image' ? (
                      <img src={file.url} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-black">
                        <Video className="w-6 h-6 text-white/50" />
                      </div>
                    )}
                    <button 
                      onClick={() => removeFile(i)}
                      className="absolute top-1 right-1 p-1 bg-black/60 rounded-full hover:bg-danger text-white transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {/* Upload Progress */}
            {isUploading && (
              <div className="mt-3">
                <div className="h-1 w-full bg-white/[0.05] rounded-full overflow-hidden">
                  <div className="h-full bg-brand-mint transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                </div>
                <p className="text-[10px] text-text-faint mt-1 text-right">Uploading... {uploadProgress}%</p>
              </div>
            )}

            {/* Tags Preview */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-white/[0.04]">
                {tags.map((tag, i) => (
                  <span key={i} className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-brand-mint/10 text-brand-mint text-xs font-semibold">
                    <Hash className="w-3 h-3" />
                    {tag}
                    <button onClick={() => removeTag(tag)} className="hover:text-white transition-colors cursor-pointer ml-1">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-4 mt-3 border-t border-white/[0.04] gap-4">
              <div className="flex items-center gap-1 sm:gap-2 relative">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileSelect} 
                  className="hidden" 
                  multiple 
                  accept="image/*,video/*" 
                />
                <button onClick={() => fileInputRef.current?.click()} className="p-2 text-brand-mint hover:bg-brand-mint/10 rounded-lg transition-colors cursor-pointer" title="Add Media">
                  <Image className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                
                {/* AI Tools */}
                <div className="h-6 w-px bg-white/[0.1] mx-1"></div>
                <button 
                  onClick={handleImprove}
                  disabled={improveMutation.isPending || !content.trim()}
                  className="p-2 flex items-center gap-1.5 text-brand-purple hover:bg-brand-purple/10 rounded-lg transition-colors cursor-pointer disabled:opacity-50 text-xs font-medium" 
                  title="Improve Writing with AI"
                >
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="hidden md:inline">Improve</span>
                </button>
                <button 
                  onClick={handleSuggestTags}
                  disabled={suggestTagsMutation.isPending || !content.trim()}
                  className="p-2 flex items-center gap-1.5 text-info hover:bg-info/10 rounded-lg transition-colors cursor-pointer disabled:opacity-50 text-xs font-medium" 
                  title="Suggest Tags with AI"
                >
                  <Hash className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="hidden md:inline">Auto-tag</span>
                </button>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => { setIsExpanded(false); setContent(''); setAttachedFiles([]); setTags([]); }}
                  className="text-xs font-semibold text-text-muted hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSubmit}
                  disabled={(!content.trim() && attachedFiles.length === 0) || createPostMutation.isPending || isUploading}
                  className="btn-primary py-1.5 px-4 sm:py-2 sm:px-5 text-xs flex items-center gap-2 opacity-90 disabled:opacity-50 relative overflow-hidden cursor-pointer"
                >
                  {createPostMutation.isPending ? (
                     <div className="w-4 h-4 border-2 border-bg-base/30 border-t-bg-base rounded-full animate-spin" />
                  ) : (
                    <>Post <Send className="w-3 h-3" /></>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
