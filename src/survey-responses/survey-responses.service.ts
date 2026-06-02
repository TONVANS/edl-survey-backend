import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSurveyResponseDto } from './dto/create-survey-response.dto';
import { UpdateSurveyResponseDto } from './dto/update-survey-response.dto';
import { SurveyResponseQueryDto } from './dto/survey-response-query.dto';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@Injectable()
export class SurveyResponsesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createSurveyResponseDto: CreateSurveyResponseDto) {
    const { answers, customerType, ...responseData } = createSurveyResponseDto;

    try {
      return await this.prisma.surveyResponse.create({
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
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new BadRequestException(
            'This customer number has already submitted a response for this survey in this province.',
          );
        }
        throw new BadRequestException(`Failed to create survey response: ${error.message}`);
      }
      throw error;
    }
  }

  async findAll(query: SurveyResponseQueryDto, user: AuthenticatedUser) {
    const {
      page = 1,
      limit = 10,
      surveyId,
      provinceId,
      districtId,
      villageId,
      customerType,
      customerNumber,
      customerName,
      customerPhoneNumber,
      startDate,
      endDate,
    } = query;

    const skip = (page - 1) * limit;
    const take = limit;

    const where: Prisma.SurveyResponseWhereInput = {};

    // 1. Base filtering from query params
    if (surveyId) where.surveyId = surveyId;
    if (customerType) where.customerTypeId = customerType;
    if (customerNumber !== undefined) where.customerNumber = customerNumber;

    if (customerName) {
      where.customerName = { contains: customerName, mode: 'insensitive' };
    }
    if (customerPhoneNumber) {
      where.customerPhoneNumber = {
        contains: customerPhoneNumber,
        mode: 'insensitive',
      };
    }

    // 2. Geographic Filtering (Hierarchical)
    // For SUPER_ADMIN, use params. For others, force their scope.
    if (user.role === Role.SUPER_ADMIN) {
      if (provinceId) where.provinceId = provinceId;
      if (districtId) where.districtId = districtId;
      if (villageId) where.villageId = villageId;
    } else if (user.role === Role.REGION_ADMIN) {
      where.province = { regionId: user.regionId };
      // Allow further narrowing within their region
      if (provinceId) where.provinceId = provinceId;
      if (districtId) where.districtId = districtId;
      if (villageId) where.villageId = villageId;
    } else if (user.role === Role.PROVINCE_ADMIN) {
      where.provinceId = user.provinceId;
      // Allow narrowing within their province
      if (districtId) where.districtId = districtId;
      if (villageId) where.villageId = villageId;
    }

    // 3. Date range filtering
    if (startDate || endDate) {
      where.submittedAt = {};
      if (startDate) {
        const start = new Date(startDate);
        if (isNaN(start.getTime())) throw new BadRequestException('Invalid startDate');
        where.submittedAt.gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        if (isNaN(end.getTime())) throw new BadRequestException('Invalid endDate');
        where.submittedAt.lte = end;
      }
    }

    try {
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
          page,
          limit: take,
          totalPages: Math.ceil(total / take),
        },
      };
    } catch (error) {
      console.error('SurveyResponses.findAll error:', error);
      throw error; // Let the global exception filter handle it
    }
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const response = await this.prisma.surveyResponse.findUnique({
      where: { id },
      include: {
        survey: { select: { title: true } },
        province: { select: { name: true, regionId: true } },
        district: { select: { name: true } },
        village: { select: { name: true } },
        customerType: { select: { name: true } },
        answers: {
          include: {
            question: { select: { text: true, type: true, order: true } },
            selectedOptions: { include: { option: { select: { text: true } } } },
          },
        },
      },
    });

    if (!response) {
      throw new BadRequestException(`Survey response with ID ${id} not found`);
    }

    // RBAC Check for findOne
    if (user.role === Role.REGION_ADMIN) {
      if (response.province.regionId !== user.regionId) {
        throw new BadRequestException('You do not have permission to view this response');
      }
    } else if (user.role === Role.PROVINCE_ADMIN) {
      if (response.provinceId !== user.provinceId) {
        throw new BadRequestException('You do not have permission to view this response');
      }
    }

    return response;
  }

  async update(id: string, updateSurveyResponseDto: UpdateSurveyResponseDto) {
    const {
      customerType,
      answers,
      surveyId,
      provinceId,
      districtId,
      villageId,
      ...responseData
    } = updateSurveyResponseDto;

    try {
      return await this.prisma.surveyResponse.update({
        where: { id },
        data: {
          ...responseData,
          ...(customerType && { customerType: { connect: { id: customerType } } }),
          ...(surveyId && { survey: { connect: { id: surveyId } } }),
          ...(provinceId && { province: { connect: { id: provinceId } } }),
          ...(districtId && { district: { connect: { id: districtId } } }),
          ...(villageId && { village: { connect: { id: villageId } } }),
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new BadRequestException(`Survey response with ID ${id} not found`);
        }
        if (error.code === 'P2002') {
          throw new BadRequestException(
            'This customer number already has a response for this survey in this province.',
          );
        }
      }
      throw error;
    }
  }

  async remove(id: string) {
    try {
      return await this.prisma.surveyResponse.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new BadRequestException(`Survey response with ID ${id} not found`);
      }
      throw error;
    }
  }
}
