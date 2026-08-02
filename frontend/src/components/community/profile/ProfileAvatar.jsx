import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, CheckCircle2, User } from 'lucide-react';
import { profileApi } from '../../../services/profileApi';
import toast from 'react-hot-toast';

export default function ProfileAvatar({
  avatarUrl,
  username,
  isVerified,
  isOwnProfile,
  onAvatarUpdated,
}) {
  const [uploading, setUploading] = useState(false);

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Avatar photo must be under 5MB');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      const res = await profileApi.uploadAvatar(formData);
      toast.success('Profile picture updated!');
      if (onAvatarUpdated) onAvatarUpdated(res.profilePicture);
    } catch (err) {
      toast.error('Failed to upload avatar photo');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative inline-block group">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-full p-1 bg-gradient-to-tr from-indigo-500 via-purple-500 to-emerald-400 shadow-2xl"
      >
        <div className="w-full h-full rounded-full overflow-hidden bg-slate-900 relative">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={username || 'Profile Avatar'}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-slate-800 flex items-center justify-center text-slate-400">
              <User className="w-16 h-16" />
            </div>
          )}

          {/* Upload overlay on hover for owner */}
          {isOwnProfile && (
            <label className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center cursor-pointer text-white text-xs font-medium gap-1">
              {uploading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera className="w-6 h-6 text-white" />
              )}
              <span>Edit</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
                disabled={uploading}
              />
            </label>
          )}
        </div>
      </motion.div>

      {/* Verified Badge */}
      {isVerified && (
        <div
          title="Verified Community Member"
          className="absolute bottom-1 right-1 bg-slate-900 rounded-full p-1 shadow-lg border border-slate-700"
        >
          <CheckCircle2 className="w-6 h-6 text-emerald-400 fill-emerald-400/20" />
        </div>
      )}
    </div>
  );
}
