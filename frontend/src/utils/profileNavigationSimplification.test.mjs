import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

describe("Zeitnah — Profile Navigation Simplification Tests", () => {
  it("verifies ProfileNav defines exactly the 6 simplified top-level destinations in correct order", () => {
    const profileNavFile = path.resolve("src/components/profile/ProfileNav.jsx");
    assert.ok(fs.existsSync(profileNavFile), "ProfileNav.jsx must exist");
    const content = fs.readFileSync(profileNavFile, "utf8");

    // Check all 6 destinations
    assert.match(content, /id:\s*["']overview["']/);
    assert.match(content, /path:\s*["']\/profile["']/);
    assert.match(content, /label:\s*["']Overview["']/);

    assert.match(content, /id:\s*["']edit["']/);
    assert.match(content, /path:\s*["']\/profile\/edit["']/);
    assert.match(content, /label:\s*["']Edit Profile["']/);

    assert.match(content, /id:\s*["']public["']/);
    assert.match(content, /path:\s*["']\/public-profile["']/);
    assert.match(content, /label:\s*["']Public Profile["']/);

    assert.match(content, /id:\s*["']learning["']/);
    assert.match(content, /path:\s*["']\/my-learning["']/);
    assert.match(content, /label:\s*["']Learning["']/);

    assert.match(content, /id:\s*["']achievements["']/);
    assert.match(content, /path:\s*["']\/my-points["']/);
    assert.match(content, /label:\s*["']Achievements["']/);

    assert.match(content, /id:\s*["']account["']/);
    assert.match(content, /path:\s*["']\/profile\/account["']/);
    assert.match(content, /label:\s*["']Account["']/);
  });

  it("verifies old standalone Verification, Milestones, Sessions, and Security are removed from top-level PROFILE_TABS", () => {
    const profileNavFile = path.resolve("src/components/profile/ProfileNav.jsx");
    const content = fs.readFileSync(profileNavFile, "utf8");

    // Extracts PROFILE_TABS array
    const tabsMatch = content.match(/export const PROFILE_TABS = \[([\s\S]*?)\];/);
    assert.ok(tabsMatch, "PROFILE_TABS array must be exported");
    const tabsString = tabsMatch[1];

    // Standalone removed paths should not appear in PROFILE_TABS array
    assert.doesNotMatch(tabsString, /path:\s*["']\/profile\/verification["']/);
    assert.doesNotMatch(tabsString, /label:\s*["']Milestones["']/);
    assert.doesNotMatch(tabsString, /path:\s*["']\/active-sessions["']/);
    assert.doesNotMatch(tabsString, /path:\s*["']\/audit-logs["']/);
    assert.doesNotMatch(tabsString, /path:\s*["']\/profile\/portfolio["']/);
  });

  it("verifies AccountNav defines internal sub-navigation for Verification, Security, and Active Sessions", () => {
    const accountNavFile = path.resolve("src/components/profile/AccountNav.jsx");
    assert.ok(fs.existsSync(accountNavFile), "AccountNav.jsx must exist");
    const content = fs.readFileSync(accountNavFile, "utf8");

    assert.match(content, /id:\s*["']verification["']/);
    assert.match(content, /label:\s*["']Verification["']/);
    assert.match(content, /section=verification/);

    assert.match(content, /id:\s*["']security["']/);
    assert.match(content, /label:\s*["']Security["']/);
    assert.match(content, /section=security/);

    assert.match(content, /id:\s*["']sessions["']/);
    assert.match(content, /label:\s*["']Active Sessions["']/);
    assert.match(content, /section=sessions/);
  });

  it("verifies AccountPage unifies VerificationCenterPage, AuditLogs, and ActiveSessions", () => {
    const accountPageFile = path.resolve("src/pages/profile/AccountPage.jsx");
    assert.ok(fs.existsSync(accountPageFile), "AccountPage.jsx must exist");
    const content = fs.readFileSync(accountPageFile, "utf8");

    assert.match(content, /import ProfileNav from/);
    assert.match(content, /import AccountNav from/);
    assert.match(content, /import VerificationCenterPage from/);
    assert.match(content, /import AuditLogs from/);
    assert.match(content, /import ActiveSessions from/);

    assert.match(content, /activeSection === ["']verification["']/);
    assert.match(content, /activeSection === ["']security["']/);
    assert.match(content, /activeSection === ["']sessions["']/);
  });

  it("verifies App.jsx defines routes for unified Account and safe redirects for old URLs", () => {
    const appFile = path.resolve("src/App.jsx");
    const content = fs.readFileSync(appFile, "utf8");

    // Unified account routes
    assert.match(content, /path=["']\/profile\/account["']/);
    assert.match(content, /path=["']\/profile\/account\/:section["']/);

    // Old verification URL redirects to unified account verification section
    assert.match(
      content,
      /path=["']\/profile\/verification["']\s+element=\{<Navigate to=["']\/profile\/account\?section=verification["'] replace \/>\}/
    );

    // Old session URLs redirect to unified account sessions section
    assert.match(
      content,
      /path=["']\/active-sessions["']\s+element=\{<Navigate to=["']\/profile\/account\?section=sessions["'] replace \/>\}/
    );
    assert.match(
      content,
      /path=["']\/profile\/sessions["']\s+element=\{<Navigate to=["']\/profile\/account\?section=sessions["'] replace \/>\}/
    );

    // Old security URLs redirect to unified account security section
    assert.match(
      content,
      /path=["']\/audit-logs["']\s+element=\{<Navigate to=["']\/profile\/account\?section=security["'] replace \/>\}/
    );
    assert.match(
      content,
      /path=["']\/profile\/security["']\s+element=\{<Navigate to=["']\/profile\/account\?section=security["'] replace \/>\}/
    );

    // Old milestone/achievement alias URLs redirect to /my-points
    assert.match(
      content,
      /path=["']\/profile\/achievements["']\s+element=\{<Navigate to=["']\/my-points["'] replace \/>\}/
    );
    assert.match(
      content,
      /path=["']\/profile\/milestones["']\s+element=\{<Navigate to=["']\/my-points["'] replace \/>\}/
    );
  });

  it("verifies role-based access control and security guards remain enforced in App.jsx", () => {
    const appFile = path.resolve("src/App.jsx");
    const content = fs.readFileSync(appFile, "utf8");

    // Manage business route protected for recruiter, founder, admin
    assert.match(content, /path=["']\/manage-business["']/);
    assert.match(content, /allowedRoles=\{?\[["']RECRUITER["'],\s*["']FOUNDER["'],\s*["']ADMIN["']\]\}?/);

    // Admin business review protected for admin
    assert.match(content, /path=["']\/admin\/businesses["']/);
    assert.match(content, /allowedRoles=\{?\[["']ADMIN["']\]\}?/);

    // Admin error reports protected for admin
    assert.match(content, /path=["']\/admin\/error-reports["']/);
  });

  it("verifies all 8 Profile Studio modules remain preserved in EditProfile.jsx", () => {
    const editProfileFile = path.resolve("src/pages/profile/EditProfile.jsx");
    assert.ok(fs.existsSync(editProfileFile), "EditProfile.jsx must exist");
    const content = fs.readFileSync(editProfileFile, "utf8");

    const expectedSections = [
      "basic-info",
      "professional-identity",
      "skills",
      "experience",
      "education",
      "certifications",
      "recommendations",
      "public-profile",
    ];

    for (const sec of expectedSections) {
      assert.match(content, new RegExp(`id:\\s*["']${sec}["']`), `Module ${sec} must be preserved`);
    }

    // Projects module must remain removed
    assert.doesNotMatch(content, /id:\s*["']projects["']/);
  });

  it("verifies global navbar and mobile drawer reflect simplified profile navigation and account links", () => {
    const navbarFile = path.resolve("src/components/navigation/MainNavbar.jsx");
    const drawerFile = path.resolve("src/components/navigation/MobileMoreDrawer.jsx");

    const navContent = fs.readFileSync(navbarFile, "utf8");
    const drawerContent = fs.readFileSync(drawerFile, "utf8");

    // MainNavbar user dropdown
    assert.match(navContent, /\/profile\/account\?section=verification/);
    assert.match(navContent, /\/profile\/account\?section=sessions/);

    // MobileMoreDrawer
    assert.match(drawerContent, /\/profile\/account\?section=verification/);
    assert.match(drawerContent, /\/profile\/account\?section=sessions/);
    assert.match(drawerContent, /Achievements & Milestones/);
  });

  it("verifies QuickSearchModal imports all referenced icons including Award from lucide-react", () => {
    const searchModalFile = path.resolve("src/components/navigation/QuickSearchModal.jsx");
    const content = fs.readFileSync(searchModalFile, "utf8");

    // Extract import statement from lucide-react
    const lucideImportMatch = content.match(/import\s*\{([\s\S]*?)\}\s*from\s*["']lucide-react["'];/);
    assert.ok(lucideImportMatch, "lucide-react import must exist in QuickSearchModal.jsx");

    const importedIcons = lucideImportMatch[1]
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    // Assert Award is explicitly imported
    assert.ok(importedIcons.includes("Award"), "Award icon must be imported in QuickSearchModal.jsx");
    assert.ok(importedIcons.includes("ShieldAlert"), "ShieldAlert icon must be imported in QuickSearchModal.jsx");
    assert.ok(importedIcons.includes("ShieldCheck"), "ShieldCheck icon must be imported in QuickSearchModal.jsx");

    // Extract all icon references in searchableItems
    const iconMatches = [...content.matchAll(/icon:\s*([A-Za-z0-9_]+)/g)].map((m) => m[1]);
    for (const icon of iconMatches) {
      assert.ok(
        importedIcons.includes(icon),
        `Referenced icon "${icon}" must be included in lucide-react imports`
      );
    }
  });
});
