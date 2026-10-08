import React from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Search, Bookmark, Building2, Sparkles } from 'lucide-react';
import BusinessLogo from '../../business/BusinessLogo';
import { getBusinessProfileUrl } from '../../../utils/businessProfile';
import BrandAmbientShape from '../ui/BrandAmbientShape';

/**
 * CompanyFeedHeader — Premium brand-aligned header for Company Feed (Phase 3 & 4).
 *
 * Requirements:
 * 1. Displays selected active business identity (BusinessLogo, name, @slug).
 * 2. Highlights Company Feed indicator.
 * 3. Provides clean, accessible link to canonical Public Business Profile.
 * 4. Provides quick Create trigger for active company identity.
 * 5. Preserves ambient curves, search, and saved actions without corporate dashboard bloat.
 */
export default function CompanyFeedHeader({
  business,
  onOpenSearch,
  onOpenCreate,
}) {
  const businessName = business?.name || 'Company';
  const businessSlug = business?.slug ? `@${business.slug.replace(/^@/, '')}` : null;
  const profileUrl = getBusinessProfileUrl(business);

  return (
    <header
      className="relative mb-5 sm:mb-6 select-none min-w-0 max-w-full overflow-hidden"
      aria-label="Company feed header"
      role="banner"
    >
      {/* Brand Ambient Contour Behind Header */}
      <BrandAmbientShape variant="header" opacity={0.6} />

      {/* Subtle Mint Ambient Glow */}
      <div className="absolute -left-6 -top-6 w-36 h-36 rounded-full bg-brand-mint/[0.06] blur-2xl pointer-events-none" />

      <div className="relative z-10 p-4 sm:p-5 rounded-2xl bg-[#0E1726]/80 backdrop-blur-xl border border-white/[0.08] shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Active Company Identity */}
        <div className="flex items-center gap-3.5 min-w-0">
          <Link
            to={profileUrl}
            className="shrink-0 group focus:outline-none focus:ring-2 focus:ring-brand-mint/50 rounded-xl"
            aria-label={`View ${businessName} business profile`}
          >
            <div className="relative">
              <BusinessLogo
                logo={business?.logo}
                name={businessName}
                size="lg"
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl ring-1 ring-white/10 group-hover:ring-brand-mint/40 transition-all duration-200"
              />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#0E1726] border border-white/10 flex items-center justify-center text-brand-mint shadow">
                <Building2 className="w-3 h-3" />
              </div>
            </div>
          </Link>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                to={profileUrl}
                className="text-base sm:text-lg font-bold text-white hover:text-brand-mint transition-colors truncate max-w-[220px] sm:max-w-xs font-heading tracking-tight"
              >
                {businessName}
              </Link>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-brand-mint/15 text-brand-mint border border-brand-mint/30 uppercase tracking-wider">
                Company Feed
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-text-muted mt-0.5">
              {businessSlug && (
                <span className="font-mono text-text-muted/80 truncate max-w-[150px]">
                  {businessSlug}
                </span>
              )}
              {businessSlug && <span className="text-white/20">·</span>}
              <Link
                to={profileUrl}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-mint hover:underline cursor-pointer"
              >
                <span>View Profile</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>

        {/* Action Shortcuts */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <Link
            to="/community/saved"
            className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#12314C]/30 hover:bg-[#12314C]/50 border border-white/[0.08] hover:border-brand-yellow/30 text-xs font-medium text-text-secondary hover:text-white transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
            title="View Saved Posts"
            aria-label="View Saved Posts"
          >
            <Bookmark className="w-3.5 h-3.5 text-brand-yellow" />
            <span className="hidden sm:inline">Saved</span>
          </Link>

          {onOpenCreate && (
            <button
              type="button"
              onClick={onOpenCreate}
              className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-brand-mint text-bg-base hover:bg-brand-mint/90 font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-sm hover:shadow-brand-mint/20"
              aria-label={`Create content as ${businessName}`}
              title={`Create as ${businessName}`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Create</span>
            </button>
          )}

          {onOpenSearch && (
            <button
              type="button"
              onClick={onOpenSearch}
              className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#12314C]/30 hover:bg-[#12314C]/50 border border-white/[0.08] hover:border-brand-mint/30 text-xs text-text-secondary hover:text-white transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
              aria-label="Search community"
              title="Search community"
            >
              <Search className="w-3.5 h-3.5 text-brand-mint" />
              <span className="hidden sm:inline font-medium">Search</span>
              <kbd className="hidden lg:inline-block px-1 py-0.2 text-[9px] font-mono rounded bg-white/[0.06] text-text-faint">
                ⌘K
              </kbd>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
