import {
  IsString,
  IsNotEmpty,
  IsIn,
  MinLength,
  MaxLength,
} from 'class-validator';

export class SubmitRecommendationDto {
  @IsString()
  @IsNotEmpty({ message: 'Recipient student ID is required.' })
  recipientId!: string;

  @IsString()
  @IsIn(['Mentor', 'Instructor', 'Peer / Student', 'Collaborator', 'Other'], {
    message: 'Relationship must be Mentor, Instructor, Peer / Student, Collaborator, or Other.',
  })
  relationship!: string;

  @IsString()
  @MinLength(20, { message: 'Recommendation must be at least 20 characters.' })
  @MaxLength(1000, { message: 'Recommendation must not exceed 1000 characters.' })
  content!: string;
}

export class UpdateRecommendationStatusDto {
  @IsString()
  @IsIn(['approved', 'hidden'], {
    message: 'Status must be approved or hidden.',
  })
  status!: string;
}
