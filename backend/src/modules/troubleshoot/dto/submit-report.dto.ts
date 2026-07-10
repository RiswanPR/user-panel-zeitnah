import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  MaxLength,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class ConsoleErrorDto {
  @IsString()
  type: string;

  @IsString()
  message: string;

  @IsString()
  timestamp: string;

  @IsOptional()
  @IsString()
  stack?: string;
}

class NetworkErrorDto {
  @IsString()
  method: string;

  @IsString()
  url: string;

  @IsOptional()
  status?: number;

  @IsString()
  message: string;

  @IsString()
  timestamp: string;
}

class UnhandledErrorDto {
  @IsString()
  type: string;

  @IsString()
  message: string;

  @IsString()
  timestamp: string;

  @IsOptional()
  @IsString()
  stack?: string;

  @IsOptional()
  @IsString()
  source?: string;
}

class BrowserInfoDto {
  @IsString()
  browser: string;

  @IsString()
  os: string;

  @IsString()
  screenSize: string;

  @IsString()
  userAgent: string;
}

export class SubmitReportDto {
  @ApiProperty({ enum: ['low', 'medium', 'high', 'critical'] })
  @IsEnum(['low', 'medium', 'high', 'critical'])
  severity: string;

  @ApiProperty({ maxLength: 200 })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pageUrl?: string;

  @ApiPropertyOptional({ type: [ConsoleErrorDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConsoleErrorDto)
  consoleErrors?: ConsoleErrorDto[];

  @ApiPropertyOptional({ type: [NetworkErrorDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NetworkErrorDto)
  networkErrors?: NetworkErrorDto[];

  @ApiPropertyOptional({ type: [UnhandledErrorDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UnhandledErrorDto)
  unhandledErrors?: UnhandledErrorDto[];

  @ApiPropertyOptional({ type: BrowserInfoDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => BrowserInfoDto)
  browserInfo?: BrowserInfoDto;
}
