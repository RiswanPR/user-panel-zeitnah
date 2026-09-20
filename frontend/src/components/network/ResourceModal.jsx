import { useState } from 'react';
import { X, FileText, Link as LinkIcon, BookOpen } from 'lucide-react';

export default function ResourceModal({ isOpen, onClose, onSubmit, isSubmitting }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('link');
  const [url, setUrl] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({ title: title.trim(), description: description.trim(), type, url: url.trim() });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg rounded-2xl bg-[#111115] border border-white/[0.08] shadow-2xl p-6 overflow-hidden">
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
          <h3 className="font-heading font-bold text-lg text-white">Share Learning Resource</h3>
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
              Resource Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Official Documentation / Cheat Sheet"
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] focus:border-brand-mint/40 text-white text-sm focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
              Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'link', label: 'Web Link', icon: LinkIcon },
                { value: 'document', label: 'Document', icon: FileText },
                { value: 'course', label: 'Course', icon: BookOpen },
              ].map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setType(t.value)}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      type === t.value
                        ? 'bg-brand-mint/15 border-brand-mint text-brand-mint'
                        : 'bg-white/[0.02] border-white/[0.06] text-text-muted hover:text-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
              URL / Link
            </label>
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] focus:border-brand-mint/40 text-white text-sm focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
              Description (Optional)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of what this resource covers..."
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] focus:border-brand-mint/40 text-white text-sm focus:outline-none transition-colors resize-none"
            />
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
              disabled={isSubmitting || !title.trim() || !url.trim()}
              className="px-5 py-2.5 rounded-xl bg-brand-mint hover:bg-brand-mint/90 disabled:opacity-50 text-black font-heading font-bold text-xs uppercase tracking-wider shadow-lg shadow-brand-mint/20 transition-all cursor-pointer"
            >
              {isSubmitting ? 'Adding...' : 'Add Resource'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
