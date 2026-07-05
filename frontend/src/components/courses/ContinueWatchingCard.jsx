import { PlayCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ContinueWatchingCard({ course }) {
  if (!course || !course.learningProgress || course.learningProgress.completionPercent >= 100) return null;
  
  const { learningProgress, name, coverImage, _id } = course;
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-bg-card to-bg-card/80 border border-white/10 rounded-2xl p-5 flex flex-col md:flex-row items-center gap-6 relative overflow-hidden group"
    >
      <div className="absolute top-0 right-0 w-64 h-64 bg-brand-mint/10 blur-[80px] rounded-full pointer-events-none -mr-20 -mt-20" />
      
      <div className="w-full md:w-48 h-28 rounded-xl overflow-hidden shrink-0 relative">
        <link rel="preload" as="image" href={coverImage} fetchPriority="high" />
        <img src={coverImage} alt={name} fetchPriority="high" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors" />
        <div className="absolute inset-0 flex items-center justify-center">
          <PlayCircle className="w-10 h-10 text-white/80 group-hover:text-brand-mint transition-colors group-hover:scale-110 drop-shadow-lg" />
        </div>
      </div>
      
      <div className="flex-1 w-full relative z-10">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-brand-mint bg-brand-mint/10 border border-brand-mint/20 px-2 py-0.5 rounded-md">
            Continue Watching
          </span>
        </div>
        <h3 className="text-xl font-bold text-white mb-3 line-clamp-1 group-hover:text-brand-mint transition-colors">{name}</h3>
        
        <div className="flex items-center gap-4">
          <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${learningProgress.completionPercent}%` }}
              transition={{ duration: 1, delay: 0.2 }}
              className="h-full bg-brand-mint rounded-full relative"
            >
              <div className="absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-r from-transparent to-white/30" />
            </motion.div>
          </div>
          <span className="text-xs font-bold text-white shrink-0">{learningProgress.completionPercent}%</span>
        </div>
      </div>
      
      <a 
        href={`/courses/${_id}`}
        className="w-full md:w-auto shrink-0 bg-white text-black font-bold px-6 py-3 rounded-xl hover:bg-brand-mint hover:scale-105 transition-all text-sm text-center relative z-10"
      >
        Resume Now
      </a>
    </motion.div>
  );
}
