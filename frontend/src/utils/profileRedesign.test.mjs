import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Helpers reflecting the authoritative profile architecture
export function normalizeProfileSection(sectionParam) {
  if (!sectionParam) return 'basic-info';
  const raw = String(sectionParam).toLowerCase().trim();
  if (raw === 'introduction' || raw === 'about') return 'basic-info';
  const VALID_SECTIONS = [
    'basic-info',
    'professional-identity',
    'infrastructure-expertise',
    'skills',
    'experience',
    'projects',
    'education',
    'certifications',
    'career-preferences',
    'recommendations',
    'public-profile',
  ];
  return VALID_SECTIONS.includes(raw) ? raw : 'basic-info';
}

export function evaluateSectionCompletion(sectionId, profile) {
  if (!profile) return 'not-started';
  switch (sectionId) {
    case 'basic-info':
      if (profile.name && profile.avatar && profile.bio) return 'complete';
      if (profile.name || profile.avatar) return 'in-progress';
      return 'not-started';
    case 'professional-identity':
      if (profile.headline && profile.primaryRole) return 'complete';
      if (profile.headline || profile.primaryRole) return 'in-progress';
      return 'not-started';
    case 'infrastructure-expertise':
      if (profile.primaryDiscipline && (profile.infrastructureSectors?.length > 0 || profile.specializations?.length > 0)) return 'complete';
      if (profile.primaryDiscipline) return 'in-progress';
      return 'not-started';
    case 'skills':
      if (Array.isArray(profile.skills) && profile.skills.length >= 3) return 'complete';
      if (Array.isArray(profile.skills) && profile.skills.length > 0) return 'in-progress';
      return 'not-started';
    case 'experience':
      return Array.isArray(profile.experience) && profile.experience.length > 0 ? 'complete' : 'not-started';
    case 'projects':
      return Array.isArray(profile.projects) && profile.projects.length > 0 ? 'complete' : 'not-started';
    case 'education':
      return Array.isArray(profile.education) && profile.education.length > 0 ? 'complete' : 'not-started';
    case 'certifications':
      return Array.isArray(profile.certifications) && profile.certifications.length > 0 ? 'complete' : 'not-started';
    case 'career-preferences':
      if (profile.careerPreferences?.targetRoles?.length > 0 || profile.careerPreferences?.preferredRoles?.length > 0) return 'complete';
      return 'not-started';
    case 'recommendations':
      return Array.isArray(profile.recommendations) && profile.recommendations.length > 0 ? 'complete' : 'not-started';
    case 'public-profile':
      if (profile.publicProfilePublished) return 'complete';
      if (profile.completion?.publicProfileReady) return 'in-progress';
      return 'not-started';
    default:
      return 'not-started';
  }
}

export function getCanonicalProfileSubroutes() {
  return [
    { id: 'overview', path: '/profile', label: 'Overview' },
    { id: 'edit', path: '/profile/edit', label: 'Profile Studio' },
    { id: 'portfolio', path: '/profile/portfolio', label: 'Portfolio & Work' },
    { id: 'verification', path: '/profile/verification', label: 'Trust & Verification' },
    { id: 'public', path: '/public-profile', label: 'Public View' },
  ];
}

export function validateRecommendationPayload(payload) {
  const ALLOWED_RELATIONSHIPS = ['Mentor', 'Instructor', 'Peer / Student', 'Collaborator', 'Other'];
  if (!payload.recipientId) return { valid: false, error: 'Recipient ID is required.' };
  if (!ALLOWED_RELATIONSHIPS.includes(payload.relationship)) {
    return { valid: false, error: 'Invalid relationship category.' };
  }
  if (!payload.content || payload.content.trim().length < 20) {
    return { valid: false, error: 'Content must be at least 20 characters.' };
  }
  if (payload.content.length > 1000) {
    return { valid: false, error: 'Content must not exceed 1000 characters.' };
  }
  return { valid: true };
}

export function normalizeRecommendationStatus(status) {
  const s = String(status || '').toLowerCase().trim();
  if (s === 'approved') return 'approved';
  if (s === 'hidden') return 'hidden';
  return 'pending';
}

export function mergePublicProfileRecommendations(userObj, apiRecommendations) {
  const merged = { ...userObj };
  if (Array.isArray(apiRecommendations)) {
    merged.recommendations = apiRecommendations;
  }
  return merged;
}

describe('Profile Redesign Architecture & Routing Validation', () => {
  it('normalizes legacy section query parameters safely', () => {
    assert.equal(normalizeProfileSection('about'), 'basic-info');
    assert.equal(normalizeProfileSection('introduction'), 'basic-info');
    assert.equal(normalizeProfileSection(''), 'basic-info');
    assert.equal(normalizeProfileSection(null), 'basic-info');
    assert.equal(normalizeProfileSection(undefined), 'basic-info');
    assert.equal(normalizeProfileSection('unknown-section-xyz'), 'basic-info');
    assert.equal(normalizeProfileSection('experience'), 'experience');
    assert.equal(normalizeProfileSection('infrastructure-expertise'), 'infrastructure-expertise');
    assert.equal(normalizeProfileSection('public-profile'), 'public-profile');
  });

  it('evaluates section completion progression accurately', () => {
    const emptyProfile = {};
    assert.equal(evaluateSectionCompletion('basic-info', emptyProfile), 'not-started');
    assert.equal(evaluateSectionCompletion('skills', emptyProfile), 'not-started');
    assert.equal(evaluateSectionCompletion('experience', emptyProfile), 'not-started');

    const partialProfile = {
      name: 'Riswan P.R',
      skills: ['AutoCAD'],
      primaryDiscipline: 'Civil Infrastructure',
    };
    assert.equal(evaluateSectionCompletion('basic-info', partialProfile), 'in-progress');
    assert.equal(evaluateSectionCompletion('skills', partialProfile), 'in-progress');
    assert.equal(evaluateSectionCompletion('infrastructure-expertise', partialProfile), 'in-progress');

    const fullProfile = {
      name: 'Riswan P.R',
      avatar: 'uploads/avatar.jpg',
      bio: 'Planning Engineer and Infrastructure Lead',
      headline: 'Senior Infrastructure Engineer',
      primaryRole: 'PROFESSIONAL',
      primaryDiscipline: 'Civil Infrastructure',
      infrastructureSectors: ['Transportation & Highways'],
      skills: ['AutoCAD', 'Revit', 'Primavera P6'],
      experience: [{ id: '1', role: 'Planning Engineer' }],
      education: [{ id: '1', qualification: 'B.Tech' }],
      certifications: [{ id: '1', name: 'PMP' }],
      publicProfilePublished: true,
    };
    assert.equal(evaluateSectionCompletion('basic-info', fullProfile), 'complete');
    assert.equal(evaluateSectionCompletion('professional-identity', fullProfile), 'complete');
    assert.equal(evaluateSectionCompletion('infrastructure-expertise', fullProfile), 'complete');
    assert.equal(evaluateSectionCompletion('skills', fullProfile), 'complete');
    assert.equal(evaluateSectionCompletion('experience', fullProfile), 'complete');
    assert.equal(evaluateSectionCompletion('education', fullProfile), 'complete');
    assert.equal(evaluateSectionCompletion('certifications', fullProfile), 'complete');
    assert.equal(evaluateSectionCompletion('public-profile', fullProfile), 'complete');
  });

  it('guarantees canonical profile subroutes have no trailing slashes or hash stubs', () => {
    const subroutes = getCanonicalProfileSubroutes();
    assert.equal(subroutes.length, 5);

    for (const route of subroutes) {
      assert.ok(route.path.startsWith('/'), `Route path ${route.path} must start with /`);
      assert.ok(!route.path.endsWith('/') || route.path === '/', `Route path ${route.path} must not end with trailing slash`);
      assert.ok(!route.path.includes('#'), `Route path ${route.path} must not contain hash fragment`);
      assert.ok(route.label.length > 0, `Route ${route.id} must have a label`);
    }
  });

  it('ensures all 11 studio section configurations are distinct and valid', () => {
    const SECTION_IDS = [
      'basic-info',
      'professional-identity',
      'infrastructure-expertise',
      'skills',
      'experience',
      'projects',
      'education',
      'certifications',
      'career-preferences',
      'recommendations',
      'public-profile',
    ];
    const uniqueIds = new Set(SECTION_IDS);
    assert.equal(uniqueIds.size, 11, 'All 11 section IDs must be distinct');

    for (const id of SECTION_IDS) {
      assert.equal(normalizeProfileSection(id), id, `Section ID ${id} must normalize to itself`);
    }
  });

  it('validates recommendation submission payloads against backend schema constraints', () => {
    // Valid payload
    const valid = validateRecommendationPayload({
      recipientId: '6abf838ab7fbc08a9817b6a4',
      relationship: 'Peer / Student',
      content: 'A fantastic planning engineer with deep Primavera P6 and BIM expertise on metro rail projects.',
    });
    assert.equal(valid.valid, true);

    // Invalid relationship
    const invalidRel = validateRecommendationPayload({
      recipientId: '6abf838ab7fbc08a9817b6a4',
      relationship: 'Random Stranger',
      content: 'A fantastic planning engineer with deep Primavera P6 and BIM expertise.',
    });
    assert.equal(invalidRel.valid, false);

    // Too short content (<20 chars)
    const tooShort = validateRecommendationPayload({
      recipientId: '6abf838ab7fbc08a9817b6a4',
      relationship: 'Mentor',
      content: 'Great guy!',
    });
    assert.equal(tooShort.valid, false);

    // Missing recipient ID
    const missingRecipient = validateRecommendationPayload({
      recipientId: '',
      relationship: 'Mentor',
      content: 'A fantastic planning engineer with deep Primavera P6 expertise.',
    });
    assert.equal(missingRecipient.valid, false);
  });

  it('normalizes recommendation status and merges public recommendations array', () => {
    assert.equal(normalizeRecommendationStatus('APPROVED'), 'approved');
    assert.equal(normalizeRecommendationStatus('approved'), 'approved');
    assert.equal(normalizeRecommendationStatus('hidden'), 'hidden');
    assert.equal(normalizeRecommendationStatus('pending'), 'pending');
    assert.equal(normalizeRecommendationStatus(null), 'pending');

    const baseUser = { name: 'Riswan P.R', username: 'riswan' };
    const apiRecs = [{ id: 'rec-1', content: 'Outstanding engineer', status: 'approved' }];
    const merged = mergePublicProfileRecommendations(baseUser, apiRecs);
    assert.equal(merged.recommendations.length, 1);
    assert.equal(merged.recommendations[0].id, 'rec-1');
  });
});
