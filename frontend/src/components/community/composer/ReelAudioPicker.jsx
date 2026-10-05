import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  X,
  Music2,
  Search,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Check,
  Sliders,
  Sparkles,
  Disc3,
  Layers,
  Scissors,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { communityApi } from '../../../services/communityApi';

const MUSIC_CATEGORIES = [
  { id: 'ALL', label: 'All' },
  { id: 'UPBEAT', label: 'Upbeat' },
  { id: 'CHILL', label: 'Chill' },
  { id: 'INSPIRING', label: 'Inspiring' },
  { id: 'FOCUS', label: 'Focus' },
];

const formatDuration = (sec) => {
  if (!sec && sec !== 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

/**
 * ReelAudioPicker — Phase 3C Premium Creator Audio Studio & Music Picker:
 * - Desktop drawer / Mobile bottom sheet
 * - Mode selection: ORIGINAL_ONLY | MUSIC_ONLY | MIXED
 * - Dual volume controls (Original audio & Music)
 * - Music Catalog browser with debounced search and category chips
 * - Single HTML5 Audio instance preview with guaranteed teardown on close/unmount
 * - Precise audio segment scrubber (sourceStart to sourceEnd) bounded by Reel duration
 * - Accessible sliders, ARIA states, and reduced-motion support
 */
export default function ReelAudioPicker({
  isOpen,
  onClose,
  audioMode = 'ORIGINAL_ONLY',
  setAudioMode,
  selectedMusic = null,
  setSelectedMusic,
  musicStart = 0,
  setMusicStart,
  musicEnd = 30,
  setMusicEnd,
  originalVolume = 1.0,
  setOriginalVolume,
  musicVolume = 1.0,
  setMusicVolume,
  reelDuration = 30,
  creatorHandle = '',
}) {
  const shouldReduceMotion = useReducedMotion();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [tracks, setTracks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  // Single Audio Preview Player State
  const [previewTrackId, setPreviewTrackId] = useState(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [previewProgress, setPreviewProgress] = useState(0);

  const previewAudioRef = useRef(null);
  const searchDebounceTimerRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Clean up audio preview when track changes, picker closes, or component unmounts
  const stopPreview = useCallback(() => {
    if (previewAudioRef.current) {
      try {
        previewAudioRef.current.pause();
        previewAudioRef.current.removeAttribute('src');
        previewAudioRef.current.load();
      } catch {}
      previewAudioRef.current = null;
    }
    setPreviewTrackId(null);
    setIsPreviewPlaying(false);
    setPreviewProgress(0);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      stopPreview();
    }
    return () => {
      stopPreview();
    };
  }, [isOpen, stopPreview]);

  // Fetch catalog or execute debounced search
  const loadMusic = useCallback(async (query = '', category = 'ALL') => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setLoadError(null);

    try {
      let data;
      if (query && query.trim()) {
        data = await communityApi.searchMusic({
          q: query.trim(),
          category: category !== 'ALL' ? category : undefined,
          limit: 30,
          signal: abortControllerRef.current.signal,
        });
      } else {
        data = await communityApi.getMusicCatalog({
          category: category !== 'ALL' ? category : undefined,
          limit: 30,
        });
      }

      setTracks(Array.isArray(data?.items) ? data.items : []);
    } catch (err) {
      if (err?.name === 'AbortError' || err?.name === 'CanceledError') return;
      setLoadError('Unable to load music library. Please try again.');
      setTracks([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle Search Input with 250ms debounce
  useEffect(() => {
    if (!isOpen) return;

    if (searchDebounceTimerRef.current) {
      clearTimeout(searchDebounceTimerRef.current);
    }

    searchDebounceTimerRef.current = setTimeout(() => {
      loadMusic(searchQuery, selectedCategory);
    }, 250);

    return () => {
      if (searchDebounceTimerRef.current) {
        clearTimeout(searchDebounceTimerRef.current);
      }
    };
  }, [isOpen, searchQuery, selectedCategory, loadMusic]);

  // Preview Playback Controller (guaranteed single Audio element)
  const handleTogglePreview = (track) => {
    if (!track?.audioUrl) return;

    if (previewTrackId === track._id && isPreviewPlaying) {
      // Pause active preview
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      setIsPreviewPlaying(false);
      return;
    }

    // Stop existing preview
    stopPreview();

    // Create fresh Audio instance for the newly selected track
    const audio = new Audio();
    audio.src = track.audioUrl;
    audio.volume = 0.8;
    previewAudioRef.current = audio;

    setPreviewTrackId(track._id);
    setIsPreviewPlaying(true);

    audio.ontimeupdate = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setPreviewProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    audio.onended = () => {
      setIsPreviewPlaying(false);
      setPreviewProgress(0);
      setPreviewTrackId(null);
    };

    audio.onerror = () => {
      setIsPreviewPlaying(false);
      setPreviewProgress(0);
      setPreviewTrackId(null);
    };

    audio.play().catch(() => {
      setIsPreviewPlaying(false);
    });
  };

  // Select Track for the Reel
  const handleSelectTrack = (track) => {
    stopPreview();
    setSelectedMusic(track);
    const clipDuration = reelDuration > 0 ? reelDuration : 30;
    const start = 0;
    const end = Math.min(start + clipDuration, track.duration || 60);
    setMusicStart(start);
    setMusicEnd(end);

    // Default to MIXED if original volume > 0, else MUSIC_ONLY
    if (audioMode === 'ORIGINAL_ONLY') {
      setAudioMode(originalVolume > 0 ? 'MIXED' : 'MUSIC_ONLY');
    }
  };

  // Remove Selected Track
  const handleRemoveTrack = () => {
    stopPreview();
    setSelectedMusic(null);
    setAudioMode('ORIGINAL_ONLY');
  };

  if (!isOpen) return null;

  const clipDuration = reelDuration > 0 ? reelDuration : 30;
  const maxTrackDuration = selectedMusic?.duration || 60;
  const selectedTrackDuration = Math.max(0, musicEnd - musicStart);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md transition-all select-none"
      role="dialog"
      aria-modal="true"
      aria-label="Audio & Music Selection Studio"
    >
      <motion.div
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 40 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-2xl rounded-t-3xl sm:rounded-3xl bg-[#090F1D] border border-white/[0.08] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-[#070B14]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-mint/10 border border-brand-mint/20 flex items-center justify-center text-brand-mint">
              <Music2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Audio & Music</h2>
              <p className="text-[11px] text-text-muted">
                Control original sound, select soundtrack & mix levels
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-text-muted hover:text-white flex items-center justify-center transition-colors focus:outline-none"
            aria-label="Close audio picker"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* ── SECTION 1: AUDIO MODE SELECTOR ── */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              Audio Mode
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setAudioMode('ORIGINAL_ONLY');
                  if (originalVolume === 0) setOriginalVolume(1.0);
                }}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                  audioMode === 'ORIGINAL_ONLY'
                    ? 'bg-brand-mint/10 border-brand-mint text-brand-mint shadow-[0_0_12px_rgba(20,241,149,0.15)]'
                    : 'bg-white/[0.02] border-white/[0.06] text-text-muted hover:border-white/20 hover:text-white'
                }`}
              >
                <Volume2 className="w-4 h-4 mb-1.5" />
                <span className="text-xs font-semibold">Original Only</span>
                <span className="text-[10px] text-text-muted mt-0.5">Video audio only</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!selectedMusic && tracks.length > 0) {
                    handleSelectTrack(tracks[0]);
                  }
                  setAudioMode('MIXED');
                  if (originalVolume === 0) setOriginalVolume(0.5);
                  if (musicVolume === 0) setMusicVolume(1.0);
                }}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                  audioMode === 'MIXED'
                    ? 'bg-brand-mint/10 border-brand-mint text-brand-mint shadow-[0_0_12px_rgba(20,241,149,0.15)]'
                    : 'bg-white/[0.02] border-white/[0.06] text-text-muted hover:border-white/20 hover:text-white'
                }`}
              >
                <Layers className="w-4 h-4 mb-1.5" />
                <span className="text-xs font-semibold">Mixed</span>
                <span className="text-[10px] text-text-muted mt-0.5">Original + Music</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!selectedMusic && tracks.length > 0) {
                    handleSelectTrack(tracks[0]);
                  }
                  setAudioMode('MUSIC_ONLY');
                  if (musicVolume === 0) setMusicVolume(1.0);
                }}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                  audioMode === 'MUSIC_ONLY'
                    ? 'bg-brand-mint/10 border-brand-mint text-brand-mint shadow-[0_0_12px_rgba(20,241,149,0.15)]'
                    : 'bg-white/[0.02] border-white/[0.06] text-text-muted hover:border-white/20 hover:text-white'
                }`}
              >
                <Disc3 className="w-4 h-4 mb-1.5" />
                <span className="text-xs font-semibold">Music Only</span>
                <span className="text-[10px] text-text-muted mt-0.5">Replace original</span>
              </button>
            </div>
          </div>

          {/* ── SECTION 2: VOLUME CONTROLS ── */}
          <div className="p-4 rounded-2xl bg-[#060D18] border border-white/[0.06] space-y-4">
            {/* Original Audio Volume */}
            <div className={`space-y-1.5 ${audioMode === 'MUSIC_ONLY' ? 'opacity-40' : ''}`}>
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-white flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-brand-mint" />
                  Original Audio (
                  {creatorHandle ? `@${creatorHandle.replace(/^@/, '')}` : 'You'})
                </span>
                <span className="font-mono text-text-muted">
                  {Math.round(originalVolume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                disabled={audioMode === 'MUSIC_ONLY'}
                value={originalVolume}
                onChange={(e) => setOriginalVolume(parseFloat(e.target.value))}
                className="w-full accent-brand-mint cursor-pointer"
                aria-label="Original audio volume"
              />
            </div>

            {/* Music Volume */}
            <div className={`space-y-1.5 ${audioMode === 'ORIGINAL_ONLY' ? 'opacity-40' : ''}`}>
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-white flex items-center gap-1.5">
                  <Music2 className="w-3.5 h-3.5 text-brand-yellow" />
                  Soundtrack Music
                </span>
                <span className="font-mono text-text-muted">
                  {Math.round(musicVolume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                disabled={audioMode === 'ORIGINAL_ONLY'}
                value={musicVolume}
                onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                className="w-full accent-brand-yellow cursor-pointer"
                aria-label="Soundtrack music volume"
              />
            </div>
          </div>

          {/* ── SECTION 3: CURRENT SELECTED TRACK & SCRUBBER ── */}
          {selectedMusic && audioMode !== 'ORIGINAL_ONLY' && (
            <div className="p-4 rounded-2xl bg-brand-mint/[0.04] border border-brand-mint/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-mint/20 to-brand-yellow/10 border border-brand-mint/30 flex items-center justify-center text-brand-mint overflow-hidden shrink-0">
                    {selectedMusic.coverUrl ? (
                      <img
                        src={selectedMusic.coverUrl}
                        alt={selectedMusic.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Music2 className="w-5 h-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-white truncate">
                      {selectedMusic.title}
                    </h3>
                    <p className="text-xs text-text-muted truncate">
                      {selectedMusic.artist}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveTrack}
                  className="px-2.5 py-1 rounded-xl bg-white/[0.06] hover:bg-rose-500/20 text-text-muted hover:text-rose-400 text-xs font-medium transition-colors"
                >
                  Remove
                </button>
              </div>

              {/* Lightweight Audio Scrubber (Section 11) */}
              <div className="pt-2 border-t border-white/[0.06] space-y-2">
                <div className="flex items-center justify-between text-xs text-text-muted font-mono">
                  <span className="flex items-center gap-1 text-brand-mint">
                    <Scissors className="w-3 h-3" />
                    Segment: {formatDuration(musicStart)} – {formatDuration(musicEnd)}
                  </span>
                  <span>Clip: {formatDuration(selectedTrackDuration)}</span>
                </div>

                <div className="space-y-1">
                  <input
                    type="range"
                    min="0"
                    max={Math.max(0, maxTrackDuration - clipDuration)}
                    step="0.5"
                    value={musicStart}
                    onChange={(e) => {
                      const start = parseFloat(e.target.value);
                      setMusicStart(start);
                      setMusicEnd(Math.min(maxTrackDuration, start + clipDuration));
                    }}
                    className="w-full accent-brand-mint cursor-pointer"
                    aria-label="Soundtrack segment start position"
                  />
                  <div className="flex justify-between text-[10px] text-text-faint font-mono">
                    <span>0:00</span>
                    <span>Track Total: {formatDuration(maxTrackDuration)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── SECTION 4: MUSIC LIBRARY & SEARCH ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                Soundtrack Library
              </span>
              <span className="text-[11px] text-text-faint">
                {tracks.length} {tracks.length === 1 ? 'track' : 'tracks'}
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search soundtrack by title, artist, or tag..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#060D18] border border-white/[0.08] text-xs text-white placeholder-text-faint focus:outline-none focus:border-brand-mint/50 transition-colors"
              />
            </div>

            {/* Category Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {MUSIC_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-brand-mint text-[#070B14] font-semibold'
                      : 'bg-white/[0.04] text-text-muted hover:bg-white/[0.08] hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Track Listing */}
            <div className="space-y-2 pt-1">
              {isLoading ? (
                <div className="py-12 flex flex-col items-center justify-center text-text-muted space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin text-brand-mint" />
                  <span className="text-xs">Browsing music catalog...</span>
                </div>
              ) : loadError ? (
                <div className="p-6 rounded-2xl bg-rose-500/[0.04] border border-rose-500/20 text-center space-y-2">
                  <AlertCircle className="w-5 h-5 text-rose-400 mx-auto" />
                  <p className="text-xs text-rose-300">{loadError}</p>
                </div>
              ) : tracks.length === 0 ? (
                <div className="py-10 text-center space-y-2 p-6 rounded-2xl bg-white/[0.01] border border-white/[0.04]">
                  <Disc3 className="w-8 h-8 text-text-faint mx-auto" />
                  <h4 className="text-xs font-semibold text-white">No tracks available</h4>
                  <p className="text-[11px] text-text-muted max-w-sm mx-auto">
                    {searchQuery
                      ? 'No music tracks matched your query. Try a different keyword.'
                      : 'The music catalog is currently empty.'}
                  </p>
                </div>
              ) : (
                tracks.map((track) => {
                  const isSelected = selectedMusic?._id === track._id;
                  const isPreviewing = previewTrackId === track._id && isPreviewPlaying;

                  return (
                    <div
                      key={track._id}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                        isSelected
                          ? 'bg-brand-mint/[0.06] border-brand-mint/40'
                          : 'bg-white/[0.02] border-white/[0.04] hover:border-white/10 hover:bg-white/[0.04]'
                      }`}
                    >
                      {/* Play Preview & Track Info */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => handleTogglePreview(track)}
                          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-transform hover:scale-105 shrink-0 ${
                            isPreviewing
                              ? 'bg-brand-mint text-[#070B14] shadow-[0_0_10px_rgba(20,241,149,0.3)]'
                              : 'bg-white/[0.08] text-white hover:bg-white/[0.15]'
                          }`}
                          aria-label={isPreviewing ? 'Pause preview' : 'Play preview'}
                        >
                          {isPreviewing ? (
                            <Pause className="w-4 h-4 fill-current" />
                          ) : (
                            <Play className="w-4 h-4 ml-0.5 fill-current" />
                          )}
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-white truncate">
                              {track.title}
                            </span>
                            {track.category && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/[0.06] text-text-muted uppercase font-mono">
                                {track.category}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-text-muted truncate mt-0.5">
                            <span>{track.artist}</span>
                            <span>•</span>
                            <span>{formatDuration(track.duration)}</span>
                            {track.licenseType === 'ROYALTY_FREE' && (
                              <>
                                <span>•</span>
                                <span className="text-brand-mint/80 font-mono text-[10px]">
                                  Royalty-Free
                                </span>
                              </>
                            )}
                          </div>

                          {/* Progress indicator during preview */}
                          {isPreviewing && (
                            <div className="w-full h-1 bg-white/[0.1] rounded-full overflow-hidden mt-1.5">
                              <div
                                className="h-full bg-brand-mint transition-all"
                                style={{ width: `${previewProgress}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Select / Active Button */}
                      <div className="ml-3 shrink-0">
                        {isSelected ? (
                          <div className="flex items-center gap-1 text-xs text-brand-mint font-semibold px-3 py-1 rounded-xl bg-brand-mint/10 border border-brand-mint/20">
                            <Check className="w-3.5 h-3.5" />
                            <span>Active</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSelectTrack(track)}
                            className="px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-brand-mint hover:text-[#070B14] text-xs font-medium text-white transition-colors cursor-pointer"
                          >
                            Use Track
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-white/[0.06] bg-[#070B14] flex items-center justify-between">
          <div className="text-xs text-text-muted">
            Mode:{' '}
            <span className="text-white font-semibold">
              {audioMode === 'ORIGINAL_ONLY'
                ? 'Original Audio'
                : audioMode === 'MUSIC_ONLY'
                ? 'Soundtrack Only'
                : 'Mixed Sound'}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-brand-mint hover:bg-brand-mint/90 text-[#070B14] text-xs font-semibold transition-transform hover:scale-[1.02] cursor-pointer"
          >
            Apply & Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}
