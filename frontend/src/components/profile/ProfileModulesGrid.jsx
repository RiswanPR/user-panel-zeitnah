import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  BarChart3,
  Star,
  Globe,
  Shield,
  FileText,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

export default function ProfileModulesGrid({ username, className = "" }) {
  const modules = [
    {
      title: "My Learning Progress",
      description:
        "Comprehensive tracking of enrolled courses, completion rates, and learning streak.",
      path: "/my-learning",
      icon: BarChart3,
      tag: "Analytics",
      accent: "mint",
    },
    {
      title: "My Points & Roadmap",
      description:
        "Review accumulated XP, tier level progression, and verified activity reward transactions.",
      path: "/my-points",
      icon: Star,
      tag: "Rewards",
      accent: "yellow",
    },
    {
      title: "Public Professional Profile",
      description:
        "Showcase your resume, verified projects, work experience, certificates, and portfolio.",
      path: "/community/profile",
      icon: Globe,
      tag: "Public Portfolio",
      accent: "mint",
      external: false,
    },
    {
      title: "Active Sessions & Security",
      description:
        "Inspect signed-in devices, operating systems, IP addresses, and revoke active sessions.",
      path: "/active-sessions",
      icon: Shield,
      tag: "Security",
      accent: "mint",
    },
    {
      title: "Account Audit Logs",
      description:
        "Immutable timeline of authentication events, credential updates, and account activity.",
      path: "/audit-logs",
      icon: FileText,
      tag: "Audit Trail",
      accent: "mint",
    },
  ];

  return (
    <div className={`space-y-4 ${className}`}>
      <div>
        <h2 className="text-lg sm:text-xl font-heading font-bold text-white tracking-tight">
          Platform Subsystems
        </h2>
        <p className="text-xs text-text-muted mt-0.5">
          Access your courses, security center, and professional presence
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map((mod, i) => {
          const Icon = mod.icon;
          const isYellow = mod.accent === "yellow";

          return (
            <motion.div
              key={mod.path}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.05 }}
            >
              <Link
                to={mod.path}
                className="group relative block h-full overflow-hidden rounded-2xl border border-border-default bg-bg-card p-5 sm:p-6 transition-all hover:border-brand-mint/30 hover:bg-bg-elevated/40 cursor-pointer flex flex-col justify-between"
              >
                <div className="gradient-line-top" />

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className={`w-11 h-11 rounded-xl border flex items-center justify-center transition-transform group-hover:scale-105 ${
                        isYellow
                          ? "bg-brand-yellow/10 border-brand-yellow/20 text-brand-yellow"
                          : "bg-brand-mint/10 border-brand-mint/20 text-brand-mint"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>

                    <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted px-2.5 py-1 rounded-md bg-white/[0.03] border border-white/[0.06]">
                      {mod.tag}
                    </span>
                  </div>

                  <h3 className="text-base font-heading font-bold text-white group-hover:text-brand-mint transition-colors mb-1.5">
                    {mod.title}
                  </h3>

                  <p className="text-xs text-text-muted leading-relaxed">
                    {mod.description}
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-white/[0.04] flex items-center justify-between text-xs font-semibold text-brand-mint">
                  <span>Open Subsystem</span>
                  <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
