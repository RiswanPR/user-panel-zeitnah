import React from 'react';
import { X, ExternalLink, Download, FileText } from 'lucide-react';

export default function PdfViewerModal({ pdfUrl, fileName, onClose }) {
  if (!pdfUrl) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-4xl h-[85vh] bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2 text-white">
            <FileText className="w-5 h-5 text-indigo-400" />
            <span className="text-sm font-bold truncate max-w-md">
              {fileName || 'PDF Document Viewer'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs flex items-center gap-1.5"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Open in New Tab</span>
            </a>
            <a
              href={pdfUrl}
              download={fileName || 'document.pdf'}
              className="p-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 text-xs flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </a>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* PDF Embedded Frame */}
        <div className="flex-1 bg-slate-950">
          <iframe
            src={`${pdfUrl}#toolbar=1`}
            title={fileName || 'PDF Preview'}
            className="w-full h-full border-none"
          />
        </div>
      </div>
    </div>
  );
}
