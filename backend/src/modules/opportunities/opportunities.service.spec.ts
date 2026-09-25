import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { OpportunitiesService } from './opportunities.service';
import {
  Opportunity,
  OpportunityType,
  OpportunityStatus,
  WorkMode,
  ExperienceLevel,
} from './schemas/opportunity.schema';
import { Organization } from '../organizations/schemas/organization.schema';
import {
  OrganizationMembership,
  OrganizationRole,
  MembershipStatus,
} from '../organizations/schemas/organization-membership.schema';
import { Types } from 'mongoose';

describe('OpportunitiesService', () => {
  let service: OpportunitiesService;
  let mockOppModel: any;
  let mockOrgModel: any;
  let mockMembershipModel: any;

  beforeEach(async () => {
    mockOppModel = {
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              populate: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue([
                  {
                    _id: new Types.ObjectId(),
                    title: 'Frontend Intern',
                    type: OpportunityType.INTERNSHIP,
                    workMode: WorkMode.REMOTE,
                    experienceLevel: ExperienceLevel.ENTRY,
                    status: OpportunityStatus.PUBLISHED,
                    organizationId: {
                      _id: new Types.ObjectId(),
                      name: 'Zeitnah Labs',
                    },
                  },
                ]),
              }),
            }),
          }),
        }),
      }),
      countDocuments: jest.fn().mockResolvedValue(1),
      findById: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            _id: new Types.ObjectId(),
            title: 'Frontend Intern',
            type: OpportunityType.INTERNSHIP,
            organizationId: {
              _id: new Types.ObjectId(),
              name: 'Zeitnah Labs',
            },
          }),
        }),
      }),
      create: jest
        .fn()
        .mockImplementation((dto) =>
          Promise.resolve({ _id: new Types.ObjectId(), ...dto }),
        ),
    };

    mockOrgModel = {};
    mockMembershipModel = {
      findOne: jest.fn().mockResolvedValue({
        role: OrganizationRole.RECRUITER,
        status: MembershipStatus.ACTIVE,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpportunitiesService,
        { provide: getModelToken(Opportunity.name), useValue: mockOppModel },
        { provide: getModelToken(Organization.name), useValue: mockOrgModel },
        {
          provide: getModelToken(OrganizationMembership.name),
          useValue: mockMembershipModel,
        },
      ],
    }).compile();

    service = module.get<OpportunitiesService>(OpportunitiesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should list opportunities', async () => {
    const res = await service.getOpportunities({});
    expect(res).toBeDefined();
    expect(res.data.length).toBe(1);
    expect(res.data[0].title).toBe('Frontend Intern');
  });

  it('should create an opportunity when authorized', async () => {
    const userId = new Types.ObjectId().toString();
    const orgId = new Types.ObjectId().toString();

    const res = await service.createOpportunity(userId, {
      organizationId: orgId,
      title: 'Full Stack Engineer',
      type: OpportunityType.JOB,
      description: 'Infrastructure web platform development',
      discipline: 'Civil Engineering',
      infrastructureSector: 'Buildings',
      location: 'Kochi, Kerala',
      workMode: 'Remote',
      jobType: 'Full-time',
      requiredSkills: ['AutoCAD', 'Node.js'],
      experienceLevel: ExperienceLevel.MID,
      status: OpportunityStatus.PUBLISHED,
    });

    expect(res).toBeDefined();
    expect(mockOppModel.create).toHaveBeenCalled();
  });
});
