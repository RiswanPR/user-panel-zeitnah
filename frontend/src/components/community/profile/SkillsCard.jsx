import React from 'react';
import { motion } from 'framer-motion';
import { Code2, Plus, Trash2, Award } from 'lucide-react';

export default function SkillsCard({
  skills = [],
  isOwnProfile,
  onOpenAddSkillModal,
  onDeleteSkill,
}) {
  const getProficiencyBadge = (level) => {
    switch (level) {
      case 'Expert':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'Advanced':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
      case 'Intermediate':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Code2 className="w-5 h-5 text-indigo-400" />
          <span>Skills & Technologies</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-medium">
            {skills.length}
          </span>
        </h2>

        {isOwnProfile && (
          <button
            onClick={onOpenAddSkillModal}
            className="flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-1.5 rounded-full border border-indigo-500/30 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Skill</span>
          </button>
        )}
      </div>

      {skills.length > 0 ? (
        <div className="flex flex-wrap gap-2.5 pt-2">
          {skills.map((skill) => (
            <div
              key={skill._id || skill.name}
              className={`group relative flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all hover:scale-105 ${getProficiencyBadge(
                skill.proficiencyLevel,
              )}`}
            >
              <span>{skill.name}</span>
              {skill.proficiencyLevel && (
                <span className="opacity-75 text-[10px] font-normal">
                  ({skill.proficiencyLevel})
                </span>
              )}

              {isOwnProfile && onDeleteSkill && (
                <button
                  onClick={() => onDeleteSkill(skill._id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 hover:text-red-400"
                  title="Remove Skill"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-400 italic">
          {isOwnProfile
            ? 'No skills added yet. Add your core programming languages & tools!'
            : 'No skills listed.'}
        </p>
      )}
    </motion.div>
  );
}
