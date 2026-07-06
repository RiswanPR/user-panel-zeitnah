import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { communityApi } from '../services/communityApi';
import toast from 'react-hot-toast';

// ── FEED & POSTS ──

export function useCommunityFeed() {
  return useInfiniteQuery({
    queryKey: ['community', 'feed'],
    queryFn: ({ pageParam = '' }) => communityApi.getFeed({ cursor: pageParam, limit: 10 }),
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
    initialPageParam: '',
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: communityApi.createPost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community', 'feed'] });
      toast.success('Post published!');
    },
    onError: () => {
      toast.error('Failed to create post. Please try again.');
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: communityApi.deletePost,
    onSuccess: (_, postId) => {
      // Optimistically remove the post from the cache
      queryClient.setQueryData(['community', 'feed'], (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page) => ({
            ...page,
            items: page.items.filter((item) => item._id !== postId && item.id !== postId),
          })),
        };
      });
      toast.success('Post deleted');
    },
  });
}

export function useReactToPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, type }) => communityApi.reactToPost(postId, { type }),
    onMutate: async ({ postId }) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ['community', 'feed'] });

      // Snapshot the previous value
      const previousFeed = queryClient.getQueryData(['community', 'feed']);

      // Optimistically update to the new value
      queryClient.setQueryData(['community', 'feed'], (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page) => ({
            ...page,
            items: page.items.map((item) => {
              const id = item._id || item.id;
              if (id === postId) {
                return {
                  ...item,
                  stats: {
                    ...item.stats,
                    likes: (item.stats?.likes || 0) + 1, // simplified optimistic reaction
                  },
                };
              }
              return item;
            }),
          })),
        };
      });

      return { previousFeed };
    },
    onError: (err, newReaction, context) => {
      // Rollback on error
      queryClient.setQueryData(['community', 'feed'], context.previousFeed);
      toast.error('Failed to react');
    },
    onSettled: () => {
      // Always refetch after error or success to sync completely
      queryClient.invalidateQueries({ queryKey: ['community', 'feed'] });
    },
  });
}

// ── STORIES ──

export function useActiveStories() {
  return useQuery({
    queryKey: ['community', 'stories'],
    queryFn: communityApi.getActiveStories,
  });
}

export function useViewStory() {
  return useMutation({
    mutationFn: communityApi.viewStory,
    // Don't need to invalidate aggressively, it's just analytics
  });
}

// ── GAMIFICATION ──

export function useCommunityProfile() {
  return useQuery({
    queryKey: ['community', 'profile'],
    queryFn: communityApi.getProfile,
  });
}

// ── AI ──

export function useAIImproveText() {
  return useMutation({
    mutationFn: communityApi.improveText,
  });
}

export function useAISuggestTags() {
  return useMutation({
    mutationFn: communityApi.suggestTags,
  });
}

// ── MODERATION ──

export function useModerationReports() {
  return useQuery({
    queryKey: ['community', 'reports'],
    queryFn: communityApi.getReports,
  });
}

export function useResolveReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => communityApi.resolveReport(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community', 'reports'] });
      toast.success('Report resolved');
    },
  });
}

export function useHidePostAsMod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }) => communityApi.hidePostAsMod(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community', 'feed'] });
      toast.success('Post hidden');
    },
  });
}

export function useAcceptAnswer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, commentId }) => communityApi.acceptAnswer(postId, commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community', 'feed'] });
      toast.success('Answer accepted');
    },
  });
}
