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
        className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition-all ${
          active
            ? "border border-cyan-400/20 bg-gradient-to-r from-cyan-500/14 to-violet-500/14 text-cyan-200 shadow-[0_14px_35px_rgba(34,211,238,0.12)]"
            : "border border-transparent text-white/60 hover:border-white/[0.08] hover:bg-white/[0.03] hover:text-white"
        }`}
      >
        <Icon className="text-base" />
        {tab.label}
      </button>
    );
  };

  return (
    <>
      <div className="hidden items-center justify-between gap-4 rounded-[30px] border border-white/[0.08] bg-[#111111]/90 p-3 shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur lg:flex">
        <div className="flex flex-wrap gap-2">
          {tabs.map(renderTabButton)}
        </div>

        <label className="flex min-w-[320px] items-center gap-3 rounded-[22px] border border-white/[0.08] bg-black/25 px-4 py-3">
          <FiSearch className="text-cyan-300" />

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by course name"
            className="w-full bg-transparent text-white outline-none placeholder:text-white/30"
          />
        </label>
      </div>

      <div className="mb-6 lg:hidden">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-[#111111]/90 text-cyan-200 shadow-[0_16px_40px_rgba(0,0,0,0.2)]"
          >
            <FiMenu />
          </button>

          <label className="flex flex-1 items-center gap-3 rounded-2xl border border-white/[0.08] bg-[#111111]/90 px-4 py-3 shadow-[0_16px_40px_rgba(0,0,0,0.2)]">
            <FiSearch className="text-cyan-300" />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search courses"
              className="w-full bg-transparent text-white outline-none placeholder:text-white/30"
            />
          </label>
        </div>

        {open && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm">
            <button
              type="button"
              aria-label="Close navigation"
              onClick={() => setOpen(false)}
              className="absolute inset-0 h-full w-full"
            />

            <div className="absolute left-0 top-0 h-full w-[300px] border-r border-white/[0.08] bg-[#0e0e0e] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-white/35">
                    Course View
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-white">
                    Filter Library
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03] text-white/70"
                >
                  <FiX />
                </button>
              </div>

              <div className="space-y-2">
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
