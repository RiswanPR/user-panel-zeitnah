import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, MoreHorizontal, Bookmark, Heart, Flame, Star, Lightbulb, Repeat } from 'lucide-react';
import Badge from '../ui/Badge';

const reactions = [
  { id: 'like', icon: Heart, label: 'Like', color: 'text-danger' },
  { id: 'love', icon: Flame, label: 'Love', color: 'text-warning' },
  { id: 'celebrate', icon: Star, label: 'Celebrate', color: 'text-brand-yellow' },
  { id: 'insightful', icon: Lightbulb, label: 'Insightful', color: 'text-brand-mint' },
];

export default function PostCard({ post }) {
  const [isLiked, setIsLiked] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [selectedReaction, setSelectedReaction] = useState(null);

  // Fallback for mocked data
  const p = post || {
    id: 1,
    author: { name: 'Alex Developer', role: 'Mentor', avatar: 'https://i.pravatar.cc/150?img=12' },
    content: 'Just released a new lecture on Server Actions in Next.js 14! This completely changes how we handle data mutations without needing dedicated API routes. Check it out in the course module. 🚀',
    createdAt: new Date(new Date().getTime() - 1000 * 60 * 120),
    stats: { likes: 24, comments: 8, shares: 2 },
    tags: ['NextJS', 'Course Update'],
  };

  const handleReact = (reactionId) => {
    setSelectedReaction(reactionId);
    setIsLiked(true);
    setShowReactionPicker(false);
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
        <div className="flex items-center gap-3 cursor-pointer">
          <div className="relative">
            <div className="w-11 h-11 rounded-full bg-brand-mint/20 overflow-hidden border border-border-accent">
              <img src={p.author.avatar} alt={p.author.name} className="w-full h-full object-cover" />
            </div>
          </div>
          <div>
            <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5 group-hover:text-brand-mint transition-colors">
              {p.author.name}
              {p.author.role === 'Mentor' && (
                <Badge variant="yellow" size="sm">Mentor</Badge>
              )}
            </h4>
            <p className="text-xs text-text-muted mt-0.5">
              2 hours ago • Public
            </p>
          </div>
        </div>
        <button className="p-1.5 text-text-faint hover:text-white hover:bg-white/[0.05] rounded-full transition-colors cursor-pointer">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="mb-4">
        <p className="text-sm sm:text-[15px] text-text-secondary leading-relaxed whitespace-pre-wrap">
          {p.content}
        </p>
        
        {p.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {p.tags.map(tag => (
              <span key={tag} className="text-xs font-semibold text-brand-mint hover:underline cursor-pointer">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Media Placeholder (if any) */}
      {p.hasMedia && (
        <div className="rounded-xl overflow-hidden mb-4 border border-white/[0.05] bg-bg-surface aspect-video flex items-center justify-center">
          <p className="text-xs font-medium text-text-faint tracking-wider uppercase">Media Placeholder</p>
        </div>
      )}

      {/* Stats Row */}
      <div className="flex items-center justify-between text-[11px] font-medium text-text-muted pb-3 border-b border-white/[0.04] mb-2">
        <div className="flex items-center gap-1.5 cursor-pointer hover:text-text-secondary transition-colors">
           <div className="flex -space-x-1">
             <div className="w-4 h-4 rounded-full bg-danger flex items-center justify-center ring-1 ring-bg-card z-20"><Heart className="w-2.5 h-2.5 text-white fill-current" /></div>
             <div className="w-4 h-4 rounded-full bg-brand-yellow flex items-center justify-center ring-1 ring-bg-card z-10"><Star className="w-2.5 h-2.5 text-bg-base fill-current" /></div>
           </div>
           <span>{p.stats.likes + (isLiked ? 1 : 0)}</span>
        </div>
        <div className="flex gap-3">
          <span className="cursor-pointer hover:text-text-secondary transition-colors">{p.stats.comments} comments</span>
          <span className="cursor-pointer hover:text-text-secondary transition-colors">{p.stats.shares} shares</span>
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
                  setIsLiked(false);
                  setSelectedReaction(null);
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
