import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SkillsService } from './skills.service';
import { SkillProficiency, SkillVisibility } from './schemas/user-skill.schema';

interface AddSkillDto {
  skillName: string;
  proficiency?: SkillProficiency;
  visibility?: SkillVisibility;
}

@Controller('skills')
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @Get('search')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async searchSkills(@Query('q') query: string) {
    return this.skillsService.searchSkills(query);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMySkills(@Req() req: any) {
    return this.skillsService.getUserSkills(req.user.userId);
  }

  @Post('me')
  @UseGuards(JwtAuthGuard)
  async addMySkill(@Req() req: any, @Body() body: AddSkillDto) {
    return this.skillsService.addUserSkill(req.user.userId, body);
  }

  @Delete('me/:id')
  @UseGuards(JwtAuthGuard)
  async removeMySkill(@Req() req: any, @Param('id') id: string) {
    return this.skillsService.removeUserSkill(req.user.userId, id);
  }

  @Get('user/:userId')
  async getUserSkills(@Param('userId') userId: string) {
    return this.skillsService.getUserSkills(userId);
  }
}
