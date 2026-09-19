import { useContext, useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Save,
  X,
  Pencil,
  AtSign,
  User,
  Mail,
  FileText,
  Sparkles,
  Plus,
  Camera,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import { AuthContext } from "../../context/AuthContext";
import { coreProfileService } from "../../services/coreProfileService";
import { useToast } from "../../components/ui/Toast";
import ChangeUsernameModal from "../../components/username/ChangeUsernameModal";
import ProfileNav from "../../components/profile/ProfileNav";
import { getUploadUrl } from "../../utils/courseUi";

const MAX_BIO_LENGTH = 500;
const MAX_SKILLS = 25;

export default function EditProfile() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { updateUser, setUser } = useContext(AuthContext);
  const toast = useToast();
  const fileRef = useRef(null);

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState("");
  const [username, setUsername] = useState("");
  const [changeUsernameOpen, setChangeUsernameOpen] = useState(false);

  // TanStack Query for initial profile data
  const {
    data,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["profile", "me"],
    queryFn: coreProfileService.getMyProfile,
  });

  const profile = data?.user;

  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setBio(profile.bio || "");
      setSkills(Array.isArray(profile.skills) ? profile.skills : []);
      setUsername(profile.username || "");
    }
  }, [profile]);

  // Update Profile Mutation
  const updateMutation = useMutation({
    mutationFn: (payload) => coreProfileService.updateMyProfile(payload),
    onSuccess: (res) => {
      // Invalidate and update query cache
      queryClient.setQueryData(["profile", "me"], (old) => {
        if (!old?.user) return old;
        return {
          ...old,
          user: res.user,
        };
      });

      // Synchronize central authenticated user state across sidebar, header, etc.
      updateUser({
        name: res.user?.name,
        bio: res.user?.bio,
        skills: res.user?.skills,
      });

      toast.success("Profile updated", "Your identity details have been saved.");
      navigate("/profile");
    },
    onError: (err) => {
      const msg = err.response?.data?.message || "Could not save profile changes.";
      toast.error("Update failed", msg);
    },
  });

  // Avatar Upload Mutation
  const avatarMutation = useMutation({
    mutationFn: (file) => coreProfileService.uploadAvatar(file),
    onSuccess: (res) => {
      queryClient.setQueryData(["profile", "me"], (old) => {
        if (!old?.user) return old;
        return {
          ...old,
          user: { ...old.user, avatar: res.avatar },
        };
      });
      setUser((prev) => (prev ? { ...prev, avatar: res.avatar } : prev));
      toast.success("Avatar updated", "Your profile photo has been updated.");
    },
    onError: (err) => {
      const msg = err.response?.data?.message || "Could not upload avatar.";
      toast.error("Upload failed", msg);
    },
  });

  const handleAvatarFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      return toast.error("File too large", "Avatar image must be under 5 MB.");
    }
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      return toast.error("Invalid format", "Only JPG, PNG, and WebP images are permitted.");
    }

    avatarMutation.mutate(file);
  };

  const handleAddSkill = (e) => {
    e?.preventDefault();
    const trimmed = skillInput.trim();
    if (!trimmed) return;

    if (skills.length >= MAX_SKILLS) {
      return toast.error("Limit reached", `You can add a maximum of ${MAX_SKILLS} skills.`);
    }

    if (skills.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      return toast.error("Duplicate skill", "This skill has already been added.");
    }

    setSkills([...skills, trimmed]);
    setSkillInput("");
  };

  const handleRemoveSkill = (skillToRemove) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      return toast.error("Name required", "Please enter your full name.");
    }
    if (bio.length > MAX_BIO_LENGTH) {
      return toast.error("Bio too long", `Biography must not exceed ${MAX_BIO_LENGTH} characters.`);
    }

    updateMutation.mutate({
      name: name.trim(),
      bio: bio.trim(),
      skills,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto animate-pulse">
        <div className="h-14 bg-bg-card rounded-2xl border border-border-default" />
        <div className="h-96 bg-bg-card rounded-2xl border border-border-default" />
      </div>
    );
  }

  const avatarUrl = getUploadUrl(profile?.avatar);
  const initials = name
    ? name
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "ZU";

  return (
    <div className="space-y-6 sm:space-y-8 max-w-4xl mx-auto">
      {/* ── Sub-Navigation ── */}
      <ProfileNav />

      {/* ── Top Bar with Back Action ── */}
      <div className="flex items-center justify-between">
        <Link
          to="/profile"
          className="btn-secondary text-xs uppercase tracking-wider inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Overview
        </Link>

        <span className="text-xs text-text-muted font-medium">
          Editing Zeitnah Identity
        </span>
      </div>

      {/* ── Main Form Container ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border-default bg-bg-card p-6 sm:p-8 relative overflow-hidden shadow-sm"
      >
        <div className="gradient-line-top" />

        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-heading font-black text-white tracking-tight">
            Personal Information
          </h1>
          <p className="text-xs sm:text-sm text-text-muted mt-1 leading-relaxed">
            Manage your personal profile details, biography, specialties, and avatar image.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 w-full">
          {/* Section 1: Profile Photo */}
          <div className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-mint mb-3 flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5" />
              Profile Photo
            </label>

            <div className="flex flex-col sm:flex-row items-center gap-5">
              <div className="relative group shrink-0">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-brand-mint/25 bg-bg-elevated ring-4 ring-brand-mint/5 flex items-center justify-center">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-brand-mint/10 text-brand-mint font-bold text-xl">
                      {initials}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={avatarMutation.isPending}
                  className="absolute inset-0 bg-black/60 rounded-2xl flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white"
                >
                  {avatarMutation.isPending ? (
                    <RefreshCw className="w-5 h-5 animate-spin text-brand-mint" />
                  ) : (
                    <Camera className="w-5 h-5" />
                  )}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleAvatarFile}
                />
              </div>

              <div className="text-center sm:text-left">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={avatarMutation.isPending}
                  className="btn-secondary py-2 px-4 text-xs uppercase tracking-wider inline-flex items-center gap-2 cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  {avatarMutation.isPending ? "Uploading..." : "Replace Avatar"}
                </button>
                <p className="text-[11px] text-text-muted mt-2">
                  JPG, PNG, or WebP. 5 MB maximum file size.
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Identity & Username */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-brand-mint mb-2 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                required
                className="w-full glass-input px-4 py-3 text-sm font-medium"
                placeholder="e.g. Alexander Pierce"
              />
            </div>

            {/* Email Address (Read-only) */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-brand-mint mb-2 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                Email Address (Verified)
              </label>
              <div className="w-full glass-input px-4 py-3 text-sm text-text-secondary bg-black/40 flex items-center justify-between border-white/[0.06] select-none">
                <span className="truncate">{profile?.email || "student@zeitnah.com"}</span>
                <CheckCircle2 className="w-4 h-4 text-brand-mint shrink-0 ml-2" />
              </div>
            </div>

            {/* Username Handle */}
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-brand-mint flex items-center gap-1.5">
                  <AtSign className="w-3.5 h-3.5" />
                  Student Handle
                </label>
                <button
                  type="button"
                  onClick={() => setChangeUsernameOpen(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-mint hover:text-brand-mint/80 transition-colors px-2.5 py-1 rounded-lg bg-brand-mint/10 border border-brand-mint/20 hover:bg-brand-mint/15 cursor-pointer"
                >
                  <Pencil className="w-3 h-3" />
                  Change Handle
                </button>
              </div>
              <div className="w-full glass-input px-4 py-3 text-sm font-mono text-white bg-black/40 flex items-center justify-between border-white/[0.08]">
                <span>@{username || "student"}</span>
                <span className="text-[11px] text-text-muted font-sans font-medium">Public Identifier</span>
              </div>
              <p className="text-[11px] text-text-muted mt-1.5">
                Your verified username for public portfolios, course comments, and certificates.
              </p>
            </div>
          </div>

          {/* Section 3: Biography */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-brand-mint flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                Biography
              </label>
              <span className={`text-[11px] font-mono ${
                bio.length >= MAX_BIO_LENGTH ? "text-danger" : "text-text-muted"
              }`}>
                {bio.length} / {MAX_BIO_LENGTH}
              </span>
            </div>
            <textarea
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={MAX_BIO_LENGTH}
              className="w-full glass-input px-4 py-3.5 text-sm font-medium resize-none leading-relaxed"
              placeholder="Introduce your engineering focus, academic goals, or professional interests..."
            />
            <p className="text-[11px] text-text-muted mt-1">
              A brief summary shown across your student card and public portfolio.
            </p>
          </div>

          {/* Section 4: Skills & Specialties (Interactive Chips) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-brand-mint flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Skills & Specialties
              </label>
              <span className="text-[11px] font-mono text-text-muted">
                {skills.length} / {MAX_SKILLS}
              </span>
            </div>

            {/* Skill Chips Container */}
            <div className="min-h-12 p-3 rounded-xl bg-black/40 border border-white/[0.08] flex flex-wrap gap-2 items-center mb-3">
              {skills.length === 0 ? (
                <span className="text-xs text-text-muted italic">
                  No skills added yet. Type below and press Enter or click Add.
                </span>
              ) : (
                skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-brand-mint/20 bg-brand-mint/8 px-3 py-1 text-xs font-semibold text-brand-mint tracking-wide group"
                  >
                    <span>{skill}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill)}
                      className="text-brand-mint/60 hover:text-danger transition-colors cursor-pointer"
                      title="Remove skill"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))
              )}
            </div>

            {/* Add Skill Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddSkill();
                  }
                }}
                disabled={skills.length >= MAX_SKILLS}
                placeholder={
                  skills.length >= MAX_SKILLS
                    ? "Maximum skills reached (25)"
                    : "e.g. Structural Engineering, React, Revit, Python"
                }
                className="flex-1 glass-input px-4 py-2.5 text-sm"
              />
              <button
                type="button"
                onClick={handleAddSkill}
                disabled={skills.length >= MAX_SKILLS || !skillInput.trim()}
                className="btn-secondary py-2.5 px-4 text-xs uppercase tracking-wider inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Skill
              </button>
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-6 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-4">
            <Link
              to="/profile"
              className="btn-secondary py-3 px-6 text-xs uppercase tracking-wider cursor-pointer"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="btn-primary py-3 px-7 text-xs uppercase tracking-wider inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {updateMutation.isPending ? "Saving Changes..." : "Save Profile"}
            </button>
          </div>
        </form>
      </motion.div>

      {/* Change Username Modal */}
      <ChangeUsernameModal
        isOpen={changeUsernameOpen}
        onClose={() => setChangeUsernameOpen(false)}
        currentUsername={username}
        onSuccess={(newHandle) => {
          setUsername(newHandle);
          queryClient.invalidateQueries({ queryKey: ["profile", "me"] });
        }}
      />
    </div>
  );
}