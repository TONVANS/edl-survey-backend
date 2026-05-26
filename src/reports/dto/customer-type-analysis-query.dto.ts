import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsISO8601, IsOptional, IsUUID } from "class-validator";

export class CustomerTypeAnalysisQueryDto {
  @ApiPropertyOptional({ description: "Filter report by specific survey (UUID)" })
  @IsOptional()
  @IsUUID()
  surveyId?: string;

  @ApiPropertyOptional({
    description: "Filter responses submitted on or after this date (ISO 8601 string)",
  })
  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @ApiPropertyOptional({
    description: "Filter responses submitted on or before this date (ISO 8601 string)",
  })
  @IsOptional()
  @IsISO8601()
  endDate?: string;
}
