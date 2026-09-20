import { IsString, IsOptional } from 'class-validator';

export class SendConnectionRequestDto {
  @IsString()
  recipientId: string;
}

export class QueryPeopleDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;
}
