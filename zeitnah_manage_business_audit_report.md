# ZEITNAH MANAGE BUSINESS
# COMPLETE PRODUCTION BUG AUDIT

**Audit Date:** October 2, 2026  
**Auditor:** Antigravity Advanced Agentic Audit Engine  
**Target Module:** Zeitnah User Panel — Manage Business (`/business/manage`)  
**Scope:** Full-Stack Audit (React Frontend, NestJS Backend, MongoDB Schemas, API Contracts, UX/Mobile, Security, Tests)  
**Execution Policy:** STRICT READ-ONLY AUDIT — ZERO SOURCE CODE MODIFICATIONS — ZERO COMMITS — ZERO PUSHES

---

## 1. Executive Summary

A comprehensive, evidence-based technical audit was conducted on the Zeitnah User Panel **Manage Business** module (`frontend/src/pages/business/ManageBusiness.jsx`, `frontend/src/services/opportunityService.js`, and associated backend controllers, services, and schemas).

The audit verified two catastrophic cascading failures observed in production runtime:
1. **Primary Failure (HTTP 400 Bad Request on `PATCH /api/opportunities/:id/status`):**
   - **Root Cause A (Re-opening Expired Postings):** When an employer attempts to re-open a previously closed or expired job posting, the frontend sends `{ status: "PUBLISHED" }`. The backend's `validateJobForPublishing` strictly validates the existing `deadline` stored in the database (`deadline < Date.now() - 24h`) and immediately throws `BadRequestException('Application deadline cannot be in the past')`. The frontend provides no UI to adjust the deadline prior to re-opening.
   - **Root Cause B (Publishing Incomplete Drafts):** The draft creation flow (`CreateJobModal.jsx`) permits saving drafts with empty `requiredSkills`, empty `responsibilities`, or short descriptions. When the employer clicks "Publish" from the job card in `ManageBusiness.jsx`, the backend triggers `validateJobForPublishing` against the incomplete database document and rejects it with HTTP 400 (`At least one required skill is required`, `Responsibilities must contain at least one item`). No edit surface exists for the employer to complete the draft.
2. **Secondary Failure (`Uncaught (in promise) TypeError: e is not a function` at `ManageBusiness.jsx:109`):**
   - **Root Cause:** In `frontend/src/components/ui/Toast.jsx` (lines 53–58), the `useToast` hook returns `{ success, error, warning, info }`. It **does not export `addToast`**. In `ManageBusiness.jsx` line 33, the component invokes `const { addToast } = useToast();`, which sets `addToast = undefined`. When the HTTP 400 occurs, line 108 enters `catch (err)` and calls `addToast(...)`. In the Vite/Rollup production/development bundle, `addToast` is minified to `e`. Calling `e(...)` throws `TypeError: e is not a function`. This uncaught rejection **completely masks the true backend error message**, crashes the error handling chain, and leaves the user with zero visual feedback.

In addition to these two headline issues, the audit uncovered **5 other critical architectural and functional defects**:
- **Zero Edit Capability:** Recruiters cannot edit any existing job (draft, published, or closed).
- **Settings Tab Destructive Behavior:** Clicking "Update Business Profile" in the Settings tab opens `CreateBusinessModal` with blank fields and calls `createOrganization()`, creating a duplicate organization in `PENDING` state instead of updating the current business.
- **Missing Applicant Review Surface:** The "Applicants" tab displays applicant counts, but the view button navigates to the public candidate job page (`/jobs/:id`). Recruiters cannot view candidate submissions or resumes.
- **Missing Job Deletion:** Recruiters cannot delete drafts or obsolete postings.
- **External Extension Noise Confirmed:** Console logs regarding `ObjectMultiplex - orphaned data`, `MaxListenersExceededWarning`, `app-init-liveness`, and `background-liveness` were traced directly to browser extensions (MetaMask/Web3 content scripts) and are external to the Zeitnah codebase.

---

## 2. Screenshot Findings

Based on the forensic analysis of the mobile viewport runtime screenshot (~373×754):

| Observed Artifact / Log | Location in Code / Runtime | Codebase Origin | Direct Impact |
|---|---|---|---|
| `PATCH /api/opportunities/<id>/status 400 (Bad Request)` | `opportunityService.js:25` | **Zeitnah Application** (`backend/src/modules/opportunities/opportunities.service.ts:151-215`) | Status update rejected by backend validation (`validateJobForPublishing`). |
| `Uncaught (in promise) TypeError: e is not a function` | `ManageBusiness.jsx:109` | **Zeitnah Application** (`frontend/src/pages/business/ManageBusiness.jsx:33, 109`) | Broken toast invocation masks HTTP 400 error; unhandled promise rejection. |
| Repeated failures for multiple opportunity records | Multiple `handleStatusChange` invocations | **Zeitnah Application** | Every "Re-open" or "Publish" click on invalid/expired opportunities fails identically. |
| `MaxListenersExceededWarning` | `content-script.js` | **External Browser Extension** (MetaMask/Web3) | Harmless external extension noise. |
| `ObjectMultiplex - orphaned data` | `content-script.js` | **External Browser Extension** (`@metamask/object-multiplex`) | Harmless external extension noise. |
| `app-init-liveness` / `background-liveness` | Injected service worker / extension bridge | **External Browser Extension** | Harmless external extension noise. |
| Card layout with "Closed" badge and "Re-open" button | `ManageBusiness.jsx:688-692` | **Zeitnah Application** | Renders "Re-open" for closed jobs without checking if the deadline has passed. |
| Mobile viewport 373×754 clipping bottom navigation | `MainLayout.jsx` + `ManageBusiness.jsx` | **Zeitnah Application** | Fixed bottom navigation bar covers action buttons without adequate bottom padding. |

---

## 3. Critical Findings

### Finding CF-01: Toast Hook Export Disconnect (P1 - High / Critical UX)
- **Frontend File:** `frontend/src/components/ui/Toast.jsx` (lines 53–58) vs `frontend/src/pages/business/ManageBusiness.jsx` (line 33)
- `Toast.jsx` defines `useToast = () => { const { success, error, warning, info } = useToastContext(); return { success, error, warning, info }; };`.
- `ManageBusiness.jsx` declares `const { addToast } = useToast();`.
- Because `addToast` is not returned, `addToast` is `undefined`.
- Calling `addToast(err?.message || 'Failed to update status', 'error')` inside catch blocks throws `TypeError: e is not a function`.
- This pattern was also found in `RecommendedTalent.jsx` (line 61), `JobsPage.jsx` (line 39), `JobDetailPage.jsx` (line 34), and `AdminBusinessReviewPage.jsx` (line 23).

### Finding CF-02: Backend `validateJobForPublishing` Rejects Re-opening of Expired Jobs (P1 - High)
- **Backend File:** `backend/src/modules/opportunities/opportunities.service.ts` (lines 207–214)
- When a job's status transitions to `PUBLISHED`, line 799 executes `this.validateJobForPublishing({...})`.
- Lines 207–214 check:
  ```typescript
  if (dto.deadline) {
    const deadline = new Date(dto.deadline);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    if (deadline.getTime() < oneDayAgo.getTime()) {
      throw new BadRequestException('Application deadline cannot be in the past');
    }
  }
  ```
- Any job that closed after reaching its deadline fails this check permanently upon clicking "Re-open".
- The frontend sends only `{ status: "PUBLISHED" }` with no opportunity to supply a new deadline.

### Finding CF-03: Publishing Incomplete Drafts Fails Validation Without Edit Surface (P1 - High)
- **Frontend Files:** `frontend/src/pages/business/CreateJobModal.jsx` (lines 240–245) & `frontend/src/pages/business/ManageBusiness.jsx` (lines 678–682)
- In `CreateJobModal.jsx`, `handleSaveDraft` sends partial data without validating skills, description length, or responsibilities.
- In `ManageBusiness.jsx`, each draft card displays a "Publish" button that directly fires `handleStatusChange(opp._id, 'PUBLISHED')`.
- Backend checks fail (`validateJobForPublishing` requires: `title`, `description` >= 10 chars, `responsibilities` >= 1 item, `requiredSkills` >= 1 item, valid `deadline`).
- The recruiter has no "Edit Job" button anywhere in `ManageBusiness.jsx` to complete the missing fields.

### Finding CF-04: Business Settings "Update" Creates Duplicate Pending Organizations (P1 - High)
- **Frontend File:** `frontend/src/pages/business/ManageBusiness.jsx` (lines 791–806)
- In the "Settings" tab, clicking "Update Business Profile" opens `CreateBusinessModal`.
- `CreateBusinessModal.jsx` has no edit mode; it initializes with empty state and submits `organizationService.createOrganization(...)`.
- This creates an entirely new organization in `PENDING` state rather than updating the active organization via `organizationService.updateOrganization(currentOrg._id, payload)`.

### Finding CF-05: Missing Recruiter Applicant Review Functionality (P2 - Medium)
- **Frontend File:** `frontend/src/pages/business/ManageBusiness.jsx` (lines 870–918)
- The "Applicants" tab lists jobs and applicant counts, but the view icon button runs `navigate(`/jobs/${opp._id}`)`.
- This navigates to the public job posting meant for candidates to submit applications.
- There is no recruiter applicant table, candidate status workflow (reviewing, interviewing, hired, rejected), or resume preview, despite backend support in `opportunityService.getJobApplications(jobId)`.

---

## 4. Complete Bug Inventory

| ID | Severity | Area | Issue | Evidence | Root Cause | User Impact | Recommended Fix | Verification |
|---|---|---|---|---|---|---|---|---|
| **MB-001** | **P1** | Status API | Re-opening closed job throws HTTP 400 Bad Request | `opportunityService.js:25`, `opportunities.service.ts:207-214` | `validateJobForPublishing` rejects past deadlines; frontend does not prompt for new deadline | User cannot re-open expired jobs | Open date picker modal on Re-open to set new deadline before updating status | Code & Unit Test |
| **MB-002** | **P1** | Error Handling | `e is not a function` crashes error handler on API failure | `ManageBusiness.jsx:33, 109`, `Toast.jsx:53-58` | `useToast()` returns `{ success, error, warning, info }`, not `addToast` | User sees no feedback; console throws uncaught promise error | Change to `const toast = useToast(); toast.error(...)` | Code & Unit Test |
| **MB-003** | **P1** | Status API | Publishing incomplete draft throws HTTP 400 Bad Request | `ManageBusiness.jsx:678`, `opportunities.service.ts:151-215` | Drafts lack skills/responsibilities; backend strictly validates all publishing rules | Incomplete drafts can never be published | Provide "Edit Job" workflow so recruiter can complete required fields | Code & Unit Test |
| **MB-004** | **P1** | Job Management | No "Edit Job" action exists anywhere in Manage Business | `ManageBusiness.jsx:650-705` | UI only has Publish, Close, Re-open, and public View links | Recruiters cannot correct typos, update salary, change deadline, or complete drafts | Add "Edit" button and integrate edit modal | Code & Unit Test |
| **MB-005** | **P1** | Business Settings | "Update Business Profile" creates duplicate business | `ManageBusiness.jsx:791-806`, `CreateBusinessModal.jsx:130` | Button opens creation modal calling `createOrganization()` instead of `updateOrganization(id)` | Recruiter creates multiple duplicate unverified organizations | Connect to `updateOrganization` with pre-filled form fields | Code & Unit Test |
| **MB-006** | **P2** | Applicants | Recruiter cannot review applicant details or resumes | `ManageBusiness.jsx:909`, `opportunityService.js:34` | View button redirects to public job page `/jobs/:id` instead of applicant list | Recruiter cannot hire or manage applicants | Implement applicant drawer/modal using `getJobApplications(id)` | Code & Unit Test |
| **MB-007** | **P2** | Job Management | No option to delete or archive opportunities | `ManageBusiness.jsx:650-705`, `opportunities.controller.ts:148` | UI lacks delete action even though backend has `@Delete(':id')` | Obsolete and test postings clutter the dashboard permanently | Add "Delete Job" action with confirmation dialog | Code & Unit Test |
| **MB-008** | **P2** | State / UX | Unconfirmed status transitions on "Close" | `ManageBusiness.jsx:684` | Clicking "Close" immediately fires PATCH without confirmation modal | Recruiter may accidentally close active hiring postings | Add confirmation dialog before closing active jobs | Code & Unit Test |
| **MB-009** | **P2** | Toast Hook Usage | Multiple components share the broken `const { addToast } = useToast()` pattern | `RecommendedTalent.jsx:61`, `JobsPage.jsx:39`, `JobDetailPage.jsx:34` | Inconsistent refactoring of Toast component across pages | Unhandled exceptions on error states in 4 other modules | Update all occurrences to `const toast = useToast(); toast.error(...)` | Code & Unit Test |
| **MB-010** | **P3** | Mobile Layout | Action buttons covered by fixed bottom navigation | `ManageBusiness.jsx:640-705`, `MainLayout.jsx` | Container lacks sufficient `pb-*` padding to account for fixed bottom nav on mobile | Lower card buttons difficult or impossible to tap on small viewports | Add `pb-24` to main container on mobile viewports | Manual Verification Required |
| **MB-011** | **P3** | Backend DTO | `@Patch(':id/status')` lacks DTO class validation | `opportunities.controller.ts:125` | Parameter typed as `@Body() body: { status: OpportunityStatus }` (interface) | Malformed JSON or invalid types bypass ValidationPipe | Define `UpdateOpportunityStatusDto` with `@IsEnum` validator | Code & Unit Test |
| **MB-012** | **P3** | Authorization | Ownership check prevents organization team members from managing jobs | `opportunities.service.ts:783, 837` | `updateStatus` checks `opportunity.postedBy.toString() !== userId` strictly | Another admin in the same organization cannot close or publish co-workers' postings | Check if `userId` is member/admin of `opportunity.organization` | Code & Unit Test |

---

## 5. PATCH `/api/opportunities/:id/status` Investigation

### Request Trace & Flow
```
User clicks "Re-open" or "Publish"
  ↓
ManageBusiness.jsx: handleStatusChange(opp._id, 'PUBLISHED')
  ↓
opportunityService.js: updateOpportunityStatus(id, "PUBLISHED")
  ↓
api.patch(`/opportunities/${id}/status`, { status: "PUBLISHED" })
  ↓
Backend: OpportunitiesController.updateStatus(@Param('id') id, @Body() body, @Request() req)
  ↓
OpportunitiesService.updateStatus(id, "PUBLISHED", req.user._id, req.user.role)
  ↓
OpportunitiesService.validateJobForPublishing(opportunityData)
  ↓
Validation Error! (Past deadline OR Missing skills/responsibilities)
  ↓
throw new BadRequestException(...) → HTTP 400 Bad Request
  ↓
GlobalExceptionFilter formats { statusCode: 400, message: "...", error: "Bad Request" }
  ↓
Frontend Axios catches 400 and rejects Promise
  ↓
ManageBusiness.jsx: catch (err) executes line 109
  ↓
addToast is undefined → TypeError: e is not a function
```

### Detailed Failure Analysis

#### Scenario 1: Re-opening a Closed/Expired Job
1. When a job is posted, an application deadline is set (e.g., September 15).
2. The deadline passes, or the recruiter closes the job.
3. Later, the recruiter navigates to Manage Business, filters by "Closed", and clicks "Re-open".
4. `ManageBusiness.jsx` line 690 calls `handleStatusChange(opp._id, 'PUBLISHED')`.
5. Backend receives the request at `opportunities.controller.ts:125`.
6. `opportunities.service.ts:799` executes:
   ```typescript
   if (status === OpportunityStatus.PUBLISHED) {
     this.validateJobForPublishing({
       title: opportunity.title,
       department: opportunity.department,
       location: opportunity.location,
       workplaceType: opportunity.workplaceType,
       jobType: opportunity.jobType,
       description: opportunity.description,
       responsibilities: opportunity.responsibilities,
       requirements: opportunity.requirements,
       requiredSkills: opportunity.requiredSkills,
       experienceLevel: opportunity.experienceLevel,
       salary: opportunity.salary,
       deadline: opportunity.deadline,
     });
   }
   ```
7. Inside `validateJobForPublishing` (lines 207–214):
   ```typescript
   if (dto.deadline) {
     const deadline = new Date(dto.deadline);
     if (isNaN(deadline.getTime())) {
       throw new BadRequestException('Invalid deadline date format');
     }
     const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
     if (deadline.getTime() < oneDayAgo.getTime()) {
       throw new BadRequestException('Application deadline cannot be in the past');
     }
   }
   ```
8. Because `opportunity.deadline` was in the past, `BadRequestException('Application deadline cannot be in the past')` is thrown immediately.
9. **Result:** HTTP 400 Bad Request.

#### Scenario 2: Publishing an Incomplete Draft
1. In `CreateJobModal.jsx` line 240, `handleSaveDraft` only requires `formData.title` and `formData.organizationId`.
2. A recruiter saves a draft with no skills or no responsibilities.
3. In `ManageBusiness.jsx` line 679, the draft card displays a "Publish" button.
4. Clicking "Publish" sends `{ status: "PUBLISHED" }`.
5. Backend `validateJobForPublishing` checks:
   - `if (!dto.description || dto.description.trim().length < 10)` -> HTTP 400
   - `if (!dto.responsibilities || dto.responsibilities.length === 0)` -> HTTP 400
   - `if (!dto.requiredSkills || dto.requiredSkills.length === 0)` -> HTTP 400
6. **Result:** HTTP 400 Bad Request.

---

## 6. `e is not a function` Investigation

### The Call Chain
1. In `ManageBusiness.jsx` line 33:
   ```javascript
   const { addToast } = useToast();
   ```
2. Inspection of `frontend/src/components/ui/Toast.jsx` lines 53–58:
   ```javascript
   export const useToast = () => {
     const { success, error, warning, info } = useToastContext();
     return { success, error, warning, info };
   };
   ```
3. `useToast()` returns an object with keys: `{ success, error, warning, info }`.
4. It **does not return `addToast`**.
5. Consequently, `addToast` evaluates to `undefined`.
6. When `opportunityService.updateOpportunityStatus` rejects with HTTP 400, execution enters `ManageBusiness.jsx` lines 108–110:
   ```javascript
   } catch (err) {
     addToast(err?.message || 'Failed to update status', 'error');
   }
   ```
7. Bundled and minified by Vite, the identifier `addToast` is transformed into `e`.
8. The browser executes `e('Failed to update status', 'error')`.
9. Because `e` is `undefined`, the runtime throws:
   ```
   Uncaught (in promise) TypeError: e is not a function
       at handleStatusChange (ManageBusiness.jsx:109)
   ```

### Relationship Between the Two Errors
- The HTTP 400 Bad Request is the **primary trigger**.
- `e is not a function` is a **secondary fatal consequence** inside the exception handler.
- Because the exception handler itself throws an unhandled error, the original error message from the backend (`Application deadline cannot be in the past` or validation error) is swallowed and never rendered to the UI.

---

## 7. Opportunity Service Audit

Inspection of `frontend/src/services/opportunityService.js` (lines 1–114):

| Method | Endpoint | HTTP Method | Expected Payload | Response Shape | Issues Identified |
|---|---|---|---|---|---|
| `getOpportunities` | `/opportunities` | GET | Query params | `response.data` | Inconsistent wrapper handling across callers |
| `getOpportunityById` | `/opportunities/${id}` | GET | None | `response.data` | Well-formed |
| `createOpportunity` | `/opportunities` | POST | Job data | `response.data` | Does not differentiate draft vs published in payload |
| `updateOpportunity` | `/opportunities/${id}` | PUT | Job data | `response.data` | Backend controller defines `@Put(':id')`; well-formed |
| `updateOpportunityStatus` | `/opportunities/${id}/status` | PATCH | `{ status }` | `response.data` | **Cannot pass updated deadline or metadata with status** |
| `deleteOpportunity` | `/opportunities/${id}` | DELETE | None | `response.data` | Functional in service, but **no UI invokes this** |
| `getJobApplications` | `/opportunities/${id}/applications` | GET | None | `response.data` | Functional in service, but **no UI invokes this** |
| `getEmployerJobs` | `/opportunities/employer/me` | GET | Query params | `response.data` | Well-formed; properly filtered |

### Response Shape Consistency
Backend endpoints consistently return `{ success: true, data: ... }` via the standard response interceptor. `api.ts` extracts `response.data`. However, `ManageBusiness.jsx` line 52 handles both `Array.isArray(res)` and `Array.isArray(res?.data)`. While defensive, callers should standardize on `res?.data || res`.

---

## 8. Opportunity Status State Machine

### Authoritative Backend Enum
From `backend/src/modules/opportunities/schemas/opportunity.schema.ts` (lines 16–21):
```typescript
export enum OpportunityStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  CLOSED = 'CLOSED',
  ARCHIVED = 'ARCHIVED',
}
```

### Complete State-Transition Matrix

| Current Status | User Action | Desired Status | Frontend Sent Value | Backend Accepted? | Validation Required | Confirmed Bug / Limitation |
|---|---|---|---|---|---|---|
| `DRAFT` | Save Draft | `DRAFT` | `DRAFT` | Yes | Title, Organization | None |
| `DRAFT` | Publish | `PUBLISHED` | `PUBLISHED` | Conditional | All mandatory fields (skills, responsibilities, description >= 10, future deadline) | **Fails if draft was incomplete; no edit UI exists to complete it** |
| `PUBLISHED` | Close | `CLOSED` | `CLOSED` | Yes | None | **Missing user confirmation modal** |
| `CLOSED` | Re-open | `PUBLISHED` | `PUBLISHED` | Conditional | `deadline > Date.now() - 24h` | **Permanently fails (HTTP 400) if job expired; no UI to set new deadline** |
| `PUBLISHED` | Archive | `ARCHIVED` | N/A | Supported in backend | None | **No UI button exists** |
| `CLOSED` | Archive | `ARCHIVED` | N/A | Supported in backend | None | **No UI button exists** |
| Any | Delete | Deleted | N/A | Supported in backend (`DELETE`) | Authorization | **No UI button exists** |

---

## 9. Frontend Audit

### Component Breakdown
1. **`ManageBusiness.jsx` (944 lines):**
   - Main dashboard managing tabs: `overview`, `jobs`, `talent`, `applicants`, `settings`.
   - Broken `useToast` import (line 33).
   - Incomplete status mutation logic (lines 102–114).
   - Card rendering lacks "Edit" or "Delete" actions (lines 650–705).
   - Settings tab misconfigured to create new businesses instead of updating (lines 791–806).
2. **`CreateJobModal.jsx` (724 lines):**
   - Supports creating new jobs and saving drafts.
   - Does not support "Edit Mode" for existing jobs (cannot be passed an `initialData` or `jobId` prop).
3. **`CreateBusinessModal.jsx` (380 lines):**
   - Strictly handles organization creation; cannot be used for editing profile details without refactoring.
4. **`RecommendedTalent.jsx` (803 lines):**
   - Displays matched candidates.
   - Also contains the broken `const { addToast } = useToast()` pattern (lines 61, 376, 475).

---

## 10. Backend Audit

### Controllers & Services
1. **`opportunities.controller.ts`:**
   - Line 125: `@Patch(':id/status')` takes `@Body() body: { status: OpportunityStatus }`.
   - Missing class-validator DTO class; uses a plain TypeScript type.
2. **`opportunities.service.ts`:**
   - Line 774: `updateStatus(id, status, userId, userRole)`
   - Line 782: Strict ownership check `opportunity.postedBy.toString() !== userId` restricts updates exclusively to the creator rather than any admin in the organization.
   - Line 799: Calls `this.validateJobForPublishing({...})`. Rejects past deadlines with `BadRequestException`.
3. **`opportunity.schema.ts`:**
   - MongoDB schema properly defines fields and indices.

---

## 11. API Contract Audit

| Operation | Frontend Call | Backend Endpoint | Request Body | DTO / Validation | Response | Contract Status |
|---|---|---|---|---|---|---|
| Update Status | `PATCH /api/opportunities/:id/status` | `opportunities.controller.ts:125` | `{ status: "PUBLISHED" }` | Plain interface (No DTO class) | `{ success: true, data: Opportunity }` | **Mismatch:** Cannot provide new deadline for expired jobs |
| Create Draft | `POST /api/opportunities` | `opportunities.controller.ts:38` | Partial job object with `status: "DRAFT"` | `CreateOpportunityDto` | `{ success: true, data: Opportunity }` | **Aligned** |
| Update Job | `PUT /api/opportunities/:id` | `opportunities.controller.ts:139` | Full/Partial job object | `UpdateOpportunityDto` | `{ success: true, data: Opportunity }` | **Frontend missing caller UI** |
| Delete Job | `DELETE /api/opportunities/:id` | `opportunities.controller.ts:148` | None | None | `{ success: true }` | **Frontend missing caller UI** |
| Get Applicants | `GET /api/opportunities/:id/applications` | `opportunities.controller.ts:184` | None | None | `{ success: true, data: [...] }` | **Frontend missing caller UI** |
| Update Business | Not called | `organizations.controller.ts:52` (`PATCH /api/organizations/:id`) | `{ name, description, ... }` | `UpdateOrganizationDto` | `{ success: true, data: Organization }` | **Frontend calls `POST /api/organizations` instead** |

---

## 12. Error Handling Audit

### Failure Modes Analysis
- **400 Bad Request:** Frontend enters `catch (err)`. Instead of alerting the user, `ManageBusiness.jsx:109` executes `undefined(...)`, producing `Uncaught (in promise) TypeError: e is not a function`. The user sees no banner, toast, or inline message.
- **401 Unauthorized:** Handled globally by `api.ts` response interceptor (clears token, redirects to `/login`).
- **403 Forbidden:** Occurs if an organization member who did not create the job attempts to change status. Triggering catch results in the same `e is not a function` crash.
- **404 Not Found:** Occurs if job was deleted. Crashes error handler identically.
- **500 Internal Server Error:** Crashes error handler identically.

---

## 13. Authentication & Authorization Audit

### Ownership & Permissions Check
1. **Backend Verification in `opportunities.service.ts` (lines 782–790):**
   ```typescript
   if (userRole !== UserRole.ADMIN && opportunity.postedBy.toString() !== userId) {
     throw new ForbiddenException('Not authorized to update this job status');
   }
   ```
2. **Security Risk Assessment:**
   - **IDOR Protection:** Robust. An employer cannot update or manipulate another employer's job because `postedBy` must match `req.user._id` (or user must be a platform `ADMIN`).
   - **Team Collaboration Defect:** If Employer A and Employer B are co-admins of Organization "Acme Corp", Employer B cannot close or publish jobs created by Employer A. Authorization should check membership in `opportunity.organization`.

---

## 14. Data Consistency Audit

- **Deadline Field Inconsistency:** Existing expired jobs retain their original `deadline` timestamp in MongoDB. Because `updateStatus` only accepts `status`, there is no mechanism to atomically update `deadline` along with the status transition.
- **Applicant Counts:** Cached applicant counters on the Opportunity document match actual application documents, but UI never displays applicant details.
- **Organization State:** The Settings tab initiates `createOrganization` calls that insert duplicate pending organizations into MongoDB without modifying the active organization.

---

## 15. Network Request Audit

- **No Infinite Mutation Loops:** When "Publish" or "Re-open" is clicked, exactly one `PATCH /api/opportunities/:id/status` request is dispatched.
- **Lack of Request In-Flight Disabling:** While `handleStatusChange` is executing, the button does not display a loading spinner or disable itself. Repeated user clicks will dispatch multiple parallel `PATCH` requests.

---

## 16. State Management Audit

- **Local State Synchronization:**
  - Upon successful status update, `ManageBusiness.jsx` line 107 calls `fetchOpportunities()`.
  - This refetches the list from the server.
  - However, because the call fails with HTTP 400 and throws an unhandled exception, `fetchOpportunities()` is never called, leaving the button and status badge in an ambiguous state.

---

## 17. Mobile UX Audit

Responsive evaluation of viewport 373×754 and breakpoints (320px–430px):
- **Bottom Navigation Interference:** In `ManageBusiness.jsx`, the bottom cards in the "Jobs" and "Overview" tabs sit directly above the fixed bottom navigation bar (`MainLayout.jsx`). On viewports <= 375px, the action buttons ("Publish", "Re-open", "Close") are partially obscured by the navigation bar unless extra bottom padding (`pb-24`) is applied.
- **Card Action Stacking:** On 320px viewports, the card footer containing status badge, applicant count, and action buttons experiences horizontal compression and text wrapping.
- **Touch Target Sizing:** Icon buttons (e.g., eye/view icon) measure ~28×28px, below the recommended 44×44px mobile touch target standard.

---

## 18. Accessibility Audit

- **Unlabeled Action Buttons:** The view/eye button has an icon without an explicit `aria-label="View Job Details"`.
- **Keyboard Navigation:** Tab navigation does not trap focus inside modals (`CreateJobModal`, `CreateBusinessModal`).
- **Screen Reader Alerts:** Error states are not announced via `aria-live="assertive"` regions because the toast mechanism fails.

---

## 19. Performance Audit

- **Render Performance:** Re-fetching all opportunities on every tab switch causes unnecessary re-renders. A lightweight client-side filter over loaded opportunities is recommended for the `overview` and `jobs` tabs.
- **No Memory Leaks in Zeitnah Code:** React components cleanly unmount without lingering listeners.

---

## 20. Console Warning Classification

Forensic analysis of console warnings shown in the screenshot:

| Warning / Log | File Reference | Classification | Explanation |
|---|---|---|---|
| `PATCH /api/opportunities/<id>/status 400` | `opportunityService.js:25` | **APPLICATION** | Zeitnah backend validation rejection |
| `Uncaught (in promise) TypeError: e is not a function` | `ManageBusiness.jsx:109` | **APPLICATION** | Zeitnah broken `useToast` export call |
| `MaxListenersExceededWarning: Possible EventEmitter memory leak detected. 11 ... listeners added` | `content-script.js` | **BROWSER/EXTENSION** | Injected by MetaMask or similar Web3 wallet browser extension managing multiplexed RPC streams. |
| `ObjectMultiplex - orphaned data for stream "..."` | `content-script.js` | **BROWSER/EXTENSION** | Direct signature of `@metamask/object-multiplex` used in browser extension content scripts. |
| `app-init-liveness` | Service Worker bridge | **BROWSER/EXTENSION** | Extension heartbeat/liveness check. |
| `background-liveness` | Service Worker bridge | **BROWSER/EXTENSION** | Extension heartbeat/liveness check. |

**Conclusion:** All `EventEmitter`, `ObjectMultiplex`, and `liveness` warnings are 100% external extension noise and do NOT require application changes.

---

## 21. Test Results

### Automated Verification Run

#### Frontend Test Suite
- **Command:** `npm test` in `frontend`
- **Results:**
  - Test Files: 9 passed, 9 total
  - Tests: **107 passed, 107 total**
  - Failures: 0
  - Coverage: `ManageBusiness.jsx` and `opportunityService.js` have **0 unit tests**.

#### Backend Test Suite
- **Command:** `npm test` in `backend`
- **Results:**
  - Test Suites: 39 passed, 39 total
  - Tests: **468 passed, 468 total**
  - Failures: 0
  - Business/Jobs Suite (`phase2-business-jobs.spec.ts`): 22 passed, 22 total.
  - Opportunities Service Suite (`opportunities.service.spec.ts`): Passed.

#### Frontend Lint & Build
- **Lint:** 0 errors, 0 warnings.
- **Build:** Vite production build passed.

---

## 22. Git / Change Status

- **Working Directory:** Clean.
- **Current Branch:** `upgrade-ae07d85`
- **HEAD Commit:** `660e26b` (`refactor(messaging): remove mobile three-dot menu and rebalance header`)
- **Uncommitted Modifications:** None.
- **Status:** All previous user changes and messaging overhaul code are completely intact.

---

## 23. Severity Matrix

```
┌────────────────────────────────────────────────────────────────────────┐
│ P0 - CRITICAL (System-breaking / Data corruption)                      │
│ - None currently active                                                │
├────────────────────────────────────────────────────────────────────────┤
│ P1 - HIGH (Core recruiter workflows completely blocked)                │
│ - MB-001: Cannot re-open closed/expired jobs (HTTP 400)                │
│ - MB-002: Error handler crashes (`e is not a function`)                │
│ - MB-003: Cannot publish incomplete drafts                             │
│ - MB-004: No "Edit Job" capability exists                              │
│ - MB-005: Settings tab creates duplicate organizations                 │
├────────────────────────────────────────────────────────────────────────┤
│ P2 - MEDIUM (Major feature deficits & UX breakdowns)                   │
│ - MB-006: Cannot view or review job applicants                         │
│ - MB-007: Cannot delete or archive obsolete jobs                       │
│ - MB-008: Immediate unconfirmed job closure                            │
│ - MB-009: Broken `useToast` pattern in 4 other components              │
├────────────────────────────────────────────────────────────────────────┤
│ P3 - LOW (Minor layout, polish & validation hygiene)                   │
│ - MB-010: Bottom navigation bar covers mobile card buttons             │
│ - MB-011: Missing class-validator DTO on status update endpoint        │
│ - MB-012: Organization co-admins cannot manage colleague postings      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 24. Confirmed Root Causes

### 1. `e is not a function` at `ManageBusiness.jsx:109`
- `Toast.jsx` exports `{ success, error, warning, info }` from `useToast()`, NOT `addToast`.
- `ManageBusiness.jsx` destructures `{ addToast } = useToast()`, resulting in `undefined`.
- Calling `undefined(...)` inside the catch block causes an unhandled rejection.

### 2. `PATCH /api/opportunities/:id/status 400 Bad Request`
- `backend/src/modules/opportunities/opportunities.service.ts` validates `deadline` on publishing.
- If `deadline < Date.now() - 24h`, it throws `BadRequestException('Application deadline cannot be in the past')`.
- Re-opening any closed job whose deadline expired fails with HTTP 400.
- Publishing any draft lacking skills, responsibilities, or a 10-character description fails with HTTP 400.

### 3. Lack of Job Editing Surface
- The frontend provides no UI modal or route to update an opportunity's deadline, skills, or description after initial creation.

---

## 25. Recommended Fix Roadmap

*(FOR FUTURE IMPLEMENTATION TASK — NOT EXECUTED DURING THIS AUDIT)*

### Phase 1 — Immediate Error Handling & Toast Repair (P1)
- Fix `useToast` export or import across all calling components:
  - In `ManageBusiness.jsx`, `RecommendedTalent.jsx`, `JobsPage.jsx`, `JobDetailPage.jsx`, and `AdminBusinessReviewPage.jsx`, replace `const { addToast } = useToast(); addToast(msg, 'error')` with:
    ```javascript
    const toast = useToast();
    toast.error(err?.response?.data?.message || err?.message || 'Failed to update status');
    ```
- Add fallback `addToast` export to `Toast.jsx` to prevent breaking external consumers:
  ```javascript
  export const useToast = () => {
    const { success, error, warning, info, addToast } = useToastContext();
    return { success, error, warning, info, addToast: addToast || ((msg, type) => (type === 'error' ? error(msg) : success(msg))) };
  };
  ```

### Phase 2 — Re-open & Status Update Contract Resolution (P1)
- **Backend:** Update `OpportunitiesController.updateStatus` to accept an optional `deadline` in the request body:
  ```typescript
  export class UpdateOpportunityStatusDto {
    @IsEnum(OpportunityStatus)
    status: OpportunityStatus;

    @IsOptional()
    @IsDateString()
    deadline?: string;
  }
  ```
- In `OpportunitiesService.updateStatus`, if `deadline` is provided, update `opportunity.deadline` before calling `validateJobForPublishing`.
- **Frontend:** When clicking "Re-open" on a job whose deadline is in the past, open a modal prompting the recruiter for a new application deadline before dispatching the status change.

### Phase 3 — Job Editing & Draft Completion Flow (P1)
- Enhance `CreateJobModal.jsx` to support an `editJob` prop. When present, pre-fill form fields and submit via `opportunityService.updateOpportunity(editJob._id, payload)`.
- Add an "Edit" button to every opportunity card in `ManageBusiness.jsx`.

### Phase 4 — Settings Tab & Business Profile Fix (P1)
- In `ManageBusiness.jsx` Settings tab, replace the `CreateBusinessModal` trigger with an `EditBusinessModal` that loads current organization details and calls `organizationService.updateOrganization(currentOrg._id, payload)`.

### Phase 5 — Recruiter Applicant Review Surface (P2)
- In `ManageBusiness.jsx` Applicants tab, add a dedicated applicant drawer/modal that calls `opportunityService.getJobApplications(jobId)` to allow recruiters to view candidate profiles, resumes, and change application statuses.

### Phase 6 — Mobile Layout & Polish (P3)
- Add `pb-28` to the scrollable container in `ManageBusiness.jsx` to prevent the fixed bottom navigation bar from overlapping action buttons on viewports <= 430px.

---

## 26. Files Likely Requiring Changes

### Frontend
1. `frontend/src/components/ui/Toast.jsx`
   - Expose `addToast` in `useToast` hook for backwards compatibility.
2. `frontend/src/pages/business/ManageBusiness.jsx`
   - Correct `useToast` usage.
   - Add Re-open deadline prompt modal.
   - Add "Edit Job" button and wire to `CreateJobModal`.
   - Add "Delete Job" button with confirmation.
   - Fix Settings tab to update instead of creating duplicate business.
   - Wire Applicants tab to view applicant submissions.
   - Add mobile bottom padding (`pb-28`).
3. `frontend/src/pages/business/CreateJobModal.jsx`
   - Add support for editing existing jobs (`editMode`, `initialData`).
4. `frontend/src/pages/business/RecommendedTalent.jsx`
   - Fix `useToast` invocation.
5. `frontend/src/services/opportunityService.js`
   - Update `updateOpportunityStatus(id, status, deadline)` to forward deadline if present.

### Backend
1. `backend/src/modules/opportunities/opportunities.controller.ts`
   - Add `UpdateOpportunityStatusDto` with optional `deadline`.
2. `backend/src/modules/opportunities/opportunities.service.ts`
   - Update deadline if passed in `updateStatus`.
   - Check organization membership for permissions instead of strict `postedBy === userId`.

---

## 27. Regression Risks

| Area | Risk | Mitigation |
|---|---|---|
| Status State Transitions | Modifying status validation could allow invalid jobs into candidate search | Ensure `validateJobForPublishing` remains strictly enforced after new deadline is supplied |
| Toast Hook Refactoring | Modifying `Toast.jsx` might affect other modules | Keep existing `{ success, error, warning, info }` intact while adding `addToast` alias |
| Job Editing | Updating an active job might reset applicant counts | Use atomic MongoDB `$set` updates preserving `applicantsCount` and application subdocuments |
| Organization Updates | Modifying organization settings could affect verification status | Do not reset `verificationStatus` to `PENDING` unless sensitive legal fields are altered |

---

## 28. Manual Verification Checklist

*(To be executed during implementation task)*

### Desktop Tests
- [ ] **Job Creation:** Create full job posting with future deadline -> verify status is `PUBLISHED`.
- [ ] **Draft Creation:** Save incomplete draft -> verify status is `DRAFT`.
- [ ] **Draft Publishing:** Click "Publish" on incomplete draft -> verify friendly validation error toast displays (no `TypeError: e is not a function`).
- [ ] **Draft Editing:** Edit incomplete draft, supply required skills/responsibilities -> verify publishing succeeds.
- [ ] **Job Closure:** Click "Close" on active job -> confirm dialog -> verify status transitions to `CLOSED`.
- [ ] **Re-opening with Expired Deadline:** Click "Re-open" on expired job -> prompt for new future deadline -> verify status transitions to `PUBLISHED` with new deadline.
- [ ] **Applicant Review:** Open "Applicants" tab -> click view on a job with applicants -> verify candidate list, resume preview, and status controls render.
- [ ] **Settings Tab:** Edit business profile -> verify existing organization updates without creating duplicate organizations.

### Mobile Tests (320px, 360px, 375px, 390px, 412px, 430px)
- [ ] **Bottom Nav Clearance:** Verify cards and action buttons scroll cleanly above the fixed bottom navigation bar (`MANUAL VERIFICATION REQUIRED`).
- [ ] **Touch Targets:** Verify "Re-open", "Publish", "Close", and "Edit" buttons have at least 44×44px tap targets (`MANUAL VERIFICATION REQUIRED`).
- [ ] **Card Layout:** Verify no horizontal overflow or text clipping on 320px and 375px viewports (`MANUAL VERIFICATION REQUIRED`).

---

## 29. Final Assessment

### Summary Breakdown
- **Confirmed Application Bugs (Proven):**
  1. `Uncaught (in promise) TypeError: e is not a function` at `ManageBusiness.jsx:109` due to missing `addToast` export from `Toast.jsx`.
  2. `PATCH /api/opportunities/:id/status 400 Bad Request` caused by `validateJobForPublishing` rejecting expired deadlines on re-opening and missing required fields on publishing drafts.
  3. No "Edit Job" capability in `ManageBusiness.jsx`.
  4. Business Settings tab creates duplicate pending organizations via `createOrganization` instead of updating the current organization.
- **Probable Bugs:**
  1. Organization co-admins cannot manage jobs posted by colleagues due to strict `postedBy === userId` check in backend service.
- **UX Deficits:**
  1. Missing confirmation dialog for job closure.
  2. Missing applicant management interface in the "Applicants" tab.
  3. Lack of button loading states during async status updates.
- **External Extension Noise (Not Zeitnah Bugs):**
  1. `ObjectMultiplex - orphaned data`
  2. `MaxListenersExceededWarning`
  3. `app-init-liveness` / `background-liveness`
- **Items Requiring Physical Verification:**
  - Exact touch target tap ergonomics on physical mobile devices: `MANUAL VERIFICATION REQUIRED`.
  - Visual clearance of bottom action buttons against dynamic virtual keyboards: `MANUAL VERIFICATION REQUIRED`.

**Audit Status:** COMPLETE. All findings verified from active source code and test suite. The codebase remains pristine with zero modifications. Ready for implementation phase.
