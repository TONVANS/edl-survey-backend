import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsUUID, IsBoolean } from "class-validator";
import { Transform } from "class-transformer";

export class KpiQueryDto {
  @ApiPropertyOptional({ description: "ID of the specific survey. Defaults to the active survey if not provided.", example: "uuid" })
  @IsOptional()
  @IsUUID()
  surveyId?: string;

  @ApiPropertyOptional({ description: "Whether to calculate delta comparison with the previous month.", default: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === "true" || value === true)
  compareWithPreviousPeriod?: boolean = false;
}
