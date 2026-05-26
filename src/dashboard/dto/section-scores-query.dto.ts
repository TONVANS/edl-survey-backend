import { ApiPropertyOptional, ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsUUID, IsOptional, IsDateString } from "class-validator";

export class SectionScoresQueryDto {
  @ApiProperty({ description: "ID of the specific survey" })
  @IsNotEmpty()
  @IsUUID()
  surveyId: string;

  @ApiPropertyOptional({ description: "Start date for filtering (ISO 8601)" })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: "End date for filtering (ISO 8601)" })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: "ID of a province to compare against (SUPER_ADMIN only)" })
  @IsOptional()
  @IsUUID()
  compareProvinceId?: string;
}
