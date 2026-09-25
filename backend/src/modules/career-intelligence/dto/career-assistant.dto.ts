import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CareerAssistantQueryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  question!: string;
}

export interface CareerAssistantResponse {
  answer: string;
  profileReferences: string[];
  marketReferences: string[];
  suggestedActionItems: string[];
  relatedRole?: string;
  sourceTimestamp: string;
}
