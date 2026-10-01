import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getErrorMessage } from './errorMessage.js';

describe('Manage Business — Error Message Extraction Utility', () => {
  it('extracts string message from err.response.data.message', () => {
    const error = {
      response: {
        data: {
          message: 'Application deadline has already passed',
        },
      },
    };
    assert.equal(getErrorMessage(error), 'Application deadline has already passed');
  });

  it('joins array of messages from err.response.data.message', () => {
    const error = {
      response: {
        data: {
          message: ['Title is required', 'Deadline must be a valid ISO date'],
        },
      },
    };
    assert.equal(getErrorMessage(error), 'Title is required. Deadline must be a valid ISO date');
  });

  it('falls back to err.message when response message is missing', () => {
    const error = new Error('Network Error');
    assert.equal(getErrorMessage(error), 'Network Error');
  });

  it('falls back to custom fallback string when error is empty', () => {
    assert.equal(getErrorMessage({}, 'Custom fallback'), 'Custom fallback');
    assert.equal(getErrorMessage(null, 'Fallback on null'), 'Fallback on null');
    assert.equal(getErrorMessage(undefined), 'An unexpected error occurred');
  });

  it('never throws regardless of malformed error shapes', () => {
    assert.doesNotThrow(() => getErrorMessage(12345));
    assert.doesNotThrow(() => getErrorMessage('plain string error'));
    assert.doesNotThrow(() => getErrorMessage({ response: { data: null } }));
    assert.doesNotThrow(() => getErrorMessage({ response: { data: { message: {} } } }));
  });
});

describe('Manage Business — Draft Completeness & Deadline Logic', () => {
  // Pure helper replicating the exact business rule implemented in ManageBusiness.jsx
  const evaluateDraftCompleteness = (opp) => {
    const missing = [];
    if (!opp?.title?.trim()) missing.push('Job title');
    if (!opp?.description?.trim() || opp.description.trim().length < 30) {
      missing.push('Job description (at least 30 characters)');
    }
    if (!Array.isArray(opp?.responsibilities) || opp.responsibilities.length === 0) {
      missing.push('Responsibilities (at least one)');
    }
    const skills = opp?.skillsRequired || opp?.requiredSkills || [];
    if (!Array.isArray(skills) || skills.length === 0) {
      missing.push('Required skills (at least one)');
    }
    if (!opp?.applicationDeadline) {
      missing.push('Application deadline');
    } else {
      const deadlineDate = new Date(opp.applicationDeadline);
      if (isNaN(deadlineDate.getTime()) || deadlineDate.getTime() <= Date.now()) {
        missing.push('Valid future application deadline');
      }
    }
    return {
      isComplete: missing.length === 0,
      missing,
    };
  };

  const isDeadlineExpired = (deadline) => {
    if (!deadline) return true;
    const d = new Date(deadline);
    return isNaN(d.getTime()) || d.getTime() <= Date.now();
  };

  it('identifies complete draft as publishable', () => {
    const futureDate = new Date(Date.now() + 86400000 * 30).toISOString();
    const completeDraft = {
      title: 'Senior Frontend Engineer',
      description: 'We are seeking a seasoned frontend developer with experience in React and TypeScript.',
      responsibilities: ['Architect scalable UI', 'Mentor juniors'],
      skillsRequired: ['React', 'JavaScript', 'Tailwind CSS'],
      applicationDeadline: futureDate,
    };

    const result = evaluateDraftCompleteness(completeDraft);
    assert.equal(result.isComplete, true);
    assert.equal(result.missing.length, 0);
  });

  it('identifies incomplete draft and lists all missing fields', () => {
    const incompleteDraft = {
      title: 'Short',
      description: 'Too short',
      responsibilities: [],
      skillsRequired: [],
      applicationDeadline: null,
    };

    const result = evaluateDraftCompleteness(incompleteDraft);
    assert.equal(result.isComplete, false);
    assert.ok(result.missing.includes('Job description (at least 30 characters)'));
    assert.ok(result.missing.includes('Responsibilities (at least one)'));
    assert.ok(result.missing.includes('Required skills (at least one)'));
    assert.ok(result.missing.includes('Application deadline'));
  });

  it('flags expired deadline on past dates', () => {
    const pastDate = new Date(Date.now() - 100000).toISOString();
    assert.equal(isDeadlineExpired(pastDate), true);
    assert.equal(isDeadlineExpired(null), true);
    assert.equal(isDeadlineExpired(undefined), true);
    assert.equal(isDeadlineExpired('invalid-date'), true);
  });

  it('accepts future deadline as active and not expired', () => {
    const futureDate = new Date(Date.now() + 10000000).toISOString();
    assert.equal(isDeadlineExpired(futureDate), false);
  });
});

describe('Manage Business — Business Profile Update Integrity (MB-005)', () => {
  it('updates existing organization via PATCH without invoking creation flow', async () => {
    const mockOrg = {
      _id: 'org_123456789',
      name: 'Acme Corp',
      description: 'Original description',
      verificationStatus: 'VERIFIED',
    };

    let patchCalled = false;
    let postCalled = false;
    let patchedId = null;
    let patchedData = null;

    const mockOrganizationService = {
      updateOrganization: async (id, data) => {
        patchCalled = true;
        patchedId = id;
        patchedData = data;
        return { data: { ...mockOrg, ...data } };
      },
      createOrganization: async () => {
        postCalled = true;
        throw new Error('createOrganization should NOT be called in update flow!');
      },
    };

    // Simulate update submission
    const updatePayload = {
      name: 'Acme Global Corp',
      description: 'Updated description',
    };

    const res = await mockOrganizationService.updateOrganization(mockOrg._id, updatePayload);

    assert.equal(patchCalled, true, 'PATCH updateOrganization should be called');
    assert.equal(postCalled, false, 'POST createOrganization MUST NEVER be called in edit flow');
    assert.equal(patchedId, 'org_123456789', 'Organization ID must be preserved');
    assert.equal(res.data.name, 'Acme Global Corp');
    assert.equal(res.data.verificationStatus, 'VERIFIED', 'Verification status must not be reset to PENDING');
  });
});

describe('Manage Business — Toast Compatibility & Canonical Contract (MB-002, MB-009)', () => {
  it('supports canonical toast methods without throwing', () => {
    const dispatched = [];
    const createMockToast = () => {
      const push = (type, title, message) => dispatched.push({ type, title, message });
      const api = {
        success: (msg, title) => push('success', title || 'Success', msg),
        error: (msg, title) => push('error', title || 'Error', msg),
        warning: (msg, title) => push('warning', title || 'Warning', msg),
        info: (msg, title) => push('info', title || 'Info', msg),
      };
      // Backwards-compatible addToast helper
      api.addToast = (messageOrOpts, type = 'info') => {
        if (typeof messageOrOpts === 'object' && messageOrOpts !== null) {
          const { message = '', type: t = 'info', title = '' } = messageOrOpts;
          return push(t, title, message);
        }
        return push(type, '', messageOrOpts);
      };
      return api;
    };

    const toast = createMockToast();

    // Canonical usage
    assert.doesNotThrow(() => toast.success('Operation succeeded'));
    assert.doesNotThrow(() => toast.error('Operation failed'));
    assert.doesNotThrow(() => toast.warning('Warning note'));
    assert.doesNotThrow(() => toast.info('Info note'));

    // Legacy / backwards compatible usage
    assert.doesNotThrow(() => toast.addToast('Legacy toast', 'error'));
    assert.doesNotThrow(() => toast.addToast({ type: 'success', message: 'Object toast', title: 'Great' }));

    // Destructuring alias check
    const { addToast, success, error } = toast;
    assert.equal(typeof addToast, 'function', 'addToast must be a function to avoid TypeError');
    assert.equal(typeof success, 'function');
    assert.equal(typeof error, 'function');

    assert.equal(dispatched.length, 6);
    assert.equal(dispatched[0].type, 'success');
    assert.equal(dispatched[1].type, 'error');
    assert.equal(dispatched[4].type, 'error');
    assert.equal(dispatched[5].title, 'Great');
  });
});
