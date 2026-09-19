import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Crown, Medal, Award, User } from "lucide-react";

export default function Podium({ topStudents = [], isCourseMode = false }) {
  const shouldReduceMotion = useReducedMotion();

  if (!topStudents || topStudents.length === 0) {
    return (
      <div className="rounded-2xl border border-border-default bg-bg-card/50 p-8 text-center">
        <Award className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-60" />
        <p className="text-sm font-semibold text-white">Podium Awaiting Learners</p>
        <p className="text-xs text-text-muted mt-1">
          Complete classes and earn XP to take your place among the top 3.
        </p>
      </div>
    );
  }

  // Assign places: 1st, 2nd, 3rd if available
  const first = topStudents[0];
  const second = topStudents[1];
  const third = topStudents[2];

  // Animation variants with staggered order: #2 enters, then #1 enters, then #3 enters
  const podiumContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.15,
        delayChildren: 0.1,
      },
    },
  };

  const getCardVariants = (customDelay = 0) => ({
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 28 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: shouldReduceMotion ? 0.2 : 0.5,
        ease: "easeOut",
        delay: shouldReduceMotion ? 0 : customDelay,
      },
    },
  });

  const xpLabel = isCourseMode ? "Course XP" : "Global XP";

  const renderStudent = (student, place, delay) => {
    if (!student) return null;

    const isFirst = place === 1;
    const isSecond = place === 2;
    const isThird = place === 3;

    const points = isCourseMode ? student.courseXp || 0 : student.points || 0;

    // Palette per place
    const config = isFirst
      ? {
          pedestalHeight: "h-36 sm:h-44",
          border: "border-brand-yellow/30",
          glow: "bg-brand-yellow/10",
          badgeBg: "bg-brand-yellow text-bg-base",
          accentColor: "text-brand-yellow",
          avatarSize: "w-20 h-20 sm:w-24 sm:h-24",
          avatarBorder: "border-brand-yellow/40",
          icon: Crown,
          title: "Gold",
        }
      : isSecond
      ? {
          pedestalHeight: "h-28 sm:h-36",
          border: "border-slate-300/30",
          glow: "bg-slate-300/5",
          badgeBg: "bg-slate-300 text-bg-base",
          accentColor: "text-slate-300",
          avatarSize: "w-16 h-16 sm:w-20 sm:h-20",
          avatarBorder: "border-slate-300/40",
          icon: Medal,
          title: "Silver",
        }
      : {
          pedestalHeight: "h-24 sm:h-30",
          border: "border-amber-600/30",
          glow: "bg-amber-600/5",
          badgeBg: "bg-amber-600 text-white",
          accentColor: "text-amber-500",
          avatarSize: "w-14 h-14 sm:w-18 sm:h-18",
          avatarBorder: "border-amber-600/40",
          icon: Medal,
          title: "Bronze",
        };

    const Icon = config.icon;
    const userUrl = student.username ? `/u/${encodeURIComponent(student.username)}` : "#";

    return (
      <motion.div
        variants={getCardVariants(delay)}
        className={`flex flex-col items-center justify-end ${
          isFirst ? "order-2 z-20 -mt-4 sm:-mt-6" : isSecond ? "order-1 z-10" : "order-3 z-10"
        } flex-1 max-w-[220px]`}
      >
        {/* Student Avatar & Identity */}
        <Link
          to={userUrl}
          className="group flex flex-col items-center text-center mb-3 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-mint rounded-2xl p-1 transition-transform"
        >
          {/* Avatar with relative crown / medal */}
          <div className="relative mb-2">
            <div
              className={`absolute inset-0 rounded-full blur-md ${config.glow} group-hover:blur-lg transition-all`}
            />
            <div
              className={`relative ${config.avatarSize} rounded-full overflow-hidden border-2 ${config.avatarBorder} bg-bg-surface flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300`}
            >
              {student.avatar ? (
                <img
                  src={student.avatar}
                  alt={student.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-8 h-8 text-text-muted" />
              )}
            </div>

            {/* Place medal badge */}
            <div
              className={`absolute -bottom-1 -right-1 flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full ${config.badgeBg} font-black text-xs shadow-md`}
            >
              <Icon className="w-3.5 h-3.5" />
            </div>

            {/* YOU tag if student is logged in */}
            {student.isYou && (
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-md bg-brand-yellow px-1.5 py-0.2 text-[8px] font-black uppercase tracking-wider text-bg-base shadow-sm">
                YOU
              </span>
            )}
          </div>

          {/* Student name & handle */}
          <p className="font-semibold text-white text-xs sm:text-sm truncate max-w-[140px] group-hover:text-brand-mint transition-colors">
            {student.name}
          </p>
          {student.username && (
            <p className="text-[10px] text-text-muted font-mono truncate max-w-[130px]">
              @{student.username}
            </p>
          )}

          {/* XP */}
          <p
            className={`mt-1 font-heading font-black text-sm sm:text-base ${config.accentColor} font-mono tracking-tight`}
          >
            {points.toLocaleString()} <span className="text-[10px] font-bold text-text-muted uppercase">XP</span>
          </p>
        </Link>

        {/* Elevated Pedestal */}
        <div
          className={`w-full ${config.pedestalHeight} rounded-t-2xl border-t border-x ${config.border} bg-gradient-to-b from-white/[0.04] to-white/[0.01] backdrop-blur-md flex flex-col items-center justify-start pt-3 relative overflow-hidden shadow-lg`}
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <span className={`text-2xl sm:text-3xl font-heading font-black ${config.accentColor} font-mono`}>
            #{place}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted mt-0.5">
            {config.title}
          </span>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="relative pt-6 pb-2">
      {/* Soft ambient background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-36 bg-gradient-to-r from-brand-mint/5 via-brand-yellow/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      <motion.div
        variants={podiumContainerVariants}
        initial="hidden"
        animate="visible"
        className="flex items-end justify-center gap-2 sm:gap-4 max-w-2xl mx-auto px-2"
      >
        {/* Stagger entrance: #2 (delay: 0), #1 (delay: 0.15), #3 (delay: 0.3) */}
        {renderStudent(second, 2, 0)}
        {renderStudent(first, 1, 0.15)}
        {renderStudent(third, 3, 0.3)}
      </motion.div>
    </div>
  );
}
