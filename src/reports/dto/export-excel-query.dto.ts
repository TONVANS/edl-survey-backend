import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsUUID, IsISO8601 } from "class-validator";

export class ExportExcelQueryDto {
  @ApiPropertyOptional({ description: "Filter by specific survey ID", example: "uuid" })
  @IsOptional()
  @IsUUID()
  surveyId?: string;

  @ApiPropertyOptional({ description: "Filter by start date (ISO string)", example: "2026-01-01T00:00:00Z" })
  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @ApiPropertyOptional({ description: "Filter by end date (ISO string)", example: "2026-05-26T23:59:59Z" })
  @IsOptional()
  @IsISO8601()
  endDate?: string;

  @ApiPropertyOptional({ description: "Filter by province ID (SUPER_ADMIN only can override their scope)", example: "uuid" })
  @IsOptional()
  @IsUUID()
  provinceId?: string;

  @ApiPropertyOptional({ description: "Filter by district ID", example: "uuid" })
  @IsOptional()
  @IsUUID()
  districtId?: string;
}
