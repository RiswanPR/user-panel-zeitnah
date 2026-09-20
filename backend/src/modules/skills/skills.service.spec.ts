import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { SkillsService } from './skills.service';
import { Skill, SkillStatus } from './schemas/skill.schema';
import { UserSkill, SkillProficiency, SkillSource, SkillVisibility } from './schemas/user-skill.schema';
import { SkillProof, ProofSourceType, ProofStatus } from './schemas/skill-proof.schema';
import { Types } from 'mongoose';

describe('SkillsService', () => {
  let service: SkillsService;
  let mockSkillModel: any;
  let mockUserSkillModel: any;
  let mockSkillProofModel: any;

  beforeEach(async () => {
    mockSkillModel = {
      countDocuments: jest.fn().mockResolvedValue(10),
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([
              { _id: new Types.ObjectId(), name: 'React', slug: 'react', category: 'Engineering' },
            ]),
          }),
        }),
      }),
      findOne: jest.fn().mockResolvedValue({
        _id: new Types.ObjectId(),
        name: 'React',
        slug: 'react',
      }),
      create: jest.fn().mockImplementation((dto) => Promise.resolve({ _id: new Types.ObjectId(), ...dto })),
    };

    mockUserSkillModel = {
      find: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            {
              _id: new Types.ObjectId(),
              skillId: { _id: new Types.ObjectId(), name: 'React', slug: 'react', category: 'Engineering' },
              proficiency: SkillProficiency.ADVANCED,
              source: SkillSource.CLAIMED,
              visibility: SkillVisibility.PUBLIC,
            },
          ]),
        }),
      }),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((dto) => Promise.resolve({ _id: new Types.ObjectId(), ...dto })),
      deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
    };

    mockSkillProofModel = {
      find: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      }),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((dto) => Promise.resolve({ _id: new Types.ObjectId(), ...dto })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SkillsService,
        { provide: getModelToken(Skill.name), useValue: mockSkillModel },
        { provide: getModelToken(UserSkill.name), useValue: mockUserSkillModel },
        { provide: getModelToken(SkillProof.name), useValue: mockSkillProofModel },
      ],
    }).compile();

    service = module.get<SkillsService>(SkillsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should search skills', async () => {
    const res = await service.searchSkills('React');
    expect(res).toBeDefined();
    expect(res.length).toBeGreaterThan(0);
    expect(mockSkillModel.find).toHaveBeenCalled();
  });

  it('should get user skills', async () => {
    const userId = new Types.ObjectId().toString();
    const skills = await service.getUserSkills(userId);
    expect(skills).toBeDefined();
    expect(skills.length).toBe(1);
    expect(skills[0].name).toBe('React');
  });

  it('should add a user skill', async () => {
    const userId = new Types.ObjectId().toString();
    const skills = await service.addUserSkill(userId, {
      skillName: 'React',
      proficiency: SkillProficiency.ADVANCED,
    });
    expect(skills).toBeDefined();
  });
});
