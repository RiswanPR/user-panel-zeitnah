import { useMemo } from "react";
import { Link } from "react-router-dom";
import AnnouncementIcon from "./AnnouncementIcon";

/**
 * Format timestamp into human readable relative string
 */
function formatRelativeTime(dateString) {
  if (!dateString) return "Recently";
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();

  if (diffMs < 0) return "Upcoming";
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDays = Math.floor(diffHour / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function NotificationItem({ announcement, onRead, onClose }) {
  const { id, type, title, message, cta, isRead, createdAt, startsAt } =
    announcement;

  const relativeTime = useMemo(
    () => formatRelativeTime(startsAt || createdAt),
    [startsAt, createdAt]
  );

  const handleClick = () => {
    if (!isRead && onRead) {
      onRead(id);
    }
    if (onClose) {
      onClose();
    }
  };

  const content = (
    <div
      onClick={handleClick}
      className={`group relative flex items-start gap-3 p-3 sm:p-3.5 rounded-xl transition-all duration-200 cursor-pointer ${
        isRead
          ? "bg-transparent hover:bg-white/[0.03] text-text-muted"
          : "bg-white/[0.03] hover:bg-white/[0.06] text-white"
      }`}
    >
      {/* Unread / Read indicator */}
      <div className="mt-1 shrink-0 flex items-center justify-center w-3 h-3">
        {isRead ? (
          <span className="w-1.5 h-1.5 rounded-full border border-text-faint/60" />
        ) : (
          <span className="w-2 h-2 rounded-full bg-brand-mint shadow-[0_0_8px_rgba(159,213,178,0.5)]" />
        )}
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1">
            <AnnouncementIcon type={type} className="w-2.5 h-2.5" />
            <span className="truncate">{type}</span>
          </span>
          <span className="text-[10px] font-medium text-text-faint shrink-0">
            {relativeTime}
          </span>
        </div>

        <h4
          className={`text-xs sm:text-sm font-semibold leading-snug line-clamp-2 transition-colors ${
            isRead
              ? "text-text-secondary group-hover:text-white"
              : "text-white group-hover:text-brand-mint"
          }`}
        >
          {title}
        </h4>

        <p className="text-[11px] font-medium text-text-muted leading-relaxed line-clamp-2">
          {message}
        </p>
      </div>
    </div>
  );

  if (cta?.url) {
    const isExternal =
      cta.url.startsWith("http://") || cta.url.startsWith("https://");
    if (isExternal) {
      return (
        <a
          href={cta.url}
          target="_blank"
          rel="noreferrer"
          className="block no-underline"
        >
          {content}
        </a>
      );
    }
    return (
      <Link to={cta.url} className="block no-underline">
        {content}
      </Link>
    );
  }

  return content;
}
