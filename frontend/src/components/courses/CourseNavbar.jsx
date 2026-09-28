import { useState, useEffect, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Play,
  Search,
  Video,
  X,
  SlidersHorizontal,
  Command,
} from "lucide-react";

const tabs = [
  { key: "all", label: "All Courses", icon: BookOpen },
  { key: "Recording", label: "Recorded Classes", icon: Play },
  { key: "online", label: "Online Classes", icon: Video },
  { key: "my", label: "My Courses", icon: BookOpen },
];

/**
 * CourseNavbar
 *
 * Editorial control surface for Course filtering & Command Search.
 * Desktop: Horizontal editorial navigation bar with mint active background & yellow micro-dot.
 * Mobile: Accessible bottom-sheet drawer with body scroll locking and large touch targets.
 */
const CourseNavbar = memo(function CourseNavbar({
  activeTab,
  search,
  setActiveTab,
  setSearch,
}) {
  const [open, setOpen] = useState(false);

  // Close mobile sheet on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  // Body scroll locking when mobile bottom sheet is active
  useEffect(() => {
    if (open) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [open]);

  return (
    <nav aria-label="Course navigation and filters" className="w-full">
      {/* ═══ DESKTOP EDITORIAL NAVIGATION BAR ═══ */}
      <div className="hidden lg:flex items-center justify-between gap-6 rounded-2xl bg-[#0A0F14]/90 border border-white/[0.08] backdrop-blur-2xl p-2 relative shadow-lg">
        {/* Subtle top hairline */}
        <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-brand-mint/30 to-transparent pointer-events-none" />

        {/* Tab buttons */}
        <div className="flex items-center gap-1.5" role="tablist">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab.key)}
                className={`relative inline-flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-xs font-mono font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer select-none focus-ring ${
                  active
                    ? "text-white"
                    : "text-text-muted hover:text-white hover:bg-white/[0.03]"
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="course-tab-active-indicator"
                    className="absolute inset-0 rounded-xl bg-[#12314C] border border-brand-mint/30 shadow-[0_0_20px_rgba(159,213,178,0.12)]"
                    transition={{ type: "spring", stiffness: 450, damping: 34 }}
                  />
                )}
                <Icon
                  className={`relative z-10 w-3.5 h-3.5 shrink-0 transition-colors ${
                    active ? "text-brand-mint" : "text-text-faint"
                  }`}
                />
                <span className="relative z-10">{tab.label}</span>

                {/* Yellow Micro-Indicator Dot on Active Tab */}
                {active && (
                  <span className="relative z-10 w-1.5 h-1.5 rounded-full bg-brand-yellow shadow-[0_0_6px_#F6ED4A]" />
                )}
              </button>
            );
          })}
        </div>

        {/* Command Search Interface */}
        <div className="relative min-w-[340px] shrink-0">
          <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-text-muted">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by course title..."
            aria-label="Search by course title"
            className="w-full bg-[#07090B]/90 border border-white/[0.08] hover:border-white/[0.15] focus:border-brand-mint/50 rounded-xl pl-10 pr-10 py-2.5 text-xs font-mono text-white placeholder:text-text-muted transition-all outline-none focus-ring shadow-inner"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search query"
              className="absolute inset-y-0 right-2.5 flex items-center text-text-muted hover:text-white transition-colors cursor-pointer p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none opacity-40">
              <Command className="w-3.5 h-3.5 text-text-muted" />
            </div>
          )}
        </div>
      </div>

      {/* ═══ MOBILE / TABLET NAVIGATION ═══ */}
      <div className="w-full lg:hidden space-y-3">
        <div className="flex items-center gap-2.5 w-full">
          {/* Filter trigger button */}
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open course category filters"
            aria-expanded={open}
            className="flex h-12 px-4 shrink-0 items-center gap-2 rounded-2xl bg-[#0A0F14] border border-white/[0.1] text-white hover:bg-[#101820] active:scale-95 transition-all cursor-pointer focus-ring shadow-md"
          >
            <SlidersHorizontal className="w-4 h-4 text-brand-mint" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider">
              {tabs.find((t) => t.key === activeTab)?.label || "Filter"}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-brand-yellow ml-0.5" />
          </button>

          {/* Mobile Search */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-text-muted">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by course title..."
              aria-label="Search by course title"
              className="w-full h-12 bg-[#0A0F14] border border-white/[0.08] focus:border-brand-mint/50 rounded-2xl pl-10 pr-9 text-xs font-mono text-white placeholder:text-text-muted transition-all outline-none focus-ring shadow-inner"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute inset-y-0 right-3 flex items-center text-text-muted hover:text-white transition-colors cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Mobile Premium Bottom Sheet Drawer */}
        <AnimatePresence>
          {open && (
            <>
              {/* Dim backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setOpen(false)}
                className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md"
              />

              {/* Bottom Sheet */}
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", stiffness: 380, damping: 34 }}
                className="fixed bottom-0 inset-x-0 z-50 rounded-t-3xl bg-[#0A0F14] border-t border-white/[0.12] p-6 pb-[calc(2rem+env(safe-area-inset-bottom))] shadow-[0_-20px_60px_rgba(0,0,0,0.8)] max-h-[85vh] overflow-y-auto"
              >
                {/* Grab handle */}
                <div className="w-12 h-1 rounded-full bg-white/20 mx-auto mb-6" />

                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-heading font-extrabold uppercase tracking-tight text-white">
                      Filter Courses
                    </h2>
                    <p className="text-xs font-mono text-text-muted mt-0.5">
                      Select catalog partition to display
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Close filter menu"
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.08] text-text-muted hover:text-white transition-colors cursor-pointer focus-ring"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2.5 w-full flex flex-col">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const active = activeTab === tab.key;

                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => {
                          setActiveTab(tab.key);
                          setOpen(false);
                        }}
                        className={`inline-flex items-center justify-between rounded-2xl px-5 py-4 min-h-[52px] text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer w-full focus-ring ${
                          active
                            ? "bg-[#12314C] text-white border border-brand-mint/40 shadow-[0_0_20px_rgba(159,213,178,0.1)]"
                            : "text-text-muted hover:text-white hover:bg-white/[0.04] border border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-3.5">
                          <Icon
                            className={`w-4 h-4 shrink-0 ${
                              active ? "text-brand-mint" : "text-text-faint"
                            }`}
                          />
                          <span>{tab.label}</span>
                        </div>
                        {active && (
                          <span className="w-2 h-2 rounded-full bg-brand-yellow shadow-[0_0_6px_#F6ED4A]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
});

export default CourseNavbar;
