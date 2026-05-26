import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsUUID, IsEnum, IsDateString } from "class-validator";

export enum TrendGroupBy {
  DAY = "day",
  WEEK = "week",
  MONTH = "month",
}

export class TrendQueryDto {
  @ApiPropertyOptional({ description: "ID of the specific survey. Defaults to active survey if omitted." })
  @IsOptional()
  @IsUUID()
  surveyId?: string;

  @ApiPropertyOptional({ enum: TrendGroupBy, default: TrendGroupBy.MONTH })
  @IsOptional()
  @IsEnum(TrendGroupBy)
  groupBy?: TrendGroupBy = TrendGroupBy.MONTH;

  @ApiPropertyOptional({ description: "Start date for filtering responses (ISO 8601)" })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: "End date for filtering responses (ISO 8601)" })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: "Optional: Trend for a specific rating question only" })
  @IsOptional()
  @IsUUID()
  questionId?: string;
}
