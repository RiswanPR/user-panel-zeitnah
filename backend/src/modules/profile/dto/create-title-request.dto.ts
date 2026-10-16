import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateTitleRequestDto {
  @IsNotEmpty({ message: 'Department ID is required.' })
  @IsString({ message: 'Department ID must be a string.' })
  @MaxLength(100, { message: 'Department ID must not exceed 100 characters.' })
  departmentId!: string;

  @IsNotEmpty({ message: 'Title label is required.' })
  @IsString({ message: 'Title label must be a string.' })
  @MinLength(2, { message: 'Title label must be at least 2 characters long.' })
  @MaxLength(100, { message: 'Title label must not exceed 100 characters.' })
  title!: string;
}
