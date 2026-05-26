import { IsOptional, IsUUID, IsISO8601 } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class OverallSummaryQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by specific survey ID (UUID)',
    example: 'd3b07384-d113-49cd-a5d6-89d6e52ad3a9',
  })
  @IsOptional()
  @IsUUID()
  surveyId?: string;

  @ApiPropertyOptional({
    description: 'Filter responses submitted on or after this date (ISO 8601 string)',
    example: '2026-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Filter responses submitted on or before this date (ISO 8601 string)',
    example: '2026-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsISO8601()
  endDate?: string;
}
