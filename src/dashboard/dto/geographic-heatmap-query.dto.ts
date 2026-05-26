import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsUUID, IsEnum, IsDateString } from "class-validator";

export enum GeographicLevel {
  REGION = "region",
  PROVINCE = "province",
  DISTRICT = "district",
}

export class GeographicHeatmapQueryDto {
  @ApiPropertyOptional({ description: "ID of the specific survey. Defaults to active survey if omitted." })
  @IsOptional()
  @IsUUID()
  surveyId?: string;

  @ApiPropertyOptional({ enum: GeographicLevel, default: GeographicLevel.PROVINCE })
  @IsOptional()
  @IsEnum(GeographicLevel)
  level?: GeographicLevel = GeographicLevel.PROVINCE;

  @ApiPropertyOptional({ description: "Start date for filtering responses" })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: "End date for filtering responses" })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
