import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class CreateVillageDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsUUID()
  @IsNotEmpty()
  regionId: string;

  @IsUUID()
  @IsNotEmpty()
  provinceId: string;

  @IsUUID()
  @IsNotEmpty()
  districtId: string;
}
