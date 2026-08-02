import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, FileText, CheckCircle2, Trash2 } from 'lucide-react';
import { profileApi } from '../../../services/profileApi';
import toast from 'react-hot-toast';

export default function UploadResumeModal({
  resumeUrl,
  isOpen,
  onClose,
  onResumeUpdated,
}) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  if (!isOpen) return null;

  const handleFileSelect = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (selected.type !== 'application/pdf') {
      toast.error('Only PDF documents are allowed for resume');
      return;
    }

    if (selected.size > 10 * 1024 * 1024) {
      toast.error('Resume PDF file size must be less than 10MB');
      return;
    }

    setFile(selected);
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a PDF file');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      const res = await profileApi.uploadResume(formData);
      toast.success('Resume uploaded successfully!');
      if (onResumeUpdated) onResumeUpdated(res.resumeUrl);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload resume');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setUploading(true);
      await profileApi.deleteResume();
      toast.success('Resume removed');
      if (onResumeUpdated) onResumeUpdated('');
      onClose();
    } catch (err) {
      toast.error('Failed to remove resume');
    } finally {
      setUploading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-center"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-400" />
              <span>Resume PDF Upload</span>
            </h2>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Current Resume View if exists */}
          {resumeUrl && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-indigo-400" />
                <div className="text-left">
                  <div className="text-xs font-bold text-white">
                    Resume Document.pdf
                  </div>
                  <a
                    href={resumeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-indigo-400 hover:underline font-medium"
                  >
                    View Current Resume
                  </a>
                </div>
              </div>

              <button
                onClick={handleDelete}
                disabled={uploading}
                className="p-2 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-900 transition-colors"
                title="Remove Resume"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Upload Drop Zone */}
          <label className="border-2 border-dashed border-slate-700 hover:border-purple-500 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-950/40">
            <Upload className="w-10 h-10 text-purple-400 mb-2 animate-bounce" />
            <span className="text-xs font-semibold text-white">
              {file ? file.name : 'Click to select PDF resume'}
            </span>
            <span className="text-[11px] text-slate-500 mt-1">
              Supported format: PDF (Max 10MB)
            </span>
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handleFileSelect}
            />
          </label>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg transition-all"
            >
              {uploading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              <span>{uploading ? 'Uploading...' : 'Save Resume'}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
