import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  ExternalLink,
  ShieldCheck,
  MapPin,
  Briefcase,
  Layers,
  Sparkles,
  MessageSquare,
  Users,
  MoreVertical,
  Share2,
  Check,
} from "lucide-react";
import { getUploadUrl } from "../../utils/courseUi";
import RelationshipAction from "./RelationshipAction";
import EcosystemRoleBadge from "./EcosystemRoleBadge";
import { useToast } from "../ui/Toast";
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

/**
 * InfrastructurePeopleCard Component
 * Extra-premium professional discovery card for infrastructure engineers.
 *
 * Card Hierarchy:
 * 1. Avatar (verified / active status)
 * 2. Name & Handle
 * 3. Professional Role & Discipline
 * 4. Infrastructure Sectors & Location
 * 5. Skills & Software Tags
 * 6. Mutual Connections
 * 7. Real Recommendation Reason (only if provided by API)
 * 8. Primary Actions: View Profile, Connect
 * 9. Secondary Actions: Grouped in compact dropdown menu (Message, Full Profile, Copy Link)
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

  // Experience formatting
  const expYears = Number(person?.yearsOfExperience) || 0;
  const expLabel = expYears > 0 ? `${expYears} yr${expYears > 1 ? "s" : ""}` : "Entry level";
  const connCount = person?.connectionsCount ?? person?.connections?.length ?? 0;
  const mutualCount = person?.mutualConnectionsCount ?? 0;

  // Taxonomy tags
  const softwareSkills = Array.isArray(person?.softwareSkills) ? person.softwareSkills : [];
  const technicalSkills = Array.isArray(person?.skills) ? person.skills : [];
  const displayChips = Array.from(new Set([...softwareSkills, ...technicalSkills])).slice(0, 4);

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
    if (!person?.username) return;
    const profileUrl = `${window.location.origin}/network/profile/${encodeURIComponent(person.username)}`;
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
      initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={shouldReduceMotion ? undefined : { y: -3 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="group relative flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#0A0F14]/95 p-5 shadow-xl transition-all duration-300 hover:border-brand-mint/35 hover:shadow-[0_12px_36px_-10px_rgba(159,213,178,0.12)]"
    >
      {/* Top subtle highlight */}
      <div className="absolute top-0 inset-x-5 h-[1px] bg-gradient-to-r from-transparent via-brand-mint/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div>
        {/* ── 1. Header: Avatar + Identity ── */}
        <div className="flex items-start gap-3.5">
          {/* Avatar Container */}
          <div className="relative h-13 w-13 shrink-0">
            <button
              type="button"
              onClick={() => onPreview?.(person)}
              aria-label={`View ${person.name}'s profile preview`}
              className="h-13 w-13 rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#12314C]/40 via-[#0A0F14] to-[#070B14] flex items-center justify-center overflow-hidden group-hover:border-brand-mint/40 transition-colors cursor-pointer"
            >
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt={person.name}
                  onError={() => setAvatarError(true)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-sm font-heading font-extrabold text-brand-mint tracking-wider">
                  {initials}
                </span>
              )}
            </button>

            {person.isVerified ? (
              <span
                className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-mint text-black shadow-sm"
                title="Verified Infrastructure Professional"
                aria-label="Verified Infrastructure Professional"
              >
                <ShieldCheck className="h-3 w-3" />
              </span>
            ) : person.isActive ? (
              <span
                className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#0A0F14] bg-brand-mint shadow-sm"
                title="Active now"
                aria-hidden="true"
              />
            ) : null}
          </div>

          {/* Name & Handle */}
          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() => onPreview?.(person)}
              className="block text-left focus-ring rounded w-full cursor-pointer"
            >
              <h3 className="truncate text-sm sm:text-base font-heading font-bold text-white group-hover:text-brand-mint transition-colors">
                {person.name}
              </h3>
            </button>
            {person.username && (
              <p className="truncate text-xs font-mono text-text-muted mt-0.5">
                @{person.username}
              </p>
            )}

            {/* Ecosystem Persona Badge */}
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              <EcosystemRoleBadge
                role={normalizeUserRole(person)}
                size="xs"
              />
            </div>
          </div>
        </div>

        {/* ── 2. Professional Headline ── */}
        {person.headline && (
          <p className="mt-3 line-clamp-2 text-xs font-medium text-text-secondary leading-relaxed">
            {person.headline}
          </p>
        )}

        {/* ── 3. Infrastructure Taxonomy (Discipline, Sector, Location) ── */}
        <div className="mt-3 space-y-1 text-xs">
          {person.primaryDiscipline && (
            <div className="flex items-center gap-1.5 text-text-secondary truncate">
              <Briefcase className="h-3.5 w-3.5 text-brand-mint/80 shrink-0" aria-hidden="true" />
              <span className="font-semibold text-white/90 truncate">
                {person.primaryDiscipline}
              </span>
              {person.specializations && person.specializations.length > 0 && (
                <span className="text-text-muted truncate">
                  ({person.specializations[0]})
                </span>
              )}
            </div>
          )}

          {person.infrastructureSectors && person.infrastructureSectors.length > 0 && (
            <div className="flex items-center gap-1.5 text-text-muted truncate">
              <Layers className="h-3.5 w-3.5 text-[#F6ED4A]/80 shrink-0" aria-hidden="true" />
              <span className="truncate">
                {person.infrastructureSectors.slice(0, 2).join(", ")}
              </span>
            </div>
          )}

          {person.location && (
            <div className="flex items-center gap-1.5 text-text-muted/80 truncate">
              <MapPin className="h-3.5 w-3.5 text-text-muted shrink-0" aria-hidden="true" />
              <span className="truncate">{person.location}</span>
            </div>
          )}
        </div>

        {/* ── 4. Software & Skills Chips ── */}
        {displayChips.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Skills & Software">
            {displayChips.map((chip) => (
              <span
                key={chip}
                className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 text-[11px] font-medium text-text-muted group-hover:border-brand-mint/20 group-hover:text-white/80 transition-colors"
              >
                {chip}
              </span>
            ))}
          </div>
        )}

        {/* ── 5. Real Recommendation Reason (Rendered ONLY if provided by API) ── */}
        {person.recommendationReason && (
          <div className="mt-3 flex items-start gap-1.5 rounded-xl border border-brand-mint/20 bg-brand-mint/[0.05] p-2.5 text-[11px] text-brand-mint">
            <Sparkles className="h-3.5 w-3.5 text-brand-mint shrink-0 mt-0.5" aria-hidden="true" />
            <span className="line-clamp-2 leading-tight font-medium">
              {person.recommendationReason}
            </span>
          </div>
        )}

        {/* ── 6. Experience & Mutual Connections Summary ── */}
        <div className="mt-3.5 flex items-center justify-between text-[11px] text-text-muted pt-2.5 border-t border-white/[0.04]">
          <span className="font-mono">
            {expLabel} • {connCount} Connection{connCount !== 1 ? "s" : ""}
          </span>

          {mutualCount > 0 && (
            <button
              type="button"
              onClick={() => (onViewMutual ? onViewMutual(person) : onPreview?.(person))}
              className="inline-flex items-center gap-1 text-brand-mint hover:underline font-semibold cursor-pointer"
            >
              <Users className="h-3 w-3" aria-hidden="true" />
              <span>{mutualCount} mutual</span>
            </button>
          )}
        </div>
      </div>

      {/* ── 7. Primary Actions & Compact Secondary Dropdown ── */}
      <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center gap-2">
        {/* Primary Action 1: View Profile Preview */}
        <button
          type="button"
          onClick={() => onPreview?.(person)}
          className="flex-1 min-h-[38px] flex items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.03] py-2 px-3 text-xs font-semibold text-white hover:bg-white/[0.08] hover:border-brand-mint/40 transition-all cursor-pointer focus-ring"
        >
          View Profile
        </button>

        {/* Primary Action 2: Real Relationship Action (Connect / Pending / Connected) */}
        <div className="flex-1">
          <RelationshipAction
            targetUserId={personId}
            connectionId={person.connectionId}
            initialState={person.relationshipState || person.connectionStatus || "none"}
            studentName={person.name}
            variant="compact"
          />
        </div>

        {/* Secondary Actions: Compact Kebab Menu */}
        <div ref={menuRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={`More actions for ${person.name}`}
            aria-haspopup="true"
            aria-expanded={isMenuOpen}
            className="h-[38px] w-[38px] flex items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.02] text-text-muted hover:text-white hover:border-white/[0.18] hover:bg-white/[0.06] transition-all cursor-pointer focus-ring"
          >
            <MoreVertical className="h-4 w-4" aria-hidden="true" />
          </button>

          {/* Compact Dropdown Menu */}
          {isMenuOpen && (
            <div
              role="menu"
              className="absolute right-0 bottom-full mb-1.5 w-48 rounded-2xl border border-white/[0.1] bg-[#0E1522] p-1.5 shadow-2xl backdrop-blur-2xl z-50 animate-fade-in"
            >
              {/* Option A: Message / Request */}
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

              {/* Option B: Open Full Profile Link */}
              {person.username && (
                <Link
                  to={`/network/profile/${encodeURIComponent(person.username)}`}
                  role="menuitem"
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-white/90 hover:bg-white/[0.06] hover:text-white transition-colors cursor-pointer text-left"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-text-muted" />
                  <span>Full Profile</span>
                </Link>
              )}

              {/* Option C: Copy Profile Link */}
              {person.username && (
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
              )}
            </div>
          )}
        </div>
      </div>
    </motion.article>
  );
}
