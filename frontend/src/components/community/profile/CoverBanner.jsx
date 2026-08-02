import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, Image as ImageIcon } from 'lucide-react';
import { profileApi } from '../../../services/profileApi';
import toast from 'react-hot-toast';

export default function CoverBanner({ coverUrl, isOwnProfile, onCoverUpdated }) {
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      toast.error('Banner image must be smaller than 8MB');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      const res = await profileApi.uploadCover(formData);
      toast.success('Cover banner updated!');
      if (onCoverUpdated) onCoverUpdated(res.coverBanner);
    } catch (err) {
      toast.error('Failed to upload cover banner');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative w-full h-48 sm:h-64 md:h-80 rounded-b-3xl overflow-hidden bg-slate-900 shadow-2xl border-b border-slate-800">
      {/* Background Gradient overlay & Image */}
      {coverUrl ? (
        <img
          src={coverUrl}
          alt="Profile Cover"
          className="w-full h-full object-cover filter brightness-90 transition-all duration-700"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-r from-slate-950 via-indigo-950/80 to-purple-950/90 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(99,102,241,0.15),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_70%,rgba(168,85,247,0.15),transparent_50%)]" />
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/30 pointer-events-none" />

      {/* Edit Banner Trigger for profile owner */}
      {isOwnProfile && (
        <label className="absolute top-4 right-4 sm:top-6 sm:right-6 bg-slate-900/80 hover:bg-slate-800/90 text-white text-xs sm:text-sm font-medium py-2 px-3 sm:px-4 rounded-full backdrop-blur-md border border-slate-700/60 shadow-lg cursor-pointer flex items-center gap-2 transition-all hover:scale-105 active:scale-95">
          {uploading ? (
            <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Camera className="w-4 h-4 text-indigo-400" />
          )}
          <span>{uploading ? 'Uploading...' : 'Change Cover'}</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
            disabled={uploading}
          />
        </label>
      )}
    </div>
  );
}
