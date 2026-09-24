import { PartialType } from '@nestjs/swagger';
import { CreateProfileDto } from './create-profile.dto';

export class UpdateCommunityProfileDto extends PartialType(CreateProfileDto) {}
