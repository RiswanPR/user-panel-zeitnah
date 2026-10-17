import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Briefcase,
  Search,
  Check,
  ChevronRight,
  AlertCircle,
  AlertTriangle,
  X,
  Sparkles,
  RefreshCw,
  Edit3,
  Tag,
  Info,
  CheckCircle2,
  Send,
  Loader2,
  Clock,
  History,
} from "lucide-react";
import { coreProfileService } from "../../services/coreProfileService";
import { PROFILE_QUERY_KEYS } from "../../constants/profileQueryKeys";
import {
  validateCustomTitle,
  findPredefinedSuggestions,
} from "../../utils/professionalIdentity";

/**
 * ProfessionalIdentityEditor Component
 *
 * Implements Phase 3 Department-First Selection UX:
 * 1. Searchable Department selector loaded from GET /api/profile/catalogue
 * 2. Department-scoped predefined title search
 * 3. Custom title entry with validation (max 100 chars, plain text, trimmed)
 * 4. Non-blocking suggestions for custom titles without automatic conversion
 * 5. Department change confirmation guard preventing accidental title loss
 * 6. Legacy profile banner preserving existing titles
 */
export default function ProfessionalIdentityEditor({
  value,
  legacyRole = "",
  onChange,
  disabled = false,
}) {
  // 1. Fetch Authoritative Phase 2 Catalogue
  const {
    data: catalogueData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: PROFILE_QUERY_KEYS.CATALOGUE,
    queryFn: coreProfileService.getProfessionalCatalogue,
    staleTime: 1000 * 60 * 30, // 30 minutes cache
    retry: 2,
  });

  const departments = useMemo(
    () => catalogueData?.departments || [],
    [catalogueData]
  );

  // 2. Local State Management
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [selectedTitleId, setSelectedTitleId] = useState("");
  const [selectedTitleName, setSelectedTitleName] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const [customTitleError, setCustomTitleError] = useState(null);

  // UI state
  const [deptSearch, setDeptSearch] = useState("");
  const [titleSearch, setTitleSearch] = useState("");
  const [titleMode, setTitleMode] = useState("predefined"); // 'predefined' | 'custom'
  const [isDeptSelectorOpen, setIsDeptSelectorOpen] = useState(false);

  // Department switch confirmation modal state
  const [pendingDept, setPendingDept] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Custom title request workflow state
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestModalTab, setRequestModalTab] = useState("form"); // 'form' | 'history'
  const [requestTitleInput, setRequestTitleInput] = useState("");
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestError, setRequestError] = useState(null);
  const [requestSuccess, setRequestSuccess] = useState(false);
  const [requestSuccessMessage, setRequestSuccessMessage] = useState("");

  const queryClient = useQueryClient();
  const {
    data: myRequestsData,
    refetch: refetchMyRequests,
    isLoading: isLoadingRequests,
  } = useQuery({
    queryKey: PROFILE_QUERY_KEYS.TITLE_REQUESTS_MY,
    queryFn: () => coreProfileService.getMyCustomTitleRequests(),
    staleTime: 1000 * 60 * 2,
    retry: 1,
  });

  const myRequests = useMemo(() => {
    return Array.isArray(myRequestsData) ? myRequestsData : [];
  }, [myRequestsData]);

  // Reference for accessibility focus
  const searchInputRef = useRef(null);

  // 3. Hydrate state from props
  useEffect(() => {
    if (!value) {
      if (legacyRole && !selectedDeptId) {
        setSelectedTitleName(legacyRole);
      }
      return;
    }

    if (value.departmentId) {
      setSelectedDeptId(value.departmentId);
      setIsCustom(Boolean(value.isCustomTitle));

      if (value.isCustomTitle) {
        setTitleMode("custom");
        setCustomTitle(value.titleName || value.customTitle || "");
        setSelectedTitleId("");
        setSelectedTitleName(value.titleName || value.customTitle || "");
      } else {
        setTitleMode("predefined");
        setSelectedTitleId(value.titleId || "");
        setSelectedTitleName(value.titleName || "");
        setCustomTitle("");
      }
    } else if (value.titleName || legacyRole) {
      setSelectedTitleName(value.titleName || legacyRole || "");
    }
  }, [value, legacyRole]);

  // Active department object
  const activeDepartment = useMemo(() => {
    return departments.find((d) => d.id === selectedDeptId) || null;
  }, [departments, selectedDeptId]);

  // Filtered departments by search query
  const filteredDepartments = useMemo(() => {
    const q = deptSearch.trim().toLowerCase();
    if (!q) return departments;
    return departments.filter((d) => {
      const nameMatch = d.name.toLowerCase().includes(q);
      const aliasMatch = Array.isArray(d.aliases)
        ? d.aliases.some((a) => a.toLowerCase().includes(q))
        : false;
      return nameMatch || aliasMatch;
    });
  }, [departments, deptSearch]);

  // Department-scoped titles
  const departmentTitles = useMemo(() => {
    return activeDepartment?.titles || [];
  }, [activeDepartment]);

  // Filtered department titles by search query
  const filteredTitles = useMemo(() => {
    const q = titleSearch.trim().toLowerCase();
    if (!q) return departmentTitles;
    return departmentTitles.filter((t) =>
      t.label.toLowerCase().includes(q)
    );
  }, [departmentTitles, titleSearch]);

  // Non-blocking suggestions for custom title input
  const suggestions = useMemo(() => {
    if (titleMode !== "custom" || !customTitle.trim()) return [];
    return findPredefinedSuggestions(customTitle, departmentTitles, 2);
  }, [titleMode, customTitle, departmentTitles]);

  // Notify parent of state changes
  const notifyParent = (deptId, titleId, tName, customFlag, customVal) => {
    if (!onChange) return;
    const dept = departments.find((d) => d.id === deptId);
    if (!dept) {
      onChange({
        departmentId: null,
        departmentName: null,
        titleId: null,
        titleName: legacyRole || "",
        isCustomTitle: false,
        isLegacyTitle: true,
      });
      return;
    }

    if (customFlag) {
      onChange({
        departmentId: dept.id,
        departmentName: dept.name,
        titleId: null,
        customTitle: customVal,
        titleName: customVal,
        isCustomTitle: true,
        isLegacyTitle: false,
      });
    } else {
      onChange({
        departmentId: dept.id,
        departmentName: dept.name,
        titleId: titleId,
        titleName: tName,
        isCustomTitle: false,
        isLegacyTitle: false,
      });
    }
  };

  // 4. Department Selection Handlers
  const handleSelectDepartment = (dept) => {
    if (disabled) return;

    // Check if user has an existing title and is trying to switch to a different department
    const hasCurrentTitle = Boolean(
      selectedTitleId || (isCustom && customTitle.trim())
    );
    if (hasCurrentTitle && selectedDeptId && selectedDeptId !== dept.id) {
      // Trigger confirmation modal
      setPendingDept(dept);
      setShowConfirmModal(true);
      return;
    }

    // Direct selection
    setSelectedDeptId(dept.id);
    setSelectedTitleId("");
    setSelectedTitleName("");
    setCustomTitle("");
    setIsCustom(false);
    setTitleMode("predefined");
    setTitleSearch("");
    setIsDeptSelectorOpen(false);

    notifyParent(dept.id, "", "", false, "");
  };

  const handleConfirmDeptChange = () => {
    if (!pendingDept) return;
    setSelectedDeptId(pendingDept.id);
    setSelectedTitleId("");
    setSelectedTitleName("");
    setCustomTitle("");
    setIsCustom(false);
    setTitleMode("predefined");
    setTitleSearch("");
    setShowConfirmModal(false);
    setIsDeptSelectorOpen(false);

    notifyParent(pendingDept.id, "", "", false, "");
    setPendingDept(null);
  };

  const handleCancelDeptChange = () => {
    setShowConfirmModal(false);
    setPendingDept(null);
  };

  // 5. Predefined Title Selection
  const handleSelectPredefinedTitle = (title) => {
    if (disabled || !activeDepartment) return;

    setSelectedTitleId(title.id);
    setSelectedTitleName(title.label);
    setIsCustom(false);
    setCustomTitle("");
    setCustomTitleError(null);

    notifyParent(activeDepartment.id, title.id, title.label, false, "");
  };

  // 6. Custom Title Input Handler
  const handleCustomTitleChange = (val) => {
    setCustomTitle(val);
    const validation = validateCustomTitle(val);
    setCustomTitleError(validation.error);

    if (validation.valid && activeDepartment) {
      setSelectedTitleId("");
      setSelectedTitleName(validation.trimmed);
      setIsCustom(true);
      notifyParent(
        activeDepartment.id,
        null,
        validation.trimmed,
        true,
        validation.trimmed
      );
    }
  };

  // Switch between predefined and custom title mode
  const handleSwitchTitleMode = (mode) => {
    setTitleMode(mode);
    if (mode === "custom") {
      setIsCustom(true);
      if (customTitle.trim()) {
        const val = validateCustomTitle(customTitle);
        setCustomTitleError(val.error);
        if (val.valid && activeDepartment) {
          notifyParent(
            activeDepartment.id,
            null,
            val.trimmed,
            true,
            val.trimmed
          );
        }
      }
    } else {
      setIsCustom(false);
      setCustomTitleError(null);
      if (selectedTitleId && selectedTitleName && activeDepartment) {
        notifyParent(
          activeDepartment.id,
          selectedTitleId,
          selectedTitleName,
          false,
          ""
        );
      }
    }
  };

  // 7. Custom Title Request Handlers
  const handleOpenRequestModal = (initialVal = "", defaultTab = "form") => {
    const defaultVal =
      typeof initialVal === "string" && initialVal.trim()
        ? initialVal.trim()
        : titleSearch.trim() || customTitle.trim() || "";
    setRequestTitleInput(defaultVal);
    setRequestModalTab(defaultTab);
    setRequestError(null);
    setRequestSuccess(false);
    setRequestSuccessMessage("");
    setShowRequestModal(true);
  };

  const handleCloseRequestModal = () => {
    setShowRequestModal(false);
    setRequestSubmitting(false);
    setRequestError(null);
    setRequestSuccess(false);
  };

  const handleSubmitTitleRequest = async (e) => {
    if (e) e.preventDefault();
    if (!activeDepartment) {
      setRequestError("Please select an active department first.");
      return;
    }
    const cleanTitle = requestTitleInput.trim();
    if (!cleanTitle) {
      setRequestError("Title label cannot be empty.");
      return;
    }
    if (cleanTitle.length < 2) {
      setRequestError("Title label must be at least 2 characters long.");
      return;
    }
    if (cleanTitle.length > 100) {
      setRequestError("Title label must not exceed 100 characters.");
      return;
    }
    if (/[\x00-\x1F\x7F<>]/.test(cleanTitle) || /[\r\n]/.test(cleanTitle)) {
      setRequestError(
        "Title label must be single-line plain text without control or HTML characters."
      );
      return;
    }

    // Check if title or alias already exists in active department
    const normalizedInput = cleanTitle.toLowerCase();
    const existingMatch = activeDepartment.titles?.find((t) => {
      if (t.name.toLowerCase() === normalizedInput) return true;
      return t.aliases?.some((a) => a.toLowerCase() === normalizedInput);
    });
    if (existingMatch) {
      setRequestError(
        `"${existingMatch.name}" already exists in the ${activeDepartment.name} department. Please select it from the predefined titles list.`
      );
      return;
    }

    // Check if duplicate pending request exists in user's request history
    const existingPending = myRequests.find(
      (r) =>
        r.departmentId === activeDepartment.id &&
        r.status === "pending" &&
        r.normalizedTitle === cleanTitle.toLowerCase().replace(/\s+/g, " ")
    );
    if (existingPending) {
      setRequestError(
        `You already have a pending request for "${cleanTitle}" in this department.`
      );
      return;
    }

    setRequestSubmitting(true);
    setRequestError(null);
    try {
      const res = await coreProfileService.submitCustomTitleRequest(
        activeDepartment.id,
        cleanTitle
      );
      setRequestSuccess(true);
      setRequestSuccessMessage(
        res?.message ||
          "Custom title request submitted successfully for administrator review."
      );
      queryClient.invalidateQueries({
        queryKey: PROFILE_QUERY_KEYS.TITLE_REQUESTS_MY,
      });
      refetchMyRequests();
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Failed to submit title request. Please try again.";
      setRequestError(msg);
    } finally {
      setRequestSubmitting(false);
    }
  };

  // =========================================================================
  // RENDER: Loading & Error States
  // =========================================================================

  if (isLoading) {
    return (
      <div className="space-y-4 p-5 rounded-2xl border border-white/[0.08] bg-bg-elevated/40 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/10" />
          <div className="space-y-2 flex-1">
            <div className="h-3 w-40 bg-white/10 rounded" />
            <div className="h-2.5 w-60 bg-white/5 rounded" />
          </div>
        </div>
        <div className="h-10 bg-white/5 rounded-xl" />
        <div className="h-24 bg-white/5 rounded-xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-5 rounded-2xl border border-red-500/20 bg-red-500/10 space-y-3">
        <div className="flex items-start gap-3 text-red-300">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider">
              Unable to Load Professional Catalogue
            </p>
            <p className="text-xs text-red-200/80">
              {error?.message || "A network error occurred while loading the department catalogue."}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-500/20 text-red-200 hover:bg-red-500/30 text-xs font-semibold transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Retry Catalogue
        </button>
      </div>
    );
  }

  const isLegacy = Boolean(
    !selectedDeptId && (legacyRole || value?.isLegacyTitle)
  );

  return (
    <div className="space-y-5">
      {/* ── Legacy Profile Notice ── */}
      {isLegacy && (
        <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 flex items-start gap-3">
          <Info className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <p className="font-bold text-amber-200">
              Legacy Position Title:{" "}
              <span className="text-white font-mono font-normal">
                "{legacyRole || value?.titleName}"
              </span>
            </p>
            <p className="text-amber-200/80 leading-relaxed">
              Your title was recorded prior to the introduction of the 18 structured infrastructure departments.
              Select an engineering department below to complete your structured identity, or leave unchanged to preserve your current title.
            </p>
          </div>
        </div>
      )}

      {/* ── Active Selection Preview Card ── */}
      {selectedDeptId && selectedTitleName && (
        <div className="p-4 sm:p-5 rounded-2xl border border-brand-mint/25 bg-brand-mint/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-mint/15 border border-brand-mint/30 flex items-center justify-center shrink-0 text-brand-mint">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-text-muted">
                  {activeDepartment?.name || "Department"}
                </span>
                <span className="text-text-muted">•</span>
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isCustom
                      ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                      : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                  }`}
                >
                  {isCustom ? (
                    <>
                      <Tag className="w-3 h-3" /> Custom Title
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3 h-3" /> Predefined Title
                    </>
                  )}
                </span>
              </div>
              <p className="text-sm font-bold text-white tracking-tight mt-0.5">
                {selectedTitleName}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={disabled}
            onClick={() => setIsDeptSelectorOpen((prev) => !prev)}
            className="self-start sm:self-center inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.04] text-xs font-semibold text-text-secondary hover:text-white hover:bg-white/[0.08] transition-all"
          >
            <Edit3 className="w-3.5 h-3.5" />
            {isDeptSelectorOpen ? "Close Selector" : "Change Selection"}
          </button>
        </div>
      )}

      {/* ── STEP 1: Department Selection Area ── */}
      {(!selectedDeptId || isDeptSelectorOpen) && (
        <div className="space-y-3 p-4 sm:p-5 rounded-2xl border border-white/[0.08] bg-bg-elevated/40">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary">
                Step 1: Choose Engineering Department <span className="text-brand-mint">*</span>
              </label>
              <span className="text-[11px] text-text-muted">
                18 officially catalogued infrastructure engineering departments
              </span>
            </div>
            {selectedDeptId && (
              <button
                type="button"
                onClick={() => setIsDeptSelectorOpen(false)}
                className="text-xs text-text-muted hover:text-white transition-colors"
              >
                Done
              </button>
            )}
          </div>

          {/* Department Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={deptSearch}
              onChange={(e) => setDeptSearch(e.target.value)}
              placeholder="Search 18 departments (e.g. Civil, Structural, QA/QC, MEP)..."
              disabled={disabled}
              className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-bg-card border border-white/[0.08] focus:border-brand-mint/50 focus:ring-1 focus:ring-brand-mint/30 focus:outline-none text-xs sm:text-sm text-white placeholder:text-text-muted transition-colors"
            />
            {deptSearch && (
              <button
                type="button"
                onClick={() => setDeptSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Departments Grid List */}
          <div
            role="listbox"
            aria-label="Engineering Departments"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1 pt-1 scrollbar-thin scrollbar-thumb-white/10"
          >
            {filteredDepartments.map((dept) => {
              const isSelected = dept.id === selectedDeptId;
              const titleCount = dept.titles?.length || 0;

              return (
                <button
                  key={dept.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  disabled={disabled}
                  onClick={() => handleSelectDepartment(dept)}
                  className={`text-left p-3 rounded-xl border transition-all flex items-center justify-between group cursor-pointer ${
                    isSelected
                      ? "border-brand-mint bg-brand-mint/10 text-white shadow-sm ring-1 ring-brand-mint/30"
                      : "border-white/[0.06] bg-bg-card/70 text-text-secondary hover:text-white hover:border-white/[0.15] hover:bg-bg-card"
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-bold truncate group-hover:text-white transition-colors">
                      {dept.name}
                    </p>
                    <span className="text-[10px] text-text-muted">
                      {titleCount} {titleCount === 1 ? "title" : "titles"}
                    </span>
                  </div>
                  {isSelected ? (
                    <Check className="w-4 h-4 text-brand-mint shrink-0" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-text-muted/40 group-hover:text-white/60 shrink-0 transition-colors" />
                  )}
                </button>
              );
            })}

            {filteredDepartments.length === 0 && (
              <div className="col-span-full py-6 text-center text-xs text-text-muted">
                No engineering departments match "{deptSearch}".
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── STEP 2: Title Selection Area (Scoped to Department) ── */}
      {selectedDeptId && activeDepartment && (
        <div className="space-y-4 p-4 sm:p-5 rounded-2xl border border-white/[0.08] bg-bg-elevated/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary">
                Step 2: Choose Position / Title <span className="text-brand-mint">*</span>
              </label>
              <span className="text-[11px] text-text-muted">
                Select from {activeDepartment.name} catalogue or define a custom role
              </span>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="inline-flex rounded-xl p-1 bg-bg-card border border-white/[0.06] self-start sm:self-auto">
              <button
                type="button"
                onClick={() => handleSwitchTitleMode("predefined")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  titleMode === "predefined"
                    ? "bg-brand-mint text-bg-main shadow-sm font-bold"
                    : "text-text-muted hover:text-white"
                }`}
              >
                Catalogue Titles ({departmentTitles.length})
              </button>
              <button
                type="button"
                onClick={() => handleSwitchTitleMode("custom")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  titleMode === "custom"
                    ? "bg-brand-mint text-bg-main shadow-sm font-bold"
                    : "text-text-muted hover:text-white"
                }`}
              >
                Custom Title
              </button>
            </div>
          </div>

          {/* Mode A: Predefined Titles List */}
          {titleMode === "predefined" && (
            <div className="space-y-3">
              {/* Title Search Input */}
              <div className="relative">
                <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={titleSearch}
                  onChange={(e) => setTitleSearch(e.target.value)}
                  placeholder={`Search titles in ${activeDepartment.name}...`}
                  disabled={disabled}
                  className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-bg-card border border-white/[0.08] focus:border-brand-mint/50 focus:ring-1 focus:ring-brand-mint/30 focus:outline-none text-xs sm:text-sm text-white placeholder:text-text-muted transition-colors"
                />
                {titleSearch && (
                  <button
                    type="button"
                    onClick={() => setTitleSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Scoped Titles Grid */}
              <div
                role="listbox"
                aria-label={`Titles in ${activeDepartment.name}`}
                className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10"
              >
                {filteredTitles.map((t) => {
                  const isSelected = selectedTitleId === t.id && !isCustom;

                  return (
                    <button
                      key={t.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      disabled={disabled}
                      onClick={() => handleSelectPredefinedTitle(t)}
                      className={`text-left p-3 rounded-xl border transition-all flex items-center justify-between group cursor-pointer ${
                        isSelected
                          ? "border-brand-mint bg-brand-mint/10 text-white shadow-sm ring-1 ring-brand-mint/30"
                          : "border-white/[0.06] bg-bg-card/70 text-text-secondary hover:text-white hover:border-white/[0.15] hover:bg-bg-card"
                      }`}
                    >
                      <span className="text-xs font-semibold truncate pr-2 group-hover:text-white transition-colors">
                        {t.label}
                      </span>
                      {isSelected ? (
                        <Check className="w-4 h-4 text-brand-mint shrink-0" />
                      ) : (
                        <span className="text-[10px] text-text-muted/60 px-1.5 py-0.5 rounded border border-white/[0.05] bg-white/[0.02]">
                          Catalogue
                        </span>
                      )}
                    </button>
                  );
                })}

                {filteredTitles.length === 0 && (
                  <div className="col-span-full py-6 text-center space-y-3">
                    <p className="text-xs text-text-muted">
                      No predefined titles match "{titleSearch}" in this department.
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setCustomTitle(titleSearch);
                          handleSwitchTitleMode("custom");
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.04] text-xs text-text-secondary hover:text-white hover:bg-white/[0.08] font-semibold transition-all"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Use as custom title
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenRequestModal(titleSearch)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-brand-mint/30 bg-brand-mint/15 text-brand-mint hover:bg-brand-mint/25 text-xs font-bold transition-all shadow-sm"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Request Custom Title
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Request Title Footer Helper */}
              <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] text-xs">
                <span className="text-text-muted text-[11px]">
                  Can't find your exact title in {activeDepartment.name}?
                </span>
                <div className="flex items-center gap-3">
                  {myRequests.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleOpenRequestModal("", "history")}
                      className="inline-flex items-center gap-1 text-xs text-text-secondary hover:text-white font-medium transition-colors"
                    >
                      <History className="w-3 h-3 text-brand-mint" />
                      My Requests ({myRequests.length})
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleOpenRequestModal(titleSearch)}
                    className="inline-flex items-center gap-1 text-xs text-brand-mint hover:underline font-semibold"
                  >
                    <Send className="w-3 h-3" />
                    Request Custom Title
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Mode B: Custom Title Input */}
          {titleMode === "custom" && (
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                    Custom Title in {activeDepartment.name}
                  </label>
                  <span
                    className={`text-[11px] font-mono ${
                      customTitle.length > 100
                        ? "text-red-400 font-bold"
                        : "text-text-muted"
                    }`}
                  >
                    {customTitle.length}/100
                  </span>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => handleCustomTitleChange(e.target.value)}
                    maxLength={105} // slight leeway so validator can catch and explain >100
                    disabled={disabled}
                    placeholder="e.g. Lead Substation Commissioning Engineer"
                    className={`w-full px-4 py-2.5 rounded-xl bg-bg-card border text-xs sm:text-sm text-white placeholder:text-text-muted transition-colors focus:outline-none ${
                      customTitleError
                        ? "border-red-500/50 focus:border-red-500 focus:ring-1 focus:ring-red-500/30"
                        : "border-white/[0.08] focus:border-brand-mint/50 focus:ring-1 focus:ring-brand-mint/30"
                    }`}
                  />
                  {customTitle && (
                    <button
                      type="button"
                      onClick={() => handleCustomTitleChange("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {customTitleError && (
                  <p className="text-[11px] text-red-400 mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    {customTitleError}
                  </p>
                )}

                <p className="text-[11px] text-text-muted mt-1.5">
                  Custom titles remain associated with {activeDepartment.name}. Must be single-line plain text under 100 characters.
                </p>
              </div>

              {/* Non-blocking suggestion chip */}
              {suggestions.length > 0 && (
                <div className="p-3 rounded-xl border border-brand-yellow/20 bg-brand-yellow/5 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-brand-yellow text-xs font-semibold">
                    <Sparkles className="w-3.5 h-3.5" />
                    Matching Predefined Catalogue Titles:
                  </div>
                  <div className="flex flex-wrap gap-2 pt-0.5">
                    {suggestions.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          handleSelectPredefinedTitle(s);
                          setTitleMode("predefined");
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-brand-yellow/10 hover:bg-brand-yellow/20 border border-brand-yellow/30 text-xs font-semibold text-brand-yellow transition-all cursor-pointer"
                      >
                        <Check className="w-3 h-3" />
                        Use "{s.label}"
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-brand-yellow/70">
                    Choosing a suggestion will switch to the predefined catalogue title. Otherwise, your custom title is saved as entered.
                  </p>
                </div>
              )}

              {/* Request Title Addition in Department Banner */}
              <div className="p-3.5 rounded-xl border border-white/[0.08] bg-bg-card/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-white">
                    Missing this title in the official catalogue?
                  </p>
                  <p className="text-[11px] text-text-muted">
                    Submit a request to add "{customTitle || "your title"}" to {activeDepartment.name} for all users.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {myRequests.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleOpenRequestModal("", "history")}
                      className="self-start sm:self-center shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.04] text-text-secondary hover:text-white text-xs font-semibold transition-all"
                    >
                      <History className="w-3.5 h-3.5 text-brand-mint" />
                      My Requests ({myRequests.length})
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleOpenRequestModal(customTitle)}
                    className="self-start sm:self-center shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand-mint/30 bg-brand-mint/10 text-brand-mint hover:bg-brand-mint/20 text-xs font-bold transition-all shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Request Addition
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 3: Department Switch Confirmation Modal ── */}
      {showConfirmModal && pendingDept && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dept-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
        >
          <div className="w-full max-w-md rounded-3xl border border-white/[0.12] bg-bg-card p-6 space-y-5 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3
                  id="confirm-dept-title"
                  className="text-base font-bold text-white tracking-tight"
                >
                  Change Engineering Department?
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  You currently have title{" "}
                  <span className="font-semibold text-white">
                    "{selectedTitleName || customTitle}"
                  </span>{" "}
                  under{" "}
                  <span className="font-semibold text-white">
                    {activeDepartment?.name}
                  </span>
                  .
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-white/[0.08] bg-bg-elevated/60 text-xs text-text-secondary leading-relaxed">
              Changing your department to{" "}
              <span className="font-bold text-brand-mint">
                {pendingDept.name}
              </span>{" "}
              will clear your current title. You will need to explicitly select or enter a new title under {pendingDept.name}.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleCancelDeptChange}
                className="px-4 py-2 rounded-xl border border-white/10 bg-white/[0.04] text-xs font-semibold text-text-secondary hover:text-white hover:bg-white/[0.08] transition-all"
              >
                Cancel (Keep Current)
              </button>
              <button
                type="button"
                onClick={handleConfirmDeptChange}
                className="px-4 py-2 rounded-xl bg-amber-500 text-bg-main text-xs font-bold uppercase tracking-wider hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20"
              >
                Change Department
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 4: Request Custom Title Modal ── */}
      {showRequestModal && activeDepartment && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="request-title-heading"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
        >
          <div className="w-full max-w-lg rounded-3xl border border-white/[0.12] bg-bg-card p-6 space-y-5 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-brand-mint/15 border border-brand-mint/30 flex items-center justify-center shrink-0 text-brand-mint">
                  {requestModalTab === "form" ? (
                    <Send className="w-5 h-5" />
                  ) : (
                    <History className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3
                    id="request-title-heading"
                    className="text-base font-bold text-white tracking-tight"
                  >
                    {requestModalTab === "form"
                      ? "Request Custom Title"
                      : "My Title Requests"}
                  </h3>
                  <p className="text-xs text-text-secondary">
                    {requestModalTab === "form"
                      ? "Submit a missing title for official catalogue inclusion."
                      : "Review the status of your previously submitted title requests."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseRequestModal}
                className="text-text-muted hover:text-white transition-colors p-1"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex items-center border-b border-white/[0.08] gap-4 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setRequestModalTab("form");
                  setRequestError(null);
                }}
                className={`pb-2.5 transition-colors relative flex items-center gap-1.5 ${
                  requestModalTab === "form"
                    ? "text-brand-mint border-b-2 border-brand-mint font-bold"
                    : "text-text-muted hover:text-white"
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>New Request</span>
              </button>
              <button
                type="button"
                onClick={() => setRequestModalTab("history")}
                className={`pb-2.5 transition-colors relative flex items-center gap-1.5 ${
                  requestModalTab === "history"
                    ? "text-brand-mint border-b-2 border-brand-mint font-bold"
                    : "text-text-muted hover:text-white"
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>My Requests</span>
                {myRequests.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-white/10 text-white">
                    {myRequests.length}
                  </span>
                )}
              </button>
            </div>

            {/* TAB CONTENT: Form */}
            {requestModalTab === "form" && (
              <>
                {requestSuccess ? (
                  <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 space-y-4">
                    <div className="flex items-start gap-3 text-emerald-300">
                      <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-xs font-bold uppercase tracking-wider text-emerald-200">
                          Request Submitted Successfully
                        </p>
                        <p className="text-xs text-emerald-200/90 leading-relaxed">
                          {requestSuccessMessage}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-emerald-500/20">
                      <button
                        type="button"
                        onClick={() => {
                          setRequestSuccess(false);
                          setRequestModalTab("history");
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/10 bg-white/[0.04] text-xs font-semibold text-white hover:bg-white/[0.08] transition-all"
                      >
                        <History className="w-3.5 h-3.5 text-brand-mint" />
                        View My Requests
                      </button>
                      <button
                        type="button"
                        onClick={handleCloseRequestModal}
                        className="px-4 py-2 rounded-xl bg-brand-mint text-bg-main text-xs font-bold uppercase tracking-wider hover:bg-brand-mint/90 transition-all shadow-md"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitTitleRequest} className="space-y-4">
                    {/* Fixed Department Banner */}
                    <div className="p-3.5 rounded-2xl border border-white/[0.08] bg-bg-elevated/40 space-y-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-text-muted">
                        Target Engineering Department (Fixed)
                      </span>
                      <div className="flex items-center gap-2 text-xs font-semibold text-white">
                        <Building2 className="w-3.5 h-3.5 text-brand-mint" />
                        <span>{activeDepartment.name}</span>
                        <span className="text-[10px] text-text-muted font-mono">
                          ({activeDepartment.id})
                        </span>
                      </div>
                    </div>

                    {/* Requested Title Input */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                          Proposed Title Name <span className="text-brand-mint">*</span>
                        </label>
                        <span
                          className={`text-[11px] font-mono ${
                            requestTitleInput.length > 100
                              ? "text-red-400 font-bold"
                              : "text-text-muted"
                          }`}
                        >
                          {requestTitleInput.length}/100
                        </span>
                      </div>
                      <input
                        type="text"
                        value={requestTitleInput}
                        onChange={(e) => setRequestTitleInput(e.target.value)}
                        maxLength={105}
                        placeholder="e.g. Lead Substation Commissioning Engineer"
                        disabled={requestSubmitting}
                        className="w-full px-4 py-2.5 rounded-xl bg-bg-elevated border border-white/[0.08] focus:border-brand-mint/50 focus:ring-1 focus:ring-brand-mint/30 text-xs sm:text-sm text-white placeholder:text-text-muted focus:outline-none transition-colors"
                      />
                      <p className="text-[11px] text-text-muted">
                        Must be single-line plain text under 100 characters. Requests require administrator review before inclusion in the official catalogue.
                      </p>
                    </div>

                    {requestError && (
                      <div className="p-3 rounded-xl border border-red-500/30 bg-red-500/10 flex items-start gap-2.5 text-red-300 text-xs">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{requestError}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={handleCloseRequestModal}
                        disabled={requestSubmitting}
                        className="px-4 py-2 rounded-xl border border-white/10 bg-white/[0.04] text-xs font-semibold text-text-secondary hover:text-white hover:bg-white/[0.08] transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={requestSubmitting || !requestTitleInput.trim()}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-mint text-bg-main text-xs font-bold uppercase tracking-wider hover:bg-brand-mint/90 transition-all shadow-lg shadow-brand-mint/20 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {requestSubmitting ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            Submit Request
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}

            {/* TAB CONTENT: History */}
            {requestModalTab === "history" && (
              <div className="space-y-3">
                {isLoadingRequests ? (
                  <div className="py-8 text-center space-y-2">
                    <Loader2 className="w-6 h-6 animate-spin text-brand-mint mx-auto" />
                    <p className="text-xs text-text-muted">Loading your title requests...</p>
                  </div>
                ) : myRequests.length === 0 ? (
                  <div className="py-8 text-center space-y-2 border border-white/[0.06] rounded-2xl bg-bg-elevated/20 p-6">
                    <History className="w-8 h-8 text-text-muted mx-auto opacity-50" />
                    <p className="text-xs font-semibold text-white">No Requests Yet</p>
                    <p className="text-[11px] text-text-muted max-w-xs mx-auto">
                      You have not submitted any custom title requests. Propose a missing title using the New Request tab.
                    </p>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setRequestModalTab("form")}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand-mint/15 border border-brand-mint/30 text-brand-mint text-xs font-semibold hover:bg-brand-mint/25 transition-all"
                      >
                        <Send className="w-3 h-3" />
                        Create a Request
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="max-h-72 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin">
                    {myRequests.map((req, idx) => {
                      const reqId = req.id || req._id || `req-${idx}`;
                      const status = (req.status || "pending").toLowerCase();
                      const dateFormatted = req.createdAt
                        ? new Date(req.createdAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "";

                      return (
                        <div
                          key={reqId}
                          className="p-3.5 rounded-2xl border border-white/[0.08] bg-bg-elevated/50 space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-0.5">
                              <p className="text-xs font-bold text-white tracking-tight">
                                {req.title}
                              </p>
                              <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
                                <Building2 className="w-3 h-3 text-brand-mint" />
                                <span>{req.departmentLabel || req.departmentId}</span>
                              </div>
                            </div>
                            <div>
                              {status === "approved" ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Approved
                                </span>
                              ) : status === "rejected" ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                                  <X className="w-3 h-3" />
                                  Rejected
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                  <Clock className="w-3 h-3" />
                                  Pending
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-text-muted pt-1 border-t border-white/[0.04]">
                            <span>Submitted: {dateFormatted || "Recent"}</span>
                            {req.reviewNote && (
                              <span
                                className="text-amber-200/80 italic truncate max-w-[200px]"
                                title={req.reviewNote}
                              >
                                Note: {req.reviewNote}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleCloseRequestModal}
                    className="px-4 py-2 rounded-xl border border-white/10 bg-white/[0.04] text-xs font-semibold text-text-secondary hover:text-white hover:bg-white/[0.08] transition-all"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
