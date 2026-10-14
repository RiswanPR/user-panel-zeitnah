import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  parseEducationDateSafe,
  isEducationOngoing,
  formatEducationDateRange,
  formatEducationDateForInput,
  inferAcademicDegreeLevel,
  extractAcademicHonors,
  validateEducationForm,
  sortEducationDescending,
  AEC_QUALIFICATION_SUGGESTIONS,
  AEC_FIELD_OF_STUDY_SUGGESTIONS,
} from "./educationAcademic.js";

describe("Academic Education & Timeline Utilities Regression Tests", () => {
  describe("1. Chronological Sorting (Most recent education first)", () => {
    it("sorts education descending by start date so newest degree appears first", () => {
      const records = [
        { id: "edu-1", qualification: "B.Tech", startDate: "2015-08-01", endDate: "2019-06-01" },
        { id: "edu-2", qualification: "M.Tech", startDate: "2020-09-01", endDate: "2022-07-01" },
        { id: "edu-3", qualification: "Higher Secondary", startDate: "2013-06-01", endDate: "2015-05-01" },
      ];

      const sorted = sortEducationDescending(records);
      assert.equal(sorted[0].qualification, "M.Tech");
      assert.equal(sorted[1].qualification, "B.Tech");
      assert.equal(sorted[2].qualification, "Higher Secondary");
    });

    it("places newly started ongoing study before older completed qualification", () => {
      const records = [
        { id: "edu-old", qualification: "B.Tech Civil", startDate: "2018-08-01", endDate: "2022-06-01" },
        { id: "edu-curr", qualification: "Ph.D. Geotechnical", startDate: "2023-01-15", currentlyStudying: true },
      ];

      const sorted = sortEducationDescending(records);
      assert.equal(sorted[0].qualification, "Ph.D. Geotechnical");
      assert.equal(sorted[1].qualification, "B.Tech Civil");
    });

    it("does not place an older ongoing study above a newer completed qualification", () => {
      // Start date is primary key
      const records = [
        { id: "edu-old-ongoing", qualification: "Part-time M.Sc", startDate: "2019-01-01", currentlyStudying: true },
        { id: "edu-new-cert", qualification: "PG Diploma in BIM", startDate: "2023-01-01", endDate: "2023-12-01" },
      ];

      const sorted = sortEducationDescending(records);
      assert.equal(sorted[0].qualification, "PG Diploma in BIM");
      assert.equal(sorted[1].qualification, "Part-time M.Sc");
    });

    it("ranks ongoing study above completed qualification when start dates are equal", () => {
      const records = [
        { id: "comp", qualification: "One-Year Diploma", startDate: "2022-08-01", endDate: "2023-08-01", currentlyStudying: false },
        { id: "ong", qualification: "Direct Ph.D.", startDate: "2022-08-01", endDate: null, currentlyStudying: true },
      ];

      const sorted = sortEducationDescending(records);
      assert.equal(sorted[0].id, "ong");
      assert.equal(sorted[1].id, "comp");
    });

    it("ranks later graduation date above earlier graduation date when start dates are equal", () => {
      const records = [
        { id: "3yr", qualification: "B.Sc", startDate: "2018-08-01", endDate: "2021-06-01" },
        { id: "5yr", qualification: "B.Arch", startDate: "2018-08-01", endDate: "2023-06-01" },
      ];

      const sorted = sortEducationDescending(records);
      assert.equal(sorted[0].id, "5yr");
      assert.equal(sorted[1].id, "3yr");
    });

    it("tie-breaks deterministically by stable ID when dates are identical", () => {
      const records = [
        { id: "bbb", qualification: "Cert B", startDate: "2021-01-01", endDate: "2021-12-01" },
        { id: "aaa", qualification: "Cert A", startDate: "2021-01-01", endDate: "2021-12-01" },
      ];

      const sorted = sortEducationDescending(records);
      assert.equal(sorted[0].id, "aaa");
      assert.equal(sorted[1].id, "bbb");
    });

    it("places undated records at the bottom deterministically", () => {
      const records = [
        { id: "undated-1", qualification: "Honorary Fellowship" },
        { id: "dated", qualification: "B.E. Civil", startDate: "2016-08-01" },
        { id: "undated-2", qualification: "Self-Study" },
      ];

      const sorted = sortEducationDescending(records);
      assert.equal(sorted[0].id, "dated");
      assert.equal(sorted[1].id, "undated-1");
      assert.equal(sorted[2].id, "undated-2");
    });

    it("guarantees immutability of input arrays", () => {
      const original = [
        { id: "1", startDate: "2010-01-01" },
        { id: "2", startDate: "2020-01-01" },
      ];
      const snapshot = JSON.stringify(original);
      const sorted = sortEducationDescending(original);

      assert.notEqual(sorted, original);
      assert.equal(JSON.stringify(original), snapshot);
    });
  });

  describe("2. Date Formatting & Timezone Safety", () => {
    it("parses YYYY-MM-DD in UTC without shifting days across timezones", () => {
      const epoch = parseEducationDateSafe("2022-08-15");
      assert.ok(epoch !== null);
      const d = new Date(epoch);
      assert.equal(d.getUTCFullYear(), 2022);
      assert.equal(d.getUTCMonth(), 7); // August is 7 (0-indexed)
      assert.equal(d.getUTCDate(), 15);
    });

    it("formats input date as YYYY-MM-DD safely", () => {
      assert.equal(formatEducationDateForInput("2021-09-01T00:00:00.000Z"), "2021-09-01");
      assert.equal(formatEducationDateForInput("2021-09-01"), "2021-09-01");
      assert.equal(formatEducationDateForInput(null), "");
      assert.equal(formatEducationDateForInput(undefined), "");
    });

    it("formats clean academic year ranges like 2018 — 2022 and 2021 — Present", () => {
      assert.equal(formatEducationDateRange("2018-08-01", "2022-06-01", false), "2018 — 2022");
      assert.equal(formatEducationDateRange("2021-09-01", null, true), "2021 — Present");
      assert.equal(formatEducationDateRange("2021-09-01", "", true), "2021 — Present");
      assert.equal(formatEducationDateRange("2021-09-01", "2025-05-01", true), "2021 — Present");
    });
  });

  describe("3. Academic Credential Level & Honors Inference", () => {
    it("infers Bachelor's Degree badge from common engineering qualifications", () => {
      assert.equal(inferAcademicDegreeLevel("B.Tech in Civil Engineering").level, "Bachelor's Degree");
      assert.equal(inferAcademicDegreeLevel("B.E. Mechanical").level, "Bachelor's Degree");
      assert.equal(inferAcademicDegreeLevel("B.Arch").level, "Bachelor's Degree");
      assert.equal(inferAcademicDegreeLevel("Bachelor of Science", "Quantity Surveying").level, "Bachelor's Degree");
    });

    it("infers Master's Degree badge from postgraduate qualifications", () => {
      assert.equal(inferAcademicDegreeLevel("M.Tech Structural Engineering").level, "Master's Degree");
      assert.equal(inferAcademicDegreeLevel("M.Sc in Construction Project Management").level, "Master's Degree");
      assert.equal(inferAcademicDegreeLevel("M.Plan", "Urban Planning").level, "Master's Degree");
    });

    it("infers Doctorate badge from research credentials", () => {
      assert.equal(inferAcademicDegreeLevel("Ph.D. in Geotechnical Engineering").level, "Doctorate");
      assert.equal(inferAcademicDegreeLevel("Doctor of Philosophy", "Civil Engineering").level, "Doctorate");
    });

    it("infers Diploma badge for technical polytechnics", () => {
      assert.equal(inferAcademicDegreeLevel("Diploma in Civil Engineering").level, "Diploma");
      assert.equal(inferAcademicDegreeLevel("Polytechnic Diploma").level, "Diploma");
    });

    it("extracts Grade, CGPA, and Honors from description text", () => {
      const res1 = extractAcademicHonors("CGPA: 8.9/10. Specialization in BIM and Bridge Design.");
      assert.equal(res1.grade, "CGPA: 8.9/10");

      const res2 = extractAcademicHonors("Graduated with First Class with Distinction. Top 5% of class.");
      assert.equal(res2.grade, "First Class with Distinction");

      const res3 = extractAcademicHonors("General coursework without explicit marks.");
      assert.equal(res3.grade, null);
    });
  });

  describe("4. Form Validation & Ongoing Study Behavior", () => {
    it("succeeds for ongoing study with valid start date and empty end date", () => {
      const form = {
        institution: "IIT Madras",
        qualification: "M.Tech Structural Engineering",
        startDate: "2023-08-01",
        endDate: "",
        currentlyStudying: true,
      };

      const res = validateEducationForm(form);
      assert.equal(res.valid, true);
      assert.deepEqual(res.errors, {});
    });

    it("rejects missing institution or qualification", () => {
      const res = validateEducationForm({
        institution: "",
        qualification: "",
        startDate: "2020-01-01",
      });

      assert.equal(res.valid, false);
      assert.ok(res.errors.institution);
      assert.ok(res.errors.qualification);
    });

    it("rejects end date earlier than start date for completed study", () => {
      const form = {
        institution: "National Institute of Technology",
        qualification: "B.Tech",
        startDate: "2022-08-01",
        endDate: "2020-05-01",
        currentlyStudying: false,
      };

      const res = validateEducationForm(form);
      assert.equal(res.valid, false);
      assert.equal(res.errors.endDate, "End date cannot be earlier than start date.");
    });
  });

  describe("5. AEC Suggestions Availability", () => {
    it("contains comprehensive AEC qualification and field of study suggestions", () => {
      assert.ok(AEC_QUALIFICATION_SUGGESTIONS.length >= 10);
      assert.ok(AEC_FIELD_OF_STUDY_SUGGESTIONS.length >= 10);
      assert.ok(AEC_QUALIFICATION_SUGGESTIONS.some((q) => q.includes("Civil")));
      assert.ok(AEC_QUALIFICATION_SUGGESTIONS.some((q) => q.includes("B.Arch")));
      assert.ok(AEC_QUALIFICATION_SUGGESTIONS.some((q) => q.includes("Structural")));
    });
  });

  describe("6. Static Component & Safety Integrity", () => {
    it("verifies EditProfile.jsx incorporates the Education & Academics redesign", async () => {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const { fileURLToPath } = await import("node:url");
      const __dirname = path.dirname(fileURLToPath(import.meta.url));
      const editProfilePath = path.resolve(__dirname, "../pages/profile/EditProfile.jsx");
      const content = fs.readFileSync(editProfilePath, "utf-8");

      // Header & subtitle
      assert.ok(content.includes("Education & Academics"), "Should contain redesigned header");
      assert.ok(
        content.includes("Academic qualifications, technical diplomas, and professional learning."),
        "Should contain redesigned subtitle"
      );

      // Empty state
      assert.ok(content.includes("Build your academic profile"), "Should contain redesigned empty state title");
      assert.ok(
        content.includes("Add your degrees, diplomas, and qualifications to showcase your educational journey."),
        "Should contain redesigned empty state subtitle"
      );

      // Ordering utility & deterministic sort
      assert.ok(content.includes("sortEducationDescending"), "Should import and use sortEducationDescending");
      assert.ok(content.includes("sortedEducations"), "Should compute sortedEducations");

      // Submission guard & duplicate prevention
      assert.ok(content.includes("isSavingEdu"), "Should compute isSavingEdu flag");
      assert.ok(content.includes("eduErrors"), "Should maintain eduErrors state for inline validation");

      // Nullifying endDate for ongoing studies
      assert.ok(content.includes("isOngoing ? null :"), "Should set endDate to null when ongoing");
    });

    it("verifies ProfileEducationSection.jsx uses chronological sorting and consistent header", async () => {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const { fileURLToPath } = await import("node:url");
      const __dirname = path.dirname(fileURLToPath(import.meta.url));
      const compPath = path.resolve(__dirname, "../components/profile/ProfileEducationSection.jsx");
      const content = fs.readFileSync(compPath, "utf-8");

      assert.ok(content.includes("sortEducationDescending"), "Should use sortEducationDescending");
      assert.ok(content.includes("Education & Academics"), "Should match header title");
      assert.ok(content.includes("Build your academic profile"), "Should match empty state title");
    });
  });
});

