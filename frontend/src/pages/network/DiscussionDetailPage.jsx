import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  MessageSquare,
  Pin,
  Lock,
  Unlock,
  Trash2,
  Send,
  ShieldCheck,
  AlertCircle,
  Flag,
} from "lucide-react";
import communityService from "../../services/communityService";

function formatRelativeTime(dateStr) {
  if (!dateStr) return "recently";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "recently";
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/**
 * DiscussionDetailPage Component
 * Dedicated page for viewing a single discussion topic and its replies.
 */
export default function DiscussionDetailPage() {
  const { slug, discussionId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [replyBody, setReplyBody] = useState("");
  const [replyPage] = useState(1);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportSuccess, setReportSuccess] = useState(false);

  // 1. Discussion Details Query
  const {
    data: discussion,
    isLoading: isDiscussionLoading,
    isError: isDiscussionError,
    error: discussionError,
    refetch: refetchDiscussion,
  } = useQuery({
    queryKey: ["discussion-detail", discussionId],
    queryFn: () => communityService.getDiscussionDetail(discussionId),
    staleTime: 1000 * 30,
  });

  // 2. Replies Query
  const {
    data: repliesData,
    isLoading: isRepliesLoading,
    refetch: refetchReplies,
  } = useQuery({
    queryKey: ["discussion-replies", discussionId, replyPage],
    queryFn: () =>
      communityService.getReplies(discussionId, {
        page: replyPage,
        limit: 30,
      }),
    staleTime: 1000 * 15,
  });

  // SEO Page Title
  useEffect(() => {
    if (discussion?.title) {
      document.title = `${discussion.title} — ${discussion.communityName || "Community"} | Zeitnah LMS`;
    }
  }, [discussion?.title, discussion?.communityName]);

  // ── Mutations ──────────────────────────────────────────────

  // Post Reply Mutation
  const replyMutation = useMutation({
    mutationFn: (body) => communityService.createReply(discussionId, { body }),
    onSuccess: () => {
      setReplyBody("");
      refetchReplies();
      refetchDiscussion();
    },
  });

  // Delete Reply Mutation
  const deleteReplyMutation = useMutation({
    mutationFn: (replyId) => communityService.deleteReply(replyId),
    onSuccess: () => {
      refetchReplies();
      refetchDiscussion();
    },
  });

  // Delete Discussion Mutation
  const deleteDiscussionMutation = useMutation({
    mutationFn: () => communityService.deleteDiscussion(discussionId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["community-discussions", discussion?.communityId],
      });
      navigate(`/network/communities/${slug}`);
    },
  });

  // Toggle Lock Discussion Mutation
  const toggleLockMutation = useMutation({
    mutationFn: () => communityService.toggleLockDiscussion(discussionId),
    onSuccess: () => {
      refetchDiscussion();
    },
  });

  // Toggle Pin Discussion Mutation
  const togglePinMutation = useMutation({
    mutationFn: () => communityService.togglePinDiscussion(discussionId),
    onSuccess: () => {
      refetchDiscussion();
    },
  });

  // Report Content Mutation
  const reportMutation = useMutation({
    mutationFn: () =>
      communityService.reportContent({
        targetType: "discussion",
        targetId: discussionId,
        reason: reportReason.trim(),
      }),
    onSuccess: () => {
      setReportSuccess(true);
      setTimeout(() => {
        setShowReportModal(false);
        setReportSuccess(false);
        setReportReason("");
      }, 1500);
    },
  });

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!replyBody.trim()) return;
    await replyMutation.mutateAsync(replyBody.trim());
  };

  // ── Loading & Error States ──────────────────────────────────

  if (isDiscussionLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="h-6 w-36 rounded bg-white/[0.05] animate-pulse" />
        <div className="h-64 rounded-3xl border border-white/[0.06] bg-white/[0.02] p-8 animate-pulse" />
      </div>
    );
  }

  if (isDiscussionError || !discussion) {
    return (
      <div className="max-w-2xl mx-auto rounded-3xl border border-rose-500/20 bg-rose-500/[0.04] p-12 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-rose-400" />
        <h3 className="mt-4 text-lg font-heading font-bold text-white">
          Discussion not found or removed
        </h3>
        <p className="mt-1 text-xs sm:text-sm text-text-muted">
          {discussionError?.response?.data?.message ||
            "This discussion topic may have been deleted or is no longer accessible."}
        </p>
        <Link
          to={`/network/communities/${slug}`}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-mint px-5 py-2.5 text-xs font-bold text-bg-base hover:bg-brand-mint/90 transition-all shadow-md focus-ring"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Space</span>
        </Link>
      </div>
    );
  }

  const isLocked = discussion.status === "locked";
  const permissions = discussion.permissions || {};
  const replies = repliesData?.data || [];
  const authorInitials = discussion.author?.name
    ? discussion.author.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "ST";

    const createdRelative = formatRelativeTime(discussion.createdAt);

  return (
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
      {/* Top Breadcrumbs & Back Bar */}
      <div className="flex items-center justify-between gap-4">
        <Link
          to={`/network/communities/${slug}`}
          className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-1.5 text-xs font-semibold text-text-muted hover:text-white hover:bg-white/[0.06] hover:border-brand-mint/30 transition-all focus-ring"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>{discussion.communityName || "Community"}</span>
        </Link>

        {/* Report Action */}
        <button
          type="button"
          onClick={() => setShowReportModal(true)}
          className="inline-flex items-center gap-1.5 text-xs text-text-faint hover:text-text-muted transition-colors"
          title="Report Discussion"
        >
          <Flag className="h-3.5 w-3.5" />
          <span>Report</span>
        </button>
      </div>

      {/* Main Discussion Post */}
      <article className="rounded-3xl border border-white/[0.08] bg-gradient-to-b from-[#131F30]/90 via-[#0E1726]/95 to-[#080E1A]/95 p-6 sm:p-8 backdrop-blur-2xl shadow-xl">
        {/* Header: Author + Meta + Moderation Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
          <div className="flex items-center gap-3.5">
            {/* Avatar */}
            <div className="relative h-12 w-12 shrink-0">
              <div className="h-12 w-12 rounded-2xl border border-white/[0.1] bg-white/[0.04] flex items-center justify-center overflow-hidden text-sm font-heading font-bold text-brand-mint">
                {discussion.author?.avatarUrl ? (
                  <img
                    src={discussion.author.avatarUrl}
                    alt={discussion.author.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  authorInitials
                )}
              </div>
              {discussion.author?.isVerified && (
                <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-mint text-bg-base">
                  <ShieldCheck className="h-3 w-3" />
                </span>
              )}
            </div>

            {/* Author Name + Time */}
            <div>
              <div className="flex items-center gap-2">
                {discussion.author?.username ? (
                  <Link
                    to={`/network/profile/${encodeURIComponent(discussion.author.username)}`}
                    className="text-sm font-heading font-bold text-white hover:text-brand-mint transition-colors"
                  >
                    {discussion.author.name}
                  </Link>
                ) : (
                  <span className="text-sm font-heading font-bold text-white">
                    {discussion.author?.name || "Student"}
                  </span>
                )}
                {discussion.author?.username && (
                  <span className="text-xs font-mono text-text-muted">
                    @{discussion.author.username}
                  </span>
                )}
              </div>
              {discussion.author?.headline && (
                <p className="text-xs text-text-secondary line-clamp-1">
                  {discussion.author.headline}
                </p>
              )}
              <p className="mt-0.5 text-[11px] text-text-faint">
                Posted {createdRelative}
              </p>
            </div>
          </div>

          {/* Badges & Moderation Action Bar */}
          <div className="flex items-center gap-2 flex-wrap">
            {discussion.isPinned && (
              <span className="inline-flex items-center gap-1 rounded-lg border border-brand-mint/30 bg-brand-mint/15 px-2.5 py-1 text-xs font-bold text-brand-mint">
                <Pin className="h-3.5 w-3.5" />
                <span>Pinned</span>
              </span>
            )}

            {isLocked && (
              <span className="inline-flex items-center gap-1 rounded-lg border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-300">
                <Lock className="h-3.5 w-3.5" />
                <span>Closed</span>
              </span>
            )}

            {/* Moderator Actions */}
            {permissions.canLock && (
              <button
                type="button"
                onClick={() => toggleLockMutation.mutate()}
                disabled={toggleLockMutation.isPending}
                className="inline-flex items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-xs font-semibold text-text-muted hover:text-white hover:bg-white/[0.06] transition-colors focus-ring"
                title={isLocked ? "Re-open discussion" : "Close discussion"}
              >
                {isLocked ? (
                  <>
                    <Unlock className="h-3.5 w-3.5 text-brand-mint" />
                    <span>Reopen</span>
                  </>
                ) : (
                  <>
                    <Lock className="h-3.5 w-3.5" />
                    <span>Lock</span>
                  </>
                )}
              </button>
            )}

            {permissions.canLock && (
              <button
                type="button"
                onClick={() => togglePinMutation.mutate()}
                disabled={togglePinMutation.isPending}
                className="inline-flex items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-xs font-semibold text-text-muted hover:text-white hover:bg-white/[0.06] transition-colors focus-ring"
                title={discussion.isPinned ? "Unpin topic" : "Pin topic"}
              >
                <Pin className="h-3.5 w-3.5" />
                <span>{discussion.isPinned ? "Unpin" : "Pin"}</span>
              </button>
            )}

            {permissions.canDelete && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-1.5 text-text-muted hover:text-rose-400 hover:border-rose-500/30 hover:bg-rose-500/10 transition-colors focus-ring"
                title="Delete Discussion"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Title */}
        <h1 className="mt-6 text-xl sm:text-2xl font-heading font-black text-white tracking-tight leading-snug">
          {discussion.title}
        </h1>

        {/* Formatted Body */}
        <div className="mt-4 text-sm sm:text-base text-text-secondary leading-relaxed whitespace-pre-line">
          {discussion.body}
        </div>
      </article>

      {/* ── REPLIES SECTION ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-brand-mint" />
            <h2 className="text-base font-heading font-bold text-white">
              Replies ({replies.length})
            </h2>
          </div>
        </div>

        {isRepliesLoading ? (
          <div className="space-y-3">
            {[1, 2].map((n) => (
              <div
                key={n}
                className="h-24 rounded-2xl border border-white/[0.06] bg-white/[0.02] animate-pulse"
              />
            ))}
          </div>
        ) : replies.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8 text-center">
            <p className="text-xs sm:text-sm text-text-muted">
              No replies yet. Start the conversation below.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {replies.map((reply) => {
              const replyTime = formatRelativeTime(reply.createdAt);

              const rInitials = reply.author?.name
                ? reply.author.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()
                : "ST";

              return (
                <div
                  key={reply.id}
                  className="rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#111A29]/90 to-[#0A101D]/90 p-4 sm:p-5 backdrop-blur-xl"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-xl border border-white/[0.1] bg-white/[0.04] flex items-center justify-center text-xs font-heading font-bold text-brand-mint overflow-hidden">
                        {reply.author?.avatarUrl ? (
                          <img
                            src={reply.author.avatarUrl}
                            alt={reply.author.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          rInitials
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          {reply.author?.username ? (
                            <Link
                              to={`/network/profile/${encodeURIComponent(reply.author.username)}`}
                              className="text-xs font-heading font-bold text-white hover:text-brand-mint transition-colors"
                            >
                              {reply.author.name}
                            </Link>
                          ) : (
                            <span className="text-xs font-heading font-bold text-white">
                              {reply.author?.name || "Student"}
                            </span>
                          )}
                          {reply.author?.isVerified && (
                            <ShieldCheck className="h-3 w-3 text-brand-mint" />
                          )}
                        </div>
                        <span className="text-[10px] text-text-faint">
                          {replyTime}
                        </span>
                      </div>
                    </div>

                    {reply.permissions?.canDelete && (
                      <button
                        type="button"
                        onClick={() => deleteReplyMutation.mutate(reply.id)}
                        disabled={deleteReplyMutation.isPending}
                        className="p-1 text-text-faint hover:text-rose-400 transition-colors"
                        title="Delete Reply"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  <p className="text-xs sm:text-sm text-text-secondary leading-relaxed whitespace-pre-line pl-10">
                    {reply.body}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* ── REPLY COMPOSER ── */}
        <div className="pt-4">
          {isLocked ? (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-4 text-center text-xs text-amber-300">
              <Lock className="inline-block h-4 w-4 mr-1.5 -mt-0.5" />
              <span>
                This discussion has been locked by a moderator. No further
                replies can be posted.
              </span>
            </div>
          ) : (
            <form
              onSubmit={handleReplySubmit}
              className="rounded-2xl border border-white/[0.08] bg-[#111A29]/90 p-4 sm:p-5 backdrop-blur-xl shadow-lg"
            >
              <label
                htmlFor="reply-body"
                className="block text-xs font-semibold text-text-secondary mb-2"
              >
                Your Reply
              </label>
              <textarea
                id="reply-body"
                rows={4}
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                maxLength={5000}
                placeholder="Share your perspective or solution..."
                required
                className="w-full rounded-xl border border-white/[0.1] bg-white/[0.03] p-3 text-xs sm:text-sm text-white placeholder:text-text-faint focus:border-brand-mint/50 focus:outline-none focus:ring-2 focus:ring-brand-mint/20 transition-all resize-y"
              />
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[10px] font-mono text-text-faint">
                  {replyBody.length}/5,000
                </span>
                <button
                  type="submit"
                  disabled={replyMutation.isPending || !replyBody.trim()}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-mint px-4 py-2 text-xs font-bold text-bg-base hover:bg-brand-mint/90 transition-all shadow-md focus-ring disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>
                    {replyMutation.isPending ? "Posting..." : "Post Reply"}
                  </span>
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setShowDeleteConfirm(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-sm rounded-3xl border border-white/[0.1] bg-[#141E30] p-6 text-center z-10">
            <h3 className="text-base font-heading font-bold text-white">
              Delete Discussion?
            </h3>
            <p className="mt-2 text-xs text-text-muted">
              This action cannot be undone. All replies associated with this
              discussion will be removed.
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-xl border border-white/[0.08] px-4 py-2 text-xs font-semibold text-text-muted hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteDiscussionMutation.mutate()}
                disabled={deleteDiscussionMutation.isPending}
                className="rounded-xl bg-rose-500 px-4 py-2 text-xs font-bold text-white hover:bg-rose-600 transition-colors"
              >
                {deleteDiscussionMutation.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setShowReportModal(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-md rounded-3xl border border-white/[0.1] bg-[#141E30] p-6 z-10">
            <h3 className="text-base font-heading font-bold text-white">
              Report Content
            </h3>
            <p className="mt-1 text-xs text-text-muted">
              Please describe why this content violates community guidelines.
            </p>

            {reportSuccess ? (
              <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                Thank you. Your report has been submitted to moderators.
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <textarea
                  rows={3}
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="Reason for report..."
                  className="w-full rounded-xl border border-white/[0.1] bg-white/[0.03] p-3 text-xs text-white placeholder:text-text-faint focus:border-brand-mint/50 focus:outline-none resize-none"
                />
                <div className="flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    className="rounded-xl border border-white/[0.08] px-3.5 py-1.5 text-xs font-semibold text-text-muted hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => reportMutation.mutate()}
                    disabled={reportMutation.isPending || !reportReason.trim()}
                    className="rounded-xl bg-rose-500 px-4 py-1.5 text-xs font-bold text-white hover:bg-rose-600 disabled:opacity-50"
                  >
                    Submit Report
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
