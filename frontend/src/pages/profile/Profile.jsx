import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import {
  FiAward,
  FiBookOpen,
  FiChevronRight,
  FiClock,
  FiStar,
  FiTarget,
  FiTrendingUp,
  FiCamera,
} from "react-icons/fi";

import api from "../../services/api";

const formatMinutes = (minutes = 0) => {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;

  return remaining ? `${hours}h ${remaining}m` : `${hours}h`;
};

function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [learningSummary, setLearningSummary] = useState(null);
  const [pointsSummary, setPointsSummary] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const [profileResult, learningResult, pointsResult] = await Promise.allSettled([
        api.get("/profile/me"),
        api.get("/courses/my-learning"),
        api.get("/courses/my-points"),
      ]);

      if (profileResult.status === "fulfilled") {
        setUser(profileResult.value.data.user);
        setImageError(false); // Reset error tracking on new data load
      }

      if (learningResult.status === "fulfilled") {
        setLearningSummary(learningResult.value.data.summary);
      }

      if (pointsResult.status === "fulfilled") {
        setPointsSummary(pointsResult.value.data);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  // Interactive Avatar Upload Handler
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client side restriction check (e.g. Max 3MB)
    if (file.size > 3 * 1024 * 1024) {
      alert("Image size must be less than 3MB");
      return;
    }

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      setUploading(true);
      // Calls your profile avatar route update pipeline
      const res = await api.post("/profile/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      
      alert("Avatar updated successfully");
      loadProfile(); // Refresh profile state with new image path
    } catch (error) {
      alert(error.response?.data?.message || "Failed to upload avatar image file.");
    } finally {
      setUploading(false);
    }
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.log(error);
    } finally {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07192a] flex items-center justify-center text-white font-body">
        <div className="flex items-center gap-3">
          <svg className="animate-spin h-5 w-5 text-[#9fd5b2]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm font-semibold uppercase tracking-widest text-white/60">Loading Profile...</span>
        </div>
      </div>
    );
  }

  const gamification = user?.gamification || {};
  const progressStats = [
    { label: "Completion", value: `${gamification.profileCompletion || 0}%`, icon: FiTarget },
    { label: "Points", value: gamification.totalPoints || 0, icon: FiStar },
    { label: "Level", value: gamification.level || 1, icon: FiTrendingUp },
    { label: "Rank", value: gamification.rank || "Beginner", icon: FiAward },
    { label: "Completed Courses", value: gamification.completedCourses || 0, icon: FiBookOpen },
    { label: "Watch Time", value: formatMinutes(gamification.totalWatchMinutes || 0), icon: FiClock },
  ];

  // Derive user initial for placeholder fallback state
  const userInitial = user?.name ? user.name.trim().charAt(0).toUpperCase() : "Z";

  return (
    <div className="min-h-screen bg-[#07192a] relative overflow-hidden px-4 py-6 sm:py-10 font-body text-white antialiased selection:bg-[#f6ed4a] selection:text-[#07192a]">
      <div className="relative z-10 max-w-6xl mx-auto space-y-6 sm:space-y-8">
        
        {/* GAMIFICATION OVERVIEW CONTAINER */}
        <div className="glass-card p-5 sm:p-6 shadow-2xl relative overflow-hidden flex flex-col">
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[rgba(159,213,178,0.25)] to-transparent" />
          
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg sm:text-xl font-heading font-black tracking-tight text-white">
              My Progress Dashboard
            </h2>
            <span className="rounded-full border border-[rgba(159,213,178,0.25)] bg-[rgba(159,213,178,0.08)] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#9fd5b2]">
              {gamification.achievements?.length || 0} achievements
            </span>
          </div>

          {/* Gamification Stats Matrix */}
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {progressStats.map((stat) => {
              const StatIcon = stat.icon;

              return (
                <div key={stat.label} className="rounded-xl border border-[rgba(159,213,178,0.12)] bg-white/[0.02] p-4 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-1">
                      {stat.label}
                    </p>
                    <p className="text-lg sm:text-xl font-heading font-black text-white truncate">
                      {stat.value}
                    </p>
                  </div>
                  <div className="h-10 w-10 rounded-lg bg-[rgba(159,213,178,0.06)] border border-[rgba(159,213,178,0.15)] flex items-center justify-center text-[#9fd5b2] shrink-0">
                    <StatIcon className="w-5 h-5" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Unified Progress Bar */}
          <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#9fd5b2] to-[#f6ed4a]"
              style={{ width: `${gamification.profileCompletion || 0}%` }}
            />
          </div>
        </div>

        {/* PROFILE IDENTIFICATION HERO MODULE */}
        <div className="glass-card p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[rgba(159,213,178,0.25)] to-transparent" />

          <div className="flex flex-col md:flex-row gap-6 items-center">
            
            {/* HIDDEN INPUT ELEMENT FOR AVATAR INTERACTION */}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/*" 
              className="hidden" 
            />

            {/* UPGRADED INTERACTIVE AVATAR WRAPPER */}
            <div 
              onClick={handleAvatarClick}
              className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 border-[rgba(159,213,178,0.35)] shadow-md shrink-0 overflow-hidden cursor-pointer group bg-[#0d2035] flex items-center justify-center"
              title="Click to change avatar picture"
            >
              {user?.avatar && !imageError ? (
                <img
                  src={user.avatar}
                  alt="Workstation Profile Avatar"
                  onError={() => setImageError(true)}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                /* High-Tech Fallback Initials Display Block if link is broken or null */
                <span className="text-3xl sm:text-4xl font-heading font-black text-[#9fd5b2] select-none">
                  {userInitial}
                </span>
              )}

              {/* Camera Hover Overlay Interface */}
              <div className="absolute inset-0 bg-[#07192a]/70 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-1">
                <FiCamera className="w-5 h-5 text-[#9fd5b2]" />
                <span className="text-[9px] uppercase font-bold tracking-wider text-white/80">
                  {uploading ? "Uploading..." : "Change"}
                </span>
              </div>

              {/* Uploading loading spinner overlay state */}
              {uploading && (
                <div className="absolute inset-0 bg-[#07192a]/80 flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 text-[#f6ed4a]" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              )}
            </div>

            <div className="flex-1 text-center md:text-left min-w-0">
              <h1 className="text-2xl sm:text-3xl font-heading font-black text-white tracking-tight truncate">
                {user?.name}
              </h1>

              <div className="flex flex-wrap gap-2 justify-center md:justify-start mt-2.5">
                <span className="px-3 py-0.5 rounded-full bg-[rgba(159,213,178,0.1)] border border-[rgba(159,213,178,0.25)] text-[#9fd5b2] text-xs font-semibold uppercase tracking-wide">
                  {user?.role}
                </span>

                {user?.isVerified && (
                  <span className="px-3 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wide flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Verified
                  </span>
                )}
              </div>

              <p className="text-white/60 mt-4 text-sm max-w-2xl leading-relaxed font-medium">
                {user?.bio || "No custom domain bio summary appended to this profile asset yet."}
              </p>

              <div className="mt-5">
                <Link
                  to="/profile/edit"
                  className="px-5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs font-semibold uppercase tracking-wider text-white hover:bg-white/[0.08] transition-colors inline-block"
                >
                  Edit Profile
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* FUNCTIONAL VIEWS & METRICS GRID SYSTEM */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          
          {/* MY LEARNING LINK CONTAINER */}
          <Link
            to="/my-learning"
            className="group glass-card p-5 sm:p-6 shadow-xl hover:border-[#9fd5b2]/40 hover:bg-white/[0.06] transition-all flex flex-col justify-between"
          >
            <div className="w-full">
              <div className="flex justify-between items-center mb-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(159,213,178,0.1)] border border-[rgba(159,213,178,0.2)] text-[#9fd5b2]">
                    <FiBookOpen className="w-4 h-4" />
                  </span>
                  <h2 className="text-base font-heading font-black text-white">My Learning</h2>
                </div>
                <FiChevronRight className="text-[#9fd5b2] transition-transform group-hover:translate-x-1 w-4 h-4" />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] p-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">Courses</p>
                  <p className="mt-0.5 text-base font-bold text-white">{learningSummary?.totalCourses || 0}</p>
                </div>
                <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] p-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">Complete</p>
                  <p className="mt-0.5 text-base font-bold text-white">{learningSummary?.overallCompletionPercent || 0}%</p>
                </div>
                <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] p-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">Classes</p>
                  <p className="mt-0.5 text-sm font-bold text-white truncate">
                    {learningSummary?.completedClasses || 0}/{learningSummary?.totalClasses || 0}
                  </p>
                </div>
                <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] p-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">Streak</p>
                  <p className="mt-0.5 text-base font-bold text-white">{learningSummary?.learningStreak || 0}d</p>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-1 w-full">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-[#9fd5b2]"
                  style={{ width: `${learningSummary?.overallCompletionPercent || 0}%` }}
                />
              </div>
            </div>
          </Link>

          {/* MY POINTS LINK CONTAINER */}
          <Link
            to="/my-points"
            className="group glass-card p-5 sm:p-6 shadow-xl hover:border-[#9fd5b2]/40 hover:bg-white/[0.06] transition-all flex flex-col justify-between"
          >
            <div className="w-full">
              <div className="flex justify-between items-center mb-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(159,213,178,0.1)] border border-[rgba(159,213,178,0.2)] text-[#9fd5b2]">
                    <FiStar className="w-4 h-4" />
                  </span>
                  <h2 className="text-base font-heading font-black text-white">My Points</h2>
                </div>
                <FiChevronRight className="text-[#9fd5b2] transition-transform group-hover:translate-x-1 w-4 h-4" />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] p-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">Points</p>
                  <p className="mt-0.5 text-base font-bold text-white">
                    {pointsSummary?.gamification?.totalPoints || user?.gamification?.totalPoints || 0}
                  </p>
                </div>
                <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] p-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">Level</p>
                  <p className="mt-0.5 text-base font-bold text-white">
                    {pointsSummary?.gamification?.level || user?.gamification?.level || 1}
                  </p>
                </div>
                <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] p-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">Rank</p>
                  <p className="mt-0.5 text-sm font-bold text-white truncate">
                    {pointsSummary?.gamification?.rank || user?.gamification?.rank || "Beginner"}
                  </p>
                </div>
                <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] p-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">Next</p>
                  <p className="mt-0.5 text-sm font-bold text-white truncate">
                    {pointsSummary?.levelProgress?.pointsToNextLevel || 0} pts
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-1 w-full">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-[#f6ed4a]"
                  style={{ width: `${pointsSummary?.levelProgress?.progressPercent || 0}%` }}
                />
              </div>
            </div>
          </Link>

          {/* ACCOUNT PARAMETERS CONFIGURATION */}
          <div className="glass-card p-5 sm:p-6 shadow-xl flex flex-col justify-between">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#9fd5b2] mb-4">
                Account Parameters
              </h2>

              <div className="space-y-3.5">
                <div>
                  <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider mb-0.5">
                    Email Identifier
                  </p>
                  <p className="text-sm font-medium text-white/90 truncate">
                    {user?.email}
                  </p>
                </div>

                <div>
                  <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider mb-0.5">
                    System Registration Date
                  </p>
                  <p className="text-sm font-medium text-white/90">
                    {user?.Start_Date ? new Date(user.Start_Date).toLocaleDateString() : "N/A"}
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-4 text-[10px] font-bold tracking-widest text-white/20 uppercase select-none">
              Identity Matrix Metadata
            </div>
          </div>

          {/* ACTIVE WORKSTATION WORKSPACE TRACKER */}
          <Link
            to="/active-sessions"
            className="group glass-card p-5 sm:p-6 shadow-xl hover:border-[#9fd5b2]/40 hover:bg-white/[0.06] transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#9fd5b2]">
                  Active Sessions
                </h2>
                <span className="text-[#9fd5b2] group-hover:translate-x-0.5 transition-transform text-base">
                  &rarr;
                </span>
              </div>
              <p className="text-white/50 text-xs font-medium leading-relaxed">
                Monitor cryptographic login nodes and terminate non-authorized running workstation allocations.
              </p>
            </div>
            <div className="mt-4 text-[10px] font-bold tracking-widest text-white/30 uppercase">
              Manage Security Parameters
            </div>
          </Link>

          {/* INTEGRATED ACCOUNT AUDIT TRAIL STREAM */}
          <Link
            to="/audit-logs"
            className="group glass-card p-5 sm:p-6 shadow-xl hover:border-[#9fd5b2]/40 hover:bg-white/[0.06] transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#9fd5b2]">
                  Audit Logs
                </h2>
                <span className="text-[#9fd5b2] group-hover:translate-x-0.5 transition-transform text-base">
                  &rarr;
                </span>
              </div>
              <p className="text-white/50 text-xs font-medium leading-relaxed">
                Examine structured historical system mutations, login actions, and overall account metric updates.
              </p>
            </div>
            <div className="mt-4 text-[10px] font-bold tracking-widest text-white/30 uppercase">
              View Activity Streams
            </div>
          </Link>
        </div>

        {/* TECHNICAL SPECIALTIES BLOCK */}
        <div className="glass-card p-5 sm:p-6 shadow-xl">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#9fd5b2] mb-4">
            Technical Knowledge Specialties
          </h2>

          <div className="flex flex-wrap gap-2">
            {user?.skills?.length ? (
              user.skills.map((skill, index) => (
                <span
                  key={index}
                  className="px-3.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs text-white/80 font-medium tracking-wide shadow-sm"
                >
                  {skill}
                </span>
              ))
            ) : (
              <p className="text-white/30 text-xs font-medium uppercase tracking-wider">
                No expertise matrix fields added to this profile index.
              </p>
            )}
          </div>
        </div>

        {/* SECURE TERMINATION CTA TRIGGER BLOCK */}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={logout}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#f6ed4a] text-[#07192a] font-extrabold text-xs tracking-wider uppercase shadow-[0_4px_20px_rgba(246,237,74,0.15)] hover:shadow-[0_4px_25px_rgba(246,237,74,0.25)] hover:scale-[1.01] active:scale-[0.99] transition-all duration-150 cubic-bezier(0.4, 0, 0.2, 1) cursor-pointer"
          >
            Logout Securely
          </button>
        </div>
      </div>
    </div>
  );
}

export default Profile;