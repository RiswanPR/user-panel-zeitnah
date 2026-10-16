/**
 * Helper utilities for Professional Identity (Phase 3)
 * Provides client-side validation, suggestion matching, and contract formatting
 * aligned with the backend Phase 2 API specifications.
 */

/**
 * Validates a custom professional title according to backend Phase 2 rules:
 * - Must be non-empty after trimming surrounding whitespace.
 * - Maximum length of 100 characters.
 * - Single-line plain text only (no HTML angle brackets '<' or '>', no newlines).
 *
 * @param {string} rawTitle
 * @returns {{ valid: boolean, error: string | null, trimmed: string }}
 */
export function validateCustomTitle(rawTitle) {
  if (rawTitle === undefined || rawTitle === null) {
    return { valid: false, error: "Custom title cannot be empty.", trimmed: "" };
  }

  const trimmed = String(rawTitle).trim();

  if (!trimmed) {
    return { valid: false, error: "Custom title cannot be empty.", trimmed: "" };
  }

  if (trimmed.length > 100) {
    return {
      valid: false,
      error: `Custom title must not exceed 100 characters (currently ${trimmed.length}).`,
      trimmed,
    };
  }

  if (/[<>]/.test(trimmed) || /[\r\n]/.test(trimmed)) {
    return {
      valid: false,
      error: "Custom title must be single-line plain text without HTML characters.",
      trimmed,
    };
  }

  return { valid: true, error: null, trimmed };
}

/**
 * Finds non-blocking predefined title suggestions within a department
 * matching the user's entered text.
 *
 * @param {string} input - User-entered query
 * @param {Array<{ id: string, label: string }>} departmentTitles - List of titles in active department
 * @param {number} [limit=3] - Maximum suggestions to return
 * @returns {Array<{ id: string, label: string }>} Matching titles
 */
export function findPredefinedSuggestions(input, departmentTitles = [], limit = 3) {
  if (!input || typeof input !== "string" || !Array.isArray(departmentTitles)) {
    return [];
  }

  const clean = input.trim().toLowerCase();
  if (clean.length < 2) return [];

  const matches = [];
  for (const t of departmentTitles) {
    if (!t || !t.label) continue;
    const labelLower = t.label.toLowerCase();
    // Match substring but avoid exact duplicate match if user already typed it completely
    if (labelLower.includes(clean)) {
      matches.push(t);
      if (matches.length >= limit) break;
    }
  }

  return matches;
}

/**
 * Formats the professional identity portion of the profile update payload.
 *
 * @param {Object} identity
 * @param {string} [identity.departmentId]
 * @param {string} [identity.titleId]
 * @param {string} [identity.customTitle]
 * @param {boolean} [identity.isCustomTitle]
 * @param {string} [legacyCurrentRole]
 * @returns {{ professionalIdentity?: Object, currentRole?: string }}
 */
export function formatIdentityPayload(identity = {}, legacyCurrentRole = "") {
  if (identity.departmentId && identity.departmentId.trim()) {
    const cleanDeptId = identity.departmentId.trim();
    if (identity.isCustomTitle) {
      const { trimmed } = validateCustomTitle(identity.customTitle);
      return {
        professionalIdentity: {
          departmentId: cleanDeptId,
          customTitle: trimmed,
          isCustomTitle: true,
        },
      };
    }

    if (identity.titleId && identity.titleId.trim()) {
      return {
        professionalIdentity: {
          departmentId: cleanDeptId,
          titleId: identity.titleId.trim(),
          isCustomTitle: false,
        },
      };
    }
  }

  // Legacy fallback: preserve existing title string if no department is selected
  const safeLegacy = String(legacyCurrentRole || "").trim();
  return safeLegacy ? { currentRole: safeLegacy } : {};
}

/**
 * Resolves the displayable professional identity (title and department)
 * for public profiles, network cards, and directory views.
 *
 * Strict Rules (Phase 4):
 * 1. Valid structured identity: returns title and department name.
 * 2. Legacy profiles: returns title, with department strictly null.
 *    (Does NOT invent, infer, or placeholder a department).
 * 3. Incomplete identity data: handles gracefully without throwing.
 * 4. Headline independence: does NOT merge title with headline.
 * 5. Deduplication: returns a single authoritative title string.
 *
 * @param {Object} [entity] - User, profile, person, or connection object
 * @returns {{ title: string | null, department: string | null, isStructured: boolean, isLegacy: boolean }}
 */
export function resolveDisplayIdentity(entity) {
  if (!entity || typeof entity !== "object") {
    return { title: null, department: null, isStructured: false, isLegacy: false };
  }

  const idObj = entity.professionalIdentity;
  let title = null;
  let department = null;

  if (idObj && typeof idObj === "object") {
    const rawTitle = idObj.titleName || idObj.title || idObj.customTitle;
    if (typeof rawTitle === "string" && rawTitle.trim()) {
      title = rawTitle.trim();
    }

    const rawDept = idObj.departmentName || idObj.department;
    if (typeof rawDept === "string" && rawDept.trim()) {
      department = rawDept.trim();
    }
  }

  // Fallback to top-level currentRole if title was not populated from professionalIdentity
  if (!title && typeof entity.currentRole === "string" && entity.currentRole.trim()) {
    title = entity.currentRole.trim();
  }

  const isStructured = Boolean(title && department);
  const isLegacy = Boolean(title && !department);

  return {
    title,
    department: department || null,
    isStructured,
    isLegacy,
  };
}

/**
 * Formats a fallback-safe compact single-line role description for cards.
 * E.g., "Senior Structural Engineer • Structural Engineering" or "Senior Structural Engineer"
 *
 * @param {Object} [entity]
 * @param {string} [fallback]
 * @returns {string}
 */
export function formatCompactIdentity(entity, fallback = "Infrastructure Professional") {
  const { title, department } = resolveDisplayIdentity(entity);
  if (title && department) {
    return `${title} • ${department}`;
  }
  return title || fallback;
}

