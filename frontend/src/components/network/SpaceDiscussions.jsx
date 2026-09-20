import { useState } from 'react';
import { MessageSquare, Plus, Search, Pin, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import DiscussionModal from './DiscussionModal';

export default function SpaceDiscussions({
  spaceIdOrSlug,
  discussions = [],
  canPost,
  onPost,
  isPosting,
  isLoading,
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const handleCreate = async (data) => {
    await onPost(data);
    setIsModalOpen(false);
  };

  const filteredDiscussions = discussions.filter((disc) => {
    if (selectedType !== 'all' && disc.type !== selectedType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        disc.title.toLowerCase().includes(q) ||
        disc.body.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getCategoryPill = (type) => {
    switch (type) {
      case 'question':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">Question</span>;
      case 'project':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-violet-500/15 text-violet-300 border border-violet-500/30">Project</span>;
      case 'study_help':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">Study Help</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">Discussion</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading font-bold text-lg text-white">Space Discussions</h2>
          <p className="text-xs text-text-muted mt-0.5">Academic conversations, questions, and peer problem-solving.</p>
        </div>

        {canPost && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-mint/15 hover:bg-brand-mint text-brand-mint hover:text-black font-semibold text-xs transition-all duration-200 cursor-pointer w-fit"
          >
            <Plus className="w-4 h-4" />
            <span>Start Discussion</span>
          </button>
        )}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search discussions by topic or keyword..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] focus:border-brand-mint/40 text-xs text-white placeholder-text-muted focus:outline-none transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {['all', 'question', 'discussion', 'project', 'study_help'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedType(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedType === cat
                  ? 'bg-white/10 text-white border border-white/20'
                  : 'bg-white/[0.02] text-text-muted hover:text-white border border-transparent'
              }`}
            >
              {cat === 'all' ? 'All' : cat.replace('_', ' ').toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Discussions List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-white/[0.02] border border-white/[0.04] animate-pulse" />
          ))}
        </div>
      ) : filteredDiscussions.length === 0 ? (
        <div className="rounded-2xl bg-[#111115]/60 border border-white/[0.06] p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-3 text-text-faint">
            <MessageSquare className="w-6 h-6" />
          </div>
          <h3 className="font-heading font-bold text-base text-white">No discussions found</h3>
          <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
            {searchQuery ? 'Try modifying your search or filter.' : 'Be the first to start an academic discussion in this space!'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDiscussions.map((disc) => (
            <Link
              key={disc._id}
              to={`/network/spaces/${spaceIdOrSlug}/discussions/${disc._id}`}
              className="group block p-5 rounded-2xl bg-[#111115]/80 hover:bg-[#141419] border border-white/[0.06] hover:border-brand-mint/30 transition-all duration-200"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-brand-mint font-bold text-xs shrink-0 overflow-hidden mt-0.5">
                    {disc.authorId?.avatar || disc.authorId?.profileImage ? (
                      <img src={disc.authorId.avatar || disc.authorId.profileImage} alt={disc.authorId.name} className="w-full h-full object-cover" />
                    ) : (
                      <span>{(disc.authorId?.name || 'U')[0]}</span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getCategoryPill(disc.type)}
                      {disc.isPinned && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-yellow/15 text-brand-yellow border border-brand-yellow/30">
                          <Pin className="w-2.5 h-2.5" />
                          <span>Pinned</span>
                        </span>
                      )}
                      <span className="text-[11px] text-text-muted">
                        by {disc.authorId?.name || 'Student'} • {new Date(disc.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-white group-hover:text-brand-mint transition-colors mt-1.5 line-clamp-1">
                      {disc.title}
                    </h3>

                    <p className="text-xs text-text-muted line-clamp-2 mt-1 leading-relaxed">
                      {disc.body}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-lg bg-white/[0.03] text-xs font-semibold text-text-muted group-hover:text-brand-mint transition-colors">
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>{disc.replyCount || 0}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <DiscussionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreate}
        isSubmitting={isPosting}
      />
    </div>
  );
}
