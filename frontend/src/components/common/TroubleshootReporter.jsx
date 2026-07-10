import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bug, Send, ChevronDown, ChevronUp, AlertTriangle, Wifi, Terminal, Monitor } from 'lucide-react';
import api from '../../services/api';
import {
  getErrorBuffer,
  getErrorCount,
  clearErrorBuffer,
  getBrowserInfo,
  hasErrors,
} from '../../utils/errorCapture';

// ── Severity Config ──
const SEVERITIES = [
  { value: 'low', label: 'Low', color: '#22c55e', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.25)' },
  { value: 'medium', label: 'Medium', color: '#eab308', bg: 'rgba(234,179,8,0.1)', border: 'rgba(234,179,8,0.25)' },
  { value: 'high', label: 'High', color: '#f97316', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.25)' },
  { value: 'critical', label: 'Critical', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)' },
];

/**
 * Global Troubleshoot Error Reporter
 * Floating badge + modal for submitting error reports.
 */
export default function TroubleshootReporter() {
  const [errorCount, setErrorCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [severity, setSeverity] = useState('medium');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [errorData, setErrorData] = useState(null);
  const modalRef = useRef(null);

  // Poll error count every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setErrorCount(getErrorCount());
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // When modal opens, snapshot the error data & auto-populate title
  const openModal = useCallback(() => {
    const buffer = getErrorBuffer();
    setErrorData(buffer);
    setIsOpen(true);
    setSubmitted(false);
    setSubmitError('');

    // Auto-populate title from latest error
    const latestError =
      buffer.consoleErrors[buffer.consoleErrors.length - 1] ||
      buffer.networkErrors[buffer.networkErrors.length - 1] ||
      buffer.unhandledErrors[buffer.unhandledErrors.length - 1];
    if (latestError && !title) {
      setTitle(
        (latestError.message || 'Error occurred')
          .substring(0, 120)
          .replace(/\n/g, ' ')
      );
    }
  }, [title]);

  const closeModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Close on ESC
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') closeModal(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, closeModal]);

  // Submit report
  const handleSubmit = async () => {
    if (!title.trim()) {
      setSubmitError('Please enter a title for the report.');
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError('');

      const buffer = errorData || getErrorBuffer();
      const browserInfo = getBrowserInfo();

      await api.post('/troubleshoot/report', {
        severity,
        title: title.trim(),
        description: description.trim(),
        pageUrl: window.location.href,
        consoleErrors: buffer.consoleErrors.slice(-30),
        networkErrors: buffer.networkErrors.slice(-20),
        unhandledErrors: buffer.unhandledErrors.slice(-20),
        browserInfo,
      });

      setSubmitted(true);
      clearErrorBuffer();
      setErrorCount(0);

      // Auto-close after 2.5s
      setTimeout(() => {
        setIsOpen(false);
        setTitle('');
        setDescription('');
        setSeverity('medium');
        setSubmitted(false);
      }, 2500);
    } catch (err) {
      setSubmitError(
        err.response?.data?.message || 'Failed to submit report. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Don't render badge if no errors and modal is closed
  const isLoggedIn = !!localStorage.getItem('token');
  if (!isLoggedIn && !isOpen) return null;
  if (errorCount === 0 && !isOpen) return null;

  return (
    <>
      {/* ── Floating Error Badge ── */}
      <AnimatePresence>
        {errorCount > 0 && !isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            onClick={openModal}
            className="fixed bottom-6 right-6 z-[9999] flex items-center gap-2 px-4 py-3 rounded-2xl border cursor-pointer shadow-2xl group"
            style={{
              background: 'linear-gradient(135deg, rgba(239,68,68,0.12) 0%, rgba(239,68,68,0.06) 100%)',
              borderColor: 'rgba(239,68,68,0.3)',
              backdropFilter: 'blur(16px)',
            }}
            title="Submit troubleshoot report"
          >
            {/* Pulse ring */}
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-50" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 items-center justify-center text-[9px] font-bold text-white">
                {errorCount > 9 ? '9+' : errorCount}
              </span>
            </span>

            <Bug className="w-4.5 h-4.5 text-red-400 group-hover:text-red-300 transition-colors" />
            <span className="text-xs font-bold text-red-300 uppercase tracking-wider group-hover:text-red-200 transition-colors">
              Report Issue
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Report Modal ── */}
      <AnimatePresence>
        {isOpen && (
          <div
            className="fixed inset-0 z-[10000] flex items-center justify-center px-4 py-6"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
          >
            <motion.div
              ref={modalRef}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="relative w-full max-w-xl rounded-2xl border overflow-hidden shadow-2xl"
              style={{
                background: 'linear-gradient(180deg, #0d1f33 0%, #091728 100%)',
                borderColor: 'rgba(159,213,178,0.12)',
                maxHeight: '90vh',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top accent line */}
              <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(239,68,68,0.5), rgba(246,237,74,0.3), transparent)' }} />

              {/* Success State */}
              {submitted ? (
                <div className="flex flex-col items-center justify-center py-16 px-8">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 25, delay: 0.1 }}
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
                    style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)' }}
                  >
                    <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </motion.div>
                  <h3 className="text-lg font-bold text-white mb-2">Report Submitted</h3>
                  <p className="text-sm text-white/50 text-center max-w-xs">
                    Your troubleshoot report has been sent. Our team will be alerted immediately.
                  </p>
                </div>
              ) : (
                /* ── Form Content ── */
                <div className="overflow-y-auto" style={{ maxHeight: '85vh' }}>
                  {/* Header */}
                  <div className="flex items-center justify-between px-6 pt-5 pb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}
                      >
                        <Bug className="w-5 h-5 text-red-400" />
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-white tracking-tight">Submit Troubleshoot Report</h2>
                        <p className="text-[11px] text-white/40 font-medium">All error data will be included automatically</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={closeModal}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="px-6 pb-6 space-y-5">

                    {/* Severity Selector */}
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-white/50 mb-2.5">
                        Severity Level
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {SEVERITIES.map((s) => (
                          <button
                            key={s.value}
                            type="button"
                            onClick={() => setSeverity(s.value)}
                            className="py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer border"
                            style={{
                              background: severity === s.value ? s.bg : 'rgba(255,255,255,0.02)',
                              borderColor: severity === s.value ? s.border : 'rgba(255,255,255,0.06)',
                              color: severity === s.value ? s.color : 'rgba(255,255,255,0.35)',
                            }}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Title */}
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-white/50 mb-2">
                        Title
                      </label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => { setTitle(e.target.value); setSubmitError(''); }}
                        placeholder="Brief description of the issue..."
                        maxLength={200}
                        className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 font-medium outline-none transition-all duration-150 focus:ring-2"
                        style={{
                          background: 'rgba(7,25,42,0.6)',
                          border: '1px solid rgba(159,213,178,0.12)',
                          focusRingColor: 'rgba(159,213,178,0.15)',
                        }}
                        onFocus={(e) => { e.target.style.borderColor = 'rgba(159,213,178,0.3)'; }}
                        onBlur={(e) => { e.target.style.borderColor = 'rgba(159,213,178,0.12)'; }}
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-white/50 mb-2">
                        What happened? <span className="text-white/25">(optional)</span>
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe what you were doing when the error occurred..."
                        maxLength={2000}
                        rows={3}
                        className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 font-medium outline-none resize-none transition-all duration-150"
                        style={{
                          background: 'rgba(7,25,42,0.6)',
                          border: '1px solid rgba(159,213,178,0.12)',
                        }}
                        onFocus={(e) => { e.target.style.borderColor = 'rgba(159,213,178,0.3)'; }}
                        onBlur={(e) => { e.target.style.borderColor = 'rgba(159,213,178,0.12)'; }}
                      />
                    </div>

                    {/* Error Data Preview Toggle */}
                    <div>
                      <button
                        type="button"
                        onClick={() => setShowPreview((v) => !v)}
                        className="w-full flex items-center justify-between py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer"
                        style={{
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(255,255,255,0.06)',
                          color: 'rgba(255,255,255,0.5)',
                        }}
                      >
                        <span className="flex items-center gap-2">
                          <Terminal className="w-3.5 h-3.5" />
                          Error Data Preview
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                            style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
                          >
                            {errorData
                              ? errorData.consoleErrors.length +
                                errorData.networkErrors.length +
                                errorData.unhandledErrors.length
                              : 0}{' '}
                            errors
                          </span>
                        </span>
                        {showPreview ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>

                      <AnimatePresence>
                        {showPreview && errorData && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-3 space-y-3">

                              {/* Console Errors */}
                              {errorData.consoleErrors.length > 0 && (
                                <div className="rounded-xl p-3" style={{ background: 'rgba(7,25,42,0.5)', border: '1px solid rgba(255,255,255,0.04)' }}>
                                  <div className="flex items-center gap-2 mb-2">
                                    <Terminal className="w-3.5 h-3.5 text-red-400" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                                      Console ({errorData.consoleErrors.length})
                                    </span>
                                  </div>
                                  <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                                    {errorData.consoleErrors.slice(-10).map((e, i) => (
                                      <div key={i} className="flex items-start gap-2 text-[11px] font-mono py-1">
                                        <span
                                          className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase"
                                          style={{
                                            background: e.type === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(234,179,8,0.15)',
                                            color: e.type === 'error' ? '#f87171' : '#facc15',
                                          }}
                                        >
                                          {e.type}
                                        </span>
                                        <span className="text-white/60 break-all leading-relaxed">
                                          {e.message?.substring(0, 150)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Network Errors */}
                              {errorData.networkErrors.length > 0 && (
                                <div className="rounded-xl p-3" style={{ background: 'rgba(7,25,42,0.5)', border: '1px solid rgba(255,255,255,0.04)' }}>
                                  <div className="flex items-center gap-2 mb-2">
                                    <Wifi className="w-3.5 h-3.5 text-orange-400" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                                      Network ({errorData.networkErrors.length})
                                    </span>
                                  </div>
                                  <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                                    {errorData.networkErrors.slice(-8).map((e, i) => (
                                      <div key={i} className="flex items-start gap-2 text-[11px] font-mono py-1">
                                        <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold bg-white/[0.06] text-white/50">
                                          {e.method}
                                        </span>
                                        <span className="text-white/60 break-all flex-1">
                                          {e.url?.substring(0, 120)}
                                        </span>
                                        <span
                                          className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold"
                                          style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}
                                        >
                                          {e.status}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Unhandled Errors */}
                              {errorData.unhandledErrors.length > 0 && (
                                <div className="rounded-xl p-3" style={{ background: 'rgba(7,25,42,0.5)', border: '1px solid rgba(255,255,255,0.04)' }}>
                                  <div className="flex items-center gap-2 mb-2">
                                    <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                                      Unhandled ({errorData.unhandledErrors.length})
                                    </span>
                                  </div>
                                  <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                                    {errorData.unhandledErrors.slice(-8).map((e, i) => (
                                      <div key={i} className="text-[11px] font-mono text-white/60 py-1 break-all">
                                        [{e.type}] {e.message?.substring(0, 150)}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Browser Info */}
                              <div className="rounded-xl p-3" style={{ background: 'rgba(7,25,42,0.5)', border: '1px solid rgba(255,255,255,0.04)' }}>
                                <div className="flex items-center gap-2 mb-2">
                                  <Monitor className="w-3.5 h-3.5 text-blue-400" />
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                                    Browser Info
                                  </span>
                                </div>
                                <p className="text-[11px] font-mono text-white/50">
                                  {(() => {
                                    const info = getBrowserInfo();
                                    return `${info.browser} | ${info.os} | ${info.screenSize}`;
                                  })()}
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Error / Submit Row */}
                    {submitError && (
                      <div
                        className="flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-medium"
                        style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}
                      >
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <p>{submitError}</p>
                      </div>
                    )}

                    {/* Page URL indicator */}
                    <div className="flex items-center gap-2 text-[11px] text-white/25 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/60" />
                      {window.location.href.substring(0, 80)}
                    </div>

                    {/* Submit Button */}
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={submitting || !title.trim()}
                      className="w-full relative group overflow-hidden rounded-xl py-3.5 text-xs font-extrabold uppercase tracking-wider transition-all duration-150 active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                      style={{
                        background: '#f6ed4a',
                        color: '#07192a',
                      }}
                    >
                      <span className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 bg-gradient-to-r from-transparent via-white/25 to-transparent" />
                      <span className="relative flex items-center justify-center gap-2">
                        {submitting ? (
                          <>
                            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Submitting Report…
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            Submit Troubleshoot Report
                          </>
                        )}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
