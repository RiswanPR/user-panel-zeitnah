import { IsEnum, IsOptional, IsDateString } from 'class-validator';
import { OpportunityStatus } from '../schemas/opportunity.schema';

export class UpdateOpportunityStatusDto {
  @IsEnum(OpportunityStatus, {
    message:
      'status must be a valid OpportunityStatus (DRAFT, PUBLISHED, CLOSED, ARCHIVED)',
  })
  status!: OpportunityStatus;

  @IsOptional()
  @IsDateString(
    {},
    { message: 'deadline must be a valid ISO 8601 date string' },
  )
  deadline?: string;

  @IsOptional()
  @IsDateString(
    {},
    { message: 'applicationDeadline must be a valid ISO 8601 date string' },
  )
  applicationDeadline?: string;
}
