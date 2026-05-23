import {
  IsString,
  IsNotEmpty,
  IsBoolean,
  IsInt,
  IsUUID,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { QuestionType } from '@prisma/client';

export class CreateQuestionDto {
  @IsUUID()
  @IsNotEmpty()
  sectionId: string;

  @IsString()
  @IsNotEmpty()
  text: string;

  @IsEnum(QuestionType)
  @IsNotEmpty()
  type: QuestionType;

  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;

  @IsInt()
  @IsNotEmpty()
  order: number;
}
