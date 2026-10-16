import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Camera,
  CheckCircle2,
  Edit3,
  ExternalLink,
  Share2,
  RefreshCw,
  MapPin,
  Briefcase,
  Globe,
  Pencil,
  LogOut,
  Send,
  Flag,
  MessageSquare,
  ShieldCheck,
  Award,
  Compass,
  Building2,
} from "lucide-react";
import { getUploadUrl } from "../../utils/courseUi";
import EcosystemRoleBadge from "../network/EcosystemRoleBadge";
import AvailabilityBadge from "../network/AvailabilityBadge";
import ProfileNetworkStats from "../network/ProfileNetworkStats";
import RelationshipAction from "../network/RelationshipAction";
import ProfileAvatar from "./ProfileAvatar";
import { resolveDisplayIdentity } from "../../utils/professionalIdentity";

/**
 * Animated XP Counter for smooth point transitions.
 */
function XPCountUp({ value = 0 }) {
  return <span>{Number(value || 0).toLocaleString()}</span>;
}

export default function ProfileHero({
  profile = {},
  isOwner = false,
  // Owner upload hooks
  onAvatarUpload,
  onBannerUpload,
  isAvatarUploading = false,
  isBannerUploading = false,
  avatarError = false,
  setAvatarError,
  // Owner actions
  onShare,
  onChangeUsername,
  onLogout,
  // Visitor actions
  onSendMessage,
  onSendOpportunity,
  onWriteRecommendation,
  onReport,
  className = "",
}) {
  const avatarFileRef = useRef(null);
  const bannerFileRef = useRef(null);

  const gamification = profile.gamification || {};
  const bannerUrl = getUploadUrl(profile.backgroundImage);
  const displayIdentity = resolveDisplayIdentity(profile);
  const displayTitle = displayIdentity.title || profile.currentRole;

  const initials = profile.name
    ? profile.name
        .split(" ")
        .filter(Boolean)
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "ZU";

  return (
    <section
      aria-label="Profile Header"
      className={`relative overflow-hidden rounded-3xl bg-[#0A0F18]/95 border border-white/[0.08] shadow-[0_16px_48px_rgba(0,0,0,0.5)] ${className}`}
    >
      {/* Subtle top ambient mint gradient line */}
      <div
        className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-brand-mint/40 to-transparent pointer-events-none z-20"
        aria-hidden="true"
      />

      {/* ── 1. COVER BANNER ── */}
      <div className="relative h-48 sm:h-60 md:h-72 lg:h-80 w-full overflow-hidden bg-[#070B14]">
        {bannerUrl ? (
          <img
            src={bannerUrl}
            alt="Profile Cover"
            className="w-full h-full object-cover object-center"
          />
        ) : (
          <div className="w-full h-full relative overflow-hidden bg-[#070B14] flex items-center justify-center">
            {/* Subtle architectural grid pattern */}
            <div
              className="absolute inset-0 opacity-[0.06] pointer-events-none"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(159,213,178,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(159,213,178,0.4) 1px, transparent 1px)",
                backgroundSize: "32px 32px",
              }}
            />
            {/* Ambient lighting meshes */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-10%,rgba(159,213,178,0.18),transparent)]" />
            <div className="absolute right-12 bottom-8 w-72 h-72 rounded-full bg-brand-yellow/[0.04] blur-3xl pointer-events-none" />
            <div className="absolute left-10 top-6 w-72 h-72 rounded-full bg-brand-mint/[0.05] blur-3xl pointer-events-none" />
            <div className="text-center opacity-30 select-none pointer-events-none">
              <span className="font-mono text-[11px] sm:text-xs uppercase tracking-[0.35em] text-brand-mint/90 font-bold">
                Zeitnah Identity
              </span>
            </div>
          </div>
        )}

        {/* Top vignette to maintain contrast for banner controls */}
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />

        {/* Ambient bottom fade for contrast against avatar and profile card */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0F18] via-[#0A0F18]/50 to-transparent pointer-events-none" />

        {/* Banner Change Trigger for Owner */}
        {isOwner && onBannerUpload && (
          <div className="absolute top-4 right-4 sm:top-5 sm:right-5 z-20">
            <button
              type="button"
              onClick={() => bannerFileRef.current?.click()}
              disabled={isBannerUploading}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-black/60 hover:bg-black/85 backdrop-blur-md border border-white/15 hover:border-brand-mint/40 text-xs font-semibold text-white transition-all cursor-pointer shadow-lg focus-ring"
              title="Upload cover banner"
              aria-label="Upload cover banner"
            >
              {isBannerUploading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-brand-mint" />
              ) : (
                <Camera className="w-3.5 h-3.5 text-brand-mint" />
              )}
              <span className="hidden sm:inline">Change Cover</span>
            </button>
            <input
              ref={bannerFileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={onBannerUpload}
            />
          </div>
        )}
      </div>

      {/* ── 2. HERO IDENTITY BODY ── */}
      <div className="relative px-5 sm:px-8 lg:px-10 pb-6 sm:pb-8 pt-0">
        <div className="flex flex-col lg:flex-row items-center lg:items-start justify-between gap-6">
          {/* Left Column: Circular Avatar + Identity Information */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-6 text-center sm:text-left min-w-0 w-full flex-1">
            {/* Perfectly Circular Avatar with Availability Frame */}
            <div className="-mt-14 sm:-mt-18 md:-mt-22 lg:-mt-24 shrink-0 relative group z-10 select-none">
              <ProfileAvatar
                src={profile.avatar}
                name={profile.name}
                initials={initials}
                size="xl"
                shape="circle"
                availability={profile.availability}
                className="border-2 sm:border-4 border-[#0A0F18] shadow-2xl"
              >
                {/* Owner Avatar Change Overlay */}
                {isOwner && onAvatarUpload && (
                  <>
                    <button
                      type="button"
                      onClick={() => avatarFileRef.current?.click()}
                      disabled={isAvatarUploading}
                      className={`absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center transition-opacity cursor-pointer text-white focus-ring z-20 ${
                        isAvatarUploading
                          ? "opacity-100 pointer-events-auto"
                          : "opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto"
                      }`}
                      title="Change profile photo"
                      aria-label="Change profile photo"
                    >
                      {isAvatarUploading ? (
                        <RefreshCw className="w-6 h-6 animate-spin text-brand-mint" />
                      ) : (
                        <>
                          <Camera className="w-6 h-6 text-brand-mint mb-1" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Change</span>
                        </>
                      )}
                    </button>
                    <input
                      ref={avatarFileRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={onAvatarUpload}
                    />
                  </>
                )}
              </ProfileAvatar>
            </div>

            {/* Structured Profile Information Hierarchy */}
            <div className="pt-1 sm:pt-2 space-y-2.5 min-w-0 flex-1 w-full">
              {/* Primary Name Line with Verified and Availability Badges */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                <h1 className="font-heading font-black text-2xl sm:text-3xl md:text-[34px] lg:text-4xl text-white tracking-tight leading-tight break-words">
                  {profile.name || "Zeitnah Member"}
                </h1>
                {profile.isVerified && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-brand-mint/30 bg-brand-mint/10 px-2.5 py-0.5 text-xs font-bold text-brand-mint shadow-sm shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verified
                  </span>
                )}
                {/* Open to Work / Open to Hiring Status Badge */}
                <AvailabilityBadge availability={profile.availability} size="sm" />
              </div>

              {/* Handle & Quick Edit */}
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className="font-mono text-xs sm:text-sm font-bold text-brand-mint/90 tracking-wide">
                  @{profile.username || "member"}
                </span>
                {isOwner && onChangeUsername && (
                  <button
                    type="button"
                    onClick={onChangeUsername}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-text-muted hover:text-brand-mint transition-colors px-2 py-0.5 rounded-md hover:bg-white/[0.04] cursor-pointer"
                    title="Change handle"
                    aria-label="Edit handle"
                  >
                    <Pencil className="w-3 h-3" />
                    <span className="hidden sm:inline">Edit Handle</span>
                  </button>
                )}
              </div>

              {/* Role, Mentorship, Discipline & Experience Badges */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-0.5">
                <EcosystemRoleBadge role={profile.primaryRole || "STUDENT"} size="sm" />
                {(profile.mentorship?.isAvailableForMentorship || profile.availability === "AVAILABLE_FOR_MENTORSHIP") && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-300 shadow-sm"
                    title="Available for Mentorship"
                  >
                    <Compass className="w-3 h-3 text-emerald-300" aria-hidden="true" />
                    Mentor
                  </span>
                )}
                {profile.primaryDiscipline && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-brand-mint/25 bg-brand-mint/10 px-2.5 py-0.5 text-xs font-bold text-brand-mint shadow-sm">
                    {profile.primaryDiscipline}
                  </span>
                )}
                {Number(profile.yearsOfExperience) > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-xs font-mono font-medium text-white/90 shadow-sm">
                    {profile.yearsOfExperience}+ Years Exp
                  </span>
                )}
              </div>

              {/* Professional Headline */}
              {profile.headline ? (
                <p className="text-sm sm:text-base font-medium text-white/95 leading-relaxed max-w-2xl break-words pt-0.5">
                  {profile.headline}
                </p>
              ) : isOwner ? (
                <p className="text-xs sm:text-sm text-text-muted max-w-md leading-relaxed pt-0.5 italic">
                  Introduce yourself with a compelling professional headline.
                </p>
              ) : null}

              {/* Metadata Row: Current Role, Location, Sector (Omits empty fields) */}
              {(profile.currentRole || profile.location || profile.industry) && (
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1.5 text-xs text-text-muted pt-1">
                  {profile.currentRole && (
                    <span className="inline-flex items-center gap-1.5 text-white/80 flex-wrap">
                      <Briefcase className="w-3.5 h-3.5 text-text-faint shrink-0" aria-hidden="true" />
                      <span className="font-semibold text-white/95 break-words max-w-xs sm:max-w-md" title={displayTitle}>
                        {displayTitle}
                      </span>
                      {displayIdentity.department && (
                        <span
                          className="inline-flex items-center rounded-md border border-brand-mint/25 bg-brand-mint/10 px-2 py-0.5 text-[11px] font-semibold text-brand-mint shadow-sm"
                          title={`Department: ${displayIdentity.department}`}
                          data-testid="profile-department-badge"
                        >
                          {displayIdentity.department}
                        </span>
                      )}
                    </span>
                  )}
                  {profile.location && (
                    <span className="inline-flex items-center gap-1.5 text-white/80">
                      <MapPin className="w-3.5 h-3.5 text-text-faint shrink-0" />
                      <span>{profile.location}</span>
                    </span>
                  )}
                  {profile.industry && (
                    <span className="inline-flex items-center gap-1.5 text-white/80">
                      <Building2 className="w-3.5 h-3.5 text-brand-yellow/80 shrink-0" />
                      <span>{profile.industry}</span>
                    </span>
                  )}
                </div>
              )}

              {/* Network Stats Strip */}
              <div className="pt-2 w-full max-w-md">
                <ProfileNetworkStats
                  userIdOrUsername={profile.id || profile._id || profile.username}
                  profileName={profile.name}
                />
              </div>
            </div>
          </div>

          {/* Right Column: Gamification Milestone Status & Action Buttons */}
          <div className="flex flex-col items-center lg:items-end gap-4 shrink-0 pt-1 sm:pt-2 w-full lg:w-auto">
            {/* Refined Gamification Milestone Strip */}
            <div className="flex items-center gap-2 flex-wrap justify-center lg:justify-end">
              <span className="px-3 py-1.5 rounded-xl border border-brand-yellow/25 bg-brand-yellow/10 text-xs font-bold font-mono text-brand-yellow uppercase tracking-wider shadow-sm flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-brand-yellow shrink-0" />
                LEVEL {gamification.level || 1}
              </span>
              <span className="px-3 py-1.5 rounded-xl border border-brand-mint/25 bg-brand-mint/10 text-xs font-bold uppercase tracking-wider text-brand-mint shadow-sm">
                {gamification.rank || "Pioneer"}
              </span>
              <span className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.04] text-xs font-bold font-mono text-white shadow-sm">
                <XPCountUp value={gamification.totalPoints || 0} /> XP
              </span>
            </div>

            {/* Action Buttons */}
            {isOwner ? (
              <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-center lg:justify-end">
                <Link
                  to="/profile/edit"
                  className="zn-btn-primary text-xs uppercase tracking-wider flex items-center justify-center gap-2 py-3 px-5 min-h-[44px] cursor-pointer shadow-md hover:shadow-brand-yellow/20 flex-1 sm:flex-initial"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Edit Profile</span>
                </Link>

                <Link
                  to="/public-profile"
                  className="zn-btn-secondary text-xs uppercase tracking-wider flex items-center justify-center gap-2 py-3 px-4 min-h-[44px] cursor-pointer flex-1 sm:flex-initial"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Public View</span>
                </Link>

                {onShare && (
                  <button
                    type="button"
                    onClick={onShare}
                    className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-text-muted hover:text-white transition-colors cursor-pointer shrink-0 focus-ring"
                    title="Share profile"
                    aria-label="Share profile"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                )}

                {onLogout && (
                  <button
                    type="button"
                    onClick={onLogout}
                    className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/15 text-red-400 hover:text-red-300 transition-colors cursor-pointer shrink-0 focus-ring"
                    title="Sign Out"
                    aria-label="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-center lg:justify-end">
                <div className="shrink-0">
                  <RelationshipAction
                    targetUserId={profile.id || profile._id}
                    targetUsername={profile.username}
                  />
                </div>

                {onSendMessage && (
                  <button
                    type="button"
                    onClick={onSendMessage}
                    className="zn-btn-secondary text-xs uppercase tracking-wider flex items-center justify-center gap-2 py-3 px-4 min-h-[44px] cursor-pointer flex-1 sm:flex-initial"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Message</span>
                  </button>
                )}

                {onSendOpportunity && (
                  <button
                    type="button"
                    onClick={onSendOpportunity}
                    className="inline-flex items-center justify-center gap-1.5 py-3 px-4 min-h-[44px] rounded-xl bg-gradient-to-r from-brand-yellow/20 to-brand-mint/20 border border-brand-yellow/30 hover:border-brand-yellow/50 text-brand-yellow text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm flex-1 sm:flex-initial"
                  >
                    <Briefcase className="w-4 h-4" />
                    <span>Opportunity</span>
                  </button>
                )}

                {onShare && (
                  <button
                    type="button"
                    onClick={onShare}
                    className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-text-muted hover:text-white transition-colors cursor-pointer shrink-0 focus-ring"
                    title="Share profile"
                    aria-label="Share profile"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                )}

                {onReport && (
                  <button
                    type="button"
                    onClick={onReport}
                    className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] hover:bg-red-500/10 hover:border-red-500/20 text-text-muted hover:text-red-400 transition-colors cursor-pointer shrink-0 focus-ring"
                    title="Report profile"
                    aria-label="Report profile"
                  >
                    <Flag className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

