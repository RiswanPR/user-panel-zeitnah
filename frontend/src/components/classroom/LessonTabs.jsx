import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Clock,
  Download,
  Eye,
  CheckCircle2,
  Award,
  Sparkles,
  BookOpen,
  Copy,
  Trash2,
  Plus,
  ShieldCheck,
  Bookmark,
  Edit3,
  Save,
  X,
  Play,
  Info,
  ListOrdered,
} from 'lucide-react';
import { formatDuration, getUploadUrl } from '../../utils/courseUi';
import {
  formatTimestamp,
  sanitizeChapters,
  validateBookmark,
  sortBookmarks,
  sortNotes,
  normalizeToSeconds,
} from '../../utils/playerUnits';
import { useToast } from '../ui/Toast';

export default function LessonTabs({
  currentClass = {},
  chapter = {},
  course = {},
  classProgress = {},
  learningProgress = {},
  isClassCompleted = false,
  classProgressPercent = 0,
  currentVideoTime = 0,
  user = {},
  onPreviewResource,
  onSeek,
}) {
  const [activeTab, setActiveTab] = useState('overview');
  const toast = useToast();

  const classId = currentClass._id || currentClass.id;
  const userId = user?.userId || user?._id || user?.id || 'guest';
  const durationSeconds = normalizeToSeconds(currentClass?.duration || classProgress?.durationSeconds || 0);

  // ══════════════════════════════════════════════════════════
  // CHAPTERS TAB DATA (Real timestamped chapters only)
  // ══════════════════════════════════════════════════════════
  const sanitizedChapters = useMemo(() => {
    return sanitizeChapters(
      currentClass.videoChapters || currentClass.chapters,
      durationSeconds
    );
  }, [currentClass.videoChapters, currentClass.chapters, durationSeconds]);

  // ══════════════════════════════════════════════════════════
  // BOOKMARKS STATE & PERSISTENCE (User & Class scoped)
  // ══════════════════════════════════════════════════════════
  const [bookmarks, setBookmarks] = useState([]);
  const [bookmarkLabel, setBookmarkLabel] = useState('');

  useEffect(() => {
    if (!classId) return;
    try {
      const saved = localStorage.getItem(`zeitnah_bookmarks_v1_${userId}_${classId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setBookmarks(sortBookmarks(parsed));
          return;
        }
      }
      setBookmarks([]);
    } catch {
      setBookmarks([]);
    }
  }, [classId, userId]);

  const handleAddBookmark = () => {
    const currentSec = Math.max(0, Math.round(normalizeToSeconds(currentVideoTime)));
    const validation = validateBookmark({
      timestampSeconds: currentSec,
      existingBookmarks: bookmarks,
      minIntervalSeconds: 2,
      durationSeconds,
    });

    if (!validation.isValid) {
      toast.error('Cannot add bookmark', validation.reason);
      return;
    }

    const newBm = {
      id: `bm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      classId,
      timestampSeconds: currentSec,
      label: bookmarkLabel.trim() || `Bookmark at ${formatTimestamp(currentSec)}`,
      createdAt: Date.now(),
    };

    const updated = sortBookmarks([...bookmarks, newBm]);
    setBookmarks(updated);
    setBookmarkLabel('');
    try {
      localStorage.setItem(`zeitnah_bookmarks_v1_${userId}_${classId}`, JSON.stringify(updated));
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
    toast.success('Bookmark added', `Saved at ${formatTimestamp(currentSec)}`);
  };

  const handleDeleteBookmark = (bmId) => {
    if (!window.confirm('Are you sure you want to delete this bookmark?')) return;
    const updated = bookmarks.filter((b) => b.id !== bmId);
    setBookmarks(updated);
    try {
      localStorage.setItem(`zeitnah_bookmarks_v1_${userId}_${classId}`, JSON.stringify(updated));
    } catch {}
    toast.info('Bookmark removed');
  };

  // ══════════════════════════════════════════════════════════
  // TIMESTAMPEd LECTURE NOTES (User & Class scoped + Migration)
  // ══════════════════════════════════════════════════════════
  const [notesList, setNotesList] = useState([]);
  const [newNoteText, setNewNoteText] = useState('');
  const [newNoteTimestamp, setNewNoteTimestamp] = useState(null);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingNoteText, setEditingNoteText] = useState('');

  // Load and auto-migrate legacy plain-text notes
  useEffect(() => {
    if (!classId) return;
    try {
      const v2Data = localStorage.getItem(`zeitnah_notes_v2_${userId}_${classId}`);
      if (v2Data) {
        const parsed = JSON.parse(v2Data);
        if (Array.isArray(parsed)) {
          setNotesList(sortNotes(parsed));
          return;
        }
      }

      // Check for legacy unstructured note text
      const legacy = localStorage.getItem(`zeitnah_notes_${classId}`);
      if (legacy && legacy.trim()) {
        const migratedNote = {
          id: `migrated_${Date.now()}`,
          classId,
          timestampSeconds: 0,
          text: legacy.trim(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        const migratedList = [migratedNote];
        setNotesList(migratedList);
        localStorage.setItem(`zeitnah_notes_v2_${userId}_${classId}`, JSON.stringify(migratedList));
      } else {
        setNotesList([]);
      }
    } catch {
      setNotesList([]);
    }
  }, [classId, userId]);

  const handleSaveNewNote = () => {
    if (!newNoteText.trim()) {
      toast.error('Empty Note', 'Please enter some text before saving.');
      return;
    }
    const currentSec = Math.max(
      0,
      Math.round(normalizeToSeconds(newNoteTimestamp !== null ? newNoteTimestamp : currentVideoTime))
    );
    const newNote = {
      id: `note_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      classId,
      timestampSeconds: currentSec,
      text: newNoteText.trim(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const updated = sortNotes([...notesList, newNote]);
    setNotesList(updated);
    setNewNoteText('');
    setNewNoteTimestamp(null);
    try {
      localStorage.setItem(`zeitnah_notes_v2_${userId}_${classId}`, JSON.stringify(updated));
    } catch {}
    toast.success('Note saved', `Captured at ${formatTimestamp(currentSec)}`);
  };

  const handleStartEditNote = (note) => {
    setEditingNoteId(note.id);
    setEditingNoteText(note.text);
  };

  const handleSaveEditNote = (noteId) => {
    if (!editingNoteText.trim()) {
      toast.error('Empty Note', 'Note text cannot be blank.');
      return;
    }
    const updated = notesList.map((n) => {
      if (n.id === noteId) {
        return {
          ...n,
          text: editingNoteText.trim(),
          updatedAt: Date.now(),
        };
      }
      return n;
    });
    setNotesList(updated);
    setEditingNoteId(null);
    setEditingNoteText('');
    try {
      localStorage.setItem(`zeitnah_notes_v2_${userId}_${classId}`, JSON.stringify(updated));
    } catch {}
    toast.success('Note updated');
  };

  const handleDeleteNote = (id) => {
    if (!window.confirm('Are you sure you want to delete this note?')) return;
    const updated = notesList.filter((n) => n.id !== id);
    setNotesList(updated);
    try {
      localStorage.setItem(`zeitnah_notes_v2_${userId}_${classId}`, JSON.stringify(updated));
    } catch {}
    toast.info('Note deleted');
  };

  const handleExportNotes = async () => {
    if (notesList.length === 0) return;
    const formatted = notesList
      .map((n) => `[${formatTimestamp(n.timestampSeconds)}] ${n.text}`)
      .join('\n\n');
    try {
      await navigator.clipboard.writeText(formatted);
      toast.success('Notes copied to clipboard');
    } catch {
      toast.error('Failed to copy notes');
    }
  };

  const exercises = currentClass.exercises || [];
  const courseCompletionPercent = Math.min(
    100,
    Math.max(0, Math.round(learningProgress?.completionPercent || 0))
  );

  const tabs = [
    { id: 'overview', label: 'Overview' },
    {
      id: 'chapters',
      label: 'Chapters',
      count: sanitizedChapters.length > 0 ? sanitizedChapters.length : null,
    },
    {
      id: 'bookmarks',
      label: 'Bookmarks',
      count: bookmarks.length > 0 ? bookmarks.length : null,
    },
    {
      id: 'notes',
      label: 'Notes',
      count: notesList.length > 0 ? notesList.length : null,
    },
    {
      id: 'resources',
      label: 'Resources',
      count: exercises.length > 0 ? exercises.length : null,
    },
    { id: 'progress', label: 'Progress' },
  ];

  return (
    <div className="w-full space-y-4">
      {/* ── Tab Navigation Header ── */}
      <div
        role="tablist"
        aria-label="Lesson workspace sections"
        className="flex items-center gap-1 sm:gap-2 border-b border-border pb-px overflow-x-auto no-scrollbar"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              id={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`relative px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                isActive
                  ? 'text-text-primary'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                    isActive
                      ? 'bg-brand-mint/20 text-brand-mint border border-brand-mint/30'
                      : 'bg-surface-elevated text-text-muted'
                  }`}
                >
                  {tab.count}
                </span>
              )}
              {isActive && (
                <motion.div
                  layoutId="activeLessonTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-mint"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Tab Panels ── */}
      <AnimatePresence mode="wait">
        {/* 1. OVERVIEW PANEL */}
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            id="panel-overview"
            role="tabpanel"
            aria-labelledby="tab-overview"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="p-5 sm:p-7 rounded-2xl sm:rounded-3xl border border-border bg-surface-card space-y-6"
          >
            {/* Header Metadata */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                <span className="text-brand-mint">{chapter.title || 'Chapter'}</span>
                {currentClass.duration && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-border/60" />
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDuration(currentClass.duration)}
                    </span>
                  </>
                )}
                {isClassCompleted && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-border/60" />
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Completed
                    </span>
                  </>
                )}
              </div>

              <h1 className="font-heading font-extrabold text-xl sm:text-2xl md:text-3xl text-text-primary tracking-tight">
                {currentClass.title || 'Untitled Lesson'}
              </h1>
            </div>

            {/* Description */}
            <div className="prose dark:prose-invert max-w-none text-xs sm:text-sm text-text-secondary leading-relaxed space-y-3">
              {currentClass.description ? (
                currentClass.description
                  .split('\n')
                  .filter(Boolean)
                  .map((paragraph, idx) => (
                    <p key={idx} className="leading-relaxed">
                      {paragraph}
                    </p>
                  ))
              ) : (
                <p className="italic text-text-muted">
                  No written lesson summary available. Watch the lecture above for comprehensive guidance.
                </p>
              )}
            </div>

            {/* Key Focus & Objectives */}
            <div className="pt-4 border-t border-border/60 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl border border-border bg-surface-elevated/40">
                <div className="flex items-center gap-2 text-text-primary font-semibold text-xs mb-1">
                  <BookOpen className="w-3.5 h-3.5 text-brand-mint" />
                  Format
                </div>
                <div className="text-[11px] text-text-muted">
                  Interactive Video Lecture & Resources
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-border bg-surface-elevated/40">
                <div className="flex items-center gap-2 text-text-primary font-semibold text-xs mb-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Completion Goal
                </div>
                <div className="text-[11px] text-text-muted">
                  90%+ watched time unlocks completion
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-border bg-surface-elevated/40">
                <div className="flex items-center gap-2 text-text-primary font-semibold text-xs mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-brand-yellow" />
                  Rewards
                </div>
                <div className="text-[11px] text-text-muted">
                  XP allocation on verified watch time
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* 2. CHAPTERS PANEL (Timestamp navigation for video markers) */}
        {activeTab === 'chapters' && (
          <motion.div
            key="chapters"
            id="panel-chapters"
            role="tabpanel"
            aria-labelledby="tab-chapters"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="p-5 sm:p-7 rounded-2xl sm:rounded-3xl border border-border bg-surface-card space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div>
                <h3 className="font-heading font-bold text-base text-text-primary">
                  In-Video Chapters
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Select any section to jump directly to that timestamp in the lecture.
                </p>
              </div>
              {sanitizedChapters.length > 0 && (
                <span className="text-xs font-mono font-semibold text-brand-mint bg-brand-mint/10 border border-brand-mint/20 px-2.5 py-1 rounded-lg">
                  {sanitizedChapters.length} {sanitizedChapters.length === 1 ? 'marker' : 'markers'}
                </span>
              )}
            </div>

            {sanitizedChapters.length === 0 ? (
              <div className="p-8 sm:p-10 text-center space-y-3 border border-dashed border-border rounded-2xl bg-surface-elevated/20">
                <div className="w-10 h-10 rounded-full bg-surface-elevated border border-border flex items-center justify-center text-text-muted mx-auto">
                  <ListOrdered className="w-5 h-5 text-brand-mint" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-text-primary">Continuous Playback</h4>
                  <p className="text-xs text-text-muted max-w-md mx-auto leading-relaxed">
                    This video plays continuously without separate timestamp chapter markers. You can create your own custom timestamp markers in the <strong>Bookmarks</strong> tab.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {sanitizedChapters.map((ch, idx) => {
                  const nextCh = sanitizedChapters[idx + 1];
                  const isActive =
                    currentVideoTime >= ch.timestampSeconds &&
                    (!nextCh || currentVideoTime < nextCh.timestampSeconds);

                  return (
                    <button
                      key={ch.id || idx}
                      type="button"
                      onClick={() => onSeek && onSeek(ch.timestampSeconds)}
                      className={`w-full flex items-center justify-between gap-3 p-3.5 rounded-xl sm:rounded-2xl border transition-all text-left cursor-pointer group min-h-[50px] ${
                        isActive
                          ? 'border-brand-mint/40 bg-brand-mint/[0.08]'
                          : 'border-border bg-surface-elevated/40 hover:bg-surface-elevated hover:border-border-accent'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`font-mono text-xs px-2.5 py-1 rounded-lg font-bold shrink-0 transition-colors ${
                            isActive
                              ? 'bg-brand-mint text-brand-navy'
                              : 'bg-surface-elevated text-brand-mint border border-brand-mint/20 group-hover:border-brand-mint/40'
                          }`}
                        >
                          {formatTimestamp(ch.timestampSeconds)}
                        </span>
                        <span
                          className={`text-xs sm:text-sm font-semibold truncate transition-colors ${
                            isActive
                              ? 'text-brand-mint'
                              : 'text-text-primary group-hover:text-brand-mint'
                          }`}
                        >
                          {ch.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isActive && (
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-mint px-2 py-0.5 rounded-full bg-brand-mint/20">
                            Now Playing
                          </span>
                        )}
                        <Play
                          className={`w-3.5 h-3.5 transition-transform group-hover:scale-110 ${
                            isActive ? 'text-brand-mint fill-brand-mint' : 'text-text-muted'
                          }`}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* 3. BOOKMARKS PANEL (Capture timestamp positions) */}
        {activeTab === 'bookmarks' && (
          <motion.div
            key="bookmarks"
            id="panel-bookmarks"
            role="tabpanel"
            aria-labelledby="tab-bookmarks"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="p-5 sm:p-7 rounded-2xl sm:rounded-3xl border border-border bg-surface-card space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/60">
              <div>
                <h3 className="font-heading font-bold text-base text-text-primary">
                  Saved Bookmarks
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Pin key moments in the video to review later on this device.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-semibold text-text-muted bg-surface-elevated px-2 py-1 rounded-md border border-border">
                  Device Storage
                </span>
                {bookmarks.length > 0 && (
                  <span className="text-xs font-mono font-semibold text-brand-yellow bg-brand-yellow/10 border border-brand-yellow/20 px-2.5 py-1 rounded-lg">
                    {bookmarks.length} {bookmarks.length === 1 ? 'bookmark' : 'bookmarks'}
                  </span>
                )}
              </div>
            </div>

            {/* Add Bookmark Row */}
            <div className="flex flex-col sm:flex-row gap-2.5 p-3 rounded-xl sm:rounded-2xl border border-border bg-surface-elevated/40">
              <input
                type="text"
                value={bookmarkLabel}
                onChange={(e) => setBookmarkLabel(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddBookmark()}
                placeholder={`Optional label (defaults to "Bookmark at ${formatTimestamp(currentVideoTime)}")`}
                className="flex-1 rounded-lg border border-border bg-surface-card px-3.5 py-2 text-xs sm:text-sm text-text-primary placeholder:text-text-muted focus:border-brand-mint/50 focus:outline-none min-h-[44px]"
              />
              <button
                type="button"
                onClick={handleAddBookmark}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-brand-yellow text-brand-navy hover:bg-brand-yellow/90 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer min-h-[44px] shrink-0"
              >
                <Bookmark className="w-3.5 h-3.5 fill-current" />
                <span>Bookmark at {formatTimestamp(currentVideoTime)}</span>
              </button>
            </div>

            {/* Bookmarks List */}
            {bookmarks.length === 0 ? (
              <div className="p-8 sm:p-10 text-center space-y-3 border border-dashed border-border rounded-2xl bg-surface-elevated/20">
                <Bookmark className="w-8 h-8 text-brand-yellow/60 mx-auto" />
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-text-primary">No bookmarks yet</h4>
                  <p className="text-xs text-text-muted max-w-sm mx-auto">
                    Tap the button above while watching to pin important concepts, equations, or explanations.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {bookmarks.map((bm) => (
                  <div
                    key={bm.id}
                    className="flex items-center justify-between gap-3 p-3.5 rounded-xl sm:rounded-2xl border border-border bg-surface-elevated/40 hover:bg-surface-elevated transition-all"
                  >
                    <button
                      type="button"
                      onClick={() => onSeek && onSeek(bm.timestampSeconds)}
                      className="flex items-center gap-3 min-w-0 text-left flex-1 cursor-pointer group"
                    >
                      <span className="font-mono text-xs px-2.5 py-1 rounded-lg bg-brand-yellow/15 text-brand-yellow border border-brand-yellow/30 font-bold shrink-0 group-hover:scale-105 transition-transform">
                        {formatTimestamp(bm.timestampSeconds)}
                      </span>
                      <span className="text-xs sm:text-sm font-semibold text-text-primary truncate group-hover:text-brand-yellow transition-colors">
                        {bm.label}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteBookmark(bm.id)}
                      aria-label="Delete bookmark"
                      className="p-2 rounded-lg border border-border bg-surface-card hover:bg-rose-500/10 hover:border-rose-500/30 text-text-muted hover:text-rose-400 transition-all cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* 4. NOTES PANEL (Timestamped Structured Notes) */}
        {activeTab === 'notes' && (
          <motion.div
            key="notes"
            id="panel-notes"
            role="tabpanel"
            aria-labelledby="tab-notes"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="p-5 sm:p-7 rounded-2xl sm:rounded-3xl border border-border bg-surface-card space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/60">
              <div>
                <h3 className="font-heading font-bold text-base text-text-primary">
                  Lecture Notes
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Capture structured notes linked to video timestamps. Preserved in your device workspace.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {notesList.length > 0 && (
                  <button
                    type="button"
                    onClick={handleExportNotes}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-[40px] rounded-lg border border-border bg-surface-elevated/60 hover:bg-surface-elevated text-text-secondary hover:text-text-primary text-xs font-semibold transition-all cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy All</span>
                  </button>
                )}
                <span className="text-[10px] font-mono font-semibold text-text-muted bg-surface-elevated px-2 py-1 rounded-md border border-border">
                  Device Storage
                </span>
              </div>
            </div>

            {/* New Note Composer */}
            <div className="space-y-3 p-4 rounded-xl sm:rounded-2xl border border-border bg-surface-elevated/40">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-text-primary flex items-center gap-2">
                  <Plus className="w-3.5 h-3.5 text-brand-mint" />
                  New Note
                </span>
                <button
                  type="button"
                  onClick={() => setNewNoteTimestamp(Math.max(0, Math.round(normalizeToSeconds(currentVideoTime))))}
                  className="inline-flex items-center gap-1.5 text-xs text-brand-mint hover:underline font-mono"
                >
                  <Clock className="w-3 h-3" />
                  <span>
                    Timestamp: {formatTimestamp(newNoteTimestamp !== null ? newNoteTimestamp : currentVideoTime)}
                  </span>
                </button>
              </div>

              <textarea
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                placeholder="Write your note here... Preserves line breaks and links directly to the video timestamp."
                rows={3}
                className="w-full rounded-xl border border-border bg-surface-card p-3.5 text-xs sm:text-sm text-text-primary placeholder:text-text-muted focus:border-brand-mint/50 focus:outline-none transition-all resize-y leading-relaxed font-sans"
              />

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleSaveNewNote}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-brand-mint text-brand-navy hover:bg-brand-mint/90 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer min-h-[40px]"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Note</span>
                </button>
              </div>
            </div>

            {/* Notes List */}
            {notesList.length === 0 ? (
              <div className="p-8 sm:p-10 text-center space-y-3 border border-dashed border-border rounded-2xl bg-surface-elevated/20">
                <FileText className="w-8 h-8 text-text-muted mx-auto" />
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-text-primary">No notes yet</h4>
                  <p className="text-xs text-text-muted max-w-sm mx-auto">
                    Type a note above to record insights, key points, or review questions for this lecture.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {notesList.map((note) => {
                  const isEditing = editingNoteId === note.id;

                  return (
                    <div
                      key={note.id}
                      className="p-4 rounded-xl sm:rounded-2xl border border-border bg-surface-elevated/40 space-y-2.5 transition-all"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => onSeek && onSeek(note.timestampSeconds)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand-mint/15 hover:bg-brand-mint/25 text-brand-mint border border-brand-mint/30 font-mono text-xs font-bold transition-all cursor-pointer group"
                        >
                          <Play className="w-2.5 h-2.5 fill-current group-hover:scale-110 transition-transform" />
                          <span>{formatTimestamp(note.timestampSeconds)}</span>
                        </button>

                        <div className="flex items-center gap-1.5">
                          {!isEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleStartEditNote(note)}
                                aria-label="Edit note"
                                className="p-1.5 rounded-lg border border-border bg-surface-card hover:bg-surface-elevated text-text-muted hover:text-text-primary transition-all cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteNote(note.id)}
                                aria-label="Delete note"
                                className="p-1.5 rounded-lg border border-border bg-surface-card hover:bg-rose-500/10 hover:border-rose-500/30 text-text-muted hover:text-rose-400 transition-all cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setEditingNoteId(null)}
                              aria-label="Cancel edit"
                              className="p-1.5 rounded-lg border border-border bg-surface-card hover:bg-surface-elevated text-text-muted hover:text-text-primary transition-all cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {isEditing ? (
                        <div className="space-y-2 pt-1">
                          <textarea
                            value={editingNoteText}
                            onChange={(e) => setEditingNoteText(e.target.value)}
                            rows={3}
                            className="w-full rounded-xl border border-border bg-surface-card p-3 text-xs sm:text-sm text-text-primary focus:border-brand-mint/50 focus:outline-none transition-all leading-relaxed font-sans"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleSaveEditNote(note.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-mint text-brand-navy hover:bg-brand-mint/90 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                            >
                              <Save className="w-3.5 h-3.5" />
                              <span>Update</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="whitespace-pre-wrap break-words text-xs sm:text-sm text-text-primary leading-relaxed font-sans">
                          {note.text}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* 5. RESOURCES PANEL (Lazy loading PDF & attachments, fixes PERF-003) */}
        {activeTab === 'resources' && (
          <motion.div
            key="resources"
            id="panel-resources"
            role="tabpanel"
            aria-labelledby="tab-resources"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="p-5 sm:p-7 rounded-2xl sm:rounded-3xl border border-border bg-surface-card space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div>
                <h3 className="font-heading font-bold text-base text-text-primary">
                  Lesson Attachments & Assets
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Download supplementary exercise sheets, diagrams, and project files.
                </p>
              </div>
              <span className="text-xs font-mono font-semibold text-brand-mint bg-brand-mint/10 border border-brand-mint/20 px-2.5 py-1 rounded-lg">
                {exercises.length} {exercises.length === 1 ? 'file' : 'files'}
              </span>
            </div>

            {exercises.length === 0 ? (
              <div className="p-10 text-center space-y-2 border border-dashed border-border rounded-2xl">
                <FileText className="w-8 h-8 text-text-muted mx-auto" />
                <p className="text-xs sm:text-sm text-text-muted font-medium">
                  No downloadable materials are attached to this lesson.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {exercises.map((exercise, index) => {
                  const fileName = exercise.title || `Resource ${index + 1}`;
                  const fileType = (exercise.type || 'DOCUMENT').toUpperCase();
                  const fileUrl = getUploadUrl(exercise.file);

                  return (
                    <div
                      key={exercise._id || exercise.id || index}
                      className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl sm:rounded-2xl border border-border bg-surface-elevated/40 hover:bg-surface-elevated/80 hover:border-brand-mint/30 transition-all"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-brand-mint/10 border border-brand-mint/20 flex items-center justify-center text-brand-mint shrink-0 group-hover:scale-105 transition-transform">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold text-text-primary truncate group-hover:text-brand-mint transition-colors">
                            {fileName}
                          </h4>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-text-muted">
                            <span className="font-mono font-bold text-text-muted">{fileType}</span>
                            <span className="w-1 h-1 rounded-full bg-border/60" />
                            <span>Course Asset</span>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => onPreviewResource && onPreviewResource(exercise)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] rounded-lg border border-border bg-surface-elevated hover:bg-surface-elevated/80 text-text-secondary hover:text-text-primary text-xs font-semibold transition-all cursor-pointer focus-ring"
                        >
                          <Eye className="w-3.5 h-3.5 text-brand-mint" />
                          <span>Preview</span>
                        </button>

                        <a
                          href={fileUrl}
                          download
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] rounded-lg bg-brand-mint text-brand-navy hover:bg-brand-mint/90 text-xs font-bold uppercase tracking-wider transition-all focus-ring"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* 6. PROGRESS PANEL (Accessible progressbar semantics, A11Y-001) */}
        {activeTab === 'progress' && (
          <motion.div
            key="progress"
            id="panel-progress"
            role="tabpanel"
            aria-labelledby="tab-progress"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="p-5 sm:p-7 rounded-2xl sm:rounded-3xl border border-border bg-surface-card space-y-6"
          >
            <div>
              <h3 className="font-heading font-bold text-base text-text-primary">
                Detailed Progress Metrics
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                Official learning telemetry recorded with server-backed persistence.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* THIS LESSON */}
              <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl border border-border bg-surface-elevated/30 space-y-3">
                <div className="flex items-center justify-between text-xs text-text-secondary">
                  <span className="font-semibold text-text-primary">This Lesson Progress</span>
                  <span className="font-mono font-bold text-brand-mint">{classProgressPercent}%</span>
                </div>

                <div
                  role="progressbar"
                  aria-label="Current lesson progress"
                  aria-valuenow={classProgressPercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  className="w-full h-2 rounded-full bg-border/60 overflow-hidden"
                >
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isClassCompleted
                        ? 'bg-emerald-400'
                        : 'bg-gradient-to-r from-brand-mint to-brand-yellow'
                    }`}
                    style={{ width: `${classProgressPercent}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-text-muted pt-1">
                  <span>Status:</span>
                  <span className={isClassCompleted ? 'text-emerald-400 font-semibold' : 'text-text-secondary'}>
                    {isClassCompleted ? 'Completed (90%+ criteria met)' : 'In Progress'}
                  </span>
                </div>
              </div>

              {/* OVERALL COURSE */}
              <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl border border-border bg-surface-elevated/30 space-y-3">
                <div className="flex items-center justify-between text-xs text-text-secondary">
                  <span className="font-semibold text-text-primary">Overall Course Progress</span>
                  <span className="font-mono font-bold text-brand-yellow">{courseCompletionPercent}%</span>
                </div>

                <div
                  role="progressbar"
                  aria-label="Overall course completion"
                  aria-valuenow={courseCompletionPercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  className="w-full h-2 rounded-full bg-border/60 overflow-hidden"
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-brand-mint to-brand-yellow transition-all duration-500"
                    style={{ width: `${courseCompletionPercent}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-text-muted pt-1">
                  <span>Curriculum Completion:</span>
                  <span className="text-text-secondary font-mono">
                    {learningProgress?.completedClasses || 0} / {learningProgress?.totalClasses || 0} Lessons
                  </span>
                </div>
              </div>
            </div>

            {/* LEARNING REWARDS & CERTIFICATE STATUS */}
            <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl border border-border bg-brand-mint/[0.04] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-brand-yellow/10 border border-brand-yellow/20 flex items-center justify-center text-brand-yellow shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-text-primary">Certificate Eligibility</h4>
                  <p className="text-xs text-text-muted mt-0.5">
                    {courseCompletionPercent >= 100
                      ? 'Congratulations! You have fulfilled all criteria to claim your course certificate.'
                      : `Complete all lessons (${courseCompletionPercent}% achieved) to unlock your verified course certificate.`}
                  </p>
                </div>
              </div>

              {courseCompletionPercent >= 100 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs uppercase tracking-wider shrink-0 self-start sm:self-auto">
                  <CheckCircle2 className="w-4 h-4" />
                  Eligible
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
