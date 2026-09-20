import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Skill, SkillSchema } from './schemas/skill.schema';
import { UserSkill, UserSkillSchema } from './schemas/user-skill.schema';
import { SkillProof, SkillProofSchema } from './schemas/skill-proof.schema';
import { SkillsService } from './skills.service';
import { SkillsController } from './skills.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Skill.name, schema: SkillSchema },
      { name: UserSkill.name, schema: UserSkillSchema },
      { name: SkillProof.name, schema: SkillProofSchema },
    ]),
  ],
  providers: [SkillsService],
  controllers: [SkillsController],
  exports: [SkillsService],
})
export class SkillsModule {}
