import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { communityApi } from '../services/communityApi';
import toast from 'react-hot-toast';

// ── FEED & POSTS ──

export function useCommunityFeed() {
  return useInfiniteQuery({
    queryKey: ['community', 'feed'],
    queryFn: ({ pageParam = '' }) => communityApi.getFeed({ cursor: pageParam, limit: 10 }),
    getNextPageParam: (lastPage) => lastPage?.nextCursor || undefined,
    initialPageParam: '',
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: communityApi.createPost,
    onSuccess: (post) => {
      queryClient.setQueryData(['community', 'feed'], (oldData) => {
        if (!oldData || !oldData.pages) return oldData;
        const newPages = [...oldData.pages];
        if (newPages.length > 0) {
          newPages[0] = {
            ...newPages[0],
            items: [post, ...newPages[0].items.filter((p) => (p._id || p.id) !== (post._id || post.id))],
          };
        }
        return { ...oldData, pages: newPages };
      });
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
      queryClient.setQueryData(['community', 'feed'], (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page) => ({
            ...page,
            items: page.items.filter((item) => (item._id || item.id) !== postId),
          })),
        };
      });
      toast.success('Post deleted');
    },
    onError: () => {
      toast.error('Failed to delete post');
    },
  });
}

export function useReactToPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, type }) => communityApi.reactToPost(postId, { type }),
    onMutate: async ({ postId, type }) => {
      await queryClient.cancelQueries({ queryKey: ['community', 'feed'] });
      const previousFeed = queryClient.getQueryData(['community', 'feed']);

      // Optimistically toggle reaction in the feed
      queryClient.setQueryData(['community', 'feed'], (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page) => ({
            ...page,
            items: page.items.map((item) => {
              const id = item._id || item.id;
              if (id === postId) {
                const wasLiked = !!item.isLikedByMe;
                const isTogglingOff = wasLiked && item.myReactionType === type;
                const currentLikes = item.stats?.likes || 0;
                const newLikes = isTogglingOff ? Math.max(0, currentLikes - 1) : (!wasLiked ? currentLikes + 1 : currentLikes);

                return {
                  ...item,
                  isLikedByMe: !isTogglingOff,
                  myReactionType: isTogglingOff ? null : type,
                  stats: {
                    ...item.stats,
                    likes: newLikes,
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
    onSuccess: (data, { postId }) => {
      // Reconcile with actual server reaction state
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
                  isLikedByMe: data.isLikedByMe,
                  myReactionType: data.myReactionType,
                  stats: {
                    ...item.stats,
                    ...(data.stats || {}),
                  },
                };
              }
              return item;
            }),
          })),
        };
      });
    },
    onError: (err, variables, context) => {
      if (context?.previousFeed) {
        queryClient.setQueryData(['community', 'feed'], context.previousFeed);
      }
      toast.error('Failed to update reaction');
    },
  });
}

// ── BOOKMARKS / SAVED POSTS ──

export function useSavePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId) => communityApi.savePost(postId),
    onSuccess: (_, postId) => {
      queryClient.setQueryData(['community', 'feed'], (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page) => ({
            ...page,
            items: page.items.map((item) => {
              if ((item._id || item.id) === postId) {
                return { ...item, isSaved: true };
              }
              return item;
            }),
          })),
        };
      });
      toast.success('Post saved to bookmarks');
    },
    onError: () => {
      toast.error('Failed to save post');
    },
  });
}

export function useRemoveSavedPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId) => communityApi.removeSavedPost(postId),
    onSuccess: (_, postId) => {
      queryClient.setQueryData(['community', 'feed'], (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page) => ({
            ...page,
            items: page.items.map((item) => {
              if ((item._id || item.id) === postId) {
                return { ...item, isSaved: false };
              }
              return item;
            }),
          })),
        };
      });
      toast.success('Post removed from bookmarks');
    },
    onError: () => {
      toast.error('Failed to remove saved post');
    },
  });
}

// ── COMMENTS ──

export function useComments(postId, enabled = true) {
  return useQuery({
    queryKey: ['community', 'comments', postId],
    queryFn: () => communityApi.getComments(postId, { limit: 50 }),
    enabled: Boolean(postId && enabled),
  });
}

export function useCreateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, data }) => communityApi.createComment(postId, data),
    onSuccess: (newComment, { postId }) => {
      queryClient.setQueryData(['community', 'comments', postId], (old = []) => {
        return [...old, newComment];
      });
      // Increment comment count on post in feed
      queryClient.setQueryData(['community', 'feed'], (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page) => ({
            ...page,
            items: page.items.map((item) => {
              if ((item._id || item.id) === postId) {
                return {
                  ...item,
                  stats: {
                    ...item.stats,
                    comments: (item.stats?.comments || 0) + 1,
                  },
                };
              }
              return item;
            }),
          })),
        };
      });
      toast.success('Comment posted!');
    },
    onError: () => {
      toast.error('Failed to post comment');
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ commentId, postId }) => communityApi.deleteComment(commentId),
    onSuccess: (_, { commentId, postId }) => {
      queryClient.setQueryData(['community', 'comments', postId], (old = []) => {
        return old.filter((c) => (c._id || c.id) !== commentId);
      });
      // Decrement comment count on post in feed
      queryClient.setQueryData(['community', 'feed'], (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page) => ({
            ...page,
            items: page.items.map((item) => {
              if ((item._id || item.id) === postId) {
                return {
                  ...item,
                  stats: {
                    ...item.stats,
                    comments: Math.max(0, (item.stats?.comments || 0) - 1),
                  },
                };
              }
              return item;
            }),
          })),
        };
      });
      toast.success('Comment deleted');
    },
    onError: () => {
      toast.error('Failed to delete comment');
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

export function useCreateStory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: communityApi.createStory,
    onSuccess: (story) => {
      queryClient.setQueryData(['community', 'stories'], (oldData = []) => {
        return [story, ...oldData.filter(s => (s._id || s.id) !== (story._id || story.id))];
      });
      toast.success('Story shared!');
    },
    onError: () => {
      toast.error('Failed to upload story');
    },
  });
}

export function useViewStory() {
  return useMutation({
    mutationFn: communityApi.viewStory,
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
