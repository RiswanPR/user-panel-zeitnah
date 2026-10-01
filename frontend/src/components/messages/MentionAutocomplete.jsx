import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AtSign, Loader2, User } from 'lucide-react';
import { messagingService } from '../../services/messagingService';

export default function MentionAutocomplete({
  visible,
  query = '',
  conversationId,
  onSelect,
  onClose,
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef(null);

  // Fetch suggestions with debouncing
  useEffect(() => {
    if (!visible || !conversationId) {
      setSuggestions([]);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    const timer = setTimeout(async () => {
      try {
        const results = await messagingService.getMentionSuggestions(
          conversationId,
          { q: query },
        );
        if (isMounted) {
          setSuggestions(results || []);
          setSelectedIndex(0);
        }
      } catch {
        if (isMounted) {
          setSuggestions([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [visible, query, conversationId]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e) => {
      if (!visible || suggestions.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % suggestions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (suggestions[selectedIndex]) {
          onSelect(suggestions[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    },
    [visible, suggestions, selectedIndex, onSelect, onClose],
  );

  useEffect(() => {
    if (visible) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [visible, handleKeyDown]);

  // Keep highlighted item in view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.children[selectedIndex];
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        transition={{ duration: 0.15 }}
        className="absolute bottom-full left-0 mb-2 w-72 max-w-[calc(100vw-2rem)] bg-[#12141c]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 flex flex-col max-h-60"
        role="listbox"
        aria-label="Mention members"
      >
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-white/5 bg-white/[0.02] text-[11px] font-medium tracking-wide uppercase text-slate-400">
          <AtSign className="w-3 h-3 text-emerald-400" />
          <span>Mention a member</span>
          {isLoading && <Loader2 className="w-3 h-3 animate-spin ml-auto text-slate-400" />}
        </div>

        <div ref={listRef} className="overflow-y-auto py-1 divide-y divide-white/[0.03]">
          {isLoading && suggestions.length === 0 ? (
            <div className="p-3 text-center text-xs text-slate-400">Searching members…</div>
          ) : suggestions.length === 0 ? (
            <div className="p-3 text-center text-xs text-slate-400">
              No matching conversation members
            </div>
          ) : (
            suggestions.map((user, idx) => {
              const isSelected = idx === selectedIndex;
              const displayName = user.name || user.username || 'Member';
              return (
                <button
                  key={user.id || user._id}
                  type="button"
                  onClick={() => onSelect(user)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full min-h-[44px] flex items-center gap-2.5 px-3 py-2 text-left transition-colors text-xs ${
                    isSelected
                      ? 'bg-emerald-500/15 text-white'
                      : 'text-slate-300 hover:bg-white/[0.04]'
                  }`}
                  role="option"
                  aria-selected={isSelected}
                >
                  <div className="relative w-7 h-7 rounded-full bg-slate-800 border border-white/10 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {user.avatar || user.avatarUrl ? (
                      <img
                        src={user.avatar || user.avatarUrl}
                        alt={displayName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium truncate text-slate-200">
                        {displayName}
                      </span>
                      {user.role && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/5 border border-white/10 text-slate-400 uppercase font-mono tracking-wider">
                          {user.role}
                        </span>
                      )}
                    </div>
                    {user.username && (
                      <span className="text-[11px] text-slate-400 truncate block">
                        @{user.username}
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
