import { User } from "lucide-react";

/**
 * ProfileAbout Component
 * Displays the student's personal learning story or background bio.
 *
 * @param {Object} props
 * @param {string} [props.bio]
 */
export default function ProfileAbout({ bio }) {
  const hasBio = Boolean(bio && bio.trim().length > 0);

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-bg-surface/90 p-5 sm:p-6 shadow-lg backdrop-blur-xl">
      <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-text-muted flex items-center gap-2 mb-3">
        <User className="h-3.5 w-3.5 text-brand-mint" />
        <span>About</span>
      </h2>

      {hasBio ? (
        <p className="text-sm sm:text-base font-normal text-text-secondary leading-relaxed whitespace-pre-line">
          {bio}
        </p>
      ) : (
        <p className="text-xs italic text-text-muted">
          No personal bio provided yet.
        </p>
      )}
    </div>
  );
}
