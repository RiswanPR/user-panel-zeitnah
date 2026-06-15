import { useState } from "react";
import {
  FiBook,
  FiMenu,
  FiPlayCircle,
  FiSearch,
  FiVideo,
  FiX,
} from "react-icons/fi";

const tabs = [
  {
    key: "all",
    label: "All Courses",
    icon: FiBook,
  },
  {
    key: "online",
    label: "Studio Class",
    icon: FiVideo,
  },
  {
    key: "Recording",
    label: "Zoom Recordings",
    icon: FiPlayCircle,
  },
  {
    key: "my",
    label: "My Courses",
    icon: FiBook,
  },
];

function CourseNavbar({
  activeTab,
  search,
  setActiveTab,
  setSearch,
}) {
  const [open, setOpen] = useState(false);

  // Re-architected tab rendering to adapt dynamically between desktop rows and mobile side stacks
  const renderTabButton = (tab) => {
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
        className={`inline-flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer select-none w-full lg:w-auto ${
          active
            ? "bg-white/[0.05] text-[#9fd5b2] border border-[rgba(159,213,178,0.25)] shadow-sm"
            : "border border-transparent text-white/50 hover:text-white/80 hover:bg-white/[0.01]"
        }`}
      >
        <Icon className="text-sm shrink-0" />
        <span>{tab.label}</span>
      </button>
    );
  };

  return (
    <>
      {/* DESKTOP MATRIX BAR LAYOUT CONTEXT */}
      <div className="hidden items-center justify-between gap-4 glass-card p-3 shadow-xl relative overflow-hidden lg:flex w-full">
        {/* Interior horizontal edge accent path */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[rgba(159,213,178,0.15)] to-transparent" />

        <div className="flex flex-wrap gap-1.5 items-center">
          {tabs.map(renderTabButton)}
        </div>

        {/* Desktop Interactive Search Node */}
        <div className="relative min-w-[320px] shrink-0">
          <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-white/30">
            <FiSearch className="text-sm" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by course name..."
            className="w-full glass-input pl-10 pr-4 py-2.5 text-xs font-medium placeholder-white/20 block"
          />
        </div>
      </div>

      {/* MOBILE BREAKPOINT NAVIGATION VIEWPORTS */}
      <div className="w-full lg:hidden">
        <div className="flex items-center gap-2.5 w-full">
          
          {/* Drawer operational trigger toggle */}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.02] border border-[rgba(159,213,178,0.15)] text-[#9fd5b2] hover:bg-white/[0.05] active:scale-95 transition-all cursor-pointer"
          >
            <FiMenu className="text-base" />
          </button>

          {/* Mobile Fluid Search Capsule Input */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-white/30">
              <FiSearch className="text-sm" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search courses..."
              className="w-full glass-input pl-10 pr-4 py-2.5 text-xs font-medium placeholder-white/20 block"
            />
          </div>
        </div>

        {/* SLIDEOUT SIDE DRAWER DISMISS OVERLAY DIALOG */}
        {open && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md transition-opacity duration-300">
            <button
              type="button"
              aria-label="Close navigation"
              onClick={() => setOpen(false)}
              className="absolute inset-0 h-full w-full bg-transparent border-0 outline-none cursor-default"
            />

            <div className="absolute left-0 top-0 h-full w-[280px] border-r border-[rgba(159,213,178,0.15)] bg-[#0d2035] p-5 shadow-2xl flex flex-col justify-start">
              
              {/* Drawer Modular Panel Top Heading */}
              <div className="mb-6 flex items-center justify-between w-full border-b border-[rgba(159,213,178,0.12)] pb-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/35">
                    Course View
                  </p>
                  <h2 className="mt-1 text-lg font-heading font-black text-white tracking-tight">
                    Filter Library
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.03] border border-white/[0.08] text-white/60 hover:text-white transition-colors cursor-pointer"
                >
                  <FiX className="text-sm" />
                </button>
              </div>

              {/* Vertical Stack Navigation Link Collection */}
              <div className="space-y-1.5 w-full flex flex-col">
                {tabs.map(renderTabButton)}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default CourseNavbar;
