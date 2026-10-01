import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { CoursesService } from './courses.service';
import { Course } from './schemas/course.schema';
import { User } from '../auth/schemas/user.schema';
import { ActiveStream } from './schemas/active-stream.schema';
import { CourseEnquiry } from './schemas/course-enquiry.schema';
import { SignedUrlService } from '../../common/aws/signed-url.service';
import { HlsService } from './hls.service';

describe('CoursesService — My Learning & Role Resilience', () => {
  let service: CoursesService;
  let mockUserModel: any;
  let mockCourseModel: any;
  let mockSignedUrlService: any;

  beforeEach(async () => {
    mockUserModel = {
      findById: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      updateOne: jest
        .fn()
        .mockResolvedValue({ acknowledged: true, modifiedCount: 1 }),
      exists: jest.fn(),
    };

    mockCourseModel = {
      find: jest.fn(),
      findById: jest.fn(),
      findOne: jest.fn(),
    };

    mockSignedUrlService = {
      generateSignedImageUrl: jest
        .fn()
        .mockImplementation((url) => Promise.resolve(`signed-${url}`)),
      generateSignedUrl: jest
        .fn()
        .mockImplementation((key) => Promise.resolve(`signed-${key}`)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoursesService,
        {
          provide: getModelToken(Course.name),
          useValue: mockCourseModel,
        },
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: getModelToken(ActiveStream.name),
          useValue: {},
        },
        {
          provide: getModelToken(CourseEnquiry.name),
          useValue: {},
        },
        {
          provide: SignedUrlService,
          useValue: mockSignedUrlService,
        },
        {
          provide: HlsService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<CoursesService>(CoursesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getMyLearningOverview()', () => {
    const courseId1 = new Types.ObjectId();
    const mockCourses = [
      {
        _id: courseId1,
        name: 'Infrastructure Modeling with Revit',
        coverImage: 'revit-course.png',
        type: 'recorded',
        chapters: [
          {
            chapterCode: 'CH1',
            classes: [
              {
                _id: new Types.ObjectId('6a4ff504ce1858ef121d4751'),
                duration: '10:00',
              },
              {
                _id: new Types.ObjectId('6a4ff504ce1858ef121d4752'),
                duration: '15:00',
              },
            ],
          },
        ],
        toObject: () => ({
          _id: courseId1,
          name: 'Infrastructure Modeling with Revit',
          coverImage: 'revit-course.png',
          type: 'recorded',
          chapters: [
            {
              chapterCode: 'CH1',
              classes: [
                {
                  _id: new Types.ObjectId('6a4ff504ce1858ef121d4751'),
                  duration: '10:00',
                },
                {
                  _id: new Types.ObjectId('6a4ff504ce1858ef121d4752'),
                  duration: '15:00',
                },
              ],
            },
          ],
        }),
      },
    ];

    it('returns learning overview for a student user with atomic updateOne (no full-doc save)', async () => {
      const mockStudentUser = {
        _id: new Types.ObjectId(),
        email: 'student@zeitnah.com',
        role: 'student',
        primaryRole: 'STUDENT',
        course: [
          {
            courseId: courseId1,
            classProgress: [
              { classId: 'cls_1', completed: true, watchedSeconds: 300 },
              { classId: 'cls_2', completed: false, watchedSeconds: 120 },
            ],
          },
        ],
        gamification: {
          totalPoints: 150,
          completedCourses: 0,
          completedClasses: 1,
          totalWatchMinutes: 7,
          activityDates: ['2026-10-01'],
        },
      };

      mockUserModel.findById.mockResolvedValue(mockStudentUser);
      mockCourseModel.find.mockResolvedValue(mockCourses);

      const result = await service.getMyLearningOverview(
        mockStudentUser._id.toString(),
      );

      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.summary.totalCourses).toBe(1);
      expect(result.courses).toBeDefined();
      expect(mockUserModel.updateOne).toHaveBeenCalledWith(
        { _id: mockStudentUser._id },
        {
          $set: {
            course: mockStudentUser.course,
            gamification: mockStudentUser.gamification,
          },
        },
      );
    });

    it('handles educator / instructor user without Mongoose role validation error', async () => {
      const mockEducatorUser = {
        _id: new Types.ObjectId(),
        email: 'elena.rostova@zeitnah.test',
        role: 'teacher', // Canonical legacy role
        primaryRole: 'EDUCATOR',
        course: [],
        gamification: {
          totalPoints: 500,
          completedCourses: 0,
          completedClasses: 0,
          totalWatchMinutes: 0,
          activityDates: [],
        },
      };

      mockUserModel.findById.mockResolvedValue(mockEducatorUser);
      mockCourseModel.find.mockResolvedValue([]);

      const result = await service.getMyLearningOverview(
        mockEducatorUser._id.toString(),
      );

      expect(result).toBeDefined();
      expect(result.summary.totalCourses).toBe(0);
      expect(mockUserModel.updateOne).toHaveBeenCalled();
    });

    it('handles user with unmigrated legacy role without validation failure', async () => {
      // User with legacy alias in role path that would previously crash user.save()
      const mockLegacyUser = {
        _id: new Types.ObjectId(),
        email: 'legacy.educator@zeitnah.test',
        role: 'educator', // non-enum legacy string
        primaryRole: 'EDUCATOR',
        course: [],
        gamification: {
          totalPoints: 200,
          completedCourses: 0,
          completedClasses: 0,
          totalWatchMinutes: 0,
          activityDates: [],
        },
      };

      mockUserModel.findById.mockResolvedValue(mockLegacyUser);
      mockCourseModel.find.mockResolvedValue([]);

      // Because atomic updateOne is used, full-document validation on mockLegacyUser.role is not triggered
      const result = await service.getMyLearningOverview(
        mockLegacyUser._id.toString(),
      );

      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(mockUserModel.updateOne).toHaveBeenCalled();
    });

    it('throws NotFoundException when user is not found', async () => {
      mockUserModel.findById.mockResolvedValue(null);

      await expect(
        service.getMyLearningOverview(new Types.ObjectId().toString()),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getMyPointsOverview()', () => {
    it('returns gamification points overview via atomic updateOne', async () => {
      const mockUser = {
        _id: new Types.ObjectId(),
        email: 'user@zeitnah.com',
        role: 'student',
        primaryRole: 'STUDENT',
        course: [],
        gamification: {
          totalPoints: 350,
          level: 2,
          recentActivities: [],
        },
      };

      mockUserModel.findById.mockResolvedValue(mockUser);

      const result = await service.getMyPointsOverview(mockUser._id.toString());

      expect(result).toBeDefined();
      expect(result.gamification).toBeDefined();
      expect(mockUserModel.updateOne).toHaveBeenCalledWith(
        { _id: mockUser._id },
        {
          $set: {
            gamification: mockUser.gamification,
          },
        },
      );
    });
  });

  describe('getChapterById()', () => {
    it('resolves chapter by uniqueCode and returns chapter details with classes', async () => {
      const courseId = new Types.ObjectId();
      const mockCourse = {
        _id: courseId,
        name: 'Infrastructure Modeling with Revit',
        type: 'Recording',
        chapters: [
          {
            uniqueCode: 'CH-FOUNDATIONS',
            title: 'Foundations',
            classes: [
              {
                _id: new Types.ObjectId(),
                title: 'Introduction to Foundations',
                duration: '10:00',
              },
            ],
          },
        ],
      };

      mockCourseModel.findOne.mockResolvedValue(mockCourse);
      mockCourseModel.findById.mockResolvedValue(mockCourse);
      mockUserModel.findById.mockResolvedValue(null);

      const res = await service.getChapterById('CH-FOUNDATIONS');
      expect(res).toBeDefined();
      expect(res.chapter.title).toBe('Foundations');
      expect(res.classes.length).toBe(1);
    });

    it('throws NotFoundException when chapter does not exist', async () => {
      mockCourseModel.findOne.mockResolvedValue(null);
      await expect(service.getChapterById('NON-EXISTENT')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
