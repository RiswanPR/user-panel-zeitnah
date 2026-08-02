import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Building2,
  GraduationCap,
  Sparkles,
  UserPlus,
  UserCheck,
  MessageSquare,
  Globe,
  Edit3,
  Award,
  Flame,
} from 'lucide-react';
import ProfileAvatar from './ProfileAvatar';
import { useFollowers } from '../../../hooks/useFollowers';

export default function ProfileHeader({
  profile,
  isOwnProfile,
  isFollowing: initialIsFollowing,
  onOpenEditModal,
  onOpenFollowersModal,
  onAvatarUpdated,
}) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [followersCount, setFollowersCount] = useState(profile?.followersCount || 0);
  const { toggleFollow, loading: followLoading } = useFollowers();

  const handleFollowClick = async () => {
    try {
      const nextState = await toggleFollow(profile.userId, isFollowing);
      setIsFollowing(nextState);
      setFollowersCount((prev) => (nextState ? prev + 1 : Math.max(0, prev - 1)));
    } catch (err) {
      // Error toast already handled by hook
    }
  };

  return (
    <div className="relative px-4 sm:px-8 pb-6 bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl shadow-xl mt-[-4rem] sm:mt-[-5rem] z-10 mx-3 sm:mx-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-4">
        {/* Avatar & Key Text */}
        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 text-center sm:text-left">
          <ProfileAvatar
            avatarUrl={profile?.profilePicture}
            username={profile?.username}
            isVerified={profile?.isVerified}
            isOwnProfile={isOwnProfile}
            onAvatarUpdated={onAvatarUpdated}
          />

          <div className="space-y-1 sm:pb-2">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {profile?.username ? `@${profile.username}` : 'Community Engineer'}
              </h1>
              {profile?.rank && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/30">
                  <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  {profile.rank}
                </span>
              )}
            </div>

            {profile?.headline ? (
              <p className="text-sm sm:text-base text-indigo-300 font-medium max-w-xl">
                {profile.headline}
              </p>
            ) : (
              <p className="text-sm text-slate-400 italic">
                No headline set yet
              </p>
            )}

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs sm:text-sm text-slate-400 pt-1">
              {profile?.college && (
                <span className="flex items-center gap-1.5 text-slate-300">
                  <GraduationCap className="w-4 h-4 text-indigo-400" />
                  {profile.college}
                </span>
              )}
              {profile?.branch && (
                <span className="flex items-center gap-1.5 text-slate-300">
                  <Building2 className="w-4 h-4 text-purple-400" />
                  {profile.branch} {profile?.batchYear ? `'${profile.batchYear.slice(-2)}` : ''}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-center sm:justify-end gap-3 pb-2">
          {isOwnProfile ? (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onOpenEditModal}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 transition-all"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit Profile</span>
            </motion.button>
          ) : (
            <>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleFollowClick}
                disabled={followLoading}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm shadow-lg transition-all ${
                  isFollowing
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/25'
                }`}
              >
                {isFollowing ? (
                  <>
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                    <span>Following</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Follow</span>
                  </>
                )}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 transition-all"
              >
                <MessageSquare className="w-4 h-4 text-indigo-400" />
                <span>Message</span>
              </motion.button>
            </>
          )}
        </div>
      </div>

      {/* Stats Counter Bar */}
      <div className="grid grid-cols-3 sm:flex sm:items-center gap-4 mt-6 pt-5 border-t border-slate-800/80 text-center sm:text-left">
        <button
          onClick={() => onOpenFollowersModal && onOpenFollowersModal('followers')}
          className="hover:opacity-80 transition-opacity"
        >
          <div className="text-xl sm:text-2xl font-bold text-white">
            {followersCount}
          </div>
          <div className="text-xs text-slate-400 font-medium">Followers</div>
        </button>

        <div className="hidden sm:block w-px h-8 bg-slate-800" />

        <button
          onClick={() => onOpenFollowersModal && onOpenFollowersModal('following')}
          className="hover:opacity-80 transition-opacity"
        >
          <div className="text-xl sm:text-2xl font-bold text-white">
            {profile?.followingCount || 0}
          </div>
          <div className="text-xs text-slate-400 font-medium">Following</div>
        </button>

        <div className="hidden sm:block w-px h-8 bg-slate-800" />

        <div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-400 flex items-center justify-center sm:justify-start gap-1">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            {profile?.reputationXP || 0}
          </div>
          <div className="text-xs text-slate-400 font-medium">Reputation XP</div>
        </div>
      </div>
    </div>
  );
}
