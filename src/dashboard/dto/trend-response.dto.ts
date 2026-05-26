import { ApiProperty } from "@nestjs/swagger";
import { TrendGroupBy } from "./trend-query.dto";

export class TrendSeriesItemDto {
  @ApiProperty({ description: "ISO period string (e.g. 2026-01-15, 2026-W03, 2026-01)" })
  period: string;

  @ApiProperty({ description: "Human-readable label" })
  periodLabel: string;

  @ApiProperty({ type: Number, nullable: true })
  averageRating: number | null;

  @ApiProperty()
  totalResponses: number;

  @ApiProperty({ type: Number, nullable: true })
  movingAverage3: number | null;
}

export class TrendResponseDto {
  @ApiProperty({ enum: TrendGroupBy })
  groupBy: TrendGroupBy;

  @ApiProperty({ type: [TrendSeriesItemDto] })
  series: TrendSeriesItemDto[];

  @ApiProperty()
  generatedAt: string;
}
