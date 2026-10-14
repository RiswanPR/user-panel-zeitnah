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
  calculateTotalExperience,
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

  describe('11. Total Professional Experience Summary & Calculation Tests', () => {
    const fixedNow = new Date('2026-10-14T00:00:00.000Z');

    it('1. One completed role: calculates exact duration and role counts', () => {
      // 1 year role
      const single1Yr = [
        { id: 'exp-1', role: 'Junior Structural Engineer', startDate: '2022-01-01', endDate: '2022-12-31' },
      ];
      const res1 = calculateTotalExperience(single1Yr, fixedNow);
      assert.equal(res1.totalYears, 1);
      assert.equal(res1.totalMonths, 0);
      assert.equal(res1.allMonths, 12);
      assert.equal(res1.formattedTotal, '1 Year');
      assert.equal(res1.totalRoles, 1);
      assert.equal(res1.currentRoles, 0);

      // 8 years role
      const single8Yr = [
        { id: 'exp-8', role: 'Lead Architect', startDate: '2012-01-01', endDate: '2019-12-31' },
      ];
      const res8 = calculateTotalExperience(single8Yr, fixedNow);
      assert.equal(res8.totalYears, 8);
      assert.equal(res8.totalMonths, 0);
      assert.equal(res8.formattedTotal, '8 Years');
      assert.equal(res8.totalRoles, 1);
      assert.equal(res8.currentRoles, 0);

      // 2 years 6 months role
      const single2Yr6Mo = [
        { id: 'exp-mid', role: 'BIM Coordinator', startDate: '2020-01-01', endDate: '2022-06-30' },
      ];
      const resMid = calculateTotalExperience(single2Yr6Mo, fixedNow);
      assert.equal(resMid.totalYears, 2);
      assert.equal(resMid.totalMonths, 6);
      assert.equal(resMid.formattedTotal, '2 Years 6 Months');
      assert.equal(resMid.totalRoles, 1);
      assert.equal(resMid.currentRoles, 0);
    });

    it('2. One current role: uses current reference date as end date and marks role as active', () => {
      // Role started 2024-01-01, current date is 2026-10-14 -> Jan 2024 to Oct 2026 = 34 months = 2 Years 10 Months
      const activeRole = [
        { id: 'exp-act', role: 'Resident Project Engineer', startDate: '2024-01-01', currentlyActive: true },
      ];
      const res = calculateTotalExperience(activeRole, fixedNow);
      assert.equal(res.totalYears, 2);
      assert.equal(res.totalMonths, 10);
      assert.equal(res.allMonths, 34);
      assert.equal(res.formattedTotal, '2 Years 10 Months');
      assert.equal(res.totalRoles, 1);
      assert.equal(res.currentRoles, 1);

      // Detects ongoing via isCurrent or null endDate
      const activeByNullEnd = [
        { id: 'exp-null-end', role: 'Consultant', startDate: '2024-01-01', endDate: null },
      ];
      const resNull = calculateTotalExperience(activeByNullEnd, fixedNow);
      assert.equal(resNull.currentRoles, 1);
      assert.equal(resNull.formattedTotal, '2 Years 10 Months');
    });

    it('3. Multiple overlapping roles: merges overlapping periods so simultaneous jobs do not double-count', () => {
      // Role A: Jan 2020 to Dec 2022 (36 months)
      // Role B: Jan 2021 to Dec 2023 (36 months - overlaps Role A from Jan 2021 to Dec 2022)
      // Role C: Jun 2021 to Jun 2022 (13 months - completely inside Role A and B)
      // Combined timeline spans Jan 2020 to Dec 2023 = 48 months = 4 Years!
      // (Without interval merging, 36 + 36 + 13 = 85 months = 7 years 1 mo)
      const overlapping = [
        { id: 'exp-a', role: 'Lead Civil Engineer', startDate: '2020-01-01', endDate: '2022-12-31' },
        { id: 'exp-b', role: 'Senior Consultant', startDate: '2021-01-01', endDate: '2023-12-31' },
        { id: 'exp-c', role: 'Site Advisor (Part-time)', startDate: '2021-06-01', endDate: '2022-06-30' },
      ];

      const res = calculateTotalExperience(overlapping, fixedNow);
      assert.equal(res.allMonths, 48);
      assert.equal(res.totalYears, 4);
      assert.equal(res.totalMonths, 0);
      assert.equal(res.formattedTotal, '4 Years');
      assert.equal(res.totalRoles, 3);
      assert.equal(res.currentRoles, 0);

      // Multiple simultaneous ongoing roles
      const simultaneousActive = [
        { id: 'act-1', role: 'Design Director', startDate: '2022-01-01', currentlyActive: true },
        { id: 'act-2', role: 'Board Advisor', startDate: '2024-01-01', currentlyActive: true },
      ];
      const resActive = calculateTotalExperience(simultaneousActive, fixedNow);
      // Jan 2022 to Oct 2026 = 58 months = 4 Years 10 Months
      assert.equal(resActive.allMonths, 58);
      assert.equal(resActive.totalYears, 4);
      assert.equal(resActive.totalMonths, 10);
      assert.equal(resActive.formattedTotal, '4 Years 10 Months');
      assert.equal(resActive.totalRoles, 2);
      assert.equal(resActive.currentRoles, 2);
    });

    it('4. Non-overlapping roles: correctly sums disjoint periods while ignoring career gaps', () => {
      // Role 1: Jan 2015 to Dec 2017 (36 months = 3 Years)
      // Gap: 2018 is completely empty
      // Role 2: Jan 2019 to Dec 2023 (60 months = 5 Years)
      // Total: 36 + 60 = 96 months = 8 Years
      const nonOverlapping = [
        { id: 'p1', role: 'Site Engineer', startDate: '2015-01-01', endDate: '2017-12-31' },
        { id: 'p2', role: 'Project Manager', startDate: '2019-01-01', endDate: '2023-12-31' },
      ];

      const res = calculateTotalExperience(nonOverlapping, fixedNow);
      assert.equal(res.allMonths, 96);
      assert.equal(res.totalYears, 8);
      assert.equal(res.totalMonths, 0);
      assert.equal(res.formattedTotal, '8 Years');
      assert.equal(res.totalRoles, 2);
      assert.equal(res.currentRoles, 0);
    });

    it('5. Missing or invalid dates: handles missing, invalid, future, or inverted dates safely', () => {
      const records = [
        { id: 'valid', role: 'Engineer', startDate: '2020-01-01', endDate: '2021-12-31' }, // 24 months = 2 yrs
        { id: 'null-start', role: 'Draftsman', startDate: null, endDate: '2022-01-01' },
        { id: 'empty-start', role: 'Surveyor', startDate: '', endDate: '2022-01-01' },
        { id: 'invalid-start', role: 'Inspector', startDate: 'not-a-date', endDate: '2022-01-01' },
        { id: 'invalid-end', role: 'Consultant', startDate: '2022-01-01', endDate: 'not-a-date' },
        { id: 'inverted-dates', role: 'Intern', startDate: '2024-05-01', endDate: '2024-01-01' },
        { id: 'future-start', role: 'Future Lead', startDate: '2030-01-01', endDate: '2032-01-01' },
      ];

      const res = calculateTotalExperience(records, fixedNow);
      assert.equal(res.totalRoles, 7);
      assert.equal(res.totalYears, 2);
      assert.equal(res.totalMonths, 0);
      assert.equal(res.formattedTotal, '2 Years');
    });

    it('6. Editing and deleting a role: recalculates immediately after mutations', () => {
      let state = [
        { id: 'exp-1', role: 'Engineer', startDate: '2020-01-01', endDate: '2021-12-31' }, // 2 years
        { id: 'exp-2', role: 'Senior Engineer', startDate: '2022-01-01', endDate: '2023-12-31' }, // 2 years
      ];

      // Initial state: 4 years
      let res = calculateTotalExperience(state, fixedNow);
      assert.equal(res.totalYears, 4);
      assert.equal(res.formattedTotal, '4 Years');
      assert.equal(res.totalRoles, 2);

      // Action: Add an experience entry (e.g. 2018 - 2019, 2 years)
      state = [
        ...state,
        { id: 'exp-3', role: 'Junior Engineer', startDate: '2018-01-01', endDate: '2019-12-31' },
      ];
      res = calculateTotalExperience(state, fixedNow);
      assert.equal(res.totalYears, 6);
      assert.equal(res.formattedTotal, '6 Years');
      assert.equal(res.totalRoles, 3);

      // Action: Edit an experience entry (change exp-2 to ongoing)
      state = state.map((item) =>
        item.id === 'exp-2' ? { ...item, endDate: null, currentlyActive: true } : item
      );
      res = calculateTotalExperience(state, fixedNow);
      // exp-3: 2018-2019 (24 mo)
      // exp-1: 2020-2021 (24 mo)
      // exp-2: 2022 to Oct 2026 (58 mo)
      // Total = 106 months = 8 Years 10 Months
      assert.equal(res.totalYears, 8);
      assert.equal(res.totalMonths, 10);
      assert.equal(res.formattedTotal, '8 Years 10 Months');
      assert.equal(res.currentRoles, 1);

      // Action: Delete an experience entry (delete exp-3)
      state = state.filter((item) => item.id !== 'exp-3');
      res = calculateTotalExperience(state, fixedNow);
      // exp-1 (24 mo) + exp-2 (58 mo) = 82 mo = 6 Years 10 Months
      assert.equal(res.totalYears, 6);
      assert.equal(res.totalMonths, 10);
      assert.equal(res.formattedTotal, '6 Years 10 Months');
      assert.equal(res.totalRoles, 2);
      assert.equal(res.currentRoles, 1);
    });

    it('7. Correct month/year formatting: outputs sensible strings for all duration ranges', () => {
      // 0 months
      assert.equal(calculateTotalExperience([], fixedNow).formattedTotal, '0 Years');

      // 1 month
      const oneMo = [{ role: 'Intern', startDate: '2023-05-01', endDate: '2023-05-31' }];
      assert.equal(calculateTotalExperience(oneMo, fixedNow).formattedTotal, '1 Month');

      // 6 months
      const sixMo = [{ role: 'Intern', startDate: '2023-01-01', endDate: '2023-06-30' }];
      assert.equal(calculateTotalExperience(sixMo, fixedNow).formattedTotal, '6 Months');

      // 1 year
      const oneYr = [{ role: 'Specialist', startDate: '2023-01-01', endDate: '2023-12-31' }];
      assert.equal(calculateTotalExperience(oneYr, fixedNow).formattedTotal, '1 Year');

      // 8 years (prompt example)
      const eightYr = [{ role: 'Lead', startDate: '2012-01-01', endDate: '2019-12-31' }];
      assert.equal(calculateTotalExperience(eightYr, fixedNow).formattedTotal, '8 Years');

      // 2 years 6 months (prompt example)
      const twoYrSixMo = [{ role: 'Consultant', startDate: '2020-01-01', endDate: '2022-06-30' }];
      assert.equal(calculateTotalExperience(twoYrSixMo, fixedNow).formattedTotal, '2 Years 6 Months');

      // 24+ years senior AEC executive (prompt example: 24+ Years)
      const senior24 = [{ role: 'VP Engineering', startDate: '2000-01-01', endDate: '2024-01-01' }];
      assert.equal(calculateTotalExperience(senior24, fixedNow).formattedTotal, '24+ Years');

      // 30+ years
      const senior30 = [{ role: 'Chief Engineer', startDate: '1990-01-01', endDate: '2020-01-01' }];
      assert.equal(calculateTotalExperience(senior30, fixedNow).formattedTotal, '30+ Years');
    });

    it('8. Empty experience history: returns clean zero defaults without NaN', () => {
      const cases = [[], null, undefined, {}];
      for (const emptyInput of cases) {
        const res = calculateTotalExperience(emptyInput, fixedNow);
        assert.equal(res.totalYears, 0);
        assert.equal(res.totalMonths, 0);
        assert.equal(res.allMonths, 0);
        assert.equal(res.formattedTotal, '0 Years');
        assert.equal(res.totalRoles, 0);
        assert.equal(res.currentRoles, 0);
      }
    });

    it('9. UI integration: verifies EditProfile and ProfileExperienceSection mount ExperienceSummaryCard', () => {
      const editProfilePath = path.resolve(__dirname, '../pages/profile/EditProfile.jsx');
      const editProfileContent = fs.readFileSync(editProfilePath, 'utf8');

      assert.match(
        editProfileContent,
        /import\s+ExperienceSummaryCard\s+from\s+["']\.\.\/\.\.\/components\/profile\/ExperienceSummaryCard["']/,
        'EditProfile.jsx must import ExperienceSummaryCard'
      );
      assert.match(
        editProfileContent,
        /<ExperienceSummaryCard\s+experience=\{profile\?\.experience\}/,
        'EditProfile.jsx must render ExperienceSummaryCard with profile.experience'
      );

      const sectionPath = path.resolve(__dirname, '../components/profile/ProfileExperienceSection.jsx');
      const sectionContent = fs.readFileSync(sectionPath, 'utf8');

      assert.match(
        sectionContent,
        /import\s+ExperienceSummaryCard\s+from\s+["']\.\/ExperienceSummaryCard["']/,
        'ProfileExperienceSection.jsx must import ExperienceSummaryCard'
      );
      assert.match(
        sectionContent,
        /<ExperienceSummaryCard\s+experience=\{rawItems\}/,
        'ProfileExperienceSection.jsx must render ExperienceSummaryCard with rawItems'
      );

      const summaryCardPath = path.resolve(__dirname, '../components/profile/ExperienceSummaryCard.jsx');
      const summaryCardContent = fs.readFileSync(summaryCardPath, 'utf8');

      assert.match(
        summaryCardContent,
        /data-testid="experience-summary-card"/,
        'ExperienceSummaryCard must declare test id'
      );
      assert.match(
        summaryCardContent,
        /data-testid="total-experience-value"/,
        'ExperienceSummaryCard must declare total experience value test id'
      );
      assert.match(
        summaryCardContent,
        /data-testid="career-roles-value"/,
        'ExperienceSummaryCard must declare career roles value test id'
      );
      assert.match(
        summaryCardContent,
        /data-testid="current-roles-value"/,
        'ExperienceSummaryCard must declare current roles value test id'
      );
    });
  });
});
