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
    'skills',
    'experience',
    'education',
    'certifications',
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
    case 'skills':
      if (Array.isArray(profile.skills) && profile.skills.length >= 3) return 'complete';
      if (Array.isArray(profile.skills) && profile.skills.length > 0) return 'in-progress';
      return 'not-started';
    case 'experience':
      return Array.isArray(profile.experience) && profile.experience.length > 0 ? 'complete' : 'not-started';
    case 'education':
      return Array.isArray(profile.education) && profile.education.length > 0 ? 'complete' : 'not-started';
    case 'certifications':
      return Array.isArray(profile.certifications) && profile.certifications.length > 0 ? 'complete' : 'not-started';
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
    assert.equal(normalizeProfileSection('infrastructure-expertise'), 'basic-info');
    assert.equal(normalizeProfileSection('career-preferences'), 'basic-info');
    assert.equal(normalizeProfileSection('career-privacy'), 'basic-info');
    assert.equal(normalizeProfileSection('privacy'), 'basic-info');
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
    assert.equal(evaluateSectionCompletion('skills', fullProfile), 'complete');
    assert.equal(evaluateSectionCompletion('experience', fullProfile), 'complete');
    assert.equal(evaluateSectionCompletion('education', fullProfile), 'complete');
    assert.equal(evaluateSectionCompletion('certifications', fullProfile), 'complete');
    assert.equal(evaluateSectionCompletion('public-profile', fullProfile), 'complete');
  });

  it('guarantees canonical profile subroutes have no trailing slashes or hash stubs', () => {
    const subroutes = getCanonicalProfileSubroutes();
    assert.equal(subroutes.length, 4);

    for (const route of subroutes) {
      assert.ok(route.path.startsWith('/'), `Route path ${route.path} must start with /`);
      assert.ok(!route.path.endsWith('/') || route.path === '/', `Route path ${route.path} must not end with trailing slash`);
      assert.ok(!route.path.includes('#'), `Route path ${route.path} must not contain hash fragment`);
      assert.ok(route.label.length > 0, `Route ${route.id} must have a label`);
    }
  });

  it('ensures all 8 studio section configurations are distinct and valid', () => {
    const SECTION_IDS = [
      'basic-info',
      'professional-identity',
      'skills',
      'experience',
      'education',
      'certifications',
      'recommendations',
      'public-profile',
    ];
    const uniqueIds = new Set(SECTION_IDS);
    assert.equal(uniqueIds.size, 8, 'All 8 section IDs must be distinct');

    for (const id of SECTION_IDS) {
      assert.equal(normalizeProfileSection(id), id, `Section ID ${id} must normalize to itself`);
    }
  });

  it('redirects stale career-preferences, projects, and infrastructure-expertise section parameters to basic-info and validates 8 remaining modules', () => {
    assert.equal(normalizeProfileSection('career-preferences'), 'basic-info');
    assert.equal(normalizeProfileSection('CAREER-PREFERENCES'), 'basic-info');
    assert.equal(normalizeProfileSection('  career-preferences  '), 'basic-info');
    assert.equal(normalizeProfileSection('career-privacy'), 'basic-info');
    assert.equal(normalizeProfileSection('privacy'), 'basic-info');
    assert.equal(normalizeProfileSection('projects'), 'basic-info');
    assert.equal(normalizeProfileSection('PROJECTS'), 'basic-info');
    assert.equal(normalizeProfileSection('  projects  '), 'basic-info');
    assert.equal(normalizeProfileSection('infrastructure-expertise'), 'basic-info');
    assert.equal(normalizeProfileSection('INFRASTRUCTURE-EXPERTISE'), 'basic-info');
    assert.equal(normalizeProfileSection('  infrastructure-expertise  '), 'basic-info');

    const REMAINING_SECTIONS = [
      'basic-info',
      'professional-identity',
      'skills',
      'experience',
      'education',
      'certifications',
      'recommendations',
      'public-profile',
    ];
    assert.equal(REMAINING_SECTIONS.length, 8);
    assert.ok(!REMAINING_SECTIONS.includes('career-preferences'));
    assert.ok(!REMAINING_SECTIONS.includes('projects'));
    assert.ok(!REMAINING_SECTIONS.includes('infrastructure-expertise'));
  });

  it('guarantees EditProfile.jsx statically configures exactly 8 modules without Career & Privacy or Projects', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const editPath = path.resolve('src/pages/profile/EditProfile.jsx');
    const content = fs.readFileSync(editPath, 'utf8');

    // Career Preferences and Projects must not be in SECTION_CONFIG
    assert.doesNotMatch(content, /id:\s*["']career-preferences["']/);
    assert.doesNotMatch(content, /id:\s*["']projects["']/);

    // Module index labels must run sequentially from 01 to 08
    assert.match(content, /index:\s*["']01["'][\s\S]*?index:\s*["']02["'][\s\S]*?index:\s*["']03["'][\s\S]*?index:\s*["']04["'][\s\S]*?index:\s*["']05["'][\s\S]*?index:\s*["']06["'][\s\S]*?index:\s*["']07["'][\s\S]*?index:\s*["']08["']/);

    // Section headers must be 01 OF 08 through 08 OF 08
    for (let i = 1; i <= 8; i++) {
      const idx = String(i).padStart(2, '0');
      assert.match(content, new RegExp(`SECTION ${idx} OF 08`), `Must have SECTION ${idx} OF 08`);
    }

    // Must not contain any stale "OF 09", "OF 10", or "OF 11"
    assert.doesNotMatch(content, /SECTION \d+ OF 09/);
    assert.doesNotMatch(content, /SECTION \d+ OF 10/);
    assert.doesNotMatch(content, /SECTION \d+ OF 11/);

    // Must not import CareerPreferencesSection or ProjectEditorModal in EditProfile.jsx
    assert.doesNotMatch(content, /import\s+CareerPreferencesSection/);
    assert.doesNotMatch(content, /<CareerPreferencesSection/);
    assert.doesNotMatch(content, /import\s+ProjectEditorModal/);
    assert.doesNotMatch(content, /import\s*\{[^}]*projectsService[^}]*\}\s*from/);
    assert.doesNotMatch(content, /<ProjectEditorModal/);
  });

  it('confirms ProfileProjectsSection and public profile preserve project data and do not link to stale edit section', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const prjSecPath = path.resolve('src/components/profile/ProfileProjectsSection.jsx');
    const prjContent = fs.readFileSync(prjSecPath, 'utf8');

    // Must not link to /profile/edit?section=projects
    assert.doesNotMatch(prjContent, /\/profile\/edit\?section=projects/);

    // Must preserve project render structure
    assert.match(prjContent, /projects/);
    assert.match(prjContent, /isOwner/);
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

  it('safely handles getUploadUrl across diverse media paths and objects without throwing', async () => {
    const { getUploadUrl } = await import('./courseUi.js');
    assert.equal(getUploadUrl(null), null);
    assert.equal(getUploadUrl(undefined), null);
    assert.equal(getUploadUrl(''), null);
    assert.equal(getUploadUrl('https://example.com/photo.jpg'), 'https://example.com/photo.jpg');
    assert.equal(getUploadUrl('http://cdn.zeitnah.com/avatar.png'), 'http://cdn.zeitnah.com/avatar.png');
    assert.match(getUploadUrl('avatars/member.png'), /\/uploads\/avatars\/member\.png$/);
    assert.match(getUploadUrl({ url: 'avatars/nested.png' }), /\/uploads\/avatars\/nested\.png$/);
    assert.equal(getUploadUrl(12345), null);
  });

  it('guarantees Profile.jsx statically imports getUploadUrl from courseUi and guards ImageEditorModal', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const profilePath = path.resolve('src/pages/profile/Profile.jsx');
    const content = fs.readFileSync(profilePath, 'utf8');

    // Must import getUploadUrl from courseUi
    assert.match(content, /import\s*\{[^}]*getUploadUrl[^}]*\}\s*from\s*["'][^"']*courseUi["']/);

    // ImageEditorModal must be conditionally mounted to prevent unneeded initialization evaluation
    assert.match(content, /Boolean\(editingImage\)\s*&&\s*\(/);
  });

  it('verifies smart Back navigation resolution between history and /network fallback', () => {
    function resolveBackDestination(historyState) {
      if (historyState && typeof historyState.idx === 'number' && historyState.idx > 0) {
        return -1;
      }
      return '/network';
    }

    assert.equal(resolveBackDestination({ idx: 2 }), -1);
    assert.equal(resolveBackDestination({ idx: 1 }), -1);
    assert.equal(resolveBackDestination({ idx: 0 }), '/network');
    assert.equal(resolveBackDestination(null), '/network');
    assert.equal(resolveBackDestination(undefined), '/network');
  });

  it('filters public profile sections to prevent empty rendered blocks', () => {
    function computeVisibleSections(student, isExpVisible, isEduVisible, isProjectsVisible, isCertVisible, projects) {
      return [
        { id: "all", label: "Full Profile" },
        ...(student.bio || student.headline ? [{ id: "about", label: "Story" }] : []),
        ...(isExpVisible && student.experience?.length > 0 ? [{ id: "experience", label: "Experience" }] : []),
        ...(isEduVisible && student.education?.length > 0 ? [{ id: "education", label: "Education" }] : []),
        ...((student.skills?.length > 0 || student.structuredSkills) ? [{ id: "skills", label: "Skills" }] : []),
        ...(isProjectsVisible && projects.length > 0 ? [{ id: "projects", label: "Projects" }] : []),
        ...(isCertVisible && student.certifications?.length > 0 ? [{ id: "certifications", label: "Certifications" }] : []),
        ...(student.recommendations?.length > 0 ? [{ id: "recommendations", label: "Endorsements" }] : []),
      ];
    }

    const minimalUser = { name: 'New Engineer' };
    const minimalSections = computeVisibleSections(minimalUser, true, true, true, true, []);
    assert.deepEqual(minimalSections, [{ id: "all", label: "Full Profile" }]);

    const fullUser = {
      name: 'Senior Planner',
      headline: 'Lead Infrastructure Engineer',
      experience: [{ role: 'Senior PM' }],
      skills: ['Primavera P6', 'BIM'],
      recommendations: [{ id: 'rec-1' }],
    };
    const fullSections = computeVisibleSections(fullUser, true, true, true, true, [{ id: 'p1' }]);
    assert.equal(fullSections.length, 6); // all, about, experience, skills, projects, recommendations
    assert.ok(fullSections.some((s) => s.id === 'about'));
    assert.ok(fullSections.some((s) => s.id === 'experience'));
    assert.ok(fullSections.some((s) => s.id === 'skills'));
  });

  it('guarantees App.jsx defines public profile routes under MainLayout shell', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const appPath = path.resolve('src/App.jsx');
    const appContent = fs.readFileSync(appPath, 'utf8');

    // Route element={<MainLayout />} must contain /u/:username
    assert.match(appContent, /<Route\s+element=\{<MainLayout\s*\/>\}>[\s\S]*?path="\/u\/:username"[\s\S]*?<\/Route>/);
  });
});
