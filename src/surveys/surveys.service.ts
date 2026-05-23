import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSurveyDto } from './dto/create-survey.dto';
import { UpdateSurveyDto } from './dto/update-survey.dto';
import { Prisma } from '@prisma/client';
import { SurveyQueryDto } from './dto/survey-query.dto';

@Injectable()
export class SurveysService {
  constructor(private prisma: PrismaService) {}

  async create(createSurveyDto: CreateSurveyDto) {
    const { sections, ...surveyData } = createSurveyDto;

    const createInput: Prisma.SurveyCreateInput = {
      ...surveyData,
    };

    if (sections && sections.length > 0) {
      createInput.sections = {
        create: sections.map((section) => ({
          title: section.title,
          description: section.description,
          order: section.order,
          questions:
            section.questions && section.questions.length > 0
              ? {
                  create: section.questions.map((question) => ({
                    text: question.text,
                    type: question.type,
                    isRequired: question.isRequired,
                    order: question.order,
                    options:
                      question.options && question.options.length > 0
                        ? {
                            create: question.options.map((option) => ({
                              text: option.text,
                              value: option.value,
                              order: option.order,
                            })),
                          }
                        : undefined,
                  })),
                }
              : undefined,
        })),
      };
    }

    return this.prisma.survey.create({
      data: createInput,
      include: {
        sections: {
          include: {
            questions: {
              include: {
                options: true,
              },
            },
          },
        },
      },
    });
  }

  async findAll(query: SurveyQueryDto) {
    const { page, limit, isActive } = query;

    const skip = ((page ?? 1) - 1) * (limit ?? 10);
    const take = limit ?? 10;

    const where: Prisma.SurveyWhereInput = {};
    if (isActive !== undefined) where.isActive = isActive;

    const [data, total] = await Promise.all([
      this.prisma.survey.findMany({
        where,
        include: {
          _count: {
            select: { sections: true, responses: true },
          },
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.survey.count({ where }),
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

  async findActive() {
    return this.prisma.survey.findFirst({
      where: { isActive: true },
      include: {
        sections: {
          orderBy: { order: 'asc' },
          include: {
            questions: {
              orderBy: { order: 'asc' },
              include: {
                options: { orderBy: { order: 'asc' } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.survey.findUnique({
      where: { id },
      include: {
        sections: {
          orderBy: { order: 'asc' },
          include: {
            questions: {
              orderBy: { order: 'asc' },
              include: {
                options: { orderBy: { order: 'asc' } },
              },
            },
          },
        },
      },
    });
  }

  async update(id: string, updateSurveyDto: UpdateSurveyDto) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { sections, ...surveyData } = updateSurveyDto;
    return this.prisma.survey.update({
      where: { id },
      data: surveyData,
    });
  }

  async remove(id: string) {
    return this.prisma.survey.delete({
      where: { id },
    });
  }
}
