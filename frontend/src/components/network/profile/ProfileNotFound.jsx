import { Link } from "react-router-dom";
import { UserX, ArrowLeft } from "lucide-react";

/**
 * ProfileNotFound Component
 * Displayed when a requested student username does not resolve to an active profile.
 */
export default function ProfileNotFound() {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-white/[0.08] bg-bg-surface/80 p-10 sm:p-16 text-center shadow-xl backdrop-blur-xl max-w-lg mx-auto my-12">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.1] bg-white/[0.04] text-text-muted mb-5">
        <UserX className="h-8 w-8 text-text-muted" aria-hidden="true" />
      </div>

      <h1 className="text-xl sm:text-2xl font-heading font-black text-white tracking-tight">
        Profile not found
      </h1>

      <p className="mt-2 text-xs sm:text-sm font-medium text-text-muted leading-relaxed max-w-sm">
        This student profile may have been removed, changed their username, or is no longer available in the Zeitnah network.
      </p>

      <div className="mt-6">
        <Link
          to="/network"
          className="inline-flex items-center gap-2 rounded-xl bg-brand-mint px-5 py-2.5 text-xs font-bold text-bg-base hover:bg-brand-mint/90 transition-all focus-ring shadow-lg"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Network</span>
        </Link>
      </div>
    </div>
  );
}
