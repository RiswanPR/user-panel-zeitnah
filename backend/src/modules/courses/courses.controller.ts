import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { CoursesService } from './courses.service';

import { GetCoursesDto } from './dto/get-courses.dto';

import { UpdateClassProgressDto } from './dto/update-class-progress.dto';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('courses')
export class CoursesController {
  constructor(
    private readonly coursesService: CoursesService,
  ) {}

  // =====================
  // ALL COURSES
  // =====================

  @Get()
  getAllCourses(
    @Query()
    query: GetCoursesDto,
  ) {
    return this.coursesService.getAllCourses(
      query,
    );
  }

  // =====================
  // MY COURSES
  // =====================

  @UseGuards(JwtAuthGuard)
  @Get('my')
  getMyCourses(
    @Req()
    req: any,
  ) {
    return this.coursesService.getMyCourses(
      req.user.userId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-learning')
  getMyLearningOverview(
    @Req()
    req: any,
  ) {
    return this.coursesService.getMyLearningOverview(
      req.user.userId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-points')
  getMyPointsOverview(
    @Req()
    req: any,
  ) {
    return this.coursesService.getMyPointsOverview(
      req.user.userId,
    );
  }

  // =====================
  // COURSE CHAPTERS
  // =====================

  @UseGuards(JwtAuthGuard)
  @Get(':courseId/chapters')
  getCourseChapters(
    @Param('courseId')
    courseId: string,

    @Req()
    req: any,
  ) {
    return this.coursesService.getCourseChapters(
      courseId,
      req.user.userId,
    );
  }

  // =====================
  // CHAPTER CLASSES
  // =====================

  @UseGuards(JwtAuthGuard)
  @Get(
    ':courseId/chapters/:chapterCode/classes',
  )
  getChapterClasses(
    @Param('courseId')
    courseId: string,

    @Param('chapterCode')
    chapterCode: string,

    @Req()
    req: any,
  ) {
    return this.coursesService.getChapterClasses(
      courseId,
      chapterCode,
      req.user.userId,
    );
  }

  // =====================
  // CLASS VIEWER
  // =====================

  @UseGuards(JwtAuthGuard)
  @Get('class/:classId')
  getClassView(
    @Param('classId')
    classId: string,

    @Req()
    req: any,
  ) {
    return this.coursesService.getClassView(
      classId,
      req.user.userId,
    );
  }

  // =====================
  // UPDATE PROGRESS
  // =====================

  @UseGuards(JwtAuthGuard)
  @Post('class/:classId/progress')
  updateClassProgress(
    @Param('classId')
    classId: string,

    @Body()
    body: UpdateClassProgressDto,

    @Req()
    req: any,
  ) {
    return this.coursesService.updateClassProgress(
      classId,
      req.user.userId,
      body,
    );
  }

  // =====================
  // START STREAM
  // =====================

  @UseGuards(JwtAuthGuard)
  @Post('start-stream')
  startStream(
    @Body()
    body: any,

    @Req()
    req: any,
  ) {
    return this.coursesService.startStream(
      req.user.userId,
      body.classId,
      body.deviceId,
    );
  }

  // =====================
  // HEARTBEAT
  // =====================

  @UseGuards(JwtAuthGuard)
  @Post('heartbeat')
  heartbeat(
    @Body()
    body: any,

    @Req()
    req: any,
  ) {
    return this.coursesService.heartbeat(
      req.user.userId,
      body.deviceId,
    );
  }

  // =====================
  // STOP STREAM
  // =====================

  @UseGuards(JwtAuthGuard)
  @Post('stop-stream')
  stopStream(
    @Body()
    body: any,

    @Req()
    req: any,
  ) {
    return this.coursesService.stopStream(
      req.user.userId,
      body.deviceId,
    );
  }

  // =====================
  // COURSE DETAILS
  // =====================

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  getCourseById(
    @Param('id')
    id: string,

    @Req()
    req: any,
  ) {
    return this.coursesService.getCourseById(
      id,
      req.user.userId,
    );
  }
}
