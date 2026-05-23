import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsUUID,
} from 'class-validator';

export class CreateQuestionOptionDto {
  @IsUUID()
  @IsNotEmpty()
  questionId: string;

  @IsString()
  @IsNotEmpty()
  text: string;

  @IsString()
  @IsOptional()
  value?: string;

  @IsInt()
  @IsNotEmpty()
  order: number;
}
