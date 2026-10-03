import React from 'react';
import { BookOpen } from 'lucide-react';
import TrendingTopics from './TrendingTopics';
import DiscoveryLinks from './DiscoveryLinks';

/**
 * DiscoverySidebar — Desktop contextual discovery rail (>=1280px).
 * Unifies Platform Focus, Trending Topics, Discovery Links, and Community Standards.
 */
export default function DiscoverySidebar({
  topics = [],
  activeTopic = null,
  onSelectTopic,
  onOpenSearch,
}) {
  return (
    <aside className="space-y-4 sticky top-20" aria-label="Community Discovery & Resources">
      {/* 1. Trending Topics (Real data derived from community posts) */}
      <TrendingTopics
        topics={topics}
        activeTopic={activeTopic}
        onSelectTopic={onSelectTopic}
      />

      {/* 2. Explore Platform */}
      <DiscoveryLinks onOpenSearch={onOpenSearch} />

      {/* 3. Community Standards footnote (Visually lightweight) */}
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
