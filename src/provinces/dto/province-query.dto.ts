import { IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ProvinceQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  regionId?: string;
}
