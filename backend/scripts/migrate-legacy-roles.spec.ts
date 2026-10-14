/// <reference path="../node_modules/@types/jest/index.d.ts" />

import {
  planUserRoleMigration,
  maskEmail,
  createMigrationBackup,
  generateChangeManifest,
  validateMigrationExecutionMode,
  parseSanitizedHost,
  buildUserRoleUpdateDoc,
} from './migrate-legacy-roles';
import { rollbackRoleMigration } from './rollback-role-migration';
import {
  analyzeMembershipReconciliation,
  generateReconciliationManifest,
  executeMembershipReconciliation,
  rollbackMembershipReconciliation,
} from './audit-membership-reconciliation';

describe('migrate-legacy-roles - Hardened Conflict & Migration Audit', () => {
  describe('Canonical & Legacy Mapping', () => {
    it('normalizes legacy primaryRole "FOUNDER" to "RECRUITER" (READY)', () => {
      const user = {
        _id: 'u_founder_1',
        email: 'founder@zeitnah.test',
        username: 'founder1',
        role: 'recruiter',
        primaryRole: 'FOUNDER',
      };

      const plan = planUserRoleMigration(user);
      expect(plan).not.toBeNull();
      expect(plan!.status).toBe('READY');
      expect(plan!.targetPrimaryRole).toBe('RECRUITER');
      expect(plan!.targetRole).toBe('recruiter');
      expect(plan!.reason).toContain('LEGACY_FOUNDER_TO_RECRUITER');
    });

    it('normalizes legacy primaryRole "MENTOR" to "PROFESSIONAL" with mentorship preserved (READY)', () => {
      const user = {
        _id: 'u_mentor_1',
        email: 'mentor@zeitnah.test',
        username: 'mentor1',
        role: 'student',
        primaryRole: 'MENTOR',
        mentorship: {
          isAvailableForMentorship: true,
          topics: ['Civil BIM', 'Geotechnical'],
        },
      };

      const plan = planUserRoleMigration(user);
      expect(plan).not.toBeNull();
      expect(plan!.status).toBe('READY');
      expect(plan!.targetPrimaryRole).toBe('PROFESSIONAL');
      expect(plan!.targetRole).toBe('student');
      expect(plan!.hasMentorshipData).toBe(true);
      expect(plan!.reason).toContain('LEGACY_MENTOR_TO_PROFESSIONAL');
    });

    it('preserves existing canonical community roles unchanged (idempotent)', () => {
      const student = {
        _id: 'u_stu',
        email: 'stu@zeitnah.test',
        role: 'student',
        primaryRole: 'STUDENT',
      };
      expect(planUserRoleMigration(student)).toBeNull();

      const pro = {
        _id: 'u_pro',
        email: 'pro@zeitnah.test',
        role: 'student',
        primaryRole: 'PROFESSIONAL',
      };
      expect(planUserRoleMigration(pro)).toBeNull();

      const recruiter = {
        _id: 'u_rec',
        email: 'rec@zeitnah.test',
        role: 'recruiter',
        primaryRole: 'RECRUITER',
      };
      expect(planUserRoleMigration(recruiter)).toBeNull();

      const educator = {
        _id: 'u_edu',
        email: 'edu@zeitnah.test',
        role: 'teacher',
        primaryRole: 'EDUCATOR',
      };
      expect(planUserRoleMigration(educator)).toBeNull();
    });

    it('preserves verified system administrator accounts (primaryRole: ADMIN, role: admin) without changes', () => {
      const admin = {
        _id: 'u_adm',
        email: 'admin@zeitnah.test',
        role: 'admin',
        primaryRole: 'ADMIN',
      };
      expect(planUserRoleMigration(admin)).toBeNull();
    });

    it('aligns legacy LMS role to "admin" for verified administrators (primaryRole: ADMIN, role: student)', () => {
      const verifiedAdminWithLegacyLmsRole = {
        _id: 'u_adm_verified',
        email: 'sysadmin@zeitnah.test',
        role: 'student',
        primaryRole: 'ADMIN',
      };

      const plan = planUserRoleMigration(verifiedAdminWithLegacyLmsRole);
      expect(plan).not.toBeNull();
      expect(plan!.status).toBe('READY');
      expect(plan!.targetPrimaryRole).toBe('ADMIN');
      expect(plan!.targetRole).toBe('admin');
      expect(plan!.reason).toContain('ADMIN_ROLE_ALIGNMENT');
    });

    it('NEVER grants ADMIN based solely on untrusted legacy role: admin with conflicting primaryRole: STUDENT', () => {
      const conflictingAdminRecord = {
        _id: 'u_adm_conflict',
        email: 'student_admin_mismatch@zeitnah.test',
        role: 'admin',
        primaryRole: 'STUDENT',
      };

      const plan = planUserRoleMigration(conflictingAdminRecord);
      expect(plan).not.toBeNull();
      expect(plan!.status).toBe('CONFLICT_REQUIRES_REVIEW');
      // Crucial Safety Lock: targetPrimaryRole is NOT promoted to ADMIN!
      expect(plan!.targetPrimaryRole).toBe('STUDENT');
      expect(plan!.reason).toContain('CONFLICT_UNVERIFIED_ADMIN_ROLE_WITH_STUDENT_PRIMARY');
    });

    it('NEVER grants ADMIN based solely on untrusted legacy role: admin with missing primaryRole', () => {
      const unverifiedAdmin = {
        _id: 'u_adm_unverified',
        email: 'unverified_admin@zeitnah.test',
        role: 'admin',
        primaryRole: '',
      };

      const plan = planUserRoleMigration(unverifiedAdmin);
      expect(plan).not.toBeNull();
      expect(plan!.status).toBe('CONFLICT_REQUIRES_REVIEW');
      // Crucial Safety Lock: targetPrimaryRole is NOT promoted to ADMIN!
      expect(plan!.targetPrimaryRole).toBe('');
      expect(plan!.reason).toContain('CONFLICT_ADMIN_ROLE_REQUIRES_VERIFICATION');
    });
  });

  describe('Field Isolation & Unrelated Data Preservation', () => {
    it('buildUserRoleUpdateDoc generates $set payload containing ONLY role and primaryRole', () => {
      const plan = {
        userId: 'user_isolation_1',
        emailMasked: 'm***r@zeitnah.test',
        currentRole: 'student',
        targetRole: 'student',
        currentPrimaryRole: 'MENTOR',
        targetPrimaryRole: 'PROFESSIONAL',
        status: 'READY' as const,
        reason: 'LEGACY_MENTOR_TO_PROFESSIONAL',
        hasMentorshipData: true,
      };

      const { filter, update } = buildUserRoleUpdateDoc(plan);

      // OCC Filter verification
      expect(filter).toEqual({
        _id: 'user_isolation_1',
        role: 'student',
        primaryRole: 'MENTOR',
      });

      // Update payload field isolation: ONLY primaryRole is updated (targetRole === currentRole)
      expect(update).toEqual({
        $set: {
          primaryRole: 'PROFESSIONAL',
        },
      });

      // Strictly verify no unrelated fields are in $set
      const setKeys = Object.keys(update.$set);
      expect(setKeys.every((k) => k === 'role' || k === 'primaryRole')).toBe(true);
      expect(setKeys).not.toContain('mentorship');
      expect(setKeys).not.toContain('skills');
      expect(setKeys).not.toContain('bio');
      expect(setKeys).not.toContain('email');
      expect(setKeys).not.toContain('careerPreferences');
    });

    it('buildUserRoleUpdateDoc updates both role and primaryRole when both change', () => {
      const plan = {
        userId: 'user_founder_1',
        emailMasked: 'f***r@zeitnah.test',
        currentRole: 'founder',
        targetRole: 'recruiter',
        currentPrimaryRole: 'FOUNDER',
        targetPrimaryRole: 'RECRUITER',
        status: 'READY' as const,
        reason: 'LEGACY_FOUNDER_TO_RECRUITER',
      };

      const { filter, update } = buildUserRoleUpdateDoc(plan);

      expect(filter).toEqual({
        _id: 'user_founder_1',
        role: 'founder',
        primaryRole: 'FOUNDER',
      });

      expect(update).toEqual({
        $set: {
          role: 'recruiter',
          primaryRole: 'RECRUITER',
        },
      });
    });

    it('MENTOR to PROFESSIONAL mapping preserves user mentorship preferences, availability, topics, and discovery data', () => {
      const complexMentorUser = {
        _id: 'u_mentor_full',
        email: 'dr.farooq@zeitnah.test',
        username: 'farooq_bim',
        role: 'student',
        primaryRole: 'MENTOR',
        headline: 'Lead Infrastructure Engineer & BIM Mentor',
        bio: '15+ years experience mentoring civil & geotechnical engineers',
        mentorship: {
          isAvailableForMentorship: true,
          topics: ['Civil BIM', 'Geotechnical Engineering', 'Structural Analysis'],
          maxMentees: 5,
          experienceYears: 15,
        },
        careerPreferences: {
          preferredRoles: ['Principal Consultant', 'BIM Lead'],
          openToRemote: true,
        },
        skills: ['Revit', 'Civil 3D', 'Navisworks'],
      };

      const plan = planUserRoleMigration(complexMentorUser);
      expect(plan).not.toBeNull();
      expect(plan!.status).toBe('READY');
      expect(plan!.targetPrimaryRole).toBe('PROFESSIONAL');
      expect(plan!.hasMentorshipData).toBe(true);

      // The original user object's mentorship, skills, careerPreferences are untouched
      expect(complexMentorUser.mentorship.isAvailableForMentorship).toBe(true);
      expect(complexMentorUser.mentorship.topics).toEqual([
        'Civil BIM',
        'Geotechnical Engineering',
        'Structural Analysis',
      ]);
      expect(complexMentorUser.mentorship.maxMentees).toBe(5);
      expect(complexMentorUser.careerPreferences.preferredRoles).toEqual([
        'Principal Consultant',
        'BIM Lead',
      ]);
      expect(complexMentorUser.skills).toHaveLength(3);
    });

    it('FOUNDER to RECRUITER mapping updates role fields without side effects on user ownership or profile data', () => {
      const founderUser = {
        _id: 'u_founder_full',
        email: 'sarah.founder@zeitnah.test',
        username: 'sarah_infra',
        role: 'recruiter',
        primaryRole: 'FOUNDER',
        headline: 'Founder & Infrastructure Talent Director',
        bio: 'Building green transit infrastructure networks',
        organizationMemberships: ['org_alpha', 'org_beta'],
      };

      const plan = planUserRoleMigration(founderUser);
      expect(plan).not.toBeNull();
      expect(plan!.status).toBe('READY');
      expect(plan!.targetPrimaryRole).toBe('RECRUITER');
      expect(plan!.targetRole).toBe('recruiter');

      // Ownership references in user object are not wiped
      expect(founderUser.organizationMemberships).toEqual([
        'org_alpha',
        'org_beta',
      ]);
    });

    it('Migration planning is strictly idempotent on repeated passes', () => {
      const rawUser = {
        _id: 'u_repeatable',
        email: 'repeatable@zeitnah.test',
        role: 'founder',
        primaryRole: 'FOUNDER',
      };

      // Pass 1: generates plan
      const plan1 = planUserRoleMigration(rawUser);
      expect(plan1).not.toBeNull();
      expect(plan1!.status).toBe('READY');

      // Simulate applying the plan
      const postMigrationUser = {
        ...rawUser,
        role: plan1!.targetRole,
        primaryRole: plan1!.targetPrimaryRole,
      };

      // Pass 2: subsequent check returns null (already canonical and compliant)
      const plan2 = planUserRoleMigration(postMigrationUser);
      expect(plan2).toBeNull();
    });
  });

  describe('Hardened Conflict Handling (No Silent Downgrades)', () => {
    it('flags malformed primaryRole (e.g. "SUPERMAN", "CEO") as CONFLICT_REQUIRES_REVIEW without converting to STUDENT', () => {
      const malformed = {
        _id: 'u_bad',
        email: 'bad@zeitnah.test',
        role: 'student',
        primaryRole: 'SUPERMAN',
      };

      const plan = planUserRoleMigration(malformed);
      expect(plan).not.toBeNull();
      expect(plan!.status).toBe('CONFLICT_REQUIRES_REVIEW');
      // Crucial: targetPrimaryRole is NOT silently converted to STUDENT!
      expect(plan!.targetPrimaryRole).toBe('SUPERMAN');
      expect(plan!.reason).toContain('CONFLICT_MALFORMED_PRIMARY_ROLE_SUPERMAN');
    });

    it('flags unverified legacy "teacher" or "educator" role with missing primaryRole as CONFLICT_REQUIRES_REVIEW', () => {
      const ambiguousTeacher = {
        _id: 'u_teacher_missing_primary',
        email: 'teacher@zeitnah.test',
        role: 'teacher',
        primaryRole: '',
      };

      const plan = planUserRoleMigration(ambiguousTeacher);
      expect(plan).not.toBeNull();
      expect(plan!.status).toBe('CONFLICT_REQUIRES_REVIEW');
      expect(plan!.reason).toContain(
        'CONFLICT_EDUCATOR_REQUIRES_ADMIN_VERIFICATION',
      );
    });

    it('flags role "educator" when primaryRole is STUDENT as CONFLICT_REQUIRES_REVIEW', () => {
      const conflictingEdu = {
        _id: 'u_conflicting_edu',
        email: 'alex@zeitnah.test',
        role: 'educator',
        primaryRole: 'STUDENT',
      };

      const plan = planUserRoleMigration(conflictingEdu);
      expect(plan).not.toBeNull();
      expect(plan!.status).toBe('CONFLICT_REQUIRES_REVIEW');
      expect(plan!.reason).toContain(
        'CONFLICT_ROLE_EDUCATOR_BUT_PRIMARY_NOT_EDUCATOR',
      );
    });

    it('flags unrecognized legacy role strings as CONFLICT_REQUIRES_REVIEW', () => {
      const unrecognizedRole = {
        _id: 'u_unrecognized',
        email: 'unknown@zeitnah.test',
        role: 'intern',
        primaryRole: '',
      };

      const plan = planUserRoleMigration(unrecognizedRole);
      expect(plan).not.toBeNull();
      expect(plan!.status).toBe('CONFLICT_REQUIRES_REVIEW');
      expect(plan!.reason).toContain(
        'CONFLICT_MISSING_PRIMARY_AND_UNKNOWN_ROLE',
      );
    });
  });

  describe('Privacy & Email Masking', () => {
    it('masks emails properly in plan output', () => {
      expect(maskEmail('farooq.sayed@zeitnah.com')).toBe('f***d@zeitnah.com');
      expect(maskEmail('al@zeitnah.com')).toBe('a***@zeitnah.com');
      expect(maskEmail('')).toBe('anonymous@masked');
    });
  });

  describe('Backup & Rollback Implementation', () => {
    it('creates and verifies backup snapshot when counts match', async () => {
      const mockDb = {
        listCollections: jest.fn().mockReturnValue({
          hasNext: jest.fn().mockResolvedValue(false),
        }),
        collection: jest.fn().mockImplementation((name: string) => ({
          countDocuments: jest.fn().mockResolvedValue(10),
          aggregate: jest.fn().mockReturnValue({
            toArray: jest.fn().mockResolvedValue([]),
          }),
        })),
      };

      const result = await createMigrationBackup(mockDb as any);
      expect(result.snapshotCount).toBe(10);
      expect(result.backupCollectionName).toContain(
        'users_backup_role_standardization_',
      );
    });

    it('throws error and aborts before writes if backup snapshot count does not match source count', async () => {
      let callCount = 0;
      const mockDb = {
        listCollections: jest.fn().mockReturnValue({
          hasNext: jest.fn().mockResolvedValue(false),
        }),
        collection: jest.fn().mockImplementation((name: string) => ({
          countDocuments: jest.fn().mockImplementation(() => {
            callCount++;
            return callCount === 1 ? Promise.resolve(10) : Promise.resolve(9); // Mismatch!
          }),
          aggregate: jest.fn().mockReturnValue({
            toArray: jest.fn().mockResolvedValue([]),
          }),
        })),
      };

      await expect(createMigrationBackup(mockDb as any)).rejects.toThrow(
        /BACKUP VERIFICATION FAILED/,
      );
    });

    it('verifies document identities and critical fields between source and backup snapshot', async () => {
      const sourceSample = [
        { _id: 'u1', role: 'recruiter', primaryRole: 'RECRUITER' },
        { _id: 'u2', role: 'student', primaryRole: 'STUDENT' },
      ];
      const mockDb = {
        listCollections: jest.fn().mockReturnValue({
          hasNext: jest.fn().mockResolvedValue(false),
        }),
        collection: jest.fn().mockImplementation((name: string) => ({
          countDocuments: jest.fn().mockResolvedValue(2),
          aggregate: jest.fn().mockReturnValue({
            toArray: jest.fn().mockResolvedValue([]),
          }),
          find: jest.fn().mockReturnValue({
            toArray: jest.fn().mockResolvedValue(sourceSample),
          }),
          findOne: jest.fn().mockImplementation(({ _id }) => {
            const found = sourceSample.find((d) => d._id === _id);
            return Promise.resolve(found ? { ...found } : null);
          }),
        })),
      };

      const result = await createMigrationBackup(mockDb as any);
      expect(result.snapshotCount).toBe(2);
    });

    it('throws error and aborts if a document identity is missing in backup snapshot', async () => {
      const sourceSample = [
        { _id: 'u1', role: 'recruiter', primaryRole: 'RECRUITER' },
        { _id: 'u2', role: 'student', primaryRole: 'STUDENT' },
      ];
      const mockDb = {
        listCollections: jest.fn().mockReturnValue({
          hasNext: jest.fn().mockResolvedValue(false),
        }),
        collection: jest.fn().mockImplementation((name: string) => ({
          countDocuments: jest.fn().mockResolvedValue(2),
          aggregate: jest.fn().mockReturnValue({
            toArray: jest.fn().mockResolvedValue([]),
          }),
          find: jest.fn().mockReturnValue({
            toArray: jest.fn().mockResolvedValue(sourceSample),
          }),
          findOne: jest.fn().mockImplementation(({ _id }) => {
            if (_id === 'u2') return Promise.resolve(null); // Missing in backup!
            return Promise.resolve({ _id: 'u1', role: 'recruiter', primaryRole: 'RECRUITER' });
          }),
        })),
      };

      await expect(createMigrationBackup(mockDb as any)).rejects.toThrow(
        /BACKUP INTEGRITY FAILED: Document _id "u2" missing in backup snapshot/,
      );
    });

    it('throws error and aborts if a critical field mismatches between source and backup', async () => {
      const sourceSample = [
        { _id: 'u1', role: 'recruiter', primaryRole: 'RECRUITER' },
      ];
      const mockDb = {
        listCollections: jest.fn().mockReturnValue({
          hasNext: jest.fn().mockResolvedValue(false),
        }),
        collection: jest.fn().mockImplementation((name: string) => ({
          countDocuments: jest.fn().mockResolvedValue(1),
          aggregate: jest.fn().mockReturnValue({
            toArray: jest.fn().mockResolvedValue([]),
          }),
          find: jest.fn().mockReturnValue({
            toArray: jest.fn().mockResolvedValue(sourceSample),
          }),
          findOne: jest.fn().mockImplementation(({ _id }) => {
            // Field mismatch!
            return Promise.resolve({ _id: 'u1', role: 'student', primaryRole: 'STUDENT' });
          }),
        })),
      };

      await expect(createMigrationBackup(mockDb as any)).rejects.toThrow(
        /BACKUP INTEGRITY FAILED: Critical field mismatch for document _id "u1"/,
      );
    });

    it('throws error and aborts if source collection count changes post-verification (write quiescence violation)', async () => {
      const sourceSample = [
        { _id: 'u1', role: 'recruiter', primaryRole: 'RECRUITER' },
      ];
      let sourceCountCall = 0;
      const mockDb = {
        listCollections: jest.fn().mockReturnValue({
          hasNext: jest.fn().mockResolvedValue(false),
        }),
        collection: jest.fn().mockImplementation((name: string) => ({
          countDocuments: jest.fn().mockImplementation(() => {
            if (name === 'users') {
              sourceCountCall++;
              // 1st call before snapshot returns 1; 2nd call post-verification returns 2 (a write happened!)
              return Promise.resolve(sourceCountCall === 1 ? 1 : 2);
            }
            return Promise.resolve(1); // backup snapshot has 1
          }),
          aggregate: jest.fn().mockReturnValue({
            toArray: jest.fn().mockResolvedValue([]),
          }),
          find: jest.fn().mockReturnValue({
            toArray: jest.fn().mockResolvedValue(sourceSample),
          }),
          findOne: jest.fn().mockImplementation(({ _id }) => {
            return Promise.resolve({ _id: 'u1', role: 'recruiter', primaryRole: 'RECRUITER' });
          }),
        })),
      };

      await expect(createMigrationBackup(mockDb as any)).rejects.toThrow(
        /BACKUP WRITE QUIESCENCE VIOLATION/,
      );
    });

    it('rollbackRoleMigration reverts only role and primaryRole from manifest', async () => {
      const mockUpdateOne = jest
        .fn()
        .mockResolvedValue({ modifiedCount: 1 });
      const mockFindOne = jest.fn().mockImplementation(({ _id }) => {
        if (_id === 'user_1') {
          return Promise.resolve({
            _id: 'user_1',
            primaryRole: 'RECRUITER',
            role: 'recruiter',
          });
        }
        if (_id === 'user_2') {
          return Promise.resolve({
            _id: 'user_2',
            primaryRole: 'PROFESSIONAL',
            role: 'student',
          });
        }
        return Promise.resolve(null);
      });
      const mockDb = {
        collection: jest.fn().mockReturnValue({
          findOne: mockFindOne,
          updateOne: mockUpdateOne,
        }),
      };

      const manifest: any = {
        version: '1.0',
        migrationType: 'ROLE_STANDARDIZATION',
        timestamp: '2026-10-12T00:00:00.000Z',
        database: 'zeitnah-lms',
        recordCount: 2,
        entries: [
          {
            userId: 'user_1',
            oldRole: 'recruiter',
            newRole: 'recruiter',
            oldPrimaryRole: 'FOUNDER',
            newPrimaryRole: 'RECRUITER',
            reason: 'LEGACY_FOUNDER_TO_RECRUITER',
          },
          {
            userId: 'user_2',
            oldRole: 'student',
            newRole: 'student',
            oldPrimaryRole: 'MENTOR',
            newPrimaryRole: 'PROFESSIONAL',
            reason: 'LEGACY_MENTOR_TO_PROFESSIONAL',
          },
        ],
      };

      const result = await rollbackRoleMigration(mockDb as any, manifest);
      expect(result.restoredCount).toBe(2);
      expect(mockUpdateOne).toHaveBeenCalledTimes(2);

      // Verify that updateOne strictly touched only role and primaryRole
      expect(mockUpdateOne).toHaveBeenNthCalledWith(
        1,
        { _id: 'user_1' },
        {
          $set: {
            role: 'recruiter',
            primaryRole: 'FOUNDER',
          },
        },
      );
      expect(mockUpdateOne).toHaveBeenNthCalledWith(
        2,
        { _id: 'user_2' },
        {
          $set: {
            role: 'student',
            primaryRole: 'MENTOR',
          },
        },
      );
    });

    it('appends random suffix if backup collection name already exists to prevent accidental overwrite', async () => {
      const mockDb = {
        listCollections: jest.fn().mockReturnValue({
          hasNext: jest
            .fn()
            .mockResolvedValueOnce(true) // Initial name exists!
            .mockResolvedValueOnce(false), // Suffixed name is available!
        }),
        collection: jest.fn().mockImplementation((name: string) => ({
          countDocuments: jest.fn().mockResolvedValue(5),
          aggregate: jest.fn().mockReturnValue({
            toArray: jest.fn().mockResolvedValue([]),
          }),
        })),
      };

      const result = await createMigrationBackup(mockDb as any);
      expect(result.snapshotCount).toBe(5);
      // Confirmed that backupCollectionName contains an extra random suffix
      expect(result.backupCollectionName).toMatch(
        /users_backup_role_standardization_.+_[a-z0-9]+/,
      );
    });

    it('throws error if unique backup collection name cannot be generated after maximum attempts', async () => {
      const mockDb = {
        listCollections: jest.fn().mockReturnValue({
          hasNext: jest.fn().mockResolvedValue(true), // Always collides!
        }),
        collection: jest.fn().mockImplementation((name: string) => ({
          countDocuments: jest.fn().mockResolvedValue(5),
          aggregate: jest.fn().mockReturnValue({
            toArray: jest.fn().mockResolvedValue([]),
          }),
        })),
      };

      await expect(createMigrationBackup(mockDb as any)).rejects.toThrow(
        /BACKUP SAFETY ERROR: Unable to generate unique backup collection name/,
      );
    });

    it('rollback skips records modified post-migration to prevent overwriting newer changes', async () => {
      const mockUpdateOne = jest.fn();
      const mockFindOne = jest.fn().mockImplementation(({ _id }) => {
        if (_id === 'user_modified_later') {
          // User was changed to ADMIN after the migration!
          return Promise.resolve({
            _id,
            primaryRole: 'ADMIN',
            role: 'admin',
          });
        }
        return Promise.resolve(null);
      });

      const mockDb = {
        collection: jest.fn().mockReturnValue({
          findOne: mockFindOne,
          updateOne: mockUpdateOne,
        }),
      };

      const manifest: any = {
        version: '1.0',
        migrationType: 'ROLE_STANDARDIZATION',
        timestamp: '2026-10-12T00:00:00.000Z',
        database: 'zeitnah-lms',
        recordCount: 1,
        entries: [
          {
            userId: 'user_modified_later',
            oldRole: 'recruiter',
            newRole: 'recruiter',
            oldPrimaryRole: 'FOUNDER',
            newPrimaryRole: 'RECRUITER',
            reason: 'LEGACY_FOUNDER_TO_RECRUITER',
          },
        ],
      };

      const result = await rollbackRoleMigration(mockDb as any, manifest, {
        force: false,
      });
      expect(result.restoredCount).toBe(0);
      expect(result.skippedCount).toBe(1);
      expect(result.errors[0]).toContain('modified post-migration');
      expect(mockUpdateOne).not.toHaveBeenCalled();
    });

    it('rollback with force: true overrides post-migration guard', async () => {
      const mockUpdateOne = jest
        .fn()
        .mockResolvedValue({ modifiedCount: 1 });
      const mockFindOne = jest.fn().mockResolvedValue({
        _id: 'user_modified_later',
        primaryRole: 'ADMIN',
        role: 'admin',
      });

      const mockDb = {
        collection: jest.fn().mockReturnValue({
          findOne: mockFindOne,
          updateOne: mockUpdateOne,
        }),
      };

      const manifest: any = {
        version: '1.0',
        migrationType: 'ROLE_STANDARDIZATION',
        timestamp: '2026-10-12T00:00:00.000Z',
        database: 'zeitnah-lms',
        recordCount: 1,
        entries: [
          {
            userId: 'user_modified_later',
            oldRole: 'recruiter',
            newRole: 'recruiter',
            oldPrimaryRole: 'FOUNDER',
            newPrimaryRole: 'RECRUITER',
            reason: 'LEGACY_FOUNDER_TO_RECRUITER',
          },
        ],
      };

      const result = await rollbackRoleMigration(mockDb as any, manifest, {
        force: true,
      });
      expect(result.restoredCount).toBe(1);
      expect(mockUpdateOne).toHaveBeenCalled();
    });

    it('rollback skips records recorded with status: PENDING in manifest (interrupted migration recovery)', async () => {
      const mockUpdateOne = jest.fn();
      const mockFindOne = jest.fn();
      const mockDb = {
        collection: jest.fn().mockReturnValue({
          findOne: mockFindOne,
          updateOne: mockUpdateOne,
        }),
      };

      const manifest: any = {
        version: '1.0',
        migrationType: 'ROLE_STANDARDIZATION',
        timestamp: '2026-10-12T00:00:00.000Z',
        database: 'zeitnah-lms',
        recordCount: 1,
        entries: [
          {
            userId: 'user_pending_midway',
            oldRole: 'student',
            newRole: 'student',
            oldPrimaryRole: 'MENTOR',
            newPrimaryRole: 'PROFESSIONAL',
            reason: 'LEGACY_MENTOR_TO_PROFESSIONAL',
            status: 'PENDING', // Not yet applied before interrupted run
          },
        ],
      };

      const result = await rollbackRoleMigration(mockDb as any, manifest);
      expect(result.restoredCount).toBe(0);
      expect(result.skippedCount).toBe(1);
      expect(result.errors[0]).toContain('pending in manifest');
      expect(mockFindOne).not.toHaveBeenCalled();
      expect(mockUpdateOne).not.toHaveBeenCalled();
    });

    it('rejects malformed manifest with invalid version or missing entries', async () => {
      const mockDb = { collection: jest.fn() };

      await expect(
        rollbackRoleMigration(mockDb as any, {} as any),
      ).rejects.toThrow(/Invalid manifest/);

      await expect(
        rollbackRoleMigration(mockDb as any, {
          version: '2.0',
          migrationType: 'WRONG',
          entries: [],
        } as any),
      ).rejects.toThrow(/Unsupported manifest version/);
    });

    it('deduplicates manifest entries with identical userId', async () => {
      const mockUpdateOne = jest
        .fn()
        .mockResolvedValue({ modifiedCount: 1 });
      const mockFindOne = jest.fn().mockResolvedValue({
        _id: 'user_dup',
        primaryRole: 'RECRUITER',
        role: 'recruiter',
      });

      const mockDb = {
        collection: jest.fn().mockReturnValue({
          findOne: mockFindOne,
          updateOne: mockUpdateOne,
        }),
      };

      const manifest: any = {
        version: '1.0',
        migrationType: 'ROLE_STANDARDIZATION',
        timestamp: '2026-10-12T00:00:00.000Z',
        database: 'zeitnah-lms',
        recordCount: 2,
        entries: [
          {
            userId: 'user_dup',
            oldRole: 'recruiter',
            newRole: 'recruiter',
            oldPrimaryRole: 'FOUNDER',
            newPrimaryRole: 'RECRUITER',
            reason: 'FIRST_ENTRY',
          },
          {
            userId: 'user_dup',
            oldRole: 'recruiter',
            newRole: 'recruiter',
            oldPrimaryRole: 'FOUNDER',
            newPrimaryRole: 'RECRUITER',
            reason: 'DUPLICATE_ENTRY',
          },
        ],
      };

      const result = await rollbackRoleMigration(mockDb as any, manifest);
      expect(result.restoredCount).toBe(1);
      expect(mockUpdateOne).toHaveBeenCalledTimes(1);
    });
  });

  describe('Migration Execution Safety Locks', () => {
    it('defaults to dry-run mode when no flags are supplied', () => {
      const mode = validateMigrationExecutionMode([], 'test-db');
      expect(mode.isDryRun).toBe(true);
      expect(mode.isLive).toBe(false);
      expect(mode.targetDb).toBe('test-db');
    });

    it('runs in dry-run mode when --dry-run is explicitly passed', () => {
      const mode = validateMigrationExecutionMode(['--dry-run'], 'test-db');
      expect(mode.isDryRun).toBe(true);
      expect(mode.isLive).toBe(false);
    });

    it('throws error if both --live and --dry-run are passed simultaneously', () => {
      expect(() =>
        validateMigrationExecutionMode(['--live', '--dry-run'], 'test-db'),
      ).toThrow(/SAFETY CONFLICT: Cannot specify both --live and --dry-run/);
    });

    it('throws error if --live is passed without --target confirmation', () => {
      expect(() =>
        validateMigrationExecutionMode(['--live'], 'test-db'),
      ).toThrow(/SAFETY LOCK: Live migration requires explicit target verification/);
    });

    it('throws error if --live is passed with mismatched target database', () => {
      expect(() =>
        validateMigrationExecutionMode(
          ['--live', '--target=wrong-db'],
          'test-db',
        ),
      ).toThrow(/TARGET MISMATCH: Specified --target="wrong-db"/);
    });

    it('throws error if --live is passed without --env declaration', () => {
      expect(() =>
        validateMigrationExecutionMode(
          ['--live', '--target=test-db'],
          'test-db',
        ),
      ).toThrow(/SAFETY LOCK: Live migration requires explicit environment declaration/);
    });

    it('throws error if --env=production is passed', () => {
      expect(() =>
        validateMigrationExecutionMode(
          ['--live', '--target=test-db', '--env=production'],
          'test-db',
        ),
      ).toThrow(/PRODUCTION SAFETY LOCK: Direct live execution against production is prohibited/);
    });

    it('throws error if --env=staging is passed but target host is local', () => {
      expect(() =>
        validateMigrationExecutionMode(
          ['--live', '--target=test-db', '--env=staging'],
          'test-db',
          'mongodb://localhost:27017/test-db',
        ),
      ).toThrow(/ENVIRONMENT MISMATCH: Declared --env=staging, but configured database host is local/);
    });

    it('throws error if --env=staging is passed on remote host without matching --confirm-host', () => {
      expect(() =>
        validateMigrationExecutionMode(
          ['--live', '--target=test-db', '--env=staging'],
          'test-db',
          'mongodb://staging-db.zeitnah.internal:27017/test-db',
        ),
      ).toThrow(/HOST SAFETY LOCK: Staging migration requires explicit host confirmation/);

      expect(() =>
        validateMigrationExecutionMode(
          ['--live', '--target=test-db', '--env=staging', '--confirm-host=wrong-host'],
          'test-db',
          'mongodb://staging-db.zeitnah.internal:27017/test-db',
        ),
      ).toThrow(/HOST SAFETY LOCK: Staging migration requires explicit host confirmation/);
    });

    it('approves staging live mode when --live, matching --target, --env=staging, and --confirm-host match remote host', () => {
      const mode = validateMigrationExecutionMode(
        [
          '--live',
          '--target=test-db',
          '--env=staging',
          '--confirm-host=staging-db.zeitnah.internal',
        ],
        'test-db',
        'mongodb://staging-db.zeitnah.internal:27017/test-db',
      );
      expect(mode.isDryRun).toBe(false);
      expect(mode.isLive).toBe(true);
      expect(mode.targetDb).toBe('test-db');
      expect(mode.environment).toBe('staging');
      expect(mode.sanitizedHost).toContain('staging-db.zeitnah.internal');
    });

    it('throws error if --env=local is passed on remote host', () => {
      expect(() =>
        validateMigrationExecutionMode(
          ['--live', '--target=test-db', '--env=local'],
          'test-db',
          'mongodb://remote-db.zeitnah.internal:27017/test-db',
        ),
      ).toThrow(/ENVIRONMENT MISMATCH: Declared --env=local, but configured database host is remote/);
    });

    it('approves local live mode when --live, matching --target, and --env=local are provided on local host', () => {
      const mode = validateMigrationExecutionMode(
        ['--live', '--target=test-db', '--env=local'],
        'test-db',
        'mongodb://127.0.0.1:27017/test-db',
      );
      expect(mode.isDryRun).toBe(false);
      expect(mode.isLive).toBe(true);
      expect(mode.targetDb).toBe('test-db');
      expect(mode.environment).toBe('local');
    });

    it('throws error for unrecognized environment', () => {
      expect(() =>
        validateMigrationExecutionMode(
          ['--live', '--target=test-db', '--env=dev'],
          'test-db',
        ),
      ).toThrow(/UNRECOGNIZED ENVIRONMENT/);
    });

    it('parseSanitizedHost strips credentials without leaking secrets', () => {
      const parsed = parseSanitizedHost(
        'mongodb://adminUser:SuperSecretPassword123@cluster0.abc.mongodb.net:27017/zeitnah-lms?ssl=true',
      );
      expect(parsed.isLocal).toBe(false);
      expect(parsed.sanitizedHost).toBe('cluster0.abc.mongodb.net:27017');
      expect(parsed.sanitizedHost).not.toContain('adminUser');
      expect(parsed.sanitizedHost).not.toContain('SuperSecretPassword123');
    });
  });

  describe('Membership Reconciliation Conflict Analysis & Safe Execution', () => {
    it('marks eligible non-conflicting legacy records as READY_TO_COPY', () => {
      const standardDocs: any[] = [];
      const legacyDocs = [
        {
          _id: 'm1',
          organizationId: 'org1',
          userId: 'u1',
          role: 'OWNER',
          status: 'ACTIVE',
        },
      ];
      const orgIds = new Set(['org1']);
      const userIds = new Set(['u1']);

      const report = analyzeMembershipReconciliation(
        standardDocs,
        legacyDocs,
        orgIds,
        userIds,
      );

      expect(report.readyToCopyCount).toBe(1);
      expect(report.roleConflictCount).toBe(0);
      expect(report.statusConflictCount).toBe(0);
      expect(report.idConflictCount).toBe(0);
      expect(report.comparisons[0].action).toBe('READY_TO_COPY');
    });

    it('marks identical existing records as IDEMPOTENT_ALREADY_PRESENT', () => {
      const standardDocs = [
        {
          _id: 'std_m1',
          organizationId: 'org1',
          userId: 'u1',
          role: 'OWNER',
          status: 'ACTIVE',
        },
      ];
      const legacyDocs = [
        {
          _id: 'leg_m1',
          organizationId: 'org1',
          userId: 'u1',
          role: 'OWNER',
          status: 'ACTIVE',
        },
      ];

      const report = analyzeMembershipReconciliation(
        standardDocs,
        legacyDocs,
        new Set(['org1']),
        new Set(['u1']),
      );

      expect(report.idempotentAlreadyPresentCount).toBe(1);
      expect(report.readyToCopyCount).toBe(0);
      expect(report.comparisons[0].action).toBe('IDEMPOTENT_ALREADY_PRESENT');
    });

    it('flags conflicting roles as CONFLICT_ROLE_MISMATCH requiring review', () => {
      const standardDocs = [
        {
          _id: 'std_m1',
          organizationId: 'org1',
          userId: 'u1',
          role: 'MEMBER',
          status: 'ACTIVE',
        },
      ];
      const legacyDocs = [
        {
          _id: 'leg_m1',
          organizationId: 'org1',
          userId: 'u1',
          role: 'OWNER',
          status: 'ACTIVE',
        },
      ];

      const report = analyzeMembershipReconciliation(
        standardDocs,
        legacyDocs,
        new Set(['org1']),
        new Set(['u1']),
      );

      expect(report.roleConflictCount).toBe(1);
      expect(report.readyToCopyCount).toBe(0);
      expect(report.comparisons[0].action).toBe('CONFLICT_ROLE_MISMATCH');
    });

    it('flags conflicting statuses as CONFLICT_STATUS_MISMATCH requiring review', () => {
      const standardDocs = [
        {
          _id: 'std_m1',
          organizationId: 'org1',
          userId: 'u1',
          role: 'OWNER',
          status: 'SUSPENDED',
        },
      ];
      const legacyDocs = [
        {
          _id: 'leg_m1',
          organizationId: 'org1',
          userId: 'u1',
          role: 'OWNER',
          status: 'ACTIVE',
        },
      ];

      const report = analyzeMembershipReconciliation(
        standardDocs,
        legacyDocs,
        new Set(['org1']),
        new Set(['u1']),
      );

      expect(report.statusConflictCount).toBe(1);
      expect(report.readyToCopyCount).toBe(0);
      expect(report.comparisons[0].action).toBe('CONFLICT_STATUS_MISMATCH');
    });

    it('flags ID collision with different organization/user pair as CONFLICT_ID_COLLISION_DIFFERENT_PAIR', () => {
      const standardDocs = [
        {
          _id: 'm_same_id',
          organizationId: 'org_A',
          userId: 'u_A',
          role: 'OWNER',
          status: 'ACTIVE',
        },
      ];
      const legacyDocs = [
        {
          _id: 'm_same_id',
          organizationId: 'org_B', // Different pair!
          userId: 'u_B',
          role: 'MEMBER',
          status: 'ACTIVE',
        },
      ];

      const report = analyzeMembershipReconciliation(
        standardDocs,
        legacyDocs,
        new Set(['org_A', 'org_B']),
        new Set(['u_A', 'u_B']),
      );

      expect(report.idConflictCount).toBe(1);
      expect(report.readyToCopyCount).toBe(0);
      expect(report.comparisons[0].action).toBe(
        'CONFLICT_ID_COLLISION_DIFFERENT_PAIR',
      );
    });

    it('flags missing organization or user as orphan references', () => {
      const standardDocs: any[] = [];
      const legacyDocs = [
        {
          _id: 'leg_m1',
          organizationId: 'org_missing',
          userId: 'u1',
          role: 'OWNER',
          status: 'ACTIVE',
        },
        {
          _id: 'leg_m2',
          organizationId: 'org1',
          userId: 'u_missing',
          role: 'OWNER',
          status: 'ACTIVE',
        },
      ];

      const report = analyzeMembershipReconciliation(
        standardDocs,
        legacyDocs,
        new Set(['org1']),
        new Set(['u1']),
      );

      expect(report.orphanOrgCount).toBe(1);
      expect(report.orphanUserCount).toBe(1);
      expect(report.readyToCopyCount).toBe(0);
    });

    it('generates durable reconciliation manifest recording exact inserted IDs and source identities', () => {
      const comparisons: any[] = [
        {
          legacyId: 'leg_1',
          organizationId: 'org_1',
          userId: 'u_1',
          legacyRole: 'OWNER',
          legacyStatus: 'ACTIVE',
          legacyJoinedAt: '2026-01-01T00:00:00.000Z',
          action: 'READY_TO_COPY',
        },
        {
          legacyId: 'leg_2',
          organizationId: 'org_2',
          userId: 'u_2',
          legacyRole: 'MEMBER',
          legacyStatus: 'ACTIVE',
          action: 'CONFLICT_ROLE_MISMATCH',
        },
      ];

      const manifest = generateReconciliationManifest(comparisons, 'test-db');
      expect(manifest.version).toBe('1.0');
      expect(manifest.type).toBe('MEMBERSHIP_RECONCILIATION');
      expect(manifest.reconciledIds).toEqual(['leg_1']);
      expect(manifest.skippedConflictCount).toBe(1);
      expect(manifest.entries).toHaveLength(1);
      expect(manifest.entries[0]).toEqual({
        insertedId: 'leg_1',
        sourceLegacyId: 'leg_1',
        organizationId: 'org_1',
        userId: 'u_1',
        role: 'OWNER',
        status: 'ACTIVE',
        joinedAt: '2026-01-01T00:00:00.000Z',
      });
    });

    it('executeMembershipReconciliation fails closed if any conflict exists in report', async () => {
      const mockDb = { collection: jest.fn() };
      const reportWithConflict: any = {
        roleConflictCount: 1,
        statusConflictCount: 0,
        idConflictCount: 0,
        comparisons: [],
        database: 'test-db',
      };

      await expect(
        executeMembershipReconciliation(mockDb, reportWithConflict, {
          dryRun: false,
        }),
      ).rejects.toThrow(/SAFETY LOCK: Cannot execute reconciliation while conflicts exist/);
    });

    it('executeMembershipReconciliation in dry-run mode returns manifest without writes', async () => {
      const mockCollection = { updateOne: jest.fn() };
      const mockDb = { collection: jest.fn().mockReturnValue(mockCollection) };
      const report: any = {
        roleConflictCount: 0,
        statusConflictCount: 0,
        idConflictCount: 0,
        standardCollection: 'organization_memberships',
        database: 'test-db',
        comparisons: [
          {
            legacyId: 'leg_1',
            organizationId: 'org_1',
            userId: 'u_1',
            legacyRole: 'OWNER',
            legacyStatus: 'ACTIVE',
            action: 'READY_TO_COPY',
          },
        ],
      };

      const result = await executeMembershipReconciliation(mockDb, report, {
        dryRun: true,
      });
      expect(result.insertedCount).toBe(0);
      expect(result.manifest.reconciledIds).toEqual(['leg_1']);
      expect(mockCollection.updateOne).not.toHaveBeenCalled();
    });

    it('executeMembershipReconciliation live handles duplicate-key errors (code 11000) safely', async () => {
      const mockUpdateOne = jest
        .fn()
        .mockRejectedValueOnce({ code: 11000, message: 'E11000 duplicate key' })
        .mockResolvedValueOnce({ upsertedCount: 1 });

      const mockDb = {
        collection: jest.fn().mockReturnValue({ updateOne: mockUpdateOne }),
      };

      const report: any = {
        roleConflictCount: 0,
        statusConflictCount: 0,
        idConflictCount: 0,
        standardCollection: 'organization_memberships',
        database: 'test-db',
        comparisons: [
          {
            legacyId: '507f1f77bcf86cd799439011',
            organizationId: '507f1f77bcf86cd799439012',
            userId: '507f1f77bcf86cd799439013',
            legacyRole: 'OWNER',
            legacyStatus: 'ACTIVE',
            action: 'READY_TO_COPY',
          },
          {
            legacyId: '507f1f77bcf86cd799439014',
            organizationId: '507f1f77bcf86cd799439015',
            userId: '507f1f77bcf86cd799439016',
            legacyRole: 'MEMBER',
            legacyStatus: 'ACTIVE',
            action: 'READY_TO_COPY',
          },
        ],
      };

      const result = await executeMembershipReconciliation(mockDb, report, {
        dryRun: false,
        persistManifest: false,
      });
      expect(result.insertedCount).toBe(1);
      expect(result.skippedCount).toBe(1); // 1 skipped due to duplicate key error!
    });

    it('rollbackMembershipReconciliation selectively deletes only reconciled IDs and enforces optimistic guard', async () => {
      const mockDeleteOne = jest.fn().mockResolvedValue({ deletedCount: 1 });
      const mockFindOne = jest.fn().mockImplementation(({ _id }) => {
        if (String(_id) === 'rec_1') {
          return Promise.resolve({
            _id: 'rec_1',
            organizationId: 'org1',
            userId: 'u1',
            role: 'OWNER',
            status: 'ACTIVE',
          });
        }
        if (String(_id) === 'rec_modified') {
          // Record was changed to ADMIN after reconciliation!
          return Promise.resolve({
            _id: 'rec_modified',
            organizationId: 'org2',
            userId: 'u2',
            role: 'ADMIN',
            status: 'ACTIVE',
          });
        }
        return Promise.resolve(null);
      });

      const mockDb = {
        collection: jest.fn().mockReturnValue({
          findOne: mockFindOne,
          deleteOne: mockDeleteOne,
        }),
      };

      const manifest: any = {
        version: '1.0',
        type: 'MEMBERSHIP_RECONCILIATION',
        timestamp: '2026-10-12T00:00:00.000Z',
        database: 'test-db',
        reconciledIds: ['rec_1', 'rec_modified'],
        entries: [
          {
            insertedId: 'rec_1',
            sourceLegacyId: 'rec_1',
            organizationId: 'org1',
            userId: 'u1',
            role: 'OWNER',
            status: 'ACTIVE',
          },
          {
            insertedId: 'rec_modified',
            sourceLegacyId: 'rec_modified',
            organizationId: 'org2',
            userId: 'u2',
            role: 'OWNER',
            status: 'ACTIVE',
          },
        ],
        skippedConflictCount: 0,
      };

      const result = await rollbackMembershipReconciliation(mockDb, manifest, {
        force: false,
      });
      expect(result.deletedCount).toBe(1);
      expect(result.skippedCount).toBe(1); // rec_modified was protected from deletion!
      expect(result.errors[0]).toContain('modified post-reconciliation');
      expect(mockDeleteOne).toHaveBeenCalledTimes(1);
    });

    it('rollbackMembershipReconciliation with force: true overrides optimistic concurrency guard', async () => {
      const mockDeleteOne = jest.fn().mockResolvedValue({ deletedCount: 1 });
      const mockFindOne = jest.fn().mockResolvedValue({
        _id: 'rec_modified',
        role: 'ADMIN',
        status: 'ACTIVE',
      });

      const mockDb = {
        collection: jest.fn().mockReturnValue({
          findOne: mockFindOne,
          deleteOne: mockDeleteOne,
        }),
      };

      const manifest: any = {
        version: '1.0',
        type: 'MEMBERSHIP_RECONCILIATION',
        timestamp: '2026-10-12T00:00:00.000Z',
        database: 'test-db',
        reconciledIds: ['rec_modified'],
        entries: [
          {
            insertedId: 'rec_modified',
            sourceLegacyId: 'rec_modified',
            organizationId: 'org2',
            userId: 'u2',
            role: 'OWNER',
            status: 'ACTIVE',
          },
        ],
        skippedConflictCount: 0,
      };

      const result = await rollbackMembershipReconciliation(mockDb, manifest, {
        force: true,
      });
      expect(result.deletedCount).toBe(1);
      expect(result.skippedCount).toBe(0);
      expect(mockDeleteOne).toHaveBeenCalledTimes(1);
    });

    it('executeMembershipReconciliation handles interrupted execution by recording PARTIAL_FAILURE and inserted IDs', async () => {
      let callIndex = 0;
      const mockUpdateOne = jest.fn().mockImplementation(() => {
        callIndex++;
        if (callIndex === 1) {
          return Promise.resolve({ upsertedCount: 1 });
        }
        // Interrupted midway during 2nd insert!
        return Promise.reject(new Error('DATABASE_CONNECTION_LOST'));
      });

      const mockDb = {
        collection: jest.fn().mockReturnValue({ updateOne: mockUpdateOne }),
      };

      const report: any = {
        roleConflictCount: 0,
        statusConflictCount: 0,
        idConflictCount: 0,
        standardCollection: 'organization_memberships',
        database: 'test-db',
        comparisons: [
          {
            legacyId: 'leg_success',
            organizationId: 'org1',
            userId: 'u1',
            legacyRole: 'OWNER',
            legacyStatus: 'ACTIVE',
            action: 'READY_TO_COPY',
          },
          {
            legacyId: 'leg_interrupted',
            organizationId: 'org2',
            userId: 'u2',
            legacyRole: 'MEMBER',
            legacyStatus: 'ACTIVE',
            action: 'READY_TO_COPY',
          },
        ],
      };

      await expect(
        executeMembershipReconciliation(mockDb, report, {
          dryRun: false,
          persistManifest: false,
        }),
      ).rejects.toThrow('DATABASE_CONNECTION_LOST');
    });

    it('rollbackMembershipReconciliation skips and reports records with modified org, user, or timestamps for manual review', async () => {
      const mockDeleteOne = jest.fn().mockResolvedValue({ deletedCount: 1 });
      const mockFindOne = jest.fn().mockImplementation(({ _id }) => {
        if (_id === 'rec_org_changed') {
          return Promise.resolve({
            _id: 'rec_org_changed',
            organizationId: 'org_DIFFERENT', // Modified!
            userId: 'u1',
            role: 'OWNER',
            status: 'ACTIVE',
          });
        }
        if (_id === 'rec_user_changed') {
          return Promise.resolve({
            _id: 'rec_user_changed',
            organizationId: 'org2',
            userId: 'u_DIFFERENT', // Modified!
            role: 'OWNER',
            status: 'ACTIVE',
          });
        }
        if (_id === 'rec_timestamp_mutated') {
          return Promise.resolve({
            _id: 'rec_timestamp_mutated',
            organizationId: 'org3',
            userId: 'u3',
            role: 'OWNER',
            status: 'ACTIVE',
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedAt: new Date('2026-01-02T00:00:00.000Z'), // Mutated post-reconciliation!
          });
        }
        return Promise.resolve(null);
      });

      const mockDb = {
        collection: jest.fn().mockReturnValue({
          findOne: mockFindOne,
          deleteOne: mockDeleteOne,
        }),
      };

      const manifest: any = {
        version: '1.0',
        type: 'MEMBERSHIP_RECONCILIATION',
        timestamp: '2026-10-12T00:00:00.000Z',
        database: 'test-db',
        reconciledIds: ['rec_org_changed', 'rec_user_changed', 'rec_timestamp_mutated'],
        entries: [
          {
            insertedId: 'rec_org_changed',
            sourceLegacyId: 'rec_org_changed',
            organizationId: 'org1',
            userId: 'u1',
            role: 'OWNER',
            status: 'ACTIVE',
          },
          {
            insertedId: 'rec_user_changed',
            sourceLegacyId: 'rec_user_changed',
            organizationId: 'org2',
            userId: 'u2',
            role: 'OWNER',
            status: 'ACTIVE',
          },
          {
            insertedId: 'rec_timestamp_mutated',
            sourceLegacyId: 'rec_timestamp_mutated',
            organizationId: 'org3',
            userId: 'u3',
            role: 'OWNER',
            status: 'ACTIVE',
          },
        ],
        skippedConflictCount: 0,
      };

      const result = await rollbackMembershipReconciliation(mockDb, manifest, {
        force: false,
      });

      expect(result.deletedCount).toBe(0);
      expect(result.skippedCount).toBe(3);
      expect(result.skippedRecords).toHaveLength(3);
      expect(result.skippedRecords![0].reason).toContain('Organization mismatch');
      expect(result.skippedRecords![1].reason).toContain('User mismatch');
      expect(result.skippedRecords![2].reason).toContain('Document mutated post-reconciliation');
      expect(mockDeleteOne).not.toHaveBeenCalled();
    });
  });
});
