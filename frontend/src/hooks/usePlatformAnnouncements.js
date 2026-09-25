import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { announcementsApi } from '../services/announcementsApi';

export function usePlatformAnnouncements() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['platform-announcements'],
    queryFn: () => announcementsApi.getPlatformAnnouncements(),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  const dismissMutation = useMutation({
    mutationFn: (id) => {
      const cleanId = String(id || '').trim();
      if (!cleanId || cleanId === 'undefined' || cleanId === 'null') {
        return Promise.reject(new Error('Invalid announcement identifier'));
      }
      return announcementsApi.dismissAnnouncement(cleanId);
    },
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-announcements'] });
      queryClient.invalidateQueries({ queryKey: ['announcements', 'active'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });

  const acknowledgeMutation = useMutation({
    mutationFn: (id) => {
      const cleanId = String(id || '').trim();
      if (!cleanId || cleanId === 'undefined' || cleanId === 'null') {
        return Promise.reject(new Error('Invalid announcement identifier'));
      }
      return announcementsApi.acknowledgeAnnouncement(cleanId);
    },
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-announcements'] });
      queryClient.invalidateQueries({ queryKey: ['announcements', 'active'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });

  return {
    announcements: query.data || [],
    isLoading: query.isLoading,
    dismissAnnouncement: dismissMutation.mutate,
    isDismissing: dismissMutation.isPending,
    acknowledgeAnnouncement: acknowledgeMutation.mutate,
    isAcknowledging: acknowledgeMutation.isPending,
  };
}

export default usePlatformAnnouncements;
