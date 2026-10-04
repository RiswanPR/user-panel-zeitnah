import { Check } from 'lucide-react';
import { STORY_FILTERS } from './storyEditorConstants';

/**
 * StoryFilterPicker — Quick preset strip for tonal filters.
 */
export default function StoryFilterPicker({ selectedFilter, onSelectFilter }) {
  return (
    <div
      className="absolute bottom-20 inset-x-3 sm:inset-x-6 z-30 p-2.5 rounded-2xl bg-black/85 backdrop-blur-xl border border-white/10 shadow-2xl flex items-center justify-center gap-2 overflow-x-auto"
      role="radiogroup"
      aria-label="Photo filters"
    >
      {STORY_FILTERS.map((f) => (
        <button
          key={f.id}
          type="button"
          onClick={() => onSelectFilter(f.id)}
          className={`min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
            selectedFilter === f.id
              ? 'bg-brand-mint text-[#070B14] shadow-md shadow-brand-mint/20'
              : 'bg-white/[0.06] text-text-muted hover:text-white hover:bg-white/[0.1]'
          }`}
          role="radio"
          aria-checked={selectedFilter === f.id}
        >
          {selectedFilter === f.id && <Check className="w-3.5 h-3.5 stroke-[3]" />}
          <span>{f.label}</span>
        </button>
      ))}
    </div>
  );
}
