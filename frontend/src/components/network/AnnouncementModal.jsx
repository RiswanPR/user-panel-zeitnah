import { useState } from 'react';
import { X, Pin } from 'lucide-react';

export default function AnnouncementModal({ isOpen, onClose, onSubmit, isSubmitting }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [pinned, setPinned] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    onSubmit({ title: title.trim(), content: content.trim(), pinned });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg rounded-2xl bg-[#111115] border border-white/[0.08] shadow-2xl p-6 overflow-hidden">
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
          <h3 className="font-heading font-bold text-lg text-white">Post Space Announcement</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-text-muted hover:text-white hover:bg-white/[0.05] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
              Announcement Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Schedule update for Batch 2026"
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] focus:border-brand-mint/40 text-white text-sm focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
              Content / Details
            </label>
            <textarea
              required
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Provide all details for students..."
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] focus:border-brand-mint/40 text-white text-sm focus:outline-none transition-colors resize-none"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-text-secondary select-none">
              <input
                type="checkbox"
                checked={pinned}
                onChange={(e) => setPinned(e.target.checked)}
                className="rounded border-white/20 bg-white/5 text-brand-mint focus:ring-brand-mint/30"
              />
              <Pin className="w-3.5 h-3.5 text-brand-yellow" />
              <span>Pin this announcement at the top of the space</span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-text-muted hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim() || !content.trim()}
              className="px-5 py-2.5 rounded-xl bg-brand-mint hover:bg-brand-mint/90 disabled:opacity-50 text-black font-heading font-bold text-xs uppercase tracking-wider shadow-lg shadow-brand-mint/20 transition-all cursor-pointer"
            >
              {isSubmitting ? 'Publishing...' : 'Publish Announcement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
