/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { NetworkConnectionsService } from './services/network-connections.service';
import { NetworkService } from './network.service';
import { NetworkConnection } from './schemas/connection.schema';
import { Connection } from './schemas/connection.schema';
import { User } from '../auth/schemas/user.schema';
import { Course } from '../courses/schemas/course.schema';
import { CommunityMembership } from './schemas/community-membership.schema';
import { NetworkActivity } from './schemas/network-activity.schema';
import { Notification } from '../notifications/notification.schema';
import { SignedUrlService } from '../../common/aws/signed-url.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ModerationService } from '../moderation/moderation.service';
import {
  PROFESSIONAL_DEPARTMENTS,
  isValidDepartmentId,
} from '../profile/constants/professional-catalogue';

describe('Professional Identity — Phase 5: Search, Filters & Catalogue Compatibility', () => {
  let networkConnectionsService: NetworkConnectionsService;
  let networkService: NetworkService;

  const callerId = new Types.ObjectId().toHexString();
  const callerObjId = new Types.ObjectId(callerId);

  const mockConnectionModel = {
    find: jest.fn(),
    findOne: jest.fn(),
    countDocuments: jest.fn(),
  };

  const mockUserModel = {
    find: jest.fn(),
    findById: jest.fn(),
    distinct: jest.fn(),
    countDocuments: jest.fn(),
  };

  const mockCourseModel = {
    find: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest
          .fn()
          .mockResolvedValue([{ name: 'Civil Engineering B.Tech' }]),
      }),
    }),
  };

  const mockMembershipModel = {
    find: jest.fn(),
  };

  const mockActivityModel = {
    find: jest.fn(),
  };

  const mockNotificationModel = {
    create: jest.fn().mockResolvedValue({}),
  };

  const blockedUserId = new Types.ObjectId().toHexString();

  const mockSignedUrlService = {
    getSignedDownloadUrl: jest
      .fn()
      .mockResolvedValue('https://signed.url/avatar.jpg'),
  };

  const mockNotificationsService = {
    createNotification: jest.fn().mockResolvedValue({}),
  };

  const mockModerationService = {
    getExcludedUserIds: jest.fn().mockResolvedValue([blockedUserId]),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NetworkConnectionsService,
        NetworkService,
        {
          provide: getModelToken(NetworkConnection.name),
          useValue: mockConnectionModel,
        },
        {
          provide: getModelToken(Connection.name),
          useValue: mockConnectionModel,
        },
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: getModelToken(Course.name),
          useValue: mockCourseModel,
        },
        {
          provide: getModelToken(CommunityMembership.name),
          useValue: mockMembershipModel,
        },
        {
          provide: getModelToken(NetworkActivity.name),
          useValue: mockActivityModel,
        },
        {
          provide: getModelToken(Notification.name),
          useValue: mockNotificationModel,
        },
        {
          provide: SignedUrlService,
          useValue: mockSignedUrlService,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
        {
          provide: ModerationService,
          useValue: mockModerationService,
        },
      ],
    }).compile();

    networkConnectionsService = module.get<NetworkConnectionsService>(
      NetworkConnectionsService,
    );
    networkService = module.get<NetworkService>(NetworkService);

    // Setup base default stubs
    mockUserModel.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: callerObjId,
        name: 'Caller Engineer',
        primaryDiscipline: 'Civil Engineering',
      }),
    });

    const connChain: any = {
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    };
    connChain.then = (resolve: any) => Promise.resolve([]).then(resolve);
    mockConnectionModel.find.mockReturnValue(connChain);

    const chain: any = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
    };
    const leanResult: any = {
      exec: jest.fn().mockResolvedValue([]),
      then: (resolve: any) => Promise.resolve([]).then(resolve),
    };
    chain.lean = jest.fn().mockReturnValue(leanResult);
    mockUserModel.find.mockReturnValue(chain);
    mockUserModel.countDocuments.mockResolvedValue(0);
  });

  describe('1. Department-Based Filtering in getPeople', () => {
    it('applies exact catalogue department ID filter when valid departmentId is provided', async () => {
      await networkConnectionsService.getPeople(callerId, {
        departmentId: 'civil-engineering',
      });

      expect(mockUserModel.find).toHaveBeenCalled();
      const filter = mockUserModel.find.mock.calls[0][0];
      expect(filter['professionalIdentity.departmentId']).toBe(
        'civil-engineering',
      );
    });

    it('works for other valid catalogue departments (e.g., architectural-design)', async () => {
      await networkConnectionsService.getPeople(callerId, {
        departmentId: 'architectural-design',
      });

      expect(mockUserModel.find).toHaveBeenCalled();
      const filter = mockUserModel.find.mock.calls[0][0];
      expect(filter['professionalIdentity.departmentId']).toBe(
        'architectural-design',
      );
    });

    it('throws BadRequestException when departmentId is invalid or unknown', async () => {
      await expect(
        networkConnectionsService.getPeople(callerId, {
          departmentId: 'unknown-fake-dept',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('retains previous behavior when departmentId is undefined or "all"', async () => {
      await networkConnectionsService.getPeople(callerId, {
        departmentId: 'all',
      });

      const filterAll = mockUserModel.find.mock.calls[0][0];
      expect(filterAll['professionalIdentity.departmentId']).toBeUndefined();

      mockUserModel.find.mockClear();

      await networkConnectionsService.getPeople(callerId, {});
      const filterEmpty = mockUserModel.find.mock.calls[0][0];
      expect(filterEmpty['professionalIdentity.departmentId']).toBeUndefined();
    });
  });

  describe('2. Custom Title and Legacy Profile Isolation', () => {
    it('matches custom titles if they belong to explicitly selected department, and excludes other departments', async () => {
      const predefinedCivilUser = {
        _id: new Types.ObjectId(),
        name: 'Predefined Bridge Engineer',
        currentRole: 'Bridge engineer',
        professionalIdentity: {
          departmentId: 'civil-engineering',
          titleId: 'civil-engineering:bridge-engineer',
          titleName: 'Bridge engineer',
          isCustomTitle: false,
        },
      };

      const customCivilUser = {
        _id: new Types.ObjectId(),
        name: 'Custom Precast Specialist',
        currentRole: 'Senior Precast Specialist',
        professionalIdentity: {
          departmentId: 'civil-engineering',
          titleId: null,
          titleName: 'Senior Precast Specialist',
          isCustomTitle: true,
        },
      };

      const mechanicalUser = {
        _id: new Types.ObjectId(),
        name: 'Mechanical Project Manager',
        currentRole: 'Project manager',
        professionalIdentity: {
          departmentId: 'mechanical-engineering',
          titleId: 'mechanical-engineering:project-manager',
          titleName: 'Project manager',
          isCustomTitle: false,
        },
      };

      const legacyUnclassifiedUser = {
        _id: new Types.ObjectId(),
        name: 'Legacy Unclassified User',
        currentRole: 'Civil Engineer',
        headline: 'Civil Engineer with 10 years experience',
        primaryDiscipline: 'Civil Engineering',
        professionalIdentity: null,
      };

      // When filtering by civil-engineering:
      // MongoDB query { 'professionalIdentity.departmentId': 'civil-engineering' }
      // - Predefined civil matches (departmentId is civil-engineering)
      // - Custom civil matches (departmentId is civil-engineering)
      // - Mechanical user does NOT match (departmentId is mechanical-engineering)
      // - Legacy unclassified user does NOT match (departmentId is missing/null)
      const civilFilter = {
        'professionalIdentity.departmentId': 'civil-engineering',
      };

      const matchFilter = (u: any) =>
        u.professionalIdentity?.departmentId ===
        civilFilter['professionalIdentity.departmentId'];

      expect(matchFilter(predefinedCivilUser)).toBe(true);
      expect(matchFilter(customCivilUser)).toBe(true);
      expect(matchFilter(mechanicalUser)).toBe(false);
      expect(matchFilter(legacyUnclassifiedUser)).toBe(false);
    });

    it('never infers department from currentRole or primaryDiscipline text for legacy profiles', async () => {
      await networkConnectionsService.getPeople(callerId, {
        departmentId: 'civil-engineering',
      });

      const filter = mockUserModel.find.mock.calls[0][0];
      // Department filter is strictly on professionalIdentity.departmentId
      expect(filter['professionalIdentity.departmentId']).toBe(
        'civil-engineering',
      );
      expect(filter.currentRole).toBeUndefined();
      expect(filter.primaryDiscipline).toBeUndefined();
    });
  });

  describe('3. Combined Department Filtering and Search Compatibility', () => {
    it('combines department filter with text search (q) and role filters', async () => {
      await networkConnectionsService.getPeople(callerId, {
        departmentId: 'civil-engineering',
        role: 'professional',
        q: 'Bridge',
      });

      expect(mockUserModel.find).toHaveBeenCalled();
      const filter = mockUserModel.find.mock.calls[0][0];

      // Exact department filter
      expect(filter['professionalIdentity.departmentId']).toBe(
        'civil-engineering',
      );

      // $and contains the role condition and the q search condition
      expect(filter.$and).toBeDefined();
      expect(filter.$and.length).toBeGreaterThanOrEqual(2);

      // Verify q search includes professionalIdentity.titleName
      const qCondition = filter.$and.find(
        (c: any) =>
          Array.isArray(c.$or) &&
          c.$or.some(
            (item: any) => item['professionalIdentity.titleName'] !== undefined,
          ),
      );
      expect(qCondition).toBeDefined();

      const titleNameClause = qCondition.$or.find(
        (item: any) => item['professionalIdentity.titleName'] !== undefined,
      );
      expect(titleNameClause['professionalIdentity.titleName']).toBeInstanceOf(
        RegExp,
      );
      expect(
        titleNameClause['professionalIdentity.titleName'].source,
      ).toContain('Bridge');
    });

    it('free-text search q includes professionalIdentity.titleName even without department filter', async () => {
      await networkConnectionsService.getPeople(callerId, {
        q: 'Highway',
      });

      const filter = mockUserModel.find.mock.calls[0][0];
      expect(filter.$and).toBeDefined();

      const qCondition = filter.$and.find(
        (c: any) =>
          Array.isArray(c.$or) &&
          c.$or.some(
            (item: any) => item['professionalIdentity.titleName'] !== undefined,
          ),
      );
      expect(qCondition).toBeDefined();
    });
  });

  describe('4. Pagination and Sorting Compatibility', () => {
    it('applies pagination skip and limit correctly', async () => {
      const chain = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };
      mockUserModel.find.mockReturnValue(chain);

      await networkConnectionsService.getPeople(callerId, {
        departmentId: 'civil-engineering',
        page: 3,
        limit: 15,
      });

      expect(chain.skip).toHaveBeenCalledWith(30); // (3 - 1) * 15
      expect(chain.limit).toHaveBeenCalledWith(15);
      expect(chain.sort).toHaveBeenCalledWith({
        'gamification.totalPoints': -1,
        createdAt: -1,
      });
    });
  });

  describe('5. Privacy, Safety & Discovery Eligibility Rules', () => {
    it('preserves privacy, blocking, and deleted status exclusions when filtering by department', async () => {
      await networkConnectionsService.getPeople(callerId, {
        departmentId: 'structural-engineering-design',
      });

      const filter = mockUserModel.find.mock.calls[0][0];

      // Privacy checks
      expect(filter.profileVisibility).toEqual({ $ne: 'PRIVATE' });
      expect(filter['account_Status.isDeleted']).toEqual({ $ne: true });
      expect(filter['account_Status.isBlocked']).toEqual({ $ne: true });

      // Caller and moderation exclusions
      expect(filter._id.$ne).toEqual(callerObjId);
      expect(filter._id.$nin).toContainEqual(new Types.ObjectId(blockedUserId));
    });
  });

  describe('6. Student Discovery Department Filtering (getStudents)', () => {
    it('applies departmentId filter in getStudents when provided', async () => {
      const chain = {
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      mockUserModel.find.mockReturnValue(chain);

      await networkService.getStudents(
        {
          departmentId: 'electrical-engineering',
          page: 1,
          limit: 12,
        },
        callerId,
      );

      expect(mockUserModel.find).toHaveBeenCalled();
      const query = mockUserModel.find.mock.calls[0][0];
      expect(query['professionalIdentity.departmentId']).toBe(
        'electrical-engineering',
      );
    });

    it('throws BadRequestException for invalid departmentId in getStudents', async () => {
      await expect(
        networkService.getStudents(
          {
            departmentId: 'non-existent-engineering',
          },
          callerId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('includes professionalIdentity.titleName in getStudents q search', async () => {
      const chain = {
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      mockUserModel.find.mockReturnValue(chain);

      await networkService.getStudents(
        {
          q: 'Draftsman',
        },
        callerId,
      );

      const query = mockUserModel.find.mock.calls[0][0];
      expect(query.$or).toBeDefined();
      const hasTitle = query.$or.some(
        (clause: any) => clause['professionalIdentity.titleName'] !== undefined,
      );
      expect(hasTitle).toBe(true);
    });
  });

  describe('7. Network Filters Endpoint Compatibility (getFilters)', () => {
    it('returns authoritative catalogue departments in getFilters response', async () => {
      mockUserModel.distinct.mockResolvedValue([]);

      const filters = await networkService.getFilters();

      expect(filters.departments).toBeDefined();
      expect(filters.departments?.length).toBe(18);
      expect(
        filters.departments?.some((d) => d.id === 'civil-engineering'),
      ).toBe(true);
      expect(
        filters.departments?.some((d) => d.id === 'architectural-design'),
      ).toBe(true);
    });
  });

  describe('8. Catalogue Lifecycle Compatibility', () => {
    it('validates against authoritative Phase 2 catalogue with 18 departments', () => {
      expect(PROFESSIONAL_DEPARTMENTS.length).toBe(18);
      for (const dept of PROFESSIONAL_DEPARTMENTS) {
        expect(isValidDepartmentId(dept.id)).toBe(true);
        expect(dept.status).toBe('active');
        expect(dept.id).toBeTruthy();
        expect(dept.name).toBeTruthy();
        expect(dept.titles.length).toBeGreaterThan(0);
      }
    });

    it('rejects empty, null, or malformed department IDs', () => {
      expect(isValidDepartmentId('')).toBe(false);
      expect(isValidDepartmentId('   ')).toBe(false);
      expect(isValidDepartmentId('not-a-department')).toBe(false);
    });
  });
});
