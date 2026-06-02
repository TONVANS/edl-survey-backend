import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCustomerTypeDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  order?: number;
}
