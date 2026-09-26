import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  BookOpen,
  GraduationCap,
  Compass,
  MessageSquare,
  Briefcase,
  Inbox,
  TrendingUp,
  Layers,
  ShieldCheck,
  Trophy,
  User,
  ShieldAlert,
  Building2,
  X,
  ArrowRight,
  Sparkles,
} from "lucide-react";

const searchableItems = [
  {
    category: "Courses & Academy",
    title: "All Courses",
    desc: "Explore full infrastructure curriculum & technical tracks",
    path: "/courses",
    icon: BookOpen,
    keywords: ["courses", "classes", "bim", "engineering", "infrastructure", "catalog"],
  },
  {
    category: "Courses & Academy",
    title: "My Learning & Dashboard",
    desc: "Access your enrolled courses, lectures & completion progress",
    path: "/my-learning",
    icon: GraduationCap,
    keywords: ["learning", "enrolled", "my courses", "study", "classes"],
  },
  {
    category: "Courses & Academy",
    title: "Global Leaderboard",
    desc: "Check rankings, XP standings & top performers",
    path: "/leaderboard",
    icon: Trophy,
    keywords: ["leaderboard", "rank", "ranking", "xp", "points", "standing", "competition"],
  },
  {
    category: "Network & Community",
    title: "Network & Learning Spaces",
    desc: "Connect with engineers, join study spaces & discuss topics",
    path: "/network",
    icon: Compass,
    keywords: ["network", "spaces", "discussions", "peers", "engineers", "community"],
  },
  {
    category: "Network & Community",
    title: "Direct Messages",
    desc: "Chat with peers, mentors, and project collaborators",
    path: "/messages",
    icon: MessageSquare,
    keywords: ["messages", "chat", "dm", "conversations", "inbox"],
  },
  {
    category: "Career & Opportunities",
    title: "Infrastructure Jobs Board",
    desc: "Search high-demand engineering & BIM job listings",
    path: "/jobs",
    icon: Briefcase,
    keywords: ["jobs", "careers", "hiring", "positions", "employment", "roles"],
  },
  {
    category: "Career & Opportunities",
    title: "Opportunities Inbox",
    desc: "Review employer recruitment inquiries and offers",
    path: "/opportunities/inbox",
    icon: Inbox,
    keywords: ["opportunities", "offers", "inbox", "recruiter", "interviews"],
  },
  {
    category: "Career & Opportunities",
    title: "Career Intelligence",
    desc: "Skills roadmap, pathway analysis & role recommendations",
    path: "/career-intelligence",
    icon: TrendingUp,
    keywords: ["career", "intelligence", "roadmap", "skills", "analysis"],
  },
  {
    category: "Career & Opportunities",
    title: "Engineering Portfolio",
    desc: "Showcase verified infrastructure projects & BIM models",
    path: "/profile/portfolio",
    icon: Layers,
    keywords: ["portfolio", "projects", "showcase", "bim", "models"],
  },
  {
    category: "Account & Security",
    title: "My Profile",
    desc: "Manage credentials, bio, and personal details",
    path: "/profile",
    icon: User,
    keywords: ["profile", "account", "settings", "user", "bio"],
  },
  {
    category: "Account & Security",
    title: "Verification Center",
    desc: "Verify engineering degrees, licenses & experience badges",
    path: "/profile/verification",
    icon: ShieldCheck,
    keywords: ["verify", "verification", "credentials", "badges", "license"],
  },
  {
    category: "Account & Security",
    title: "Active Sessions & Security",
    desc: "Review logged-in devices and terminate active sessions",
    path: "/active-sessions",
    icon: ShieldAlert,
    keywords: ["sessions", "devices", "security", "login", "audit"],
  },
  {
    category: "Business",
    title: "Manage Business & Hiring",
    desc: "Recruiter dashboard, talent search, and job postings",
    path: "/manage-business",
    icon: Building2,
    keywords: ["business", "hiring", "recruiter", "company", "candidates"],
  },
];

export default function QuickSearchModal({ isOpen, onClose }) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Filter items based on query
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return searchableItems.slice(0, 7); // Show top default destinations

    return searchableItems.filter((item) => {
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchDesc = item.desc.toLowerCase().includes(q);
      const matchCategory = item.category.toLowerCase().includes(q);
      const matchKeywords = item.keywords.some((kw) => kw.includes(q));
      return matchTitle || matchDesc || matchCategory || matchKeywords;
    });
  }, [query]);

  const handleSelect = useCallback(
    (item) => {
      navigate(item.path);
      onClose();
    },
    [navigate, onClose]
  );

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % (filteredItems.length || 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % (filteredItems.length || 1));
      } else if (e.key === "Enter" && filteredItems[selectedIndex]) {
        e.preventDefault();
        handleSelect(filteredItems[selectedIndex]);
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex, handleSelect, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 pb-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-md"
          />

          {/* Dialog Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative w-full max-w-xl rounded-2xl bg-gradient-to-b from-[#0F1728] via-[#0B111E] to-[#070B14] border border-white/[0.12] shadow-2xl overflow-hidden z-10 flex flex-col max-h-[80vh]"
          >
            {/* Top gradient hairline */}
            <div className="gradient-line-top" />

            {/* Search Input Bar */}
            <div className="relative flex items-center px-4 py-3.5 border-b border-white/[0.08]">
              <Search className="w-5 h-5 text-brand-mint shrink-0 ml-1 mr-3" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                placeholder="Search courses, jobs, spaces, tools... (e.g. 'BIM', 'Leaderboard')"
                aria-label="Quick search navigation"
                className="w-full bg-transparent text-sm text-white placeholder-text-muted focus:outline-none font-medium"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    inputRef.current?.focus();
                  }}
                  className="p-1 rounded-lg hover:bg-white/[0.06] text-text-muted hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : (
                <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono rounded bg-white/[0.06] text-text-faint border border-white/[0.08]">
                  ESC
                </kbd>
              )}
            </div>

            {/* Results List */}
            <div className="overflow-y-auto p-2 space-y-1 divide-y divide-transparent no-scrollbar">
              {filteredItems.length === 0 ? (
                <div className="py-12 text-center">
                  <Sparkles className="w-8 h-8 text-brand-mint/40 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-white">No results found for &ldquo;{query}&rdquo;</p>
                  <p className="text-xs text-text-muted mt-1">
                    Try searching for &ldquo;Courses&rdquo;, &ldquo;Jobs&rdquo;, &ldquo;Network&rdquo;, or &ldquo;Portfolio&rdquo;
                  </p>
                </div>
              ) : (
                filteredItems.map((item, idx) => {
                  const isSelected = idx === selectedIndex;
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.path + item.title}
                      type="button"
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-left transition-all cursor-pointer ${
                        isSelected
                          ? "bg-brand-mint/12 border border-brand-mint/25 text-white"
                          : "border border-transparent hover:bg-white/[0.04] text-text-secondary"
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? "bg-brand-mint/20 text-brand-mint"
                            : "bg-white/[0.04] text-text-muted"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-semibold truncate ${
                              isSelected ? "text-white" : "text-white/90"
                            }`}
                          >
                            {item.title}
                          </span>
                          <span className="text-[10px] font-mono uppercase tracking-wider text-text-faint px-1.5 py-0.2 rounded bg-white/[0.03]">
                            {item.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-text-muted truncate mt-0.5">
                          {item.desc}
                        </p>
                      </div>

                      <ArrowRight
                        className={`w-4 h-4 shrink-0 transition-all ${
                          isSelected
                            ? "text-brand-mint translate-x-0.5 opacity-100"
                            : "text-text-faint opacity-0"
                        }`}
                      />
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer with Keyboard Hints */}
            <div className="px-4 py-2.5 bg-white/[0.02] border-t border-white/[0.06] flex items-center justify-between text-[11px] text-text-faint font-mono">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 rounded bg-white/[0.06] text-text-muted border border-white/[0.06]">↑</kbd>
                  <kbd className="px-1 py-0.5 rounded bg-white/[0.06] text-text-muted border border-white/[0.06]">↓</kbd>
                  <span className="ml-1">Navigate</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] text-text-muted border border-white/[0.06]">↵</kbd>
                  <span className="ml-1">Select</span>
                </span>
              </div>
              <span>Zeitnah Quick Navigation</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
