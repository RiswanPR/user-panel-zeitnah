import { IsString, IsOptional, IsEnum, MaxLength } from 'class-validator';

export class CreateDiscussionDto {
  @IsString()
  @MaxLength(200)
  title: string;

  @IsString()
  @MaxLength(10000)
  body: string;

  @IsOptional()
  @IsEnum(['question', 'discussion', 'project', 'resource', 'study_help'])
  type?: string;
}

export class CreateReplyDto {
  @IsString()
  @MaxLength(5000)
  body: string;
}

export class CreateSpaceAnnouncementDto {
  @IsString()
  @MaxLength(200)
  title: string;

  @IsString()
  @MaxLength(10000)
  content: string;

  @IsOptional()
  pinned?: boolean;
}

export class CreateResourceDto {
  @IsString()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsEnum(['course', 'document', 'link'])
  type?: string;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsString()
  targetId?: string;
}
