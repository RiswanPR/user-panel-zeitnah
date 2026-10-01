import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Download, X, Loader2, ExternalLink } from 'lucide-react';
import { getUploadUrl } from '../../utils/courseUi';

export default function ResourcePreviewModal({ resource, onClose }) {
  const [iframeLoading, setIframeLoading] = useState(true);

  if (!resource) return null;

  const fileUrl = getUploadUrl(resource.file);
  const title = resource.title || 'Resource Document';
  const type = (resource.type || 'DOCUMENT').toLowerCase();

  const isPdf =
    type === 'pdf' ||
    (resource.file && String(resource.file).toLowerCase().endsWith('.pdf'));

  const isImage =
    type === 'image' ||
    /\.(png|jpe?g|webp|gif|svg)/i.test(String(resource.file || ''));

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/85 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 8 }}
          transition={{ duration: 0.2 }}
          className="relative flex flex-col w-full max-w-5xl h-[88vh] rounded-2xl sm:rounded-3xl border border-white/15 bg-bg-surface shadow-2xl overflow-hidden z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-white/[0.02]">
            <div className="flex items-center gap-3 min-w-0 pr-4">
              <span className="h-9 w-9 rounded-xl bg-brand-mint/10 border border-brand-mint/20 flex items-center justify-center text-brand-mint shrink-0">
                <FileText className="w-5 h-5" />
              </span>
              <div className="min-w-0">
                <h3 className="text-white font-heading font-bold text-sm sm:text-base truncate">
                  {title}
                </h3>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-mint">
                  {type}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <a
                href={fileUrl}
                download
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-mint hover:bg-brand-mint/90 text-bg-base font-bold text-xs uppercase tracking-wider transition-all cursor-pointer focus-ring"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Download</span>
              </a>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close document preview"
                className="h-8 w-8 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.08] text-white/70 hover:text-white flex items-center justify-center transition-all cursor-pointer focus-ring"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Content Stage (Lazy Loaded) */}
          <div className="flex-1 bg-black relative flex items-center justify-center overflow-hidden">
            {isPdf ? (
              <>
                {iframeLoading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-neutral-950 text-white/60">
                    <Loader2 className="w-8 h-8 text-brand-mint animate-spin" />
                    <span className="text-xs font-medium">Loading document viewer...</span>
                  </div>
                )}
                <iframe
                  src={`${fileUrl}#toolbar=1&navpanes=0`}
                  onLoad={() => setIframeLoading(false)}
                  className="w-full h-full border-0 bg-white"
                  title={title}
                />
              </>
            ) : isImage ? (
              <div className="w-full h-full flex items-center justify-center p-4 overflow-auto">
                <img
                  src={fileUrl}
                  alt={title}
                  className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
                />
              </div>
            ) : (
              <div className="text-center p-8 space-y-4 max-w-md">
                <FileText className="w-12 h-12 text-brand-mint/40 mx-auto" />
                <p className="text-white/80 text-sm font-medium">
                  Direct inline preview is not available for this file type. Click download to view locally.
                </p>
                <a
                  href={fileUrl}
                  download
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-mint text-bg-base font-bold text-xs uppercase tracking-wider hover:bg-brand-mint/90 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Attachment</span>
                </a>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
