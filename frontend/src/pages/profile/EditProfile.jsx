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
  Code2,
  Globe,
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
  Hammer,
  Sparkles,
  Layers,
  ChevronDown,
} from "lucide-react";
import { AuthContext } from "../../context/AuthContext";
import { coreProfileService } from "../../services/coreProfileService";
import { projectsService } from "../../services/projectsService";
import { useToast } from "../../components/ui/Toast";
import ChangeUsernameModal from "../../components/username/ChangeUsernameModal";
import ProfileNav from "../../components/profile/ProfileNav";
import { getUploadUrl } from "../../utils/courseUi";
import ImageEditorModal from "../../components/common/ImageEditorModal";
import RoleSelector from "../../components/profile/RoleSelector";
import InfrastructureExpertiseSection from "../../components/profile/InfrastructureExpertiseSection";
import StructuredSkillsEditor from "../../components/profile/StructuredSkillsEditor";
import CareerPreferencesSection from "../../components/profile/CareerPreferencesSection";
import ProjectEditorModal from "../../components/profile/ProjectEditorModal";
import {
  INFRASTRUCTURE_SECTORS,
  INFRASTRUCTURE_SOFTWARE,
} from "../../constants/infrastructureTaxonomy";
import { normalizeUserRole } from "../../utils/roleNavigation";

const MAX_BIO_LENGTH = 1000;

const SECTION_CONFIG = [
  { id: "basic-info", index: "01", label: "Basic Information", icon: User, xp: 45, desc: "Avatar, banner, name, location & biography" },
  { id: "professional-identity", index: "02", label: "Professional Identity", icon: Briefcase, xp: 25, desc: "Role, availability & career headline" },
  { id: "infrastructure-expertise", index: "03", label: "Infrastructure Expertise", icon: Building, xp: 30, desc: "Primary discipline, sectors & software" },
  { id: "skills", index: "04", label: "Skills & Software", icon: Code2, xp: 20, desc: "Structured engineering & technical matrix" },
  { id: "experience", index: "05", label: "Experience", icon: Briefcase, xp: 20, desc: "Career timeline & project contributions" },
  { id: "projects", index: "06", label: "Projects", icon: Hammer, xp: 25, desc: "Engineering deliverables & case studies" },
  { id: "education", index: "07", label: "Education", icon: GraduationCap, xp: 20, desc: "Academic qualifications & degrees" },
  { id: "certifications", index: "08", label: "Certifications", icon: Award, xp: 15, desc: "Accredited licenses & credential links" },
  { id: "career-preferences", index: "09", label: "Career & Privacy", icon: ShieldCheck, xp: 20, desc: "Target roles, salary & privacy toggles" },
  { id: "recommendations", index: "10", label: "Recommendations", icon: HeartHandshake, xp: 0, desc: "Verified peer & mentor endorsements" },
  { id: "public-profile", index: "11", label: "Public Profile Setup", icon: Globe, xp: 50, desc: "Public handle, link & publishing state" },
];

export default function EditProfile() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user: authUser, updateUser, setUser } = useContext(AuthContext);
  const toast = useToast();

  const avatarFileRef = useRef(null);
  const bannerFileRef = useRef(null);

  // Normalize section parameter with legacy aliases
  const rawSectionParam = searchParams.get("section") || "basic-info";
  const normalizedSection =
    rawSectionParam === "introduction" || rawSectionParam === "about"
      ? "basic-info"
      : rawSectionParam;

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
  const [availability, setAvailability] = useState("NOT_CURRENTLY_AVAILABLE");
  const [discoverableToRecruiters, setDiscoverableToRecruiters] = useState(false);
  const [profileVisibility, setProfileVisibility] = useState("PUBLIC");

  const [primaryDiscipline, setPrimaryDiscipline] = useState("");
  const [specializations, setSpecializations] = useState([]);
  const [infrastructureSectors, setInfrastructureSectors] = useState([]);
  const [preferredLocations, setPreferredLocations] = useState([]);
  const [yearsOfExperience, setYearsOfExperience] = useState(0);

  // Skills
  const [structuredSkills, setStructuredSkills] = useState({
    softwareTools: [],
    technicalCalculations: [],
    industryStandards: [],
    professionalLeadership: [],
  });
  const [flatSkills, setFlatSkills] = useState([]);

  // Career Preferences
  const [careerPreferences, setCareerPreferences] = useState({
    targetRoles: [],
    preferredLocations: [],
    workModes: [],
    openToRelocation: false,
    expectedSalary: { min: "", max: "", currency: "INR" },
    expectedContractRate: { min: "", max: "", currency: "USD", rateType: "HOURLY" },
    noticePeriod: "IMMEDIATE",
    activelyLooking: false,
    visaSponsorshipRequired: false,
  });

  // Privacy Settings
  const [privacySettings, setPrivacySettings] = useState({
    hideSalaryPreferences: false,
    hideContactInfoFromPublic: false,
    showEmailToConnectionsOnly: true,
    showPhoneToConnectionsOnly: true,
    allowRecommendationRequests: true,
    showExactLocationToPublic: false,
  });

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

  // Projects Modal & State
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  // Education Modal & Form
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

  // Certifications Modal & Form
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

  // Recommendation Request Modal
  const [isReqRecModalOpen, setIsReqRecModalOpen] = useState(false);

  // Image Editor Modal state for avatar / banner
  const [editingImage, setEditingImage] = useState(null);

  // Synchronize section changes from URL
  useEffect(() => {
    if (normalizedSection !== activeSection) {
      setActiveSection(normalizedSection);
    }
  }, [normalizedSection]);

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
    setIsDirty(false);
    setIsUnsavedModalOpen(false);
    if (pendingSectionSwitch) {
      setActiveSection(pendingSectionSwitch);
      setSearchParams({ section: pendingSectionSwitch });
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
    queryKey: ["profile", "me"],
    queryFn: () => coreProfileService.getMyProfile(),
    staleTime: 1000 * 60 * 5,
  });

  const { data: completionData } = useQuery({
    queryKey: ["myProfileCompletion"],
    queryFn: () => coreProfileService.getProfileCompletion(),
    staleTime: 1000 * 60 * 2,
  });

  const { data: projectsData } = useQuery({
    queryKey: ["projects", "my"],
    queryFn: () => projectsService.getMyProjects(),
    staleTime: 1000 * 60 * 5,
  });

  const { data: recommendationsData } = useQuery({
    queryKey: ["profile", "recommendations"],
    queryFn: () => coreProfileService.getMyRecommendations(),
    staleTime: 1000 * 60 * 5,
  });

  const profile = profileData?.user || profileData?.profile || profileData;
  const completion = profileData?.completion || completionData?.completion || profile?.completion;
  const myProjects = Array.isArray(projectsData?.projects)
    ? projectsData.projects
    : Array.isArray(projectsData)
    ? projectsData
    : [];
  const recommendations = Array.isArray(recommendationsData?.recommendations)
    ? recommendationsData.recommendations
    : Array.isArray(recommendationsData)
    ? recommendationsData
    : [];

  // Populate local form states from profile data
  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setHeadline(profile.headline || "");
      setCurrentRole(profile.currentRole || "");
      setLocation(profile.location || "");
      setIndustry(profile.industry || "");
      setBio(profile.bio || "");
      setPrimaryRole(profile.primaryRole || "STUDENT");
      setAvailability(profile.availability || "NOT_CURRENTLY_AVAILABLE");
      setDiscoverableToRecruiters(Boolean(profile.discoverableToRecruiters));
      setProfileVisibility(profile.profileVisibility || "PUBLIC");

      setPrimaryDiscipline(profile.primaryDiscipline || "");
      setSpecializations(Array.isArray(profile.specializations) ? profile.specializations : []);
      setInfrastructureSectors(Array.isArray(profile.infrastructureSectors) ? profile.infrastructureSectors : []);
      setPreferredLocations(Array.isArray(profile.preferredLocations) ? profile.preferredLocations : []);
      setYearsOfExperience(profile.yearsOfExperience || 0);

      if (profile.structuredSkills) {
        setStructuredSkills({
          softwareTools: Array.isArray(profile.structuredSkills.softwareTools) ? profile.structuredSkills.softwareTools : [],
          technicalCalculations: Array.isArray(profile.structuredSkills.technicalCalculations) ? profile.structuredSkills.technicalCalculations : [],
          industryStandards: Array.isArray(profile.structuredSkills.industryStandards) ? profile.structuredSkills.industryStandards : [],
          professionalLeadership: Array.isArray(profile.structuredSkills.professionalLeadership) ? profile.structuredSkills.professionalLeadership : [],
        });
      }
      setFlatSkills(Array.isArray(profile.skills) ? profile.skills : []);

      if (profile.careerPreferences) {
        setCareerPreferences({
          targetRoles: Array.isArray(profile.careerPreferences.targetRoles) ? profile.careerPreferences.targetRoles : [],
          preferredLocations: Array.isArray(profile.careerPreferences.preferredLocations) ? profile.careerPreferences.preferredLocations : [],
          workModes: Array.isArray(profile.careerPreferences.workModes) ? profile.careerPreferences.workModes : [],
          openToRelocation: Boolean(profile.careerPreferences.openToRelocation),
          expectedSalary: profile.careerPreferences.expectedSalary || { min: "", max: "", currency: "INR" },
          expectedContractRate: profile.careerPreferences.expectedContractRate || { min: "", max: "", currency: "USD", rateType: "HOURLY" },
          noticePeriod: profile.careerPreferences.noticePeriod || "IMMEDIATE",
          activelyLooking: Boolean(profile.careerPreferences.activelyLooking),
          visaSponsorshipRequired: Boolean(profile.careerPreferences.visaSponsorshipRequired),
        });
      }

      if (profile.privacySettings) {
        setPrivacySettings({
          hideSalaryPreferences: Boolean(profile.privacySettings.hideSalaryPreferences),
          hideContactInfoFromPublic: Boolean(profile.privacySettings.hideContactInfoFromPublic),
          showEmailToConnectionsOnly: Boolean(profile.privacySettings.showEmailToConnectionsOnly),
          showPhoneToConnectionsOnly: Boolean(profile.privacySettings.showPhoneToConnectionsOnly),
          allowRecommendationRequests: Boolean(profile.privacySettings.allowRecommendationRequests),
          showExactLocationToPublic: Boolean(profile.privacySettings.showExactLocationToPublic),
        });
      }

      setIsDirty(false);
    }
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

  // Comprehensive profile mutation
  const updateMutation = useMutation({
    mutationFn: (payload) => coreProfileService.updateMyProfile(payload),
    onSuccess: (res) => {
      queryClient.setQueryData(["myProfile"], (old) => {
        if (!old) return old;
        const currentProfile = old.profile || old;
        const updatedProfile = { ...currentProfile, ...(res.profile || res) };
        return old.profile ? { ...old, profile: updatedProfile } : updatedProfile;
      });
      queryClient.invalidateQueries({ queryKey: ["myProfile"] });
      queryClient.invalidateQueries({ queryKey: ["myProfileCompletion"] });

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
      queryClient.invalidateQueries({ queryKey: ["myProfile"] });
      queryClient.invalidateQueries({ queryKey: ["myProfileCompletion"] });
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
      queryClient.invalidateQueries({ queryKey: ["myProfile"] });
      queryClient.invalidateQueries({ queryKey: ["myProfileCompletion"] });
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
      queryClient.invalidateQueries({ queryKey: ["myProfile"] });
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
      queryClient.invalidateQueries({ queryKey: ["myProfile"] });
      queryClient.invalidateQueries({ queryKey: ["myProfileCompletion"] });
      setIsExpModalOpen(false);
      resetExpForm();
      toast.success("Experience added", "Your professional role has been added.");
      notifyMilestones(res.newlyAwarded);
    },
    onError: (err) => toast.error("Error", err.response?.data?.message || "Failed to add experience."),
  });

  const updateExpMutation = useMutation({
    mutationFn: ({ id, payload }) => coreProfileService.updateExperience(id, payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["myProfile"] });
      queryClient.invalidateQueries({ queryKey: ["myProfileCompletion"] });
      setIsExpModalOpen(false);
      resetExpForm();
      toast.success("Experience updated", "Your professional role was saved.");
      notifyMilestones(res.newlyAwarded);
    },
    onError: (err) => toast.error("Error", err.response?.data?.message || "Failed to update experience."),
  });

  const deleteExpMutation = useMutation({
    mutationFn: (id) => coreProfileService.deleteExperience(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myProfile"] });
      queryClient.invalidateQueries({ queryKey: ["myProfileCompletion"] });
      toast.success("Deleted", "Experience record removed.");
    },
    onError: (err) => toast.error("Error", err.response?.data?.message || "Failed to delete experience."),
  });

  // Projects Mutations
  const saveProjectMutation = useMutation({
    mutationFn: (payload) => {
      if (editingProject?.id || editingProject?._id) {
        return projectsService.updateProject(editingProject.id || editingProject._id, payload);
      }
      return projectsService.createProject(payload);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["myProjects"] });
      queryClient.invalidateQueries({ queryKey: ["myProfileCompletion"] });
      setIsProjectModalOpen(false);
      setEditingProject(null);
      toast.success("Project saved", "Infrastructure project details stored.");
      notifyMilestones(res.newlyAwarded);
    },
    onError: (err) => toast.error("Error", err.response?.data?.message || "Failed to save project."),
  });

  const deleteProjectMutation = useMutation({
    mutationFn: (id) => projectsService.deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myProjects"] });
      queryClient.invalidateQueries({ queryKey: ["myProfileCompletion"] });
      toast.success("Deleted", "Project record removed.");
    },
    onError: (err) => toast.error("Error", err.response?.data?.message || "Failed to delete project."),
  });

  // Education Mutations
  const addEduMutation = useMutation({
    mutationFn: (payload) => coreProfileService.addEducation(payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["myProfile"] });
      queryClient.invalidateQueries({ queryKey: ["myProfileCompletion"] });
      setIsEduModalOpen(false);
      resetEduForm();
      toast.success("Education added", "Academic qualification added.");
      notifyMilestones(res.newlyAwarded);
    },
    onError: (err) => toast.error("Error", err.response?.data?.message || "Failed to add education."),
  });

  const updateEduMutation = useMutation({
    mutationFn: ({ id, payload }) => coreProfileService.updateEducation(id, payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["myProfile"] });
      queryClient.invalidateQueries({ queryKey: ["myProfileCompletion"] });
      setIsEduModalOpen(false);
      resetEduForm();
      toast.success("Education updated", "Academic qualification updated.");
      notifyMilestones(res.newlyAwarded);
    },
    onError: (err) => toast.error("Error", err.response?.data?.message || "Failed to update education."),
  });

  const deleteEduMutation = useMutation({
    mutationFn: (id) => coreProfileService.deleteEducation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myProfile"] });
      queryClient.invalidateQueries({ queryKey: ["myProfileCompletion"] });
      toast.success("Deleted", "Education record removed.");
    },
    onError: (err) => toast.error("Error", err.response?.data?.message || "Failed to delete education."),
  });

  // Certification Mutations
  const addCertMutation = useMutation({
    mutationFn: (payload) => coreProfileService.addCertification(payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["myProfile"] });
      queryClient.invalidateQueries({ queryKey: ["myProfileCompletion"] });
      setIsCertModalOpen(false);
      resetCertForm();
      toast.success("Certification added", "Credential record stored.");
      notifyMilestones(res.newlyAwarded);
    },
    onError: (err) => toast.error("Error", err.response?.data?.message || "Failed to add certification."),
  });

  const updateCertMutation = useMutation({
    mutationFn: ({ id, payload }) => coreProfileService.updateCertification(id, payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["myProfile"] });
      queryClient.invalidateQueries({ queryKey: ["myProfileCompletion"] });
      setIsCertModalOpen(false);
      resetCertForm();
      toast.success("Certification updated", "Credential record updated.");
      notifyMilestones(res.newlyAwarded);
    },
    onError: (err) => toast.error("Error", err.response?.data?.message || "Failed to update certification."),
  });

  const deleteCertMutation = useMutation({
    mutationFn: (id) => coreProfileService.deleteCertification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myProfile"] });
      queryClient.invalidateQueries({ queryKey: ["myProfileCompletion"] });
      toast.success("Deleted", "Certification record removed.");
    },
    onError: (err) => toast.error("Error", err.response?.data?.message || "Failed to delete certification."),
  });

  // Recommendation Status Mutation
  const updateRecStatusMutation = useMutation({
    mutationFn: ({ id, status }) => coreProfileService.updateRecommendationStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myRecommendations"] });
      toast.success("Updated", "Recommendation visibility updated.");
    },
    onError: (err) => toast.error("Action failed", err.response?.data?.message),
  });

  const deleteRecMutation = useMutation({
    mutationFn: (id) => coreProfileService.deleteRecommendation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myRecommendations"] });
      toast.success("Deleted", "Recommendation removed.");
    },
    onError: (err) => toast.error("Action failed", err.response?.data?.message),
  });

  // Toggle Public Profile Publish
  const publishMutation = useMutation({
    mutationFn: (published) => coreProfileService.setPublicProfilePublishState(published),
    onSuccess: (res) => {
      queryClient.setQueryData(["myProfile"], (old) => {
        if (!old) return old;
        return {
          ...old,
          publicProfilePublished: res.published,
          completion: res.completion || old.completion,
        };
      });
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
      primaryRole,
      availability,
      yearsOfExperience: Number(yearsOfExperience) || 0,
      preferredLocations,
      discoverableToRecruiters,
      profileVisibility,
    });
  };

  const handleSaveInfrastructure = (e) => {
    e.preventDefault();
    updateMutation.mutate({
      primaryDiscipline,
      specializations,
      infrastructureSectors,
      preferredLocations,
      yearsOfExperience: Number(yearsOfExperience) || 0,
    });
  };

  const handleSaveSkills = (e) => {
    e.preventDefault();
    updateMutation.mutate({
      structuredSkills,
      skills: flatSkills,
    });
  };

  const handleSaveCareerPreferences = (e) => {
    e.preventDefault();
    updateMutation.mutate({
      careerPreferences,
      privacySettings,
      discoverableToRecruiters,
      profileVisibility,
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
      case "infrastructure-expertise":
        if (profile.primaryDiscipline && (profile.infrastructureSectors?.length > 0 || profile.specializations?.length > 0)) return "complete";
        if (profile.primaryDiscipline) return "in-progress";
        return "not-started";
      case "skills":
        if (flatSkills.length >= 3) return "complete";
        if (flatSkills.length > 0) return "in-progress";
        return "not-started";
      case "experience":
        return Array.isArray(profile.experience) && profile.experience.length > 0 ? "complete" : "not-started";
      case "projects":
        return myProjects.length > 0 ? "complete" : "not-started";
      case "education":
        return Array.isArray(profile.education) && profile.education.length > 0 ? "complete" : "not-started";
      case "certifications":
        return Array.isArray(profile.certifications) && profile.certifications.length > 0 ? "complete" : "not-started";
      case "career-preferences":
        if (profile.careerPreferences?.preferredRoles?.length > 0) return "complete";
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

  const currentSectionMeta = SECTION_CONFIG.find((s) => s.id === activeSection) || SECTION_CONFIG[0];

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto pb-16">
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
                {currentSectionMeta.index} / 11
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
              <span className="font-mono text-[10px] text-text-muted">11 Modules</span>
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
                      SECTION 01 OF 11
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
                    SECTION 02 OF 11
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
                    maxLength={140}
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
                      <option value="NOT_CURRENTLY_AVAILABLE">Not Currently Available</option>
                      <option value="OPEN_TO_OPPORTUNITIES">Open to Opportunities</option>
                      <option value="AVAILABLE_FOR_MENTORSHIP">Available for Mentorship</option>
                      <option value="AVAILABLE_FOR_COLLABORATION">Available for Collaboration</option>
                    </select>
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

          {/* SECTION 3: INFRASTRUCTURE EXPERTISE */}
          {activeSection === "infrastructure-expertise" && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-white/[0.08] bg-bg-card/80 backdrop-blur-xl p-6 sm:p-8 space-y-6 shadow-xl"
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono uppercase text-brand-mint tracking-widest font-bold">
                    SECTION 03 OF 11
                  </span>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-brand-yellow/10 border border-brand-yellow/20 text-brand-yellow">
                    +30 XP
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-heading font-black text-white tracking-tight">
                  Infrastructure Expertise & Taxonomy
                </h2>
                <p className="text-xs sm:text-sm text-text-muted leading-relaxed mt-1">
                  Specify your primary engineering discipline, specialized niches, and targeted infrastructure sectors.
                </p>
              </div>

              <form onSubmit={handleSaveInfrastructure} className="space-y-6">
                <InfrastructureExpertiseSection
                  primaryDiscipline={primaryDiscipline}
                  setPrimaryDiscipline={setPrimaryDiscipline}
                  specializations={specializations}
                  setSpecializations={setSpecializations}
                  infrastructureSectors={infrastructureSectors}
                  setInfrastructureSectors={setInfrastructureSectors}
                  yearsOfExperience={yearsOfExperience}
                  setYearsOfExperience={setYearsOfExperience}
                  preferredLocations={preferredLocations}
                  setPreferredLocations={setPreferredLocations}
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
                    Save Infrastructure Expertise
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* SECTION 4: SKILLS & SOFTWARE */}
          {activeSection === "skills" && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-white/[0.08] bg-bg-card/80 backdrop-blur-xl p-6 sm:p-8 space-y-6 shadow-xl"
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono uppercase text-brand-mint tracking-widest font-bold">
                    SECTION 04 OF 11
                  </span>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-brand-yellow/10 border border-brand-yellow/20 text-brand-yellow">
                    +20 XP (3+ Skills)
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-heading font-black text-white tracking-tight">
                  Structured Skills & Software
                </h2>
                <p className="text-xs sm:text-sm text-text-muted leading-relaxed mt-1">
                  Organized across Software Tools, Technical Calculations, Industry Standards, and Professional Leadership.
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

          {/* SECTION 5: EXPERIENCE */}
          {activeSection === "experience" && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-white/[0.08] bg-bg-card/80 backdrop-blur-xl p-6 sm:p-8 space-y-6 shadow-xl"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono uppercase text-brand-mint tracking-widest font-bold">
                      SECTION 05 OF 11
                    </span>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-brand-yellow/10 border border-brand-yellow/20 text-brand-yellow">
                      +20 XP
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-heading font-black text-white tracking-tight">
                    Professional Experience
                  </h2>
                  <p className="text-xs sm:text-sm text-text-muted mt-1 leading-relaxed">
                    Engineering, site supervision, consultancy, internship, and project management roles.
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

              {profile?.experience?.length > 0 ? (
                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-white/[0.08]">
                  {profile.experience.map((exp) => (
                    <div key={exp.id} className="relative group">
                      <div className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-brand-mint border-2 border-bg-card shadow-sm ring-2 ring-brand-mint/20" />

                      <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-brand-mint/30 transition-all flex items-start justify-between gap-4">
                        <div className="space-y-1.5 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono font-bold text-brand-mint uppercase tracking-wider">
                              {new Date(exp.startDate).getFullYear()} — {exp.currentlyActive ? "Present" : exp.endDate ? new Date(exp.endDate).getFullYear() : "Present"}
                            </span>
                            <span className="text-xs text-text-faint">•</span>
                            <span className="text-xs px-2 py-0.5 rounded bg-white/[0.04] text-text-muted uppercase font-bold">
                              {exp.employmentType}
                            </span>
                            {exp.infrastructureSector && (
                              <span className="text-xs px-2 py-0.5 rounded bg-brand-mint/10 text-brand-mint border border-brand-mint/20 font-medium">
                                {exp.infrastructureSector}
                              </span>
                            )}
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

                          {/* Software & Skills Used Chips */}
                          {(exp.softwareUsed?.length > 0 || exp.skillsUsed?.length > 0) && (
                            <div className="flex flex-wrap gap-1.5 pt-2">
                              {exp.softwareUsed?.map((sw) => (
                                <span key={sw} className="px-2 py-0.5 rounded-md bg-white/[0.04] text-[11px] text-brand-mint font-medium">
                                  {sw}
                                </span>
                              ))}
                              {exp.skillsUsed?.map((sk) => (
                                <span key={sk} className="px-2 py-0.5 rounded-md bg-white/[0.02] text-[11px] text-text-secondary">
                                  {sk}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingExpId(exp.id);
                              setExpForm({
                                organization: exp.organization || "",
                                role: exp.role || "",
                                employmentType: exp.employmentType || "Full-time",
                                location: exp.location || "",
                                startDate: exp.startDate ? new Date(exp.startDate).toISOString().split("T")[0] : "",
                                endDate: exp.endDate ? new Date(exp.endDate).toISOString().split("T")[0] : "",
                                currentlyActive: Boolean(exp.currentlyActive),
                                description: exp.description || "",
                                infrastructureSector: exp.infrastructureSector || "Buildings",
                                skillsUsed: Array.isArray(exp.skillsUsed) ? exp.skillsUsed : [],
                                softwareUsed: Array.isArray(exp.softwareUsed) ? exp.softwareUsed : [],
                              });
                              setIsExpModalOpen(true);
                            }}
                            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-text-muted hover:text-brand-mint hover:bg-white/[0.04] transition-colors cursor-pointer"
                            title="Edit"
                            aria-label="Edit experience"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteExpMutation.mutate(exp.id)}
                            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-text-muted hover:text-danger hover:bg-white/[0.04] transition-colors cursor-pointer"
                            title="Delete"
                            aria-label="Delete experience"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
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

          {/* SECTION 6: PROJECTS */}
          {activeSection === "projects" && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-white/[0.08] bg-bg-card/80 backdrop-blur-xl p-6 sm:p-8 space-y-6 shadow-xl"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono uppercase text-brand-mint tracking-widest font-bold">
                      SECTION 06 OF 11
                    </span>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-brand-yellow/10 border border-brand-yellow/20 text-brand-yellow">
                      +25 XP
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-heading font-black text-white tracking-tight">
                    Infrastructure Projects
                  </h2>
                  <p className="text-xs sm:text-sm text-text-muted mt-1 leading-relaxed">
                    Civil structures, highways, bridges, metro rails, water treatment, and mega-projects.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingProject(null);
                    setIsProjectModalOpen(true);
                  }}
                  className="btn-primary text-xs uppercase tracking-wider flex items-center gap-1.5 py-2.5 px-4 cursor-pointer shadow-md min-h-[44px] shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Project
                </button>
              </div>

              {myProjects.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {myProjects.map((proj) => {
                    const pId = proj.id || proj._id;
                    return (
                      <div
                        key={pId}
                        className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-brand-mint/30 transition-all flex flex-col justify-between gap-3 shadow-sm"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold text-brand-mint uppercase tracking-wider">
                                {proj.infrastructureSector || "Infrastructure"}
                              </span>
                              {proj.status && (
                                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-white/[0.04] text-text-muted font-bold">
                                  {proj.status}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingProject(proj);
                                  setIsProjectModalOpen(true);
                                }}
                                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-text-muted hover:text-brand-mint hover:bg-white/[0.04] transition-colors cursor-pointer"
                                title="Edit"
                                aria-label="Edit project"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteProjectMutation.mutate(pId)}
                                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-text-muted hover:text-danger hover:bg-white/[0.04] transition-colors cursor-pointer"
                                title="Delete"
                                aria-label="Delete project"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <h4 className="text-base font-bold text-white">{proj.title}</h4>
                          {proj.tagline && (
                            <p className="text-xs text-text-secondary font-medium">{proj.tagline}</p>
                          )}
                          {proj.summary && (
                            <p className="text-xs text-text-muted line-clamp-2 leading-relaxed">
                              {proj.summary}
                            </p>
                          )}

                          {Array.isArray(proj.softwareUsed) && proj.softwareUsed.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {proj.softwareUsed.map((sw) => (
                                <span key={sw} className="px-2 py-0.5 rounded-md bg-white/[0.04] text-[10px] text-brand-mint">
                                  {sw}
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
                    <Hammer className="w-6 h-6 text-brand-mint/70" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">No projects published yet</h4>
                    <p className="text-xs text-text-muted max-w-sm mx-auto mt-1 leading-relaxed">
                      Present your engineering deliverables, structural modeling, or site execution case studies.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingProject(null);
                      setIsProjectModalOpen(true);
                    }}
                    className="btn-primary text-xs uppercase tracking-wider inline-flex items-center gap-1.5 py-2.5 px-5 cursor-pointer min-h-[44px]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add First Project
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* SECTION 7: EDUCATION */}
          {activeSection === "education" && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-white/[0.08] bg-bg-card/80 backdrop-blur-xl p-6 sm:p-8 space-y-6 shadow-xl"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono uppercase text-brand-mint tracking-widest font-bold">
                      SECTION 07 OF 11
                    </span>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-brand-yellow/10 border border-brand-yellow/20 text-brand-yellow">
                      +20 XP
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-heading font-black text-white tracking-tight">
                    Education & Academics
                  </h2>
                  <p className="text-xs sm:text-sm text-text-muted mt-1 leading-relaxed">
                    Engineering degrees, technical diplomas, and university qualifications.
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

              {profile?.education?.length > 0 ? (
                <div className="space-y-4">
                  {profile.education.map((edu) => (
                    <div
                      key={edu.id}
                      className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-brand-mint/30 transition-all flex items-start justify-between gap-4"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="text-xs font-mono font-bold text-brand-mint uppercase tracking-wider">
                          {new Date(edu.startDate).getFullYear()} — {edu.currentlyStudying ? "Present" : edu.endDate ? new Date(edu.endDate).getFullYear() : "Present"}
                        </div>
                        <h4 className="text-base font-bold text-white">{edu.qualification}</h4>
                        <div className="text-sm font-semibold text-text-secondary">
                          {edu.institution} {edu.fieldOfStudy && `• ${edu.fieldOfStudy}`}
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
                              institution: edu.institution || "",
                              qualification: edu.qualification || "",
                              fieldOfStudy: edu.fieldOfStudy || "",
                              startDate: edu.startDate ? new Date(edu.startDate).toISOString().split("T")[0] : "",
                              endDate: edu.endDate ? new Date(edu.endDate).toISOString().split("T")[0] : "",
                              currentlyStudying: Boolean(edu.currentlyStudying),
                              description: edu.description || "",
                            });
                            setIsEduModalOpen(true);
                          }}
                          className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-text-muted hover:text-brand-mint hover:bg-white/[0.04] transition-colors cursor-pointer"
                          title="Edit"
                          aria-label="Edit education"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteEduMutation.mutate(edu.id)}
                          className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-text-muted hover:text-danger hover:bg-white/[0.04] transition-colors cursor-pointer"
                          title="Delete"
                          aria-label="Delete education"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-14 px-4 rounded-3xl border border-dashed border-white/[0.1] text-center space-y-3.5 bg-white/[0.01]">
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto text-text-muted">
                    <GraduationCap className="w-6 h-6 text-brand-mint/70" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">No academic history added</h4>
                    <p className="text-xs text-text-muted max-w-sm mx-auto mt-1 leading-relaxed">
                      Add your engineering degrees, technical diplomas, and university credentials.
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

          {/* SECTION 8: CERTIFICATIONS */}
          {activeSection === "certifications" && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-white/[0.08] bg-bg-card/80 backdrop-blur-xl p-6 sm:p-8 space-y-6 shadow-xl"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono uppercase text-brand-mint tracking-widest font-bold">
                      SECTION 08 OF 11
                    </span>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-brand-yellow/10 border border-brand-yellow/20 text-brand-yellow">
                      +15 XP
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-heading font-black text-white tracking-tight">
                    Accredited Certifications
                  </h2>
                  <p className="text-xs sm:text-sm text-text-muted mt-1 leading-relaxed">
                    Licenses, software certifications, and professional engineering council registrations.
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
                  Add Certificate
                </button>
              </div>

              {profile?.certifications?.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {profile.certifications.map((cert) => (
                    <div
                      key={cert.id}
                      className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-brand-mint/30 transition-all flex flex-col justify-between gap-3 shadow-sm"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-brand-mint uppercase tracking-wider">
                            {new Date(cert.issueDate).getFullYear()}
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                              cert.verified
                                ? "bg-brand-mint/15 text-brand-mint border border-brand-mint/30"
                                : "bg-white/[0.04] text-text-faint"
                            }`}
                          >
                            {cert.verified ? "Verified ✓" : "Unverified"}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white leading-snug">{cert.name}</h4>
                        <div className="text-xs text-text-secondary">{cert.issuer}</div>
                        {cert.credentialId && (
                          <div className="text-[11px] font-mono text-text-faint truncate">
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
                            className="text-xs text-brand-mint hover:underline inline-flex items-center gap-1 min-h-[36px]"
                          >
                            <ExternalLink className="w-3 h-3" />
                            View Credential
                          </a>
                        ) : (
                          <span />
                        )}

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCertId(cert.id);
                              setCertForm({
                                name: cert.name || "",
                                issuer: cert.issuer || "",
                                issueDate: cert.issueDate ? new Date(cert.issueDate).toISOString().split("T")[0] : "",
                                expirationDate: cert.expirationDate ? new Date(cert.expirationDate).toISOString().split("T")[0] : "",
                                credentialId: cert.credentialId || "",
                                credentialUrl: cert.credentialUrl || "",
                              });
                              setIsCertModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-text-muted hover:text-brand-mint hover:bg-white/[0.04] transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                            title="Edit"
                            aria-label="Edit certification"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteCertMutation.mutate(cert.id)}
                            className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-white/[0.04] transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                            title="Delete"
                            aria-label="Delete certification"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
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
                    Add Certificate
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* SECTION 9: CAREER PREFERENCES & PRIVACY */}
          {activeSection === "career-preferences" && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-white/[0.08] bg-bg-card/80 backdrop-blur-xl p-6 sm:p-8 space-y-6 shadow-xl"
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono uppercase text-brand-mint tracking-widest font-bold">
                    SECTION 09 OF 11
                  </span>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-brand-yellow/10 border border-brand-yellow/20 text-brand-yellow">
                    +20 XP
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-heading font-black text-white tracking-tight">
                  Career Preferences & Privacy Controls
                </h2>
                <p className="text-xs sm:text-sm text-text-muted leading-relaxed mt-1">
                  Set confidential recruitment discovery, desired job titles, salary visibility, and contact privacy.
                </p>
              </div>

              <form onSubmit={handleSaveCareerPreferences} className="space-y-6">
                <CareerPreferencesSection
                  careerPreferences={careerPreferences}
                  setCareerPreferences={setCareerPreferences}
                  privacySettings={privacySettings}
                  setPrivacySettings={setPrivacySettings}
                  discoverableToRecruiters={discoverableToRecruiters}
                  setDiscoverableToRecruiters={setDiscoverableToRecruiters}
                  profileVisibility={profileVisibility}
                  setProfileVisibility={setProfileVisibility}
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
                    Save Career & Privacy Preferences
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* SECTION 10: RECOMMENDATIONS */}
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
                      SECTION 10 OF 11
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

          {/* SECTION 11: PUBLIC PROFILE SETUP */}
          {activeSection === "public-profile" && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-white/[0.08] bg-bg-card/80 backdrop-blur-xl p-6 sm:p-8 space-y-6 shadow-xl"
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono uppercase text-brand-mint tracking-widest font-bold">
                    SECTION 11 OF 11
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
                    {profile?.primaryDiscipline ? (
                      <CheckCircle2 className="w-4 h-4 text-brand-mint shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-brand-yellow shrink-0" />
                    )}
                    <span className={profile?.primaryDiscipline ? "text-white" : "text-text-muted"}>
                      Primary infrastructure discipline selected ({profile?.primaryDiscipline || "Not selected"})
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
                onClick={() => setIsExpModalOpen(false)}
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
                  onChange={(e) => setExpForm({ ...expForm, organization: e.target.value })}
                  required
                  placeholder="e.g. Larsen & Toubro, AECOM, Bechtel"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-bg-elevated border border-white/[0.08] text-sm text-white focus:border-brand-mint focus:outline-none"
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
                    placeholder="e.g. Site Engineer, BIM Lead"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-bg-elevated border border-white/[0.08] text-sm text-white focus:border-brand-mint focus:outline-none"
                  />
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
                    onChange={(e) => setExpForm({ ...expForm, startDate: e.target.value })}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-bg-elevated border border-white/[0.08] text-sm text-white focus:border-brand-mint focus:outline-none"
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
                    className="w-full px-3.5 py-2.5 rounded-xl bg-bg-elevated border border-white/[0.08] text-sm text-white focus:border-brand-mint focus:outline-none disabled:opacity-40"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="currentlyActiveExp"
                  checked={expForm.currentlyActive}
                  onChange={(e) => setExpForm({ ...expForm, currentlyActive: e.target.checked })}
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

      {/* Projects Modal */}
      <ProjectEditorModal
        isOpen={isProjectModalOpen}
        onClose={() => {
          setIsProjectModalOpen(false);
          setEditingProject(null);
        }}
        onSave={(payload) => saveProjectMutation.mutate(payload)}
        initialData={editingProject}
        isPending={saveProjectMutation.isPending}
      />

      {/* Education Modal */}
      {isEduModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-3xl border border-white/[0.1] bg-bg-card p-6 sm:p-8 space-y-5 shadow-2xl max-h-[90dvh] sm:max-h-[85vh] overflow-y-auto overscroll-contain">
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
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                  Institution / School <span className="text-brand-mint">*</span>
                </label>
                <input
                  type="text"
                  value={eduForm.institution}
                  onChange={(e) => setEduForm({ ...eduForm, institution: e.target.value })}
                  required
                  placeholder="e.g. University of Calicut, IIT Madras, Zeitnah"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-bg-elevated border border-white/[0.08] text-sm text-white focus:border-brand-mint focus:outline-none"
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
                    placeholder="e.g. B.Tech, M.S, Diploma"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-bg-elevated border border-white/[0.08] text-sm text-white focus:border-brand-mint focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                    Field of Study
                  </label>
                  <input
                    type="text"
                    value={eduForm.fieldOfStudy}
                    onChange={(e) => setEduForm({ ...eduForm, fieldOfStudy: e.target.value })}
                    placeholder="e.g. Civil Engineering"
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
                    value={eduForm.startDate}
                    onChange={(e) => setEduForm({ ...eduForm, startDate: e.target.value })}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-bg-elevated border border-white/[0.08] text-sm text-white focus:border-brand-mint focus:outline-none"
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
                    className="w-full px-3.5 py-2.5 rounded-xl bg-bg-elevated border border-white/[0.08] text-sm text-white focus:border-brand-mint focus:outline-none disabled:opacity-40"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="currentlyStudyingEdu"
                  checked={eduForm.currentlyStudying}
                  onChange={(e) => setEduForm({ ...eduForm, currentlyStudying: e.target.checked })}
                  className="rounded border-white/[0.08] text-brand-mint focus:ring-0 cursor-pointer"
                />
                <label htmlFor="currentlyStudyingEdu" className="text-xs text-text-secondary cursor-pointer">
                  I currently study here
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                  Description / Honors <span className="text-text-faint font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={eduForm.description}
                  onChange={(e) => setEduForm({ ...eduForm, description: e.target.value })}
                  placeholder="Academic clubs, honors, capstone thesis title..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-bg-elevated border border-white/[0.08] text-sm text-white focus:border-brand-mint focus:outline-none resize-none"
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

      {/* Certification Modal */}
      {isCertModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-3xl border border-white/[0.1] bg-bg-card p-6 sm:p-8 space-y-5 shadow-2xl max-h-[90dvh] sm:max-h-[85vh] overflow-y-auto overscroll-contain">
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
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                  Certificate Name <span className="text-brand-mint">*</span>
                </label>
                <input
                  type="text"
                  value={certForm.name}
                  onChange={(e) => setCertForm({ ...certForm, name: e.target.value })}
                  required
                  placeholder="e.g. Autodesk Certified Professional: Revit for Structural Design"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-bg-elevated border border-white/[0.08] text-sm text-white focus:border-brand-mint focus:outline-none"
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
                  placeholder="e.g. Autodesk, PMI, Oracle, ASCE, Zeitnah"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-bg-elevated border border-white/[0.08] text-sm text-white focus:border-brand-mint focus:outline-none"
                />
              </div>

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
                    className="w-full px-3.5 py-2.5 rounded-xl bg-bg-elevated border border-white/[0.08] text-sm text-white focus:border-brand-mint focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                    Expiration Date
                  </label>
                  <input
                    type="date"
                    value={certForm.expirationDate}
                    onChange={(e) => setCertForm({ ...certForm, expirationDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-bg-elevated border border-white/[0.08] text-sm text-white focus:border-brand-mint focus:outline-none"
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
                  placeholder="e.g. CERT-REV-9874"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-bg-elevated border border-white/[0.08] text-sm text-white focus:border-brand-mint focus:outline-none"
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
                  className="w-full px-3.5 py-2.5 rounded-xl bg-bg-elevated border border-white/[0.08] text-sm text-white focus:border-brand-mint focus:outline-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs text-text-muted flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-text-faint shrink-0" />
                <span>
                  Certifications are marked as <strong className="text-text-secondary">Unverified</strong> unless directly issued by Zeitnah or verified via credential link.
                </span>
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