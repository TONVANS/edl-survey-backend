import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, IsUUID, IsISO8601 } from "class-validator";

export class QuestionDetailQueryDto {
  @ApiProperty({ description: "ID of the survey", example: "uuid" })
  @IsNotEmpty()
  @IsUUID()
  surveyId: string;

  @ApiPropertyOptional({ description: "Filter by specific section ID", example: "uuid" })
  @IsOptional()
  @IsUUID()
  sectionId?: string;

  @ApiPropertyOptional({ description: "Filter by specific question ID", example: "uuid" })
  @IsOptional()
  @IsUUID()
  questionId?: string;

  @ApiPropertyOptional({ description: "Filter by start date (ISO string)", example: "2026-01-01T00:00:00Z" })
  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @ApiPropertyOptional({ description: "Filter by end date (ISO string)", example: "2026-05-26T23:59:59Z" })
  @IsOptional()
  @IsISO8601()
  endDate?: string;
}
