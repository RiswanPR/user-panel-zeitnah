const mongoose = require('mongoose');

async function check() {
  try {
    await mongoose.connect('mongodb://localhost:27017/zeitnah-lms');
    console.log('Connected to MongoDB');
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections in zeitnah-lms:');
    collections.forEach(c => console.log(' -', c.name));
    
    const keyCollections = [
      'learning_spaces',
      'learning_space_members',
      'network_communities',
      'network_community_memberships',
      'network_community_discussions',
      'network_community_replies',
      'network_community_announcements',
      'network_community_resources',
      'platform_announcements',
      'notifications',
      'notification_preferences',
      'network_connections',
      'network_activities',
      'organizations',
      'organization_memberships',
      'opportunities',
      'moderation_blocks',
      'moderation_reports',
      'network_community_reports',
      'community_groups',
      'community_posts',
      'announcements',
      'users',
      'teachers',
      'courses'
    ];

    console.log('\nDocument counts:');
    for (const name of keyCollections) {
      const exists = collections.find(c => c.name === name);
      if (exists) {
        const count = await mongoose.connection.db.collection(name).countDocuments();
        console.log(` - ${name}: ${count}`);
      } else {
        console.log(` - ${name}: NOT FOUND`);
      }
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

check();
