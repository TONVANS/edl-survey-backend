import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsArray,
  ValidateNested,
  IsOptional,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

class AnswerOptionDto {
  @IsUUID()
  @IsNotEmpty()
  optionId: string;
}

export class CreateAnswerDto {
  @IsUUID()
  @IsNotEmpty()
  questionId: string;

  @IsString()
  @IsOptional()
  textValue?: string;

  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  ratingValue?: number;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => AnswerOptionDto)
  selectedOptions?: AnswerOptionDto[];
}

export class CreateSurveyResponseDto {
  @IsUUID()
  @IsNotEmpty()
  surveyId: string;

  @IsString()
  @IsNotEmpty()
  customerNumber: string;

  @IsUUID()
  @IsNotEmpty()
  customerType: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  monoPhaseMeterCount?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  threePhaseMeterCount?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  transformer100kVA?: number;

  @IsUUID()
  @IsNotEmpty()
  provinceId: string;

  @IsUUID()
  @IsNotEmpty()
  districtId: string;

  @IsUUID()
  @IsNotEmpty()
  villageId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAnswerDto)
  answers: CreateAnswerDto[];
}
