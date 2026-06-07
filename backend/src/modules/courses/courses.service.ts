import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import axios from 'axios';

import { InjectModel } from '@nestjs/mongoose';

import { Model } from 'mongoose';

import { Course, CourseDocument } from './schemas/course.schema';

import { User, UserDocument } from '../auth/schemas/user.schema';

import { GetCoursesDto } from './dto/get-courses.dto';

import { UpdateClassProgressDto } from './dto/update-class-progress.dto';
import {
  ActiveStream,
  ActiveStreamDocument,
} from './schemas/active-stream.schema';

import { BadRequestException } from '@nestjs/common';

@Injectable()
export class CoursesService {
  constructor(
    @InjectModel(Course.name)
    private courseModel: Model<CourseDocument>,

    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    @InjectModel(ActiveStream.name)
    private activeStreamModel: Model<ActiveStreamDocument>,
  ) {}

  private parseDurationToSeconds(duration: any) {
    if (duration === null || duration === undefined) {
      return 0;
    }

    if (typeof duration === 'number') {
      return duration > 0 ? Math.round(duration) : 0;
    }

    const value = String(duration).trim();

    if (!value) {
      return 0;
    }

    if (/^\d+:\d+(?::\d+)?$/.test(value)) {
      const parts = value.split(':').map(Number);

      if (parts.length === 2) {
        return parts[0] * 60 + parts[1];
      }

      if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
      }
    }

    if (/^\d+(\.\d+)?$/.test(value)) {
      return Math.round(Number.parseFloat(value));
    }

    const numeric = Number.parseFloat(value.replace(/[^0-9.]/g, ''));

    if (Number.isNaN(numeric)) {
      return 0;
    }

    if (/hour|hr/i.test(value)) {
      return Math.round(numeric * 3600);
    }

    return Math.round(numeric * 60);
  }

  private formatAverageWatchTime(
    totalPlayedSeconds: number,
    watchedClasses: number,
  ) {
    if (watchedClasses <= 0 || totalPlayedSeconds <= 0) {
      return '';
    }

    const averageSeconds = Math.max(
      1,
      Math.round(totalPlayedSeconds / watchedClasses),
    );

    if (averageSeconds < 60) {
      return `${averageSeconds} sec`;
    }

    const hours = Math.floor(averageSeconds / 3600);

    const minutes = Math.floor((averageSeconds % 3600) / 60);

    if (hours > 0) {
      return minutes > 0 ? `${hours} hr ${minutes} min` : `${hours} hr`;
    }

    return `${minutes} mins`;
  }

  private getDateKey(value = new Date()) {
    return value.toISOString().slice(0, 10);
  }

  private calculateStreak(activityDates: string[] = []) {
    if (!activityDates.length) {
      return 0;
    }

    const uniqueDates = Array.from(new Set(activityDates))
      .filter(Boolean)
      .sort()
      .reverse();

    let streak = 1;

    for (let index = 1; index < uniqueDates.length; index += 1) {
      const previous = new Date(`${uniqueDates[index - 1]}T00:00:00.000Z`);

      const current = new Date(`${uniqueDates[index]}T00:00:00.000Z`);

      const diffDays = Math.round(
        (previous.getTime() - current.getTime()) / 86400000,
      );

      if (diffDays !== 1) {
        break;
      }

      streak += 1;
    }

    return streak;
  }

  private getCourseTotalClasses(course: any) {
    return course.chapters.reduce(
      (sum: number, chapter: any) => sum + (chapter.classes?.length || 0),
      0,
    );
  }

  private summariseLearningProgress(course: any, enrollment: any) {
    const totalClasses = this.getCourseTotalClasses(course);

    const classProgress = (enrollment.classProgress || []).filter(
      (item: any) => item.classId,
    );

    const watchedClasses = classProgress.filter(
      (item: any) =>
        (item.coveredSeconds || 0) > 0 ||
        (item.watchedSeconds || 0) > 0 ||
        (item.progressPercent || 0) > 0,
    ).length;

    const totalProgressPercent = classProgress.reduce(
      (sum: number, item: any) =>
        sum + Math.min(100, item.progressPercent || 0),
      0,
    );

    const completionPercent =
      totalClasses > 0
        ? Math.min(100, Math.round(totalProgressPercent / totalClasses))
        : 0;

    const totalPlayedSeconds = classProgress.reduce(
      (sum: number, item: any) => sum + (item.watchedSeconds || 0),
      0,
    );

    const completedClasses = classProgress.filter(
      (item: any) => item.completed,
    ).length;

    return {
      totalClasses,
      watchedClasses,
      completionPercent,
      streak: this.calculateStreak(enrollment.activityDates || []),
      averageWatchTime: this.formatAverageWatchTime(
        totalPlayedSeconds,
        watchedClasses,
      ),
      certificateEligible: totalClasses > 0 && completedClasses >= totalClasses,
    };
  }

  private async getVdoCipherPlaybackData(videoId: string) {
    const secret = process.env.VDOCIPHER_API_SECRET?.trim();

    if (!secret || !videoId) {
      return null;
    }

    try {
      const { data } = await axios.post(
        `https://dev.vdocipher.com/api/videos/${encodeURIComponent(videoId)}/otp`,
        {
          ttl: 300,
        },
        {
          headers: {
            Accept: 'application/json',
            Authorization: `Apisecret ${secret}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!data?.otp || !data?.playbackInfo) {
        throw new InternalServerErrorException(
          'Invalid VdoCipher playback response',
        );
      }

      return {
        otp: data.otp,
        playbackInfo: data.playbackInfo,
      };
    } catch (error: any) {
      console.error(
        'Failed to generate VdoCipher OTP',
        error?.response?.data || error?.message || error,
      );

      return null;
    }
  }

  // ======================
  // GET ALL COURSES
  // ======================

  async getAllCourses(query: GetCoursesDto) {
    const filter: any = {};

    // SEARCH
    if (query.search) {
      filter.name = {
        $regex: query.search,

        $options: 'i',
      };
    }

    // TYPE FILTER
    if (query.type) {
      filter.type = query.type;
    }

    const courses = await this.courseModel.find(filter).sort({
      createdAt: -1,
    });

    return {
      courses,
    };
  }

  // ======================
  // MY COURSES
  // ======================

  async getMyCourses(userId: string) {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // USER COURSE IDS
    const courseIds = user.course?.map((course: any) => course.courseId) || [];

    const courses = await this.courseModel.find({
      _id: {
        $in: courseIds,
      },
    });

    // ADD PROGRESS
    const formatted = courses.map((course) => {
      const progress = user.course.find(
        (c: any) => c.courseId.toString() === course._id.toString(),
      );

      return {
        ...course.toObject(),

        learningProgress: progress?.learningProgress || null,
      };
    });

    return {
      courses: formatted,
    };
  }

  // ======================
  // COURSE DETAILS
  // ======================

  async getCourseById(id: string, userId?: string) {
    const course = await this.courseModel.findById(id);

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    let purchased = false;

    if (userId) {
      const user = await this.userModel.findById(userId);

      purchased =
        user?.course?.some((c: any) => c.courseId.toString() === id) || false;
    }

    const courseObj = course.toObject();

    // LOCK CLASSES
    if (!purchased) {
      courseObj.chapters = courseObj.chapters.map((chapter: any) => ({
        ...chapter,

        classes: chapter.classes.map((cls: any) => ({
          _id: cls._id,

          title: cls.title,

          duration: cls.duration,

          thumbnail: cls.thumbnail,

          locked: true,
        })),
      }));
    }

    return {
      purchased,

      course: courseObj,
    };
  }

  // ======================
  // COURSE CHAPTERS
  // ======================

  async getCourseChapters(courseId: string, userId?: string) {
    const course = await this.courseModel.findById(courseId);

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    let purchased = false;

    // CHECK PURCHASE
    if (userId) {
      const user = await this.userModel.findById(userId);

      purchased =
        user?.course?.some((c: any) => c.courseId.toString() === courseId) ||
        false;
    }

    const chapters = course.chapters.map((chapter: any) => ({
      ...chapter.toObject(),

      totalClasses: chapter.classes?.length || 0,

      locked: !purchased,
    }));

    return {
      purchased,

      course: {
        _id: course._id,

        name: course.name,

        image: course.image,

        type: course.type,

        description: course.description,
      },

      chapters,
    };
  }

  // ======================
  // CHAPTER CLASSES
  // ======================

  async getChapterClasses(
    courseId: string,
    chapterCode: string,
    userId?: string,
  ) {
    const course = await this.courseModel.findById(courseId);

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // FIND CHAPTER
    const chapter = course.chapters.find(
      (c: any) => c.uniqueCode === chapterCode,
    );

    if (!chapter) {
      throw new NotFoundException('Chapter not found');
    }

    let purchased = false;

    // CHECK PURCHASE
    if (userId) {
      const user = await this.userModel.findById(userId);

      purchased =
        user?.course?.some((c: any) => c.courseId.toString() === courseId) ||
        false;
    }

    // LOCK LOGIC
    const classes = chapter.classes.map((cls: any) => ({
      _id: cls._id,

      title: cls.title,

      order: cls.order,

      duration: cls.duration,

      description: cls.description,

      thumbnail: cls.thumbnail,

      createdAt: cls.createdAt,

      exerciseCount: cls.exercises?.length || 0,

      locked: !purchased,
    }));

    return {
      purchased,

      course: {
        _id: course._id,

        name: course.name,

        type: course.type,
      },

      chapter: {
        title: chapter.title,

        description: chapter.description,

        totalClasses: chapter.classes.length,
      },

      classes,
    };
  }
  // ======================
  // CLASS VIEWER
  // ======================

  async getClassView(classId: string, userId?: string) {
    // FIND COURSE WITH CLASS
    const course = await this.courseModel.findOne({
      'chapters.classes._id': classId,
    });

    if (!course) {
      throw new NotFoundException('Class not found');
    }

    // PURCHASE CHECK
    let purchased = false;

    if (userId) {
      const user = await this.userModel.findById(userId);

      purchased =
        user?.course?.some(
          (c: any) => c.courseId.toString() === course._id.toString(),
        ) || false;
    }

    // BLOCK ACCESS
    if (!purchased) {
      throw new NotFoundException('Purchase course to access class');
    }

    // FIND CHAPTER
    const chapter = course.chapters.find((chapter: any) =>
      chapter.classes.some((cls: any) => cls._id.toString() === classId),
    );

    if (!chapter) {
      throw new NotFoundException('Chapter not found');
    }

    // FIND CLASS
    const cls = chapter.classes.find(
      (cls: any) => cls._id.toString() === classId,
    );

    if (!cls) {
      throw new NotFoundException('Class not found');
    }

    const vdoCipher = await this.getVdoCipherPlaybackData(cls.videoId);

    const user = userId ? await this.userModel.findById(userId) : null;

    const enrollment = user?.course?.find(
      (entry: any) => entry.courseId.toString() === course._id.toString(),
    );

    const classProgress =
      enrollment?.classProgress?.find(
        (entry: any) => entry.classId === classId,
      ) || null;

    return {
      purchased: true,

      course: {
        _id: course._id,

        name: course.name,

        image: course.image,
      },

      chapter: {
        title: chapter.title,

        uniqueCode: chapter.uniqueCode,
      },

      class: {
        _id: cls._id,

        title: cls.title,

        description: cls.description,

        duration: cls.duration,

        thumbnail: cls.thumbnail,

        videoId: cls.videoId,

        vdoCipher,

        createdAt: cls.createdAt,

        exercises: cls.exercises || [],
      },

      progress: {
        classProgress,
        learningProgress: enrollment?.learningProgress || {
          totalClasses: this.getCourseTotalClasses(course),
          watchedClasses: 0,
          completionPercent: 0,
          streak: 0,
          averageWatchTime: '',
          certificateEligible: false,
        },
      },
    };
  }

  async updateClassProgress(
    classId: string,
    userId: string,
    payload: UpdateClassProgressDto,
  ) {
    const course = await this.courseModel.findOne({
      'chapters.classes._id': classId,
    });

    if (!course) {
      throw new NotFoundException('Class not found');
    }

    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const enrollment = user.course?.find(
      (entry: any) => entry.courseId.toString() === course._id.toString(),
    );

    if (!enrollment) {
      throw new ForbiddenException('Course not purchased');
    }

    const chapter = course.chapters.find((chapter: any) =>
      chapter.classes.some((cls: any) => cls._id.toString() === classId),
    );

    if (!chapter) {
      throw new NotFoundException('Chapter not found');
    }

    const cls = chapter.classes.find(
      (entry: any) => entry._id.toString() === classId,
    );

    if (!cls) {
      throw new NotFoundException('Class not found');
    }

    if (!Array.isArray(enrollment.classProgress)) {
      enrollment.classProgress = [];
    }

    if (!Array.isArray(enrollment.activityDates)) {
      enrollment.activityDates = [];
    }

    const now = new Date();

    const existing = enrollment.classProgress.find(
      (entry: any) => entry.classId === classId,
    );

    const durationSeconds = Math.max(
      existing?.durationSeconds || 0,
      this.parseDurationToSeconds(cls.duration),
      payload.durationSeconds || 0,
    );

    const watchedSeconds = Math.max(
      existing?.watchedSeconds || 0,
      payload.totalPlayedSeconds || 0,
    );

    const coveredSeconds = Math.max(
      existing?.coveredSeconds || 0,
      payload.totalCoveredSeconds || 0,
      payload.currentTimeSeconds || 0,
    );

    const lastPositionSeconds = Math.max(
      0,
      payload.currentTimeSeconds || existing?.lastPositionSeconds || 0,
    );

    const calculatedPercent =
      durationSeconds > 0
        ? Math.min(100, Math.round((coveredSeconds / durationSeconds) * 100))
        : Math.min(100, Math.round(payload.progressPercent || 0));

    const completed = Boolean(payload.completed) || calculatedPercent >= 90;

    const nextProgress = {
      classId,
      chapterCode: chapter.uniqueCode || '',
      watchedSeconds,
      coveredSeconds,
      lastPositionSeconds,
      durationSeconds,
      progressPercent: completed ? 100 : calculatedPercent,
      completed,
      startedAt: existing?.startedAt || now,
      lastWatchedAt: now,
    };

    if (existing) {
      Object.assign(existing, nextProgress);
    } else if (
      nextProgress.watchedSeconds > 0 ||
      nextProgress.coveredSeconds > 0 ||
      nextProgress.lastPositionSeconds > 0
    ) {
      enrollment.classProgress.push(nextProgress);
    }

    if (nextProgress.watchedSeconds > 0 || nextProgress.coveredSeconds > 0) {
      const dateKey = this.getDateKey(now);

      if (!enrollment.activityDates.includes(dateKey)) {
        enrollment.activityDates.push(dateKey);
      }
    }

    enrollment.learningProgress = this.summariseLearningProgress(
      course,
      enrollment,
    );

    user.markModified('course');

    await user.save();

    const updatedClassProgress =
      enrollment.classProgress.find(
        (entry: any) => entry.classId === classId,
      ) || null;

    return {
      classProgress: updatedClassProgress,
      learningProgress: enrollment.learningProgress,
    };
  }
  async startStream(userId: string, classId: string, deviceId: string) {
    if (!deviceId) {
      throw new BadRequestException('Device ID missing');
    }
    const active = await this.activeStreamModel.findOne({
      userId,
    });

    // Existing stream
    if (active && active.deviceId !== deviceId) {
      throw new UnauthorizedException(
        'Another device is currently watching a class',
      );
    }

    // Update existing
    if (active) {
      active.classId = classId;

      active.heartbeatAt = new Date();

      await active.save();

      return {
        success: true,
      };
    }

    // Create new stream
    await this.activeStreamModel.create({
      userId,

      classId,

      deviceId,

      heartbeatAt: new Date(),
    });

    return {
      success: true,
    };
  }
  async heartbeat(userId: string, deviceId: string) {
    await this.activeStreamModel.findOneAndUpdate(
      {
        userId,
        deviceId,
      },

      {
        heartbeatAt: new Date(),
      },
    );

    return {
      success: true,
    };
  }
  async stopStream(userId: string, deviceId: string) {
    await this.activeStreamModel.deleteOne({
      userId,

      deviceId,
    });

    return {
      success: true,
    };
  }
}
