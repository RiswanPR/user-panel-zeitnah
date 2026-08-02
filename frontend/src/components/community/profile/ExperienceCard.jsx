import React from 'react';
import { motion } from 'framer-motion';
import { Briefcase, Calendar, MapPin, Plus, Trash2 } from 'lucide-react';
import dayjs from 'dayjs';

export default function ExperienceCard({
  experiences = [],
  isOwnProfile,
  onOpenAddExperienceModal,
  onDeleteExperience,
}) {
  const formatDate = (dateStr) => {
    if (!dateStr) return 'Present';
    return dayjs(dateStr).format('MMM YYYY');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-indigo-400" />
          <span>Work Experience</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-medium">
            {experiences.length}
          </span>
        </h2>

        {isOwnProfile && (
          <button
            onClick={onOpenAddExperienceModal}
            className="flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-1.5 rounded-full border border-indigo-500/30 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Experience</span>
          </button>
        )}
      </div>

      {experiences.length > 0 ? (
        <div className="space-y-6 relative before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
          {experiences.map((exp) => (
            <div
              key={exp._id || exp.company}
              className="relative pl-9 space-y-2 group"
            >
              {/* Timeline Bullet Dot */}
              <div className="absolute left-1.5 top-1.5 w-4 h-4 rounded-full bg-indigo-500 border-4 border-slate-900 shadow-md group-hover:scale-125 transition-transform" />

              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-white">
                    {exp.role}
                  </h3>
                  <div className="text-sm font-semibold text-indigo-400">
                    {exp.company}{' '}
                    {exp.employmentType && (
                      <span className="text-xs font-normal text-slate-400">
                        • {exp.employmentType}
                      </span>
                    )}
                  </div>
                </div>

                {isOwnProfile && onDeleteExperience && (
                  <button
                    onClick={() => onDeleteExperience(exp._id)}
                    className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-opacity p-1"
                    title="Delete Entry"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  {formatDate(exp.startDate)} –{' '}
                  {exp.isCurrent ? 'Present' : formatDate(exp.endDate)}
                </span>
                {exp.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    {exp.location}
                  </span>
                )}
              </div>

              {exp.description && (
                <p className="text-xs text-slate-300 leading-relaxed pt-1">
                  {exp.description}
                </p>
              )}

              {exp.skillsUsed && exp.skillsUsed.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {exp.skillsUsed.map((s) => (
                    <span
                      key={s}
                      className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-800 text-purple-300"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-400 italic">
          {isOwnProfile
            ? 'Add internships, full-time jobs, or freelancing experience!'
            : 'No work experience listed.'}
        </p>
      )}
    </motion.div>
  );
}
