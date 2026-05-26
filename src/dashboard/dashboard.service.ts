import { Injectable, BadRequestException, ForbiddenException } from "@nestjs/common";
import { Prisma, Role, QuestionType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";
import { KpiQueryDto } from "./dto/kpi-query.dto";
import { KpiResponseDto } from "./dto/kpi-response.dto";
import { GeographicHeatmapQueryDto, GeographicLevel } from "./dto/geographic-heatmap-query.dto";
import { GeographicHeatmapResponseDto, HeatmapItemDto } from "./dto/geographic-heatmap-response.dto";
import { calculateColorIntensity } from "./utils/normalize-intensity.util";
import { TrendQueryDto, TrendGroupBy } from "./dto/trend-query.dto";
import { TrendResponseDto, TrendSeriesItemDto } from "./dto/trend-response.dto";
import { SectionScoresQueryDto } from "./dto/section-scores-query.dto";
import { SectionScoresResponseDto, SectionScoreItemDto, QuestionScoreDto } from "./dto/section-scores-response.dto";
import { FilterOptionsQueryDto } from "./dto/filter-options-query.dto";
import { FilterOptionsResponseDto } from "./dto/filter-options-response.dto";

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getKpiOverview(
    user: AuthenticatedUser,
    query: KpiQueryDto,
  ): Promise<KpiResponseDto> {
    const { surveyId, compareWithPreviousPeriod } = query;

    // 1. Resolve Target Survey
    let targetSurveyId = surveyId;
    let activeSurveyInfo: any = null;

    if (targetSurveyId) {
      activeSurveyInfo = await this.prisma.survey.findUnique({
        where: { id: targetSurveyId },
        select: { id: true, title: true, isActive: true },
      });
    } else {
      activeSurveyInfo = await this.prisma.survey.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, isActive: true },
      });
      if (!activeSurveyInfo) {
        activeSurveyInfo = await this.prisma.survey.findFirst({
          orderBy: { createdAt: "desc" },
          select: { id: true, title: true, isActive: true },
        });
      }
      targetSurveyId = activeSurveyInfo?.id;
    }

    // 2. Define Scoped Filters
    const baseWhere: Prisma.SurveyResponseWhereInput = {};
    if (targetSurveyId) baseWhere.surveyId = targetSurveyId;

    if (user.role === Role.REGION_ADMIN && user.regionId) {
      baseWhere.province = { regionId: user.regionId };
    } else if (user.role === Role.PROVINCE_ADMIN && user.provinceId) {
      baseWhere.provinceId = user.provinceId;
    }

    // 3. Prepare Time-based Filters
    const now = new Date();
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    
    const startOfCurrentMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const startOfPrevMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    const endOfPrevMonth = new Date(startOfCurrentMonth.getTime() - 1);

    // 4. Parallel Queries Execution
    const [
      totalResponses,
      responseToday,
      avgRatingResult,
      totalProvincesCount,
      coveredProvincesResult,
      currentMonthResponses,
      prevMonthResponses,
      currentMonthAvgRating,
      prevMonthAvgRating,
    ] = await Promise.all([
      // totalResponses
      this.prisma.surveyResponse.count({ where: baseWhere }),
      
      // responseToday
      this.prisma.surveyResponse.count({
        where: { ...baseWhere, submittedAt: { gte: startOfToday } },
      }),

      // averageRating
      this.prisma.answer.aggregate({
        where: { response: baseWhere, question: { type: QuestionType.RATING }, ratingValue: { not: null } },
        _avg: { ratingValue: true },
      }),

      // totalProvincesCount in scope
      this.getTotalProvincesInScope(user),

      // coveredProvincesCount
      this.prisma.surveyResponse.groupBy({
        by: ['provinceId'],
        where: baseWhere,
      }),

      // Delta Calculations (only if needed)
      compareWithPreviousPeriod ? this.prisma.surveyResponse.count({
        where: { ...baseWhere, submittedAt: { gte: startOfCurrentMonth } },
      }) : Promise.resolve(0),

      compareWithPreviousPeriod ? this.prisma.surveyResponse.count({
        where: { ...baseWhere, submittedAt: { gte: startOfPrevMonth, lte: endOfPrevMonth } },
      }) : Promise.resolve(0),

      compareWithPreviousPeriod ? this.prisma.answer.aggregate({
        where: { response: { ...baseWhere, submittedAt: { gte: startOfCurrentMonth } }, question: { type: QuestionType.RATING }, ratingValue: { not: null } },
        _avg: { ratingValue: true },
      }) : Promise.resolve({ _avg: { ratingValue: null } }),

      compareWithPreviousPeriod ? this.prisma.answer.aggregate({
        where: { response: { ...baseWhere, submittedAt: { gte: startOfPrevMonth, lte: endOfPrevMonth } }, question: { type: QuestionType.RATING }, ratingValue: { not: null } },
        _avg: { ratingValue: null } as any,
      }) : Promise.resolve({ _avg: { ratingValue: null } }),
    ]);

    // 5. Calculate Deltas
    let totalResponsesDelta: number | null = null;
    let averageRatingDelta: number | null = null;

    if (compareWithPreviousPeriod) {
      // (Current - Previous) / Previous * 100
      totalResponsesDelta = prevMonthResponses === 0 
        ? (currentMonthResponses > 0 ? 100 : 0)
        : Number((((currentMonthResponses - prevMonthResponses) / prevMonthResponses) * 100).toFixed(1));

      const currAvg = currentMonthAvgRating._avg.ratingValue || 0;
      const prevAvg = prevMonthAvgRating._avg.ratingValue || 0;
      averageRatingDelta = Number((currAvg - prevAvg).toFixed(2));
    }

    // 6. Calculate Coverage
    const totalProvinces = totalProvincesCount;
    const coveredProvinces = coveredProvincesResult.length;
    const percentage = totalProvinces > 0 ? Number(((coveredProvinces / totalProvinces) * 100).toFixed(1)) : 0;

    return {
      totalResponses,
      totalResponsesDelta,
      averageRating: avgRatingResult._avg.ratingValue ? Number(avgRatingResult._avg.ratingValue.toFixed(2)) : 0,
      averageRatingDelta,
      activeSurvey: activeSurveyInfo,
      coverageByProvince: {
        covered: coveredProvinces,
        total: totalProvinces,
        percentage,
      },
      responseToday,
      generatedAt: new Date().toISOString(),
    };
  }

  async getGeographicHeatmap(
    user: AuthenticatedUser,
    query: GeographicHeatmapQueryDto,
  ): Promise<GeographicHeatmapResponseDto> {
    const { surveyId, startDate, endDate } = query;

    // 1. Resolve Target Survey
    let targetSurveyId = surveyId;
    if (!targetSurveyId) {
      const activeSurveyInfo = await this.prisma.survey.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
      if (activeSurveyInfo) {
        targetSurveyId = activeSurveyInfo.id;
      } else {
        const anySurvey = await this.prisma.survey.findFirst({
          orderBy: { createdAt: "desc" },
          select: { id: true },
        });
        targetSurveyId = anySurvey?.id;
      }
    }

    // 2. Define Base Response Where
    const baseWhere: Prisma.SurveyResponseWhereInput = {};
    if (targetSurveyId) baseWhere.surveyId = targetSurveyId;
    if (startDate || endDate) {
      baseWhere.submittedAt = {};
      if (startDate) baseWhere.submittedAt.gte = new Date(startDate);
      if (endDate) baseWhere.submittedAt.lte = new Date(endDate);
    }

    // Apply User Scoping
    if (user.role === Role.REGION_ADMIN && user.regionId) {
      baseWhere.province = { regionId: user.regionId };
    } else if (user.role === Role.PROVINCE_ADMIN && user.provinceId) {
      baseWhere.provinceId = user.provinceId;
    }

    // 3. Determine Actual Level based on RBAC Rules
    let actualLevel = query.level || GeographicLevel.PROVINCE;
    if (user.role === Role.REGION_ADMIN && actualLevel === GeographicLevel.REGION) {
      actualLevel = GeographicLevel.PROVINCE;
    } else if (user.role === Role.PROVINCE_ADMIN) {
      actualLevel = GeographicLevel.DISTRICT;
    }

    // 4. Fetch Geographical Entities
    let targetEntities: any[] = [];
    if (actualLevel === GeographicLevel.REGION) {
      targetEntities = await this.prisma.region.findMany({ select: { id: true, name: true } });
    } else if (actualLevel === GeographicLevel.PROVINCE) {
      const provinceWhere = user.role === Role.REGION_ADMIN && user.regionId 
        ? { regionId: user.regionId } 
        : {};
      targetEntities = await this.prisma.province.findMany({ 
        where: provinceWhere,
        include: { region: { select: { id: true, name: true } } }
      });
    } else if (actualLevel === GeographicLevel.DISTRICT) {
      let districtWhere = {};
      if (user.role === Role.PROVINCE_ADMIN && user.provinceId) {
        districtWhere = { provinceId: user.provinceId };
      } else if (user.role === Role.REGION_ADMIN && user.regionId) {
        districtWhere = { province: { regionId: user.regionId } };
      }
      targetEntities = await this.prisma.district.findMany({
        where: districtWhere,
        include: { province: { select: { id: true, name: true } } }
      });
    }

    // 5. Fetch Responses and Group in Memory
    const responses = await this.prisma.surveyResponse.findMany({
      where: baseWhere,
      select: {
        id: true,
        province: { select: { id: true, regionId: true } },
        provinceId: true,
        districtId: true,
        answers: {
          where: { question: { type: QuestionType.RATING }, ratingValue: { not: null } },
          select: { ratingValue: true },
        }
      }
    });

    const statsMap = new Map<string, { totalResponses: number, ratingSum: number, ratingCount: number }>();
    
    for (const entity of targetEntities) {
      statsMap.set(entity.id, { totalResponses: 0, ratingSum: 0, ratingCount: 0 });
    }

    for (const res of responses) {
      let targetId: string | null = null;
      if (actualLevel === GeographicLevel.REGION && res.province?.regionId) {
        targetId = res.province.regionId;
      } else if (actualLevel === GeographicLevel.PROVINCE && res.provinceId) {
        targetId = res.provinceId;
      } else if (actualLevel === GeographicLevel.DISTRICT && res.districtId) {
        targetId = res.districtId;
      }

      if (targetId && statsMap.has(targetId)) {
        const stats = statsMap.get(targetId)!;
        stats.totalResponses += 1;
        
        for (const ans of res.answers) {
          if (ans.ratingValue !== null) {
            stats.ratingSum += ans.ratingValue;
            stats.ratingCount += 1;
          }
        }
      }
    }

    // 6. Map to Heatmap Items
    const items: HeatmapItemDto[] = targetEntities.map(entity => {
      const stats = statsMap.get(entity.id)!;
      const averageRating = stats.ratingCount > 0 ? Number((stats.ratingSum / stats.ratingCount).toFixed(2)) : null;
      
      let parentId = null;
      let parentName = null;

      if (actualLevel === GeographicLevel.PROVINCE && entity.region) {
        parentId = entity.region.id;
        parentName = entity.region.name;
      } else if (actualLevel === GeographicLevel.DISTRICT && entity.province) {
        parentId = entity.province.id;
        parentName = entity.province.name;
      }

      return {
        id: entity.id,
        name: entity.name,
        parentId,
        parentName,
        averageRating,
        totalResponses: stats.totalResponses,
        colorIntensity: 0,
      };
    });

    // 7. Calculate Min/Max and Color Intensity
    const ratings = items.map(item => item.averageRating).filter((r): r is number => r !== null);
    const minRating = ratings.length > 0 ? Math.min(...ratings) : null;
    const maxRating = ratings.length > 0 ? Math.max(...ratings) : null;

    items.forEach(item => {
      item.colorIntensity = calculateColorIntensity(item.averageRating, minRating || 0, maxRating || 0);
    });

    // 8. Sort: descending by rating, nulls last
    items.sort((a, b) => {
      if (a.averageRating === null && b.averageRating === null) return 0;
      if (a.averageRating === null) return 1;
      if (b.averageRating === null) return -1;
      return b.averageRating - a.averageRating;
    });

    return {
      level: actualLevel,
      items,
      minRating,
      maxRating,
      generatedAt: new Date().toISOString(),
    };
  }

  async getTrend(
    user: AuthenticatedUser,
    query: TrendQueryDto,
  ): Promise<TrendResponseDto> {
    const { surveyId, groupBy = TrendGroupBy.MONTH, startDate, endDate, questionId } = query;

    // 1. Validate Date Range
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : new Date();
    
    if (start && end) {
      const diffMs = end.getTime() - start.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      
      if (groupBy === TrendGroupBy.DAY && diffDays > 365) {
        throw new BadRequestException("Maximum date range for 'day' grouping is 365 days");
      }
      if (diffDays > 365 * 5) {
        throw new BadRequestException("Maximum date range is 5 years");
      }
    }

    // 2. Build Raw SQL Filters
    const filters: Prisma.Sql[] = [Prisma.sql`"Question".type = 'RATING' AND "Answer"."ratingValue" IS NOT NULL`];
    
    if (surveyId) {
      filters.push(Prisma.sql`"SurveyResponse"."surveyId" = ${surveyId}`);
    }
    if (questionId) {
      filters.push(Prisma.sql`"Answer"."questionId" = ${questionId}`);
    }
    if (start) {
      filters.push(Prisma.sql`"SurveyResponse"."submittedAt" >= ${start}`);
    }
    if (end) {
      filters.push(Prisma.sql`"SurveyResponse"."submittedAt" <= ${end}`);
    }

    // RBAC Scoping
    if (user.role === Role.REGION_ADMIN && user.regionId) {
      filters.push(Prisma.sql`"SurveyResponse"."provinceId" IN (SELECT id FROM "Province" WHERE "regionId" = ${user.regionId})`);
    } else if (user.role === Role.PROVINCE_ADMIN && user.provinceId) {
      filters.push(Prisma.sql`"SurveyResponse"."provinceId" = ${user.provinceId}`);
    }

    const whereClause = Prisma.sql`WHERE ${Prisma.join(filters, ' AND ')}`;

    // 3. Execute Raw Query
    // Note: DATE_TRUNC returns the start of the period
    const results: any[] = await this.prisma.$queryRaw`
      SELECT 
        DATE_TRUNC(${groupBy}, "SurveyResponse"."submittedAt") as period,
        AVG("Answer"."ratingValue")::FLOAT as "averageRating",
        COUNT(DISTINCT "SurveyResponse".id)::INT as "totalResponses"
      FROM "SurveyResponse"
      JOIN "Answer" ON "Answer"."responseId" = "SurveyResponse".id
      JOIN "Question" ON "Answer"."questionId" = "Question".id
      ${whereClause}
      GROUP BY 1
      ORDER BY 1 ASC
    `;

    // 4. Fill Missing Periods & Format Labels
    const series = this.fillMissingPeriods(results, groupBy, start, end);

    // 5. Calculate 3-Period Moving Average
    this.calculateMovingAverage(series);

    return {
      groupBy,
      series,
      generatedAt: new Date().toISOString(),
    };
  }

  private fillMissingPeriods(
    results: any[],
    groupBy: TrendGroupBy,
    start: Date | null,
    end: Date,
  ): TrendSeriesItemDto[] {
    if (results.length === 0 && !start) return [];

    const dataMap = new Map<string, { avg: number; total: number }>();
    results.forEach(r => {
      const d = new Date(r.period);
      dataMap.set(this.getPeriodKey(d, groupBy), { avg: r.averageRating, total: r.totalResponses });
    });

    // Determine range
    let current = start ? new Date(start) : new Date(results[0].period);
    const last = new Date(end);

    // Normalize current to start of period
    current = this.normalizeToStartOfPeriod(current, groupBy);

    const series: TrendSeriesItemDto[] = [];
    
    while (current <= last) {
      const key = this.getPeriodKey(current, groupBy);
      const data = dataMap.get(key);

      series.push({
        period: key,
        periodLabel: this.getPeriodLabel(current, groupBy),
        averageRating: data ? Number(data.avg.toFixed(2)) : null,
        totalResponses: data ? data.total : 0,
        movingAverage3: null,
      });

      // Advance current
      if (groupBy === TrendGroupBy.DAY) {
        current.setUTCDate(current.getUTCDate() + 1);
      } else if (groupBy === TrendGroupBy.WEEK) {
        current.setUTCDate(current.getUTCDate() + 7);
      } else if (groupBy === TrendGroupBy.MONTH) {
        current.setUTCMonth(current.getUTCMonth() + 1);
      }
    }

    return series;
  }

  private normalizeToStartOfPeriod(date: Date, groupBy: TrendGroupBy): Date {
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    if (groupBy === TrendGroupBy.MONTH) {
      d.setUTCDate(1);
    } else if (groupBy === TrendGroupBy.WEEK) {
      // ISO week starts on Monday. 
      // getUTCDay: 0=Sun, 1=Mon, ..., 6=Sat
      const day = d.getUTCDay();
      const diff = (day === 0 ? -6 : 1) - day;
      d.setUTCDate(d.getUTCDate() + diff);
    }
    return d;
  }

  private getPeriodKey(date: Date, groupBy: TrendGroupBy): string {
    const y = date.getUTCFullYear();
    const m = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    const d = date.getUTCDate().toString().padStart(2, '0');

    if (groupBy === TrendGroupBy.DAY) return `${y}-${m}-${d}`;
    if (groupBy === TrendGroupBy.MONTH) return `${y}-${m}`;
    
    // Week: ISO Week
    const target = new Date(date.valueOf());
    const dayNr = (date.getUTCDay() + 6) % 7;
    target.setUTCDate(target.getUTCDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setUTCMonth(0, 1);
    if (target.getUTCDay() !== 4) {
      target.setUTCMonth(0, 1 + ((4 - target.getUTCDay()) + 7) % 7);
    }
    const week = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
    return `${y}-W${week.toString().padStart(2, '0')}`;
  }

  private getPeriodLabel(date: Date, groupBy: TrendGroupBy): string {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const y = date.getUTCFullYear();
    const m = monthNames[date.getUTCMonth()];
    const d = date.getUTCDate();

    if (groupBy === TrendGroupBy.DAY) return `${d} ${m} ${y}`;
    if (groupBy === TrendGroupBy.MONTH) return `${m} ${y}`;
    
    const key = this.getPeriodKey(date, groupBy);
    const week = key.split('-W')[1];
    return `Week ${week}, ${y}`;
  }

  private calculateMovingAverage(series: TrendSeriesItemDto[]): void {
    if (series.length < 3) return;

    for (let i = 2; i < series.length; i++) {
      const p1 = series[i - 2].averageRating;
      const p2 = series[i - 1].averageRating;
      const p3 = series[i].averageRating;

      if (p1 !== null && p2 !== null && p3 !== null) {
        series[i].movingAverage3 = Number(((p1 + p2 + p3) / 3).toFixed(2));
      }
    }
  }

  async getSectionScores(
    user: AuthenticatedUser,
    query: SectionScoresQueryDto,
  ): Promise<SectionScoresResponseDto> {
    const { surveyId, startDate, endDate, compareProvinceId } = query;

    if (!surveyId) {
      throw new BadRequestException("surveyId is required");
    }

    // 1. Validation for comparison
    if (compareProvinceId && user.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException("Only SUPER_ADMIN can request comparison data");
    }

    // 2. Fetch Survey Structure
    const survey = await this.prisma.survey.findUnique({
      where: { id: surveyId },
      include: {
        sections: {
          orderBy: { order: "asc" },
          include: {
            questions: {
              where: { type: QuestionType.RATING },
              orderBy: { order: "asc" },
            },
          },
        },
      },
    });

    if (!survey) {
      throw new BadRequestException(`Survey with ID ${surveyId} not found`);
    }

    // 3. Define Base Filters
    const mainWhere: Prisma.SurveyResponseWhereInput = { surveyId };
    const mainDateFilter: Prisma.DateTimeFilter = {};
    let hasMainDateFilter = false;
    
    if (startDate) {
      mainDateFilter.gte = new Date(startDate);
      hasMainDateFilter = true;
    }
    if (endDate) {
      mainDateFilter.lte = new Date(endDate);
      hasMainDateFilter = true;
    }
    if (hasMainDateFilter) {
      mainWhere.submittedAt = mainDateFilter;
    }

    // Standard RBAC scoping for main series
    if (user.role === Role.REGION_ADMIN && user.regionId) {
      mainWhere.province = { regionId: user.regionId };
    } else if (user.role === Role.PROVINCE_ADMIN && user.provinceId) {
      mainWhere.provinceId = user.provinceId;
    }

    // Comparison Filter (SUPER_ADMIN only)
    let comparisonWhere: Prisma.SurveyResponseWhereInput | null = null;
    if (compareProvinceId) {
      comparisonWhere = {
        surveyId,
        provinceId: compareProvinceId,
      };
      if (hasMainDateFilter) {
        comparisonWhere.submittedAt = mainDateFilter;
      }
    }

    // 4. Aggregate Ratings for both series
    const [mainRatings, comparisonRatings] = await Promise.all([
      this.prisma.answer.groupBy({
        by: ["questionId"],
        where: {
          response: mainWhere,
          ratingValue: { not: null },
        },
        _avg: { ratingValue: true },
        _count: { _all: true },
      }),
      comparisonWhere ? this.prisma.answer.groupBy({
        by: ["questionId"],
        where: {
          response: comparisonWhere,
          ratingValue: { not: null },
        },
        _avg: { ratingValue: true },
      }) : Promise.resolve([]),
    ]);

    const mainRatingMap = new Map(mainRatings.map(r => [r.questionId, { avg: r._avg.ratingValue, count: r._count._all }]));
    const compRatingMap = new Map(comparisonRatings.map(r => [r.questionId, r._avg.ratingValue]));

    // 5. Map results to DTOs
    const sectionDtos: SectionScoreItemDto[] = survey.sections.map(section => {
      const questionDtos: QuestionScoreDto[] = section.questions.map(q => {
        const stats = mainRatingMap.get(q.id);
        return {
          questionId: q.id,
          questionText: q.text,
          order: q.order,
          averageRating: stats ? Number(stats.avg?.toFixed(2)) : null,
          totalAnswered: stats ? stats.count : 0,
          comparisonRating: compRatingMap.get(q.id) ? Number(compRatingMap.get(q.id)?.toFixed(2)) : null,
        };
      });

      // Calculate section average from its questions
      const ratings = questionDtos.map(q => q.averageRating).filter((r): r is number => r !== null);
      const sectionAvg = ratings.length > 0 ? Number((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2)) : null;

      return {
        sectionId: section.id,
        sectionTitle: section.title,
        order: section.order,
        averageRating: sectionAvg,
        questions: questionDtos,
      };
    });

    // 6. Calculate Overall Averages
    const sectionAverages = sectionDtos.map(s => s.averageRating).filter((r): r is number => r !== null);
    const overallAverage = sectionAverages.length > 0 
      ? Number((sectionAverages.reduce((a, b) => a + b, 0) / sectionAverages.length).toFixed(2))
      : null;

    let comparisonOverallAverage: number | null = null;
    if (compareProvinceId) {
      const compSectionAvgs: number[] = sectionDtos.map(s => {
        const ratings = s.questions.map(q => q.comparisonRating).filter((r): r is number => r !== null);
        return ratings.length > 0 ? (ratings.reduce((a, b) => a + b, 0) / ratings.length) : null;
      }).filter((r): r is number => r !== null);
      
      comparisonOverallAverage = compSectionAvgs.length > 0
        ? Number((compSectionAvgs.reduce((a, b) => a + b, 0) / compSectionAvgs.length).toFixed(2))
        : null;
    }

    return {
      surveyId,
      sections: sectionDtos,
      overallAverage,
      comparisonOverallAverage,
      generatedAt: new Date().toISOString(),
    };
  }

  async getFilterOptions(
    user: AuthenticatedUser,
    query: FilterOptionsQueryDto,
  ): Promise<FilterOptionsResponseDto> {
    const { provinceId, districtId } = query;

    // 1. RBAC Validation on provided params
    if (user.role === Role.PROVINCE_ADMIN && provinceId && provinceId !== user.provinceId) {
      throw new ForbiddenException("You cannot request data for other provinces");
    }
    
    if (user.role === Role.REGION_ADMIN && provinceId) {
      const province = await this.prisma.province.findUnique({
        where: { id: provinceId },
        select: { regionId: true },
      });
      if (province && province.regionId !== user.regionId) {
        throw new ForbiddenException("This province does not belong to your region");
      }
    }

    // 2. Build Database Queries
    const queries: any = {
      regions: user.role === Role.SUPER_ADMIN 
        ? this.prisma.region.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } })
        : Promise.resolve([]),
      
      provinces: (async () => {
        const where: Prisma.ProvinceWhereInput = {};
        if (user.role === Role.REGION_ADMIN) where.regionId = user.regionId!;
        if (user.role === Role.PROVINCE_ADMIN) where.id = user.provinceId!;
        return this.prisma.province.findMany({ where, select: { id: true, name: true, regionId: true }, orderBy: { name: "asc" } });
      })(),

      districts: provinceId 
        ? this.prisma.district.findMany({ where: { provinceId }, select: { id: true, name: true, provinceId: true }, orderBy: { name: "asc" } })
        : Promise.resolve([]),

      villages: districtId
        ? this.prisma.village.findMany({ where: { districtId }, select: { id: true, name: true, districtId: true }, orderBy: { name: "asc" } })
        : Promise.resolve([]),

      surveys: this.prisma.survey.findMany({ select: { id: true, title: true, isActive: true }, orderBy: { createdAt: "desc" } }),
      
      customerTypes: this.prisma.customerType.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    };

    // 3. Execute in Parallel
    const [regions, provinces, districts, villages, surveys, customerTypes] = await Promise.all([
      queries.regions,
      queries.provinces,
      queries.districts,
      queries.villages,
      queries.surveys,
      queries.customerTypes,
    ]);

    return {
      regions,
      provinces,
      districts,
      villages,
      surveys,
      customerTypes,
      userScope: {
        role: user.role,
        regionId: user.regionId || null,
        provinceId: user.provinceId || null,
      },
    };
  }

  private async getTotalProvincesInScope(user: AuthenticatedUser): Promise<number> {
    if (user.role === Role.SUPER_ADMIN) {
      return this.prisma.province.count();
    } else if (user.role === Role.REGION_ADMIN && user.regionId) {
      return this.prisma.province.count({ where: { regionId: user.regionId } });
    } else if (user.role === Role.PROVINCE_ADMIN) {
      return 1;
    }
    return 0;
  }
}
