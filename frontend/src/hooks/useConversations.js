import { useState, useEffect, useCallback } from 'react';
import { messagingApi } from '../services/messagingApi';
import toast from 'react-hot-toast';

export function useConversations() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeConversationId, setActiveConversationId] = useState(null);

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await messagingApi.getConversations();
      setConversations(res.conversations || []);
    } catch (err) {
      console.error('Failed to load conversations:', err);
      toast.error('Failed to load conversations inbox');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const startDirectConversation = async (targetUserId) => {
    try {
      const conv = await messagingApi.createConversation(targetUserId);
      setConversations((prev) => {
        const exists = prev.some((c) => c._id === conv._id);
        if (exists) return prev;
        return [conv, ...prev];
      });
      setActiveConversationId(conv._id);
      return conv;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start conversation');
      throw err;
    }
  };

  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      c.lastMessagePreview?.toLowerCase().includes(searchLower) ||
      c.participants?.some((p) => p.toLowerCase().includes(searchLower))
    );
  });

  return {
    conversations: filteredConversations,
    loading,
    searchQuery,
    setSearchQuery,
    activeConversationId,
    setActiveConversationId,
    fetchConversations,
    startDirectConversation,
    setConversations,
  };
}
