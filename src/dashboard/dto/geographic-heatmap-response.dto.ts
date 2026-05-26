import { ApiProperty } from "@nestjs/swagger";
import { GeographicLevel } from "./geographic-heatmap-query.dto";

export class HeatmapItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ type: String, nullable: true })
  parentId: string | null;

  @ApiProperty({ type: String, nullable: true })
  parentName: string | null;

  @ApiProperty({ type: Number, nullable: true })
  averageRating: number | null;

  @ApiProperty()
  totalResponses: number;

  @ApiProperty()
  colorIntensity: number;
}

export class GeographicHeatmapResponseDto {
  @ApiProperty({ enum: GeographicLevel })
  level: GeographicLevel;

  @ApiProperty({ type: [HeatmapItemDto] })
  items: HeatmapItemDto[];

  @ApiProperty({ type: Number, nullable: true })
  minRating: number | null;

  @ApiProperty({ type: Number, nullable: true })
  maxRating: number | null;

  @ApiProperty()
  generatedAt: string;
}
