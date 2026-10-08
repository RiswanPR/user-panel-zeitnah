import React from 'react';
import { Check, User, Building2 } from 'lucide-react';
import { useActiveProfile } from '../../context/ActiveProfileContext';
import BusinessLogo from '../business/BusinessLogo';
import { getUploadUrl } from '../../utils/courseUi';

/**
 * ProfileSwitcher — Reusable Profile Selector Component (Phase 2.5)
 *
 * Allows switching between Personal Profile and multiple eligible Business Profiles.
 * Shared between desktop MainNavbar and mobile MobileMoreDrawer.
 *
 * UX contract:
 * - If user has no eligible business, renders nothing (personal profile only).
 * - Clearly surfaces Personal Profile and every eligible Business Profile.
 * - Shows visual checkmark on the currently active profile.
 * - Scrollable container prevents layout overflow when user owns/manages many businesses.
 * - Keyboard accessible, focus-safe, and screen-reader friendly.
 */
export default function ProfileSwitcher({ user, onSelect, className = '' }) {
  const {
    isPersonalMode,
    isBusinessMode,
    activeBusinessId,
    businesses,
    hasBusinessProfile,
    switchToPersonal,
    switchToBusiness,
  } = useActiveProfile();

  // If user has no eligible business profiles, there is nothing to switch between
  if (!hasBusinessProfile || !businesses || businesses.length === 0) {
    return null;
  }

  const avatarUrl = user?.avatar ? getUploadUrl(user.avatar) : null;
  const userInitials = (() => {
    const name = user?.name?.trim();
    if (!name) return 'U';
    return name.split(/\s+/).map((p) => p[0]).filter(Boolean).join('').slice(0, 2).toUpperCase() || 'U';
  })();

  const handleSelectPersonal = () => {
    if (!isPersonalMode) {
      switchToPersonal();
    }
    onSelect?.({ type: 'personal' });
  };

  const handleSelectBusiness = (businessId) => {
    if (!isBusinessMode || activeBusinessId !== businessId) {
      switchToBusiness(businessId);
    }
    onSelect?.({ type: 'business', businessId });
  };

  return (
    <div className={`py-1 ${className}`}>
      <div className="px-2.5 py-1 flex items-center justify-between">
        <span
          className="font-mono text-[9px] uppercase tracking-wider text-white/35 font-semibold select-none"
        >
          Active Profile
        </span>
        <span
          className="font-mono text-[8.5px] text-white/25 select-none"
        >
          {1 + businesses.length} profiles
        </span>
      </div>

      <div
        className="mt-0.5 space-y-1 max-h-[190px] overflow-y-auto pr-0.5"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255,255,255,0.1) transparent',
        }}
        role="group"
        aria-label="Profile selector"
      >
        {/* 1. Personal Profile Option */}
        <button
          type="button"
          onClick={handleSelectPersonal}
          aria-pressed={isPersonalMode}
          aria-label={`Switch to Personal Profile (${user?.name || 'Account'})`}
          className={`w-full flex items-center justify-between gap-2.5 px-2.5 py-1.5 rounded-xl transition-all duration-150 text-left cursor-pointer group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-mint/50 ${
            isPersonalMode
              ? 'bg-white/[0.07] border border-white/[0.12]'
              : 'hover:bg-white/[0.035] border border-transparent text-white/70'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Personal Avatar */}
            <div
              className="shrink-0 flex items-center justify-center overflow-hidden"
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(159,213,178,0.2) 0%, rgba(18,49,76,0.6) 100%)',
                border: isPersonalMode ? '1.5px solid rgba(159,213,178,0.5)' : '1px solid rgba(255,255,255,0.15)',
              }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" aria-hidden="true" className="w-full h-full object-cover" />
              ) : (
                <span className="font-mono font-bold text-brand-mint text-[9px]">
                  {userInitials}
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p
                className={`truncate leading-tight font-medium ${
                  isPersonalMode ? 'text-white font-semibold' : 'text-white/80 group-hover:text-white'
                }`}
                style={{ fontSize: '12px' }}
              >
                {user?.name || 'Personal Profile'}
              </p>
              <p
                className="font-mono text-white/40 truncate leading-tight mt-0.5"
                style={{ fontSize: '9.5px' }}
              >
                {user?.username ? `@${user.username}` : 'Personal account'}
              </p>
            </div>
          </div>

          {isPersonalMode ? (
            <span
              className="shrink-0 flex items-center justify-center rounded-full bg-brand-mint/15 text-brand-mint p-0.5"
              title="Active profile"
              aria-label="Active profile"
            >
              <Check className="w-3.5 h-3.5" aria-hidden="true" />
            </span>
          ) : (
            <span
              className="font-mono text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded text-white/30 group-hover:text-white/50"
            >
              Switch
            </span>
          )}
        </button>

        {/* 2. Business Profile Options */}
        {businesses.map((biz) => {
          const isSelected = isBusinessMode && activeBusinessId === biz.id;

          return (
            <button
              key={biz.id}
              type="button"
              onClick={() => handleSelectBusiness(biz.id)}
              aria-pressed={isSelected}
              aria-label={`Switch to Business Profile (${biz.name})`}
              className={`w-full flex items-center justify-between gap-2.5 px-2.5 py-1.5 rounded-xl transition-all duration-150 text-left cursor-pointer group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-mint/50 ${
                isSelected
                  ? 'bg-brand-mint/[0.09] border border-brand-mint/30'
                  : 'hover:bg-white/[0.035] border border-transparent text-white/70'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Business Logo */}
                <div
                  className="shrink-0 flex items-center justify-center overflow-hidden rounded-md"
                  style={{
                    width: '26px',
                    height: '26px',
                    border: isSelected ? '1.5px solid rgba(159,213,178,0.5)' : '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  <BusinessLogo
                    logo={biz.logo}
                    name={biz.name}
                    size="xs"
                    className="!w-full !h-full !rounded-none border-0"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <p
                    className={`truncate leading-tight font-medium ${
                      isSelected ? 'text-white font-semibold' : 'text-white/80 group-hover:text-white'
                    }`}
                    style={{ fontSize: '12px' }}
                  >
                    {biz.name}
                  </p>
                  <p
                    className="font-mono text-white/40 truncate leading-tight mt-0.5"
                    style={{ fontSize: '9.5px' }}
                  >
                    @{biz.slug || 'business'}
                  </p>
                </div>
              </div>

              {isSelected ? (
                <span
                  className="shrink-0 flex items-center justify-center rounded-full bg-brand-mint/15 text-brand-mint p-0.5"
                  title="Active business"
                  aria-label="Active business"
                >
                  <Check className="w-3.5 h-3.5" aria-hidden="true" />
                </span>
              ) : (
                <span
                  className="font-mono text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded text-white/30 group-hover:text-white/50"
                >
                  Switch
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
