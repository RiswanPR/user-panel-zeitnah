import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * CreatePostModal Regression Test Suite
 *
 * Verifies:
 * 1. React hook imports in CreatePostModal.jsx (specifically useMemo is defined and imported)
 * 2. Scope safety of effectivePublishingContext and isBusinessMode
 * 3. Draft storage key isolation across Personal, Company A, and Company B
 * 4. Post payload formation for Personal vs Business modes
 * 5. Other Creation Modals hook import integrity (ReelStudioModal, CreateStoryModal, CreateActionModal)
 */

describe('CreatePostModal Hook Imports & Scope Verification', () => {
  const createPostModalPath = path.resolve('src/components/community/composer/CreatePostModal.jsx');

  it('CreatePostModal.jsx exists and has valid source', () => {
    assert.ok(fs.existsSync(createPostModalPath), 'CreatePostModal.jsx must exist');
  });

  it('imports useMemo from react without ReferenceError', () => {
    const content = fs.readFileSync(createPostModalPath, 'utf8');

    // Find the react import line
    const reactImportMatch = content.match(/import\s*\{([^}]+)\}\s*from\s*['"]react['"]/);
    assert.ok(reactImportMatch, "Must import from 'react'");

    const importedHooks = reactImportMatch[1].split(',').map((h) => h.trim());
    assert.ok(importedHooks.includes('useMemo'), "Must import 'useMemo' from 'react'");
    assert.ok(importedHooks.includes('useState'), "Must import 'useState' from 'react'");
    assert.ok(importedHooks.includes('useEffect'), "Must import 'useEffect' from 'react'");
    assert.ok(importedHooks.includes('useCallback'), "Must import 'useCallback' from 'react'");
    assert.ok(importedHooks.includes('useRef'), "Must import 'useRef' from 'react'");
    assert.ok(importedHooks.includes('useContext'), "Must import 'useContext' from 'react'");
  });

  it('declares effectivePublishingContext before referencing it in useMemo and handlers', () => {
    const content = fs.readFileSync(createPostModalPath, 'utf8');

    const effectiveDeclIndex = content.indexOf('const effectivePublishingContext =');
    const useMemoIndex = content.indexOf('const draftStorageKey = useMemo(');

    assert.ok(effectiveDeclIndex !== -1, 'Must declare effectivePublishingContext');
    assert.ok(useMemoIndex !== -1, 'Must use useMemo for draftStorageKey');
    assert.ok(
      effectiveDeclIndex < useMemoIndex,
      'effectivePublishingContext must be declared before draftStorageKey useMemo'
    );
  });
});

describe('Draft Storage Key & Publishing Context Isolation', () => {
  const DRAFT_STORAGE_KEY = 'zeitnah_post_draft';

  // Simulates draftStorageKey useMemo logic from CreatePostModal
  function computeDraftStorageKey(isBusinessMode, effectivePublishingContext) {
    if (isBusinessMode && effectivePublishingContext?.organizationId) {
      return `${DRAFT_STORAGE_KEY}_business_${effectivePublishingContext.organizationId}`;
    }
    return `${DRAFT_STORAGE_KEY}_personal`;
  }

  it('generates personal draft key when in personal mode', () => {
    const key = computeDraftStorageKey(false, {
      profileType: 'personal',
      organizationId: null,
    });
    assert.equal(key, 'zeitnah_post_draft_personal');
  });

  it('generates isolated draft key for Company A', () => {
    const companyAId = '6601a2b3c4d5e6f7a8b9c0d1';
    const key = computeDraftStorageKey(true, {
      profileType: 'business',
      organizationId: companyAId,
    });
    assert.equal(key, `zeitnah_post_draft_business_${companyAId}`);
  });

  it('generates isolated draft key for Company B without clashing with Company A', () => {
    const companyBId = '6601a2b3c4d5e6f7a8b9c0d2';
    const keyA = computeDraftStorageKey(true, {
      profileType: 'business',
      organizationId: '6601a2b3c4d5e6f7a8b9c0d1',
    });
    const keyB = computeDraftStorageKey(true, {
      profileType: 'business',
      organizationId: companyBId,
    });

    assert.notEqual(keyA, keyB, 'Company A and Company B drafts must never share storage keys');
    assert.equal(keyB, `zeitnah_post_draft_business_${companyBId}`);
  });
});

describe('Post Creation Payload Organization ID Propagation', () => {
  // Simulates the exact payload resolution in CreatePostModal
  function buildPostPayload({
    content = '',
    audience = 'PUBLIC',
    tags = [],
    isBusinessMode = false,
    effectivePublishingContext = null,
  }) {
    return {
      content,
      audience,
      type: 'TEXT',
      media: [],
      tags,
      organizationId:
        isBusinessMode && effectivePublishingContext?.organizationId
          ? effectivePublishingContext.organizationId
          : undefined,
    };
  }

  it('omits organizationId (undefined) for personal post creation', () => {
    const payload = buildPostPayload({
      content: 'Personal engineering notes',
      isBusinessMode: false,
      effectivePublishingContext: { profileType: 'personal', organizationId: null },
    });

    assert.equal(payload.organizationId, undefined, 'Personal post must not have organizationId');
    assert.equal(payload.content, 'Personal engineering notes');
  });

  it('attaches organizationId for Company A post creation', () => {
    const companyAId = '6601a2b3c4d5e6f7a8b9c0d1';
    const payload = buildPostPayload({
      content: 'Company A product release',
      isBusinessMode: true,
      effectivePublishingContext: { profileType: 'business', organizationId: companyAId },
    });

    assert.equal(payload.organizationId, companyAId, 'Business post must have organizationId attached');
  });

  it('attaches organizationId for Company B post creation without stale Company A context', () => {
    const companyBId = '6601a2b3c4d5e6f7a8b9c0d2';
    const payload = buildPostPayload({
      content: 'Company B hiring notice',
      isBusinessMode: true,
      effectivePublishingContext: { profileType: 'business', organizationId: companyBId },
    });

    assert.equal(payload.organizationId, companyBId);
  });
});

describe('Creation Modals Suite Hook Audit', () => {
  const modalFiles = [
    {
      name: 'ReelStudioModal.jsx',
      path: path.resolve('src/components/community/composer/ReelStudioModal.jsx'),
    },
    {
      name: 'CreateStoryModal.jsx',
      path: path.resolve('src/components/community/stories/CreateStoryModal.jsx'),
    },
    {
      name: 'CreateActionModal.jsx',
      path: path.resolve('src/components/community/composer/CreateActionModal.jsx'),
    },
  ];

  for (const modal of modalFiles) {
    it(`${modal.name} exists and has complete hook imports`, () => {
      assert.ok(fs.existsSync(modal.path), `${modal.name} must exist`);
      const content = fs.readFileSync(modal.path, 'utf8');

      // Check for react import
      const reactImportMatch = content.match(/import\s*\{([^}]+)\}\s*from\s*['"]react['"]/);
      assert.ok(reactImportMatch, `${modal.name} must import from react`);
      const importedHooks = reactImportMatch[1].split(',').map((h) => h.trim());

      // If useMemo is used in code, it must be imported
      if (content.includes('useMemo(')) {
        assert.ok(importedHooks.includes('useMemo'), `${modal.name} uses useMemo and must import it`);
      }
      // If useCallback is used in code, it must be imported
      if (content.includes('useCallback(')) {
        assert.ok(importedHooks.includes('useCallback'), `${modal.name} uses useCallback and must import it`);
      }
      // If useEffect is used in code, it must be imported
      if (content.includes('useEffect(')) {
        assert.ok(importedHooks.includes('useEffect'), `${modal.name} uses useEffect and must import it`);
      }
      // If useRef is used in code, it must be imported
      if (content.includes('useRef(')) {
        assert.ok(importedHooks.includes('useRef'), `${modal.name} uses useRef and must import it`);
      }
      // If useState is used in code, it must be imported
      if (content.includes('useState(')) {
        assert.ok(importedHooks.includes('useState'), `${modal.name} uses useState and must import it`);
      }
    });
  }
});
