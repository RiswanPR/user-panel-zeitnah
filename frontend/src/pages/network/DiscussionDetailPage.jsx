import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, MessageSquare, Send, Clock, Lock } from 'lucide-react';
import { networkApi } from '../../services/networkApi';

export default function DiscussionDetailPage() {
  const { slug, slugOrId, discussionId } = useParams();
  const spaceParam = slugOrId || slug;
  const queryClient = useQueryClient();
  const [replyText, setReplyText] = useState('');

  // Fetch discussion
  const discussionQuery = useQuery({
    queryKey: ['discussion-detail', discussionId],
    queryFn: () => networkApi.getDiscussion(discussionId),
  });

  // Fetch replies
  const repliesQuery = useQuery({
    queryKey: ['discussion-replies', discussionId],
    queryFn: () => networkApi.getReplies(discussionId),
  });

  // Post reply mutation
  const replyMutation = useMutation({
    mutationFn: (body) => networkApi.createReply(discussionId, { body }),
    onSuccess: () => {
      setReplyText('');
      queryClient.invalidateQueries({ queryKey: ['discussion-replies', discussionId] });
      queryClient.invalidateQueries({ queryKey: ['discussion-detail', discussionId] });
    },
  });

  const handleSendReply = (e) => {
    e.preventDefault();
    if (!replyText.trim() || replyMutation.isPending) return;
    replyMutation.mutate(replyText.trim());
  };

  if (discussionQuery.isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-6">
        <div className="h-44 rounded-3xl bg-white/[0.02] border border-white/[0.04] animate-pulse" />
        <div className="h-64 rounded-3xl bg-white/[0.02] border border-white/[0.04] animate-pulse" />
      </div>
    );
  }

  if (discussionQuery.isError || !discussionQuery.data) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 rounded-3xl bg-[#111115] border border-white/[0.08] text-center">
        <h2 className="font-heading font-bold text-lg text-white">Discussion Not Found</h2>
        <p className="text-xs text-text-muted mt-2">This discussion thread may have been removed or locked.</p>
        <Link
          to={spaceParam ? `/network/spaces/${spaceParam}` : '/network'}
          className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-xl bg-brand-mint text-black font-semibold text-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Space</span>
        </Link>
      </div>
    );
  }

  const discussion = discussionQuery.data;
  const replies = repliesQuery.data?.replies || [];
  const author = discussion.authorId || {};
  const isLocked = discussion.status === 'locked';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Back button */}
      <Link
        to={spaceParam ? `/network/spaces/${spaceParam}?tab=discussions` : '/network'}
        className="inline-flex items-center gap-2 text-xs font-semibold text-text-muted hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Discussions</span>
      </Link>

      {/* Main Discussion Thread Post */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#111115]/90 border border-white/[0.08] shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-mint/15 text-brand-mint font-bold text-sm flex items-center justify-center overflow-hidden shrink-0">
              {author.avatar || author.profileImage ? (
                <img src={author.avatar || author.profileImage} alt={author.name} className="w-full h-full object-cover" />
              ) : (
                <span>{(author.name || 'U')[0]}</span>
              )}
            </div>

            <div>
              <h4 className="text-sm font-bold text-white">{author.name || author.email}</h4>
              <p className="text-[11px] text-text-muted flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3 text-text-faint" />
                <span>{new Date(discussion.createdAt).toLocaleString()}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg text-xs font-semibold uppercase bg-brand-mint/15 text-brand-mint border border-brand-mint/30">
              {discussion.type || 'discussion'}
            </span>
            {isLocked && (
              <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-500/15 text-red-300 border border-red-500/30 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                <span>Locked</span>
              </span>
            )}
          </div>
        </div>

        <h1 className="font-heading font-extrabold text-xl sm:text-2xl text-white mt-5">
          {discussion.title}
        </h1>

        <div className="mt-4 text-sm text-text-secondary leading-relaxed whitespace-pre-line">
          {discussion.body}
        </div>
      </div>

      {/* Replies Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading font-bold text-base text-white flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-brand-mint" />
            <span>Replies ({replies.length})</span>
          </h2>
        </div>

        {repliesQuery.isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 rounded-2xl bg-white/[0.02] border border-white/[0.04] animate-pulse" />
            ))}
          </div>
        ) : replies.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[#111115]/60 border border-white/[0.06] text-center">
            <p className="text-xs text-text-muted">No replies yet. Be the first to join the conversation.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {replies.map((reply) => {
              const replyAuthor = reply.authorId || {};
              return (
                <div
                  key={reply._id}
                  className="p-5 rounded-2xl bg-[#111115]/80 border border-white/[0.06] flex items-start gap-3.5"
                >
                  <div className="w-8 h-8 rounded-xl bg-white/[0.03] border border-white/[0.06] text-brand-mint font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden mt-0.5">
                    {replyAuthor.avatar || replyAuthor.profileImage ? (
                      <img src={replyAuthor.avatar || replyAuthor.profileImage} alt={replyAuthor.name} className="w-full h-full object-cover" />
                    ) : (
                      <span>{(replyAuthor.name || 'U')[0]}</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-white">{replyAuthor.name || replyAuthor.email}</h4>
                      <span className="text-[10px] text-text-muted">
                        {new Date(reply.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(reply.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="mt-2 text-xs sm:text-sm text-text-secondary leading-relaxed whitespace-pre-line">
                      {reply.body}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Reply Composer */}
        {!isLocked && (
          <form onSubmit={handleSendReply} className="mt-6 p-4 rounded-2xl bg-[#111115] border border-white/[0.08] shadow-xl space-y-3">
            <textarea
              rows={3}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write a constructive, academic reply..."
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] focus:border-brand-mint/40 text-xs sm:text-sm text-white placeholder-text-muted focus:outline-none transition-colors resize-none"
            />

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-text-faint">
                Respect cohort conduct guidelines in all replies.
              </span>

              <button
                type="submit"
                disabled={replyMutation.isPending || !replyText.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-mint hover:bg-brand-mint/90 disabled:opacity-50 text-black font-semibold text-xs shadow-md shadow-brand-mint/20 transition-all cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{replyMutation.isPending ? 'Sending...' : 'Post Reply'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
