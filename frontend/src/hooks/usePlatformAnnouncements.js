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
    mutationFn: (id) => announcementsApi.dismissAnnouncement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-announcements'] });
    },
  });

  return {
    announcements: query.data || [],
    isLoading: query.isLoading,
    dismissAnnouncement: dismissMutation.mutate,
    isDismissing: dismissMutation.isPending,
  };
}
