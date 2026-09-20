import { useState } from 'react';
import { X, MessageSquare } from 'lucide-react';

const CATEGORIES = [
  { value: 'discussion', label: 'General Discussion' },
  { value: 'question', label: 'Academic Question' },
  { value: 'project', label: 'Project Collaboration' },
  { value: 'study_help', label: 'Study Help' },
  { value: 'resource', label: 'Learning Resource' },
];

export default function DiscussionModal({ isOpen, onClose, onSubmit, isSubmitting }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState('discussion');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    onSubmit({ title: title.trim(), body: body.trim(), type });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-xl rounded-2xl bg-[#111115] border border-white/[0.08] shadow-2xl p-6 overflow-hidden">
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-brand-mint/15 text-brand-mint flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
            <h3 className="font-heading font-bold text-lg text-white">Start a Discussion</h3>
          </div>
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
              Discussion Topic / Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. How to structure NestJS modules for scalability?"
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] focus:border-brand-mint/40 text-white text-sm focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
              Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setType(cat.value)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-left cursor-pointer ${
                    type === cat.value
                      ? 'bg-brand-mint/15 border-brand-mint text-brand-mint shadow-sm'
                      : 'bg-white/[0.02] border-white/[0.06] text-text-muted hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
              Details & Context
            </label>
            <textarea
              required
              rows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Describe your question, observation, or topic in detail..."
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
              disabled={isSubmitting || !title.trim() || !body.trim()}
              className="px-5 py-2.5 rounded-xl bg-brand-mint hover:bg-brand-mint/90 disabled:opacity-50 text-black font-heading font-bold text-xs uppercase tracking-wider shadow-lg shadow-brand-mint/20 transition-all cursor-pointer"
            >
              {isSubmitting ? 'Posting...' : 'Start Discussion'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
