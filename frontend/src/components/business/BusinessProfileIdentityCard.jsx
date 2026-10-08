import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ExternalLink } from 'lucide-react';
import BusinessLogo from './BusinessLogo';
import { getBusinessProfileUrl } from '../../utils/businessProfile';

/**
 * BusinessProfileIdentityCard — Minimal, premium identity representation for Phase 1.
 *
 * Demonstrates the Business Profile foundation:
 * - Displays normalized business name, type, and industry
 * - Renders business logo with automatic error fallback
 * - Displays verification status badge
 * - Canonical link to existing /businesses/:slug route
 */
export default function BusinessProfileIdentityCard({
  business,
  className = '',
  compact = false,
  showLink = true,
}) {
  if (!business) {
    return null;
  }

  const profileUrl = getBusinessProfileUrl(business.slug);

  if (compact) {
    return (
      <div className={`flex items-center gap-2.5 min-w-0 ${className}`}>
        <BusinessLogo
          logo={business.logo}
          name={business.name}
          size="sm"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 truncate">
            <span className="text-xs font-semibold text-white truncate">
              {business.name}
            </span>
            {business.isVerified && (
              <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" aria-label="Verified" />
            )}
          </div>
          <p className="text-[10px] font-mono text-brand-mint/80 uppercase tracking-wider leading-none mt-0.5">
            Business Profile
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`p-4 rounded-2xl bg-gradient-to-br from-[#0E1626] to-[#0A101D] border border-white/[0.08] shadow-lg flex items-center justify-between gap-4 ${className}`}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <BusinessLogo
          logo={business.logo}
          name={business.name}
          size="md"
        />
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-white truncate">
              {business.name}
            </h3>
            {business.isVerified && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-2.5 h-2.5" />
                <span>Verified</span>
              </span>
            )}
          </div>
          <p className="text-xs text-text-muted mt-0.5 truncate">
            {business.type?.replace(/_/g, ' ') || 'Company'}
            {business.industry ? ` • ${business.industry}` : ''}
          </p>
          <span className="inline-block text-[9px] font-mono font-semibold uppercase tracking-wider text-brand-mint/90 mt-1">
            Business Profile
          </span>
        </div>
      </div>

      {showLink && business.slug && (
        <Link
          to={profileUrl}
          className="shrink-0 p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-text-muted hover:text-white transition-colors"
          title="View public business profile"
          aria-label={`View ${business.name} public profile`}
        >
          <ExternalLink className="w-4 h-4" />
        </Link>
      )}
    </div>
  );
}
