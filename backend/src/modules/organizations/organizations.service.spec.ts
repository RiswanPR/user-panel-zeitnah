import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { OrganizationsService } from './organizations.service';
import { Organization, OrganizationType, OrganizationVerificationStatus } from './schemas/organization.schema';
import { OrganizationMembership, OrganizationRole, MembershipStatus } from './schemas/organization-membership.schema';
import { User } from '../auth/schemas/user.schema';
import { Types } from 'mongoose';

describe('OrganizationsService', () => {
  let service: OrganizationsService;
  let mockOrgModel: any;
  let mockMembershipModel: any;
  let mockUserModel: any;

  beforeEach(async () => {
    mockOrgModel = {
      findOne: jest.fn().mockImplementation(() => ({
        lean: jest.fn().mockResolvedValue({
          _id: new Types.ObjectId(),
          name: 'Zeitnah Labs',
          slug: 'zeitnah-labs',
          type: OrganizationType.STARTUP,
        }),
      })),
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue([
                {
                  _id: new Types.ObjectId(),
                  name: 'Zeitnah Labs',
                  slug: 'zeitnah-labs',
                },
              ]),
            }),
          }),
        }),
      }),
      countDocuments: jest.fn().mockResolvedValue(1),
      create: jest.fn().mockImplementation((dto) => Promise.resolve({ _id: new Types.ObjectId(), ...dto })),
    };

    mockMembershipModel = {
      create: jest.fn().mockImplementation((dto) => Promise.resolve({ _id: new Types.ObjectId(), ...dto })),
      findOne: jest.fn().mockResolvedValue({
        role: OrganizationRole.OWNER,
        status: MembershipStatus.ACTIVE,
      }),
      aggregate: jest.fn().mockResolvedValue([]),
      countDocuments: jest.fn().mockResolvedValue(5),
    };

    mockUserModel = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        { provide: getModelToken(Organization.name), useValue: mockOrgModel },
        { provide: getModelToken(OrganizationMembership.name), useValue: mockMembershipModel },
        { provide: getModelToken(User.name), useValue: mockUserModel },
      ],
    }).compile();

    service = module.get<OrganizationsService>(OrganizationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should list organizations', async () => {
    const res = await service.getOrganizations({});
    expect(res).toBeDefined();
    expect(res.data.length).toBe(1);
    expect(res.total).toBe(1);
  });

  it('should get organization by slug', async () => {
    const res = await service.getOrganizationBySlug('zeitnah-labs');
    expect(res).toBeDefined();
    expect(res.name).toBe('Zeitnah Labs');
    expect(res.memberCount).toBe(5);
  });
});
