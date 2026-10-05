import { useState, useEffect } from 'react';
import { X, Sparkles, Smile, Loader2 } from 'lucide-react';
import { communityApi } from '../../../services/communityApi';
import StickerIcon from './StickerIcon';

// Fallback curated stickers if offline or loading
const DEFAULT_STICKERS = [
  {
    id: 'zn-verified',
    name: 'Verified',
    category: 'ZEITNAH',
    svg: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="24" r="22" fill="#10B981"/><path d="M14 24L21 31L34 17" stroke="white" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  },
  {
    id: 'zn-logo',
    name: 'Zeitnah Symbol',
    category: 'ZEITNAH',
    svg: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="24" r="22" fill="#070B14" stroke="#10B981" stroke-width="2"/><path d="M15 15H33L15 33H33" stroke="#10B981" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  },
  {
    id: 'fire',
    name: 'Fire',
    category: 'REACTIONS',
    svg: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M24 4C24 4 14 16 14 28C14 34.627 18.477 40 24 40C29.523 40 34 34.627 34 28C34 16 24 4 24 4Z" fill="#F97316"/><path d="M24 16C24 16 18 24 18 30C18 33.314 20.686 36 24 36C27.314 36 30 33.314 30 30C30 24 24 16 24 16Z" fill="#FACC15"/></svg>`,
  },
  {
    id: 'heart',
    name: 'Heart',
    category: 'REACTIONS',
    svg: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M24 42L20.8 39.09C10.5 29.74 4 23.84 4 16.5C4 10.5 8.7 6 14.5 6C17.8 6 20.9 7.55 24 10C27.1 7.55 30.2 6 33.5 6C39.3 6 44 10.5 44 16.5C44 23.84 37.5 29.74 27.2 39.09L24 42Z" fill="#EF4444"/></svg>`,
  },
  {
    id: 'star',
    name: 'Star',
    category: 'SHAPES',
    svg: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M24 4L30.18 16.52L44 18.53L34 28.28L36.36 42.04L24 35.54L11.64 42.04L14 28.28L4 18.53L17.82 16.52L24 4Z" fill="#F59E0B"/></svg>`,
  },
  {
    id: 'sparkles',
    name: 'Sparkles',
    category: 'CELEBRATION',
    svg: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M24 6L27 18L39 21L27 24L24 36L21 24L9 21L21 18L24 6Z" fill="#10B981"/><path d="M37 29L38.5 35L44.5 36.5L38.5 38L37 44L35.5 38L29.5 36.5L35.5 35L37 29Z" fill="#FBBF24"/></svg>`,
  },
  {
    id: 'thumbs-up',
    name: 'Thumbs Up',
    category: 'REACTIONS',
    svg: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="24" r="22" fill="#0EA5E9"/><path d="M16 22V36M16 26H28C30.2 26 32 24.2 32 22C32 20.8 31 18 29 18H24L25.5 12C25.8 10.9 25 10 24 10C23 10 22 11 21.5 12L16 22Z" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  },
  {
    id: 'trophy',
    name: 'Trophy',
    category: 'CELEBRATION',
    svg: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 8H34V20C34 25.52 29.52 30 24 30C18.48 30 14 25.52 14 20V8Z" fill="#F59E0B"/><path d="M20 30V38H28V30M16 42H32M14 12H8C6.9 12 6 12.9 6 14C6 17.5 9 20 14 20M34 12H40C41.1 12 42 12.9 42 14C42 17.5 39 20 34 20" stroke="#F59E0B" stroke-width="3" stroke-linecap="round"/></svg>`,
  },
  {
    id: 'party',
    name: 'Party',
    category: 'CELEBRATION',
    svg: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 40L16 20L28 32L8 40Z" fill="#8B5CF6"/><circle cx="28" cy="14" r="3" fill="#EF4444"/><circle cx="36" cy="22" r="3" fill="#10B981"/><circle cx="34" cy="10" r="2.5" fill="#F59E0B"/><circle cx="42" cy="16" r="2.5" fill="#3B82F6"/></svg>`,
  },
  {
    id: 'rocket',
    name: 'Rocket',
    category: 'REACTIONS',
    svg: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M30 6C30 6 36 12 36 22L26 32C16 32 10 26 10 26L16 20L18 22L24 16L22 14L30 6Z" fill="#0EA5E9"/><path d="M12 36L8 40M16 38L12 42M20 34L18 42" stroke="#F97316" stroke-width="3" stroke-linecap="round"/></svg>`,
  },
  {
    id: 'bulb',
    name: 'Lightbulb',
    category: 'EMOJI',
    svg: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="20" r="14" fill="#FBBF24"/><path d="M18 34H30M20 38H28M22 42H26" stroke="#D97706" stroke-width="3" stroke-linecap="round"/></svg>`,
  },
  {
    id: 'check',
    name: 'Checkmark',
    category: 'SHAPES',
    svg: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="24" r="20" fill="#10B981"/><path d="M16 24L22 30L32 18" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  },
];

const CATEGORIES = ['ALL', 'ZEITNAH', 'REACTIONS', 'CELEBRATION', 'EMOJI', 'SHAPES'];

export default function ReelStickerPicker({
  isOpen,
  duration = 30,
  currentTime = 0,
  onSelectSticker,
  onClose,
}) {
  const [stickers, setStickers] = useState(DEFAULT_STICKERS);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      communityApi
        .getStickers({ category: selectedCategory })
        .then((res) => {
          if (res?.items && Array.isArray(res.items) && res.items.length > 0) {
            setStickers(res.items);
          }
        })
        .catch(() => {
          // Keep defaults
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen, selectedCategory]);

  if (!isOpen) return null;

  const handlePick = (sticker) => {
    const st = Math.min(currentTime, Math.max(0, duration - 3));
    const en = Math.min(duration, st + 4);

    onSelectSticker?.({
      id: `sticker-${Date.now()}`,
      type: 'STICKER',
      stickerId: sticker.id,
      name: sticker.name,
      svg: sticker.svg,
      start: Number(st.toFixed(1)),
      end: Number(en.toFixed(1)),
      x: 0.5,
      y: 0.5,
      scale: 1.0,
      rotation: 0,
      opacity: 1.0,
    });
    onClose?.();
  };

  const filteredStickers =
    selectedCategory === 'ALL'
      ? stickers
      : stickers.filter((s) => s.category?.toUpperCase() === selectedCategory);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label="Sticker picker"
    >
      <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl bg-[#090F1C] border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-yellow/15 border border-brand-yellow/30 flex items-center justify-center text-brand-yellow">
              <Smile className="w-4 h-4" />
            </div>
            <h3 className="text-white font-semibold text-base">Add Sticker</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Close sticker picker"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Categories Bar */}
        <div className="px-5 py-3 border-b border-white/5 overflow-x-auto flex gap-1.5 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-brand-mint text-[#070B14] font-semibold shadow-xs'
                  : 'bg-white/5 text-text-muted hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Sticker Grid */}
        <div className="p-5 overflow-y-auto min-h-[220px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-text-muted">
              <Loader2 className="w-6 h-6 animate-spin text-brand-mint" />
            </div>
          ) : filteredStickers.length === 0 ? (
            <div className="text-center py-12 text-text-muted text-xs">
              No stickers found in this category.
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-4 gap-3">
              {filteredStickers.map((sticker) => (
                <button
                  key={sticker.id}
                  type="button"
                  onClick={() => handlePick(sticker)}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-brand-mint/40 transition-all hover:scale-105 group active:scale-95"
                  title={sticker.name}
                  aria-label={`Select ${sticker.name} sticker`}
                >
                  <div className="w-12 h-12 flex items-center justify-center p-1">
                    <StickerIcon stickerId={sticker.id} />
                  </div>
                  <span className="text-[10px] text-text-muted group-hover:text-white mt-1.5 truncate max-w-full text-center">
                    {sticker.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
