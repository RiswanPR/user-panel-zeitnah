import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, ZoomIn, ZoomOut } from 'lucide-react';

export default function ImageViewerModal({ imageUrl, fileName, onClose }) {
  const [zoom, setZoom] = useState(1);

  if (!imageUrl) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
        {/* Controls Header */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
          <span className="text-xs font-semibold text-slate-300 truncate max-w-md">
            {fileName || 'Image View'}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setZoom((prev) => Math.min(prev + 0.25, 2.5))}
              className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoom((prev) => Math.max(prev - 0.25, 0.75))}
              className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <a
              href={imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              download={fileName || 'image'}
              className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80"
              title="Download Image"
            >
              <Download className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/30"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Image Content */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="max-w-4xl max-h-[85vh] overflow-auto flex items-center justify-center p-2"
        >
          <img
            src={imageUrl}
            alt={fileName || 'Enlarged Image'}
            style={{ transform: `scale(${zoom})`, transition: 'transform 0.2s ease-out' }}
            className="max-h-[80vh] w-auto object-contain rounded-xl shadow-2xl"
          />
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
