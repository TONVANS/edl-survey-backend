// src/reports/dto/customer-type-analysis-response.dto.ts
import { ApiProperty } from "@nestjs/swagger";

export class CustomerTypeItemDto {
  @ApiProperty({ description: "ID of the customer type" })
  customerTypeId: string;

  @ApiProperty({ description: "Name of the customer type" })
  customerTypeName: string;

  @ApiProperty({ description: "Total number of responses for this customer type" })
  totalResponses: number;

  @ApiProperty({ description: "Average rating for this customer type" })
  averageRating: number;

  @ApiProperty({ description: "Total mono-phase meters" })
  totalMonoPhaseMeter: number;

  @ApiProperty({ description: "Total three-phase meters" })
  totalThreePhaseMeter: number;

  @ApiProperty({ description: "Total 100kVA transformers" })
  totalTransformer100kVA: number;

  @ApiProperty({
    description: "Rating distribution (1-5 stars)",
    example: { "1": 10, "2": 20, "3": 50, "4": 100, "5": 80 },
  })
  ratingDistribution: Record<string, number>;
}

export class CustomerTypeAnalysisResponseDto {
  @ApiProperty({ type: [CustomerTypeItemDto], description: "Analysis data by customer type" })
  customerTypes: CustomerTypeItemDto[];

  @ApiProperty({ description: "Timestamp when the report was generated" })
  generatedAt: string;
}
