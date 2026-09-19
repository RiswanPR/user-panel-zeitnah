import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Bell,
  MessageSquare,
  BookOpen,
  Users,
  ArrowRight,
  Pin,
  ExternalLink,
} from "lucide-react";
import DiscussionCard from "./DiscussionCard";

/**
 * CommunityOverview Component
 * Structured dashboard for a community: Rules, Announcements, Recent Discussions, Resources, and Members.
 *
 * @param {Object} props
 * @param {Object} props.community
 * @param {Array} [props.announcements]
 * @param {Array} [props.recentDiscussions]
 * @param {Array} [props.resources]
 * @param {Array} [props.membersPreview]
 * @param {function(string): void} props.onTabChange
 * @param {function(): void} [props.onOpenComposer]
 */
export default function CommunityOverview({
  community,
  announcements = [],
  recentDiscussions = [],
  resources = [],
  membersPreview = [],
  onTabChange,
  onOpenComposer,
}) {
  const isMember =
    community?.membership?.state === "member" ||
    community?.membership?.state === "moderator" ||
    community?.membership?.state === "owner";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left 2 Columns: Announcements & Discussions */}
      <div className="lg:col-span-2 space-y-6">
        {/* Pinned Announcements */}
        {announcements && announcements.length > 0 && (
          <section className="rounded-2xl border border-brand-mint/20 bg-gradient-to-b from-brand-mint/[0.06] to-bg-card/90 p-5 backdrop-blur-xl shadow-lg">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2 text-sm font-heading font-bold text-white">
                <Bell className="h-4 w-4 text-brand-mint" />
                <span>Community Announcements</span>
              </div>
              <button
                type="button"
                onClick={() => onTabChange("announcements")}
                className="text-xs font-semibold text-brand-mint hover:underline"
              >
                View all
              </button>
            </div>

            <div className="space-y-3">
              {announcements.slice(0, 2).map((a) => (
                <article
                  key={a.id}
                  className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    {a.pinned && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-brand-mint">
                        <Pin className="h-3 w-3" />
                        <span>Pinned</span>
                      </span>
                    )}
                    <h4 className="text-sm font-bold text-white">{a.title}</h4>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed line-clamp-3">
                    {a.content}
                  </p>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Discussions Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-brand-mint" />
              <h3 className="text-base font-heading font-bold text-white">
                Active Discussions
              </h3>
            </div>
            <div className="flex items-center gap-3">
              {isMember && (
                <button
                  type="button"
                  onClick={onOpenComposer}
                  className="text-xs font-semibold text-brand-mint hover:underline"
                >
                  + Start Topic
                </button>
              )}
              <button
                type="button"
                onClick={() => onTabChange("discussions")}
                className="inline-flex items-center gap-1 text-xs font-semibold text-text-muted hover:text-white transition-colors"
              >
                <span>View all</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {recentDiscussions.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8 text-center">
              <MessageSquare className="mx-auto h-8 w-8 text-text-faint" />
              <p className="mt-2 text-sm font-medium text-white/80">
                No discussions started yet
              </p>
              <p className="mt-1 text-xs text-text-muted">
                Be the first to share a question or start a topic in this space.
              </p>
              {isMember && (
                <button
                  type="button"
                  onClick={onOpenComposer}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-brand-mint px-4 py-2 text-xs font-bold text-bg-base hover:bg-brand-mint/90 transition-all focus-ring"
                >
                  Start Discussion
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {recentDiscussions.slice(0, 4).map((d) => (
                <DiscussionCard
                  key={d.id}
                  discussion={d}
                  communitySlug={community.slug}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Right Column: Rules & Resources & Members Preview */}
      <div className="space-y-6">
        {/* Guidelines / Rules Card */}
        <section className="rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#111A29]/90 to-[#0A101D]/90 p-5 backdrop-blur-xl shadow-lg">
          <div className="flex items-center gap-2 mb-3 text-sm font-heading font-bold text-white">
            <ShieldCheck className="h-4 w-4 text-brand-mint" />
            <span>Community Guidelines</span>
          </div>

          {community.rules && community.rules.length > 0 ? (
            <ol className="space-y-2 text-xs text-text-secondary">
              {community.rules.map((rule, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="font-mono text-brand-mint/80 font-bold">
                    {idx + 1}.
                  </span>
                  <span>{rule}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-xs text-text-muted leading-relaxed">
              Maintain respect, stay focused on learning, and help peers grow
              in their educational journey.
            </p>
          )}
        </section>

        {/* Resources Card */}
        <section className="rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#111A29]/90 to-[#0A101D]/90 p-5 backdrop-blur-xl shadow-lg">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 text-sm font-heading font-bold text-white">
              <BookOpen className="h-4 w-4 text-brand-mint" />
              <span>Shared Resources</span>
            </div>
            <button
              type="button"
              onClick={() => onTabChange("resources")}
              className="text-xs font-semibold text-brand-mint hover:underline"
            >
              View all
            </button>
          </div>

          {resources && resources.length > 0 ? (
            <div className="space-y-2.5">
              {resources.slice(0, 3).map((r) => (
                <div
                  key={r.id}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-white/90 truncate">
                      {r.title}
                    </span>
                    {r.url && (
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-mint hover:underline inline-flex items-center gap-1 shrink-0"
                      >
                        <span>Open</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  {r.description && (
                    <p className="mt-1 text-[11px] text-text-muted line-clamp-2">
                      {r.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-text-muted">
              No resources shared yet. Members can share relevant learning
              links and course references.
            </p>
          )}
        </section>

        {/* Members Preview Card */}
        <section className="rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#111A29]/90 to-[#0A101D]/90 p-5 backdrop-blur-xl shadow-lg">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 text-sm font-heading font-bold text-white">
              <Users className="h-4 w-4 text-brand-mint" />
              <span>Members ({community.memberCount || 0})</span>
            </div>
            <button
              type="button"
              onClick={() => onTabChange("members")}
              className="text-xs font-semibold text-brand-mint hover:underline"
            >
              Directory
            </button>
          </div>

          {membersPreview && membersPreview.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {membersPreview.slice(0, 8).map((m) => (
                <Link
                  key={m.id}
                  to={`/network/profile/${encodeURIComponent(m.username || "")}`}
                  title={`${m.name} (@${m.username})`}
                  className="relative h-9 w-9 rounded-xl border border-white/[0.1] bg-white/[0.04] flex items-center justify-center overflow-hidden hover:border-brand-mint/40 transition-colors focus-ring"
                >
                  {m.avatarUrl ? (
                    <img
                      src={m.avatarUrl}
                      alt={m.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-xs font-bold text-brand-mint">
                      {m.name?.[0]?.toUpperCase() || "S"}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-xs text-text-muted">
              Join this space to learn with fellow students.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
