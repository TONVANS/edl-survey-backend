import { IsInt, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTransformerSizeDto {
  @ApiProperty({ description: 'The size in kVA', example: 100 })
  @IsInt()
  @Min(1)
  sizeKVA: number;

  @ApiProperty({ description: 'Order for sorting', required: false, example: 1 })
  @IsInt()
  @IsOptional()
  order?: number;
}
