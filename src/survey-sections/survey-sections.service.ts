import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSurveySectionDto } from './dto/create-survey-section.dto';
import { UpdateSurveySectionDto } from './dto/update-survey-section.dto';

@Injectable()
export class SurveySectionsService {
  constructor(private prisma: PrismaService) {}

  async create(createSurveySectionDto: CreateSurveySectionDto) {
    return this.prisma.surveySection.create({
      data: createSurveySectionDto,
    });
  }

  async findAll() {
    return this.prisma.surveySection.findMany({
      include: {
        survey: { select: { title: true } },
        _count: { select: { questions: true } },
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.surveySection.findUnique({
      where: { id },
      include: {
        survey: true,
        questions: {
          orderBy: { order: 'asc' },
          include: { options: { orderBy: { order: 'asc' } } },
        },
      },
    });
  }

  async update(id: string, updateSurveySectionDto: UpdateSurveySectionDto) {
    return this.prisma.surveySection.update({
      where: { id },
      data: updateSurveySectionDto,
    });
  }

  async remove(id: string) {
    return this.prisma.surveySection.delete({
      where: { id },
    });
  }
}
