import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { CatalogueTitleRequestService } from './catalogue-title-request.service';
import { CatalogueTitleRequest } from '../schemas/catalogue-title-request.schema';
import { ProfessionalCatalogueService } from './professional-catalogue.service';

describe('CatalogueTitleRequestService (Phase 3 & Phase 6)', () => {
  let service: CatalogueTitleRequestService;
  let mockRequestModel: any;
  let mockCatalogueService: any;
  let storedRequests: any[] = [];

  const mockDepartment = {
    id: 'civil-engineering',
    name: 'Civil Engineering',
    status: 'active',
    titles: [
      {
        id: 'civil-engineering:site-engineer',
        label: 'Site Engineer',
        status: 'active',
        aliases: ['Field Engineer'],
      },
      {
        id: 'civil-engineering:structural-engineer',
        label: 'Structural Engineer',
        status: 'active',
        aliases: [],
      },
    ],
  };

  const mockRetiredDepartment = {
    id: 'retired-dept',
    name: 'Retired Department',
    status: 'retired',
    titles: [],
  };

  beforeEach(async () => {
    storedRequests = [];

    mockRequestModel = {
      create: jest.fn().mockImplementation(async (doc) => {
        const item = { ...doc, _id: 'mock_mongo_id_' + Date.now() };
        storedRequests.push(item);
        return item;
      }),
      findOne: jest.fn().mockImplementation((query) => {
        return {
          exec: jest.fn().mockImplementation(async () => {
            return (
              storedRequests.find((r) => {
                return Object.entries(query).every(([k, v]) => r[k] === v);
              }) || null
            );
          }),
        };
      }),
      countDocuments: jest.fn().mockImplementation((query) => {
        return {
          exec: jest.fn().mockImplementation(async () => {
            return storedRequests.filter((r) => {
              return Object.entries(query).every(([k, v]) => r[k] === v);
            }).length;
          }),
        };
      }),
      find: jest.fn().mockImplementation((query) => {
        return {
          sort: jest.fn().mockReturnValue({
            lean: jest.fn().mockReturnValue({
              exec: jest.fn().mockImplementation(async () => {
                return storedRequests.filter((r) => {
                  return Object.entries(query).every(([k, v]) => r[k] === v);
                });
              }),
            }),
          }),
        };
      }),
    };

    mockCatalogueService = {
      getDepartment: jest.fn().mockImplementation((deptId: string) => {
        if (deptId === 'civil-engineering') return mockDepartment;
        if (deptId === 'retired-dept') return mockRetiredDepartment;
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogueTitleRequestService,
        {
          provide: getModelToken(CatalogueTitleRequest.name),
          useValue: mockRequestModel,
        },
        {
          provide: ProfessionalCatalogueService,
          useValue: mockCatalogueService,
        },
      ],
    }).compile();

    service = module.get<CatalogueTitleRequestService>(
      CatalogueTitleRequestService,
    );
  });

  describe('1. Normalization & Input Validation', () => {
    it('normalizes titles correctly by trimming, lowercasing, and collapsing spaces', () => {
      expect(
        CatalogueTitleRequestService.normalizeTitle(
          '   Bridge   Design   Engineer   ',
        ),
      ).toBe('bridge design engineer');
    });

    it('rejects submission with empty title label', async () => {
      await expect(
        service.createRequest(
          { userId: 'user-1' },
          { departmentId: 'civil-engineering', title: '   ' },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects title label shorter than 2 characters', async () => {
      await expect(
        service.createRequest(
          { userId: 'user-1' },
          { departmentId: 'civil-engineering', title: 'A' },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects title label exceeding 100 characters', async () => {
      const longTitle = 'A'.repeat(101);
      await expect(
        service.createRequest(
          { userId: 'user-1' },
          { departmentId: 'civil-engineering', title: longTitle },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects title label containing HTML tags', async () => {
      await expect(
        service.createRequest(
          { userId: 'user-1' },
          {
            departmentId: 'civil-engineering',
            title: '<script>alert(1)</script> Engineer',
          },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects title label containing newlines', async () => {
      await expect(
        service.createRequest(
          { userId: 'user-1' },
          {
            departmentId: 'civil-engineering',
            title: 'Highway\nEngineer',
          },
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('2. Department Scoping & Protection', () => {
    it('rejects request for non-existent department', async () => {
      await expect(
        service.createRequest(
          { userId: 'user-1' },
          {
            departmentId: 'quantum-computing',
            title: 'Quantum Systems Engineer',
          },
        ),
      ).rejects.toThrow(/not found or is currently inactive/);
    });

    it('rejects request for retired department', async () => {
      await expect(
        service.createRequest(
          { userId: 'user-1' },
          {
            departmentId: 'retired-dept',
            title: 'Senior Specialist',
          },
        ),
      ).rejects.toThrow(/not found or is currently inactive/);
    });
  });

  describe('3. Existing Title & Alias Detection', () => {
    it('detects and rejects titles that already exist in the department catalogue (exact match)', async () => {
      await expect(
        service.createRequest(
          { userId: 'user-1' },
          {
            departmentId: 'civil-engineering',
            title: 'Site Engineer',
          },
        ),
      ).rejects.toThrow(
        /Title "Site Engineer" already exists in the Civil Engineering department catalogue/,
      );
    });

    it('detects and rejects existing titles with different casing and whitespace', async () => {
      await expect(
        service.createRequest(
          { userId: 'user-1' },
          {
            departmentId: 'civil-engineering',
            title: '   site   engineer   ',
          },
        ),
      ).rejects.toThrow(
        /already exists in the Civil Engineering department catalogue/,
      );
    });

    it('detects and rejects title that matches an existing title alias', async () => {
      await expect(
        service.createRequest(
          { userId: 'user-1' },
          {
            departmentId: 'civil-engineering',
            title: 'Field Engineer',
          },
        ),
      ).rejects.toThrow(
        /matches existing catalogue title "Site Engineer" \(alias\) in Civil Engineering/,
      );
    });
  });

  describe('4. Duplicate Pending Request Detection', () => {
    it('successfully creates a valid custom title request', async () => {
      const result = await service.createRequest(
        {
          userId: 'user-100',
          name: 'Jane Doe',
          email: 'jane@example.com',
        },
        {
          departmentId: 'civil-engineering',
          title: 'Coastal Protection Engineer',
        },
      );

      expect(result).toBeDefined();
      expect(result.id).toMatch(/^req_/);
      expect(result.requestedTitle).toBe('Coastal Protection Engineer');
      expect(result.normalizedTitle).toBe('coastal protection engineer');
      expect(result.status).toBe('pending');
      expect(result.userId).toBe('user-100');
      expect(result.departmentId).toBe('civil-engineering');
      expect(result.departmentName).toBe('Civil Engineering');
      expect(result.reviewedAt).toBeNull();
      expect(result.createdTitleId).toBeNull();
    });

    it('rejects duplicate pending request for the same title and department', async () => {
      // First submission
      await service.createRequest(
        { userId: 'user-1' },
        {
          departmentId: 'civil-engineering',
          title: 'Tunnel Boring Specialist',
        },
      );

      // Second submission with varied whitespace and case
      await expect(
        service.createRequest(
          { userId: 'user-2' },
          {
            departmentId: 'civil-engineering',
            title: '   tunnel   boring   specialist   ',
          },
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('5. Abuse Prevention & User Rate Limiting', () => {
    it('prevents user from submitting more than 10 pending requests', async () => {
      // Pre-populate 10 pending requests for user-1
      for (let i = 1; i <= 10; i++) {
        storedRequests.push({
          id: `req_${i}`,
          userId: 'spammer-user',
          departmentId: 'civil-engineering',
          normalizedTitle: `unique role ${i}`,
          status: 'pending',
        });
      }

      await expect(
        service.createRequest(
          { userId: 'spammer-user' },
          {
            departmentId: 'civil-engineering',
            title: 'One Too Many Role',
          },
        ),
      ).rejects.toThrow(/maximum limit of 10 pending title requests/);
    });

    it('allows submission when prior requests are approved or rejected', async () => {
      // 10 approved requests
      for (let i = 1; i <= 10; i++) {
        storedRequests.push({
          id: `req_approved_${i}`,
          userId: 'good-user',
          departmentId: 'civil-engineering',
          normalizedTitle: `past role ${i}`,
          status: 'approved',
        });
      }

      const res = await service.createRequest(
        { userId: 'good-user' },
        {
          departmentId: 'civil-engineering',
          title: 'Fresh New Proposal',
        },
      );

      expect(res.status).toBe('pending');
    });
  });

  describe('6. User History & Zero Direct Mutation Invariant', () => {
    it('returns only the requesting user requests', async () => {
      storedRequests.push(
        {
          id: 'req_a',
          userId: 'user-a',
          requestedTitle: 'Title A',
          status: 'pending',
        },
        {
          id: 'req_b',
          userId: 'user-b',
          requestedTitle: 'Title B',
          status: 'pending',
        },
      );

      const userARequests = await service.getUserRequests('user-a');
      expect(userARequests.length).toBe(1);
      expect(userARequests[0].requestedTitle).toBe('Title A');
    });

    it('does not insert into catalogue_titles upon request creation', async () => {
      // Calling createRequest must only write to catalogue_title_requests model
      await service.createRequest(
        { userId: 'user-test' },
        {
          departmentId: 'civil-engineering',
          title: 'Harbor Infrastructure Engineer',
        },
      );

      expect(mockRequestModel.create).toHaveBeenCalledTimes(1);
      // catalogueService must have zero write calls
      expect(mockCatalogueService.getDepartment).toHaveBeenCalledWith(
        'civil-engineering',
      );
    });
  });
});
