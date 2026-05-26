import { ApiProperty } from "@nestjs/swagger";
import { Role } from "@prisma/client";

class FilterItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;
}

class ProvinceFilterItemDto extends FilterItemDto {
  @ApiProperty()
  regionId: string;
}

class DistrictFilterItemDto extends FilterItemDto {
  @ApiProperty()
  provinceId: string;
}

class VillageFilterItemDto extends FilterItemDto {
  @ApiProperty()
  districtId: string;
}

class SurveyFilterItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  isActive: boolean;
}

class UserScopeDto {
  @ApiProperty({ enum: Role })
  role: Role;

  @ApiProperty({ type: String, nullable: true })
  regionId: string | null;

  @ApiProperty({ type: String, nullable: true })
  provinceId: string | null;
}

export class FilterOptionsResponseDto {
  @ApiProperty({ type: [FilterItemDto] })
  regions: FilterItemDto[];

  @ApiProperty({ type: [ProvinceFilterItemDto] })
  provinces: ProvinceFilterItemDto[];

  @ApiProperty({ type: [DistrictFilterItemDto] })
  districts: DistrictFilterItemDto[];

  @ApiProperty({ type: [VillageFilterItemDto] })
  villages: VillageFilterItemDto[];

  @ApiProperty({ type: [SurveyFilterItemDto] })
  surveys: SurveyFilterItemDto[];

  @ApiProperty({ type: [FilterItemDto] })
  customerTypes: FilterItemDto[];

  @ApiProperty({ type: UserScopeDto })
  userScope: UserScopeDto;
}
