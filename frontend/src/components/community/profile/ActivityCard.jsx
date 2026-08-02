import React from 'react';
import { motion } from 'framer-motion';
import { Activity, MessageSquare, Heart, Share2, Sparkles } from 'lucide-react';

export default function ActivityCard() {
  const activities = [
    {
      id: 1,
      type: 'post',
      title: 'Published a new article on NestJS Microservices Architecture',
      time: '2 hours ago',
      likes: 24,
      comments: 5,
    },
    {
      id: 2,
      type: 'achievement',
      title: 'Earned "Top Community Contributor" badge',
      time: '1 day ago',
      xp: '+150 XP',
    },
    {
      id: 3,
      type: 'project',
      title: 'Updated live demo link for Zeitnah Open Source Project',
      time: '3 days ago',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.7 }}
      className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5"
    >
      <h2 className="text-lg font-bold text-white flex items-center gap-2">
        <Activity className="w-5 h-5 text-indigo-400" />
        <span>Recent Activity</span>
      </h2>

      <div className="space-y-4">
        {activities.map((act) => (
          <div
            key={act.id}
            className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-start gap-3.5 hover:border-slate-700 transition-all"
          >
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {act.type === 'achievement' ? (
                <Sparkles className="w-4 h-4 text-emerald-400" />
              ) : (
                <MessageSquare className="w-4 h-4 text-indigo-400" />
              )}
            </div>

            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-slate-200">
                  {act.title}
                </p>
                {act.xp && (
                  <span className="text-[10px] font-bold text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                    {act.xp}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500">{act.time}</p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
