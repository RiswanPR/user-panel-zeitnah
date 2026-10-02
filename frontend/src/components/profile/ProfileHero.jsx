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
} from "lucide-react";
import { getUploadUrl } from "../../utils/courseUi";
import EcosystemRoleBadge from "../network/EcosystemRoleBadge";
import AvailabilityBadge from "../network/AvailabilityBadge";
import ProfileNetworkStats from "../network/ProfileNetworkStats";
import RelationshipAction from "../network/RelationshipAction";

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
  const avatarUrl = getUploadUrl(profile.avatar);
  const bannerUrl = getUploadUrl(profile.backgroundImage);

  const initials = profile.name
    ? profile.name
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "ZU";

  return (
    <section
      aria-label="Profile Header"
      className={`relative overflow-hidden rounded-3xl bg-[#0A0F18]/95 border border-white/[0.08] shadow-[0_12px_40px_rgba(0,0,0,0.4)] ${className}`}
    >
      {/* Subtle top ambient mint gradient line */}
      <div
        className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-brand-mint/40 to-transparent pointer-events-none z-20"
        aria-hidden="true"
      />

      {/* ── 1. COVER BANNER ── */}
      <div className="relative h-44 sm:h-56 md:h-64 lg:h-72 w-full overflow-hidden bg-[#070B14]">
        {bannerUrl ? (
          <img
            src={bannerUrl}
            alt="Profile Cover"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full relative overflow-hidden bg-gradient-to-br from-[#0c1520] via-[#080d14] to-[#04070a] flex items-center justify-center">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(159,213,178,0.15),rgba(255,255,255,0))]" />
            <div className="absolute right-12 bottom-10 w-64 h-64 rounded-full bg-brand-yellow/[0.04] blur-3xl pointer-events-none" />
            <div className="text-center opacity-25 select-none">
              <span className="font-mono text-xs sm:text-sm uppercase tracking-[0.3em] text-brand-mint font-semibold">
                Zeitnah Identity
              </span>
            </div>
          </div>
        )}

        {/* Ambient bottom fade for contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0F18] via-black/40 to-transparent pointer-events-none" />

        {/* Banner Change Trigger for Owner */}
        {isOwner && onBannerUpload && (
          <div className="absolute top-4 right-4 z-10">
            <button
              type="button"
              onClick={() => bannerFileRef.current?.click()}
              disabled={isBannerUploading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/10 text-xs font-semibold text-white transition-all cursor-pointer shadow-sm focus-ring"
              title="Upload cover banner"
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
        <div className="flex flex-col md:flex-row items-center md:items-end justify-between gap-6 -mt-16 sm:-mt-20 md:-mt-24">
          {/* Avatar & Main Identity */}
          <div className="flex flex-col md:flex-row items-center md:items-end gap-5 text-center md:text-left min-w-0 w-full md:w-auto">
            {/* Avatar container */}
            <div className="relative group shrink-0">
              <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl overflow-hidden border-4 border-[#0A0F18] bg-[#0F1724] shadow-2xl flex items-center justify-center ring-1 ring-white/15 relative">
                {avatarUrl && !avatarError ? (
                  <img
                    src={avatarUrl}
                    alt={profile.name || "Member"}
                    onError={() => setAvatarError?.(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-mint/20 via-brand-navy/60 to-[#0A0F18] text-brand-mint font-heading font-black text-3xl sm:text-4xl">
                    {initials}
                  </div>
                )}
              </div>

              {/* Owner Avatar Change Overlay */}
              {isOwner && onAvatarUpload && (
                <>
                  <button
                    type="button"
                    onClick={() => avatarFileRef.current?.click()}
                    disabled={isAvatarUploading}
                    className="absolute inset-0 bg-black/60 rounded-3xl flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white focus-ring"
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
            </div>

            {/* Name, Verified Badge, Username, Badges */}
            <div className="space-y-2 min-w-0">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
                <h1 className="font-heading font-black text-2xl sm:text-3xl lg:text-4xl text-white tracking-tight leading-tight break-words">
                  {profile.name || "Zeitnah Member"}
                </h1>
                {profile.isVerified && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-brand-mint/30 bg-brand-mint/10 px-2.5 py-0.5 text-xs font-bold text-brand-mint shadow-sm">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verified
                  </span>
                )}
              </div>

              {/* Handle */}
              <div className="flex items-center justify-center md:justify-start gap-2">
                <span className="font-mono text-sm sm:text-base font-bold text-brand-mint">
                  @{profile.username || "member"}
                </span>
                {isOwner && onChangeUsername && (
                  <button
                    type="button"
                    onClick={onChangeUsername}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-text-muted hover:text-brand-mint transition-colors px-2 py-0.5 rounded-md hover:bg-white/[0.04] cursor-pointer"
                    title="Change handle"
                  >
                    <Pencil className="w-3 h-3" />
                    <span className="hidden sm:inline">Edit Handle</span>
                  </button>
                )}
              </div>

              {/* Ecosystem Role, Availability & Discipline Badges */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-0.5">
                <EcosystemRoleBadge role={profile.primaryRole || "STUDENT"} size="sm" />
                <AvailabilityBadge availability={profile.availability} size="sm" />
                {profile.primaryDiscipline && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-brand-mint/25 bg-brand-mint/10 px-2.5 py-0.5 text-xs font-bold text-brand-mint">
                    {profile.primaryDiscipline}
                  </span>
                )}
                {profile.yearsOfExperience > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-xs font-mono font-medium text-white/90">
                    {profile.yearsOfExperience}+ Years Exp
                  </span>
                )}
              </div>

              {/* Headline / Positioning */}
              {profile.headline ? (
                <p className="text-sm sm:text-base font-medium text-white/90 max-w-xl leading-relaxed break-words pt-1">
                  {profile.headline}
                </p>
              ) : isOwner ? (
                <p className="text-xs sm:text-sm text-text-muted max-w-md leading-relaxed pt-1">
                  Introduce yourself with a compelling professional headline.
                </p>
              ) : null}

              {/* Role, Location, Industry Meta */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-1 text-xs text-text-muted pt-1">
                {profile.currentRole && (
                  <span className="inline-flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-text-faint" />
                    <span>{profile.currentRole}</span>
                  </span>
                )}
                {profile.location && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-text-faint" />
                    <span>{profile.location}</span>
                  </span>
                )}
                {profile.industry && (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-yellow/60" />
                    <span>{profile.industry}</span>
                  </span>
                )}
              </div>

              {/* Network Stats Strip */}
              <div className="pt-2 w-full max-w-md">
                <ProfileNetworkStats
                  userIdOrUsername={profile.id || profile._id || profile.username}
                  profileName={profile.name}
                />
              </div>
            </div>
          </div>

          {/* Gamification & Action Bar */}
          <div className="flex flex-col items-center md:items-end gap-4 shrink-0 w-full md:w-auto">
            {/* Gamification Milestone Strip */}
            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-xl border border-brand-yellow/20 bg-brand-yellow/10 text-xs font-bold font-mono text-brand-yellow uppercase tracking-wider shadow-sm">
                LEVEL {gamification.level || 1}
              </span>
              <span className="px-3 py-1.5 rounded-xl border border-brand-mint/20 bg-brand-mint/10 text-xs font-bold uppercase tracking-wider text-brand-mint shadow-sm">
                {gamification.rank || "Pioneer"}
              </span>
              <span className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.03] text-xs font-bold font-mono text-white shadow-sm">
                <XPCountUp value={gamification.totalPoints || 0} /> XP
              </span>
            </div>

            {/* Action Buttons */}
            {isOwner ? (
              <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-center">
                <Link
                  to="/profile/edit"
                  className="zn-btn-primary text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 py-3 px-5 min-h-[44px] cursor-pointer shadow-md flex-1 sm:flex-initial"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Edit Profile</span>
                </Link>

                <Link
                  to="/public-profile"
                  className="zn-btn-secondary text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 py-3 px-4 min-h-[44px] cursor-pointer flex-1 sm:flex-initial"
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
              <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-center">
                {/* Visitor Relationship Action Button (Connect / Pending / Connected) */}
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
                    className="zn-btn-secondary text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 py-3 px-4 min-h-[44px] cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Message</span>
                  </button>
                )}

                {onSendOpportunity && (
                  <button
                    type="button"
                    onClick={onSendOpportunity}
                    className="inline-flex items-center justify-center gap-1.5 py-3 px-4 min-h-[44px] rounded-xl bg-gradient-to-r from-brand-yellow/20 to-brand-mint/20 border border-brand-yellow/30 hover:border-brand-yellow/50 text-brand-yellow text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm"
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
