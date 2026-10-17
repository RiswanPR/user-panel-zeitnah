import { useMemo } from "react";
import { useSearchParams, useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Shield } from "lucide-react";
import ProfileNav from "../../components/profile/ProfileNav";
import AccountNav from "../../components/profile/AccountNav";
import VerificationCenterPage from "./VerificationCenterPage";
import AuditLogs from "../audit/AuditLogs";
import ActiveSessions from "../sessions/ActiveSessions";
import ThemeSelector from "../../components/settings/ThemeSelector";

const VALID_SECTIONS = ["verification", "security", "sessions", "appearance"];

/**
 * Zeitnah Unified Account Page.
 * Houses Verification, Security (Audit Logs), and Active Sessions in a single,
 * cohesive, and responsive account management experience with dedicated internal navigation.
 */
export default function AccountPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { section: routeSection } = useParams();
  const navigate = useNavigate();

  const activeSection = useMemo(() => {
    const raw = (routeSection || searchParams.get("section") || "").toLowerCase().trim();
    if (VALID_SECTIONS.includes(raw)) {
      return raw;
    }
    return "verification";
  }, [routeSection, searchParams]);

  const handleSelectSection = (sectionId) => {
    if (!VALID_SECTIONS.includes(sectionId)) return;
    setSearchParams({ section: sectionId });
  };

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto pb-16">
      {/* ── 01. TOP-LEVEL PROFILE NAVIGATION (Highlights Account) ── */}
      <ProfileNav />

      {/* ── 02. UNIFIED ACCOUNT HERO BANNER ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-surface-card border border-border p-6 sm:p-8 shadow-sm"
      >
        <div
          className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-brand-mint/35 to-transparent pointer-events-none"
          aria-hidden="true"
        />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-mint/10 border border-brand-mint/20 text-brand-mint text-xs font-semibold uppercase tracking-wider">
              <Shield className="w-3.5 h-3.5" />
              Unified Account Area
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-black text-text-primary tracking-tight">
              Account, Trust & Security
            </h1>
            <p className="text-text-muted text-xs sm:text-sm max-w-2xl leading-relaxed">
              Manage your engineering credentials, audit trail timeline, connected devices, and interface theme preferences.
            </p>
          </div>
        </div>
      </motion.div>

      {/* ── 03. ACCOUNT INTERNAL SUB-NAVIGATION ── */}
      <AccountNav
        activeSection={activeSection}
        onSelectSection={handleSelectSection}
      />

      {/* ── 04. ACTIVE SECTION VIEW ── */}
      <div className="w-full">
        <AnimatePresence mode="wait">
          {activeSection === "verification" && (
            <motion.div
              key="section-verification"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <VerificationCenterPage hideProfileNav={true} />
            </motion.div>
          )}

          {activeSection === "security" && (
            <motion.div
              key="section-security"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <AuditLogs hideProfileNav={true} />
            </motion.div>
          )}

          {activeSection === "sessions" && (
            <motion.div
              key="section-sessions"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <ActiveSessions hideProfileNav={true} />
            </motion.div>
          )}

          {activeSection === "appearance" && (
            <motion.div
              key="section-appearance"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <ThemeSelector />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
