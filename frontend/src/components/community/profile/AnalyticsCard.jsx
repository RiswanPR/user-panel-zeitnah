import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Eye, Users, Award, Flame } from 'lucide-react';

export default function AnalyticsCard({ profile }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.6 }}
      className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5"
    >
      <h2 className="text-lg font-bold text-white flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-emerald-400" />
        <span>Profile Analytics & Impact</span>
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Metric 1: Views */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Profile Views</span>
            <Eye className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {profile?.viewsCount || 0}
          </div>
          <div className="text-[10px] text-emerald-400 font-semibold">
            +12% this week
          </div>
        </div>

        {/* Metric 2: Followers */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Followers</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {profile?.followersCount || 0}
          </div>
          <div className="text-[10px] text-indigo-400 font-semibold">
            Active Audience
          </div>
        </div>

        {/* Metric 3: Reputation XP */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Reputation XP</span>
            <Award className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">
            {profile?.reputationXP || 0}
          </div>
          <div className="text-[10px] text-slate-400 font-medium">
            Community XP
          </div>
        </div>

        {/* Metric 4: Community Rank */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Community Rank</span>
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-amber-400 truncate">
            {profile?.rank || 'Novice'}
          </div>
          <div className="text-[10px] text-amber-400/80 font-medium">
            Level {profile?.level || 1}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
