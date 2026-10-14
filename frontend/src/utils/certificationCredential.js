/**
 * Professional Certification & Credential utilities for Zeitnah Profile Studio & Public Profile.
 * Provides deterministic chronological sorting (latest first), expiration status computation,
 * safe date formatting, validation, and curated AEC credential taxonomies.
 */

/**
 * Safely parses any date representation into UTC epoch milliseconds.
 * Prevents timezone-shifting bugs for YYYY-MM-DD and YYYY strings.
 * Returns null for missing or invalid dates.
 */
export function parseCertificationDateSafe(dateVal) {
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
 * Extracts the 4-digit year in UTC.
 */
export function getCertificationYear(dateVal) {
  if (!dateVal) return null;
  if (typeof dateVal === "string") {
    const match = dateVal.trim().match(/^(\d{4})/);
    if (match) return match[1];
  }
  const epoch = parseCertificationDateSafe(dateVal);
  if (epoch === null) return null;
  return String(new Date(epoch).getUTCFullYear());
}

/**
 * Formats date into a compact, professional representation like "Aug 2023" or "2023".
 */
export function formatCertificationDate(dateVal) {
  const epoch = parseCertificationDateSafe(dateVal);
  if (epoch === null) return "";
  const d = new Date(epoch);
  return d.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Formats any date value into YYYY-MM-DD for HTML5 date inputs in UTC.
 */
export function formatCertificationDateForInput(dateVal) {
  if (!dateVal) return "";
  if (typeof dateVal === "string") {
    const trimmed = dateVal.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
  }
  const epoch = parseCertificationDateSafe(dateVal);
  if (epoch === null) return "";
  const d = new Date(epoch);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Calculates expiration status based on stored issue & expiration dates.
 * Does NOT label credentials verified merely because a link exists.
 *
 * Statuses:
 * - 'no_expiration': credential has no expiration date (Lifetime).
 * - 'expired': expirationDate < now.
 * - 'expiring_soon': expirationDate is within 60 days of now.
 * - 'active': expirationDate >= now.
 * - 'invalid': unparseable issue date.
 */
export function getCertificationExpirationStatus(issueDate, expirationDate, referenceDate = new Date()) {
  const issueEpoch = parseCertificationDateSafe(issueDate);
  if (issueEpoch === null) {
    return {
      status: "unknown",
      label: "Credential",
      badgeClass: "bg-white/[0.04] text-text-muted border-white/[0.08]",
      isExpired: false,
      isActive: true,
    };
  }

  const expEpoch = parseCertificationDateSafe(expirationDate);
  if (expEpoch === null) {
    return {
      status: "no_expiration",
      label: "Lifetime Credential",
      badgeClass: "bg-brand-mint/10 border-brand-mint/25 text-brand-mint",
      isExpired: false,
      isActive: true,
    };
  }

  const refEpoch = referenceDate instanceof Date ? referenceDate.getTime() : Date.now();
  const diffDays = Math.ceil((expEpoch - refEpoch) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      status: "expired",
      label: "Expired",
      badgeClass: "bg-red-500/10 border-red-500/25 text-red-400",
      isExpired: true,
      isActive: false,
    };
  }

  if (diffDays <= 60) {
    return {
      status: "expiring_soon",
      label: `Expiring Soon (${diffDays}d)`,
      badgeClass: "bg-amber-500/10 border-amber-500/25 text-amber-300",
      isExpired: false,
      isActive: true,
    };
  }

  return {
    status: "active",
    label: "Active",
    badgeClass: "bg-brand-mint/10 border-brand-mint/25 text-brand-mint",
    isExpired: false,
    isActive: true,
  };
}

/**
 * Formats issue and expiration dates into a clean presentation string:
 * e.g. "Issued Aug 2022 · No Expiration"
 *      "Issued Aug 2022 · Expires Aug 2025"
 *      "Issued Aug 2019 · Expired Aug 2022"
 */
export function formatCertificationDateRange(issueDate, expirationDate, referenceDate = new Date()) {
  const issued = formatCertificationDate(issueDate);
  if (!issued) return "";

  if (!expirationDate) {
    return `Issued ${issued} · No Expiration`;
  }

  const expEpoch = parseCertificationDateSafe(expirationDate);
  if (expEpoch === null) {
    return `Issued ${issued}`;
  }

  const exp = formatCertificationDate(expirationDate);
  const statusInfo = getCertificationExpirationStatus(issueDate, expirationDate, referenceDate);

  if (statusInfo.isExpired) {
    return `Issued ${issued} · Expired ${exp}`;
  }

  return `Issued ${issued} · Expires ${exp}`;
}

/**
 * Checks if a certification has verified status from the database contract.
 * Respects existing verification status without inventing new rules.
 */
export function isCertificationVerified(cert) {
  if (!cert) return false;
  if (typeof cert.verified === "boolean") return cert.verified;
  if (typeof cert.isVerified === "boolean") return cert.isVerified;
  if (typeof cert.status === "string") return cert.status.toUpperCase() === "VERIFIED";
  return false;
}

/**
 * Validates certification form fields.
 * Returns { valid: boolean, errors: Record<string, string> }
 */
export function validateCertificationForm(form = {}) {
  const errors = {};

  const name = (form.name || "").trim();
  if (!name) {
    errors.name = "Certificate / Credential name is required.";
  } else if (name.length > 120) {
    errors.name = "Certificate name must not exceed 120 characters.";
  }

  const issuer = (form.issuer || "").trim();
  if (!issuer) {
    errors.issuer = "Issuing organization is required.";
  } else if (issuer.length > 120) {
    errors.issuer = "Issuer must not exceed 120 characters.";
  }

  const issueEpoch = parseCertificationDateSafe(form.issueDate);
  if (!form.issueDate || issueEpoch === null) {
    errors.issueDate = "Valid issue date is required.";
  }

  if (form.expirationDate && form.expirationDate !== "") {
    const expEpoch = parseCertificationDateSafe(form.expirationDate);
    if (expEpoch === null) {
      errors.expirationDate = "Expiration date must be a valid date.";
    } else if (issueEpoch !== null && expEpoch < issueEpoch) {
      errors.expirationDate = "Expiration date cannot be earlier than issue date.";
    }
  }

  const credentialId = (form.credentialId || "").trim();
  if (credentialId.length > 100) {
    errors.credentialId = "Credential ID must not exceed 100 characters.";
  }

  const credentialUrl = (form.credentialUrl || "").trim();
  if (credentialUrl) {
    if (credentialUrl.length > 500) {
      errors.credentialUrl = "Credential URL must not exceed 500 characters.";
    } else if (!/^https?:\/\/[^\s$.?#].[^\s]*$/i.test(credentialUrl)) {
      errors.credentialUrl = "Please provide a valid URL starting with http:// or https://";
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Sorts an array of certification records descending by issue date (latest first).
 * Does NOT mutate the input array.
 */
export function sortCertificationsDescending(certList) {
  if (!Array.isArray(certList) || certList.length <= 1) {
    return Array.isArray(certList) ? [...certList] : [];
  }

  const decorated = certList.map((item, index) => {
    const issueEpoch = parseCertificationDateSafe(item?.issueDate);
    const id = String(item?.id || item?._id || "");

    return {
      item,
      index,
      id,
      hasIssueDate: issueEpoch !== null,
      issueEpoch: issueEpoch ?? Number.NEGATIVE_INFINITY,
    };
  });

  decorated.sort((a, b) => {
    // Both have valid issue dates
    if (a.hasIssueDate && b.hasIssueDate) {
      if (b.issueEpoch !== a.issueEpoch) {
        return b.issueEpoch - a.issueEpoch;
      }
      // Stable ID tie break
      if (a.id && b.id && a.id !== b.id) {
        return a.id.localeCompare(b.id);
      }
      return a.index - b.index;
    }

    // Dated precedes undated
    if (a.hasIssueDate && !b.hasIssueDate) return -1;
    if (!a.hasIssueDate && b.hasIssueDate) return 1;

    return a.index - b.index;
  });

  return decorated.map((d) => d.item);
}

/**
 * Curated AEC Certificate Suggestions.
 */
export const AEC_CERTIFICATION_SUGGESTIONS = [
  "Autodesk Certified Professional: Revit for Structural Design",
  "Autodesk Certified Professional: Revit for Architectural Design",
  "Project Management Professional (PMP)®",
  "LEED Green Associate / AP BD+C",
  "Chartered Engineer (CEng) — ICE / IStructE",
  "BIM Project Manager (ISO 19650 Compliance)",
  "FIDIC Certified Contract Manager",
  "Primavera P6 Enterprise Professional",
  "BREEAM International New Construction Assessor",
  "NEBOSH International General Certificate (Safety)",
  "Certified Cost Professional (CCP) — AACE",
  "WELL Accredited Professional (WELL AP)",
];

/**
 * Curated AEC Issuing Organization Suggestions.
 */
export const AEC_ISSUER_SUGGESTIONS = [
  "Autodesk",
  "Project Management Institute (PMI)",
  "U.S. Green Building Council (USGBC)",
  "Institution of Civil Engineers (ICE)",
  "Engineering Council UK",
  "BSI Group (British Standards Institution)",
  "Oracle Construction and Engineering",
  "AACE International",
  "NEBOSH",
  "Royal Institution of Chartered Surveyors (RICS)",
  "International Federation of Consulting Engineers (FIDIC)",
  "National Institute of Building Sciences",
];
