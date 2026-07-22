import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Menu,
  Play,
  Search,
  Video,
  X,
} from "lucide-react";

const tabs = [
  { key: "Recording", label: "Studio Classes", icon: Play },
  { key: "online", label: "Recordings", icon: Video },
  { key: "all", label: "All Courses", icon: BookOpen },
  { key: "my", label: "My Courses", icon: BookOpen },
];

function CourseNavbar({ activeTab, search, setActiveTab, setSearch }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* ═══ DESKTOP NAVIGATION BAR ═══ */}
      <div className="hidden lg:flex items-center justify-between gap-4 rounded-2xl bg-bg-card/60 border border-border-default backdrop-blur-lg p-2 relative overflow-hidden">
        <div className="gradient-line-top" />

        {/* Tab buttons */}
        <div className="flex gap-1 items-center">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`relative inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold transition-all duration-200 cursor-pointer select-none ${
                  active
                    ? "text-white"
                    : "text-text-muted hover:text-text-secondary"
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="course-tab-active"
                    className="absolute inset-0 rounded-xl bg-brand-mint/10 border border-brand-mint/15"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon className={`relative z-10 w-4 h-4 shrink-0 ${active ? "text-brand-mint" : ""}`} />
                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative min-w-[300px] shrink-0">
          <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-text-faint">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by course name..."
            className="w-full glass-input pl-10 pr-4 py-2.5 text-sm font-medium"
          />
        </div>
      </div>

      {/* ═══ MOBILE NAVIGATION ═══ */}
      <div className="w-full lg:hidden">
        <div className="flex items-center gap-2.5 w-full">
          {/* Filter trigger */}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-bg-card border border-border-default text-brand-mint hover:bg-bg-elevated active:scale-95 transition-all cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Search */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-text-faint">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search courses..."
              className="w-full glass-input pl-10 pr-4 py-2.5 text-sm font-medium"
            />
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
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="fixed bottom-0 inset-x-0 z-50 rounded-t-3xl bg-bg-surface border-t border-border-accent p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-[0_-16px_64px_rgba(0,0,0,0.4)]"
              >
                <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-5" />

                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-heading font-bold text-white">Filter Courses</h2>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.06] text-text-muted hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-1.5 w-full flex flex-col">
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
                        className={`inline-flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all cursor-pointer w-full ${
                          active
                            ? "bg-brand-mint/10 text-white border border-brand-mint/15"
                            : "text-text-muted hover:text-white hover:bg-white/[0.03] border border-transparent"
                        }`}
                      >
                        <Icon className={`w-4.5 h-4.5 shrink-0 ${active ? "text-brand-mint" : ""}`} />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

export default CourseNavbar;
