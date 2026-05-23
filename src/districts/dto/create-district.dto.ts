import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class CreateDistrictDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsUUID()
  @IsNotEmpty()
  provinceId: string;
}
