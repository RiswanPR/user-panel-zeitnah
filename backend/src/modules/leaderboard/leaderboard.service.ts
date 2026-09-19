import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../auth/schemas/user.schema';
import { Course, CourseDocument } from '../courses/schemas/course.schema';
import { SignedUrlService } from '../../common/aws/signed-url.service';
import {
  calculateLevel,
  calculateRank,
  calculateStreak,
  getNextLevelProgress,
  syncGamificationStats,
} from '../../common/gamification.helpers';
import { GetLeaderboardDto } from './dto/get-leaderboard.dto';

export interface LeaderboardStudentDto {
  id: string;
  rank: number;
  name: string;
  username: string;
  avatar: string;
  points: number;
  level: number;
  rankTitle: string;
  completedClasses: number;
  completedCourses: number;
  streak: number;
  isVerified: boolean;
  isYou: boolean;
}

export interface CourseLeaderboardStudentDto {
  id: string;
  rank: number;
  name: string;
  username: string;
  avatar: string;
  courseXp: number;
  level: number;
  rankTitle: string;
  completionPercent: number;
  completedClasses: number;
  totalClasses: number;
  streak: number;
  isVerified: boolean;
  isYou: boolean;
}

@Injectable()
export class LeaderboardService {
  private readonly logger = new Logger(LeaderboardService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Course.name) private readonly courseModel: Model<CourseDocument>,
    private readonly signedUrlService: SignedUrlService,
  ) {}

  /**
   * Base filter ensuring only eligible active students are included in leaderboards.
   */
  private getEligibleStudentFilter(): Record<string, any> {
    return {
      role: 'student',
      'account_Status.isBlocked': { $ne: true },
      'account_Status.isDeleted': { $ne: true },
      'account_Status.isActive': { $ne: false },
    };
  }

  /**
   * Transforms a User document into a safe, sanitized LeaderboardStudentDto.
   */
  private async transformGlobalStudent(
    user: any,
    rankPosition: number,
    currentUserId?: string,
  ): Promise<LeaderboardStudentDto> {
    const userObj = user.toObject ? user.toObject() : user;
    let avatar = userObj.avatar || '';
    if (avatar) {
      avatar = await this.signedUrlService.generateSignedImageUrl(avatar);
    }
    const streak = calculateStreak(userObj.gamification?.activityDates || []);
    const isYou =
      currentUserId && userObj._id
        ? userObj._id.toString() === currentUserId.toString()
        : false;

    return {
      id: userObj._id.toString(),
      rank: rankPosition,
      name: userObj.name || 'Anonymous Learner',
      username: userObj.username || '',
      avatar,
      points: userObj.gamification?.totalPoints || 0,
      level: userObj.gamification?.level || 1,
      rankTitle: userObj.gamification?.rank || 'Beginner',
      completedClasses: userObj.gamification?.completedClasses || 0,
      completedCourses: userObj.gamification?.completedCourses || 0,
      streak,
      isVerified: Boolean(userObj.account_Status?.isVerified),
      isYou,
    };
  }

  /**
   * Calculates deterministic global rank for a student using fast indexed aggregation.
   * Handles legacy users with missing/null gamification fields gracefully.
   */
  async getStudentGlobalRank(userId: string): Promise<{ rank: number; student: UserDocument } | null> {
    const student = await this.userModel.findById(userId);
    if (!student) return null;

    syncGamificationStats(student);

    const pts = Number(student.gamification?.totalPoints) || 0;
    const lvl = Number(student.gamification?.level) || 1;
    const cls = Number(student.gamification?.completedClasses) || 0;
    const createdAt = (student as any).createdAt || new Date(0);
    const studentId = student._id;

    const ahead = await this.userModel.aggregate([
      { $match: this.getEligibleStudentFilter() },
      {
        $addFields: {
          effectivePoints: { $ifNull: ['$gamification.totalPoints', 0] },
          effectiveLevel: { $ifNull: ['$gamification.level', 1] },
          effectiveClasses: { $ifNull: ['$gamification.completedClasses', 0] },
          effectiveCreatedAt: { $ifNull: ['$createdAt', new Date(0)] },
        },
      },
      {
        $match: {
          $or: [
            { effectivePoints: { $gt: pts } },
            { effectivePoints: pts, effectiveLevel: { $gt: lvl } },
            {
              effectivePoints: pts,
              effectiveLevel: lvl,
              effectiveClasses: { $gt: cls },
            },
            {
              effectivePoints: pts,
              effectiveLevel: lvl,
              effectiveClasses: cls,
              effectiveCreatedAt: { $lt: createdAt },
            },
            {
              effectivePoints: pts,
              effectiveLevel: lvl,
              effectiveClasses: cls,
              effectiveCreatedAt: createdAt,
              _id: { $lt: studentId },
            },
          ],
        },
      },
      { $count: 'count' },
    ]);

    const aheadCount = ahead[0]?.count || 0;

    return {
      rank: aheadCount + 1,
      student,
    };
  }

  /**
   * Global student leaderboard with server-side pagination, search, filters,
   * deterministic tie-breaking, and top-3 podium.
   */
  async getGlobalLeaderboard(query: GetLeaderboardDto, currentUserId: string) {
    const requestedLimit = Number(query.limit) || 20;
    const limit = Math.min(20, Math.max(1, requestedLimit));
    const page = Math.max(1, Number(query.page) || 1);
    const skip = (page - 1) * limit;

    const matchFilter: Record<string, any> = this.getEligibleStudentFilter();

    if (query.q && query.q.trim()) {
      const escaped = query.q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      matchFilter.$or = [{ name: regex }, { username: regex }];
    }

    if (query.level) {
      matchFilter['gamification.level'] = Number(query.level);
    }

    if (query.rank && query.rank.trim()) {
      matchFilter['gamification.rank'] = query.rank.trim();
    }

    const baseNormalization = {
      $addFields: {
        effectivePoints: { $ifNull: ['$gamification.totalPoints', 0] },
        effectiveLevel: { $ifNull: ['$gamification.level', 1] },
        effectiveClasses: { $ifNull: ['$gamification.completedClasses', 0] },
        effectiveCreatedAt: { $ifNull: ['$createdAt', new Date(0)] },
      },
    };

    const sortStage = {
      $sort: {
        effectivePoints: -1,
        effectiveLevel: -1,
        effectiveClasses: -1,
        effectiveCreatedAt: 1,
        _id: 1,
      } as Record<string, 1 | -1>,
    };

    const projectStage = {
      $project: {
        name: 1,
        username: 1,
        avatar: 1,
        createdAt: '$effectiveCreatedAt',
        'gamification.totalPoints': '$effectivePoints',
        'gamification.level': '$effectiveLevel',
        'gamification.rank': { $ifNull: ['$gamification.rank', 'Beginner'] },
        'gamification.completedClasses': '$effectiveClasses',
        'gamification.completedCourses': { $ifNull: ['$gamification.completedCourses', 0] },
        'gamification.activityDates': { $ifNull: ['$gamification.activityDates', []] },
        'account_Status.isVerified': { $ifNull: ['$account_Status.isVerified', false] },
      },
    };

    const [rawLearners, totalLearners, rawPodium] = await Promise.all([
      this.userModel.aggregate([
        { $match: matchFilter },
        baseNormalization,
        sortStage,
        { $skip: skip },
        { $limit: limit },
        projectStage,
      ]),
      this.userModel.countDocuments(matchFilter),
      this.userModel.aggregate([
        { $match: this.getEligibleStudentFilter() },
        baseNormalization,
        sortStage,
        { $limit: 3 },
        projectStage,
      ]),
    ]);

    const topPodium = await Promise.all(
      rawPodium.map((user, idx) =>
        this.transformGlobalStudent(user, idx + 1, currentUserId),
      ),
    );

    const learners = await Promise.all(
      rawLearners.map((user, idx) =>
        this.transformGlobalStudent(user, skip + idx + 1, currentUserId),
      ),
    );

    // Current student's position telemetry
    let currentStudentTelemetry = null;
    const rankResult = await this.getStudentGlobalRank(currentUserId);
    if (rankResult) {
      const { rank, student } = rankResult;
      const totalEligible = await this.userModel.countDocuments(
        this.getEligibleStudentFilter(),
      );
      const levelProgress = getNextLevelProgress(
        student.gamification?.totalPoints || 0,
      );

      currentStudentTelemetry = {
        rank,
        points: student.gamification?.totalPoints || 0,
        level: student.gamification?.level || 1,
        rankTitle: student.gamification?.rank || 'Beginner',
        completedClasses: student.gamification?.completedClasses || 0,
        completedCourses: student.gamification?.completedCourses || 0,
        totalLearners: totalEligible,
        levelProgress,
      };
    }

    // Top 20 Rule: cap visible total to at most 20
    const visibleTotal = Math.min(20, totalLearners);

    return {
      topPodium,
      learners,
      totalLearners: visibleTotal,
      page: 1,
      totalPages: 1,
      currentStudent: currentStudentTelemetry,
    };
  }

  /**
   * Returns personal leaderboard position and level progression for authenticated student.
   */
  async getMyLeaderboardPosition(userId: string) {
    const rankResult = await this.getStudentGlobalRank(userId);
    if (!rankResult) {
      throw new NotFoundException('Student account not found');
    }

    const { rank, student } = rankResult;
    const totalLearners = await this.userModel.countDocuments(
      this.getEligibleStudentFilter(),
    );
    const levelProgress = getNextLevelProgress(
      student.gamification?.totalPoints || 0,
    );

    return {
      rank,
      points: student.gamification?.totalPoints || 0,
      level: student.gamification?.level || 1,
      rankTitle: student.gamification?.rank || 'Beginner',
      completedClasses: student.gamification?.completedClasses || 0,
      completedCourses: student.gamification?.completedCourses || 0,
      totalLearners,
      levelProgress,
    };
  }

  /**
   * Computes course XP from an enrollment record according to Zeitnah rules:
   * - 1 XP per watched minute
   * - 25 XP per completed class
   * - 100 XP bonus if course fully completed
   */
  private computeCourseXp(enrollment: any): {
    courseXp: number;
    completionPercent: number;
    completedClasses: number;
    totalClasses: number;
  } {
    if (!enrollment) {
      return { courseXp: 0, completionPercent: 0, completedClasses: 0, totalClasses: 0 };
    }

    const learningProgress = enrollment.learningProgress || {};
    const classProgress = Array.isArray(enrollment.classProgress)
      ? enrollment.classProgress
      : [];

    const totalWatchSeconds = classProgress.reduce(
      (sum: number, item: any) => sum + (Number(item.watchedSeconds) || 0),
      0,
    );
    const watchMinutes = Math.floor(totalWatchSeconds / 60);

    const completedClasses =
      Number(learningProgress.completedClasses) ||
      classProgress.filter((item: any) => Boolean(item.completed)).length ||
      0;
    const totalClasses = Number(learningProgress.totalClasses) || 0;

    const isCourseCompleted =
      totalClasses > 0 && completedClasses >= totalClasses;

    const courseXp =
      watchMinutes + completedClasses * 25 + (isCourseCompleted ? 100 : 0);

    const completionPercent =
      Number(learningProgress.completionPercent) ||
      (totalClasses > 0
        ? Math.min(100, Math.round((completedClasses / totalClasses) * 100))
        : 0);

    return {
      courseXp,
      completionPercent,
      completedClasses,
      totalClasses,
    };
  }

  /**
   * Retrieves enrolled courses for current student with their course XP, rank,
   * and completion metrics.
   */
  async getMyCoursesLeaderboard(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const enrolledCourses = Array.isArray(user.course) ? user.course : [];
    if (enrolledCourses.length === 0) {
      return { courses: [] };
    }

    const courseIds = enrolledCourses
      .map((entry: any) => entry.courseId)
      .filter(Boolean);

    const courses = await this.courseModel.find({
      _id: { $in: courseIds },
    });

    const coursesData = await Promise.all(
      courses.map(async (course) => {
        const courseIdStr = course._id.toString();
        const enrollment = enrolledCourses.find(
          (c: any) => c.courseId?.toString() === courseIdStr,
        );

        const { courseXp, completionPercent, completedClasses, totalClasses } =
          this.computeCourseXp(enrollment);

        // Find all eligible learners enrolled in this course to calculate learner count & rank
        const enrolledStudents = await this.userModel
          .find({
            ...this.getEligibleStudentFilter(),
            'course.courseId': courseIdStr,
          })
          .select('name username avatar course createdAt gamification.level gamification.rank account_Status.isVerified')
          .lean();

        // Compute rankings for each student in this course
        const rankedStudents = enrolledStudents
          .map((student: any) => {
            const studentEnrollment = (student.course || []).find(
              (c: any) => c.courseId?.toString() === courseIdStr,
            );
            const stats = this.computeCourseXp(studentEnrollment);
            return {
              userId: student._id.toString(),
              courseXp: stats.courseXp,
              completionPercent: stats.completionPercent,
              completedClasses: stats.completedClasses,
              createdAt: student.createdAt || new Date(0),
            };
          })
          .sort((a, b) => {
            if (b.courseXp !== a.courseXp) return b.courseXp - a.courseXp;
            if (b.completionPercent !== a.completionPercent)
              return b.completionPercent - a.completionPercent;
            if (b.completedClasses !== a.completedClasses)
              return b.completedClasses - a.completedClasses;
            const dateDiff =
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            if (dateDiff !== 0) return dateDiff;
            return a.userId.localeCompare(b.userId);
          });

        const myIndex = rankedStudents.findIndex((s) => s.userId === userId);
        const myRank = myIndex !== -1 ? myIndex + 1 : rankedStudents.length + 1;

        let coverImage = course.coverImage || course.image || '';
        if (coverImage) {
          coverImage =
            await this.signedUrlService.generateSignedImageUrl(coverImage);
        }

        return {
          courseId: courseIdStr,
          courseName: course.name,
          coverImage,
          type: course.type,
          learnerCount: enrolledStudents.length,
          currentStudent: {
            rank: myRank,
            courseXp,
            completionPercent,
            completedClasses,
            totalClasses,
          },
        };
      }),
    );

    return { courses: coursesData };
  }

  /**
   * Course-specific leaderboard. Strictly verifies that current user is enrolled.
   */
  async getCourseLeaderboard(
    courseId: string,
    query: GetLeaderboardDto,
    currentUserId: string,
  ) {
    const course = await this.courseModel.findById(courseId);
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const currentUser = await this.userModel.findById(currentUserId);
    if (!currentUser) {
      throw new NotFoundException('User not found');
    }

    const isEnrolled = (currentUser.course || []).some(
      (c: any) => c.courseId?.toString() === courseId,
    );

    if (!isEnrolled) {
      throw new ForbiddenException(
        'You are not enrolled in this course and cannot view its leaderboard.',
      );
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));

    // Fetch all eligible learners enrolled in this course
    const filter: Record<string, any> = {
      ...this.getEligibleStudentFilter(),
      'course.courseId': courseId,
    };

    if (query.q && query.q.trim()) {
      const escaped = query.q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      filter.$or = [{ name: regex }, { username: regex }];
    }

    if (query.level) {
      filter['gamification.level'] = Number(query.level);
    }

    const enrolledStudents = await this.userModel
      .find(filter)
      .select('name username avatar course createdAt gamification.level gamification.rank gamification.activityDates account_Status.isVerified')
      .lean();

    // Map and score each enrolled student for this course
    const computedList = enrolledStudents.map((student: any) => {
      const enrollment = (student.course || []).find(
        (c: any) => c.courseId?.toString() === courseId,
      );
      const stats = this.computeCourseXp(enrollment);
      const streak = calculateStreak(student.gamification?.activityDates || []);

      return {
        id: student._id.toString(),
        name: student.name || 'Anonymous Learner',
        username: student.username || '',
        avatar: student.avatar || '',
        courseXp: stats.courseXp,
        level: student.gamification?.level || 1,
        rankTitle: student.gamification?.rank || 'Beginner',
        completionPercent: stats.completionPercent,
        completedClasses: stats.completedClasses,
        totalClasses: stats.totalClasses,
        streak,
        isVerified: Boolean(student.account_Status?.isVerified),
        createdAt: student.createdAt || new Date(0),
        isYou: student._id.toString() === currentUserId,
      };
    });

    // Deterministic sort: courseXp DESC, completionPercent DESC, completedClasses DESC, createdAt ASC, id ASC
    computedList.sort((a, b) => {
      if (b.courseXp !== a.courseXp) return b.courseXp - a.courseXp;
      if (b.completionPercent !== a.completionPercent)
        return b.completionPercent - a.completionPercent;
      if (b.completedClasses !== a.completedClasses)
        return b.completedClasses - a.completedClasses;
      const dateDiff =
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (dateDiff !== 0) return dateDiff;
      return a.id.localeCompare(b.id);
    });

    const totalLearners = computedList.length;
    const skip = (page - 1) * limit;
    const paginatedSlice = computedList.slice(skip, skip + limit);

    // Sign avatars for paginated slice
    const learners: CourseLeaderboardStudentDto[] = await Promise.all(
      paginatedSlice.map(async (student, idx) => {
        let avatar = student.avatar;
        if (avatar) {
          avatar = await this.signedUrlService.generateSignedImageUrl(avatar);
        }
        return {
          id: student.id,
          rank: skip + idx + 1,
          name: student.name,
          username: student.username,
          avatar,
          courseXp: student.courseXp,
          level: student.level,
          rankTitle: student.rankTitle,
          completionPercent: student.completionPercent,
          completedClasses: student.completedClasses,
          totalClasses: student.totalClasses,
          streak: student.streak,
          isVerified: student.isVerified,
          isYou: student.isYou,
        };
      }),
    );

    // Top 3 Podium for this course
    const podiumSlice = computedList.slice(0, 3);
    const topPodium: CourseLeaderboardStudentDto[] = await Promise.all(
      podiumSlice.map(async (student, idx) => {
        let avatar = student.avatar;
        if (avatar) {
          avatar = await this.signedUrlService.generateSignedImageUrl(avatar);
        }
        return {
          id: student.id,
          rank: idx + 1,
          name: student.name,
          username: student.username,
          avatar,
          courseXp: student.courseXp,
          level: student.level,
          rankTitle: student.rankTitle,
          completionPercent: student.completionPercent,
          completedClasses: student.completedClasses,
          totalClasses: student.totalClasses,
          streak: student.streak,
          isVerified: student.isVerified,
          isYou: student.isYou,
        };
      }),
    );

    // Current student course stats
    const myIndex = computedList.findIndex((s) => s.id === currentUserId);
    const currentStudent =
      myIndex !== -1
        ? {
            rank: myIndex + 1,
            courseXp: computedList[myIndex].courseXp,
            level: computedList[myIndex].level,
            rankTitle: computedList[myIndex].rankTitle,
            completionPercent: computedList[myIndex].completionPercent,
            completedClasses: computedList[myIndex].completedClasses,
            totalClasses: computedList[myIndex].totalClasses,
            streak: computedList[myIndex].streak,
          }
        : null;

    let coverImage = course.coverImage || course.image || '';
    if (coverImage) {
      coverImage =
        await this.signedUrlService.generateSignedImageUrl(coverImage);
    }

    return {
      course: {
        id: course._id.toString(),
        name: course.name,
        coverImage,
        type: course.type,
      },
      topPodium,
      learners,
      totalLearners,
      page,
      totalPages: Math.ceil(totalLearners / limit) || 1,
      currentStudent,
    };
  }
}
