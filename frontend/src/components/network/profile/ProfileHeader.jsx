import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  MapPin,
  Calendar,
  Share2,
  ExternalLink,
  Edit3,
  MoreVertical,
  Check,
} from "lucide-react";
import { useToast } from "../../ui/Toast";
import RelationshipAction from "../RelationshipAction";
import ProfileNetworkStats from "../ProfileNetworkStats";

/**
 * Derives user initials from full name.
 * @param {string} name
 * @returns {string}
 */
function getInitials(name) {
  if (!name) return "ST";
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

/**
 * Formats ISO date into human readable joined date (e.g. "Joined September 2025").
 * @param {string} dateStr
 * @returns {string|null}
 */
function formatJoinedDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return `Joined ${d.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  })}`;
}

/**
 * ProfileHeader Component
 * Restrained, cinematic header for student profile with ambient lighting, avatar,
 * handles, relationship actions, and contextual overflow options.
 *
 * @param {Object} props
 * @param {Object} props.profile - PublicNetworkProfile object
 * @param {boolean} props.isOwnProfile - Whether the viewer is viewing their own profile
 */
export default function ProfileHeader({ profile, isOwnProfile = false }) {
  const user = profile?.user || {};
  const relationship = profile?.relationship || { state: "none" };
  const toast = useToast();

  const [avatarError, setAvatarError] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const menuRef = useRef(null);

  // Close dropdown menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsMenuOpen(false);
      }
    }
    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isMenuOpen]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      toast.success("Link Copied", "Profile URL copied to clipboard.");
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast.error("Copy Failed", "Could not copy profile link to clipboard.");
    }
    setIsMenuOpen(false);
  };

  const initials = getInitials(user.name);
  const joinedLabel = formatJoinedDate(user.joinedAt);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-bg-surface/90 shadow-2xl backdrop-blur-2xl">
      {/* ── AMBIENT COVER / VISUAL BACKDROP ── */}
      <div className="relative h-44 sm:h-56 md:h-64 w-full overflow-hidden bg-gradient-to-br from-[#0B0F19] via-[#0F172A] to-[#070B14]">
        {/* If user has a real cover photo, display it */}
        {user.backgroundImage ? (
          <img
            src={user.backgroundImage}
            alt={`${user.name}'s cover`}
            className="h-full w-full object-cover opacity-60"
          />
        ) : (
          /* Subtle ambient lighting & fine grid geometry */
          <>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.25),rgba(255,255,255,0))]" />
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-72 w-96 rounded-full bg-brand-mint/10 blur-3xl pointer-events-none" />
            <div className="absolute inset-0 opacity-[0.03] [background-image:linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] [background-size:24px_24px]" />
          </>
        )}

        {/* Ambient bottom shadow gradient for smooth blend */}
        <div className="absolute inset-0 bg-gradient-to-t from-bg-surface via-transparent to-transparent opacity-90" />
      </div>

      {/* ── PROFILE INFO CONTAINER ── */}
      <div className="relative px-6 pb-6 sm:px-8 sm:pb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 -mt-16 sm:-mt-20">
          {/* Avatar with Verified Badge */}
          <div className="relative shrink-0">
            {user.avatarUrl && !avatarError ? (
              <img
                src={user.avatarUrl}
                alt={`${user.name}'s profile avatar`}
                onError={() => setAvatarError(true)}
                className="h-28 w-28 sm:h-36 sm:w-36 rounded-3xl object-cover border-4 border-bg-surface bg-bg-surface shadow-2xl"
              />
            ) : (
              <div
                className="flex h-28 w-28 sm:h-36 sm:w-36 items-center justify-center rounded-3xl border-4 border-bg-surface bg-gradient-to-br from-brand-mint/25 via-white/[0.08] to-brand-mint/10 font-heading font-black text-white text-3xl sm:text-4xl shadow-2xl"
                aria-hidden="true"
              >
                {initials}
              </div>
            )}

            {/* Verified Student Badge */}
            {user.isVerified && (
              <span
                className="absolute bottom-1 right-1 flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-xl bg-brand-mint text-bg-base shadow-lg border-2 border-bg-surface"
                title="Verified Student"
              >
                <ShieldCheck className="h-4 w-4" />
              </span>
            )}
          </div>

          {/* Action Buttons Row */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            {isOwnProfile ? (
              <Link
                to="/profile/edit"
                className="inline-flex items-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.06] px-4 py-2.5 text-xs font-bold text-white hover:bg-white/[0.1] hover:border-brand-mint/40 transition-all focus-ring"
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span>Edit Profile</span>
              </Link>
            ) : (
              <RelationshipAction
                targetUserId={user.id}
                connectionId={relationship.connectionId}
                initialState={relationship.state || "none"}
                studentName={user.name}
                variant="full"
              />
            )}

            {/* More / Overflow Actions Dropdown */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label="Profile options"
                aria-expanded={isMenuOpen}
                className="flex items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.04] p-2.5 text-text-muted hover:text-white hover:bg-white/[0.08] hover:border-white/[0.2] transition-all focus-ring"
              >
                <MoreVertical className="h-4 w-4" />
              </button>

              {isMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-52 rounded-2xl border border-white/[0.1] bg-bg-elevated/95 p-1.5 shadow-2xl backdrop-blur-xl z-30"
                >
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-text-secondary hover:bg-white/[0.06] hover:text-white transition-colors text-left"
                  >
                    {copiedLink ? (
                      <Check className="h-3.5 w-3.5 text-brand-mint" />
                    ) : (
                      <Share2 className="h-3.5 w-3.5" />
                    )}
                    <span>{copiedLink ? "Link Copied" : "Share Profile"}</span>
                  </button>

                  {user.username && (
                    <Link
                      to={`/u/${encodeURIComponent(user.username)}`}
                      onClick={() => setIsMenuOpen(false)}
                      className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-text-secondary hover:bg-white/[0.06] hover:text-white transition-colors text-left"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>View Public Resume</span>
                    </Link>
                  )}
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* Name, Handle, Headline, and Contextual Badges */}
        <div className="mt-4 space-y-2">
          <div className="flex flex-wrap items-baseline gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-heading font-black text-white tracking-tight">
              {user.name}
            </h1>
            {user.username && (
              <span className="font-mono text-sm text-text-muted">
                @{user.username}
              </span>
            )}
          </div>

          {/* Headline */}
          {user.headline && (
            <p className="max-w-2xl text-sm sm:text-base font-medium text-text-secondary leading-relaxed">
              {user.headline}
            </p>
          )}

          {/* Contextual Meta Tags (Location, Joined Date) */}
          <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-text-muted">
            {user.location && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-text-faint shrink-0" />
                <span>{user.location}</span>
              </div>
            )}
            {joinedLabel && (
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-text-faint shrink-0" />
                <span>{joinedLabel}</span>
              </div>
            )}
          </div>

          {/* ── Network Statistics (Followers, Following, Connections) ── */}
          <div className="pt-3 max-w-md w-full">
            <ProfileNetworkStats
              userIdOrUsername={user.id || user.username}
              profileName={user.name}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
