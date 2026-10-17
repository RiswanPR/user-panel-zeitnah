import { Link } from 'react-router-dom';
import { Search, Compass, Bookmark, Sparkles, Film, BarChart2 } from 'lucide-react';
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
  onOpenInsights,
}) {
  return (
    <header
      className="relative mb-5 sm:mb-6 flex items-center justify-between gap-2 sm:gap-4 select-none min-w-0 max-w-full overflow-hidden"
      aria-label="Community header"
    >
      {/* Brand Ambient Contour Behind Header */}
      <BrandAmbientShape variant="header" opacity={0.7} />

      {/* Subtle Mint Ambient Light Behind Title */}
      <div className="absolute -left-6 -top-6 w-36 h-36 rounded-full bg-brand-mint/[0.055] blur-2xl pointer-events-none" />

      <div className="relative z-10 min-w-0 shrink-0">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-text-primary tracking-tight leading-none">
            Community
          </h1>
          <span className="w-1.5 h-1.5 rounded-full bg-brand-mint shadow-[0_0_10px_rgba(159,213,178,0.7)] shrink-0" />
        </div>
        <div className="h-[2px] w-8 sm:w-10 bg-gradient-to-r from-brand-mint via-[#D4E37A]/50 to-transparent rounded-full mt-1.5 opacity-80" />
        <p className="text-xs text-text-muted/80 mt-1 font-medium tracking-wide flex items-center gap-1.5 select-none">
          <span>Build</span>
          <span className="text-brand-mint/50">·</span>
          <span>Connect</span>
          <span className="text-brand-mint/50">·</span>
          <span>Discover</span>
        </p>
      </div>

      <div className="relative z-10 flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Create Action Button (✦ Create) */}
        {onOpenCreate && (
          <button
            type="button"
            id="community-create-trigger"
            onClick={onOpenCreate}
            className="community-btn-create shrink-0 min-h-[44px] px-3 sm:px-3.5 focus:outline-none focus:ring-2 focus:ring-brand-mint/50 focus:ring-offset-2 focus:ring-offset-bg-base"
            aria-label="Create post or story"
            title="Create"
          >
            <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="font-bold text-xs tracking-wide">Create</span>
          </button>
        )}

        {/* Reels Shortcut */}
        <Link
          to="/community/reels"
          className="min-h-[44px] min-w-[44px] px-2.5 sm:px-3 py-1.5 rounded-xl bg-surface-card hover:bg-surface-elevated border border-border hover:border-brand-mint/30 text-xs font-medium text-text-secondary hover:text-text-primary transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
          title="Watch Reels"
          aria-label="Watch Reels"
        >
          <Film className="w-3.5 h-3.5 text-brand-mint" />
          <span className="hidden sm:inline">Reels</span>
        </Link>

        {/* Saved Posts Shortcut */}
        <Link
          to="/community/saved"
          className="min-h-[44px] min-w-[44px] px-2.5 sm:px-3 py-1.5 rounded-xl bg-surface-card hover:bg-surface-elevated border border-border hover:border-brand-yellow/30 text-xs font-medium text-text-secondary hover:text-text-primary transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
          title="View Saved Posts"
          aria-label="View Saved Posts"
        >
          <Bookmark className="w-3.5 h-3.5 text-brand-yellow" />
          <span className="hidden sm:inline">Saved</span>
        </Link>

        {/* Creator Insights Modal Trigger */}
        {onOpenInsights && (
          <button
            type="button"
            onClick={onOpenInsights}
            className="hidden sm:flex min-h-[44px] min-w-[44px] px-2.5 sm:px-3 py-1.5 rounded-xl bg-surface-card hover:bg-surface-elevated border border-border hover:border-cyan-400/30 text-xs font-medium text-text-secondary hover:text-text-primary transition-all items-center justify-center gap-1.5 cursor-pointer shrink-0"
            title="Creator Insights"
            aria-label="View Creator Insights"
          >
            <BarChart2 className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">Insights</span>
          </button>
        )}

        {/* Mobile Discovery Drawer Trigger (<1024px) */}
        <button
          type="button"
          onClick={onOpenMobileDiscovery}
          className="lg:hidden min-h-[44px] min-w-[44px] px-2.5 sm:px-3 py-1.5 rounded-xl bg-surface-card hover:bg-surface-elevated border border-border hover:border-brand-mint/30 text-xs font-medium text-text-secondary hover:text-text-primary transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
          aria-label="Open community discovery and topics"
          title="Discover"
        >
          <Compass className="w-3.5 h-3.5 text-brand-mint" />
          <span className="hidden sm:inline">Discover</span>
        </button>

        {/* Search Shortcut Trigger (Accessible on all viewports) */}
        <button
          type="button"
          onClick={onOpenSearch}
          className="min-h-[44px] min-w-[40px] px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-surface-card hover:bg-surface-elevated border border-border hover:border-brand-mint/30 text-xs text-text-secondary hover:text-text-primary transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
          aria-label="Search community"
          title="Search community"
        >
          <Search className="w-3.5 h-3.5 text-brand-mint" />
          <span className="hidden md:inline font-medium">Search</span>
          <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-[10px] font-mono rounded bg-surface-elevated text-text-faint border border-border">
            ⌘K
          </kbd>
        </button>
      </div>
    </header>
  );
}
