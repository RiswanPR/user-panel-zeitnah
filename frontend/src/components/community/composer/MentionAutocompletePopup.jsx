import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AtSign, Loader2, User } from 'lucide-react';
import { communityApi } from '../../../services/communityApi';
import { getUploadUrl } from '../../../utils/courseUi';

/**
 * MentionAutocompletePopup — Floating suggestion dropdown for @mentions in Post Studio:
 * Debounces search, uses authorized communityApi.searchCommunity({ q, type: 'people' }),
 * supports full keyboard navigation (ArrowUp, ArrowDown, Enter, Escape),
 * and restores focus cleanly.
 */
export default function MentionAutocompletePopup({
  query = '',
  onSelect,
  onClose,
  visible,
}) {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    if (!visible) {
      setUsers([]);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const clean = (query || '').replace(/^@/, '').trim();
    setIsLoading(true);

    const timer = setTimeout(async () => {
      try {
        const response = await communityApi.searchCommunity({
          q: clean,
          type: 'people',
          limit: 6,
          signal: abortControllerRef.current?.signal,
        });

        const list = Array.isArray(response?.people) ? response.people : [];
        setUsers(list);
        setSelectedIndex(0);
      } catch (err) {
        if (err?.name !== 'CanceledError' && err?.code !== 'ERR_CANCELED') {
          setUsers([]);
        }
      } finally {
        setIsLoading(false);
      }
    }, 150);

    return () => {
      clearTimeout(timer);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [query, visible]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e) => {
      if (!visible) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (users.length > 0 ? (prev + 1) % users.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (users.length > 0 ? (prev - 1 + users.length) % users.length : 0));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        if (users.length > 0 && users[selectedIndex]) {
          e.preventDefault();
          onSelect(users[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    },
    [visible, users, selectedIndex, onSelect, onClose]
  );

  useEffect(() => {
    if (visible) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [visible, handleKeyDown]);

  if (!visible) return null;

  return (
    <div
      className="absolute bottom-full left-0 mb-2 w-72 max-w-[90vw] bg-[#0E1726] border border-white/[0.12] rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2 duration-150"
      role="listbox"
      aria-label="Mention members"
    >
      <div className="px-3 py-2 border-b border-white/[0.06] flex items-center justify-between text-[11px] text-text-muted">
        <span className="flex items-center gap-1.5 font-medium">
          <AtSign className="w-3.5 h-3.5 text-brand-mint" />
          Mention a member
        </span>
        {isLoading && <Loader2 className="w-3 h-3 animate-spin text-brand-mint" />}
      </div>

      <div className="max-h-56 overflow-y-auto divide-y divide-white/[0.04]">
        {users.length > 0 ? (
          users.map((user, idx) => {
            const isSelected = idx === selectedIndex;
            const avatarSrc = user.avatar ? getUploadUrl(user.avatar) : null;
            return (
              <button
                key={user._id || user.id || idx}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => onSelect(user)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors cursor-pointer ${
                  isSelected ? 'bg-white/[0.08]' : 'hover:bg-white/[0.04]'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/[0.1] overflow-hidden flex items-center justify-center shrink-0">
                  {avatarSrc ? (
                    <img src={avatarSrc} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-4 h-4 text-text-muted" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{user.name}</p>
                  <p className="text-[11px] text-text-muted truncate">
                    @{user.username || user.name?.toLowerCase().replace(/\s+/g, '')}
                  </p>
                </div>
                {user.role && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-brand-mint/10 text-brand-mint border border-brand-mint/20 shrink-0">
                    {user.role}
                  </span>
                )}
              </button>
            );
          })
        ) : !isLoading ? (
          <div className="px-4 py-4 text-center text-xs text-text-muted">
            No matching members found
          </div>
        ) : (
          <div className="px-4 py-4 text-center text-xs text-text-muted">
            Searching members...
          </div>
        )}
      </div>
    </div>
  );
}
