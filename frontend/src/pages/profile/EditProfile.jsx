import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Save, X, Lock } from "lucide-react";
import api from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import { useToast } from "../../components/ui/Toast";

function EditProfile() {
  const navigate = useNavigate();
  const { updateUser } = useContext(AuthContext);
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await api.get("/profile/me");
        const user = res.data.user;
        setUsername(user.username || "");
        setName(user.name || "");
        setBio(user.bio || "");
        setSkills(user.skills?.join(", ") || "");
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const parsedSkills = skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await api.patch("/profile/update", {
        name,
        bio,
        skills: parsedSkills,
      });

      // Synchronize central authenticated user state immediately
      updateUser({
        name,
        bio,
        skills: parsedSkills,
      });

      toast.success("Profile updated", "Your changes have been saved.");
      navigate("/profile");
    } catch (error) {
      toast.error("Update failed", "Could not save your profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-text-muted text-sm font-medium">
          <svg className="animate-spin h-5 w-5 text-brand-mint" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading profile...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* ── Back ── */}
      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        type="button"
        onClick={() => navigate("/profile")}
        className="btn-secondary text-xs uppercase tracking-wider"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to profile
      </motion.button>

      {/* ── Form Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl border border-border-default bg-bg-card p-6 sm:p-8 relative overflow-hidden"
      >
        <div className="gradient-line-top" />

        <h1 className="text-2xl font-heading font-bold text-white tracking-tight mb-8">
          Edit Profile
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6 w-full flex flex-col">

          {/* Username (Permanent Identity) */}
          <div className="w-full">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-brand-mint flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                Permanent Handle
              </label>
              <span className="text-[10px] font-mono text-brand-mint font-bold px-2 py-0.5 rounded bg-brand-mint/10 border border-brand-mint/20">
                Locked
              </span>
            </div>
            <div className="w-full glass-input px-4 py-3 text-sm font-mono text-text-secondary bg-black/40 flex items-center justify-between border-white/[0.08] cursor-not-allowed select-none">
              <span>@{username || "student"}</span>
              <span className="text-[11px] text-text-muted font-sans font-medium">Permanent Identity</span>
            </div>
            <p className="text-[10px] font-medium text-text-muted mt-1.5">
              Your Zeitnah handle cannot be changed after initial claim.
            </p>
          </div>

          {/* Name */}
          <div className="w-full">
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-mint mb-2">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full glass-input px-4 py-3.5 text-sm font-medium"
              placeholder="e.g., John Doe"
            />
          </div>

          {/* Bio */}
          <div className="w-full">
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-mint mb-2">
              Biography
            </label>
            <textarea
              rows="4"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full glass-input px-4 py-3.5 text-sm font-medium resize-none leading-relaxed"
              placeholder="Share your learning goals, professional background, or interests..."
            />
          </div>

          {/* Skills */}
          <div className="w-full">
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-mint mb-2">
              Skills & Specialties
            </label>
            <input
              type="text"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="React, Engineering, CAD, Design"
              className="w-full glass-input px-4 py-3.5 text-sm font-medium"
            />
            <p className="text-[10px] font-medium tracking-wider text-text-muted mt-2">
              Separate skills with commas
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="btn-primary py-3 px-6"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/profile")}
              className="btn-secondary py-3 px-6"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default EditProfile;