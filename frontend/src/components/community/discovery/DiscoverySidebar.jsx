import { Link } from 'react-router-dom';
import { Search, Flame, Users, BookOpen } from 'lucide-react';
import TrendingTopics from './TrendingTopics';
import DiscoveryLinks from './DiscoveryLinks';
import PeopleCard from './PeopleCard';
import PremiumCard from '../../ui/PremiumCard';
import { useSuggestedPeople } from '../../../hooks/useCommunity';
import { networkApi } from '../../../services/networkApi';

/**
 * DiscoverySidebar — Desktop contextual discovery rail (>=1024px).
 * Unifies Search Trigger, Trending Topics, Suggested Peers, Discovery Links, and Standards.
 */
export default function DiscoverySidebar({
  topics = [],
  activeTopic = null,
  activeFilter = 'all',
  onSelectTopic,
  onOpenSearch,
}) {
  // Real verified peer discovery via networkApi.getPeople backed by TanStack Query cache
  const { data: suggestedPeople = [] } = useSuggestedPeople({
    limit: 3,
    fetcher: networkApi.getPeople,
  });

  return (
    <aside className="space-y-4 sticky top-20" aria-label="Community Discovery & Resources">
      {/* 1. Prominent Quick Search Field */}
      <button
        type="button"
        onClick={onOpenSearch}
        className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl bg-[#12314C]/30 hover:bg-[#12314C]/50 border border-white/[0.08] hover:border-brand-mint/40 text-left transition-all duration-150 flex items-center justify-between group cursor-pointer"
        aria-label="Open search dialog"
      >
        <div className="flex items-center gap-2.5 text-xs text-text-muted group-hover:text-white transition-colors">
          <Search className="w-4 h-4 text-brand-mint shrink-0" />
          <span className="truncate">Search posts, peers, topics...</span>
        </div>
        <kbd className="hidden xl:inline-block px-1.5 py-0.5 text-[10px] font-mono rounded bg-white/[0.06] text-text-faint group-hover:text-white transition-colors">
          ⌘K
        </kbd>
      </button>

      {/* 2. Trending Feed Shortcut */}
      <Link
        to={activeFilter === 'trending' ? '/community' : '/community?feed=trending'}
        className={`
          flex items-center justify-between px-4 py-3 rounded-xl border transition-all duration-150 cursor-pointer
          ${
            activeFilter === 'trending'
              ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/10 border-amber-500/40 text-amber-300 font-bold shadow-[0_0_15px_rgba(245,158,11,0.15)]'
              : 'bg-white/[0.025] hover:bg-white/[0.05] border-white/[0.06] hover:border-amber-500/30 text-text-secondary hover:text-white'
          }
        `}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Flame className="w-4 h-4 fill-amber-400/20" />
          </div>
          <div>
            <h4 className="text-xs font-semibold">Trending Discussions</h4>
            <p className="text-[10px] text-text-faint">Ranked by real network engagement</p>
          </div>
        </div>
        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-white/[0.04] text-text-muted">
          {activeFilter === 'trending' ? 'Active' : 'Explore'}
        </span>
      </Link>

      {/* 3. Trending Topics (Real data derived from community posts) */}
      <TrendingTopics
        topics={topics}
        activeTopic={activeTopic}
        onSelectTopic={onSelectTopic}
      />

      {/* 4. Suggested People to Connect With */}
      {suggestedPeople.length > 0 && (
        <PremiumCard variant="panel" padding="p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-brand-mint" />
              <span>People to Discover</span>
            </h4>
            <Link
              to="/network"
              className="text-[11px] text-text-muted hover:text-brand-mint transition-colors cursor-pointer"
            >
              See all
            </Link>
          </div>

          <div className="space-y-2">
            {suggestedPeople.map((person) => (
              <PeopleCard key={person._id || person.id} person={person} compact />
            ))}
          </div>
        </PremiumCard>
      )}

      {/* 5. Explore Platform Links */}
      <DiscoveryLinks onOpenSearch={onOpenSearch} />

      {/* 6. Discussion Standards footnote */}
      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] text-[11px] text-text-faint space-y-2">
        <div className="flex items-center gap-1.5 font-semibold text-text-muted">
          <BookOpen className="w-3.5 h-3.5 text-brand-mint" />
          <span>Discussion Standards</span>
        </div>
        <p className="leading-relaxed">
          Maintain constructive, evidence-based, and respectful discourse. Share verified workflows and cite technical sources.
        </p>
      </div>
    </aside>
  );
}
