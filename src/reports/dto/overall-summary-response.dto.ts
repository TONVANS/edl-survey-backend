import { ApiProperty } from '@nestjs/swagger';

export class SectionSummaryDto {
  @ApiProperty({
    description: 'Unique identifier of the survey section',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  sectionId: string;

  @ApiProperty({
    description: 'Title of the survey section',
    example: 'Service Quality',
  })
  sectionTitle: string;

  @ApiProperty({
    description: 'Average rating for RATING questions inside this section (rounded to 2 decimal places)',
    example: 4.1,
  })
  averageRating: number;

  @ApiProperty({
    description: 'Total number of RATING questions in this section',
    example: 5,
  })
  questionCount: number;
}

export class RatingDistributionDto {
  @ApiProperty({ description: 'Number of 1-star ratings', example: 42 })
  '1': number;

  @ApiProperty({ description: 'Number of 2-star ratings', example: 98 })
  '2': number;

  @ApiProperty({ description: 'Number of 3-star ratings', example: 310 })
  '3': number;

  @ApiProperty({ description: 'Number of 4-star ratings', example: 480 })
  '4': number;

  @ApiProperty({ description: 'Number of 5-star ratings', example: 310 })
  '5': number;
}

export class OverallSummaryResponseDto {
  @ApiProperty({
    description: 'Total number of survey responses submitted matching the search criteria',
    example: 1240,
  })
  totalResponses: number;

  @ApiProperty({
    description: 'Overall average rating across all rating questions (rounded to 2 decimal places)',
    example: 3.87,
  })
  averageRating: number;

  @ApiProperty({
    description: 'Distribution of ratings from 1 to 5 stars',
    type: RatingDistributionDto,
  })
  ratingDistribution: RatingDistributionDto;

  @ApiProperty({
    description: 'Breakdown of average rating and question count by survey section',
    type: [SectionSummaryDto],
  })
  bySection: SectionSummaryDto[];

  @ApiProperty({
    description: 'Title of the selected or default survey',
    example: 'Annual Satisfaction 2026',
  })
  surveyTitle: string;

  @ApiProperty({
    description: 'Timestamp when this report was generated (ISO 8601 string)',
    example: '2026-01-01T00:00:00Z',
  })
  generatedAt: string;
}
