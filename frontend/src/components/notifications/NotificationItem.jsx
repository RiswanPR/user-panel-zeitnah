import { useNavigate } from 'react-router-dom';
import {
  Users,
  BookOpen,
  Trophy,
  MessageSquare,
  ShieldAlert,
  Sparkles,
  ArrowRight,
  Megaphone,
  Briefcase,
  CheckCircle2,
} from 'lucide-react';
import {
  extractNotificationActor,
  resolveNotificationRoute,
  formatNotificationTime,
  getNotificationPresentation,
  getNotificationId,
} from '../../utils/notificationUtils';

/**
 * Returns contextual icon component and visual classes based on category & priority
 */
function getIconForCategory(iconCategory, isCritical, isHigh) {
  if (isCritical) {
    return {
      Icon: ShieldAlert,
      iconColor: 'text-rose-400',
      badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      glowBg: 'bg-rose-500/10 border-rose-500/25',
    };
  }
  if (iconCategory === 'announcement') {
    return {
      Icon: Megaphone,
      iconColor: isHigh ? 'text-amber-400' : 'text-brand-mint',
      badgeBg: isHigh ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-brand-mint/20 text-brand-mint border-brand-mint/30',
      glowBg: isHigh ? 'bg-amber-500/10 border-amber-500/25' : 'bg-brand-mint/10 border-brand-mint/25',
    };
  }
  if (iconCategory === 'social') {
    return {
      Icon: Users,
      iconColor: 'text-indigo-300',
      badgeBg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
      glowBg: 'bg-indigo-500/10 border-indigo-500/25',
    };
  }
  if (iconCategory === 'learning') {
    return {
      Icon: BookOpen,
      iconColor: 'text-brand-mint',
      badgeBg: 'bg-brand-mint/20 text-brand-mint border-brand-mint/30',
      glowBg: 'bg-brand-mint/10 border-brand-mint/25',
    };
  }
  if (iconCategory === 'achievement') {
    return {
      Icon: Trophy,
      iconColor: 'text-amber-400',
      badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      glowBg: 'bg-amber-500/10 border-amber-500/25',
    };
  }
  if (iconCategory === 'opportunity') {
    return {
      Icon: Briefcase,
      iconColor: 'text-emerald-400',
      badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      glowBg: 'bg-emerald-500/10 border-emerald-500/25',
    };
  }
  if (iconCategory === 'message') {
    return {
      Icon: MessageSquare,
      iconColor: 'text-cyan-400',
      badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      glowBg: 'bg-cyan-500/10 border-cyan-500/25',
    };
  }
  if (iconCategory === 'identity') {
    return {
      Icon: CheckCircle2,
      iconColor: 'text-teal-300',
      badgeBg: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
      glowBg: 'bg-teal-500/10 border-teal-500/25',
    };
  }

  return {
    Icon: Sparkles,
    iconColor: 'text-text-muted',
    badgeBg: 'bg-white/[0.06] text-text-muted border-white/[0.1]',
    glowBg: 'bg-white/[0.04] border-white/[0.08]',
  };
}

export default function NotificationItem({
  notification,
  onMarkRead,
  onCloseDrawer,
  compact = false,
}) {
  const navigate = useNavigate();

  const id = getNotificationId(notification);
  const actor = extractNotificationActor(notification);
  const route = resolveNotificationRoute(notification);
  const presentation = getNotificationPresentation(notification);

  const { Icon, iconColor, glowBg } = getIconForCategory(
    presentation.iconCategory,
    presentation.isCritical,
    presentation.isHigh
  );

  const handleClick = (e) => {
    // If clicking an action or link inside
    if (presentation.isUnread && onMarkRead && id) {
      onMarkRead(id);
    }

    if (onCloseDrawer) {
      onCloseDrawer();
    }

    if (route.isNavigable && route.url) {
      if (route.isExternal) {
        window.open(route.url, '_blank', 'noopener,noreferrer');
      } else {
        navigate(route.url);
      }
    }
  };

  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick(e);
        }
      }}
      aria-label={`${presentation.title}. ${presentation.isUnread ? 'Unread notification' : 'Read notification'}`}
      className={`group relative flex items-start gap-3 transition-all duration-150 cursor-pointer focus-ring select-none text-left rounded-xl ${
        compact ? 'p-3' : 'p-3.5 sm:p-4'
      } ${
        presentation.isUnread
          ? 'bg-brand-mint/[0.04] hover:bg-brand-mint/[0.07] border border-brand-mint/25 shadow-sm'
          : 'bg-white/[0.015] hover:bg-white/[0.04] border border-white/[0.05] opacity-85 hover:opacity-100'
      }`}
    >
      {/* Unread Indicator Bar / Dot */}
      {presentation.isUnread && (
        <span
          className="absolute -left-0.5 top-1/2 -translate-y-1/2 w-1.5 h-6 rounded-r-full bg-brand-mint shadow-[0_0_8px_rgba(159,213,178,0.7)]"
          aria-hidden="true"
        />
      )}

      {/* Actor Avatar or Category Icon with Mini Overlay Badge */}
      <div className="relative shrink-0 mt-0.5">
        {actor.avatarUrl ? (
          <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl overflow-hidden border border-white/10 shadow-sm bg-bg-surface">
            <img
              src={actor.avatarUrl}
              alt={actor.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            {/* Context Badge overlay */}
            <span
              className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border border-bg-base flex items-center justify-center ${glowBg}`}
            >
              <Icon className={`w-2.5 h-2.5 ${iconColor}`} />
            </span>
          </div>
        ) : (
          <div
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl border flex items-center justify-center shadow-inner ${glowBg}`}
          >
            <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${iconColor}`} />
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0">
        {/* Metadata Header: Category, Priority Badge, Time */}
        <div className="flex items-center justify-between gap-1.5 mb-1 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            {presentation.priorityBadge && (
              <span
                className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase tracking-wider border ${
                  presentation.isCritical
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}
              >
                {presentation.priorityBadge}
              </span>
            )}
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-text-muted">
              {presentation.categoryLabel}
            </span>
          </div>

          <span className="text-[10px] text-text-faint whitespace-nowrap">
            {formatNotificationTime(notification.createdAt)}
          </span>
        </div>

        {/* Title */}
        <h4
          className={`text-xs sm:text-[13px] leading-snug break-words ${
            presentation.isUnread
              ? 'font-bold text-white'
              : 'font-semibold text-white/80'
          }`}
        >
          {presentation.title}
        </h4>

        {/* Message */}
        <p className="text-[11px] sm:text-xs text-text-secondary mt-0.5 leading-relaxed line-clamp-2 break-words">
          {presentation.message}
        </p>

        {/* Action Link if navigable */}
        {route.isNavigable && (
          <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold text-brand-mint group-hover:underline">
            <span>View details</span>
            <ArrowRight className="w-2.5 h-2.5 transition-transform group-hover:translate-x-0.5" />
          </div>
        )}
      </div>
    </div>
  );
}
