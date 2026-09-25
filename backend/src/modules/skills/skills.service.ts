import {
  Injectable,
  NotFoundException,
  ConflictException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Skill, SkillDocument, SkillStatus } from './schemas/skill.schema';
import {
  UserSkill,
  UserSkillDocument,
  SkillProficiency,
  SkillSource,
  SkillVisibility,
} from './schemas/user-skill.schema';
import {
  SkillProof,
  SkillProofDocument,
  ProofSourceType,
  ProofStatus,
} from './schemas/skill-proof.schema';
import { escapeRegex } from '../../common/utils/regex.util';

const DEFAULT_CURATED_SKILLS = [
  { name: 'JavaScript', category: 'Engineering', aliases: ['JS', 'ES6'] },
  { name: 'TypeScript', category: 'Engineering', aliases: ['TS'] },
  { name: 'React', category: 'Engineering', aliases: ['ReactJS', 'React.js'] },
  { name: 'Node.js', category: 'Engineering', aliases: ['Node', 'NodeJS'] },
  { name: 'Python', category: 'Engineering', aliases: ['Py'] },
  { name: 'Next.js', category: 'Engineering', aliases: ['NextJS'] },
  { name: 'MongoDB', category: 'Engineering', aliases: ['Mongo'] },
  { name: 'PostgreSQL', category: 'Engineering', aliases: ['Postgres', 'SQL'] },
  {
    name: 'UI/UX Design',
    category: 'Design',
    aliases: ['UI Design', 'UX Design', 'Figma'],
  },
  { name: 'Product Design', category: 'Design', aliases: ['Design Systems'] },
  {
    name: 'Cloud Architecture',
    category: 'Engineering',
    aliases: ['AWS', 'GCP', 'DevOps'],
  },
  {
    name: 'Data Science',
    category: 'Data',
    aliases: ['Machine Learning', 'Data Analysis'],
  },
  {
    name: 'Digital Marketing',
    category: 'Marketing',
    aliases: ['SEO', 'Content Strategy'],
  },
  {
    name: 'Project Management',
    category: 'Management',
    aliases: ['Agile', 'Scrum'],
  },
  {
    name: 'Technical Writing',
    category: 'General',
    aliases: ['Documentation'],
  },
  { name: 'Public Speaking', category: 'General', aliases: ['Presentations'] },
];

@Injectable()
export class SkillsService implements OnModuleInit {
  private readonly logger = new Logger(SkillsService.name);

  constructor(
    @InjectModel(Skill.name)
    private readonly skillModel: Model<SkillDocument>,
    @InjectModel(UserSkill.name)
    private readonly userSkillModel: Model<UserSkillDocument>,
    @InjectModel(SkillProof.name)
    private readonly skillProofModel: Model<SkillProofDocument>,
  ) {}

  async onModuleInit() {
    try {
      const count = await this.skillModel.countDocuments();
      if (count === 0) {
        this.logger.log('Seeding curated skill taxonomy...');
        for (const s of DEFAULT_CURATED_SKILLS) {
          const slug = s.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
          await this.skillModel.create({
            name: s.name,
            slug,
            category: s.category,
            aliases: s.aliases,
            status: SkillStatus.ACTIVE,
          });
        }
        this.logger.log(
          `Seeded ${DEFAULT_CURATED_SKILLS.length} curated skills.`,
        );
      }
    } catch (err: any) {
      this.logger.warn(`Skills seeding notice: ${err.message}`);
    }
  }

  /**
   * Search skills by name or alias
   */
  async searchSkills(query: string, limit = 20) {
    if (!query || !query.trim()) {
      return this.skillModel
        .find({ status: SkillStatus.ACTIVE })
        .sort({ name: 1 })
        .limit(limit)
        .lean();
    }

    const clean = query.trim();
    const regex = new RegExp(clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    return this.skillModel
      .find({
        status: SkillStatus.ACTIVE,
        $or: [{ name: regex }, { aliases: regex }, { category: regex }],
      })
      .sort({ name: 1 })
      .limit(limit)
      .lean();
  }

  /**
   * Get user skills populated with skill details and proof
   */
  async getUserSkills(userId: string) {
    const userObjId = new Types.ObjectId(userId);
    const userSkills = await this.userSkillModel
      .find({ userId: userObjId })
      .populate('skillId', 'name slug category')
      .lean();

    const proofs = await this.skillProofModel
      .find({ userId: userObjId, status: ProofStatus.VERIFIED })
      .lean();

    const proofMap = new Map<string, any[]>();
    for (const p of proofs) {
      const sId = String(p.skillId);
      if (!proofMap.has(sId)) proofMap.set(sId, []);
      proofMap.get(sId)?.push({
        id: p._id,
        sourceType: p.sourceType,
        sourceId: p.sourceId,
        status: p.status,
        verifiedAt: p.verifiedAt,
        metadata: p.metadata,
      });
    }

    return userSkills.map((us: any) => {
      const skill = us.skillId;
      const sId = skill ? String(skill._id) : '';
      const skillProofs = proofMap.get(sId) || [];
      return {
        id: us._id,
        skillId: sId,
        name: skill?.name || 'Unknown',
        slug: skill?.slug || '',
        category: skill?.category || 'General',
        proficiency: us.proficiency,
        source: us.source,
        visibility: us.visibility,
        isDemonstrated:
          skillProofs.length > 0 || us.source !== SkillSource.CLAIMED,
        proofs: skillProofs,
      };
    });
  }

  /**
   * Add a skill to user profile
   */
  async addUserSkill(
    userId: string,
    data: {
      skillName: string;
      proficiency?: SkillProficiency;
      visibility?: SkillVisibility;
    },
  ) {
    const userObjId = new Types.ObjectId(userId);
    const cleanName = data.skillName.trim();
    const slug = cleanName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    let skill = await this.skillModel.findOne({
      $or: [{ slug }, { name: new RegExp(`^${escapeRegex(cleanName)}$`, 'i') }],
    });

    if (!skill) {
      skill = await this.skillModel.create({
        name: cleanName,
        slug,
        category: 'General',
        aliases: [],
        status: SkillStatus.ACTIVE,
      });
    }

    const existing = await this.userSkillModel.findOne({
      userId: userObjId,
      skillId: skill._id,
    });

    if (existing) {
      existing.proficiency = data.proficiency || existing.proficiency;
      existing.visibility = data.visibility || existing.visibility;
      await existing.save();
      return this.getUserSkills(userId);
    }

    await this.userSkillModel.create({
      userId: userObjId,
      skillId: skill._id,
      proficiency: data.proficiency || SkillProficiency.INTERMEDIATE,
      source: SkillSource.CLAIMED,
      visibility: data.visibility || SkillVisibility.PUBLIC,
    });

    return this.getUserSkills(userId);
  }

  /**
   * Remove a skill from user profile
   */
  async removeUserSkill(userId: string, userSkillId: string) {
    const userObjId = new Types.ObjectId(userId);
    await this.userSkillModel.deleteOne({
      _id: new Types.ObjectId(userSkillId),
      userId: userObjId,
    });
    return { success: true };
  }

  /**
   * Authoritatively attach a proof to a skill
   */
  async attachSkillProof(
    userId: string,
    skillIdOrName: string,
    proof: {
      sourceType: ProofSourceType;
      sourceId: string;
      metadata?: Record<string, any>;
    },
  ) {
    const userObjId = new Types.ObjectId(userId);
    let skill: SkillDocument | null = null;

    if (Types.ObjectId.isValid(skillIdOrName)) {
      skill = await this.skillModel.findById(skillIdOrName);
    }
    if (!skill) {
      const slug = skillIdOrName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      skill = await this.skillModel.findOne({ slug });
    }
    if (!skill) {
      throw new NotFoundException(`Skill '${skillIdOrName}' not found`);
    }

    // Upsert proof
    const existingProof = await this.skillProofModel.findOne({
      userId: userObjId,
      skillId: skill._id,
      sourceType: proof.sourceType,
      sourceId: proof.sourceId,
    });

    if (!existingProof) {
      await this.skillProofModel.create({
        userId: userObjId,
        skillId: skill._id,
        sourceType: proof.sourceType,
        sourceId: proof.sourceId,
        status: ProofStatus.VERIFIED,
        verifiedAt: new Date(),
        metadata: proof.metadata || {},
      });
    }

    // Ensure UserSkill exists with demonstrated source
    let userSkill = await this.userSkillModel.findOne({
      userId: userObjId,
      skillId: skill._id,
    });

    if (!userSkill) {
      userSkill = await this.userSkillModel.create({
        userId: userObjId,
        skillId: skill._id,
        proficiency: SkillProficiency.INTERMEDIATE,
        source:
          proof.sourceType === ProofSourceType.COURSE_COMPLETION
            ? SkillSource.COURSE_COMPLETION
            : proof.sourceType === ProofSourceType.PROJECT
              ? SkillSource.PROJECT
              : SkillSource.ASSESSMENT,
        visibility: SkillVisibility.PUBLIC,
      });
    } else if (userSkill.source === SkillSource.CLAIMED) {
      userSkill.source =
        proof.sourceType === ProofSourceType.COURSE_COMPLETION
          ? SkillSource.COURSE_COMPLETION
          : proof.sourceType === ProofSourceType.PROJECT
            ? SkillSource.PROJECT
            : SkillSource.ASSESSMENT;
      await userSkill.save();
    }

    return { success: true, skillId: String(skill._id) };
  }
}
