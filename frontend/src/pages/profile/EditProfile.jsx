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
  Plus,
  Camera,
  RefreshCw,
  CheckCircle2,
  Briefcase,
  GraduationCap,
  Award,
  Building2,
  BookOpen,
  Code2,
  Globe,
  Trash2,
  ExternalLink,
  MapPin,
  Calendar,
  Check,
  Eye,
  AlertCircle,
  HeartHandshake,
  Circle,
  ShieldCheck,
  ChevronRight,
  AlertTriangle,
  Sparkles,
  Layers,
  ChevronDown,
} from "lucide-react";
import { AuthContext } from "../../context/AuthContext";
import { coreProfileService } from "../../services/coreProfileService";
import { useToast } from "../../components/ui/Toast";
import ChangeUsernameModal from "../../components/username/ChangeUsernameModal";
import ProfileNav from "../../components/profile/ProfileNav";
import { getUploadUrl } from "../../utils/courseUi";
import ImageEditorModal from "../../components/common/ImageEditorModal";
import RoleSelector from "../../components/profile/RoleSelector";
import StructuredSkillsEditor from "../../components/profile/StructuredSkillsEditor";
import ExperienceSummaryCard from "../../components/profile/ExperienceSummaryCard";
import { INFRASTRUCTURE_SECTORS } from "../../constants/infrastructureTaxonomy";
import { normalizeUserRole } from "../../utils/roleNavigation";
import { PROFILE_QUERY_KEYS } from "../../constants/profileQueryKeys";
import {
  normalizeStructuredSkills,
  normalizeAvailability,
  sortExperienceDescending,
  formatExperienceDateRange,
  formatExperienceDateForInput,
  isExperienceOngoing,
  validateExperienceDates,
  sortEducationDescending,
  formatEducationDateRange,
  formatEducationDateForInput,
  inferAcademicDegreeLevel,
  extractAcademicHonors,
  validateEducationForm,
  AEC_QUALIFICATION_SUGGESTIONS,
  sortCertificationsDescending,
  getCertificationExpirationStatus,
  formatCertificationDateRange,
  formatCertificationDateForInput,
  isCertificationVerified,
  validateCertificationForm,
  AEC_CERTIFICATION_SUGGESTIONS,
  AEC_ISSUER_SUGGESTIONS,
} from "../../utils/profileNormalization";

const MAX_BIO_LENGTH = 1000;

const SECTION_CONFIG = [
  { id: "basic-info", index: "01", label: "Basic Information", icon: User, xp: 45, desc: "Avatar, banner, name, location & biography" },
  { id: "professional-identity", index: "02", label: "Professional Identity", icon: Briefcase, xp: 25, desc: "Role, availability & career headline" },
  { id: "skills", index: "03", label: "Skills & Software", icon: Code2, xp: 20, desc: "Structured engineering & technical matrix" },
  { id: "experience", index: "04", label: "Experience", icon: Briefcase, xp: 20, desc: "Career timeline & project contributions" },
  { id: "education", index: "05", label: "Education", icon: GraduationCap, xp: 20, desc: "Academic qualifications & degrees" },
  { id: "certifications", index: "06", label: "Certifications", icon: Award, xp: 15, desc: "Accredited licenses & credential links" },
  { id: "recommendations", index: "07", label: "Recommendations", icon: HeartHandshake, xp: 0, desc: "Verified peer & mentor endorsements" },
  { id: "public-profile", index: "08", label: "Public Profile Setup", icon: Globe, xp: 50, desc: "Public handle, link & publishing state" },
];

export default function EditProfile() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user: authUser, updateUser, setUser } = useContext(AuthContext);
  const toast = useToast();

  const avatarFileRef = useRef(null);
  const bannerFileRef = useRef(null);

  // Normalize section parameter with legacy aliases and redirect stale sections
  const SECTION_ALIASES = {
    introduction: "basic-info",
    about: "basic-info",
    identity: "professional-identity",
    role: "professional-identity",
    roles: "professional-identity",
  };
  const rawSectionParam = (searchParams.get("section") || "basic-info").toLowerCase().trim();
  const validSectionIds = SECTION_CONFIG.map((s) => s.id);
  const normalizedSection = SECTION_ALIASES[rawSectionParam] || (validSectionIds.includes(rawSectionParam)
    ? rawSectionParam
    : "basic-info");

  const [activeSection, setActiveSection] = useState(normalizedSection);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isChangeUsernameOpen, setIsChangeUsernameOpen] = useState(false);

  // Form states: Basic & Identity
  const [name, setName] = useState("");
  const [headline, setHeadline] = useState("");
  const [currentRole, setCurrentRole] = useState("");
  const [location, setLocation] = useState("");
  const [industry, setIndustry] = useState("");
  const [bio, setBio] = useState("");

  // Role & Ecosystem
  const [primaryRole, setPrimaryRole] = useState("STUDENT");
  const [availability, setAvailability] = useState("NOT_AVAILABLE");
  const [discoverableToRecruiters, setDiscoverableToRecruiters] = useState(false);
  const [profileVisibility, setProfileVisibility] = useState("PUBLIC");

  const [primaryDiscipline, setPrimaryDiscipline] = useState("");
  const [specializations, setSpecializations] = useState([]);
  const [infrastructureSectors, setInfrastructureSectors] = useState([]);
  const [preferredLocations, setPreferredLocations] = useState([]);
  const [yearsOfExperience, setYearsOfExperience] = useState(0);

  // Skills
  const [structuredSkills, setStructuredSkills] = useState(
    normalizeStructuredSkills({})
  );
  const [flatSkills, setFlatSkills] = useState([]);


  // Dirty State Protection
  const [isDirty, setIsDirty] = useState(false);
  const [pendingSectionSwitch, setPendingSectionSwitch] = useState(null);
  const [isUnsavedModalOpen, setIsUnsavedModalOpen] = useState(false);

  // Experience Modal & Form
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
    infrastructureSector: "Buildings",
    skillsUsed: [],
    softwareUsed: [],
  });
  const [expSkillInput, setExpSkillInput] = useState("");
  const [expSoftwareInput, setExpSoftwareInput] = useState("");
  const [expErrors, setExpErrors] = useState({});

  // Education Modal & Form
  const [isEduModalOpen, setIsEduModalOpen] = useState(false);
  const [editingEduId, setEditingEduId] = useState(null);
  const [eduErrors, setEduErrors] = useState({});
  const [eduForm, setEduForm] = useState({
    institution: "",
    qualification: "",
    fieldOfStudy: "",
    startDate: "",
    endDate: "",
    currentlyStudying: false,
    description: "",
  });

  // Certifications Modal & Form
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);
  const [editingCertId, setEditingCertId] = useState(null);
  const [certErrors, setCertErrors] = useState({});
  const [certForm, setCertForm] = useState({
    name: "",
    issuer: "",
    issueDate: "",
    expirationDate: "",
    credentialId: "",
    credentialUrl: "",
  });

  // Recommendation Request Modal
  const [isReqRecModalOpen, setIsReqRecModalOpen] = useState(false);

  // Image Editor Modal state for avatar / banner
  const [editingImage, setEditingImage] = useState(null);

  // Synchronize section changes from URL and replace stale query params
  useEffect(() => {
    if (normalizedSection !== activeSection) {
      setActiveSection(normalizedSection);
    }
    const currentParam = searchParams.get("section");
    if (currentParam && currentParam !== normalizedSection) {
      setSearchParams({ section: normalizedSection }, { replace: true });
    }
  }, [normalizedSection, searchParams, setSearchParams]);

  const handleSelectSection = (sectionId) => {
    if (sectionId === activeSection) return;
    if (isDirty) {
      setPendingSectionSwitch(sectionId);
      setIsUnsavedModalOpen(true);
    } else {
      setActiveSection(sectionId);
      setSearchParams({ section: sectionId });
    }
  };

  const handleConfirmDiscard = () => {
    resetFormToProfile();
    setIsUnsavedModalOpen(false);
    if (pendingSectionSwitch) {
      if (pendingSectionSwitch === "exit") {
        navigate("/profile");
      } else {
        setActiveSection(pendingSectionSwitch);
        setSearchParams({ section: pendingSectionSwitch });
      }
      setPendingSectionSwitch(null);
    }
  };

  const handleReturnToOverview = () => {
    if (isDirty) {
      setPendingSectionSwitch("exit");
      setIsUnsavedModalOpen(true);
    } else {
      navigate("/profile");
    }
  };

  // ── Queries ──
  const {
    data: profileData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: PROFILE_QUERY_KEYS.ME,
    queryFn: () => coreProfileService.getMyProfile(),
    staleTime: 1000 * 60 * 5,
  });

  const { data: completionData } = useQuery({
    queryKey: PROFILE_QUERY_KEYS.COMPLETION,
    queryFn: () => coreProfileService.getProfileCompletion(),
    staleTime: 1000 * 60 * 2,
  });

  const { data: recommendationsData } = useQuery({
    queryKey: PROFILE_QUERY_KEYS.RECOMMENDATIONS_MY,
    queryFn: () => coreProfileService.getMyRecommendations(),
    staleTime: 1000 * 60 * 5,
  });

  const profile = profileData?.user || profileData?.profile || profileData;
  const completion = profileData?.completion || completionData?.completion || profile?.completion;
  const recommendations = Array.isArray(recommendationsData?.recommendations)
    ? recommendationsData.recommendations
    : Array.isArray(recommendationsData)
    ? recommendationsData
    : [];

  const resetFormToProfile = () => {
    if (!profile) return;
    setName(profile.name || "");
    setHeadline(profile.headline || "");
    setCurrentRole(profile.currentRole || "");
    setLocation(profile.location || "");
    setIndustry(profile.industry || "");
    setBio(profile.bio || "");
    setPrimaryRole(normalizeUserRole(profile));
    setAvailability(normalizeAvailability(profile.availability));
    setDiscoverableToRecruiters(Boolean(profile.discoverableToRecruiters));
    setProfileVisibility(profile.profileVisibility || "PUBLIC");

    setPrimaryDiscipline(profile.primaryDiscipline || "");
    setSpecializations(Array.isArray(profile.specializations) ? profile.specializations : []);
    setInfrastructureSectors(Array.isArray(profile.infrastructureSectors) ? profile.infrastructureSectors : []);
    setPreferredLocations(Array.isArray(profile.preferredLocations) ? profile.preferredLocations : []);
    setYearsOfExperience(profile.yearsOfExperience || 0);

    if (profile.structuredSkills) {
      setStructuredSkills(normalizeStructuredSkills(profile.structuredSkills));
    }
    setFlatSkills(Array.isArray(profile.skills) ? profile.skills : []);
    setIsDirty(false);
  };

  // Populate local form states from profile data
  useEffect(() => {
    resetFormToProfile();
  }, [profile]);


  const notifyMilestones = (newlyAwarded) => {
    if (Array.isArray(newlyAwarded) && newlyAwarded.length > 0) {
      newlyAwarded.forEach((m) => {
        toast.success(
          `Achievement Unlocked: ${m.title}`,
          `You earned +${m.xpAwarded} XP!`,
          { duration: 6000 }
        );
      });
    }
  };

  // Query invalidation helper ensuring synchronized cache state across Profile overview and studio
  const invalidateProfileQueries = () => {
    queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEYS.ME });
    queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEYS.COMPLETION });
    queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEYS.MY_PROFILE_LEGACY });
  };

  // Comprehensive profile mutation
  const updateMutation = useMutation({
    mutationFn: (payload) => coreProfileService.updateMyProfile(payload),
    onSuccess: (res) => {
      queryClient.setQueryData(PROFILE_QUERY_KEYS.ME, (old) => {
        if (!old) return old;
        const currentProfile = old.user || old.profile || old;
        const updatedUser = { ...currentProfile, ...(res.user || res.profile || res) };
        return {
          ...old,
          user: updatedUser,
          completion: res.completion || old.completion,
        };
      });
      invalidateProfileQueries();

      if (res?.user && updateUser) {
        updateUser(res.user);
      } else if (res?.profile && updateUser) {
        updateUser({
          name: res.profile.name,
          avatar: res.profile.avatar,
          headline: res.profile.headline,
          primaryRole: res.profile.primaryRole,
        });
      }

      setIsDirty(false);
      toast.success("Changes saved", "Your profile has been updated.");
      notifyMilestones(res.newlyAwarded);
    },
    onError: (err) => {
      toast.error("Save failed", err.response?.data?.message || "Could not update your profile.");
    },
  });

  // Avatar upload mutation
  const avatarMutation = useMutation({
    mutationFn: (file) => coreProfileService.uploadAvatar(file),
    onSuccess: (res) => {
      invalidateProfileQueries();
      if (res?.avatar) {
        if (updateUser) updateUser({ avatar: res.avatar });
        if (setUser && authUser) setUser({ ...authUser, avatar: res.avatar });
      }
      toast.success("Avatar updated", "Your profile picture was uploaded.");
      notifyMilestones(res.newlyAwarded);
    },
    onError: (err) => {
      toast.error("Upload failed", err.response?.data?.message || "Could not upload avatar image.");
    },
  });

  // Banner upload mutation
  const bannerMutation = useMutation({
    mutationFn: (file) => coreProfileService.uploadBackground(file),
    onSuccess: (res) => {
      invalidateProfileQueries();
      if (res?.backgroundImage && updateUser) {
        updateUser({ backgroundImage: res.backgroundImage });
      }
      toast.success("Cover updated", "Your profile cover banner was uploaded.");
      notifyMilestones(res.newlyAwarded);
    },
    onError: (err) => {
      toast.error("Upload failed", err.response?.data?.message || "Could not upload cover image.");
    },
  });

  // Remove Banner mutation
  const removeBannerMutation = useMutation({
    mutationFn: () => coreProfileService.removeBackground(),
    onSuccess: () => {
      invalidateProfileQueries();
      toast.success("Banner removed", "Your custom banner was removed.");
    },
    onError: (err) => {
      toast.error("Action failed", err.response?.data?.message || "Could not remove banner.");
    },
  });

  // Experience Mutations
  const addExpMutation = useMutation({
    mutationFn: (payload) => coreProfileService.addExperience(payload),
    onSuccess: (res) => {
      invalidateProfileQueries();
      setIsExpModalOpen(false);
      resetExpForm();
      toast.success("Experience added", "Your professional role has been added.");
      notifyMilestones(res.newlyAwarded);
    },
    onError: (err) => {
      const msg = err.response?.data?.message || err.friendlyMessage || "Failed to add experience.";
      if (typeof msg === "string") {
        const lower = msg.toLowerCase();
        if (lower.includes("end date")) {
          setExpErrors((prev) => ({ ...prev, endDate: msg }));
        } else if (lower.includes("start date")) {
          setExpErrors((prev) => ({ ...prev, startDate: msg }));
        }
      }
      toast.error("Error", msg);
    },
  });

  const updateExpMutation = useMutation({
    mutationFn: ({ id, payload }) => coreProfileService.updateExperience(id, payload),
    onSuccess: (res) => {
      invalidateProfileQueries();
      setIsExpModalOpen(false);
      resetExpForm();
      toast.success("Experience updated", "Your professional role was saved.");
      notifyMilestones(res.newlyAwarded);
    },
    onError: (err) => {
      const msg = err.response?.data?.message || err.friendlyMessage || "Failed to update experience.";
      if (typeof msg === "string") {
        const lower = msg.toLowerCase();
        if (lower.includes("end date")) {
          setExpErrors((prev) => ({ ...prev, endDate: msg }));
        } else if (lower.includes("start date")) {
          setExpErrors((prev) => ({ ...prev, startDate: msg }));
        }
      }
      toast.error("Error", msg);
    },
  });

  const deleteExpMutation = useMutation({
    mutationFn: (id) => coreProfileService.deleteExperience(id),
    onSuccess: () => {
      invalidateProfileQueries();
      toast.success("Deleted", "Experience record removed.");
    },
    onError: (err) => toast.error("Error", err.response?.data?.message || "Failed to delete experience."),
  });

  // Education Mutations
  const addEduMutation = useMutation({
    mutationFn: (payload) => coreProfileService.addEducation(payload),
    onSuccess: (res) => {
      invalidateProfileQueries();
      setIsEduModalOpen(false);
      resetEduForm();
      toast.success("Education added", "Academic qualification added.");
      notifyMilestones(res.newlyAwarded);
    },
    onError: (err) => {
      const msg = err.response?.data?.message || "Failed to add education.";
      if (typeof msg === "string") {
        const lower = msg.toLowerCase();
        if (lower.includes("institution")) {
          setEduErrors((prev) => ({ ...prev, institution: msg }));
        } else if (lower.includes("qualification")) {
          setEduErrors((prev) => ({ ...prev, qualification: msg }));
        } else if (lower.includes("end date")) {
          setEduErrors((prev) => ({ ...prev, endDate: msg }));
        } else if (lower.includes("start date")) {
          setEduErrors((prev) => ({ ...prev, startDate: msg }));
        }
      }
      toast.error("Error", msg);
    },
  });

  const updateEduMutation = useMutation({
    mutationFn: ({ id, payload }) => coreProfileService.updateEducation(id, payload),
    onSuccess: (res) => {
      invalidateProfileQueries();
      setIsEduModalOpen(false);
      resetEduForm();
      toast.success("Education updated", "Academic qualification updated.");
      notifyMilestones(res.newlyAwarded);
    },
    onError: (err) => {
      const msg = err.response?.data?.message || "Failed to update education.";
      if (typeof msg === "string") {
        const lower = msg.toLowerCase();
        if (lower.includes("institution")) {
          setEduErrors((prev) => ({ ...prev, institution: msg }));
        } else if (lower.includes("qualification")) {
          setEduErrors((prev) => ({ ...prev, qualification: msg }));
        } else if (lower.includes("end date")) {
          setEduErrors((prev) => ({ ...prev, endDate: msg }));
        } else if (lower.includes("start date")) {
          setEduErrors((prev) => ({ ...prev, startDate: msg }));
        }
      }
      toast.error("Error", msg);
    },
  });

  const deleteEduMutation = useMutation({
    mutationFn: (id) => coreProfileService.deleteEducation(id),
    onSuccess: () => {
      invalidateProfileQueries();
      toast.success("Deleted", "Education record removed.");
    },
    onError: (err) => toast.error("Error", err.response?.data?.message || "Failed to delete education."),
  });

  const isSavingEdu = addEduMutation.isPending || updateEduMutation.isPending;

  // Certification Mutations
  const addCertMutation = useMutation({
    mutationFn: (payload) => coreProfileService.addCertification(payload),
    onSuccess: (res) => {
      invalidateProfileQueries();
      setIsCertModalOpen(false);
      resetCertForm();
      toast.success("Certification added", "Credential record stored.");
      notifyMilestones(res.newlyAwarded);
    },
    onError: (err) => {
      const msg = err.response?.data?.message || "Failed to add certification.";
      if (typeof msg === "string") {
        const lower = msg.toLowerCase();
        if (lower.includes("name")) {
          setCertErrors((prev) => ({ ...prev, name: msg }));
        } else if (lower.includes("issuer")) {
          setCertErrors((prev) => ({ ...prev, issuer: msg }));
        } else if (lower.includes("expiration date")) {
          setCertErrors((prev) => ({ ...prev, expirationDate: msg }));
        } else if (lower.includes("issue date")) {
          setCertErrors((prev) => ({ ...prev, issueDate: msg }));
        } else if (lower.includes("credential url") || lower.includes("url")) {
          setCertErrors((prev) => ({ ...prev, credentialUrl: msg }));
        }
      }
      toast.error("Error", msg);
    },
  });

  const updateCertMutation = useMutation({
    mutationFn: ({ id, payload }) => coreProfileService.updateCertification(id, payload),
    onSuccess: (res) => {
      invalidateProfileQueries();
      setIsCertModalOpen(false);
      resetCertForm();
      toast.success("Certification updated", "Credential record updated.");
      notifyMilestones(res.newlyAwarded);
    },
    onError: (err) => {
      const msg = err.response?.data?.message || "Failed to update certification.";
      if (typeof msg === "string") {
        const lower = msg.toLowerCase();
        if (lower.includes("name")) {
          setCertErrors((prev) => ({ ...prev, name: msg }));
        } else if (lower.includes("issuer")) {
          setCertErrors((prev) => ({ ...prev, issuer: msg }));
        } else if (lower.includes("expiration date")) {
          setCertErrors((prev) => ({ ...prev, expirationDate: msg }));
        } else if (lower.includes("issue date")) {
          setCertErrors((prev) => ({ ...prev, issueDate: msg }));
        } else if (lower.includes("credential url") || lower.includes("url")) {
          setCertErrors((prev) => ({ ...prev, credentialUrl: msg }));
        }
      }
      toast.error("Error", msg);
    },
  });

  const deleteCertMutation = useMutation({
    mutationFn: (id) => coreProfileService.deleteCertification(id),
    onSuccess: () => {
      invalidateProfileQueries();
      toast.success("Deleted", "Certification record removed.");
    },
    onError: (err) => toast.error("Error", err.response?.data?.message || "Failed to delete certification."),
  });

  const isSavingCert = addCertMutation.isPending || updateCertMutation.isPending;

  // Recommendation Status Mutation
  const updateRecStatusMutation = useMutation({
    mutationFn: ({ id, status }) => coreProfileService.updateRecommendationStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEYS.RECOMMENDATIONS_MY });
      queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEYS.MY_RECOMMENDATIONS_LEGACY });
      queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEYS.ME });
      toast.success("Updated", "Recommendation visibility updated.");
    },
    onError: (err) => toast.error("Action failed", err.response?.data?.message),
  });

  const deleteRecMutation = useMutation({
    mutationFn: (id) => coreProfileService.deleteRecommendation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEYS.RECOMMENDATIONS_MY });
      queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEYS.MY_RECOMMENDATIONS_LEGACY });
      queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEYS.ME });
      toast.success("Deleted", "Recommendation removed.");
    },
    onError: (err) => toast.error("Action failed", err.response?.data?.message),
  });

  // Toggle Public Profile Publish
  const publishMutation = useMutation({
    mutationFn: (published) => coreProfileService.setPublicProfilePublishState(published),
    onSuccess: (res) => {
      queryClient.setQueryData(PROFILE_QUERY_KEYS.ME, (old) => {
        if (!old) return old;
        const currentProfile = old.user || old.profile || old;
        return {
          ...old,
          user: {
            ...currentProfile,
            publicProfilePublished: res.published,
          },
          completion: res.completion || old.completion,
        };
      });
      invalidateProfileQueries();
      toast.success(res.published ? "Profile published!" : "Profile unpublished", res.message);
      notifyMilestones(res.newlyAwarded);
    },
    onError: (err) => toast.error("Action failed", err.response?.data?.message),
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
      infrastructureSector: "Buildings",
      skillsUsed: [],
      softwareUsed: [],
    });
    setExpSkillInput("");
    setExpSoftwareInput("");
    setEditingExpId(null);
    setExpErrors({});
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
    setEduErrors({});
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
    setCertErrors({});
  };

  // Image Upload Handlers
  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      return toast.error("File too large", "Avatar image must be under 25 MB.");
    }
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return toast.error("Invalid format", "Only JPG, PNG, and WebP images are permitted.");
    }
    setEditingImage({ file, type: "avatar" });
    e.target.value = "";
  };

  const handleBannerUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 30 * 1024 * 1024) {
      return toast.error("File too large", "Banner image must be under 30 MB.");
    }
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return toast.error("Invalid format", "Only JPG, PNG, and WebP images are permitted.");
    }
    setEditingImage({ file, type: "banner" });
    e.target.value = "";
  };

  // Save Handlers for sections
  const handleSaveBasicInfo = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      return toast.error("Name required", "Please enter your full name.");
    }
    if (bio.length > MAX_BIO_LENGTH) {
      return toast.error("Too long", `About story must not exceed ${MAX_BIO_LENGTH} characters.`);
    }

    updateMutation.mutate({
      name: name.trim(),
      location: location.trim(),
      bio: bio.trim(),
    });
  };

  const handleSaveProfessionalIdentity = (e) => {
    e.preventDefault();
    updateMutation.mutate({
      headline: headline.trim(),
      currentRole: currentRole.trim(),
      primaryRole: normalizeUserRole(primaryRole),
      availability,
      yearsOfExperience: Number(yearsOfExperience) || 0,
      preferredLocations,
      discoverableToRecruiters,
      profileVisibility,
    });
  };


  const handleSaveSkills = (e) => {
    e.preventDefault();
    const normalized = normalizeStructuredSkills(structuredSkills);
    updateMutation.mutate({
      structuredSkills: {
        technicalSkills: normalized.technicalSkills,
        softwareSkills: normalized.softwareSkills,
        industrySkills: normalized.industrySkills,
        professionalSkills: normalized.professionalSkills,
      },
      skills: (flatSkills || []).slice(0, 25),
    });
  };


  const handleSaveExp = (e) => {
    e.preventDefault();
    if (addExpMutation.isPending || updateExpMutation.isPending) return;

    const errors = {};
    const org = expForm.organization?.trim();
    const role = expForm.role?.trim();

    if (!org) errors.organization = "Organization is required.";
    if (!role) errors.role = "Role is required.";

    const isOngoing = Boolean(expForm.currentlyActive);
    const dateVal = validateExperienceDates(
      expForm.startDate,
      expForm.endDate,
      isOngoing
    );
    if (!dateVal.valid) {
      Object.assign(errors, dateVal.errors);
    }

    if (Object.keys(errors).length > 0) {
      setExpErrors(errors);
      const firstError = Object.values(errors)[0];
      return toast.error("Validation Error", firstError);
    }

    setExpErrors({});

    const payload = {
      ...expForm,
      organization: org,
      role: role,
      startDate: formatExperienceDateForInput(expForm.startDate),
      endDate: isOngoing ? null : formatExperienceDateForInput(expForm.endDate),
      currentlyActive: isOngoing,
    };

    if (editingExpId) {
      updateExpMutation.mutate({ id: editingExpId, payload });
    } else {
      addExpMutation.mutate(payload);
    }
  };

  const handleSaveEdu = (e) => {
    e.preventDefault();
    if (isSavingEdu) return;

    const validation = validateEducationForm(eduForm);
    if (!validation.valid) {
      setEduErrors(validation.errors);
      const firstError = Object.values(validation.errors)[0];
      return toast.error("Validation Error", firstError || "Please check all required education fields.");
    }

    setEduErrors({});

    const isOngoing = Boolean(eduForm.currentlyStudying);
    const payload = {
      institution: eduForm.institution.trim(),
      qualification: eduForm.qualification.trim(),
      fieldOfStudy: eduForm.fieldOfStudy ? eduForm.fieldOfStudy.trim() : "",
      startDate: formatEducationDateForInput(eduForm.startDate),
      endDate: isOngoing ? null : (eduForm.endDate ? formatEducationDateForInput(eduForm.endDate) : null),
      currentlyStudying: isOngoing,
      description: eduForm.description ? eduForm.description.trim() : "",
    };

    if (editingEduId) {
      updateEduMutation.mutate({ id: editingEduId, payload });
    } else {
      addEduMutation.mutate(payload);
    }
  };

  const handleSaveCert = (e) => {
    e.preventDefault();
    if (isSavingCert) return;

    const validation = validateCertificationForm(certForm);
    if (!validation.valid) {
      setCertErrors(validation.errors);
      const firstError = Object.values(validation.errors)[0];
      return toast.error("Validation Error", firstError || "Please check all required certification fields.");
    }

    setCertErrors({});

    const payload = {
      name: certForm.name.trim(),
      issuer: certForm.issuer.trim(),
      issueDate: formatCertificationDateForInput(certForm.issueDate),
      expirationDate: certForm.expirationDate ? formatCertificationDateForInput(certForm.expirationDate) : null,
      credentialId: certForm.credentialId ? certForm.credentialId.trim() : "",
      credentialUrl: certForm.credentialUrl ? certForm.credentialUrl.trim() : "",
    };

    if (editingCertId) {
      updateCertMutation.mutate({ id: editingCertId, payload });
    } else {
      addCertMutation.mutate(payload);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto animate-pulse pb-6 sm:pb-8">
        <div className="h-14 bg-bg-card/60 rounded-2xl border border-white/[0.06]" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 h-96 bg-bg-card/60 rounded-3xl border border-white/[0.06]" />
          <div className="lg:col-span-8 h-96 bg-bg-card/60 rounded-3xl border border-white/[0.06]" />
        </div>
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-danger/10 border border-danger/20 text-danger flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-heading font-extrabold text-white mb-2">
          Unable to Load Profile Studio
        </h2>
        <p className="text-sm text-text-muted mb-6 leading-relaxed">
          {error?.response?.data?.message || "We encountered an issue retrieving your identity data."}
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="btn-primary inline-flex items-center gap-2 py-3 px-6 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    );
  }

  const avatarUrl = getUploadUrl(profile?.avatar);
  const bannerUrl = getUploadUrl(profile?.backgroundImage);
  const isAssignedEducator = normalizeUserRole(profile) === "EDUCATOR";
  const sortedExperiences = sortExperienceDescending(profile?.experience);
  const sortedEducations = sortEducationDescending(profile?.education);
  const sortedCertifications = sortCertificationsDescending(profile?.certifications);

  // Section completion status helper
  const getSectionStatus = (secId) => {
    if (!profile) return "not-started";
    switch (secId) {
      case "basic-info":
        if (profile.name && profile.avatar && profile.bio) return "complete";
        if (profile.name || profile.avatar) return "in-progress";
        return "not-started";
      case "professional-identity":
        if (profile.headline && profile.primaryRole) return "complete";
        if (profile.headline || profile.primaryRole) return "in-progress";
        return "not-started";
      case "skills":
        if (flatSkills.length >= 3) return "complete";
        if (flatSkills.length > 0) return "in-progress";
        return "not-started";
      case "experience":
        return Array.isArray(profile.experience) && profile.experience.length > 0 ? "complete" : "not-started";
      case "education":
        return Array.isArray(profile.education) && profile.education.length > 0 ? "complete" : "not-started";
      case "certifications":
        return Array.isArray(profile.certifications) && profile.certifications.length > 0 ? "complete" : "not-started";
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

  const currentSectionMeta = SECTION_CONFIG.find((s) => s.id === activeSection) || SECTION_CONFIG[0];

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto pb-6 sm:pb-8">
      {/* ── Sub-Navigation ── */}
      <ProfileNav />

      {/* ── Studio Header with Breadcrumb & Quick Actions ── */}
      <div className="p-4 sm:p-6 rounded-3xl border border-white/[0.08] bg-bg-card/80 backdrop-blur-xl shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={handleReturnToOverview}
            className="p-2.5 rounded-xl border border-white/[0.08] bg-bg-elevated/70 hover:bg-white/[0.08] text-text-muted hover:text-white transition-all cursor-pointer shadow-sm min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0 active:scale-95"
            title="Return to Profile Overview"
            aria-label="Back to overview"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold tracking-widest text-brand-mint uppercase">
                Profile Studio
              </span>
              <span className="text-text-faint text-xs">•</span>
              <span className="text-[10px] font-mono text-text-muted uppercase">
                {currentSectionMeta.index} / {SECTION_CONFIG.length}
              </span>
              {isDirty && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-yellow/15 border border-brand-yellow/30 text-brand-yellow animate-pulse">
                  <AlertTriangle className="w-3 h-3" />
                  Draft Changes
                </span>
              )}
            </div>
            <h1 className="font-heading font-black text-xl sm:text-2xl text-white tracking-tight leading-none mt-1">
              {currentSectionMeta.label}
            </h1>
            <p className="text-xs text-text-muted mt-1 hidden sm:block">
              {currentSectionMeta.desc}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          <button
            type="button"
            onClick={() => setIsPreviewOpen(!isPreviewOpen)}
            className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer min-h-[44px] ${
              isPreviewOpen
                ? "bg-brand-mint/15 border border-brand-mint text-brand-mint shadow-[0_0_15px_rgba(159,213,178,0.15)]"
                : "bg-bg-elevated/70 border border-white/[0.08] text-text-muted hover:text-white hover:border-white/20"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isPreviewOpen ? "Hide Preview" : "Live Preview"}</span>
            <span className="sm:hidden">Preview</span>
          </button>

          <Link
            to="/public-profile"
            className="btn-secondary text-xs uppercase tracking-wider flex items-center gap-1.5 py-2.5 px-4 cursor-pointer min-h-[44px]"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">View Public</span>
            <span className="sm:hidden">Public</span>
          </Link>
        </div>
      </div>

      {/* ── Mobile Horizontal Section Carousel (Visible on mobile/tablet < lg) ── */}
      <div className="lg:hidden">
        <div className="overflow-x-auto no-scrollbar py-1 -my-1">
          <div className="flex items-center gap-2 min-w-max px-0.5">
            {SECTION_CONFIG.map((sec) => {
              const Icon = sec.icon;
              const isActive = activeSection === sec.id;
              const status = getSectionStatus(sec.id);

              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => handleSelectSection(sec.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer min-h-[44px] shrink-0 border ${
                    isActive
                      ? "bg-brand-mint/15 border-brand-mint/40 text-brand-mint font-bold shadow-md shadow-brand-mint/10"
                      : "bg-bg-card/70 border-white/[0.06] text-text-muted hover:text-white hover:bg-white/[0.03]"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{sec.label}</span>
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      status === "complete"
                        ? "bg-brand-mint"
                        : status === "in-progress"
                        ? "bg-brand-yellow"
                        : "bg-text-faint/40"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Main Layout: Sidebar & Content Area ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Navigation Sidebar of Sections (Desktop) */}
        <div className="hidden lg:block lg:col-span-4 space-y-4 sticky top-24">
          <div className="rounded-3xl border border-white/[0.08] bg-bg-card/80 backdrop-blur-xl p-3 sm:p-4 space-y-1.5 shadow-xl">
            <div className="px-3 py-2 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-text-faint">
              <span>Studio Sections</span>
              <span className="font-mono text-[10px] text-text-muted">{SECTION_CONFIG.length} Modules</span>
            </div>

            <div className="space-y-1">
              {SECTION_CONFIG.map((sec) => {
                const Icon = sec.icon;
                const isActive = activeSection === sec.id;
                const status = getSectionStatus(sec.id);

                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => handleSelectSection(sec.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl text-left transition-all cursor-pointer min-h-[48px] group relative ${
                      isActive
                        ? "bg-brand-mint/10 border border-brand-mint/30 text-white font-bold shadow-sm"
                        : "text-text-muted hover:text-white hover:bg-white/[0.03] border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`text-[10px] font-mono shrink-0 ${isActive ? "text-brand-mint font-bold" : "text-text-faint"}`}>
                        {sec.index}
                      </span>
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                          isActive
                            ? "bg-brand-mint/20 text-brand-mint ring-1 ring-brand-mint/30"
                            : "bg-white/[0.03] text-text-faint group-hover:text-white"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-sm truncate">{sec.label}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                          status === "complete"
                            ? "text-brand-mint bg-brand-mint/10 border border-brand-mint/20"
                            : status === "in-progress"
                            ? "text-brand-yellow bg-brand-yellow/10 border border-brand-yellow/20"
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
          </div>

          {/* Profile Strength Mini Card */}
          <div className="rounded-3xl border border-white/[0.08] bg-bg-card/80 backdrop-blur-xl p-5 space-y-3.5 shadow-xl">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-text-muted">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-brand-mint" />
                Profile Strength
              </span>
              <span className="text-brand-mint font-mono font-bold text-sm">
                {completion?.completionPercent || 0}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06] p-0.5 border border-white/[0.04]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-mint via-brand-yellow to-brand-yellow transition-all duration-500"
                style={{ width: `${completion?.completionPercent || 0}%` }}
              />
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              {completion?.remainingMilestones?.length || 0} step{completion?.remainingMilestones?.length === 1 ? "" : "s"} remaining to 100% completion. Complete items to unlock senior infrastructure perks.
            </p>
          </div>
        </div>

        {/* Center / Main Editing Area */}
        <div className={isPreviewOpen ? "lg:col-span-4" : "lg:col-span-8"}>
          {/* SECTION 1: BASIC INFORMATION */}
          {activeSection === "basic-info" && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-white/[0.08] bg-bg-card/80 backdrop-blur-xl p-6 sm:p-8 space-y-6 shadow-xl"
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase text-brand-mint tracking-widest font-bold">
                      SECTION 01 OF 08
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-brand-yellow/10 border border-brand-yellow/20 text-brand-yellow">
                    +45 XP
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-heading font-black text-white tracking-tight">
                  Basic Information
                </h2>
                <p className="text-xs sm:text-sm text-text-muted leading-relaxed mt-1">
                  Set your profile photo, cover banner, full name, base location, and professional biography.
                </p>
              </div>

              {/* Cover Banner Uploader */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                  Background Cover Banner
                </label>
                <div className="relative h-44 w-full rounded-2xl border border-white/[0.08] overflow-hidden bg-bg-elevated flex items-center justify-center group shadow-inner">
                  {bannerUrl ? (
                    <img src={bannerUrl} alt="Cover" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full relative overflow-hidden bg-gradient-to-br from-[#0c1520] to-[#04070a] flex items-center justify-center">
                      <span className="text-xs text-text-muted font-mono uppercase tracking-widest">
                        Custom Cover Banner
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px] flex items-center justify-center gap-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => bannerFileRef.current?.click()}
                      disabled={bannerMutation.isPending}
                      className="btn-secondary text-xs py-2.5 px-4 flex items-center gap-2 cursor-pointer shadow-md min-h-[44px]"
                    >
                      <Camera className="w-4 h-4 text-brand-mint" />
                      Upload Banner
                    </button>
                    {bannerUrl && (
                      <button
                        type="button"
                        onClick={() => removeBannerMutation.mutate()}
                        disabled={removeBannerMutation.isPending}
                        className="btn-danger text-xs py-2.5 px-4 flex items-center gap-2 cursor-pointer shadow-md min-h-[44px]"
                      >
                        <Trash2 className="w-4 h-4" />
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
                  <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-brand-mint/40 bg-bg-elevated flex items-center justify-center shadow-lg ring-4 ring-brand-mint/10">
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
                    className="absolute inset-0 bg-black/60 backdrop-blur-xs rounded-2xl flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white"
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
                    JPG, PNG, or WebP under 25 MB. Represents your verified infrastructure identity across Zeitnah.
                  </p>
                  <button
                    type="button"
                    onClick={() => avatarFileRef.current?.click()}
                    className="mt-2 text-xs font-semibold text-brand-mint hover:underline inline-flex items-center gap-1.5 cursor-pointer min-h-[36px]"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Choose New Photo
                  </button>
                </div>
              </div>

              <form onSubmit={handleSaveBasicInfo} className="space-y-4 pt-2">
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
                    className="w-full px-4 py-3 rounded-xl bg-bg-elevated/70 border border-white/[0.08] focus:border-brand-mint/50 focus:ring-1 focus:ring-brand-mint/30 focus:outline-none text-sm text-white transition-colors"
                    placeholder="e.g. Riswan P.R"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
                    Current Location
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => {
                      setLocation(e.target.value);
                      setIsDirty(true);
                    }}
                    className="w-full px-4 py-3 rounded-xl bg-bg-elevated/70 border border-white/[0.08] focus:border-brand-mint/50 focus:ring-1 focus:ring-brand-mint/30 focus:outline-none text-sm text-white transition-colors"
                    placeholder="e.g. Dubai, United Arab Emirates"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
                    About / Bio Summary
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => {
                      setBio(e.target.value);
                      setIsDirty(true);
                    }}
                    rows={6}
                    maxLength={MAX_BIO_LENGTH}
                    className="w-full px-4 py-3 rounded-2xl bg-bg-elevated/70 border border-white/[0.08] focus:border-brand-mint/50 focus:ring-1 focus:ring-brand-mint/30 focus:outline-none text-sm text-white transition-colors resize-none leading-relaxed"
                    placeholder="Tell your professional infrastructure story: your engineering trajectory, key projects, specialization areas, and career goals..."
                  />
                  <div className="flex justify-between text-xs text-text-muted mt-1 px-1">
                    <span>Authentic overview of your engineering trajectory.</span>
                    <span className={bio.length > MAX_BIO_LENGTH - 50 ? "text-danger font-bold" : ""}>
                      {bio.length} / {MAX_BIO_LENGTH}
                    </span>
                  </div>
                </div>

                <div className="pt-3 flex justify-end">
                  <button
                    type="submit"
                    disabled={updateMutation.isPending}
                    className="btn-primary text-xs uppercase tracking-wider flex items-center gap-2 py-3 px-6 cursor-pointer shadow-lg shadow-brand-mint/10 min-h-[44px]"
                  >
                    {updateMutation.isPending ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Save Basic Information
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* SECTION 2: PROFESSIONAL IDENTITY */}
          {activeSection === "professional-identity" && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-white/[0.08] bg-bg-card/80 backdrop-blur-xl p-6 sm:p-8 space-y-6 shadow-xl"
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono uppercase text-brand-mint tracking-widest font-bold">
                    SECTION 02 OF 08
                  </span>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-brand-yellow/10 border border-brand-yellow/20 text-brand-yellow">
                    +25 XP
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-heading font-black text-white tracking-tight">
                  Professional Identity & Role
                </h2>
                <p className="text-xs sm:text-sm text-text-muted leading-relaxed mt-1">
                  Establish your infrastructure ecosystem role, headline, availability, and job title.
                </p>
              </div>

              <form onSubmit={handleSaveProfessionalIdentity} className="space-y-6">
                {/* Controlled Role Selector */}
                <RoleSelector
                  value={primaryRole}
                  onChange={(newRole) => {
                    setPrimaryRole(newRole);
                    setIsDirty(true);
                  }}
                  isAssignedEducator={isAssignedEducator}
                />

                {/* Headline */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
                    Professional Headline <span className="text-brand-mint">*</span>
                  </label>
                  <input
                    type="text"
                    value={headline}
                    onChange={(e) => {
                      setHeadline(e.target.value);
                      setIsDirty(true);
                    }}
                    maxLength={120}
                    className="w-full px-4 py-3 rounded-xl bg-bg-elevated/70 border border-white/[0.08] focus:border-brand-mint/50 focus:ring-1 focus:ring-brand-mint/30 focus:outline-none text-sm text-white transition-colors"
                    placeholder="e.g. Planning Engineer | Primavera P6 & BIM Specialist | Metro & Rail Infrastructure"
                  />
                  <span className="text-[11px] text-text-muted mt-1 block">
                    Concise summary displayed in network search and profile hero.
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
                      Current Position / Title
                    </label>
                    <input
                      type="text"
                      value={currentRole}
                      onChange={(e) => {
                        setCurrentRole(e.target.value);
                        setIsDirty(true);
                      }}
                      className="w-full px-4 py-2.5 rounded-xl bg-bg-elevated/70 border border-white/[0.08] focus:border-brand-mint/50 focus:ring-1 focus:ring-brand-mint/30 focus:outline-none text-sm text-white transition-colors"
                      placeholder="e.g. Senior Structural Engineer"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
                      Availability Status
                    </label>
                    <select
                      value={availability}
                      onChange={(e) => {
                        setAvailability(e.target.value);
                        setIsDirty(true);
                      }}
                      className="w-full px-4 py-2.5 rounded-xl bg-bg-elevated/70 border border-white/[0.08] focus:border-brand-mint/50 focus:ring-1 focus:ring-brand-mint/30 focus:outline-none text-sm text-white transition-colors cursor-pointer"
                    >
                      <option value="NOT_AVAILABLE">Not Available — Not currently seeking roles or hiring</option>
                      <option value="OPEN_TO_WORK">Open to Work — Looking for employment or opportunities</option>
                      <option value="OPEN_TO_HIRING">Open to Hiring — Hiring talent for projects or companies</option>
                    </select>
                    <span className="text-[11px] text-text-muted mt-1 block">
                      Displays an active frame and status indicator on your avatar across the directory and profile hero.
                    </span>
                  </div>
                </div>

                <div className="pt-3 flex justify-end">
                  <button
                    type="submit"
                    disabled={updateMutation.isPending}
                    className="btn-primary text-xs uppercase tracking-wider flex items-center gap-2 py-3 px-6 cursor-pointer shadow-lg shadow-brand-mint/10 min-h-[44px]"
                  >
                    {updateMutation.isPending ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Save Professional Identity
                  </button>
                </div>
              </form>
            </motion.div>
          )}


          {/* SECTION 3: SKILLS & SOFTWARE */}
          {activeSection === "skills" && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-white/[0.08] bg-bg-card/80 backdrop-blur-xl p-6 sm:p-8 space-y-6 shadow-xl"
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono uppercase text-brand-mint tracking-widest font-bold">
                    SECTION 03 OF 08
                  </span>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-brand-yellow/10 border border-brand-yellow/20 text-brand-yellow">
                    +20 XP (3+ Skills)
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-heading font-black text-white tracking-tight">
                  Structured Skills & Software
                </h2>
                <p className="text-xs sm:text-sm text-text-muted leading-relaxed mt-1">
                  Organized across Software Tools, Technical Engineering Knowledge, and Professional Competencies.
                </p>
              </div>

              <form onSubmit={handleSaveSkills} className="space-y-6">
                <StructuredSkillsEditor
                  structuredSkills={structuredSkills}
                  setStructuredSkills={setStructuredSkills}
                  flatSkills={flatSkills}
                  setFlatSkills={setFlatSkills}
                  onChangeDirty={() => setIsDirty(true)}
                />

                <div className="pt-3 flex justify-end">
                  <button
                    type="submit"
                    disabled={updateMutation.isPending}
                    className="btn-primary text-xs uppercase tracking-wider flex items-center gap-2 py-3 px-6 cursor-pointer shadow-lg shadow-brand-mint/10 min-h-[44px]"
                  >
                    {updateMutation.isPending ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Save Skills Matrix
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* SECTION 4: EXPERIENCE */}
          {activeSection === "experience" && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-white/[0.08] bg-bg-card/80 backdrop-blur-xl p-6 sm:p-8 space-y-6 shadow-xl"
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono uppercase text-brand-mint tracking-widest font-bold">
                    SECTION 04 OF 08
                  </span>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-brand-yellow/10 border border-brand-yellow/20 text-brand-yellow">
                    +20 XP
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-heading font-black text-white tracking-tight">
                  Professional Experience
                </h2>
                <p className="text-xs sm:text-sm text-text-muted mt-1 leading-relaxed">
                  Your professional career timeline, roles, achievements, and contributions.
                </p>
              </div>

              {/* Total Professional Experience Summary Card */}
              <ExperienceSummaryCard experience={profile?.experience} />

              <div className="flex items-center justify-between gap-4 pt-1">
                <div>
                  <h3 className="text-sm font-heading font-bold text-white tracking-tight">
                    Career Timeline
                  </h3>
                  <p className="text-xs text-text-muted">
                    Individual positions, responsibilities, and competencies
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    resetExpForm();
                    setIsExpModalOpen(true);
                  }}
                  className="btn-primary text-xs uppercase tracking-wider flex items-center gap-1.5 py-2.5 px-4 cursor-pointer shadow-md min-h-[44px] shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Experience
                </button>
              </div>

              {sortedExperiences.length > 0 ? (
                <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-[11px] sm:before:left-[15px] before:top-4 before:bottom-4 before:w-[2px] before:bg-gradient-to-b before:from-brand-mint/50 before:via-white/[0.08] before:to-transparent">
                  {sortedExperiences.map((exp, expIdx) => {
                    const expId = exp.id || exp._id;
                    const isOngoing = isExperienceOngoing(exp);
                    const dateRangeStr = formatExperienceDateRange(exp.startDate, exp.endDate, exp.currentlyActive);

                    return (
                      <div key={expId || `exp-${expIdx}`} className="relative group">
                        {/* Timeline node marker */}
                        <div
                          className={`absolute -left-6 sm:-left-8 top-1.5 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                            isOngoing
                              ? "bg-[#070B14] border-brand-mint text-brand-mint shadow-[0_0_12px_rgba(159,213,178,0.35)]"
                              : "bg-bg-card border-white/20 text-text-muted group-hover:border-white/40"
                          }`}
                        >
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${
                              isOngoing ? "bg-brand-mint animate-pulse" : "bg-white/40 group-hover:bg-white/70"
                            }`}
                          />
                        </div>

                        {/* Experience Card */}
                        <div className="p-5 sm:p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-brand-mint/30 hover:bg-white/[0.035] transition-all shadow-sm flex flex-col justify-between gap-3.5">
                          {/* Top row: Job title & Edit/Delete actions */}
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1 min-w-0 flex-1">
                              {/* 1. Job Title — Strongest emphasis */}
                              <h3 className="text-base sm:text-lg font-heading font-black text-white tracking-tight leading-snug break-words">
                                {exp.role || "Untitled Position"}
                              </h3>

                              {/* 2. Company Name & Location */}
                              <div className="flex items-center gap-2 flex-wrap text-xs sm:text-sm text-text-secondary font-medium">
                                <span className="text-brand-mint font-bold break-words">
                                  {exp.organization || "Organization"}
                                </span>
                                {exp.location && (
                                  <>
                                    <span className="text-white/20">•</span>
                                    <span className="inline-flex items-center gap-1 text-text-muted">
                                      <MapPin className="w-3.5 h-3.5 text-text-faint shrink-0" />
                                      <span className="break-words">{exp.location}</span>
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* 7. Edit and Delete actions with accessible labels */}
                            <div className="flex items-center gap-1 shrink-0 opacity-90 sm:opacity-75 sm:group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingExpId(expId);
                                  setExpErrors({});
                                  setExpForm({
                                    organization: exp.organization || "",
                                    role: exp.role || "",
                                    employmentType: exp.employmentType || "Full-time",
                                    location: exp.location || "",
                                    startDate: formatExperienceDateForInput(exp.startDate),
                                    endDate: exp.currentlyActive ? "" : formatExperienceDateForInput(exp.endDate),
                                    currentlyActive: Boolean(exp.currentlyActive),
                                    description: exp.description || "",
                                    infrastructureSector: exp.infrastructureSector || "Buildings",
                                    skillsUsed: Array.isArray(exp.skillsUsed) ? exp.skillsUsed : [],
                                    softwareUsed: Array.isArray(exp.softwareUsed) ? exp.softwareUsed : [],
                                  });
                                  setIsExpModalOpen(true);
                                }}
                                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-text-muted hover:text-brand-mint hover:bg-white/[0.04] transition-colors cursor-pointer"
                                title={`Edit ${exp.role || "experience"}`}
                                aria-label={`Edit ${exp.role || "experience"} at ${exp.organization || "organization"}`}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteExpMutation.mutate(expId)}
                                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-text-muted hover:text-danger hover:bg-white/[0.04] transition-colors cursor-pointer"
                                title={`Delete ${exp.role || "experience"}`}
                                aria-label={`Delete ${exp.role || "experience"} at ${exp.organization || "organization"}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* 3 & 4. Dates, Ongoing Badge, Employment Type, and AEC Sector */}
                          <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
                            {dateRangeStr && (
                              <span className="inline-flex items-center gap-1.5 text-text-muted font-medium">
                                <Calendar className="w-3.5 h-3.5 text-text-faint shrink-0" />
                                <span>{dateRangeStr}</span>
                              </span>
                            )}
                            {isOngoing && (
                              <span className="px-2 py-0.5 rounded-md bg-brand-mint/10 border border-brand-mint/25 text-[10px] font-mono font-bold text-brand-mint uppercase tracking-wider inline-flex items-center gap-1.5 shadow-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-brand-mint animate-pulse shrink-0" />
                                <span>Current</span>
                              </span>
                            )}
                            {exp.employmentType && (
                              <span className="px-2 py-0.5 rounded-md bg-white/[0.04] text-text-muted font-bold text-[11px] border border-white/[0.06]">
                                {exp.employmentType}
                              </span>
                            )}
                            {exp.infrastructureSector && (
                              <span className="px-2.5 py-0.5 rounded-md bg-brand-mint/10 text-brand-mint border border-brand-mint/20 font-semibold text-[11px] flex items-center gap-1">
                                <Layers className="w-3 h-3 text-brand-mint shrink-0" />
                                <span>{exp.infrastructureSector}</span>
                              </span>
                            )}
                          </div>

                          {/* 5. Description with readable line length and spacing */}
                          {exp.description && (
                            <p className="text-xs sm:text-sm text-text-secondary leading-relaxed whitespace-pre-line max-w-3xl pt-0.5 break-words">
                              {exp.description}
                            </p>
                          )}

                          {/* 6. Relevant skills & software as compact chips */}
                          {((exp.softwareUsed && exp.softwareUsed.length > 0) ||
                            (exp.skillsUsed && exp.skillsUsed.length > 0)) && (
                            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-white/[0.05]">
                              {exp.softwareUsed?.map((sw) => (
                                <span
                                  key={sw}
                                  className="px-2 py-0.5 rounded-md bg-brand-mint/10 border border-brand-mint/20 text-[11px] font-mono text-brand-mint font-medium"
                                >
                                  {sw}
                                </span>
                              ))}
                              {exp.skillsUsed?.map((sk) => (
                                <span
                                  key={sk}
                                  className="px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.06] text-[11px] text-text-secondary font-medium"
                                >
                                  {sk}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-14 px-4 rounded-3xl border border-dashed border-white/[0.1] text-center space-y-3.5 bg-white/[0.01]">
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto text-text-muted">
                    <Briefcase className="w-6 h-6 text-brand-mint/70" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">No career experience listed yet</h4>
                    <p className="text-xs text-text-muted max-w-sm mx-auto mt-1 leading-relaxed">
                      Document your on-site engineering, design consultancy, or management roles to build professional authority.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      resetExpForm();
                      setIsExpModalOpen(true);
                    }}
                    className="btn-primary text-xs uppercase tracking-wider inline-flex items-center gap-1.5 py-2.5 px-5 cursor-pointer min-h-[44px]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add First Experience
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* SECTION 5: EDUCATION */}
          {activeSection === "education" && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-white/[0.08] bg-bg-card/80 backdrop-blur-xl p-6 sm:p-8 space-y-6 shadow-xl"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-[10px] font-mono uppercase text-brand-mint tracking-widest font-bold">
                      SECTION 05 OF 08
                    </span>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-brand-yellow/10 border border-brand-yellow/20 text-brand-yellow">
                      +20 XP
                    </span>
                    {profile?.education?.length > 0 && (
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-white/80">
                        {profile.education.length} {profile.education.length === 1 ? "Qualification" : "Qualifications"}
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-heading font-black text-white tracking-tight">
                    Education & Academics
                  </h2>
                  <p className="text-xs sm:text-sm text-text-muted mt-1 leading-relaxed">
                    Academic qualifications, technical diplomas, and professional learning.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    resetEduForm();
                    setIsEduModalOpen(true);
                  }}
                  className="btn-primary text-xs uppercase tracking-wider flex items-center gap-1.5 py-2.5 px-4 cursor-pointer shadow-md min-h-[44px] shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Education
                </button>
              </div>

              {sortedEducations.length > 0 ? (
                <div className="space-y-4">
                  {sortedEducations.map((edu) => {
                    const eduId = edu.id || edu._id;
                    const levelInfo = inferAcademicDegreeLevel(edu.qualification, edu.fieldOfStudy);
                    const honorsInfo = extractAcademicHonors(edu.description);
                    const dateRange = formatEducationDateRange(edu.startDate, edu.endDate, edu.currentlyStudying);

                    return (
                      <div
                        key={eduId}
                        className="p-5 sm:p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-brand-mint/30 hover:bg-white/[0.035] transition-all shadow-sm flex flex-col justify-between gap-4 group"
                      >
                        <div className="space-y-2.5 min-w-0">
                          {/* Top metadata row */}
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-md font-bold border ${levelInfo.badgeClass}`}>
                                {levelInfo.level}
                              </span>
                              {edu.currentlyStudying && (
                                <span className="px-2 py-0.5 rounded-md bg-brand-mint/10 border border-brand-mint/25 text-[10px] font-mono font-bold text-brand-mint uppercase tracking-wider inline-flex items-center gap-1.5 shadow-sm">
                                  <span className="w-1.5 h-1.5 rounded-full bg-brand-mint animate-pulse shrink-0" />
                                  <span>In Progress</span>
                                </span>
                              )}
                              {dateRange && (
                                <span className="inline-flex items-center gap-1.5 text-xs font-mono font-medium text-text-muted">
                                  <Calendar className="w-3.5 h-3.5 text-text-faint shrink-0" />
                                  <span>{dateRange}</span>
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1 shrink-0 opacity-90 sm:opacity-75 sm:group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingEduId(eduId);
                                  setEduForm({
                                    institution: edu.institution || "",
                                    qualification: edu.qualification || "",
                                    fieldOfStudy: edu.fieldOfStudy || "",
                                    startDate: formatEducationDateForInput(edu.startDate),
                                    endDate: formatEducationDateForInput(edu.endDate),
                                    currentlyStudying: Boolean(edu.currentlyStudying),
                                    description: edu.description || "",
                                  });
                                  setEduErrors({});
                                  setIsEduModalOpen(true);
                                }}
                                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-text-muted hover:text-brand-mint hover:bg-white/[0.04] transition-colors cursor-pointer"
                                title={`Edit ${edu.qualification || "academic qualification"}`}
                                aria-label={`Edit ${edu.qualification || "academic qualification"} at ${edu.institution || "institution"}`}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteEduMutation.mutate(eduId)}
                                disabled={deleteEduMutation.isPending}
                                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-text-muted hover:text-danger hover:bg-white/[0.04] transition-colors cursor-pointer disabled:opacity-50"
                                title={`Delete ${edu.qualification || "academic qualification"}`}
                                aria-label={`Delete ${edu.qualification || "academic qualification"} at ${edu.institution || "institution"}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Qualification & Institution */}
                          <div>
                            <h3 className="text-base sm:text-lg font-heading font-black text-white tracking-tight leading-snug break-words">
                              {edu.qualification}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-text-secondary font-medium mt-1">
                              <span className="text-brand-mint font-bold inline-flex items-center gap-1.5 break-words">
                                <Building2 className="w-3.5 h-3.5 text-brand-mint/80 shrink-0" />
                                <span>{edu.institution}</span>
                              </span>
                              {edu.fieldOfStudy && (
                                <>
                                  <span className="text-white/20">•</span>
                                  <span className="text-brand-mint/90 font-medium break-words">{edu.fieldOfStudy}</span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Grade / Honors badge if detected */}
                          {honorsInfo.grade && (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-300">
                              <Award className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span>{honorsInfo.grade}</span>
                            </div>
                          )}

                          {/* Description */}
                          {edu.description && (
                            <p className="text-xs sm:text-sm text-text-secondary leading-relaxed pt-2.5 border-t border-white/[0.04] whitespace-pre-line break-words">
                              {edu.description}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 px-6 rounded-3xl border border-dashed border-white/[0.1] text-center space-y-3.5 bg-white/[0.01]">
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto text-brand-mint/70">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Build your academic profile</h4>
                    <p className="text-xs text-text-muted max-w-sm mx-auto mt-1 leading-relaxed">
                      Add your degrees, diplomas, and qualifications to showcase your educational journey.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      resetEduForm();
                      setIsEduModalOpen(true);
                    }}
                    className="btn-primary text-xs uppercase tracking-wider inline-flex items-center gap-1.5 py-2.5 px-5 cursor-pointer min-h-[44px]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Education
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* SECTION 6: CERTIFICATIONS */}
          {activeSection === "certifications" && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-white/[0.08] bg-bg-card/80 backdrop-blur-xl p-6 sm:p-8 space-y-6 shadow-xl"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-[10px] font-mono uppercase text-brand-mint tracking-widest font-bold">
                      SECTION 06 OF 08
                    </span>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-brand-yellow/10 border border-brand-yellow/20 text-brand-yellow">
                      +15 XP
                    </span>
                    {profile?.certifications?.length > 0 && (
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-white/80">
                        {profile.certifications.length} {profile.certifications.length === 1 ? "Credential" : "Credentials"}
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-heading font-black text-white tracking-tight">
                    Licenses & Certifications
                  </h2>
                  <p className="text-xs sm:text-sm text-text-muted mt-1 leading-relaxed">
                    Accredited licenses, software certifications, and professional engineering council registrations.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    resetCertForm();
                    setIsCertModalOpen(true);
                  }}
                  className="btn-primary text-xs uppercase tracking-wider flex items-center gap-1.5 py-2.5 px-4 cursor-pointer shadow-md min-h-[44px] shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Credential
                </button>
              </div>

              {sortedCertifications.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sortedCertifications.map((cert) => {
                    const certId = cert.id || cert._id;
                    const dateRange = formatCertificationDateRange(cert.issueDate, cert.expirationDate);
                    const statusInfo = getCertificationExpirationStatus(cert.issueDate, cert.expirationDate);
                    const isVerified = isCertificationVerified(cert);

                    return (
                      <div
                        key={certId}
                        className="p-5 sm:p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-brand-mint/30 hover:bg-white/[0.035] transition-all flex flex-col justify-between gap-4 shadow-sm group"
                      >
                        <div className="space-y-3 min-w-0">
                          {/* Top Row: Status badge, verified badge & edit/delete actions */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
                              <span
                                className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-md font-bold border inline-flex items-center gap-1.5 ${statusInfo.badgeClass}`}
                              >
                                {statusInfo.isActive && !statusInfo.isExpired && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-brand-mint animate-pulse shrink-0" />
                                )}
                                <span>{statusInfo.label}</span>
                              </span>

                              {isVerified && (
                                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md font-bold bg-brand-mint/15 text-brand-mint border border-brand-mint/30 inline-flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-brand-mint" />
                                  <span>Verified</span>
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1 shrink-0 opacity-90 sm:opacity-75 sm:group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCertId(certId);
                                  setCertForm({
                                    name: cert.name || "",
                                    issuer: cert.issuer || "",
                                    issueDate: formatCertificationDateForInput(cert.issueDate),
                                    expirationDate: formatCertificationDateForInput(cert.expirationDate),
                                    credentialId: cert.credentialId || "",
                                    credentialUrl: cert.credentialUrl || "",
                                  });
                                  setCertErrors({});
                                  setIsCertModalOpen(true);
                                }}
                                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-text-muted hover:text-brand-mint hover:bg-white/[0.04] transition-colors cursor-pointer"
                                title={`Edit ${cert.name}`}
                                aria-label={`Edit ${cert.name}`}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteCertMutation.mutate(certId)}
                                disabled={deleteCertMutation.isPending}
                                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-text-muted hover:text-danger hover:bg-white/[0.04] transition-colors cursor-pointer disabled:opacity-50"
                                title={`Delete ${cert.name}`}
                                aria-label={`Delete ${cert.name}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Credential Name & Issuer */}
                          <div>
                            <h3 className="text-base sm:text-lg font-heading font-black text-white tracking-tight leading-snug break-words">
                              {cert.name}
                            </h3>
                            <p className="text-xs sm:text-sm font-semibold text-brand-mint mt-1 break-words">
                              {cert.issuer}
                            </p>
                          </div>

                          {/* Date Range */}
                          {dateRange && (
                            <div className="flex items-center gap-1.5 text-xs text-text-muted font-mono font-medium">
                              <Calendar className="w-3.5 h-3.5 text-text-faint shrink-0" />
                              <span>{dateRange}</span>
                            </div>
                          )}

                          {/* Credential ID */}
                          {cert.credentialId && (
                            <p className="text-[11px] font-mono text-text-muted break-words">
                              Credential ID: <span className="text-white/80 font-medium">{cert.credentialId}</span>
                            </p>
                          )}
                        </div>

                        {/* Bottom Row: Credential URL Link */}
                        {cert.credentialUrl && (
                          <div className="pt-3 border-t border-white/[0.04]">
                            <a
                              href={cert.credentialUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-brand-mint hover:underline inline-flex items-center gap-1.5 min-h-[36px] font-medium"
                            >
                              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                              <span>View Credential</span>
                            </a>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-14 px-4 rounded-3xl border border-dashed border-white/[0.1] text-center space-y-3.5 bg-white/[0.01]">
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto text-text-muted">
                    <Award className="w-6 h-6 text-brand-mint/70" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">No certifications recorded</h4>
                    <p className="text-xs text-text-muted max-w-sm mx-auto mt-1 leading-relaxed">
                      Add BIM certificates, project management certifications, or state engineering licenses.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      resetCertForm();
                      setIsCertModalOpen(true);
                    }}
                    className="btn-primary text-xs uppercase tracking-wider inline-flex items-center gap-1.5 py-2.5 px-5 cursor-pointer min-h-[44px]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Credential
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* SECTION 7: RECOMMENDATIONS */}
          {activeSection === "recommendations" && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-white/[0.08] bg-bg-card/80 backdrop-blur-xl p-6 sm:p-8 space-y-6 shadow-xl"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono uppercase text-brand-mint tracking-widest font-bold">
                      SECTION 07 OF 08
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-heading font-black text-white tracking-tight">
                    Peer & Mentor Endorsements
                  </h2>
                  <p className="text-xs sm:text-sm text-text-muted mt-1 leading-relaxed">
                    Verified testimonials from colleagues, project leaders, and academic professors.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsReqRecModalOpen(true)}
                  className="btn-primary text-xs uppercase tracking-wider flex items-center gap-1.5 py-2.5 px-4 cursor-pointer shadow-md min-h-[44px] shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Request Endorsement
                </button>
              </div>

              {recommendations.length > 0 ? (
                <div className="space-y-4">
                  {recommendations.map((rec) => {
                    const rId = rec.id || rec._id;
                    const author = rec.author || {};
                    const authorName = rec.authorName || author.name || "Peer";
                    const authorAvatar = rec.authorAvatar || author.avatar;
                    const authorHeadline = rec.authorHeadline || author.headline || rec.relationship || "Colleague";
                    const isApproved = String(rec.status).toLowerCase() === "approved";

                    return (
                      <div
                        key={rId}
                        className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-brand-mint/30 transition-all flex flex-col justify-between gap-3 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-bg-elevated border border-white/[0.08] overflow-hidden flex items-center justify-center shrink-0">
                              {authorAvatar ? (
                                <img src={getUploadUrl(authorAvatar)} alt={authorName} className="w-full h-full object-cover" />
                              ) : (
                                <User className="w-5 h-5 text-brand-mint" />
                              )}
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-white">{authorName}</h4>
                              <p className="text-xs text-text-muted">{authorHeadline}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                                isApproved
                                  ? "bg-brand-mint/15 text-brand-mint border border-brand-mint/30"
                                  : "bg-brand-yellow/15 text-brand-yellow border border-brand-yellow/30"
                              }`}
                            >
                              {isApproved ? "Approved ✓" : "Pending"}
                            </span>
                            <button
                              type="button"
                              onClick={() => deleteRecMutation.mutate(rId)}
                              className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-text-muted hover:text-danger hover:bg-white/[0.04] transition-colors cursor-pointer"
                              title="Delete"
                              aria-label="Delete recommendation"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <p className="text-xs text-text-secondary leading-relaxed italic border-l-2 border-brand-mint/30 pl-3 my-1">
                          "{rec.content || rec.text || rec.message}"
                        </p>

                        <div className="flex items-center justify-between text-[11px] text-text-faint pt-1">
                          <span>Relationship: {rec.relationship || "Professional"}</span>
                          {!isApproved && (
                            <button
                              type="button"
                              onClick={() => updateRecStatusMutation.mutate({ id: rId, status: "approved" })}
                              className="text-brand-mint font-semibold hover:underline cursor-pointer"
                            >
                              Approve for Public Profile
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-14 px-4 rounded-3xl border border-dashed border-white/[0.1] text-center space-y-3.5 bg-white/[0.01]">
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto text-text-muted">
                    <HeartHandshake className="w-6 h-6 text-brand-mint/70" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">No endorsements received yet</h4>
                    <p className="text-xs text-text-muted max-w-sm mx-auto mt-1 leading-relaxed">
                      Invite managers, senior engineers, or teammates to vouch for your work and technical execution.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsReqRecModalOpen(true)}
                    className="btn-primary text-xs uppercase tracking-wider inline-flex items-center gap-1.5 py-2.5 px-5 cursor-pointer min-h-[44px]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Request Endorsement
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* SECTION 8: PUBLIC PROFILE SETUP */}
          {activeSection === "public-profile" && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-white/[0.08] bg-bg-card/80 backdrop-blur-xl p-6 sm:p-8 space-y-6 shadow-xl"
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono uppercase text-brand-mint tracking-widest font-bold">
                    SECTION 08 OF 08
                  </span>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-brand-yellow/10 border border-brand-yellow/20 text-brand-yellow">
                    +50 Total XP
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-heading font-black text-white tracking-tight">
                  Public Profile Setup & Publish
                </h2>
                <p className="text-xs sm:text-sm text-text-muted leading-relaxed mt-1">
                  Ensure required infrastructure identity elements are ready before publishing your public presence at /u/:username.
                </p>
              </div>

              {/* Public URL & Handle */}
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                    Canonical Public URL
                  </h4>
                  <div className="font-mono text-xs text-brand-mint flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5" />
                    {window.location.origin}/u/{profile?.username || "your-handle"}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsChangeUsernameOpen(true)}
                  className="btn-secondary text-xs uppercase tracking-wider flex items-center gap-1.5 py-2.5 px-4 cursor-pointer min-h-[44px] shrink-0"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Change Handle
                </button>
              </div>

              {/* Publish Checklist */}
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">
                  Publish Readiness Checklist
                </h4>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2.5">
                    {profile?.avatar ? (
                      <CheckCircle2 className="w-4 h-4 text-brand-mint shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-brand-yellow shrink-0" />
                    )}
                    <span className={profile?.avatar ? "text-white" : "text-text-muted"}>
                      Profile photo uploaded
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {profile?.headline ? (
                      <CheckCircle2 className="w-4 h-4 text-brand-mint shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-brand-yellow shrink-0" />
                    )}
                    <span className={profile?.headline ? "text-white" : "text-text-muted"}>
                      Professional headline added
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {profile?.bio && profile.bio.trim().length >= 20 ? (
                      <CheckCircle2 className="w-4 h-4 text-brand-mint shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-brand-yellow shrink-0" />
                    )}
                    <span className={profile?.bio && profile.bio.trim().length >= 20 ? "text-white" : "text-text-muted"}>
                      About story added (20+ characters)
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {flatSkills.length >= 3 ? (
                      <CheckCircle2 className="w-4 h-4 text-brand-mint shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-brand-yellow shrink-0" />
                    )}
                    <span className={flatSkills.length >= 3 ? "text-white" : "text-text-muted"}>
                      At least 3 skills added ({flatSkills.length}/3)
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {profile?.username ? (
                      <CheckCircle2 className="w-4 h-4 text-brand-mint shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-brand-yellow shrink-0" />
                    )}
                    <span className={profile?.username ? "text-white" : "text-text-muted"}>
                      Handle claimed (@{profile?.username})
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
                      ? `Your public profile is live at /u/${profile?.username}. Anyone with the link can view your infrastructure identity.`
                      : "Publishing awards +20 XP and makes your profile discoverable to peers, mentors, and employers."}
                  </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => publishMutation.mutate(!profile?.publicProfilePublished)}
                    disabled={publishMutation.isPending}
                    className={`text-xs uppercase tracking-wider py-3 px-6 rounded-xl font-bold transition-all cursor-pointer shadow-md min-h-[44px] ${
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

        {/* Live Preview Aside (Desktop / Toggleable) */}
        {isPreviewOpen && (
          <div className="lg:col-span-4 sticky top-24 rounded-3xl border border-white/[0.08] bg-bg-card/90 backdrop-blur-xl p-5 space-y-4 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-mint flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" /> Live Preview
              </span>
              <span className="text-[10px] text-text-muted font-mono truncate max-w-[150px]">
                /u/{profile?.username}
              </span>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-bg-base overflow-hidden shadow-inner">
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
                  <h4 className="text-sm font-bold text-white">{name || "Your Name"}</h4>
                  <div className="text-[11px] font-mono text-brand-mint">@{profile?.username}</div>
                  <div className="mt-1">
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-brand-mint/15 text-brand-mint border border-brand-mint/25">
                      {primaryRole}
                    </span>
                  </div>
                  {headline && <p className="text-xs text-white/85 mt-1 line-clamp-2 leading-relaxed">{headline}</p>}
                </div>
                {primaryDiscipline && (
                  <p className="text-xs text-brand-yellow font-medium mt-1">
                    {primaryDiscipline}
                  </p>
                )}
                {flatSkills.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {flatSkills.slice(0, 4).map((s) => (
                      <span key={s} className="px-2 py-0.5 rounded bg-white/[0.04] text-[10px] text-text-secondary">
                        {s}
                      </span>
                    ))}
                    {flatSkills.length > 4 && (
                      <span className="px-1.5 py-0.5 rounded bg-white/[0.02] text-[10px] text-text-faint">
                        +{flatSkills.length - 4}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Unsaved Changes Modal */}
      <AnimatePresence>
        {isUnsavedModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md rounded-3xl border border-white/[0.1] bg-bg-card p-6 sm:p-7 space-y-4 shadow-2xl max-h-[90dvh] overflow-y-auto overscroll-contain"
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

      {/* Experience Modal */}
      {isExpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-3xl border border-white/[0.1] bg-bg-card p-6 sm:p-8 space-y-5 shadow-2xl max-h-[90dvh] sm:max-h-[85vh] overflow-y-auto overscroll-contain">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-heading font-extrabold text-white">
                {editingExpId ? "Edit Experience" : "Add Experience"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsExpModalOpen(false);
                  resetExpForm();
                }}
                className="p-2.5 -mr-1.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-text-muted hover:text-white cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                  Organization / Company <span className="text-brand-mint">*</span>
                </label>
                <input
                  type="text"
                  value={expForm.organization}
                  onChange={(e) => {
                    const val = e.target.value;
                    setExpForm((prev) => ({ ...prev, organization: val }));
                    if (val.trim()) {
                      setExpErrors((prev) => {
                        const next = { ...prev };
                        delete next.organization;
                        return next;
                      });
                    }
                  }}
                  required
                  placeholder="e.g. Larsen & Toubro, AECOM, Bechtel"
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-bg-elevated border text-sm text-white focus:outline-none ${
                    expErrors.organization
                      ? "border-danger focus:border-danger"
                      : "border-white/[0.08] focus:border-brand-mint"
                  }`}
                />
                {expErrors.organization && (
                  <p className="text-xs text-danger mt-1">{expErrors.organization}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                    Role / Position <span className="text-brand-mint">*</span>
                  </label>
                  <input
                    type="text"
                    value={expForm.role}
                    onChange={(e) => {
                      const val = e.target.value;
                      setExpForm((prev) => ({ ...prev, role: val }));
                      if (val.trim()) {
                        setExpErrors((prev) => {
                          const next = { ...prev };
                          delete next.role;
                          return next;
                        });
                      }
                    }}
                    required
                    placeholder="e.g. Site Engineer, BIM Lead"
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-bg-elevated border text-sm text-white focus:outline-none ${
                      expErrors.role
                        ? "border-danger focus:border-danger"
                        : "border-white/[0.08] focus:border-brand-mint"
                    }`}
                  />
                  {expErrors.role && (
                    <p className="text-xs text-danger mt-1">{expErrors.role}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                    Type
                  </label>
                  <select
                    value={expForm.employmentType}
                    onChange={(e) => setExpForm({ ...expForm, employmentType: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-bg-elevated border border-white/[0.08] text-sm text-white focus:border-brand-mint focus:outline-none"
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Internship">Internship</option>
                    <option value="Freelance">Freelance</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                    Infrastructure Sector
                  </label>
                  <select
                    value={expForm.infrastructureSector}
                    onChange={(e) => setExpForm({ ...expForm, infrastructureSector: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-bg-elevated border border-white/[0.08] text-sm text-white focus:border-brand-mint focus:outline-none"
                  >
                    {INFRASTRUCTURE_SECTORS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={expForm.location}
                    onChange={(e) => setExpForm({ ...expForm, location: e.target.value })}
                    placeholder="e.g. Riyadh, KSA"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-bg-elevated border border-white/[0.08] text-sm text-white focus:border-brand-mint focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                    Start Date <span className="text-brand-mint">*</span>
                  </label>
                  <input
                    type="date"
                    value={expForm.startDate}
                    onChange={(e) => {
                      const val = e.target.value;
                      setExpForm((prev) => ({ ...prev, startDate: val }));
                      const valRes = validateExperienceDates(val, expForm.endDate, expForm.currentlyActive);
                      setExpErrors((prev) => {
                        const next = { ...prev };
                        if (valRes.errors.startDate) {
                          next.startDate = valRes.errors.startDate;
                        } else {
                          delete next.startDate;
                        }
                        if (valRes.errors.endDate && !expForm.currentlyActive) {
                          next.endDate = valRes.errors.endDate;
                        } else if (!valRes.errors.endDate) {
                          delete next.endDate;
                        }
                        return next;
                      });
                    }}
                    required
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-bg-elevated border text-sm text-white focus:outline-none ${
                      expErrors.startDate
                        ? "border-danger focus:border-danger"
                        : "border-white/[0.08] focus:border-brand-mint"
                    }`}
                  />
                  {expErrors.startDate && (
                    <p className="text-xs text-danger mt-1">{expErrors.startDate}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={expForm.endDate}
                    onChange={(e) => {
                      const val = e.target.value;
                      setExpForm((prev) => ({ ...prev, endDate: val }));
                      if (!expForm.currentlyActive) {
                        const valRes = validateExperienceDates(expForm.startDate, val, false);
                        setExpErrors((prev) => {
                          const next = { ...prev };
                          if (valRes.errors.endDate) {
                            next.endDate = valRes.errors.endDate;
                          } else {
                            delete next.endDate;
                          }
                          return next;
                        });
                      }
                    }}
                    disabled={expForm.currentlyActive}
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-bg-elevated border text-sm text-white focus:outline-none disabled:opacity-40 ${
                      expErrors.endDate && !expForm.currentlyActive
                        ? "border-danger focus:border-danger"
                        : "border-white/[0.08] focus:border-brand-mint"
                    }`}
                  />
                  {expErrors.endDate && !expForm.currentlyActive && (
                    <p className="text-xs text-danger mt-1">{expErrors.endDate}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="currentlyActiveExp"
                  checked={expForm.currentlyActive}
                  onChange={(e) => {
                    const isChecked = e.target.checked;
                    setExpForm((prev) => ({
                      ...prev,
                      currentlyActive: isChecked,
                      endDate: isChecked ? "" : prev.endDate,
                    }));
                    setExpErrors((prev) => {
                      const next = { ...prev };
                      if (isChecked) {
                        delete next.endDate;
                      } else if (!expForm.endDate) {
                        next.endDate = "End date is required for past roles.";
                      }
                      return next;
                    });
                  }}
                  className="rounded border-white/[0.08] text-brand-mint focus:ring-0 cursor-pointer"
                />
                <label htmlFor="currentlyActiveExp" className="text-xs text-text-secondary cursor-pointer">
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
                  placeholder="Key responsibilities, project scale, engineering challenges..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-bg-elevated border border-white/[0.08] text-sm text-white focus:border-brand-mint focus:outline-none resize-none"
                />
              </div>

              {/* Software Used */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary">
                  Software Used
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={expSoftwareInput}
                    onChange={(e) => setExpSoftwareInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const val = expSoftwareInput.trim();
                        if (val && !expForm.softwareUsed.includes(val)) {
                          setExpForm({ ...expForm, softwareUsed: [...expForm.softwareUsed, val] });
                          setExpSoftwareInput("");
                        }
                      }
                    }}
                    placeholder="e.g. AutoCAD, Primavera P6..."
                    className="flex-1 px-3 py-2 rounded-xl bg-bg-elevated border border-white/[0.08] text-xs text-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const val = expSoftwareInput.trim();
                      if (val && !expForm.softwareUsed.includes(val)) {
                        setExpForm({ ...expForm, softwareUsed: [...expForm.softwareUsed, val] });
                        setExpSoftwareInput("");
                      }
                    }}
                    className="btn-secondary text-xs px-3 py-2 cursor-pointer min-h-[38px]"
                  >
                    Add
                  </button>
                </div>
                {expForm.softwareUsed?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {expForm.softwareUsed.map((sw) => (
                      <span key={sw} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-brand-mint/10 border border-brand-mint/20 text-xs text-brand-mint">
                        {sw}
                        <button
                          type="button"
                          onClick={() => setExpForm({ ...expForm, softwareUsed: expForm.softwareUsed.filter((s) => s !== sw) })}
                          className="hover:text-danger ml-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Skills Used */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary">
                  Skills Used
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={expSkillInput}
                    onChange={(e) => setExpSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const val = expSkillInput.trim();
                        if (val && !expForm.skillsUsed.includes(val)) {
                          setExpForm({ ...expForm, skillsUsed: [...expForm.skillsUsed, val] });
                          setExpSkillInput("");
                        }
                      }
                    }}
                    placeholder="e.g. Site supervision, Quantity estimation..."
                    className="flex-1 px-3 py-2 rounded-xl bg-bg-elevated border border-white/[0.08] text-xs text-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const val = expSkillInput.trim();
                      if (val && !expForm.skillsUsed.includes(val)) {
                        setExpForm({ ...expForm, skillsUsed: [...expForm.skillsUsed, val] });
                        setExpSkillInput("");
                      }
                    }}
                    className="btn-secondary text-xs px-3 py-2 cursor-pointer min-h-[38px]"
                  >
                    Add
                  </button>
                </div>
                {expForm.skillsUsed?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {expForm.skillsUsed.map((sk) => (
                      <span key={sk} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-xs text-white">
                        {sk}
                        <button
                          type="button"
                          onClick={() => setExpForm({ ...expForm, skillsUsed: expForm.skillsUsed.filter((s) => s !== sk) })}
                          className="hover:text-danger ml-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsExpModalOpen(false);
                    resetExpForm();
                  }}
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



      {/* Education Modal */}
      {isEduModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-xl rounded-3xl border border-white/[0.1] bg-bg-card p-6 sm:p-8 space-y-6 shadow-2xl max-h-[92dvh] sm:max-h-[88vh] overflow-y-auto overscroll-contain">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-mint/10 border border-brand-mint/25 flex items-center justify-center text-brand-mint shadow-inner">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-heading font-extrabold text-white">
                    {editingEduId ? "Edit Academic Qualification" : "Add Academic Qualification"}
                  </h3>
                  <p className="text-xs text-text-muted">
                    Record your degree, engineering diploma, institution, and achievements.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEduModalOpen(false);
                  resetEduForm();
                }}
                className="p-2.5 -mr-1.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-text-muted hover:text-white cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdu} className="space-y-5">
              {/* Qualification / Degree */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                  Degree / Qualification <span className="text-brand-mint">*</span>
                </label>
                <input
                  type="text"
                  value={eduForm.qualification}
                  onChange={(e) => {
                    setEduForm({ ...eduForm, qualification: e.target.value });
                    if (eduErrors.qualification) {
                      setEduErrors((prev) => {
                        const copy = { ...prev };
                        delete copy.qualification;
                        return copy;
                      });
                    }
                  }}
                  placeholder="e.g. B.Tech Civil Engineering, B.Arch, M.Tech Structural..."
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-bg-elevated border text-sm text-white focus:outline-none transition-colors ${
                    eduErrors.qualification ? "border-danger focus:border-danger" : "border-white/[0.08] focus:border-brand-mint"
                  }`}
                />
                {eduErrors.qualification && (
                  <p className="text-xs text-danger mt-1 font-medium" role="alert">
                    {eduErrors.qualification}
                  </p>
                )}

                {/* Quick AEC Qualification Suggestions */}
                <div className="pt-2">
                  <span className="text-[11px] text-text-faint block mb-1.5 font-medium">Quick AEC Suggestions:</span>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto no-scrollbar">
                    {AEC_QUALIFICATION_SUGGESTIONS.slice(0, 6).map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => {
                          setEduForm((prev) => ({ ...prev, qualification: sug }));
                          if (eduErrors.qualification) {
                            setEduErrors((prev) => {
                              const copy = { ...prev };
                              delete copy.qualification;
                              return copy;
                            });
                          }
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white/[0.03] hover:bg-brand-mint/10 border border-white/[0.06] hover:border-brand-mint/30 text-[11px] text-text-secondary hover:text-brand-mint transition-colors cursor-pointer text-left"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Institution & Field of Study */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                    Institution / University <span className="text-brand-mint">*</span>
                  </label>
                  <input
                    type="text"
                    value={eduForm.institution}
                    onChange={(e) => {
                      setEduForm({ ...eduForm, institution: e.target.value });
                      if (eduErrors.institution) {
                        setEduErrors((prev) => {
                          const copy = { ...prev };
                          delete copy.institution;
                          return copy;
                        });
                      }
                    }}
                    placeholder="e.g. IIT Madras, NIT Trichy, Univ. of Leeds"
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-bg-elevated border text-sm text-white focus:outline-none transition-colors ${
                      eduErrors.institution ? "border-danger focus:border-danger" : "border-white/[0.08] focus:border-brand-mint"
                    }`}
                  />
                  {eduErrors.institution && (
                    <p className="text-xs text-danger mt-1 font-medium" role="alert">
                      {eduErrors.institution}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                    Field of Study / Specialization
                  </label>
                  <input
                    type="text"
                    value={eduForm.fieldOfStudy}
                    onChange={(e) => {
                      setEduForm({ ...eduForm, fieldOfStudy: e.target.value });
                      if (eduErrors.fieldOfStudy) {
                        setEduErrors((prev) => {
                          const copy = { ...prev };
                          delete copy.fieldOfStudy;
                          return copy;
                        });
                      }
                    }}
                    placeholder="e.g. Structural Design, BIM, Transport Planning"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-bg-elevated border border-white/[0.08] text-sm text-white focus:border-brand-mint focus:outline-none"
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                    Start Date <span className="text-brand-mint">*</span>
                  </label>
                  <input
                    type="date"
                    value={eduForm.startDate}
                    onChange={(e) => {
                      setEduForm({ ...eduForm, startDate: e.target.value });
                      if (eduErrors.startDate) {
                        setEduErrors((prev) => {
                          const copy = { ...prev };
                          delete copy.startDate;
                          return copy;
                        });
                      }
                    }}
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-bg-elevated border text-sm text-white focus:outline-none transition-colors ${
                      eduErrors.startDate ? "border-danger focus:border-danger" : "border-white/[0.08] focus:border-brand-mint"
                    }`}
                  />
                  {eduErrors.startDate && (
                    <p className="text-xs text-danger mt-1 font-medium" role="alert">
                      {eduErrors.startDate}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                    Graduation / End Date
                  </label>
                  <input
                    type="date"
                    value={eduForm.endDate}
                    onChange={(e) => {
                      setEduForm({ ...eduForm, endDate: e.target.value });
                      if (eduErrors.endDate) {
                        setEduErrors((prev) => {
                          const copy = { ...prev };
                          delete copy.endDate;
                          return copy;
                        });
                      }
                    }}
                    disabled={eduForm.currentlyStudying}
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-bg-elevated border text-sm text-white focus:outline-none transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                      eduErrors.endDate ? "border-danger focus:border-danger" : "border-white/[0.08] focus:border-brand-mint"
                    }`}
                  />
                  {eduErrors.endDate && !eduForm.currentlyStudying && (
                    <p className="text-xs text-danger mt-1 font-medium" role="alert">
                      {eduErrors.endDate}
                    </p>
                  )}
                </div>
              </div>

              {/* Currently studying here toggle */}
              <div className="flex items-center gap-2.5 pt-0.5">
                <input
                  type="checkbox"
                  id="currentlyStudyingEdu"
                  checked={eduForm.currentlyStudying}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setEduForm((prev) => ({
                      ...prev,
                      currentlyStudying: checked,
                      endDate: checked ? "" : prev.endDate,
                    }));
                    if (checked) {
                      setEduErrors((prev) => {
                        const copy = { ...prev };
                        delete copy.endDate;
                        return copy;
                      });
                    }
                  }}
                  className="rounded border-white/[0.1] bg-bg-elevated text-brand-mint focus:ring-0 cursor-pointer w-4 h-4"
                />
                <label htmlFor="currentlyStudyingEdu" className="text-xs font-medium text-white/90 cursor-pointer select-none">
                  I currently study here (Ongoing program / Degree in progress)
                </label>
              </div>

              {/* Description / Achievements / Grade */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                  Academic Achievements & Description <span className="text-text-faint font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={3}
                  value={eduForm.description}
                  onChange={(e) => setEduForm({ ...eduForm, description: e.target.value })}
                  placeholder="e.g. CGPA: 8.9/10, First Class with Distinction. Capstone Thesis: Seismic Isolation in Metro Rail Viaducts. President of Civil Engineering Student Association."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-bg-elevated border border-white/[0.08] text-sm text-white focus:border-brand-mint focus:outline-none resize-none leading-relaxed"
                />
                <span className="text-[11px] text-text-faint block mt-1">
                  Include CGPA/grade, honors, thesis title, capstone projects, or academic student leadership.
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-3 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => {
                    setIsEduModalOpen(false);
                    resetEduForm();
                  }}
                  className="btn-secondary text-xs py-3 px-5 min-h-[44px] w-full sm:w-auto cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdu}
                  className="btn-primary text-xs py-3 px-6 min-h-[44px] w-full sm:w-auto cursor-pointer inline-flex items-center justify-center gap-2"
                >
                  {isSavingEdu ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>{editingEduId ? "Save Changes" : "Save Academic Qualification"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Certification Modal */}
      {isCertModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-xl rounded-3xl border border-white/[0.1] bg-bg-card p-6 sm:p-8 space-y-6 shadow-2xl max-h-[92dvh] sm:max-h-[88vh] overflow-y-auto overscroll-contain">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-mint/10 border border-brand-mint/25 flex items-center justify-center text-brand-mint shadow-inner shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-heading font-extrabold text-white">
                    {editingCertId ? "Edit Credential" : "Add Credential"}
                  </h3>
                  <p className="text-xs text-text-muted">
                    Record professional certifications, engineering council registrations, or software licenses.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCertModalOpen(false);
                  resetCertForm();
                }}
                className="p-2.5 -mr-1.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-text-muted hover:text-white cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCert} className="space-y-5">
              {/* Certificate Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                  Certificate / Credential Name <span className="text-brand-mint">*</span>
                </label>
                <input
                  type="text"
                  value={certForm.name}
                  onChange={(e) => {
                    setCertForm({ ...certForm, name: e.target.value });
                    if (certErrors.name) {
                      setCertErrors((prev) => {
                        const copy = { ...prev };
                        delete copy.name;
                        return copy;
                      });
                    }
                  }}
                  placeholder="e.g. Autodesk Certified Professional: Revit for Structural Design"
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-bg-elevated border text-sm text-white focus:outline-none transition-colors ${
                    certErrors.name ? "border-danger focus:border-danger" : "border-white/[0.08] focus:border-brand-mint"
                  }`}
                />
                {certErrors.name && (
                  <p className="text-xs text-danger mt-1 font-medium" role="alert">
                    {certErrors.name}
                  </p>
                )}

                {/* Quick AEC Certificate Suggestions */}
                <div className="pt-2">
                  <span className="text-[11px] text-text-faint block mb-1.5 font-medium">Quick AEC Suggestions:</span>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto no-scrollbar">
                    {AEC_CERTIFICATION_SUGGESTIONS.slice(0, 6).map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => {
                          setCertForm((prev) => ({ ...prev, name: sug }));
                          if (certErrors.name) {
                            setCertErrors((prev) => {
                              const copy = { ...prev };
                              delete copy.name;
                              return copy;
                            });
                          }
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white/[0.03] hover:bg-brand-mint/10 border border-white/[0.06] hover:border-brand-mint/30 text-[11px] text-text-secondary hover:text-brand-mint transition-colors cursor-pointer text-left"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Issuing Organization */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                  Issuing Organization <span className="text-brand-mint">*</span>
                </label>
                <input
                  type="text"
                  value={certForm.issuer}
                  onChange={(e) => {
                    setCertForm({ ...certForm, issuer: e.target.value });
                    if (certErrors.issuer) {
                      setCertErrors((prev) => {
                        const copy = { ...prev };
                        delete copy.issuer;
                        return copy;
                      });
                    }
                  }}
                  placeholder="e.g. Autodesk, PMI, ICE, Engineering Council"
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-bg-elevated border text-sm text-white focus:outline-none transition-colors ${
                    certErrors.issuer ? "border-danger focus:border-danger" : "border-white/[0.08] focus:border-brand-mint"
                  }`}
                />
                {certErrors.issuer && (
                  <p className="text-xs text-danger mt-1 font-medium" role="alert">
                    {certErrors.issuer}
                  </p>
                )}

                {/* Quick AEC Issuer Suggestions */}
                <div className="pt-2">
                  <span className="text-[11px] text-text-faint block mb-1.5 font-medium">Common Issuing Bodies:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {AEC_ISSUER_SUGGESTIONS.slice(0, 5).map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => {
                          setCertForm((prev) => ({ ...prev, issuer: sug }));
                          if (certErrors.issuer) {
                            setCertErrors((prev) => {
                              const copy = { ...prev };
                              delete copy.issuer;
                              return copy;
                            });
                          }
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white/[0.03] hover:bg-brand-mint/10 border border-white/[0.06] hover:border-brand-mint/30 text-[11px] text-text-secondary hover:text-brand-mint transition-colors cursor-pointer text-left"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                    Issue Date <span className="text-brand-mint">*</span>
                  </label>
                  <input
                    type="date"
                    value={certForm.issueDate}
                    onChange={(e) => {
                      setCertForm({ ...certForm, issueDate: e.target.value });
                      if (certErrors.issueDate) {
                        setCertErrors((prev) => {
                          const copy = { ...prev };
                          delete copy.issueDate;
                          return copy;
                        });
                      }
                    }}
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-bg-elevated border text-sm text-white focus:outline-none transition-colors ${
                      certErrors.issueDate ? "border-danger focus:border-danger" : "border-white/[0.08] focus:border-brand-mint"
                    }`}
                  />
                  {certErrors.issueDate && (
                    <p className="text-xs text-danger mt-1 font-medium" role="alert">
                      {certErrors.issueDate}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                    Expiration Date <span className="text-text-faint font-normal">(Leave blank if lifetime)</span>
                  </label>
                  <input
                    type="date"
                    value={certForm.expirationDate}
                    onChange={(e) => {
                      setCertForm({ ...certForm, expirationDate: e.target.value });
                      if (certErrors.expirationDate) {
                        setCertErrors((prev) => {
                          const copy = { ...prev };
                          delete copy.expirationDate;
                          return copy;
                        });
                      }
                    }}
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-bg-elevated border text-sm text-white focus:outline-none transition-colors ${
                      certErrors.expirationDate ? "border-danger focus:border-danger" : "border-white/[0.08] focus:border-brand-mint"
                    }`}
                  />
                  {certErrors.expirationDate && (
                    <p className="text-xs text-danger mt-1 font-medium" role="alert">
                      {certErrors.expirationDate}
                    </p>
                  )}
                </div>
              </div>

              {/* Credential ID & Credential URL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                    Credential ID <span className="text-text-faint font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={certForm.credentialId}
                    onChange={(e) => {
                      setCertForm({ ...certForm, credentialId: e.target.value });
                      if (certErrors.credentialId) {
                        setCertErrors((prev) => {
                          const copy = { ...prev };
                          delete copy.credentialId;
                          return copy;
                        });
                      }
                    }}
                    placeholder="e.g. CERT-REV-9874"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-bg-elevated border border-white/[0.08] text-sm text-white focus:border-brand-mint focus:outline-none"
                  />
                  {certErrors.credentialId && (
                    <p className="text-xs text-danger mt-1 font-medium" role="alert">
                      {certErrors.credentialId}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                    Credential URL <span className="text-text-faint font-normal">(Optional)</span>
                  </label>
                  <input
                    type="url"
                    value={certForm.credentialUrl}
                    onChange={(e) => {
                      setCertForm({ ...certForm, credentialUrl: e.target.value });
                      if (certErrors.credentialUrl) {
                        setCertErrors((prev) => {
                          const copy = { ...prev };
                          delete copy.credentialUrl;
                          return copy;
                        });
                      }
                    }}
                    placeholder="https://..."
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-bg-elevated border text-sm text-white focus:outline-none transition-colors ${
                      certErrors.credentialUrl ? "border-danger focus:border-danger" : "border-white/[0.08] focus:border-brand-mint"
                    }`}
                  />
                  {certErrors.credentialUrl && (
                    <p className="text-xs text-danger mt-1 font-medium" role="alert">
                      {certErrors.credentialUrl}
                    </p>
                  )}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs text-text-muted flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-brand-mint/70 shrink-0" />
                <span>
                  Certifications are verified by Zeitnah or verified directly via official accredited credential links.
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-3 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => {
                    setIsCertModalOpen(false);
                    resetCertForm();
                  }}
                  className="btn-secondary text-xs py-3 px-5 min-h-[44px] w-full sm:w-auto cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingCert}
                  className="btn-primary text-xs py-3 px-6 min-h-[44px] w-full sm:w-auto cursor-pointer inline-flex items-center justify-center gap-2"
                >
                  {isSavingCert ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>{editingCertId ? "Save Changes" : "Save Credential"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Endorsement Request Modal */}
      {isReqRecModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-md rounded-3xl border border-white/[0.1] bg-bg-card p-6 sm:p-8 space-y-4 shadow-2xl max-h-[90dvh] overflow-y-auto overscroll-contain">
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
              Share your public profile link with project directors, consultants, or senior engineers to receive verified endorsements.
            </p>

            <div className="p-3 rounded-xl bg-bg-elevated border border-white/[0.08] flex items-center justify-between gap-2">
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

      {/* Change Username Modal */}
      <ChangeUsernameModal
        isOpen={isChangeUsernameOpen}
        onClose={() => setIsChangeUsernameOpen(false)}
        currentUsername={profile?.username}
      />

      {/* Image Editor Modal for Avatar & Banner */}
      <ImageEditorModal
        isOpen={Boolean(editingImage)}
        onClose={() => setEditingImage(null)}
        imageFile={editingImage?.file}
        type={editingImage?.type || "avatar"}
        onSave={(processedFile) => {
          if (editingImage?.type === "avatar") {
            avatarMutation.mutate(processedFile, {
              onSuccess: () => setEditingImage(null),
            });
          } else {
            bannerMutation.mutate(processedFile, {
              onSuccess: () => setEditingImage(null),
            });
          }
        }}
        currentAvatarUrl={avatarUrl}
        userName={name || profile?.name || "Professional"}
        userRole={currentRole || headline || profile?.currentRole || profile?.headline || "Infrastructure Professional"}
        isUploading={avatarMutation.isPending || bannerMutation.isPending}
      />
    </div>
  );
}