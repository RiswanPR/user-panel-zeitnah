import { useEffect, useRef } from 'react';
import { Repeat2, Quote } from 'lucide-react';

/**
 * RepostMenu — Accessible popup menu allowing users to Repost / Unrepost
 * or open the Quote post composer.
 */
export default function RepostMenu({
  isOpen,
  onClose,
  isReposted,
  onToggleRepost,
  onQuote,
  triggerRef,
}) {
  const menuRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        triggerRef?.current?.focus();
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const items = menuRef.current?.querySelectorAll('[role="menuitem"]');
        if (!items || items.length === 0) return;
        const currentFocused = document.activeElement;
        const index = Array.from(items).indexOf(currentFocused);
        if (e.key === 'ArrowDown') {
          const nextIndex = (index + 1) % items.length;
          items[nextIndex]?.focus();
        } else {
          const prevIndex = (index - 1 + items.length) % items.length;
          items[prevIndex]?.focus();
        }
      }
    };

    const handleClickOutside = (e) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        !triggerRef?.current?.contains(e.target)
      ) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    // Initial focus on first item
    const firstItem = menuRef.current?.querySelector('[role="menuitem"]');
    firstItem?.focus();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Repost options"
      className="absolute bottom-full left-0 mb-2 z-30 min-w-[180px] py-1.5 rounded-2xl bg-[#0F172A]/95 backdrop-blur-xl border border-white/[0.12] shadow-[0_10px_30px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in-95 duration-150 select-none"
    >
      {/* Repost Toggle Item */}
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onToggleRepost();
          onClose();
        }}
        className={`w-full min-h-[44px] px-3.5 py-2.5 flex items-center gap-2.5 text-xs font-semibold text-left transition-colors cursor-pointer ${
          isReposted
            ? 'text-rose-400 hover:bg-rose-500/10'
            : 'text-white hover:bg-brand-mint/10 hover:text-brand-mint'
        }`}
      >
        {isReposted ? (
          <>
            <Repeat2 className="w-4 h-4 text-rose-400 shrink-0" />
            <span>Unrepost</span>
          </>
        ) : (
          <>
            <Repeat2 className="w-4 h-4 text-brand-mint shrink-0" />
            <span>Repost</span>
          </>
        )}
      </button>

      {/* Quote Item */}
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onQuote();
          onClose();
        }}
        className="w-full min-h-[44px] px-3.5 py-2.5 flex items-center gap-2.5 text-xs font-semibold text-white hover:bg-brand-mint/10 hover:text-brand-mint text-left transition-colors cursor-pointer"
      >
        <Quote className="w-4 h-4 text-text-muted shrink-0" />
        <span>Quote post</span>
      </button>
    </div>
  );
}
