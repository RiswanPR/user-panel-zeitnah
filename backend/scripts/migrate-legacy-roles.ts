import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGO_URI =
  process.env.MONGO_URL ||
  'mongodb://localhost:27017/zeitnah-lms';
const DB_NAME = process.env.MONGO_DB_NAME || 'zeitnah-lms';

const hasExplicitLive = process.argv.includes('--live');
const hasExplicitDryRun = process.argv.includes('--dry-run');
const isDryRun = !hasExplicitLive || hasExplicitDryRun;

interface RoleMigrationPlan {
  userId: any;
  email: string;
  username?: string;
  currentRole: string;
  targetRole: string;
  currentPrimaryRole: string;
  targetPrimaryRole: string;
}

export function planUserRoleMigration(user: any): RoleMigrationPlan | null {
  const currentRole = String(user.role || '').trim().toLowerCase();
  const currentPrimaryRole = String(user.primaryRole || '').trim().toUpperCase();

  let targetRole = currentRole;
  let targetPrimaryRole = currentPrimaryRole;

  // 1. Normalize legacy role aliases
  if (currentRole === 'educator') {
    targetRole = 'teacher';
    if (!targetPrimaryRole || targetPrimaryRole === 'STUDENT') {
      targetPrimaryRole = 'EDUCATOR';
    }
  } else if (currentRole === 'professional') {
    targetRole = 'student';
    if (!targetPrimaryRole || targetPrimaryRole === 'STUDENT') {
      targetPrimaryRole = 'PROFESSIONAL';
    }
  } else if (currentRole === 'mentor') {
    targetRole = 'student';
    if (!targetPrimaryRole || targetPrimaryRole === 'STUDENT') {
      targetPrimaryRole = 'MENTOR';
    }
  } else if (currentRole === 'founder') {
    targetRole = 'recruiter';
    if (!targetPrimaryRole || targetPrimaryRole === 'STUDENT') {
      targetPrimaryRole = 'FOUNDER';
    }
  }

  // 2. Ensure primaryRole is set if missing
  if (!targetPrimaryRole) {
    if (targetRole === 'teacher') targetPrimaryRole = 'EDUCATOR';
    else if (targetRole === 'recruiter') targetPrimaryRole = 'RECRUITER';
    else if (targetRole === 'admin' || targetRole === 'superuser') targetPrimaryRole = 'ADMIN';
    else targetPrimaryRole = 'STUDENT';
  }

  if (targetRole !== currentRole || targetPrimaryRole !== currentPrimaryRole) {
    return {
      userId: user._id,
      email: user.email || 'no-email',
      username: user.username,
      currentRole,
      targetRole,
      currentPrimaryRole,
      targetPrimaryRole,
    };
  }

  return null;
}

async function runRoleMigration() {
  console.log('\n========================================================');
  console.log('       ZEITNAH LMS — ROLE CONTRACT MIGRATION           ');
  console.log('========================================================');
  console.log(`Target Database: ${DB_NAME}`);
  console.log(`Execution Mode : ${isDryRun ? 'DRY-RUN (Simulated, No Writes)' : 'LIVE EXECUTION'}`);
  if (isDryRun && !hasExplicitDryRun) {
    console.log('SAFETY NOTICE  : Defaulting to safe DRY-RUN. Pass --live to commit changes.');
  }
  console.log('Connecting to MongoDB...\n');

  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const usersCollection = db.collection('users');

    const totalUsers = await usersCollection.countDocuments();
    const allUsers = await usersCollection
      .find(
        {},
        {
          projection: {
            _id: 1,
            email: 1,
            username: 1,
            role: 1,
            primaryRole: 1,
          },
        },
      )
      .toArray();

    console.log(`Scanned ${totalUsers} total user records in database.`);

    const plannedMigrations: RoleMigrationPlan[] = [];

    for (const user of allUsers) {
      const plan = planUserRoleMigration(user);
      if (plan) {
        plannedMigrations.push(plan);
      }
    }

    console.log(`Found ${plannedMigrations.length} accounts needing role normalization.\n`);

    if (plannedMigrations.length > 0) {
      console.log('Planned Modifications:');
      for (const plan of plannedMigrations) {
        console.log(
          `  - User: ${plan.email} (@${plan.username || 'unknown'}) | role: "${plan.currentRole}" -> "${plan.targetRole}" | primaryRole: "${plan.currentPrimaryRole}" -> "${plan.targetPrimaryRole}"`,
        );
      }
    }

    if (!isDryRun && plannedMigrations.length > 0) {
      console.log('\nApplying updates to MongoDB...');
      let updatedCount = 0;
      for (const plan of plannedMigrations) {
        const updateDoc: any = {};
        if (plan.targetRole !== plan.currentRole) {
          updateDoc.role = plan.targetRole;
        }
        if (plan.targetPrimaryRole !== plan.currentPrimaryRole) {
          updateDoc.primaryRole = plan.targetPrimaryRole;
        }

        const res = await usersCollection.updateOne(
          { _id: plan.userId },
          { $set: updateDoc },
        );
        if (res.modifiedCount > 0) {
          updatedCount++;
        }
      }
      console.log(`✓ Successfully updated ${updatedCount} records.`);
    } else if (isDryRun && plannedMigrations.length > 0) {
      console.log('\n[DRY RUN] No changes were written. Rerun with --live to apply.');
    } else {
      console.log('\nAll user records are already compliant with the role contract.');
    }

    console.log('========================================================\n');
  } finally {
    await client.close();
  }
}

if (require.main === module) {
  runRoleMigration().catch((err) => {
    console.error('Fatal Role Migration Error:', err);
    process.exit(1);
  });
}
