import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  parseCertificationDateSafe,
  getCertificationYear,
  formatCertificationDate,
  formatCertificationDateForInput,
  getCertificationExpirationStatus,
  formatCertificationDateRange,
  isCertificationVerified,
  validateCertificationForm,
  sortCertificationsDescending,
  AEC_CERTIFICATION_SUGGESTIONS,
  AEC_ISSUER_SUGGESTIONS,
} from "./certificationCredential.js";

describe("Certification & Credential Utilities Regression Tests", () => {
  describe("1. Chronological Sorting (Newest credentials first)", () => {
    it("sorts certifications descending by issue date", () => {
      const records = [
        { id: "cert-1", name: "Revit Prof", issueDate: "2020-05-01" },
        { id: "cert-2", name: "PMP", issueDate: "2023-08-15" },
        { id: "cert-3", name: "LEED AP", issueDate: "2021-11-20" },
      ];

      const sorted = sortCertificationsDescending(records);
      assert.equal(sorted[0].name, "PMP");
      assert.equal(sorted[1].name, "LEED AP");
      assert.equal(sorted[2].name, "Revit Prof");
    });

    it("places undated certifications at the end deterministically", () => {
      const records = [
        { id: "undated", name: "Special Award" },
        { id: "dated", name: "Chartered Engineer", issueDate: "2022-01-01" },
      ];

      const sorted = sortCertificationsDescending(records);
      assert.equal(sorted[0].id, "dated");
      assert.equal(sorted[1].id, "undated");
    });

    it("guarantees input array immutability", () => {
      const input = [
        { id: "a", issueDate: "2020-01-01" },
        { id: "b", issueDate: "2022-01-01" },
      ];
      const snapshot = JSON.stringify(input);
      const sorted = sortCertificationsDescending(input);

      assert.notEqual(sorted, input);
      assert.equal(JSON.stringify(input), snapshot);
    });
  });

  describe("2. Date Parsing & Input Formatting", () => {
    it("parses dates safely without UTC shifting", () => {
      const epoch = parseCertificationDateSafe("2023-06-15");
      assert.ok(epoch !== null);
      const d = new Date(epoch);
      assert.equal(d.getUTCFullYear(), 2023);
      assert.equal(d.getUTCMonth(), 5);
      assert.equal(d.getUTCDate(), 15);
    });

    it("formats input date as YYYY-MM-DD", () => {
      assert.equal(formatCertificationDateForInput("2023-06-15T12:00:00.000Z"), "2023-06-15");
      assert.equal(formatCertificationDateForInput("2023-06-15"), "2023-06-15");
      assert.equal(formatCertificationDateForInput(null), "");
      assert.equal(formatCertificationDateForInput(undefined), "");
    });

    it("extracts 4-digit UTC year safely", () => {
      assert.equal(getCertificationYear("2023-06-15"), "2023");
      assert.equal(getCertificationYear(null), null);
    });
  });

  describe("3. Expiration Status Calculation", () => {
    const fixedNow = new Date("2026-10-15T00:00:00.000Z");

    it("classifies lifetime credentials without expiration date as no_expiration", () => {
      const res = getCertificationExpirationStatus("2022-01-01", null, fixedNow);
      assert.equal(res.status, "no_expiration");
      assert.equal(res.label, "Lifetime Credential");
      assert.equal(res.isExpired, false);
      assert.equal(res.isActive, true);
    });

    it("classifies expired credentials correctly when expiration date is in the past", () => {
      const res = getCertificationExpirationStatus("2020-01-01", "2024-01-01", fixedNow);
      assert.equal(res.status, "expired");
      assert.equal(res.label, "Expired");
      assert.equal(res.isExpired, true);
      assert.equal(res.isActive, false);
    });

    it("classifies active credentials correctly when expiration is well in the future", () => {
      const res = getCertificationExpirationStatus("2024-01-01", "2028-01-01", fixedNow);
      assert.equal(res.status, "active");
      assert.equal(res.label, "Active");
      assert.equal(res.isExpired, false);
      assert.equal(res.isActive, true);
    });

    it("classifies expiring soon credentials when expiration is within 60 days", () => {
      // 30 days after Oct 15, 2026 is Nov 14, 2026
      const res = getCertificationExpirationStatus("2023-01-01", "2026-11-14", fixedNow);
      assert.equal(res.status, "expiring_soon");
      assert.ok(res.label.includes("Expiring Soon"));
      assert.equal(res.isExpired, false);
      assert.equal(res.isActive, true);
    });
  });

  describe("4. Date Range Formatting", () => {
    const fixedNow = new Date("2026-10-15T00:00:00.000Z");

    it("formats lifetime credential range cleanly", () => {
      assert.equal(
        formatCertificationDateRange("2022-08-01", null, fixedNow),
        "Issued Aug 2022 · No Expiration"
      );
    });

    it("formats active credential range cleanly", () => {
      assert.equal(
        formatCertificationDateRange("2024-05-01", "2027-05-01", fixedNow),
        "Issued May 2024 · Expires May 2027"
      );
    });

    it("formats expired credential range cleanly", () => {
      assert.equal(
        formatCertificationDateRange("2020-05-01", "2023-05-01", fixedNow),
        "Issued May 2020 · Expired May 2023"
      );
    });
  });

  describe("5. Verification Status", () => {
    it("recognizes verified status correctly", () => {
      assert.equal(isCertificationVerified({ verified: true }), true);
      assert.equal(isCertificationVerified({ isVerified: true }), true);
      assert.equal(isCertificationVerified({ status: "VERIFIED" }), true);
      assert.equal(isCertificationVerified({ status: "UNVERIFIED" }), false);
      assert.equal(isCertificationVerified({}), false);
      assert.equal(isCertificationVerified(null), false);
    });
  });

  describe("6. Form Validation", () => {
    it("succeeds for valid form with lifetime credential", () => {
      const res = validateCertificationForm({
        name: "Autodesk Revit Certified Professional",
        issuer: "Autodesk",
        issueDate: "2023-04-10",
        expirationDate: "",
        credentialId: "CERT-99881",
        credentialUrl: "https://www.autodesk.com/verify/123",
      });

      assert.equal(res.valid, true);
      assert.deepEqual(res.errors, {});
    });

    it("rejects missing required fields", () => {
      const res = validateCertificationForm({
        name: "",
        issuer: "",
        issueDate: "",
      });

      assert.equal(res.valid, false);
      assert.ok(res.errors.name);
      assert.ok(res.errors.issuer);
      assert.ok(res.errors.issueDate);
    });

    it("rejects expiration date earlier than issue date", () => {
      const res = validateCertificationForm({
        name: "PMP",
        issuer: "PMI",
        issueDate: "2024-01-01",
        expirationDate: "2022-01-01",
      });

      assert.equal(res.valid, false);
      assert.equal(res.errors.expirationDate, "Expiration date cannot be earlier than issue date.");
    });

    it("rejects malformed credential URL", () => {
      const res = validateCertificationForm({
        name: "PMP",
        issuer: "PMI",
        issueDate: "2024-01-01",
        credentialUrl: "not-a-valid-url",
      });

      assert.equal(res.valid, false);
      assert.ok(res.errors.credentialUrl);
    });
  });

  describe("7. AEC Suggestions", () => {
    it("provides curated suggestions for certifications and issuers", () => {
      assert.ok(AEC_CERTIFICATION_SUGGESTIONS.length >= 8);
      assert.ok(AEC_ISSUER_SUGGESTIONS.length >= 8);
      assert.ok(AEC_CERTIFICATION_SUGGESTIONS.some((s) => s.includes("Revit")));
      assert.ok(AEC_ISSUER_SUGGESTIONS.some((i) => i.includes("Autodesk")));
    });
  });

  describe("8. Static Component & Safety Integrity", () => {
    it("verifies EditProfile.jsx incorporates the Certifications redesign and safety guards", async () => {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const { fileURLToPath } = await import("node:url");
      const __dirname = path.dirname(fileURLToPath(import.meta.url));
      const editProfilePath = path.resolve(__dirname, "../pages/profile/EditProfile.jsx");
      const content = fs.readFileSync(editProfilePath, "utf-8");

      // Header & section numbering
      assert.ok(content.includes("Licenses & Certifications"), "Should contain redesigned header");
      assert.ok(content.includes("SECTION 06 OF 08"), "Should preserve section 06 numbering");
      assert.ok(content.includes("+15 XP"), "Should preserve +15 XP award");

      // Ordering utility & deterministic sort
      assert.ok(content.includes("sortCertificationsDescending"), "Should import and use sortCertificationsDescending");
      assert.ok(content.includes("sortedCertifications"), "Should compute sortedCertifications");

      // Expiration status & date ranges
      assert.ok(content.includes("getCertificationExpirationStatus"), "Should import and compute expiration status");
      assert.ok(content.includes("formatCertificationDateRange"), "Should format certification date range");

      // Submission guard & duplicate prevention
      assert.ok(content.includes("isSavingCert"), "Should compute isSavingCert flag");
      assert.ok(content.includes("certErrors"), "Should maintain certErrors state for inline validation");
      assert.ok(content.includes("validateCertificationForm"), "Should validate certification form");
    });

    it("verifies ProfileCertificationsSection.jsx uses chronological sorting and respects privacy", async () => {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const { fileURLToPath } = await import("node:url");
      const __dirname = path.dirname(fileURLToPath(import.meta.url));
      const compPath = path.resolve(__dirname, "../components/profile/ProfileCertificationsSection.jsx");
      const content = fs.readFileSync(compPath, "utf-8");

      assert.ok(content.includes("sortCertificationsDescending"), "Should use sortCertificationsDescending");
      assert.ok(content.includes("Licenses & Certifications"), "Should match header title");
      assert.ok(content.includes("getCertificationExpirationStatus"), "Should calculate expiration status");
      // Privacy check: credentialId only rendered when isOwner
      assert.ok(content.includes("isOwner && cert.credentialId"), "Should guard credentialId with isOwner for privacy");
    });
  });
});
