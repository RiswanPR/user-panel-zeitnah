/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { storage } from '../services/storage';
import { messagingService } from '../services/messagingService';
import { useToast } from '../components/ui/Toast';
import { AuthContext } from './AuthContext';
import { getRefreshedToken } from '../services/api';

export const MessagingContext = createContext(null);

export function formatPresenceStatus(isOnline, lastSeenAt, isTyping = false) {
  if (isTyping) return 'Typing…';
  if (isOnline) return '● Active now';
  if (!lastSeenAt) return 'Offline';
  const d = new Date(lastSeenAt);
  if (isNaN(d.getTime())) return 'Offline';
  const now = new Date();
  const diffMins = Math.floor((now - d) / 60000);
  const diffHours = Math.floor((now - d) / 3600000);
  if (diffMins < 1) return 'Active just now';
  if (diffMins < 60) return `Active ${diffMins}m ago`;
  if (diffHours < 24) return `Active ${diffHours}h ago`;
  if (now.toDateString() === d.toDateString()) return 'Active today';
  return 'Offline';
}

export const MessagingProvider = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // 'connected' | 'reconnecting' | 'disconnected'
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [typingMap, setTypingMap] = useState({}); // { [convId]: Set<{ userId, userName }> }
  const [onlineUserSet, setOnlineUserSet] = useState(new Set());
  const [lastSeenMap, setLastSeenMap] = useState({}); // { [userId]: Date }
  const queryClient = useQueryClient();
  const toast = useToast();
  const activeConvRef = useRef(activeConversationId);

  useEffect(() => {
    activeConvRef.current = activeConversationId;
  }, [activeConversationId]);

  const currentUserId = user?._id || user?.userId || user?.id;

  // ── 1. Unread Counts Query ──
  const { data: unreadCounts = { unreadMessages: 0, unreadRequests: 0, total: 0 } } = useQuery({
    queryKey: ['messages', 'unread-counts'],
    queryFn: messagingService.getUnreadCounts,
    enabled: Boolean(currentUserId && !loading),
    staleTime: 1000 * 15,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // ── 2. Real-Time WebSocket Connection ──
  useEffect(() => {
    if (!currentUserId) return;

    let active = true;
    let newSocket = null;

    const connectMessaging = async () => {
      const token = await storage.getAccessToken();
      if (!token || !active) return;

      const baseURL = import.meta.env.VITE_API_BASE_URL
        ? import.meta.env.VITE_API_BASE_URL.replace(/\/api\/?$/, '')
        : typeof window !== 'undefined' && window.location.origin
        ? window.location.origin
        : 'https://zeitnahacademy.com';

      newSocket = io(`${baseURL}/messages`, {
        path: '/api/socket.io/',
        auth: (cb) => {
          cb({ token: storage.getAccessToken() });
        },
        transports: ['polling', 'websocket'],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 8,
        reconnectionDelay: 2000,
        reconnectionDelayMax: 10000,
        timeout: 10000,
      });

      if (!active) {
        newSocket.disconnect();
        return;
      }

      setSocket(newSocket);

      // Handle upgrade probe errors gracefully without disconnecting active polling session
      newSocket.io.engine.on('upgradeError', (err) => {
        if (import.meta.env.DEV) {
          console.debug('[Socket:messages] Upgrade probe error (polling remains healthy):', err?.message);
        }
      });

      newSocket.on('connect', () => {
        setConnectionStatus('connected');
        // Re-join active conversation if currently open
        if (activeConvRef.current) {
          newSocket.emit('join_conversation', {
            conversationId: activeConvRef.current,
          });
        }
      });

      newSocket.on('disconnect', (reason) => {
        setConnectionStatus('disconnected');
        if (import.meta.env.DEV) {
          console.debug('[Socket:messages] Disconnected, reason:', reason);
        }
      });

      newSocket.on('reconnect_attempt', () => {
        setConnectionStatus('reconnecting');
      });

      newSocket.on('reconnect_failed', () => {
        setConnectionStatus('failed');
        console.warn('[Socket:messages] Reconnection failed after maximum attempts');
      });

      // Presence
      newSocket.on('presence_change', (payload) => {
        if (!payload?.userId) return;
        setOnlineUserSet((prev) => {
          const next = new Set(prev);
          if (payload.status === 'online') {
            next.add(payload.userId);
          } else {
            next.delete(payload.userId);
            setLastSeenMap((lastPrev) => ({
              ...lastPrev,
              [payload.userId]: payload.timestamp ? new Date(payload.timestamp) : new Date(),
            }));
          }
          return next;
        });
      });

      // Typing indicators
      newSocket.on('user_typing', (payload) => {
        if (!payload?.conversationId || !payload?.userId) return;
        setTypingMap((prev) => {
          const currentSet = new Map(prev[payload.conversationId] || []);
          if (payload.isTyping) {
            currentSet.set(payload.userId, payload.userName || 'Someone');
          } else {
            currentSet.delete(payload.userId);
          }
          return {
            ...prev,
            [payload.conversationId]: currentSet,
          };
        });
      });

      // New message delivered
      newSocket.on('new_message', (payload) => {
        const { conversationId, message } = payload || {};
        // Invalidate message list and conversations list
        queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
        queryClient.invalidateQueries({ queryKey: ['messages', 'unread-counts'] });

        // If user is currently looking at another conversation or away, show gentle toast
        const isCurrentActive = activeConvRef.current === conversationId;
        const isFromMe = String(message?.senderId?._id || message?.senderId) === currentUserId;
        if (!isCurrentActive && !isFromMe) {
          const senderName = message?.senderId?.name || 'Someone';
          toast.info(
            `Message from ${senderName}`,
            message?.body ? message.body.slice(0, 80) : 'Sent an attachment',
          );
        }
      });

      newSocket.on('message_received', () => {
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
        queryClient.invalidateQueries({ queryKey: ['messages', 'unread-counts'] });
      });

      newSocket.on('message_updated', (payload) => {
        const { conversationId } = payload || {};
        queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      });

      newSocket.on('message_deleted', (payload) => {
        const { conversationId } = payload || {};
        queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      });

      newSocket.on('messages_read', (payload) => {
        const { conversationId } = payload || {};
        queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
        queryClient.invalidateQueries({ queryKey: ['messages', 'unread-counts'] });
      });

      newSocket.on('reaction_updated', (payload) => {
        const { conversationId } = payload || {};
        queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      });

      newSocket.on('message_pinned', (payload) => {
        const { conversationId } = payload || {};
        queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
        queryClient.invalidateQueries({ queryKey: ['pinned', conversationId] });
      });

      newSocket.on('message_unpinned', (payload) => {
        const { conversationId } = payload || {};
        queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
        queryClient.invalidateQueries({ queryKey: ['pinned', conversationId] });
      });

      newSocket.on('conversation_updated', () => {
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
        queryClient.invalidateQueries({ queryKey: ['messages', 'unread-counts'] });
      });

      let lastLogTime = 0;
      newSocket.on('connect_error', async (err) => {
        // If user is already logged out or token is gone, disconnect immediately without noise
        if (!storage.getAccessToken() || !active) {
          if (newSocket) newSocket.disconnect();
          setConnectionStatus('disconnected');
          return;
        }

        setConnectionStatus('reconnecting');

        // Check if error is an auth failure (including expired JWT or Engine.IO disconnect)
        const isTokenExpired = Boolean(storage.isAccessTokenExpired && storage.isAccessTokenExpired(15));
        const isAuthError =
          isTokenExpired ||
          err.message?.includes('jwt') ||
          err.message?.includes('unauthorized') ||
          err.message?.includes('Unauthorized') ||
          err.message?.includes('authentication') ||
          (err.message === 'xhr poll error' && (err.description === 401 || (err.context && err.context.status === 401)));

        if (isAuthError && active) {
          try {
            const freshToken = await getRefreshedToken();
            if (freshToken && active && newSocket) {
              newSocket.auth = { token: freshToken };
              newSocket.connect();
            } else if (newSocket) {
              newSocket.disconnect();
            }
          } catch {
            if (newSocket) newSocket.disconnect();
          }
          return;
        }

        const now = Date.now();
        if (now - lastLogTime > 15000) {
          lastLogTime = now;
          const transport = newSocket?.io?.engine?.transport?.name || 'unknown';
          const readyState = newSocket?.io?.engine?.readyState || 'unknown';
          console.warn(`[Socket:messages] Connection note (${transport}, readyState: ${readyState}):`, err.message);
        }
      });
    };

    connectMessaging();

    const handleTokenRefreshed = (event) => {
      const freshToken = event.detail?.token || storage.getAccessToken();
      if (newSocket && freshToken) {
        newSocket.auth = { token: freshToken };
        if (!newSocket.connected) {
          newSocket.connect();
        }
      }
    };

    // Cleanly disconnect messaging socket upon application logout
    const handleAuthLogout = () => {
      if (newSocket) {
        newSocket.disconnect();
      }
      setSocket(null);
      setConnectionStatus('disconnected');
    };

    window.addEventListener('zeitnah:auth:token-refreshed', handleTokenRefreshed);
    window.addEventListener('zeitnah:auth:logout', handleAuthLogout);

    return () => {
      active = false;
      window.removeEventListener('zeitnah:auth:token-refreshed', handleTokenRefreshed);
      window.removeEventListener('zeitnah:auth:logout', handleAuthLogout);
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [currentUserId, queryClient, toast]);

  // ── Conversation Subscription Helper ──
  const joinConversation = useCallback((convId) => {
    setActiveConversationId(convId);
    if (socket && convId) {
      socket.emit('join_conversation', { conversationId: convId });
    }
  }, [socket]);

  const leaveConversation = useCallback((convId) => {
    if (activeConversationId === convId) {
      setActiveConversationId(null);
    }
    if (socket && convId) {
      socket.emit('leave_conversation', { conversationId: convId });
    }
  }, [socket, activeConversationId]);

  const sendTyping = useCallback((convId, isTyping) => {
    if (socket && convId) {
      socket.emit('typing', {
        conversationId: convId,
        isTyping,
        userName: user?.name,
      });
    }
  }, [socket, user?.name]);

  const isUserOnline = useCallback((userId) => {
    return onlineUserSet.has(String(userId));
  }, [onlineUserSet]);

  const getTypingUsers = useCallback((convId) => {
    const map = typingMap[convId];
    if (!map || map.size === 0) return [];
    return Array.from(map.values());
  }, [typingMap]);

  const markRead = useCallback(async (convId) => {
    if (!convId) return;
    try {
      await messagingService.markAsRead(convId);
      queryClient.invalidateQueries({ queryKey: ['messages', 'unread-counts'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    } catch {
      // Silently handle — non-critical
    }
  }, [queryClient]);

  const getUserLastSeen = useCallback((userId) => {
    if (!userId) return null;
    return lastSeenMap[String(userId)] || null;
  }, [lastSeenMap]);

  const formatUserPresence = useCallback((userId, isTyping = false, userObj = null) => {
    const online = isUserOnline(userId);
    const lastSeen = getUserLastSeen(userId) || userObj?.lastSeenAt || userObj?.lastActive || userObj?.updatedAt;
    return formatPresenceStatus(online, lastSeen, isTyping);
  }, [isUserOnline, getUserLastSeen]);

  const [targetMessageId, setTargetMessageId] = useState(null);

  const saveMessage = useCallback(async (messageId) => {
    if (!messageId) return;
    try {
      await messagingService.saveMessage(messageId);
      toast.success('Message saved for reference');
      queryClient.invalidateQueries({ queryKey: ['saved-messages'] });
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    } catch (err) {
      toast.error('Unable to save message', err.response?.data?.message || 'Action failed');
    }
  }, [queryClient, toast]);

  const unsaveMessage = useCallback(async (messageId) => {
    if (!messageId) return;
    try {
      await messagingService.unsaveMessage(messageId);
      toast.info('Message removed from saved');
      queryClient.invalidateQueries({ queryKey: ['saved-messages'] });
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    } catch (err) {
      toast.error('Unable to unsave message', err.response?.data?.message || 'Action failed');
    }
  }, [queryClient, toast]);

  const pinMessage = useCallback(async (convId, messageId) => {
    if (!convId || !messageId) return;
    try {
      await messagingService.pinMessage(convId, messageId);
      toast.success('Message pinned');
      queryClient.invalidateQueries({ queryKey: ['messages', convId] });
      queryClient.invalidateQueries({ queryKey: ['pinned', convId] });
    } catch (err) {
      toast.error('Unable to pin message', err.response?.data?.message || 'Action failed');
    }
  }, [queryClient, toast]);

  const unpinMessage = useCallback(async (convId, messageId) => {
    if (!convId || !messageId) return;
    try {
      await messagingService.unpinMessage(convId, messageId);
      toast.info('Message unpinned');
      queryClient.invalidateQueries({ queryKey: ['messages', convId] });
      queryClient.invalidateQueries({ queryKey: ['pinned', convId] });
    } catch (err) {
      toast.error('Unable to unpin message', err.response?.data?.message || 'Action failed');
    }
  }, [queryClient, toast]);

  return (
    <MessagingContext.Provider
      value={{
        socket,
        connectionStatus,
        unreadCounts,
        activeConversationId,
        currentUserId,
        targetMessageId,
        setTargetMessageId,
        joinConversation,
        leaveConversation,
        sendTyping,
        isUserOnline,
        getUserLastSeen,
        formatUserPresence,
        getTypingUsers,
        markRead,
        saveMessage,
        unsaveMessage,
        pinMessage,
        unpinMessage,
      }}
    >
      {children}
    </MessagingContext.Provider>
  );
};

export const useMessaging = () => {
  const context = useContext(MessagingContext);
  if (!context) {
    throw new Error('useMessaging must be used within a MessagingProvider');
  }
  return context;
};

export default MessagingContext;
