import api from "./api";

export type AnnouncementType =
  | "maintenance"
  | "critical"
  | "important"
  | "platform"
  | "course"
  | "content"
  | "feature"
  | "event"
  | "general";

export type AnnouncementPriority =
  | "critical"
  | "maintenance"
  | "important"
  | "high"
  | "normal"
  | "low";

export interface Announcement {
  id: string;
  type: AnnouncementType;
  priority: AnnouncementPriority;
  eyebrow?: string;
  title: string;
  message: string;
  cta?: {
    label: string;
    url: string;
  };
  allowDismiss: boolean;
  startsAt: string;
  expiresAt?: string | null;
  isPublished: boolean;
  isRead: boolean;
  isDismissed: boolean;
  createdAt: string;
}

export const fetchActiveAnnouncements = async (): Promise<Announcement[]> => {
  const res = await api.get<{ announcements: Announcement[] }>("/announcements/active");
  return res.data.announcements || [];
};

export const fetchAllAnnouncements = async (): Promise<Announcement[]> => {
  const res = await api.get<{ announcements: Announcement[] }>("/announcements");
  return res.data.announcements || [];
};

export const markAnnouncementRead = async (
  id: string
): Promise<{ success: boolean; message: string }> => {
  const res = await api.post(`/announcements/${id}/read`);
  return res.data;
};

export const dismissAnnouncement = async (
  id: string
): Promise<{ success: boolean; message: string }> => {
  const res = await api.post(`/announcements/${id}/dismiss`);
  return res.data;
};

export const markAllAnnouncementsRead = async (): Promise<{
  success: boolean;
  count: number;
}> => {
  const res = await api.post("/announcements/mark-all-read");
  return res.data;
};
