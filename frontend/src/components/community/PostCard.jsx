import React, { useState, useContext, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, MoreHorizontal, Bookmark, Heart, Flame, Star, Lightbulb, Repeat, Trash2, Sparkles, Check } from 'lucide-react';
import Badge from '../ui/Badge';
import { AuthContext } from '../../context/AuthContext';
import { useReactToPost, useDeletePost } from '../../hooks/useCommunity';
import toast from 'react-hot-toast';

const reactions = [
  { id: 'like', icon: Heart, label: 'Like', color: 'text-danger' },
  { id: 'love', icon: Flame, label: 'Love', color: 'text-warning' },
  { id: 'celebrate', icon: Star, label: 'Celebrate', color: 'text-brand-yellow' },
  { id: 'insightful', icon: Lightbulb, label: 'Insightful', color: 'text-brand-mint' },
];

function PostCard({ post }) {
  const { user } = useContext(AuthContext);
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  const reactMutation = useReactToPost();
  const deleteMutation = useDeletePost();

  const postId = post._id || post.id;
  const isOwner = user?._id === post.author?._id;
  const isLiked = post.isLikedByMe; 
  const selectedReaction = post.myReactionType || (isLiked ? 'like' : null);

  const handleReact = (reactionId) => {
    setShowReactionPicker(false);
    reactMutation.mutate({ postId, type: reactionId });
  };

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this post?")) {
      deleteMutation.mutate(postId);
    }
  };

  const ActiveReactionIcon = selectedReaction 
    ? reactions.find(r => r.id === selectedReaction)?.icon 
    : Heart;

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-5 sm:p-6 mb-4 group overflow-hidden"
    >
      <div className="gradient-line-top" />
      
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <img 
            src={post.author?.avatar || "https://i.pravatar.cc/150"} 
            alt="Author" 
            className="w-10 h-10 rounded-full border border-white/[0.05]"
          />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[15px] font-bold text-white hover:underline cursor-pointer">
                {post.author?.name || 'Unknown User'}
              </h3>
              {post.author?.role === 'Mentor' && (
                <Badge variant="primary" className="text-[9px] py-0 px-1.5 h-4">Mentor</Badge>
              )}
              {post.author?.rank && (
                <Badge variant="warning" className="text-[9px] py-0 px-1.5 h-4">{post.author.rank} Lvl {post.author.level}</Badge>
              )}
              {post.acceptedAnswerId && (
                <div className="bg-brand-mint/20 text-brand-mint px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider flex items-center gap-0.5">
                  <Check className="w-3 h-3" /> Answered
                </div>
              )}
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              {new Date(post.createdAt).toLocaleDateString()} • {post.audience === 'PUBLIC' ? 'Public' : post.audience}
            </p>
          </div>
        </div>
        <div className="relative group/menu">
          <button className="p-1.5 text-text-faint hover:text-white hover:bg-white/[0.05] rounded-full transition-colors cursor-pointer">
            <MoreHorizontal className="w-5 h-5" />
          </button>
          
          <div className="absolute right-0 top-full mt-1 w-32 bg-bg-surface border border-white/[0.05] rounded-xl shadow-2xl opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-20 overflow-hidden">
            <button 
              onClick={() => {
                const reason = window.prompt("Reason for reporting:");
                if (reason) {
                  // Connect to an API endpoint in the future, toast for now as this requires a specific reportMutation hook
                  toast.success("Report submitted.");
                }
              }}
              className="w-full text-left px-4 py-2 text-xs font-semibold text-text-muted hover:text-white hover:bg-white/[0.04] transition-colors"
            >
              Report Post
            </button>
            {isOwner && (
              <>
                <div className="h-px w-full bg-white/[0.04]" />
                <button 
                  onClick={handleDelete}
                  className="w-full text-left px-4 py-2 text-xs font-semibold text-danger hover:bg-danger/10 transition-colors flex items-center justify-between"
                >
                  Delete
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mb-4 relative">
        {post.isLocked && (
          <div className="absolute -left-4 top-0 bottom-0 w-1 bg-warning rounded-r-md"></div>
        )}
        
        {post.aiSummary && (
          <div className="mb-3 p-3 bg-brand-purple/10 border border-brand-purple/20 rounded-xl">
            <div className="flex items-center gap-1.5 mb-1 text-brand-purple">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">AI Summary</span>
            </div>
            <p className="text-sm text-brand-purple/90">{post.aiSummary}</p>
          </div>
        )}

        <p className="text-sm sm:text-[15px] text-text-secondary leading-relaxed whitespace-pre-wrap">
          {post.content}
        </p>
        
        {post.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {post.tags.map((tag, idx) => (
              <span key={idx} className="text-xs font-semibold text-brand-mint hover:underline cursor-pointer">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Media Rendering */}
      {post.media?.length > 0 && (
        <div className={`grid gap-2 mb-4 ${post.media.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {post.media.map((item, idx) => (
            <div key={idx} className="rounded-xl overflow-hidden border border-white/[0.05] bg-bg-surface aspect-video flex items-center justify-center">
              {item.type === 'image' ? (
                <img src={item.url} alt="Post media" className="w-full h-full object-cover" />
              ) : (
                <video src={item.url} controls className="w-full h-full object-cover bg-black" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Stats Row */}
      <div className="flex items-center justify-between text-[11px] font-medium text-text-muted pb-3 border-b border-white/[0.04] mb-2">
        <div className="flex items-center gap-1.5 cursor-pointer hover:text-text-secondary transition-colors">
           <div className="flex -space-x-1">
             <div className="w-4 h-4 rounded-full bg-danger flex items-center justify-center ring-1 ring-bg-card z-20"><Heart className="w-2.5 h-2.5 text-white fill-current" /></div>
             <div className="w-4 h-4 rounded-full bg-brand-yellow flex items-center justify-center ring-1 ring-bg-card z-10"><Star className="w-2.5 h-2.5 text-bg-base fill-current" /></div>
           </div>
           <span>{post.stats?.likes || 0}</span>
        </div>
        <div className="flex gap-3">
          <span className="cursor-pointer hover:text-text-secondary transition-colors">{post.stats?.comments || 0} comments</span>
          <span className="cursor-pointer hover:text-text-secondary transition-colors">{post.stats?.shares || 0} shares</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-1 relative">
        <div className="flex items-center gap-1 sm:gap-2">
          
          {/* Reaction Button with Hover Picker */}
          <div 
            className="relative"
            onMouseEnter={() => setShowReactionPicker(true)}
            onMouseLeave={() => setShowReactionPicker(false)}
          >
            <AnimatePresence>
              {showReactionPicker && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.9 }}
                  className="absolute bottom-full left-0 mb-2 bg-bg-surface border border-border-default rounded-full shadow-2xl p-1.5 flex items-center gap-1 z-30"
                >
                  {reactions.map(r => (
                    <button
                      key={r.id}
                      onClick={() => handleReact(r.id)}
                      className={`p-2 rounded-full hover:bg-white/[0.05] transition-all transform hover:scale-125 cursor-pointer ${r.color}`}
                      title={r.label}
                    >
                      <r.icon className="w-5 h-5 fill-current" />
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <button 
              onClick={() => {
                if (isLiked) {
                  // In a real app we'd have removeReaction. For now just toggle like/none
                  reactMutation.mutate({ postId, type: 'like' }); 
                } else {
                  handleReact('like');
                }
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                isLiked ? 'text-danger bg-danger/10' : 'text-text-muted hover:bg-white/[0.04] hover:text-white'
              }`}
            >
              <ActiveReactionIcon className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
              <span className="hidden sm:inline">{selectedReaction ? reactions.find(r => r.id === selectedReaction)?.label : 'Like'}</span>
            </button>
          </div>

          <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-text-muted hover:bg-white/[0.04] hover:text-white transition-colors cursor-pointer">
            <MessageCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Comment</span>
          </button>
          <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-text-muted hover:bg-white/[0.04] hover:text-white transition-colors cursor-pointer">
            <Repeat className="w-4 h-4" />
            <span className="hidden sm:inline">Repost</span>
          </button>
        </div>
        
        <button className="p-2 rounded-lg text-text-muted hover:bg-white/[0.04] hover:text-brand-yellow transition-colors cursor-pointer">
          <Bookmark className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

export default React.memo(PostCard, (prevProps, nextProps) => {
  return (
    prevProps.post.stats?.likes === nextProps.post.stats?.likes &&
    prevProps.post.stats?.comments === nextProps.post.stats?.comments &&
    prevProps.post.isLocked === nextProps.post.isLocked &&
    prevProps.post.acceptedAnswerId === nextProps.post.acceptedAnswerId &&
    prevProps.post.content === nextProps.post.content &&
    prevProps.post.aiSummary === nextProps.post.aiSummary
  );
});
