import { PartialType } from '@nestjs/mapped-types';
import { CreateSurveySectionDto } from './create-survey-section.dto';

export class UpdateSurveySectionDto extends PartialType(
  CreateSurveySectionDto,
) {}
