import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsUUID } from "class-validator";

export class FilterOptionsQueryDto {
  @ApiPropertyOptional({ description: "Filter districts by province ID" })
  @IsOptional()
  @IsUUID()
  provinceId?: string;

  @ApiPropertyOptional({ description: "Filter villages by district ID" })
  @IsOptional()
  @IsUUID()
  districtId?: string;
}
