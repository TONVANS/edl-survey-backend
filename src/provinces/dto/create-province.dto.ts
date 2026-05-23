import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class CreateProvinceDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsUUID()
  @IsNotEmpty()
  regionId: string;
}
