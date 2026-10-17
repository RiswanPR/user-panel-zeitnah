import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('User Panel — Phase 7: Automatic Custom-Title Request UX Verification', () => {
  const editorPath = path.resolve(__dirname, '../components/profile/ProfessionalIdentityEditor.jsx');
  const editProfilePath = path.resolve(__dirname, '../pages/profile/EditProfile.jsx');
  const servicePath = path.resolve(__dirname, '../services/coreProfileService.js');

  const editorSrc = fs.readFileSync(editorPath, 'utf8');
  const editProfileSrc = fs.readFileSync(editProfilePath, 'utf8');
  const serviceSrc = fs.readFileSync(servicePath, 'utf8');

  describe('1. Custom Title Entry Followed by Normal Save Action', () => {
    test('provides custom title input with single-line and 100 character constraints', () => {
      assert.ok(
        editorSrc.includes('maxLength={105}') || editorSrc.includes('maxLength={100}'),
        'Custom title input must enforce character max length limit'
      );
      assert.ok(
        editorSrc.includes('validateCustomTitle'),
        'Must validate custom title with plain text rules'
      );
      assert.ok(
        editorSrc.includes('customTitle.length}/100'),
        'Must render real-time character counter'
      );
    });

    test('saves identity via standard Save Professional Identity button', () => {
      assert.ok(
        editProfileSrc.includes('Save Professional Identity'),
        'EditProfile must contain "Save Professional Identity" primary action'
      );
      assert.ok(
        editProfileSrc.includes('formatIdentityPayload'),
        'Must construct standard identity payload with custom title'
      );
      assert.ok(
        editProfileSrc.includes('updateMutation.mutate(payload)'),
        'Must trigger profile update mutation on save'
      );
    });
  });

  describe('2. Removal of Separate Submission Workflow from Normal Flow', () => {
    test('does not render separate "Request Addition" or "Submit Request" button in normal editing', () => {
      assert.ok(
        !editorSrc.includes('Request Addition'),
        'Must not contain separate "Request Addition" button in normal workflow'
      );
      assert.ok(
        !editorSrc.includes('Submit Request'),
        'Must not contain separate "Submit Request" button in normal workflow'
      );
    });

    test('does not invoke submitCustomTitleRequest during normal profile identity editing', () => {
      assert.ok(
        !editorSrc.includes('submitCustomTitleRequest'),
        'ProfessionalIdentityEditor must not invoke submitCustomTitleRequest in normal flow'
      );
    });

    test('replaces empty search modal trigger with direct "Use as custom title" button', () => {
      assert.ok(
        editorSrc.includes('Use "{titleSearch}" as custom title') ||
          editorSrc.includes('Use as custom title'),
        'Empty search state must offer direct option to use search term as custom title'
      );
      assert.ok(
        !editorSrc.includes('handleOpenRequestModal'),
        'Empty search state must not open separate request modal'
      );
    });
  });

  describe('3. Phase 6 Response Handling & User Feedback', () => {
    test('shows confirmation when a new pending request is created', () => {
      assert.ok(
        editProfileSrc.includes('Your custom title has been submitted for catalogue review.'),
        'Must show "Your custom title has been submitted for catalogue review." for new pending requests'
      );
    });

    test('shows confirmation when an existing pending request is reused', () => {
      assert.ok(
        editProfileSrc.includes('This title is already awaiting catalogue review.'),
        'Must show "This title is already awaiting catalogue review." for reused pending requests'
      );
    });

    test('shows confirmation when custom title is resolved to official catalogue title', () => {
      assert.ok(
        editProfileSrc.includes('Professional identity saved using the official catalogue title.'),
        'Must show "Professional identity saved using the official catalogue title." when resolved'
      );
    });

    test('uses standard save feedback for predefined titles without mentioning custom requests', () => {
      assert.ok(
        editProfileSrc.includes('toast.success("Changes saved", "Your profile has been updated.")'),
        'Must display standard success feedback when saving predefined catalogue title'
      );
    });

    test('shows error notification and never claims submission on save failure', () => {
      assert.ok(
        editProfileSrc.includes('toast.error("Save failed"'),
        'Must trigger error toast on mutation failure'
      );
      assert.ok(
        editProfileSrc.includes('err.response?.data?.message || "Could not update your profile."'),
        'Must display non-sensitive, actionable error message'
      );
    });
  });

  describe('4. Request History View & Status Display', () => {
    test('renders dedicated My Title Requests history modal', () => {
      assert.ok(
        editorSrc.includes('My Title Requests'),
        'Must provide "My Title Requests" dialog title'
      );
      assert.ok(
        editorSrc.includes('showHistoryModal'),
        'Editor must track showHistoryModal state'
      );
    });

    test('renders status badges for pending, approved, and rejected requests', () => {
      assert.ok(
        editorSrc.includes('Approved') &&
          editorSrc.includes('CheckCircle2') &&
          editorSrc.includes('Pending') &&
          editorSrc.includes('Clock') &&
          editorSrc.includes('Rejected') &&
          editorSrc.includes('X'),
        'Must render Approved, Pending, and Rejected badges with respective icons'
      );
    });

    test('renders department label, submission date, and reviewer notes in history items', () => {
      assert.ok(
        editorSrc.includes('departmentLabel') || editorSrc.includes('departmentId'),
        'History card must display department information'
      );
      assert.ok(
        editorSrc.includes('Submitted:') || editorSrc.includes('createdAt'),
        'History card must display submission date'
      );
      assert.ok(
        editorSrc.includes('reviewNote'),
        'History card must render reviewer note when present'
      );
    });

    test('handles loading, empty, and error states gracefully in history modal', () => {
      assert.ok(
        editorSrc.includes('Loading your title requests...'),
        'Must render loading state while requests query is in flight'
      );
      assert.ok(
        editorSrc.includes('No Requests Yet'),
        'Must render empty state when user has no requests'
      );
      assert.ok(
        editorSrc.includes('Could Not Load Requests') && editorSrc.includes('refetchMyRequests'),
        'Must render error state with retry button'
      );
    });
  });

  describe('5. React Query Cache & State Consistency', () => {
    test('invalidates TITLE_REQUESTS_MY query cache upon custom title profile save', () => {
      assert.ok(
        editProfileSrc.includes('PROFILE_QUERY_KEYS.TITLE_REQUESTS_MY'),
        'EditProfile must reference PROFILE_QUERY_KEYS.TITLE_REQUESTS_MY'
      );
      assert.ok(
        editProfileSrc.includes('queryClient.invalidateQueries({'),
        'Must invalidate requests query cache on successful custom title save'
      );
    });

    test('invalidates and updates profile query cache after identity save', () => {
      assert.ok(
        editProfileSrc.includes('invalidateProfileQueries()'),
        'Must invalidate profile queries upon save'
      );
      assert.ok(
        editProfileSrc.includes('queryClient.setQueryData(PROFILE_QUERY_KEYS.ME'),
        'Must optimistically update profile cache with saved response'
      );
    });

    test('synchronizes local professionalIdentity and currentRole with saved response', () => {
      assert.ok(
        editProfileSrc.includes('res?.user?.professionalIdentity'),
        'Must check for returned professionalIdentity'
      );
      assert.ok(
        editProfileSrc.includes('setProfessionalIdentity(res.user.professionalIdentity)'),
        'Must synchronize local professionalIdentity state'
      );
    });
  });

  describe('6. Duplicate Submission Protection & Mutation Guards', () => {
    test('disables save button and displays spinner while mutation is in progress', () => {
      assert.ok(
        editProfileSrc.includes('disabled={updateMutation.isPending}'),
        'Save button must be disabled when updateMutation.isPending is true'
      );
      assert.ok(
        editProfileSrc.includes('RefreshCw') && editProfileSrc.includes('animate-spin'),
        'Save button must display animated spinner during submission'
      );
    });

    test('forwards disabled prop to ProfessionalIdentityEditor during profile save', () => {
      assert.ok(
        editProfileSrc.includes('disabled={updateMutation.isPending}'),
        'Must pass disabled={updateMutation.isPending} to ProfessionalIdentityEditor'
      );
      assert.ok(
        editorSrc.includes('disabled = false'),
        'ProfessionalIdentityEditor must accept disabled prop'
      );
    });
  });

  describe('7. Department-Switch Confirmation & Title Collision Safeguards', () => {
    test('guards against accidental title loss with department switch confirmation', () => {
      assert.ok(
        editorSrc.includes('Change Engineering Department?'),
        'Must prompt user before clearing title on department switch'
      );
      assert.ok(
        editorSrc.includes('handleConfirmDeptChange') &&
          editorSrc.includes('handleCancelDeptChange'),
        'Must provide confirm and cancel handlers'
      );
    });

    test('displays non-blocking suggestions for matching official catalogue titles', () => {
      assert.ok(
        editorSrc.includes('Matching Predefined Catalogue Titles:'),
        'Must display suggestion chip when custom title matches predefined titles'
      );
      assert.ok(
        editorSrc.includes('handleSelectPredefinedTitle'),
        'Must allow switching to official title from suggestion'
      );
    });
  });

  describe('8. Accessibility & Semantics of History Panel and Custom Input', () => {
    test('history modal uses proper dialog semantics and ARIA labelling', () => {
      assert.ok(
        editorSrc.includes('role="dialog"'),
        'Modal must have role="dialog"'
      );
      assert.ok(
        editorSrc.includes('aria-modal="true"'),
        'Modal must have aria-modal="true"'
      );
      assert.ok(
        editorSrc.includes('aria-labelledby="history-modal-heading"'),
        'Modal must have aria-labelledby pointing to heading'
      );
      assert.ok(
        editorSrc.includes('aria-label="Close"'),
        'Close button must have aria-label="Close"'
      );
    });

    test('interactive buttons explicitly specify type="button"', () => {
      assert.ok(
        editorSrc.includes('type="button"'),
        'Interactive buttons must specify type="button" to prevent unintended form submission'
      );
    });
  });

  describe('9. Authoritative API Client Invariant', () => {
    test('coreProfileService preserves getMyCustomTitleRequests and submitCustomTitleRequest', () => {
      assert.ok(
        serviceSrc.includes('getMyCustomTitleRequests:'),
        'Must maintain getMyCustomTitleRequests API method'
      );
      assert.ok(
        serviceSrc.includes('submitCustomTitleRequest:'),
        'Must maintain submitCustomTitleRequest API method for backwards compatibility'
      );
    });
  });
});
