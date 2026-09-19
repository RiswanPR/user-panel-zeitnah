import { useContext, useEffect } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { AuthContext } from "../../context/AuthContext";
import networkService from "../../services/networkService";

import ProfileHeader from "../../components/network/profile/ProfileHeader";
import ProfileTabs from "../../components/network/profile/ProfileTabs";
import ProfileStats from "../../components/network/profile/ProfileStats";
import ProfileIdentity from "../../components/network/profile/ProfileIdentity";
import ProfileAbout from "../../components/network/profile/ProfileAbout";
import ProfileCourses from "../../components/network/profile/ProfileCourses";
import ProfileAchievements from "../../components/network/profile/ProfileAchievements";
import ProfileActivity from "../../components/network/profile/ProfileActivity";
import ProfileSkeleton from "../../components/network/profile/ProfileSkeleton";
import ProfileNotFound from "../../components/network/profile/ProfileNotFound";
import ProfilePrivateState from "../../components/network/profile/ProfilePrivateState";

/**
 * NetworkProfilePage Component
 * Full student learning profile view for Zeitnah LMS Network.
 * Route: /network/profile/:username
 */
export default function NetworkProfilePage() {
  const { username } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user: authUser } = useContext(AuthContext);

  const activeTab = searchParams.get("tab") || "overview";

  const {
    data: profile,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["network-profile", username],
    queryFn: () => networkService.getStudentProfile(username),
    staleTime: 1000 * 60 * 2,
    enabled: Boolean(username),
    retry: 1,
  });

  const isOwnProfile = Boolean(
    authUser &&
      profile?.user &&
      (authUser.username?.toLowerCase() === profile.user.username?.toLowerCase() ||
        authUser.id === profile.user.id ||
        authUser._id === profile.user.id),
  );

  // SEO Document title
  useEffect(() => {
    if (profile?.user?.name) {
      document.title = `${profile.user.name} (@${profile.user.username}) — Zeitnah Network`;
    }
  }, [profile]);

  const handleTabChange = (newTab) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (newTab === "overview") {
          next.delete("tab");
        } else {
          next.set("tab", newTab);
        }
        return next;
      },
      { replace: true },
    );
  };

  if (isLoading) {
    return <ProfileSkeleton />;
  }

  if (isError || !profile) {
    return <ProfileNotFound />;
  }

  if (profile.isPrivate) {
    return <ProfilePrivateState profile={profile} />;
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* ── BREADCRUMB / BACK NAVIGATION ── */}
      <div className="flex items-center justify-between">
        <Link
          to="/network"
          className="inline-flex items-center gap-2 text-xs font-semibold text-text-muted hover:text-white transition-colors focus-ring rounded-lg px-1 py-0.5"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Network</span>
        </Link>
      </div>

      {/* ── 1. PROFILE HEADER ── */}
      <ProfileHeader profile={profile} isOwnProfile={isOwnProfile} />

      {/* ── 2. STATS OVERVIEW ── */}
      <ProfileStats stats={profile.learning?.stats} />

      {/* ── 3. SECONDARY TABS ── */}
      <ProfileTabs activeTab={activeTab} onTabChange={handleTabChange} />

      {/* ── 4. TAB CONTENTS ── */}

      {/* OVERVIEW TAB */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-6">
            <ProfileIdentity identity={profile.identity} />
            <ProfileCourses courses={profile.learning?.courses} />
          </div>

          {/* Side Column */}
          <div className="space-y-6">
            <ProfileAbout bio={profile.user?.bio} />
            <ProfileAchievements achievements={profile.achievements} />
            <ProfileActivity activity={profile.activity} />
          </div>
        </div>
      )}

      {/* LEARNING TAB */}
      {activeTab === "learning" && (
        <div className="space-y-6">
          <ProfileIdentity identity={profile.identity} />
          <ProfileCourses courses={profile.learning?.courses} />
        </div>
      )}

      {/* ACHIEVEMENTS TAB */}
      {activeTab === "achievements" && (
        <div className="space-y-6">
          <ProfileAchievements achievements={profile.achievements} />
        </div>
      )}

      {/* ACTIVITY TAB */}
      {activeTab === "activity" && (
        <div className="space-y-6">
          <ProfileActivity activity={profile.activity} />
        </div>
      )}
    </div>
  );
}
