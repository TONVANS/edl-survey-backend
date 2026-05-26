import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { QuestionType } from "@prisma/client";

export class QuestionOptionDetailDto {
  @ApiProperty({ description: "ID of the option" })
  optionId: string;

  @ApiProperty({ description: "Text of the option" })
  text: string;

  @ApiProperty({ description: "Number of times this option was selected" })
  count: number;

  @ApiProperty({ description: "Percentage of total answers for this question" })
  percentage: number;
}

export class QuestionDetailItemDto {
  @ApiProperty({ description: "ID of the question" })
  questionId: string;

  @ApiProperty({ description: "Text of the question" })
  questionText: string;

  @ApiProperty({ enum: QuestionType, description: "Type of the question" })
  type: QuestionType;

  @ApiProperty({ description: "Display order" })
  order: number;

  @ApiProperty({ description: "Total number of responses that answered this question" })
  totalAnswered: number;

  @ApiProperty({ description: "Total number of responses that skipped this question" })
  skipped: number;

  @ApiPropertyOptional({ description: "Average rating (for RATING type)", example: 4.5 })
  ratingAverage?: number;

  @ApiPropertyOptional({ 
    description: "Rating distribution (for RATING type)", 
    example: { "1": 5, "2": 10, "3": 20, "4": 40, "5": 25 } 
  })
  ratingDistribution?: Record<string, number>;

  @ApiPropertyOptional({ type: [QuestionOptionDetailDto], description: "Option details (for SINGLE_CHOICE/MULTIPLE_CHOICE)" })
  options?: QuestionOptionDetailDto[];
}

export class QuestionDetailSectionDto {
  @ApiProperty({ description: "ID of the section" })
  sectionId: string;

  @ApiProperty({ description: "Title of the section" })
  sectionTitle: string;

  @ApiProperty({ description: "Display order" })
  order: number;

  @ApiProperty({ type: [QuestionDetailItemDto], description: "Questions in this section" })
  questions: QuestionDetailItemDto[];
}

export class QuestionDetailResponseDto {
  @ApiProperty({ description: "ID of the survey" })
  surveyId: string;

  @ApiProperty({ type: [QuestionDetailSectionDto], description: "Sections of the survey" })
  sections: QuestionDetailSectionDto[];

  @ApiProperty({ description: "Timestamp when the report was generated" })
  generatedAt: string;
}
