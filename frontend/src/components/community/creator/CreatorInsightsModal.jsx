import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  TrendingUp,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Users,
  Film,
  Sparkles,
  BarChart2,
  Calendar,
} from 'lucide-react';
import { useCreatorInsights } from '../../../hooks/useCommunity';
import Badge from '../../ui/Badge';
import { formatRelativeTime } from '../../../utils/communityFormatters';

/**
 * CreatorInsightsModal — Phase 14 Creator Insights Foundation.
 *
 * Provides genuine, server-backed analytics for creators:
 * Views, Likes, Comments, Shares, Followers, and Top Content.
 * Zero fabricated numbers, zero artificial vanity metrics.
 */
export default function CreatorInsightsModal({ isOpen, onClose }) {
  const modalRef = useRef(null);
  const { data, isLoading, isError, refetch } = useCreatorInsights();

  // Escape key closes modal
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const overview = data?.overview || {
    totalPosts: 0,
    totalReels: 0,
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0,
    totalShares: 0,
    totalReposts: 0,
    totalFollowers: 0,
  };

  const topPosts = data?.topPosts || [];

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md"
        role="dialog"
        aria-modal="true"
        aria-labelledby="creator-insights-title"
      >
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="w-full max-w-xl bg-[#090E1A] border border-white/[0.08] rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/[0.06] bg-white/[0.01]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-brand-mint/10 border border-brand-mint/20 flex items-center justify-center text-brand-mint">
                <BarChart2 className="w-5 h-5" />
              </div>
              <div>
                <h2
                  id="creator-insights-title"
                  className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2"
                >
                  Creator Insights
                  <Badge variant="mint" size="sm">Verified</Badge>
                </h2>
                <p className="text-xs text-text-muted">
                  Performance across your community contributions
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] min-w-[44px] p-2 text-text-muted hover:text-white rounded-xl hover:bg-white/[0.06] transition-colors flex items-center justify-center cursor-pointer"
              aria-label="Close Creator Insights"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
            {isLoading ? (
              <div className="space-y-4 py-8 text-center">
                <div className="w-8 h-8 rounded-full border-2 border-brand-mint border-t-transparent animate-spin mx-auto mb-2" />
                <p className="text-xs text-text-muted">Compiling your creator analytics...</p>
              </div>
            ) : isError ? (
              <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center space-y-3">
                <p className="text-xs text-rose-300">Unable to load insights right now.</p>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="min-h-[44px] min-w-[44px] px-4 py-2 bg-white/[0.08] hover:bg-white/[0.14] text-xs font-semibold text-white rounded-xl transition-colors cursor-pointer"
                >
                  Try Again
                </button>
              </div>
            ) : (
              <>
                {/* Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                  {/* Views */}
                  <div className="p-3 sm:p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.1] transition-all">
                    <div className="flex items-center gap-1.5 text-text-muted text-xs mb-1">
                      <Eye className="w-3.5 h-3.5 text-brand-mint" />
                      <span>Total Views</span>
                    </div>
                    <p className="text-lg sm:text-xl font-bold font-mono text-white tracking-tight">
                      {overview.totalViews.toLocaleString()}
                    </p>
                  </div>

                  {/* Likes / Reactions */}
                  <div className="p-3 sm:p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.1] transition-all">
                    <div className="flex items-center gap-1.5 text-text-muted text-xs mb-1">
                      <Heart className="w-3.5 h-3.5 text-rose-400" />
                      <span>Reactions</span>
                    </div>
                    <p className="text-lg sm:text-xl font-bold font-mono text-white tracking-tight">
                      {overview.totalLikes.toLocaleString()}
                    </p>
                  </div>

                  {/* Comments */}
                  <div className="p-3 sm:p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.1] transition-all">
                    <div className="flex items-center gap-1.5 text-text-muted text-xs mb-1">
                      <MessageCircle className="w-3.5 h-3.5 text-brand-yellow" />
                      <span>Comments</span>
                    </div>
                    <p className="text-lg sm:text-xl font-bold font-mono text-white tracking-tight">
                      {overview.totalComments.toLocaleString()}
                    </p>
                  </div>

                  {/* Followers */}
                  <div className="p-3 sm:p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.1] transition-all">
                    <div className="flex items-center gap-1.5 text-text-muted text-xs mb-1">
                      <Users className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Connections</span>
                    </div>
                    <p className="text-lg sm:text-xl font-bold font-mono text-white tracking-tight">
                      {overview.totalFollowers.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Secondary breakdown: Content types */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] text-xs">
                  <span className="text-text-muted">Content Library:</span>
                  <div className="flex items-center gap-3">
                    <span className="text-white font-medium">
                      <strong>{overview.totalPosts}</strong> {overview.totalPosts === 1 ? 'post' : 'posts'}
                    </span>
                    <span className="text-white/20">·</span>
                    <span className="text-white font-medium flex items-center gap-1">
                      <Film className="w-3 h-3 text-brand-mint" />
                      <strong>{overview.totalReels}</strong> {overview.totalReels === 1 ? 'reel' : 'reels'}
                    </span>
                    <span className="text-white/20">·</span>
                    <span className="text-white font-medium flex items-center gap-1">
                      <Share2 className="w-3 h-3 text-brand-yellow" />
                      <strong>{overview.totalShares + overview.totalReposts}</strong> shares
                    </span>
                  </div>
                </div>

                {/* Top Performing Contributions */}
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-brand-mint" />
                    Top Performing Content
                  </h3>

                  {topPosts.length === 0 ? (
                    <div className="p-6 rounded-xl bg-white/[0.01] border border-white/[0.04] text-center text-xs text-text-muted">
                      No posts published yet. Share an idea or reel to start seeing your reach!
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {topPosts.map((post) => {
                        const views = post?.stats?.views || 0;
                        const likes = post?.stats?.likes || 0;
                        const comments = post?.stats?.comments || 0;
                        const isVideo =
                          post?.type === 'VIDEO' ||
                          (Array.isArray(post?.media) && post?.media.some((m) => m?.type === 'video'));

                        return (
                          <div
                            key={post._id}
                            className="p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.05] transition-all flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-white font-medium line-clamp-1">
                                {post.content || (isVideo ? 'Vertical Reel' : 'Shared media')}
                              </p>
                              <div className="flex items-center gap-2 mt-1 text-[11px] text-text-muted font-normal">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {formatRelativeTime(post.createdAt)}
                                </span>
                                {isVideo && (
                                  <span className="text-brand-mint font-semibold flex items-center gap-0.5">
                                    <Film className="w-2.5 h-2.5" /> Reel
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0 font-mono text-[11px]">
                              <span className="flex items-center gap-1 text-white">
                                <Eye className="w-3 h-3 text-text-muted" />
                                {views.toLocaleString()}
                              </span>
                              <span className="flex items-center gap-1 text-rose-300">
                                <Heart className="w-3 h-3 text-rose-400" />
                                {likes.toLocaleString()}
                              </span>
                              <span className="flex items-center gap-1 text-brand-yellow">
                                <MessageCircle className="w-3 h-3 text-brand-yellow" />
                                {comments.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
