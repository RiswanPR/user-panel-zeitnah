/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { storage } from '../services/storage';
import notificationService from '../services/notificationService';
import { useToast } from '../components/ui/Toast';
import { AuthContext } from './AuthContext';
import { getRefreshedToken } from '../services/api';

export const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [socket, setSocket] = useState(null);
  const queryClient = useQueryClient();
  const toast = useToast();

  const currentUserId = user?._id || user?.userId || user?.id;

  // ── 1. Unread Count Query ──
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: notificationService.getUnreadCount,
    enabled: Boolean(currentUserId && !loading),
    staleTime: 1000 * 30, // 30 seconds
    refetchOnWindowFocus: false,
    retry: 1, // Allow 1 retry after interceptor refresh
  });

  // ── 2. Active Platform Announcements Query ──
  const { data: announcements = [] } = useQuery({
    queryKey: ['announcements', 'active'],
    queryFn: notificationService.getActiveAnnouncements,
    enabled: Boolean(currentUserId && !loading),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // ── 3. Real-time WebSocket Connection ──
  useEffect(() => {
    if (!currentUserId) return;

    let active = true;
    let newSocket = null;

    const connectNotifications = async () => {
      const token = await storage.getAccessToken();
      if (!token || !active) return;

      const baseURL = import.meta.env.VITE_API_BASE_URL
        ? import.meta.env.VITE_API_BASE_URL.replace(/\/api\/?$/, '')
        : typeof window !== 'undefined' && window.location.origin
        ? window.location.origin
        : 'https://zeitnahacademy.com';

      newSocket = io(`${baseURL}/notifications`, {
        // Dynamic auth callback ensures every handshake and reconnect uses the latest token
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
        // Connected to /notifications socket
      });

      newSocket.on('notification', (newNotif) => {
        // Invalidate queries so lists update in realtime
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });

        // Gentle toast notification
        if (newNotif?.title) {
          toast.info(newNotif.title, newNotif.message || 'You have a new update');
        }
      });

      newSocket.on('announcement', () => {
        queryClient.invalidateQueries({ queryKey: ['announcements', 'active'] });
        queryClient.invalidateQueries({ queryKey: ['platform-announcements'] });
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
      });

      newSocket.on('notificationRead', () => {
        queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      });

      newSocket.on('connect_error', async (err) => {
        console.warn('[Socket:notifications] Connection error:', err.message);

        // If error indicates an authentication rejection or expired JWT, attempt token refresh
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
            // Token refresh failed permanently; halt reconnection attempts
            if (newSocket) {
              newSocket.disconnect();
            }
          }
        }
      });
    };

    connectNotifications();

    // Cross-component/tab auth refresh listener: update socket credentials dynamically
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

  // ── 4. Mutations ──
  const markAsReadMutation = useMutation({
    mutationFn: (id) => notificationService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: (category) => notificationService.markAllAsRead(category),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });

  const clearReadMutation = useMutation({
    mutationFn: notificationService.clearReadNotifications,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const dismissAnnouncementMutation = useMutation({
    mutationFn: (id) => notificationService.dismissAnnouncement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements', 'active'] });
      queryClient.invalidateQueries({ queryKey: ['platform-announcements'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });

  const acknowledgeAnnouncementMutation = useMutation({
    mutationFn: (id) => notificationService.acknowledgeAnnouncement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements', 'active'] });
      queryClient.invalidateQueries({ queryKey: ['platform-announcements'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });

  const markAsRead = useCallback(
    (id) => markAsReadMutation.mutate(id),
    [markAsReadMutation]
  );

  const markAllAsRead = useCallback(
    (category) => markAllAsReadMutation.mutate(category),
    [markAllAsReadMutation]
  );

  const clearRead = useCallback(
    () => clearReadMutation.mutate(),
    [clearReadMutation]
  );

  const dismissAnnouncement = useCallback(
    (id) => dismissAnnouncementMutation.mutate(id),
    [dismissAnnouncementMutation]
  );

  const acknowledgeAnnouncement = useCallback(
    (id) => acknowledgeAnnouncementMutation.mutate(id),
    [acknowledgeAnnouncementMutation]
  );

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        announcements,
        isDrawerOpen,
        setIsDrawerOpen,
        socket,
        markAsRead,
        markAllAsRead,
        clearRead,
        dismissAnnouncement,
        acknowledgeAnnouncement,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationContext;
