import { useState, useCallback } from 'react';
import { profileApi } from '../services/profileApi';
import toast from 'react-hot-toast';

export function useFollowers() {
  const [loading, setLoading] = useState(false);

  const toggleFollow = useCallback(async (targetUserId, currentlyFollowing) => {
    try {
      setLoading(true);
      if (currentlyFollowing) {
        await profileApi.unfollowUser(targetUserId);
        toast.success('Unfollowed user');
        return false;
      } else {
        await profileApi.followUser(targetUserId);
        toast.success('Following user!');
        return true;
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update follow status');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getFollowersList = useCallback(async (userId, page = 1) => {
    try {
      setLoading(true);
      return await profileApi.getFollowers(userId, page);
    } catch (err) {
      toast.error('Failed to load followers list');
      return { followers: [], total: 0 };
    } finally {
      setLoading(false);
    }
  }, []);

  const getFollowingList = useCallback(async (userId, page = 1) => {
    try {
      setLoading(true);
      return await profileApi.getFollowing(userId, page);
    } catch (err) {
      toast.error('Failed to load following list');
      return { following: [], total: 0 };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    toggleFollow,
    getFollowersList,
    getFollowingList,
    loading,
  };
}
