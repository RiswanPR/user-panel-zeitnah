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

export const MessagingProvider = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // 'connected' | 'reconnecting' | 'disconnected'
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [typingMap, setTypingMap] = useState({}); // { [convId]: Set<{ userId, userName }> }
  const [onlineUserSet, setOnlineUserSet] = useState(new Set());
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
        auth: (cb) => {
          cb({ token: storage.getAccessToken() });
        },
        transports: ['websocket', 'polling'],
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

      newSocket.on('connect', () => {
        setConnectionStatus('connected');
        // Re-join active conversation if currently open
        if (activeConvRef.current) {
          newSocket.emit('join_conversation', {
            conversationId: activeConvRef.current,
          });
        }
      });

      newSocket.on('disconnect', () => {
        setConnectionStatus('disconnected');
      });

      newSocket.on('reconnect_attempt', () => {
        setConnectionStatus('reconnecting');
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

      newSocket.on('conversation_updated', () => {
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
        queryClient.invalidateQueries({ queryKey: ['messages', 'unread-counts'] });
      });

      newSocket.on('connect_error', async (err) => {
        console.warn('[Socket:messages] Connection error:', err.message);
        setConnectionStatus('reconnecting');

        const isAuthError =
          err.message?.includes('jwt') ||
          err.message?.includes('unauthorized') ||
          err.message?.includes('Unauthorized') ||
          err.message?.includes('authentication');

        if (isAuthError && active) {
          try {
            const freshToken = await getRefreshedToken();
            if (freshToken && active && newSocket) {
              newSocket.auth = { token: freshToken };
              newSocket.connect();
            }
          } catch {
            if (newSocket) newSocket.disconnect();
          }
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

    window.addEventListener('zeitnah:auth:token-refreshed', handleTokenRefreshed);

    return () => {
      active = false;
      window.removeEventListener('zeitnah:auth:token-refreshed', handleTokenRefreshed);
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

  return (
    <MessagingContext.Provider
      value={{
        socket,
        connectionStatus,
        unreadCounts,
        activeConversationId,
        joinConversation,
        leaveConversation,
        sendTyping,
        isUserOnline,
        getTypingUsers,
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
