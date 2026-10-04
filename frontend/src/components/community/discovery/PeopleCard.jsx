import { useState } from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, Check, Clock, ExternalLink } from 'lucide-react';
import { getCanonicalProfileUrl } from '../../../utils/roleNavigation';
import { networkApi } from '../../../services/networkApi';
import toast from 'react-hot-toast';

/**
 * PeopleCard — Editorial profile discovery card for community peers.
 * Strictly uses verified real network profiles with zero fabricated stats.
 */
export default function PeopleCard({
  person,
  compact = false,
  onConnectSuccess,
}) {
  const [imgError, setImgError] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(
    person?.connectionStatus || 'none'
  );
  const [isPending, setIsPending] = useState(false);

  if (!person) return null;

  const personId = person._id || person.id;
  const name = person.name || 'Zeitnah Member';
  const username = person.username ? `@${person.username.replace(/^@/, '')}` : '';
  const profileUrl = getCanonicalProfileUrl(person);
  const avatar = person.avatar || person.profilePicture;
  const headline = person.headline || person.primaryDiscipline || '';
  const role = person.role || person.primaryRole;

  const initials = name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'Z';

  const handleConnect = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (connectionStatus !== 'none' || isPending || !personId) return;

    setIsPending(true);
    // Optimistic transition
    setConnectionStatus('outgoing_pending');

    try {
      await networkApi.sendConnectionRequest(personId);
      toast.success(`Connection request sent to ${name}`);
      if (onConnectSuccess) onConnectSuccess(personId);
    } catch (err) {
      // Rollback on failure
      setConnectionStatus('none');
      const msg = err?.response?.data?.message || 'Unable to send connection request. Please try again.';
      toast.error(msg);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div
      className={`
        flex items-center justify-between gap-3 p-3 rounded-xl
        bg-white/[0.025] hover:bg-white/[0.045] border border-white/[0.06] hover:border-brand-mint/30
        transition-all duration-150 group
      `}
    >
      <Link
        to={profileUrl}
        className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
        aria-label={`View ${name}'s profile`}
      >
        {/* Avatar */}
        <div className="relative shrink-0">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-[#12314C]/40 border border-white/10 group-hover:border-brand-mint/50 flex items-center justify-center transition-colors">
            {avatar && !imgError ? (
              <img
                src={avatar}
                alt={name}
                onError={() => setImgError(true)}
                className="w-full h-full object-cover"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <span className="text-xs font-bold text-brand-mint select-none tracking-wider">
                {initials}
              </span>
            )}
          </div>
          {role && role.toLowerCase() !== 'student' && role.toLowerCase() !== 'member' && (
            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-brand-mint border-2 border-[#0B111E] flex items-center justify-center" title={role} />
          )}
        </div>

        {/* Identity Details */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h5 className="text-xs sm:text-sm font-semibold text-white group-hover:text-brand-mint transition-colors truncate">
              {name}
            </h5>
            {role && role.toLowerCase() !== 'student' && role.toLowerCase() !== 'member' && (
              <span className="hidden sm:inline-block text-[10px] px-1.5 py-0.2 rounded bg-brand-mint/10 border border-brand-mint/20 text-brand-mint font-medium capitalize">
                {role.toLowerCase()}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-text-muted mt-0.5 truncate">
            {username && <span className="text-text-faint truncate">{username}</span>}
            {username && headline && <span className="text-white/20">•</span>}
            {headline && <span className="truncate">{headline}</span>}
          </div>
        </div>
      </Link>

      {/* Connect / Status Action */}
      <div className="shrink-0 flex items-center gap-1.5">
        {connectionStatus === 'connected' ? (
          <span className="min-h-[36px] px-3 py-1 rounded-lg bg-brand-mint/10 border border-brand-mint/20 text-brand-mint text-xs font-semibold flex items-center gap-1">
            <Check className="w-3.5 h-3.5" />
            <span className={compact ? 'hidden' : 'inline'}>Connected</span>
          </span>
        ) : connectionStatus === 'outgoing_pending' || connectionStatus === 'pending' ? (
          <span className="min-h-[36px] px-3 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-text-muted text-xs font-medium flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-brand-yellow" />
            <span className={compact ? 'hidden' : 'inline'}>Pending</span>
          </span>
        ) : (
          <button
            type="button"
            onClick={handleConnect}
            disabled={isPending}
            className={`
              min-h-[36px] px-3 py-1 rounded-lg text-xs font-bold
              bg-brand-mint text-bg-base hover:opacity-95 active:scale-[0.97]
              transition-all duration-150 flex items-center gap-1 cursor-pointer
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
            aria-label={`Connect with ${name}`}
          >
            <UserPlus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Connect</span>
          </button>
        )}

        <Link
          to={profileUrl}
          className="min-w-[36px] min-h-[36px] rounded-lg bg-white/[0.02] hover:bg-white/[0.06] text-text-faint hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          aria-label={`Open ${name}'s profile`}
          title="View profile"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
