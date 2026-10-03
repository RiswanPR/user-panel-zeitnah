import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bookmark, Sparkles, Loader2 } from 'lucide-react';
import { useSavedPosts } from '../../hooks/useCommunity';
import PostCard from '../../components/community/feed/PostCard';
import CommentDrawer from '../../components/community/comments/CommentDrawer';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonCard } from '../../components/ui/Skeleton';
import Badge from '../../components/ui/Badge';

/**
 * SavedPostsPage — Dedicated saved content view (/community/saved).
 * Reuses PostCard, single CommentDrawer orchestration, and Zeitnah 2.0 design tokens.
 */
export default function SavedPostsPage() {
  const navigate = useNavigate();
  const [activeCommentPost, setActiveCommentPost] = useState(null);

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useSavedPosts();

  const savedPosts = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => page?.items || []);
  }, [data]);

  return (
    <div className="community-aurora-bg min-h-screen">
      <div className="max-w-[840px] mx-auto py-4 sm:py-6 px-3 sm:px-0">
      {/* Navigation Header */}
      <div className="mb-6 pb-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-3 mb-3">
          <Link
            to="/community"
            className="flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-brand-mint" />
            <span>Back to Community</span>
          </Link>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl sm:text-2xl font-bold font-heading text-white tracking-tight">
                Saved Posts
              </h1>
              <Badge variant="mint" size="sm">
                <Bookmark className="w-2.5 h-2.5 mr-0.5 fill-current" /> Saved
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-text-muted">
              Posts, discussions, and technical showcases you've saved for later.
            </p>
          </div>

          <span className="text-xs font-mono font-semibold text-text-faint px-3 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06]">
            {savedPosts.length} {savedPosts.length === 1 ? 'post' : 'posts'}
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="space-y-4 sm:space-y-5">
        {isLoading ? (
          <div className="space-y-4">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : isError ? (
          <EmptyState
            icon={Bookmark}
            title="Your saved posts couldn't be loaded"
            description="We encountered an issue retrieving your saved posts. Please check your connection and try again."
            action={() => refetch()}
            actionLabel="Try again"
          />
        ) : savedPosts.length === 0 ? (
          <EmptyState
            icon={Bookmark}
            title="Nothing saved yet"
            description="Save posts, ideas, and conversations you want to return to later."
            action={() => navigate('/community')}
            actionLabel="Explore Community"
          />
        ) : (
          savedPosts.map((post) => {
            const postId = post._id || post.id;
            return (
              <PostCard
                key={postId}
                post={post}
                onOpenComments={setActiveCommentPost}
                isActiveCommentPost={
                  activeCommentPost &&
                  (activeCommentPost._id || activeCommentPost.id) === postId
                }
              />
            );
          })
        )}

        {/* Pagination Trigger */}
        {hasNextPage && (
          <div className="pt-4 text-center">
            <button
              type="button"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="min-h-[44px] px-6 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-semibold text-white transition-colors cursor-pointer inline-flex items-center justify-center focus:outline-none focus:ring-1 focus:ring-brand-mint"
            >
              {isFetchingNextPage ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-brand-mint" />
                  <span>Loading more...</span>
                </div>
              ) : (
                'Load more saved posts'
              )}
            </button>
          </div>
        )}
      </div>

      {/* Centralized Comment Drawer */}
      <CommentDrawer
        isOpen={Boolean(activeCommentPost)}
        post={activeCommentPost}
        onClose={() => setActiveCommentPost(null)}
      />
      </div>
    </div>
  );
}
