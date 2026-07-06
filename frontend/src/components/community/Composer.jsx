import React, { useState, useRef, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image, Video, Send, Paperclip, Globe, Users, Lock, ChevronDown } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { getUploadUrl } from '../../utils/courseUi';
import { useMutation } from '@tanstack/react-query';

export default function Composer() {
  const { user } = useContext(AuthContext);
  const [content, setContent] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [audience, setAudience] = useState('PUBLIC');
  const [showAudienceMenu, setShowAudienceMenu] = useState(false);
  const textareaRef = useRef(null);

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

  // Handle post submission
  const createPostMutation = useMutation({
    mutationFn: async (postData) => {
      // return api.post('/community/posts', postData);
      return new Promise(resolve => setTimeout(() => resolve({ success: true, data: { ...postData, id: Date.now() } }), 800));
    },
    onSuccess: () => {
      setContent('');
      setIsExpanded(false);
      // In a real app: queryClient.invalidateQueries(['community', 'feed']);
    }
  });

  const handleSubmit = () => {
    if (!content.trim()) return;
    createPostMutation.mutate({
      content,
      audience,
      type: 'TEXT',
    });
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
            <div className="flex items-center justify-between pt-4 mt-3 border-t border-white/[0.04]">
              <div className="flex gap-1 sm:gap-2">
                <button className="p-2 text-brand-mint hover:bg-brand-mint/10 rounded-lg transition-colors cursor-pointer" title="Add Image">
                  <Image className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <button className="p-2 text-info hover:bg-info/10 rounded-lg transition-colors cursor-pointer" title="Add Video">
                  <Video className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <button className="p-2 text-warning hover:bg-warning/10 rounded-lg transition-colors cursor-pointer" title="Attach Document">
                  <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => { setIsExpanded(false); setContent(''); }}
                  className="text-xs font-semibold text-text-muted hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSubmit}
                  disabled={!content.trim() || createPostMutation.isPending}
                  className="btn-primary py-1.5 px-4 sm:py-2 sm:px-5 text-xs flex items-center gap-2 opacity-90 disabled:opacity-50 relative overflow-hidden"
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
