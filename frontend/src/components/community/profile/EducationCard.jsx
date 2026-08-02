import React from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, Calendar, Plus, Trash2, Award } from 'lucide-react';
import dayjs from 'dayjs';

export default function EducationCard({
  educations = [],
  isOwnProfile,
  onOpenAddEducationModal,
  onDeleteEducation,
}) {
  const formatDate = (dateStr) => {
    if (!dateStr) return 'Present';
    return dayjs(dateStr).format('YYYY');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.4 }}
      className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-indigo-400" />
          <span>Education & Credentials</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-medium">
            {educations.length}
          </span>
        </h2>

        {isOwnProfile && (
          <button
            onClick={onOpenAddEducationModal}
            className="flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-1.5 rounded-full border border-indigo-500/30 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Education</span>
          </button>
        )}
      </div>

      {educations.length > 0 ? (
        <div className="space-y-6 relative before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
          {educations.map((edu) => (
            <div
              key={edu._id || edu.institution}
              className="relative pl-9 space-y-1.5 group"
            >
              {/* Bullet Dot */}
              <div className="absolute left-1.5 top-1.5 w-4 h-4 rounded-full bg-purple-500 border-4 border-slate-900 shadow-md group-hover:scale-125 transition-transform" />

              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-white">
                    {edu.institution}
                  </h3>
                  <div className="text-sm font-semibold text-purple-400">
                    {edu.degree}{' '}
                    {edu.fieldOfStudy && (
                      <span className="text-xs font-normal text-slate-300">
                        • {edu.fieldOfStudy}
                      </span>
                    )}
                  </div>
                </div>

                {isOwnProfile && onDeleteEducation && (
                  <button
                    onClick={() => onDeleteEducation(edu._id)}
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
                  {formatDate(edu.startDate)} – {formatDate(edu.endDate)}
                </span>
                {edu.grade && (
                  <span className="flex items-center gap-1 font-medium text-emerald-400">
                    <Award className="w-3.5 h-3.5" />
                    Grade: {edu.grade}
                  </span>
                )}
              </div>

              {edu.activities && (
                <p className="text-xs text-slate-300 leading-relaxed pt-1">
                  <span className="font-semibold text-slate-400">Activities:</span>{' '}
                  {edu.activities}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-400 italic">
          {isOwnProfile
            ? 'Add your college, degree, CGPA, and engineering branch!'
            : 'No education listed.'}
        </p>
      )}
    </motion.div>
  );
}
