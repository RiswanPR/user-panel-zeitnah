import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SendOpportunityDto {
  @IsNotEmpty()
  @IsString()
  businessId!: string;

  @IsNotEmpty()
  @IsString()
  jobId!: string;

  @IsNotEmpty()
  @IsString()
  candidateUserId!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(1000)
  message!: string;
}
