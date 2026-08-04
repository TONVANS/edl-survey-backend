// src/reports/reports.service.ts
import { Injectable, ForbiddenException, BadRequestException } from "@nestjs/common";
import { Prisma, Role, QuestionType, MeterType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { OverallSummaryQueryDto } from "./dto/overall-summary-query.dto";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";
import { OverallSummaryResponseDto } from "./dto/overall-summary-response.dto";
import { GeographicQueryDto } from "./dto/geographic-query.dto";
import {
  GeographicReportResponseDto,
  GeographicItemDto,
} from "./dto/geographic-report-response.dto";
import { GeographicLevel } from "./dto/geographic-level.enum";
import { CustomerTypeAnalysisQueryDto } from './dto/customer-type-analysis-query.dto';
import {
  CustomerTypeAnalysisResponseDto,
  CustomerTypeItemDto,
} from './dto/customer-type-analysis-response.dto';
import { QuestionDetailQueryDto } from "./dto/question-detail-query.dto";
import { QuestionDetailResponseDto, QuestionDetailSectionDto, QuestionDetailItemDto } from "./dto/question-detail-response.dto";
import { SectionGraphQueryDto } from "./dto/section-graph-query.dto";
import { SectionGraphResponseDto, SectionGraphItemDto } from "./dto/section-graph-response.dto";
import { MeterAnalysisQueryDto } from './dto/meter-analysis-query.dto';
import {
  MeterAnalysisResponseDto,
  MeterTypeSummaryDto,
  MeterSizeSummaryDto,
} from './dto/meter-analysis-response.dto';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSectionGraphData(
    user: AuthenticatedUser,
    query: SectionGraphQueryDto,
  ): Promise<SectionGraphResponseDto> {
    const { surveyId, sectionId, provinceId, districtId, villageId } = query;

    // 1. Authorization & Base Filter Construction
    const where: Prisma.SurveyResponseWhereInput = { surveyId };

    if (user.role === Role.SUPER_ADMIN) {
      if (provinceId) where.provinceId = provinceId;
    } else if (user.role === Role.REGION_ADMIN) {
      where.province = { regionId: user.regionId };
      if (provinceId) {
        // Verify if provinceId belongs to this region
        const province = await this.prisma.province.findFirst({
          where: { id: provinceId, regionId: user.regionId },
        });
        if (province) {
          where.provinceId = provinceId;
        }
      }
    } else if (user.role === Role.PROVINCE_ADMIN) {
      where.provinceId = user.provinceId;
    }

    if (districtId) where.districtId = districtId;
    if (villageId) where.villageId = villageId;

    // 2. Data Fetching & Aggregation
    // Step 2a: Fetch the target SurveySection and its questions
    const section = await this.prisma.surveySection.findFirst({
      where: { id: sectionId, surveyId },
      include: {
        questions: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!section) {
      throw new BadRequestException("Section not found or does not belong to the specified survey.");
    }

    // Step 2b: Count total unique responses in this scope
    const totalResponses = await this.prisma.surveyResponse.count({ where });

    if (totalResponses === 0) {
      return {
        sectionTitle: section.title,
        totalResponses: 0,
        chartData: section.questions.map((q) => ({
          questionId: q.id,
          questionText: q.text,
          averageScore: 0,
          answerCount: 0,
        })),
      };
    }

    // Step 2c: Aggregate Answers for the questions in this section
    const questionIds = section.questions.map((q) => q.id);
    const answerStats = await this.prisma.answer.groupBy({
      by: ['questionId'],
      where: {
        questionId: { in: questionIds },
        response: where,
      },
      _sum: { ratingValue: true },
      _count: { id: true, ratingValue: true },
    });

    const statsMap = new Map(
      answerStats.map((stat) => [
        stat.questionId,
        {
          sum: stat._sum.ratingValue || 0,
          count: stat._count.id || 0,
          ratingCount: stat._count.ratingValue || 0,
        },
      ]),
    );

    // 3. Calculation & Mapping
    const chartData: SectionGraphItemDto[] = section.questions.map((q) => {
      const stats = statsMap.get(q.id);
      const averageScore = stats && stats.ratingCount > 0
        ? Number((stats.sum / stats.ratingCount).toFixed(2))
        : 0;

      return {
        questionId: q.id,
        questionText: q.text,
        averageScore,
        answerCount: stats?.count || 0,
      };
    });

    return {
      sectionTitle: section.title,
      totalResponses,
      chartData,
    };
  }

  async getOverallSummary(
    user: AuthenticatedUser,
    query: OverallSummaryQueryDto,
  ): Promise<OverallSummaryResponseDto> {
    const { surveyId, startDate, endDate } = query;
    let surveyTitle = "No Survey Available";
    let targetSurveyId: string | undefined = surveyId;

    if (targetSurveyId) {
      const survey = await this.prisma.survey.findUnique({
        where: { id: targetSurveyId },
        select: { title: true },
      });
      if (survey) surveyTitle = survey.title;
    } else {
      const activeSurvey = await this.prisma.survey.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true },
      });
      if (activeSurvey) {
        surveyTitle = activeSurvey.title;
        targetSurveyId = activeSurvey.id;
      } else {
        const latestSurvey = await this.prisma.survey.findFirst({
          orderBy: { createdAt: "desc" },
          select: { id: true, title: true },
        });
        if (latestSurvey) {
          surveyTitle = latestSurvey.title;
          targetSurveyId = latestSurvey.id;
        }
      }
    }

    const where: Prisma.SurveyResponseWhereInput = {};
    if (targetSurveyId) where.surveyId = targetSurveyId;
    if (startDate || endDate) {
      where.submittedAt = {};
      if (startDate) where.submittedAt.gte = new Date(startDate);
      if (endDate) where.submittedAt.lte = new Date(endDate);
    }

    if (user) {
      if (user.role === Role.REGION_ADMIN && user.regionId) {
        where.province = { regionId: user.regionId };
      } else if (user.role === Role.PROVINCE_ADMIN && user.provinceId) {
        where.provinceId = user.provinceId;
      }
    }

    const totalResponses = await this.prisma.surveyResponse.count({ where });
    const defaultDistribution = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };

    if (totalResponses === 0) {
      return {
        totalResponses: 0,
        averageRating: 0.0,
        ratingDistribution: defaultDistribution,
        bySection: [],
        surveyTitle,
        generatedAt: new Date().toISOString(),
      };
    }

    const distributionStats = await this.prisma.answer.groupBy({
      by: ["ratingValue"],
      where: {
        response: where,
        question: { type: QuestionType.RATING },
        ratingValue: { not: null },
      },
      _count: { ratingValue: true },
    });

    const ratingDistribution = { ...defaultDistribution };
    let totalRatingSum = 0;
    let totalRatingCount = 0;

    for (const stat of distributionStats) {
      if (stat.ratingValue !== null) {
        const ratingKey = stat.ratingValue.toString();
        const ratingCount = stat._count.ratingValue;
        if (ratingKey in ratingDistribution) {
          ratingDistribution[ratingKey as keyof typeof ratingDistribution] = ratingCount;
        }
        totalRatingSum += stat.ratingValue * ratingCount;
        totalRatingCount += ratingCount;
      }
    }

    const averageRating = totalRatingCount > 0 ? Number((totalRatingSum / totalRatingCount).toFixed(2)) : 0.0;

    const sections = targetSurveyId ? await this.prisma.surveySection.findMany({
      where: { surveyId: targetSurveyId },
      include: { questions: { where: { type: QuestionType.RATING }, select: { id: true } } },
      orderBy: { order: "asc" },
    }) : [];

    const questionStats = await this.prisma.answer.groupBy({
      by: ["questionId"],
      where: {
        response: where,
        question: { section: targetSurveyId ? { surveyId: targetSurveyId } : undefined, type: QuestionType.RATING },
        ratingValue: { not: null },
      },
      _sum: { ratingValue: true },
      _count: { ratingValue: true },
    });

    const questionStatsMap = new Map<string, { sum: number; count: number }>();
    for (const stat of questionStats) {
      questionStatsMap.set(stat.questionId, { sum: stat._sum.ratingValue ?? 0, count: stat._count.ratingValue ?? 0 });
    }

    const bySection = sections.map((section) => {
      let sectionSum = 0;
      let sectionCount = 0;
      for (const question of section.questions) {
        const stats = questionStatsMap.get(question.id);
        if (stats) {
          sectionSum += stats.sum;
          sectionCount += stats.count;
        }
      }
      return {
        sectionId: section.id,
        sectionTitle: section.title,
        averageRating: sectionCount > 0 ? Number((sectionSum / sectionCount).toFixed(2)) : 0.0,
        questionCount: section.questions.length,
      };
    });

    return { totalResponses, averageRating, ratingDistribution, bySection, surveyTitle, generatedAt: new Date().toISOString() };
  }

  async getGeographicBreakdown(
    user: AuthenticatedUser,
    query: GeographicQueryDto,
  ): Promise<GeographicReportResponseDto> {
    const { surveyId, level = GeographicLevel.PROVINCE, regionId, provinceId, startDate, endDate } = query;
    const where: Prisma.SurveyResponseWhereInput = {};
    if (surveyId) where.surveyId = surveyId;

    if (user.role === Role.SUPER_ADMIN) {
      if (provinceId) where.provinceId = provinceId;
      else if (regionId) where.province = { regionId };
    } else if (user.role === Role.REGION_ADMIN) {
      where.province = { regionId: user.regionId };
      if (regionId && regionId !== user.regionId) throw new ForbiddenException("You can only access data for your region");
      if (provinceId) where.provinceId = provinceId;
    } else if (user.role === Role.PROVINCE_ADMIN) {
      where.provinceId = user.provinceId;
      if (level === GeographicLevel.REGION || level === GeographicLevel.PROVINCE) {
        throw new BadRequestException("PROVINCE_ADMIN can only query at DISTRICT or VILLAGE level");
      }
      if (provinceId && provinceId !== user.provinceId) throw new ForbiddenException("You can only access data for your province");
    }

    let currentWhere = { ...where };
    let previousWhere: Prisma.SurveyResponseWhereInput | null = null;
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : new Date();
      currentWhere.submittedAt = { gte: start ?? undefined, lte: end };
      if (start) {
        const duration = end.getTime() - start.getTime();
        previousWhere = { ...where, submittedAt: { gte: new Date(start.getTime() - duration), lte: start } };
      }
    }

    type GeoField = "provinceId" | "districtId" | "villageId";
    let levelField: GeoField = "provinceId";
    let metadata: any[] = [];

    if (level === GeographicLevel.REGION) {
      levelField = "provinceId";
      metadata = await this.prisma.region.findMany({ include: { provinces: { select: { id: true } } } });
    } else if (level === GeographicLevel.PROVINCE) {
      levelField = "provinceId";
      metadata = await this.prisma.province.findMany({ include: { region: { select: { name: true } } } });
    } else if (level === GeographicLevel.DISTRICT) {
      levelField = "districtId";
      metadata = await this.prisma.district.findMany({ include: { province: { select: { name: true } } } });
    } else if (level === GeographicLevel.VILLAGE) {
      levelField = "villageId";
      metadata = await this.prisma.village.findMany({ include: { district: { select: { name: true } } } });
    }

    const sr: any = this.prisma.surveyResponse;
    const currentCounts: any[] = await sr.groupBy({ by: [levelField], where: currentWhere, _count: { id: true } });
    let previousCounts: any[] = [];
    if (previousWhere) previousCounts = await sr.groupBy({ by: [levelField], where: previousWhere, _count: { id: true } });

    const ratings = await this.prisma.answer.findMany({
      where: { response: currentWhere, question: { type: QuestionType.RATING }, ratingValue: { not: null } },
      select: { ratingValue: true, response: { select: { provinceId: true, districtId: true, villageId: true } } },
    });

    const currentCountMap = new Map(currentCounts.map((c: any) => [c[levelField], c._count.id]));
    const previousCountMap = new Map(previousCounts.map((c: any) => [c[levelField], c._count.id]));
    const ratingStatsMap = new Map<string, { sum: number; count: number }>();
    ratings.forEach((r: any) => {
      const geoId = r.response[levelField];
      if (!geoId) return;
      const stats = ratingStatsMap.get(geoId) || { sum: 0, count: 0 };
      stats.sum += r.ratingValue ?? 0;
      stats.count += 1;
      ratingStatsMap.set(geoId, stats);
    });

    let results: GeographicItemDto[] = [];
    if (level === GeographicLevel.REGION) {
      metadata.forEach((region) => {
        const provincesInRegion = region.provinces.map((p: any) => p.id);
        let total = 0, prev = 0, rSum = 0, rCount = 0;
        provincesInRegion.forEach((pId: string) => {
          total += currentCountMap.get(pId) || 0;
          prev += previousCountMap.get(pId) || 0;
          const rStats = ratingStatsMap.get(pId);
          if (rStats) { rSum += rStats.sum; rCount += rStats.count; }
        });
        if (total > 0 || prev > 0) {
          results.push({ id: region.id, name: region.name, totalResponses: total, averageRating: rCount > 0 ? Number((rSum / rCount).toFixed(2)) : 0, responseGrowth: this.calculateGrowth(total, prev) });
        }
      });
    } else {
      results = metadata.map((item): GeographicItemDto | null => {
        const total = currentCountMap.get(item.id) || 0, prev = previousCountMap.get(item.id) || 0;
        const rStats = ratingStatsMap.get(item.id), rSum = rStats?.sum || 0, rCount = rStats?.count || 0;
        if (total === 0 && prev === 0) return null;
        let parentName: string | undefined;
        if (level === GeographicLevel.PROVINCE) parentName = item.region?.name;
        else if (level === GeographicLevel.DISTRICT) parentName = item.province?.name;
        else if (level === GeographicLevel.VILLAGE) parentName = item.district?.name;
        return { id: item.id, name: item.name, parentName, totalResponses: total, averageRating: rCount > 0 ? Number((rSum / rCount).toFixed(2)) : 0, responseGrowth: this.calculateGrowth(total, prev) };
      }).filter((item): item is GeographicItemDto => item !== null);
    }

    results.sort((a, b) => b.totalResponses - a.totalResponses);
    return { level, data: results, total: results.length, generatedAt: new Date().toISOString() };

  }

  async getCustomerTypeAnalysis(
    user: AuthenticatedUser,
    query: CustomerTypeAnalysisQueryDto,
  ): Promise<CustomerTypeAnalysisResponseDto> {
    const { surveyId, startDate, endDate } = query;

    const where: Prisma.SurveyResponseWhereInput = {};
    if (surveyId) where.surveyId = surveyId;

    if (user.role === Role.REGION_ADMIN && user.regionId) {
      where.province = { regionId: user.regionId };
    } else if (user.role === Role.PROVINCE_ADMIN && user.provinceId) {
      where.provinceId = user.provinceId;
    }

    if (startDate || endDate) {
      where.submittedAt = {};
      if (startDate) where.submittedAt.gte = new Date(startDate);
      if (endDate) where.submittedAt.lte = new Date(endDate);
    }

    const customerTypes = await this.prisma.customerType.findMany({
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });

    const responseStats = await this.prisma.surveyResponse.groupBy({
      by: ['customerTypeId'],
      where,
      _count: { id: true },
    });

    const meterDetails = await this.prisma.meterDetail.findMany({
      where: { surveyResponse: where },
      select: {
        quantity: true,
        meterSize: { select: { type: true } },
        surveyResponse: { select: { customerTypeId: true } },
      },
    });

    const monoMeterMap = new Map<string, number>();
    const threeMeterMap = new Map<string, number>();
    for (const m of meterDetails) {
      const cId = m.surveyResponse.customerTypeId;
      if (m.meterSize?.type === MeterType.MONO_PHASE) {
        monoMeterMap.set(cId, (monoMeterMap.get(cId) || 0) + m.quantity);
      } else if (m.meterSize?.type === MeterType.THREE_PHASE) {
        threeMeterMap.set(cId, (threeMeterMap.get(cId) || 0) + m.quantity);
      }
    }

    const transformerDetails = await this.prisma.transformerDetail.findMany({
      where: { surveyResponse: where },
      select: {
        quantity: true,
        surveyResponse: { select: { customerTypeId: true } },
      },
    });

    const transformerMap = new Map<string, number>();
    for (const t of transformerDetails) {
      const cId = t.surveyResponse.customerTypeId;
      transformerMap.set(cId, (transformerMap.get(cId) || 0) + t.quantity);
    }

    const ratingAnswers = await this.prisma.answer.findMany({
      where: {
        response: where,
        question: { type: QuestionType.RATING },
        ratingValue: { not: null },
      },
      select: {
        ratingValue: true,
        response: {
          select: {
            customerTypeId: true,
          },
        },
      },
    });

    const statsMap = new Map(responseStats.map((s: any) => [s.customerTypeId, s]));
    
    const distributionMap = new Map<string, Record<string, number>>();
    const ratingSummaryMap = new Map<string, { sum: number; count: number }>();

    ratingAnswers.forEach((ans) => {
      const customerTypeId = ans.response?.customerTypeId;
      if (!customerTypeId || ans.ratingValue === null) return;

      const ratingKey = ans.ratingValue.toString();

      const dist = distributionMap.get(customerTypeId) || { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
      dist[ratingKey] = (dist[ratingKey] || 0) + 1;
      distributionMap.set(customerTypeId, dist);

      const summary = ratingSummaryMap.get(customerTypeId) || { sum: 0, count: 0 };
      summary.sum += ans.ratingValue;
      summary.count += 1;
      ratingSummaryMap.set(customerTypeId, summary);
    });

    const totalResponsesCount = responseStats.reduce(
      (acc: number, s: any) => acc + (s?._count?.id || 0),
      0,
    );

    const results: CustomerTypeItemDto[] = customerTypes.map((ct) => {
      const s: any = statsMap.get(ct.id);
      const rSummary = ratingSummaryMap.get(ct.id);
      const totalResponses = s?._count?.id || 0;
      const percentage = totalResponsesCount > 0
        ? Number(((totalResponses / totalResponsesCount) * 100).toFixed(2))
        : 0;
      
      return {
        customerTypeId: ct.id,
        customerTypeName: ct.name,
        totalResponses,
        percentage,
        averageRating: rSummary?.count ? Number((rSummary.sum / rSummary.count).toFixed(2)) : 0,
        totalMonoPhaseMeter: monoMeterMap.get(ct.id) || 0,
        totalThreePhaseMeter: threeMeterMap.get(ct.id) || 0,
        totalTransformers: transformerMap.get(ct.id) || 0,
        ratingDistribution: distributionMap.get(ct.id) || { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
      };
    });

    // results.sort((a, b) => b.totalResponses - a.totalResponses);

    return {
      customerTypes: results,
      generatedAt: new Date().toISOString(),
    };
  }

  async getMeterAnalysis(
    user: AuthenticatedUser,
    query: MeterAnalysisQueryDto,
  ): Promise<MeterAnalysisResponseDto> {
    const { surveyId, provinceId, districtId, villageId, startDate, endDate } = query;

    const where: Prisma.SurveyResponseWhereInput = {};
    if (surveyId) where.surveyId = surveyId;

    if (user.role === Role.SUPER_ADMIN) {
      if (provinceId) where.provinceId = provinceId;
      if (districtId) where.districtId = districtId;
      if (villageId) where.villageId = villageId;
    } else if (user.role === Role.REGION_ADMIN) {
      where.province = { regionId: user.regionId };
      if (provinceId) where.provinceId = provinceId;
      if (districtId) where.districtId = districtId;
      if (villageId) where.villageId = villageId;
    } else if (user.role === Role.PROVINCE_ADMIN) {
      where.provinceId = user.provinceId;
      if (districtId) where.districtId = districtId;
      if (villageId) where.villageId = villageId;
    }

    if (startDate || endDate) {
      where.submittedAt = {};
      if (startDate) where.submittedAt.gte = new Date(startDate);
      if (endDate) where.submittedAt.lte = new Date(endDate);
    }

    const meterDetails = await this.prisma.meterDetail.findMany({
      where: { surveyResponse: where },
      include: {
        meterSize: true,
      },
    });

    const typeMap = new Map<MeterType, number>();
    typeMap.set(MeterType.MONO_PHASE, 0);
    typeMap.set(MeterType.THREE_PHASE, 0);

    const sizeMap = new Map<string, { meterSize: any; totalQuantity: number }>();

    let totalMeters = 0;

    for (const detail of meterDetails) {
      const qty = detail.quantity;
      totalMeters += qty;

      const currentTypeQty = typeMap.get(detail.meterSize.type) || 0;
      typeMap.set(detail.meterSize.type, currentTypeQty + qty);

      const existing = sizeMap.get(detail.meterSizeId);
      if (existing) {
        existing.totalQuantity += qty;
      } else {
        sizeMap.set(detail.meterSizeId, {
          meterSize: detail.meterSize,
          totalQuantity: qty,
        });
      }
    }

    const byType: MeterTypeSummaryDto[] = Array.from(typeMap.entries()).map(
      ([type, totalQuantity]) => ({
        type,
        totalQuantity,
        percentage: totalMeters > 0 ? Number(((totalQuantity / totalMeters) * 100).toFixed(2)) : 0,
      }),
    );

    const bySize: MeterSizeSummaryDto[] = Array.from(sizeMap.values())
      .map(({ meterSize, totalQuantity }) => ({
        meterSizeId: meterSize.id,
        type: meterSize.type,
        amps: meterSize.amps,
        description: meterSize.description || undefined,
        order: meterSize.order || undefined,
        totalQuantity,
        percentage: totalMeters > 0 ? Number(((totalQuantity / totalMeters) * 100).toFixed(2)) : 0,
      }))
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || b.totalQuantity - a.totalQuantity);

    return {
      totalMeters,
      byType,
      bySize,
      generatedAt: new Date().toISOString(),
    };
  }

  async getQuestionDetail(
    user: AuthenticatedUser,
    query: QuestionDetailQueryDto,
  ): Promise<QuestionDetailResponseDto> {
    const { surveyId, sectionId, questionId, startDate, endDate } = query;

    const surveyWhere: Prisma.SurveyResponseWhereInput = { surveyId };
    if (user.role === Role.REGION_ADMIN && user.regionId) {
      surveyWhere.province = { regionId: user.regionId };
    } else if (user.role === Role.PROVINCE_ADMIN && user.provinceId) {
      surveyWhere.provinceId = user.provinceId;
    }

    if (startDate || endDate) {
      surveyWhere.submittedAt = {};
      if (startDate) surveyWhere.submittedAt.gte = new Date(startDate);
      if (endDate) surveyWhere.submittedAt.lte = new Date(endDate);
    }

    const totalResponsesCount = await this.prisma.surveyResponse.count({
      where: surveyWhere,
    });

    const sections = await this.prisma.surveySection.findMany({
      where: {
        surveyId,
        id: sectionId || undefined,
      },
      orderBy: { order: 'asc' },
      include: {
        questions: {
          where: { id: questionId || undefined },
          orderBy: { order: 'asc' },
          include: { options: { orderBy: { order: 'asc' } } },
        },
      },
    });

    const sectionData: QuestionDetailSectionDto[] = [];

    for (const section of sections) {
      const questionsData: QuestionDetailItemDto[] = [];

      for (const question of section.questions) {
        const totalAnswered = await this.prisma.answer.count({
          where: {
            questionId: question.id,
            response: surveyWhere,
          },
        });

        const skipped = totalResponsesCount - totalAnswered;
        const item: QuestionDetailItemDto = {
          questionId: question.id,
          questionText: question.text,
          type: question.type,
          order: question.order,
          totalAnswered,
          skipped: skipped > 0 ? skipped : 0,
        };

        if (question.type === QuestionType.RATING) {
          const stats = await this.prisma.answer.groupBy({
            by: ['ratingValue'],
            where: {
              questionId: question.id,
              response: surveyWhere,
              ratingValue: { not: null },
            },
            _count: { ratingValue: true },
            _sum: { ratingValue: true },
          });

          let sum = 0;
          let count = 0;
          const dist: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };

          stats.forEach((s) => {
            if (s.ratingValue) {
              const val = s.ratingValue.toString();
              if (val in dist) dist[val] = s._count.ratingValue;
              sum += (s._sum.ratingValue || 0);
              count += s._count.ratingValue;
            }
          });

          item.ratingAverage = count > 0 ? Number((sum / count).toFixed(2)) : 0;
          item.ratingDistribution = dist;
        } else if (
          question.type === QuestionType.SINGLE_CHOICE ||
          question.type === QuestionType.MULTIPLE_CHOICE
        ) {
          const optionStats = await this.prisma.answerOption.groupBy({
            by: ['optionId'],
            where: {
              answer: {
                questionId: question.id,
                response: surveyWhere,
              },
            },
            _count: { id: true },
          });

          const statsMap = new Map(optionStats.map((s) => [s.optionId, s._count.id]));

          item.options = question.options.map((opt) => {
            const count = statsMap.get(opt.id) || 0;
            return {
              optionId: opt.id,
              text: opt.text,
              count,
              percentage: totalAnswered > 0 ? Number(((count / totalAnswered) * 100).toFixed(1)) : 0,
            };
          });
        }

        questionsData.push(item);
      }

      if (questionsData.length > 0) {
        sectionData.push({
          sectionId: section.id,
          sectionTitle: section.title,
          order: section.order,
          questions: questionsData,
        });
      }
    }

    return {
      surveyId,
      sections: sectionData,
      generatedAt: new Date().toISOString(),
    };
  }

  private calculateGrowth(current: number, previous: number): number | null {
    if (previous === 0) return current > 0 ? 100 : null;
    return Number((((current - previous) / previous) * 100).toFixed(2));
  }
}
