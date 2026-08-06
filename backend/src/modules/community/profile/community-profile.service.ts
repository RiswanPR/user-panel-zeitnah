import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  CommunityProfile,
  CommunityProfileDocument,
} from './schemas/community-profile.schema';
import { Skill, SkillDocument } from './schemas/skill.schema';
import { Project, ProjectDocument } from './schemas/project.schema';
import { Experience, ExperienceDocument } from './schemas/experience.schema';
import { Education, EducationDocument } from './schemas/education.schema';
import { Certificate, CertificateDocument } from './schemas/certificate.schema';
import { Follower, FollowerDocument } from './schemas/follower.schema';
import {
  ProfileView,
  ProfileViewDocument,
} from './schemas/profile-view.schema';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AddSkillDto, UpdateSkillDto } from './dto/add-skill.dto';
import { AddProjectDto, UpdateProjectDto } from './dto/add-project.dto';
import {
  AddExperienceDto,
  UpdateExperienceDto,
} from './dto/add-experience.dto';
import { AddEducationDto, UpdateEducationDto } from './dto/add-education.dto';
import {
  AddCertificateDto,
  UpdateCertificateDto,
} from './dto/add-certificate.dto';
import { UploadService } from '../../../common/aws/upload.service';
import { calculateProfileCompletion } from './utils/profile-completion.util';
import { sanitizeUrl } from './utils/url-sanitizer.util';
import { FullCommunityProfile } from './interfaces/profile.interface';

@Injectable()
export class CommunityProfileService {
  private readonly logger = new Logger(CommunityProfileService.name);

  constructor(
    @InjectModel(CommunityProfile.name)
    private readonly profileModel: Model<CommunityProfileDocument>,
    @InjectModel(Skill.name)
    private readonly skillModel: Model<SkillDocument>,
    @InjectModel(Project.name)
    private readonly projectModel: Model<ProjectDocument>,
    @InjectModel(Experience.name)
    private readonly experienceModel: Model<ExperienceDocument>,
    @InjectModel(Education.name)
    private readonly educationModel: Model<EducationDocument>,
    @InjectModel(Certificate.name)
    private readonly certificateModel: Model<CertificateDocument>,
    @InjectModel(Follower.name)
    private readonly followerModel: Model<FollowerDocument>,
    @InjectModel(ProfileView.name)
    private readonly profileViewModel: Model<ProfileViewDocument>,
    private readonly uploadService: UploadService,
  ) {}

  // ----------------------------------------------------
  // PROFILE METHODS
  // ----------------------------------------------------

  async getOrCreateProfile(
    userId: string,
    defaultData?: Partial<CreateProfileDto>,
  ): Promise<CommunityProfileDocument> {
    let profile = await this.profileModel.findOne({ userId });

    if (!profile) {
      const username =
        defaultData?.username || `user_${userId.substring(0, 8)}`;

      const existingUsername = await this.profileModel.findOne({ username });
      const finalUsername = existingUsername
        ? `${username}_${Math.floor(1000 + Math.random() * 9000)}`
        : username;

      profile = await this.profileModel.create({
        userId,
        username: finalUsername,
        headline: defaultData?.headline || '',
        bio: defaultData?.bio || '',
        college: defaultData?.college || '',
        branch: defaultData?.branch || '',
        batchYear: defaultData?.batchYear || '',
        socialLinks: {
          github: sanitizeUrl(defaultData?.socialLinks?.github),
          linkedin: sanitizeUrl(defaultData?.socialLinks?.linkedin),
          twitter: sanitizeUrl(defaultData?.socialLinks?.twitter),
          website: sanitizeUrl(defaultData?.socialLinks?.website),
        },
      });

      await this.recalculateCompletion(userId);
    }

    return profile;
  }

  async getMyProfile(userId: string): Promise<FullCommunityProfile> {
    const profile = await this.getOrCreateProfile(userId);
    const [skills, projects, experiences, educations, certificates] =
      await Promise.all([
        this.skillModel.find({ userId }).exec(),
        this.projectModel
          .find({ userId })
          .sort({ featured: -1, createdAt: -1 })
          .exec(),
        this.experienceModel.find({ userId }).sort({ startDate: -1 }).exec(),
        this.educationModel.find({ userId }).sort({ startDate: -1 }).exec(),
        this.certificateModel.find({ userId }).sort({ issueDate: -1 }).exec(),
      ]);

    return {
      profile,
      skills,
      projects,
      experiences,
      educations,
      certificates,
    };
  }

  async getProfileByUsername(
    username: string,
    viewerUserId?: string,
  ): Promise<FullCommunityProfile> {
    const profile = await this.profileModel.findOne({ username });
    if (!profile) {
      throw new NotFoundException(
        `Profile with username '@${username}' not found`,
      );
    }

    // Record Profile View async
    if (viewerUserId && viewerUserId !== profile.userId) {
      this.profileViewModel
        .create({
          profileId: profile.userId,
          viewerId: viewerUserId,
        })
        .catch((err) => this.logger.error('Failed to log profile view', err));

      this.profileModel
        .updateOne({ _id: profile._id } as any, { $inc: { viewsCount: 1 } })
        .catch((err) =>
          this.logger.error('Failed to increment viewsCount', err),
        );
    }

    const [skills, projects, experiences, educations, certificates, followDoc] =
      await Promise.all([
        this.skillModel.find({ userId: profile.userId }).exec(),
        this.projectModel
          .find({ userId: profile.userId })
          .sort({ featured: -1, createdAt: -1 })
          .exec(),
        this.experienceModel
          .find({ userId: profile.userId })
          .sort({ startDate: -1 })
          .exec(),
        this.educationModel
          .find({ userId: profile.userId })
          .sort({ startDate: -1 })
          .exec(),
        this.certificateModel
          .find({ userId: profile.userId })
          .sort({ issueDate: -1 })
          .exec(),
        viewerUserId
          ? this.followerModel.findOne({
              userId: profile.userId,
              followerId: viewerUserId,
            })
          : null,
      ]);

    return {
      profile,
      skills,
      projects,
      experiences,
      educations,
      certificates,
      isFollowing: !!followDoc,
    };
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<CommunityProfileDocument> {
    const profile = await this.getOrCreateProfile(userId);

    if (dto.username && dto.username !== profile.username) {
      const existing = await this.profileModel.findOne({
        username: dto.username,
        userId: { $ne: userId },
      });
      if (existing) {
        throw new ConflictException(
          `Username '@${dto.username}' is already taken`,
        );
      }
      profile.username = dto.username;
    }

    if (dto.headline !== undefined) profile.headline = dto.headline;
    if (dto.bio !== undefined) profile.bio = dto.bio;
    if (dto.college !== undefined) profile.college = dto.college;
    if (dto.branch !== undefined) profile.branch = dto.branch;
    if (dto.batchYear !== undefined) profile.batchYear = dto.batchYear;

    if (dto.socialLinks) {
      profile.socialLinks = {
        github: sanitizeUrl(
          dto.socialLinks.github ?? profile.socialLinks?.github,
        ),
        linkedin: sanitizeUrl(
          dto.socialLinks.linkedin ?? profile.socialLinks?.linkedin,
        ),
        twitter: sanitizeUrl(
          dto.socialLinks.twitter ?? profile.socialLinks?.twitter,
        ),
        website: sanitizeUrl(
          dto.socialLinks.website ?? profile.socialLinks?.website,
        ),
      };
    }

    await profile.save();
    return this.recalculateCompletion(userId);
  }

  async recalculateCompletion(
    userId: string,
  ): Promise<CommunityProfileDocument> {
    const profile = await this.profileModel.findOne({ userId });
    if (!profile) return null;

    const [
      skillsCount,
      projectsCount,
      experiencesCount,
      educationsCount,
      certificatesCount,
    ] = await Promise.all([
      this.skillModel.countDocuments({ userId }),
      this.projectModel.countDocuments({ userId }),
      this.experienceModel.countDocuments({ userId }),
      this.educationModel.countDocuments({ userId }),
      this.certificateModel.countDocuments({ userId }),
    ]);

    const breakdown = calculateProfileCompletion({
      profile,
      skillsCount,
      projectsCount,
      experiencesCount,
      educationsCount,
      certificatesCount,
    });

    profile.completionPercentage = breakdown.percentage;
    return profile.save();
  }

  // ----------------------------------------------------
  // SKILLS APIs
  // ----------------------------------------------------

  async addSkill(userId: string, dto: AddSkillDto): Promise<Skill> {
    await this.getOrCreateProfile(userId);

    const existing = await this.skillModel.findOne({
      userId,
      name: { $regex: new RegExp(`^${dto.name.trim()}$`, 'i') },
    });
    if (existing) {
      throw new ConflictException(
        `Skill '${dto.name}' already added to profile`,
      );
    }

    const skill = await this.skillModel.create({
      userId,
      name: dto.name.trim(),
      category: dto.category || 'General',
      proficiencyLevel: dto.proficiencyLevel,
    });

    // Also sync skill string array in main profile for fast index matching
    await this.profileModel.updateOne(
      { userId },
      { $addToSet: { skills: skill.name } },
    );
    await this.recalculateCompletion(userId);
    return skill;
  }

  async updateSkill(
    userId: string,
    skillId: string,
    dto: UpdateSkillDto,
  ): Promise<Skill> {
    const skill = await this.skillModel.findOne({
      _id: skillId,
      userId,
    } as any);
    if (!skill) {
      throw new NotFoundException('Skill not found or unauthorized');
    }

    if (dto.name && dto.name !== skill.name) {
      await this.profileModel.updateOne(
        { userId },
        {
          $pull: { skills: skill.name },
          $addToSet: { skills: dto.name.trim() },
        },
      );
      skill.name = dto.name.trim();
    }
    if (dto.category) skill.category = dto.category;
    if (dto.proficiencyLevel) skill.proficiencyLevel = dto.proficiencyLevel;

    await skill.save();
    return skill;
  }

  async deleteSkill(
    userId: string,
    skillId: string,
  ): Promise<{ success: boolean }> {
    const skill = await this.skillModel.findOneAndDelete({
      _id: skillId,
      userId,
    } as any);
    if (!skill) {
      throw new NotFoundException('Skill not found or unauthorized');
    }

    await this.profileModel.updateOne(
      { userId },
      { $pull: { skills: skill.name } },
    );
    await this.recalculateCompletion(userId);
    return { success: true };
  }

  // ----------------------------------------------------
  // PROJECTS APIs
  // ----------------------------------------------------

  async addProject(userId: string, dto: AddProjectDto): Promise<Project> {
    await this.getOrCreateProfile(userId);

    const project = await this.projectModel.create({
      userId,
      title: dto.title.trim(),
      description: dto.description || '',
      tags: dto.tags || [],
      githubUrl: sanitizeUrl(dto.githubUrl),
      liveDemoUrl: sanitizeUrl(dto.liveDemoUrl),
      mediaUrls: dto.mediaUrls || [],
      featured: dto.featured || false,
    });

    await this.recalculateCompletion(userId);
    return project;
  }

  async getProjectsByUser(userId: string): Promise<Project[]> {
    return this.projectModel
      .find({ userId })
      .sort({ featured: -1, createdAt: -1 })
      .exec();
  }

  async updateProject(
    userId: string,
    projectId: string,
    dto: UpdateProjectDto,
  ): Promise<Project> {
    const project = await this.projectModel.findOne({
      _id: projectId,
      userId,
    } as any);
    if (!project) {
      throw new NotFoundException('Project not found or unauthorized');
    }

    if (dto.title !== undefined) project.title = dto.title.trim();
    if (dto.description !== undefined) project.description = dto.description;
    if (dto.tags !== undefined) project.tags = dto.tags;
    if (dto.githubUrl !== undefined)
      project.githubUrl = sanitizeUrl(dto.githubUrl);
    if (dto.liveDemoUrl !== undefined)
      project.liveDemoUrl = sanitizeUrl(dto.liveDemoUrl);
    if (dto.mediaUrls !== undefined) project.mediaUrls = dto.mediaUrls;
    if (dto.featured !== undefined) project.featured = dto.featured;

    await project.save();
    return project;
  }

  async deleteProject(
    userId: string,
    projectId: string,
  ): Promise<{ success: boolean }> {
    const project = await this.projectModel.findOneAndDelete({
      _id: projectId,
      userId,
    } as any);
    if (!project) {
      throw new NotFoundException('Project not found or unauthorized');
    }

    await this.recalculateCompletion(userId);
    return { success: true };
  }

  // ----------------------------------------------------
  // EXPERIENCE APIs
  // ----------------------------------------------------

  async addExperience(
    userId: string,
    dto: AddExperienceDto,
  ): Promise<Experience> {
    await this.getOrCreateProfile(userId);

    const exp = await this.experienceModel.create({
      userId,
      company: dto.company.trim(),
      role: dto.role.trim(),
      location: dto.location || '',
      employmentType: dto.employmentType || 'Full-time',
      startDate: new Date(dto.startDate),
      endDate: dto.endDate ? new Date(dto.endDate) : null,
      isCurrent: dto.isCurrent || false,
      description: dto.description || '',
      skillsUsed: dto.skillsUsed || [],
    });

    await this.recalculateCompletion(userId);
    return exp;
  }

  async updateExperience(
    userId: string,
    expId: string,
    dto: UpdateExperienceDto,
  ): Promise<Experience> {
    const exp = await this.experienceModel.findOne({
      _id: expId,
      userId,
    } as any);
    if (!exp) {
      throw new NotFoundException('Experience entry not found or unauthorized');
    }

    if (dto.company !== undefined) exp.company = dto.company.trim();
    if (dto.role !== undefined) exp.role = dto.role.trim();
    if (dto.location !== undefined) exp.location = dto.location;
    if (dto.employmentType !== undefined)
      exp.employmentType = dto.employmentType;
    if (dto.startDate !== undefined) exp.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined)
      exp.endDate = dto.endDate ? new Date(dto.endDate) : null;
    if (dto.isCurrent !== undefined) exp.isCurrent = dto.isCurrent;
    if (dto.description !== undefined) exp.description = dto.description;
    if (dto.skillsUsed !== undefined) exp.skillsUsed = dto.skillsUsed;

    await exp.save();
    return exp;
  }

  async deleteExperience(
    userId: string,
    expId: string,
  ): Promise<{ success: boolean }> {
    const exp = await this.experienceModel.findOneAndDelete({
      _id: expId,
      userId,
    } as any);
    if (!exp) {
      throw new NotFoundException('Experience entry not found or unauthorized');
    }

    await this.recalculateCompletion(userId);
    return { success: true };
  }

  // ----------------------------------------------------
  // EDUCATION APIs
  // ----------------------------------------------------

  async addEducation(userId: string, dto: AddEducationDto): Promise<Education> {
    await this.getOrCreateProfile(userId);

    const edu = await this.educationModel.create({
      userId,
      institution: dto.institution.trim(),
      degree: dto.degree.trim(),
      fieldOfStudy: dto.fieldOfStudy || '',
      startDate: new Date(dto.startDate),
      endDate: dto.endDate ? new Date(dto.endDate) : null,
      grade: dto.grade || '',
      activities: dto.activities || '',
    });

    await this.recalculateCompletion(userId);
    return edu;
  }

  async updateEducation(
    userId: string,
    eduId: string,
    dto: UpdateEducationDto,
  ): Promise<Education> {
    const edu = await this.educationModel.findOne({
      _id: eduId,
      userId,
    } as any);
    if (!edu) {
      throw new NotFoundException('Education entry not found or unauthorized');
    }

    if (dto.institution !== undefined) edu.institution = dto.institution.trim();
    if (dto.degree !== undefined) edu.degree = dto.degree.trim();
    if (dto.fieldOfStudy !== undefined) edu.fieldOfStudy = dto.fieldOfStudy;
    if (dto.startDate !== undefined) edu.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined)
      edu.endDate = dto.endDate ? new Date(dto.endDate) : null;
    if (dto.grade !== undefined) edu.grade = dto.grade;
    if (dto.activities !== undefined) edu.activities = dto.activities;

    await edu.save();
    return edu;
  }

  async deleteEducation(
    userId: string,
    eduId: string,
  ): Promise<{ success: boolean }> {
    const edu = await this.educationModel.findOneAndDelete({
      _id: eduId,
      userId,
    } as any);
    if (!edu) {
      throw new NotFoundException('Education entry not found or unauthorized');
    }

    await this.recalculateCompletion(userId);
    return { success: true };
  }

  // ----------------------------------------------------
  // CERTIFICATES APIs
  // ----------------------------------------------------

  async addCertificate(
    userId: string,
    dto: AddCertificateDto,
  ): Promise<Certificate> {
    await this.getOrCreateProfile(userId);

    const cert = await this.certificateModel.create({
      userId,
      title: dto.title.trim(),
      issuingOrganization: dto.issuingOrganization.trim(),
      issueDate: new Date(dto.issueDate),
      expirationDate: dto.expirationDate ? new Date(dto.expirationDate) : null,
      credentialId: dto.credentialId || '',
      credentialUrl: sanitizeUrl(dto.credentialUrl),
      certificateImage: dto.certificateImage || '',
    });

    await this.recalculateCompletion(userId);
    return cert;
  }

  async getCertificatesByUser(userId: string): Promise<Certificate[]> {
    return this.certificateModel
      .find({ userId })
      .sort({ issueDate: -1 })
      .exec();
  }

  async updateCertificate(
    userId: string,
    certId: string,
    dto: UpdateCertificateDto,
  ): Promise<Certificate> {
    const cert = await this.certificateModel.findOne({
      _id: certId,
      userId,
    } as any);
    if (!cert) {
      throw new NotFoundException(
        'Certificate entry not found or unauthorized',
      );
    }

    if (dto.title !== undefined) cert.title = dto.title.trim();
    if (dto.issuingOrganization !== undefined)
      cert.issuingOrganization = dto.issuingOrganization.trim();
    if (dto.issueDate !== undefined) cert.issueDate = new Date(dto.issueDate);
    if (dto.expirationDate !== undefined)
      cert.expirationDate = dto.expirationDate
        ? new Date(dto.expirationDate)
        : null;
    if (dto.credentialId !== undefined) cert.credentialId = dto.credentialId;
    if (dto.credentialUrl !== undefined)
      cert.credentialUrl = sanitizeUrl(dto.credentialUrl);
    if (dto.certificateImage !== undefined)
      cert.certificateImage = dto.certificateImage;

    await cert.save();
    return cert;
  }

  async deleteCertificate(
    userId: string,
    certId: string,
  ): Promise<{ success: boolean }> {
    const cert = await this.certificateModel.findOneAndDelete({
      _id: certId,
      userId,
    } as any);
    if (!cert) {
      throw new NotFoundException(
        'Certificate entry not found or unauthorized',
      );
    }

    await this.recalculateCompletion(userId);
    return { success: true };
  }

  // ----------------------------------------------------
  // RESUME & S3 UPLOAD APIs
  // ----------------------------------------------------

  async uploadFileToS3(
    file: Express.Multer.File,
    folder: string,
    userId: string,
    allowedMimes: string[],
    maxSizeBytes: number = 10 * 1024 * 1024,
  ): Promise<string> {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    if (allowedMimes.length > 0 && !allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type '${file.mimetype}'. Allowed: ${allowedMimes.join(', ')}`,
      );
    }

    if (file.size > maxSizeBytes) {
      throw new BadRequestException(
        `File size exceeds maximum permitted limit of ${maxSizeBytes / (1024 * 1024)}MB`,
      );
    }

    const fileExt = file.originalname.split('.').pop() || 'bin';
    const key = `community/profiles/${userId}/${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

    const uploadedKey = await this.uploadService.uploadFile(
      key,
      file.buffer,
      file.mimetype,
    );

    // Form absolute S3 URL
    const bucket = process.env.AWS_S3_BUCKET || 'lms-bucket';
    const region = process.env.AWS_REGION || 'us-east-1';
    return `https://${bucket}.s3.${region}.amazonaws.com/${uploadedKey}`;
  }

  async uploadResume(
    userId: string,
    file: Express.Multer.File,
  ): Promise<{ resumeUrl: string }> {
    const resumeUrl = await this.uploadFileToS3(
      file,
      'resumes',
      userId,
      ['application/pdf'],
      10 * 1024 * 1024,
    );

    const profile = await this.getOrCreateProfile(userId);
    profile.resumeUrl = resumeUrl;
    await profile.save();
    await this.recalculateCompletion(userId);

    return { resumeUrl };
  }

  async deleteResume(userId: string): Promise<{ success: boolean }> {
    const profile = await this.getOrCreateProfile(userId);
    profile.resumeUrl = '';
    await profile.save();
    await this.recalculateCompletion(userId);
    return { success: true };
  }

  async uploadProfileAvatar(
    userId: string,
    file: Express.Multer.File,
  ): Promise<{ profilePicture: string }> {
    const profilePicture = await this.uploadFileToS3(
      file,
      'avatars',
      userId,
      ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      5 * 1024 * 1024,
    );

    const profile = await this.getOrCreateProfile(userId);
    profile.profilePicture = profilePicture;
    await profile.save();
    await this.recalculateCompletion(userId);

    return { profilePicture };
  }

  async uploadCoverBanner(
    userId: string,
    file: Express.Multer.File,
  ): Promise<{ coverBanner: string }> {
    const coverBanner = await this.uploadFileToS3(
      file,
      'banners',
      userId,
      ['image/jpeg', 'image/png', 'image/webp'],
      8 * 1024 * 1024,
    );

    const profile = await this.getOrCreateProfile(userId);
    profile.coverBanner = coverBanner;
    await profile.save();

    return { coverBanner };
  }

  // ----------------------------------------------------
  // FOLLOW SYSTEM APIs
  // ----------------------------------------------------

  async followUser(
    currentUserId: string,
    targetUserId: string,
  ): Promise<{ isFollowing: boolean }> {
    if (currentUserId === targetUserId) {
      throw new BadRequestException('You cannot follow yourself');
    }

    const targetProfile = await this.profileModel.findOne({
      userId: targetUserId,
    });
    if (!targetProfile) {
      throw new NotFoundException('Target user profile not found');
    }

    const existingFollow = await this.followerModel.findOne({
      userId: targetUserId,
      followerId: currentUserId,
    });

    if (existingFollow) {
      return { isFollowing: true };
    }

    await this.followerModel.create({
      userId: targetUserId,
      followerId: currentUserId,
    });

    // Atomically update counters
    await Promise.all([
      this.profileModel.updateOne(
        { userId: targetUserId },
        { $inc: { followersCount: 1 } },
      ),
      this.profileModel.updateOne(
        { userId: currentUserId },
        { $inc: { followingCount: 1 } },
      ),
    ]);

    return { isFollowing: true };
  }

  async unfollowUser(
    currentUserId: string,
    targetUserId: string,
  ): Promise<{ isFollowing: boolean }> {
    if (currentUserId === targetUserId) {
      throw new BadRequestException('You cannot unfollow yourself');
    }

    const removed = await this.followerModel.findOneAndDelete({
      userId: targetUserId,
      followerId: currentUserId,
    });

    if (removed) {
      await Promise.all([
        this.profileModel.updateOne(
          { userId: targetUserId },
          { $inc: { followersCount: -1 } },
        ),
        this.profileModel.updateOne(
          { userId: currentUserId },
          { $inc: { followingCount: -1 } },
        ),
      ]);
    }

    return { isFollowing: false };
  }

  async getFollowers(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ followers: CommunityProfile[]; total: number }> {
    const skip = (page - 1) * limit;
    const [followerDocs, total] = await Promise.all([
      this.followerModel
        .find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.followerModel.countDocuments({ userId }),
    ]);

    const followerUserIds = followerDocs.map((doc) => doc.followerId);
    const followers = await this.profileModel
      .find({ userId: { $in: followerUserIds } })
      .exec();

    return { followers, total };
  }

  async getFollowing(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ following: CommunityProfile[]; total: number }> {
    const skip = (page - 1) * limit;
    const [followingDocs, total] = await Promise.all([
      this.followerModel
        .find({ followerId: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.followerModel.countDocuments({ followerId: userId }),
    ]);

    const followingUserIds = followingDocs.map((doc) => doc.userId);
    const following = await this.profileModel
      .find({ userId: { $in: followingUserIds } })
      .exec();

    return { following, total };
  }
}
