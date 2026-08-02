import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cookie, ShieldCheck, Check, Settings, X, ChevronRight, Lock } from "lucide-react";

const CONSENT_KEY = "zeitnah_cookie_consent";

export default function CookieConsentBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [preferences, setPreferences] = useState({
    essential: true, // Always true
    functional: true,
    analytics: true,
  });

  useEffect(() => {
    const savedConsent = localStorage.getItem(CONSENT_KEY);
    if (!savedConsent) {
      // Delay showing slightly for a smooth load transition
      const timer = setTimeout(() => setIsVisible(true), 1200);
      return () => clearTimeout(timer);
    } else {
      try {
        const parsed = JSON.parse(savedConsent);
        if (parsed?.preferences) {
          setPreferences((prev) => ({ ...prev, ...parsed.preferences }));
        }
      } catch (e) {
        setIsVisible(true);
      }
    }
  }, []);

  const saveConsent = (updatedPreferences) => {
    const consentPayload = {
      accepted: true,
      timestamp: new Date().toISOString(),
      preferences: updatedPreferences,
    };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(consentPayload));
    setPreferences(updatedPreferences);
    setIsVisible(false);
    setShowPreferencesModal(false);
  };

  const handleAcceptAll = () => {
    saveConsent({ essential: true, functional: true, analytics: true });
  };

  const handleRejectNonEssential = () => {
    saveConsent({ essential: true, functional: false, analytics: false });
  };

  const handleSavePreferences = () => {
    saveConsent(preferences);
  };

  if (!isVisible && !showPreferencesModal) return null;

  return (
    <>
      {/* ── Banner Bar ── */}
      <AnimatePresence>
        {isVisible && !showPreferencesModal && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-4 left-4 right-4 md:left-6 md:right-auto md:max-w-xl z-50 pointer-events-auto"
          >
            <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-[#0a131e]/90 backdrop-blur-xl p-5 shadow-2xl shadow-black/80">
              {/* Gradient border accent */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-brand-mint via-brand-yellow to-brand-mint" />

              <div className="flex flex-col sm:flex-row items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-mint/10 border border-brand-mint/20 text-brand-mint shadow-inner">
                  <Cookie className="w-5 h-5" />
                </div>

                <div className="flex-1 space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-heading font-bold text-white tracking-wide">
                      We value your privacy
                    </h3>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-brand-mint bg-brand-mint/10 border border-brand-mint/20 px-2 py-0.5 rounded-full">
                      <ShieldCheck className="w-3 h-3" /> GDPR Compliant
                    </span>
                  </div>
                  <p className="text-xs text-text-muted leading-relaxed">
                    We use cookies to secure authentication, store your learning preferences, and analyze platform performance.
                  </p>

                  <div className="pt-2 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAcceptAll}
                      className="px-4 py-2 rounded-xl bg-brand-mint text-bg-dark font-bold text-xs shadow-md shadow-brand-mint/20 hover:bg-brand-mint/90 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                    >
                      Accept All
                    </button>
                    <button
                      type="button"
                      onClick={handleRejectNonEssential}
                      className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-semibold text-xs transition-all cursor-pointer"
                    >
                      Essential Only
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPreferencesModal(true)}
                      className="px-3.5 py-2 rounded-xl text-text-muted hover:text-white font-semibold text-xs flex items-center gap-1 transition-all cursor-pointer ml-auto"
                    >
                      <Settings className="w-3.5 h-3.5" /> Customize
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Customization Modal ── */}
      <AnimatePresence>
        {showPreferencesModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/15 bg-[#0c1825] p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-brand-mint/10 border border-brand-mint/20 flex items-center justify-center text-brand-mint">
                    <Cookie className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-heading font-bold text-white">
                      Cookie Preferences
                    </h3>
                    <p className="text-xs text-text-muted">Manage your privacy settings</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPreferencesModal(false)}
                  className="h-8 w-8 rounded-lg bg-white/5 hover:bg-white/15 text-white/70 hover:text-white flex items-center justify-center transition-all border border-white/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {/* Essential Cookies */}
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Lock className="w-3.5 h-3.5 text-brand-mint" />
                      <h4 className="text-sm font-bold text-white">Strictly Necessary Cookies</h4>
                      <span className="text-[10px] uppercase font-bold text-brand-mint bg-brand-mint/10 border border-brand-mint/20 px-2 py-0.5 rounded-md">
                        Always Active
                      </span>
                    </div>
                    <p className="text-xs text-text-muted leading-relaxed">
                      Required for secure user login sessions, stream device authorization, and data encryption. Cannot be disabled.
                    </p>
                  </div>
                </div>

                {/* Functional Cookies */}
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-white mb-1">Functional Preferences</h4>
                    <p className="text-xs text-text-muted leading-relaxed">
                      Saves your UI preferences, volume settings, player rate, and video watermark position.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                    <input
                      type="checkbox"
                      checked={preferences.functional}
                      onChange={(e) =>
                        setPreferences((prev) => ({ ...prev, functional: e.target.checked }))
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-mint" />
                  </label>
                </div>

                {/* Analytics Cookies */}
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-white mb-1">Performance & Diagnostics</h4>
                    <p className="text-xs text-text-muted leading-relaxed">
                      Helps us analyze video playback health, detect streaming errors, and improve platform speed.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                    <input
                      type="checkbox"
                      checked={preferences.analytics}
                      onChange={(e) =>
                        setPreferences((prev) => ({ ...prev, analytics: e.target.checked }))
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-mint" />
                  </label>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleRejectNonEssential}
                  className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-semibold text-xs transition-all"
                >
                  Reject Optional
                </button>
                <button
                  type="button"
                  onClick={handleSavePreferences}
                  className="px-5 py-2 rounded-xl bg-brand-mint text-bg-dark font-bold text-xs shadow-md shadow-brand-mint/20 hover:bg-brand-mint/90 transition-all flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> Save Preferences
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
