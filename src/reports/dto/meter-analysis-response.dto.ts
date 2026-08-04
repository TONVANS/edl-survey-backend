import { ApiProperty } from '@nestjs/swagger';
import { MeterType } from '@prisma/client';

export class MeterTypeSummaryDto {
  @ApiProperty({ enum: MeterType, description: 'Meter type (MONO_PHASE or THREE_PHASE)' })
  type: MeterType;

  @ApiProperty({ description: 'Total count of meters for this type' })
  totalQuantity: number;

  @ApiProperty({ description: 'Percentage out of all meters' })
  percentage: number;
}

export class MeterSizeSummaryDto {
  @ApiProperty({ description: 'Meter size ID' })
  meterSizeId: string;

  @ApiProperty({ enum: MeterType, description: 'Meter type' })
  type: MeterType;

  @ApiProperty({ description: 'Amps rating string (e.g. 5(15)A)' })
  amps: string;

  @ApiProperty({ description: 'Optional description' })
  description?: string;

  @ApiProperty({ description: 'Display order' })
  order?: number;

  @ApiProperty({ description: 'Total count of meters for this size' })
  totalQuantity: number;

  @ApiProperty({ description: 'Percentage out of all meters' })
  percentage: number;
}

export class MeterAnalysisResponseDto {
  @ApiProperty({ description: 'Grand total quantity of all meters' })
  totalMeters: number;

  @ApiProperty({ type: [MeterTypeSummaryDto], description: 'Breakdown of meters grouped by MeterType' })
  byType: MeterTypeSummaryDto[];

  @ApiProperty({ type: [MeterSizeSummaryDto], description: 'Breakdown of meters grouped by specific MeterSize (Amps rating)' })
  bySize: MeterSizeSummaryDto[];

  @ApiProperty({ description: 'ISO timestamp when report was generated' })
  generatedAt: string;
}
