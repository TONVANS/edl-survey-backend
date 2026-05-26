import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsISO8601, IsOptional, IsString, IsUUID } from 'class-validator';
import { GeographicLevel } from './geographic-level.enum';

export class GeographicQueryDto {
  @ApiPropertyOptional({ description: 'Filter report by specific survey (UUID)' })
  @IsOptional()
  @IsUUID()
  surveyId?: string;

  @ApiPropertyOptional({
    enum: GeographicLevel,
    default: GeographicLevel.PROVINCE,
    description: 'Aggregation level',
  })
  @IsOptional()
  @IsEnum(GeographicLevel)
  level?: GeographicLevel = GeographicLevel.PROVINCE;

  @ApiPropertyOptional({ description: 'Filter by region (only for SUPER_ADMIN)' })
  @IsOptional()
  @IsUUID()
  regionId?: string;

  @ApiPropertyOptional({
    description: 'Filter by province (for SUPER_ADMIN and REGION_ADMIN)',
  })
  @IsOptional()
  @IsUUID()
  provinceId?: string;

  @ApiPropertyOptional({
    description: 'Filter responses submitted on or after this date (ISO 8601 string)',
  })
  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Filter responses submitted on or before this date (ISO 8601 string)',
  })
  @IsOptional()
  @IsISO8601()
  endDate?: string;
}
