import { PartialType } from '@nestjs/mapped-types';
import { CreateSurveyResponseDto } from './create-survey-response.dto';

export class UpdateSurveyResponseDto extends PartialType(
  CreateSurveyResponseDto,
) {}
