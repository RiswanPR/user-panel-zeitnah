import React from 'react';
import { Hash, Sparkles } from 'lucide-react';
import PremiumCard from '../../ui/PremiumCard';

/**
 * TrendingTopics — Deterministically derived topics from real post tags and hashtags.
 * Strictly uses real community metadata with zero fabricated metrics.
 */
export default function TrendingTopics({
  topics = [],
  activeTopic = null,
  onSelectTopic,
}) {
  return (
    <PremiumCard variant="panel" padding="p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3.5">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Hash className="w-3.5 h-3.5 text-brand-mint" />
          <span>Trending Topics</span>
        </h4>
        {activeTopic && (
          <button
            type="button"
            onClick={() => onSelectTopic(null)}
            className="text-[11px] text-text-muted hover:text-brand-mint transition-colors cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      {topics.length === 0 ? (
        <div className="py-2.5 px-3 rounded-xl bg-white/[0.02] border border-white/[0.04] text-center">
          <p className="text-xs text-text-faint leading-relaxed">
            Topics will appear as members publish posts with hashtags.
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {topics.map(({ tag, count }) => {
            const isSelected = activeTopic === tag;
            return (
              <button
                key={tag}
                type="button"
                onClick={() => onSelectTopic(isSelected ? null : tag)}
                className={`
                  inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                  border transition-all duration-150 cursor-pointer
                  ${
                    isSelected
                      ? 'bg-gradient-to-r from-brand-mint to-brand-yellow text-[#070B14] border-transparent font-bold shadow-[0_0_14px_rgba(159,213,178,0.35)]'
                      : 'bg-white/[0.035] hover:bg-white/[0.07] text-text-secondary hover:text-white border-white/[0.07] hover:border-brand-mint/30'
                  }
                `}
                aria-label={`Filter by #${tag}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSelected ? 'bg-[#070B14]' : 'bg-gradient-to-r from-brand-mint to-brand-yellow'}`} />
                <span>#{tag}</span>
                {count > 1 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isSelected ? 'bg-black/20 text-[#070B14]' : 'bg-[#12314C]/60 text-brand-yellow/90 border border-brand-yellow/20'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </PremiumCard>
  );
}
