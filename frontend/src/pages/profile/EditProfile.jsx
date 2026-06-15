import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

function EditProfile() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await api.get("/profile/me");
      const user = res.data.user;

      setName(user.name || "");
      setBio(user.bio || "");
      setSkills(user.skills?.join(", ") || "");
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.patch("/profile/update", {
        name,
        bio,
        skills: skills
          .split(",")
          .map((skill) => skill.trim())
          .filter(Boolean),
      });

      alert("Profile Updated");
      navigate("/profile");
    } catch (error) {
      alert(error.response?.data?.message || "Failed to update profile parameters.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07192a] flex items-center justify-center text-white font-['DM_Sans']">
        <div className="flex items-center gap-3">
          <svg className="animate-spin h-5 w-5 text-[#9fd5b2]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm font-semibold uppercase tracking-widest text-white/60">Loading Profile Data…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07192a] flex flex-col justify-center relative overflow-hidden px-4 py-10 font-['DM_Sans'] text-white antialiased selection:bg-[#f6ed4a] selection:text-[#07192a]">
      <div className="relative z-10 max-w-3xl w-full mx-auto">
        
        {/* TOP INTERIOR HORIZON GRADIENT ACCENT LINE */}
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[rgba(159,213,178,0.25)] to-transparent z-20" />

        {/* PROFILE RECONSTITUTION FORM COMPONENT */}
        <div className="w-full glass-card p-8 md:p-10 shadow-2xl relative overflow-hidden flex flex-col">
          
          <h1 className="text-2xl font-heading font-bold text-white tracking-tight mb-8">
            Edit Workspace Profile
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6 w-full flex flex-col">
            
            {/* Full Name Parameter Field */}
            <div className="w-full">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#9fd5b2] mb-2 text-left">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full glass-input px-4 py-3 text-sm placeholder-white/20 font-medium block"
                placeholder="e.g., John Doe"
              />
            </div>

            {/* Professional Bio Parameter Field */}
            <div className="w-full">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#9fd5b2] mb-2 text-left">
                Domain Biography Summary
              </label>
              <textarea
                rows="4"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full glass-input px-4 py-3 text-sm placeholder-white/20 font-medium block resize-none leading-relaxed"
                placeholder="Detail your industrial focus fields, training milestones, or career goals..."
              />
            </div>

            {/* Technical Expertise Allocation Tags Input */}
            <div className="w-full">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#9fd5b2] mb-2 text-left">
                Technical Knowledge Specialties
              </label>
              <input
                type="text"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                placeholder="React, Quantity Surveying, CAD, Civil Engineering"
                className="w-full glass-input px-4 py-3 text-sm placeholder-white/20 font-medium block"
              />
              <p className="text-[10px] uppercase font-bold tracking-wider text-white/30 mt-2.5">
                * Parse structural attributes separating singular items with commas
              </p>
            </div>

            {/* Execution Control Trigger Arrays */}
            <div className="flex flex-wrap items-center gap-3 pt-4 w-full">
              
              {/* PRIMARY VALIDATION CTA: VOLT YELLOW EXCLUSIVE THEME CONFIG [cite: 48] */}
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 rounded-xl bg-[#f6ed4a] text-[#07192a] font-extrabold text-xs tracking-wider uppercase shadow-[0_4px_15px_rgba(246,237,74,0.15)] hover:shadow-[0_4px_20px_rgba(246,237,74,0.25)] hover:scale-[1.01] active:scale-[0.99] transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
              >
                {saving ? "Saving Matrices…" : "Save Changes"}
              </button>

              {/* SECONDARY CANCELLATION FALLBACK TRIGGER */}
              <button
                type="button"
                onClick={() => navigate("/profile")}
                className="px-6 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs font-semibold uppercase tracking-wider text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
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