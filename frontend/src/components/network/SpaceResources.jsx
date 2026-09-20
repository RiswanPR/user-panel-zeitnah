import { useState } from 'react';
import { FileText, Link as LinkIcon, BookOpen, Plus, ExternalLink } from 'lucide-react';
import ResourceModal from './ResourceModal';

export default function SpaceResources({ resources = [], canPost, onPost, isPosting, isLoading }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCreate = async (data) => {
    await onPost(data);
    setIsModalOpen(false);
  };

  const getResourceIcon = (type) => {
    switch (type) {
      case 'document':
        return <FileText className="w-5 h-5 text-amber-400" />;
      case 'course':
        return <BookOpen className="w-5 h-5 text-cyan-400" />;
      default:
        return <LinkIcon className="w-5 h-5 text-brand-mint" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading font-bold text-lg text-white">Curated Resources</h2>
          <p className="text-xs text-text-muted mt-0.5">Syllabi, reference guides, lecture materials, and external links.</p>
        </div>

        {canPost && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-mint/15 hover:bg-brand-mint text-brand-mint hover:text-black font-semibold text-xs transition-all duration-200 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Resource</span>
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-white/[0.02] border border-white/[0.04] animate-pulse" />
          ))}
        </div>
      ) : resources.length === 0 ? (
        <div className="rounded-2xl bg-[#111115]/60 border border-white/[0.06] p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-3 text-text-faint">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="font-heading font-bold text-base text-white">No resources shared yet</h3>
          <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
            Faculty and cohort members can share helpful documentation, guides, and links here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {resources.map((res) => (
            <div
              key={res._id}
              className="p-5 rounded-2xl bg-[#111115]/80 border border-white/[0.06] hover:border-brand-mint/30 transition-all flex flex-col justify-between"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center shrink-0">
                  {getResourceIcon(res.type)}
                </div>

                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold text-white line-clamp-1">{res.title}</h4>
                  {res.description && (
                    <p className="text-xs text-text-muted mt-1 line-clamp-2 leading-relaxed">
                      {res.description}
                    </p>
                  )}
                  <p className="text-[10px] text-text-faint mt-2">
                    Shared by {res.createdBy?.name || 'Member'}
                  </p>
                </div>
              </div>

              {res.url && (
                <div className="mt-4 pt-3 border-t border-white/[0.04] flex items-center justify-end">
                  <a
                    href={res.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-semibold text-brand-mint hover:underline"
                  >
                    <span>Access Resource</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ResourceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreate}
        isSubmitting={isPosting}
      />
    </div>
  );
}
