import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSurveyResponseDto } from './dto/create-survey-response.dto';
import { UpdateSurveyResponseDto } from './dto/update-survey-response.dto';
import { SurveyResponseQueryDto } from './dto/survey-response-query.dto';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@Injectable()
export class SurveyResponsesService {
  constructor(private prisma: PrismaService) {}

  async create(createSurveyResponseDto: CreateSurveyResponseDto) {
    const { answers, customerType, ...responseData } = createSurveyResponseDto;

    return this.prisma.surveyResponse.create({
      data: {
        ...responseData,
        customerTypeId: customerType,
        answers: {
          create: answers.map((answer) => ({
            questionId: answer.questionId,
            textValue: answer.textValue,
            ratingValue: answer.ratingValue,
            selectedOptions: answer.selectedOptions
              ? {
                  create: answer.selectedOptions.map((opt) => ({
                    optionId: opt.optionId,
                  })),
                }
              : undefined,
          })),
        },
      },
      include: {
        answers: {
          include: {
            selectedOptions: true,
          },
        },
      },
    });
  }

  async findAll(query: SurveyResponseQueryDto, user?: AuthenticatedUser) {
    const {
      page,
      limit,
      surveyId,
      provinceId,
      districtId,
      villageId,
      customerType,
      customerNumber,
      startDate,
      endDate,
    } = query;

    const skip = ((page ?? 1) - 1) * (limit ?? 10);
    const take = limit ?? 10;

    const where: Prisma.SurveyResponseWhereInput = {};

    // Base filtering from query params
    if (surveyId) where.surveyId = surveyId;
    if (provinceId) where.provinceId = provinceId;
    if (districtId) where.districtId = districtId;
    if (villageId) where.villageId = villageId;
    if (customerType) where.customerTypeId = customerType;
    if (customerNumber) {
      where.customerNumber = customerNumber;
    }
    if (query.customerName) {
      where.customerName = { contains: query.customerName, mode: 'insensitive' };
    }
    if (query.customerPhoneNumber) {
      where.customerPhoneNumber = {
        contains: query.customerPhoneNumber,
        mode: 'insensitive',
      };
    }

    // Date range filtering
    if (startDate || endDate) {
      where.submittedAt = {};
      if (startDate) where.submittedAt.gte = new Date(startDate);
      if (endDate) where.submittedAt.lte = new Date(endDate);
    }

    // Role-based filtering (ACL)
    if (user) {
      if (user.role === 'REGION_ADMIN') {
        where.province = { regionId: user.regionId };
      } else if (user.role === 'PROVINCE_ADMIN') {
        where.provinceId = user.provinceId;
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.surveyResponse.findMany({
        where,
        include: {
          survey: { select: { title: true } },
          province: { select: { name: true } },
          district: { select: { name: true } },
          village: { select: { name: true } },
          customerType: { select: { name: true } },
          _count: { select: { answers: true } },
        },
        skip,
        take,
        orderBy: { submittedAt: 'desc' },
      }),
      this.prisma.surveyResponse.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page: page ?? 1,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  async findOne(id: string) {
    return this.prisma.surveyResponse.findUnique({
      where: { id },
      include: {
        survey: true,
        province: true,
        district: true,
        village: true,
        customerType: true,
        answers: {
          include: {
            question: true,
            selectedOptions: { include: { option: true } },
          },
        },
      },
    });
  }

  async update(id: string, updateSurveyResponseDto: UpdateSurveyResponseDto) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { answers, customerType, ...responseData } = updateSurveyResponseDto;
    return this.prisma.surveyResponse.update({
      where: { id },
      data: {
        ...responseData,
        customerTypeId: customerType,
      },
    });
  }

  async remove(id: string) {
    return this.prisma.surveyResponse.delete({
      where: { id },
    });
  }
}
