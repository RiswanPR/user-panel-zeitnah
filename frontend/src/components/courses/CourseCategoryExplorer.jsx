import { memo, useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, Play, Video, BookOpen, Layers } from "lucide-react";
import ZeitnahZMotif from "./ZeitnahZMotif";

/**
 * CourseCategoryExplorer
 *
 * Editorial category section: "CHOOSE YOUR DIRECTION."
 * Generates dark editorial poster tiles strictly derived from authentic API course data.
 * Features:
 * - Large numeric indices (01, 02, 03, 04)
 * - Brand surface rotation: Navy, Deep Charcoal, Mint-tinted, Gold-tinted
 * - Subtle organic Z motif on each tile
 * - Hover elevation with count reveal and directional arrow
 * - Direct click integration with active tab filtering
 *
 * @param {Array} courses - Full courses list
 * @param {string} activeTab - Currently active tab key
 * @param {function} onSelectTab - Callback to switch active tab
 */
const CourseCategoryExplorer = memo(function CourseCategoryExplorer({
  courses = [],
  activeTab = "all",
  onSelectTab,
}) {
  const categories = useMemo(() => {
    const totalCount = courses.length;
    const recordingCount = courses.filter(
      (c) => String(c.type || "").trim().toLowerCase() === "recording"
    ).length;
    const onlineCount = courses.filter(
      (c) => String(c.type || "").trim().toLowerCase() !== "recording"
    ).length;
    const enrolledCount = courses.filter(
      (c) =>
        !!c.learningProgress ||
        !!c.purchased ||
        !!c.isPurchased ||
        !!c.isEnrolled
    ).length;

    return [
      {
        index: "01",
        key: "all",
        title: "ALL MASTERCLASSES",
        subtitle: "Complete academy syllabus and modular learning tracks",
        count: totalCount,
        icon: BookOpen,
        surfaceClass:
          "from-[#0D141A] to-[#12314C]/70 hover:border-brand-mint/40",
        accentColor: "text-white",
        motifVariant: "navy",
      },
      {
        index: "02",
        key: "Recording",
        title: "RECORDED CLASSES",
        subtitle: "Self-paced engineering modules with structured chapters",
        count: recordingCount,
        icon: Play,
        surfaceClass:
          "from-[#0A0F14] to-[#12314C]/50 hover:border-brand-yellow/40",
        accentColor: "text-brand-yellow",
        motifVariant: "yellow",
      },
      {
        index: "03",
        key: "online",
        title: "ONLINE & COHORTS",
        subtitle: "Scheduled interactive sessions and live workshops",
        count: onlineCount,
        icon: Video,
        surfaceClass:
          "from-[#0D141A] via-[#0A0F14] to-[#101820] hover:border-brand-mint/40",
        accentColor: "text-brand-mint",
        motifVariant: "mint",
      },
      {
        index: "04",
        key: "my",
        title: "MY ACTIVE TRACKS",
        subtitle: "Your enrolled curriculum and personal learning telemetry",
        count: enrolledCount,
        icon: Layers,
        surfaceClass:
          "from-[#12314C]/80 via-[#0A0F14] to-[#07090B] hover:border-brand-mint/50",
        accentColor: "text-brand-mint",
        motifVariant: "gradient",
      },
    ];
  }, [courses]);

  const easePremium = [0.16, 1, 0.3, 1];

  return (
    <section aria-labelledby="category-explorer-heading" className="space-y-6">
      {/* ── Section Title & Editorial Statement ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-white/[0.08] pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand-mint" />
            <span className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-brand-mint">
              EXPLORATION MAP
            </span>
          </div>
          <h2
            id="category-explorer-heading"
            className="display-headline text-2xl sm:text-3xl md:text-4xl text-white tracking-tight leading-none"
          >
            CHOOSE YOUR DIRECTION.
          </h2>
        </div>
        <p className="text-xs font-mono text-text-muted">
          FILTER CATALOG BY CURRICULUM ARCHITECTURE
        </p>
      </div>

      {/* ── Editorial Poster Tile Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {categories.map((cat, i) => {
          const isActive = activeTab === cat.key;
          const Icon = cat.icon;

          return (
            <motion.div
              key={cat.key}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.08, ease: easePremium }}
              onClick={() => onSelectTab && onSelectTab(cat.key)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectTab && onSelectTab(cat.key);
                }
              }}
              aria-label={`Filter by ${cat.title}`}
              className={`group relative overflow-hidden rounded-2xl border p-5 sm:p-6 flex flex-col justify-between min-h-[200px] cursor-pointer transition-all duration-300 shadow-md bg-gradient-to-br ${cat.surfaceClass} ${
                isActive
                  ? "border-brand-mint/60 shadow-[0_0_24px_rgba(159,213,178,0.15)] ring-1 ring-brand-mint/30"
                  : "border-white/[0.08]"
              }`}
            >
              {/* Subtle top hairline */}
              <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />

              {/* Spatial Z Motif Watermark */}
              <div className="pointer-events-none absolute -right-6 -bottom-6 w-32 h-32 select-none opacity-[0.05] group-hover:opacity-[0.1] transition-opacity duration-300">
                <ZeitnahZMotif
                  variant={cat.motifVariant}
                  className="w-full h-full rotate-6"
                />
              </div>

              {/* ── TOP: Numeric Index & Direct Arrow ── */}
              <div className="relative z-10 flex items-center justify-between">
                <span className="font-heading font-black text-2xl sm:text-3xl text-white/30 font-mono tracking-tighter group-hover:text-white/60 transition-colors">
                  {cat.index}
                </span>

                <div className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-text-muted group-hover:text-white group-hover:bg-white/[0.08] group-hover:border-white/20 transition-all">
                  <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
              </div>

              {/* ── BOTTOM: Title, Count & Indicator ── */}
              <div className="relative z-10 space-y-2 pt-6">
                <div className="flex items-center gap-2">
                  <Icon className={`w-3.5 h-3.5 ${cat.accentColor}`} />
                  <span className="text-[10px] font-mono font-bold tracking-[0.16em] uppercase text-text-muted">
                    {cat.count} {cat.count === 1 ? "COURSE" : "COURSES"}
                  </span>
                </div>

                <h3 className="font-heading font-extrabold text-base sm:text-lg text-white tracking-tight leading-snug group-hover:text-brand-mint transition-colors">
                  {cat.title}
                </h3>

                <p className="text-[11px] text-text-secondary leading-relaxed line-clamp-2">
                  {cat.subtitle}
                </p>
              </div>

              {/* Active selection dot indicator */}
              {isActive && (
                <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-brand-yellow shadow-[0_0_8px_#F6ED4A]" />
              )}
            </motion.div>
          );
        })}
      </div>
    </section>
  );
});

export default CourseCategoryExplorer;
