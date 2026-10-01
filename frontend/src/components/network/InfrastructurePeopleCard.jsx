import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  ExternalLink,
  ShieldCheck,
  MapPin,
  Building2,
  Sparkles,
  MessageSquare,
  Users,
  MoreVertical,
  Share2,
  Check,
  Eye,
} from "lucide-react";
import { getUploadUrl } from "../../utils/courseUi";
import RelationshipAction from "./RelationshipAction";
import EcosystemRoleBadge from "./EcosystemRoleBadge";
import { useToast } from "../ui/Toast";
import {
  normalizeUserRole,
  getCanonicalProfileUrl,
  getProfileIdentifier,
} from "../../utils/roleNavigation";

function getInitials(name) {
  if (!name) return "Z";
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/**
 * InfrastructurePeopleCard Component
 * Luxury professional identity card for Zeitnah Network.
 *
 * Implements:
 * - Section 4: Editorial identity structure with generous whitespace.
 * - Section 5: Heroic avatar (64px desktop / 56px tablet / 52px mobile) with clean circular crop & subtle depth.
 * - Section 9: 180-220ms ease-out hover interaction (translateY(-2px), avatar scale 1.02, subtle border).
 * - Section 10: Subtle surface layering (no excessive blur or neon).
 * - Section 13 & 21: Full relationship state synchronization via normalized state machine.
 * - Section 24 & 25: Canonical routing and accessibility.
 */
export default function InfrastructurePeopleCard({
  person,
  onPreview,
  onMessageRequest,
  onViewMutual,
}) {
  const shouldReduceMotion = useReducedMotion();
  const navigate = useNavigate();
  const toast = useToast();
  const [avatarError, setAvatarError] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef(null);

  const personId = person?.id || person?._id;
  const avatarSrc = person?.avatarUrl && !avatarError ? getUploadUrl(person.avatarUrl) : null;
  const initials = getInitials(person?.name);
  const canonicalUrl = getCanonicalProfileUrl(person);

  // Close kebab menu on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsMenuOpen(false);
      }
    }
    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

  // Social proof & mutuals (only render if real data exists)
  const mutualCount = Number(person?.mutualConnectionsCount) || 0;
  const expYears = Number(person?.yearsOfExperience) || 0;
  const expLabel = expYears > 0 ? `${expYears} yr${expYears > 1 ? "s" : ""} exp` : null;

  // Selected discipline & role headline
  const primaryRole = person?.primaryDiscipline || person?.headline || person?.currentRole || "Infrastructure Professional";
  const organizationName = person?.institution || person?.company || null;
  const locationLabel = person?.location || null;

  // Key taxonomy tags (max 2 chips to avoid visual clutter)
  const softwareSkills = Array.isArray(person?.softwareSkills) ? person.softwareSkills : [];
  const technicalSkills = Array.isArray(person?.skills) ? person.skills : [];
  const displayChips = Array.from(new Set([...softwareSkills, ...technicalSkills]))
    .filter(Boolean)
    .slice(0, 2);

  // Message capability
  const canMessage = person?.canMessage !== false;
  const messageAction =
    person?.messageAction ||
    (person?.relationshipState === "connected" ? "message" : "request");

  const handleMessageClick = () => {
    setIsMenuOpen(false);
    if (messageAction === "request") {
      onMessageRequest?.(person);
    } else {
      navigate(`/messages?user=${personId}`);
    }
  };

  const handleCopyLink = async () => {
    setIsMenuOpen(false);
    const identifier = getProfileIdentifier(person);
    if (!identifier) return;
    const profileUrl = `${window.location.origin}${canonicalUrl}`;
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      toast.success("Link Copied", "Profile link copied to clipboard.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Error", "Could not copy link.");
    }
  };

  return (
    <motion.article
      initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={shouldReduceMotion ? undefined : { y: -2 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="group relative flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#0A0F14]/95 p-5 sm:p-6 shadow-lg transition-all duration-200 hover:border-brand-mint/35 hover:shadow-[0_8px_30px_rgba(0,0,0,0.45)] focus-within:border-brand-mint/40"
    >
      {/* ── Subtle Top Hairline Highlight ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 inset-x-6 h-[1px] bg-gradient-to-r from-transparent via-brand-mint/25 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200"
      />

      <div className="flex flex-col items-center text-center">
        {/* ── 1. Avatar (56–64px) with circular crop and subtle depth ── */}
        <div className="relative mb-3.5">
          <Link
            to={canonicalUrl}
            aria-label={`View ${person.name}'s profile`}
            className="h-16 w-16 sm:h-16 sm:w-16 rounded-full border border-white/[0.12] bg-[#070B14] flex items-center justify-center overflow-hidden group-hover:border-brand-mint/45 transition-colors block focus-ring shadow-sm"
          >
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt={person.name}
                onError={() => setAvatarError(true)}
                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
              />
            ) : (
              <span className="text-base font-heading font-extrabold text-brand-mint tracking-wider select-none">
                {initials}
              </span>
            )}
          </Link>

          {/* Verification Badge */}
          {person.isVerified ? (
            <span
              className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-mint text-black shadow-sm ring-2 ring-[#0A0F14]"
              title="Verified Infrastructure Professional"
              aria-label="Verified Infrastructure Professional"
            >
              <ShieldCheck className="h-2.5 w-2.5" />
            </span>
          ) : person.isActive ? (
            <span
              className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#0A0F14] bg-brand-mint shadow-sm"
              title="Active now"
              aria-hidden="true"
            />
          ) : null}
        </div>

        {/* ── 2. Identity: Name & Handle ── */}
        <Link
          to={canonicalUrl}
          className="focus-ring rounded max-w-full truncate px-1"
        >
          <h3 className="font-heading font-bold text-base sm:text-lg text-white group-hover:text-brand-mint transition-colors truncate tracking-tight">
            {person.name}
          </h3>
        </Link>

        {person.username && (
          <Link
            to={canonicalUrl}
            className="text-xs font-mono text-text-muted hover:text-brand-mint/80 transition-colors truncate block mt-0.5"
          >
            @{person.username}
          </Link>
        )}

        {/* Role Tag & Experience */}
        <div className="mt-2 flex items-center justify-center gap-1.5 flex-wrap">
          <EcosystemRoleBadge role={normalizeUserRole(person)} size="xs" />
          {expLabel && (
            <span className="text-[10px] font-mono text-text-muted/80 bg-white/[0.03] border border-white/[0.06] px-1.5 py-0.2 rounded-md">
              {expLabel}
            </span>
          )}
        </div>

        {/* ── 3. Professional Role & Organization ── */}
        <div className="mt-3 space-y-1 w-full max-w-[260px]">
          <p className="text-xs sm:text-sm font-semibold text-white/90 truncate leading-snug">
            {primaryRole}
          </p>

          {organizationName && (
            <p className="text-xs text-text-muted truncate flex items-center justify-center gap-1">
              <Building2 className="w-3 h-3 text-text-muted/70 shrink-0" aria-hidden="true" />
              <span className="truncate">{organizationName}</span>
            </p>
          )}

          {locationLabel && (
            <p className="text-[11px] text-text-muted/80 truncate flex items-center justify-center gap-1">
              <MapPin className="w-3 h-3 text-text-muted/60 shrink-0" aria-hidden="true" />
              <span className="truncate">{locationLabel}</span>
            </p>
          )}
        </div>

        {/* ── 4. Key Taxonomy Chips (Restrained, Max 2) ── */}
        {displayChips.length > 0 && (
          <div className="mt-3 flex items-center justify-center gap-1.5 flex-wrap">
            {displayChips.map((chip) => (
              <span
                key={chip}
                className="text-[10px] font-mono text-text-muted border border-white/[0.06] bg-white/[0.02] px-2 py-0.5 rounded-md"
              >
                {chip}
              </span>
            ))}
          </div>
        )}

        {/* ── 5. Social Proof: Mutuals ── */}
        {mutualCount > 0 && (
          <div className="mt-3 flex items-center justify-center gap-1 text-[11px] text-brand-mint font-semibold">
            <Users className="h-3 w-3 text-brand-mint/80 shrink-0" aria-hidden="true" />
            <button
              type="button"
              onClick={() => (onViewMutual ? onViewMutual(person) : onPreview?.(person))}
              className="hover:underline cursor-pointer"
            >
              {mutualCount} mutual connection{mutualCount !== 1 ? "s" : ""}
            </button>
          </div>
        )}

        {/* Recommendation Reason (if genuine signal exists) */}
        {person.recommendationReason && (
          <div className="mt-2.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-brand-mint/20 bg-brand-mint/[0.04] text-[10px] font-medium text-brand-mint leading-tight max-w-[240px] truncate">
            <Sparkles className="w-3 h-3 text-brand-mint shrink-0" aria-hidden="true" />
            <span className="truncate">{person.recommendationReason}</span>
          </div>
        )}
      </div>

      {/* ── 6. Primary Action Footer ── */}
      <div className="mt-5 pt-3.5 border-t border-white/[0.06] flex items-center gap-2">
        {/* Secondary: Preview */}
        <button
          type="button"
          onClick={() => onPreview?.(person)}
          aria-label={`Preview ${person.name}'s profile`}
          className="flex-1 min-h-[38px] flex items-center justify-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] py-1.5 px-3 text-xs font-semibold text-text-muted hover:text-white hover:bg-white/[0.07] hover:border-white/[0.16] transition-all cursor-pointer focus-ring"
        >
          <Eye className="w-3.5 h-3.5 text-text-muted" aria-hidden="true" />
          <span>Preview</span>
        </button>

        {/* Primary: Relationship Action */}
        <div className="flex-1">
          <RelationshipAction
            targetUserId={personId}
            connectionId={person.connectionId}
            initialState={person.relationshipState || person.connectionStatus || "none"}
            studentName={person.name}
            variant="compact"
          />
        </div>

        {/* Kebab Utility Menu */}
        <div ref={menuRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={`More options for ${person.name}`}
            aria-haspopup="true"
            aria-expanded={isMenuOpen}
            className="h-[38px] w-[38px] flex items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.02] text-text-muted hover:text-white hover:border-white/[0.14] hover:bg-white/[0.05] transition-all cursor-pointer focus-ring"
          >
            <MoreVertical className="h-4 w-4" aria-hidden="true" />
          </button>

          {isMenuOpen && (
            <div
              role="menu"
              className="absolute right-0 bottom-full mb-1.5 w-48 rounded-2xl border border-white/[0.1] bg-[#0E1522] p-1.5 shadow-2xl backdrop-blur-2xl z-50 animate-fade-in"
            >
              {canMessage ? (
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleMessageClick}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-white/90 hover:bg-white/[0.06] hover:text-white transition-colors cursor-pointer text-left"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-brand-mint" />
                  <span>{messageAction === "message" ? "Send Message" : "Message Request"}</span>
                </button>
              ) : (
                <div className="px-3 py-2 text-[11px] text-text-muted select-none">
                  Messaging restricted
                </div>
              )}

              <Link
                to={canonicalUrl}
                role="menuitem"
                onClick={() => setIsMenuOpen(false)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-white/90 hover:bg-white/[0.06] hover:text-white transition-colors cursor-pointer text-left"
              >
                <ExternalLink className="w-3.5 h-3.5 text-text-muted" />
                <span>Full Profile</span>
              </Link>

              <button
                type="button"
                role="menuitem"
                onClick={handleCopyLink}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-white/90 hover:bg-white/[0.06] hover:text-white transition-colors cursor-pointer text-left"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-brand-mint" />
                ) : (
                  <Share2 className="w-3.5 h-3.5 text-text-muted" />
                )}
                <span>{copied ? "Link Copied" : "Copy Link"}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.article>
  );
}
