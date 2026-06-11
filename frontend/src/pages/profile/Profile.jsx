import {
  useEffect,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import api
from "../../services/api";

import {
  FiAward,
  FiBookOpen,
  FiChevronRight,
  FiClock,
  FiStar,
  FiTarget,
  FiTrendingUp,
} from "react-icons/fi";

const formatMinutes = (minutes = 0) => {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;

  return remaining ? `${hours}h ${remaining}m` : `${hours}h`;
};

function Profile() {

  const [user, setUser] =
    useState(null);

  const [loading, setLoading] =
    useState(true);
  const [learningSummary, setLearningSummary] =
    useState(null);
  const [pointsSummary, setPointsSummary] =
    useState(null);

  useEffect(() => {

    loadProfile();

  }, []);

  const loadProfile =
    async () => {

      try {

        const [
          profileResult,
          learningResult,
          pointsResult,
        ] = await Promise.allSettled([
          api.get(
            "/profile/me"
          ),
          api.get(
            "/courses/my-learning"
          ),
          api.get(
            "/courses/my-points"
          ),
        ]);

        if (profileResult.status === "fulfilled") {
          setUser(
            profileResult.value.data.user
          );
        }

        if (learningResult.status === "fulfilled") {
          setLearningSummary(
            learningResult.value.data.summary
          );
        }

        if (pointsResult.status === "fulfilled") {
          setPointsSummary(
            pointsResult.value.data
          );
        }

      } catch (error) {

        console.log(error);

      } finally {

        setLoading(false);

      }

    };

  const logout =
    async () => {

      try {

        await api.post(
          "/auth/logout"
        );

      } catch (error) {

        console.log(error);

      } finally {

        localStorage.removeItem(
          "token"
        );

        window.location.href =
          "/login";

      }

    };

  if (loading) {

    return (

      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-white">
        Loading...
      </div>

    );

  }

  return (

    <div className="min-h-screen bg-[#0a0a0a] relative overflow-hidden px-4 py-10">

      {/* Glow */}
      <div className="absolute top-[-120px] left-[-100px] w-[420px] h-[420px] bg-cyan-500/10 rounded-full blur-[120px]" />

      <div className="absolute bottom-[-100px] right-[-80px] w-[360px] h-[360px] bg-violet-600/10 rounded-full blur-[100px]" />

      {/* Grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{

          backgroundImage:
            "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",

          backgroundSize:
            "40px 40px",

        }}
      />

      <div className="relative z-10 max-w-6xl mx-auto">

        {(() => {

          const gamification =
            user?.gamification || {};

          const stats = [
            {
              label: "Completion",
              value: `${gamification.profileCompletion || 0}%`,
              icon: FiTarget,
              color: "text-cyan-300",
            },
            {
              label: "Points",
              value: gamification.totalPoints || 0,
              icon: FiStar,
              color: "text-amber-300",
            },
            {
              label: "Level",
              value: gamification.level || 1,
              icon: FiTrendingUp,
              color: "text-emerald-300",
            },
            {
              label: "Rank",
              value: gamification.rank || "Beginner",
              icon: FiAward,
              color: "text-violet-300",
            },
            {
              label: "Completed Courses",
              value: gamification.completedCourses || 0,
              icon: FiBookOpen,
              color: "text-sky-300",
            },
            {
              label: "Watch Time",
              value: formatMinutes(gamification.totalWatchMinutes || 0),
              icon: FiClock,
              color: "text-rose-300",
            },
          ];

          return (

            <div className="mb-8 rounded-[28px] border border-white/[0.08] bg-white/[0.04] p-5 shadow-2xl shadow-black/40 backdrop-blur-xl">

              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">

                <h2 className="text-xl font-semibold text-white">
                  My Progress
                </h2>

                <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-sm text-emerald-200">
                  {gamification.achievements?.length || 0} achievements
                </span>

              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

                {stats.map((stat) => {

                  const Icon =
                    stat.icon;

                  return (

                    <div
                      key={stat.label}
                      className="rounded-2xl border border-white/[0.07] bg-black/20 p-4"
                    >

                      <div className="mb-3 flex items-center gap-2 text-sm text-white/45">

                        <Icon className={stat.color} />

                        {stat.label}

                      </div>

                      <p className="text-xl font-semibold text-white">
                        {stat.value}
                      </p>

                    </div>

                  );

                })}

              </div>

              <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/[0.07]">

                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-emerald-300 to-amber-300"
                  style={{
                    width: `${gamification.profileCompletion || 0}%`,
                  }}
                />

              </div>

            </div>

          );

        })()}

        {/* HEADER */}
        <div className="bg-[#111111] border border-white/[0.07] rounded-3xl p-8 mb-8 shadow-2xl shadow-black/60">

          <div className="flex flex-col md:flex-row gap-6 items-center">

            <img
              src={
                user?.avatar ||
                "https://placehold.co/120x120"
              }
              alt="avatar"
              className="w-28 h-28 rounded-full object-cover border border-cyan-400/20"
            />

            <div className="flex-1 text-center md:text-left">

              <h1 className="text-3xl font-bold text-white">
                {user?.name}
              </h1>

              <div className="flex flex-wrap gap-2 justify-center md:justify-start mt-3">

                <span className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/20 text-cyan-300 text-sm">
                  {user?.role}
                </span>

                {

                  user?.isVerified && (

                    <span className="px-3 py-1 rounded-full bg-green-500/10 border border-green-400/20 text-green-300 text-sm">
                      Verified
                    </span>

                  )

                }

              </div>

              <p className="text-white/40 mt-4 text-sm">
                {
                  user?.bio ||
                  "No bio added yet."
                }
              </p>

              <div className="mt-5">

                <Link
                  to="/profile/edit"
                  className="px-5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white text-sm hover:bg-white/[0.06]"
                >
                  Edit Profile
                </Link>

              </div>

            </div>

          </div>

        </div>

        {/* GRID */}
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">

          {/* MY LEARNING */}
          <Link
            to="/my-learning"
            className="group bg-[#111111] border border-white/[0.07] rounded-2xl p-6 hover:border-cyan-400/30 transition-all"
          >

            <div className="flex justify-between mb-5">

              <div className="flex items-center gap-3">

                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-300">
                  <FiBookOpen />
                </span>

                <h2 className="text-lg font-semibold text-white">
                  My Learning
                </h2>

              </div>

              <FiChevronRight className="text-cyan-300 transition-transform group-hover:translate-x-1" />

            </div>

            <div className="grid grid-cols-2 gap-3">

              <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
                <p className="text-xs text-white/35">
                  Courses
                </p>
                <p className="mt-1 text-lg font-semibold text-white">
                  {learningSummary?.totalCourses || 0}
                </p>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
                <p className="text-xs text-white/35">
                  Complete
                </p>
                <p className="mt-1 text-lg font-semibold text-white">
                  {learningSummary?.overallCompletionPercent || 0}%
                </p>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
                <p className="text-xs text-white/35">
                  Classes
                </p>
                <p className="mt-1 text-lg font-semibold text-white">
                  {learningSummary?.completedClasses || 0}/
                  {learningSummary?.totalClasses || 0}
                </p>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
                <p className="text-xs text-white/35">
                  Streak
                </p>
                <p className="mt-1 text-lg font-semibold text-white">
                  {learningSummary?.learningStreak || 0}d
                </p>
              </div>

            </div>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.07]">

              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-emerald-300"
                style={{
                  width: `${learningSummary?.overallCompletionPercent || 0}%`,
                }}
              />

            </div>

          </Link>

          {/* MY POINTS */}
          <Link
            to="/my-points"
            className="group bg-[#111111] border border-white/[0.07] rounded-2xl p-6 hover:border-amber-400/30 transition-all"
          >

            <div className="flex justify-between mb-5">

              <div className="flex items-center gap-3">

                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-300">
                  <FiStar />
                </span>

                <h2 className="text-lg font-semibold text-white">
                  My Points
                </h2>

              </div>

              <FiChevronRight className="text-amber-300 transition-transform group-hover:translate-x-1" />

            </div>

            <div className="grid grid-cols-2 gap-3">

              <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
                <p className="text-xs text-white/35">
                  Points
                </p>
                <p className="mt-1 text-lg font-semibold text-white">
                  {pointsSummary?.gamification?.totalPoints || user?.gamification?.totalPoints || 0}
                </p>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
                <p className="text-xs text-white/35">
                  Level
                </p>
                <p className="mt-1 text-lg font-semibold text-white">
                  {pointsSummary?.gamification?.level || user?.gamification?.level || 1}
                </p>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
                <p className="text-xs text-white/35">
                  Rank
                </p>
                <p className="mt-1 truncate text-lg font-semibold text-white">
                  {pointsSummary?.gamification?.rank || user?.gamification?.rank || "Beginner"}
                </p>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
                <p className="text-xs text-white/35">
                  Next
                </p>
                <p className="mt-1 text-lg font-semibold text-white">
                  {pointsSummary?.levelProgress?.pointsToNextLevel || 0} pts
                </p>
              </div>

            </div>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.07]">

              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-300 to-cyan-300"
                style={{
                  width: `${pointsSummary?.levelProgress?.progressPercent || 0}%`,
                }}
              />

            </div>

          </Link>

          {/* INFO */}
          <div className="bg-[#111111] border border-white/[0.07] rounded-2xl p-6">

            <h2 className="text-lg font-semibold text-white mb-5">
              Account Info
            </h2>

            <div className="space-y-4">

              <div>

                <p className="text-white/30 text-sm">
                  Email
                </p>

                <p className="text-white">
                  {user?.email}
                </p>

              </div>

              <div>

                <p className="text-white/30 text-sm">
                  Joined
                </p>

                <p className="text-white">
                  {
                    new Date(
                      user?.Start_Date
                    ).toLocaleDateString()
                  }
                </p>

              </div>

            </div>

          </div>

          {/* ACTIVE SESSIONS */}
          <Link
            to="/active-sessions"
            className="group bg-[#111111] border border-white/[0.07] rounded-2xl p-6 hover:border-cyan-400/30 transition-all"
          >

            <div className="flex justify-between mb-5">

              <h2 className="text-lg font-semibold text-white">
                Active Sessions
              </h2>

              <span className="text-cyan-400">
                →
              </span>

            </div>

            <p className="text-white/40 text-sm">
              View and manage logged in devices.
            </p>

          </Link>

          {/* AUDIT LOGS */}
          <Link
            to="/audit-logs"
            className="group bg-[#111111] border border-white/[0.07] rounded-2xl p-6 hover:border-violet-400/30 transition-all"
          >

            <div className="flex justify-between mb-5">

              <h2 className="text-lg font-semibold text-white">
                Audit Logs
              </h2>

              <span className="text-violet-400">
                →
              </span>

            </div>

            <p className="text-white/40 text-sm">
              Authentication and security activity.
            </p>

          </Link>

        </div>

        {/* SKILLS */}
        <div className="mt-8 bg-[#111111] border border-white/[0.07] rounded-2xl p-6">

          <h2 className="text-lg font-semibold text-white mb-5">
            Skills
          </h2>

          <div className="flex flex-wrap gap-2">

            {

              user?.skills?.length ? (

                user.skills.map(
                  (
                    skill,
                    index
                  ) => (

                    <span
                      key={index}
                      className="px-3 py-1 rounded-full bg-white/[0.04] text-white/70 text-sm"
                    >
                      {skill}
                    </span>

                  )
                )

              ) : (

                <p className="text-white/30">
                  No skills added
                </p>

              )

            }

          </div>

        </div>

        {/* LOGOUT */}
        <div className="mt-8 flex justify-end">

          <button
            onClick={logout}
            className="px-6 py-3 rounded-xl bg-cyan-400 text-black font-semibold hover:bg-cyan-300"
          >
            Logout
          </button>

        </div>

      </div>

    </div>

  );

}

export default Profile;
