# ZEITNAH — PROFILE & ROLE ARCHITECTURE REPORT

**Document ID:** `ZEITNAH-PROFILE-ROLE-AUDIT-2026`  
**Platform:** Zeitnah AEC HUB
**Subsystems:** Identity, Role Taxonomy, Profile Engine, Privacy Matrix & Verification Center  
**Date:** September 30, 2026  
**Status:** FULL PRODUCTION SPECIFICATION  

---

## 1. Executive Summary

In the **Zeitnah AEC HUB**, **Profile** and **Role** represent the foundational pillars of identity, access control, and user experience. Unlike generic social or enterprise platforms, Zeitnah is an **engineered infrastructure network** built specifically for Civil, Structural, BIM, MEP, Architecture, and Construction disciplines.

This report provides an in-depth breakdown of:
1. **The Role Taxonomy & Authorization Matrix** (Student, Professional, Mentor, Recruiter, Founder, Educator, Admin).
2. **Backend Role Governance & Security Enforcement** (Self-service vs. Admin-assigned roles, immutability rules).
3. **The Profile Subsystem Architecture** (Overview, Editor, Public Showcase, Engineering Portfolio, Verification Center).
4. **Privacy & Granular Visibility Controls** (Public, Network Only, Private).
5. **The Fundamental Distinction: Role vs. Verification** (Why functional identity $\ne$ trust tier).
6. **Navigation & Platform Feature Integration** (How role dictates primary and mobile navigation).

---

## 2. Platform Role Taxonomy & Ecosystem Matrix

Zeitnah categorizes all ecosystem participants into **7 standardized roles**, stored in `user.primaryRole` (normalized to UPPERCASE):

```
                                  ZEITNAH ECOSYSTEM
                                          │
       ┌──────────────────────────────────┴──────────────────────────────────┐
       ▼                                                                     ▼
[ USER-SELECTABLE ROLES ]                                          [ GOVERNED ROLES ]
  ├── STUDENT (Base Learner)                                         ├── EDUCATOR (Admin Assigned)
  ├── PROFESSIONAL (AEC Practitioner)                                └── ADMIN (Platform Governance)
  ├── MENTOR (Industry Guide)
  ├── RECRUITER (Talent Acquisition)
  └── FOUNDER (Enterprise Creator)
```

| Role | Target Persona | Selection Method | Primary Career Nav | Key Platform Capabilities |
| :--- | :--- | :---: | :---: | :--- |
| **`STUDENT`** | Enrolled in civil, structural, BIM, architecture, or surveying education. | Self-Selectable *(Default)* | **`Jobs`** (`/jobs`) | Course catalog, learning paths, XP leaderboard, entry jobs, internships. |
| **`PROFESSIONAL`** | Active infrastructure/AEC engineers, project managers, BIM modelers. | Self-Selectable | **`Jobs`** (`/jobs`) | Engineering portfolio, BIM model showcase, talent matching, career intelligence. |
| **`MENTOR`** | Senior technical leads, chartered engineers, directors. | Self-Selectable | **`Jobs`** (`/jobs`) | Mentorship discussions, learning space moderation, talent endorsement. |
| **`RECRUITER`** | HR leaders, technical recruiters, EPC talent partners. | Self-Selectable | **`Manage Business`** (`/manage-business`) | Business workspace, job posting drafts, talent candidate searches, inquiry inbox. |
| **`FOUNDER`** | Founders of engineering, construction, or AEC startups & enterprises. | Self-Selectable | **`Manage Business`** (`/manage-business`) | Company profile creation, hiring management, employer branding, org settings. |
| **`EDUCATOR`** | University faculty, academy trainers, certified BIM instructors. | **Admin-Assigned Only** | **`Jobs`** (`/jobs`) | Space announcements, institutional trust badge, curriculum authoring. |
| **`ADMIN`** | Platform administrators & compliance officers. | **System Assigned** | **`Jobs`** (`/jobs`) + **`Admin Governance`** | Business review & verification, organization suspension, audit logs, error reporting. |

---

## 3. Backend Role Governance & Security Enforcement

Implemented in:
- Service: [`backend/src/modules/profile/profile.service.ts` (Lines 707–750)](file:///Users/riyas/Desktop/richuuuuuuuuuuuuuuu/user-panel-zeitnah/backend/src/modules/profile/profile.service.ts#L707-L750)
- Controller: [`backend/src/modules/profile/profile.controller.ts`](file:///Users/riyas/Desktop/richuuuuuuuuuuuuuuu/user-panel-zeitnah/backend/src/modules/profile/profile.controller.ts)
- Test Suite: [`backend/src/modules/profile/profile.service.spec.ts` (Lines 770–930)](file:///Users/riyas/Desktop/richuuuuuuuuuuuuuuu/user-panel-zeitnah/backend/src/modules/profile/profile.service.spec.ts#L770-L930)

### 3.1 Role Normalization & Validation
- Any incoming role (via `primaryRole` or legacy `role`) is trimmed, uppercased, and validated against the whitelist:
  `['STUDENT', 'EDUCATOR', 'PROFESSIONAL', 'MENTOR', 'RECRUITER', 'FOUNDER']`.
- Invalid strings throw `400 Bad Request`.

### 3.2 Strict Educator Security Rules
1. **Self-Assignment Prohibition:** Ordinary users attempting to send `primaryRole: 'EDUCATOR'` receive `403 Forbidden` (`'The educator role can only be assigned by a Zeitnah administrator.'`).
2. **Immutability Protection:** Once an account has been assigned `EDUCATOR` status by an administrator, the user cannot change their role to another value. Only a platform administrator can modify an Educator's role (`'Educator role was assigned by an administrator and cannot be modified by the user.'`).

### 3.3 Business Lifecycle States (Recruiter & Founder)
Recruiter and Founder roles access `/manage-business`. The system enforces explicit business approval states:
1. **`NO_BUSINESS`**: User prompted to create and register their company profile.
2. **`PENDING`**: Business submitted and locked under administrator compliance review.
3. **`APPROVED`**: Full enterprise access; live job publishing and public discoverability active.
4. **`REJECTED`**: Displays administrator rejection feedback with resubmission workflow.
5. **`SUSPENDED`**: Organization temporarily disabled by platform governance.

---

## 4. Profile Subsystem Architecture

The Zeitnah profile is not a flat form; it is a multi-tier engineering portfolio and reputation system consisting of 5 dedicated interfaces:

```
[ PROFILE ECOSYSTEM ]
 ├── 1. Overview (/profile) ───────────────── Personal command center, stats & progress
 ├── 2. Personal Info (/profile/edit) ─────── Role selector, taxonomy, skills & privacy
 ├── 3. Public Profile (/public-profile) ──── Clean public showcase (privacy-filtered)
 ├── 4. Portfolio (/profile/portfolio) ────── 3D BIM models, drawings, project case studies
 └── 5. Verification (/profile/verification) ─ Trust badges, licenses, admin credentials
```

### 4.1 Overview (`/profile` — [`Profile.jsx`](file:///Users/riyas/Desktop/richuuuuuuuuuuuuuuu/user-panel-zeitnah/frontend/src/pages/profile/Profile.jsx))
- **Identity Banner & Avatar:** Custom cover image and avatar upload with client-side crop/resize via [`ImageEditorModal`](file:///Users/riyas/Desktop/richuuuuuuuuuuuuuuu/user-panel-zeitnah/frontend/src/components/common/ImageEditorModal.jsx).
- **Gamification & XP Engine:** Real-time XP countup animation (`XPCountUp`), streak indicator, level progress bar, and badge showcase ([`AchievementsGrid`](file:///Users/riyas/Desktop/richuuuuuuuuuuuuuuu/user-panel-zeitnah/frontend/src/components/profile/AchievementsGrid.jsx)).
- **Profile Completion Tracker:** Actionable percentage checklist scoring bio, software tools, discipline, and verification status ([`ProfileCompletionCard`](file:///Users/riyas/Desktop/richuuuuuuuuuuuuuuu/user-panel-zeitnah/frontend/src/components/profile/ProfileCompletionCard.jsx)).
- **Network Stats:** Follower counts, connection requests, and mutual infrastructure peers ([`ProfileNetworkStats`](file:///Users/riyas/Desktop/richuuuuuuuuuuuuuuu/user-panel-zeitnah/frontend/src/components/network/ProfileNetworkStats.jsx)).

### 4.2 Profile Editor (`/profile/edit` — [`EditProfile.jsx`](file:///Users/riyas/Desktop/richuuuuuuuuuuuuuuu/user-panel-zeitnah/frontend/src/pages/profile/EditProfile.jsx))
Divided into 6 technical modules:
1. **Role Selector ([`RoleSelector.jsx`](file:///Users/riyas/Desktop/richuuuuuuuuuuuuuuu/user-panel-zeitnah/frontend/src/components/profile/RoleSelector.jsx)):** Interactive card grid for Student, Professional, Mentor, Recruiter, and Founder. If user is an Educator, presents an administrator-locked badge.
2. **Infrastructure Expertise ([`InfrastructureExpertiseSection.jsx`](file:///Users/riyas/Desktop/richuuuuuuuuuuuuuuu/user-panel-zeitnah/frontend/src/components/profile/InfrastructureExpertiseSection.jsx)):** Primary Discipline (Civil, Structural, Architecture, BIM, MEP, etc.), Specializations, and Industry Sectors (Highways, Bridges, Rail, Energy).
3. **Structured Skills Editor ([`StructuredSkillsEditor.jsx`](file:///Users/riyas/Desktop/richuuuuuuuuuuuuuuu/user-panel-zeitnah/frontend/src/components/profile/StructuredSkillsEditor.jsx)):** Software mastery levels (AutoCAD, Civil 3D, Revit, Navisworks, Primavera P6, ETABS, Tekla) classified by proficiency (Beginner, Intermediate, Advanced, Expert).
4. **Career Preferences ([`CareerPreferencesSection.jsx`](file:///Users/riyas/Desktop/richuuuuuuuuuuuuuuu/user-panel-zeitnah/frontend/src/components/profile/CareerPreferencesSection.jsx)):** Availability status (`OPEN_TO_OPPORTUNITIES`, `NOT_CURRENTLY_AVAILABLE`, `AVAILABLE_FOR_MENTORSHIP`), target roles, expected compensation, and preferred geographic locations.
5. **Experience, Education & Certifications:** Longitudinal timeline with employer validation and institution credentials.
6. **Privacy Matrix:** Granular visibility configuration (see Section 5).

### 4.3 Public Profile (`/public-profile`, `/u/:username` — [`PublicProfilePage.jsx`](file:///Users/riyas/Desktop/richuuuuuuuuuuuuuuu/user-panel-zeitnah/frontend/src/pages/profile/PublicProfilePage.jsx))
- Serves as the candidate's canonical web portfolio.
- Includes dynamic SEO meta tags, OpenGraph sharing cards, and direct connection/message buttons.
- Automatically strips private sections depending on viewing permissions.

### 4.4 Engineering Portfolio (`/profile/portfolio` — [`PortfolioPage.jsx`](file:///Users/riyas/Desktop/richuuuuuuuuuuuuuuu/user-panel-zeitnah/frontend/src/pages/profile/PortfolioPage.jsx))
- Purpose-built for AEC deliverables: BIM models (IFC/RVT), CAD drawings, calculation sheets, schedules, and structural reports.
- Includes client testimonial endorsements and project scope verifications.

### 4.5 Verification Center (`/profile/verification` — [`VerificationCenterPage.jsx`](file:///Users/riyas/Desktop/richuuuuuuuuuuuuuuu/user-panel-zeitnah/frontend/src/pages/profile/VerificationCenterPage.jsx))
- Evidence submission engine across 5 verification categories:
  1. **Identity:** Government Passport, National ID, Driver's License.
  2. **Professional Status:** Council of Engineers License, Chartered Engineer Certificate.
  3. **Business Affiliation:** Employment contract, official corporate email verification.
  4. **Software Certification:** Autodesk, Oracle Primavera, Bentley, or PMP certification.
  5. **Educator Credential:** Institutional faculty credential (reviewed by platform admins).

---

## 5. Granular Privacy & Visibility Matrix

The platform enforces a three-tier visibility model across individual profile facets stored in `user.privacySettings`:

| Privacy Scope | Values | Impact on Public Viewers | Impact on First-Degree Connections |
| :--- | :---: | :---: | :---: |
| **`PUBLIC`** | Experience, Education, Projects, Certifications | Fully visible to all visitors. | Fully visible. |
| **`NETWORK`** | Experience, Education, Projects, Certifications | Hidden with lock badge ("Visible to network connections only"). | Fully visible. |
| **`PRIVATE`** | Experience, Education, Projects, Certifications, Contact Info | Completely omitted from public and network views. | Omitted (visible only to profile owner). |

- **Recruiter Discoverability (`discoverableToRecruiters`):**
  - When enabled, candidates appear in matching algorithms for live jobs based on structured skills.
  - When disabled, profile is excluded from automated recruitment candidate pools.

---

## 6. Critical Architectural Principle: Role $\ne$ Verification

A vital design and security rule established in Zeitnah 2.0:
> **A user's Role denotes their functional behavior in the ecosystem, NOT their verified authenticity.**

| Dimension | Role (`primaryRole`) | Verification (`isVerified` & Trust Badges) |
| :--- | :--- | :--- |
| **Definition** | What the user *does* (e.g. Student, Recruiter, Professional). | What the user has *proven* with verified documentation. |
| **Visual Badge** | Restrained monochrome pill: `RECRUITER`, `STUDENT`. | High-contrast Trust Badge with checkmark: `Identity Verified ✓`. |
| **Assignment** | Self-selected during onboarding or profile editing. | Awarded by platform administrators upon document audit. |
| **Permissions** | Determines navigation items (`Manage Business` vs `Jobs`). | Determines credibility ranking, verified mark, and fraud prevention score. |

---

## 7. Integration with Navigation 2.0

As implemented in our recent update:
- [`roleNavigation.js`](file:///Users/riyas/Desktop/richuuuuuuuuuuuuuuu/user-panel-zeitnah/frontend/src/utils/roleNavigation.js) reads `user.primaryRole` directly to determine primary navigation:
  - If `RECRUITER` or `FOUNDER`:
    - Desktop Navbar item #4 $\rightarrow$ **`Manage Business`** (`/manage-business`)
    - Mobile Bottom Bar item #4 $\rightarrow$ **`Business`** (`/manage-business`)
  - If `STUDENT`, `EDUCATOR`, `PROFESSIONAL`, `MENTOR`, or `ADMIN`:
    - Desktop Navbar item #4 $\rightarrow$ **`Jobs`** (`/jobs`)
    - Mobile Bottom Bar item #4 $\rightarrow$ **`Jobs`** (`/jobs`)
- Profile dropdown header dynamically displays `user.primaryRole` using a restrained badge, with direct links to `My Profile`, `Portfolio`, `Verification Center`, `Account Settings`, and `Active Sessions`.

---

## 8. Summary of Active Roles & Capabilities

```
┌─────────────────┬───────────────────┬──────────────────────┬──────────────────────┐
│ Role            │ Primary Touchpoint│ Secondary Features   │ Governance Level     │
├─────────────────┼───────────────────┼──────────────────────┼──────────────────────┤
│ STUDENT         │ Jobs              │ Courses, XP, Leader  │ Standard User        │
│ PROFESSIONAL    │ Jobs              │ Portfolio, BIM, Intel│ Standard User        │
│ MENTOR          │ Jobs              │ Discussions, Spaces  │ Endorsed Peer        │
│ RECRUITER       │ Manage Business   │ Candidate Inquiries  │ Business Account     │
│ FOUNDER         │ Manage Business   │ Enterprise Org Setup │ Business Account     │
│ EDUCATOR        │ Jobs              │ Space Announcements  │ Admin-Locked Role    │
│ ADMIN           │ Jobs + Governance │ Platform Audits, Rev │ System Administrator │
└─────────────────┴───────────────────┴──────────────────────┴──────────────────────┘
```

---

## 9. Conclusion

The Profile and Role systems in Zeitnah reflect a production-grade AEC HUB where:
- Identity is specialized around technical infrastructure disciplines.
- Roles are safely normalized, strictly enforced, and directly govern user navigation.
- Privacy controls give candidates complete authority over their career visibility.
- Role identity and document verification remain strictly separated for total platform integrity.
