import React, { useState, useEffect } from 'react';
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
  Flame,
  ShieldCheck,
} from 'lucide-react';
import { formatDuration, getUploadUrl } from '../../utils/courseUi';
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
  onPreviewResource,
}) {
  const [activeTab, setActiveTab] = useState('overview');
  const [notes, setNotes] = useState('');
  const [noteCopied, setNoteCopied] = useState(false);
  const toast = useToast();

  const classId = currentClass._id || currentClass.id;

  // Local-only note storage per lesson
  useEffect(() => {
    if (!classId) return;
    try {
      const saved = localStorage.getItem(`zeitnah_notes_${classId}`) || '';
      setNotes(saved);
    } catch {
      // LocalStorage fallback
    }
  }, [classId]);

  const handleNotesChange = (val) => {
    setNotes(val);
    if (!classId) return;
    try {
      localStorage.setItem(`zeitnah_notes_${classId}`, val);
    } catch {
      // LocalStorage quota fallback
    }
  };

  const handleInsertTimestamp = () => {
    const totalSecs = Math.max(0, Math.floor(currentVideoTime || 0));
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    const timeFormatted = `[${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}] `;
    const updated = notes ? `${notes}\n${timeFormatted}` : timeFormatted;
    handleNotesChange(updated);
  };

  const handleCopyNotes = async () => {
    if (!notes.trim()) return;
    try {
      await navigator.clipboard.writeText(notes);
      setNoteCopied(true);
      toast.success('Notes copied to clipboard');
      setTimeout(() => setNoteCopied(false), 2000);
    } catch {
      toast.error('Failed to copy notes');
    }
  };

  const handleClearNotes = () => {
    if (window.confirm('Are you sure you want to clear your notes for this lesson?')) {
      handleNotesChange('');
      toast.info('Notes cleared');
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
      id: 'resources',
      label: 'Resources',
      count: exercises.length > 0 ? exercises.length : null,
    },
    { id: 'notes', label: 'Notes' },
    { id: 'progress', label: 'Progress' },
  ];

  return (
    <div className="w-full space-y-4">
      {/* ── Tab Navigation Header ── */}
      <div
        role="tablist"
        aria-label="Lesson workspace sections"
        className="flex items-center gap-1 sm:gap-2 border-b border-white/[0.08] pb-px overflow-x-auto no-scrollbar"
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
                  ? 'text-white'
                  : 'text-text-muted hover:text-white/80'
              }`}
            >
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                    isActive
                      ? 'bg-brand-mint/20 text-brand-mint border border-brand-mint/30'
                      : 'bg-white/[0.06] text-text-muted'
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
        {/* OVERVIEW PANEL */}
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
            className="p-5 sm:p-7 rounded-2xl sm:rounded-3xl border border-white/[0.08] bg-bg-card/70 backdrop-blur-md space-y-6"
          >
            {/* Header Metadata */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                <span className="text-brand-mint">{chapter.title || 'Chapter'}</span>
                {currentClass.duration && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-white/20" />
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDuration(currentClass.duration)}
                    </span>
                  </>
                )}
                {isClassCompleted && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-white/20" />
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Completed
                    </span>
                  </>
                )}
              </div>

              <h1 className="font-heading font-extrabold text-xl sm:text-2xl md:text-3xl text-white tracking-tight">
                {currentClass.title || 'Untitled Lesson'}
              </h1>
            </div>

            {/* Description */}
            <div className="prose prose-invert max-w-none text-xs sm:text-sm text-text-secondary leading-relaxed space-y-3">
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
            <div className="pt-4 border-t border-white/[0.06] grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                <div className="flex items-center gap-2 text-white font-semibold text-xs mb-1">
                  <BookOpen className="w-3.5 h-3.5 text-brand-mint" />
                  Format
                </div>
                <div className="text-[11px] text-text-muted">
                  Interactive Video Lecture & Resources
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                <div className="flex items-center gap-2 text-white font-semibold text-xs mb-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Completion Goal
                </div>
                <div className="text-[11px] text-text-muted">
                  90%+ watched time unlocks completion
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                <div className="flex items-center gap-2 text-white font-semibold text-xs mb-1">
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

        {/* RESOURCES PANEL (Lazy loading PDF & attachments, fixes PERF-003) */}
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
            className="p-5 sm:p-7 rounded-2xl sm:rounded-3xl border border-white/[0.08] bg-bg-card/70 backdrop-blur-md space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div>
                <h3 className="font-heading font-bold text-base text-white">
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
              <div className="p-10 text-center space-y-2 border border-dashed border-white/10 rounded-2xl">
                <FileText className="w-8 h-8 text-white/20 mx-auto" />
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
                      className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl sm:rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-brand-mint/30 transition-all"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-brand-mint/10 border border-brand-mint/20 flex items-center justify-center text-brand-mint shrink-0 group-hover:scale-105 transition-transform">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold text-white truncate group-hover:text-brand-mint transition-colors">
                            {fileName}
                          </h4>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-text-muted">
                            <span className="font-mono font-bold text-white/50">{fileType}</span>
                            <span className="w-1 h-1 rounded-full bg-white/20" />
                            <span>Course Asset</span>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => onPreviewResource && onPreviewResource(exercise)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-white/90 hover:text-white text-xs font-semibold transition-all cursor-pointer focus-ring"
                        >
                          <Eye className="w-3.5 h-3.5 text-brand-mint" />
                          <span>Preview</span>
                        </button>

                        <a
                          href={fileUrl}
                          download
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-mint text-bg-base hover:bg-brand-mint/90 text-xs font-bold uppercase tracking-wider transition-all focus-ring"
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

        {/* NOTES PANEL (Local persistence, timestamp capture) */}
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
            className="p-5 sm:p-7 rounded-2xl sm:rounded-3xl border border-white/[0.08] bg-bg-card/70 backdrop-blur-md space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
              <div>
                <h3 className="font-heading font-bold text-base text-white">
                  My Lesson Notes
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Captured notes are preserved locally in your browser workspace.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleInsertTimestamp}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-brand-mint/30 bg-brand-mint/10 hover:bg-brand-mint/20 text-brand-mint text-xs font-semibold transition-all cursor-pointer focus-ring"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Insert Timestamp</span>
                </button>

                {notes.trim() && (
                  <>
                    <button
                      type="button"
                      onClick={handleCopyNotes}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] text-white/80 hover:text-white text-xs font-semibold transition-all cursor-pointer focus-ring"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{noteCopied ? 'Copied!' : 'Copy'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleClearNotes}
                      aria-label="Clear notes"
                      className="p-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02] hover:bg-rose-500/10 hover:border-rose-500/30 text-text-muted hover:text-rose-400 transition-all cursor-pointer focus-ring"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>

            <textarea
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Capture key concepts, questions, or ideas from this lesson... Click 'Insert Timestamp' to tie a note to the video timeline."
              rows={8}
              className="w-full rounded-xl sm:rounded-2xl border border-white/[0.08] bg-black/40 p-4 text-xs sm:text-sm text-white placeholder-text-muted focus:border-brand-mint/50 focus:outline-none focus:ring-1 focus:ring-brand-mint/50 transition-all resize-y leading-relaxed font-mono"
            />
          </motion.div>
        )}

        {/* PROGRESS PANEL (Accessible progressbar semantics, A11Y-001) */}
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
            className="p-5 sm:p-7 rounded-2xl sm:rounded-3xl border border-white/[0.08] bg-bg-card/70 backdrop-blur-md space-y-6"
          >
            <div>
              <h3 className="font-heading font-bold text-base text-white">
                Detailed Progress Metrics
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                Official learning telemetry recorded with server-backed persistence.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* THIS LESSON */}
              <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl border border-white/[0.08] bg-white/[0.02] space-y-3">
                <div className="flex items-center justify-between text-xs text-text-secondary">
                  <span className="font-semibold text-white/90">This Lesson Progress</span>
                  <span className="font-mono font-bold text-brand-mint">{classProgressPercent}%</span>
                </div>

                <div
                  role="progressbar"
                  aria-label="Current lesson progress"
                  aria-valuenow={classProgressPercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  className="w-full h-2 rounded-full bg-white/[0.08] overflow-hidden"
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
                  <span className={isClassCompleted ? 'text-emerald-400 font-semibold' : 'text-white/70'}>
                    {isClassCompleted ? 'Completed (90%+ criteria met)' : 'In Progress'}
                  </span>
                </div>
              </div>

              {/* OVERALL COURSE */}
              <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl border border-white/[0.08] bg-white/[0.02] space-y-3">
                <div className="flex items-center justify-between text-xs text-text-secondary">
                  <span className="font-semibold text-white/90">Overall Course Progress</span>
                  <span className="font-mono font-bold text-brand-yellow">{courseCompletionPercent}%</span>
                </div>

                <div
                  role="progressbar"
                  aria-label="Overall course completion"
                  aria-valuenow={courseCompletionPercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  className="w-full h-2 rounded-full bg-white/[0.08] overflow-hidden"
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-brand-mint to-brand-yellow transition-all duration-500"
                    style={{ width: `${courseCompletionPercent}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-text-muted pt-1">
                  <span>Curriculum Completion:</span>
                  <span className="text-white/70 font-mono">
                    {learningProgress?.completedClasses || 0} / {learningProgress?.totalClasses || 0} Lessons
                  </span>
                </div>
              </div>
            </div>

            {/* LEARNING REWARDS & CERTIFICATE STATUS */}
            <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl border border-white/[0.06] bg-brand-mint/[0.03] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-brand-yellow/10 border border-brand-yellow/20 flex items-center justify-center text-brand-yellow shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Certificate Eligibility</h4>
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
