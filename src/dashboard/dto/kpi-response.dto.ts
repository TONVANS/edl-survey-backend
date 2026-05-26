import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ActiveSurveyDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  isActive: boolean;
}

export class CoverageByProvinceDto {
  @ApiProperty({ description: "Number of provinces with at least one response." })
  covered: number;

  @ApiProperty({ description: "Total number of provinces in scope." })
  total: number;

  @ApiProperty({ description: "Percentage of coverage.", example: 77.8 })
  percentage: number;
}

export class KpiResponseDto {
  @ApiProperty({ description: "Total responses for the target survey and role scope." })
  totalResponses: number;

  @ApiPropertyOptional({ description: "Delta comparison for total responses (current month vs previous month). Percentage.", example: 12.5 })
  totalResponsesDelta: number | null;

  @ApiProperty({ description: "Average rating for the target survey and role scope." })
  averageRating: number;

  @ApiPropertyOptional({ description: "Delta comparison for average rating (current month vs previous month). Raw value difference.", example: 0.13 })
  averageRatingDelta: number | null;

  @ApiProperty({ type: ActiveSurveyDto })
  activeSurvey: ActiveSurveyDto | null;

  @ApiProperty({ type: CoverageByProvinceDto })
  coverageByProvince: CoverageByProvinceDto;

  @ApiProperty({ description: "Number of responses submitted today (UTC)." })
  responseToday: number;

  @ApiProperty({ description: "Timestamp when the report was generated." })
  generatedAt: string;
}
