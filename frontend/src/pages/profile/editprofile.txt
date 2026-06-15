import {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import api
from "../../services/api";

function EditProfile() {

  const navigate =
    useNavigate();

  const [loading,
    setLoading] =
    useState(true);

  const [saving,
    setSaving] =
    useState(false);

  const [name,
    setName] =
    useState("");

  const [bio,
    setBio] =
    useState("");

  const [skills,
    setSkills] =
    useState("");

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

        const user =
          res.data.user;

        setName(
          user.name || ""
        );

        setBio(
          user.bio || ""
        );

        setSkills(
          user.skills?.join(
            ", "
          ) || ""
        );

      } catch (error) {

        console.log(error);

      } finally {

        setLoading(false);

      }

    };

  const handleSubmit =
    async (e) => {

      e.preventDefault();

      try {

        setSaving(true);

        await api.patch(
          "/profile/update",
          {

            name,

            bio,

            skills:
              skills
                .split(",")
                .map(
                  (skill) =>
                    skill.trim()
                )
                .filter(Boolean),

          }
        );

        alert(
          "Profile Updated"
        );

        navigate(
          "/profile"
        );

      } catch (error) {

        alert(
          error.response?.data?.message
        );

      } finally {

        setSaving(false);

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

      <div className="relative z-10 max-w-3xl mx-auto">

        <div className="bg-[#111111] border border-white/[0.07] rounded-3xl p-8 shadow-2xl shadow-black/60">

          <h1 className="text-3xl font-bold text-white mb-8">
            Edit Profile
          </h1>

          <form
            onSubmit={handleSubmit}
            className="space-y-6"
          >

            {/* Name */}
            <div>

              <label className="block text-sm text-white/50 mb-2">
                Full Name
              </label>

              <input
                type="text"
                value={name}
                onChange={(e) =>
                  setName(
                    e.target.value
                  )
                }
                className="w-full bg-[#0f0f0f] border border-white/[0.08] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-400/40"
              />

            </div>

            {/* Bio */}
            <div>

              <label className="block text-sm text-white/50 mb-2">
                Bio
              </label>

              <textarea
                rows="4"
                value={bio}
                onChange={(e) =>
                  setBio(
                    e.target.value
                  )
                }
                className="w-full bg-[#0f0f0f] border border-white/[0.08] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-400/40"
              />

            </div>

            {/* Skills */}
            <div>

              <label className="block text-sm text-white/50 mb-2">
                Skills
              </label>

              <input
                type="text"
                value={skills}
                onChange={(e) =>
                  setSkills(
                    e.target.value
                  )
                }
                placeholder="React, Node, Design"
                className="w-full bg-[#0f0f0f] border border-white/[0.08] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-400/40"
              />

              <p className="text-xs text-white/30 mt-2">
                Separate skills with commas
              </p>

            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4">

              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 rounded-xl bg-cyan-400 text-black font-semibold hover:bg-cyan-300"
              >

                {
                  saving
                    ? "Saving..."
                    : "Save Changes"
                }

              </button>

              <button
                type="button"
                onClick={() =>
                  navigate(
                    "/profile"
                  )
                }
                className="px-6 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white hover:bg-white/[0.06]"
              >
                Cancel
              </button>

            </div>

          </form>

        </div>

      </div>

    </div>

  );

}

export default EditProfile;