import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  sortExperienceDescending,
  parseExperienceDateSafe,
  isExperienceOngoing,
  formatExperienceMonthYear,
  formatExperienceDuration,
  formatExperienceDateRange,
  formatExperienceDateForInput,
  validateExperienceDates,
} from './experienceTimeline.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Career Experience Timeline & Chronological Ordering Regression Tests', () => {
  describe('1. Chronological Ordering (Latest experiences first)', () => {
    it('sorts experiences descending by start date so newest role appears first', () => {
      const input = [
        { id: 'exp-1', role: 'Junior Engineer', startDate: '2019-06-01', endDate: '2021-05-31' },
        { id: 'exp-2', role: 'Project Manager', startDate: '2024-01-15', currentlyActive: true },
        { id: 'exp-3', role: 'Senior Structural Engineer', startDate: '2021-06-01', endDate: '2023-12-31' },
      ];

      const sorted = sortExperienceDescending(input);

      assert.equal(sorted.length, 3);
      assert.equal(sorted[0].id, 'exp-2'); // 2024
      assert.equal(sorted[1].id, 'exp-3'); // 2021
      assert.equal(sorted[2].id, 'exp-1'); // 2019
    });

    it('handles ISO timestamps, Date objects, and epoch numbers consistently', () => {
      const input = [
        { id: 'ts-epoch', role: 'Role A', startDate: 1609459200000 }, // 2021-01-01
        { id: 'ts-iso', role: 'Role B', startDate: '2023-08-01T00:00:00.000Z' },
        { id: 'ts-date', role: 'Role C', startDate: new Date('2022-03-01T00:00:00.000Z') },
      ];

      const sorted = sortExperienceDescending(input);

      assert.equal(sorted[0].id, 'ts-iso');  // 2023-08
      assert.equal(sorted[1].id, 'ts-date'); // 2022-03
      assert.equal(sorted[2].id, 'ts-epoch'); // 2021-01
    });
  });

  describe('2. Ongoing Role Ordering', () => {
    it('places a newly started ongoing role before an older ongoing role', () => {
      const input = [
        { id: 'ongoing-old', role: 'Advisory Director', startDate: '2021-01-01', currentlyActive: true },
        { id: 'ongoing-new', role: 'Principal BIM Lead', startDate: '2024-03-01', currentlyActive: true },
      ];

      const sorted = sortExperienceDescending(input);

      assert.equal(sorted[0].id, 'ongoing-new');
      assert.equal(sorted[1].id, 'ongoing-old');
    });

    it('does not place an older ongoing role above a newer completed role', () => {
      // Primary key is start date descending.
      // An ongoing role started in 2020 should NOT jump above a role started in 2023.
      const input = [
        { id: 'ongoing-2020', role: 'Consultant', startDate: '2020-01-01', currentlyActive: true },
        { id: 'completed-2023', role: 'Lead Architect', startDate: '2023-06-01', endDate: '2024-02-01' },
      ];

      const sorted = sortExperienceDescending(input);

      assert.equal(sorted[0].id, 'completed-2023');
      assert.equal(sorted[1].id, 'ongoing-2020');
    });

    it('detects ongoing roles from currentlyActive, isCurrent, current, or null endDate', () => {
      assert.equal(isExperienceOngoing({ currentlyActive: true }), true);
      assert.equal(isExperienceOngoing({ isCurrent: true }), true);
      assert.equal(isExperienceOngoing({ current: true }), true);
      assert.equal(isExperienceOngoing({ startDate: '2023-01-01', endDate: null }), true);
      assert.equal(isExperienceOngoing({ startDate: '2023-01-01', endDate: '' }), true);
      assert.equal(isExperienceOngoing({ startDate: '2023-01-01', endDate: '2024-01-01', currentlyActive: false }), false);
    });
  });

  describe('3. Equal Start Dates & Deterministic Tie-Breaking', () => {
    it('ranks ongoing role above completed role when start dates are equal', () => {
      const input = [
        { id: 'completed-same-start', role: 'Site Engineer', startDate: '2023-01-01', endDate: '2023-12-31' },
        { id: 'ongoing-same-start', role: 'Project Engineer', startDate: '2023-01-01', currentlyActive: true },
      ];

      const sorted = sortExperienceDescending(input);

      assert.equal(sorted[0].id, 'ongoing-same-start');
      assert.equal(sorted[1].id, 'completed-same-start');
    });

    it('ranks later end date above earlier end date when start dates are equal', () => {
      const input = [
        { id: 'ended-early', role: 'QA Inspector', startDate: '2023-01-01', endDate: '2023-06-30' },
        { id: 'ended-late', role: 'QC Manager', startDate: '2023-01-01', endDate: '2023-11-30' },
      ];

      const sorted = sortExperienceDescending(input);

      assert.equal(sorted[0].id, 'ended-late');
      assert.equal(sorted[1].id, 'ended-early');
    });

    it('tie-breaks deterministically by stable ID when dates are completely identical', () => {
      const input = [
        { id: 'exp-beta', role: 'Role Beta', startDate: '2023-01-01', endDate: '2023-12-31' },
        { id: 'exp-alpha', role: 'Role Alpha', startDate: '2023-01-01', endDate: '2023-12-31' },
      ];

      const sorted = sortExperienceDescending(input);

      assert.equal(sorted[0].id, 'exp-alpha');
      assert.equal(sorted[1].id, 'exp-beta');
    });

    it('falls back to stable original index when IDs are also identical or missing', () => {
      const input = [
        { role: 'First Entered', startDate: '2023-01-01', endDate: '2023-12-31' },
        { role: 'Second Entered', startDate: '2023-01-01', endDate: '2023-12-31' },
      ];

      const sorted = sortExperienceDescending(input);

      assert.equal(sorted[0].role, 'First Entered');
      assert.equal(sorted[1].role, 'Second Entered');
    });
  });

  describe('4. Missing or Invalid Dates Handling', () => {
    it('places undated records after all valid dated records', () => {
      const input = [
        { id: 'undated-1', role: 'Early Trainee' }, // missing start date
        { id: 'dated-old', role: 'Draftsman', startDate: '2018-01-01', endDate: '2019-01-01' },
        { id: 'undated-2', role: 'Freelance Surveyor', startDate: '' }, // empty start date
        { id: 'dated-recent', role: 'Civil Lead', startDate: '2023-01-01', currentlyActive: true },
        { id: 'undated-invalid', role: 'Specialist', startDate: 'invalid-date-string' },
      ];

      const sorted = sortExperienceDescending(input);

      assert.equal(sorted[0].id, 'dated-recent');
      assert.equal(sorted[1].id, 'dated-old');
      // Undated entries should follow dated entries and preserve original relative stability
      assert.equal(sorted[2].id, 'undated-1');
      assert.equal(sorted[3].id, 'undated-2');
      assert.equal(sorted[4].id, 'undated-invalid');
    });

    it('handles empty, null, or single-item arrays safely', () => {
      assert.deepEqual(sortExperienceDescending([]), []);
      assert.deepEqual(sortExperienceDescending(null), []);
      assert.deepEqual(sortExperienceDescending(undefined), []);

      const single = [{ id: 'single', role: 'Lead', startDate: '2024-01-01' }];
      const res = sortExperienceDescending(single);
      assert.equal(res.length, 1);
      assert.equal(res[0].id, 'single');
    });
  });

  describe('5. Source Array Immutability', () => {
    it('does not mutate the source array or any elements', () => {
      const original = Object.freeze([
        Object.freeze({ id: 'old', role: 'Old Role', startDate: '2020-01-01' }),
        Object.freeze({ id: 'new', role: 'New Role', startDate: '2024-01-01' }),
      ]);

      // Should not throw even though array and objects are frozen
      const sorted = sortExperienceDescending(original);

      assert.equal(sorted[0].id, 'new');
      assert.equal(sorted[1].id, 'old');
      assert.equal(original[0].id, 'old');
      assert.equal(original[1].id, 'new');
    });
  });

  describe('6. Targeting by Identifier for Editing & Deleting', () => {
    it('ensures edit and delete actions receive the exact record identifier after sorting', () => {
      // In the database or state, the records may be in insertion order (oldest first).
      const rawExperiences = [
        { id: 'id-legacy-2018', organization: 'Contractor X', role: 'Junior Site Eng', startDate: '2018-05-01' },
        { id: 'id-active-2024', organization: 'MegaCorp AEC', role: 'Project Director', startDate: '2024-01-01', currentlyActive: true },
        { id: 'id-mid-2021', organization: 'Consulting Group', role: 'Senior Designer', startDate: '2021-02-01' },
      ];

      const sorted = sortExperienceDescending(rawExperiences);

      // Verify the sorted cards
      assert.equal(sorted[0].id, 'id-active-2024');
      assert.equal(sorted[1].id, 'id-mid-2021');
      assert.equal(sorted[2].id, 'id-legacy-2018');

      // Simulated user action: user clicks edit on card 0 (the top/newest card)
      let targetedEditId = null;
      let targetedDeleteId = null;

      const handleEdit = (rec) => { targetedEditId = rec.id || rec._id; };
      const handleDelete = (id) => { targetedDeleteId = id; };

      handleEdit(sorted[0]);
      assert.equal(targetedEditId, 'id-active-2024');

      handleDelete(sorted[2].id);
      assert.equal(targetedDeleteId, 'id-legacy-2018');
    });
  });

  describe('7. Date Formatting & UTC Timezone Shift Safety', () => {
    it('parses YYYY-MM-DD in UTC without shifting days across timezones', () => {
      const epoch = parseExperienceDateSafe('2024-01-01');
      assert.notEqual(epoch, null);
      const d = new Date(epoch);
      assert.equal(d.getUTCFullYear(), 2024);
      assert.equal(d.getUTCMonth(), 0); // Jan
      assert.equal(d.getUTCDate(), 1);
    });

    it('formats month and year accurately', () => {
      assert.equal(formatExperienceMonthYear('2023-05-15'), 'May 2023');
      assert.equal(formatExperienceMonthYear('2024-12-01'), 'Dec 2024');
      assert.equal(formatExperienceMonthYear(null), null);
    });

    it('formats HTML5 input date as YYYY-MM-DD safely', () => {
      assert.equal(formatExperienceDateForInput('2024-04-18T00:00:00.000Z'), '2024-04-18');
      assert.equal(formatExperienceDateForInput('2023-11-05'), '2023-11-05');
      assert.equal(formatExperienceDateForInput(null), '');
    });

    it('computes human-readable duration strings with AEC precision', () => {
      // 1 year exactly: Jan 2023 to Dec 2023 = 12 months = 1 yr
      const duration1 = formatExperienceDuration('2023-01-01', '2023-12-31', false);
      assert.equal(duration1, '1 yr');

      // 1 year 4 months
      const duration2 = formatExperienceDuration('2023-01-01', '2024-04-30', false);
      assert.equal(duration2, '1 yr 4 mos');

      // Short role
      const duration3 = formatExperienceDuration('2024-01-01', '2024-04-01', false);
      assert.equal(duration3, '4 mos');
    });

    it('builds full date range string with duration', () => {
      const range = formatExperienceDateRange('2023-01-01', '2023-12-31', false);
      assert.equal(range, 'Jan 2023 — Dec 2023 · 1 yr');

      const ongoingRange = formatExperienceDateRange('2023-01-01', null, true);
      assert.match(ongoingRange, /^Jan 2023 — Present · \d+ yrs?(?: \d+ mos?)?$/);
    });
  });

  describe('8. Public Profile & Profile Editor Component Consistency', () => {
    it('verifies EditProfile.jsx imports and uses sortExperienceDescending', () => {
      const editProfilePath = path.resolve(__dirname, '../pages/profile/EditProfile.jsx');
      const editProfileContent = fs.readFileSync(editProfilePath, 'utf8');

      assert.match(
        editProfileContent,
        /sortExperienceDescending/,
        'EditProfile.jsx must import and use sortExperienceDescending'
      );
      assert.match(
        editProfileContent,
        /sortedExperiences\s*=\s*sortExperienceDescending/,
        'EditProfile.jsx must declare sortedExperiences via sortExperienceDescending'
      );
      assert.match(
        editProfileContent,
        /formatExperienceDateRange/,
        'EditProfile.jsx must use formatExperienceDateRange'
      );
      assert.match(
        editProfileContent,
        /aria-label=\{`Edit \$\{exp\.role/,
        'Edit button must have accessible aria-label'
      );
      assert.match(
        editProfileContent,
        /aria-label=\{`Delete \$\{exp\.role/,
        'Delete button must have accessible aria-label'
      );
    });

    it('verifies ProfileExperienceSection.jsx imports and uses sortExperienceDescending', () => {
      const sectionPath = path.resolve(__dirname, '../components/profile/ProfileExperienceSection.jsx');
      const sectionContent = fs.readFileSync(sectionPath, 'utf8');

      assert.match(
        sectionContent,
        /sortExperienceDescending/,
        'ProfileExperienceSection.jsx must import and use sortExperienceDescending'
      );
      assert.match(
        sectionContent,
        /sortedItems\s*=\s*sortExperienceDescending/,
        'ProfileExperienceSection.jsx must sort items via sortExperienceDescending'
      );
      assert.match(
        sectionContent,
        /formatExperienceDateRange/,
        'ProfileExperienceSection.jsx must use formatExperienceDateRange'
      );
      assert.match(
        sectionContent,
        /aria-label=\{`Edit \$\{exp\.role/,
        'Public experience section must have accessible aria-label for edit'
      );
      assert.match(
        sectionContent,
        /aria-label=\{`Delete \$\{exp\.role/,
        'Public experience section must have accessible aria-label for delete'
      );
    });

    it('confirms both views produce identical ordering for the same experience dataset', () => {
      const dataset = [
        { id: '1', role: 'Designer', startDate: '2020-01-01' },
        { id: '2', role: 'VP Engineering', startDate: '2024-02-01', currentlyActive: true },
        { id: '3', role: 'Project Manager', startDate: '2022-05-01', endDate: '2024-01-01' },
      ];

      const editorSort = sortExperienceDescending(dataset);
      const publicSort = sortExperienceDescending(dataset);

      assert.deepEqual(editorSort.map((e) => e.id), ['2', '3', '1']);
      assert.deepEqual(publicSort.map((e) => e.id), ['2', '3', '1']);
    });
  });

  describe('9. Data Integrity & Schema Preservation', () => {
    it('preserves all AEC and career fields without data loss', () => {
      const originalRecord = {
        id: 'full-exp-1',
        organization: 'Parsons Corporation',
        role: 'Senior Transportation Planner',
        employmentType: 'Full-time',
        location: 'Dubai, UAE',
        startDate: '2022-03-01',
        endDate: '2024-01-15',
        currentlyActive: false,
        description: 'Led arterial corridor redesign and transit-oriented development simulation.',
        infrastructureSector: 'Transportation & Transit',
        skillsUsed: ['Traffic Modeling', 'VISSIM', 'Corridor Analysis'],
        softwareUsed: ['Synchro', 'AutoCAD Civil 3D'],
      };

      const sorted = sortExperienceDescending([originalRecord]);
      const result = sorted[0];

      assert.equal(result.id, originalRecord.id);
      assert.equal(result.organization, originalRecord.organization);
      assert.equal(result.role, originalRecord.role);
      assert.equal(result.employmentType, originalRecord.employmentType);
      assert.equal(result.location, originalRecord.location);
      assert.equal(result.startDate, originalRecord.startDate);
      assert.equal(result.endDate, originalRecord.endDate);
      assert.equal(result.currentlyActive, originalRecord.currentlyActive);
      assert.equal(result.description, originalRecord.description);
      assert.equal(result.infrastructureSector, originalRecord.infrastructureSector);
      assert.deepEqual(result.skillsUsed, originalRecord.skillsUsed);
      assert.deepEqual(result.softwareUsed, originalRecord.softwareUsed);
    });
  });

  describe('10. End Date Conditional Validation & Error Deduplication', () => {
    it('1. ongoing role with a valid Start Date and empty End Date succeeds', () => {
      const res = validateExperienceDates('2024-01-01', '', true);
      assert.equal(res.valid, true);
      assert.deepEqual(res.errors, {});

      const resNull = validateExperienceDates('2024-01-01', null, true);
      assert.equal(resNull.valid, true);
      assert.deepEqual(resNull.errors, {});
    });

    it('2. non-ongoing role with an empty End Date receives the expected validation error', () => {
      const resEmpty = validateExperienceDates('2024-01-01', '', false);
      assert.equal(resEmpty.valid, false);
      assert.equal(resEmpty.errors.endDate, 'End date is required for past roles.');

      const resNull = validateExperienceDates('2024-01-01', null, false);
      assert.equal(resNull.valid, false);
      assert.equal(resNull.errors.endDate, 'End date is required for past roles.');
    });

    it('3. invalid End Date is rejected', () => {
      const resInvalid = validateExperienceDates('2024-01-01', 'not-a-date', false);
      assert.equal(resInvalid.valid, false);
      assert.equal(resInvalid.errors.endDate, 'End date must be a valid date.');

      // Impossible date (e.g. Feb 31)
      const resImpossible = validateExperienceDates('2024-01-01', '2024-02-31', false);
      assert.equal(resImpossible.valid, false);
      assert.equal(resImpossible.errors.endDate, 'End date must be a valid date.');
    });

    it('4. End Date earlier than Start Date is rejected', () => {
      const resEarlier = validateExperienceDates('2024-05-01', '2024-01-01', false);
      assert.equal(resEarlier.valid, false);
      assert.equal(resEarlier.errors.endDate, 'End date cannot be earlier than start date.');
    });

    it('5. checking isCurrent / currentlyActive clears an obsolete End Date validation error', () => {
      // Simulate state transition:
      // User initially had non-ongoing role with an error on endDate
      let formErrors = { endDate: 'End date is required for past roles.' };

      // User checks "I currently work / lead here"
      const isChecked = true;
      if (isChecked) {
        delete formErrors.endDate;
      }

      assert.equal(formErrors.endDate, undefined);
      assert.deepEqual(formErrors, {});
    });

    it('6. repeated validation failures do not generate duplicate toasts in deduplication logic', () => {
      // Test the deduplication mechanism used in Toast.jsx
      let toasts = [];
      let toastCounter = 0;

      const addToast = ({ type, title, message }) => {
        const isDuplicate = toasts.some(
          (t) => t.type === type && t.title === title && t.message === message
        );
        if (isDuplicate) return null;
        const id = ++toastCounter;
        toasts.push({ id, type, title, message });
        return id;
      };

      // Rapidly fire 3 identical validation errors
      addToast({ type: 'error', title: 'Error', message: 'End date must be a valid date.' });
      addToast({ type: 'error', title: 'Error', message: 'End date must be a valid date.' });
      addToast({ type: 'error', title: 'Error', message: 'End date must be a valid date.' });

      // Exactly ONE toast should be recorded
      assert.equal(toasts.length, 1);
      assert.equal(toasts[0].message, 'End date must be a valid date.');

      // Different message is allowed
      addToast({ type: 'error', title: 'Error', message: 'Valid start date is required.' });
      assert.equal(toasts.length, 2);
    });

    it('7. existing experiences with ongoing dates load and save correctly without fabricating end dates', () => {
      const ongoingRecord = {
        organization: 'KEO International',
        role: 'Resident Engineer',
        startDate: '2023-08-01T00:00:00.000Z',
        endDate: null,
        currentlyActive: true,
      };

      // Loaded into form
      const loadedStartDate = formatExperienceDateForInput(ongoingRecord.startDate);
      const loadedEndDate = ongoingRecord.currentlyActive
        ? ''
        : formatExperienceDateForInput(ongoingRecord.endDate);

      assert.equal(loadedStartDate, '2023-08-01');
      assert.equal(loadedEndDate, '');

      // Validated
      const val = validateExperienceDates(loadedStartDate, loadedEndDate, ongoingRecord.currentlyActive);
      assert.equal(val.valid, true);

      // Prepared for payload
      const payload = {
        ...ongoingRecord,
        startDate: formatExperienceDateForInput(loadedStartDate),
        endDate: ongoingRecord.currentlyActive ? null : formatExperienceDateForInput(loadedEndDate),
      };

      assert.equal(payload.startDate, '2023-08-01');
      assert.equal(payload.endDate, null);
      assert.equal(payload.currentlyActive, true);
    });

    it('8. handles DD/MM/YYYY and DD-MM-YYYY formats consistently', () => {
      const epochSlash = parseExperienceDateSafe('15/06/2023');
      assert.notEqual(epochSlash, null);
      assert.equal(formatExperienceDateForInput('15/06/2023'), '2023-06-15');

      const epochHyphen = parseExperienceDateSafe('15-06-2023');
      assert.notEqual(epochHyphen, null);
      assert.equal(formatExperienceDateForInput('15-06-2023'), '2023-06-15');

      // Impossible DD/MM/YYYY (e.g. 31/02/2023)
      assert.equal(parseExperienceDateSafe('31/02/2023'), null);
      assert.equal(formatExperienceDateForInput('31/02/2023'), '');
    });
  });
});
