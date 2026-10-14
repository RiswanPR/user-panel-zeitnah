import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGO_URI =
  process.env.MONGO_URL ||
  'mongodb://localhost:27017/zeitnah-lms';
const DB_NAME = process.env.MONGO_DB_NAME || 'zeitnah-lms';

export interface RoleAuditMetrics {
  totalUsers: number;
  canonicalDistribution: Record<string, number>;
  legacyIdentityCount: number;
  malformedOrMissingPrimaryRoleCount: number;
  roleAlignmentConflictsCount: number;
  adminAccountsCount: number;
  educatorAccountsCount: number;
  mentorshipCapabilityCount: number;
  mentorshipByPrimaryRole: Record<string, number>;
  totalOrganizations: number;
  totalActiveMemberships: number;
  activeOwnerMemberships: number;
  unownedOrganizationsCount: number;
  confirmedOwnerlessCount: number;
  collectionMismatchCount: number;
}

export async function runRoleVerification(): Promise<RoleAuditMetrics> {
  console.log('\n========================================================');
  console.log('       ZEITNAH LMS — ROLE STANDARDIZATION AUDIT        ');
  console.log('========================================================');
  console.log(`Database: ${DB_NAME}`);
  console.log('Mode    : READ-ONLY Verification (Privacy Redacted)\n');

  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const users = db.collection('users');
    const orgs = db.collection('organizations');
    const memberships = db.collection('organization_memberships');

    const totalUsers = await users.countDocuments();

    // 1. Role Distribution Summary
    const distribution = await users
      .aggregate([
        {
          $group: {
            _id: { primaryRole: '$primaryRole', role: '$role' },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.primaryRole': 1, '_id.role': 1 } },
      ])
      .toArray();

    const canonicalDistribution: Record<string, number> = {};
    console.log('1. User Role Distribution:');
    if (distribution.length === 0) {
      console.log('   (No user records found)');
    } else {
      for (const d of distribution) {
        const key = `primaryRole: ${d._id.primaryRole || 'MISSING'} | role: ${d._id.role || 'MISSING'}`;
        canonicalDistribution[key] = d.count;
        console.log(`   - ${key} -> ${d.count} user(s)`);
      }
    }

    // 2. Legacy Identity Scan (FOUNDER, MENTOR)
    const legacyIdentityCount = await users.countDocuments({
      $or: [
        { primaryRole: { $regex: /^founder$/i } },
        { primaryRole: { $regex: /^mentor$/i } },
        { role: { $regex: /^founder$/i } },
        { role: { $regex: /^mentor$/i } },
      ],
    });

    console.log(`\n2. Legacy Roles Remaining (FOUNDER / MENTOR): ${legacyIdentityCount}`);

    // 3. Malformed or Missing primaryRole Scan
    const malformedOrMissingPrimaryRoleCount = await users.countDocuments({
      $or: [
        { primaryRole: { $exists: false } },
        { primaryRole: null },
        { primaryRole: '' },
        {
          primaryRole: {
            $nin: [
              'STUDENT',
              'PROFESSIONAL',
              'RECRUITER',
              'EDUCATOR',
              'ADMIN',
            ],
          },
        },
      ],
    });

    console.log(
      `3. Missing or Malformed primaryRole Records: ${malformedOrMissingPrimaryRoleCount}`,
    );

    // 4. Role Alignment Conflicts Scan
    const roleAlignmentConflictsCount = await users.countDocuments({
      $or: [
        { role: 'admin', primaryRole: { $ne: 'ADMIN' } },
        { primaryRole: 'ADMIN', role: { $ne: 'admin' } },
        { role: 'educator', primaryRole: { $ne: 'EDUCATOR' } },
        { role: 'founder', primaryRole: { $nin: ['RECRUITER', 'FOUNDER'] } },
      ],
    });

    console.log(`4. Role Alignment Conflicts: ${roleAlignmentConflictsCount}`);

    // 5. System Administration and Educator Preservation
    const adminAccountsCount = await users.countDocuments({
      $or: [{ role: 'admin' }, { primaryRole: 'ADMIN' }],
    });
    const educatorAccountsCount = await users.countDocuments({
      primaryRole: 'EDUCATOR',
    });

    console.log(`5. Privileged & Admin Accounts:`);
    console.log(`   - Verified Administrator Accounts: ${adminAccountsCount}`);
    console.log(`   - Admin-Assigned Educator Accounts: ${educatorAccountsCount}`);

    // 6. Mentorship Capability & Availability Scan
    const mentorshipCapabilityCount = await users.countDocuments({
      $or: [
        { 'mentorship.isAvailableForMentorship': true },
        { 'mentorship.topics.0': { $exists: true } },
        { availability: 'AVAILABLE_FOR_MENTORSHIP' },
      ],
    });

    const mentorshipAggregation = await users
      .aggregate([
        {
          $match: {
            $or: [
              { 'mentorship.isAvailableForMentorship': true },
              { 'mentorship.topics.0': { $exists: true } },
              { availability: 'AVAILABLE_FOR_MENTORSHIP' },
            ],
          },
        },
        {
          $group: {
            _id: '$primaryRole',
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();

    const mentorshipByPrimaryRole: Record<string, number> = {};
    for (const item of mentorshipAggregation) {
      mentorshipByPrimaryRole[item._id || 'MISSING'] = item.count;
    }

    console.log(`\n6. Mentorship Capability & Preferences:`);
    console.log(
      `   - Total Users with Active Mentorship Capability: ${mentorshipCapabilityCount}`,
    );
    for (const [role, count] of Object.entries(mentorshipByPrimaryRole)) {
      console.log(`     * primaryRole "${role}": ${count} mentor(s)`);
    }

    // 7. Organization Ownership Integrity Scan
    const totalOrganizations = await orgs.countDocuments();
    const standardActiveMemberships = await memberships.countDocuments({
      status: 'ACTIVE',
    });
    const standardOwnerMemberships = await memberships.countDocuments({
      role: 'OWNER',
      status: 'ACTIVE',
    });

    const legacyMembershipsCol = db.collection('organizationmemberships');
    const legacyActiveMemberships = await legacyMembershipsCol.countDocuments({
      status: 'ACTIVE',
    });
    const legacyOwnerMemberships = await legacyMembershipsCol.countDocuments({
      role: 'OWNER',
      status: 'ACTIVE',
    });

    const totalActiveMemberships =
      standardActiveMemberships + legacyActiveMemberships;
    const activeOwnerMemberships =
      standardOwnerMemberships + legacyOwnerMemberships;

    // Check for any unowned organizations across both collections
    const ownershipAnalysis = await orgs
      .aggregate([
        {
          $lookup: {
            from: 'organization_memberships',
            let: { orgId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$organizationId', '$$orgId'] },
                      { $eq: ['$role', 'OWNER'] },
                      { $eq: ['$status', 'ACTIVE'] },
                    ],
                  },
                },
              },
            ],
            as: 'standardOwners',
          },
        },
        {
          $lookup: {
            from: 'organizationmemberships',
            let: { orgId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$organizationId', '$$orgId'] },
                      { $eq: ['$role', 'OWNER'] },
                      { $eq: ['$status', 'ACTIVE'] },
                    ],
                  },
                },
              },
            ],
            as: 'legacyOwners',
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            hasStandardOwner: { $gt: [{ $size: '$standardOwners' }, 0] },
            hasLegacyOwner: { $gt: [{ $size: '$legacyOwners' }, 0] },
          },
        },
      ])
      .toArray();

    const confirmedOwnerlessOrgs = ownershipAnalysis.filter(
      (o: any) => !o.hasStandardOwner && !o.hasLegacyOwner,
    );
    const collectionMismatchOrgs = ownershipAnalysis.filter(
      (o: any) => !o.hasStandardOwner && o.hasLegacyOwner,
    );

    console.log(`\n7. Organization Ownership & Membership Integrity:`);
    console.log(`   - Total Organizations          : ${totalOrganizations}`);
    console.log(`   - Active Memberships (Standard): ${standardActiveMemberships} (collection: organization_memberships)`);
    console.log(`   - Active Memberships (Legacy)  : ${legacyActiveMemberships} (collection: organizationmemberships)`);
    console.log(`   - Total Active OWNER Members   : ${activeOwnerMemberships}`);
    console.log(
      `   - Confirmed Ownerless Orgs     : ${confirmedOwnerlessOrgs.length} (Target: 0)`,
    );
    console.log(
      `   - Collection-Query Mismatches  : ${collectionMismatchOrgs.length}`,
    );

    if (confirmedOwnerlessOrgs.length > 0) {
      console.log(
        `   🚨 CRITICAL: ${confirmedOwnerlessOrgs.length} organization(s) are CONFIRMED OWNERLESS across all collections!`,
      );
    }
    if (collectionMismatchOrgs.length > 0) {
      console.log(
        `   ⚠️ NOTICE: ${collectionMismatchOrgs.length} organization(s) have valid owners in legacy "organizationmemberships" but are missing from standard "organization_memberships".`,
      );
      console.log(
        `      Classification: COLLECTION-QUERY MISMATCH (Not a truly ownerless organization).`,
      );
      console.log(
        `      A safe, non-destructive consolidation copy to "organization_memberships" is recommended before live operations.`,
      );
    }

    console.log('\n========================================================\n');

    return {
      totalUsers,
      canonicalDistribution,
      legacyIdentityCount,
      malformedOrMissingPrimaryRoleCount,
      roleAlignmentConflictsCount,
      adminAccountsCount,
      educatorAccountsCount,
      mentorshipCapabilityCount,
      mentorshipByPrimaryRole,
      totalOrganizations,
      totalActiveMemberships,
      activeOwnerMemberships,
      unownedOrganizationsCount: confirmedOwnerlessOrgs.length,
      confirmedOwnerlessCount: confirmedOwnerlessOrgs.length,
      collectionMismatchCount: collectionMismatchOrgs.length,
    };
  } finally {
    await client.close();
  }
}

if (require.main === module) {
  runRoleVerification().catch((err) => {
    console.error('Fatal Verification Error:', err);
    process.exit(1);
  });
}
