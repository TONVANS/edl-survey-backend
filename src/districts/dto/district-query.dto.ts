import { IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class DistrictQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  provinceId?: string;
}
