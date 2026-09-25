import { IsString, IsArray, IsOptional, ArrayMaxSize } from 'class-validator';

export class SetTargetRolesDto {
  @IsString()
  primaryTargetRole!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(5)
  secondaryTargetRoles?: string[];
}
