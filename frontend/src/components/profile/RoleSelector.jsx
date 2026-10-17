import { GraduationCap, Briefcase, Compass, Search, Rocket, ShieldCheck, Lock } from "lucide-react";
import { USER_SELECTABLE_ROLES } from "../../constants/infrastructureTaxonomy";
import { normalizeUserRole } from "../../utils/roleNavigation";

const ROLE_ICONS = {
  STUDENT: GraduationCap,
  PROFESSIONAL: Briefcase,
  MENTOR: Compass,
  RECRUITER: Search,
  FOUNDER: Rocket,
};

export default function RoleSelector({
  value = "STUDENT",
  onChange,
  isAssignedEducator = false,
  disabled = false,
}) {
  const normalizedValue = normalizeUserRole(value);
  const rawRole = (typeof value === "string" ? value : value?.primaryRole || value?.role || "").trim().toUpperCase();

  // If the user already has the Educator role assigned by an admin:
  if (isAssignedEducator || normalizedValue === "EDUCATOR") {
    return (
      <div className="space-y-3">
        <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary">
          Profile Role
        </label>
        <div className="p-4 sm:p-5 rounded-2xl border border-blue-500/30 bg-blue-500/10 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-text-muted">Role:</span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-500/30 shadow-sm">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-300" />
              Educator ✓
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] text-blue-200/70 bg-surface-elevated px-2 py-0.5 rounded-md border border-border">
              <Lock className="w-3 h-3" /> Locked
            </span>
          </div>
          <p className="text-xs text-blue-200/90 leading-relaxed">
            This role was assigned by an administrator. The role cannot be changed by the user.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary">
          Choose your role <span className="text-brand-mint">*</span>
        </label>
        <span className="text-[11px] text-text-muted">Infrastructure Identity</span>
      </div>

      {(rawRole === "MENTOR" || rawRole === "FOUNDER") && (
        <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-start gap-2.5">
          <Compass className="w-4 h-4 text-purple-300 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-purple-200">
              Standardized Role: {normalizedValue === "PROFESSIONAL" ? "Professional" : "Recruiter"}
            </p>
            <p className="text-[11px] text-purple-300/80">
              Your legacy {rawRole.toLowerCase()} role is canonically mapped to {normalizedValue.toLowerCase()}. Mentorship capabilities and organization management permissions remain fully preserved.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {USER_SELECTABLE_ROLES.map((role) => {
          const Icon = ROLE_ICONS[role.value] || Briefcase;
          const isSelected = normalizedValue === role.value;

          return (
            <button
              key={role.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(role.value)}
              className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 min-h-[44px] ${
                isSelected
                  ? "border-brand-mint bg-brand-mint/10 text-text-primary shadow-[0_0_20px_rgba(159,213,178,0.12)] ring-1 ring-brand-mint/40"
                  : "border-border bg-surface-elevated/40 hover:bg-surface-elevated text-text-muted hover:text-text-primary"
              } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  isSelected
                    ? "bg-brand-mint/20 text-brand-mint"
                    : "bg-surface-elevated text-text-faint border border-border"
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className={`text-xs font-bold ${isSelected ? "text-text-primary" : "text-text-primary/90"}`}>
                    {role.label}
                  </span>
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                      isSelected ? "border-brand-mint bg-brand-mint" : "border-border"
                    }`}
                  >
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-page-bg" />}
                  </div>
                </div>
                <p className="text-[11px] text-text-muted mt-1 leading-snug">
                  {role.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Educator Admin Notice */}
      <div className="p-3.5 rounded-xl bg-surface-elevated/30 border border-border text-xs text-text-muted flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-brand-mint/70 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-semibold text-text-secondary">
            Educator role
          </p>
          <p className="text-[11px] text-text-muted">
            Assigned by Zeitnah administrators. Contact support or your institution lead for educator verification.
          </p>
        </div>
      </div>
    </div>
  );
}
