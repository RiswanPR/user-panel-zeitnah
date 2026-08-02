import React from 'react';
import { motion } from 'framer-motion';
import {
  FolderGit2,
  ExternalLink,
  Star,
  Plus,
  Trash2,
  Play,
} from 'lucide-react';
import { FaGithub } from 'react-icons/fa';

export default function ProjectCard({
  projects = [],
  isOwnProfile,
  onOpenAddProjectModal,
  onDeleteProject,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <FolderGit2 className="w-5 h-5 text-indigo-400" />
          <span>Featured Projects & Portfolio</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-medium">
            {projects.length}
          </span>
        </h2>

        {isOwnProfile && (
          <button
            onClick={onOpenAddProjectModal}
            className="flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-1.5 rounded-full border border-indigo-500/30 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Project</span>
          </button>
        )}
      </div>

      {projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {projects.map((proj) => (
            <motion.div
              key={proj._id || proj.title}
              whileHover={{ y: -4 }}
              className="bg-slate-950/70 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-lg group relative transition-all"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white group-hover:text-indigo-400 transition-colors">
                      {proj.title}
                    </h3>
                    {proj.featured && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                        <Star className="w-3 h-3 fill-amber-400" />
                        Featured
                      </span>
                    )}
                  </div>

                  {isOwnProfile && onDeleteProject && (
                    <button
                      onClick={() => onDeleteProject(proj._id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-opacity p-1"
                      title="Delete Project"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                  {proj.description || 'No project description provided.'}
                </p>
              </div>

              {/* Media Thumbnails if available */}
              {proj.mediaUrls && proj.mediaUrls.length > 0 && (
                <div className="flex gap-2 overflow-x-auto py-1">
                  {proj.mediaUrls.map((url, i) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-20 h-14 rounded-lg overflow-hidden border border-slate-800 flex-shrink-0 relative group/img"
                    >
                      {url.endsWith('.mp4') || url.endsWith('.webm') ? (
                        <div className="w-full h-full bg-slate-900 flex items-center justify-center text-indigo-400">
                          <Play className="w-5 h-5 fill-indigo-400" />
                        </div>
                      ) : (
                        <img
                          src={url}
                          alt="Project Media"
                          className="w-full h-full object-cover group-hover/img:scale-105 transition-transform"
                        />
                      )}
                    </a>
                  ))}
                </div>
              )}

              {/* Tags & Action Links */}
              <div className="space-y-3 pt-2 border-t border-slate-800/80">
                {proj.tags && proj.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {proj.tags.map((t) => (
                      <span
                        key={t}
                        className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-900 text-indigo-300 border border-slate-800"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between text-xs font-semibold pt-1">
                  {proj.githubUrl ? (
                    <a
                      href={proj.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors"
                    >
                      <FaGithub className="w-4 h-4" />
                      <span>Source Code</span>
                    </a>
                  ) : (
                    <span />
                  )}

                  {proj.liveDemoUrl && (
                    <a
                      href={proj.liveDemoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      <span>Live Demo</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-400 italic">
          {isOwnProfile
            ? 'Showcase your engineering projects! Click "Add Project" to add GitHub links & live demos.'
            : 'No projects added yet.'}
        </p>
      )}
    </motion.div>
  );
}
