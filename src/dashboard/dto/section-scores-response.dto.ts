import { ApiProperty } from "@nestjs/swagger";

export class QuestionScoreDto {
  @ApiProperty()
  questionId: string;

  @ApiProperty()
  questionText: string;

  @ApiProperty()
  order: number;

  @ApiProperty({ type: Number, nullable: true })
  averageRating: number | null;

  @ApiProperty()
  totalAnswered: number;

  @ApiProperty({ type: Number, nullable: true })
  comparisonRating: number | null;
}

export class SectionScoreItemDto {
  @ApiProperty()
  sectionId: string;

  @ApiProperty()
  sectionTitle: string;

  @ApiProperty()
  order: number;

  @ApiProperty({ type: Number, nullable: true })
  averageRating: number | null;

  @ApiProperty({ type: [QuestionScoreDto] })
  questions: QuestionScoreDto[];
}

export class SectionScoresResponseDto {
  @ApiProperty()
  surveyId: string;

  @ApiProperty({ type: [SectionScoreItemDto] })
  sections: SectionScoreItemDto[];

  @ApiProperty({ type: Number, nullable: true })
  overallAverage: number | null;

  @ApiProperty({ type: Number, nullable: true })
  comparisonOverallAverage: number | null;

  @ApiProperty()
  generatedAt: string;
}
