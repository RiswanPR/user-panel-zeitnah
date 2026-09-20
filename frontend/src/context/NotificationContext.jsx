/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { storage } from '../services/storage';
import notificationService from '../services/notificationService';
import { useToast } from '../components/ui/Toast';
import { AuthContext } from './AuthContext';

export const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [socket, setSocket] = useState(null);
  const queryClient = useQueryClient();
  const toast = useToast();

  const currentUserId = user?._id || user?.userId || user?.id;

  // ── 1. Unread Count Query ──
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: notificationService.getUnreadCount,
    enabled: Boolean(currentUserId),
    staleTime: 1000 * 30, // 30 seconds
    refetchOnWindowFocus: true,
  });

  // ── 2. Active Platform Announcements Query ──
  const { data: announcements = [] } = useQuery({
    queryKey: ['announcements', 'active'],
    queryFn: notificationService.getActiveAnnouncements,
    enabled: Boolean(currentUserId),
    staleTime: 1000 * 60 * 5, // 5 minutes
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
        auth: { token },
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnectionAttempts: 5,
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
      });

      newSocket.on('notificationRead', () => {
        queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      });

      newSocket.on('connect_error', (err) => {
        console.warn('[Socket:notifications] Connection error:', err.message);
      });
    };

    connectNotifications();

    return () => {
      active = false;
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
