import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsUUID,
  IsArray,
} from 'class-validator';

export class CreateAnswerDto {
  @IsUUID()
  @IsNotEmpty()
  responseId: string;

  @IsUUID()
  @IsNotEmpty()
  questionId: string;

  @IsString()
  @IsOptional()
  textValue?: string;

  @IsInt()
  @IsOptional()
  ratingValue?: number;

  @IsArray()
  @IsUUID(undefined, { each: true })
  @IsOptional()
  optionIds?: string[];
}
