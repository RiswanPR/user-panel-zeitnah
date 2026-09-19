import { IsBoolean } from 'class-validator';

export class PublishProfileDto {
  @IsBoolean({ message: 'published must be a boolean.' })
  published!: boolean;
}
