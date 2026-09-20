import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useContext, useEffect } from 'react';
import { notificationsApi } from '../services/notificationsApi';
import { SocketContext } from '../context/SocketContext';

export function useNotifications(params = {}) {
  const queryClient = useQueryClient();
  const { socket } = useContext(SocketContext) || {};

  const queryKey = ['notifications', params];

  const query = useQuery({
    queryKey,
    queryFn: () => notificationsApi.getNotifications(params),
    staleTime: 1000 * 30, // 30s
    refetchInterval: 1000 * 60, // Poll every 60s
  });

  // Listen for real-time notifications via socket
  useEffect(() => {
    if (!socket) return;

    const handleNotification = (notif) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    };

    socket.on('notification', handleNotification);
    return () => {
      socket.off('notification', handleNotification);
    };
  }, [socket, queryClient]);

  const markReadMutation = useMutation({
    mutationFn: (id) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  return {
    notifications: query.data?.notifications || [],
    unreadCount: query.data?.unreadCount || 0,
    total: query.data?.total || 0,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    markAsRead: markReadMutation.mutate,
    markAllAsRead: markAllReadMutation.mutate,
    isMarkingRead: markReadMutation.isPending || markAllReadMutation.isPending,
  };
}
