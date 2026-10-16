import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateCustomTitle,
  findPredefinedSuggestions,
  formatIdentityPayload,
} from './professionalIdentity.js';

describe('Professional Identity Phase 3 Client Utilities', () => {
  describe('validateCustomTitle', () => {
    test('accepts valid plain-text custom title', () => {
      const res = validateCustomTitle('  Specialist Substation Engineer  ');
      assert.equal(res.valid, true);
      assert.equal(res.error, null);
      assert.equal(res.trimmed, 'Specialist Substation Engineer');
    });

    test('rejects empty or whitespace-only title', () => {
      const resEmpty = validateCustomTitle('');
      assert.equal(resEmpty.valid, false);
      assert.match(resEmpty.error, /cannot be empty/);

      const resWhitespace = validateCustomTitle('     ');
      assert.equal(resWhitespace.valid, false);
      assert.match(resWhitespace.error, /cannot be empty/);

      const resNull = validateCustomTitle(null);
      assert.equal(resNull.valid, false);
    });

    test('rejects oversized titles exceeding 100 characters', () => {
      const longTitle = 'X'.repeat(101);
      const res = validateCustomTitle(longTitle);
      assert.equal(res.valid, false);
      assert.match(res.error, /must not exceed 100 characters/);
    });

    test('accepts title with exactly 100 characters', () => {
      const maxTitle = 'A'.repeat(100);
      const res = validateCustomTitle(maxTitle);
      assert.equal(res.valid, true);
      assert.equal(res.trimmed.length, 100);
    });

    test('rejects titles containing HTML tags or brackets', () => {
      const resTag = validateCustomTitle('Engineer <script>alert(1)</script>');
      assert.equal(resTag.valid, false);
      assert.match(resTag.error, /without HTML/);

      const resAngle = validateCustomTitle('Lead Designer > Consultant');
      assert.equal(resAngle.valid, false);
    });

    test('rejects multiline custom titles', () => {
      const resNewline = validateCustomTitle('Senior\nArchitect');
      assert.equal(resNewline.valid, false);
      assert.match(resNewline.error, /single-line/);
    });
  });

  describe('findPredefinedSuggestions', () => {
    const titles = [
      { id: 'civil-engineering:project-manager', label: 'Project manager' },
      { id: 'civil-engineering:site-engineer-civil', label: 'Site Engineer (civil)' },
      { id: 'civil-engineering:structural-engineer-civil', label: 'Structural engineer (civil)' },
      { id: 'civil-engineering:bridge-engineer', label: 'Bridge engineer' },
    ];

    test('finds matching predefined titles case-insensitively', () => {
      const matches = findPredefinedSuggestions('engineer', titles);
      assert.equal(matches.length, 3);
      assert.equal(matches[0].label, 'Site Engineer (civil)');
    });

    test('returns empty array if input query is shorter than 2 chars', () => {
      const matches = findPredefinedSuggestions('e', titles);
      assert.deepEqual(matches, []);
    });

    test('respects limit parameter', () => {
      const matches = findPredefinedSuggestions('engineer', titles, 2);
      assert.equal(matches.length, 2);
    });

    test('handles empty or invalid title lists safely', () => {
      assert.deepEqual(findPredefinedSuggestions('test', null), []);
      assert.deepEqual(findPredefinedSuggestions('test', []), []);
    });
  });

  describe('formatIdentityPayload', () => {
    test('formats predefined identity payload when department and titleId present', () => {
      const payload = formatIdentityPayload({
        departmentId: 'civil-engineering',
        titleId: 'civil-engineering:site-engineer-civil',
        isCustomTitle: false,
      });

      assert.deepEqual(payload, {
        professionalIdentity: {
          departmentId: 'civil-engineering',
          titleId: 'civil-engineering:site-engineer-civil',
          isCustomTitle: false,
        },
      });
    });

    test('formats custom identity payload with trimmed title when isCustomTitle is true', () => {
      const payload = formatIdentityPayload({
        departmentId: 'electrical-engineering',
        customTitle: '  Substation Commissioning Lead  ',
        isCustomTitle: true,
      });

      assert.deepEqual(payload, {
        professionalIdentity: {
          departmentId: 'electrical-engineering',
          customTitle: 'Substation Commissioning Lead',
          isCustomTitle: true,
        },
      });
    });

    test('falls back to legacy currentRole if no department is selected', () => {
      const payload = formatIdentityPayload(
        { departmentId: '', titleId: '' },
        'Legacy Structural Inspector'
      );

      assert.deepEqual(payload, {
        currentRole: 'Legacy Structural Inspector',
      });
    });

    test('returns empty object if no department and no legacy role', () => {
      const payload = formatIdentityPayload({}, '');
      assert.deepEqual(payload, {});
    });
  });
});
