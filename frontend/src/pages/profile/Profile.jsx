import {
  useEffect,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import api
from "../../services/api";

function Profile() {

  const [user, setUser] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {

    loadProfile();

  }, []);

  const loadProfile =
    async () => {

      try {

        const res =
          await api.get(
            "/profile/me"
          );

        setUser(
          res.data.user
        );

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
                      user?.createdAt
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