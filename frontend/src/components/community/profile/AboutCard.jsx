import React from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Globe,
  Upload,
  CheckCircle2,
  AlertCircle,
  FileDown,
} from 'lucide-react';
import { FaGithub, FaLinkedin, FaTwitter } from 'react-icons/fa';

export default function AboutCard({
  bio,
  socialLinks,
  resumeUrl,
  completionPercentage = 0,
  isOwnProfile,
  onOpenUploadResume,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-400" />
          <span>About</span>
        </h2>

        {/* Resume Download / Upload button */}
        {resumeUrl ? (
          <a
            href={resumeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-1.5 rounded-full border border-indigo-500/30 transition-all"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Download Resume</span>
          </a>
        ) : (
          isOwnProfile && (
            <button
              onClick={onOpenUploadResume}
              className="flex items-center gap-1.5 text-xs font-semibold text-purple-400 hover:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 px-3 py-1.5 rounded-full border border-purple-500/30 transition-all"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Resume (PDF)</span>
            </button>
          )
        )}
      </div>

      {/* Bio text */}
      <p className="text-sm text-slate-300 leading-relaxed">
        {bio ||
          (isOwnProfile
            ? 'Add a short bio to introduce yourself to the engineering community!'
            : 'No bio added yet.')}
      </p>

      {/* Social Links Bar */}
      {socialLinks &&
        (socialLinks.github ||
          socialLinks.linkedin ||
          socialLinks.twitter ||
          socialLinks.website) && (
          <div className="pt-2 flex flex-wrap items-center gap-3">
            {socialLinks.github && (
              <a
                href={socialLinks.github}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 px-3.5 py-2 rounded-xl border border-slate-700/70 transition-all"
              >
                <FaGithub className="w-4 h-4 text-white" />
                <span>GitHub</span>
              </a>
            )}
            {socialLinks.linkedin && (
              <a
                href={socialLinks.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 px-3.5 py-2 rounded-xl border border-slate-700/70 transition-all"
              >
                <FaLinkedin className="w-4 h-4 text-sky-400" />
                <span>LinkedIn</span>
              </a>
            )}
            {socialLinks.twitter && (
              <a
                href={socialLinks.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 px-3.5 py-2 rounded-xl border border-slate-700/70 transition-all"
              >
                <FaTwitter className="w-4 h-4 text-cyan-400" />
                <span>Twitter</span>
              </a>
            )}
            {socialLinks.website && (
              <a
                href={socialLinks.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 px-3.5 py-2 rounded-xl border border-slate-700/70 transition-all"
              >
                <Globe className="w-4 h-4 text-emerald-400" />
                <span>Portfolio</span>
              </a>
            )}
          </div>
        )}

      {/* Profile Completion Widget (Only shown to profile owner) */}
      {isOwnProfile && (
        <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-slate-950 via-indigo-950/40 to-slate-950 border border-slate-800">
          <div className="flex items-center justify-between text-xs font-semibold mb-2">
            <span className="text-slate-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Profile Strength
            </span>
            <span className="text-emerald-400 font-bold">
              {completionPercentage}% Complete
            </span>
          </div>

          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${completionPercentage}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400"
            />
          </div>

          {completionPercentage < 100 && (
            <p className="text-[11px] text-slate-400 mt-2.5 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>
                Add your resume, skills, and projects to reach 100% profile score.
              </span>
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
}
