import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Search,
  X,
  Clock,
  Users,
  FileText,
  Hash,
  AlertCircle,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { useCommunitySearch } from '../../../hooks/useCommunity';
import PeopleCard from './PeopleCard';
import PostCard from '../PostCard';
import PostCardSkeleton from '../feed/PostCard/PostCardSkeleton';

const RECENT_SEARCHES_KEY = 'zeitnah_recent_community_searches';
const MAX_RECENT_SEARCHES = 6;

const getRecentSearches = () => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENT_SEARCHES) : [];
  } catch {
    return [];
  }
};

const saveRecentSearch = (term) => {
  if (!term || typeof term !== 'string' || typeof window === 'undefined') return;
  const clean = term.trim();
  if (!clean || clean.length < 2) return;

  try {
    const current = getRecentSearches();
    const updated = [clean, ...current.filter((item) => item.toLowerCase() !== clean.toLowerCase())].slice(
      0,
      MAX_RECENT_SEARCHES
    );
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  } catch {}
};

const removeRecentSearch = (term) => {
  if (typeof window === 'undefined') return;
  try {
    const current = getRecentSearches();
    const updated = current.filter((item) => item.toLowerCase() !== term.toLowerCase());
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  } catch {}
};

const clearRecentSearches = () => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch {}
};

/**
 * CommunitySearchModal — Editorial, high-speed unified search across Posts, People, and Topics.
 * Supports debounced queries, stale request cancellation, recent searches, and full keyboard navigation.
 */
export default function CommunitySearchModal({
  isOpen,
  onClose,
  onSelectTopic,
  onOpenComments,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'posts' | 'people' | 'topics'
  const [recentList, setRecentList] = useState([]);

  const inputRef = useRef(null);
  const modalRef = useRef(null);
  const previousActiveElementRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const shouldReduceMotion = useReducedMotion();

  // Load recent searches on open
  useEffect(() => {
    if (isOpen) {
      setRecentList(getRecentSearches());
    }
  }, [isOpen]);

  // Debounce search input (300ms)
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!searchTerm.trim()) {
      setDebouncedQuery('');
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      const trimmed = searchTerm.trim();
      setDebouncedQuery(trimmed);
      if (trimmed.length >= 2) {
        saveRecentSearch(trimmed);
        setRecentList(getRecentSearches());
      }
    }, 300);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [searchTerm]);

  // Query API
  const {
    data: searchResults,
    isLoading: isSearching,
    isError,
    refetch,
  } = useCommunitySearch({
    query: debouncedQuery,
    type: activeTab,
    enabled: isOpen && debouncedQuery.length >= 2,
  });

  const posts = useMemo(() => searchResults?.posts || [], [searchResults]);
  const people = useMemo(() => searchResults?.people || [], [searchResults]);
  const topics = useMemo(() => searchResults?.topics || [], [searchResults]);

  const totalResultsCount = posts.length + people.length + topics.length;

  // Focus trap, body scroll lock, Escape dismissal
  useEffect(() => {
    if (isOpen) {
      previousActiveElementRef.current = document.activeElement;
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      const timer = setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 100);

      return () => {
        clearTimeout(timer);
        document.body.style.overflow = originalOverflow;
        if (previousActiveElementRef.current?.focus) {
          previousActiveElementRef.current.focus();
        }
      };
    }
  }, [isOpen]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  const handleClearInput = () => {
    setSearchTerm('');
    setDebouncedQuery('');
    if (inputRef.current) inputRef.current.focus();
  };

  const handleSelectRecent = (term) => {
    setSearchTerm(term);
    setDebouncedQuery(term);
  };

  const handleRemoveRecent = (e, term) => {
    e.stopPropagation();
    removeRecentSearch(term);
    setRecentList(getRecentSearches());
  };

  const handleClearAllRecent = () => {
    clearRecentSearches();
    setRecentList([]);
  };

  const handleTopicClick = (tag) => {
    if (onSelectTopic) onSelectTopic(tag);
    onClose();
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-start justify-center p-0 sm:p-4 md:p-6 overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-label="Community Search"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/75 backdrop-blur-md"
        />

        {/* Search Modal Container */}
        <motion.div
          ref={modalRef}
          initial={shouldReduceMotion ? { opacity: 0 } : { scale: 0.96, opacity: 0, y: 10 }}
          animate={{
            scale: 1,
            opacity: 1,
            y: 0,
            transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
          }}
          exit={
            shouldReduceMotion
              ? { opacity: 0 }
              : { scale: 0.97, opacity: 0, y: 8, transition: { duration: 0.15 } }
          }
          className={`
            relative z-10 w-full max-w-3xl min-h-screen sm:min-h-0 sm:max-h-[88vh]
            bg-[#0B111E] border-0 sm:border border-white/[0.08] sm:rounded-2xl
            shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden
          `}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 1. Header with Accessible Search Field */}
          <div className="p-3.5 sm:p-4 border-b border-white/[0.06] bg-[#0E1626]/60 backdrop-blur-md shrink-0">
            <div className="flex items-center gap-2">
              <div className="relative flex-1 flex items-center">
                <Search className="w-4 h-4 text-brand-mint absolute left-3.5 pointer-events-none" />
                <input
                  ref={inputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search posts, engineers, topics..."
                  className={`
                    w-full min-h-[46px] pl-10 pr-10 rounded-xl
                    bg-white/[0.04] hover:bg-white/[0.06] focus:bg-[#0B111E]
                    border border-white/[0.08] focus:border-brand-mint/50 focus:ring-1 focus:ring-brand-mint/40
                    text-sm text-white placeholder-text-muted transition-all outline-none
                  `}
                  aria-label="Search community"
                  autoComplete="off"
                  spellCheck="false"
                />

                {searchTerm && (
                  <button
                    type="button"
                    onClick={handleClearInput}
                    className="absolute right-3 p-1 rounded-full text-text-muted hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    aria-label="Clear search text"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="min-w-[44px] min-h-[44px] rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-text-muted hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
                aria-label="Close search"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 2. Category Filter Tabs */}
            {debouncedQuery.length >= 2 && (
              <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-white/[0.04] overflow-x-auto scrollbar-none">
                {[
                  { id: 'all', label: 'All Results', icon: TrendingUp },
                  { id: 'posts', label: `Posts ${posts.length ? `(${posts.length})` : ''}`, icon: FileText },
                  { id: 'people', label: `People ${people.length ? `(${people.length})` : ''}`, icon: Users },
                  { id: 'topics', label: `Topics ${topics.length ? `(${topics.length})` : ''}`, icon: Hash },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isSelected = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`
                        min-h-[36px] px-3 py-1 rounded-lg text-xs font-semibold
                        flex items-center gap-1.5 transition-all duration-150 cursor-pointer shrink-0
                        ${
                          isSelected
                            ? 'bg-brand-mint text-[#070B14] shadow-[0_0_12px_rgba(159,213,178,0.25)]'
                            : 'bg-white/[0.03] text-text-muted hover:text-white hover:bg-white/[0.06]'
                        }
                      `}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. Modal Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">
            {/* If no query entered: Show Recent Searches & Discover Advice */}
            {!debouncedQuery ? (
              <div className="space-y-6">
                {recentList.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-brand-mint" />
                        <span>Recent Searches</span>
                      </h4>
                      <button
                        type="button"
                        onClick={handleClearAllRecent}
                        className="text-[11px] text-text-faint hover:text-rose-400 transition-colors cursor-pointer"
                      >
                        Clear history
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {recentList.map((term) => (
                        <div
                          key={term}
                          onClick={() => handleSelectRecent(term)}
                          className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.035] hover:bg-white/[0.07] border border-white/[0.06] hover:border-brand-mint/30 text-xs text-text-secondary hover:text-white transition-all cursor-pointer"
                        >
                          <Clock className="w-3 h-3 text-text-faint" />
                          <span>{term}</span>
                          <button
                            type="button"
                            onClick={(e) => handleRemoveRecent(e, term)}
                            className="text-text-faint hover:text-white p-0.5 rounded transition-colors"
                            aria-label={`Remove ${term} from recent searches`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Helpful Search Tips */}
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] text-xs text-text-muted space-y-2">
                  <p className="font-semibold text-white">Search Community</p>
                  <p className="text-[11px] leading-relaxed text-text-faint">
                    Type a topic (e.g. <strong className="text-brand-mint">#engineering</strong>), keyword, or engineer's name to instantly discover verified discussions, blueprints, and peers.
                  </p>
                </div>
              </div>
            ) : isSearching ? (
              // Loading Skeletons
              <div className="space-y-4">
                <PostCardSkeleton />
                <div className="p-4 rounded-xl bg-white/[0.02] animate-pulse space-y-3">
                  <div className="h-4 bg-white/10 rounded w-1/3" />
                  <div className="h-3 bg-white/5 rounded w-1/2" />
                </div>
              </div>
            ) : isError ? (
              // Error State
              <div className="text-center py-10 px-4">
                <AlertCircle className="w-10 h-10 text-rose-400/80 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-white mb-1">Search encountered an issue</h4>
                <p className="text-xs text-text-muted max-w-md mx-auto mb-4">
                  We could not complete your search query. Please verify your connection and try again.
                </p>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="min-h-[38px] px-4 py-1.5 rounded-xl bg-brand-mint text-bg-base text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer"
                >
                  Retry Search
                </button>
              </div>
            ) : totalResultsCount === 0 ? (
              // Empty State
              <div className="text-center py-12 px-4">
                <div className="w-12 h-12 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-3">
                  <Search className="w-5 h-5 text-text-muted" />
                </div>
                <h4 className="text-sm font-bold text-white mb-1">
                  No results for "{debouncedQuery}"
                </h4>
                <p className="text-xs text-text-muted max-w-sm mx-auto">
                  Try checking your spelling, using broader technical terms, or exploring trending hashtags.
                </p>
              </div>
            ) : (
              // Results Presentation
              <div className="space-y-6">
                {/* 1. Topics / Hashtags Section */}
                {(activeTab === 'all' || activeTab === 'topics') && topics.length > 0 && (
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Hash className="w-3.5 h-3.5 text-brand-mint" />
                      <span>Topics & Disciplines ({topics.length})</span>
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {topics.map((item) => (
                        <button
                          key={item.tag}
                          type="button"
                          onClick={() => handleTopicClick(item.tag)}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] hover:bg-brand-mint/15 border border-white/[0.08] hover:border-brand-mint/40 text-xs font-medium text-text-secondary hover:text-white transition-all cursor-pointer group"
                        >
                          <span className="text-brand-mint font-bold">#{item.tag}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-white/[0.06] text-text-muted">
                            {item.count} {item.count === 1 ? 'post' : 'posts'}
                          </span>
                          <ArrowRight className="w-3 h-3 text-text-faint group-hover:text-brand-mint transition-colors ml-0.5" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. People Section */}
                {(activeTab === 'all' || activeTab === 'people') && people.length > 0 && (
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-brand-mint" />
                      <span>Engineers & Members ({people.length})</span>
                    </h4>
                    <div className="grid grid-cols-1 gap-2.5">
                      {people.map((person) => (
                        <PeopleCard key={person._id || person.id} person={person} />
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Posts Section */}
                {(activeTab === 'all' || activeTab === 'posts') && posts.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-brand-mint" />
                      <span>Community Discussions ({posts.length})</span>
                    </h4>
                    <div className="space-y-4">
                      {posts.map((post) => (
                        <PostCard
                          key={post._id || post.id}
                          post={post}
                          onOpenComments={(p) => {
                            onClose();
                            if (onOpenComments) onOpenComments(p);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 4. Footer */}
          <div className="px-4 py-2.5 border-t border-white/[0.06] bg-[#0E1626]/40 flex items-center justify-between text-[11px] text-text-faint shrink-0">
            <span className="hidden sm:inline">Press <kbd className="font-mono text-white/70">ESC</kbd> to exit</span>
            {totalResultsCount > 0 && debouncedQuery && (
              <span className="font-mono text-text-muted">
                {totalResultsCount} verified {totalResultsCount === 1 ? 'match' : 'matches'}
              </span>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
