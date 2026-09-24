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
} from 'lucide-react';
import { getUploadUrl } from '../../utils/courseUi';

/**
 * Format relative time concisely
 */
function formatRelativeTime(dateString) {
  if (!dateString) return 'Just now';
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateString).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Returns category & priority tailored icon and color tokens
 */
function getCategoryIconConfig(category, priority, type) {
  const prioUpper = (priority || '').toUpperCase();
  const isCritical = prioUpper === 'CRITICAL' || category === 'security';
  const isHigh = prioUpper === 'HIGH' || prioUpper === 'IMPORTANT';

  if (isCritical) {
    return {
      Icon: ShieldAlert,
      iconColor: 'text-rose-400',
      bgGlow: 'bg-rose-500/15 border-rose-500/30',
    };
  }

  if (category === 'announcements' || type === 'ANNOUNCEMENT') {
    return {
      Icon: Megaphone,
      iconColor: isHigh ? 'text-amber-400' : 'text-brand-mint',
      bgGlow: isHigh ? 'bg-amber-500/15 border-amber-500/30' : 'bg-brand-mint/15 border-brand-mint/30',
    };
  }

  switch (category) {
    case 'social':
    case 'connections':
      return {
        Icon: Users,
        iconColor: 'text-[#E3D9FC]',
        bgGlow: 'bg-[#4928C2]/15 border-[#4928C2]/30',
      };
    case 'learning':
    case 'course':
      return {
        Icon: BookOpen,
        iconColor: 'text-brand-mint',
        bgGlow: 'bg-brand-mint/15 border-brand-mint/30',
      };
    case 'achievement':
    case 'leaderboard':
      return {
        Icon: Trophy,
        iconColor: 'text-brand-yellow',
        bgGlow: 'bg-brand-yellow/15 border-brand-yellow/30',
      };
    case 'community':
    case 'spaces':
      return {
        Icon: MessageSquare,
        iconColor: 'text-violet-400',
        bgGlow: 'bg-violet-500/15 border-violet-500/30',
      };
    default:
      return {
        Icon: Sparkles,
        iconColor: 'text-cyan-400',
        bgGlow: 'bg-cyan-500/15 border-cyan-500/30',
      };
  }
}

export default function NotificationItem({
  notification,
  onMarkRead,
  onCloseDrawer,
}) {
  const navigate = useNavigate();
  const isUnread = notification.isRead === false || !notification.readAt;
  const prioUpper = (notification.priority || 'NORMAL').toUpperCase();
  const isCritical = prioUpper === 'CRITICAL';
  const isHigh = prioUpper === 'HIGH' || prioUpper === 'IMPORTANT';

  const { Icon, iconColor, bgGlow } = getCategoryIconConfig(
    notification.category,
    notification.priority,
    notification.type,
  );

  const actorAvatar = notification.actor?.avatar
    ? getUploadUrl(notification.actor.avatar)
    : null;

  const targetLink =
    notification.actionUrl ||
    notification.targetUrl ||
    notification.metadata?.cta?.url ||
    '';

  const handleClick = () => {
    if (isUnread && onMarkRead) {
      onMarkRead(notification.id || notification._id);
    }
    if (targetLink) {
      if (onCloseDrawer) onCloseDrawer();
      if (targetLink.startsWith('http://') || targetLink.startsWith('https://')) {
        window.open(targetLink, '_blank', 'noopener,noreferrer');
      } else {
        navigate(targetLink);
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
          handleClick();
        }
      }}
      className={`group relative flex items-start gap-3.5 p-4 rounded-2xl border transition-all duration-200 cursor-pointer focus-ring select-none ${
        isUnread
          ? 'border-white/[0.12] bg-white/[0.04] hover:bg-white/[0.07] hover:border-brand-mint/30 shadow-sm'
          : 'border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.03] opacity-80 hover:opacity-100'
      }`}
    >
      {/* Unread Indicator Dot */}
      {isUnread && (
        <span
          className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-brand-mint shadow-[0_0_6px_rgba(159,213,178,0.6)]"
          aria-hidden="true"
        />
      )}

      {/* Left Icon or Avatar */}
      <div className="relative shrink-0">
        {actorAvatar ? (
          <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 shadow-sm">
            <img
              src={actorAvatar}
              alt={notification.actor?.name || 'User'}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div
            className={`w-10 h-10 rounded-xl border flex items-center justify-center shadow-inner ${bgGlow}`}
          >
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
        )}
      </div>

      {/* Center Content */}
      <div className="flex-1 min-w-0 pr-2">
        <div className="flex items-center gap-1.5 sm:gap-2 mb-1 flex-wrap">
          {isCritical && (
            <span className="px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
              Critical
            </span>
          )}
          {isHigh && (
            <span className="px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Important
            </span>
          )}
          {notification.allowDismiss === false && (
            <span className="px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase tracking-wider bg-violet-500/20 text-violet-300 border border-violet-500/30">
              Required
            </span>
          )}
          <span className="text-[10px] font-mono font-medium text-text-faint uppercase tracking-wider">
            {notification.category || 'General'}
          </span>
          <span className="text-text-faint text-[10px]">•</span>
          <span className="text-[11px] font-medium text-text-muted">
            {formatRelativeTime(notification.createdAt)}
          </span>
        </div>

        <h4
          className={`text-xs sm:text-[13px] leading-snug break-words ${
            isUnread ? 'font-bold text-white' : 'font-semibold text-white/80'
          }`}
        >
          {notification.title}
        </h4>

        <p className="text-xs text-text-secondary mt-0.5 leading-relaxed line-clamp-2 break-words">
          {notification.message}
        </p>

        {/* Action Link Indicator if link exists */}
        {targetLink && (
          <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-brand-mint group-hover:underline">
            <span>View Details</span>
            <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
          </div>
        )}
      </div>
    </div>
  );
}
