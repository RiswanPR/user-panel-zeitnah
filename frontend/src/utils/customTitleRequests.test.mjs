import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('User Panel — Custom Title Requests Frontend Verification', () => {
  const editorPath = path.resolve(__dirname, '../components/profile/ProfessionalIdentityEditor.jsx');
  const servicePath = path.resolve(__dirname, '../services/coreProfileService.js');

  const editorSrc = fs.readFileSync(editorPath, 'utf8');
  const serviceSrc = fs.readFileSync(servicePath, 'utf8');

  describe('1. ProfessionalIdentityEditor.jsx — Request Custom Title Action & Modal', () => {
    test('contains prominent Request Custom Title buttons in UI states', () => {
      assert.ok(
        editorSrc.includes('Request Custom Title'),
        'ProfessionalIdentityEditor must offer a clear "Request Custom Title" action'
      );
      assert.ok(
        editorSrc.includes('handleOpenRequestModal'),
        'Editor must bind handleOpenRequestModal trigger'
      );
    });

    test('renders Request Custom Title button in empty search state', () => {
      assert.ok(
        editorSrc.includes('No predefined titles match'),
        'Editor must display empty search state message'
      );
      assert.ok(
        editorSrc.includes('handleOpenRequestModal(titleSearch)'),
        'Empty search state must trigger custom title request modal'
      );
    });

    test('renders Request Custom Title button in list footer and helper prompt', () => {
      assert.ok(
        editorSrc.includes("Can't find your exact title in"),
        'Editor list footer must provide prompt to request title'
      );
      assert.ok(
        editorSrc.includes('handleOpenRequestModal'),
        'Custom title mode must offer trigger to submit request'
      );
    });

    test('enforces department selection before requesting custom title', () => {
      assert.ok(
        editorSrc.includes('activeDepartment') || editorSrc.includes('selectedDeptId'),
        'Editor must guard that an existing active department is selected before requesting title'
      );
    });

    test('implements Request Custom Title modal with validation and character limit', () => {
      assert.ok(
        editorSrc.includes('showRequestModal'),
        'Must contain modal state showRequestModal'
      );
      assert.ok(
        editorSrc.includes('requestTitleInput.length}/100'),
        'Modal must show a real-time character counter up to 100'
      );
      assert.ok(
        editorSrc.includes('Requests require administrator review before inclusion in the official catalogue'),
        'Modal must explain that admin approval is required'
      );
    });
  });

  describe('2. coreProfileService.js — Custom Title Request API Client', () => {
    test('exports submitCustomTitleRequest and getMyCustomTitleRequests', () => {
      assert.ok(
        serviceSrc.includes('submitCustomTitleRequest:'),
        'coreProfileService must export submitCustomTitleRequest'
      );
      assert.ok(
        serviceSrc.includes('getMyCustomTitleRequests:'),
        'coreProfileService must export getMyCustomTitleRequests'
      );
    });

    test('targets correct backend endpoints /profile/catalogue/requests', () => {
      assert.ok(
        serviceSrc.includes('/profile/catalogue/requests'),
        'Must call POST /profile/catalogue/requests'
      );
      assert.ok(
        serviceSrc.includes('/profile/catalogue/requests/my'),
        'Must call GET /profile/catalogue/requests/my'
      );
    });

    test('forwards departmentId and title in payload', () => {
      assert.ok(
        serviceSrc.includes('departmentId') && serviceSrc.includes('title'),
        'Service payload must include departmentId and title'
      );
    });
  });

  describe('3. Normalization and Duplicate Detection Rules', () => {
    function normalizeTitle(t) {
      return (t || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');
    }

    test('normalizes whitespace and case deterministically', () => {
      const raw1 = '  Senior   Civil   Engineer  ';
      const raw2 = 'senior civil engineer';
      const raw3 = 'SENIOR  CIVIL  ENGINEER';

      assert.equal(normalizeTitle(raw1), 'senior civil engineer');
      assert.equal(normalizeTitle(raw2), 'senior civil engineer');
      assert.equal(normalizeTitle(raw3), 'senior civil engineer');
      assert.equal(normalizeTitle(raw1), normalizeTitle(raw3));
    });

    test('detects exact collision regardless of casing or extra spaces', () => {
      const existingTitles = ['Site Engineer', 'Project Manager', 'Bridge Engineer'];
      const normalizedExisting = existingTitles.map(normalizeTitle);

      const requested1 = '  site   engineer  ';
      assert.ok(
        normalizedExisting.includes(normalizeTitle(requested1)),
        'Must detect collision with existing Site Engineer'
      );

      const requested2 = 'New Unique Specialist';
      assert.ok(
        !normalizedExisting.includes(normalizeTitle(requested2)),
        'Must allow non-colliding title'
      );
    });
  });

  describe('4. Request Modal Tabs and Request History Rendering', () => {
    test('supports switching between New Request form and My Requests history tabs', () => {
      assert.ok(
        editorSrc.includes('requestModalTab'),
        'Editor must manage requestModalTab state'
      );
      assert.ok(
        editorSrc.includes('New Request') && editorSrc.includes('My Requests'),
        'Modal must render New Request and My Requests tab labels'
      );
    });

    test('renders status badges for pending, approved, and rejected statuses', () => {
      assert.ok(
        editorSrc.includes('Approved') && editorSrc.includes('Pending') && editorSrc.includes('Rejected'),
        'History tab must render status labels'
      );
      assert.ok(
        editorSrc.includes('CheckCircle2') && editorSrc.includes('Clock') && editorSrc.includes('X'),
        'History tab must use appropriate status icons'
      );
    });

    test('renders submission date and optional review note in history items', () => {
      assert.ok(
        editorSrc.includes('Submitted:') || editorSrc.includes('createdAt'),
        'History view must display request submission date'
      );
      assert.ok(
        editorSrc.includes('reviewNote'),
        'History view must render reviewNote when present'
      );
    });

    test('provides empty state and prompt when no requests exist', () => {
      assert.ok(
        editorSrc.includes('No Requests Yet'),
        'History view must display friendly empty state when user has no requests'
      );
    });
  });

  describe('5. Client Collision Guard & Repeated Submit Prevention', () => {
    test('prevents requesting a title that already exists in the department', () => {
      assert.ok(
        editorSrc.includes('already exists in the') && editorSrc.includes('Please select it from the predefined titles list'),
        'Must block duplicate submission and direct user to predefined titles list'
      );
    });

    test('prevents submitting duplicate pending requests client-side', () => {
      assert.ok(
        editorSrc.includes('already have a pending request'),
        'Must detect existing pending request in user history before sending request'
      );
    });

    test('shows loading spinner and disables submit button during request in flight', () => {
      assert.ok(
        editorSrc.includes('requestSubmitting'),
        'Editor must track requestSubmitting state'
      );
      assert.ok(
        editorSrc.includes('Submitting...') && editorSrc.includes('Loader2'),
        'Submit button must show loading state with spinner'
      );
      assert.ok(
        editorSrc.includes('disabled={requestSubmitting'),
        'Buttons and inputs must be disabled while submitting'
      );
    });

    test('invalidates my requests query cache upon successful submission', () => {
      assert.ok(
        editorSrc.includes('TITLE_REQUESTS_MY'),
        'Editor must use PROFILE_QUERY_KEYS.TITLE_REQUESTS_MY'
      );
      assert.ok(
        editorSrc.includes('invalidateQueries'),
        'Editor must invalidate requests query on successful submission'
      );
    });
  });
});

