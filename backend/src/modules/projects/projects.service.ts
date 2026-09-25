import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
  Optional,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Project,
  ProjectDocument,
  ProjectVisibility,
} from './schemas/project.schema';
import { SkillsService } from '../skills/skills.service';
import { ProofSourceType } from '../skills/schemas/skill-proof.schema';
import { MatchingService } from '../matching/matching.service';
import { CareerIntelligenceService } from '../career-intelligence/career-intelligence.service';

export interface CreateProjectDto {
  title: string;
  description?: string;
  skills?: string[];
  role?: string;
  projectType?: string;
  infrastructureSector?: string;
  location?: string;
  responsibilities?: string;
  softwareUsed?: string[];
  startDate: string | Date;
  endDate?: string | Date | null;
  links?: {
    githubUrl?: string;
    liveDemoUrl?: string;
    externalUrl?: string;
  };
  media?: string[];
  organizationId?: string;
  featured?: boolean;
  visibility?: ProjectVisibility;
}

export interface UpdateProjectDto extends Partial<CreateProjectDto> {}

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    @InjectModel(Project.name)
    private readonly projectModel: Model<ProjectDocument>,
    private readonly skillsService: SkillsService,
    @Optional()
    @Inject(forwardRef(() => MatchingService))
    private readonly matchingService?: MatchingService,
    @Optional()
    @Inject(forwardRef(() => CareerIntelligenceService))
    private readonly careerIntelligenceService?: CareerIntelligenceService,
  ) {}

  private triggerCandidateMatchInvalidation(userId: string) {
    if (this.matchingService) {
      this.matchingService.invalidateCandidateMatches(userId).catch((err) => {
        this.logger.warn(
          `Failed invalidating candidate matches for ${userId}: ${err.message}`,
        );
      });
    }
    if (this.careerIntelligenceService) {
      this.careerIntelligenceService
        .invalidateUserCareerInsight(userId)
        .catch((err) => {
          this.logger.warn(
            `Failed invalidating career insight for ${userId}: ${err.message}`,
          );
        });
    }
  }

  async getUserProjects(userId: string, isOwner = false) {
    const userObjId = new Types.ObjectId(userId);
    const filter: Record<string, any> = { ownerId: userObjId };
    if (!isOwner) {
      filter.visibility = ProjectVisibility.PUBLIC;
    }

    return this.projectModel
      .find(filter)
      .sort({ featured: -1, createdAt: -1 })
      .lean();
  }

  async createProject(userId: string, dto: CreateProjectDto) {
    const userObjId = new Types.ObjectId(userId);

    const project = await this.projectModel.create({
      ownerId: userObjId,
      title: dto.title.trim(),
      description: dto.description?.trim() || '',
      skills: dto.skills || [],
      role: dto.role?.trim() || '',
      projectType: dto.projectType?.trim() || 'Infrastructure',
      infrastructureSector: dto.infrastructureSector?.trim() || '',
      location: dto.location?.trim() || '',
      responsibilities: dto.responsibilities?.trim() || '',
      softwareUsed: dto.softwareUsed || [],
      startDate: new Date(dto.startDate),
      endDate: dto.endDate ? new Date(dto.endDate) : null,
      links: dto.links || {},
      media: dto.media || [],
      organizationId: dto.organizationId || '',
      featured: Boolean(dto.featured),
      visibility: dto.visibility || ProjectVisibility.PUBLIC,
    });

    // Auto-attach skill proof for skills listed on this project
    if (dto.skills && dto.skills.length > 0) {
      for (const skillName of dto.skills) {
        try {
          await this.skillsService.attachSkillProof(userId, skillName, {
            sourceType: ProofSourceType.PROJECT,
            sourceId: String(project._id),
            metadata: { projectTitle: project.title },
          });
        } catch (err: any) {
          this.logger.warn(
            `Could not attach skill proof for '${skillName}': ${err.message}`,
          );
        }
      }
    }

    this.triggerCandidateMatchInvalidation(userId);

    return project;
  }

  async updateProject(
    userId: string,
    projectId: string,
    dto: UpdateProjectDto,
  ) {
    const userObjId = new Types.ObjectId(userId);
    const project = await this.projectModel.findById(projectId);

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (String(project.ownerId) !== String(userObjId)) {
      throw new ForbiddenException(
        'You are not authorized to update this project',
      );
    }

    if (dto.title !== undefined) project.title = dto.title.trim();
    if (dto.description !== undefined)
      project.description = dto.description.trim();
    if (dto.skills !== undefined) project.skills = dto.skills;
    if (dto.role !== undefined) project.role = dto.role.trim();
    if (dto.projectType !== undefined)
      project.projectType = dto.projectType.trim();
    if (dto.infrastructureSector !== undefined)
      project.infrastructureSector = dto.infrastructureSector.trim();
    if (dto.location !== undefined) project.location = dto.location.trim();
    if (dto.responsibilities !== undefined)
      project.responsibilities = dto.responsibilities.trim();
    if (dto.softwareUsed !== undefined) project.softwareUsed = dto.softwareUsed;
    if (dto.startDate !== undefined)
      project.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined)
      project.endDate = dto.endDate ? new Date(dto.endDate) : null;
    if (dto.links !== undefined)
      project.links = { ...project.links, ...dto.links };
    if (dto.media !== undefined) project.media = dto.media;
    if (dto.organizationId !== undefined)
      project.organizationId = dto.organizationId;
    if (dto.featured !== undefined) project.featured = Boolean(dto.featured);
    if (dto.visibility !== undefined) project.visibility = dto.visibility;

    await project.save();

    // Re-verify proofs if skills changed
    if (dto.skills && dto.skills.length > 0) {
      for (const skillName of dto.skills) {
        try {
          await this.skillsService.attachSkillProof(userId, skillName, {
            sourceType: ProofSourceType.PROJECT,
            sourceId: String(project._id),
            metadata: { projectTitle: project.title },
          });
        } catch (err: any) {
          this.logger.warn(
            `Could not attach skill proof for '${skillName}': ${err.message}`,
          );
        }
      }
    }

    this.triggerCandidateMatchInvalidation(userId);

    return project;
  }

  async deleteProject(userId: string, projectId: string) {
    const userObjId = new Types.ObjectId(userId);
    const project = await this.projectModel.findById(projectId);

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (String(project.ownerId) !== String(userObjId)) {
      throw new ForbiddenException(
        'You are not authorized to delete this project',
      );
    }

    await this.projectModel.deleteOne({ _id: project._id });
    this.triggerCandidateMatchInvalidation(userId);
    return { success: true };
  }
}
