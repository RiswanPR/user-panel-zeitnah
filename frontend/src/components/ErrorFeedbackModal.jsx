import React, { useState } from "react";
import html2canvas from "html2canvas";
import api from "../services/api";

export default function ErrorFeedbackModal({ errorData, onClose, onRetry }) {
  const [showFeedback, setShowFeedback] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    whatHappened: "",
    whatTryingToDo: "",
    reproducible: "yes",
  });
  const [includeScreenshot, setIncludeScreenshot] = useState(true);

  const handleSendReport = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let screenshotDataUrl = "";
      
      // Capture screenshot if requested
      if (includeScreenshot) {
        // Temporarily hide the modal for a clean screenshot
        const modalEl = document.getElementById("error-feedback-modal-overlay");
        if (modalEl) modalEl.style.opacity = "0";
        
        const canvas = await html2canvas(document.body, {
          logging: false,
          useCORS: true,
          ignoreElements: (el) => el.id === "error-feedback-modal-overlay",
        });
        screenshotDataUrl = canvas.toDataURL("image/jpeg", 0.5); // compress
        
        if (modalEl) modalEl.style.opacity = "1";
      }

      // Merge user feedback with existing errorData (diagnostics)
      const finalPayload = {
        ...errorData,
        feedback: formData,
        screenshotBase64: screenshotDataUrl,
        source: "user_feedback_modal"
      };

      await api.post("/error-reports", finalPayload);
      setSuccess(true);
    } catch (err) {
      console.error("Failed to send diagnostic report", err);
      alert("Failed to send report. However, basic diagnostics may have been saved automatically.");
    } finally {
      setLoading(false);
    }
  };

  const handleReload = () => {
    window.location.reload();
  };

  const handleHome = () => {
    window.location.href = "/";
  };

  if (success) {
    return (
      <div id="error-feedback-modal-overlay" className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 transition-opacity duration-300">
        <div className="bg-[#0A1A2F] border border-[#9fd5b2]/30 rounded-2xl max-w-md w-full p-8 text-center shadow-2xl">
          <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Report Sent</h2>
          <p className="text-white/60 mb-8">Thank you for helping us improve Zeitnah Academy. Our engineering team has been notified.</p>
          <div className="flex gap-3 justify-center">
            <button onClick={handleReload} className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-colors">Reload Page</button>
            <button onClick={handleHome} className="px-6 py-2.5 bg-[#9fd5b2] hover:bg-[#86c49a] text-[#0A1A2F] rounded-lg font-bold transition-colors">Go Home</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="error-feedback-modal-overlay" className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 transition-opacity duration-300">
      <div className="bg-[#0A1A2F] border border-red-500/20 rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        {!showFeedback ? (
          <>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-red-500/20 text-red-400 rounded-xl flex items-center justify-center shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">We encountered an unexpected issue.</h2>
              </div>
            </div>
            <p className="text-white/70 mb-6 text-sm">
              You can help us resolve it quickly by sending an automatic diagnostic report. No passwords or OTPs are included.
            </p>
            <div className="flex flex-col gap-3">
              <button onClick={() => setShowFeedback(true)} className="w-full py-3 bg-[#f6ed4a] hover:bg-[#e5dc42] text-[#0A1A2F] rounded-xl font-bold transition-colors flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Send Diagnostic Report
              </button>
              <div className="grid grid-cols-2 gap-3">
                {onRetry && (
                  <button onClick={onRetry} className="py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-medium transition-colors">
                    Retry Action
                  </button>
                )}
                <button onClick={handleReload} className="py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-medium transition-colors">
                  Reload Page
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={handleHome} className="py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-medium transition-colors">
                  Go Home
                </button>
                {onClose && (
                  <button onClick={onClose} className="py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/50 hover:text-white rounded-xl font-medium transition-colors">
                    Continue Anyway
                  </button>
                )}
              </div>
            </div>
          </>
        ) : (
          <form onSubmit={handleSendReport} className="flex flex-col gap-4 text-left">
            <h2 className="text-xl font-bold text-white mb-2">Diagnostic Report</h2>
            <div>
              <label className="block text-xs font-semibold text-white/70 uppercase tracking-wide mb-1.5">What happened?</label>
              <textarea 
                required
                rows={2}
                value={formData.whatHappened}
                onChange={e => setFormData({...formData, whatHappened: e.target.value})}
                className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white placeholder-white/30 focus:border-[#9fd5b2] outline-none transition-colors resize-none text-sm"
                placeholder="e.g., I clicked the play button and the screen went black."
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/70 uppercase tracking-wide mb-1.5">What were you trying to do?</label>
              <textarea 
                required
                rows={2}
                value={formData.whatTryingToDo}
                onChange={e => setFormData({...formData, whatTryingToDo: e.target.value})}
                className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white placeholder-white/30 focus:border-[#9fd5b2] outline-none transition-colors resize-none text-sm"
                placeholder="e.g., I was trying to watch chapter 3 of the advanced course."
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/70 uppercase tracking-wide mb-1.5">Can you reproduce it?</label>
              <select 
                value={formData.reproducible}
                onChange={e => setFormData({...formData, reproducible: e.target.value})}
                className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-[#9fd5b2] outline-none transition-colors text-sm"
              >
                <option value="yes">Yes, it happens every time</option>
                <option value="sometimes">Sometimes</option>
                <option value="no">No, just happened once</option>
                <option value="unsure">I'm not sure</option>
              </select>
            </div>
            <label className="flex items-center gap-3 cursor-pointer mt-2 group">
              <div className="relative flex items-center justify-center w-5 h-5 rounded border border-white/30 group-hover:border-[#9fd5b2] transition-colors">
                <input 
                  type="checkbox" 
                  checked={includeScreenshot}
                  onChange={(e) => setIncludeScreenshot(e.target.checked)}
                  className="peer absolute inset-0 opacity-0 cursor-pointer"
                />
                <svg className="w-3.5 h-3.5 text-[#9fd5b2] opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
              </div>
              <span className="text-sm text-white/80">Include a screenshot of the current page</span>
            </label>

            <div className="flex gap-3 mt-4 pt-4 border-t border-white/10">
              <button 
                type="button"
                onClick={() => setShowFeedback(false)}
                className="flex-1 py-3 rounded-xl font-medium text-white/70 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
              >
                Back
              </button>
              <button 
                type="submit"
                disabled={loading}
                className="flex-1 py-3 rounded-xl font-bold text-[#0A1A2F] bg-[#9fd5b2] hover:bg-[#86c49a] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    Sending...
                  </>
                ) : "Submit Report"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
