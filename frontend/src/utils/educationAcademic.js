/**
 * Academic Education utilities for Zeitnah Profile Studio & Public Profile.
 * Provides deterministic chronological sorting (latest first), academic credential
 * inference, safe date formatting, and validation for AEC qualifications.
 */

/**
 * Safely parses any date representation into UTC epoch milliseconds.
 * Prevents timezone-shifting bugs for YYYY-MM-DD and YYYY strings.
 * Returns null for missing or invalid dates.
 */
export function parseEducationDateSafe(dateVal) {
  if (dateVal === null || dateVal === undefined || dateVal === "") return null;
  if (typeof dateVal === "number" && !isNaN(dateVal)) return dateVal;

  if (typeof dateVal === "string") {
    const trimmed = dateVal.trim();
    if (!trimmed) return null;

    // Fast-path ISO format: YYYY-MM-DD or YYYY-MM or YYYY
    const isoMatch = trimmed.match(/^(\d{4})(?:-(\d{1,2})(?:-(\d{1,2}))?)?/);
    if (isoMatch) {
      const year = parseInt(isoMatch[1], 10);
      const month = isoMatch[2] ? parseInt(isoMatch[2], 10) - 1 : 0;
      const day = isoMatch[3] ? parseInt(isoMatch[3], 10) : 1;
      const d = new Date(Date.UTC(year, month, day));
      if (
        !isNaN(d.getTime()) &&
        d.getUTCFullYear() === year &&
        d.getUTCMonth() === month &&
        d.getUTCDate() === day
      ) {
        return d.getTime();
      }
      return null;
    }

    // Support DD/MM/YYYY or DD-MM-YYYY format
    const ddmmyyyyMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (ddmmyyyyMatch) {
      const day = parseInt(ddmmyyyyMatch[1], 10);
      const month = parseInt(ddmmyyyyMatch[2], 10) - 1;
      const year = parseInt(ddmmyyyyMatch[3], 10);
      const d = new Date(Date.UTC(year, month, day));
      if (
        !isNaN(d.getTime()) &&
        d.getUTCFullYear() === year &&
        d.getUTCMonth() === month &&
        d.getUTCDate() === day
      ) {
        return d.getTime();
      }
      return null;
    }
  }

  const d = new Date(dateVal);
  const t = d.getTime();
  return isNaN(t) ? null : t;
}

/**
 * Checks if an education entry is ongoing.
 */
export function isEducationOngoing(edu) {
  if (!edu) return false;
  if (Boolean(edu.currentlyStudying)) return true;
  const hasValidStart = parseEducationDateSafe(edu.startDate) !== null;
  const hasNoEnd = edu.endDate === null || edu.endDate === undefined || edu.endDate === "";
  return hasValidStart && hasNoEnd;
}

/**
 * Extracts the 4-digit year in UTC to avoid timezone shifts.
 */
export function getEducationYear(dateVal) {
  if (!dateVal) return null;
  if (typeof dateVal === "string") {
    const match = dateVal.trim().match(/^(\d{4})/);
    if (match) return match[1];
  }
  const epoch = parseEducationDateSafe(dateVal);
  if (epoch === null) return null;
  return String(new Date(epoch).getUTCFullYear());
}

/**
 * Formats start and end dates into clean academic ranges like:
 * "2019 — 2023" or "2021 — Present"
 */
export function formatEducationDateRange(startDate, endDate, currentlyStudying) {
  const ongoing = isEducationOngoing({ startDate, endDate, currentlyStudying });
  const startYear = getEducationYear(startDate);

  if (!startYear) {
    if (endDate) {
      const endYear = getEducationYear(endDate);
      return endYear ? `Graduated ${endYear}` : "";
    }
    return ongoing ? "Present" : "";
  }

  const endYear = ongoing ? "Present" : getEducationYear(endDate) || "Present";
  return `${startYear} — ${endYear}`;
}

/**
 * Formats any date value into YYYY-MM-DD for HTML5 date inputs in UTC.
 */
export function formatEducationDateForInput(dateVal) {
  if (!dateVal) return "";
  if (typeof dateVal === "string") {
    const trimmed = dateVal.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
  }
  const epoch = parseEducationDateSafe(dateVal);
  if (epoch === null) return "";
  const d = new Date(epoch);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Infers an academic credential badge based on qualification and field of study text.
 */
export function inferAcademicDegreeLevel(qualification = "", fieldOfStudy = "") {
  const text = `${qualification} ${fieldOfStudy}`.toLowerCase();

  if (/\b(ph\.?d|doctorate|doctor of philosophy|d\.?phil|d\.?eng)\b/.test(text)) {
    return { level: "Doctorate", badgeClass: "bg-purple-500/15 border-purple-500/30 text-purple-300" };
  }
  if (/\b(m\.?tech|m\.?s\b|m\.?sc|master|m\.?arch|m\.?plan|mba|m\.?eng|post\s*graduate)\b/.test(text)) {
    return { level: "Master's Degree", badgeClass: "bg-brand-mint/15 border-brand-mint/30 text-brand-mint" };
  }
  if (/\b(b\.?tech|b\.?e\.?\b|b\.?arch|b\.?sc|bachelor|b\.?plan|b\.?des|undergraduate)\b/.test(text)) {
    return { level: "Bachelor's Degree", badgeClass: "bg-sky-500/15 border-sky-500/30 text-sky-300" };
  }
  if (/\b(diploma|polytechnic|associate|hnd|vocational)\b/.test(text)) {
    return { level: "Diploma", badgeClass: "bg-amber-500/15 border-amber-500/30 text-amber-300" };
  }
  if (/\b(higher secondary|12th|high school|a-level|ib diploma|intermediate)\b/.test(text)) {
    return { level: "Higher Secondary", badgeClass: "bg-white/10 border-white/20 text-white/80" };
  }
  return { level: "Degree / Qualification", badgeClass: "bg-white/[0.06] border-white/10 text-white/90" };
}

/**
 * Extracts Grade, CGPA, or Honors details if present in the description.
 */
export function extractAcademicHonors(description = "") {
  if (!description || typeof description !== "string") {
    return { grade: null, cleanText: "" };
  }

  const trimmed = description.trim();
  // Match patterns like: CGPA: 8.9/10, GPA: 3.8/4.0, Grade: First Class, 88.5%, Distinction, etc.
  const gradeMatch = trimmed.match(
    /\b(cgpa\s*[:=-]?\s*[\d.]+(?:\s*\/\s*10)?|gpa\s*[:=-]?\s*[\d.]+(?:\s*\/\s*4(?:\.0)?)?|grade\s*[:=-]?\s*[A-Za-z0-9+]+|first class with distinction|first class honors|magna cum laude|summa cum laude|gold medalist|[\d.]+\s*%(?:\s*marks)?)\b/i
  );

  return {
    grade: gradeMatch ? gradeMatch[0].trim() : null,
    cleanText: trimmed,
  };
}

/**
 * Validates education form input.
 * Returns { valid: boolean, errors: Record<string, string> }
 */
export function validateEducationForm(form = {}) {
  const errors = {};

  const institution = (form.institution || "").trim();
  if (!institution) {
    errors.institution = "Institution / University name is required.";
  } else if (institution.length > 120) {
    errors.institution = "Institution name must not exceed 120 characters.";
  }

  const qualification = (form.qualification || "").trim();
  if (!qualification) {
    errors.qualification = "Qualification or degree title is required.";
  } else if (qualification.length > 100) {
    errors.qualification = "Qualification title must not exceed 100 characters.";
  }

  const fieldOfStudy = (form.fieldOfStudy || "").trim();
  if (fieldOfStudy.length > 100) {
    errors.fieldOfStudy = "Field of study must not exceed 100 characters.";
  }

  const startEpoch = parseEducationDateSafe(form.startDate);
  if (!form.startDate || startEpoch === null) {
    errors.startDate = "Valid start date is required.";
  }

  const isOngoing = Boolean(form.currentlyStudying);
  if (!isOngoing && form.endDate && form.endDate !== "") {
    const endEpoch = parseEducationDateSafe(form.endDate);
    if (endEpoch === null) {
      errors.endDate = "End date must be a valid date.";
    } else if (startEpoch !== null && endEpoch < startEpoch) {
      errors.endDate = "End date cannot be earlier than start date.";
    }
  }

  const description = (form.description || "").trim();
  if (description.length > 1000) {
    errors.description = "Description must not exceed 1000 characters.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Sorts an array of education records descending by start date (latest first).
 * Does NOT mutate the input array.
 *
 * Rules:
 * 1. Primary sort key: startDate descending (most recently started first).
 * 2. Ongoing study (currentlyStudying: true) treated as Present.
 *    If start dates are equal, ongoing study sorts before completed qualification.
 * 3. Equal start dates: compare end date descending.
 * 4. Deterministic tie-breaking by ID then original index.
 * 5. Undated records sort last deterministically.
 */
export function sortEducationDescending(educationList) {
  if (!Array.isArray(educationList) || educationList.length <= 1) {
    return Array.isArray(educationList) ? [...educationList] : [];
  }

  const decorated = educationList.map((item, index) => {
    const startEpoch = parseEducationDateSafe(item?.startDate);
    const ongoing = isEducationOngoing(item);
    const endEpoch = ongoing
      ? Number.POSITIVE_INFINITY
      : parseEducationDateSafe(item?.endDate) ?? Number.NEGATIVE_INFINITY;

    const id = String(item?.id || item?._id || "");

    return {
      item,
      index,
      id,
      hasStart: startEpoch !== null,
      startEpoch: startEpoch ?? Number.NEGATIVE_INFINITY,
      hasEnd: ongoing || endEpoch !== Number.NEGATIVE_INFINITY,
      endEpoch,
      ongoing,
    };
  });

  decorated.sort((a, b) => {
    // Both have valid start dates
    if (a.hasStart && b.hasStart) {
      if (b.startEpoch !== a.startEpoch) {
        return b.startEpoch - a.startEpoch;
      }

      // Equal start date: ongoing study comes first
      if (a.ongoing && !b.ongoing) return -1;
      if (!a.ongoing && b.ongoing) return 1;

      // Both ongoing or both completed: later end date first
      if (b.endEpoch !== a.endEpoch) {
        return b.endEpoch - a.endEpoch;
      }

      // Deterministic tie break by ID
      if (a.id && b.id && a.id !== b.id) {
        return a.id.localeCompare(b.id);
      }

      // Stable original index fallback
      return a.index - b.index;
    }

    // Dated records precede undated records
    if (a.hasStart && !b.hasStart) return -1;
    if (!a.hasStart && b.hasStart) return 1;

    // Both missing start dates: check if one is ongoing
    if (a.ongoing && !b.ongoing) return -1;
    if (!a.ongoing && b.ongoing) return 1;

    // Preserve stable original order
    return a.index - b.index;
  });

  return decorated.map((d) => d.item);
}

/**
 * Curated Architecture, Engineering, and Construction (AEC) qualification suggestions.
 */
export const AEC_QUALIFICATION_SUGGESTIONS = [
  "B.Tech Civil Engineering",
  "B.Arch (Bachelor of Architecture)",
  "M.Tech Structural Engineering",
  "M.Plan (Urban & Regional Planning)",
  "Diploma in Civil Engineering",
  "M.Sc Construction Project Management",
  "B.Sc Quantity Surveying & Cost Estimation",
  "M.Tech Geotechnical Engineering",
  "B.Tech Transportation & Highway Engineering",
  "PG Diploma in BIM & Digital Engineering",
  "B.E. Mechanical (Building Services / HVAC)",
  "B.E. Electrical (Power & Lighting Systems)",
];

/**
 * Curated AEC Field of Study suggestions.
 */
export const AEC_FIELD_OF_STUDY_SUGGESTIONS = [
  "Civil Infrastructure & Structural Design",
  "Architecture & Sustainable Design",
  "Construction Project Management",
  "Transportation & Highway Engineering",
  "Geotechnical & Foundation Engineering",
  "Building Information Modeling (BIM)",
  "Urban & Regional Planning",
  "Water Resources & Environmental Engineering",
  "Quantity Surveying & Commercial Management",
  "MEP & Building Services Engineering",
];
