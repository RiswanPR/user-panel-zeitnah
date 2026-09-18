import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { RESERVED_USERNAMES } from '../src/common/constants/reserved-usernames';
import { UsernameService } from '../src/modules/profile/services/username.service';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGO_URI =
  process.env.MONGO_URL ||
  'mongodb://zeitnahadmin:Riswan123456@localhost:27017/lms-platform?authSource=admin';
const DB_NAME = process.env.MONGO_DB_NAME || 'lms-platform';

const isDryRun = process.argv.includes('--dry-run');

async function runMigration() {
  console.log('\n========================================================');
  console.log('       ZEITNAH LMS — USERNAME IDENTITY MIGRATION        ');
  console.log('========================================================');
  console.log(`Target Database: ${DB_NAME}`);
  console.log(`Execution Mode : ${isDryRun ? 'DRY-RUN (Simulated, No Writes)' : 'LIVE EXECUTION'}`);
  console.log('Connecting to MongoDB...\n');

  const client = new MongoClient(MONGO_URI);
  const usernameService = new UsernameService();

  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const usersCollection = db.collection('users');
    const communityProfilesCollection = db.collection('community_profiles');

    const totalUsers = await usersCollection.countDocuments();
    const allUsers = await usersCollection
      .find(
        {},
        {
          projection: {
            _id: 1,
            name: 1,
            email: 1,
            username: 1,
            usernameClaimed: 1,
          },
        },
      )
      .toArray();

    console.log(`Found ${totalUsers} total user records in database.`);

    // 1. Scan and track all existing usernames to detect duplicates
    const usernameOccurrences = new Map<string, number>();
    for (const u of allUsers) {
      if (u.username && typeof u.username === 'string') {
        const lower = u.username.toLowerCase().trim();
        usernameOccurrences.set(lower, (usernameOccurrences.get(lower) || 0) + 1);
      }
    }

    const takenUsernames = new Set<string>();
    let alreadyValidCount = 0;
    let legacyPlaceholderMigrated = 0;
    let missingGenerated = 0;
    let collisionResolutions = 0;
    let reservedAdjustments = 0;
    let errorsCount = 0;

    type PlannedUpdate = {
      userId: any;
      name: string;
      email: string;
      oldUsername: string;
      newUsername: string;
      claimed: boolean;
      reason: string;
    };

    const plannedUpdates: PlannedUpdate[] = [];

    // First pass: identify genuinely valid, unique, non-placeholder usernames to preserve them
    for (const u of allUsers) {
      const rawUser = (u.username || '').toLowerCase().trim();
      const occurrences = usernameOccurrences.get(rawUser) || 0;
      const isPlaceholder =
        !rawUser ||
        rawUser === 'username' ||
        rawUser === 'null' ||
        rawUser === 'undefined' ||
        /^user_[a-f0-9]{8}$/i.test(rawUser);
      const isReserved = RESERVED_USERNAMES.has(rawUser);
      const validation = usernameService.validate(rawUser);

      if (!isPlaceholder && !isReserved && validation.valid && occurrences === 1) {
        // Valid, unique, preserve it!
        takenUsernames.add(rawUser);
        alreadyValidCount++;
      }
    }

    // Second pass: generate readable candidates for all accounts needing migration
    for (const u of allUsers) {
      const rawUser = (u.username || '').toLowerCase().trim();
      const occurrences = usernameOccurrences.get(rawUser) || 0;
      const isPlaceholder =
        !rawUser ||
        rawUser === 'username' ||
        rawUser === 'null' ||
        rawUser === 'undefined' ||
        /^user_[a-f0-9]{8}$/i.test(rawUser);
      const isReserved = RESERVED_USERNAMES.has(rawUser);
      const validation = usernameService.validate(rawUser);

      // If user is already valid & unique, only ensure usernameClaimed is set
      if (!isPlaceholder && !isReserved && validation.valid && occurrences === 1) {
        if (u.usernameClaimed === undefined) {
          plannedUpdates.push({
            userId: u._id,
            name: u.name || '',
            email: u.email || '',
            oldUsername: rawUser,
            newUsername: rawUser,
            claimed: true, // Existing valid usernames are marked claimed
            reason: 'Initialize usernameClaimed: true on already-valid handle',
          });
        }
        continue;
      }

      let reason = '';
      if (!rawUser) {
        reason = 'Missing username';
        missingGenerated++;
      } else if (rawUser === 'username') {
        reason = 'Legacy literal placeholder "username"';
        legacyPlaceholderMigrated++;
      } else if (isReserved) {
        reason = `Reserved username (${rawUser})`;
        reservedAdjustments++;
      } else if (occurrences > 1) {
        reason = `Duplicate username (${rawUser} appeared ${occurrences} times)`;
        collisionResolutions++;
      } else {
        reason = `Invalid format (${validation.reason || 'non-compliant'})`;
        legacyPlaceholderMigrated++;
      }

      // Generate best readable candidate
      const candidates = usernameService.generateCandidates(u.name, u.email);
      let chosen = '';
      for (const cand of candidates) {
        if (!takenUsernames.has(cand) && !RESERVED_USERNAMES.has(cand)) {
          chosen = cand;
          break;
        }
      }

      // If all candidates collide, generate guaranteed numeric suffix
      if (!chosen) {
        const base = usernameService.sanitize(u.name) || usernameService.sanitize((u.email || '').split('@')[0]) || 'student';
        const cleanBase = base.slice(0, 14);
        let counter = 1001;
        while (takenUsernames.has(`${cleanBase}${counter}`)) {
          counter++;
        }
        chosen = `${cleanBase}${counter}`;
        collisionResolutions++;
      }

      takenUsernames.add(chosen);

      plannedUpdates.push({
        userId: u._id,
        name: u.name || '',
        email: u.email || '',
        oldUsername: u.username || '(none)',
        newUsername: chosen,
        claimed: false, // Legacy users get to confirm via claim modal
        reason,
      });
    }

    // 3. Display sample planned migrations
    console.log(`\nPlanned Migrations: ${plannedUpdates.length} accounts to update.`);
    if (plannedUpdates.length > 0) {
      console.log('\nSample Updates (first 10):');
      for (const p of plannedUpdates.slice(0, 10)) {
        console.log(
          ` - User: "${p.name}" (${p.email}) | ${p.oldUsername} -> @${p.newUsername} [claimed: ${p.claimed}] | Reason: ${p.reason}`,
        );
      }
    }

    // 4. Execute writes if not dry-run
    if (!isDryRun) {
      console.log('\nApplying updates to MongoDB in batches...');
      let updatedCount = 0;

      for (const p of plannedUpdates) {
        try {
          await usersCollection.updateOne(
            { _id: p.userId },
            {
              $set: {
                username: p.newUsername,
                usernameClaimed: p.claimed,
              },
            },
          );

          // Synchronize community_profiles username if document exists
          await communityProfilesCollection.updateOne(
            { userId: String(p.userId) },
            {
              $set: {
                username: p.newUsername,
              },
            },
            { upsert: false },
          );

          updatedCount++;
        } catch (err: any) {
          console.error(`Error updating user ${p.userId} (${p.email}):`, err.message);
          errorsCount++;
        }
      }

      console.log(`Successfully updated ${updatedCount} user accounts.`);

      // 5. Create / Ensure Unique Index on username
      console.log('Ensuring unique case-insensitive index on "username"...');
      try {
        await usersCollection.createIndex(
          { username: 1 },
          {
            unique: true,
            background: true,
            collation: { locale: 'en', strength: 2 },
          },
        );
        console.log('✓ Unique case-insensitive index on users.username successfully created.');
      } catch (err: any) {
        console.error('Warning: Index creation returned:', err.message);
      }
    }

    // 6. Print Migration Statistics
    console.log('\n========================================================');
    console.log('                 MIGRATION REPORT                       ');
    console.log('========================================================');
    console.log(`Total users in database      : ${totalUsers}`);
    console.log(`Users already valid          : ${alreadyValidCount}`);
    console.log(`Legacy placeholders migrated : ${legacyPlaceholderMigrated}`);
    console.log(`Missing usernames generated  : ${missingGenerated}`);
    console.log(`Collision resolutions        : ${collisionResolutions}`);
    console.log(`Reserved-name adjustments    : ${reservedAdjustments}`);
    console.log(`Total accounts updated       : ${plannedUpdates.length}`);
    console.log(`Errors                       : ${errorsCount}`);
    console.log('========================================================\n');

    if (isDryRun) {
      console.log('Dry-run complete. Run without --dry-run to execute live changes:');
      console.log('  npm run migrate:usernames\n');
    } else {
      console.log('✓ Username migration completed successfully.\n');
    }
  } catch (err: any) {
    console.error('Fatal Migration Error:', err);
    process.exit(1);
  } finally {
    await client.close();
  }
}

runMigration().catch((err) => {
  console.error(err);
  process.exit(1);
});
