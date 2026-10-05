import { useState, useRef, useEffect } from 'react';
import { Globe, Users, BookOpen, Lock, ChevronDown, Check } from 'lucide-react';

const AUDIENCES = [
  {
    id: 'PUBLIC',
    label: 'Public',
    desc: 'Anyone on Zeitnah can see this post',
    icon: Globe,
    badgeColor: 'text-brand-mint bg-brand-mint/10 border-brand-mint/20',
  },
  {
    id: 'COURSE',
    label: 'Course / Cohort',
    desc: 'Only members of your enrolled courses',
    icon: BookOpen,
    badgeColor: 'text-sky-400 bg-sky-400/10 border-sky-400/20',
  },
  {
    id: 'BATCH',
    label: 'Specific Batch',
    desc: 'Peers in your current academic batch',
    icon: Users,
    badgeColor: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  },
  {
    id: 'PRIVATE',
    label: 'Private',
    desc: 'Only you and assigned mentors',
    icon: Lock,
    badgeColor: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  },
];

/**
 * PostAudienceSelector — Creator-grade Audience Selector:
 * Exposes strictly backend-supported audience enum values with rich visual guidance,
 * avoiding arbitrary or unsupported visibility modes.
 */
export default function PostAudienceSelector({ audience, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const selected = AUDIENCES.find((a) => a.id === audience) || AUDIENCES[0];
  const Icon = selected.icon;

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      return () => document.removeEventListener('mousedown', handleOutsideClick);
    }
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.09] text-xs font-medium text-white transition-colors cursor-pointer select-none"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <Icon className="w-3.5 h-3.5 text-brand-mint" />
        <span>{selected.label}</span>
        <ChevronDown className="w-3 h-3 text-text-muted" />
      </button>

      {isOpen && (
        <div
          className="absolute left-0 sm:right-0 sm:left-auto top-full mt-1.5 w-72 bg-[#0E1726] border border-white/[0.12] rounded-2xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150"
          role="listbox"
          aria-label="Audience options"
        >
          {AUDIENCES.map((item) => {
            const ItemIcon = item.icon;
            const isCurrent = item.id === audience;
            return (
              <button
                key={item.id}
                type="button"
                role="option"
                aria-selected={isCurrent}
                onClick={() => {
                  onChange(item.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-start gap-3 p-2.5 rounded-xl text-left transition-colors cursor-pointer ${
                  isCurrent ? 'bg-white/[0.08]' : 'hover:bg-white/[0.04]'
                }`}
              >
                <div className="w-7 h-7 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center shrink-0 mt-0.5">
                  <ItemIcon className="w-3.5 h-3.5 text-brand-mint" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-white">{item.label}</p>
                    {isCurrent && <Check className="w-3.5 h-3.5 text-brand-mint shrink-0" />}
                  </div>
                  <p className="text-[11px] text-text-muted mt-0.5 leading-snug">{item.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
