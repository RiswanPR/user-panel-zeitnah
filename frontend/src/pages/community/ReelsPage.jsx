import { useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { communityApi } from '../../services/communityApi';
import { useCommunityVideoFeed } from '../../hooks/useCommunity';
import ReelsViewer from '../../components/community/reels/ReelsViewer';

const ReelPageLoader = () => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
    <div className="relative">
      <div className="w-10 h-10 rounded-full border-2 border-white/[0.06]" />
      <div className="absolute inset-0 w-10 h-10 rounded-full border-2 border-transparent border-t-brand-mint animate-spin" />
    </div>
    <span className="text-xs text-text-muted font-medium">Loading Reels...</span>
  </div>
);

/**
 * ReelsPage — Dedicated full-page route for Zeitnah Community Reels.
 * Mounted at /community/reels and /community/reels/:postId.
 *
 * Responsibilities:
 * - Direct deep-link handling: loads initial target post by ID if provided.
 * - Video feed ingestion: streams video posts with infinite cursor pagination.
 * - Deduplication & ordering: guarantees target post is loaded seamlessly at the active position.
 * - Clean teardown & back navigation preservation.
 */
export default function ReelsPage() {
  const { postId } = useParams();
  const navigate = useNavigate();

  // 1. If deep-linked directly to a specific post, fetch that post individually
  const { data: directPost, isLoading: isDirectPostLoading } = useQuery({
    queryKey: ['community', 'post', postId],
    queryFn: () => communityApi.getPost(postId),
    enabled: Boolean(postId),
    staleTime: 1000 * 60 * 5,
  });

  // 2. Fetch the video feed
  const {
    data: feedData,
    isLoading: isFeedLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useCommunityVideoFeed();

  // 3. Assemble and deduplicate video posts
  const videoPosts = useMemo(() => {
    const seen = new Set();
    const result = [];

    // Prepend direct post first if it exists and has video
    if (directPost) {
      const pId = directPost._id || directPost.id;
      seen.add(pId);
      result.push(directPost);
    }

    const pages = feedData?.pages || [];
    for (const page of pages) {
      const items = page?.items || [];
      for (const item of items) {
        if (!item) continue;
        const id = item._id || item.id;
        if (!id || seen.has(id)) continue;

        // Ensure post contains video media
        const hasVideo =
          item.type === 'VIDEO' ||
          (Array.isArray(item.media) && item.media.some((m) => m?.type === 'video'));

        if (hasVideo) {
          seen.add(id);
          result.push(item);
        }
      }
    }

    return result;
  }, [directPost, feedData]);

  // Loading state when direct deep-link is requested
  if (postId && isDirectPostLoading && !directPost) {
    return (
      <div className="fixed inset-0 bg-[#05070D] flex items-center justify-center z-50">
        <ReelPageLoader />
      </div>
    );
  }

  // Initial feed loading state
  if (isFeedLoading && videoPosts.length === 0) {
    return (
      <div className="fixed inset-0 bg-[#05070D] flex items-center justify-center z-50">
        <ReelPageLoader />
      </div>
    );
  }

  return (
    <ReelsViewer
      posts={videoPosts}
      initialPostId={postId || null}
      onClose={() => navigate('/community')}
      onFetchNextPage={fetchNextPage}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
    />
  );
}
