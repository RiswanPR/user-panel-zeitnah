const mongoose = require('mongoose');

async function checkDb() {
  await mongoose.connect('mongodb+srv://developer:fM79L4L1Z26mN7wY@cluster0.pud4l.mongodb.net/zeitnahlms_final_db?retryWrites=true&w=majority');
  
  const db = mongoose.connection.db;
  
  const courses = await db.collection('courses').find({}).limit(1).toArray();
  console.log('--- COURSES ---');
  courses.forEach(c => console.log(`ID: ${c._id}, coverImage: ${c.coverImage}, image: ${c.image}, thumbnail: ${c.thumbnail}`));
  
  const chapters = await db.collection('chapters').find({}).limit(1).toArray();
  console.log('\n--- CHAPTERS ---');
  chapters.forEach(c => console.log(`ID: ${c._id}, coverImage: ${c.coverImage}, thumbnail: ${c.thumbnail}`));
  
  const classes = await db.collection('classes').find({}).limit(1).toArray();
  console.log('\n--- CLASSES ---');
  classes.forEach(c => console.log(`ID: ${c._id}, coverImage: ${c.coverImage}, thumbnailUrl: ${c.thumbnailUrl}, videoThumbnail: ${c.videoThumbnail}`));

  mongoose.disconnect();
}

checkDb().catch(console.error);
