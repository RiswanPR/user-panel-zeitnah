import { useContext, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Save,
  X,
  Pencil,
  User,
  FileText,
  Sparkles,
  Plus,
  Camera,
  RefreshCw,
  CheckCircle2,
  Briefcase,
  GraduationCap,
  Award,
  Code2,
  Globe,
  Share2,
  Trash2,
  ExternalLink,
  MapPin,
  Calendar,
  Building,
  Check,
  Eye,
  AlertCircle,
  HeartHandshake,
  Circle,
  ShieldCheck,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { AuthContext } from "../../context/AuthContext";
import { coreProfileService } from "../../services/coreProfileService";
import { useToast } from "../../components/ui/Toast";
import ChangeUsernameModal from "../../components/username/ChangeUsernameModal";
import ProfileNav from "../../components/profile/ProfileNav";
import { getUploadUrl } from "../../utils/courseUi";

const MAX_BIO_LENGTH = 1000;
const MAX_SKILLS = 25;

const POPULAR_SKILLS = [
  "JavaScript",
  "TypeScript",
  "React",
  "Node.js",
  "Python",
  "Tailwind CSS",
  "Docker",
  "SQL",
  "Git",
  "Figma",
];

const SECTION_CONFIG = [
  { id: "introduction", label: "Identity & Cover", icon: User, xp: 45 },
  { id: "about", label: "About Story", icon: FileText, xp: 15 },
  { id: "experience", label: "Experience", icon: Briefcase, xp: 20 },
  { id: "education", label: "Education", icon: GraduationCap, xp: 20 },
  { id: "certifications", label: "Certifications", icon: Award, xp: 15 },
  { id: "skills", label: "Skills", icon: Code2, xp: 15 },
  { id: "recommendations", label: "Recommendations", icon: HeartHandshake, xp: 0 },
  { id: "public-profile", label: "Public Profile Setup", icon: Globe, xp: 50 },
];

export default function EditProfile() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { updateUser, setUser } = useContext(AuthContext);
  const toast = useToast();

  const avatarFileRef = useRef(null);
  const bannerFileRef = useRef(null);

  const currentSectionParam = searchParams.get("section") || "introduction";
  const [activeSection, setActiveSection] = useState(currentSectionParam);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isChangeUsernameOpen, setIsChangeUsernameOpen] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [headline, setHeadline] = useState("");
  const [currentRole, setCurrentRole] = useState("");
  const [location, setLocation] = useState("");
  const [industry, setIndustry] = useState("");
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState("");

  // Unsaved changes tracking
  const [isDirty, setIsDirty] = useState(false);
  const [pendingSectionSwitch, setPendingSectionSwitch] = useState(null);
  const [isUnsavedModalOpen, setIsUnsavedModalOpen] = useState(false);

  // Experience modal state
  const [isExpModalOpen, setIsExpModalOpen] = useState(false);
  const [editingExpId, setEditingExpId] = useState(null);
  const [expForm, setExpForm] = useState({
    organization: "",
    role: "",
    employmentType: "Full-time",
    location: "",
    startDate: "",
    endDate: "",
    currentlyActive: false,
    description: "",
  });

  // Education modal state
  const [isEduModalOpen, setIsEduModalOpen] = useState(false);
  const [editingEduId, setEditingEduId] = useState(null);
  const [eduForm, setEduForm] = useState({
    institution: "",
    qualification: "",
    fieldOfStudy: "",
    startDate: "",
    endDate: "",
    currentlyStudying: false,
    description: "",
  });

  // Certification modal state
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);
  const [editingCertId, setEditingCertId] = useState(null);
  const [certForm, setCertForm] = useState({
    name: "",
    issuer: "",
    issueDate: "",
    expirationDate: "",
    credentialId: "",
    credentialUrl: "",
  });

  // Recommendation request state
  const [isReqRecModalOpen, setIsReqRecModalOpen] = useState(false);

  // TanStack Query for initial profile data
  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["profile", "me"],
    queryFn: coreProfileService.getMyProfile,
  });

  const profile = data?.user;
  const completion = data?.completion;

  useEffect(() => {
    if (searchParams.get("section")) {
      setActiveSection(searchParams.get("section"));
    }
  }, [searchParams]);

  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setHeadline(profile.headline || "");
      setCurrentRole(profile.currentRole || "");
      setLocation(profile.location || "");
      setIndustry(profile.industry || "");
      setBio(profile.bio || "");
      setSkills(Array.isArray(profile.skills) ? profile.skills : []);
      setIsDirty(false);
    }
  }, [profile]);

  // Mobile ergonomics & background scroll lock when any modal is open
  useEffect(() => {
    const isAnyModalOpen =
      isUnsavedModalOpen ||
      isExpModalOpen ||
      isEduModalOpen ||
      isCertModalOpen ||
      isReqRecModalOpen ||
      isChangeUsernameOpen;

    if (isAnyModalOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [
    isUnsavedModalOpen,
    isExpModalOpen,
    isEduModalOpen,
    isCertModalOpen,
    isReqRecModalOpen,
    isChangeUsernameOpen,
  ]);

  // Handle section switching with unsaved changes safeguard
  const handleSelectSection = (id) => {
    if (id === activeSection) return;
    if (isDirty) {
      setPendingSectionSwitch(id);
      setIsUnsavedModalOpen(true);
      return;
    }
    setActiveSection(id);
    setSearchParams({ section: id });
  };

  const handleConfirmDiscard = () => {
    // Reset dirty fields back to original profile data
    if (profile) {
      setName(profile.name || "");
      setHeadline(profile.headline || "");
      setCurrentRole(profile.currentRole || "");
      setLocation(profile.location || "");
      setIndustry(profile.industry || "");
      setBio(profile.bio || "");
      setSkills(Array.isArray(profile.skills) ? profile.skills : []);
    }
    setIsDirty(false);
    setIsUnsavedModalOpen(false);
    if (pendingSectionSwitch === "navigate-back") {
      navigate("/profile");
    } else if (pendingSectionSwitch) {
      setActiveSection(pendingSectionSwitch);
      setSearchParams({ section: pendingSectionSwitch });
    }
    setPendingSectionSwitch(null);
  };

  const handleReturnToOverview = () => {
    if (isDirty) {
      setPendingSectionSwitch("navigate-back");
      setIsUnsavedModalOpen(true);
      return;
    }
    navigate("/profile");
  };

  // Helper for celebrating newly awarded milestones
  const notifyMilestones = (newlyAwarded) => {
    if (newlyAwarded?.length) {
      newlyAwarded.forEach((m) => {
        toast.success(`+${m.points} XP Earned!`, `${m.label} • Profile strength increased`);
      });
    }
  };

  // Profile Update Mutation (Identity, About, Skills)
  const updateMutation = useMutation({
    mutationFn: (payload) => coreProfileService.updateMyProfile(payload),
    onSuccess: (res) => {
      queryClient.setQueryData(["profile", "me"], (old) => {
        if (!old?.user) return old;
        return {
          ...old,
          user: res.user,
          completion: res.completion || old.completion,
        };
      });

      updateUser({
        name: res.user?.name,
        headline: res.user?.headline,
        bio: res.user?.bio,
        skills: res.user?.skills,
      });

      setIsDirty(false);
      toast.success("Changes saved", res.message || "Profile updated successfully.");
      notifyMilestones(res.newlyAwarded);
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
          completion: res.completion || old.completion,
        };
      });
      setUser((prev) => (prev ? { ...prev, avatar: res.avatar } : prev));
      toast.success("Photo updated", "Profile photo has been saved.");
      notifyMilestones(res.newlyAwarded);
    },
    onError: (err) => {
      toast.error("Upload failed", err.response?.data?.message || "Could not upload photo.");
    },
  });

  // Banner Upload Mutation
  const bannerMutation = useMutation({
    mutationFn: (file) => coreProfileService.uploadBackground(file),
    onSuccess: (res) => {
      queryClient.setQueryData(["profile", "me"], (old) => {
        if (!old?.user) return old;
        return {
          ...old,
          user: { ...old.user, backgroundImage: res.backgroundImage },
          completion: res.completion || old.completion,
        };
      });
      toast.success("Cover updated", "Background cover has been saved.");
      notifyMilestones(res.newlyAwarded);
    },
    onError: (err) => {
      toast.error("Upload failed", err.response?.data?.message || "Could not upload cover.");
    },
  });

  // Remove Banner Mutation
  const removeBannerMutation = useMutation({
    mutationFn: () => coreProfileService.removeBackground(),
    onSuccess: (res) => {
      queryClient.setQueryData(["profile", "me"], (old) => {
        if (!old?.user) return old;
        return {
          ...old,
          user: { ...old.user, backgroundImage: "" },
          completion: res.completion || old.completion,
        };
      });
      toast.success("Cover removed", "Background cover has been reset.");
    },
    onError: (err) => {
      toast.error("Remove failed", err.response?.data?.message || "Could not remove cover.");
    },
  });

  // Experience Mutations
  const addExpMutation = useMutation({
    mutationFn: (payload) => coreProfileService.addExperience(payload),
    onSuccess: (res) => {
      queryClient.setQueryData(["profile", "me"], (old) => {
        if (!old?.user) return old;
        return {
          ...old,
          user: { ...old.user, experience: res.experience },
          completion: res.completion || old.completion,
        };
      });
      toast.success("Experience added", res.message);
      notifyMilestones(res.newlyAwarded);
      setIsExpModalOpen(false);
      resetExpForm();
    },
    onError: (err) => toast.error("Failed to add", err.response?.data?.message),
  });

  const updateExpMutation = useMutation({
    mutationFn: ({ id, payload }) => coreProfileService.updateExperience(id, payload),
    onSuccess: (res) => {
      queryClient.setQueryData(["profile", "me"], (old) => {
        if (!old?.user) return old;
        return {
          ...old,
          user: { ...old.user, experience: res.experience },
          completion: res.completion || old.completion,
        };
      });
      toast.success("Experience updated", res.message);
      setIsExpModalOpen(false);
      resetExpForm();
    },
    onError: (err) => toast.error("Failed to update", err.response?.data?.message),
  });

  const deleteExpMutation = useMutation({
    mutationFn: (id) => coreProfileService.deleteExperience(id),
    onSuccess: (res) => {
      queryClient.setQueryData(["profile", "me"], (old) => {
        if (!old?.user) return old;
        return {
          ...old,
          user: { ...old.user, experience: res.experience },
          completion: res.completion || old.completion,
        };
      });
      toast.success("Experience deleted", res.message);
    },
    onError: (err) => toast.error("Failed to delete", err.response?.data?.message),
  });

  // Education Mutations
  const addEduMutation = useMutation({
    mutationFn: (payload) => coreProfileService.addEducation(payload),
    onSuccess: (res) => {
      queryClient.setQueryData(["profile", "me"], (old) => {
        if (!old?.user) return old;
        return {
          ...old,
          user: { ...old.user, education: res.education },
          completion: res.completion || old.completion,
        };
      });
      toast.success("Education added", res.message);
      notifyMilestones(res.newlyAwarded);
      setIsEduModalOpen(false);
      resetEduForm();
    },
    onError: (err) => toast.error("Failed to add", err.response?.data?.message),
  });

  const updateEduMutation = useMutation({
    mutationFn: ({ id, payload }) => coreProfileService.updateEducation(id, payload),
    onSuccess: (res) => {
      queryClient.setQueryData(["profile", "me"], (old) => {
        if (!old?.user) return old;
        return {
          ...old,
          user: { ...old.user, education: res.education },
          completion: res.completion || old.completion,
        };
      });
      toast.success("Education updated", res.message);
      setIsEduModalOpen(false);
      resetEduForm();
    },
    onError: (err) => toast.error("Failed to update", err.response?.data?.message),
  });

  const deleteEduMutation = useMutation({
    mutationFn: (id) => coreProfileService.deleteEducation(id),
    onSuccess: (res) => {
      queryClient.setQueryData(["profile", "me"], (old) => {
        if (!old?.user) return old;
        return {
          ...old,
          user: { ...old.user, education: res.education },
          completion: res.completion || old.completion,
        };
      });
      toast.success("Education deleted", res.message);
    },
    onError: (err) => toast.error("Failed to delete", err.response?.data?.message),
  });

  // Certification Mutations
  const addCertMutation = useMutation({
    mutationFn: (payload) => coreProfileService.addCertification(payload),
    onSuccess: (res) => {
      queryClient.setQueryData(["profile", "me"], (old) => {
        if (!old?.user) return old;
        return {
          ...old,
          user: { ...old.user, certifications: res.certifications },
          completion: res.completion || old.completion,
        };
      });
      toast.success("Certification added", res.message);
      notifyMilestones(res.newlyAwarded);
      setIsCertModalOpen(false);
      resetCertForm();
    },
    onError: (err) => toast.error("Failed to add", err.response?.data?.message),
  });

  const updateCertMutation = useMutation({
    mutationFn: ({ id, payload }) => coreProfileService.updateCertification(id, payload),
    onSuccess: (res) => {
      queryClient.setQueryData(["profile", "me"], (old) => {
        if (!old?.user) return old;
        return {
          ...old,
          user: { ...old.user, certifications: res.certifications },
          completion: res.completion || old.completion,
        };
      });
      toast.success("Certification updated", res.message);
      setIsCertModalOpen(false);
      resetCertForm();
    },
    onError: (err) => toast.error("Failed to update", err.response?.data?.message),
  });

  const deleteCertMutation = useMutation({
    mutationFn: (id) => coreProfileService.deleteCertification(id),
    onSuccess: (res) => {
      queryClient.setQueryData(["profile", "me"], (old) => {
        if (!old?.user) return old;
        return {
          ...old,
          user: { ...old.user, certifications: res.certifications },
          completion: res.completion || old.completion,
        };
      });
      toast.success("Certification deleted", res.message);
    },
    onError: (err) => toast.error("Failed to delete", err.response?.data?.message),
  });

  // Public Profile Publish State Mutation
  const publishMutation = useMutation({
    mutationFn: (published) => coreProfileService.setPublicProfilePublishState(published),
    onSuccess: (res) => {
      queryClient.setQueryData(["profile", "me"], (old) => {
        if (!old?.user) return old;
        return {
          ...old,
          user: { ...old.user, publicProfilePublished: res.published },
          completion: res.completion || old.completion,
        };
      });
      toast.success(res.published ? "Profile published!" : "Profile unpublished", res.message);
      notifyMilestones(res.newlyAwarded);
    },
    onError: (err) => toast.error("Action failed", err.response?.data?.message),
  });

  // Recommendations Query
  const { data: recData, refetch: refetchRecs } = useQuery({
    queryKey: ["profile", "recommendations"],
    queryFn: coreProfileService.getRecommendations,
  });

  const recommendations = recData?.recommendations || [];

  const updateRecStatusMutation = useMutation({
    mutationFn: ({ id, status }) => coreProfileService.updateRecommendationStatus(id, status),
    onSuccess: (res) => {
      toast.success("Status updated", res.message);
      refetchRecs();
      refetch();
    },
    onError: (err) => toast.error("Failed", err.response?.data?.message),
  });

  const deleteRecMutation = useMutation({
    mutationFn: (id) => coreProfileService.deleteRecommendation(id),
    onSuccess: (res) => {
      toast.success("Recommendation removed", res.message);
      refetchRecs();
      refetch();
    },
    onError: (err) => toast.error("Failed", err.response?.data?.message),
  });

  const resetExpForm = () => {
    setExpForm({
      organization: "",
      role: "",
      employmentType: "Full-time",
      location: "",
      startDate: "",
      endDate: "",
      currentlyActive: false,
      description: "",
    });
    setEditingExpId(null);
  };

  const resetEduForm = () => {
    setEduForm({
      institution: "",
      qualification: "",
      fieldOfStudy: "",
      startDate: "",
      endDate: "",
      currentlyStudying: false,
      description: "",
    });
    setEditingEduId(null);
  };

  const resetCertForm = () => {
    setCertForm({
      name: "",
      issuer: "",
      issueDate: "",
      expirationDate: "",
      credentialId: "",
      credentialUrl: "",
    });
    setEditingCertId(null);
  };

  const handleAddSkill = (skillToAdd) => {
    const trimmed = (skillToAdd || skillInput).trim();
    if (!trimmed) return;

    if (skills.length >= MAX_SKILLS) {
      return toast.error("Limit reached", `You can add at most ${MAX_SKILLS} skills.`);
    }

    if (skills.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      return toast.error("Duplicate skill", "This skill has already been added.");
    }

    const updated = [...skills, trimmed];
    setSkills(updated);
    setSkillInput("");
    updateMutation.mutate({ skills: updated });
  };

  const handleRemoveSkill = (skillToRemove) => {
    const updated = skills.filter((s) => s !== skillToRemove);
    setSkills(updated);
    updateMutation.mutate({ skills: updated });
  };

  const handleSaveIdentity = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      return toast.error("Name required", "Please enter your full name.");
    }
    updateMutation.mutate({
      name: name.trim(),
      headline: headline.trim(),
      currentRole: currentRole.trim(),
      location: location.trim(),
      industry: industry.trim(),
    });
  };

  const handleSaveAbout = (e) => {
    e.preventDefault();
    if (bio.length > MAX_BIO_LENGTH) {
      return toast.error("Too long", `About story must not exceed ${MAX_BIO_LENGTH} characters.`);
    }
    updateMutation.mutate({
      bio: bio.trim(),
    });
  };

  const handleSaveExp = (e) => {
    e.preventDefault();
    if (!expForm.organization.trim() || !expForm.role.trim() || !expForm.startDate) {
      return toast.error("Missing fields", "Organization, role, and start date are required.");
    }
    if (editingExpId) {
      updateExpMutation.mutate({ id: editingExpId, payload: expForm });
    } else {
      addExpMutation.mutate(expForm);
    }
  };

  const handleSaveEdu = (e) => {
    e.preventDefault();
    if (!eduForm.institution.trim() || !eduForm.qualification.trim() || !eduForm.startDate) {
      return toast.error("Missing fields", "Institution, qualification, and start date are required.");
    }
    if (editingEduId) {
      updateEduMutation.mutate({ id: editingEduId, payload: eduForm });
    } else {
      addEduMutation.mutate(eduForm);
    }
  };

  const handleSaveCert = (e) => {
    e.preventDefault();
    if (!certForm.name.trim() || !certForm.issuer.trim() || !certForm.issueDate) {
      return toast.error("Missing fields", "Certificate name, issuer, and issue date are required.");
    }
    if (editingCertId) {
      updateCertMutation.mutate({ id: editingCertId, payload: certForm });
    } else {
      addCertMutation.mutate(certForm);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto animate-pulse pb-16">
        <div className="h-14 bg-bg-card rounded-2xl border border-border-default" />
        <div className="h-96 bg-bg-card rounded-3xl border border-border-default" />
      </div>
    );
  }

  const avatarUrl = getUploadUrl(profile?.avatar);
  const bannerUrl = getUploadUrl(profile?.backgroundImage);

  // Section completion status helpers
  const getSectionStatus = (secId) => {
    if (!profile) return "not-started";
    switch (secId) {
      case "introduction":
        if (profile.avatar && profile.headline && (profile.location || profile.industry || profile.currentRole)) {
          return "complete";
        }
        if (profile.avatar || profile.headline) return "in-progress";
        return "not-started";
      case "about":
        if (profile.bio && profile.bio.trim().length >= 20) return "complete";
        if (profile.bio && profile.bio.trim().length > 0) return "in-progress";
        return "not-started";
      case "experience":
        return Array.isArray(profile.experience) && profile.experience.length > 0 ? "complete" : "not-started";
      case "education":
        return Array.isArray(profile.education) && profile.education.length > 0 ? "complete" : "not-started";
      case "certifications":
        return Array.isArray(profile.certifications) && profile.certifications.length > 0 ? "complete" : "not-started";
      case "skills":
        if (Array.isArray(profile.skills) && profile.skills.length >= 3) return "complete";
        if (Array.isArray(profile.skills) && profile.skills.length > 0) return "in-progress";
        return "not-started";
      case "recommendations":
        return recommendations.length > 0 ? "complete" : "not-started";
      case "public-profile":
        if (profile.publicProfilePublished) return "complete";
        if (completion?.publicProfileReady) return "in-progress";
        return "not-started";
      default:
        return "not-started";
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto pb-16">
      {/* ── Sub-Navigation ── */}
      <ProfileNav />

      {/* ── Header with Return & Live Preview Toggle ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleReturnToOverview}
            className="p-2.5 rounded-xl border border-border-default bg-bg-card hover:bg-white/[0.04] text-text-muted hover:text-white transition-colors cursor-pointer shadow-sm"
            title="Return to Profile Overview"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="font-heading font-black text-2xl sm:text-3xl text-white tracking-tight leading-none">
              Guided Profile Editor
            </h1>
            <p className="text-xs sm:text-sm text-text-muted mt-1">
              Build your verified personal learning identity through guided sections
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsPreviewOpen(!isPreviewOpen)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              isPreviewOpen
                ? "bg-brand-mint/15 border border-brand-mint text-brand-mint shadow-[0_0_15px_rgba(159,213,178,0.15)]"
                : "bg-bg-card border border-border-default text-text-muted hover:text-white"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            {isPreviewOpen ? "Hide Live Preview" : "Show Live Preview"}
          </button>

          <Link
            to="/public-profile"
            className="btn-secondary text-xs uppercase tracking-wider flex items-center gap-1.5 py-2.5 px-4 cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            View Public
          </Link>
        </div>
      </div>

      {/* ── Main Layout: Sidebar & Content Area ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Navigation Sidebar of Sections */}
        <div className="lg:col-span-4 space-y-3">
          <div className="rounded-3xl border border-border-default bg-bg-card p-3 sm:p-4 space-y-1 shadow-sm">
            <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-text-faint">
              Identity Sections
            </div>

            {SECTION_CONFIG.map((sec) => {
              const Icon = sec.icon;
              const isActive = activeSection === sec.id;
              const status = getSectionStatus(sec.id);

              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => handleSelectSection(sec.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl text-left transition-all cursor-pointer ${
                    isActive
                      ? "bg-brand-mint/10 border border-brand-mint/25 text-white font-bold shadow-sm"
                      : "text-text-muted hover:text-white hover:bg-white/[0.03] border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        isActive
                          ? "bg-brand-mint/20 text-brand-mint"
                          : "bg-white/[0.03] text-text-faint"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-sm truncate">{sec.label}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Tripartite status badge */}
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                        status === "complete"
                          ? "text-brand-mint bg-brand-mint/10"
                          : status === "in-progress"
                          ? "text-brand-yellow bg-brand-yellow/10"
                          : "text-text-faint bg-white/[0.02]"
                      }`}
                    >
                      {status === "complete" ? "✓" : status === "in-progress" ? "◐" : "○"}
                    </span>

                    {sec.xp > 0 && (
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-white/[0.04] text-brand-yellow">
                        +{sec.xp}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Profile Strength Mini Card */}
          <div className="rounded-3xl border border-border-default bg-bg-card p-5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-text-muted">
              <span>Profile Strength</span>
              <span className="text-brand-mint font-mono font-bold">
                {completion?.completionPercent || 0}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06] p-0.5 border border-white/[0.04]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-mint via-brand-yellow to-brand-yellow transition-all duration-500"
                style={{ width: `${completion?.completionPercent || 0}%` }}
              />
            </div>
            <p className="text-xs text-text-muted">
              {completion?.remainingMilestones?.length || 0} step{completion?.remainingMilestones?.length === 1 ? "" : "s"} remaining to 100% completion.
            </p>
          </div>
        </div>

        {/* Center / Main Editing Area */}
        <div className={isPreviewOpen ? "lg:col-span-4" : "lg:col-span-8"}>
          {/* SECTION 1: IDENTITY & INTRODUCTION */}
          {activeSection === "introduction" && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-border-default bg-bg-card p-6 sm:p-8 space-y-6 shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-xl font-heading font-extrabold text-white">
                    Identity & Cover
                  </h2>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-brand-yellow/10 border border-brand-yellow/20 text-brand-yellow">
                    +45 Potential XP
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
                  Upload your recognizable profile photo, cover banner, and specify your current focus.
                </p>
              </div>

              {/* Cover Banner Uploader */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                  Background Cover Banner
                </label>
                <div className="relative h-40 w-full rounded-2xl border border-border-default overflow-hidden bg-bg-elevated flex items-center justify-center">
                  {bannerUrl ? (
                    <img src={bannerUrl} alt="Cover" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full relative overflow-hidden bg-gradient-to-br from-[#0c1520] to-[#04070a] flex items-center justify-center">
                      <span className="text-xs text-text-muted font-mono uppercase tracking-widest">
                        Custom Cover Banner
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/45 flex items-center justify-center gap-2 opacity-0 hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => bannerFileRef.current?.click()}
                      disabled={bannerMutation.isPending}
                      className="btn-secondary text-xs py-2 px-3.5 flex items-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <Camera className="w-3.5 h-3.5 text-brand-mint" />
                      Upload Banner
                    </button>
                    {bannerUrl && (
                      <button
                        type="button"
                        onClick={() => removeBannerMutation.mutate()}
                        disabled={removeBannerMutation.isPending}
                        className="btn-danger text-xs py-2 px-3.5 flex items-center gap-1.5 cursor-pointer shadow-md"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove
                      </button>
                    )}
                  </div>
                  <input
                    ref={bannerFileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleBannerUpload}
                  />
                </div>
              </div>

              {/* Avatar Uploader */}
              <div className="flex items-center gap-5 pt-2">
                <div className="relative group shrink-0">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-brand-mint/30 bg-bg-elevated flex items-center justify-center shadow-lg">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-8 h-8 text-brand-mint" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => avatarFileRef.current?.click()}
                    disabled={avatarMutation.isPending}
                    className="absolute inset-0 bg-black/60 rounded-2xl flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white"
                  >
                    <Camera className="w-5 h-5 mb-0.5 text-brand-mint" />
                    <span className="text-[9px] font-bold uppercase">Change</span>
                  </button>
                  <input
                    ref={avatarFileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                </div>

                <div>
                  <h4 className="text-sm font-bold text-white">Profile Photo</h4>
                  <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
                    JPG, PNG, or WebP under 5 MB. Make your identity recognizable to peers and mentors.
                  </p>
                  <button
                    type="button"
                    onClick={() => avatarFileRef.current?.click()}
                    className="mt-2 text-xs font-semibold text-brand-mint hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Choose New Photo
                  </button>
                </div>
              </div>

              {/* Form Fields */}
              <form onSubmit={handleSaveIdentity} className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
                    Full Name <span className="text-brand-mint">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setIsDirty(true);
                    }}
                    required
                    className="w-full px-4 py-3 rounded-xl bg-bg-elevated border border-border-default focus:border-brand-mint focus:outline-none text-sm text-white transition-colors"
                    placeholder="e.g. Riswan P.R"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
                    Headline
                  </label>
                  <input
                    type="text"
                    value={headline}
                    onChange={(e) => {
                      setHeadline(e.target.value);
                      setIsDirty(true);
                    }}
                    maxLength={120}
                    className="w-full px-4 py-3 rounded-xl bg-bg-elevated border border-border-default focus:border-brand-mint focus:outline-none text-sm text-white transition-colors"
                    placeholder="e.g. Student Developer | Passionate about Full Stack & Cloud"
                  />
                  <span className="text-[11px] text-text-muted mt-1 block">
                    A short, memorable sentence summarizing who you are.
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
                      Current Role <span className="text-text-faint font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={currentRole}
                      onChange={(e) => {
                        setCurrentRole(e.target.value);
                        setIsDirty(true);
                      }}
                      className="w-full px-4 py-2.5 rounded-xl bg-bg-elevated border border-border-default focus:border-brand-mint focus:outline-none text-sm text-white transition-colors"
                      placeholder="e.g. Student / Intern"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
                      Location <span className="text-text-faint font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => {
                        setLocation(e.target.value);
                        setIsDirty(true);
                      }}
                      className="w-full px-4 py-2.5 rounded-xl bg-bg-elevated border border-border-default focus:border-brand-mint focus:outline-none text-sm text-white transition-colors"
                      placeholder="e.g. Kerala, India"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
                      Industry <span className="text-text-faint font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={industry}
                      onChange={(e) => {
                        setIndustry(e.target.value);
                        setIsDirty(true);
                      }}
                      className="w-full px-4 py-2.5 rounded-xl bg-bg-elevated border border-border-default focus:border-brand-mint focus:outline-none text-sm text-white transition-colors"
                      placeholder="e.g. Technology"
                    />
                  </div>
                </div>

                <div className="pt-3 flex justify-end">
                  <button
                    type="submit"
                    disabled={updateMutation.isPending}
                    className="btn-primary text-xs uppercase tracking-wider flex items-center gap-2 py-3 px-6 cursor-pointer shadow-md"
                  >
                    {updateMutation.isPending ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Save Identity Details
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* SECTION 2: ABOUT STORY */}
          {activeSection === "about" && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-border-default bg-bg-card p-6 sm:p-8 space-y-6 shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-xl font-heading font-extrabold text-white">
                    About Story
                  </h2>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-brand-yellow/10 border border-brand-yellow/20 text-brand-yellow">
                    +15 XP
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
                  Tell people what you are learning, building, or working toward. Avoid corporate jargon.
                </p>
              </div>

              <form onSubmit={handleSaveAbout} className="space-y-4">
                <div className="relative">
                  <textarea
                    value={bio}
                    onChange={(e) => {
                      setBio(e.target.value);
                      setIsDirty(true);
                    }}
                    rows={8}
                    maxLength={MAX_BIO_LENGTH}
                    className="w-full px-4 py-3.5 rounded-2xl bg-bg-elevated border border-border-default focus:border-brand-mint focus:outline-none text-sm text-white transition-colors resize-none leading-relaxed"
                    placeholder="Tell people what you're learning, building, or working toward. E.g. I am a student developer learning full-stack development on Zeitnah Academy. Passionate about React, cloud systems, and building tools that make a real difference..."
                  />
                  <div className="flex justify-between text-xs text-text-muted mt-1.5 px-1">
                    <span>Write from your own authentic perspective.</span>
                    <span className={bio.length > MAX_BIO_LENGTH - 50 ? "text-danger font-bold" : ""}>
                      {bio.length} / {MAX_BIO_LENGTH}
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={updateMutation.isPending}
                    className="btn-primary text-xs uppercase tracking-wider flex items-center gap-2 py-3 px-6 cursor-pointer shadow-md"
                  >
                    {updateMutation.isPending ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Save About Story
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* SECTION 3: EXPERIENCE */}
          {activeSection === "experience" && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-border-default bg-bg-card p-6 sm:p-8 space-y-6 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-heading font-extrabold text-white">
                    Experience
                  </h2>
                  <p className="text-xs sm:text-sm text-text-muted mt-0.5">
                    Add work, internships, freelance, volunteering, projects, or leadership roles.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    resetExpForm();
                    setIsExpModalOpen(true);
                  }}
                  className="btn-primary text-xs uppercase tracking-wider flex items-center gap-1.5 py-2.5 px-4 cursor-pointer shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Experience
                </button>
              </div>

              {/* Polished Timeline Cards */}
              {profile?.experience?.length > 0 ? (
                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-white/[0.08]">
                  {profile.experience.map((exp) => (
                    <div key={exp.id} className="relative group">
                      {/* Timeline Bullet Node */}
                      <div className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-brand-mint border-2 border-bg-card shadow-sm ring-2 ring-brand-mint/20" />

                      <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-brand-mint/25 transition-all flex items-start justify-between gap-4">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono font-bold text-brand-mint uppercase tracking-wider">
                              {new Date(exp.startDate).getFullYear()} — {exp.currentlyActive ? "Present" : exp.endDate ? new Date(exp.endDate).getFullYear() : "Present"}
                            </span>
                            <span className="text-xs text-text-faint">•</span>
                            <span className="text-xs px-2 py-0.5 rounded bg-white/[0.04] text-text-muted uppercase font-bold">
                              {exp.employmentType}
                            </span>
                          </div>

                          <h4 className="text-base font-bold text-white leading-snug">{exp.role}</h4>
                          <div className="text-sm font-semibold text-text-secondary">
                            {exp.organization} {exp.location && `• ${exp.location}`}
                          </div>

                          {exp.description && (
                            <p className="text-xs text-text-muted mt-2 leading-relaxed whitespace-pre-line">
                              {exp.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingExpId(exp.id);
                              setExpForm({
                                organization: exp.organization,
                                role: exp.role,
                                employmentType: exp.employmentType || "Full-time",
                                location: exp.location || "",
                                startDate: exp.startDate ? new Date(exp.startDate).toISOString().split("T")[0] : "",
                                endDate: exp.endDate ? new Date(exp.endDate).toISOString().split("T")[0] : "",
                                currentlyActive: Boolean(exp.currentlyActive),
                                description: exp.description || "",
                              });
                              setIsExpModalOpen(true);
                            }}
                            className="p-2 rounded-lg text-text-muted hover:text-brand-mint hover:bg-white/[0.04] transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteExpMutation.mutate(exp.id)}
                            className="p-2 rounded-lg text-text-muted hover:text-danger hover:bg-white/[0.04] transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 px-4 rounded-2xl border border-dashed border-white/[0.08] text-center">
                  <Briefcase className="w-8 h-8 text-text-faint mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-white">No experience added yet</h4>
                  <p className="text-xs text-text-muted max-w-sm mx-auto mt-1">
                    Add work, internships, volunteering, projects, or leadership experience when you are ready.
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* SECTION 4: EDUCATION */}
          {activeSection === "education" && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-border-default bg-bg-card p-6 sm:p-8 space-y-6 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-heading font-extrabold text-white">
                    Education
                  </h2>
                  <p className="text-xs sm:text-sm text-text-muted mt-0.5">
                    Showcase your academic journey, degrees, bootcamps, and studies.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    resetEduForm();
                    setIsEduModalOpen(true);
                  }}
                  className="btn-primary text-xs uppercase tracking-wider flex items-center gap-1.5 py-2.5 px-4 cursor-pointer shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Education
                </button>
              </div>

              {profile?.education?.length > 0 ? (
                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-white/[0.08]">
                  {profile.education.map((edu) => (
                    <div key={edu.id} className="relative group">
                      {/* Timeline Bullet Node */}
                      <div className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-brand-mint border-2 border-bg-card shadow-sm ring-2 ring-brand-mint/20" />

                      <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-brand-mint/25 transition-all flex items-start justify-between gap-4">
                        <div className="space-y-1 min-w-0">
                          <span className="text-xs font-mono font-bold text-brand-mint uppercase tracking-wider">
                            {new Date(edu.startDate).getFullYear()} — {edu.currentlyStudying ? "Present" : edu.endDate ? new Date(edu.endDate).getFullYear() : "Present"}
                          </span>

                          <h4 className="text-base font-bold text-white leading-snug">{edu.institution}</h4>
                          <div className="text-sm font-semibold text-text-secondary">
                            {edu.qualification} {edu.fieldOfStudy && `• ${edu.fieldOfStudy}`}
                          </div>

                          {edu.description && (
                            <p className="text-xs text-text-muted mt-2 leading-relaxed">
                              {edu.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingEduId(edu.id);
                              setEduForm({
                                institution: edu.institution,
                                qualification: edu.qualification,
                                fieldOfStudy: edu.fieldOfStudy || "",
                                startDate: edu.startDate ? new Date(edu.startDate).toISOString().split("T")[0] : "",
                                endDate: edu.endDate ? new Date(edu.endDate).toISOString().split("T")[0] : "",
                                currentlyStudying: Boolean(edu.currentlyStudying),
                                description: edu.description || "",
                              });
                              setIsEduModalOpen(true);
                            }}
                            className="p-2 rounded-lg text-text-muted hover:text-brand-mint hover:bg-white/[0.04] transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteEduMutation.mutate(edu.id)}
                            className="p-2 rounded-lg text-text-muted hover:text-danger hover:bg-white/[0.04] transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 px-4 rounded-2xl border border-dashed border-white/[0.08] text-center">
                  <GraduationCap className="w-8 h-8 text-text-faint mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-white">Show your learning journey</h4>
                  <p className="text-xs text-text-muted max-w-sm mx-auto mt-1">
                    Add your school, college, or academy education credentials.
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* SECTION 5: LICENSES & CERTIFICATIONS */}
          {activeSection === "certifications" && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-border-default bg-bg-card p-6 sm:p-8 space-y-6 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-heading font-extrabold text-white">
                    Licenses & Certifications
                  </h2>
                  <p className="text-xs sm:text-sm text-text-muted mt-0.5">
                    Highlight your verified certifications, professional badges, or credentials.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    resetCertForm();
                    setIsCertModalOpen(true);
                  }}
                  className="btn-primary text-xs uppercase tracking-wider flex items-center gap-1.5 py-2.5 px-4 cursor-pointer shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Certificate
                </button>
              </div>

              {profile?.certifications?.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {profile.certifications.map((cert) => (
                    <div
                      key={cert.id}
                      className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-brand-mint/25 transition-all flex flex-col justify-between gap-3 shadow-sm"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-semibold">
                          {cert.isVerified || cert.issuer?.toLowerCase().includes("zeitnah") ? (
                            <>
                              <ShieldCheck className="w-3.5 h-3.5 text-brand-mint" />
                              <span className="text-brand-mint">Verified by Zeitnah</span>
                            </>
                          ) : (
                            <>
                              <Award className="w-3.5 h-3.5 text-text-muted" />
                              <span className="text-text-muted">Credential Record</span>
                            </>
                          )}
                        </div>
                        <h4 className="text-base font-bold text-white leading-snug break-words">{cert.name}</h4>
                        <div className="text-sm font-semibold text-text-secondary break-words">{cert.issuer}</div>
                        <div className="text-xs text-text-muted">
                          Issued {new Date(cert.issueDate).toLocaleDateString(undefined, { month: "short", year: "numeric" })}
                          {cert.expirationDate && ` • Expires ${new Date(cert.expirationDate).toLocaleDateString(undefined, { month: "short", year: "numeric" })}`}
                        </div>
                        {cert.credentialId && (
                          <div className="text-[11px] font-mono text-text-faint break-words">
                            ID: {cert.credentialId}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
                        {cert.credentialUrl ? (
                          <a
                            href={cert.credentialUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-brand-mint hover:underline font-semibold"
                          >
                            <span>Verify Credential</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-[11px] text-text-faint">No verification link</span>
                        )}

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCertId(cert.id);
                              setCertForm({
                                name: cert.name,
                                issuer: cert.issuer,
                                issueDate: cert.issueDate ? new Date(cert.issueDate).toISOString().split("T")[0] : "",
                                expirationDate: cert.expirationDate ? new Date(cert.expirationDate).toISOString().split("T")[0] : "",
                                credentialId: cert.credentialId || "",
                                credentialUrl: cert.credentialUrl || "",
                              });
                              setIsCertModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-text-muted hover:text-brand-mint cursor-pointer"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteCertMutation.mutate(cert.id)}
                            className="p-1.5 rounded-lg text-text-muted hover:text-danger cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 px-4 rounded-2xl border border-dashed border-white/[0.08] text-center">
                  <Award className="w-8 h-8 text-text-faint mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-white">Showcase your credentials</h4>
                  <p className="text-xs text-text-muted max-w-sm mx-auto mt-1">
                    Add certificates from Zeitnah Academy, cloud providers, or professional organizations.
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* SECTION 6: SKILLS */}
          {activeSection === "skills" && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-border-default bg-bg-card p-6 sm:p-8 space-y-6 shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-xl font-heading font-extrabold text-white">
                    Skills & Competencies
                  </h2>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-brand-yellow/10 border border-brand-yellow/20 text-brand-yellow">
                    +15 XP (3+ Skills)
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
                  Add technologies, frameworks, and tools you are actively learning and practicing.
                </p>
              </div>

              {/* Skill Input Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAddSkill();
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  placeholder="Type to search or enter a skill (e.g. TypeScript, React)..."
                  className="flex-1 px-4 py-2.5 rounded-xl bg-bg-elevated border border-border-default focus:border-brand-mint focus:outline-none text-sm text-white transition-colors"
                />
                <button
                  type="submit"
                  className="btn-primary text-xs uppercase tracking-wider px-4 py-2.5 flex items-center gap-1 cursor-pointer shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Skill
                </button>
              </form>

              {/* Instant Search Suggestions */}
              {POPULAR_SKILLS.filter(
                (ps) =>
                  !skills.includes(ps) &&
                  (!skillInput.trim() || ps.toLowerCase().includes(skillInput.trim().toLowerCase()))
              ).length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-text-faint">
                    {skillInput.trim() ? "Matching Suggestions:" : "Suggested for Students:"}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {POPULAR_SKILLS.filter(
                      (ps) =>
                        !skills.includes(ps) &&
                        (!skillInput.trim() || ps.toLowerCase().includes(skillInput.trim().toLowerCase()))
                    ).map((ps) => (
                      <button
                        key={ps}
                        type="button"
                        onClick={() => handleAddSkill(ps)}
                        className="px-2.5 py-1 rounded-lg text-xs bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.06] hover:border-brand-mint/30 text-text-muted hover:text-white transition-all cursor-pointer inline-flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3 text-brand-mint" />
                        <span>{ps}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Current Skills Chips */}
              <div className="space-y-2 pt-2 border-t border-white/[0.05]">
                <div className="flex justify-between text-xs text-text-muted">
                  <span>Your skills ({skills.length} / {MAX_SKILLS})</span>
                  {skills.length >= 3 ? (
                    <span className="text-brand-mint font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> 3+ Skills Milestone Complete (+15 XP)
                    </span>
                  ) : (
                    <span className="text-brand-yellow font-medium">
                      Add {3 - skills.length} more to earn +15 XP
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  {skills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs font-semibold text-white group hover:border-brand-mint/30 transition-all max-w-full"
                    >
                      <span className="break-all">{skill}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        className="text-text-muted hover:text-danger transition-colors cursor-pointer shrink-0"
                        title={`Remove ${skill}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* SECTION 7: RECOMMENDATIONS */}
          {activeSection === "recommendations" && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-border-default bg-bg-card p-6 sm:p-8 space-y-6 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-heading font-extrabold text-white">
                    Recommendations
                  </h2>
                  <p className="text-xs sm:text-sm text-text-muted mt-0.5">
                    Manage endorsements and testimonials received from mentors and peers.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsReqRecModalOpen(true)}
                  className="btn-secondary text-xs uppercase tracking-wider flex items-center gap-1.5 py-2 px-3.5 cursor-pointer shadow-sm"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Request Endorsement
                </button>
              </div>

              {recommendations.length > 0 ? (
                <div className="space-y-4">
                  {recommendations.map((rec) => (
                    <div
                      key={rec.id}
                      className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-bg-elevated border border-white/10 flex items-center justify-center">
                            {rec.authorAvatar ? (
                              <img src={rec.authorAvatar} alt={rec.authorName} className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-5 h-5 text-brand-mint" />
                            )}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white">{rec.authorName}</h4>
                            <p className="text-xs text-text-muted">
                              @{rec.authorUsername} • {rec.relationship}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            rec.status === "approved"
                              ? "bg-brand-mint/10 text-brand-mint"
                              : "bg-brand-yellow/10 text-brand-yellow"
                          }`}
                        >
                          {rec.status}
                        </span>
                      </div>

                      <p className="text-xs text-text-secondary italic leading-relaxed border-l-2 border-brand-mint/30 pl-3">
                        "{rec.content}"
                      </p>

                      <div className="flex items-center justify-between text-xs text-text-muted pt-1">
                        <span>{new Date(rec.createdAt).toLocaleDateString()}</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              updateRecStatusMutation.mutate({
                                id: rec.id,
                                status: rec.status === "approved" ? "hidden" : "approved",
                              })
                            }
                            className="text-xs font-semibold text-brand-mint hover:underline cursor-pointer"
                          >
                            {rec.status === "approved" ? "Hide from profile" : "Show on profile"}
                          </button>
                          <span className="text-text-faint">•</span>
                          <button
                            type="button"
                            onClick={() => deleteRecMutation.mutate(rec.id)}
                            className="text-xs font-semibold text-danger hover:underline cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 px-4 rounded-2xl border border-dashed border-white/[0.08] text-center">
                  <HeartHandshake className="w-8 h-8 text-text-faint mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-white">No recommendations yet</h4>
                  <p className="text-xs text-text-muted max-w-sm mx-auto mt-1">
                    Recommendations from teachers, mentors, or collaborators will appear here for your moderation.
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* SECTION 8: PUBLIC PROFILE SETUP */}
          {activeSection === "public-profile" && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-border-default bg-bg-card p-6 sm:p-8 space-y-6 shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-xl font-heading font-extrabold text-white">
                    Public Profile Setup & Publish
                  </h2>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-brand-yellow/10 border border-brand-yellow/20 text-brand-yellow">
                    +50 Total XP
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
                  Ensure required identity elements are ready before publishing your verified presence at /u/:username.
                </p>
              </div>

              {/* Publish Checklist */}
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">
                  Publish Readiness Checklist
                </h4>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2.5">
                    {profile?.avatar ? (
                      <CheckCircle2 className="w-4 h-4 text-brand-mint" />
                    ) : (
                      <Circle className="w-4 h-4 text-brand-yellow" />
                    )}
                    <span className={profile?.avatar ? "text-white" : "text-text-muted"}>
                      Profile photo uploaded
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {profile?.headline ? (
                      <CheckCircle2 className="w-4 h-4 text-brand-mint" />
                    ) : (
                      <Circle className="w-4 h-4 text-brand-yellow" />
                    )}
                    <span className={profile?.headline ? "text-white" : "text-text-muted"}>
                      Professional headline added
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {profile?.bio && profile.bio.trim().length >= 20 ? (
                      <CheckCircle2 className="w-4 h-4 text-brand-mint" />
                    ) : (
                      <Circle className="w-4 h-4 text-brand-yellow" />
                    )}
                    <span className={profile?.bio ? "text-white" : "text-text-muted"}>
                      About story written (min 20 characters)
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {Array.isArray(profile?.skills) && profile.skills.length >= 3 ? (
                      <CheckCircle2 className="w-4 h-4 text-brand-mint" />
                    ) : (
                      <Circle className="w-4 h-4 text-brand-yellow" />
                    )}
                    <span className={profile?.skills?.length >= 3 ? "text-white" : "text-text-muted"}>
                      At least 3 skills added ({profile?.skills?.length || 0}/3)
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {profile?.username ? (
                      <CheckCircle2 className="w-4 h-4 text-brand-mint" />
                    ) : (
                      <Circle className="w-4 h-4 text-brand-yellow" />
                    )}
                    <span className={profile?.username ? "text-white" : "text-text-muted"}>
                      Student handle claimed (@{profile?.username})
                    </span>
                  </div>
                </div>
              </div>

              {/* Publish Action & Status */}
              <div className="p-5 rounded-2xl border border-brand-mint/20 bg-brand-mint/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">Current Status:</span>
                    <span
                      className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                        profile?.publicProfilePublished
                          ? "bg-brand-mint/20 text-brand-mint"
                          : "bg-white/[0.05] text-text-muted"
                      }`}
                    >
                      {profile?.publicProfilePublished ? "Published ✓" : "Unpublished (Draft)"}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted mt-1 leading-relaxed">
                    {profile?.publicProfilePublished
                      ? `Your public profile is live at /u/${profile?.username}. Anyone with the link can view your learning journey.`
                      : "Publishing awards +20 XP and makes your verified identity shareable with peers and recruiters."}
                  </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => publishMutation.mutate(!profile?.publicProfilePublished)}
                    disabled={publishMutation.isPending || (!profile?.publicProfilePublished && !completion?.publicProfileReady)}
                    className={`text-xs uppercase tracking-wider py-2.5 px-5 rounded-xl font-bold transition-all cursor-pointer shadow-md ${
                      profile?.publicProfilePublished
                        ? "bg-white/[0.04] border border-white/10 text-white hover:bg-white/[0.08]"
                        : "btn-primary"
                    }`}
                  >
                    {publishMutation.isPending ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : profile?.publicProfilePublished ? (
                      "Unpublish Profile"
                    ) : (
                      "Publish Public Profile"
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* SECTION PREVIEW: Desktop Side-by-Side Live Preview */}
        {isPreviewOpen && (
          <div className="lg:col-span-4 sticky top-24 rounded-3xl border border-border-default bg-bg-card p-5 space-y-4 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-mint flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" /> Live Preview
              </span>
              <span className="text-[10px] text-text-muted font-mono">/u/{profile?.username}</span>
            </div>

            {/* Mini preview card reflecting live changes */}
            <div className="rounded-2xl border border-white/[0.06] bg-bg-base overflow-hidden shadow-inner">
              <div className="h-20 w-full bg-gradient-to-r from-bg-elevated to-brand-navy/50 relative">
                {bannerUrl && <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover" />}
              </div>
              <div className="p-4 pt-0 -mt-8 space-y-2">
                <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-bg-base bg-bg-elevated shadow-md flex items-center justify-center">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-6 h-6 text-brand-mint" />
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">{name || "Student Name"}</h4>
                  <div className="text-[11px] font-mono text-brand-mint">@{profile?.username}</div>
                  {headline && <p className="text-xs text-white/85 mt-1 line-clamp-2 leading-relaxed">{headline}</p>}
                </div>
                {bio && (
                  <p className="text-xs text-text-muted mt-2 line-clamp-3 italic leading-relaxed">
                    "{bio}"
                  </p>
                )}
                {skills.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {skills.slice(0, 4).map((s) => (
                      <span key={s} className="px-2 py-0.5 rounded bg-white/[0.04] text-[10px] text-text-secondary">
                        {s}
                      </span>
                    ))}
                    {skills.length > 4 && (
                      <span className="px-1.5 py-0.5 rounded bg-white/[0.02] text-[10px] text-text-faint">
                        +{skills.length - 4}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Unsaved Changes Warning Modal ── */}
      <AnimatePresence>
        {isUnsavedModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md rounded-3xl border border-border-default bg-bg-card p-6 sm:p-7 space-y-4 shadow-2xl max-h-[90dvh] overflow-y-auto overscroll-contain"
            >
              <div className="w-12 h-12 rounded-2xl bg-brand-yellow/10 border border-brand-yellow/20 flex items-center justify-center text-brand-yellow">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-heading font-extrabold text-white">
                  Unsaved Changes
                </h3>
                <p className="text-xs text-text-muted leading-relaxed">
                  You have unsaved changes in this section. If you leave now, your entered modifications will be discarded.
                </p>
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUnsavedModalOpen(false)}
                  className="btn-secondary text-xs uppercase tracking-wider py-3 px-4 min-h-[44px] w-full sm:w-auto cursor-pointer"
                >
                  Stay & Keep Editing
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDiscard}
                  className="btn-danger text-xs uppercase tracking-wider py-3 px-4 min-h-[44px] w-full sm:w-auto cursor-pointer"
                >
                  Discard Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Experience Modal ── */}
      {isExpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-3xl border border-border-default bg-bg-card p-6 sm:p-8 space-y-5 shadow-2xl max-h-[90dvh] sm:max-h-[85vh] overflow-y-auto overscroll-contain">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-heading font-extrabold text-white">
                {editingExpId ? "Edit Experience" : "Add Experience"}
              </h3>
              <button
                type="button"
                onClick={() => setIsExpModalOpen(false)}
                className="p-2.5 -mr-1.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-text-muted hover:text-white cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExp} className="space-y-4">
              {/* Primary Fields */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                  Organization / Company <span className="text-brand-mint">*</span>
                </label>
                <input
                  type="text"
                  value={expForm.organization}
                  onChange={(e) => setExpForm({ ...expForm, organization: e.target.value })}
                  required
                  placeholder="e.g. Zeitnah Labs, Google Developer Club"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-bg-elevated border border-border-default text-sm text-white focus:border-brand-mint focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                    Role / Position <span className="text-brand-mint">*</span>
                  </label>
                  <input
                    type="text"
                    value={expForm.role}
                    onChange={(e) => setExpForm({ ...expForm, role: e.target.value })}
                    required
                    placeholder="e.g. Intern, Lead Developer"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-bg-elevated border border-border-default text-sm text-white focus:border-brand-mint focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                    Type
                  </label>
                  <select
                    value={expForm.employmentType}
                    onChange={(e) => setExpForm({ ...expForm, employmentType: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-bg-elevated border border-border-default text-sm text-white focus:border-brand-mint focus:outline-none"
                  >
                    <option value="Internship">Internship</option>
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Freelance">Freelance</option>
                    <option value="Volunteering">Volunteering</option>
                    <option value="Student Project">Student Project</option>
                    <option value="Leadership">Leadership</option>
                  </select>
                </div>
              </div>

              {/* Secondary Fields */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                  Location <span className="text-text-faint font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={expForm.location}
                  onChange={(e) => setExpForm({ ...expForm, location: e.target.value })}
                  placeholder="e.g. Remote / Kochi, India"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-bg-elevated border border-border-default text-sm text-white focus:border-brand-mint focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                    Start Date <span className="text-brand-mint">*</span>
                  </label>
                  <input
                    type="date"
                    value={expForm.startDate}
                    onChange={(e) => setExpForm({ ...expForm, startDate: e.target.value })}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-bg-elevated border border-border-default text-sm text-white focus:border-brand-mint focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={expForm.endDate}
                    onChange={(e) => setExpForm({ ...expForm, endDate: e.target.value })}
                    disabled={expForm.currentlyActive}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-bg-elevated border border-border-default text-sm text-white focus:border-brand-mint focus:outline-none disabled:opacity-40"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="currentlyActive"
                  checked={expForm.currentlyActive}
                  onChange={(e) => setExpForm({ ...expForm, currentlyActive: e.target.checked })}
                  className="rounded border-border-default text-brand-mint focus:ring-0"
                />
                <label htmlFor="currentlyActive" className="text-xs text-text-secondary cursor-pointer">
                  I currently work / lead here
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                  Description <span className="text-text-faint font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={3}
                  value={expForm.description}
                  onChange={(e) => setExpForm({ ...expForm, description: e.target.value })}
                  placeholder="Key responsibilities, achievements, technologies used..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-bg-elevated border border-border-default text-sm text-white focus:border-brand-mint focus:outline-none resize-none"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsExpModalOpen(false)}
                  className="btn-secondary text-xs py-3 px-5 min-h-[44px] w-full sm:w-auto cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addExpMutation.isPending || updateExpMutation.isPending}
                  className="btn-primary text-xs py-3 px-6 min-h-[44px] w-full sm:w-auto cursor-pointer"
                >
                  {editingExpId ? "Save Changes" : "Add Experience"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Education Modal ── */}
      {isEduModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-3xl border border-border-default bg-bg-card p-6 sm:p-8 space-y-5 shadow-2xl max-h-[90dvh] sm:max-h-[85vh] overflow-y-auto overscroll-contain">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-heading font-extrabold text-white">
                {editingEduId ? "Edit Education" : "Add Education"}
              </h3>
              <button
                type="button"
                onClick={() => setIsEduModalOpen(false)}
                className="p-2.5 -mr-1.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-text-muted hover:text-white cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdu} className="space-y-4">
              {/* Primary Fields */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                  Institution / School <span className="text-brand-mint">*</span>
                </label>
                <input
                  type="text"
                  value={eduForm.institution}
                  onChange={(e) => setEduForm({ ...eduForm, institution: e.target.value })}
                  required
                  placeholder="e.g. University of Calicut, Zeitnah Academy"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-bg-elevated border border-border-default text-sm text-white focus:border-brand-mint focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                    Qualification / Degree <span className="text-brand-mint">*</span>
                  </label>
                  <input
                    type="text"
                    value={eduForm.qualification}
                    onChange={(e) => setEduForm({ ...eduForm, qualification: e.target.value })}
                    required
                    placeholder="e.g. Bachelor of Technology, High School"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-bg-elevated border border-border-default text-sm text-white focus:border-brand-mint focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                    Field of Study <span className="text-text-faint font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={eduForm.fieldOfStudy}
                    onChange={(e) => setEduForm({ ...eduForm, fieldOfStudy: e.target.value })}
                    placeholder="e.g. Computer Science"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-bg-elevated border border-border-default text-sm text-white focus:border-brand-mint focus:outline-none"
                  />
                </div>
              </div>

              {/* Secondary Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                    Start Date <span className="text-brand-mint">*</span>
                  </label>
                  <input
                    type="date"
                    value={eduForm.startDate}
                    onChange={(e) => setEduForm({ ...eduForm, startDate: e.target.value })}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-bg-elevated border border-border-default text-sm text-white focus:border-brand-mint focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={eduForm.endDate}
                    onChange={(e) => setEduForm({ ...eduForm, endDate: e.target.value })}
                    disabled={eduForm.currentlyStudying}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-bg-elevated border border-border-default text-sm text-white focus:border-brand-mint focus:outline-none disabled:opacity-40"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="currentlyStudying"
                  checked={eduForm.currentlyStudying}
                  onChange={(e) => setEduForm({ ...eduForm, currentlyStudying: e.target.checked })}
                  className="rounded border-border-default text-brand-mint focus:ring-0"
                />
                <label htmlFor="currentlyStudying" className="text-xs text-text-secondary cursor-pointer">
                  I currently study here
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                  Description / Activities <span className="text-text-faint font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={eduForm.description}
                  onChange={(e) => setEduForm({ ...eduForm, description: e.target.value })}
                  placeholder="Notable clubs, focus areas, honors..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-bg-elevated border border-border-default text-sm text-white focus:border-brand-mint focus:outline-none resize-none"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEduModalOpen(false)}
                  className="btn-secondary text-xs py-3 px-5 min-h-[44px] w-full sm:w-auto cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addEduMutation.isPending || updateEduMutation.isPending}
                  className="btn-primary text-xs py-3 px-6 min-h-[44px] w-full sm:w-auto cursor-pointer"
                >
                  {editingEduId ? "Save Changes" : "Add Education"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Certification Modal ── */}
      {isCertModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-3xl border border-border-default bg-bg-card p-6 sm:p-8 space-y-5 shadow-2xl max-h-[90dvh] sm:max-h-[85vh] overflow-y-auto overscroll-contain">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-heading font-extrabold text-white">
                {editingCertId ? "Edit Certification" : "Add Certification"}
              </h3>
              <button
                type="button"
                onClick={() => setIsCertModalOpen(false)}
                className="p-2.5 -mr-1.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-text-muted hover:text-white cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCert} className="space-y-4">
              {/* Primary Fields */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                  Certificate Name <span className="text-brand-mint">*</span>
                </label>
                <input
                  type="text"
                  value={certForm.name}
                  onChange={(e) => setCertForm({ ...certForm, name: e.target.value })}
                  required
                  placeholder="e.g. AWS Certified Cloud Practitioner"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-bg-elevated border border-border-default text-sm text-white focus:border-brand-mint focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                  Issuing Organization <span className="text-brand-mint">*</span>
                </label>
                <input
                  type="text"
                  value={certForm.issuer}
                  onChange={(e) => setCertForm({ ...certForm, issuer: e.target.value })}
                  required
                  placeholder="e.g. Amazon Web Services, Meta, Coursera"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-bg-elevated border border-border-default text-sm text-white focus:border-brand-mint focus:outline-none"
                />
              </div>

              {/* Secondary Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                    Issue Date <span className="text-brand-mint">*</span>
                  </label>
                  <input
                    type="date"
                    value={certForm.issueDate}
                    onChange={(e) => setCertForm({ ...certForm, issueDate: e.target.value })}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-bg-elevated border border-border-default text-sm text-white focus:border-brand-mint focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                    Expiration Date <span className="text-text-faint font-normal">(Optional)</span>
                  </label>
                  <input
                    type="date"
                    value={certForm.expirationDate}
                    onChange={(e) => setCertForm({ ...certForm, expirationDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-bg-elevated border border-border-default text-sm text-white focus:border-brand-mint focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                  Credential ID <span className="text-text-faint font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={certForm.credentialId}
                  onChange={(e) => setCertForm({ ...certForm, credentialId: e.target.value })}
                  placeholder="e.g. AWS-12345678"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-bg-elevated border border-border-default text-sm text-white focus:border-brand-mint focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                  Credential URL <span className="text-text-faint font-normal">(Optional)</span>
                </label>
                <input
                  type="url"
                  value={certForm.credentialUrl}
                  onChange={(e) => setCertForm({ ...certForm, credentialUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-bg-elevated border border-border-default text-sm text-white focus:border-brand-mint focus:outline-none"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCertModalOpen(false)}
                  className="btn-secondary text-xs py-3 px-5 min-h-[44px] w-full sm:w-auto cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addCertMutation.isPending || updateCertMutation.isPending}
                  className="btn-primary text-xs py-3 px-6 min-h-[44px] w-full sm:w-auto cursor-pointer"
                >
                  {editingCertId ? "Save Changes" : "Add Certificate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Request Recommendation Modal ── */}
      {isReqRecModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-3xl border border-border-default bg-bg-card p-6 sm:p-8 space-y-4 shadow-2xl max-h-[90dvh] sm:max-h-[85vh] overflow-y-auto overscroll-contain">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-heading font-extrabold text-white">
                Request an Endorsement
              </h3>
              <button
                type="button"
                onClick={() => setIsReqRecModalOpen(false)}
                className="p-2.5 -mr-1.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-text-muted hover:text-white cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-text-muted leading-relaxed">
              Share your public profile link with instructors, mentors, or collaborators so they can submit a verified recommendation for your student profile.
            </p>

            <div className="p-3 rounded-xl bg-bg-elevated border border-border-default flex items-center justify-between gap-2">
              <span className="text-xs font-mono text-white truncate">
                {`${window.location.origin}/u/${profile?.username}`}
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/u/${profile?.username}`);
                  toast.success("Copied", "Public profile link copied to clipboard.");
                }}
                className="btn-primary text-xs py-2.5 px-4 min-h-[40px] shrink-0 cursor-pointer"
              >
                Copy Link
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsReqRecModalOpen(false)}
                className="btn-secondary text-xs py-2.5 px-5 min-h-[44px] w-full sm:w-auto cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Change Username Modal ── */}
      <ChangeUsernameModal
        isOpen={isChangeUsernameOpen}
        onClose={() => setIsChangeUsernameOpen(false)}
      />
    </div>
  );
}