import { ApiProperty } from "@nestjs/swagger";

export class SectionGraphItemDto {
  @ApiProperty({ description: "ID of the question" })
  questionId: string;

  @ApiProperty({ description: "Text of the question" })
  questionText: string;

  @ApiProperty({ description: "Average rating score (0 if no responses)", example: 4.25 })
  averageScore: number;

  @ApiProperty({ description: "Number of people who answered this specific question" })
  answerCount: number;
}

export class SectionGraphResponseDto {
  @ApiProperty({ description: "Title of the survey section" })
  sectionTitle: string;

  @ApiProperty({ description: "Total number of unique survey responses included in this scope" })
  totalResponses: number;

  @ApiProperty({ type: [SectionGraphItemDto], description: "Aggregated data for questions in the section" })
  chartData: SectionGraphItemDto[];
}
