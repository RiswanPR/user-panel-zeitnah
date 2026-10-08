import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { communityApi } from '../services/communityApi';
import { networkApi } from '../services/networkApi';
import toast from 'react-hot-toast';

// ── FEED & POSTS ──

export function useCommunityFeed({
  filter = 'all',
  activeProfileType = 'personal',
  activeBusinessId = null,
} = {}) {
  const isBusiness = activeProfileType === 'business' && Boolean(activeBusinessId);
  const queryKey = isBusiness
    ? ['community', 'feed', 'business', activeBusinessId, { filter }]
    : ['community', 'feed', 'personal', { filter }];

  return useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam = '' }) =>
      communityApi.getFeed({
        cursor: pageParam,
        limit: 10,
        filter,
        organizationId: isBusiness ? activeBusinessId : undefined,
      }),
    getNextPageParam: (lastPage) => lastPage?.nextCursor || undefined,
    initialPageParam: '',
    staleTime: 1000 * 60 * 2, // 2 min cache freshness prevents tab-switch refetches
    gcTime: 1000 * 60 * 10, // 10 min cache retention
  });
}

export function useCommunityVideoFeed({ filter = 'video' } = {}) {
  return useInfiniteQuery({
    queryKey: ['community', 'feed', { filter }],
    queryFn: ({ pageParam = '' }) => communityApi.getVideoFeed({ cursor: pageParam, limit: 10, filter }),
    getNextPageParam: (lastPage) => lastPage?.nextCursor || undefined,
    initialPageParam: '',
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
  });
}

export function useCreatorInsights() {
  return useQuery({
    queryKey: ['community', 'creator', 'insights'],
    queryFn: () => communityApi.getCreatorInsights(),
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10,
  });
}

export function useRecordPostView() {
  return useMutation({
    mutationFn: (postId) => communityApi.recordPostView(postId),
  });
}


export function useCommunitySearch({ query = '', type = 'all', enabled = true } = {}) {
  const cleanQ = (query || '').trim();
  return useQuery({
    queryKey: ['community', 'search', { query: cleanQ, type }],
    queryFn: ({ signal }) =>
      communityApi.searchCommunity({ q: cleanQ, type, limit: 15, signal }),
    enabled: Boolean(enabled && cleanQ.length >= 2),
    staleTime: 1000 * 30, // 30 seconds
    gcTime: 1000 * 60 * 5,
  });
}

export function useSuggestedPeople({ limit = 3, fetcher = networkApi.getPeople } = {}) {
  return useQuery({
    queryKey: ['network', 'people', 'suggested', { limit }],
    queryFn: async () => {
      const fn = fetcher || networkApi.getPeople;
      const res = await fn({ limit });
      const list = Array.isArray(res)
        ? res
        : Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.people)
        ? res.people
        : [];
      return list.slice(0, limit);
    },
    staleTime: 1000 * 60 * 5, // 5 min cache prevents duplicate network calls across sidebar & drawer
    gcTime: 1000 * 60 * 15,
  });
}

export function useSavedPosts() {
  return useInfiniteQuery({
    queryKey: ['community', 'saved'],
    queryFn: ({ pageParam = '' }) => communityApi.getSavedPosts({ cursor: pageParam, limit: 10 }),
    getNextPageParam: (lastPage) => lastPage?.nextCursor || undefined,
    initialPageParam: '',
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: communityApi.createPost,
    onSuccess: (post) => {
      // Prepend to active feed query
      queryClient.setQueriesData({ queryKey: ['community', 'feed'] }, (oldData) => {
        if (!oldData || !oldData.pages) return oldData;
        const newPages = [...oldData.pages];
        if (newPages.length > 0) {
          newPages[0] = {
            ...newPages[0],
            items: [post, ...newPages[0].items.filter((p) => (p._id || p.id) !== (post._id || post.id))],
          };
        } else {
          newPages.push({ items: [post], nextCursor: null });
        }
        return { ...oldData, pages: newPages };
      });
      queryClient.invalidateQueries({ queryKey: ['community', 'feed'] });
      toast.success('Post published!');
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || 'Failed to create post. Please try again.';
      toast.error(msg);
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: communityApi.deletePost,
    onSuccess: (_, postId) => {
      const filterOut = (oldData) => {
        if (!oldData || !oldData.pages) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page) => ({
            ...page,
            items: page.items.filter((item) => (item._id || item.id) !== postId),
          })),
        };
      };
      queryClient.setQueriesData({ queryKey: ['community', 'feed'] }, filterOut);
      queryClient.setQueriesData({ queryKey: ['community', 'saved'] }, filterOut);
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
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ['community', 'feed'] }),
        queryClient.cancelQueries({ queryKey: ['community', 'saved'] }),
      ]);

      // Snapshot previous cache for exact rollback
      const previousFeed = queryClient.getQueriesData({ queryKey: ['community', 'feed'] });
      const previousSaved = queryClient.getQueriesData({ queryKey: ['community', 'saved'] });

      const toggleLike = (oldData) => {
        if (!oldData || !oldData.pages) return oldData;
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
      };

      queryClient.setQueriesData({ queryKey: ['community', 'feed'] }, toggleLike);
      queryClient.setQueriesData({ queryKey: ['community', 'saved'] }, toggleLike);

      return { previousFeed, previousSaved };
    },
    onSuccess: (data, { postId }) => {
      const reconcile = (oldData) => {
        if (!oldData || !oldData.pages) return oldData;
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
      };
      queryClient.setQueriesData({ queryKey: ['community', 'feed'] }, reconcile);
      queryClient.setQueriesData({ queryKey: ['community', 'saved'] }, reconcile);
    },
    onError: (_, __, context) => {
      // Rollback to previous queries snapshot
      if (context?.previousFeed) {
        context.previousFeed.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousSaved) {
        context.previousSaved.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast.error('Unable to update reaction. Please check your connection.');
    },
  });
}

// ── BOOKMARKS / SAVED POSTS ──

export function useSavePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId) => communityApi.savePost(postId),
    onMutate: async (postId) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ['community', 'feed'] }),
        queryClient.cancelQueries({ queryKey: ['community', 'saved'] }),
      ]);
      const previousFeed = queryClient.getQueriesData({ queryKey: ['community', 'feed'] });
      const previousSaved = queryClient.getQueriesData({ queryKey: ['community', 'saved'] });

      const updateSaved = (oldData) => {
        if (!oldData || !oldData.pages) return oldData;
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
      };

      queryClient.setQueriesData({ queryKey: ['community', 'feed'] }, updateSaved);
      queryClient.setQueriesData({ queryKey: ['community', 'saved'] }, updateSaved);

      return { previousFeed, previousSaved };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community', 'saved'] });
      toast.success('Post saved to bookmarks');
    },
    onError: (_, __, context) => {
      if (context?.previousFeed) {
        context.previousFeed.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousSaved) {
        context.previousSaved.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast.error('Failed to save post');
    },
  });
}

export function useRemoveSavedPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId) => communityApi.removeSavedPost(postId),
    onMutate: async (postId) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ['community', 'feed'] }),
        queryClient.cancelQueries({ queryKey: ['community', 'saved'] }),
      ]);
      const previousFeed = queryClient.getQueriesData({ queryKey: ['community', 'feed'] });
      const previousSaved = queryClient.getQueriesData({ queryKey: ['community', 'saved'] });

      const updateUnsaved = (oldData) => {
        if (!oldData || !oldData.pages) return oldData;
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
      };

      queryClient.setQueriesData({ queryKey: ['community', 'feed'] }, updateUnsaved);
      queryClient.setQueriesData({ queryKey: ['community', 'saved'] }, updateUnsaved);

      return { previousFeed, previousSaved };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community', 'saved'] });
      toast.success('Post removed from bookmarks');
    },
    onError: (_, __, context) => {
      if (context?.previousFeed) {
        context.previousFeed.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousSaved) {
        context.previousSaved.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast.error('Failed to remove saved post');
    },
  });
}

// ── REPOSTS & QUOTES ──

export function useRepostPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId) => communityApi.repostPost(postId),
    onMutate: async (postId) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ['community', 'feed'] }),
        queryClient.cancelQueries({ queryKey: ['community', 'saved'] }),
      ]);
      const previousFeed = queryClient.getQueriesData({ queryKey: ['community', 'feed'] });
      const previousSaved = queryClient.getQueriesData({ queryKey: ['community', 'saved'] });

      const toggleRepost = (oldData) => {
        if (!oldData || !oldData.pages) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page) => ({
            ...page,
            items: page.items.map((item) => {
              const id = item._id || item.id;
              const isTarget = id === postId || item.originalPostId === postId || item.originalPost?._id === postId;
              if (isTarget) {
                const wasReposted = !!item.isRepostedByMe;
                const currentReposts = item.stats?.reposts || 0;
                return {
                  ...item,
                  isRepostedByMe: true,
                  stats: {
                    ...item.stats,
                    reposts: wasReposted ? currentReposts : currentReposts + 1,
                  },
                };
              }
              return item;
            }),
          })),
        };
      };

      queryClient.setQueriesData({ queryKey: ['community', 'feed'] }, toggleRepost);
      queryClient.setQueriesData({ queryKey: ['community', 'saved'] }, toggleRepost);

      return { previousFeed, previousSaved };
    },
    onSuccess: (data, postId) => {
      const reconcile = (oldData) => {
        if (!oldData || !oldData.pages) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page) => ({
            ...page,
            items: page.items.map((item) => {
              const id = item._id || item.id;
              const isTarget = id === postId || item.originalPostId === postId || item.originalPost?._id === postId;
              if (isTarget) {
                return {
                  ...item,
                  isRepostedByMe: true,
                  stats: {
                    ...item.stats,
                    reposts: data?.repostsCount ?? ((item.stats?.reposts || 0) + 1),
                  },
                };
              }
              return item;
            }),
          })),
        };
      };
      queryClient.setQueriesData({ queryKey: ['community', 'feed'] }, reconcile);
      queryClient.setQueriesData({ queryKey: ['community', 'saved'] }, reconcile);
      toast.success('Post reposted to feed');
    },
    onError: (err, _, context) => {
      if (context?.previousFeed) {
        context.previousFeed.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousSaved) {
        context.previousSaved.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      const msg = err?.response?.data?.message || 'Failed to repost. Try again.';
      toast.error(msg);
    },
  });
}

export function useUnrepostPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId) => communityApi.unrepostPost(postId),
    onMutate: async (postId) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ['community', 'feed'] }),
        queryClient.cancelQueries({ queryKey: ['community', 'saved'] }),
      ]);
      const previousFeed = queryClient.getQueriesData({ queryKey: ['community', 'feed'] });
      const previousSaved = queryClient.getQueriesData({ queryKey: ['community', 'saved'] });

      const toggleUnrepost = (oldData) => {
        if (!oldData || !oldData.pages) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page) => ({
            ...page,
            items: page.items.map((item) => {
              const id = item._id || item.id;
              const isTarget = id === postId || item.originalPostId === postId || item.originalPost?._id === postId;
              if (isTarget) {
                const currentReposts = item.stats?.reposts || 1;
                return {
                  ...item,
                  isRepostedByMe: false,
                  stats: {
                    ...item.stats,
                    reposts: Math.max(0, currentReposts - 1),
                  },
                };
              }
              return item;
            }),
          })),
        };
      };

      queryClient.setQueriesData({ queryKey: ['community', 'feed'] }, toggleUnrepost);
      queryClient.setQueriesData({ queryKey: ['community', 'saved'] }, toggleUnrepost);

      return { previousFeed, previousSaved };
    },
    onSuccess: (data, postId) => {
      const reconcile = (oldData) => {
        if (!oldData || !oldData.pages) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page) => ({
            ...page,
            items: page.items.map((item) => {
              const id = item._id || item.id;
              const isTarget = id === postId || item.originalPostId === postId || item.originalPost?._id === postId;
              if (isTarget) {
                return {
                  ...item,
                  isRepostedByMe: false,
                  stats: {
                    ...item.stats,
                    reposts: data?.repostsCount ?? Math.max(0, (item.stats?.reposts || 1) - 1),
                  },
                };
              }
              return item;
            }),
          })),
        };
      };
      queryClient.setQueriesData({ queryKey: ['community', 'feed'] }, reconcile);
      queryClient.setQueriesData({ queryKey: ['community', 'saved'] }, reconcile);
      toast.success('Repost removed');
    },
    onError: (err, _, context) => {
      if (context?.previousFeed) {
        context.previousFeed.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousSaved) {
        context.previousSaved.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      const msg = err?.response?.data?.message || 'Failed to remove repost';
      toast.error(msg);
    },
  });
}

export function useQuotePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, content, audience, courseId }) =>
      communityApi.quotePost(postId, { content, audience, courseId }),
    onSuccess: (newPost, { postId }) => {
      queryClient.setQueriesData({ queryKey: ['community', 'feed'] }, (oldData) => {
        if (!oldData || !oldData.pages) return oldData;
        const newPages = [...oldData.pages];
        if (newPages.length > 0) {
          const updatedItems = newPages[0].items.map((item) => {
            const id = item._id || item.id;
            if (id === postId || item.originalPostId === postId || item.originalPost?._id === postId) {
              return {
                ...item,
                stats: {
                  ...item.stats,
                  reposts: (item.stats?.reposts || 0) + 1,
                },
              };
            }
            return item;
          });
          newPages[0] = {
            ...newPages[0],
            items: [newPost, ...updatedItems.filter((p) => (p._id || p.id) !== (newPost._id || newPost.id))],
          };
        }
        return { ...oldData, pages: newPages };
      });
      toast.success('Quote post published!');
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || 'Failed to publish quote post';
      toast.error(msg);
    },
  });
}

// ── COMMENTS ──

export function useComments(postId, enabled = true) {
  return useQuery({
    queryKey: ['community', 'comments', postId],
    queryFn: () => communityApi.getComments(postId, { limit: 50 }),
    enabled: Boolean(postId && enabled),
    staleTime: 1000 * 30, // 30s cache
    gcTime: 1000 * 60 * 5, // 5 min
    retry: 1,
  });
}

export function useCreateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, data }) => communityApi.createComment(postId, data),
    onMutate: async ({ postId, data }) => {
      await queryClient.cancelQueries({ queryKey: ['community', 'comments', postId] });

      const previousComments = queryClient.getQueryData(['community', 'comments', postId]) || [];
      const previousFeed = queryClient.getQueriesData({ queryKey: ['community', 'feed'] });
      const previousSaved = queryClient.getQueriesData({ queryKey: ['community', 'saved'] });

      const tempId = `temp-${Date.now()}`;
      const optimisticComment = {
        _id: tempId,
        id: tempId,
        postId,
        content: data.content,
        createdAt: new Date().toISOString(),
        isOptimistic: true,
      };

      queryClient.setQueryData(['community', 'comments', postId], (old = []) => {
        const arr = Array.isArray(old) ? old : (old?.comments || old?.data || []);
        return [...arr, optimisticComment];
      });

      // Increment comment count on post across all active feeds
      const incrementComment = (oldData) => {
        if (!oldData || !oldData.pages) return oldData;
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
      };

      queryClient.setQueriesData({ queryKey: ['community', 'feed'] }, incrementComment);
      queryClient.setQueriesData({ queryKey: ['community', 'saved'] }, incrementComment);

      return { previousComments, previousFeed, previousSaved, tempId };
    },
    onSuccess: (newComment, { postId }, context) => {
      queryClient.setQueryData(['community', 'comments', postId], (old = []) => {
        const arr = Array.isArray(old) ? old : (old?.comments || old?.data || []);
        return arr.map((c) => (c._id === context?.tempId || c.id === context?.tempId ? newComment : c));
      });
      toast.success('Comment posted!');
    },
    onError: (err, { postId }, context) => {
      if (context?.previousComments) {
        queryClient.setQueryData(['community', 'comments', postId], context.previousComments);
      }
      if (context?.previousFeed) {
        context.previousFeed.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousSaved) {
        context.previousSaved.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      const msg = err?.response?.data?.message || 'Failed to post comment';
      toast.error(msg);
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ commentId }) => communityApi.deleteComment(commentId),
    onMutate: async ({ commentId, postId }) => {
      await queryClient.cancelQueries({ queryKey: ['community', 'comments', postId] });

      const previousComments = queryClient.getQueryData(['community', 'comments', postId]) || [];
      const previousFeed = queryClient.getQueriesData({ queryKey: ['community', 'feed'] });
      const previousSaved = queryClient.getQueriesData({ queryKey: ['community', 'saved'] });

      queryClient.setQueryData(['community', 'comments', postId], (old = []) => {
        const arr = Array.isArray(old) ? old : (old?.comments || old?.data || []);
        return arr.filter((c) => (c._id || c.id) !== commentId);
      });

      // Decrement comment count on post across all active feeds
      const decrementComment = (oldData) => {
        if (!oldData || !oldData.pages) return oldData;
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
      };

      queryClient.setQueriesData({ queryKey: ['community', 'feed'] }, decrementComment);
      queryClient.setQueriesData({ queryKey: ['community', 'saved'] }, decrementComment);

      return { previousComments, previousFeed, previousSaved };
    },
    onSuccess: () => {
      toast.success('Comment deleted');
    },
    onError: (err, { postId }, context) => {
      if (context?.previousComments) {
        queryClient.setQueryData(['community', 'comments', postId], context.previousComments);
      }
      if (context?.previousFeed) {
        context.previousFeed.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousSaved) {
        context.previousSaved.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast.error('Failed to delete comment');
    },
  });
}


// ── STORIES ──

export function useActiveStories() {
  return useQuery({
    queryKey: ['community', 'stories'],
    queryFn: communityApi.getActiveStories,
    staleTime: 1000 * 60 * 3, // 3 min cache freshness
    gcTime: 1000 * 60 * 10,
    retry: 1,
  });
}

export function useCreateStory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: communityApi.createStory,
    onSuccess: (story) => {
      queryClient.setQueryData(['community', 'stories'], (oldData = []) => {
        const list = Array.isArray(oldData) ? oldData : [];
        return [story, ...list.filter((s) => (s._id || s.id) !== (story._id || story.id))];
      });
      queryClient.invalidateQueries({ queryKey: ['community', 'stories'] });
    },
  });
}

export function useViewStory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: communityApi.viewStory,
    onMutate: async (storyId) => {
      // Optimistically mark story as viewed in active stories cache
      queryClient.setQueryData(['community', 'stories'], (oldData = []) => {
        if (!Array.isArray(oldData)) return oldData;
        return oldData.map((s) => {
          if ((s._id || s.id) === storyId) {
            return { ...s, isViewed: true };
          }
          return s;
        });
      });
    },
    onSuccess: (_, storyId) => {
      queryClient.setQueryData(['community', 'stories'], (oldData = []) => {
        if (!Array.isArray(oldData)) return oldData;
        return oldData.map((s) => {
          if ((s._id || s.id) === storyId) {
            return { ...s, isViewed: true };
          }
          return s;
        });
      });
    },
  });
}

export function useReactToStory() {
  return useMutation({
    mutationFn: ({ storyId, type }) => communityApi.reactToStory(storyId, { type }),
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
