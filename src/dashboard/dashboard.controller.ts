import { Controller, Get, Query, UseGuards, UseInterceptors, Inject } from "@nestjs/common";
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { DashboardService } from "./dashboard.service";
import { KpiQueryDto } from "./dto/kpi-query.dto";
import { KpiResponseDto } from "./dto/kpi-response.dto";
import { GeographicHeatmapQueryDto } from "./dto/geographic-heatmap-query.dto";
import { GeographicHeatmapResponseDto } from "./dto/geographic-heatmap-response.dto";
import { TrendQueryDto } from "./dto/trend-query.dto";
import { TrendResponseDto } from "./dto/trend-response.dto";
import { SectionScoresQueryDto } from "./dto/section-scores-query.dto";
import { SectionScoresResponseDto } from "./dto/section-scores-response.dto";
import { FilterOptionsQueryDto } from "./dto/filter-options-query.dto";
import { FilterOptionsResponseDto } from "./dto/filter-options-response.dto";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import type { Cache } from "cache-manager";

@ApiTags("Dashboard")
@ApiBearerAuth()
@Controller("dashboard")
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache
  ) {}

  @Get("kpi")
  @Roles(Role.SUPER_ADMIN, Role.REGION_ADMIN, Role.PROVINCE_ADMIN)
  @ApiOperation({
    summary: "Get KPI Overview",
    description: "Returns high-level satisfaction and coverage KPIs, scoped by user role. Includes monthly delta comparisons and caching (60s TTL).",
  })
  @ApiResponse({
    status: 200,
    description: "KPI overview retrieved successfully.",
    type: KpiResponseDto,
  })
  async getKpiOverview(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: KpiQueryDto,
  ): Promise<KpiResponseDto> {
    // Custom Cache Key: dashboard_kpi:{role}:{id}:{surveyId}:{compare}
    const scopeId = user.role === Role.SUPER_ADMIN ? 'all' : (user.regionId || user.provinceId || user.userId);
    const cacheKey = `dashboard_kpi:${user.role}:${scopeId}:${query.surveyId || 'active'}:${query.compareWithPreviousPeriod}`;
    
    const cachedData = await this.cacheManager.get<KpiResponseDto>(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    const result = await this.dashboardService.getKpiOverview(user, query);
    
    // Cache for 60 seconds
    await this.cacheManager.set(cacheKey, result, 60000);
    
    return result;
  }

  @Get("geographic-heatmap")
  @Roles(Role.SUPER_ADMIN, Role.REGION_ADMIN, Role.PROVINCE_ADMIN)
  @ApiOperation({
    summary: "Get Geographic Heatmap Data",
    description: "Returns geographical items with normalized color intensity for choropleth map. Cached for 30s.",
  })
  @ApiResponse({
    status: 200,
    description: "Geographic heatmap data retrieved successfully.",
    type: GeographicHeatmapResponseDto,
  })
  async getGeographicHeatmap(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GeographicHeatmapQueryDto,
  ): Promise<GeographicHeatmapResponseDto> {
    const scopeId = user.role === Role.SUPER_ADMIN ? 'all' : (user.regionId || user.provinceId || user.userId);
    const cacheKey = `dashboard_heatmap:${user.role}:${scopeId}:${query.surveyId || 'active'}:${query.level || 'default'}:${query.startDate || 'none'}:${query.endDate || 'none'}`;
    
    const cachedData = await this.cacheManager.get<GeographicHeatmapResponseDto>(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    const result = await this.dashboardService.getGeographicHeatmap(user, query);
    
    // Cache for 30 seconds
    await this.cacheManager.set(cacheKey, result, 30000);
    
    return result;
  }

  @Get("trend")
  @Roles(Role.SUPER_ADMIN, Role.REGION_ADMIN, Role.PROVINCE_ADMIN)
  @ApiOperation({
    summary: "Get Satisfaction Trend Over Time",
    description: "Returns a time-series of satisfaction scores grouped by day/week/month. Includes 3-period moving average. Cached for 60s.",
  })
  @ApiResponse({
    status: 200,
    description: "Satisfaction trend data retrieved successfully.",
    type: TrendResponseDto,
  })
  async getTrend(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: TrendQueryDto,
  ): Promise<TrendResponseDto> {
    const scopeId = user.role === Role.SUPER_ADMIN ? 'all' : (user.regionId || user.provinceId || user.userId);
    const cacheKey = `dashboard_trend:${user.role}:${scopeId}:${query.surveyId || 'active'}:${query.groupBy}:${query.startDate || 'none'}:${query.endDate || 'none'}:${query.questionId || 'all'}`;
    
    const cachedData = await this.cacheManager.get<TrendResponseDto>(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    const result = await this.dashboardService.getTrend(user, query);
    
    // Cache for 60 seconds
    await this.cacheManager.set(cacheKey, result, 60000);
    
    return result;
  }

  @Get("section-scores")
  @Roles(Role.SUPER_ADMIN, Role.REGION_ADMIN, Role.PROVINCE_ADMIN)
  @ApiOperation({
    summary: "Get Scores by Section and Question",
    description: "Returns average ratings for each section and question. Supports comparison series for SUPER_ADMIN. Cached for 60s.",
  })
  @ApiResponse({
    status: 200,
    description: "Section and question scores retrieved successfully.",
    type: SectionScoresResponseDto,
  })
  async getSectionScores(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: SectionScoresQueryDto,
  ): Promise<SectionScoresResponseDto> {
    const scopeId = user.role === Role.SUPER_ADMIN ? 'all' : (user.regionId || user.provinceId || user.userId);
    const cacheKey = `dashboard_sections:${user.role}:${scopeId}:${query.surveyId}:${query.startDate || 'none'}:${query.endDate || 'none'}:${query.compareProvinceId || 'none'}`;
    
    const cachedData = await this.cacheManager.get<SectionScoresResponseDto>(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    const result = await this.dashboardService.getSectionScores(user, query);
    
    // Cache for 60 seconds
    await this.cacheManager.set(cacheKey, result, 60000);
    
    return result;
  }

  @Get("filter-options")
  @Roles(Role.SUPER_ADMIN, Role.REGION_ADMIN, Role.PROVINCE_ADMIN)
  @ApiOperation({
    summary: "Get Role-scoped Filter Options",
    description: "Returns geographical entities, surveys, and metadata for dashboard dropdowns. Cached for 5 minutes.",
  })
  @ApiResponse({
    status: 200,
    description: "Filter options retrieved successfully.",
    type: FilterOptionsResponseDto,
  })
  async getFilterOptions(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: FilterOptionsQueryDto,
  ): Promise<FilterOptionsResponseDto> {
    const scopeId = user.role === Role.SUPER_ADMIN ? 'all' : (user.regionId || user.provinceId || user.userId);
    const cacheKey = `dashboard_filters:${user.role}:${scopeId}:${query.provinceId || 'none'}:${query.districtId || 'none'}`;
    
    const cachedData = await this.cacheManager.get<FilterOptionsResponseDto>(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    const result = await this.dashboardService.getFilterOptions(user, query);
    
    /**
     * CACHE INVALIDATION STRATEGY:
     * Since these metadata (Regions, Provinces, CustomerTypes) change extremely rarely, 
     * a 5-minute TTL is sufficient. Manual cache clearance should be triggered 
     * in User, Survey, or Geography management modules whenever a record is 
     * created, updated, or deleted using `cacheManager.del()` with patterns 
     * or specific keys if a more granular strategy is required.
     */
    await this.cacheManager.set(cacheKey, result, 300000); // 5 minutes
    
    return result;
  }
}
