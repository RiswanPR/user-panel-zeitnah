/**
 * Career Experience Timeline utilities for Zeitnah Profile Studio & Public Profile.
 * Provides deterministic chronological sorting (latest first) and safe date formatting.
 */

/**
 * Safely parses any date representation into UTC epoch milliseconds.
 * Prevents timezone-shifting bugs for YYYY-MM-DD strings.
 * Returns null for missing or invalid dates.
 */
export function parseExperienceDateSafe(dateVal) {
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

    // Support UK/EU/Commonwealth format: DD/MM/YYYY or DD-MM-YYYY
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
 * Checks if an experience entry is ongoing / current.
 */
export function isExperienceOngoing(exp) {
  if (!exp) return false;
  if (exp.currentlyActive || exp.isCurrent || exp.current) {
    return true;
  }
  const hasValidStart = parseExperienceDateSafe(exp.startDate) !== null;
  const hasNoEnd = exp.endDate === null || exp.endDate === undefined || exp.endDate === "";
  return hasValidStart && hasNoEnd;
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * Formats a single date into "Mon YYYY" in UTC to prevent timezone shifts.
 */
export function formatExperienceMonthYear(dateVal) {
  if (!dateVal) return null;
  if (typeof dateVal === "string") {
    const match = dateVal.trim().match(/^(\d{4})-(\d{1,2})/);
    if (match) {
      const year = match[1];
      const monthIdx = parseInt(match[2], 10) - 1;
      if (monthIdx >= 0 && monthIdx < 12) {
        return `${MONTH_NAMES[monthIdx]} ${year}`;
      }
    }
  }
  const epoch = parseExperienceDateSafe(dateVal);
  if (epoch === null) return null;
  const d = new Date(epoch);
  return `${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/**
 * Formats a date into "YYYY-MM-DD" suitable for HTML5 <input type="date">,
 * operating in UTC to prevent timezone shifts.
 */
export function formatExperienceDateForInput(dateVal) {
  if (!dateVal) return "";
  if (typeof dateVal === "string") {
    const match = dateVal.trim().match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }
  const epoch = parseExperienceDateSafe(dateVal);
  if (epoch === null) return "";
  const d = new Date(epoch);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Computes duration string (e.g. "1 yr 4 mos" or "2 yrs" or "8 mos").
 */
export function formatExperienceDuration(startDate, endDate, isOngoing) {
  const startEpoch = parseExperienceDateSafe(startDate);
  if (startEpoch === null) return "";

  const endEpoch = isOngoing
    ? Date.now()
    : parseExperienceDateSafe(endDate) || Date.now();

  const startDt = new Date(startEpoch);
  const endDt = new Date(endEpoch);

  const totalMonths =
    (endDt.getUTCFullYear() - startDt.getUTCFullYear()) * 12 +
    (endDt.getUTCMonth() - startDt.getUTCMonth()) +
    1;

  if (isNaN(totalMonths) || totalMonths <= 0) return "";

  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;

  if (years > 0 && months > 0) {
    return `${years} yr${years > 1 ? "s" : ""} ${months} mo${months > 1 ? "s" : ""}`;
  } else if (years > 0) {
    return `${years} yr${years > 1 ? "s" : ""}`;
  } else if (months > 0) {
    return `${months} mo${months > 1 ? "s" : ""}`;
  }
  return "< 1 mo";
}

/**
 * Returns a complete formatted date range with duration, e.g.
 * "Jan 2023 — Present · 1 yr 4 mos"
 */
export function formatExperienceDateRange(startDate, endDate, currentlyActive) {
  const ongoing = isExperienceOngoing({ startDate, endDate, currentlyActive });
  const startStr = formatExperienceMonthYear(startDate);

  if (!startStr) {
    if (endDate) {
      const endStr = formatExperienceMonthYear(endDate);
      return endStr ? `Ended ${endStr}` : "";
    }
    return ongoing ? "Present" : "";
  }

  const endStr = ongoing ? "Present" : formatExperienceMonthYear(endDate) || "Present";
  const durationStr = formatExperienceDuration(startDate, endDate, ongoing);

  return `${startStr} — ${endStr}${durationStr ? ` · ${durationStr}` : ""}`;
}

/**
 * Validates experience start and end dates.
 * Returns { valid: boolean, errors: { startDate?: string, endDate?: string } }
 */
export function validateExperienceDates(startDate, endDate, isOngoing) {
  const errors = {};
  const startEpoch = parseExperienceDateSafe(startDate);

  if (!startDate || startEpoch === null) {
    errors.startDate = "Valid start date is required.";
  }

  if (!isOngoing) {
    if (!endDate || endDate === "") {
      errors.endDate = "End date is required for past roles.";
    } else {
      const endEpoch = parseExperienceDateSafe(endDate);
      if (endEpoch === null) {
        errors.endDate = "End date must be a valid date.";
      } else if (startEpoch !== null && endEpoch < startEpoch) {
        errors.endDate = "End date cannot be earlier than start date.";
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Sorts an array of experiences descending by start date (latest first).
 * Does NOT mutate the input array.
 *
 * Rules:
 * 1. Primary sort key: startDate descending (most recent first).
 * 2. Ongoing role is treated as ending in Present, but startDate is the primary key.
 *    A newly started ongoing role (e.g. 2024) appears before an older ongoing role (e.g. 2022).
 * 3. Equal start dates tie-breaker:
 *    - Compare end dates descending: ongoing roles (Present / Infinity) sort before roles that ended.
 *    - If end dates are also equal, deterministic tie-break via stable ID (id / _id) then original index.
 * 4. Missing/invalid start dates:
 *    - Valid dated records always precede undated records.
 *    - Undated records preserve original stable order among themselves.
 */
export function sortExperienceDescending(experiences) {
  if (!Array.isArray(experiences) || experiences.length <= 1) {
    return Array.isArray(experiences) ? [...experiences] : [];
  }

  const decorated = experiences.map((item, index) => {
    const startEpoch = parseExperienceDateSafe(item?.startDate);
    const ongoing = isExperienceOngoing(item);
    const endEpoch = ongoing
      ? Number.POSITIVE_INFINITY
      : parseExperienceDateSafe(item?.endDate) ?? Number.NEGATIVE_INFINITY;

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
        return b.startEpoch - a.startEpoch; // Descending start date
      }
      // Equal start dates: tie-break by end date (ongoing/later end first)
      if (b.endEpoch !== a.endEpoch) {
        return b.endEpoch - a.endEpoch;
      }
      // Equal start and end: deterministic tie-break by ID
      if (a.id && b.id && a.id !== b.id) {
        return a.id.localeCompare(b.id);
      }
      // Fallback tie-break: stable original index
      return a.index - b.index;
    }

    // One has valid start date, other doesn't
    if (a.hasStart && !b.hasStart) return -1;
    if (!a.hasStart && b.hasStart) return 1;

    // Neither has a valid start date:
    // Place undated records after valid dated records, preserving stable original order among undated entries.
    return a.index - b.index;
  });

  return decorated.map((d) => d.item);
}

/**
 * Calculates exact calendar difference { years, months, days } between two UTC Date objects.
 * Expects startDt <= endDt.
 */
export function getCalendarDifference(startDt, endDt) {
  let years = endDt.getUTCFullYear() - startDt.getUTCFullYear();
  let months = endDt.getUTCMonth() - startDt.getUTCMonth();
  let days = endDt.getUTCDate() - startDt.getUTCDate();

  if (days < 0) {
    months -= 1;
    // Number of days in the month preceding endDt
    const prevMonthDays = new Date(
      Date.UTC(endDt.getUTCFullYear(), endDt.getUTCMonth(), 0)
    ).getUTCDate();
    days += prevMonthDays;
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  return {
    years: Math.max(0, years),
    months: Math.max(0, months),
    days: Math.max(0, days),
  };
}

/**
 * Calculates cumulative total professional experience from saved experience entries.
 *
 * Rules:
 * 1. Calculates total experience from the union of all valid employment periods (no double-counting).
 * 2. Current roles use today's date (or referenceDate) as their end date.
 * 3. Completed roles use their saved end dates (inclusive of the end date).
 * 4. Ignores invalid, missing, inverted, or future-only periods safely.
 * 5. Avoids double-counting when multiple current or past roles overlap.
 * 6. Consistent and explainable month/year rounding: residual days across disjoint periods
 *    round up to 1 month if >= 15 days, or down if < 15 days.
 * 7. Displays exact years and months (e.g. "13 Years 5 Months", "2 Years 6 Months", "8 Years").
 *    For senior careers (>= 20 years), displays clean milestone e.g. "24+ Years".
 */
export function calculateTotalExperience(experiences, referenceDate = new Date()) {
  const safeList = Array.isArray(experiences)
    ? experiences.filter((exp) => exp && typeof exp === "object")
    : [];

  const totalRoles = safeList.length;
  const currentRoles = safeList.filter((exp) => isExperienceOngoing(exp)).length;

  if (totalRoles === 0) {
    return {
      totalYears: 0,
      totalMonths: 0,
      allMonths: 0,
      formattedTotal: "0 Years",
      totalRoles: 0,
      currentRoles: 0,
    };
  }

  const refEpoch =
    referenceDate instanceof Date
      ? referenceDate.getTime()
      : (parseExperienceDateSafe(referenceDate) || Date.now());

  const intervals = [];

  for (const exp of safeList) {
    const startEpoch = parseExperienceDateSafe(exp.startDate);
    if (startEpoch === null) continue;

    const isOngoing = isExperienceOngoing(exp);
    let endEpoch;

    if (isOngoing) {
      endEpoch = refEpoch;
    } else {
      const parsedEnd = parseExperienceDateSafe(exp.endDate);
      if (parsedEnd === null) continue;
      // For completed roles, include the full end date (24h / next midnight), clamped to present
      endEpoch = Math.min(parsedEnd + 86400000, refEpoch);
    }

    if (startEpoch >= endEpoch) continue;
    // Skip future-only roles that have not yet started
    if (startEpoch >= refEpoch) continue;

    intervals.push([startEpoch, endEpoch]);
  }

  if (intervals.length === 0) {
    return {
      totalYears: 0,
      totalMonths: 0,
      allMonths: 0,
      formattedTotal: "0 Years",
      totalRoles,
      currentRoles,
    };
  }

  // Sort intervals by start ascending, then end descending
  intervals.sort((a, b) => {
    if (a[0] !== b[0]) return a[0] - b[0];
    return b[1] - a[1];
  });

  // Merge overlapping and contiguous intervals into disjoint periods
  const merged = [];
  for (const interval of intervals) {
    if (merged.length === 0) {
      merged.push([...interval]);
    } else {
      const last = merged[merged.length - 1];
      // If next interval starts before or at the end of last, merge
      if (interval[0] <= last[1]) {
        last[1] = Math.max(last[1], interval[1]);
      } else {
        merged.push([...interval]);
      }
    }
  }

  // Calculate calendar differences for each disjoint interval
  let rawYears = 0;
  let rawMonths = 0;
  let rawDays = 0;

  for (const [startMs, endMs] of merged) {
    const { years, months, days } = getCalendarDifference(new Date(startMs), new Date(endMs));
    rawYears += years;
    rawMonths += months;
    rawDays += days;
  }

  // Explainable rounding:
  // 1. Convert days into full months if >= 30.4375 days
  if (rawDays >= 30) {
    const extraFullMonths = Math.floor(rawDays / 30.4375);
    rawMonths += extraFullMonths;
    rawDays -= Math.round(extraFullMonths * 30.4375);
  }

  // 2. Round remaining days: >= 15 days rounds up to 1 month, < 15 days rounds down
  if (rawDays >= 15) {
    rawMonths += 1;
    rawDays = 0;
  }

  // 3. Roll 12 months into years
  let totalYears = rawYears + Math.floor(rawMonths / 12);
  let totalMonths = rawMonths % 12;
  const allMonths = totalYears * 12 + totalMonths;

  let formattedTotal = "0 Years";
  if (totalYears >= 20 && totalMonths === 0) {
    formattedTotal = `${totalYears}+ Years`;
  } else if (totalYears >= 20) {
    formattedTotal = `${totalYears}+ Years`;
  } else if (totalYears > 0 && totalMonths > 0) {
    formattedTotal = `${totalYears} Year${totalYears > 1 ? "s" : ""} ${totalMonths} Month${totalMonths > 1 ? "s" : ""}`;
  } else if (totalYears > 0) {
    formattedTotal = `${totalYears} Year${totalYears > 1 ? "s" : ""}`;
  } else if (totalMonths > 0) {
    formattedTotal = `${totalMonths} Month${totalMonths > 1 ? "s" : ""}`;
  } else if (rawDays > 0) {
    formattedTotal = "< 1 Month";
  }

  return {
    totalYears,
    totalMonths,
    allMonths,
    formattedTotal,
    totalRoles,
    currentRoles,
  };
}
