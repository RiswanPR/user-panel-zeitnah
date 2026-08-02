import { useState, useEffect, useCallback } from 'react';
import { messagingApi } from '../services/messagingApi';
import toast from 'react-hot-toast';

export function useMessages(conversationId) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchMessages = useCallback(async (reset = false) => {
    if (!conversationId) return;

    try {
      setLoading(true);
      const currentPage = reset ? 1 : page;
      const res = await messagingApi.getMessages(conversationId, currentPage, 50);

      if (reset) {
        setMessages(res.messages || []);
        setPage(2);
      } else {
        setMessages((prev) => [...(res.messages || []), ...prev]);
        setPage((prev) => prev + 1);
      }

      setHasMore((res.messages?.length || 0) >= 50);
    } catch (err) {
      console.error('Failed to load message history:', err);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [conversationId, page]);

  useEffect(() => {
    if (conversationId) {
      fetchMessages(true);
    } else {
      setMessages([]);
    }
  }, [conversationId]);

  const sendMessage = async (content, replyTo = null) => {
    if (!content || !content.trim()) return;

    // Optimistic message update
    const tempId = `temp_${Date.now()}`;
    const optimisticMessage = {
      _id: tempId,
      conversationId,
      content: content.trim(),
      replyTo,
      createdAt: new Date().toISOString(),
      sending: true,
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      const sentMessage = await messagingApi.sendMessage({
        conversationId,
        content,
        replyTo,
      });

      setMessages((prev) =>
        prev.map((msg) => (msg._id === tempId ? sentMessage : msg)),
      );
      return sentMessage;
    } catch (err) {
      setMessages((prev) => prev.filter((msg) => msg._id !== tempId));
      toast.error(err.response?.data?.message || 'Failed to send message');
      throw err;
    }
  };

  const editMessage = async (messageId, newContent) => {
    try {
      const updated = await messagingApi.editMessage(messageId, newContent);
      setMessages((prev) =>
        prev.map((msg) => (msg._id === messageId ? updated : msg)),
      );
      toast.success('Message edited');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to edit message');
    }
  };

  const deleteMessage = async (messageId) => {
    try {
      const deleted = await messagingApi.deleteMessage(messageId);
      setMessages((prev) =>
        prev.map((msg) => (msg._id === messageId ? deleted : msg)),
      );
      toast.success('Message deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete message');
    }
  };

  return {
    messages,
    loading,
    hasMore,
    loadMore: () => fetchMessages(false),
    sendMessage,
    editMessage,
    deleteMessage,
    setMessages,
  };
}
