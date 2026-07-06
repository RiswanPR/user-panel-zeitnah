import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
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

import {
  awardPoints,
  calculatePoints,
  calculateStreak as calculateLearningStreak,
  ensureGamification,
  getNextLevelProgress,
  syncGamificationStats,
} from '../../common/gamification.helpers';
import { SignedUrlService } from '../../common/aws/signed-url.service';
import { HlsService } from './hls.service';

@Injectable()
export class CoursesService {
  constructor(
    @InjectModel(Course.name)
    private courseModel: Model<CourseDocument>,

    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    @InjectModel(ActiveStream.name)
    private activeStreamModel: Model<ActiveStreamDocument>,
    private signedUrlService: SignedUrlService,
    private hlsService: HlsService,
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

    if (/sec|second|seconds/i.test(value)) {
      return Math.round(numeric);
    }

    return Math.round(numeric * 60);
  }

  private getClassVideoSource(courseType: any, videoSource: any) {
    const explicitSource = String(videoSource || '')
      .trim()
      .toLowerCase();

    if (explicitSource === 's3' || explicitSource === 'aws') {
      return 's3';
    }

    if (explicitSource === 'vdocipher' || explicitSource === 'vdo') {
      return 'vdocipher';
    }

    return String(courseType || '')
      .trim()
      .toLowerCase() === 'recording'
      ? 's3'
      : 'vdocipher';
  }

  private normaliseSeconds(value: any) {
    const seconds = Number(value);

    if (!Number.isFinite(seconds) || seconds <= 0) {
      return 0;
    }

    return Math.round(seconds);
  }

  private clampSeconds(value: number, durationSeconds: number) {
    const seconds = this.normaliseSeconds(value);

    if (durationSeconds <= 0) {
      return seconds;
    }

    return Math.min(seconds, durationSeconds);
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
    return calculateLearningStreak(activityDates);
  }

  private getCourseTotalClasses(course: any) {
    return course.chapters.reduce(
      (sum: number, chapter: any) => sum + (chapter.classes?.length || 0),
      0,
    );
  }

  private getCourseClassMeta(course: any) {
    const classIds = new Set<string>();
    const durationByClassId = new Map<string, number>();

    course.chapters.forEach((chapter: any) => {
      chapter.classes?.forEach((cls: any) => {
        const classId = cls._id.toString();

        classIds.add(classId);
        durationByClassId.set(
          classId,
          this.parseDurationToSeconds(cls.duration),
        );
      });
    });

    return {
      classIds,
      durationByClassId,
    };
  }

  private normaliseClassProgress(item: any, fallbackDurationSeconds = 0) {
    const raw = typeof item?.toObject === 'function' ? item.toObject() : item;
    const durationSeconds = Math.max(
      this.normaliseSeconds(raw?.durationSeconds),
      fallbackDurationSeconds,
    );
    const coveredSeconds = this.clampSeconds(
      this.normaliseSeconds(raw?.coveredSeconds),
      durationSeconds,
    );
    const lastPositionSeconds = this.clampSeconds(
      raw?.lastPositionSeconds,
      durationSeconds,
    );
    const calculatedPercent =
      durationSeconds > 0
        ? Math.min(100, Math.round((coveredSeconds / durationSeconds) * 100))
        : Math.min(100, Math.max(0, Math.round(raw?.progressPercent || 0)));
    const completed = Boolean(raw?.completed) || calculatedPercent >= 90;
    const progressPercent = completed ? 100 : calculatedPercent;

    return {
      ...raw,
      coveredSeconds,
      durationSeconds,
      lastPositionSeconds,
      progressPercent,
      completed,
    };
  }

  private summariseLearningProgress(course: any, enrollment: any) {
    const totalClasses = this.getCourseTotalClasses(course);
    const { classIds, durationByClassId } = this.getCourseClassMeta(course);

    const classProgress = (enrollment.classProgress || [])
      .filter((item: any) => item.classId && classIds.has(item.classId))
      .map((item: any) =>
        this.normaliseClassProgress(
          item,
          durationByClassId.get(item.classId) || 0,
        ),
      );

    const watchedClasses = classProgress.filter(
      (item: any) => (item.progressPercent || 0) > 0,
    ).length;

    const completedClasses = classProgress.filter(
      (item: any) => item.completed,
    ).length;

    const completionPercent =
      totalClasses > 0
        ? Math.min(100, Math.round((completedClasses / totalClasses) * 100))
        : 0;

    const totalPlayedSeconds = classProgress.reduce(
      (sum: number, item: any) => sum + (item.watchedSeconds || 0),
      0,
    );

    return {
      totalClasses,
      watchedClasses,
      completedClasses,
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
  // GLOBAL SEARCH
  // ======================

  async globalSearch(searchQuery: string) {
    const regex = new RegExp(searchQuery, 'i');

    // Search courses matching name or description
    const courses = await this.courseModel
      .find({
        $or: [
          { name: regex },
          { description: regex },
          { 'chapters.title': regex },
          { 'chapters.description': regex },
          { 'chapters.classes.title': regex },
          { 'chapters.classes.description': regex },
        ],
      })
      .lean();

    const results = [];

    for (const course of courses) {
      if (regex.test(course.name) || regex.test(course.description)) {
        results.push({
          type: 'course',
          courseId: course._id,
          title: course.name,
          description: course.description,
          coverImage: course.coverImage,
        });
      }

      for (const chapter of course.chapters || []) {
        if (regex.test(chapter.title) || regex.test(chapter.description)) {
          results.push({
            type: 'chapter',
            courseId: course._id,
            chapterCode: chapter.uniqueCode,
            title: chapter.title,
            description: chapter.description,
          });
        }

        for (const cls of chapter.classes || []) {
          if (regex.test(cls.title) || regex.test(cls.description)) {
            results.push({
              type: 'class',
              courseId: course._id,
              chapterCode: chapter.uniqueCode,
              classId: cls._id,
              title: cls.title,
              description: cls.description,
              thumbnail: cls.thumbnail,
            });
          }
        }
      }
    }

    return { results: results.slice(0, 20) }; // Limit to top 20 results
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

    const formatted = await Promise.all(
      courses.map((c) => this.signCourseImages(c.toObject())),
    );

    return {
      courses: formatted,
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
    const formatted = await Promise.all(
      courses.map(async (course) => {
        const progress = user.course.find(
          (c: any) => c.courseId.toString() === course._id.toString(),
        );
        const learningProgress = progress
          ? this.summariseLearningProgress(course, progress)
          : null;

        const mapped = {
          ...course.toObject(),
          learningProgress,
        };
        return this.signCourseImages(mapped);
      }),
    );

    return {
      courses: formatted,
    };
  }

  async getMyLearningOverview(userId: string) {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const courseIds = user.course?.map((course: any) => course.courseId) || [];
    const courses = await this.courseModel.find({
      _id: {
        $in: courseIds,
      },
    });

    let totalClasses = 0;
    let completedClasses = 0;
    let watchedClasses = 0;

    const courseProgress = await Promise.all(
      courses.map(async (course) => {
        const enrollment = user.course.find(
          (entry: any) => entry.courseId.toString() === course._id.toString(),
        );
        const learningProgress = enrollment
          ? this.summariseLearningProgress(course, enrollment)
          : null;

        if (enrollment && learningProgress) {
          enrollment.learningProgress = learningProgress;
          totalClasses += learningProgress.totalClasses;
          completedClasses += learningProgress.completedClasses;
          watchedClasses += learningProgress.watchedClasses;
        }

        const mapped = {
          _id: course._id,
          name: course.name,
          coverImage: course.coverImage || (course as any).image,
          type: course.type,
          learningProgress,
        };
        return this.signCourseImages(mapped);
      }),
    );

    syncGamificationStats(user);
    user.markModified('course');
    user.markModified('gamification');
    await user.save();

    const completedCourses = user.gamification.completedCourses;
    const totalCourses = courseIds.length;

    return {
      summary: {
        totalCourses,
        completedCourses,
        activeCourses: Math.max(0, totalCourses - completedCourses),
        totalClasses,
        watchedClasses,
        completedClasses,
        totalWatchMinutes: user.gamification.totalWatchMinutes,
        learningStreak: calculateLearningStreak(
          user.gamification.activityDates || [],
        ),
        overallCompletionPercent:
          totalClasses > 0
            ? Math.min(100, Math.round((completedClasses / totalClasses) * 100))
            : 0,
      },
      gamification: user.gamification,
      courses: courseProgress,
    };
  }

  async getMyPointsOverview(userId: string) {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    syncGamificationStats(user);
    user.markModified('gamification');
    await user.save();

    return {
      gamification: user.gamification,
      levelProgress: getNextLevelProgress(user.gamification.totalPoints),
      recentActivities: user.gamification.recentActivities || [],
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

    const user = userId ? await this.userModel.findById(userId) : null;
    const enrollment = user?.course?.find(
      (entry: any) => entry.courseId.toString() === course._id.toString(),
    );
    let purchased = false;

    if (user) {
      purchased = Boolean(enrollment);
    }

    const courseObj = course.toObject();
    const learningProgress = enrollment
      ? this.summariseLearningProgress(course, enrollment)
      : null;

    // LOCK CLASSES
    if (!purchased) {
      courseObj.chapters = courseObj.chapters.map((chapter: any) => ({
        ...chapter,

        classes: chapter.classes.map((cls: any) => ({
          _id: cls._id,

          title: cls.title,

          duration: cls.duration,

          coverImage: cls.coverImage || cls.thumbnail,

          locked: true,
        })),
      }));
    } else {
      courseObj.chapters = courseObj.chapters.map((chapter: any) => ({
        ...chapter,

        classes: chapter.classes.map((cls: any) => {
          const classId = cls._id.toString();
          const rawProgress = enrollment?.classProgress?.find(
            (entry: any) => entry.classId === classId,
          );
          const progress = rawProgress
            ? this.normaliseClassProgress(
                rawProgress,
                this.parseDurationToSeconds(cls.duration),
              )
            : null;

          return {
            ...cls,
            progressPercent: progress?.progressPercent || 0,
            completed: progress?.completed || false,
            completedAt: progress?.completedAt || null,
            classProgress: progress,
            locked: false,
          };
        }),
      }));
    }

    const formattedCourse = await this.signCourseImages({
      ...courseObj,
      learningProgress,
    });

    return {
      purchased,

      course: formattedCourse,
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

    const user = userId ? await this.userModel.findById(userId) : null;
    const enrollment = user?.course?.find(
      (entry: any) => entry.courseId.toString() === courseId,
    );
    let purchased = false;
    let learningProgress: any = null;

    // CHECK PURCHASE
    if (user) {
      purchased = Boolean(enrollment);
      learningProgress = enrollment
        ? this.summariseLearningProgress(course, enrollment)
        : null;
    }

    const chapters = course.chapters.map((chapter: any) => {
      const chapterClasses = chapter.classes || [];
      const completedClasses = chapterClasses.filter((cls: any) => {
        const classId = cls._id.toString();
        const progress = enrollment?.classProgress?.find(
          (entry: any) => entry.classId === classId,
        );
        const normalisedProgress = progress
          ? this.normaliseClassProgress(
              progress,
              this.parseDurationToSeconds(cls.duration),
            )
          : null;

        return normalisedProgress?.completed;
      }).length;
      const watchedClasses = chapterClasses.filter((cls: any) => {
        const classId = cls._id.toString();
        const progress = enrollment?.classProgress?.find(
          (entry: any) => entry.classId === classId,
        );
        const normalisedProgress = progress
          ? this.normaliseClassProgress(
              progress,
              this.parseDurationToSeconds(cls.duration),
            )
          : null;

        return (normalisedProgress?.progressPercent || 0) > 0;
      }).length;
      const progressPercent =
        chapterClasses.length > 0
          ? Math.min(
              100,
              Math.round((completedClasses / chapterClasses.length) * 100),
            )
          : 0;

      return {
        ...chapter.toObject(),

        totalClasses: chapterClasses.length,

        watchedClasses,

        completedClasses,

        progressPercent,

        completed:
          chapterClasses.length > 0 &&
          completedClasses >= chapterClasses.length,

        locked: !purchased,
      };
    });

    const formattedCourse = await this.signCourseImages({
      _id: course._id,

      name: course.name,

      coverImage: course.coverImage || (course as any).image,

      type: course.type,

      description: course.description,

      learningProgress,

      chapters,
    });

    return {
      purchased,

      course: formattedCourse,

      chapters: formattedCourse.chapters,
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
    const user = userId ? await this.userModel.findById(userId) : null;

    if (user) {
      purchased =
        user?.course?.some((c: any) => c.courseId.toString() === courseId) ||
        false;
    }

    const enrollment = user?.course?.find(
      (entry: any) => entry.courseId.toString() === course._id.toString(),
    );

    // LOCK LOGIC
    const classes = await Promise.all(
      chapter.classes.map(async (cls: any) => {
        const classId = cls._id.toString();
        const classProgress = enrollment?.classProgress?.find(
          (entry: any) => entry.classId === classId,
        );
        const progress = classProgress
          ? this.normaliseClassProgress(
              classProgress,
              this.parseDurationToSeconds(cls.duration),
            )
          : null;

        const mappedClass = {
          _id: cls._id,

          title: cls.title,

          order: cls.order,

          duration: cls.duration,

          description: cls.description,

          thumbnail: cls.thumbnail,

          createdAt: cls.createdAt,

          exerciseCount: cls.exercises?.length || 0,

          progressPercent: progress?.progressPercent || 0,

          completed: progress?.completed || false,

          completedAt: progress?.completedAt || null,

          classProgress: progress,

          locked: !purchased,
        };
        return mappedClass;
      }),
    );

    const formattedCourse = await this.signCourseImages({
      _id: course._id,
      name: course.name,
      type: course.type,
      chapters: [
        {
          title: chapter.title,
          description: chapter.description,
          totalClasses: chapter.classes.length,
          classes,
        },
      ],
    });

    return {
      purchased,
      course: formattedCourse,
      chapter: formattedCourse.chapters[0],
      classes: formattedCourse.chapters[0].classes,
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

    const videoSource = this.getClassVideoSource(course.type, cls.videoSource);
    const vdoCipher =
      videoSource === 'vdocipher'
        ? await this.getVdoCipherPlaybackData(cls.videoId)
        : null;

    const user = userId ? await this.userModel.findById(userId) : null;

    const enrollment = user?.course?.find(
      (entry: any) => entry.courseId.toString() === course._id.toString(),
    );

    const rawClassProgress =
      enrollment?.classProgress?.find(
        (entry: any) => entry.classId === classId,
      ) || null;
    const classProgress = rawClassProgress
      ? this.normaliseClassProgress(
          rawClassProgress,
          this.parseDurationToSeconds(cls.duration),
        )
      : null;
    const learningProgress = enrollment
      ? this.summariseLearningProgress(course, enrollment)
      : {
          totalClasses: this.getCourseTotalClasses(course),
          watchedClasses: 0,
          completedClasses: 0,
          completionPercent: 0,
          streak: 0,
          averageWatchTime: '',
          certificateEligible: false,
        };

    return {
      purchased: true,

      course: {
        _id: course._id,

        name: course.name,

        coverImage: course.coverImage || (course as any).image,

        type: course.type,
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

        coverImage: cls.coverImage || (cls as any).thumbnail,

        videoId: cls.videoId,

        videoSource,

        vdoCipher,

        createdAt: cls.createdAt,

        exercises: cls.exercises || [],
      },

      progress: {
        classProgress,
        learningProgress,
      },
    };
  }

  async updateClassProgress(
    classId: string,
    userId: string,
    payload: UpdateClassProgressDto,
    attempt = 0,
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
    const previousWatchedMinutes = Math.floor(
      this.normaliseSeconds(existing?.watchedSeconds) / 60,
    );

    const durationSeconds = Math.max(
      this.normaliseSeconds(existing?.durationSeconds),
      this.parseDurationToSeconds(cls.duration),
      this.normaliseSeconds(payload.durationSeconds),
    );

    const watchedSeconds = Math.max(
      this.normaliseSeconds(existing?.watchedSeconds),
      this.normaliseSeconds(payload.totalPlayedSeconds),
    );

    const coveredSeconds = this.clampSeconds(
      Math.max(
        this.normaliseSeconds(existing?.coveredSeconds),
        this.normaliseSeconds(payload.totalCoveredSeconds),
        this.normaliseSeconds(payload.currentTimeSeconds),
      ),
      durationSeconds,
    );

    const lastPositionSeconds = this.clampSeconds(
      payload.currentTimeSeconds ?? existing?.lastPositionSeconds ?? 0,
      durationSeconds,
    );

    const calculatedPercent =
      durationSeconds > 0
        ? Math.min(100, Math.round((coveredSeconds / durationSeconds) * 100))
        : Math.min(100, Math.round(payload.progressPercent || 0));

    const completed =
      Boolean(existing?.completed) ||
      Boolean(payload.completed) ||
      calculatedPercent >= 90;

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
      completedAt: completed ? existing?.completedAt || now : null,
    };

    const gamification = ensureGamification(user);
    const recentRewards: any[] = [];
    const nextWatchedMinutes = Math.floor(nextProgress.watchedSeconds / 60);
    const earnedWatchMinutes = Math.max(
      0,
      nextWatchedMinutes - previousWatchedMinutes,
    );
    const watchPoints = calculatePoints(earnedWatchMinutes);

    if (watchPoints > 0) {
      const reward = awardPoints(
        user,
        watchPoints,
        `${earnedWatchMinutes} Watch Minutes`,
        'watch_minutes',
        {
          courseId: course._id.toString(),
          classId,
        },
      );

      if (reward) {
        recentRewards.push(reward);
      }
    }

    if (
      nextProgress.completed &&
      !gamification.rewardedClassIds.includes(classId)
    ) {
      gamification.rewardedClassIds.push(classId);

      const reward = awardPoints(
        user,
        25,
        'Class Completed',
        'class_completed',
        {
          courseId: course._id.toString(),
          classId,
        },
      );

      if (reward) {
        recentRewards.push(reward);
      }
    }

    console.log('[LearningProgress]', {
      userId,
      courseId: course._id.toString(),
      classId,
      coveredSeconds: nextProgress.coveredSeconds,
      durationSeconds: nextProgress.durationSeconds,
      progressPercent: nextProgress.progressPercent,
      completed: nextProgress.completed,
    });

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

    const courseId = course._id.toString();

    if (
      enrollment.learningProgress.totalClasses > 0 &&
      enrollment.learningProgress.completedClasses >=
        enrollment.learningProgress.totalClasses &&
      !gamification.rewardedCourseIds.includes(courseId)
    ) {
      gamification.rewardedCourseIds.push(courseId);

      const reward = awardPoints(
        user,
        100,
        'Course Completed',
        'course_completed',
        {
          courseId,
        },
      );

      if (reward) {
        recentRewards.push(reward);
      }
    }

    syncGamificationStats(user);

    user.markModified('course');
    user.markModified('gamification');

    try {
      await user.save();
    } catch (error: any) {
      if (error?.name === 'VersionError' && attempt < 2) {
        return this.updateClassProgress(classId, userId, payload, attempt + 1);
      }

      throw error;
    }

    const updatedClassProgress =
      enrollment.classProgress.find(
        (entry: any) => entry.classId === classId,
      ) || null;

    return {
      classProgress: updatedClassProgress
        ? this.normaliseClassProgress(updatedClassProgress, durationSeconds)
        : null,
      learningProgress: enrollment.learningProgress,
      gamification: user.gamification,
      rewards: recentRewards,
    };
  }
  async startStream(
    userId: string,
    classId: string,
    deviceId: string,
    browserFingerprint?: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    if (!deviceId) {
      throw new BadRequestException('Device ID missing');
    }

    // Clean up expired sessions first (if TTL hasn't kicked in yet)
    await this.activeStreamModel.updateMany(
      { userId, expiresAt: { $lt: new Date() }, status: 'ACTIVE' },
      { $set: { status: 'EXPIRED' } },
    );

    const active = await this.activeStreamModel.findOne({
      userId,
      status: 'ACTIVE',
    });

    // Existing stream on another device
    if (active && active.deviceId !== deviceId) {
      throw new UnauthorizedException(
        'Another device is currently watching a class. Please close the stream on the other device or wait 90 seconds for it to expire.',
      );
    }

    const expiresAt = new Date(Date.now() + 90000); // 90 seconds

    // Update existing stream on this device
    if (active) {
      active.classId = classId;
      active.heartbeatAt = new Date();
      active.expiresAt = expiresAt;
      active.browserFingerprint =
        browserFingerprint || active.browserFingerprint;
      active.ipAddress = ipAddress || active.ipAddress;
      active.userAgent = userAgent || active.userAgent;

      await active.save();

      return { success: true };
    }

    // Create new stream
    await this.activeStreamModel.create({
      userId,
      classId,
      deviceId,
      browserFingerprint,
      ipAddress,
      userAgent,
      status: 'ACTIVE',
      heartbeatAt: new Date(),
      expiresAt,
    });

    return { success: true };
  }

  async heartbeat(userId: string, deviceId: string) {
    const expiresAt = new Date(Date.now() + 90000); // 90 seconds

    const updated = await this.activeStreamModel.findOneAndUpdate(
      {
        userId,
        deviceId,
        status: 'ACTIVE',
      },
      {
        heartbeatAt: new Date(),
        expiresAt,
      },
      { new: true },
    );

    if (!updated) {
      throw new UnauthorizedException('Session expired or invalid device');
    }

    return { success: true };
  }

  async stopStream(userId: string, deviceId: string) {
    await this.activeStreamModel.findOneAndUpdate(
      {
        userId,
        deviceId,
        status: 'ACTIVE',
      },
      {
        status: 'ENDED',
        expiresAt: new Date(),
      },
    );

    return { success: true };
  }

  async getSecureVideoPlayback(classId: string, userId: string) {
    const course = await this.courseModel.findOne({
      'chapters.classes._id': classId,
    });

    if (!course) {
      throw new NotFoundException('Class not found');
    }

    const user = await this.userModel.findById(userId);
    const purchased =
      user?.course?.some(
        (c: any) => c.courseId.toString() === course._id.toString(),
      ) || false;

    if (!purchased) {
      throw new ForbiddenException('Purchase course to access video stream');
    }

    let foundClass: any = null;
    for (const chapter of course.chapters) {
      const cls = chapter.classes.find(
        (c: any) => c._id.toString() === classId,
      );
      if (cls) {
        foundClass = cls;
        break;
      }
    }

    if (!foundClass) {
      throw new NotFoundException('Class not found');
    }

    const videoTarget = foundClass.videoUrl || foundClass.videoId;

    if (!videoTarget) {
      throw new NotFoundException('Video not found for this class');
    }

    let playbackUrl: string;

    if (videoTarget.endsWith('.m3u8')) {
      // const baseUrl = process.env.API_URL || 'https://api.your-domain.com/api';
      const baseUrl = process.env.API_URL || 'http://<SERVER_IP>:3000/api';
      playbackUrl = `${baseUrl}/courses/video/${classId}/playlist.m3u8`;
    } else {
      // Fallback for MP4 videos that haven't been converted to HLS yet
      playbackUrl = await this.signedUrlService.generateSignedVideoUrl(
        videoTarget,
        900,
      );
    }

    return {
      playbackUrl,
      watermarkData: {
        userId: user?._id,
        name: user?.name || '',
        email: user?.email,
      },
    };
  }

  async getSecurePlaylist(classId: string, userId: string): Promise<string> {
    const course = await this.courseModel.findOne({
      'chapters.classes._id': classId,
    });

    if (!course) {
      throw new NotFoundException('Class not found');
    }

    const user = await this.userModel.findById(userId);
    const purchased =
      user?.course?.some(
        (c: any) => c.courseId.toString() === course._id.toString(),
      ) || false;

    if (!purchased) {
      throw new ForbiddenException('Purchase course to access video stream');
    }

    let foundClass: any = null;
    for (const chapter of course.chapters) {
      const cls = chapter.classes.find(
        (c: any) => c._id.toString() === classId,
      );
      if (cls) {
        foundClass = cls;
        break;
      }
    }

    if (!foundClass) {
      throw new NotFoundException('Class not found');
    }

    const videoTarget = foundClass.videoUrl || foundClass.videoId;
    if (!videoTarget) {
      throw new NotFoundException('Video not found');
    }

    return this.hlsService.getSecurePlaylist(videoTarget);
  }

  async convertVideoToHls(classId: string) {
    const course = await this.courseModel.findOne({
      'chapters.classes._id': classId,
    });

    if (!course) {
      throw new NotFoundException('Class not found');
    }

    let foundClass: any = null;
    for (const chapter of course.chapters) {
      const cls = chapter.classes.find(
        (c: any) => c._id.toString() === classId,
      );
      if (cls) {
        foundClass = cls;
        break;
      }
    }

    const videoTarget = foundClass?.videoUrl || foundClass?.videoId;
    if (!videoTarget) {
      throw new NotFoundException('Video not found');
    }

    const result = await this.hlsService.convertVideoToHls(videoTarget);

    if (result.success && result.hlsPath) {
      // Update database with new HLS path
      foundClass.videoUrl = result.hlsPath;
      await course.save();
    }

    return result;
  }

  private async signCourseImages(courseObj: any) {
    if (!courseObj) return courseObj;

    if (courseObj.image) {
      courseObj.coverImage = courseObj.image;
      delete courseObj.image;
    }
    if (courseObj.coverImage) {
      courseObj.coverImage = await this.signedUrlService.generateSignedImageUrl(
        courseObj.coverImage,
      );
    }

    if (courseObj.chapters && Array.isArray(courseObj.chapters)) {
      courseObj.chapters.sort(
        (a: any, b: any) => (a.order || 0) - (b.order || 0),
      );
      for (const chapter of courseObj.chapters) {
        if (chapter.imageName) {
          chapter.coverImage = chapter.imageName;
          delete chapter.imageName;
        }
        if (chapter.coverImage) {
          chapter.coverImage =
            await this.signedUrlService.generateSignedImageUrl(
              chapter.coverImage,
            );
        }
        if (chapter.classes && Array.isArray(chapter.classes)) {
          chapter.classes.sort(
            (a: any, b: any) => (a.order || 0) - (b.order || 0),
          );
          for (const cls of chapter.classes) {
            if (cls.thumbnail) {
              cls.coverImage = cls.thumbnail;
              delete cls.thumbnail;
            }
            if (cls.coverImage) {
              cls.coverImage =
                await this.signedUrlService.generateSignedImageUrl(
                  cls.coverImage,
                );
            }
            if (cls.exercises && Array.isArray(cls.exercises)) {
              cls.exercises.sort(
                (a: any, b: any) => (a.order || 0) - (b.order || 0),
              );
            }
          }
        }
      }
    }
    return courseObj;
  }
}
