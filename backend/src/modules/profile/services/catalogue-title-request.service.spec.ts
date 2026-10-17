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
        let skipVal = 0;
        let limitVal = Infinity;
        const chain: any = {
          sort: jest.fn().mockImplementation(() => chain),
          skip: jest.fn().mockImplementation((s: number) => {
            skipVal = s;
            return chain;
          }),
          limit: jest.fn().mockImplementation((l: number) => {
            limitVal = l;
            return chain;
          }),
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockImplementation(async () => {
              const matched = storedRequests.filter((r) => {
                return Object.entries(query).every(([k, v]) => r[k] === v);
              });
              return matched.slice(skipVal, skipVal + limitVal);
            }),
          }),
        };
        return chain;
      }),
    };

    mockCatalogueService = {
      getDepartment: jest.fn().mockImplementation((deptId: string) => {
        if (deptId === 'civil-engineering') return mockDepartment;
        if (deptId === 'retired-dept') return mockRetiredDepartment;
        return undefined;
      }),
      getTitle: jest.fn().mockImplementation((deptId: string, titleId: string) => {
        if (deptId === 'civil-engineering' && titleId === 'geothermal-specialist') {
          return { id: 'geothermal-specialist', label: 'Geothermal Specialist', status: 'active' };
        }
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

    it('rejects title label containing control characters', async () => {
      await expect(
        service.createRequest(
          { userId: 'user-1' },
          {
            departmentId: 'civil-engineering',
            title: 'Highway\tEngineer',
          },
        ),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.createRequest(
          { userId: 'user-1' },
          {
            departmentId: 'civil-engineering',
            title: 'Highway\x00Engineer',
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

    it('rejects request if an equivalent title request has already been approved', async () => {
      storedRequests.push({
        id: 'req_approved_spec',
        userId: 'other-user',
        departmentId: 'civil-engineering',
        normalizedTitle: 'geotechnical lead',
        status: 'approved',
      });

      await expect(
        service.createRequest(
          { userId: 'user-1' },
          {
            departmentId: 'civil-engineering',
            title: 'Geotechnical Lead',
          },
        ),
      ).rejects.toThrow(
        /A request for title "Geotechnical Lead" in Civil Engineering has already been approved/,
      );
    });

    it('translates MongoDB duplicate key error (code 11000) into ConflictException', async () => {
      mockRequestModel.create.mockRejectedValueOnce({
        code: 11000,
        message: 'E11000 duplicate key error',
      });

      await expect(
        service.createRequest(
          { userId: 'user-1' },
          {
            departmentId: 'civil-engineering',
            title: 'Race Condition Role',
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

    it('supports pagination options when querying user requests', async () => {
      for (let i = 1; i <= 5; i++) {
        storedRequests.push({
          id: `req_page_${i}`,
          userId: 'paginated-user',
          requestedTitle: `Paginated Title ${i}`,
          status: 'pending',
        });
      }

      const page1 = await service.getUserRequests('paginated-user', {
        page: 1,
        limit: 2,
      });
      expect(page1.length).toBe(2);

      const page2 = await service.getUserRequests('paginated-user', {
        page: 2,
        limit: 2,
      });
      expect(page2.length).toBe(2);

      const page3 = await service.getUserRequests('paginated-user', {
        page: 3,
        limit: 2,
      });
      expect(page3.length).toBe(1);
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

  describe('Phase 6: findOrCreateOrReuseRequest (Idempotent Request Operation)', () => {
    it('creates a new pending request when custom title is unique', async () => {
      const res = await service.findOrCreateOrReuseRequest(
        { userId: 'user-p6-1', name: 'Alice', email: 'alice@zeitnah.com' },
        'civil-engineering',
        'Coastal Protection Specialist',
      );

      expect(res.action).toBe('CREATED_PENDING');
      expect(res.isNew).toBe(true);
      expect(res.reused).toBe(false);
      expect(res.isOfficialTitle).toBe(false);
      expect(res.request).toBeDefined();
      expect(res.request?.requestedTitle).toBe('Coastal Protection Specialist');
      expect(res.request?.normalizedTitle).toBe('coastal protection specialist');
      expect(res.request?.status).toBe('pending');
    });

    it('reuses existing pending request when the same user submits repeatedly', async () => {
      const res1 = await service.findOrCreateOrReuseRequest(
        { userId: 'user-p6-1' },
        'civil-engineering',
        'Deep Tunnel Engineer',
      );
      expect(res1.action).toBe('CREATED_PENDING');
      expect(res1.isNew).toBe(true);

      const res2 = await service.findOrCreateOrReuseRequest(
        { userId: 'user-p6-1' },
        'civil-engineering',
        '  deep   tunnel   engineer  ',
      );
      expect(res2.action).toBe('REUSED_PENDING');
      expect(res2.isNew).toBe(false);
      expect(res2.reused).toBe(true);
      expect(res2.request?.id).toBe(res1.request?.id);
    });

    it('reuses existing pending request when a second user submits the same title in the same department', async () => {
      const resA = await service.findOrCreateOrReuseRequest(
        { userId: 'user-p6-alice' },
        'civil-engineering',
        'Offshore Port Engineer',
      );
      expect(resA.action).toBe('CREATED_PENDING');

      const resB = await service.findOrCreateOrReuseRequest(
        { userId: 'user-p6-bob' },
        'civil-engineering',
        'Offshore Port Engineer',
      );
      expect(resB.action).toBe('REUSED_PENDING');
      expect(resB.isNew).toBe(false);
      expect(resB.reused).toBe(true);
      expect(resB.request?.id).toBe(resA.request?.id);
      // Preserves original requester's userId
      expect(resB.request?.userId).toBe('user-p6-alice');
    });

    it('resolves directly to official title when matching active catalogue title or alias without creating request', async () => {
      // Matches Site Engineer in mockDepartment
      const resExact = await service.findOrCreateOrReuseRequest(
        { userId: 'user-p6-1' },
        'civil-engineering',
        'site engineer',
      );

      expect(resExact.action).toBe('OFFICIAL_TITLE_EXISTS');
      expect(resExact.isOfficialTitle).toBe(true);
      expect(resExact.resolvedTitleId).toBe('civil-engineering:site-engineer');
      expect(resExact.resolvedTitleName).toBe('Site Engineer');
      expect(resExact.request).toBeNull();

      // Matches alias 'Field Engineer'
      const resAlias = await service.findOrCreateOrReuseRequest(
        { userId: 'user-p6-1' },
        'civil-engineering',
        'FIELD ENGINEER',
      );

      expect(resAlias.action).toBe('OFFICIAL_TITLE_EXISTS');
      expect(resAlias.isOfficialTitle).toBe(true);
      expect(resAlias.resolvedTitleId).toBe('civil-engineering:site-engineer');
      expect(resAlias.resolvedTitleName).toBe('Site Engineer');
      expect(resAlias.request).toBeNull();
    });

    it('returns ALREADY_APPROVED when title was previously approved and resolves title ID', async () => {
      storedRequests.push({
        id: 'req_prev_approved',
        userId: 'user_prior',
        departmentId: 'civil-engineering',
        requestedTitle: 'Geothermal Specialist',
        normalizedTitle: 'geothermal specialist',
        status: 'approved',
        createdTitleId: 'civil-engineering:geothermal-specialist',
      });

      const res = await service.findOrCreateOrReuseRequest(
        { userId: 'user-p6-new' },
        'civil-engineering',
        'Geothermal Specialist',
      );

      expect(res.action).toBe('ALREADY_APPROVED');
      expect(res.isOfficialTitle).toBe(true);
      expect(res.resolvedTitleId).toBe('civil-engineering:geothermal-specialist');
      expect(res.request?.id).toBe('req_prev_approved');
    });

    it('preserves rejected request history and creates a fresh pending request', async () => {
      storedRequests.push({
        id: 'req_prior_rejected',
        userId: 'user_prior',
        departmentId: 'civil-engineering',
        requestedTitle: 'Bridge Painting Specialist',
        normalizedTitle: 'bridge painting specialist',
        status: 'rejected',
        reviewNote: 'Too specific for infrastructure catalogue',
      });

      const res = await service.findOrCreateOrReuseRequest(
        { userId: 'user-p6-new' },
        'civil-engineering',
        'Bridge Painting Specialist',
      );

      expect(res.action).toBe('CREATED_PENDING');
      expect(res.isNew).toBe(true);
      expect(res.request?.id).not.toBe('req_prior_rejected');
      expect(res.request?.status).toBe('pending');

      // The rejected record remains preserved in the database
      const rejectedDoc = storedRequests.find((r) => r.id === 'req_prior_rejected');
      expect(rejectedDoc).toBeDefined();
      expect(rejectedDoc.status).toBe('rejected');
    });

    it('recovers from concurrent duplicate-key error (11000) by looking up winning pending request', async () => {
      const winningDoc = {
        id: 'req_winning_concurrent',
        userId: 'user_concurrent_winner',
        departmentId: 'civil-engineering',
        requestedTitle: 'Dam Safety Specialist',
        normalizedTitle: 'dam safety specialist',
        status: 'pending',
      };

      // Mock create to simulate code 11000 duplicate key race condition
      mockRequestModel.create.mockImplementationOnce(async () => {
        // Insert winning doc into store just before throwing
        storedRequests.push(winningDoc);
        const dupErr: any = new Error('E11000 duplicate key error');
        dupErr.code = 11000;
        throw dupErr;
      });

      const res = await service.findOrCreateOrReuseRequest(
        { userId: 'user_concurrent_loser' },
        'civil-engineering',
        'Dam Safety Specialist',
      );

      expect(res.action).toBe('REUSED_PENDING');
      expect(res.isNew).toBe(false);
      expect(res.reused).toBe(true);
      expect(res.request?.id).toBe('req_winning_concurrent');
      expect(res.request?.userId).toBe('user_concurrent_winner');
    });

    it('rejects invalid title strings and inactive department', async () => {
      await expect(
        service.findOrCreateOrReuseRequest(
          { userId: 'u1' },
          'civil-engineering',
          '   ',
        ),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.findOrCreateOrReuseRequest(
          { userId: 'u1' },
          'civil-engineering',
          'A',
        ),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.findOrCreateOrReuseRequest(
          { userId: 'u1' },
          'civil-engineering',
          'Title<script>alert(1)</script>',
        ),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.findOrCreateOrReuseRequest(
          { userId: 'u1' },
          'retired-dept',
          'Valid Custom Title',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('enforces maximum 10 pending requests per user for new submissions', async () => {
      for (let i = 0; i < 10; i++) {
        storedRequests.push({
          id: `req_user_limit_${i}`,
          userId: 'user-at-limit',
          departmentId: 'civil-engineering',
          requestedTitle: `Limit Title ${i}`,
          normalizedTitle: `limit title ${i}`,
          status: 'pending',
        });
      }

      await expect(
        service.findOrCreateOrReuseRequest(
          { userId: 'user-at-limit' },
          'civil-engineering',
          'Eleventh Custom Title',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
