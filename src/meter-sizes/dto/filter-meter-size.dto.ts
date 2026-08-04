import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { MeterType } from '@prisma/client';

export class FilterMeterSizeDto {
  @ApiPropertyOptional({
    enum: MeterType,
    description: 'Filter meter sizes by MeterType (MONO_PHASE or THREE_PHASE)',
  })
  @IsEnum(MeterType)
  @IsOptional()
  type?: MeterType;
}
