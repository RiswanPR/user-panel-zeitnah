import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CommunityProfileService } from './community-profile.service';
import { CurrentUser } from './decorators/current-user.decorator';
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

@ApiTags('Community Profile')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('community/profile')
export class CommunityProfileController {
  constructor(
    private readonly communityProfileService: CommunityProfileService,
  ) {}

  // ----------------------------------------------------
  // PROFILE ENDPOINTS
  // ----------------------------------------------------

  @Get('me')
  @ApiOperation({
    summary: 'Get current user profile with all sections & completion score',
  })
  async getMyProfile(@CurrentUser('id') userId: string) {
    return this.communityProfileService.getMyProfile(userId);
  }

  @Get(':username')
  @ApiOperation({ summary: 'Get public profile by username' })
  async getProfileByUsername(
    @Param('username') username: string,
    @CurrentUser('id') viewerUserId: string,
  ) {
    return this.communityProfileService.getProfileByUsername(
      username,
      viewerUserId,
    );
  }

  @Patch()
  @ApiOperation({ summary: 'Update current user profile' })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.communityProfileService.updateProfile(userId, dto);
  }

  // ----------------------------------------------------
  // SKILLS ENDPOINTS
  // ----------------------------------------------------

  @Post('skills')
  @ApiOperation({ summary: 'Add a new skill' })
  async addSkill(@CurrentUser('id') userId: string, @Body() dto: AddSkillDto) {
    return this.communityProfileService.addSkill(userId, dto);
  }

  @Patch('skills/:id')
  @ApiOperation({ summary: 'Update an existing skill' })
  async updateSkill(
    @CurrentUser('id') userId: string,
    @Param('id') skillId: string,
    @Body() dto: UpdateSkillDto,
  ) {
    return this.communityProfileService.updateSkill(userId, skillId, dto);
  }

  @Delete('skills/:id')
  @ApiOperation({ summary: 'Delete a skill' })
  async deleteSkill(
    @CurrentUser('id') userId: string,
    @Param('id') skillId: string,
  ) {
    return this.communityProfileService.deleteSkill(userId, skillId);
  }

  // ----------------------------------------------------
  // PROJECTS ENDPOINTS
  // ----------------------------------------------------

  @Post('projects')
  @ApiOperation({ summary: 'Add a new project' })
  async addProject(
    @CurrentUser('id') userId: string,
    @Body() dto: AddProjectDto,
  ) {
    return this.communityProfileService.addProject(userId, dto);
  }

  @Get('projects/:userId')
  @ApiOperation({ summary: 'Get projects for a specific user' })
  async getProjectsByUser(@Param('userId') targetUserId: string) {
    return this.communityProfileService.getProjectsByUser(targetUserId);
  }

  @Patch('projects/:id')
  @ApiOperation({ summary: 'Update a project' })
  async updateProject(
    @CurrentUser('id') userId: string,
    @Param('id') projectId: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.communityProfileService.updateProject(userId, projectId, dto);
  }

  @Delete('projects/:id')
  @ApiOperation({ summary: 'Delete a project' })
  async deleteProject(
    @CurrentUser('id') userId: string,
    @Param('id') projectId: string,
  ) {
    return this.communityProfileService.deleteProject(userId, projectId);
  }

  // ----------------------------------------------------
  // EXPERIENCE ENDPOINTS
  // ----------------------------------------------------

  @Post('experience')
  @ApiOperation({ summary: 'Add an experience entry' })
  async addExperience(
    @CurrentUser('id') userId: string,
    @Body() dto: AddExperienceDto,
  ) {
    return this.communityProfileService.addExperience(userId, dto);
  }

  @Patch('experience/:id')
  @ApiOperation({ summary: 'Update an experience entry' })
  async updateExperience(
    @CurrentUser('id') userId: string,
    @Param('id') expId: string,
    @Body() dto: UpdateExperienceDto,
  ) {
    return this.communityProfileService.updateExperience(userId, expId, dto);
  }

  @Delete('experience/:id')
  @ApiOperation({ summary: 'Delete an experience entry' })
  async deleteExperience(
    @CurrentUser('id') userId: string,
    @Param('id') expId: string,
  ) {
    return this.communityProfileService.deleteExperience(userId, expId);
  }

  // ----------------------------------------------------
  // EDUCATION ENDPOINTS
  // ----------------------------------------------------

  @Post('education')
  @ApiOperation({ summary: 'Add an education entry' })
  async addEducation(
    @CurrentUser('id') userId: string,
    @Body() dto: AddEducationDto,
  ) {
    return this.communityProfileService.addEducation(userId, dto);
  }

  @Patch('education/:id')
  @ApiOperation({ summary: 'Update an education entry' })
  async updateEducation(
    @CurrentUser('id') userId: string,
    @Param('id') eduId: string,
    @Body() dto: UpdateEducationDto,
  ) {
    return this.communityProfileService.updateEducation(userId, eduId, dto);
  }

  @Delete('education/:id')
  @ApiOperation({ summary: 'Delete an education entry' })
  async deleteEducation(
    @CurrentUser('id') userId: string,
    @Param('id') eduId: string,
  ) {
    return this.communityProfileService.deleteEducation(userId, eduId);
  }

  // ----------------------------------------------------
  // CERTIFICATES ENDPOINTS
  // ----------------------------------------------------

  @Post('certificates')
  @ApiOperation({ summary: 'Add a certificate entry' })
  async addCertificate(
    @CurrentUser('id') userId: string,
    @Body() dto: AddCertificateDto,
  ) {
    return this.communityProfileService.addCertificate(userId, dto);
  }

  @Get('certificates/:userId')
  @ApiOperation({ summary: 'Get certificates for a user' })
  async getCertificatesByUser(@Param('userId') targetUserId: string) {
    return this.communityProfileService.getCertificatesByUser(targetUserId);
  }

  @Patch('certificates/:id')
  @ApiOperation({ summary: 'Update a certificate entry' })
  async updateCertificate(
    @CurrentUser('id') userId: string,
    @Param('id') certId: string,
    @Body() dto: UpdateCertificateDto,
  ) {
    return this.communityProfileService.updateCertificate(userId, certId, dto);
  }

  @Delete('certificates/:id')
  @ApiOperation({ summary: 'Delete a certificate entry' })
  async deleteCertificate(
    @CurrentUser('id') userId: string,
    @Param('id') certId: string,
  ) {
    return this.communityProfileService.deleteCertificate(userId, certId);
  }

  // ----------------------------------------------------
  // RESUME ENDPOINTS
  // ----------------------------------------------------

  @Post('resume')
  @ApiOperation({ summary: 'Upload profile resume (PDF format)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadResume(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('PDF file upload is required');
    }
    return this.communityProfileService.uploadResume(userId, file);
  }

  @Delete('resume')
  @ApiOperation({ summary: 'Remove profile resume' })
  async deleteResume(@CurrentUser('id') userId: string) {
    return this.communityProfileService.deleteResume(userId);
  }

  // ----------------------------------------------------
  // AVATAR & COVER MEDIA UPLOADS
  // ----------------------------------------------------

  @Post('avatar')
  @ApiOperation({ summary: 'Upload profile avatar picture' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.communityProfileService.uploadProfileAvatar(userId, file);
  }

  @Post('cover')
  @ApiOperation({ summary: 'Upload profile cover banner' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadCover(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.communityProfileService.uploadCoverBanner(userId, file);
  }

  @Post('media')
  @ApiOperation({
    summary: 'Upload general project or certificate media asset to S3',
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadMedia(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const url = await this.communityProfileService.uploadFileToS3(
      file,
      'media',
      userId,
      ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'],
      50 * 1024 * 1024,
    );
    return { url };
  }

  // ----------------------------------------------------
  // FOLLOW ENDPOINTS
  // ----------------------------------------------------

  @Post('follow/:userId')
  @ApiOperation({ summary: 'Follow a user' })
  async followUser(
    @CurrentUser('id') currentUserId: string,
    @Param('userId') targetUserId: string,
  ) {
    return this.communityProfileService.followUser(currentUserId, targetUserId);
  }

  @Delete('follow/:userId')
  @ApiOperation({ summary: 'Unfollow a user' })
  async unfollowUser(
    @CurrentUser('id') currentUserId: string,
    @Param('userId') targetUserId: string,
  ) {
    return this.communityProfileService.unfollowUser(
      currentUserId,
      targetUserId,
    );
  }

  @Get('followers/:userId')
  @ApiOperation({ summary: 'Get list of followers for a user' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getFollowers(
    @Param('userId') targetUserId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.communityProfileService.getFollowers(
      targetUserId,
      parseInt(page, 10),
      parseInt(limit, 10),
    );
  }

  @Get('following/:userId')
  @ApiOperation({ summary: 'Get list of users followed by a user' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getFollowing(
    @Param('userId') targetUserId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.communityProfileService.getFollowing(
      targetUserId,
      parseInt(page, 10),
      parseInt(limit, 10),
    );
  }
}
