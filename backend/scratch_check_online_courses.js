const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb+srv://admin:Admin123@cluster0.0y7eb24.mongodb.net/lms?retryWrites=true&w=majority&appName=Cluster0');
  
  const Course = mongoose.model('Course', new mongoose.Schema({}, { strict: false }));
  const onlineCourses = await Course.find({ type: 'online' }).lean();
  
  for (const course of onlineCourses) {
    console.log(`Course: ${course.name} (type: ${course.type})`);
    if (course.chapters) {
      for (const chapter of course.chapters) {
        if (chapter.classes) {
          for (const cls of chapter.classes) {
            console.log(`  Class: ${cls.title}`);
            console.log(`    videoId: ${cls.videoId}`);
            console.log(`    videoUrl: ${cls.videoUrl}`);
            console.log(`    videoSource: ${cls.videoSource}`);
          }
        }
      }
    }
  }
  process.exit();
}
run();
