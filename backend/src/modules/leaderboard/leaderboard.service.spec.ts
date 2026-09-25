import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { LeaderboardService } from './leaderboard.service';
import { User } from '../auth/schemas/user.schema';
import { Course } from '../courses/schemas/course.schema';
import { SignedUrlService } from '../../common/aws/signed-url.service';

describe('LeaderboardService', () => {
  let service: LeaderboardService;
  let mockUserModel: any;
  let mockCourseModel: any;
  let mockSignedUrlService: any;

  beforeEach(async () => {
    mockUserModel = {
      find: jest.fn(),
      findById: jest.fn(),
      countDocuments: jest.fn(),
      aggregate: jest.fn(),
    };

    mockCourseModel = {
      find: jest.fn(),
      findById: jest.fn(),
    };

    mockSignedUrlService = {
      generateSignedImageUrl: jest
        .fn()
        .mockImplementation((url) => Promise.resolve(`signed-${url}`)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeaderboardService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: getModelToken(Course.name),
          useValue: mockCourseModel,
        },
        {
          provide: SignedUrlService,
          useValue: mockSignedUrlService,
        },
      ],
    }).compile();

    service = module.get<LeaderboardService>(LeaderboardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getGlobalLeaderboard', () => {
    it('should return global leaderboard with top podium and current student rank', async () => {
      const mockLearners = [
        {
          _id: 'user-1',
          name: 'Alice',
          username: 'alice',
          avatar: 'avatars/alice.jpg',
          gamification: {
            totalPoints: 5000,
            level: 7,
            rank: 'Master',
            completedClasses: 50,
            completedCourses: 2,
          },
          account_Status: { isVerified: true },
        },
        {
          _id: 'user-2',
          name: 'Bob',
          username: 'bob',
          avatar: 'avatars/bob.jpg',
          gamification: {
            totalPoints: 3500,
            level: 6,
            rank: 'Expert',
            completedClasses: 35,
            completedCourses: 1,
          },
          account_Status: { isVerified: false },
        },
      ];

      // mockUserModel.aggregate is called for learners, rawPodium, and ahead count in getStudentGlobalRank
      mockUserModel.aggregate
        .mockResolvedValueOnce(mockLearners) // learners
        .mockResolvedValueOnce(mockLearners) // rawPodium
        .mockResolvedValueOnce([{ count: 0 }]); // ahead count in getStudentGlobalRank

      mockUserModel.countDocuments
        .mockResolvedValueOnce(2) // total matching
        .mockResolvedValueOnce(2); // total eligible

      mockUserModel.findById.mockResolvedValue({
        _id: 'user-1',
        name: 'Alice',
        username: 'alice',
        gamification: {
          totalPoints: 5000,
          level: 7,
          rank: 'Master',
          completedClasses: 50,
          completedCourses: 2,
        },
      });

      const result = await service.getGlobalLeaderboard({}, 'user-1');

      expect(result.learners).toHaveLength(2);
      expect(result.topPodium).toHaveLength(2);
      expect(result.topPodium[0].points).toBe(5000);
      expect(result.topPodium[0].isYou).toBe(true);
      expect(result.topPodium[0].avatar).toBe('signed-avatars/alice.jpg');
      expect(result.currentStudent?.rank).toBe(1);
      expect(result.currentStudent?.points).toBe(5000);
    });
  });

  describe('getMyCoursesLeaderboard', () => {
    it('should compute course XP and rank for enrolled courses', async () => {
      const mockUser = {
        _id: 'user-1',
        course: [
          {
            courseId: 'course-101',
            learningProgress: {
              totalClasses: 10,
              completedClasses: 5,
              completionPercent: 50,
            },
            classProgress: [
              { classId: 'cls-1', watchedSeconds: 3600, completed: true },
              { classId: 'cls-2', watchedSeconds: 1800, completed: true },
            ],
          },
        ],
      };

      mockUserModel.findById.mockResolvedValue(mockUser);
      mockCourseModel.find.mockResolvedValue([
        {
          _id: 'course-101',
          name: 'Quantity Surveying',
          coverImage: 'course.jpg',
          type: 'Recording',
        },
      ]);

      const mockEnrolledStudents = [
        {
          _id: 'user-1',
          createdAt: new Date('2025-01-01'),
          course: mockUser.course,
        },
      ];

      mockUserModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockEnrolledStudents),
      });

      const result = await service.getMyCoursesLeaderboard('user-1');

      expect(result.courses).toHaveLength(1);
      const c = result.courses[0];
      expect(c.courseName).toBe('Quantity Surveying');
      expect(c.currentStudent.completedClasses).toBe(5);
      // watch minutes = (3600 + 1800)/60 = 90 min = 90 XP
      // completed classes = 5 * 25 = 125 XP
      // Total course XP = 90 + 125 = 215 XP
      expect(c.currentStudent.courseXp).toBe(215);
      expect(c.currentStudent.rank).toBe(1);
    });
  });
});
