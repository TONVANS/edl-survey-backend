import { IsOptional, IsUUID, IsString, IsInt } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { Type } from 'class-transformer';

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
  @IsInt()
  @Type(() => Number)
  customerNumber?: number;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  customerPhoneNumber?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}
