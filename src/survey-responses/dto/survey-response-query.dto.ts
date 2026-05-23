import { IsOptional, IsUUID, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class SurveyResponseQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  surveyId?: string;

  @IsOptional()
  @IsUUID()
  provinceId?: string;

  @IsOptional()
  @IsUUID()
  districtId?: string;

  @IsOptional()
  @IsUUID()
  villageId?: string;

  @IsOptional()
  @IsUUID()
  customerType?: string;

  @IsOptional()
  @IsString()
  customerNumber?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}
