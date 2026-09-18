import {
  IsOptional,
  IsString,
  IsArray,
  MaxLength,
  ArrayMaxSize,
} from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Name must not exceed 100 characters.' })
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Biography must not exceed 500 characters.' })
  bio?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30, { message: 'You can specify at most 30 skills.' })
  @IsString({ each: true, message: 'Each skill must be a string.' })
  @MaxLength(50, { each: true, message: 'Each skill must not exceed 50 characters.' })
  skills?: string[];
}

