import React from 'react';
import { Link } from 'react-router-dom';
import { Search, Compass, Bookmark, Sparkles } from 'lucide-react';
import BrandAmbientShape from '../ui/BrandAmbientShape';

/**
 * CommunityHeader — Brand-aligned editorial header for Zeitnah Community.
 * Displays brand/community title with official mint/yellow accents,
 * organic brand contour background, ✦ Create trigger, saved posts shortcut, and search.
 */
export default function CommunityHeader({
  onOpenCreate,
  onOpenSearch,
  onOpenMobileDiscovery,
}) {
  return (
    <header
      className="relative mb-4 sm:mb-6 flex items-center justify-between gap-2 sm:gap-4 select-none min-w-0 max-w-full overflow-hidden"
      aria-label="Community header"
    >
      {/* Brand Ambient Contour Behind Header */}
      <BrandAmbientShape variant="header" opacity={0.8} />

      <div className="relative z-10 min-w-0 shrink-0">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <h1 className="text-xl sm:text-3xl font-bold font-heading text-white tracking-tight">
            Community
          </h1>
          <span className="w-1.5 h-1.5 rounded-full bg-brand-mint shadow-[0_0_10px_rgba(159,213,178,0.7)] shrink-0" />
        </div>
        <div className="h-[2px] w-8 sm:w-10 bg-gradient-to-r from-brand-mint via-brand-yellow/60 to-transparent rounded-full mt-1 opacity-80" />
        <p className="text-xs text-text-muted mt-1 font-normal tracking-wide truncate hidden sm:block">
          Discover engineering insights, blueprints and moments
        </p>
      </div>

      <div className="relative z-10 flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Create Action Button (✦ Create) — Mint to Yellow Energy Gradient */}
        {onOpenCreate && (
          <button
            type="button"
            id="community-create-trigger"
            onClick={onOpenCreate}
            className="min-h-[44px] px-3.5 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-brand-mint to-brand-yellow text-[#070B14] hover:brightness-105 active:scale-[0.97] transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_4px_16px_rgba(159,213,178,0.3),0_0_12px_rgba(246,237,74,0.18)] hover:shadow-[0_6px_22px_rgba(159,213,178,0.45),0_0_20px_rgba(246,237,74,0.28)] shrink-0"
            aria-label="Create post or story"
            title="Create"
          >
            <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="font-bold text-xs tracking-wide">Create</span>
          </button>
        )}

        {/* Saved Posts Shortcut */}
        <Link
          to="/community/saved"
          className="min-h-[40px] px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-[#12314C]/30 hover:bg-[#12314C]/50 border border-white/[0.08] hover:border-brand-yellow/30 text-xs font-medium text-text-secondary hover:text-white transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
          title="View Saved Posts"
          aria-label="View Saved Posts"
        >
          <Bookmark className="w-3.5 h-3.5 text-brand-yellow" />
          <span className="hidden md:inline">Saved</span>
        </Link>

        {/* Mobile Discovery Drawer Trigger (<1024px) */}
        <button
          type="button"
          onClick={onOpenMobileDiscovery}
          className="lg:hidden min-h-[40px] px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#12314C]/30 hover:bg-[#12314C]/50 border border-white/[0.08] hover:border-brand-mint/30 text-xs font-medium text-text-secondary hover:text-white transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
          aria-label="Open community discovery and topics"
          title="Discover"
        >
          <Compass className="w-3.5 h-3.5 text-brand-mint" />
          <span className="hidden md:inline">Discover</span>
        </button>

        {/* Search Shortcut Trigger (Desktop & Tablet) */}
        <button
          type="button"
          onClick={onOpenSearch}
          className="hidden sm:flex min-h-[40px] px-3 sm:px-3.5 py-1.5 rounded-xl bg-[#12314C]/30 hover:bg-[#12314C]/50 border border-white/[0.08] hover:border-brand-mint/30 text-xs text-text-secondary hover:text-white transition-all items-center gap-1.5 cursor-pointer shrink-0"
          aria-label="Search platform"
          title="Search (⌘K)"
        >
          <Search className="w-3.5 h-3.5 text-text-muted" />
          <span className="hidden md:inline">Search</span>
          <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-[10px] font-mono rounded bg-white/[0.06] text-text-faint">
            ⌘K
          </kbd>
        </button>
      </div>
    </header>
  );
}
