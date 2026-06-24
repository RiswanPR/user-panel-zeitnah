const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');
const { CoursesService } = require('./dist/modules/courses/courses.service');

async function test() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const coursesService = app.get(CoursesService);
  
  // classId from user JSON, userId doesn't matter much if we bypass JWT guard, wait getSecureVideoPlayback checks purchased!
  try {
    const res = await coursesService.getSecureVideoPlayback('6a3720b27388d6a6360ddca2', 'some-id');
    console.log(res);
  } catch(e) {
    console.log(e);
  }
  process.exit();
}
test();
