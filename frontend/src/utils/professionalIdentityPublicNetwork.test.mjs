import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  resolveDisplayIdentity,
  formatCompactIdentity,
} from "./professionalIdentity.js";

describe("Zeitnah Professional Identity — Phase 4: Public Profile & Network Integration", () => {
  // ── 1. Structured Title and Department Resolution ──
  describe("1. Public profile displays a valid structured title and department", () => {
    it("correctly resolves a standard catalogue title and department", () => {
      const profile = {
        name: "Amina Al-Mansoor",
        username: "amina_bim",
        currentRole: "Lead BIM Coordinator",
        headline: "Driving digital twins across major rail corridors",
        professionalIdentity: {
          departmentId: "dept_bim_digital",
          departmentName: "BIM & Digital Engineering",
          titleId: "title_bim_coord",
          titleName: "Lead BIM Coordinator",
          isCustomTitle: false,
        },
      };

      const result = resolveDisplayIdentity(profile);
      assert.equal(result.title, "Lead BIM Coordinator");
      assert.equal(result.department, "BIM & Digital Engineering");
      assert.equal(result.isStructured, true);
      assert.equal(result.isLegacy, false);
    });

    it("correctly resolves a verified custom title and department", () => {
      const profile = {
        name: "Marcus Vance",
        username: "marcus_tunneling",
        currentRole: "Principal Mechanized Tunneling Specialist",
        headline: "Tunnel boring machine operations lead",
        professionalIdentity: {
          departmentId: "dept_geotechnical",
          departmentName: "Geotechnical & Tunnel Engineering",
          titleId: null,
          titleName: "Principal Mechanized Tunneling Specialist",
          isCustomTitle: true,
        },
      };

      const result = resolveDisplayIdentity(profile);
      assert.equal(result.title, "Principal Mechanized Tunneling Specialist");
      assert.equal(result.department, "Geotechnical & Tunnel Engineering");
      assert.equal(result.isStructured, true);
      assert.equal(result.isLegacy, false);
    });
  });

  // ── 2. Legacy Profile Fallback ──
  describe("2. Legacy profiles retain their existing title without an inferred department", () => {
    it("preserves legacy profile title with null department when professionalIdentity is absent", () => {
      const legacyUser = {
        name: "Legacy Civil Engineer",
        username: "legacy_civil",
        currentRole: "Senior Site Engineer",
        headline: "20 years on heavy civils",
      };

      const result = resolveDisplayIdentity(legacyUser);
      assert.equal(result.title, "Senior Site Engineer");
      assert.equal(result.department, null);
      assert.equal(result.isStructured, false);
      assert.equal(result.isLegacy, true);
    });

    it("does not invent, guess, or placeholder a department for legacy profiles with empty departmentName", () => {
      const legacyProjection = {
        name: "Old Profile",
        currentRole: "Civil Draftsman",
        professionalIdentity: {
          departmentId: null,
          departmentName: null,
          titleId: null,
          titleName: "Civil Draftsman",
          isCustomTitle: false,
          isLegacyTitle: true,
        },
      };

      const result = resolveDisplayIdentity(legacyProjection);
      assert.equal(result.title, "Civil Draftsman");
      assert.equal(result.department, null);
      assert.equal(result.isStructured, false);
      assert.equal(result.isLegacy, true);
    });

    it("handles whitespace-only department as null without crashing", () => {
      const profile = {
        currentRole: "Quantity Surveyor",
        professionalIdentity: {
          departmentId: "   ",
          departmentName: "    ",
          titleName: "Quantity Surveyor",
        },
      };

      const result = resolveDisplayIdentity(profile);
      assert.equal(result.title, "Quantity Surveyor");
      assert.equal(result.department, null);
      assert.equal(result.isStructured, false);
      assert.equal(result.isLegacy, true);
    });
  });

  // ── 3. Duplicate Title Rendering Avoidance ──
  describe("3. Duplicate title rendering is avoided", () => {
    it("returns single authoritative title when currentRole and professionalIdentity contain same value", () => {
      const profile = {
        currentRole: "Structural Design Engineer",
        professionalIdentity: {
          departmentId: "dept_structural",
          departmentName: "Structural Engineering",
          titleName: "Structural Design Engineer",
        },
      };

      const result = resolveDisplayIdentity(profile);
      assert.equal(result.title, "Structural Design Engineer");
      assert.equal(typeof result.title, "string");
    });

    it("verifies ProfileHero renders single title and avoids duplicate role blocks", () => {
      const heroPath = path.resolve("src/components/profile/ProfileHero.jsx");
      const content = fs.readFileSync(heroPath, "utf8");

      // Verify ProfileHero imports resolveDisplayIdentity
      assert.match(content, /import\s*\{\s*resolveDisplayIdentity\s*\}\s*from\s*["'][^"']*professionalIdentity["']/);

      // Verify displayTitle resolution
      assert.match(content, /displayTitle\s*=\s*displayIdentity\.title\s*\|\|\s*profile\.currentRole/);

      // Verify department badge is only conditionally rendered when displayIdentity.department exists
      assert.match(content, /displayIdentity\.department\s*&&/);
      assert.match(content, /data-testid=["']profile-department-badge["']/);
    });
  });

  // ── 4. Headline Independence ──
  describe("4. Headline remains independent from professional identity", () => {
    it("guarantees headline and title remain independent fields in identity resolution", () => {
      const profile = {
        headline: "Passionately building mega transport hubs across EMEA",
        currentRole: "Senior Project Director",
        professionalIdentity: {
          departmentId: "dept_pm",
          departmentName: "Project Management",
          titleName: "Senior Project Director",
        },
      };

      const result = resolveDisplayIdentity(profile);
      assert.equal(result.title, "Senior Project Director");
      assert.notEqual(result.title, profile.headline);
    });

    it("verifies ProfileHero keeps headline in separate dedicated paragraph above metadata row", () => {
      const heroPath = path.resolve("src/components/profile/ProfileHero.jsx");
      const content = fs.readFileSync(heroPath, "utf8");

      const headlineIndex = content.indexOf("{/* Professional Headline */}");
      const metadataIndex = content.indexOf("{/* Metadata Row:");

      assert.ok(headlineIndex > 0, "Professional Headline section must exist");
      assert.ok(metadataIndex > 0, "Metadata Row section must exist");
      assert.ok(headlineIndex < metadataIndex, "Headline section must precede metadata row");
    });
  });

  // ── 5. Network Cards Display Structured Identity ──
  describe("5. Network cards display the structured identity when available", () => {
    it("verifies InfrastructurePeopleCard imports and resolves structured identity", () => {
      const cardPath = path.resolve("src/components/network/InfrastructurePeopleCard.jsx");
      const content = fs.readFileSync(cardPath, "utf8");

      assert.match(content, /import\s*\{\s*resolveDisplayIdentity\s*\}\s*from\s*["'][^"']*professionalIdentity["']/);
      assert.match(content, /displayIdentity\s*=\s*resolveDisplayIdentity\(person\)/);
      assert.match(content, /data-testid=["']network-card-department["']/);
      assert.match(content, /displayIdentity\.department/);
    });

    it("verifies ConnectionCard imports and renders structured identity", () => {
      const cardPath = path.resolve("src/components/network/ConnectionCard.jsx");
      const content = fs.readFileSync(cardPath, "utf8");

      assert.match(content, /import\s*\{\s*resolveDisplayIdentity\s*\}\s*from\s*["'][^"']*professionalIdentity["']/);
      assert.match(content, /displayIdentity\s*=\s*resolveDisplayIdentity\(student\)/);
      assert.match(content, /data-testid=["']connection-card-department["']/);
    });

    it("verifies ConnectionRequestCard imports and renders structured identity", () => {
      const cardPath = path.resolve("src/components/network/ConnectionRequestCard.jsx");
      const content = fs.readFileSync(cardPath, "utf8");

      assert.match(content, /import\s*\{\s*resolveDisplayIdentity\s*\}\s*from\s*["'][^"']*professionalIdentity["']/);
      assert.match(content, /displayIdentity\s*=\s*resolveDisplayIdentity\(member\)/);
      assert.match(content, /data-testid=["']request-card-department["']/);
    });

    it("formatCompactIdentity formats single-line representation properly", () => {
      const structured = {
        professionalIdentity: {
          departmentName: "Environmental Engineering",
          titleName: "Hydrology Modeler",
        },
      };
      assert.equal(formatCompactIdentity(structured), "Hydrology Modeler • Environmental Engineering");

      const legacy = { currentRole: "Civil Drafter" };
      assert.equal(formatCompactIdentity(legacy), "Civil Drafter");

      const empty = {};
      assert.equal(formatCompactIdentity(empty, "Professional"), "Professional");
    });
  });

  // ── 6. Long Custom Titles Layout Safety ──
  describe("6. Long custom titles do not break intended layout logic", () => {
    it("handles maximum length (100 char) custom titles safely", () => {
      const longTitle = "A".repeat(100);
      assert.equal(longTitle.length, 100);

      const profile = {
        professionalIdentity: {
          departmentId: "dept_maint",
          departmentName: "Asset Maintenance",
          titleName: longTitle,
        },
      };

      const result = resolveDisplayIdentity(profile);
      assert.equal(result.title, longTitle);
    });

    it("verifies truncation and break-words classes prevent overflow in components", () => {
      const heroPath = path.resolve("src/components/profile/ProfileHero.jsx");
      const heroContent = fs.readFileSync(heroPath, "utf8");
      assert.match(heroContent, /break-words/);

      const peopleCardPath = path.resolve("src/components/network/InfrastructurePeopleCard.jsx");
      const peopleContent = fs.readFileSync(peopleCardPath, "utf8");
      assert.match(peopleContent, /truncate/);

      const connCardPath = path.resolve("src/components/network/ConnectionCard.jsx");
      const connContent = fs.readFileSync(connCardPath, "utf8");
      assert.match(connContent, /truncate/);
    });
  });

  // ── 7. Incomplete Identity Data Safety ──
  describe("7. Missing or incomplete identity data is handled safely", () => {
    it("handles null, undefined, empty object, and primitives without error", () => {
      assert.deepEqual(resolveDisplayIdentity(null), {
        title: null,
        department: null,
        isStructured: false,
        isLegacy: false,
      });

      assert.deepEqual(resolveDisplayIdentity(undefined), {
        title: null,
        department: null,
        isStructured: false,
        isLegacy: false,
      });

      assert.deepEqual(resolveDisplayIdentity({}), {
        title: null,
        department: null,
        isStructured: false,
        isLegacy: false,
      });

      assert.deepEqual(resolveDisplayIdentity("invalid string"), {
        title: null,
        department: null,
        isStructured: false,
        isLegacy: false,
      });
    });

    it("handles partial identity with department but missing title by falling back to currentRole", () => {
      const profile = {
        currentRole: "Bridge Inspector",
        professionalIdentity: {
          departmentId: "dept_bridges",
          departmentName: "Bridge Engineering",
          titleName: null,
        },
      };

      const result = resolveDisplayIdentity(profile);
      assert.equal(result.title, "Bridge Inspector");
      assert.equal(result.department, "Bridge Engineering");
      assert.equal(result.isStructured, true);
    });
  });

  // ── 8. Privacy, Visibility and Security Integrity ──
  describe("8. Private-profile and existing visibility behavior remains unchanged", () => {
    it("verifies backend network service enforces profileVisibility !== 'PRIVATE'", () => {
      const connServicePath = path.resolve("../backend/src/modules/network/services/network-connections.service.ts");
      const content = fs.readFileSync(connServicePath, "utf8");

      assert.match(content, /profileVisibility:\s*\{\s*\$ne:\s*['"]PRIVATE['"]\s*\}/);
      assert.match(content, /account_Status\.isDeleted/);
      assert.match(content, /account_Status\.isBlocked/);
    });

    it("verifies public profile page enforces privacy settings on sensitive sections", () => {
      const pagePath = path.resolve("src/pages/profile/PublicProfilePage.jsx");
      const content = fs.readFileSync(pagePath, "utf8");

      assert.match(content, /isFieldVisibleOnPublicProfile\(student\?\.privacySettings,\s*["']experience["']/);
      assert.match(content, /isFieldVisibleOnPublicProfile\(student\?\.privacySettings,\s*["']education["']/);
      assert.match(content, /isFieldVisibleOnPublicProfile\(student\?\.privacySettings,\s*["']projects["']/);
      assert.match(content, /isFieldVisibleOnPublicProfile\(student\?\.privacySettings,\s*["']certifications["']/);
    });
  });

  // ── 9. Existing Actions and Navigation Integrity ──
  describe("9. Existing network-card actions and public-profile behavior remain intact", () => {
    it("verifies InfrastructurePeopleCard preserves relationship actions, modals, and navigation", () => {
      const cardPath = path.resolve("src/components/network/InfrastructurePeopleCard.jsx");
      const content = fs.readFileSync(cardPath, "utf8");

      assert.match(content, /RelationshipAction/);
      assert.match(content, /onMessageRequest/);
      assert.match(content, /onPreview/);
      assert.match(content, /getCanonicalProfileUrl/);
    });

    it("verifies ConnectionRequestCard preserves Accept and Decline mutation triggers", () => {
      const cardPath = path.resolve("src/components/network/ConnectionRequestCard.jsx");
      const content = fs.readFileSync(cardPath, "utf8");

      assert.match(content, /onAccept/);
      assert.match(content, /onDecline/);
      assert.match(content, /onCancel/);
    });

    it("verifies PublicProfilePage preserves Back button and modal handlers", () => {
      const pagePath = path.resolve("src/pages/profile/PublicProfilePage.jsx");
      const content = fs.readFileSync(pagePath, "utf8");

      assert.match(content, /handleBack/);
      assert.match(content, /handleNativeShare/);
      assert.match(content, /onSendMessage/);
      assert.match(content, /onSendOpportunity/);
    });
  });

  // ── 10. Backward Compatibility with Older API Responses ──
  describe("10. Older API responses remain compatible where supported", () => {
    it("handles legacy user document from v1 database schema", () => {
      const v1User = {
        _id: "507f1f77bcf86cd799439011",
        name: "Historical User",
        username: "v1_user",
        currentRole: "Surveyor",
        course: [{ courseName: "Land Surveying" }],
        skills: ["CAD", "Total Station"],
      };

      const result = resolveDisplayIdentity(v1User);
      assert.equal(result.title, "Surveyor");
      assert.equal(result.department, null);
      assert.equal(result.isStructured, false);
      assert.equal(result.isLegacy, true);
    });

    it("handles user without currentRole or professionalIdentity without breaking", () => {
      const freshUser = {
        _id: "507f1f77bcf86cd799439012",
        name: "New Student",
        username: "fresh_user",
        headline: "Aspiring Civil Engineer",
      };

      const result = resolveDisplayIdentity(freshUser);
      assert.equal(result.title, null);
      assert.equal(result.department, null);
      assert.equal(result.isStructured, false);
      assert.equal(result.isLegacy, false);
    });
  });
});
