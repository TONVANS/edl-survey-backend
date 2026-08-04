import { IsEnum, IsNotEmpty, IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MeterType } from '@prisma/client';

export class CreateMeterSizeDto {
  @ApiProperty({
    enum: MeterType,
    description: 'Meter type (MONO_PHASE or THREE_PHASE)',
    example: MeterType.MONO_PHASE,
  })
  @IsEnum(MeterType)
  @IsNotEmpty()
  type: MeterType;

  @ApiProperty({
    description: 'Meter amps rating (e.g. "5(15)A", "10(30)A", "15(45)A", "10(40)A")',
    example: '5(15)A',
  })
  @IsString()
  @IsNotEmpty()
  amps: string;

  @ApiPropertyOptional({
    description: 'Optional description of the meter size',
    example: 'Single phase meter 5(15)A',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Display order priority',
    example: 1,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  order?: number;
}
