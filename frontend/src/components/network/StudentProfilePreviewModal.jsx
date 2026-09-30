import { useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  X,
  BookOpen,
  GraduationCap,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Clock,
  MessageSquare,
  Briefcase,
  Layers,
} from "lucide-react";
import { getUploadUrl } from "../../utils/courseUi";
import RelationshipAction from "./RelationshipAction";
import EcosystemRoleBadge from "./EcosystemRoleBadge";
import { normalizeUserRole } from "../../utils/roleNavigation";

function getInitials(name) {
  if (!name) return "Z";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatLastActive(lastActiveAt) {
  if (!lastActiveAt) return "Active recently";
  const diffMs = Date.now() - new Date(lastActiveAt).getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffHours < 1) return "Active recently";
  if (diffHours < 24) return "Active today";
  if (diffHours < 168) return "Active this week";
  return "Active member";
}

/**
 * StudentProfilePreviewModal Component
 * Accessible modal showing an engineer/student public profile preview.
 *
 * Requirements Met:
 * - Safe user ID resolution: `student.id || student._id`.
 * - Accessible dialog attributes (`role="dialog"`, `aria-modal="true"`, `aria-labelledby`).
 * - Body scroll lock and ESC key listener.
 * - Keyboard focus trap.
 */
export default function StudentProfilePreviewModal({
  student,
  onClose,
  onMessageRequest,
}) {
  const shouldReduceMotion = useReducedMotion();
  const navigate = useNavigate();
  const modalRef = useRef(null);

  const studentId = student?.id || student?._id;

  // Handle ESC and basic Tab trap
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Tab" && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Lock body scroll
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  if (!student) return null;

  const avatarSrc = student.avatarUrl ? getUploadUrl(student.avatarUrl) : null;
  const initials = getInitials(student.name);
  const activeLabel = formatLastActive(student.lastActiveAt);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-student-name"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <motion.div
        ref={modalRef}
        initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="relative w-full max-w-lg rounded-3xl border border-white/[0.1] bg-[#0A0F14] p-6 sm:p-8 shadow-2xl backdrop-blur-2xl overflow-hidden max-h-[90vh] overflow-y-auto no-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top subtle highlight */}
        <div className="absolute top-0 inset-x-8 h-[2px] bg-gradient-to-r from-transparent via-brand-mint/40 to-transparent" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close preview"
          className="absolute top-5 right-5 flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-text-muted hover:bg-white/[0.12] hover:text-white transition-colors cursor-pointer focus-ring"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Profile Header */}
        <div className="flex items-start gap-4">
          <div className="relative h-16 w-16 shrink-0">
            <div className="h-16 w-16 rounded-2xl border border-brand-mint/30 bg-[#070B14] flex items-center justify-center overflow-hidden shadow-inner">
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt={student.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-lg font-heading font-extrabold text-brand-mint">
                  {initials}
                </span>
              )}
            </div>
            {student.isVerified && (
              <div
                className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-mint text-black shadow-sm"
                title="Verified Professional"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 pr-6">
            <div className="flex items-center gap-2">
              <h2
                id="preview-student-name"
                className="text-lg sm:text-xl font-heading font-extrabold text-white truncate"
              >
                {student.name}
              </h2>
            </div>

            {student.username && (
              <p className="text-xs font-mono text-text-muted mt-0.5">
                @{student.username}
              </p>
            )}

            {student.headline && (
              <p className="text-xs font-medium text-text-secondary mt-1.5 leading-relaxed">
                {student.headline}
              </p>
            )}
          </div>
        </div>

        {/* Status & Level Badge Row */}
        <div className="mt-5 flex flex-wrap items-center gap-2 pt-4 border-t border-white/[0.06]">
          <EcosystemRoleBadge role={normalizeUserRole(student)} size="xs" />
          {student.level && (
            <span className="inline-flex items-center gap-1 rounded-lg border border-[#F6ED4A]/30 bg-[#F6ED4A]/10 px-2.5 py-1 text-[11px] font-semibold text-[#F6ED4A]">
              <Sparkles className="h-3 w-3" />
              <span>{student.level}</span>
            </span>
          )}

          <span className="inline-flex items-center gap-1 rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-text-muted">
            <Clock className="h-3 w-3" />
            <span>{activeLabel}</span>
          </span>

          {student.primaryDiscipline && (
            <span className="inline-flex items-center gap-1 rounded-lg border border-brand-mint/20 bg-brand-mint/10 px-2.5 py-1 text-[11px] font-semibold text-brand-mint">
              <Briefcase className="h-3 w-3" />
              <span>{student.primaryDiscipline}</span>
            </span>
          )}
        </div>

        {/* Educational & Corporate Details */}
        <div className="mt-5 space-y-2.5">
          {student.course && (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-mint/10 text-brand-mint">
                <BookOpen className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
                  Enrolled Program / Course
                </p>
                <p className="text-xs font-semibold text-white truncate mt-0.5">
                  {student.course}
                </p>
              </div>
            </div>
          )}

          {student.institution && (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-white/80">
                <GraduationCap className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
                  Institution / University
                </p>
                <p className="text-xs font-semibold text-white truncate mt-0.5">
                  {student.institution}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Skills / Interests */}
        {(student.interests?.length > 0 || student.skills?.length > 0) && (
          <div className="mt-5">
            <p className="text-xs font-mono uppercase tracking-wider text-text-muted mb-2">
              Core Competencies & Interests
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(student.skills || student.interests || []).map((skill) => (
                <span
                  key={skill}
                  className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-white/80"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Actions Footer */}
        <div className="mt-6 pt-5 border-t border-white/[0.08] flex items-center gap-3">
          {/* Safe Relationship Action */}
          <div className="flex-1">
            <RelationshipAction
              targetUserId={studentId}
              connectionId={student.connectionId}
              initialState={student.relationshipState || student.connectionStatus || "none"}
              studentName={student.name}
              variant="full"
            />
          </div>

          {/* Message Action */}
          {student.canMessage !== false ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                if (student.messageAction === "request" && onMessageRequest) {
                  onMessageRequest(student);
                } else {
                  navigate(`/messages?user=${studentId}`);
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-brand-mint/40 bg-brand-mint/10 py-2.5 px-4 text-xs font-semibold text-brand-mint hover:bg-brand-mint/20 transition-all cursor-pointer focus-ring"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>{student.messageAction === "request" ? "Request" : "Message"}</span>
            </button>
          ) : (
            <span
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.05] bg-white/[0.02] py-2.5 px-3 text-xs text-text-faint cursor-not-allowed opacity-50"
              title="Messaging restricted by user's privacy settings"
            >
              <MessageSquare className="h-3.5 w-3.5" />
            </span>
          )}

          {/* View Full Profile Link */}
          {student.username && (
            <Link
              to={`/network/profile/${encodeURIComponent(student.username)}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.04] py-2.5 px-4 text-xs font-semibold text-white hover:bg-white/[0.08] hover:border-brand-mint/30 transition-all cursor-pointer focus-ring"
            >
              <span>Full Profile</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </motion.div>
    </div>
  );
}
