import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Sparkles,
  ArrowLeft,
  Calendar,
  Layers,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { useAnnouncements } from "../../hooks/useAnnouncements";
import AnnouncementIcon from "../../components/announcements/AnnouncementIcon";

const FILTER_TABS = [
  { key: "all", label: "All Updates" },
  { key: "platform", label: "Platform" },
  { key: "course", label: "Courses & Content" },
  { key: "maintenance", label: "Maintenance" },
];

export default function WhatsNewPage() {
  const [activeFilter, setActiveFilter] = useState("all");
  const { allAnnouncements, isAllLoading } = useAnnouncements();

  const filteredAnnouncements = useMemo(() => {
    if (activeFilter === "all") return allAnnouncements;
    if (activeFilter === "course") {
      return allAnnouncements.filter(
        (a) => a.type === "course" || a.type === "content"
      );
    }
    return allAnnouncements.filter((a) => a.type === activeFilter);
  }, [allAnnouncements, activeFilter]);

  return (
    <div className="space-y-8 sm:space-y-10 max-w-5xl mx-auto pb-12">
      {/* ── Breadcrumb & Back Link ── */}
      <div className="flex items-center justify-between">
        <Link
          to="/courses"
          className="inline-flex items-center gap-2 text-xs font-semibold text-text-muted hover:text-white transition-colors focus-ring rounded-lg px-2 py-1 -ml-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Courses</span>
        </Link>

        <span className="text-xs font-mono font-semibold text-text-muted">
          v2.4 Production
        </span>
      </div>

      {/* ── Hero Section ── */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-bg-card via-bg-surface to-bg-card p-6 sm:p-8 shadow-sm"
      >
        <div className="gradient-line-top" />
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-brand-mint/6 blur-[80px]" />

        <div className="relative z-10 space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-lg bg-brand-mint/10 border border-brand-mint/20 px-3 py-1 text-[10px] font-bold text-brand-mint uppercase tracking-[0.16em]">
            <Sparkles className="w-3 h-3" />
            Product Changelog & Updates
          </div>
          <h1 className="font-heading font-extrabold text-3xl sm:text-4xl text-white tracking-tight leading-tight">
            What's new in <span className="text-gradient">Zeitnah.</span>
          </h1>
          <p className="text-xs sm:text-sm font-medium text-text-muted leading-relaxed">
            Follow along with the latest improvements, course releases, system announcements, and platform updates.
          </p>
        </div>
      </motion.section>

      {/* ── Filter Tabs ── */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {FILTER_TABS.map((tab) => {
          const active = activeFilter === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveFilter(tab.key)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer select-none whitespace-nowrap focus-ring ${
                active
                  ? "bg-brand-mint/10 border border-brand-mint/25 text-white shadow-sm"
                  : "bg-white/[0.02] border border-white/[0.06] text-text-muted hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Timeline of Updates ── */}
      <div className="space-y-4">
        {isAllLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-36 shimmer rounded-2xl border border-white/[0.06]"
              />
            ))}
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.06] bg-bg-card p-12 text-center max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto text-text-muted">
              <Layers className="w-5 h-5 opacity-60" />
            </div>
            <h3 className="font-heading font-bold text-base text-white">
              No updates in this category
            </h3>
            <p className="text-xs text-text-muted">
              Check back soon for upcoming platform releases and curriculum notices.
            </p>
          </div>
        ) : (
          filteredAnnouncements.map((item, idx) => {
            const formattedDate = new Date(
              item.startsAt || item.createdAt
            ).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            });

            return (
              <motion.article
                key={item.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: idx * 0.05 }}
                className="rounded-2xl border border-white/[0.08] bg-bg-card/80 hover:border-brand-mint/25 p-5 sm:p-6 transition-all duration-300 relative overflow-hidden group shadow-sm"
              >
                <div className="gradient-line-top" />

                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border border-white/10 bg-white/[0.03] text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                        <AnnouncementIcon type={item.type} className="w-3 h-3" />
                        <span>{item.eyebrow || item.type}</span>
                      </span>
                    </div>

                    <span className="inline-flex items-center gap-1.5 text-xs text-text-muted font-medium">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{formattedDate}</span>
                    </span>
                  </div>

                  <h3 className="font-heading font-extrabold text-lg sm:text-xl text-white group-hover:text-brand-mint transition-colors">
                    {item.title}
                  </h3>

                  <p className="text-xs sm:text-sm font-medium text-text-secondary leading-relaxed">
                    {item.message}
                  </p>

                  {item.cta && item.cta.url && (
                    <div className="pt-2">
                      {item.cta.url.startsWith("http") ? (
                        <a
                          href={item.cta.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-mint hover:underline uppercase tracking-wider"
                        >
                          <span>{item.cta.label || "Learn more"}</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      ) : (
                        <Link
                          to={item.cta.url}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-mint hover:underline uppercase tracking-wider"
                        >
                          <span>{item.cta.label || "Learn more"}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </motion.article>
            );
          })
        )}
      </div>
    </div>
  );
}
