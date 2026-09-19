import { Lock } from "lucide-react";
import ProfileHeader from "./ProfileHeader";

/**
 * ProfilePrivateState Component
 * Displayed when a student has limited their public profile information.
 *
 * @param {Object} props
 * @param {Object} props.profile - PublicNetworkProfile object (minimal safe projection)
 */
export default function ProfilePrivateState({ profile }) {
  return (
    <div className="space-y-6 sm:space-y-8">
      <ProfileHeader profile={profile} isOwnProfile={false} />

      <div className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.08] bg-bg-surface/80 p-8 sm:p-12 text-center shadow-lg backdrop-blur-xl max-w-lg mx-auto">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.1] bg-white/[0.04] text-text-muted mb-4">
          <Lock className="h-6 w-6 text-text-muted" aria-hidden="true" />
        </div>

        <h2 className="text-base sm:text-lg font-heading font-bold text-white">
          Private Profile
        </h2>

        <p className="mt-1.5 text-xs text-text-muted leading-relaxed max-w-sm">
          This student has limited their public profile information. Only basic learning identity and connection actions are accessible.
        </p>
      </div>
    </div>
  );
}
