import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Play,
  Search,
  Video,
  X,
  SlidersHorizontal,
} from "lucide-react";

const tabs = [
  { key: "all", label: "All Courses", icon: BookOpen },
  { key: "Recording", label: "Recorded Classes", icon: Play },
  { key: "online", label: "Online Classes", icon: Video },
  { key: "my", label: "My Courses", icon: BookOpen },
];

function CourseNavbar({ activeTab, search, setActiveTab, setSearch }) {
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

  return (
    <nav aria-label="Course navigation and filters" className="w-full">
      {/* ═══ DESKTOP NAVIGATION BAR ═══ */}
      <div className="hidden lg:flex items-center justify-between gap-4 rounded-2xl bg-bg-card/70 border border-white/[0.06] backdrop-blur-xl p-2 relative overflow-hidden shadow-sm">
        <div className="gradient-line-top" />

        {/* Tab buttons */}
        <div className="flex gap-1 items-center" role="tablist">
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
                className={`relative inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold transition-all duration-200 cursor-pointer select-none focus-ring ${
                  active
                    ? "text-white"
                    : "text-text-muted hover:text-text-secondary hover:bg-white/[0.02]"
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="course-tab-active"
                    className="absolute inset-0 rounded-xl bg-brand-mint/10 border border-brand-mint/20 shadow-[0_0_16px_rgba(159,213,178,0.08)]"
                    transition={{ type: "spring", stiffness: 450, damping: 32 }}
                  />
                )}
                <Icon
                  className={`relative z-10 w-4 h-4 shrink-0 transition-colors ${
                    active ? "text-brand-mint" : "text-text-faint"
                  }`}
                />
                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search Input with Clear Button */}
        <div className="relative min-w-[320px] shrink-0">
          <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-text-faint">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by course title..."
            aria-label="Search courses by name"
            className="w-full glass-input pl-10 pr-9 py-2.5 text-sm font-medium focus-ring"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search input"
              className="absolute inset-y-0 right-2.5 flex items-center text-text-faint hover:text-white transition-colors cursor-pointer p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ═══ MOBILE / TABLET NAVIGATION ═══ */}
      <div className="w-full lg:hidden space-y-3">
        <div className="flex items-center gap-2.5 w-full">
          {/* Filter trigger with active state indicator */}
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open course category filters"
            aria-expanded={open}
            className="flex h-11 px-3.5 shrink-0 items-center gap-2 rounded-xl bg-bg-card border border-white/[0.08] text-white hover:bg-bg-elevated active:scale-95 transition-all cursor-pointer focus-ring"
          >
            <SlidersHorizontal className="w-4 h-4 text-brand-mint" />
            <span className="text-xs font-semibold">
              {tabs.find((t) => t.key === activeTab)?.label || "Filter"}
            </span>
          </button>

          {/* Mobile Search */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-text-faint">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search courses..."
              aria-label="Search courses by name"
              className="w-full glass-input pl-10 pr-9 py-2.5 text-sm font-medium focus-ring"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute inset-y-0 right-2.5 flex items-center text-text-faint hover:text-white transition-colors cursor-pointer p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Mobile bottom sheet drawer */}
        <AnimatePresence>
          {open && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setOpen(false)}
                className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md"
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", stiffness: 350, damping: 32 }}
                className="fixed bottom-0 inset-x-0 z-50 rounded-t-3xl bg-bg-surface border-t border-white/10 p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-[0_-16px_64px_rgba(0,0,0,0.5)] max-h-[80vh] overflow-y-auto"
              >
                <div className="w-12 h-1 rounded-full bg-white/20 mx-auto mb-5" />

                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-base font-heading font-bold text-white">
                      Filter Courses
                    </h2>
                    <p className="text-xs text-text-muted mt-0.5">
                      Select a category to view your classes
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Close filter menu"
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.08] text-text-muted hover:text-white transition-colors cursor-pointer focus-ring"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2 w-full flex flex-col">
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
                        className={`inline-flex items-center justify-between rounded-xl px-4 py-3.5 text-sm font-semibold transition-all cursor-pointer w-full focus-ring ${
                          active
                            ? "bg-brand-mint/10 text-white border border-brand-mint/20 shadow-[0_0_16px_rgba(159,213,178,0.06)]"
                            : "text-text-muted hover:text-white hover:bg-white/[0.03] border border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon
                            className={`w-4 h-4 shrink-0 ${
                              active ? "text-brand-mint" : "text-text-faint"
                            }`}
                          />
                          <span>{tab.label}</span>
                        </div>
                        {active && (
                          <div className="w-1.5 h-1.5 rounded-full bg-brand-mint" />
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
}

export default CourseNavbar;
