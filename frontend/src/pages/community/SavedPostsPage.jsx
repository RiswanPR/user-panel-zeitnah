import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Bookmark,
  Loader2,
  Search,
  Film,
  FileText,
  Layers,
  Sparkles,
  Code2,
} from 'lucide-react';
import { useSavedPosts } from '../../hooks/useCommunity';
import PostCard from '../../components/community/feed/PostCard';
import CommentDrawer from '../../components/community/comments/CommentDrawer';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonCard } from '../../components/ui/Skeleton';
import Badge from '../../components/ui/Badge';

/**
 * SavedPostsPage — Phase 10 Personal Community Library (/community/saved).
 *
 * Upgraded to feel like a personal library:
 * - Real category segmentation: All, Posts, Reels, Resources
 * - In-library fast text/tag search filter
 * - Category-specific empty states
 * - Preserves existing save APIs and infinite pagination contracts
 */
export default function SavedPostsPage() {
  const navigate = useNavigate();
  const [activeCommentPost, setActiveCommentPost] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all'); // 'all' | 'posts' | 'reels' | 'resources'
  const [searchQuery, setSearchQuery] = useState('');

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useSavedPosts();

  const allSavedPosts = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => page?.items || []);
  }, [data]);

  // Compute category counts
  const counts = useMemo(() => {
    let reels = 0;
    let resources = 0;
    let standardPosts = 0;

    for (const post of allSavedPosts) {
      if (!post) continue;
      const isReel =
        post.type === 'VIDEO' ||
        (Array.isArray(post.media) && post.media.some((m) => m?.type === 'video'));

      const isResource =
        Boolean(post.poll) ||
        Boolean(post.codeSnippet) ||
        (Array.isArray(post.media) &&
          post.media.some((m) => m?.type === 'document' || m?.type === 'file')) ||
        (post.content && post.content.includes('http'));

      if (isReel) {
        reels++;
      } else if (isResource) {
        resources++;
      } else {
        standardPosts++;
      }
    }

    return {
      all: allSavedPosts.length,
      posts: standardPosts,
      reels,
      resources,
    };
  }, [allSavedPosts]);

  // Filter saved posts by category and search query
  const displayedPosts = useMemo(() => {
    let list = allSavedPosts;

    if (activeCategory === 'reels') {
      list = list.filter(
        (p) =>
          p.type === 'VIDEO' ||
          (Array.isArray(p.media) && p.media.some((m) => m?.type === 'video')),
      );
    } else if (activeCategory === 'resources') {
      list = list.filter(
        (p) =>
          Boolean(p.poll) ||
          Boolean(p.codeSnippet) ||
          (Array.isArray(p.media) &&
            p.media.some((m) => m?.type === 'document' || m?.type === 'file')) ||
          (p.content && p.content.includes('http')),
      );
    } else if (activeCategory === 'posts') {
      list = list.filter((p) => {
        const isReel =
          p.type === 'VIDEO' ||
          (Array.isArray(p.media) && p.media.some((m) => m?.type === 'video'));
        const isResource =
          Boolean(p.poll) ||
          Boolean(p.codeSnippet) ||
          (Array.isArray(p.media) &&
            p.media.some((m) => m?.type === 'document' || m?.type === 'file')) ||
          (p.content && p.content.includes('http'));
        return !isReel && !isResource;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((p) => {
        const text = String(p.content || '').toLowerCase();
        const author = String(p.author?.name || p.author?.username || '').toLowerCase();
        const tags = Array.isArray(p.tags) ? p.tags.join(' ').toLowerCase() : '';
        return text.includes(q) || author.includes(q) || tags.includes(q);
      });
    }

    return list;
  }, [allSavedPosts, activeCategory, searchQuery]);

  return (
    <div className="community-aurora-bg min-h-screen pb-16">
      <div className="max-w-[760px] mx-auto py-4 sm:py-6 px-3 sm:px-4">
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

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl sm:text-2xl font-bold font-heading text-white tracking-tight">
                  Saved Library
                </h1>
                <Badge variant="mint" size="sm">
                  <Bookmark className="w-2.5 h-2.5 mr-0.5 fill-current" /> Personal
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-text-muted">
                Your curated archive of technical ideas, reels, discussions, and resources.
              </p>
            </div>

            <span className="self-start sm:self-auto text-xs font-mono font-semibold text-text-faint px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              {allSavedPosts.length} {allSavedPosts.length === 1 ? 'item saved' : 'items saved'}
            </span>
          </div>

          {/* Search bar inside Saved */}
          {allSavedPosts.length > 0 && (
            <div className="relative mt-4">
              <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search saved bookmarks..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] focus:border-brand-mint/40 text-xs text-white placeholder-text-muted/60 focus:outline-none transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>
          )}

          {/* Library Category Tabs */}
          {allSavedPosts.length > 0 && (
            <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setActiveCategory('all')}
                className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  activeCategory === 'all'
                    ? 'bg-brand-mint text-bg-base shadow-sm'
                    : 'bg-white/[0.03] hover:bg-white/[0.07] text-text-muted hover:text-white border border-white/[0.05]'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>All</span>
                <span className="opacity-75 font-mono text-[11px]">({counts.all})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveCategory('posts')}
                className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  activeCategory === 'posts'
                    ? 'bg-brand-mint text-bg-base shadow-sm'
                    : 'bg-white/[0.03] hover:bg-white/[0.07] text-text-muted hover:text-white border border-white/[0.05]'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Posts</span>
                <span className="opacity-75 font-mono text-[11px]">({counts.posts})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveCategory('reels')}
                className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  activeCategory === 'reels'
                    ? 'bg-brand-mint text-bg-base shadow-sm'
                    : 'bg-white/[0.03] hover:bg-white/[0.07] text-text-muted hover:text-white border border-white/[0.05]'
                }`}
              >
                <Film className="w-3.5 h-3.5" />
                <span>Reels</span>
                <span className="opacity-75 font-mono text-[11px]">({counts.reels})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveCategory('resources')}
                className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  activeCategory === 'resources'
                    ? 'bg-brand-mint text-bg-base shadow-sm'
                    : 'bg-white/[0.03] hover:bg-white/[0.07] text-text-muted hover:text-white border border-white/[0.05]'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Resources</span>
                <span className="opacity-75 font-mono text-[11px]">({counts.resources})</span>
              </button>
            </div>
          )}
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
          ) : allSavedPosts.length === 0 ? (
            <EmptyState
              icon={Bookmark}
              title="Nothing saved yet"
              description="Save posts, ideas, and conversations you want to return to later in your library."
              action={() => navigate('/community')}
              actionLabel="Explore Community"
            />
          ) : displayedPosts.length === 0 ? (
            <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center space-y-2">
              <p className="text-sm text-white font-medium">No bookmarks found in this view</p>
              <p className="text-xs text-text-muted">
                {searchQuery
                  ? `No saved items match "${searchQuery}".`
                  : `You haven't bookmarked any ${activeCategory} yet.`}
              </p>
              <button
                type="button"
                onClick={() => {
                  setActiveCategory('all');
                  setSearchQuery('');
                }}
                className="mt-2 text-xs text-brand-mint hover:underline font-semibold cursor-pointer"
              >
                Reset filters
              </button>
            </div>
          ) : (
            displayedPosts.map((post) => {
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
            <div className="pt-4 flex justify-center">
              <button
                type="button"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="min-h-[44px] px-5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-xs font-semibold text-white transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {isFetchingNextPage ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-brand-mint" />
                    <span>Loading more...</span>
                  </>
                ) : (
                  <span>Load more saved items</span>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Centralized Comment Drawer */}
        {Boolean(activeCommentPost) && (
          <CommentDrawer
            isOpen={Boolean(activeCommentPost)}
            post={activeCommentPost}
            onClose={() => setActiveCommentPost(null)}
          />
        )}
      </div>
    </div>
  );
}
