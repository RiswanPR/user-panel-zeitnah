import { Link } from 'react-router-dom';
import {
  Bookmark,
  Users,
  Building2,
  Briefcase,
  Search,
  ExternalLink,
  Film,
} from 'lucide-react';
import PremiumCard from '../../ui/PremiumCard';

/**
 * DiscoveryLinks — Direct verified platform exploration links.
 * Provides access to Saved Posts, People, Organizations, Opportunities, and Global Search.
 */
export default function DiscoveryLinks({ onOpenSearch }) {
  const handleTriggerSearch = () => {
    if (onOpenSearch) {
      onOpenSearch();
    } else {
      // Dispatch standard Cmd+K keyboard event for platform search
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true })
      );
    }
  };

  const links = [
    {
      to: '/community/reels',
      label: 'Community Reels',
      description: 'Immersive short-video feed & media',
      icon: Film,
    },
    {
      to: '/community/saved',
      label: 'Saved Posts',
      description: 'Review your saved discussions & resources',
      icon: Bookmark,
    },
    {
      to: '/network',
      label: 'Engineers & Peers',
      description: 'Discover verified professionals & mentors',
      icon: Users,
    },
    {
      to: '/network?tab=organizations',
      label: 'Organizations',
      description: 'Industry partners, firms & institutions',
      icon: Building2,
    },
    {
      to: '/jobs',
      label: 'Opportunities',
      description: 'Explore verified career listings & contracts',
      icon: Briefcase,
    },
  ];

  return (
    <PremiumCard variant="surface" padding="p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider">
          Explore Platform
        </h4>
        <button
          type="button"
          onClick={handleTriggerSearch}
          className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-[10px] font-mono text-text-muted hover:text-white transition-colors cursor-pointer"
          title="Open platform search"
        >
          <Search className="w-3 h-3" />
          <span>⌘K</span>
        </button>
      </div>

      <div className="space-y-1">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.to}
              to={link.to}
              className="flex items-center justify-between p-2 rounded-xl hover:bg-white/[0.04] transition-colors group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-text-muted group-hover:text-brand-mint group-hover:border-brand-mint/30 transition-colors">
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="truncate">
                  <p className="text-xs font-medium text-white group-hover:text-brand-mint transition-colors truncate">
                    {link.label}
                  </p>
                  <p className="text-[10px] text-text-faint truncate">{link.description}</p>
                </div>
              </div>
              <ExternalLink className="w-3 h-3 text-text-faint group-hover:text-white transition-colors shrink-0 ml-2" />
            </Link>
          );
        })}
      </div>
    </PremiumCard>
  );
}
