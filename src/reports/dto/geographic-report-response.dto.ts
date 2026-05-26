import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GeographicLevel } from './geographic-level.enum';

export class GeographicItemDto {
  @ApiProperty({ description: 'ID of the geographic entity' })
  id: string;

  @ApiProperty({ description: 'Name of the geographic entity' })
  name: string;

  @ApiPropertyOptional({ description: 'Name of the parent geographic entity (if applicable)' })
  parentName?: string;

  @ApiProperty({ description: 'Total number of responses in this area' })
  totalResponses: number;

  @ApiProperty({ description: 'Average rating for this area' })
  averageRating: number;

  @ApiPropertyOptional({
    description:
      'Growth in number of responses compared to previous same-length period (%)',
  })
  responseGrowth: number | null;
}

export class GeographicReportResponseDto {
  @ApiProperty({ enum: GeographicLevel, description: 'The aggregation level used' })
  level: GeographicLevel;

  @ApiProperty({ type: [GeographicItemDto], description: 'Aggregated geographic data' })
  data: GeographicItemDto[];

  @ApiProperty({ description: 'Total number of items in the data array' })
  total: number;

  @ApiProperty({ description: 'Timestamp when the report was generated' })
  generatedAt: string;
}
