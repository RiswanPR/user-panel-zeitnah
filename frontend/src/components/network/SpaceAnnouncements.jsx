import { useState } from 'react';
import { Pin, Megaphone, Plus } from 'lucide-react';
import AnnouncementModal from './AnnouncementModal';

export default function SpaceAnnouncements({ announcements = [], canPost, onPost, isPosting, isLoading }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCreate = async (data) => {
    await onPost(data);
    setIsModalOpen(false);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Action header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading font-bold text-lg text-white">Space Announcements</h2>
          <p className="text-xs text-text-muted mt-0.5">Official updates and notices from faculty and mentors.</p>
        </div>

        {canPost && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-mint/15 hover:bg-brand-mint text-brand-mint hover:text-black font-semibold text-xs transition-all duration-200 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Post Announcement</span>
          </button>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-white/[0.02] border border-white/[0.04] animate-pulse" />
          ))}
        </div>
      ) : announcements.length === 0 ? (
        <div className="rounded-2xl bg-[#111115]/60 border border-white/[0.06] p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-3 text-text-faint">
            <Megaphone className="w-6 h-6" />
          </div>
          <h3 className="font-heading font-bold text-base text-white">No announcements yet</h3>
          <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
            Official cohort announcements from teachers and moderators will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((ann) => (
            <div
              key={ann._id}
              className={`p-6 rounded-2xl border transition-all ${
                ann.pinned
                  ? 'bg-gradient-to-r from-brand-mint/[0.04] to-transparent border-brand-mint/30 shadow-lg shadow-brand-mint/5'
                  : 'bg-[#111115]/80 border-white/[0.06]'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-brand-mint font-bold text-xs overflow-hidden">
                    {ann.authorId?.avatar || ann.authorId?.profileImage ? (
                      <img src={ann.authorId.avatar || ann.authorId.profileImage} alt={ann.authorId.name} className="w-full h-full object-cover" />
                    ) : (
                      <span>{(ann.authorId?.name || 'F')[0]}</span>
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>{ann.title}</span>
                      {ann.pinned && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-yellow/15 text-brand-yellow border border-brand-yellow/30">
                          <Pin className="w-2.5 h-2.5" />
                          <span>Pinned</span>
                        </span>
                      )}
                    </h4>
                    <p className="text-[11px] text-text-muted mt-0.5">
                      By {ann.authorId?.name || 'Faculty'} • {formatDate(ann.createdAt)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 text-xs sm:text-sm text-text-secondary leading-relaxed whitespace-pre-line">
                {ann.content}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Creation Modal */}
      <AnnouncementModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreate}
        isSubmitting={isPosting}
      />
    </div>
  );
}
