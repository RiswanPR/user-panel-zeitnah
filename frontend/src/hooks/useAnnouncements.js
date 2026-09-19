import { useContext, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchActiveAnnouncements,
  fetchAllAnnouncements,
  markAnnouncementRead,
  dismissAnnouncement as apiDismissAnnouncement,
  markAllAnnouncementsRead,
} from "../services/announcementsApi";
import { SocketContext } from "../context/SocketContext";

export function useAnnouncements() {
  const queryClient = useQueryClient();
  const socketCtx = useContext(SocketContext);
  const socket = socketCtx?.socket;

  // 1. Fetch active announcements (for banner on /courses)
  const {
    data: activeAnnouncements = [],
    isLoading: isActiveLoading,
    isError: isActiveError,
    error: activeError,
  } = useQuery({
    queryKey: ["announcements", "active"],
    queryFn: fetchActiveAnnouncements,
    staleTime: 1000 * 60 * 3, // 3 minutes
    gcTime: 1000 * 60 * 15,
  });

  // 2. Fetch all announcements (for Notification Center history)
  const {
    data: allAnnouncements = [],
    isLoading: isAllLoading,
    isError: isAllError,
  } = useQuery({
    queryKey: ["announcements", "all"],
    queryFn: fetchAllAnnouncements,
    staleTime: 1000 * 60 * 3,
    gcTime: 1000 * 60 * 15,
  });

  // 3. Listen to WebSocket events for real-time invalidation
  useEffect(() => {
    if (!socket) return;

    const handleAnnouncementEvent = () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
    };

    socket.on("announcement", handleAnnouncementEvent);
    socket.on("notification", handleAnnouncementEvent);

    return () => {
      socket.off("announcement", handleAnnouncementEvent);
      socket.off("notification", handleAnnouncementEvent);
    };
  }, [socket, queryClient]);

  // 4. Mark single announcement as read
  const markReadMutation = useMutation({
    mutationFn: markAnnouncementRead,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["announcements"] });

      // Optimistically update active
      queryClient.setQueryData(
        ["announcements", "active"],
        (old = []) =>
          old.map((a) => (a.id === id ? { ...a, isRead: true } : a))
      );

      // Optimistically update all
      queryClient.setQueryData(
        ["announcements", "all"],
        (old = []) =>
          old.map((a) => (a.id === id ? { ...a, isRead: true } : a))
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
  });

  // 5. Dismiss announcement from banner
  const dismissMutation = useMutation({
    mutationFn: apiDismissAnnouncement,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["announcements"] });

      // Remove immediately from active banner
      queryClient.setQueryData(
        ["announcements", "active"],
        (old = []) => old.filter((a) => a.id !== id)
      );

      // Update isDismissed & isRead in all history
      queryClient.setQueryData(
        ["announcements", "all"],
        (old = []) =>
          old.map((a) =>
            a.id === id ? { ...a, isDismissed: true, isRead: true } : a
          )
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
  });

  // 6. Mark all as read
  const markAllReadMutation = useMutation({
    mutationFn: markAllAnnouncementsRead,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["announcements"] });

      queryClient.setQueryData(
        ["announcements", "active"],
        (old = []) => old.map((a) => ({ ...a, isRead: true }))
      );

      queryClient.setQueryData(
        ["announcements", "all"],
        (old = []) => old.map((a) => ({ ...a, isRead: true }))
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
  });

  // 7. Calculate unread count
  const unreadCount = useMemo(() => {
    return allAnnouncements.filter((a) => !a.isRead).length;
  }, [allAnnouncements]);

  const markRead = useCallback(
    (id) => markReadMutation.mutate(id),
    [markReadMutation]
  );

  const dismiss = useCallback(
    (id) => dismissMutation.mutate(id),
    [dismissMutation]
  );

  const markAllRead = useCallback(
    () => markAllReadMutation.mutate(),
    [markAllReadMutation]
  );

  return {
    activeAnnouncements,
    allAnnouncements,
    unreadCount,
    isActiveLoading,
    isActiveError,
    activeError,
    isAllLoading,
    isAllError,
    markRead,
    dismiss,
    markAllRead,
  };
}
