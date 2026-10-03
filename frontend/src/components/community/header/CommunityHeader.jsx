import React from 'react';
import { Link } from 'react-router-dom';
import { Search, Compass, Bookmark, Plus } from 'lucide-react';

/**
 * CommunityHeader — Instagram-inspired compact, premium header for Zeitnah Community.
 * Displays brand/community title, quick create trigger (+), saved posts shortcut, and search.
 */
export default function CommunityHeader({
  onOpenCreate,
  onOpenSearch,
  onOpenMobileDiscovery,
}) {
  return (
    <header
      className="mb-4 sm:mb-6 flex items-center justify-between gap-2 sm:gap-4 select-none min-w-0"
      aria-label="Community header"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h1 className="text-xl sm:text-3xl font-extrabold font-heading text-white tracking-tight truncate">
            Community
          </h1>
          <span className="w-2 h-2 rounded-full bg-brand-mint shadow-[0_0_8px_rgba(52,211,153,0.6)] shrink-0" />
        </div>
        <p className="text-xs sm:text-sm text-text-muted mt-0.5 font-normal truncate hidden xs:block">
          Discover people, ideas and moments
        </p>
      </div>

      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {/* Create Action Button (+) */}
        {onOpenCreate && (
          <button
            type="button"
            id="community-create-trigger"
            onClick={onOpenCreate}
            className="min-h-[38px] sm:min-h-[40px] px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-brand-mint text-bg-base hover:bg-brand-mint/90 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95 shrink-0"
            aria-label="Create post or story"
            title="Create"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span className="hidden sm:inline">Create</span>
          </button>
        )}

        {/* Saved Posts Shortcut */}
        <Link
          to="/community/saved"
          className="min-h-[38px] sm:min-h-[40px] px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-semibold text-text-muted hover:text-white transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
          title="View Saved Posts"
          aria-label="View Saved Posts"
        >
          <Bookmark className="w-4 h-4 text-yellow-400" />
          <span className="hidden md:inline">Saved</span>
        </Link>

        {/* Mobile Discovery Drawer Trigger (<1024px) */}
        <button
          type="button"
          onClick={onOpenMobileDiscovery}
          className="lg:hidden min-h-[38px] sm:min-h-[40px] px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-semibold text-text-muted hover:text-white transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
          aria-label="Open community discovery and topics"
          title="Discover"
        >
          <Compass className="w-4 h-4 text-brand-mint" />
          <span className="hidden md:inline">Discover</span>
        </button>

        {/* Search Shortcut Trigger */}
        <button
          type="button"
          onClick={onOpenSearch}
          className="min-h-[38px] sm:min-h-[40px] px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs text-text-muted hover:text-white transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
          aria-label="Search platform"
          title="Search (⌘K)"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Search</span>
          <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-[10px] font-mono rounded bg-white/[0.06] text-text-faint">
            ⌘K
          </kbd>
        </button>
      </div>
    </header>
  );
}
