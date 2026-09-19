import { useAnnouncements } from "../../hooks/useAnnouncements";
import AnnouncementCard from "./AnnouncementCard";
import AnnouncementCarousel from "./AnnouncementCarousel";
import AnnouncementSkeleton from "./AnnouncementSkeleton";

export default function AnnouncementBanner() {
  const { activeAnnouncements, isActiveLoading, isActiveError, dismiss } =
    useAnnouncements();

  // If loading: render skeleton to eliminate layout shift
  if (isActiveLoading) {
    return <AnnouncementSkeleton />;
  }

  // If error or empty: render nothing (do not break course experience)
  if (isActiveError || !activeAnnouncements || activeAnnouncements.length === 0) {
    return null;
  }

  // Single announcement
  if (activeAnnouncements.length === 1) {
    return (
      <AnnouncementCard
        announcement={activeAnnouncements[0]}
        onDismiss={dismiss}
        isSingle
      />
    );
  }

  // Multiple announcements: render carousel
  return (
    <AnnouncementCarousel
      announcements={activeAnnouncements}
      onDismiss={dismiss}
    />
  );
}
