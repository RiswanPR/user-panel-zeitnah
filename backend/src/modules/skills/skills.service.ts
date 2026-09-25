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
  // Infrastructure Software Skills (Canonical + Aliases)
  {
    name: 'AutoCAD',
    category: 'Software Skills',
    aliases: ['CAD', 'Auto CAD', 'Autodesk AutoCAD', '2D CAD'],
  },
  {
    name: 'Civil 3D',
    category: 'Software Skills',
    aliases: ['AutoCAD Civil 3D', 'Civil3D', 'C3D'],
  },
  {
    name: 'Revit',
    category: 'Software Skills',
    aliases: ['Autodesk Revit', 'Revit Architecture', 'Revit Structure', 'Revit MEP'],
  },
  {
    name: 'Navisworks',
    category: 'Software Skills',
    aliases: ['Navisworks Manage', 'Navis', 'Navisworks Freedom'],
  },
  {
    name: 'Primavera P6',
    category: 'Software Skills',
    aliases: ['Primavera', 'P6', 'P6 software', 'Primavera-P6', 'Oracle Primavera', 'P6 PPM'],
  },
  {
    name: 'MS Project',
    category: 'Software Skills',
    aliases: ['Microsoft Project', 'MSP', 'MS-Project'],
  },
  {
    name: 'STAAD.Pro',
    category: 'Software Skills',
    aliases: ['STAAD', 'STAAD Pro', 'StaadPro', 'Bentley STAAD'],
  },
  {
    name: 'ETABS',
    category: 'Software Skills',
    aliases: ['CSI ETABS', 'Etabs'],
  },
  {
    name: 'SAP2000',
    category: 'Software Skills',
    aliases: ['SAP 2000', 'CSI SAP2000'],
  },
  {
    name: 'Tekla Structures',
    category: 'Software Skills',
    aliases: ['Tekla', 'Tekla Structure', 'Trimble Tekla'],
  },
  {
    name: 'GIS',
    category: 'Software Skills',
    aliases: ['ArcGIS', 'QGIS', 'Geographic Information Systems'],
  },
  {
    name: 'CostX',
    category: 'Software Skills',
    aliases: ['Exactal CostX', 'Cost-X'],
  },
  {
    name: 'Synchro 4D',
    category: 'Software Skills',
    aliases: ['Synchro', 'Bentley Synchro', '4D BIM'],
  },
  {
    name: 'Bluebeam Revu',
    category: 'Software Skills',
    aliases: ['Bluebeam', 'Revu'],
  },
  {
    name: 'OpenRoads',
    category: 'Software Skills',
    aliases: ['Bentley OpenRoads', 'OpenRoads Designer'],
  },
  {
    name: 'Infraworks',
    category: 'Software Skills',
    aliases: ['Autodesk Infraworks'],
  },
  {
    name: 'MicroStation',
    category: 'Software Skills',
    aliases: ['Bentley MicroStation'],
  },

  // Technical Skills
  {
    name: 'Structural Analysis',
    category: 'Technical Skills',
    aliases: ['Structural Design', 'Finite Element Analysis', 'FEA'],
  },
  {
    name: 'Reinforced Concrete Design',
    category: 'Technical Skills',
    aliases: ['Concrete Design', 'RCC Design', 'Concrete Technology'],
  },
  {
    name: 'Steel Structure Design',
    category: 'Technical Skills',
    aliases: ['Structural Steel', 'Steel Detailing'],
  },
  {
    name: 'Geotechnical Investigation',
    category: 'Technical Skills',
    aliases: ['Soil Mechanics', 'Foundation Design', 'Geotech'],
  },
  {
    name: 'Quantity Surveying',
    category: 'Technical Skills',
    aliases: ['QS', 'Bill of Quantities', 'BOQ', 'Quantity Estimation', 'Take-offs'],
  },
  {
    name: 'BIM Coordination',
    category: 'Technical Skills',
    aliases: ['BIM', 'Clash Detection', 'Building Information Modeling'],
  },
  {
    name: 'MEP Engineering',
    category: 'Technical Skills',
    aliases: ['MEP Coordination', 'HVAC Design', 'Plumbing Design'],
  },
  {
    name: 'Highway Alignment & Design',
    category: 'Technical Skills',
    aliases: ['Road Design', 'Pavement Design', 'Geometric Design'],
  },
  {
    name: 'Hydraulic Modeling',
    category: 'Technical Skills',
    aliases: ['Drainage Design', 'Hydrology', 'Water Network Modeling'],
  },
  {
    name: 'Land & Topographic Surveying',
    category: 'Technical Skills',
    aliases: ['Total Station', 'GPS Surveying', 'Leveling'],
  },

  // Industry Skills
  {
    name: 'Site Supervision',
    category: 'Industry Skills',
    aliases: ['Site Engineering', 'Site Execution', 'Site Management'],
  },
  {
    name: 'Construction Management',
    category: 'Industry Skills',
    aliases: ['Project Execution', 'Site Operations'],
  },
  {
    name: 'Quality Control (QA/QC)',
    category: 'Industry Skills',
    aliases: ['QA/QC', 'Quality Assurance', 'Material Testing', 'Inspection & Testing'],
  },
  {
    name: 'Health, Safety & Environment (HSE)',
    category: 'Industry Skills',
    aliases: ['Safety / HSE', 'Site Safety', 'OSHA', 'EHS'],
  },
  {
    name: 'Contracts & Procurement',
    category: 'Industry Skills',
    aliases: ['FIDIC Contracts', 'Subcontract Management', 'Tender Estimation'],
  },
  {
    name: 'Planning & Scheduling',
    category: 'Industry Skills',
    aliases: ['Construction Scheduling', 'Critical Path Method', 'CPM'],
  },

  // Professional Skills
  {
    name: 'Infrastructure Project Management',
    category: 'Professional Skills',
    aliases: ['Project Delivery', 'Milestone Management'],
  },
  {
    name: 'Stakeholder Coordination',
    category: 'Professional Skills',
    aliases: ['Client Management', 'Inter-disciplinary Coordination'],
  },
  {
    name: 'Vendor & Subcontractor Management',
    category: 'Professional Skills',
    aliases: ['Supplier Management', 'Subcontractor Coordination'],
  },
  {
    name: 'Technical Reporting & Documentation',
    category: 'Professional Skills',
    aliases: ['Daily Progress Reports', 'DPR', 'Technical Documentation'],
  },
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
      $or: [
        { slug },
        { name: new RegExp(`^${escapeRegex(cleanName)}$`, 'i') },
        { aliases: new RegExp(`^${escapeRegex(cleanName)}$`, 'i') },
      ],
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
