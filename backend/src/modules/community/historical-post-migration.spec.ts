import * as fs from 'fs';
import * as path from 'path';
import {
  validateTargetOrganization,
  discoverAndPreviewCandidates,
  executeControlledMigration,
  executeRollback,
  TargetOrgConfig,
} from './historical-post-migration.lib';

describe('Historical Business Post Migration — Safety & Reversibility Test Suite', () => {
  const targetOrgConfig: TargetOrgConfig = {
    id: '6abf302319a9558d3cb251db',
    name: 'Zeitnah academy',
    slug: 'zeitnah-academy',
  };

  const founderId = '6a46de6a0d6e9bee9cbcc626';

  let mockDb: any;
  let mockPosts: any[];
  let mockOrgs: any[];
  let mockUsers: any[];
  const testTmpDir = path.resolve(__dirname, '../../../test-tmp-backups');

  beforeEach(() => {
    mockOrgs = [
      {
        _id: targetOrgConfig.id,
        name: 'Zeitnah academy',
        slug: 'zeitnah-academy',
        status: 'APPROVED',
        verificationStatus: 'VERIFIED',
        visibility: 'PUBLIC',
        createdBy: founderId,
      },
      {
        _id: 'other-org-id',
        name: 'Other Org',
        status: 'PENDING',
      },
    ];

    mockUsers = [
      {
        _id: founderId,
        name: 'Riyas Ali PJ',
        role: 'recruiter',
      },
      {
        _id: 'random-student-id',
        name: 'Student User',
        role: 'student',
      },
    ];

    mockPosts = [
      {
        _id: 'post-qs-intake',
        authorId: founderId,
        content:
          '🚨 OCTOBER QS BATCH INTAKE Build your career in Quantity Surveying with Zeitnah.',
        isDeleted: false,
        audience: 'PUBLIC',
        type: 'VIDEO',
        createdAt: new Date('2026-10-05T17:15:59.000Z'),
      },
      {
        _id: 'post-land-survey',
        authorId: founderId,
        content:
          'Diploma in land surveying Modern equipment- DGPS, TOTAL STATION',
        isDeleted: false,
        audience: 'PUBLIC',
        type: 'IMAGE',
        createdAt: new Date('2026-10-05T05:39:30.000Z'),
      },
      {
        _id: 'post-deleted',
        authorId: founderId,
        content: 'Old deleted course announcement',
        isDeleted: true,
        audience: 'PUBLIC',
        type: 'TEXT',
      },
      {
        _id: 'post-already-org',
        authorId: founderId,
        organizationId: 'existing-org-id',
        content: 'Already assigned post',
        isDeleted: false,
        audience: 'PUBLIC',
        type: 'TEXT',
      },
      {
        _id: 'post-other-author',
        authorId: 'random-student-id',
        content: 'Student personal post',
        isDeleted: false,
        audience: 'PUBLIC',
        type: 'TEXT',
      },
      {
        _id: 'post-congrats',
        authorId: founderId,
        content: 'Congrats jibin✨👏',
        isDeleted: false,
        audience: 'PUBLIC',
        type: 'IMAGE',
      },
    ];

    mockDb = {
      collection: (name: string) => {
        if (name === 'organizations') {
          return {
            findOne: jest.fn(async (query: any) => {
              if (query._id) {
                return (
                  mockOrgs.find((o) => String(o._id) === String(query._id)) ||
                  null
                );
              }
              if (query.$or) {
                for (const condition of query.$or) {
                  const found = mockOrgs.find(
                    (o) => String(o._id) === String(condition._id),
                  );
                  if (found) return found;
                }
              }
              return null;
            }),
          };
        }
        if (name === 'users') {
          return {
            findOne: jest.fn(async (query: any) => {
              return (
                mockUsers.find(
                  (u) =>
                    String(u._id) === String(query._id) ||
                    (query.$or &&
                      query.$or.some(
                        (c: any) => String(c._id) === String(u._id),
                      )),
                ) || null
              );
            }),
          };
        }
        if (name === 'community_posts') {
          return {
            find: (query: any) => ({
              sort: () => ({
                toArray: async () => {
                  let list = [...mockPosts];
                  if (query.isDeleted === false) {
                    list = list.filter((p) => p.isDeleted === false);
                  }
                  return list;
                },
              }),
            }),
            findOne: jest.fn(async (query: any) => {
              return (
                mockPosts.find((p) => String(p._id) === String(query._id)) ||
                null
              );
            }),
            updateOne: jest.fn(async (filter: any, update: any) => {
              const post = mockPosts.find(
                (p) => String(p._id) === String(filter._id),
              );
              if (!post) return { matchedCount: 0, modifiedCount: 0 };
              if (
                filter.isDeleted !== undefined &&
                post.isDeleted !== filter.isDeleted
              ) {
                return { matchedCount: 0, modifiedCount: 0 };
              }
              if (
                filter.organizationId !== undefined &&
                post.organizationId !== filter.organizationId
              ) {
                return { matchedCount: 0, modifiedCount: 0 };
              }
              if (update.$set) {
                Object.assign(post, update.$set);
              }
              if (update.$unset) {
                for (const k of Object.keys(update.$unset)) {
                  delete post[k];
                }
              }
              return { matchedCount: 1, modifiedCount: 1 };
            }),
          };
        }
        throw new Error(`Unexpected collection: ${name}`);
      },
    };

    if (fs.existsSync(testTmpDir)) {
      fs.rmSync(testTmpDir, { recursive: true, force: true });
    }
  });

  afterAll(() => {
    if (fs.existsSync(testTmpDir)) {
      fs.rmSync(testTmpDir, { recursive: true, force: true });
    }
  });

  describe('1. Organization Validation Safeguards', () => {
    it('succeeds for valid APPROVED organization', async () => {
      const org = await validateTargetOrganization(mockDb, targetOrgConfig);
      expect(org._id).toBe(targetOrgConfig.id);
      expect(org.status).toBe('APPROVED');
    });

    it('rejects if organization does not exist', async () => {
      await expect(
        validateTargetOrganization(mockDb, {
          ...targetOrgConfig,
          id: 'non-existent-id',
        }),
      ).rejects.toThrow('Target organization not found');
    });

    it('rejects if organization name does not match', async () => {
      await expect(
        validateTargetOrganization(mockDb, {
          ...targetOrgConfig,
          name: 'Wrong Academy',
        }),
      ).rejects.toThrow('Organization name mismatch');
    });

    it('rejects if organization is not APPROVED', async () => {
      await expect(
        validateTargetOrganization(mockDb, {
          id: 'other-org-id',
          name: 'Other Org',
        }),
      ).rejects.toThrow('not APPROVED');
    });
  });

  describe('2. Read-Only Discovery and Preview', () => {
    it('correctly classifies eligible course posts vs personal/excluded posts', async () => {
      const preview = await discoverAndPreviewCandidates(
        mockDb,
        targetOrgConfig,
      );

      expect(preview.eligibleCount).toBe(2);
      expect(preview.eligiblePostIds).toEqual([
        'post-qs-intake',
        'post-land-survey',
      ]);

      const congratsPost = preview.candidates.find(
        (c) => c.id === 'post-congrats',
      );
      expect(congratsPost?.isEligible).toBe(false);
      expect(congratsPost?.exclusionReason).toContain(
        'Personal congratulatory shoutout',
      );

      const otherAuthorPost = preview.candidates.find(
        (c) => c.id === 'post-other-author',
      );
      expect(otherAuthorPost?.isEligible).toBe(false);
      expect(otherAuthorPost?.exclusionReason).toContain(
        'does not match target organization owner',
      );

      const alreadyOrgPost = preview.candidates.find(
        (c) => c.id === 'post-already-org',
      );
      expect(alreadyOrgPost?.isEligible).toBe(false);
      expect(alreadyOrgPost?.exclusionReason).toContain(
        'already assigned to organizationId',
      );
    });
  });

  describe('3. Execution Safeguards & Dry-Run Guarantees', () => {
    it('refuses to write when dryRun is true', async () => {
      const result = await executeControlledMigration(mockDb, {
        dryRun: true,
        targetOrg: targetOrgConfig,
        approvedPostIds: ['post-qs-intake'],
      });

      expect(result.dryRun).toBe(true);
      expect(result.successfulCount).toBe(1);

      // Verify no write occurred in mockDb
      const post = mockPosts.find((p) => p._id === 'post-qs-intake');
      expect(post.organizationId).toBeUndefined();
    });

    it('rejects empty allowlist and throws error', async () => {
      await expect(
        executeControlledMigration(mockDb, {
          dryRun: false,
          targetOrg: targetOrgConfig,
          approvedPostIds: [],
        }),
      ).rejects.toThrow('No post IDs in approved allowlist');
    });

    it('rejects unapproved post IDs not present in DB', async () => {
      await expect(
        executeControlledMigration(mockDb, {
          dryRun: false,
          targetOrg: targetOrgConfig,
          approvedPostIds: ['non-existent-post'],
        }),
      ).rejects.toThrow(
        'Prevalidation failed: Post ID non-existent-post not found',
      );
    });

    it('rejects soft-deleted posts during prevalidation', async () => {
      await expect(
        executeControlledMigration(mockDb, {
          dryRun: false,
          targetOrg: targetOrgConfig,
          approvedPostIds: ['post-deleted'],
        }),
      ).rejects.toThrow('is soft-deleted');
    });

    it('rejects posts with existing organizationId during prevalidation', async () => {
      await expect(
        executeControlledMigration(mockDb, {
          dryRun: false,
          targetOrg: targetOrgConfig,
          approvedPostIds: ['post-already-org'],
        }),
      ).rejects.toThrow('already has organizationId');
    });

    it('rejects posts if author does not match organization owner', async () => {
      await expect(
        executeControlledMigration(mockDb, {
          dryRun: false,
          targetOrg: targetOrgConfig,
          approvedPostIds: ['post-other-author'],
        }),
      ).rejects.toThrow('does not match expected owner');
    });
  });

  describe('4. Full Migration Execution & Field Integrity Preservation', () => {
    it('creates backup, verifies sha256 checksum, updates organizationId, and preserves all other fields', async () => {
      const backupDir = path.join(testTmpDir, 'backups');
      const journalDir = path.join(testTmpDir, 'journals');

      const originalPost = {
        ...mockPosts.find((p) => p._id === 'post-qs-intake'),
      };

      const result = await executeControlledMigration(mockDb, {
        dryRun: false,
        targetOrg: targetOrgConfig,
        approvedPostIds: ['post-qs-intake', 'post-land-survey'],
        backupDir,
        journalDir,
      });

      expect(result.successfulCount).toBe(2);
      expect(result.failedCount).toBe(0);
      expect(result.backupFile).toBeDefined();
      expect(fs.existsSync(result.backupFile)).toBe(true);

      // Verify backup contents
      const backupContent = JSON.parse(
        fs.readFileSync(result.backupFile, 'utf8'),
      );
      expect(backupContent.documentCount).toBe(2);
      expect(backupContent.documents[0]._id).toBe('post-qs-intake');

      // Verify post fields in DB: organizationId is updated, but authorId, content, etc. are untouched
      const postAfter = mockPosts.find((p) => p._id === 'post-qs-intake');
      expect(postAfter.organizationId).toBe(targetOrgConfig.id);
      expect(postAfter.authorId).toBe(originalPost.authorId);
      expect(postAfter.content).toBe(originalPost.content);
      expect(postAfter.audience).toBe(originalPost.audience);
      expect(postAfter.type).toBe(originalPost.type);
      expect(postAfter.isDeleted).toBe(false);
      expect(postAfter.createdAt).toEqual(originalPost.createdAt);
    });
  });

  describe('5. Rollback Procedure Verification', () => {
    it('restores original state from backup cleanly when rollback is executed', async () => {
      const backupDir = path.join(testTmpDir, 'backups');
      const journalDir = path.join(testTmpDir, 'journals');

      // First run migration
      const result = await executeControlledMigration(mockDb, {
        dryRun: false,
        targetOrg: targetOrgConfig,
        approvedPostIds: ['post-qs-intake'],
        backupDir,
        journalDir,
      });

      const postAfterMigration = mockPosts.find(
        (p) => p._id === 'post-qs-intake',
      );
      expect(postAfterMigration.organizationId).toBe(targetOrgConfig.id);

      // Now execute rollback
      const rollbackResult = await executeRollback(
        mockDb,
        result.backupFile,
        false,
      );
      expect(rollbackResult.attempted).toBe(1);
      expect(rollbackResult.restored).toBe(1);
      expect(rollbackResult.failed).toBe(0);

      // Verify organizationId has been restored (unset)
      const postAfterRollback = mockPosts.find(
        (p) => p._id === 'post-qs-intake',
      );
      expect(postAfterRollback.organizationId).toBeUndefined();
    });

    it('skips rollback if post was reassigned or changed since migration', async () => {
      const backupDir = path.join(testTmpDir, 'backups');
      const journalDir = path.join(testTmpDir, 'journals');

      const result = await executeControlledMigration(mockDb, {
        dryRun: false,
        targetOrg: targetOrgConfig,
        approvedPostIds: ['post-qs-intake'],
        backupDir,
        journalDir,
      });

      // Simulate external reassignment to a different company
      const post = mockPosts.find((p) => p._id === 'post-qs-intake');
      post.organizationId = 'reassigned-org-id';

      const rollbackResult = await executeRollback(
        mockDb,
        result.backupFile,
        false,
      );
      expect(rollbackResult.failed).toBe(1);
      expect(rollbackResult.restored).toBe(0);
      expect(rollbackResult.errors[0]).toContain(
        'organizationId has changed since migration',
      );
    });
  });
});
