import {
  IsOptional,
  IsString,
  IsArray,
} from 'class-validator';

export class UpdateProfileDto {

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsArray()
  skills?: string[];

}