import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsUUID } from "class-validator";

export class SectionGraphQueryDto {
  @ApiProperty({ description: "ID of the survey", example: "uuid" })
  @IsNotEmpty()
  @IsUUID()
  surveyId: string;

  @ApiProperty({ description: "ID of the survey section", example: "uuid" })
  @IsNotEmpty()
  @IsUUID()
  sectionId: string;

  @ApiPropertyOptional({ description: "Filter by province ID", example: "uuid" })
  @IsOptional()
  @IsUUID()
  provinceId?: string;

  @ApiPropertyOptional({ description: "Filter by district ID", example: "uuid" })
  @IsOptional()
  @IsUUID()
  districtId?: string;

  @ApiPropertyOptional({ description: "Filter by village ID", example: "uuid" })
  @IsOptional()
  @IsUUID()
  villageId?: string;
}
