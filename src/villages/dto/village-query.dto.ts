import { IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class VillageQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  districtId?: string;
}
